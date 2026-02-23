/**
 * PDF Controller - MEKANOS S.A.S
 * 
 * Endpoints para generación de PDFs:
 * - GET /ordenes/:id/pdf - Genera PDF de una orden específica
 * - GET /pdf/prueba - Genera PDF de prueba
 */

import { PrismaService } from '@mekanos/database';
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Res
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';
import { createHash } from 'crypto';
import { Response } from 'express';
import { EmailTemplatesService } from '../email/email-templates.service';
import { EmailService } from '../email/email.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { PdfService, TipoInforme } from './pdf.service';
import { DatosOrdenPDF } from './templates';

/**
 * DTO para regenerar PDF y enviarlo por email
 */
class RegenerarPdfDto {
  @ApiProperty({ description: 'Email del destinatario (opcional, usa email del cliente si no se especifica)', required: false })
  @IsOptional()
  @IsEmail()
  emailDestino?: string;

  @ApiProperty({ description: 'Enviar email después de regenerar', default: false })
  @IsOptional()
  @IsBoolean()
  enviarEmail?: boolean;

  @ApiProperty({ description: 'Asunto personalizado del email', required: false })
  @IsOptional()
  @IsString()
  asuntoEmail?: string;

  @ApiProperty({ description: 'Mensaje personalizado para el email', required: false })
  @IsOptional()
  @IsString()
  mensajeEmail?: string;

  @ApiProperty({ description: 'Guardar PDF en R2 y registrar en BD', default: true })
  @IsOptional()
  @IsBoolean()
  guardarEnR2?: boolean;

  @ApiProperty({ description: 'Forzar regeneración aunque exista PDF en BD', default: false })
  @IsOptional()
  @IsBoolean()
  forzarRegeneracion?: boolean;
}

/**
 * DTO para enviar email con PDF existente
 */
class EnviarPdfExistenteDto {
  @ApiProperty({ description: 'Email del destinatario', required: true })
  @IsEmail()
  emailDestino: string;

  @ApiProperty({ description: 'Asunto personalizado del email', required: false })
  @IsOptional()
  @IsString()
  asuntoEmail?: string;

  @ApiProperty({ description: 'Mensaje personalizado para el email', required: false })
  @IsOptional()
  @IsString()
  mensajeEmail?: string;

  @ApiProperty({ description: 'Forzar regeneración aunque exista PDF', default: false })
  @IsOptional()
  @IsBoolean()
  forzarRegeneracion?: boolean;

  @ApiProperty({ description: 'Emails adicionales en CC', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  emailsCc?: string[];
}

@ApiTags('PDF')
@Controller()
@ApiBearerAuth()
export class PdfController {
  private readonly logger = new Logger(PdfController.name);

  constructor(
    private readonly pdfService: PdfService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly emailTemplates: EmailTemplatesService,
    private readonly r2Service: R2StorageService,
  ) { }

  /**
   * Genera PDF de una orden de servicio
   */
  @Get('ordenes/:id/pdf')
  @ApiOperation({
    summary: 'Generar PDF de orden de servicio',
    description: 'Genera un PDF profesional MEKANOS con el informe de mantenimiento',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de servicio',
    type: String,
  })
  @ApiQuery({
    name: 'tipo',
    description: 'Tipo de informe (GENERADOR_A, GENERADOR_B, BOMBA_A)',
    required: false,
    enum: ['GENERADOR_A', 'GENERADOR_B', 'BOMBA_A'],
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generado exitosamente',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async generarPdfOrden(
    @Param('id') id: string,
    @Query('tipo') tipoParam: TipoInforme | undefined,
    @Res() res: Response,
  ): Promise<void> {
    // ✅ FIX 15-DIC-2025: tipo ahora es opcional para permitir auto-detección
    let tipo = tipoParam;
    this.logger.log(`📄 Generando PDF para orden ${id}, tipo solicitado: ${tipo || 'AUTO-DETECTAR'}`);

    // Convertir ID a número
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      throw new NotFoundException(`ID de orden inválido: ${id}`);
    }

    // Buscar la orden con todas las relaciones necesarias
    // Cast as any para evitar errores de tipado con includes complejos de Prisma
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idNumerico },
      include: {
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
            // ✅ MULTI-EQUIPOS: Incluir relación con ordenes_equipos
            ordenes_equipos: {
              include: {
                equipos: true,
              },
            },
          },
        },
        mediciones_servicio: {
          include: {
            parametros_medicion: true,
            // ✅ MULTI-EQUIPOS: Incluir relación con ordenes_equipos
            ordenes_equipos: {
              include: {
                equipos: true,
              },
            },
          },
        },
        evidencias_fotograficas: {
          include: {
            // ✅ MULTI-EQUIPOS: Incluir relación con ordenes_equipos
            ordenes_equipos: {
              include: {
                equipos: true,
              },
            },
          },
        },
        // ✅ MULTI-EQUIPOS: Incluir equipos de la orden
        ordenes_equipos: {
          include: {
            equipos: {
              include: {
                tipos_equipo: true,
              },
            },
          },
          orderBy: {
            orden_secuencia: 'asc',
          },
        },
        // ✅ FIX 06-FEB-2026: Incluir firmas digitales para renderizar en PDF
        firmas_digitales_ordenes_servicio_id_firma_tecnicoTofirmas_digitales: {
          include: {
            persona: true,
          },
        },
        firmas_digitales: {
          include: {
            persona: true,
          },
        },
        sedes_cliente: true,
      },
    }) as any; // Cast as any para Prisma includes complejos

    if (!orden) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    // ✅ MULTI-EQUIPOS: Detectar si es orden multi-equipo
    const esMultiEquipo = (orden.ordenes_equipos?.length || 0) > 1;
    this.logger.log(`📦 Orden ${id}: esMultiEquipo=${esMultiEquipo}, equipos=${orden.ordenes_equipos?.length || 0}`);

    // ✅ FIX 14-FEB-2026: Normalizar orden_secuencia si todos tienen el mismo valor (bug histórico)
    // Antes, orden_secuencia no se seteaba al crear → todos recibían default=1 → "EQ1" para todos
    if (esMultiEquipo && orden.ordenes_equipos) {
      const secuencias = orden.ordenes_equipos.map((oe: any) => oe.orden_secuencia);
      const todasIguales = secuencias.every((s: number) => s === secuencias[0]);
      if (todasIguales) {
        this.logger.warn(`⚠️ Todas las orden_secuencia son ${secuencias[0]} - normalizando a 1,2,3...`);
        orden.ordenes_equipos.forEach((oe: any, idx: number) => {
          oe.orden_secuencia = idx + 1;
        });
      }
    }

    // Construir datos para el PDF
    const clientePersona = orden.clientes?.persona;
    // ✅ FIX MULTI-SEDE: Priorizar nombre_sede del cliente-sede
    const clienteNombreBase = clientePersona?.razon_social || clientePersona?.nombre_comercial || clientePersona?.nombre_completo || 'N/A';
    const clienteNombre = orden.clientes?.nombre_sede
      ? `${clienteNombreBase} - ${orden.clientes.nombre_sede}`
      : clienteNombreBase;
    // ✅ FIX MULTI-SEDE: Priorizar dirección de sede
    const clienteDireccion = orden.sedes_cliente?.direccion_sede || clientePersona?.direccion_principal || 'N/A';

    // Obtener marca y serie según tipo de equipo (usando 'equipos' que es la relación correcta)
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

    // ✅ MULTI-EQUIPOS: Construir datos de equipos
    const equiposOrden = esMultiEquipo ? orden.ordenes_equipos?.map((oe: any) => ({
      idOrdenEquipo: oe.id_orden_equipo,
      ordenSecuencia: oe.orden_secuencia || 1,
      nombreSistema: oe.nombre_sistema || undefined,
      codigoEquipo: oe.equipos?.codigo_equipo || undefined,
      nombreEquipo: oe.equipos?.nombre_equipo || undefined,
      estado: oe.estado_equipo || 'PENDIENTE',
    })) : undefined;

    // ✅ MULTI-EQUIPOS: Agrupar actividades por equipo
    let actividadesPorEquipo: any = undefined;
    if (esMultiEquipo && orden.ordenes_equipos) {
      // Primero, verificar si las actividades tienen id_orden_equipo asignado
      const actividadesConEquipo = orden.actividades_ejecutadas?.filter((act: any) => act.id_orden_equipo != null) || [];
      const actividadesSinEquipo = orden.actividades_ejecutadas?.filter((act: any) => act.id_orden_equipo == null) || [];

      this.logger.log(`📊 Actividades: ${actividadesConEquipo.length} con equipo, ${actividadesSinEquipo.length} sin equipo`);

      if (actividadesConEquipo.length > 0) {
        // CASO IDEAL: Las actividades tienen id_orden_equipo asignado
        actividadesPorEquipo = orden.ordenes_equipos.map((oe: any) => ({
          equipo: {
            idOrdenEquipo: oe.id_orden_equipo,
            ordenSecuencia: oe.orden_secuencia || 1,
            nombreSistema: oe.nombre_sistema || undefined,
            codigoEquipo: oe.equipos?.codigo_equipo || undefined,
            nombreEquipo: oe.equipos?.nombre_equipo || undefined,
            estado: oe.estado_equipo || 'PENDIENTE',
          },
          actividades: actividadesConEquipo
            .filter((act: any) => act.id_orden_equipo === oe.id_orden_equipo)
            .map((act: any) => ({
              sistema: act.catalogo_actividades?.catalogo_sistemas?.nombre_sistema || 'GENERAL',
              descripcion: act.catalogo_actividades?.descripcion_actividad || act.descripcion || 'N/A',
              resultado: (act.estado as any) || 'NA',
              observaciones: act.observaciones || '',
            })),
        }));
      } else if (actividadesSinEquipo.length > 0) {
        // ✅ FALLBACK INTELIGENTE: Distribuir actividades equitativamente entre equipos
        // Las actividades del tipo A son idénticas para todos los equipos
        // Asumimos que si hay N equipos y M actividades, cada equipo tiene M/N actividades
        // Y el patrón se repite (actividad 1 para todos, actividad 2 para todos, etc.)
        this.logger.log(`⚠️ FALLBACK: Distribuyendo ${actividadesSinEquipo.length} actividades entre ${orden.ordenes_equipos.length} equipos`);

        const actividadesUnicas = new Map<string, any[]>(); // descripcion -> [resultados por equipo]

        // Agrupar actividades por descripción (cada descripción aparece N veces, una por equipo)
        for (const act of actividadesSinEquipo) {
          const key = act.catalogo_actividades?.descripcion_actividad || act.descripcion || 'N/A';
          if (!actividadesUnicas.has(key)) {
            actividadesUnicas.set(key, []);
          }
          actividadesUnicas.get(key)!.push(act);
        }

        // Construir estructura por equipo
        actividadesPorEquipo = orden.ordenes_equipos.map((oe: any, equipoIndex: number) => ({
          equipo: {
            idOrdenEquipo: oe.id_orden_equipo,
            ordenSecuencia: oe.orden_secuencia || 1,
            nombreSistema: oe.nombre_sistema || undefined,
            codigoEquipo: oe.equipos?.codigo_equipo || undefined,
            nombreEquipo: oe.equipos?.nombre_equipo || undefined,
            estado: oe.estado_equipo || 'PENDIENTE',
          },
          actividades: Array.from(actividadesUnicas.entries()).map(([descripcion, acts]) => {
            // Tomar la actividad correspondiente a este equipo (por índice)
            const actEquipo = acts[equipoIndex] || acts[0]; // Fallback al primero si no hay suficientes
            return {
              sistema: actEquipo.catalogo_actividades?.catalogo_sistemas?.nombre_sistema || 'GENERAL',
              descripcion: descripcion,
              resultado: (actEquipo.estado as any) || 'NA',
              observaciones: actEquipo.observaciones || '',
            };
          }),
        }));

        this.logger.log(`✅ FALLBACK completado: ${actividadesUnicas.size} actividades únicas distribuidas`);
      }
    }

    // ✅ MULTI-EQUIPOS: Agrupar mediciones por equipo
    let medicionesPorEquipo: any = undefined;
    if (esMultiEquipo && orden.ordenes_equipos) {
      // Verificar si las mediciones tienen id_orden_equipo asignado
      const medicionesConEquipo = orden.mediciones_servicio?.filter((med: any) => med.id_orden_equipo != null) || [];
      const medicionesSinEquipo = orden.mediciones_servicio?.filter((med: any) => med.id_orden_equipo == null) || [];

      this.logger.log(`📊 Mediciones: ${medicionesConEquipo.length} con equipo, ${medicionesSinEquipo.length} sin equipo`);

      if (medicionesConEquipo.length > 0) {
        // CASO IDEAL: Las mediciones tienen id_orden_equipo asignado
        medicionesPorEquipo = orden.ordenes_equipos.map((oe: any) => ({
          equipo: {
            idOrdenEquipo: oe.id_orden_equipo,
            ordenSecuencia: oe.orden_secuencia || 1,
            nombreSistema: oe.nombre_sistema || undefined,
            codigoEquipo: oe.equipos?.codigo_equipo || undefined,
            nombreEquipo: oe.equipos?.nombre_equipo || undefined,
            estado: oe.estado_equipo || 'PENDIENTE',
          },
          mediciones: medicionesConEquipo
            .filter((med: any) => med.id_orden_equipo === oe.id_orden_equipo)
            .map((med: any) => ({
              parametro: med.parametros_medicion?.nombre_parametro || 'N/A',
              valor: Number(med.valor_numerico) || 0,
              unidad: med.parametros_medicion?.unidad_medida || '',
              nivelAlerta: (med.nivel_alerta as any) || 'OK',
            })),
        }));
      } else if (medicionesSinEquipo.length > 0) {
        // ✅ FALLBACK INTELIGENTE: Distribuir mediciones entre equipos
        this.logger.log(`⚠️ FALLBACK MEDICIONES: Distribuyendo ${medicionesSinEquipo.length} mediciones entre ${orden.ordenes_equipos.length} equipos`);

        const medicionesUnicas = new Map<string, any[]>(); // parametro -> [valores por equipo]

        for (const med of medicionesSinEquipo) {
          const key = med.parametros_medicion?.nombre_parametro || 'N/A';
          if (!medicionesUnicas.has(key)) {
            medicionesUnicas.set(key, []);
          }
          medicionesUnicas.get(key)!.push(med);
        }

        medicionesPorEquipo = orden.ordenes_equipos.map((oe: any, equipoIndex: number) => ({
          equipo: {
            idOrdenEquipo: oe.id_orden_equipo,
            ordenSecuencia: oe.orden_secuencia || 1,
            nombreSistema: oe.nombre_sistema || undefined,
            codigoEquipo: oe.equipos?.codigo_equipo || undefined,
            nombreEquipo: oe.equipos?.nombre_equipo || undefined,
            estado: oe.estado_equipo || 'PENDIENTE',
          },
          mediciones: Array.from(medicionesUnicas.entries()).map(([parametro, meds]) => {
            const medEquipo = meds[equipoIndex] || meds[0];
            return {
              parametro: parametro,
              valor: Number(medEquipo.valor_numerico) || 0,
              unidad: medEquipo.parametros_medicion?.unidad_medida || '',
              nivelAlerta: (medEquipo.nivel_alerta as any) || 'OK',
            };
          }),
        }));

        this.logger.log(`✅ FALLBACK MEDICIONES completado: ${medicionesUnicas.size} parámetros únicos`);
      }
    }

    // ✅ MULTI-EQUIPOS: Agrupar evidencias por equipo
    let evidenciasPorEquipo: any = undefined;
    if (esMultiEquipo && orden.ordenes_equipos) {
      // Verificar si las evidencias tienen id_orden_equipo asignado
      const evidenciasConEquipo = orden.evidencias_fotograficas?.filter((ev: any) => ev.id_orden_equipo != null) || [];
      const evidenciasSinEquipo = orden.evidencias_fotograficas?.filter((ev: any) => ev.id_orden_equipo == null) || [];

      if (evidenciasSinEquipo.length > 0 && evidenciasConEquipo.length === 0) {
        // ⚠️ FALLBACK: Todas las evidencias tienen id_orden_equipo = NULL
        // Distribuir equitativamente basándose en momento_captura (ANTES, DURANTE, DESPUES)
        this.logger.log(`⚠️ FALLBACK: Distribuyendo ${evidenciasSinEquipo.length} evidencias entre ${orden.ordenes_equipos.length} equipos`);

        // Agrupar evidencias por momento
        const evidenciasPorMomento: { [key: string]: any[] } = {
          'ANTES': [],
          'DURANTE': [],
          'DESPUES': []
        };

        for (const ev of evidenciasSinEquipo) {
          const momento = ev.momento_captura || 'DURANTE';
          if (!evidenciasPorMomento[momento]) {
            evidenciasPorMomento[momento] = [];
          }
          evidenciasPorMomento[momento].push(ev);
        }

        // Distribuir cada momento equitativamente entre equipos
        const numEquipos = orden.ordenes_equipos.length;

        evidenciasPorEquipo = orden.ordenes_equipos.map((oe: any, index: number) => {
          const evidenciasEquipo: any[] = [];

          // Para cada momento, tomar las evidencias que corresponden a este equipo
          for (const momento of ['ANTES', 'DURANTE', 'DESPUES']) {
            const evidenciasMomento = evidenciasPorMomento[momento] || [];
            // Asumir que las evidencias por momento están ordenadas por secuencia de equipo
            // Cada N evidencias corresponden a los N equipos
            const evidenciasParaEquipo = evidenciasMomento.filter((_, i) => i % numEquipos === index);
            evidenciasEquipo.push(...evidenciasParaEquipo);
          }

          return {
            equipo: {
              idOrdenEquipo: oe.id_orden_equipo,
              ordenSecuencia: oe.orden_secuencia || 1,
              nombreSistema: oe.nombre_sistema || undefined,
              codigoEquipo: oe.equipos?.codigo_equipo || undefined,
              nombreEquipo: oe.equipos?.nombre_equipo || undefined,
              estado: oe.estado_equipo || 'PENDIENTE',
            },
            evidencias: evidenciasEquipo.map((ev: any) => ({
              url: ev.ruta_archivo,
              caption: `${ev.tipo_evidencia || 'EVIDENCIA'}: ${ev.descripcion || ''}`.trim(),
              momento: ev.tipo_evidencia || ev.momento_captura || 'DURANTE',
              idOrdenEquipo: oe.id_orden_equipo, // Asignar el ID del equipo distribuido
            })),
          };
        });
      } else {
        // Caso normal: las evidencias ya tienen id_orden_equipo asignado
        evidenciasPorEquipo = orden.ordenes_equipos.map((oe: any) => ({
          equipo: {
            idOrdenEquipo: oe.id_orden_equipo,
            ordenSecuencia: oe.orden_secuencia || 1,
            nombreSistema: oe.nombre_sistema || undefined,
            codigoEquipo: oe.equipos?.codigo_equipo || undefined,
            nombreEquipo: oe.equipos?.nombre_equipo || undefined,
            estado: oe.estado_equipo || 'PENDIENTE',
          },
          evidencias: orden.evidencias_fotograficas
            ?.filter((ev: any) => ev.id_orden_equipo === oe.id_orden_equipo)
            .map((ev: any) => ({
              url: ev.ruta_archivo,
              caption: `${ev.tipo_evidencia || 'EVIDENCIA'}: ${ev.descripcion || ''}`.trim(),
              momento: ev.tipo_evidencia || ev.momento_captura || 'DURANTE',
              idOrdenEquipo: ev.id_orden_equipo || undefined,
            })) || [],
        }));
      }

      // ✅ FIX: Agregar fotos GENERALES huérfanas (sin id_orden_equipo) como pseudo-equipo
      if (evidenciasPorEquipo) {
        const fotosGeneralesHuerfanas = (orden.evidencias_fotograficas || [])
          .filter((ev: any) => !ev.id_orden_equipo && (ev.tipo_evidencia === 'GENERAL' || !ev.tipo_evidencia))
          .map((ev: any) => ({
            url: ev.ruta_archivo,
            caption: `${ev.tipo_evidencia || 'GENERAL'}: ${ev.descripcion || ''}`.trim(),
            momento: ev.tipo_evidencia || 'GENERAL',
          }));

        if (fotosGeneralesHuerfanas.length > 0) {
          evidenciasPorEquipo.push({
            equipo: {
              idOrdenEquipo: 0,
              ordenSecuencia: 999,
              nombreSistema: 'FOTOGRAFÍAS GENERALES',
              codigoEquipo: undefined,
              nombreEquipo: 'FOTOGRAFÍAS GENERALES',
              estado: undefined,
            },
            evidencias: fotosGeneralesHuerfanas,
          });
          this.logger.log(`📷 Fotos generales huérfanas agregadas: ${fotosGeneralesHuerfanas.length}`);
        }
      }
    }

    // ✅ FIX 06-FEB-2026: Extraer firmas digitales para renderizar en PDF
    const firmaTecnico = orden.firmas_digitales_ordenes_servicio_id_firma_tecnicoTofirmas_digitales;
    const firmaCliente = orden.firmas_digitales;

    const datosOrden: DatosOrdenPDF = {
      cliente: clienteNombre,
      direccion: clienteDireccion,
      marcaEquipo: marcaEquipo,
      serieEquipo: serieEquipo,
      tipoEquipo: this.mapTipoEquipo(orden.equipos?.tipos_equipo?.nombre || ''),
      // ✅ FIX 07-FEB-2026: Usar fecha_inicio_real (fecha real del servicio) cuando existe,
      // fallback a fecha_programada. Antes siempre usaba fecha_programada causando desfase.
      fecha: orden.fecha_inicio_real
        ? new Date(orden.fecha_inicio_real).toLocaleDateString('es-CO')
        : orden.fecha_programada
          ? new Date(orden.fecha_programada).toLocaleDateString('es-CO')
          : new Date().toLocaleDateString('es-CO'),
      tecnico: orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona
        ? `${orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.primer_nombre || ''} ${orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.primer_apellido || ''}`.trim() || 'N/A'
        : 'N/A',
      // ✅ FIX 07-FEB-2026: Usar formatearHora consistente y corregir precedencia de operadores
      horaEntrada: this.formatearHora(orden.fecha_inicio_real),
      horaSalida: this.formatearHora(orden.fecha_fin_real),
      tipoServicio: orden.tipos_servicio?.nombre_tipo || 'PREVENTIVO_A',
      numeroOrden: orden.numero_orden || `ORD-${id.substring(0, 8)}`,
      datosModulo: this.extraerDatosModulo(orden.mediciones_servicio),
      actividades: orden.actividades_ejecutadas?.map((act: any) => ({
        sistema: act.catalogo_actividades?.catalogo_sistemas?.nombre_sistema || 'GENERAL',
        descripcion: act.catalogo_actividades?.descripcion_actividad || act.descripcion || 'N/A',
        resultado: (act.estado as any) || 'NA',
        observaciones: act.observaciones || '',
      })) || [],
      mediciones: orden.mediciones_servicio?.map((med: any) => ({
        parametro: med.parametros_medicion?.nombre_parametro || 'N/A',
        valor: Number(med.valor_numerico) || 0,
        unidad: med.parametros_medicion?.unidad_medida || '',
        nivelAlerta: (med.nivel_alerta as any) || 'OK',
      })) || [],
      // ✅ FIX 06-FEB-2026: Mapear evidencias como objetos con caption/tipo (no solo URL)
      // Esto permite al template separar fotos GENERALES de fotos de actividad
      evidencias: orden.evidencias_fotograficas?.map((ev: any) => ({
        url: ev.ruta_archivo,
        caption: `${ev.tipo_evidencia || 'EVIDENCIA'}: ${ev.descripcion || ''}`.trim(),
      })) || [],
      observaciones: orden.observaciones_cierre || orden.observaciones || '',
      // ✅ MULTI-EQUIPOS: Datos adicionales
      esMultiEquipo,
      equiposOrden,
      actividadesPorEquipo,
      medicionesPorEquipo,
      evidenciasPorEquipo,
      // ✅ FIX 06-FEB-2026: Firmas digitales con imagen base64 y prefijo data URL
      firmaTecnico: firmaTecnico?.firma_base64
        ? (firmaTecnico.firma_base64.startsWith('data:') ? firmaTecnico.firma_base64 : `data:image/png;base64,${firmaTecnico.firma_base64}`)
        : undefined,
      firmaCliente: firmaCliente?.firma_base64
        ? (firmaCliente.firma_base64.startsWith('data:') ? firmaCliente.firma_base64 : `data:image/png;base64,${firmaCliente.firma_base64}`)
        : undefined,
      // ✅ FIX 06-FEB-2026: Nombre y cargo del técnico
      nombreTecnico: orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona
        ? `${orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.primer_nombre || ''} ${orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.primer_apellido || ''}`.trim()
        : undefined,
      cargoTecnico: 'Técnico de Servicio',
      // ✅ FIX 06-FEB-2026: Cadena robusta de fallback para nombre/cargo del cliente
      nombreCliente: (orden.nombre_quien_recibe && orden.nombre_quien_recibe !== 'Cliente')
        ? orden.nombre_quien_recibe
        : firmaCliente?.persona
          ? `${firmaCliente.persona.primer_nombre || ''} ${firmaCliente.persona.primer_apellido || ''}`.trim() || orden.nombre_quien_recibe || undefined
          : clientePersona
            ? (clientePersona.nombre_comercial || `${clientePersona.primer_nombre || ''} ${clientePersona.primer_apellido || ''}`.trim() || clientePersona.razon_social || undefined)
            : orden.nombre_quien_recibe || undefined,
      cargoCliente: orden.cargo_quien_recibe || 'Cliente / Autorizador',
    };

    // 🔍 DEBUG: Log de datos antes de enviar al template
    this.logger.log(`📊 DEBUG PDF - esMultiEquipo: ${esMultiEquipo}`);
    this.logger.log(`📊 DEBUG PDF - equiposOrden: ${JSON.stringify(equiposOrden?.length)} equipos`);
    this.logger.log(`📊 DEBUG PDF - actividadesPorEquipo: ${JSON.stringify(actividadesPorEquipo?.length)} grupos`);
    if (actividadesPorEquipo && actividadesPorEquipo.length > 0) {
      this.logger.log(`📊 DEBUG PDF - Primer grupo actividades: ${JSON.stringify(actividadesPorEquipo[0]?.actividades?.length)} actividades`);
      // ✅ FIX 15-DIC-2025: Log detallado de primera actividad
      if (actividadesPorEquipo[0]?.actividades?.length > 0) {
        const primeraAct = actividadesPorEquipo[0].actividades[0];
        this.logger.log(`📊 DEBUG PDF - Primera actividad: sistema="${primeraAct?.sistema}", desc="${primeraAct?.descripcion?.substring(0, 30)}", resultado="${primeraAct?.resultado}"`);
      }
    }
    this.logger.log(`📊 DEBUG PDF - medicionesPorEquipo: ${JSON.stringify(medicionesPorEquipo?.length)} grupos`);
    this.logger.log(`📊 DEBUG PDF - evidenciasPorEquipo: ${JSON.stringify(evidenciasPorEquipo?.length)} grupos`);
    this.logger.log(`📊 DEBUG PDF - actividades totales: ${datosOrden.actividades?.length}`);

    // Determinar tipo de informe si no se especificó
    // ✅ FIX 16-DIC-2025: Prioridad de detección:
    // 1. PRIMERO: Número de orden (OS-ME-BOM2-... = BOMBA, OS-ME-GEN3-... = GENERADOR)
    // 2. SEGUNDO: Tipo del primer equipo en ordenes_equipos (para multi-equipo)
    // 3. TERCERO: Tipo del equipo principal de la orden
    // 4. FALLBACK: GENERADOR_A por defecto
    if (!tipo) {
      let tipoEquipoNombre: string | undefined = undefined;

      // ✅ PRIORIDAD 1: Detectar desde número de orden (MÁS CONFIABLE)
      if (orden.numero_orden) {
        const numOrden = orden.numero_orden.toUpperCase();
        if (numOrden.includes('BOM')) {
          tipoEquipoNombre = 'BOMBA';
          this.logger.log(`📊 DEBUG PDF - Tipo detectado de número orden: BOMBA`);
        } else if (numOrden.includes('GEN')) {
          tipoEquipoNombre = 'GENERADOR';
          this.logger.log(`📊 DEBUG PDF - Tipo detectado de número orden: GENERADOR`);
        } else if (numOrden.includes('MOT')) {
          tipoEquipoNombre = 'MOTOR';
          this.logger.log(`📊 DEBUG PDF - Tipo detectado de número orden: MOTOR`);
        }
      }

      // ✅ PRIORIDAD 2: Si no se detectó, intentar desde ordenes_equipos (multi-equipo)
      if (!tipoEquipoNombre && esMultiEquipo && orden.ordenes_equipos?.length > 0) {
        const primerEquipo = orden.ordenes_equipos[0]?.equipos;
        tipoEquipoNombre = primerEquipo?.tipos_equipo?.nombre;
        if (tipoEquipoNombre) {
          this.logger.log(`📊 DEBUG PDF - Tipo equipo (multi): ${tipoEquipoNombre}`);
        }
      }

      // ✅ PRIORIDAD 3: Si aún no se detectó, intentar desde equipo principal
      if (!tipoEquipoNombre) {
        tipoEquipoNombre = orden.equipos?.tipos_equipo?.nombre;
        if (tipoEquipoNombre) {
          this.logger.log(`📊 DEBUG PDF - Tipo equipo (principal): ${tipoEquipoNombre}`);
        }
      }

      // ✅ FIX 06-FEB-2026: Detectar tipo de servicio REAL desde la orden (CORRECTIVO, PREVENTIVO_A, PREVENTIVO_B)
      const codigoServicio = (orden.tipos_servicio?.codigo_tipo || '').toUpperCase();
      const categoriaServicio = (orden.tipos_servicio?.categoria || '').toUpperCase();
      const tipoServicioReal: 'PREVENTIVO_A' | 'PREVENTIVO_B' | 'CORRECTIVO' =
        (codigoServicio.includes('CORR') || categoriaServicio.includes('CORRECTIVO'))
          ? 'CORRECTIVO'
          : codigoServicio.includes('PREV_B') || codigoServicio.includes('_B')
            ? 'PREVENTIVO_B'
            : 'PREVENTIVO_A';

      this.logger.log(`📊 DEBUG PDF - tipoServicioReal: ${tipoServicioReal} (codigo=${codigoServicio}, categoria=${categoriaServicio})`);

      // Determinar tipo de informe final
      if (tipoEquipoNombre) {
        tipo = this.pdfService.determinarTipoInforme(
          this.mapTipoEquipo(tipoEquipoNombre),
          tipoServicioReal,
        );
      } else {
        // ✅ FALLBACK: Si es correctivo, usar CORRECTIVO; sino GENERADOR_A
        tipo = tipoServicioReal === 'CORRECTIVO' ? 'CORRECTIVO' : 'GENERADOR_A';
        this.logger.log(`📊 DEBUG PDF - Usando tipo por defecto: ${tipo}`);
      }

      this.logger.log(`📊 DEBUG PDF - tipoInforme determinado: ${tipo}`);
    }

    // ✅ FIX: Asegurar que tipo nunca sea undefined
    const tipoFinal: TipoInforme = tipo || 'GENERADOR_A';

    // Generar PDF
    const resultado = await this.pdfService.generarPDF({
      tipoInforme: tipoFinal,
      datos: datosOrden,
    });

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  /**
   * Genera PDF de una cotización comercial
   */
  @Get('cotizaciones/:id/pdf')
  @ApiOperation({
    summary: 'Generar PDF de cotización',
    description: 'Genera un PDF profesional MEKANOS con la cotización comercial',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la cotización',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'PDF generado exitosamente',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Cotización no encontrada' })
  async generarPdfCotizacion(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`📄 Generando PDF para cotización ${id}`);

    // Convertir ID a número
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      throw new NotFoundException(`ID de cotización inválido: ${id}`);
    }

    // Buscar la cotización con todas las relaciones necesarias
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idNumerico },
      include: {
        clientes: {
          include: {
            persona: true,
          },
        },
        empleados: {
          include: {
            persona: true,
          },
        },
        items_cotizacion_servicios: {
          include: {
            catalogo_servicios: true,
          },
        },
        items_cotizacion_componentes: {
          include: {
            catalogo_componentes: true,
          },
        },
        estados_cotizacion: true,
      },
    }) as any; // Cast as any para Prisma includes complejos

    if (!cotizacion) {
      throw new NotFoundException(`Cotización con ID ${id} no encontrada`);
    }

    // Calcular totales si no están calculados
    const subtotalServicios = cotizacion.items_cotizacion_servicios?.reduce(
      (acc: number, item: any) => acc + (Number(item.subtotal) || 0), 0
    ) || 0;

    const subtotalComponentes = cotizacion.items_cotizacion_componentes?.reduce(
      (acc: number, item: any) => acc + (Number(item.subtotal) || 0), 0
    ) || 0;

    const subtotalGeneral = subtotalServicios + subtotalComponentes;
    const descuentoMonto = Number(cotizacion.descuento_valor) || 0;
    const baseImponible = subtotalGeneral - descuentoMonto;
    const ivaPorcentaje = Number(cotizacion.iva_porcentaje) || 19;
    const ivaMonto = Number(cotizacion.iva_valor) || (baseImponible * ivaPorcentaje / 100);
    const total = Number(cotizacion.total_cotizacion) || (baseImponible + ivaMonto);

    // Obtener datos de la persona cliente
    const clientePersona = cotizacion.clientes?.persona;

    // Obtener datos del empleado que elaboró
    const empleadoPersona = cotizacion.empleados?.persona;

    // Construir datos para el PDF
    const datosCotizacion = {
      numeroCotizacion: cotizacion.numero_cotizacion || `COT-${id}`,
      fecha: cotizacion.fecha_cotizacion
        ? new Date(cotizacion.fecha_cotizacion).toLocaleDateString('es-CO')
        : new Date().toLocaleDateString('es-CO'),
      validezDias: cotizacion.dias_validez || 30,

      cliente: {
        // ✅ FIX MULTI-SEDE: Priorizar nombre_sede del cliente-sede en cotizaciones
        nombre: (cotizacion as any).clientes?.nombre_sede
          ? `${clientePersona?.razon_social || clientePersona?.nombre_comercial || clientePersona?.nombre_completo || 'N/A'} - ${(cotizacion as any).clientes.nombre_sede}`
          : (clientePersona?.razon_social || clientePersona?.nombre_comercial || clientePersona?.nombre_completo || 'N/A'),
        nit: clientePersona?.numero_identificacion || 'N/A',
        direccion: clientePersona?.direccion_principal || 'N/A',
        telefono: clientePersona?.telefono_principal || clientePersona?.celular || 'N/A',
        email: clientePersona?.email_principal || 'N/A',
        contacto: 'N/A', // Se podría agregar campo de contacto en cotización
      },

      vendedor: {
        nombre: empleadoPersona
          ? `${empleadoPersona.primer_nombre || ''} ${empleadoPersona.primer_apellido || ''}`.trim()
          : 'N/A',
        cargo: 'Asesor Comercial',
        telefono: empleadoPersona?.celular || empleadoPersona?.telefono_principal || 'N/A',
        email: empleadoPersona?.email_principal || 'N/A',
      },

      servicios: cotizacion.items_cotizacion_servicios?.map((item: any) => ({
        descripcion: item.descripcion_personalizada || item.catalogo_servicios?.nombre_servicio || 'Servicio',
        cantidad: Number(item.cantidad) || 1,
        precioUnitario: Number(item.precio_unitario) || 0,
        descuento: Number(item.descuento_porcentaje) || 0,
        subtotal: Number(item.subtotal) || 0,
      })) || [],

      componentes: cotizacion.items_cotizacion_componentes?.map((item: any) => ({
        codigo: item.catalogo_componentes?.codigo_interno || item.referencia_manual || 'N/A',
        descripcion: item.descripcion || item.catalogo_componentes?.descripcion_corta || 'Componente',
        cantidad: Number(item.cantidad) || 1,
        precioUnitario: Number(item.precio_unitario) || 0,
        descuento: Number(item.descuento_porcentaje) || 0,
        subtotal: Number(item.subtotal) || 0,
      })) || [],

      subtotalServicios,
      subtotalComponentes,
      subtotalGeneral,
      descuentoGlobal: {
        tipo: 'valor' as const,
        valor: descuentoMonto,
        monto: descuentoMonto,
      },
      baseImponible,
      iva: {
        porcentaje: ivaPorcentaje,
        monto: ivaMonto,
      },
      total,

      formaPago: cotizacion.forma_pago || 'Contado',
      tiempoEntrega: cotizacion.tiempo_estimado_dias ? `${cotizacion.tiempo_estimado_dias} días` : 'Por confirmar',
      garantia: cotizacion.meses_garantia ? `${cotizacion.meses_garantia} meses - ${cotizacion.observaciones_garantia || 'Garantía estándar'}` : 'Garantía estándar',
      notas: cotizacion.terminos_condiciones || '',
      estado: cotizacion.estados_cotizacion?.nombre_estado || 'BORRADOR',
    };

    // Generar PDF
    const resultado = await this.pdfService.generarPDFCotizacion(datosCotizacion as any);

    // Enviar respuesta
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  /**
   * Genera un PDF de cotización de prueba
   */
  @Get('pdf/cotizacion/prueba')
  @ApiOperation({
    summary: 'Generar PDF de cotización de prueba',
    description: 'Genera un PDF de cotización de ejemplo con datos ficticios',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF de cotización de prueba generado',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async generarPdfCotizacionPrueba(@Res() res: Response): Promise<void> {
    this.logger.log('🧪 Generando PDF de cotización de prueba...');

    const resultado = await this.pdfService.generarPDFCotizacionPrueba();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  /**
   * Genera un PDF de prueba
   */
  @Get('pdf/prueba')
  @ApiOperation({
    summary: 'Generar PDF de prueba',
    description: 'Genera un PDF de ejemplo con datos ficticios para verificar el funcionamiento',
  })
  @ApiResponse({
    status: 200,
    description: 'PDF de prueba generado',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async generarPdfPrueba(@Res() res: Response): Promise<void> {
    this.logger.log('🧪 Generando PDF de prueba...');

    const resultado = await this.pdfService.generarPDFPrueba();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resultado.filename}"`);
    res.setHeader('Content-Length', resultado.size);
    res.status(HttpStatus.OK).send(resultado.buffer);
  }

  /**
   * ========================================================================
   * ENDPOINT: Regenerar PDF y enviar por email
   * ========================================================================
   * Permite al admin regenerar el PDF con datos actualizados y enviarlo.
   */
  @Post('ordenes/:id/pdf/regenerar')
  @ApiOperation({
    summary: 'Regenerar PDF de orden y enviar por email',
    description: 'Regenera el PDF con los datos actualizados de la orden y opcionalmente lo envía por email',
  })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden de servicio',
    type: String,
  })
  @ApiBody({ type: RegenerarPdfDto })
  @ApiResponse({
    status: 200,
    description: 'PDF regenerado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        pdfUrl: { type: 'string' },
        emailEnviado: { type: 'boolean' },
        filename: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Orden no encontrada' })
  async regenerarPdfOrden(
    @Param('id') id: string,
    @Body() dto: RegenerarPdfDto,
  ): Promise<{
    success: boolean;
    message: string;
    pdfUrl?: string;
    emailEnviado?: boolean;
    filename?: string;
    pdfBase64?: string;
    usoPdfExistente?: boolean;
  }> {
    this.logger.log(`🔄 Regenerando PDF para orden ${id}`);

    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      throw new NotFoundException(`ID de orden inválido: ${id}`);
    }

    // ========================================================================
    // ✅ FIX 22-ENE-2026: Buscar PDF existente antes de regenerar
    // ========================================================================
    if (!dto.forzarRegeneracion) {
      const pdfExistente = await this.prisma.documentos_generados.findFirst({
        where: {
          tipo_documento: 'INFORME_SERVICIO',
          id_referencia: idNumerico,
        },
        orderBy: { fecha_generacion: 'desc' },
      });

      if (pdfExistente && pdfExistente.ruta_archivo) {
        this.logger.log(`📄 PDF existente encontrado: ${pdfExistente.ruta_archivo}`);

        // Si se solicita enviar email, descargar el PDF y enviarlo
        if (dto.enviarEmail && dto.emailDestino) {
          try {
            // Descargar PDF desde R2
            const response = await fetch(pdfExistente.ruta_archivo);
            if (response.ok) {
              const pdfBuffer = Buffer.from(await response.arrayBuffer());

              // Obtener datos básicos de la orden para el email
              const ordenBasica = await this.prisma.ordenes_servicio.findUnique({
                where: { id_orden_servicio: idNumerico },
                select: { numero_orden: true },
              });

              const resultado = await this.emailService.sendEmail({
                to: dto.emailDestino,
                subject: dto.asuntoEmail || `Informe de Mantenimiento - ${ordenBasica?.numero_orden || id}`,
                html: `<p>Adjunto encontrará el informe de servicio.</p>`,
                attachments: [{
                  filename: `Informe_${ordenBasica?.numero_orden || id}.pdf`,
                  content: pdfBuffer,
                  contentType: 'application/pdf',
                }],
              });

              this.logger.log(`📧 Email enviado usando PDF existente: ${resultado.success}`);

              return {
                success: true,
                message: 'PDF existente enviado por email',
                pdfUrl: pdfExistente.ruta_archivo,
                emailEnviado: resultado.success,
                filename: pdfExistente.numero_documento || `Informe_${id}.pdf`,
                usoPdfExistente: true,
              };
            }
          } catch (error) {
            this.logger.warn(`⚠️ Error usando PDF existente, regenerando: ${error}`);
            // Continuar con regeneración
          }
        } else {
          // No se requiere email, solo retornar URL existente
          return {
            success: true,
            message: 'PDF existente disponible (use forzarRegeneracion=true para regenerar)',
            pdfUrl: pdfExistente.ruta_archivo,
            emailEnviado: false,
            filename: pdfExistente.numero_documento || `Informe_${id}.pdf`,
            usoPdfExistente: true,
          };
        }
      } else {
        this.logger.log(`📄 No hay PDF existente, generando nuevo...`);
      }
    } else {
      this.logger.log(`🔄 Forzando regeneración de PDF...`);
    }

    // Buscar orden con relaciones
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idNumerico },
      include: {
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
            ordenes_equipos: {
              include: {
                equipos: true,
              },
            },
          },
        },
        mediciones_servicio: {
          include: {
            parametros_medicion: true,
            ordenes_equipos: {
              include: {
                equipos: true,
              },
            },
          },
        },
        evidencias_fotograficas: {
          include: {
            ordenes_equipos: {
              include: {
                equipos: true,
              },
            },
          },
        },
        ordenes_equipos: {
          include: {
            equipos: {
              include: {
                tipos_equipo: true,
              },
            },
          },
          orderBy: {
            orden_secuencia: 'asc',
          },
        },
        // ✅ FIX 15-ENE-2026: Incluir firmas digitales para el PDF
        firmas_digitales_ordenes_servicio_id_firma_tecnicoTofirmas_digitales: {
          include: {
            persona: true,
          },
        },
        firmas_digitales: {
          include: {
            persona: true,
          },
        },
        sedes_cliente: true,
      },
    }) as any;

    if (!orden) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    // ✅ FIX 15-ENE-2026: Extraer firmas digitales
    const firmaTecnico = orden.firmas_digitales_ordenes_servicio_id_firma_tecnicoTofirmas_digitales;
    const firmaCliente = orden.firmas_digitales; // Relación para id_firma_cliente

    // Construir datos para PDF (reutilizar lógica existente)
    const clientePersona = orden.clientes?.persona;
    // ✅ FIX MULTI-SEDE: Priorizar nombre_sede del cliente-sede
    const clienteNombreBase2 = clientePersona?.nombre_comercial || clientePersona?.razon_social || clientePersona?.nombre_completo || 'N/A';
    const clienteNombre = orden.clientes?.nombre_sede
      ? `${clienteNombreBase2} - ${orden.clientes.nombre_sede}`
      : clienteNombreBase2;
    // ✅ FIX MULTI-SEDE: Priorizar dirección de sede
    const clienteDireccion = orden.sedes_cliente?.direccion_sede || clientePersona?.direccion_principal || 'N/A';
    const clienteEmail = dto.emailDestino || clientePersona?.email_principal;

    // ✅ FIX 19-ENE-2026: Usar nombre_equipo y numero_serie_equipo directamente (igual que mobile)
    const marcaEquipo = orden.equipos?.nombre_equipo || 'N/A';
    const serieEquipo = orden.equipos?.numero_serie_equipo || 'N/A';

    // ✅ FIX 19-ENE-2026: Construir estructuras multi-equipo igual que mobile
    const esMultiEquipo = (orden.ordenes_equipos?.length || 0) > 1;
    this.logger.log(`📊 Es multi-equipo: ${esMultiEquipo} (${orden.ordenes_equipos?.length || 0} equipos)`);

    // ✅ FIX 14-FEB-2026: Normalizar orden_secuencia si todos tienen el mismo valor (bug histórico)
    if (esMultiEquipo && orden.ordenes_equipos) {
      const secuencias = orden.ordenes_equipos.map((oe: any) => oe.orden_secuencia);
      const todasIguales = secuencias.every((s: number) => s === secuencias[0]);
      if (todasIguales) {
        this.logger.warn(`⚠️ [enviarPdf] Normalizando orden_secuencia: todas eran ${secuencias[0]}`);
        orden.ordenes_equipos.forEach((oe: any, idx: number) => {
          oe.orden_secuencia = idx + 1;
        });
      }
    }

    // Construir actividadesPorEquipo si es multi-equipo
    let actividadesPorEquipo: any[] | undefined;
    let medicionesPorEquipo: any[] | undefined;
    let evidenciasPorEquipo: any[] | undefined;

    if (esMultiEquipo && orden.ordenes_equipos?.length > 0) {
      // Agrupar actividades por equipo
      const actividadesConEquipo = (orden.actividades_ejecutadas || [])
        .filter((act: any) => act.id_orden_equipo != null);
      const actividadesSinEquipo = (orden.actividades_ejecutadas || [])
        .filter((act: any) => act.id_orden_equipo == null);

      if (actividadesConEquipo.length > 0) {
        actividadesPorEquipo = orden.ordenes_equipos.map((oe: any) => {
          const actividadesEquipo = actividadesConEquipo
            .filter((act: any) => act.id_orden_equipo === oe.id_orden_equipo)
            .map((act: any) => ({
              sistema: act.catalogo_actividades?.catalogo_sistemas?.nombre_sistema || 'GENERAL',
              descripcion: act.catalogo_actividades?.descripcion_actividad || act.descripcion || 'N/A',
              resultado: (act.estado as any) || 'NA',
              observaciones: act.observaciones || '',
            }));

          return {
            equipo: {
              idOrdenEquipo: oe.id_orden_equipo,
              ordenSecuencia: oe.orden_secuencia || 1,
              nombreSistema: oe.nombre_sistema || oe.equipos?.nombre_equipo || 'Equipo',
              codigoEquipo: oe.equipos?.codigo_equipo,
              nombreEquipo: oe.equipos?.nombre_equipo,
            },
            actividades: actividadesEquipo,
          };
        });
      } else if (actividadesSinEquipo.length > 0) {
        // ✅ FIX 14-FEB-2026: fallback para órdenes históricas sin id_orden_equipo en actividades
        const actividadesUnicas = new Map<string, any[]>();
        for (const act of actividadesSinEquipo) {
          const key = act.catalogo_actividades?.descripcion_actividad || act.descripcion || 'N/A';
          if (!actividadesUnicas.has(key)) {
            actividadesUnicas.set(key, []);
          }
          actividadesUnicas.get(key)!.push(act);
        }

        actividadesPorEquipo = orden.ordenes_equipos.map((oe: any, equipoIndex: number) => ({
          equipo: {
            idOrdenEquipo: oe.id_orden_equipo,
            ordenSecuencia: oe.orden_secuencia || 1,
            nombreSistema: oe.nombre_sistema || oe.equipos?.nombre_equipo || 'Equipo',
            codigoEquipo: oe.equipos?.codigo_equipo,
            nombreEquipo: oe.equipos?.nombre_equipo,
          },
          actividades: Array.from(actividadesUnicas.entries()).map(([descripcion, acts]) => {
            const actEquipo = acts[equipoIndex] || acts[0];
            return {
              sistema: actEquipo.catalogo_actividades?.catalogo_sistemas?.nombre_sistema || 'GENERAL',
              descripcion,
              resultado: (actEquipo.estado as any) || 'NA',
              observaciones: actEquipo.observaciones || '',
            };
          }),
        }));
      }

      // Agrupar mediciones por equipo
      const medicionesConEquipo = (orden.mediciones_servicio || [])
        .filter((med: any) => med.id_orden_equipo != null);
      const medicionesSinEquipo = (orden.mediciones_servicio || [])
        .filter((med: any) => med.id_orden_equipo == null);

      if (medicionesConEquipo.length > 0) {
        medicionesPorEquipo = orden.ordenes_equipos.map((oe: any) => {
          const medicionesEquipo = medicionesConEquipo
            .filter((med: any) => med.id_orden_equipo === oe.id_orden_equipo)
            .map((med: any) => ({
              parametro: med.parametros_medicion?.nombre_parametro || med.nombre_parametro_snapshot || 'N/A',
              valor: Number(med.valor_numerico) || 0,
              unidad: med.parametros_medicion?.unidad_medida || med.unidad_medida_snapshot || '',
              nivelAlerta: (med.nivel_alerta as any) || 'OK',
            }));

          return {
            equipo: {
              idOrdenEquipo: oe.id_orden_equipo,
              ordenSecuencia: oe.orden_secuencia || 1,
              nombreSistema: oe.nombre_sistema || oe.equipos?.nombre_equipo || 'Equipo',
            },
            mediciones: medicionesEquipo,
          };
        });
      } else if (medicionesSinEquipo.length > 0) {
        // ✅ FIX 14-FEB-2026: fallback para órdenes históricas sin id_orden_equipo en mediciones
        const medicionesUnicas = new Map<string, any[]>();
        for (const med of medicionesSinEquipo) {
          const key = med.parametros_medicion?.nombre_parametro || med.nombre_parametro_snapshot || 'N/A';
          if (!medicionesUnicas.has(key)) {
            medicionesUnicas.set(key, []);
          }
          medicionesUnicas.get(key)!.push(med);
        }

        medicionesPorEquipo = orden.ordenes_equipos.map((oe: any, equipoIndex: number) => ({
          equipo: {
            idOrdenEquipo: oe.id_orden_equipo,
            ordenSecuencia: oe.orden_secuencia || 1,
            nombreSistema: oe.nombre_sistema || oe.equipos?.nombre_equipo || 'Equipo',
          },
          mediciones: Array.from(medicionesUnicas.entries()).map(([parametro, meds]) => {
            const medEquipo = meds[equipoIndex] || meds[0];
            return {
              parametro,
              valor: Number(medEquipo.valor_numerico) || 0,
              unidad: medEquipo.parametros_medicion?.unidad_medida || medEquipo.unidad_medida_snapshot || '',
              nivelAlerta: (medEquipo.nivel_alerta as any) || 'OK',
            };
          }),
        }));
      }

      // Agrupar evidencias por equipo
      evidenciasPorEquipo = orden.ordenes_equipos.map((oe: any) => {
        const evidenciasEquipo = (orden.evidencias_fotograficas || [])
          .filter((ev: any) => ev.id_orden_equipo === oe.id_orden_equipo)
          .map((ev: any) => ({
            url: ev.ruta_archivo,
            caption: `${ev.tipo_evidencia || 'EVIDENCIA'}: ${ev.descripcion || ''}`.trim(),
            momento: ev.tipo_evidencia || 'DURANTE',
          }));

        return {
          equipo: {
            idOrdenEquipo: oe.id_orden_equipo,
            ordenSecuencia: oe.orden_secuencia || 1,
            nombreSistema: oe.nombre_sistema || oe.equipos?.nombre_equipo || 'Equipo',
          },
          evidencias: evidenciasEquipo,
        };
      });

      // ✅ FIX: Agregar fotos GENERALES huérfanas (sin id_orden_equipo) como pseudo-equipo
      const fotosGeneralesHuerfanas = (orden.evidencias_fotograficas || [])
        .filter((ev: any) => !ev.id_orden_equipo && (ev.tipo_evidencia === 'GENERAL' || !ev.tipo_evidencia))
        .map((ev: any) => ({
          url: ev.ruta_archivo,
          caption: `${ev.tipo_evidencia || 'GENERAL'}: ${ev.descripcion || ''}`.trim(),
          momento: ev.tipo_evidencia || 'GENERAL',
        }));

      if (fotosGeneralesHuerfanas.length > 0 && evidenciasPorEquipo) {
        evidenciasPorEquipo.push({
          equipo: {
            idOrdenEquipo: 0,
            ordenSecuencia: 999,
            nombreSistema: 'FOTOGRAFÍAS GENERALES',
            codigoEquipo: undefined,
            nombreEquipo: 'FOTOGRAFÍAS GENERALES',
            estado: undefined,
          },
          evidencias: fotosGeneralesHuerfanas,
        });
        this.logger.log(`📷 Fotos generales huérfanas agregadas: ${fotosGeneralesHuerfanas.length}`);
      }

      if (actividadesPorEquipo) {
        this.logger.log(`📋 Actividades agrupadas: ${actividadesPorEquipo.map(g => `${g.equipo.nombreSistema}:${g.actividades.length}`).join(', ')}`);
      }
      if (medicionesPorEquipo) {
        this.logger.log(`📏 Mediciones agrupadas: ${medicionesPorEquipo.map(g => `${g.equipo.nombreSistema}:${g.mediciones.length}`).join(', ')}`);
      }
      if (evidenciasPorEquipo) {
        this.logger.log(`📷 Evidencias agrupadas: ${evidenciasPorEquipo.map(g => `${g.equipo.nombreSistema}:${g.evidencias.length}`).join(', ')}`);
      }
    }

    const datosOrden: DatosOrdenPDF = {
      cliente: clienteNombre,
      direccion: clienteDireccion,
      marcaEquipo,
      serieEquipo,
      tipoEquipo: this.mapTipoEquipo(orden.equipos?.tipos_equipo?.nombre || ''),
      // ✅ FIX 07-FEB-2026: Usar fecha_inicio_real (fecha real del servicio) cuando existe,
      // fallback a fecha_programada. Antes siempre usaba fecha_programada causando desfase.
      fecha: orden.fecha_inicio_real
        ? new Date(orden.fecha_inicio_real).toLocaleDateString('es-CO')
        : orden.fecha_programada
          ? new Date(orden.fecha_programada).toLocaleDateString('es-CO')
          : new Date().toLocaleDateString('es-CO'),
      tecnico: orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona
        ? `${orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.primer_nombre || ''} ${orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.primer_apellido || ''}`.trim() || 'N/A'
        : 'N/A',
      // ✅ FIX 19-ENE-2026: Formato HH:mm igual que mobile
      horaEntrada: this.formatearHora(orden.fecha_inicio_real),
      horaSalida: this.formatearHora(orden.fecha_fin_real),
      tipoServicio: orden.tipos_servicio?.nombre_tipo || 'PREVENTIVO_A',
      numeroOrden: orden.numero_orden || `ORD-${id}`,
      // ✅ FIX 19-ENE-2026: Extraer datosModulo correctamente de las mediciones
      datosModulo: this.extraerDatosModuloReal(orden.mediciones_servicio),
      // Actividades flat (para backward compatibility y single-equipo)
      actividades: orden.actividades_ejecutadas?.map((act: any) => ({
        sistema: act.catalogo_actividades?.catalogo_sistemas?.nombre_sistema || 'GENERAL',
        descripcion: act.catalogo_actividades?.descripcion_actividad || act.descripcion || 'N/A',
        resultado: (act.estado as any) || 'NA',
        observaciones: act.observaciones || '',
      })) || [],
      // Mediciones flat (para backward compatibility y single-equipo)
      mediciones: orden.mediciones_servicio?.map((med: any) => ({
        parametro: med.parametros_medicion?.nombre_parametro || med.nombre_parametro_snapshot || 'N/A',
        valor: Number(med.valor_numerico) || 0,
        unidad: med.parametros_medicion?.unidad_medida || med.unidad_medida_snapshot || '',
        nivelAlerta: (med.nivel_alerta as any) || 'OK',
      })) || [],
      // Evidencias flat (para backward compatibility y single-equipo)
      evidencias: orden.evidencias_fotograficas?.map((ev: any) => ({
        url: ev.ruta_archivo,
        caption: `${ev.tipo_evidencia || 'EVIDENCIA'}: ${ev.descripcion || ''}`.trim(),
      })) || [],
      observaciones: orden.observaciones_cierre || orden.observaciones || '',
      // ✅ FIX 19-ENE-2026: Estructuras multi-equipo (igual que mobile)
      esMultiEquipo,
      actividadesPorEquipo,
      medicionesPorEquipo,
      evidenciasPorEquipo,
      // ✅ FIX 19-ENE-2026: Corregir campo de firma (firma_base64, no imagen_base64)
      // Y agregar prefijo data:image/png;base64, si no lo tiene
      firmaTecnico: firmaTecnico?.firma_base64
        ? (firmaTecnico.firma_base64.startsWith('data:') ? firmaTecnico.firma_base64 : `data:image/png;base64,${firmaTecnico.firma_base64}`)
        : undefined,
      firmaCliente: firmaCliente?.firma_base64
        ? (firmaCliente.firma_base64.startsWith('data:') ? firmaCliente.firma_base64 : `data:image/png;base64,${firmaCliente.firma_base64}`)
        : undefined,
      nombreTecnico: orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona
        ? `${orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.primer_nombre || ''} ${orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.primer_apellido || ''}`.trim()
        : undefined,
      cargoTecnico: 'Técnico de Servicio',
      // ✅ FIX 06-FEB-2026: Cadena robusta de fallback para nombre/cargo del cliente
      // 1. nombre_quien_recibe explícito (del mobile) si no es genérico
      // 2. Nombre de la persona vinculada a la firma del cliente
      // 3. Nombre de la persona del cliente de la orden
      nombreCliente: (orden.nombre_quien_recibe && orden.nombre_quien_recibe !== 'Cliente')
        ? orden.nombre_quien_recibe
        : firmaCliente?.persona
          ? `${firmaCliente.persona.primer_nombre || ''} ${firmaCliente.persona.primer_apellido || ''}`.trim() || orden.nombre_quien_recibe || undefined
          : clientePersona
            ? (clientePersona.nombre_comercial || `${clientePersona.primer_nombre || ''} ${clientePersona.primer_apellido || ''}`.trim() || clientePersona.razon_social || undefined)
            : orden.nombre_quien_recibe || undefined,
      cargoCliente: orden.cargo_quien_recibe || 'Cliente / Autorizador',
    };

    // ✅ FIX 15-ENE-2026: Determinar tipo de informe basado en tipos_servicio.codigo_tipo
    let tipoInforme: TipoInforme = 'GENERADOR_A';
    const codigoTipo = orden.tipos_servicio?.codigo_tipo?.toUpperCase() || '';

    if (codigoTipo.includes('CORR')) {
      tipoInforme = 'CORRECTIVO';
    } else if (codigoTipo.includes('BOM')) {
      tipoInforme = 'BOMBA_A';
    } else if (codigoTipo.includes('GEN_PREV_B') || codigoTipo.includes('PREV_B')) {
      tipoInforme = 'GENERADOR_B';
    } else if (codigoTipo.includes('GEN') || codigoTipo.includes('PREV_A')) {
      tipoInforme = 'GENERADOR_A';
    }

    this.logger.log(`📋 Tipo de servicio: ${codigoTipo} -> Tipo de informe: ${tipoInforme}`);

    // Generar PDF
    const resultado = await this.pdfService.generarPDF({
      tipoInforme,
      datos: datosOrden,
    });

    this.logger.log(`✅ PDF regenerado: ${resultado.filename} (${resultado.size} bytes)`);

    // ========================================================================
    // SUBIR PDF A R2 Y REGISTRAR/ACTUALIZAR EN BD
    // ========================================================================
    let urlPdf: string | undefined;
    if (dto.guardarEnR2 !== false) {
      try {
        // Subir a R2
        const timestamp = Date.now();
        const r2Filename = `${orden.numero_orden}/informe_${timestamp}.pdf`;
        urlPdf = await this.r2Service.uploadPDF(resultado.buffer, r2Filename);
        this.logger.log(`📎 PDF subido a R2: ${urlPdf}`);

        // ✅ FIX 24-ENE-2026: Buscar documento existente y ACTUALIZAR en lugar de crear nuevo
        const hash = createHash('sha256').update(resultado.buffer).digest('hex');
        const documentoExistente = await this.prisma.documentos_generados.findFirst({
          where: {
            tipo_documento: 'INFORME_SERVICIO',
            id_referencia: idNumerico,
          },
          orderBy: { fecha_generacion: 'desc' },
        });

        if (documentoExistente) {
          // ACTUALIZAR registro existente
          await this.prisma.documentos_generados.update({
            where: { id_documento: documentoExistente.id_documento },
            data: {
              ruta_archivo: urlPdf,
              hash_sha256: hash,
              tama_o_bytes: BigInt(resultado.size),
              fecha_generacion: new Date(),
              herramienta_generacion: 'MEKANOS-PDF-CONTROLLER-REGENERAR',
            },
          });
          this.logger.log(`✅ Documento actualizado en BD (id: ${documentoExistente.id_documento})`);
        } else {
          // CREAR nuevo registro solo si no existe
          await this.prisma.documentos_generados.create({
            data: {
              tipo_documento: 'INFORME_SERVICIO',
              id_referencia: idNumerico,
              numero_documento: `INF-${orden.numero_orden}-${timestamp}`,
              ruta_archivo: urlPdf,
              hash_sha256: hash,
              tama_o_bytes: BigInt(resultado.size),
              mime_type: 'application/pdf',
              fecha_generacion: new Date(),
              generado_por: 1, // Sistema
              herramienta_generacion: 'MEKANOS-PDF-CONTROLLER-REGENERAR',
            },
          });
          this.logger.log(`✅ Documento creado en BD`);
        }
      } catch (error) {
        this.logger.error(`❌ Error subiendo PDF a R2: ${error}`);
        // No fallar todo el proceso por error de R2
      }
    }

    // Enviar por email si se solicita
    let emailEnviado = false;
    this.logger.log(`📧 Verificando envío de email: enviarEmail=${dto.enviarEmail}, clienteEmail=${clienteEmail}`);

    if (dto.enviarEmail && clienteEmail) {
      try {
        this.logger.log(`📧 Preparando envío de email a ${clienteEmail}...`);
        const asunto = dto.asuntoEmail || `Informe de Mantenimiento - ${orden.numero_orden}`;
        const mensaje = dto.mensajeEmail || `Adjunto encontrará el informe de mantenimiento de la orden ${orden.numero_orden}.`;

        const tipoServicioDetallado = orden.tipos_servicio?.nombre_tipo || 'Mantenimiento';
        const codigoTipo = orden.tipos_servicio?.codigo_tipo || '';
        let tipoServicioCompleto = tipoServicioDetallado;
        if (codigoTipo.includes('PREVENTIVO_A')) {
          tipoServicioCompleto = `Mantenimiento Preventivo Tipo A`;
        } else if (codigoTipo.includes('PREVENTIVO_B')) {
          tipoServicioCompleto = `Mantenimiento Preventivo Tipo B`;
        } else if (codigoTipo.includes('CORRECTIVO')) {
          tipoServicioCompleto = `Mantenimiento Correctivo`;
        }

        const htmlTemplate = this.emailTemplates.generateInformeMantenimientoTemplate({
          ordenNumero: orden.numero_orden,
          tipoServicio: tipoServicioDetallado,
          tipoServicioDetallado: tipoServicioCompleto,
          clienteNombre: clienteNombre,
          clienteDireccion: clienteDireccion !== 'N/A' ? clienteDireccion : undefined,
          clienteCiudad: 'Cartagena de Indias',
          equipoNombre: marcaEquipo !== 'N/A' ? marcaEquipo : undefined,
          equipoMarca: marcaEquipo !== 'N/A' ? marcaEquipo : undefined,
          equipoSerie: serieEquipo !== 'N/A' ? serieEquipo : undefined,
          equipoUbicacion: clienteDireccion !== 'N/A' ? clienteDireccion : undefined,
          fechaServicio: datosOrden.fecha,
          tecnicoNombre: datosOrden.tecnico,
          tecnicoCargo: 'Técnico Especializado',
          estadoServicio: 'COMPLETADO',
          mensajePersonalizado: mensaje,
        });

        // ✅ MULTI-EMAIL: Usar cuenta específica del cliente si está configurada
        const idCuentaEmailRegen = orden.clientes?.id_cuenta_email_remitente || undefined;
        this.logger.log(`📧 [MULTI-EMAIL REGEN] Cliente id_cuenta_email_remitente: ${idCuentaEmailRegen ?? 'NO CONFIGURADA (usará cuenta por defecto)'}`);

        const regenEmailResult = await this.emailService.sendEmailFromAccount({
          to: clienteEmail,
          subject: asunto,
          html: htmlTemplate,
          attachments: [{
            filename: resultado.filename,
            content: resultado.buffer,
            contentType: 'application/pdf',
          }],
        }, idCuentaEmailRegen);

        emailEnviado = regenEmailResult.success;
        this.logger.log(`${emailEnviado ? '✅' : '❌'} Email ${emailEnviado ? 'enviado' : 'fallido'} a ${clienteEmail}`);

        // ✅ FIX 18-FEB-2026: Registrar historial de envío
        try {
          await this.prisma.historial_emails_enviados.create({
            data: {
              id_orden_servicio: idNumerico,
              destinatario_to: clienteEmail,
              asunto,
              estado_envio: emailEnviado ? 'EXITOSO' : 'FALLIDO',
              message_id: regenEmailResult.messageId || null,
              mensaje_error: emailEnviado ? null : (regenEmailResult.error || 'Error desconocido'),
              url_pdf_enviado: urlPdf || null,
              origen_envio: 'ADMIN_PORTAL_REGENERAR',
            },
          });
          this.logger.log(`📝 Historial de envío registrado (regenerar) para orden ${id}`);
        } catch (histErr) {
          this.logger.warn(`⚠️ Error registrando historial de envío: ${histErr}`);
        }
      } catch (error) {
        this.logger.error(`❌ Error enviando email: ${error}`);
        this.logger.error(`   Stack: ${error instanceof Error ? error.stack : 'N/A'}`);

        // ✅ FIX 18-FEB-2026: Registrar historial de envío FALLIDO (excepción)
        try {
          await this.prisma.historial_emails_enviados.create({
            data: {
              id_orden_servicio: idNumerico,
              destinatario_to: clienteEmail || dto.emailDestino || 'desconocido',
              asunto: asunto || `Informe de Mantenimiento - ${orden.numero_orden}`,
              estado_envio: 'FALLIDO',
              mensaje_error: error instanceof Error ? error.message : String(error),
              origen_envio: 'ADMIN_PORTAL_REGENERAR',
            },
          });
        } catch (histErr) {
          this.logger.warn(`⚠️ Error registrando historial: ${histErr}`);
        }
      }
    } else if (dto.enviarEmail && !clienteEmail) {
      this.logger.warn(`⚠️ No se puede enviar email: clienteEmail no disponible`);
      this.logger.warn(`   dto.emailDestino: ${dto.emailDestino || 'NO PROPORCIONADO'}`);
      this.logger.warn(`   clientePersona?.email_principal: ${clientePersona?.email_principal || 'NO DISPONIBLE'}`);
    }

    return {
      success: true,
      message: emailEnviado
        ? `PDF regenerado y enviado a ${clienteEmail}`
        : 'PDF regenerado exitosamente',
      filename: resultado.filename,
      emailEnviado,
      pdfBase64: resultado.buffer.toString('base64'),
    };
  }

  /**
   * ========================================================================
   * ENDPOINT OPTIMIZADO: Enviar email con PDF existente en R2
   * ========================================================================
   * Usa el PDF ya guardado en R2 sin regenerar. Mucho más rápido (~2s vs ~25s).
   * Solo regenera si no existe PDF o si se fuerza con forzarRegeneracion=true.
   */
  @Post('ordenes/:id/pdf/enviar')
  @ApiOperation({
    summary: 'Enviar email con PDF existente (OPTIMIZADO)',
    description: 'Envía el PDF ya guardado en R2 sin regenerar. Usa esto desde Admin Portal para reenviar informes.',
  })
  @ApiParam({ name: 'id', description: 'ID de la orden de servicio', type: String })
  @ApiBody({ type: EnviarPdfExistenteDto })
  @ApiResponse({
    status: 200,
    description: 'Email enviado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        usoPdfExistente: { type: 'boolean' },
        urlPdf: { type: 'string' },
      },
    },
  })
  async enviarPdfExistente(
    @Param('id') id: string,
    @Body() dto: EnviarPdfExistenteDto,
  ): Promise<{
    success: boolean;
    message: string;
    usoPdfExistente: boolean;
    urlPdf?: string;
    error?: string;
  }> {
    const idNumerico = parseInt(id, 10);
    if (isNaN(idNumerico)) {
      throw new NotFoundException(`ID de orden inválido: ${id}`);
    }

    this.logger.log(`📧 [ENVIAR-OPTIMIZADO] Orden ${id} -> ${dto.emailDestino}`);

    // 1. Buscar orden básica
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idNumerico },
      select: {
        numero_orden: true,
        fecha_programada: true,
        empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
          select: {
            persona: {
              select: { primer_nombre: true, primer_apellido: true }
            }
          }
        }
      }
    });

    if (!orden) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    // 2. Buscar PDF existente en documentos_generados
    let pdfBuffer: Buffer | null = null;
    let urlPdf: string | null = null;
    let filename = `Informe_${orden.numero_orden}.pdf`;

    if (!dto.forzarRegeneracion) {
      const documento = await this.prisma.documentos_generados.findFirst({
        where: {
          id_referencia: idNumerico,
          tipo_documento: 'INFORME_SERVICIO',
        },
        orderBy: { fecha_generacion: 'desc' },
      });

      if (documento?.ruta_archivo) {
        urlPdf = documento.ruta_archivo;
        this.logger.log(`✅ PDF existente encontrado: ${urlPdf}`);

        // Descargar PDF desde R2
        try {
          const response = await fetch(urlPdf);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            pdfBuffer = Buffer.from(arrayBuffer);
            filename = urlPdf.split('/').pop() || filename;
            this.logger.log(`✅ PDF descargado: ${pdfBuffer.length} bytes`);
          } else {
            this.logger.warn(`⚠️ Error descargando PDF (${response.status}), se regenerará`);
          }
        } catch (error) {
          this.logger.warn(`⚠️ Error fetch PDF: ${error}, se regenerará`);
        }
      }
    }

    // 3. Si no hay PDF existente o falló la descarga, llamar al endpoint de regenerar
    if (!pdfBuffer) {
      this.logger.log(`🔄 Regenerando PDF (no existe o forzado)...`);

      // Llamar internamente al método regenerar
      const regenerarResult = await this.regenerarPdfOrden(id, {
        emailDestino: dto.emailDestino,
        enviarEmail: true,
        asuntoEmail: dto.asuntoEmail,
        mensajeEmail: dto.mensajeEmail,
      });

      return {
        success: regenerarResult.success,
        message: regenerarResult.message,
        usoPdfExistente: false,
        urlPdf: undefined,
        error: regenerarResult.success ? undefined : 'Error regenerando PDF',
      };
    }

    // 4. Enviar email con PDF existente
    const tecnico = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona;
    const tecnicoNombre = tecnico
      ? `${tecnico.primer_nombre || ''} ${tecnico.primer_apellido || ''}`.trim()
      : 'Técnico';
    // ✅ FIX 07-FEB-2026: Usar fecha real del servicio cuando existe
    const fechaServicio = orden.fecha_inicio_real
      ? new Date(orden.fecha_inicio_real).toLocaleDateString('es-CO')
      : orden.fecha_programada
        ? new Date(orden.fecha_programada).toLocaleDateString('es-CO')
        : new Date().toLocaleDateString('es-CO');

    const asunto = dto.asuntoEmail || `Informe de Mantenimiento - ${orden.numero_orden}`;
    const mensaje = dto.mensajeEmail || `Adjunto encontrará el informe de mantenimiento de la orden ${orden.numero_orden}.`;

    try {
      const clienteOrden = await this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: idNumerico },
        include: {
          clientes: { include: { persona: true } },
          tipos_servicio: true,
          equipos: true,
          sedes_cliente: true,
        },
      });

      // ✅ MULTI-EMAIL HABILITADO: Leer cuenta email del cliente
      const idCuentaEmailCliente = clienteOrden?.clientes?.id_cuenta_email_remitente || null;
      this.logger.log(`📧 [MULTI-EMAIL] Cliente id_cuenta_email_remitente: ${idCuentaEmailCliente ?? 'NO CONFIGURADA (usará cuenta por defecto)'}`);


      const clientePersona = clienteOrden?.clientes?.persona;
      // ✅ FIX MULTI-SEDE: Priorizar nombre_sede del cliente-sede
      const clienteNombreBase3 = clientePersona?.nombre_comercial || clientePersona?.razon_social || dto.emailDestino.split('@')[0];
      const clienteNombreCompleto = clienteOrden?.clientes?.nombre_sede
        ? `${clienteNombreBase3} - ${clienteOrden.clientes.nombre_sede}`
        : clienteNombreBase3;
      // ✅ FIX MULTI-SEDE: Priorizar dirección de sede
      const clienteDireccion = clienteOrden?.sedes_cliente?.direccion_sede ?? clientePersona?.direccion_principal ?? undefined;
      const marcaEquipo = clienteOrden?.equipos?.nombre_equipo ?? undefined;
      const serieEquipo = clienteOrden?.equipos?.numero_serie_equipo ?? undefined;
      const tipoServicioNombre = clienteOrden?.tipos_servicio?.nombre_tipo || 'Mantenimiento';
      const codigoTipo = clienteOrden?.tipos_servicio?.codigo_tipo || '';

      let tipoServicioCompleto = tipoServicioNombre;
      if (codigoTipo.includes('PREVENTIVO_A')) {
        tipoServicioCompleto = `Mantenimiento Preventivo Tipo A`;
      } else if (codigoTipo.includes('PREVENTIVO_B')) {
        tipoServicioCompleto = `Mantenimiento Preventivo Tipo B`;
      } else if (codigoTipo.includes('CORRECTIVO')) {
        tipoServicioCompleto = `Mantenimiento Correctivo`;
      }

      const htmlTemplate = this.emailTemplates.generateInformeMantenimientoTemplate({
        ordenNumero: orden.numero_orden,
        tipoServicio: tipoServicioNombre,
        tipoServicioDetallado: tipoServicioCompleto,
        clienteNombre: clienteNombreCompleto,
        clienteDireccion: clienteDireccion,
        clienteCiudad: 'Cartagena de Indias',
        equipoNombre: marcaEquipo,
        equipoMarca: marcaEquipo,
        equipoSerie: serieEquipo,
        equipoUbicacion: clienteDireccion,
        fechaServicio,
        tecnicoNombre,
        tecnicoCargo: 'Técnico Especializado',
        estadoServicio: 'COMPLETADO',
        mensajePersonalizado: mensaje,
      });

      // ✅ FIX 13-FEB-2026: Soporte CC para múltiples destinatarios
      const ccEmails = dto.emailsCc?.filter(e => e && e.includes('@')) || [];
      if (ccEmails.length > 0) {
        this.logger.log(`📧 [CC] Emails adicionales: ${ccEmails.join(', ')}`);
      }

      // ✅ MULTI-EMAIL: Usar cuenta específica del cliente si está configurada
      const emailResult = await this.emailService.sendEmailFromAccount({
        to: dto.emailDestino,
        subject: asunto,
        html: htmlTemplate,
        attachments: [{
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        }],
        ...(ccEmails.length > 0 ? { cc: ccEmails } : {}),
      }, idCuentaEmailCliente ?? undefined);

      const allDestinatarios = [dto.emailDestino, ...ccEmails];
      if (emailResult.success) {
        this.logger.log(`✅ Email enviado exitosamente a ${allDestinatarios.join(', ')}`);

        // ✅ FIX 18-FEB-2026: Registrar historial de envío EXITOSO
        try {
          await this.prisma.historial_emails_enviados.create({
            data: {
              id_orden_servicio: idNumerico,
              destinatario_to: dto.emailDestino,
              destinatarios_cc: ccEmails.length > 0 ? ccEmails.join(', ') : null,
              asunto,
              estado_envio: 'EXITOSO',
              message_id: emailResult.messageId || null,
              url_pdf_enviado: urlPdf || null,
              origen_envio: 'ADMIN_PORTAL',
            },
          });
          this.logger.log(`📝 Historial de envío registrado para orden ${id}`);
        } catch (histErr) {
          this.logger.warn(`⚠️ Error registrando historial de envío: ${histErr}`);
        }

        return {
          success: true,
          message: `Email enviado a ${allDestinatarios.join(', ')} (PDF existente, sin regenerar)`,
          usoPdfExistente: true,
          urlPdf: urlPdf || undefined,
        };
      } else {
        this.logger.error(`❌ Error enviando email: ${emailResult.error}`);

        // ✅ FIX 18-FEB-2026: Registrar historial de envío FALLIDO
        try {
          await this.prisma.historial_emails_enviados.create({
            data: {
              id_orden_servicio: idNumerico,
              destinatario_to: dto.emailDestino,
              destinatarios_cc: ccEmails.length > 0 ? ccEmails.join(', ') : null,
              asunto,
              estado_envio: 'FALLIDO',
              mensaje_error: emailResult.error || 'Error desconocido',
              url_pdf_enviado: urlPdf || null,
              origen_envio: 'ADMIN_PORTAL',
            },
          });
        } catch (histErr) {
          this.logger.warn(`⚠️ Error registrando historial de envío fallido: ${histErr}`);
        }

        return {
          success: false,
          message: 'Error enviando email',
          usoPdfExistente: true,
          error: emailResult.error,
        };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Error en envío: ${errorMsg}`);

      // ✅ FIX 18-FEB-2026: Registrar historial de envío FALLIDO (excepción)
      try {
        await this.prisma.historial_emails_enviados.create({
          data: {
            id_orden_servicio: idNumerico,
            destinatario_to: dto.emailDestino,
            asunto: dto.asuntoEmail || `Informe de Mantenimiento`,
            estado_envio: 'FALLIDO',
            mensaje_error: errorMsg,
            origen_envio: 'ADMIN_PORTAL',
          },
        });
      } catch (histErr) {
        this.logger.warn(`⚠️ Error registrando historial: ${histErr}`);
      }

      return {
        success: false,
        message: 'Error enviando email',
        usoPdfExistente: true,
        error: errorMsg,
      };
    }
  }

  /**
   * Mapea el nombre del tipo de equipo a la enum
   */
  private mapTipoEquipo(nombre: string | undefined): 'GENERADOR' | 'BOMBA' | 'MOTOR' {
    if (!nombre) return 'GENERADOR';

    const nombreUpper = nombre.toUpperCase();
    if (nombreUpper.includes('BOMBA')) return 'BOMBA';
    if (nombreUpper.includes('MOTOR')) return 'MOTOR';
    return 'GENERADOR';
  }

  /**
   * Extrae datos del módulo de control de las mediciones
   */
  private extraerDatosModulo(_mediciones: any[]): DatosOrdenPDF['datosModulo'] {
    // TODO: Implementar extracción de datos específicos del módulo de control
    // Por ahora retorna undefined para usar valores por defecto
    return undefined;
  }

  /**
   * ✅ FIX 19-ENE-2026: Formatea fecha a formato HH:mm (igual que mobile)
   */
  private formatearHora(fecha: Date | string | null | undefined): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return 'N/A';
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * ✅ FIX 19-ENE-2026: Extrae datos del módulo de control de las mediciones (implementación real)
   * Mapea los parámetros de medición a los campos del módulo de control del PDF
   */
  private extraerDatosModuloReal(mediciones: any[]): DatosOrdenPDF['datosModulo'] {
    if (!mediciones || mediciones.length === 0) return undefined;

    const datosModulo: NonNullable<DatosOrdenPDF['datosModulo']> = {};

    for (const med of mediciones) {
      const nombreParametro = (med.parametros_medicion?.nombre_parametro || med.nombre_parametro_snapshot || '').toLowerCase();
      const valor = Number(med.valor_numerico) || 0;

      // Mapear según el nombre del parámetro
      if (nombreParametro.includes('velocidad') || nombreParametro.includes('rpm')) {
        datosModulo.rpm = valor;
      } else if (nombreParametro.includes('presión') || nombreParametro.includes('presion') || nombreParametro.includes('aceite')) {
        datosModulo.presionAceite = valor;
      } else if (nombreParametro.includes('temperatura') || nombreParametro.includes('refrigerante')) {
        datosModulo.temperaturaRefrigerante = valor;
      } else if (nombreParametro.includes('carga') || nombreParametro.includes('batería') || nombreParametro.includes('bateria')) {
        datosModulo.cargaBateria = valor;
      } else if (nombreParametro.includes('horas') || nombreParametro.includes('horómetro') || nombreParametro.includes('horometro')) {
        datosModulo.horasTrabajo = valor;
      } else if (nombreParametro.includes('voltaje')) {
        datosModulo.voltaje = valor;
      } else if (nombreParametro.includes('frecuencia')) {
        datosModulo.frecuencia = valor;
      } else if (nombreParametro.includes('corriente') || nombreParametro.includes('amperaje')) {
        datosModulo.corriente = valor;
      }
    }

    // Solo retornar si hay al menos un dato
    const tieneDatos = Object.values(datosModulo).some(v => v !== undefined);
    return tieneDatos ? datosModulo : undefined;
  }
}
