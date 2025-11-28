import { PrismaService } from '@mekanos/database';
import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EmailService } from '../../email/email.service';
import { PdfService } from '../../pdf/pdf.service';
import { R2StorageService } from '../../storage/r2-storage.service';
import {
  esEstadoFinal,
  validarCamposRequeridos,
  validarTransicion
} from '../domain/workflow-estados';
import { CambiarEstadoOrdenCommand } from './cambiar-estado-orden.command';

/**
 * Respuesta del cambio de estado
 */
export interface CambiarEstadoResult {
  success: boolean;
  ordenId: number;
  estadoAnterior: string;
  estadoNuevo: string;
  historialId: number;
  mensaje: string;
  timestamp: Date;
}

/**
 * Handler: CambiarEstadoOrdenHandler
 * 
 * Procesa transiciones de estado para órdenes de servicio.
 * 
 * Responsabilidades:
 * 1. Validar que la orden existe
 * 2. Validar que la transición es permitida (FSM)
 * 3. Validar campos requeridos según estado destino
 * 4. Actualizar estado de la orden
 * 5. Registrar en historial_estados_orden
 * 6. Ejecutar acciones automáticas (fechas, notificaciones)
 */
@CommandHandler(CambiarEstadoOrdenCommand)
export class CambiarEstadoOrdenHandler implements ICommandHandler<CambiarEstadoOrdenCommand> {
  private readonly logger = new Logger(CambiarEstadoOrdenHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly r2StorageService: R2StorageService,
    private readonly emailService: EmailService,
  ) {}

  async execute(command: CambiarEstadoOrdenCommand): Promise<CambiarEstadoResult> {
    const { ordenId, nuevoEstado, usuarioId, motivo, observaciones, datosAdicionales } = command;
    
    this.logger.log(`[CambiarEstado] Orden ${ordenId}: solicitando cambio a ${nuevoEstado}`);

    // 1. Obtener orden actual con su estado
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: ordenId },
      include: {
        estado: true, // Relación con tabla estados_orden via id_estado_actual
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden ${ordenId} no encontrada`);
    }

    // Obtener código del estado actual
    const estadoActual = orden.estado?.codigo_estado || 'PROGRAMADA';
    
    this.logger.log(`[CambiarEstado] Estado actual: ${estadoActual} → ${nuevoEstado}`);

    // 2. Validar que no sea estado final
    if (esEstadoFinal(estadoActual)) {
      throw new BadRequestException(
        `La orden está en estado final (${estadoActual}) y no puede cambiar de estado`,
      );
    }

    // 3. Validar transición permitida (FSM)
    validarTransicion(estadoActual, nuevoEstado);

    // 4. Obtener ID del nuevo estado desde la BD
    const nuevoEstadoRecord = await this.prisma.estados_orden.findFirst({
      where: { codigo_estado: nuevoEstado },
    });

    if (!nuevoEstadoRecord) {
      throw new BadRequestException(
        `Estado ${nuevoEstado} no existe en la base de datos. ` +
        `Verifique que los estados estén cargados en la tabla estados_orden.`,
      );
    }

    // 5. Preparar datos de actualización según estado destino
    const datosActualizacion = this.prepararDatosActualizacion(
      nuevoEstado,
      datosAdicionales,
      observaciones,
    );

    // 6. Validar campos requeridos
    const ordenParaValidar = { ...orden, ...datosActualizacion };
    validarCamposRequeridos(nuevoEstado, ordenParaValidar);

    // 7. Ejecutar transacción: actualizar orden + crear historial
    const resultado = await this.prisma.$transaction(async (tx) => {
      // 7.1 Actualizar orden
      const ordenActualizada = await tx.ordenes_servicio.update({
        where: { id_orden_servicio: ordenId },
        data: {
          id_estado_actual: nuevoEstadoRecord.id_estado,
          fecha_cambio_estado: new Date(),
          ...datosActualizacion,
        },
      });

      // 7.2 Crear registro en historial
      const historial = await tx.historial_estados_orden.create({
        data: {
          id_orden_servicio: ordenId,
          id_estado_anterior: orden.id_estado_actual,
          id_estado_nuevo: nuevoEstadoRecord.id_estado,
          fecha_cambio: new Date(),
          realizado_por: usuarioId,
          motivo_cambio: motivo || `Transición: ${estadoActual} → ${nuevoEstado}`,
          observaciones: observaciones,
        },
      });

      return { ordenActualizada, historial };
    });

    this.logger.log(
      `[CambiarEstado] ✅ Orden ${ordenId}: ${estadoActual} → ${nuevoEstado} ` +
      `(Historial ID: ${resultado.historial.id_historial})`,
    );

    // 8. Si la orden se completó, generar PDF, subir a R2 y enviar email automáticamente
    if (nuevoEstado === 'COMPLETADA') {
      this.logger.log(`[CambiarEstado] 🔄 Iniciando proceso automático para orden completada ${ordenId}`);
      this.procesarOrdenCompletada(ordenId).catch((error) => {
        this.logger.error(`[CambiarEstado] ❌ Error procesando orden completada ${ordenId}: ${error.message}`);
        // No fallar la transacción principal si falla el proceso automático
      });
    }

    return {
      success: true,
      ordenId,
      estadoAnterior: estadoActual,
      estadoNuevo: nuevoEstado,
      historialId: resultado.historial.id_historial,
      mensaje: `Orden actualizada exitosamente: ${estadoActual} → ${nuevoEstado}`,
      timestamp: new Date(),
    };
  }

  /**
   * Procesa automáticamente una orden completada:
   * 1. Genera PDF con template correcto (usando PdfController internamente)
   * 2. Sube PDF a Cloudflare R2
   * 3. Guarda URL en documentos_generados
   * 4. Envía email con PDF adjunto
   */
  private async procesarOrdenCompletada(ordenId: number): Promise<void> {
    try {
      // 1. Obtener orden con TODAS las relaciones necesarias (igual que PdfController)
      const orden = await this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: ordenId },
        include: {
          equipo: {
            include: {
              tipo_equipo: true,
              equipos_generador: true,
              equipos_motor: true,
              equipos_bomba: true,
            },
          },
          cliente: {
            include: {
              persona: true,
            },
          },
          estado: true,
          tecnico: {
            include: {
              persona: true,
            },
          },
          tipo_servicio: true,
          actividades_ejecutadas: {
            include: {
              catalogo_actividades: {
                include: {
                  catalogo_sistemas: true,
                },
              },
            },
          },
          mediciones_servicio: {
            include: {
              parametros_medicion: true,
            },
          },
          evidencias_fotograficas: true,
        },
      });

      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      // 2. Determinar tipo de template según tipo de equipo
      let tipoTemplate = 'GENERADOR_A';
      if (orden.equipo?.tipo_equipo?.nombre) {
        const tipoEquipo = orden.equipo.tipo_equipo.nombre.toLowerCase();
        if (tipoEquipo.includes('bomba') || tipoEquipo.includes('motor')) {
          tipoTemplate = 'BOMBA_A';
        } else if (tipoEquipo.includes('generador')) {
          tipoTemplate = orden.tipo_servicio?.nombre_tipo?.includes('B') ? 'GENERADOR_B' : 'GENERADOR_A';
        }
      }

      this.logger.log(`[ProcesarOrdenCompletada] Generando PDF con template ${tipoTemplate} para orden ${ordenId}`);

      // 3. Preparar datos para PDF (igual que PdfController)
      const clientePersona = orden.cliente?.persona;
      const clienteNombre = clientePersona?.razon_social || clientePersona?.nombre_comercial || clientePersona?.nombre_completo || 'N/A';
      const clienteDireccion = clientePersona?.direccion_principal || orden.direccion_servicio || 'N/A';
      
      let marcaEquipo = 'N/A';
      let serieEquipo = 'N/A';
      if (orden.equipo) {
        if (orden.equipo.equipos_generador) {
          marcaEquipo = orden.equipo.equipos_generador.marca_generador || 'N/A';
          serieEquipo = orden.equipo.equipos_generador.numero_serie_generador || orden.equipo.numero_serie_equipo || 'N/A';
        } else if (orden.equipo.equipos_motor) {
          marcaEquipo = orden.equipo.equipos_motor.marca_motor || 'N/A';
          serieEquipo = orden.equipo.equipos_motor.numero_serie_motor || orden.equipo.numero_serie_equipo || 'N/A';
        } else if (orden.equipo.equipos_bomba) {
          marcaEquipo = orden.equipo.equipos_bomba.marca_bomba || 'N/A';
          serieEquipo = orden.equipo.equipos_bomba.numero_serie_bomba || orden.equipo.numero_serie_equipo || 'N/A';
        } else {
          marcaEquipo = orden.equipo.nombre_equipo || 'N/A';
          serieEquipo = orden.equipo.numero_serie_equipo || 'N/A';
        }
      }

      // 4. Generar PDF usando el servicio directamente
      const resultado = await this.pdfService.generarPDF({
        tipoInforme: tipoTemplate as any,
        datos: {
          cliente: clienteNombre,
          direccion: clienteDireccion,
          marcaEquipo,
          serieEquipo,
          tipoEquipo: this.mapTipoEquipo(orden.equipo?.tipo_equipo?.nombre || ''),
          fecha: orden.fecha_programada 
            ? new Date(orden.fecha_programada).toLocaleDateString('es-CO') 
            : new Date().toLocaleDateString('es-CO'),
          tecnico: orden.tecnico?.persona 
            ? `${orden.tecnico.persona.primer_nombre || ''} ${orden.tecnico.persona.primer_apellido || ''}`.trim() || 'N/A'
            : 'N/A',
          horaEntrada: orden.fecha_inicio_real ? new Date(orden.fecha_inicio_real).toLocaleTimeString('es-CO') : 'N/A',
          horaSalida: orden.fecha_fin_real ? new Date(orden.fecha_fin_real).toLocaleTimeString('es-CO') : 'N/A',
          tipoServicio: orden.tipo_servicio?.nombre_tipo || 'PREVENTIVO_A',
          numeroOrden: orden.numero_orden || `ORD-${ordenId}`,
          datosModulo: this.extraerDatosModulo(orden.mediciones_servicio),
          actividades: orden.actividades_ejecutadas?.map(act => ({
            sistema: act.catalogo_actividades?.catalogo_sistemas?.nombre || 'GENERAL',
            descripcion: act.catalogo_actividades?.nombre_actividad || act.descripcion || 'N/A',
            resultado: (act.estado_checklist as any) || 'NA',
            observaciones: act.observaciones || '',
          })) || [],
          mediciones: orden.mediciones_servicio?.map(med => ({
            parametro: med.parametros_medicion?.nombre_parametro || 'N/A',
            valor: Number(med.valor_medido) || 0,
            unidad: med.parametros_medicion?.unidad_medida || '',
            nivelAlerta: (med.nivel_alerta as any) || 'OK',
          })) || [],
          evidencias: orden.evidencias_fotograficas?.map(ev => ev.ruta_archivo) || [],
          observaciones: orden.observaciones_cierre || orden.observaciones || '',
        },
      });

      const pdfBuffer = resultado.buffer;
      this.logger.log(`[ProcesarOrdenCompletada] PDF generado: ${pdfBuffer.length} bytes`);

      // 5. Subir PDF a Cloudflare R2
      const nombreArchivo = resultado.filename || `MEKANOS_${orden.numero_orden}_${new Date().toISOString().split('T')[0]}.pdf`;
      const r2Result = await this.r2StorageService.uploadFile(pdfBuffer, nombreArchivo, 'application/pdf');

      if (!r2Result.success || !r2Result.url) {
        throw new Error(`Error subiendo PDF a R2: ${r2Result.error || 'URL no disponible'}`);
      }

      this.logger.log(`[ProcesarOrdenCompletada] PDF subido a R2: ${r2Result.url}`);

      // 6. Guardar URL en documentos_generados
      await this.prisma.documentos_generados.create({
        data: {
          id_orden_servicio: ordenId,
          tipo_documento: 'INFORME_TECNICO',
          nombre_archivo: nombreArchivo,
          ruta_archivo: r2Result.url,
          tamano_bytes: BigInt(pdfBuffer.length),
          fecha_generacion: new Date(),
          generado_por: orden.modificado_por || orden.creado_por || 1,
        },
      });

      this.logger.log(`[ProcesarOrdenCompletada] URL guardada en documentos_generados`);

      // 7. Obtener email del cliente
      const emailCliente = orden.cliente?.persona?.email_principal || 'lorddeep3@gmail.com';

      // 8. Enviar email con PDF adjunto
      await this.emailService.sendEmail({
        to: emailCliente,
        subject: `Informe Técnico - Orden ${orden.numero_orden}`,
        html: `
          <h2>Informe Técnico de Servicio</h2>
          <p>Estimado cliente,</p>
          <p>Adjunto encontrará el informe técnico de la orden de servicio <strong>${orden.numero_orden}</strong>.</p>
          <p>El documento también está disponible en: <a href="${r2Result.url}">${r2Result.url}</a></p>
          <p>Saludos,<br>Equipo MEKANOS S.A.S</p>
        `,
        attachments: [
          {
            filename: nombreArchivo,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });

      this.logger.log(`[ProcesarOrdenCompletada] ✅ Email enviado a ${emailCliente}`);

    } catch (error) {
      this.logger.error(`[ProcesarOrdenCompletada] Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Extrae datos del módulo desde mediciones (igual que PdfController)
   */
  private extraerDatosModulo(mediciones: any[]): any {
    // Implementación simplificada - puede mejorarse
    return {};
  }

  /**
   * Prepara datos adicionales de actualización según el estado destino
   */
  private prepararDatosActualizacion(
    nuevoEstado: string,
    datosAdicionales?: {
      tecnicoId?: number;
      aprobadorId?: number;
      fechaProgramada?: Date;
    },
    observaciones?: string,
  ): Record<string, any> {
    const datos: Record<string, any> = {};
    const ahora = new Date();

    switch (nuevoEstado) {
      case 'ASIGNADA':
        if (datosAdicionales?.tecnicoId) {
          datos.id_tecnico_asignado = datosAdicionales.tecnicoId;
        }
        break;

      case 'EN_PROCESO':
        // Registrar fecha de inicio real automáticamente
        datos.fecha_inicio_real = ahora;
        break;

      case 'COMPLETADA':
        // Registrar fecha de fin real automáticamente
        datos.fecha_fin_real = ahora;
        if (observaciones) {
          datos.observaciones_cierre = observaciones;
        }
        break;

      case 'APROBADA':
        if (datosAdicionales?.aprobadorId) {
          datos.aprobada_por = datosAdicionales.aprobadorId;
        }
        datos.fecha_aprobacion = ahora;
        break;

      case 'CANCELADA':
        datos.fecha_fin_real = ahora;
        if (observaciones) {
          datos.observaciones_cierre = observaciones;
        }
        break;

      case 'EN_ESPERA_REPUESTO':
        if (observaciones) {
          datos.observaciones_cierre = observaciones;
        }
        break;
    }

    return datos;
  }
}
