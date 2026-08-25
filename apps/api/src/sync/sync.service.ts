import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException
} from '@nestjs/common';
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
      } catch (error: any) {
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
          estados_orden: true,
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
        const estadoActual = ordenServidor.estados_orden?.codigo_estado;

        // Validar transición FSM
        try {
          validarTransicion(estadoActual, dto.cambioEstado.nuevoEstado);
        } catch (error: unknown) {
          return {
            idOrdenServicio: dto.idOrdenServicio,
            success: false,
            error: `Transición inválida: ${(error as Error).message}`,
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
                estado: actividadDto.estadoActividad as any,
                observaciones: actividadDto.observaciones,
                fecha_ejecucion: actividadDto.horaInicio
                  ? new Date(actividadDto.horaInicio)
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
                estado: actividadDto.estadoActividad as any,
                observaciones: actividadDto.observaciones,
                fecha_ejecucion: actividadDto.horaInicio
                  ? new Date(actividadDto.horaInicio)
                  : null,
                ejecutada_por: tecnicoId,
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
   * 
   * @param tecnicoId - ID del técnico
   * @param since - Fecha para sync delta (solo cambios desde esta fecha)
   * @param includeCatalogs - Incluir catálogos completos (true en sync completo)
   */
  async downloadForTecnico(
    tecnicoId: number,
    since?: Date,
    includeCatalogs: boolean = true,
  ): Promise<SyncDownloadResponseDto> {
    const syncType = since ? 'DELTA' : 'COMPLETO';
    this.logger.log(`[Sync] Download ${syncType} para técnico ${tecnicoId}${since ? ` desde ${since.toISOString()}` : ''}`);

    // ========================================================================
    // 🔬 DIAGNÓSTICO PROFUNDO: Verificar problema de zona horaria
    // ========================================================================
    if (since) {
      this.logger.log(`[🔬 DIAGNÓSTICO] since recibido:`);
      this.logger.log(`   - since.toISOString(): ${since.toISOString()}`);
      this.logger.log(`   - since.getTime(): ${since.getTime()}`);
      this.logger.log(`   - Servidor new Date().toISOString(): ${new Date().toISOString()}`);
      this.logger.log(`   - Servidor new Date().getTime(): ${new Date().getTime()}`);

      // Verificar órdenes recientes del técnico para diagnóstico
      const ordenesRecientes = await this.prisma.ordenes_servicio.findMany({
        where: { id_tecnico_asignado: tecnicoId },
        orderBy: { fecha_modificacion: 'desc' },
        take: 3,
        select: {
          id_orden_servicio: true,
          numero_orden: true,
          fecha_modificacion: true,
          id_estado_actual: true,
        },
      });

      this.logger.log(`[🔬 DIAGNÓSTICO] Top 3 órdenes más recientes del técnico ${tecnicoId}:`);
      for (const o of ordenesRecientes) {
        const fm = o.fecha_modificacion;
        this.logger.log(`   - Orden ${o.numero_orden} (ID: ${o.id_orden_servicio}, Estado: ${o.id_estado_actual})`);
        this.logger.log(`     fecha_modificacion: ${fm ? fm.toISOString() : 'NULL'}`);
        if (fm && since) {
          const diff = fm.getTime() - since.getTime();
          this.logger.log(`     ¿fm >= since? ${fm >= since} (diff: ${diff}ms = ${diff / 1000}s)`);
        }
      }
    }

    let baseFilter: any;

    if (since) {
      // ========================================================================
      // 🔧 FIX CRÍTICO: Usar timestamp string ISO para evitar problemas de TZ
      // El problema era que Prisma/PostgreSQL podían interpretar mal los timestamps
      // cuando se usa `timestamp without time zone` + objetos Date de JavaScript
      // ========================================================================
      const sinceIsoString = since.toISOString();
      this.logger.log(`[Sync Delta] Filtrando órdenes ACTIVAS modificadas desde ${sinceIsoString}`);

      // 🚨 POLÍTICA: Solo órdenes ACTIVAS modificadas (NUNCA completadas)
      // JOIN con estados_orden para filtrar solo es_estado_final = false
      const ordenesModificadas = await this.prisma.$queryRaw<{ id_orden_servicio: number }[]>`
        SELECT os.id_orden_servicio 
        FROM ordenes_servicio os
        INNER JOIN estados_orden eo ON os.id_estado_actual = eo.id_estado
        WHERE os.id_tecnico_asignado = ${tecnicoId}
          AND os.fecha_modificacion >= ${sinceIsoString}::timestamp
          AND eo.es_estado_final = false
      `;

      this.logger.log(`[🔬 DIAGNÓSTICO] Query raw encontró ${ordenesModificadas.length} órdenes modificadas`);

      if (ordenesModificadas.length === 0) {
        // No hay órdenes modificadas.
        // ✅ IMPORTANTE: Si includeCatalogs=true (fullCatalogs), debemos retornar catálogos completos
        // aunque no haya órdenes modificadas, para permitir refrescar catálogos (p.ej. nuevas actividades).
        this.logger.log(`[Sync Delta] No hay órdenes modificadas desde ${sinceIsoString}`);

        if (includeCatalogs) {
          this.logger.log('[Sync Delta] includeCatalogs=true → enviando catálogos completos sin órdenes');

          const parametros = await this.prisma.parametros_medicion.findMany({
            where: { activo: true },
            orderBy: { categoria: 'asc' },
          });

          const actividades = await this.prisma.catalogo_actividades.findMany({
            where: { activo: true },
            include: { catalogo_sistemas: true },
            orderBy: [{ id_tipo_servicio: 'asc' }, { orden_ejecucion: 'asc' }],
          });

          const estados = await this.prisma.estados_orden.findMany({
            where: { activo: true },
            orderBy: { orden_visualizacion: 'asc' },
          });

          const tiposServicio = await this.prisma.tipos_servicio.findMany({
            where: { activo: true },
            orderBy: { nombre_tipo: 'asc' },
          });

          return {
            serverTimestamp: new Date().toISOString(),
            tecnicoId,
            syncType: 'DELTA',
            sinceTimestamp: sinceIsoString,
            ordenes: [],
            parametrosMedicion: parametros.map((p) => ({
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
            })),
            actividadesCatalogo: actividades.map((a) => ({
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
              idTipoServicio: a.id_tipo_servicio,
              sistema: a.catalogo_sistemas?.nombre_sistema ?? 'GENERAL',
            })),
            estadosOrden: estados.map((e) => ({
              id: e.id_estado,
              codigo: e.codigo_estado,
              nombre: e.nombre_estado,
              esEstadoFinal: e.es_estado_final || false,
            })),
            tiposServicio: tiposServicio.map((t) => ({
              id: t.id_tipo_servicio,
              codigo: t.codigo_tipo,
              nombre: t.nombre_tipo,
              descripcion: t.descripcion ?? undefined,
            })),
          };
        }

        return {
          serverTimestamp: new Date().toISOString(),
          tecnicoId,
          syncType: 'DELTA',
          sinceTimestamp: sinceIsoString,
          ordenes: [],
          parametrosMedicion: [],
          actividadesCatalogo: [],
          estadosOrden: [],
          tiposServicio: [],
        };
      }

      // Usar los IDs encontrados para el filtro
      const ordenesIds = ordenesModificadas.map(o => o.id_orden_servicio);
      this.logger.log(`[🔬 DIAGNÓSTICO] IDs de órdenes modificadas: ${ordenesIds.join(', ')}`);

      baseFilter = {
        id_orden_servicio: { in: ordenesIds },
      };
    } else {
      // FULL SYNC: Solo órdenes ACTIVAS (NUNCA completadas)
      baseFilter = {
        id_tecnico_asignado: tecnicoId,
        estados_orden: { es_estado_final: false },
      };
    }

    // ========================================================================
    // ENTERPRISE OPTIMIZATION: Limite de 50 ordenes para rendimiento mobile
    // ========================================================================
    // Estrategia:
    // 1. Ordenar por: estado activo primero, luego prioridad, luego fecha
    // 2. Limitar a 50 ordenes (suficiente para trabajo diario del tecnico)
    // 3. Incluir ordenes activas + historial reciente dentro del limite
    // ========================================================================
    const LIMITE_ORDENES_MOBILE = 50;

    const ordenes = await this.prisma.ordenes_servicio.findMany({
      where: baseFilter,
      include: {
        estados_orden: true,
        ordenes_actividades_plan: {
          orderBy: { orden_secuencia: 'asc' },
        },
        clientes: {
          include: {
            persona: true,
          },
        },
        sedes_cliente: true,
        equipos: true,
        tipos_servicio: true,
        // Multi-Equipos: Incluir equipos asociados
        ordenes_equipos: {
          include: {
            equipos: true,
          },
          orderBy: { orden_secuencia: 'asc' },
        },
        // Trazabilidad: Incluir servicios específicos vinculados a la orden
        detalle_servicios_orden: {
          include: {
            catalogo_servicios: true,
          },
        },
        // Incluir informes para obtener URL del PDF
        informes: {
          orderBy: { fecha_generacion: 'desc' },
          take: 1,
        },
        // Incluir conteos para estadisticas
        _count: {
          select: {
            actividades_ejecutadas: true,
            mediciones_servicio: true,
            evidencias_fotograficas: true,
          },
        },
      },
      orderBy: [
        // Ordenes activas primero (estados finales al final)
        { estados_orden: { es_estado_final: 'asc' } },
        // Luego por prioridad (URGENTE primero)
        { prioridad: 'desc' },
        // Finalmente por fecha programada
        { fecha_programada: 'asc' },
      ],
      // LIMITE ENTERPRISE: Maximo 50 ordenes para optimizar sync mobile
      take: LIMITE_ORDENES_MOBILE,
    });

    this.logger.log(`[Sync] Ordenes obtenidas: ${ordenes.length} (limite: ${LIMITE_ORDENES_MOBILE})`);

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
      codigoEstado: o.estados_orden?.codigo_estado || '',
      nombreEstado: o.estados_orden?.nombre_estado || '',
      fechaProgramada: o.fecha_programada?.toISOString(),
      prioridad: o.prioridad as string,
      idCliente: o.id_cliente,
      // ✅ FIX 09-FEB-2026: Priorizar nombre_sede del cliente-sede sobre persona
      nombreCliente:
        (o.clientes as any)?.nombre_sede ||
        o.clientes?.persona?.nombre_comercial ||
        o.clientes?.persona?.nombre_completo ||
        o.clientes?.persona?.razon_social ||
        'Sin nombre',
      nombreComercial: o.clientes?.persona?.nombre_comercial || undefined,
      nombreCompleto: o.clientes?.persona?.nombre_completo || undefined,
      razonSocial: o.clientes?.persona?.razon_social || undefined,
      idSede: o.id_sede ?? undefined,
      nombreSede: o.sedes_cliente?.nombre_sede,
      direccionSede: o.sedes_cliente?.direccion_sede,
      idEquipo: o.id_equipo,
      codigoEquipo: o.equipos?.codigo_equipo || '',
      nombreEquipo: o.equipos?.nombre_equipo || '',
      ubicacionEquipo: o.equipos?.ubicacion_texto,
      // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026): Config personalizada del equipo
      configParametros: o.equipos?.config_parametros || undefined,
      idTipoServicio: o.id_tipo_servicio!,
      codigoTipoServicio: o.tipos_servicio?.codigo_tipo || '',
      nombreTipoServicio: o.tipos_servicio?.nombre_tipo || '',
      descripcionInicial: o.descripcion_inicial ?? undefined,
      trabajoRealizado: o.trabajo_realizado ?? undefined,
      observacionesTecnico: o.observaciones_tecnico ?? undefined,
      actividadesPlan: o.ordenes_actividades_plan?.map((p: any) => ({
        idActividadCatalogo: p.id_actividad_catalogo,
        ordenSecuencia: p.orden_secuencia,
        origen: p.origen,
        esObligatoria: p.es_obligatoria ?? undefined,
      })),
      serviciosEspecificos: (o as any).detalle_servicios_orden?.map((d: any) => ({
        idDetalleServicio: d.id_detalle_servicio,
        idServicio: d.id_servicio,
        codigoServicio: d.catalogo_servicios?.codigo_servicio || '',
        nombreServicio: d.catalogo_servicios?.nombre_servicio || '',
        categoria: d.catalogo_servicios?.categoria || '',
        duracionEstimadaHoras: d.catalogo_servicios?.duracion_estimada_horas ? Number(d.catalogo_servicios.duracion_estimada_horas) : undefined,
      })),
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
      // ✅ Multi-Equipos: Mapear equipos asociados (vacío = orden tradicional 1 equipo)
      ordenesEquipos: (() => {
        const mapped = o.ordenes_equipos?.map((oe, idx) => ({
          idOrdenEquipo: oe.id_orden_equipo,
          idOrdenServicio: oe.id_orden_servicio,
          idEquipo: oe.id_equipo,
          ordenSecuencia: oe.orden_secuencia,
          nombreSistema: oe.nombre_sistema || undefined,
          estado: oe.estado || 'PENDIENTE',
          fechaInicio: oe.fecha_inicio?.toISOString(),
          fechaFin: oe.fecha_fin?.toISOString(),
          observaciones: oe.observaciones || undefined,
          codigoEquipo: oe.equipos?.codigo_equipo || '',
          nombreEquipo: oe.equipos?.nombre_equipo || '',
          ubicacionEquipo: oe.equipos?.ubicacion_texto || undefined,
          // ✅ FLEXIBILIZACIÓN PARÁMETROS (06-ENE-2026)
          configParametros: oe.equipos?.config_parametros || undefined,
        })) || [];
        // ✅ FIX 14-FEB-2026: Normalizar orden_secuencia si todos tienen el mismo valor
        if (mapped.length > 1) {
          const secuencias = mapped.map(m => m.ordenSecuencia);
          const todasIguales = secuencias.every(s => s === secuencias[0]);
          if (todasIguales) {
            mapped.forEach((m, idx) => { m.ordenSecuencia = idx + 1; });
          }
          this.logger.log(`[🔧 MULTI-EQUIPO] Orden ${o.numero_orden} (ID ${o.id_orden_servicio}) tiene ${mapped.length} equipos`);
        }
        return mapped;
      })(),
      fechaCreacion: o.fecha_creacion?.toISOString() || new Date().toISOString(),
      fechaModificacion: o.fecha_modificacion?.toISOString(),
    }));

    // =========================================================================
    // CATÁLOGOS: Solo incluir en sync completo o si se solicita explícitamente
    // =========================================================================
    let parametrosDownload: SyncParametroMedicionDto[] = [];
    let actividadesDownload: SyncActividadCatalogoDto[] = [];
    let estadosDownload: { id: number; codigo: string; nombre: string; esEstadoFinal: boolean }[] = [];
    let tiposServicioDownload: { id: number; codigo: string; nombre: string; descripcion?: string }[] = [];

    if (includeCatalogs) {
      this.logger.log('[Sync] Incluyendo catálogos completos');

      // 3. Obtener parámetros de medición activos
      const parametros = await this.prisma.parametros_medicion.findMany({
        where: { activo: true },
        orderBy: { categoria: 'asc' },
      });

      parametrosDownload = parametros.map((p) => ({
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
      }));

      // 4. Obtener catálogo de actividades activas con sistema incluido
      const actividades = await this.prisma.catalogo_actividades.findMany({
        where: { activo: true },
        include: { catalogo_sistemas: true },
        orderBy: [{ id_tipo_servicio: 'asc' }, { orden_ejecucion: 'asc' }],
      });

      actividadesDownload = actividades.map((a) => ({
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
        idTipoServicio: a.id_tipo_servicio,
        sistema: a.catalogo_sistemas?.nombre_sistema ?? 'GENERAL',
      }));

      // 5. Obtener estados de orden
      const estados = await this.prisma.estados_orden.findMany({
        where: { activo: true },
        orderBy: { orden_visualizacion: 'asc' },
      });

      estadosDownload = estados.map((e) => ({
        id: e.id_estado,
        codigo: e.codigo_estado,
        nombre: e.nombre_estado,
        esEstadoFinal: e.es_estado_final || false,
      }));

      // 6. Obtener tipos de servicio
      const tiposServicio = await this.prisma.tipos_servicio.findMany({
        where: { activo: true },
        orderBy: { nombre_tipo: 'asc' },
      });

      tiposServicioDownload = tiposServicio.map((t) => ({
        id: t.id_tipo_servicio,
        codigo: t.codigo_tipo,
        nombre: t.nombre_tipo,
        descripcion: t.descripcion ?? undefined,
      }));
    } else {
      this.logger.log('[Sync Delta] Omitiendo catálogos (ya sincronizados)');
    }

    // Log resumen de sync
    this.logger.log(`[Sync] Resultado: ${ordenesDownload.length} órdenes, ${parametrosDownload.length} params, ${actividadesDownload.length} actividades`);

    return {
      serverTimestamp: new Date().toISOString(),
      tecnicoId,
      // ✅ SYNC DELTA: Indicar tipo de sync y si es delta
      syncType: since ? 'DELTA' : 'FULL',
      sinceTimestamp: since?.toISOString(),
      ordenes: ordenesDownload,
      parametrosMedicion: parametrosDownload,
      actividadesCatalogo: actividadesDownload,
      estadosOrden: estadosDownload,
      tiposServicio: tiposServicioDownload,
    };
  }

  // ============================================================================
  // SINCRONIZACIÓN INTELIGENTE - Métodos para comparación BD Local vs Supabase
  // ============================================================================

  /**
   * Obtiene resúmenes compactos de órdenes para comparación inteligente.
   * El móvil usa estos resúmenes para detectar diferencias con su BD local.
   * 
   * @param tecnicoId - ID del técnico
   * @param limit - Número máximo de órdenes (default 500)
   */
  async getOrdenesResumen(tecnicoId: number, limit: number = 500): Promise<{
    serverTimestamp: string;
    tecnicoId: number;
    totalOrdenes: number;
    ordenes: Array<{
      id: number;
      numeroOrden: string;
      estadoId: number;
      estadoCodigo: string;
      fechaModificacion: string;
      urlPdf?: string;
    }>;
  }> {
    // ========================================================================
    // 🚨 POLÍTICA ENTERPRISE: CERO ÓRDENES COMPLETADAS DEL SERVIDOR
    // ========================================================================
    // El móvil NUNCA recibe órdenes completadas del servidor.
    // Solo órdenes ACTIVAS (es_estado_final = false)
    // ========================================================================
    this.logger.log(`[🚨 COMPARE] POLÍTICA: Solo órdenes ACTIVAS para técnico ${tecnicoId}`);

    // Obtener órdenes del técnico (SOLO ACTIVAS)
    const ordenes = await this.prisma.ordenes_servicio.findMany({
      where: {
        id_tecnico_asignado: tecnicoId,
        estados_orden: { es_estado_final: false },
      },
      select: {
        id_orden_servicio: true,
        numero_orden: true,
        id_estado_actual: true,
        id_cliente: true,
        id_equipo: true,
        id_tipo_servicio: true,
        prioridad: true,
        fecha_programada: true,
        fecha_modificacion: true,
        estados_orden: {
          select: {
            codigo_estado: true,
          },
        },
        clientes: {
          select: {
            id_cliente: true,
            // ✅ FIX 09-FEB-2026: Incluir nombre_sede para clientes-sede
            nombre_sede: true,
            persona: {
              select: {
                nombre_comercial: true,
                nombre_completo: true,
                razon_social: true,
              },
            },
          },
        },
      },
      orderBy: { fecha_modificacion: 'desc' },
      take: limit,
    });

    // Obtener los IDs de órdenes para buscar PDFs
    const ordenIds = ordenes.map(o => o.id_orden_servicio);

    // Buscar PDFs directamente en documentos_generados por id_referencia
    // (el documento se guarda con id_referencia = idOrden en finalizacion-orden.service.ts)
    const documentos = await this.prisma.documentos_generados.findMany({
      where: {
        id_referencia: { in: ordenIds },
        tipo_documento: 'INFORME_SERVICIO',
      },
      select: {
        id_referencia: true,
        ruta_archivo: true,
      },
      orderBy: { fecha_generacion: 'desc' },
    });

    // Crear mapa de ordenId -> urlPdf
    const pdfMap = new Map<number, string>();
    for (const doc of documentos) {
      if (doc.id_referencia && !pdfMap.has(doc.id_referencia)) {
        pdfMap.set(doc.id_referencia, doc.ruta_archivo);
      }
    }

    const resumenOrdenes = ordenes.map((o) => {
      // ✅ FIX: Mapear NORMAL -> MEDIA para compatibilidad con App Móvil
      let prioridadMobile: string = o.prioridad as string;
      if (prioridadMobile === 'NORMAL') prioridadMobile = 'MEDIA';

      return {
        id: o.id_orden_servicio,
        numeroOrden: o.numero_orden,
        estadoId: o.id_estado_actual,
        id_estado: o.id_estado_actual, // Alias snake_case
        estadoCodigo: o.estados_orden?.codigo_estado || 'DESCONOCIDO',
        idCliente: o.id_cliente || 1,
        id_cliente: o.id_cliente || 1, // Alias snake_case
        // ✅ FIX 09-FEB-2026: Priorizar nombre_sede del cliente-sede
        nombreCliente:
          (o.clientes as any)?.nombre_sede ||
          o.clientes?.persona?.nombre_comercial ||
          o.clientes?.persona?.nombre_completo ||
          o.clientes?.persona?.razon_social ||
          'Sin nombre',
        idEquipo: o.id_equipo || 1,
        id_equipo: o.id_equipo || 1, // Alias snake_case
        idTipoService: o.id_tipo_servicio || 1, // Fallback (legacy support)
        idTipoServicio: o.id_tipo_servicio || 1,
        id_tipo_servicio: o.id_tipo_servicio || 1, // Alias snake_case
        prioridad: prioridadMobile,
        fechaProgramada: o.fecha_programada?.toISOString(), // ✅ Nueva: Info de fecha para Smart Sync
        fechaModificacion: o.fecha_modificacion?.toISOString() || new Date().toISOString(),
        version: o.fecha_modificacion?.getTime() || 0,
        urlPdf: pdfMap.get(o.id_orden_servicio) || undefined,
      };
    });

    this.logger.log(`[Sync Inteligente] Retornando ${resumenOrdenes.length} resúmenes`);

    return {
      serverTimestamp: new Date().toISOString(),
      tecnicoId,
      totalOrdenes: resumenOrdenes.length,
      ordenes: resumenOrdenes,
    };
  }

  /**
   * Obtiene una orden completa por ID para sincronización individual.
   * Usado cuando el móvil detecta que necesita actualizar una orden específica.
   */
  async getOrdenCompleta(ordenId: number): Promise<any> {
    this.logger.log(`[Sync Inteligente] Descargando orden completa ID: ${ordenId}`);

    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: ordenId },
      include: {
        estados_orden: true,
        clientes: {
          include: {
            persona: true,
          },
        },
        sedes_cliente: true,
        equipos: true,
        tipos_servicio: true,
        // ✅ FIX 28-ENE-2026: Incluir ordenes_equipos para multi-equipos
        ordenes_equipos: {
          include: {
            equipos: true,
          },
          orderBy: {
            orden_secuencia: 'asc',
          },
        },
        // PDF se busca directamente en documentos_generados por id_referencia
      },
    });

    if (!orden) {
      this.logger.warn(`[Sync Inteligente] Orden ${ordenId} no encontrada`);
      return null;
    }

    // 🚨 POLÍTICA ENTERPRISE: NUNCA enviar órdenes completadas
    if (orden.estados_orden?.es_estado_final) {
      this.logger.warn(`[🚨 POLÍTICA] Orden ${ordenId} está COMPLETADA - NO se envía al móvil`);
      return null;
    }

    // =========================================================================
    // ESTADÍSTICAS: Calcular contadores igual que en downloadForTecnico
    // =========================================================================

    // Contar actividades por estado
    const actividadesStats = await this.prisma.actividades_ejecutadas.groupBy({
      by: ['estado'],
      where: { id_orden_servicio: ordenId },
      _count: { id_actividad_ejecutada: true },
    });

    let actividadesBuenas = 0, actividadesMalas = 0, actividadesCorregidas = 0, actividadesNA = 0;
    let totalActividades = 0;
    for (const stat of actividadesStats) {
      const count = stat._count.id_actividad_ejecutada;
      totalActividades += count;
      switch (stat.estado) {
        case 'B': actividadesBuenas = count; break;
        case 'M': actividadesMalas = count; break;
        case 'C': actividadesCorregidas = count; break;
        case 'NA': actividadesNA = count; break;
      }
    }

    // Contar mediciones y clasificar por estado
    const mediciones = await this.prisma.mediciones_servicio.findMany({
      where: { id_orden_servicio: ordenId },
      include: { parametros_medicion: true },
    });

    let medicionesNormales = 0, medicionesAdvertencia = 0, medicionesCriticas = 0;
    for (const m of mediciones) {
      const valor = m.valor_numerico?.toNumber() || 0;
      const param = m.parametros_medicion;
      let estado = 'NORMAL';
      if (param) {
        const minCrit = param.valor_minimo_critico?.toNumber();
        const maxCrit = param.valor_maximo_critico?.toNumber();
        const minNorm = param.valor_minimo_normal?.toNumber();
        const maxNorm = param.valor_maximo_normal?.toNumber();
        if ((minCrit !== undefined && valor < minCrit) || (maxCrit !== undefined && valor > maxCrit)) {
          estado = 'CRITICO';
        } else if ((minNorm !== undefined && valor < minNorm) || (maxNorm !== undefined && valor > maxNorm)) {
          estado = 'ADVERTENCIA';
        }
      }
      if (estado === 'NORMAL') medicionesNormales++;
      else if (estado === 'ADVERTENCIA') medicionesAdvertencia++;
      else medicionesCriticas++;
    }

    // Contar evidencias
    const totalEvidencias = await this.prisma.evidencias_fotograficas.count({
      where: { id_orden_servicio: ordenId },
    });

    // Contar firmas (igual que en downloadForTecnico)
    // La orden tiene id_firma_cliente y nombre_quien_recibe
    let totalFirmas = 0;
    if (orden.id_firma_cliente) totalFirmas++;
    if (orden.nombre_quien_recibe) totalFirmas++;

    // URL del PDF - buscar directamente en documentos_generados por id_referencia
    // (el documento se guarda con id_referencia = idOrden en finalizacion-orden.service.ts)
    const documentoPdf = await this.prisma.documentos_generados.findFirst({
      where: {
        id_referencia: ordenId,
        tipo_documento: 'INFORME_SERVICIO',
      },
      select: { ruta_archivo: true },
      orderBy: { fecha_generacion: 'desc' },
    });
    const urlPdf = documentoPdf?.ruta_archivo;

    this.logger.log(`[Sync Inteligente] Orden ${ordenId} - urlPdf: ${urlPdf || 'NULL'}`);

    // Calcular horas de entrada/salida para Colombia (UTC-5)
    let horaEntrada: string | undefined;
    let horaSalida: string | undefined;

    if (orden.fecha_inicio_real) {
      const h = orden.fecha_inicio_real.getHours();
      const m = orden.fecha_inicio_real.getMinutes();
      let horaCol = h - 5;
      if (horaCol < 0) horaCol += 24;
      horaEntrada = `${String(horaCol).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    if (orden.fecha_fin_real) {
      const h = orden.fecha_fin_real.getHours();
      const m = orden.fecha_fin_real.getMinutes();
      let horaCol = h - 5;
      if (horaCol < 0) horaCol += 24;
      horaSalida = `${String(horaCol).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    return {
      idOrdenServicio: orden.id_orden_servicio,
      numeroOrden: orden.numero_orden,
      version: orden.fecha_modificacion?.getTime() || 1,
      idEstadoActual: orden.id_estado_actual,
      codigoEstado: orden.estados_orden?.codigo_estado || 'DESCONOCIDO',
      nombreEstado: orden.estados_orden?.nombre_estado || 'Desconocido',
      fechaProgramada: orden.fecha_programada?.toISOString(),
      prioridad: orden.prioridad || 'NORMAL',
      idCliente: orden.id_cliente,
      // ✅ FIX 09-FEB-2026: Priorizar nombre_sede del cliente-sede
      nombreCliente: (orden.clientes as any)?.nombre_sede || orden.clientes?.persona?.nombre_comercial || orden.clientes?.persona?.nombre_completo || orden.clientes?.persona?.razon_social || 'Cliente',
      nombreComercial: orden.clientes?.persona?.nombre_comercial || undefined,
      nombreCompleto: orden.clientes?.persona?.nombre_completo || undefined,
      razonSocial: orden.clientes?.persona?.razon_social || undefined,
      idSede: orden.id_sede ?? undefined,
      nombreSede: orden.sedes_cliente?.nombre_sede ?? undefined,
      direccionSede: orden.sedes_cliente?.direccion_sede ?? undefined,
      idEquipo: orden.id_equipo,
      codigoEquipo: orden.equipos?.codigo_equipo || '',
      nombreEquipo: orden.equipos?.nombre_equipo || 'Equipo',
      serieEquipo: orden.equipos?.numero_serie_equipo ?? undefined,
      ubicacionEquipo: orden.equipos?.ubicacion_texto ?? undefined,
      idTipoServicio: orden.id_tipo_servicio ?? undefined,
      codigoTipoServicio: orden.tipos_servicio?.codigo_tipo ?? undefined,
      nombreTipoServicio: orden.tipos_servicio?.nombre_tipo ?? undefined,
      descripcionInicial: orden.descripcion_inicial ?? undefined,
      trabajoRealizado: orden.trabajo_realizado ?? undefined,
      observacionesTecnico: orden.observaciones_tecnico ?? undefined,
      observacionesCierre: orden.observaciones_cierre ?? undefined,
      horaEntrada: horaEntrada,
      horaSalida: horaSalida,
      fechaInicioReal: orden.fecha_inicio_real?.toISOString(),
      fechaFinReal: orden.fecha_fin_real?.toISOString(),
      urlPdf: urlPdf,
      // ✅ ESTADÍSTICAS COMPLETAS
      totalActividades: totalActividades + mediciones.length,
      totalMediciones: mediciones.length,
      totalEvidencias: totalEvidencias,
      totalFirmas: totalFirmas,
      actividadesBuenas: actividadesBuenas,
      actividadesMalas: actividadesMalas,
      actividadesCorregidas: actividadesCorregidas,
      actividadesNA: actividadesNA,
      medicionesNormales: medicionesNormales,
      medicionesAdvertencia: medicionesAdvertencia,
      medicionesCriticas: medicionesCriticas,
      fechaCreacion: orden.fecha_creacion?.toISOString() || new Date().toISOString(),
      fechaModificacion: orden.fecha_modificacion?.toISOString(),
      // ✅ FIX 28-ENE-2026: Incluir ordenesEquipos para multi-equipos
      ordenesEquipos: (() => {
        const mapped = orden.ordenes_equipos?.map((oe) => ({
          idOrdenEquipo: oe.id_orden_equipo,
          idOrdenServicio: oe.id_orden_servicio,
          idEquipo: oe.id_equipo,
          ordenSecuencia: oe.orden_secuencia,
          nombreSistema: oe.nombre_sistema || undefined,
          estado: oe.estado || 'PENDIENTE',
          fechaInicio: oe.fecha_inicio?.toISOString(),
          fechaFin: oe.fecha_fin?.toISOString(),
          observaciones: oe.observaciones || undefined,
          codigoEquipo: oe.equipos?.codigo_equipo || '',
          nombreEquipo: oe.equipos?.nombre_equipo || '',
          ubicacionEquipo: oe.equipos?.ubicacion_texto || undefined,
          configParametros: oe.equipos?.config_parametros || undefined,
        })) || [];
        // ✅ FIX 14-FEB-2026: Normalizar orden_secuencia si todos iguales
        if (mapped.length > 1) {
          const allSame = mapped.every(m => m.ordenSecuencia === mapped[0].ordenSecuencia);
          if (allSame) mapped.forEach((m, i) => { m.ordenSecuencia = i + 1; });
        }
        return mapped;
      })(),
    };
  }
}
