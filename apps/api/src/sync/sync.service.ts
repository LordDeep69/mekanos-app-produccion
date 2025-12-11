import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { validarTransicion } from '../ordenes/domain/workflow-estados';
import {
  SyncActividadCatalogoDto,
  SyncBatchResponseDto,
  SyncDownloadResponseDto,
  SyncOrdenDownloadDto,
  SyncOrdenResultDto,
  SyncParametroMedicionDto,
} from './dto/sync-response.dto';
import {
  SyncBatchUploadDto,
  SyncMedicionDto,
  SyncOrdenDto,
} from './dto/sync-upload-orden.dto';

/**
 * Servicio de Sincronización Móvil - FASE 2.3
 * 
 * Implementa estrategia offline-first:
 * 1. POST /sync/ordenes - Batch upload desde móvil
 * 2. GET /sync/download/:tecnicoId - Download datos para trabajo offline
 * 
 * Características:
 * - Procesamiento transaccional por orden
 * - Detección de conflictos por versión
 * - Mapeo de IDs locales → servidor
 * - Validación FSM en cambios de estado
 */
@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commandBus: CommandBus,
  ) { }

  /**
   * UPLOAD: Sincronizar batch de órdenes desde móvil
   */
  async syncBatchUpload(dto: SyncBatchUploadDto): Promise<SyncBatchResponseDto> {
    this.logger.log(
      `[Sync] Iniciando batch upload: ${dto.ordenes.length} órdenes, técnico ${dto.tecnicoId}`,
    );

    const results: SyncOrdenResultDto[] = [];
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalConflicts = 0;

    // Procesar cada orden individualmente (aislamiento de fallos)
    for (const ordenDto of dto.ordenes) {
      try {
        const result = await this.syncSingleOrden(ordenDto, dto.tecnicoId);
        results.push(result);

        if (result.success) {
          totalSuccess++;
        } else {
          totalErrors++;
          if (result.conflict) {
            totalConflicts++;
          }
        }
      } catch (error) {
        this.logger.error(
          `[Sync] Error procesando orden ${ordenDto.idOrdenServicio}: ${error.message}`,
        );
        results.push({
          idOrdenServicio: ordenDto.idOrdenServicio,
          success: false,
          error: error.message,
        });
        totalErrors++;
      }
    }

    this.logger.log(
      `[Sync] Batch completado: ${totalSuccess} éxitos, ${totalErrors} errores, ${totalConflicts} conflictos`,
    );

    return {
      success: totalErrors === 0,
      serverTimestamp: new Date().toISOString(),
      totalProcessed: dto.ordenes.length,
      totalSuccess,
      totalErrors,
      totalConflicts,
      results,
    };
  }

  /**
   * Procesar una orden individual en transacción
   */
  private async syncSingleOrden(
    dto: SyncOrdenDto,
    tecnicoId: number,
  ): Promise<SyncOrdenResultDto> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Obtener orden actual del servidor
      const ordenServidor = await tx.ordenes_servicio.findUnique({
        where: { id_orden_servicio: dto.idOrdenServicio },
        include: {
          estado: true,
        },
      });

      if (!ordenServidor) {
        throw new NotFoundException(`Orden ${dto.idOrdenServicio} no existe`);
      }

      // 2. Verificar que el técnico tiene acceso a esta orden
      if (ordenServidor.id_tecnico_asignado !== tecnicoId) {
        throw new BadRequestException(
          `Técnico ${tecnicoId} no está asignado a orden ${dto.idOrdenServicio}`,
        );
      }

      // 3. Detección de conflictos por versión
      // Usamos fecha_modificacion como proxy de versión
      const serverModified = ordenServidor.fecha_modificacion?.getTime() || 0;
      const clientModified = new Date(dto.lastModified).getTime();

      // Si servidor fue modificado después del cliente, hay conflicto
      if (serverModified > clientModified && dto.version < serverModified) {
        return {
          idOrdenServicio: dto.idOrdenServicio,
          success: false,
          conflict: true,
          error: 'Conflicto de versión: el servidor tiene datos más recientes',
          serverVersion: serverModified,
        };
      }

      // 4. Procesar cambio de estado si existe
      if (dto.cambioEstado) {
        const estadoActual = ordenServidor.estado?.codigo_estado;

        // Validar transición FSM
        try {
          validarTransicion(estadoActual, dto.cambioEstado.nuevoEstado);
        } catch (error) {
          return {
            idOrdenServicio: dto.idOrdenServicio,
            success: false,
            error: `Transición inválida: ${error.message}`,
          };
        }

        // Obtener nuevo estado
        const nuevoEstadoDB = await tx.estados_orden.findFirst({
          where: { codigo_estado: dto.cambioEstado.nuevoEstado },
        });

        if (!nuevoEstadoDB) {
          throw new BadRequestException(
            `Estado ${dto.cambioEstado.nuevoEstado} no existe`,
          );
        }

        // Construir datos de actualización según el estado
        const updateData: any = {
          id_estado_actual: nuevoEstadoDB.id_estado,
          fecha_cambio_estado: new Date(dto.cambioEstado.timestamp),
          modificado_por: tecnicoId,
          fecha_modificacion: new Date(),
        };

        // Campos específicos por estado
        if (dto.cambioEstado.nuevoEstado === 'EN_PROCESO') {
          updateData.fecha_inicio_real = new Date(dto.cambioEstado.timestamp);
        }
        if (dto.cambioEstado.nuevoEstado === 'COMPLETADA') {
          updateData.fecha_fin_real = new Date(dto.cambioEstado.timestamp);
          updateData.observaciones_cierre = dto.cambioEstado.observaciones;
        }

        await tx.ordenes_servicio.update({
          where: { id_orden_servicio: dto.idOrdenServicio },
          data: updateData,
        });

        // Crear historial
        await tx.historial_estados_orden.create({
          data: {
            id_orden_servicio: dto.idOrdenServicio,
            id_estado_anterior: ordenServidor.id_estado_actual,
            id_estado_nuevo: nuevoEstadoDB.id_estado,
            motivo_cambio: dto.cambioEstado.motivo,
            observaciones: dto.cambioEstado.observaciones,
            fecha_cambio: new Date(dto.cambioEstado.timestamp),
            realizado_por: tecnicoId,
          },
        });
      }

      // 5. Actualizar campos de texto
      if (dto.trabajoRealizado || dto.observacionesTecnico) {
        await tx.ordenes_servicio.update({
          where: { id_orden_servicio: dto.idOrdenServicio },
          data: {
            trabajo_realizado: dto.trabajoRealizado,
            observaciones_tecnico: dto.observacionesTecnico,
            modificado_por: tecnicoId,
            fecha_modificacion: new Date(),
          },
        });
      }

      // 6. Procesar mediciones
      const medicionesMapping: { localId: string; serverId: number }[] = [];

      if (dto.mediciones && dto.mediciones.length > 0) {
        for (const medicionDto of dto.mediciones) {
          const medicionResult = await this.processMedicion(
            tx,
            dto.idOrdenServicio,
            medicionDto,
            tecnicoId,
          );
          medicionesMapping.push({
            localId: medicionDto.localId,
            serverId: medicionResult.id_medicion,
          });
        }
      }

      // 7. Procesar actividades
      const actividadesMapping: { localId: string; serverId: number }[] = [];

      if (dto.actividades && dto.actividades.length > 0) {
        for (const actividadDto of dto.actividades) {
          // Si ya existe en servidor (tiene serverId), actualizar
          if (actividadDto.serverId) {
            await tx.actividades_ejecutadas.update({
              where: { id_actividad_ejecutada: actividadDto.serverId },
              data: {
                estado_actividad: actividadDto.estadoActividad as any,
                observaciones: actividadDto.observaciones,
                hora_inicio: actividadDto.horaInicio
                  ? new Date(actividadDto.horaInicio)
                  : undefined,
                hora_fin: actividadDto.horaFin
                  ? new Date(actividadDto.horaFin)
                  : undefined,
              },
            });
            actividadesMapping.push({
              localId: actividadDto.localId,
              serverId: actividadDto.serverId,
            });
          } else {
            // Crear nueva actividad
            const nuevaActividad = await tx.actividades_ejecutadas.create({
              data: {
                id_orden_servicio: dto.idOrdenServicio,
                id_actividad_catalogo: actividadDto.idActividadCatalogo,
                estado_actividad: actividadDto.estadoActividad as any,
                observaciones: actividadDto.observaciones,
                hora_inicio: actividadDto.horaInicio
                  ? new Date(actividadDto.horaInicio)
                  : null,
                hora_fin: actividadDto.horaFin
                  ? new Date(actividadDto.horaFin)
                  : null,
                ejecutado_por: tecnicoId,
              },
            });
            actividadesMapping.push({
              localId: actividadDto.localId,
              serverId: nuevaActividad.id_actividad_ejecutada,
            });
          }
        }
      }

      return {
        idOrdenServicio: dto.idOrdenServicio,
        success: true,
        serverVersion: Date.now(),
        idMapping: {
          mediciones: medicionesMapping,
          actividades: actividadesMapping,
        },
      };
    });
  }

  /**
   * Procesar una medición individual con validación de rangos
   */
  private async processMedicion(
    tx: any,
    idOrdenServicio: number,
    dto: SyncMedicionDto,
    tecnicoId: number,
  ): Promise<any> {
    // Si ya existe en servidor, actualizar
    if (dto.serverId) {
      const updated = await tx.mediciones_servicio.update({
        where: { id_medicion: dto.serverId },
        data: {
          valor_numerico: dto.valorNumerico,
          valor_texto: dto.valorTexto,
          observaciones: dto.observaciones,
          temperatura_ambiente: dto.temperaturaAmbiente,
          humedad_relativa: dto.humedadRelativa,
          instrumento_medicion: dto.instrumentoMedicion,
          fecha_medicion: new Date(dto.fechaMedicion),
        },
      });
      return updated;
    }

    // Obtener parámetro para calcular nivel de alerta
    const parametro = await tx.parametros_medicion.findUnique({
      where: { id_parametro_medicion: dto.idParametroMedicion },
    });

    // Calcular nivel de alerta
    let nivelAlerta = 'OK';
    let mensajeAlerta: string | null = null;

    if (dto.valorNumerico !== undefined && parametro?.tipo_dato === 'NUMERICO') {
      const valor = Number(dto.valorNumerico);

      if (
        parametro.valor_minimo_critico !== null &&
        valor < Number(parametro.valor_minimo_critico)
      ) {
        nivelAlerta = 'CRITICO';
        mensajeAlerta = `Valor ${valor} por debajo del mínimo crítico ${parametro.valor_minimo_critico}`;
      } else if (
        parametro.valor_maximo_critico !== null &&
        valor > Number(parametro.valor_maximo_critico)
      ) {
        nivelAlerta = 'CRITICO';
        mensajeAlerta = `Valor ${valor} por encima del máximo crítico ${parametro.valor_maximo_critico}`;
      } else if (
        parametro.valor_minimo_normal !== null &&
        valor < Number(parametro.valor_minimo_normal)
      ) {
        nivelAlerta = 'ADVERTENCIA';
        mensajeAlerta = `Valor ${valor} por debajo del mínimo normal ${parametro.valor_minimo_normal}`;
      } else if (
        parametro.valor_maximo_normal !== null &&
        valor > Number(parametro.valor_maximo_normal)
      ) {
        nivelAlerta = 'ADVERTENCIA';
        mensajeAlerta = `Valor ${valor} por encima del máximo normal ${parametro.valor_maximo_normal}`;
      } else {
        mensajeAlerta = `Valor ${valor} dentro de rango normal`;
      }
    }

    // Crear medición
    return await tx.mediciones_servicio.create({
      data: {
        id_orden_servicio: idOrdenServicio,
        id_parametro_medicion: dto.idParametroMedicion,
        valor_numerico: dto.valorNumerico,
        valor_texto: dto.valorTexto,
        nivel_alerta: nivelAlerta as any,
        mensaje_alerta: mensajeAlerta,
        observaciones: dto.observaciones,
        temperatura_ambiente: dto.temperaturaAmbiente,
        humedad_relativa: dto.humedadRelativa,
        instrumento_medicion: dto.instrumentoMedicion,
        fecha_medicion: new Date(dto.fechaMedicion),
        medido_por: tecnicoId,
      },
    });
  }

  /**
   * DOWNLOAD: Obtener datos para trabajo offline del técnico
   */
  async downloadForTecnico(
    tecnicoId: number,
  ): Promise<SyncDownloadResponseDto> {
    this.logger.log(`[Sync] Download para técnico ${tecnicoId}`);

    // 1. Obtener órdenes asignadas al técnico
    // ✅ FIX: Incluir órdenes completadas recientes (últimos 30 días) para historial
    const treintaDiasAtras = new Date();
    treintaDiasAtras.setDate(treintaDiasAtras.getDate() - 30);

    const ordenes = await this.prisma.ordenes_servicio.findMany({
      where: {
        id_tecnico_asignado: tecnicoId,
        OR: [
          // Órdenes activas (no finales)
          { estado: { es_estado_final: false } },
          // Órdenes completadas en los últimos 30 días (para historial)
          {
            estado: { es_estado_final: true },
            fecha_fin_real: { gte: treintaDiasAtras },
          },
        ],
      },
      include: {
        estado: true,
        cliente: {
          include: {
            persona: true,
          },
        },
        sede: true,
        equipo: true,
        tipo_servicio: true,
        // ✅ FIX: Incluir informes para obtener URL del PDF
        informes: {
          include: {
            documento_pdf: true,
          },
          orderBy: { fecha_generacion: 'desc' },
          take: 1,
        },
        // ✅ FIX: Incluir conteos para estadísticas
        _count: {
          select: {
            actividades_ejecutadas: true,
            mediciones_servicio: true,
            evidencias_fotograficas: true,
          },
        },
      },
      orderBy: [
        { prioridad: 'desc' },
        { fecha_programada: 'asc' },
      ],
    });

    // 2. Obtener documentos PDF para las órdenes completadas
    const ordenesIds = ordenes.map((o) => o.id_orden_servicio);
    const documentosPdf = await this.prisma.documentos_generados.findMany({
      where: {
        tipo_documento: 'INFORME_SERVICIO',
        id_referencia: { in: ordenesIds },
      },
      orderBy: { fecha_generacion: 'desc' },
    });

    // Crear mapa de id_referencia -> ruta_archivo (el más reciente)
    const documentosMap = new Map<number, string>();
    for (const doc of documentosPdf) {
      if (!documentosMap.has(doc.id_referencia)) {
        documentosMap.set(doc.id_referencia, doc.ruta_archivo);
      }
    }
    this.logger.log(`[Sync] Documentos PDF encontrados: ${documentosMap.size}`);

    // 2.5 Obtener conteos de estadísticas por orden (consulta directa más confiable)
    const actividadesCount = await this.prisma.actividades_ejecutadas.groupBy({
      by: ['id_orden_servicio'],
      where: { id_orden_servicio: { in: ordenesIds } },
      _count: { id_actividad_ejecutada: true },
    });
    const actividadesMap = new Map<number, number>();
    for (const a of actividadesCount) {
      actividadesMap.set(a.id_orden_servicio, a._count.id_actividad_ejecutada);
    }

    const medicionesCount = await this.prisma.mediciones_servicio.groupBy({
      by: ['id_orden_servicio'],
      where: { id_orden_servicio: { in: ordenesIds } },
      _count: { id_medicion: true },
    });
    const medicionesMap = new Map<number, number>();
    for (const m of medicionesCount) {
      medicionesMap.set(m.id_orden_servicio, m._count.id_medicion);
    }

    const evidenciasCount = await this.prisma.evidencias_fotograficas.groupBy({
      by: ['id_orden_servicio'],
      where: { id_orden_servicio: { in: ordenesIds } },
      _count: { id_evidencia: true },
    });
    const evidenciasMap = new Map<number, number>();
    for (const e of evidenciasCount) {
      evidenciasMap.set(e.id_orden_servicio, e._count.id_evidencia);
    }

    // ✅ FIX: Contar firmas desde la relación directa en ordenes_servicio
    // La orden tiene id_firma_cliente (relación con firmas_digitales)
    // Por ahora contamos 1 si hay firma cliente, 0 si no
    // TODO: Agregar conteo de firma técnico cuando se implemente esa relación
    const firmasMap = new Map<number, number>();
    for (const o of ordenes) {
      // Contar firmas: 1 por id_firma_cliente + 1 si hay nombre_quien_recibe (indica que hubo firma)
      let firmasCount = 0;
      if (o.id_firma_cliente) firmasCount++;
      // Si hay nombre de quien recibe, probablemente hay firma técnico también
      if (o.nombre_quien_recibe) firmasCount++;
      firmasMap.set(o.id_orden_servicio, firmasCount);
    }

    // ✅ FIX: Desglose de actividades por estado (B=Buena, M=Mala, C=Corregida, NA=No Aplica)
    const actividadesPorEstado = await this.prisma.actividades_ejecutadas.groupBy({
      by: ['id_orden_servicio', 'estado'],
      where: { id_orden_servicio: { in: ordenesIds } },
      _count: { id_actividad_ejecutada: true },
    });

    // Crear maps para cada estado
    const actividadesBuenasMap = new Map<number, number>();
    const actividadesMalasMap = new Map<number, number>();
    const actividadesCorregidasMap = new Map<number, number>();
    const actividadesNAMap = new Map<number, number>();

    for (const a of actividadesPorEstado) {
      const ordenId = a.id_orden_servicio;
      const count = a._count.id_actividad_ejecutada;
      switch (a.estado) {
        case 'B':
          actividadesBuenasMap.set(ordenId, (actividadesBuenasMap.get(ordenId) || 0) + count);
          break;
        case 'M':
          actividadesMalasMap.set(ordenId, (actividadesMalasMap.get(ordenId) || 0) + count);
          break;
        case 'C':
          actividadesCorregidasMap.set(ordenId, (actividadesCorregidasMap.get(ordenId) || 0) + count);
          break;
        case 'NA':
          actividadesNAMap.set(ordenId, (actividadesNAMap.get(ordenId) || 0) + count);
          break;
      }
    }

    // ✅ FIX: Desglose de mediciones por estado (NORMAL, ADVERTENCIA, CRITICO)
    const medicionesPorEstado = await this.prisma.mediciones_servicio.findMany({
      where: { id_orden_servicio: { in: ordenesIds } },
      select: {
        id_orden_servicio: true,
        valor_numerico: true,
        parametros_medicion: {
          select: {
            valor_minimo_normal: true,
            valor_maximo_normal: true,
            valor_minimo_critico: true,
            valor_maximo_critico: true,
          },
        },
      },
    });

    // Crear maps para cada estado de medición
    const medicionesNormalesMap = new Map<number, number>();
    const medicionesAdvertenciaMap = new Map<number, number>();
    const medicionesCriticasMap = new Map<number, number>();

    for (const m of medicionesPorEstado) {
      const ordenId = m.id_orden_servicio;
      const valor = m.valor_numerico?.toNumber() || 0;
      const param = m.parametros_medicion;

      let estado = 'NORMAL';
      if (param) {
        const minNormal = param.valor_minimo_normal?.toNumber();
        const maxNormal = param.valor_maximo_normal?.toNumber();
        const minCritico = param.valor_minimo_critico?.toNumber();
        const maxCritico = param.valor_maximo_critico?.toNumber();

        // Verificar si está fuera de rango crítico
        if ((minCritico !== undefined && valor < minCritico) || (maxCritico !== undefined && valor > maxCritico)) {
          estado = 'CRITICO';
        }
        // Verificar si está fuera de rango normal (advertencia)
        else if ((minNormal !== undefined && valor < minNormal) || (maxNormal !== undefined && valor > maxNormal)) {
          estado = 'ADVERTENCIA';
        }
      }

      switch (estado) {
        case 'NORMAL':
          medicionesNormalesMap.set(ordenId, (medicionesNormalesMap.get(ordenId) || 0) + 1);
          break;
        case 'ADVERTENCIA':
          medicionesAdvertenciaMap.set(ordenId, (medicionesAdvertenciaMap.get(ordenId) || 0) + 1);
          break;
        case 'CRITICO':
          medicionesCriticasMap.set(ordenId, (medicionesCriticasMap.get(ordenId) || 0) + 1);
          break;
      }
    }

    this.logger.log(`[Sync] Estadísticas: ${actividadesMap.size} órdenes con actividades, ${evidenciasMap.size} con evidencias, ${firmasMap.size} con firmas`);

    // 3. Mapear a DTO de descarga
    const ordenesDownload: SyncOrdenDownloadDto[] = ordenes.map((o) => ({
      idOrdenServicio: o.id_orden_servicio,
      numeroOrden: o.numero_orden,
      version: o.fecha_modificacion?.getTime() || 0,
      idEstadoActual: o.id_estado_actual,
      codigoEstado: o.estado?.codigo_estado || '',
      nombreEstado: o.estado?.nombre_estado || '',
      fechaProgramada: o.fecha_programada?.toISOString(),
      prioridad: o.prioridad as string,
      idCliente: o.id_cliente,
      nombreCliente:
        o.cliente?.persona?.nombre_completo ||
        o.cliente?.persona?.razon_social ||
        'Sin nombre',
      idSede: o.id_sede,
      nombreSede: o.sede?.nombre_sede,
      direccionSede: o.sede?.direccion_sede,
      idEquipo: o.id_equipo,
      codigoEquipo: o.equipo?.codigo_equipo || '',
      nombreEquipo: o.equipo?.nombre_equipo || '',
      ubicacionEquipo: o.equipo?.ubicacion_texto,
      idTipoServicio: o.id_tipo_servicio,
      codigoTipoServicio: o.tipo_servicio?.codigo_tipo || '',
      nombreTipoServicio: o.tipo_servicio?.nombre_tipo || '',
      descripcionInicial: o.descripcion_inicial,
      trabajoRealizado: o.trabajo_realizado,
      observacionesTecnico: o.observaciones_tecnico,
      // ✅ FIX: Incluir URL del PDF desde documentos_generados (consulta directa)
      urlPdf: documentosMap.get(o.id_orden_servicio) || undefined,
      // ✅ FIX: Incluir horarios reales del servicio
      fechaInicioReal: o.fecha_inicio_real?.toISOString(),
      fechaFinReal: o.fecha_fin_real?.toISOString(),
      // ✅ FIX: Horas como TEXTO PLANO (HH:mm) - ajustadas a Colombia (UTC-5)
      // El servidor está en UTC, pero las horas se guardaron como hora local Colombia
      // Por eso getHours() devuelve +5 horas. Restamos 5 para obtener hora Colombia.
      horaEntrada: o.fecha_inicio_real
        ? (() => {
          const h = o.fecha_inicio_real.getHours();
          const m = o.fecha_inicio_real.getMinutes();
          // Ajustar a Colombia UTC-5 (restar 5 horas al UTC)
          let horaCol = h - 5;
          if (horaCol < 0) horaCol += 24;
          return `${String(horaCol).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        })()
        : undefined,
      horaSalida: o.fecha_fin_real
        ? (() => {
          const h = o.fecha_fin_real.getHours();
          const m = o.fecha_fin_real.getMinutes();
          // Ajustar a Colombia UTC-5 (restar 5 horas al UTC)
          let horaCol = h - 5;
          if (horaCol < 0) horaCol += 24;
          return `${String(horaCol).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        })()
        : undefined,
      duracionMinutos: o.duracion_minutos || undefined,
      // ✅ FIX: Incluir estadísticas de la orden (consulta directa, más confiable)
      // totalActividades incluye actividades + mediciones para coincidir con el móvil
      totalActividades: (actividadesMap.get(o.id_orden_servicio) || 0) + (medicionesMap.get(o.id_orden_servicio) || 0),
      totalMediciones: medicionesMap.get(o.id_orden_servicio) || 0,
      totalEvidencias: evidenciasMap.get(o.id_orden_servicio) || 0,
      totalFirmas: firmasMap.get(o.id_orden_servicio) || 0,
      // ✅ FIX: Desglose de actividades por estado
      actividadesBuenas: actividadesBuenasMap.get(o.id_orden_servicio) || 0,
      actividadesMalas: actividadesMalasMap.get(o.id_orden_servicio) || 0,
      actividadesCorregidas: actividadesCorregidasMap.get(o.id_orden_servicio) || 0,
      actividadesNA: actividadesNAMap.get(o.id_orden_servicio) || 0,
      // ✅ FIX: Desglose de mediciones por estado
      medicionesNormales: medicionesNormalesMap.get(o.id_orden_servicio) || 0,
      medicionesAdvertencia: medicionesAdvertenciaMap.get(o.id_orden_servicio) || 0,
      medicionesCriticas: medicionesCriticasMap.get(o.id_orden_servicio) || 0,
      fechaCreacion: o.fecha_creacion?.toISOString() || new Date().toISOString(),
      fechaModificacion: o.fecha_modificacion?.toISOString(),
    }));

    // 3. Obtener parámetros de medición activos
    const parametros = await this.prisma.parametros_medicion.findMany({
      where: { activo: true },
      orderBy: { categoria: 'asc' },
    });

    const parametrosDownload: SyncParametroMedicionDto[] = parametros.map(
      (p) => ({
        idParametroMedicion: p.id_parametro_medicion,
        codigoParametro: p.codigo_parametro,
        nombreParametro: p.nombre_parametro,
        unidadMedida: p.unidad_medida,
        tipoDato: p.tipo_dato || 'NUMERICO',
        valorMinimoNormal: p.valor_minimo_normal
          ? Number(p.valor_minimo_normal)
          : undefined,
        valorMaximoNormal: p.valor_maximo_normal
          ? Number(p.valor_maximo_normal)
          : undefined,
        valorMinimoCritico: p.valor_minimo_critico
          ? Number(p.valor_minimo_critico)
          : undefined,
        valorMaximoCritico: p.valor_maximo_critico
          ? Number(p.valor_maximo_critico)
          : undefined,
        valorIdeal: p.valor_ideal ? Number(p.valor_ideal) : undefined,
        esCriticoSeguridad: p.es_critico_seguridad || false,
        esObligatorio: p.es_obligatorio || false,
        decimalesPrecision: p.decimales_precision || 2,
      }),
    );

    // 4. Obtener catálogo de actividades activas con sistema incluido
    const actividades = await this.prisma.catalogo_actividades.findMany({
      where: { activo: true },
      include: { catalogo_sistemas: true }, // ✅ CORREGIDO: nombre correcto de la relación
      orderBy: [{ id_tipo_servicio: 'asc' }, { orden_ejecucion: 'asc' }],
    });

    const actividadesDownload: SyncActividadCatalogoDto[] = actividades.map(
      (a) => ({
        idActividadCatalogo: a.id_actividad_catalogo,
        codigoActividad: a.codigo_actividad,
        descripcionActividad: a.descripcion_actividad,
        tipoActividad: a.tipo_actividad as string,
        ordenEjecucion: a.orden_ejecucion,
        esObligatoria: a.es_obligatoria || false,
        tiempoEstimadoMinutos: a.tiempo_estimado_minutos ?? undefined,
        instrucciones: a.instrucciones ?? undefined,
        precauciones: a.precauciones ?? undefined,
        idParametroMedicion: a.id_parametro_medicion ?? undefined,
        idTipoServicio: a.id_tipo_servicio,  // ✅ CRÍTICO para vincular con órdenes
        sistema: a.catalogo_sistemas?.nombre_sistema ?? 'GENERAL', // ✅ CORREGIDO + Fallback a GENERAL
      }),
    );

    // 5. Obtener estados de orden
    const estados = await this.prisma.estados_orden.findMany({
      where: { activo: true },
      orderBy: { orden_visualizacion: 'asc' },
    });

    const estadosDownload = estados.map((e) => ({
      id: e.id_estado,
      codigo: e.codigo_estado,
      nombre: e.nombre_estado,
      esEstadoFinal: e.es_estado_final || false,
    }));

    // 6. Obtener tipos de servicio (CRÍTICO para FK en actividades_catalogo)
    const tiposServicio = await this.prisma.tipos_servicio.findMany({
      where: { activo: true },
      orderBy: { nombre_tipo: 'asc' },
    });

    const tiposServicioDownload = tiposServicio.map((t) => ({
      id: t.id_tipo_servicio,
      codigo: t.codigo_tipo,
      nombre: t.nombre_tipo,
      descripcion: t.descripcion ?? undefined,
    }));

    return {
      serverTimestamp: new Date().toISOString(),
      tecnicoId,
      ordenes: ordenesDownload,
      parametrosMedicion: parametrosDownload,
      actividadesCatalogo: actividadesDownload,
      estadosOrden: estadosDownload,
      tiposServicio: tiposServicioDownload, // ✅ AGREGADO para FK en mobile
    };
  }
}
