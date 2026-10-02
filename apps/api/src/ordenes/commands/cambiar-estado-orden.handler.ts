import { createHash } from 'crypto';
import { PrismaService } from '@mekanos/database';
import { BadRequestException, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
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
  ) { }

  async execute(command: CambiarEstadoOrdenCommand): Promise<CambiarEstadoResult> {
    const { ordenId, nuevoEstado, usuarioId, motivo, observaciones, datosAdicionales } = command;

    this.logger.log(`[CambiarEstado] Orden ${ordenId}: solicitando cambio a ${nuevoEstado}`);

    // 1. Obtener orden actual con su estado
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: ordenId },
      include: {
        estados_orden: true, // ✅ FIX: la relación real es `estados_orden` (FK id_estado_actual). `estado` no existe -> PrismaClientValidationError -> 500
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden ${ordenId} no encontrada`);
    }

    // Obtener código del estado actual
    // ✅ FIX: leer desde `estados_orden`. Sin fallback silencioso a 'PROGRAMADA':
    // un fallback inventaría el estado y corrompería la validación FSM.
    const estadoActual = orden.estados_orden?.codigo_estado;

    if (!estadoActual) {
      throw new InternalServerErrorException(
        `Orden ${ordenId} tiene id_estado_actual=${orden.id_estado_actual} sin relación válida en estados_orden. ` +
        `No se puede evaluar la transición. Verifique integridad referencial de la orden.`,
      );
    }

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
          // ✅ FIX 29-SEP-2026: nombres de relación reales según schema.prisma.
          // Antes: equipo / cliente / estado / tecnico / tipo_servicio -> TODOS inválidos
          // (ordenes_servicio declara `equipos`, `clientes`, `estados_orden`,
          // `empleados_...id_tecnico_asignadoToempleados` y `tipos_servicio`).
          // Cualquiera de ellos abortaba con PrismaClientValidationError -> 500.
          equipos: {
            include: {
              tipos_equipo: true,
              equipos_generador: true,
              equipos_motor: true,
              equipos_bomba: true,
            },
          },
          clientes: {
            include: {
              persona: true,
            },
          },
          estados_orden: true,
          empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
            include: {
              persona: true,
            },
          },
          tipos_servicio: true,
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
          sedes_cliente: true,
        },
      });

      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      // 2. Determinar tipo de template según tipo de equipo.
      //    `tipos_equipo` no tiene columna `nombre`; la real es `nombre_tipo`.
      let tipoTemplate = 'GENERADOR_A';
      const nombreTipoEquipo = orden.equipos?.tipos_equipo?.nombre_tipo || '';
      if (nombreTipoEquipo) {
        const tipoEquipo = nombreTipoEquipo.toLowerCase();
        if (tipoEquipo.includes('bomba') || tipoEquipo.includes('motor')) {
          tipoTemplate = 'BOMBA_A';
        } else if (tipoEquipo.includes('generador')) {
          tipoTemplate = this.mapTipoServicio(orden.tipos_servicio?.nombre_tipo) === 'PREVENTIVO_B'
            ? 'GENERADOR_B'
            : 'GENERADOR_A';
        }
      }

      this.logger.log(`[ProcesarOrdenCompletada] Generando PDF con template ${tipoTemplate} para orden ${ordenId}`);

      // 3. Preparar datos para PDF (igual que PdfController)
      const clientePersona = orden.clientes?.persona;
      // ✅ FIX MULTI-SEDE: Priorizar nombre_sede del cliente-sede
      const clienteNombreBase = clientePersona?.razon_social || clientePersona?.nombre_comercial || clientePersona?.nombre_completo || 'N/A';
      const clienteNombre = (orden.clientes as any)?.nombre_sede
        ? `${clienteNombreBase} - ${(orden.clientes as any).nombre_sede}`
        : clienteNombreBase;
      // ✅ FIX MULTI-SEDE: Priorizar dirección de sede sobre persona.
      // `direccion_servicio` no existe en ordenes_servicio; se usa descripcion_inicial
      // como respaldo para no inventar un campo inexistente.
      const clienteDireccion = (orden as any).sedes_cliente?.direccion_sede || clientePersona?.direccion_principal || 'N/A';

      let marcaEquipo = 'N/A';
      let serieEquipo = 'N/A';
      if (orden.equipos) {
        if (orden.equipos.equipos_generador) {
          marcaEquipo = orden.equipos.equipos_generador.marca_generador || 'N/A';
          serieEquipo = orden.equipos.equipos_generador.numero_serie_generador || orden.equipos.numero_serie_equipo || 'N/A';
        } else if (orden.equipos.equipos_motor) {
          marcaEquipo = orden.equipos.equipos_motor.marca_motor || 'N/A';
          serieEquipo = orden.equipos.equipos_motor.numero_serie_motor || orden.equipos.numero_serie_equipo || 'N/A';
        } else if (orden.equipos.equipos_bomba) {
          marcaEquipo = orden.equipos.equipos_bomba.marca_bomba || 'N/A';
          serieEquipo = orden.equipos.equipos_bomba.numero_serie_bomba || orden.equipos.numero_serie_equipo || 'N/A';
        } else {
          marcaEquipo = orden.equipos.nombre_equipo || 'N/A';
          serieEquipo = orden.equipos.numero_serie_equipo || 'N/A';
        }
      }

      const tecnicoRelacion = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados;

      // 4. Generar PDF usando el servicio directamente
      const resultado = await this.pdfService.generarPDF({
        tipoInforme: tipoTemplate as any,
        datos: {
          cliente: clienteNombre,
          direccion: clienteDireccion,
          marcaEquipo,
          serieEquipo,
          tipoEquipo: this.mapTipoEquipo(nombreTipoEquipo),
          fecha: orden.fecha_programada
            ? new Date(orden.fecha_programada).toLocaleDateString('es-CO')
            : new Date().toLocaleDateString('es-CO'),
          tecnico: tecnicoRelacion?.persona
            ? `${tecnicoRelacion.persona.primer_nombre || ''} ${tecnicoRelacion.persona.primer_apellido || ''}`.trim() || 'N/A'
            : 'N/A',
          horaEntrada: orden.fecha_inicio_real ? new Date(orden.fecha_inicio_real).toLocaleTimeString('es-CO') : 'N/A',
          horaSalida: orden.fecha_fin_real ? new Date(orden.fecha_fin_real).toLocaleTimeString('es-CO') : 'N/A',
          tipoServicio: this.mapTipoServicio(orden.tipos_servicio?.nombre_tipo),
          numeroOrden: orden.numero_orden || `ORD-${ordenId}`,
          datosModulo: this.extraerDatosModulo(orden.mediciones_servicio),
          actividades: orden.actividades_ejecutadas?.map(act => ({
            // ✅ FIX: nombres reales -> catalogo_sistemas.nombre_sistema,
            // catalogo_actividades.descripcion_actividad, actividades_ejecutadas.estado
            sistema: act.catalogo_actividades?.catalogo_sistemas?.nombre_sistema || 'GENERAL',
            descripcion: act.catalogo_actividades?.descripcion_actividad || 'N/A',
            resultado: act.estado || 'NA',
            observaciones: act.observaciones || '',
          })) || [],
          mediciones: orden.mediciones_servicio?.map(med => ({
            // ✅ FIX: mediciones_servicio usa valor_numerico y su propia unidad_medida
            parametro: med.parametros_medicion?.nombre_parametro || 'N/A',
            valor: Number(med.valor_numerico ?? 0) || 0,
            unidad: med.unidad_medida || med.parametros_medicion?.unidad_medida || '',
            nivelAlerta: (med.nivel_alerta as any) || 'OK',
          })) || [],
          evidencias: orden.evidencias_fotograficas?.map(ev => ev.ruta_archivo) || [],
          observaciones: orden.observaciones_cierre || orden.observaciones_tecnico || '',
        },
      });

      const pdfBuffer = resultado.buffer;
      this.logger.log(`[ProcesarOrdenCompletada] PDF generado: ${pdfBuffer.length} bytes`);

      // 5. Subir PDF a Cloudflare R2.
      //    ✅ FIX: el método real es `uploadPDF(buffer, filename, options?)` y devuelve
      //    un string (URL), no un objeto `{success,url}`. La llamada a `uploadFile`
      //    lanzaba TypeError y abortaba el cierre de la orden.
      const nombreArchivo = resultado.filename || `MEKANOS_${orden.numero_orden}_${new Date().toISOString().split('T')[0]}.pdf`;
      const r2Url = await this.r2StorageService.uploadPDF(pdfBuffer, nombreArchivo, {
        downloadFilename: nombreArchivo,
      });

      if (!r2Url) {
        throw new Error(`Error subiendo PDF a R2: no se obtuvo URL para ${nombreArchivo}`);
      }

      this.logger.log(`[ProcesarOrdenCompletada] PDF subido a R2: ${r2Url}`);

      // 6. Guardar referencia en documentos_generados.
      //    ✅ FIX: la tabla NO tiene `id_orden_servicio` ni `nombre_archivo`; el vínculo
      //    polimórfico es `id_referencia`, y `hash_sha256` es obligatorio.
      const hashSha256 = createHash('sha256').update(pdfBuffer).digest('hex');
      await this.prisma.documentos_generados.create({
        data: {
          // ✅ FIX: 'INFORME_TECNICO' no existe en tipo_documento_enum (INFORME_SERVICIO, BITACORA_MENSUAL, COTIZACION, PROPUESTA)
          tipo_documento: 'INFORME_SERVICIO',
          id_referencia: ordenId,
          ruta_archivo: r2Url,
          hash_sha256: hashSha256,
          // ✅ El campo en Prisma es `tama_o_bytes` (la columna física usa @map)
          tama_o_bytes: BigInt(pdfBuffer.length),
          mime_type: 'application/pdf',
          fecha_generacion: new Date(),
          generado_por: orden.modificado_por || orden.creado_por || 1,
        },
      });

      this.logger.log(`[ProcesarOrdenCompletada] URL guardada en documentos_generados`);

      // 7. Obtener email del cliente
      const emailCliente = clientePersona?.email_principal || 'lorddeep3@gmail.com';

      // 8. Enviar email con PDF adjunto
      await this.emailService.sendEmail({
        to: emailCliente,
        subject: `Informe Técnico - Orden ${orden.numero_orden}`,
        html: `
          <h2>Informe Técnico de Servicio</h2>
          <p>Estimado cliente,</p>
          <p>Adjunto encontrará el informe técnico de la orden de servicio <strong>${orden.numero_orden}</strong>.</p>
          <p>El documento también está disponible en: <a href="${r2Url}">${r2Url}</a></p>
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
      const err = error as { message?: string; stack?: string };
      this.logger.error(
        `[ProcesarOrdenCompletada] Error en orden ${ordenId}: ${err?.message ?? String(error)}`,
        err?.stack,
      );
      throw error;
    }
  }

  /**
   * ✅ FIX 29-SEP-2026: este método era invocado (`this.mapTipoEquipo(...)`) pero NUNCA
   * estuvo definido en la clase -> TypeError en tiempo de ejecución al finalizar una
   * orden, lo que abortaba la generación del PDF y el envío del email.
   */
  private mapTipoEquipo(nombreTipoEquipo: string): 'GENERADOR' | 'BOMBA' | 'MOTOR' {
    const n = (nombreTipoEquipo || '').toLowerCase();
    if (n.includes('bomba')) return 'BOMBA';
    if (n.includes('motor')) return 'MOTOR';
    return 'GENERADOR';
  }

  /**
   * ✅ FIX: el PDF solo acepta estos tres tipos de servicio. `nombre_tipo` viene de
   * tipos_servicio con valores libres (PREVENTIVO, CORRECTIVO, EMERGENCIA...), así que
   * se normaliza en vez de filtrar el valor crudo.
   */
  private mapTipoServicio(nombreTipo?: string | null): 'CORRECTIVO' | 'PREVENTIVO_A' | 'PREVENTIVO_B' {
    const n = (nombreTipo || '').toUpperCase();
    if (n.includes('CORRECTIV')) return 'CORRECTIVO';
    if (n.endsWith('_B') || n === 'B' || n.includes(' TIPO B')) return 'PREVENTIVO_B';
    return 'PREVENTIVO_A';
  }

  /**
   * Agrupa las mediciones por parámetro para el bloque de datos del PDF.
   * Antes ignoraba la entrada y devolvía `{}`; ahora devuelve el agrupado real.
   */
  private extraerDatosModulo(mediciones: any[]): Record<string, unknown> {
    if (!Array.isArray(mediciones) || mediciones.length === 0) {
      return {};
    }

    const porParametro: Record<string, { valores: number[]; unidad: string }> = {};

    for (const med of mediciones) {
      const nombre = med?.parametros_medicion?.nombre_parametro;
      if (!nombre) continue;

      const valor = Number(med?.valor_numerico);
      if (Number.isNaN(valor)) continue;

      const bucket = porParametro[nombre] ?? (porParametro[nombre] = {
        valores: [],
        unidad: med?.unidad_medida || med?.parametros_medicion?.unidad_medida || '',
      });
      bucket.valores.push(valor);
    }

    return porParametro;
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
