import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { VALIDACIONES_POR_ESTADO } from '../domain/workflow-estados';
import {
  AdvertenciaTransferencia,
  ConteosEquipoOrigen,
  EquipoTransferenciaInfo,
  MapeoEquipoTransferenciaDto,
  OpcionesTransferenciaDto,
  PreviewTransferenciaResponse,
  ResultadoTransferenciaResponse,
  SugerenciaMapeoEquipo,
  TipoCoincidenciaEquipo,
  TransferirDatosOrdenDto,
} from '../dto/transferir-datos-orden.dto';

interface EquipoNormalizadoInternal extends EquipoTransferenciaInfo {
  rawOrdenEquipo: any | null;
}

interface AtribucionOrigen {
  tieneDatosLegacySinFk: boolean;
  /** Mapa id_actividad_ejecutada → idOrdenEquipoOrigen (null si no atribuible) */
  actividadAEquipo: Map<number, number | null>;
  /** Mapa id_medicion → idOrdenEquipoOrigen (null si no atribuible) */
  medicionAEquipo: Map<number, number | null>;
  /** Mapa id_evidencia → { categoria: 'EQUIPO' | 'GENERAL' | 'HUERFANA_GENERAL', idOrdenEquipoOrigen: number | null } */
  evidenciaClasificacion: Map<
    number,
    {
      categoria: 'EQUIPO' | 'GENERAL' | 'HUERFANA_GENERAL';
      idOrdenEquipoOrigen: number | null;
    }
  >;
  /** Mapa id_orden_pendiente → idOrdenEquipoOrigen (null si alcance orden/cliente) */
  pendienteAEquipo: Map<number, number | null>;
  conteosPorEquipo: Map<number, ConteosEquipoOrigen>;
  totalFotosGenerales: number;
  totalFotosHuerfanasComoGenerales: number;
  totalEvidenciasEquipo: number;
}

interface ContextoTransferencia {
  ordenOrigen: any;
  ordenDestino: any;
  lotesGaleriaOrigen: any[];
  lotesGaleriaDestinoCount: number;
  equiposOrigen: EquipoNormalizadoInternal[];
  equiposDestino: EquipoNormalizadoInternal[];
  atribucion: AtribucionOrigen;
  mismoCliente: boolean;
  mismoTipoServicio: boolean;
  estadoOrigen: string | null;
  estadoDestino: string | null;
  estadoSeAdopta: boolean;
  bloqueos: string[];
}

const ESTADOS_QUE_EXIGEN_TECNICO = ['ASIGNADA', 'EN_PROCESO', 'EN_ESPERA_REPUESTO'];

@Injectable()
export class TransferenciaOrdenService {
  private readonly logger = new Logger(TransferenciaOrdenService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PREVIEW / DIAGNÓSTICO PREVIO A LA TRANSFERENCIA
  // ═══════════════════════════════════════════════════════════════════════════

  async previsualizarTransferencia(
    idDestino: number,
    idOrdenOrigen: number,
  ): Promise<PreviewTransferenciaResponse> {
    const ctx = await this.cargarContexto(idDestino, idOrdenOrigen);

    const { mapeoSugerido, equiposDestinoSinAsignar } = this.calcularMapeoInteligente(
      ctx.equiposOrigen,
      ctx.equiposDestino,
      ctx.atribucion,
      ctx.mismoCliente,
    );

    const coincidenciasExactas = mapeoSugerido.filter(
      (m) =>
        m.tipoCoincidencia === 'EXACTA_ID_EQUIPO' ||
        m.tipoCoincidencia === 'EXACTA_CODIGO_SERIE',
    ).length;

    const coincidenciasSugeridas = mapeoSugerido.filter(
      (m) =>
        m.tipoCoincidencia === 'SUGERIDA_MISMO_TIPO' ||
        m.tipoCoincidencia === 'SUGERIDA_POSICIONAL',
    ).length;

    const equiposExcedentesOrigen = mapeoSugerido.filter(
      (m) => m.tipoCoincidencia === 'SIN_DESTINO',
    ).length;

    const paresMapeados = mapeoSugerido.filter(
      (m) => m.accionSugerida === 'MAPEAR_A_DESTINO' && m.destinoSugerido,
    );

    const hayCruceDeTipos =
      paresMapeados.some((m) => !m.tiposCompatibles) ||
      this.compararTiposOrden(ctx.equiposOrigen, ctx.equiposDestino);

    const todosMismoTipoEquipo = !hayCruceDeTipos;

    const medicionesIncompatiblesEstimadas = this.contarMedicionesIncompatibles(
      ctx.ordenOrigen.mediciones_servicio || [],
      ctx.atribucion,
      mapeoSugerido,
    );

    const tieneFirmaTecnico = Boolean(ctx.ordenOrigen.id_firma_tecnico);
    const tieneFirmaCliente = Boolean(ctx.ordenOrigen.id_firma_cliente);
    const tieneObservaciones = Boolean(
      ctx.ordenOrigen.trabajo_realizado ||
        ctx.ordenOrigen.observaciones_tecnico ||
        ctx.ordenOrigen.observaciones_cierre,
    );

    const totalActividades = (ctx.ordenOrigen.actividades_ejecutadas || []).length;
    const totalMediciones = (ctx.ordenOrigen.mediciones_servicio || []).length;
    const totalComponentes = (ctx.ordenOrigen.componentes_usados || []).length;
    const totalPlanActividades = (ctx.ordenOrigen.ordenes_actividades_plan || []).length;
    const totalPendientes = (ctx.ordenOrigen.ordenes_pendientes || []).length;

    const opcionesSugeridas: Required<OpcionesTransferenciaDto> = {
      incluirActividades: totalActividades > 0,
      incluirMediciones: totalMediciones > 0,
      soloMedicionesCompatibles: hayCruceDeTipos,
      incluirEvidenciasEquipo: ctx.atribucion.totalEvidenciasEquipo > 0,
      incluirFotosGenerales:
        ctx.atribucion.totalFotosGenerales +
          ctx.atribucion.totalFotosHuerfanasComoGenerales >
          0 || ctx.lotesGaleriaOrigen.length > 0,
      incluirObservaciones: true,
      incluirFirmas: ctx.mismoCliente && (tieneFirmaTecnico || tieneFirmaCliente),
      incluirComponentes: totalComponentes > 0,
      copiarPlanActividades:
        ctx.mismoTipoServicio && todosMismoTipoEquipo && totalPlanActividades > 0,
      incluirPendientes: ctx.mismoCliente && totalPendientes > 0,
      conservarDescripcionDestino: Boolean(
        ctx.ordenDestino.descripcion_inicial?.trim(),
      ),
    };

    const advertencias = this.construirAdvertencias(
      ctx,
      mapeoSugerido,
      equiposDestinoSinAsignar,
      hayCruceDeTipos,
      medicionesIncompatiblesEstimadas,
    );

    return {
      puedeTransferir: ctx.bloqueos.length === 0,
      bloqueos: ctx.bloqueos,
      advertencias,
      origen: {
        id: ctx.ordenOrigen.id_orden_servicio,
        numero: ctx.ordenOrigen.numero_orden,
        estado: ctx.estadoOrigen || 'DESCONOCIDO',
        estadoNombre:
          ctx.ordenOrigen.estados_orden?.nombre_estado || ctx.estadoOrigen || 'Desconocido',
        idCliente: ctx.ordenOrigen.id_cliente,
        nombreCliente: this.obtenerNombreCliente(ctx.ordenOrigen.clientes),
        idTipoServicio: ctx.ordenOrigen.id_tipo_servicio ?? null,
        nombreTipoServicio:
          ctx.ordenOrigen.tipos_servicio?.nombre_tipo || 'Sin tipo de servicio',
        totalEquipos: ctx.equiposOrigen.length,
        esMultiEquipo: ctx.equiposOrigen.length > 1,
        tieneDatosLegacySinFk: ctx.atribucion.tieneDatosLegacySinFk,
        equipos: ctx.equiposOrigen.map((e) => this.stripInternalEquipo(e)),
      },
      destino: {
        id: ctx.ordenDestino.id_orden_servicio,
        numero: ctx.ordenDestino.numero_orden,
        estado: ctx.estadoDestino || 'DESCONOCIDO',
        estadoNombre:
          ctx.ordenDestino.estados_orden?.nombre_estado || ctx.estadoDestino || 'Desconocido',
        idCliente: ctx.ordenDestino.id_cliente,
        nombreCliente: this.obtenerNombreCliente(ctx.ordenDestino.clientes),
        idTipoServicio: ctx.ordenDestino.id_tipo_servicio ?? null,
        nombreTipoServicio:
          ctx.ordenDestino.tipos_servicio?.nombre_tipo || 'Sin tipo de servicio',
        tieneDescripcionInicial: Boolean(ctx.ordenDestino.descripcion_inicial?.trim()),
        totalEquipos: ctx.equiposDestino.length,
        esMultiEquipo: ctx.equiposDestino.length > 1,
        equipos: ctx.equiposDestino.map((e) => this.stripInternalEquipo(e)),
        datosExistentesQueSeSobrescribiran: {
          actividades: ctx.ordenDestino._count?.actividades_ejecutadas ?? 0,
          mediciones: ctx.ordenDestino._count?.mediciones_servicio ?? 0,
          evidencias: ctx.ordenDestino._count?.evidencias_fotograficas ?? 0,
          lotesGaleria: ctx.lotesGaleriaDestinoCount,
          componentes: ctx.ordenDestino._count?.componentes_usados ?? 0,
          planActividades: ctx.ordenDestino._count?.ordenes_actividades_plan ?? 0,
          pendientes: ctx.ordenDestino._count?.ordenes_pendientes ?? 0,
        },
      },
      compatibilidad: {
        mismoCliente: ctx.mismoCliente,
        mismoTipoServicio: ctx.mismoTipoServicio,
        todosMismoTipoEquipo,
        hayCruceDeTipos,
        coincidenciasExactas,
        coincidenciasSugeridas,
        equiposExcedentesOrigen,
        equiposDestinoSinAsignar,
      },
      resumenDatosOrigen: {
        totalActividades,
        totalMediciones,
        medicionesIncompatiblesEstimadas,
        totalEvidenciasEquipo: ctx.atribucion.totalEvidenciasEquipo,
        totalFotosGenerales: ctx.atribucion.totalFotosGenerales,
        totalFotosHuerfanasComoGenerales:
          ctx.atribucion.totalFotosHuerfanasComoGenerales,
        totalLotesGaleria: ctx.lotesGaleriaOrigen.length,
        totalComponentes,
        totalPlanActividades,
        totalPendientes,
        tieneFirmaTecnico,
        tieneFirmaCliente,
        tieneObservaciones,
      },
      mapeoSugerido,
      opcionesSugeridas,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. EJECUCIÓN TRANSACCIONAL ATÓMICA DE LA TRANSFERENCIA
  // ═══════════════════════════════════════════════════════════════════════════

  async ejecutarTransferencia(
    idDestino: number,
    dto: TransferirDatosOrdenDto,
    userId: number,
  ): Promise<ResultadoTransferenciaResponse> {
    const idOrdenOrigen = Number(dto?.idOrdenOrigen);
    if (!idOrdenOrigen || !Number.isInteger(idOrdenOrigen)) {
      throw new BadRequestException('Debe proporcionar idOrdenOrigen (numérico)');
    }

    const ctx = await this.cargarContexto(idDestino, idOrdenOrigen);

    if (ctx.bloqueos.length > 0) {
      throw new BadRequestException(ctx.bloqueos.join(' '));
    }

    // 1. Resolver mapeo efectivo (explícito validado o automático inteligente)
    const { mapeoSugerido } = this.calcularMapeoInteligente(
      ctx.equiposOrigen,
      ctx.equiposDestino,
      ctx.atribucion,
      ctx.mismoCliente,
    );

    const mapeoEfectivo = this.validarYResolverMapeo(
      dto.mapeoEquipos,
      mapeoSugerido,
      ctx,
    );

    // Determinar si hay cruce de tipos con el mapeo realmente seleccionado
    const dstById = new Map<number, EquipoNormalizadoInternal>(
      ctx.equiposDestino.map((e) => [e.idOrdenEquipo, e]),
    );
    const srcById = new Map<number, EquipoNormalizadoInternal>(
      ctx.equiposOrigen.map((e) => [e.idOrdenEquipo, e]),
    );

    const hayCruceTiposEfectivo = mapeoEfectivo.some((m) => {
      if (m.accion !== 'MAPEAR_A_DESTINO' || m.idOrdenEquipoDestino == null) {
        return false;
      }
      const src = srcById.get(m.idOrdenEquipoOrigen);
      const dst = dstById.get(m.idOrdenEquipoDestino);
      return Boolean(
        src?.idTipoEquipo &&
          dst?.idTipoEquipo &&
          src.idTipoEquipo !== dst.idTipoEquipo,
      );
    });

    // 2. Resolver opciones granulares con defaults seguros
    const opciones: Required<OpcionesTransferenciaDto> = {
      incluirActividades: dto.opciones?.incluirActividades ?? true,
      incluirMediciones: dto.opciones?.incluirMediciones ?? true,
      soloMedicionesCompatibles:
        dto.opciones?.soloMedicionesCompatibles ?? hayCruceTiposEfectivo,
      incluirEvidenciasEquipo: dto.opciones?.incluirEvidenciasEquipo ?? true,
      incluirFotosGenerales: dto.opciones?.incluirFotosGenerales ?? true,
      incluirObservaciones: dto.opciones?.incluirObservaciones ?? true,
      incluirFirmas: dto.opciones?.incluirFirmas ?? ctx.mismoCliente,
      incluirComponentes: dto.opciones?.incluirComponentes ?? true,
      copiarPlanActividades:
        dto.opciones?.copiarPlanActividades ??
        (ctx.mismoTipoServicio && !hayCruceTiposEfectivo),
      incluirPendientes: dto.opciones?.incluirPendientes ?? false,
      conservarDescripcionDestino:
        dto.opciones?.conservarDescripcionDestino ??
        Boolean(ctx.ordenDestino.descripcion_inicial?.trim()),
    };

    this.logger.log(
      `🔄 [TRANSFER v2] ${ctx.ordenOrigen.numero_orden} (#${idOrdenOrigen}) → ${ctx.ordenDestino.numero_orden} (#${idDestino}) | mapeos=${mapeoEfectivo.length} | cruceTipos=${hayCruceTiposEfectivo}`,
    );

    // 3. Transacción atómica
    const resultadoTx = await this.prisma.$transaction(
      async (tx) => {
        const stats = {
          camposDirectos: false,
          ordenesEquipos: 0,
          equiposMapeados: 0,
          equiposAgregados: 0,
          equiposDescartados: 0,
          actividadesEjecutadas: 0,
          actividadesDescartadas: 0,
          evidenciasFotograficas: 0,
          evidenciasEquipo: 0,
          evidenciasGenerales: 0,
          evidenciasDescartadas: 0,
          lotesGaleria: 0,
          medicionesServicio: 0,
          medicionesDescartadas: 0,
          medicionesIncompatiblesOmitidas: 0,
          componentesUsados: 0,
          ordenesActividadesPlan: 0,
          pendientesTransferidos: 0,
        };

        // ── PASO A: Limpiar datos previos en destino (orden seguro de FKs) ──
        const delComponentes = await tx.componentes_usados.deleteMany({
          where: { id_orden_servicio: idDestino },
        });
        const delEvidencias = await tx.evidencias_fotograficas.deleteMany({
          where: { id_orden_servicio: idDestino },
        });
        const delLotesGaleria = await tx.lotes_galeria.deleteMany({
          where: { id_orden_servicio: idDestino },
        });
        const delMediciones = await tx.mediciones_servicio.deleteMany({
          where: { id_orden_servicio: idDestino },
        });
        const delActividades = await tx.actividades_ejecutadas.deleteMany({
          where: { id_orden_servicio: idDestino },
        });
        const delPlan = opciones.copiarPlanActividades
          ? await tx.ordenes_actividades_plan.deleteMany({
              where: { id_orden_servicio: idDestino },
            })
          : { count: 0 };
        const delPendientes = opciones.incluirPendientes
          ? await tx.ordenes_pendientes.deleteMany({
              where: { id_orden_servicio: idDestino },
            })
          : { count: 0 };

        // ── PASO B: Reconciliar ordenes_equipos sin perder identidad del destino ──
        // Mapa: idOrdenEquipoOrigen → id_orden_equipo real en destino (null solo si destino ultra-legacy sin filas y sin extras)
        const mapSrcOeToDstOe = new Map<number, number | null>();
        // Mapa: id_orden_equipo destino → { idEquipo, idTipoEquipo }
        const mapDstOeMeta = new Map<
          number,
          { idEquipo: number; idTipoEquipo: number | null; nombre: string }
        >();
        const mapeoAplicado: ResultadoTransferenciaResponse['mapeoAplicado'] = [];

        const destinoTieneSoloVirtual =
          ctx.equiposDestino.length === 1 && ctx.equiposDestino[0].esVirtual;
        const hayExtrasAAgregar = mapeoEfectivo.some(
          (m) => m.accion === 'AGREGAR_A_DESTINO',
        );

        let idOrdenEquipoVirtualMaterializado: number | null = null;
        let maxSeqDestino = ctx.equiposDestino
          .filter((e) => !e.esVirtual)
          .reduce((max, e) => Math.max(max, e.ordenSecuencia || 0), 0);

        // Si destino era ultra-legacy (0 filas en ordenes_equipos) y vamos a agregar extras,
        // materializamos primero el equipo principal del destino como EQ1 para no perderlo.
        if (destinoTieneSoloVirtual && hayExtrasAAgregar) {
          const virtualDst = ctx.equiposDestino[0];
          const creadoBase = await tx.ordenes_equipos.create({
            data: {
              id_orden_servicio: idDestino,
              id_equipo: virtualDst.idEquipo,
              orden_secuencia: 1,
              nombre_sistema: virtualDst.nombreSistema || virtualDst.nombreEquipo,
              estado: 'PENDIENTE',
              creado_por: userId || null,
            },
          });
          idOrdenEquipoVirtualMaterializado = creadoBase.id_orden_equipo;
          maxSeqDestino = 1;
          mapDstOeMeta.set(creadoBase.id_orden_equipo, {
            idEquipo: virtualDst.idEquipo,
            idTipoEquipo: virtualDst.idTipoEquipo,
            nombre: virtualDst.nombreEquipo,
          });
        }

        for (const dst of ctx.equiposDestino) {
          if (!dst.esVirtual) {
            mapDstOeMeta.set(dst.idOrdenEquipo, {
              idEquipo: dst.idEquipo,
              idTipoEquipo: dst.idTipoEquipo,
              nombre: dst.nombreSistema || dst.nombreEquipo,
            });
          }
        }

        const estadoEquipoDefault =
          ctx.estadoOrigen === 'COMPLETADA'
            ? 'COMPLETADO'
            : ctx.estadoOrigen === 'EN_PROCESO'
              ? 'EN_PROCESO'
              : 'PENDIENTE';

        for (const m of mapeoEfectivo) {
          const src = srcById.get(m.idOrdenEquipoOrigen)!;
          const srcLabel = src.nombreSistema || src.nombreEquipo || src.codigoEquipo;

          if (m.accion === 'DESCARTAR') {
            stats.equiposDescartados++;
            mapeoAplicado.push({
              idOrdenEquipoOrigen: src.idOrdenEquipo,
              equipoOrigenNombre: srcLabel,
              accion: 'DESCARTAR',
              idOrdenEquipoDestino: null,
              equipoDestinoNombre: null,
            });
            continue;
          }

          if (m.accion === 'MAPEAR_A_DESTINO') {
            const dst = dstById.get(m.idOrdenEquipoDestino!)!;
            const realDstOeId = dst.esVirtual
              ? idOrdenEquipoVirtualMaterializado
              : dst.idOrdenEquipo;

            mapSrcOeToDstOe.set(src.idOrdenEquipo, realDstOeId);
            stats.equiposMapeados++;

            if (realDstOeId != null) {
              const estadoAdoptado =
                (src.rawOrdenEquipo?.estado as any) || estadoEquipoDefault;
              await tx.ordenes_equipos.update({
                where: { id_orden_equipo: realDstOeId },
                data: {
                  // NUNCA tocar id_equipo, orden_secuencia ni nombre_sistema del destino
                  estado: estadoAdoptado,
                  fecha_inicio:
                    src.rawOrdenEquipo?.fecha_inicio ??
                    ctx.ordenOrigen.fecha_inicio_real ??
                    undefined,
                  fecha_fin:
                    src.rawOrdenEquipo?.fecha_fin ??
                    ctx.ordenOrigen.fecha_fin_real ??
                    undefined,
                  observaciones: opciones.incluirObservaciones
                    ? (src.rawOrdenEquipo?.observaciones ?? undefined)
                    : undefined,
                  modificado_por: userId || null,
                  fecha_modificacion: new Date(),
                },
              });
            }

            mapeoAplicado.push({
              idOrdenEquipoOrigen: src.idOrdenEquipo,
              equipoOrigenNombre: srcLabel,
              accion: 'MAPEAR_A_DESTINO',
              idOrdenEquipoDestino: realDstOeId,
              equipoDestinoNombre:
                dst.nombreSistema || dst.nombreEquipo || dst.codigoEquipo,
            });
            continue;
          }

          if (m.accion === 'AGREGAR_A_DESTINO') {
            maxSeqDestino += 1;
            const estadoAdoptado =
              (src.rawOrdenEquipo?.estado as any) || estadoEquipoDefault;

            const nuevoOe = await tx.ordenes_equipos.create({
              data: {
                id_orden_servicio: idDestino,
                id_equipo: src.idEquipo,
                orden_secuencia: maxSeqDestino,
                nombre_sistema: src.nombreSistema || src.nombreEquipo,
                estado: estadoAdoptado,
                fecha_inicio:
                  src.rawOrdenEquipo?.fecha_inicio ??
                  ctx.ordenOrigen.fecha_inicio_real ??
                  null,
                fecha_fin:
                  src.rawOrdenEquipo?.fecha_fin ??
                  ctx.ordenOrigen.fecha_fin_real ??
                  null,
                observaciones: opciones.incluirObservaciones
                  ? (src.rawOrdenEquipo?.observaciones ?? null)
                  : null,
                creado_por: userId || null,
              },
            });

            mapSrcOeToDstOe.set(src.idOrdenEquipo, nuevoOe.id_orden_equipo);
            mapDstOeMeta.set(nuevoOe.id_orden_equipo, {
              idEquipo: src.idEquipo,
              idTipoEquipo: src.idTipoEquipo,
              nombre: srcLabel,
            });
            stats.equiposAgregados++;
            stats.ordenesEquipos++;

            mapeoAplicado.push({
              idOrdenEquipoOrigen: src.idOrdenEquipo,
              equipoOrigenNombre: srcLabel,
              accion: 'AGREGAR_A_DESTINO',
              idOrdenEquipoDestino: nuevoOe.id_orden_equipo,
              equipoDestinoNombre: `${srcLabel} (agregado como EQ${maxSeqDestino})`,
            });
          }
        }

        // ── PASO C: Actualizar campos directos de la orden destino (preservando identidad) ──
        const destMetaActual =
          ctx.ordenDestino.metadata &&
          typeof ctx.ordenDestino.metadata === 'object' &&
          !Array.isArray(ctx.ordenDestino.metadata)
            ? { ...(ctx.ordenDestino.metadata as Record<string, unknown>) }
            : {};

        const metadataSegura = {
          ...destMetaActual,
          ultima_transferencia: {
            orden_origen_id: idOrdenOrigen,
            orden_origen_numero: ctx.ordenOrigen.numero_orden,
            fecha: new Date().toISOString(),
            realizado_por: userId || null,
            mismo_cliente: ctx.mismoCliente,
            hay_cruce_tipos: hayCruceTiposEfectivo,
            equipos_mapeados: stats.equiposMapeados,
            equipos_agregados: stats.equiposAgregados,
            equipos_descartados: stats.equiposDescartados,
          },
        };

        const descripcionInicialFinal =
          opciones.conservarDescripcionDestino &&
          ctx.ordenDestino.descripcion_inicial?.trim()
            ? ctx.ordenDestino.descripcion_inicial
            : (ctx.ordenOrigen.descripcion_inicial ??
              ctx.ordenDestino.descripcion_inicial);

        const observacionCierreFinal = opciones.incluirObservaciones
          ? ctx.ordenOrigen.observaciones_cierre
          : ctx.ordenDestino.observaciones_cierre ||
            (ctx.estadoSeAdopta && ctx.estadoOrigen === 'COMPLETADA'
              ? `Servicio completado por transferencia desde ${ctx.ordenOrigen.numero_orden}`
              : ctx.ordenDestino.observaciones_cierre);

        await tx.ordenes_servicio.update({
          where: { id_orden_servicio: idDestino },
          data: {
            // Identidad del destino NUNCA se sobrescribe: id_cliente, id_sede, id_equipo,
            // id_tipo_servicio, id_tecnico_asignado, numero_orden quedan intactos.
            id_estado_actual: ctx.estadoSeAdopta
              ? ctx.ordenOrigen.id_estado_actual
              : ctx.ordenDestino.id_estado_actual,
            fecha_cambio_estado: ctx.estadoSeAdopta
              ? new Date()
              : ctx.ordenDestino.fecha_cambio_estado,
            trabajo_realizado: opciones.incluirObservaciones
              ? ctx.ordenOrigen.trabajo_realizado
              : ctx.ordenDestino.trabajo_realizado,
            observaciones_tecnico: opciones.incluirObservaciones
              ? ctx.ordenOrigen.observaciones_tecnico
              : ctx.ordenDestino.observaciones_tecnico,
            observaciones_cierre: observacionCierreFinal,
            descripcion_inicial: descripcionInicialFinal,
            fecha_inicio_real: ctx.ordenOrigen.fecha_inicio_real,
            fecha_fin_real: ctx.ordenOrigen.fecha_fin_real,
            duracion_minutos: ctx.ordenOrigen.duracion_minutos,
            nombre_quien_recibe: opciones.incluirFirmas
              ? ctx.ordenOrigen.nombre_quien_recibe
              : ctx.ordenDestino.nombre_quien_recibe,
            cargo_quien_recibe: opciones.incluirFirmas
              ? ctx.ordenOrigen.cargo_quien_recibe
              : ctx.ordenDestino.cargo_quien_recibe,
            cliente_conforme: opciones.incluirFirmas
              ? ctx.ordenOrigen.cliente_conforme
              : ctx.ordenDestino.cliente_conforme,
            calificacion_cliente: opciones.incluirFirmas
              ? ctx.ordenOrigen.calificacion_cliente
              : ctx.ordenDestino.calificacion_cliente,
            id_firma_cliente: opciones.incluirFirmas
              ? ctx.ordenOrigen.id_firma_cliente
              : ctx.ordenDestino.id_firma_cliente,
            id_firma_tecnico: opciones.incluirFirmas
              ? ctx.ordenOrigen.id_firma_tecnico
              : ctx.ordenDestino.id_firma_tecnico,
            tiene_garantia: opciones.incluirObservaciones
              ? ctx.ordenOrigen.tiene_garantia
              : ctx.ordenDestino.tiene_garantia,
            meses_garantia: opciones.incluirObservaciones
              ? ctx.ordenOrigen.meses_garantia
              : ctx.ordenDestino.meses_garantia,
            fecha_vencimiento_garantia: opciones.incluirObservaciones
              ? ctx.ordenOrigen.fecha_vencimiento_garantia
              : ctx.ordenDestino.fecha_vencimiento_garantia,
            observaciones_garantia: opciones.incluirObservaciones
              ? ctx.ordenOrigen.observaciones_garantia
              : ctx.ordenDestino.observaciones_garantia,
            metadata: metadataSegura as any,
            total_servicios: ctx.ordenOrigen.total_servicios,
            total_gastos: ctx.ordenOrigen.total_gastos,
            total_componentes: opciones.incluirComponentes
              ? ctx.ordenOrigen.total_componentes
              : ctx.ordenDestino.total_componentes,
            total_general: ctx.ordenOrigen.total_general,
            modificado_por: userId || null,
            fecha_modificacion: new Date(),
          },
        });
        stats.camposDirectos = true;

        // ── PASO D: Copiar actividades_ejecutadas preservando id_orden_equipo y excluido_pdf ──
        const mapActividades = new Map<number, number>();
        const actividadesOrigen = ctx.ordenOrigen.actividades_ejecutadas || [];

        if (opciones.incluirActividades) {
          for (const act of actividadesOrigen) {
            const srcOeId =
              ctx.atribucion.actividadAEquipo.get(act.id_actividad_ejecutada) ??
              null;

            if (srcOeId !== null && !mapSrcOeToDstOe.has(srcOeId)) {
              stats.actividadesDescartadas++;
              continue;
            }

            const nuevoIdOrdenEquipo =
              srcOeId !== null ? (mapSrcOeToDstOe.get(srcOeId) ?? null) : null;

            const nuevaAct = await tx.actividades_ejecutadas.create({
              data: {
                id_orden_servicio: idDestino,
                id_actividad_catalogo: act.id_actividad_catalogo,
                descripcion_manual: act.descripcion_manual,
                sistema: act.sistema,
                orden_secuencia: act.orden_secuencia,
                estado: act.estado,
                observaciones: act.observaciones,
                ejecutada: act.ejecutada,
                fecha_ejecucion: act.fecha_ejecucion,
                ejecutada_por: act.ejecutada_por,
                tiempo_ejecucion_minutos: act.tiempo_ejecucion_minutos,
                requiere_evidencia: act.requiere_evidencia,
                evidencia_capturada: act.evidencia_capturada,
                fecha_registro: act.fecha_registro,
                id_orden_equipo: nuevoIdOrdenEquipo,
                excluido_pdf: act.excluido_pdf ?? false,
              },
            });
            mapActividades.set(
              act.id_actividad_ejecutada,
              nuevaAct.id_actividad_ejecutada,
            );
            stats.actividadesEjecutadas++;
          }
        } else {
          stats.actividadesDescartadas = actividadesOrigen.length;
        }

        // ── PASO E: Copiar lotes_galeria + evidencias_fotograficas preservando FKs exactos ──
        const mapLotesGaleria = new Map<number, number>();
        if (opciones.incluirFotosGenerales && ctx.lotesGaleriaOrigen.length > 0) {
          for (const lote of ctx.lotesGaleriaOrigen) {
            const nuevoLote = await tx.lotes_galeria.create({
              data: {
                id_orden_servicio: idDestino,
                nombre_lote: lote.nombre_lote,
                orden_lote: lote.orden_lote ?? 0,
                creado_por: lote.creado_por ?? userId ?? null,
              },
            });
            mapLotesGaleria.set(lote.id_lote_galeria, nuevoLote.id_lote_galeria);
            stats.lotesGaleria++;
          }
        }

        const evidenciasOrigen = ctx.ordenOrigen.evidencias_fotograficas || [];
        for (const ev of evidenciasOrigen) {
          const clasif = ctx.atribucion.evidenciaClasificacion.get(ev.id_evidencia);
          const esGeneral =
            !clasif ||
            clasif.categoria === 'GENERAL' ||
            clasif.categoria === 'HUERFANA_GENERAL';

          if (esGeneral) {
            if (!opciones.incluirFotosGenerales) {
              stats.evidenciasDescartadas++;
              continue;
            }
            const nuevoIdLote = ev.id_lote_galeria
              ? (mapLotesGaleria.get(ev.id_lote_galeria) ?? null)
              : null;

            await tx.evidencias_fotograficas.create({
              data: {
                id_orden_servicio: idDestino,
                id_actividad_ejecutada: null,
                tipo_evidencia: ev.tipo_evidencia,
                descripcion: ev.descripcion,
                nombre_archivo: ev.nombre_archivo,
                ruta_archivo: ev.ruta_archivo,
                hash_sha256: ev.hash_sha256,
                tama_o_bytes: ev.tama_o_bytes,
                mime_type: ev.mime_type,
                ancho_pixels: ev.ancho_pixels,
                alto_pixels: ev.alto_pixels,
                orden_visualizacion: ev.orden_visualizacion,
                es_principal: ev.es_principal,
                fecha_captura: ev.fecha_captura,
                capturada_por: ev.capturada_por,
                latitud: ev.latitud,
                longitud: ev.longitud,
                metadata_exif: ev.metadata_exif ?? undefined,
                tiene_miniatura: ev.tiene_miniatura,
                ruta_miniatura: ev.ruta_miniatura,
                esta_comprimida: ev.esta_comprimida,
                tama_o_original_bytes: ev.tama_o_original_bytes,
                fecha_registro: ev.fecha_registro,
                id_orden_equipo: null,
                id_lote_galeria: nuevoIdLote,
              },
            });
            stats.evidenciasFotograficas++;
            stats.evidenciasGenerales++;
            continue;
          }

          // Evidencia ligada a un equipo específico del origen
          const srcOeId = clasif.idOrdenEquipoOrigen;
          if (
            !opciones.incluirEvidenciasEquipo ||
            srcOeId === null ||
            !mapSrcOeToDstOe.has(srcOeId)
          ) {
            stats.evidenciasDescartadas++;
            continue;
          }

          const nuevoIdOrdenEquipo = mapSrcOeToDstOe.get(srcOeId) ?? null;
          const nuevoIdActividad = ev.id_actividad_ejecutada
            ? (mapActividades.get(ev.id_actividad_ejecutada) ?? null)
            : null;
          const nuevoIdLote = ev.id_lote_galeria
            ? (mapLotesGaleria.get(ev.id_lote_galeria) ?? null)
            : null;

          await tx.evidencias_fotograficas.create({
            data: {
              id_orden_servicio: idDestino,
              id_actividad_ejecutada: nuevoIdActividad,
              tipo_evidencia: ev.tipo_evidencia,
              descripcion: ev.descripcion,
              nombre_archivo: ev.nombre_archivo,
              ruta_archivo: ev.ruta_archivo,
              hash_sha256: ev.hash_sha256,
              tama_o_bytes: ev.tama_o_bytes,
              mime_type: ev.mime_type,
              ancho_pixels: ev.ancho_pixels,
              alto_pixels: ev.alto_pixels,
              orden_visualizacion: ev.orden_visualizacion,
              es_principal: ev.es_principal,
              fecha_captura: ev.fecha_captura,
              capturada_por: ev.capturada_por,
              latitud: ev.latitud,
              longitud: ev.longitud,
              metadata_exif: ev.metadata_exif ?? undefined,
              tiene_miniatura: ev.tiene_miniatura,
              ruta_miniatura: ev.ruta_miniatura,
              esta_comprimida: ev.esta_comprimida,
              tama_o_original_bytes: ev.tama_o_original_bytes,
              fecha_registro: ev.fecha_registro,
              id_orden_equipo: nuevoIdOrdenEquipo,
              id_lote_galeria: nuevoIdLote,
            },
          });
          stats.evidenciasFotograficas++;
          stats.evidenciasEquipo++;
        }

        // ── PASO F: Copiar mediciones_servicio con id_orden_equipo exacto + filtro cross-type ──
        const medicionesOrigen = ctx.ordenOrigen.mediciones_servicio || [];
        if (opciones.incluirMediciones) {
          for (const med of medicionesOrigen) {
            const srcOeId =
              ctx.atribucion.medicionAEquipo.get(med.id_medicion) ?? null;

            if (srcOeId !== null && !mapSrcOeToDstOe.has(srcOeId)) {
              stats.medicionesDescartadas++;
              continue;
            }

            const nuevoIdOrdenEquipo =
              srcOeId !== null ? (mapSrcOeToDstOe.get(srcOeId) ?? null) : null;

            // Protección anti-contaminación cross-type en parámetros técnicos
            if (opciones.soloMedicionesCompatibles) {
              const paramTipoEquipoId =
                med.parametros_medicion?.id_tipo_equipo ?? null;
              const dstTipoEquipoId =
                nuevoIdOrdenEquipo != null
                  ? (mapDstOeMeta.get(nuevoIdOrdenEquipo)?.idTipoEquipo ??
                    ctx.ordenDestino.equipos?.id_tipo_equipo ??
                    null)
                  : (ctx.ordenDestino.equipos?.id_tipo_equipo ?? null);

              if (
                paramTipoEquipoId !== null &&
                dstTipoEquipoId !== null &&
                paramTipoEquipoId !== dstTipoEquipoId
              ) {
                stats.medicionesIncompatiblesOmitidas++;
                continue;
              }
            }

            await tx.mediciones_servicio.create({
              data: {
                id_orden_servicio: idDestino,
                id_parametro_medicion: med.id_parametro_medicion,
                valor_numerico: med.valor_numerico,
                valor_texto: med.valor_texto,
                unidad_medida: med.unidad_medida,
                fuera_de_rango: med.fuera_de_rango,
                nivel_alerta: med.nivel_alerta,
                mensaje_alerta: med.mensaje_alerta,
                observaciones: med.observaciones,
                temperatura_ambiente: med.temperatura_ambiente,
                humedad_relativa: med.humedad_relativa,
                fecha_medicion: med.fecha_medicion,
                medido_por: med.medido_por,
                instrumento_medicion: med.instrumento_medicion,
                fecha_registro: med.fecha_registro,
                id_orden_equipo: nuevoIdOrdenEquipo,
                excluido_pdf: med.excluido_pdf ?? false,
              },
            });
            stats.medicionesServicio++;
          }
        } else {
          stats.medicionesDescartadas = medicionesOrigen.length;
        }

        // ── PASO G: Copiar componentes_usados SIN duplicar movimientos WMS ──
        if (opciones.incluirComponentes) {
          const componentesOrigen = ctx.ordenOrigen.componentes_usados || [];
          for (const comp of componentesOrigen) {
            const nuevoIdActividad = comp.id_actividad_ejecutada
              ? (mapActividades.get(comp.id_actividad_ejecutada) ?? null)
              : null;

            await tx.componentes_usados.create({
              data: {
                id_orden_servicio: idDestino,
                id_componente: comp.id_componente,
                id_tipo_componente: comp.id_tipo_componente,
                id_actividad_ejecutada: nuevoIdActividad,
                id_ubicacion: comp.id_ubicacion ?? null,
                id_lote: comp.id_lote ?? null,
                // 🛡️ CRÍTICO WMS: Nunca duplicar id_movimiento_inventario (el descuento de Kardex pertenece a la orden origen)
                id_movimiento_inventario: null,
                descripcion: comp.descripcion,
                referencia_manual: comp.referencia_manual,
                marca_manual: comp.marca_manual,
                cantidad: comp.cantidad,
                unidad: comp.unidad,
                costo_unitario: comp.costo_unitario,
                costo_total: comp.costo_total,
                estado_componente_retirado: comp.estado_componente_retirado,
                razon_uso: comp.razon_uso,
                componente_guardado: comp.componente_guardado,
                origen_componente: comp.origen_componente,
                observaciones: comp.observaciones,
                fecha_uso: comp.fecha_uso,
                usado_por: comp.usado_por,
                fecha_registro: comp.fecha_registro,
                registrado_por: comp.registrado_por,
              },
            });
            stats.componentesUsados++;
          }
        }

        // ── PASO H: Copiar ordenes_actividades_plan SOLO si compatible/habilitado ──
        if (opciones.copiarPlanActividades) {
          const planOrigen = ctx.ordenOrigen.ordenes_actividades_plan || [];
          for (const plan of planOrigen) {
            await tx.ordenes_actividades_plan.create({
              data: {
                id_orden_servicio: idDestino,
                id_actividad_catalogo: plan.id_actividad_catalogo,
                orden_secuencia: plan.orden_secuencia,
                origen: plan.origen,
                es_obligatoria: plan.es_obligatoria,
                creado_por: plan.creado_por,
                fecha_creacion: plan.fecha_creacion,
              },
            });
            stats.ordenesActividadesPlan++;
          }
        }

        // ── PASO I: Copiar ordenes_pendientes (si habilitado) reasignados a cliente/equipos destino ──
        if (opciones.incluirPendientes) {
          const pendientesOrigen = ctx.ordenOrigen.ordenes_pendientes || [];
          for (const pend of pendientesOrigen) {
            const srcOeId =
              ctx.atribucion.pendienteAEquipo.get(pend.id_orden_pendiente) ??
              null;

            if (srcOeId !== null && !mapSrcOeToDstOe.has(srcOeId)) {
              continue; // Pendiente de un equipo descartado
            }

            const dstOeId =
              srcOeId !== null ? (mapSrcOeToDstOe.get(srcOeId) ?? null) : null;
            const dstEquipoId =
              dstOeId !== null
                ? (mapDstOeMeta.get(dstOeId)?.idEquipo ??
                  ctx.ordenDestino.id_equipo)
                : pend.alcance === 'EQUIPO'
                  ? ctx.ordenDestino.id_equipo
                  : null;

            await tx.ordenes_pendientes.create({
              data: {
                id_orden_servicio: idDestino,
                id_cliente: ctx.ordenDestino.id_cliente,
                id_equipo: dstEquipoId,
                id_orden_equipo: dstOeId,
                id_pendiente_catalogo: pend.id_pendiente_catalogo,
                alcance: pend.alcance,
                descripcion: pend.descripcion,
                origen: pend.origen,
                prioridad: pend.prioridad,
                estado: pend.estado,
                observaciones: pend.observaciones,
                creado_por: pend.creado_por ?? userId ?? null,
              },
            });
            stats.pendientesTransferidos++;
          }
        }

        // ── PASO J: Auditoría forense en historial_estados_orden ──
        const auditoria = {
          operacion: 'TRANSFERIR_DATOS_ENTRE_ORDENES_V2',
          orden_origen_id: idOrdenOrigen,
          orden_origen_numero: ctx.ordenOrigen.numero_orden,
          orden_destino_id: idDestino,
          orden_destino_numero: ctx.ordenDestino.numero_orden,
          estado_origen: ctx.estadoOrigen,
          estado_destino_antes: ctx.estadoDestino,
          estado_destino_despues: ctx.estadoOrigen ?? ctx.estadoDestino,
          tipo_operacion: 'ADOPCION_ESTADO',
          validado_contra_fsm: false,
          validacion_aplicada: 'compatibilidad_de_destino_v2',
          mismo_cliente: ctx.mismoCliente,
          mismo_tipo_servicio: ctx.mismoTipoServicio,
          hay_cruce_tipos: hayCruceTiposEfectivo,
          origen_legacy_sin_fk: ctx.atribucion.tieneDatosLegacySinFk,
          tecnico_transferido: false,
          tecnico_conservado: ctx.ordenDestino.id_tecnico_asignado ?? null,
          identidad_equipos_destino_conservada: true,
          opciones_aplicadas: opciones,
          mapeo_equipos_aplicado: mapeoAplicado,
          estadisticas: stats,
          observacion_cierre_anterior:
            ctx.ordenDestino.observaciones_cierre ?? null,
          observacion_cierre_nueva: observacionCierreFinal ?? null,
          sobrescrito_en_destino: {
            componentes_usados: delComponentes.count,
            evidencias_fotograficas: delEvidencias.count,
            lotes_galeria: delLotesGaleria.count,
            mediciones_servicio: delMediciones.count,
            actividades_ejecutadas: delActividades.count,
            ordenes_actividades_plan: delPlan.count,
            ordenes_pendientes: delPendientes.count,
          },
          usuario: userId ?? null,
          timestamp: new Date().toISOString(),
        };

        await tx.historial_estados_orden.create({
          data: {
            id_orden_servicio: idDestino,
            id_estado_anterior: ctx.ordenDestino.id_estado_actual,
            id_estado_nuevo: ctx.estadoSeAdopta
              ? ctx.ordenOrigen.id_estado_actual
              : ctx.ordenDestino.id_estado_actual,
            motivo_cambio: 'Transferencia inteligente de datos entre órdenes',
            observaciones:
              `ADOPCIÓN de datos por transferencia v2: ${ctx.estadoDestino} → ${ctx.estadoOrigen}, ` +
              `origen ${ctx.ordenOrigen.numero_orden} (ID ${idOrdenOrigen}). ` +
              `Equipos mapeados: ${stats.equiposMapeados}, agregados: ${stats.equiposAgregados}, descartados: ${stats.equiposDescartados}. ` +
              `Actividades: ${stats.actividadesEjecutadas}, Mediciones: ${stats.medicionesServicio}, Fotos: ${stats.evidenciasFotograficas}.`,
            accion: 'TRANSFERIR_DATOS',
            fecha_cambio: new Date(),
            realizado_por: userId || 1,
            metadata: auditoria as any,
          },
        });

        return { stats, mapeoAplicado };
      },
      { timeout: 60000 },
    );

    this.logger.log(
      `✅ [TRANSFER v2] Completado ${ctx.ordenOrigen.numero_orden} → ${ctx.ordenDestino.numero_orden}: ${JSON.stringify(resultadoTx.stats)}`,
    );

    return {
      success: true,
      message: `Datos transferidos exitosamente de ${ctx.ordenOrigen.numero_orden} a ${ctx.ordenDestino.numero_orden}`,
      ordenOrigen: {
        id: ctx.ordenOrigen.id_orden_servicio,
        numero: ctx.ordenOrigen.numero_orden,
      },
      ordenDestino: {
        id: ctx.ordenDestino.id_orden_servicio,
        numero: ctx.ordenDestino.numero_orden,
      },
      estadisticas: resultadoTx.stats,
      mapeoAplicado: resultadoTx.mapeoAplicado,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. CARGA DE CONTEXTO Y VALIDACIONES DE DOMINIO
  // ═══════════════════════════════════════════════════════════════════════════

  private async cargarContexto(
    idDestino: number,
    idOrdenOrigen: number,
  ): Promise<ContextoTransferencia> {
    if (!idOrdenOrigen || !Number.isInteger(idOrdenOrigen)) {
      throw new BadRequestException('Debe proporcionar idOrdenOrigen (numérico)');
    }
    if (idOrdenOrigen === idDestino) {
      throw new BadRequestException(
        'La orden origen y destino no pueden ser la misma',
      );
    }

    const [
      ordenOrigen,
      ordenDestino,
      lotesGaleriaOrigen,
      lotesGaleriaDestinoCount,
    ] = await Promise.all([
      this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: idOrdenOrigen },
        include: {
          estados_orden: true,
          clientes: { include: { persona: true } },
          tipos_servicio: true,
          equipos: { include: { tipos_equipo: true } },
          ordenes_equipos: {
            include: { equipos: { include: { tipos_equipo: true } } },
            orderBy: [{ orden_secuencia: 'asc' }, { id_orden_equipo: 'asc' }],
          },
          actividades_ejecutadas: {
            include: { catalogo_actividades: true },
            orderBy: [
              { orden_secuencia: 'asc' },
              { id_actividad_ejecutada: 'asc' },
            ],
          },
          mediciones_servicio: {
            include: { parametros_medicion: true },
            orderBy: { id_medicion: 'asc' },
          },
          evidencias_fotograficas: {
            orderBy: [{ orden_visualizacion: 'asc' }, { id_evidencia: 'asc' }],
          },
          componentes_usados: {
            orderBy: { id_componente_usado: 'asc' },
          },
          ordenes_actividades_plan: {
            orderBy: { orden_secuencia: 'asc' },
          },
          ordenes_pendientes: {
            orderBy: { id_orden_pendiente: 'asc' },
          },
        },
      }),
      this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: idDestino },
        include: {
          estados_orden: true,
          clientes: { include: { persona: true } },
          tipos_servicio: true,
          equipos: { include: { tipos_equipo: true } },
          ordenes_equipos: {
            include: { equipos: { include: { tipos_equipo: true } } },
            orderBy: [{ orden_secuencia: 'asc' }, { id_orden_equipo: 'asc' }],
          },
          _count: {
            select: {
              actividades_ejecutadas: true,
              mediciones_servicio: true,
              evidencias_fotograficas: true,
              componentes_usados: true,
              ordenes_actividades_plan: true,
              ordenes_pendientes: true,
            },
          },
        },
      }),
      this.prisma.lotes_galeria.findMany({
        where: { id_orden_servicio: idOrdenOrigen },
        orderBy: [{ orden_lote: 'asc' }, { id_lote_galeria: 'asc' }],
      }),
      this.prisma.lotes_galeria.count({
        where: { id_orden_servicio: idDestino },
      }),
    ]);

    if (!ordenOrigen) {
      throw new NotFoundException(
        `Orden origen #${idOrdenOrigen} no encontrada`,
      );
    }
    if (!ordenDestino) {
      throw new NotFoundException(`Orden destino #${idDestino} no encontrada`);
    }

    const estadoDestinoRow = ordenDestino.estados_orden;
    const estadoDestino = estadoDestinoRow?.codigo_estado?.toUpperCase() ?? null;
    const estadoOrigen =
      ordenOrigen.estados_orden?.codigo_estado?.toUpperCase() ?? null;

    if (!estadoDestinoRow || !estadoDestino) {
      throw new InternalServerErrorException(
        `La orden destino #${idDestino} tiene id_estado_actual=${ordenDestino.id_estado_actual} sin relación válida en estados_orden.`,
      );
    }

    const bloqueos: string[] = [];

    if (estadoDestinoRow.es_estado_final) {
      bloqueos.push(
        `La orden destino #${idDestino} (${ordenDestino.numero_orden}) está en estado "${estadoDestinoRow.nombre_estado}" y no se puede sobrescribir. Solo se puede transferir a órdenes en estados no finales.`,
      );
    }

    const estadoSeAdopta = Boolean(
      estadoOrigen && estadoOrigen !== estadoDestino,
    );

    if (estadoSeAdopta) {
      if (estadoOrigen === 'CANCELADA') {
        bloqueos.push(
          `No se puede transferir desde la orden ${ordenOrigen.numero_orden}: está CANCELADA.`,
        );
      }

      if (
        ESTADOS_QUE_EXIGEN_TECNICO.includes(estadoOrigen!) &&
        !ordenDestino.id_tecnico_asignado
      ) {
        bloqueos.push(
          `La orden destino ${ordenDestino.numero_orden} no tiene técnico asignado, pero el estado de la orden origen es "${estadoOrigen}". Asigne un técnico a la orden destino antes de transferir.`,
        );
      }

      const camposRequeridos =
        VALIDACIONES_POR_ESTADO[estadoOrigen!]?.campos_requeridos ?? [];
      const datosTrasLaCopia: Record<string, unknown> = {
        ...ordenOrigen,
        id_tecnico_asignado: ordenDestino.id_tecnico_asignado,
      };
      const faltantes = camposRequeridos.filter(
        (campo) => !datosTrasLaCopia[campo],
      );
      if (faltantes.length > 0) {
        bloqueos.push(
          `No se puede adoptar el estado "${estadoOrigen}" en ${ordenDestino.numero_orden}: la orden origen ${ordenOrigen.numero_orden} no tiene ${faltantes.join(', ')}.`,
        );
      }
    }

    const equiposOrigen = this.normalizarEquiposOrden(ordenOrigen);
    const equiposDestino = this.normalizarEquiposOrden(ordenDestino);
    const atribucion = this.reconstruirAtribucionOrigen(
      ordenOrigen,
      equiposOrigen,
    );

    return {
      ordenOrigen,
      ordenDestino,
      lotesGaleriaOrigen,
      lotesGaleriaDestinoCount,
      equiposOrigen,
      equiposDestino,
      atribucion,
      mismoCliente: ordenOrigen.id_cliente === ordenDestino.id_cliente,
      mismoTipoServicio:
        ordenOrigen.id_tipo_servicio === ordenDestino.id_tipo_servicio,
      estadoOrigen,
      estadoDestino,
      estadoSeAdopta,
      bloqueos,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. NORMALIZACIÓN DE EQUIPOS Y RECONSTRUCCIÓN DE ATRIBUCIÓN (MODERNA + LEGACY)
  // ═══════════════════════════════════════════════════════════════════════════

  private normalizarEquiposOrden(orden: any): EquipoNormalizadoInternal[] {
    const rawList: any[] = Array.isArray(orden.ordenes_equipos)
      ? [...orden.ordenes_equipos]
      : [];

    if (rawList.length > 0) {
      rawList.sort((a, b) => {
        const seqDiff = (a.orden_secuencia || 0) - (b.orden_secuencia || 0);
        if (seqDiff !== 0) return seqDiff;
        return (a.id_orden_equipo || 0) - (b.id_orden_equipo || 0);
      });

      const todasSecuenciasIguales =
        rawList.length > 1 &&
        rawList.every(
          (oe) => (oe.orden_secuencia || 1) === (rawList[0].orden_secuencia || 1),
        );

      return rawList.map((oe, idx) => ({
        idOrdenEquipo: oe.id_orden_equipo,
        esVirtual: false,
        ordenSecuencia: todasSecuenciasIguales
          ? idx + 1
          : oe.orden_secuencia || idx + 1,
        idEquipo: oe.id_equipo,
        codigoEquipo: oe.equipos?.codigo_equipo || `EQ-${oe.id_equipo}`,
        nombreEquipo:
          oe.equipos?.nombre_equipo ||
          oe.nombre_sistema ||
          `Equipo #${oe.id_equipo}`,
        nombreSistema: oe.nombre_sistema || null,
        numeroSerie: oe.equipos?.numero_serie_equipo || null,
        idTipoEquipo: oe.equipos?.id_tipo_equipo ?? null,
        nombreTipoEquipo:
          oe.equipos?.tipos_equipo?.nombre_tipo || 'Sin tipo definido',
        estado: oe.estado || null,
        rawOrdenEquipo: oe,
      }));
    }

    // Fallback ultra-legacy: orden antigua sin filas en ordenes_equipos pero con id_equipo principal
    const eq = orden.equipos;
    return [
      {
        idOrdenEquipo: 0,
        esVirtual: true,
        ordenSecuencia: 1,
        idEquipo: orden.id_equipo,
        codigoEquipo: eq?.codigo_equipo || `EQ-${orden.id_equipo}`,
        nombreEquipo: eq?.nombre_equipo || `Equipo #${orden.id_equipo}`,
        nombreSistema: eq?.nombre_equipo || null,
        numeroSerie: eq?.numero_serie_equipo || null,
        idTipoEquipo: eq?.id_tipo_equipo ?? null,
        nombreTipoEquipo: eq?.tipos_equipo?.nombre_tipo || 'Sin tipo definido',
        estado: null,
        rawOrdenEquipo: null,
      },
    ];
  }

  /**
   * Reconstruye de forma 100% determinista a qué equipo del origen pertenece cada
   * actividad, medición, evidencia fotográfica y pendiente.
   *
   * Soporta tanto órdenes modernas (con `id_orden_equipo` poblado) como órdenes
   * históricas previas al fix multi-equipo (donde actividades/mediciones tenían
   * `id_orden_equipo = NULL`).
   */
  reconstruirAtribucionOrigen(
    ordenOrigen: any,
    equiposOrigen: EquipoNormalizadoInternal[],
  ): AtribucionOrigen {
    const validSrcOeIds = new Set<number>(
      equiposOrigen.filter((e) => !e.esVirtual).map((e) => e.idOrdenEquipo),
    );
    const unicoEquipoId =
      equiposOrigen.length === 1 ? equiposOrigen[0].idOrdenEquipo : null;

    let tieneDatosLegacySinFk = false;
    const conteosPorEquipo = new Map<number, ConteosEquipoOrigen>();
    for (const eq of equiposOrigen) {
      conteosPorEquipo.set(eq.idOrdenEquipo, {
        actividades: 0,
        mediciones: 0,
        evidencias: 0,
        pendientes: 0,
      });
    }

    // Paso 0: Puente inverso evidencia → actividad (en órdenes legacy las fotos a menudo SÍ tenían id_orden_equipo)
    const actividadIdDesdeEvidencia = new Map<number, number>();
    const evidencias: any[] = ordenOrigen.evidencias_fotograficas || [];
    for (const ev of evidencias) {
      if (
        ev.id_actividad_ejecutada != null &&
        ev.id_orden_equipo != null &&
        validSrcOeIds.has(ev.id_orden_equipo) &&
        !actividadIdDesdeEvidencia.has(ev.id_actividad_ejecutada)
      ) {
        actividadIdDesdeEvidencia.set(
          ev.id_actividad_ejecutada,
          ev.id_orden_equipo,
        );
      }
    }

    // Paso 1: Actividades ejecutadas
    const actividadAEquipo = new Map<number, number | null>();
    const actividades: any[] = ordenOrigen.actividades_ejecutadas || [];
    const actsSinFk: any[] = [];
    const actKeysPorEquipo = new Map<string, Set<number>>();

    const getActKey = (act: any): string =>
      act.id_actividad_catalogo != null
        ? `CAT:${act.id_actividad_catalogo}`
        : `TXT:${String(act.descripcion_manual || 'N/A').trim().toLowerCase()}`;

    const registrarActKey = (key: string, oeId: number) => {
      if (!actKeysPorEquipo.has(key)) actKeysPorEquipo.set(key, new Set());
      actKeysPorEquipo.get(key)!.add(oeId);
    };

    for (const act of actividades) {
      if (act.id_orden_equipo != null && validSrcOeIds.has(act.id_orden_equipo)) {
        actividadAEquipo.set(act.id_actividad_ejecutada, act.id_orden_equipo);
        registrarActKey(getActKey(act), act.id_orden_equipo);
      } else if (unicoEquipoId !== null) {
        actividadAEquipo.set(act.id_actividad_ejecutada, unicoEquipoId);
        registrarActKey(getActKey(act), unicoEquipoId);
      } else if (actividadIdDesdeEvidencia.has(act.id_actividad_ejecutada)) {
        const inferido = actividadIdDesdeEvidencia.get(
          act.id_actividad_ejecutada,
        )!;
        tieneDatosLegacySinFk = true;
        actividadAEquipo.set(act.id_actividad_ejecutada, inferido);
        registrarActKey(getActKey(act), inferido);
      } else {
        actsSinFk.push(act);
      }
    }

    if (actsSinFk.length > 0 && equiposOrigen.length > 1) {
      tieneDatosLegacySinFk = true;
      const gruposPorKey = new Map<string, any[]>();
      for (const act of actsSinFk) {
        const key = getActKey(act);
        if (!gruposPorKey.has(key)) gruposPorKey.set(key, []);
        gruposPorKey.get(key)!.push(act);
      }

      for (const [key, lista] of gruposPorKey.entries()) {
        const ordenadas = [...lista].sort(
          (a, b) => (a.id_actividad_ejecutada || 0) - (b.id_actividad_ejecutada || 0),
        );
        const yaUsados = actKeysPorEquipo.get(key) || new Set<number>();
        const candidatos = equiposOrigen.filter(
          (eq) => !yaUsados.has(eq.idOrdenEquipo),
        );
        const pool = candidatos.length >= ordenadas.length ? candidatos : equiposOrigen;

        ordenadas.forEach((act, idx) => {
          const destino = pool[idx];
          actividadAEquipo.set(
            act.id_actividad_ejecutada,
            destino ? destino.idOrdenEquipo : null,
          );
        });
      }
    }

    for (const act of actividades) {
      const eqId = actividadAEquipo.get(act.id_actividad_ejecutada) ?? null;
      if (eqId !== null && conteosPorEquipo.has(eqId)) {
        conteosPorEquipo.get(eqId)!.actividades++;
      }
    }

    // Paso 2: Mediciones de servicio
    const medicionAEquipo = new Map<number, number | null>();
    const mediciones: any[] = ordenOrigen.mediciones_servicio || [];
    const medsSinFk: any[] = [];
    const paramEquiposUsados = new Map<number, Set<number>>();

    for (const med of mediciones) {
      if (med.id_orden_equipo != null && validSrcOeIds.has(med.id_orden_equipo)) {
        medicionAEquipo.set(med.id_medicion, med.id_orden_equipo);
        if (!paramEquiposUsados.has(med.id_parametro_medicion)) {
          paramEquiposUsados.set(med.id_parametro_medicion, new Set());
        }
        paramEquiposUsados.get(med.id_parametro_medicion)!.add(med.id_orden_equipo);
      } else if (unicoEquipoId !== null) {
        medicionAEquipo.set(med.id_medicion, unicoEquipoId);
      } else {
        medsSinFk.push(med);
      }
    }

    if (medsSinFk.length > 0 && equiposOrigen.length > 1) {
      tieneDatosLegacySinFk = true;
      const gruposParam = new Map<number, any[]>();
      for (const med of medsSinFk) {
        if (!gruposParam.has(med.id_parametro_medicion)) {
          gruposParam.set(med.id_parametro_medicion, []);
        }
        gruposParam.get(med.id_parametro_medicion)!.push(med);
      }

      for (const [paramId, lista] of gruposParam.entries()) {
        const ordenadas = [...lista].sort(
          (a, b) => (a.id_medicion || 0) - (b.id_medicion || 0),
        );
        const yaUsados = paramEquiposUsados.get(paramId) || new Set<number>();
        const candidatos = equiposOrigen.filter(
          (eq) => !yaUsados.has(eq.idOrdenEquipo),
        );
        const pool = candidatos.length >= ordenadas.length ? candidatos : equiposOrigen;

        ordenadas.forEach((med, idx) => {
          const destino = pool[idx];
          medicionAEquipo.set(
            med.id_medicion,
            destino ? destino.idOrdenEquipo : null,
          );
        });
      }
    }

    for (const med of mediciones) {
      const eqId = medicionAEquipo.get(med.id_medicion) ?? null;
      if (eqId !== null && conteosPorEquipo.has(eqId)) {
        conteosPorEquipo.get(eqId)!.mediciones++;
      }
    }

    // Paso 3: Evidencias fotográficas (distinguiendo EQUIPO vs GENERAL vs HUERFANA_GENERAL)
    const evidenciaClasificacion: AtribucionOrigen['evidenciaClasificacion'] =
      new Map();
    let totalFotosGenerales = 0;
    let totalFotosHuerfanasComoGenerales = 0;
    let totalEvidenciasEquipo = 0;

    for (const ev of evidencias) {
      if (ev.id_orden_equipo != null && validSrcOeIds.has(ev.id_orden_equipo)) {
        evidenciaClasificacion.set(ev.id_evidencia, {
          categoria: 'EQUIPO',
          idOrdenEquipoOrigen: ev.id_orden_equipo,
        });
        totalEvidenciasEquipo++;
        conteosPorEquipo.get(ev.id_orden_equipo)!.evidencias++;
      } else if (ev.id_lote_galeria != null || ev.tipo_evidencia === 'GENERAL') {
        evidenciaClasificacion.set(ev.id_evidencia, {
          categoria: 'GENERAL',
          idOrdenEquipoOrigen: null,
        });
        totalFotosGenerales++;
      } else if (
        ev.id_actividad_ejecutada != null &&
        actividadAEquipo.get(ev.id_actividad_ejecutada) != null
      ) {
        const eqInferido = actividadAEquipo.get(ev.id_actividad_ejecutada)!;
        evidenciaClasificacion.set(ev.id_evidencia, {
          categoria: 'EQUIPO',
          idOrdenEquipoOrigen: eqInferido,
        });
        totalEvidenciasEquipo++;
        if (conteosPorEquipo.has(eqInferido)) {
          conteosPorEquipo.get(eqInferido)!.evidencias++;
        }
      } else if (unicoEquipoId !== null) {
        evidenciaClasificacion.set(ev.id_evidencia, {
          categoria: 'EQUIPO',
          idOrdenEquipoOrigen: unicoEquipoId,
        });
        totalEvidenciasEquipo++;
        conteosPorEquipo.get(unicoEquipoId)!.evidencias++;
      } else {
        tieneDatosLegacySinFk = true;
        evidenciaClasificacion.set(ev.id_evidencia, {
          categoria: 'HUERFANA_GENERAL',
          idOrdenEquipoOrigen: null,
        });
        totalFotosHuerfanasComoGenerales++;
      }
    }

    // Paso 4: Pendientes de la orden origen
    const pendienteAEquipo = new Map<number, number | null>();
    const pendientes: any[] = ordenOrigen.ordenes_pendientes || [];
    const eqIdToOeId = new Map<number, number>(
      equiposOrigen.map((e) => [e.idEquipo, e.idOrdenEquipo]),
    );

    for (const pend of pendientes) {
      let oeId: number | null = null;
      if (
        pend.id_orden_equipo != null &&
        validSrcOeIds.has(pend.id_orden_equipo)
      ) {
        oeId = pend.id_orden_equipo;
      } else if (pend.id_equipo != null && eqIdToOeId.has(pend.id_equipo)) {
        oeId = eqIdToOeId.get(pend.id_equipo)!;
      } else if (unicoEquipoId !== null && pend.alcance === 'EQUIPO') {
        oeId = unicoEquipoId;
      }

      pendienteAEquipo.set(pend.id_orden_pendiente, oeId);
      if (oeId !== null && conteosPorEquipo.has(oeId)) {
        conteosPorEquipo.get(oeId)!.pendientes++;
      }
    }

    return {
      tieneDatosLegacySinFk,
      actividadAEquipo,
      medicionAEquipo,
      evidenciaClasificacion,
      pendienteAEquipo,
      conteosPorEquipo,
      totalFotosGenerales,
      totalFotosHuerfanasComoGenerales,
      totalEvidenciasEquipo,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. MOTOR DE EMPAREJAMIENTO INTELIGENTE 1:1 (4 PASADAS)
  // ═══════════════════════════════════════════════════════════════════════════

  calcularMapeoInteligente(
    equiposOrigen: EquipoNormalizadoInternal[],
    equiposDestino: EquipoNormalizadoInternal[],
    atribucion: AtribucionOrigen,
    mismoCliente: boolean,
  ): {
    mapeoSugerido: SugerenciaMapeoEquipo[];
    equiposDestinoSinAsignar: EquipoTransferenciaInfo[];
  } {
    const asignacionPorSrc = new Map<
      number,
      {
        dst: EquipoNormalizadoInternal;
        tipo: TipoCoincidenciaEquipo;
        nota: string;
      }
    >();
    const dstUsados = new Set<number>();
    const dstEquipoIdsSet = new Set<number>(
      equiposDestino.map((e) => e.idEquipo),
    );

    // PASADA 1: Coincidencia física exacta 1:1 por id_equipo (independiente del orden de creación)
    for (const src of equiposOrigen) {
      const matchDst = equiposDestino.find(
        (dst) =>
          !dstUsados.has(dst.idOrdenEquipo) && dst.idEquipo === src.idEquipo,
      );
      if (matchDst) {
        dstUsados.add(matchDst.idOrdenEquipo);
        asignacionPorSrc.set(src.idOrdenEquipo, {
          dst: matchDst,
          tipo: 'EXACTA_ID_EQUIPO',
          nota: 'Mismo equipo físico (asociación 1:1 exacta)',
        });
      }
    }

    // PASADA 2 (solo mismo cliente): Coincidencia por código o serie física normalizada
    if (mismoCliente) {
      const norm = (v?: string | null) =>
        (v || '').trim().toUpperCase().replace(/\s+/g, '');

      for (const src of equiposOrigen) {
        if (asignacionPorSrc.has(src.idOrdenEquipo)) continue;
        const srcCod = norm(src.codigoEquipo);
        const srcSer = norm(src.numeroSerie);

        const matchDst = equiposDestino.find((dst) => {
          if (dstUsados.has(dst.idOrdenEquipo)) return false;
          const dstCod = norm(dst.codigoEquipo);
          const dstSer = norm(dst.numeroSerie);
          return (
            (srcCod.length >= 4 && srcCod === dstCod) ||
            (srcSer.length >= 4 && srcSer === dstSer)
          );
        });

        if (matchDst) {
          dstUsados.add(matchDst.idOrdenEquipo);
          asignacionPorSrc.set(src.idOrdenEquipo, {
            dst: matchDst,
            tipo: 'EXACTA_CODIGO_SERIE',
            nota: 'Coincidencia por código/serie del mismo cliente',
          });
        }
      }
    }

    // PASADA 3: Emparejamiento sugerido por mismo id_tipo_equipo para equipos restantes
    for (const src of equiposOrigen) {
      if (asignacionPorSrc.has(src.idOrdenEquipo)) continue;
      if (src.idTipoEquipo == null) continue;

      const matchDst = equiposDestino.find(
        (dst) =>
          !dstUsados.has(dst.idOrdenEquipo) &&
          dst.idTipoEquipo === src.idTipoEquipo,
      );
      if (matchDst) {
        dstUsados.add(matchDst.idOrdenEquipo);
        asignacionPorSrc.set(src.idOrdenEquipo, {
          dst: matchDst,
          tipo: 'SUGERIDA_MISMO_TIPO',
          nota: mismoCliente
            ? 'Equipo distinto del mismo tipo — se conserva el equipo destino'
            : 'Cliente y equipo distintos (mismo tipo) — se conserva el equipo destino',
        });
      }
    }

    // PASADA 4: Emparejamiento posicional sugerido (cruce de tipos) para equipos restantes
    for (const src of equiposOrigen) {
      if (asignacionPorSrc.has(src.idOrdenEquipo)) continue;

      const matchDst = equiposDestino.find(
        (dst) => !dstUsados.has(dst.idOrdenEquipo),
      );
      if (matchDst) {
        dstUsados.add(matchDst.idOrdenEquipo);
        asignacionPorSrc.set(src.idOrdenEquipo, {
          dst: matchDst,
          tipo: 'SUGERIDA_POSICIONAL',
          nota: `Tipo diferente (${src.nombreTipoEquipo} → ${matchDst.nombreTipoEquipo}) — se conserva formato y ficha del destino`,
        });
      }
    }

    // Construir lista final preservando el orden canónico del origen
    const mapeoSugerido: SugerenciaMapeoEquipo[] = equiposOrigen.map((src) => {
      const conteos = atribucion.conteosPorEquipo.get(src.idOrdenEquipo) || {
        actividades: 0,
        mediciones: 0,
        evidencias: 0,
        pendientes: 0,
      };
      const asig = asignacionPorSrc.get(src.idOrdenEquipo);

      const yaExisteEnDestino = dstEquipoIdsSet.has(src.idEquipo);
      let puedeAgregarADestino = false;
      let motivoNoAgregar: string | null = null;

      if (!mismoCliente) {
        motivoNoAgregar =
          'Pertenece a otro cliente; solo puede mapearse a un equipo del cliente destino o descartarse.';
      } else if (src.esVirtual) {
        motivoNoAgregar = 'Registro virtual sin vínculo multi-equipo.';
      } else if (yaExisteEnDestino) {
        motivoNoAgregar = 'Este equipo ya forma parte de la orden destino.';
      } else {
        puedeAgregarADestino = true;
      }

      if (asig) {
        const tiposCompatibles =
          src.idTipoEquipo == null ||
          asig.dst.idTipoEquipo == null ||
          src.idTipoEquipo === asig.dst.idTipoEquipo;

        return {
          origen: this.stripInternalEquipo(src),
          conteos,
          tipoCoincidencia: asig.tipo,
          accionSugerida: 'MAPEAR_A_DESTINO',
          idOrdenEquipoDestinoSugerido: asig.dst.idOrdenEquipo,
          destinoSugerido: this.stripInternalEquipo(asig.dst),
          tiposCompatibles,
          puedeAgregarADestino,
          motivoNoAgregar,
          nota: asig.nota,
        };
      }

      return {
        origen: this.stripInternalEquipo(src),
        conteos,
        tipoCoincidencia: 'SIN_DESTINO',
        accionSugerida: 'DESCARTAR',
        idOrdenEquipoDestinoSugerido: null,
        destinoSugerido: null,
        tiposCompatibles: false,
        puedeAgregarADestino,
        motivoNoAgregar,
        nota: puedeAgregarADestino
          ? 'Equipo excedente del origen (no está en destino). Descartado por defecto; puede marcarlo para agregarlo a la orden destino.'
          : 'Equipo excedente del origen sin par en destino. Se descartará al transferir.',
      };
    });

    const equiposDestinoSinAsignar = equiposDestino
      .filter((dst) => !dstUsados.has(dst.idOrdenEquipo))
      .map((dst) => this.stripInternalEquipo(dst));

    return { mapeoSugerido, equiposDestinoSinAsignar };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. VALIDACIÓN ESTRICTA DEL MAPEO SOLICITADO POR EL CLIENTE
  // ═══════════════════════════════════════════════════════════════════════════

  private validarYResolverMapeo(
    solicitado: MapeoEquipoTransferenciaDto[] | undefined,
    sugerido: SugerenciaMapeoEquipo[],
    ctx: ContextoTransferencia,
  ): MapeoEquipoTransferenciaDto[] {
    if (!solicitado || solicitado.length === 0) {
      return sugerido.map((s) => ({
        idOrdenEquipoOrigen: s.origen.idOrdenEquipo,
        accion: s.accionSugerida,
        idOrdenEquipoDestino: s.idOrdenEquipoDestinoSugerido,
      }));
    }

    const srcById = new Map<number, EquipoNormalizadoInternal>(
      ctx.equiposOrigen.map((e) => [e.idOrdenEquipo, e]),
    );
    const dstById = new Map<number, EquipoNormalizadoInternal>(
      ctx.equiposDestino.map((e) => [e.idOrdenEquipo, e]),
    );
    const dstEquipoIds = new Set<number>(
      ctx.equiposDestino.map((e) => e.idEquipo),
    );

    const srcVistos = new Set<number>();
    const dstUsados = new Set<number>();
    const equiposAgregadosIds = new Set<number>();
    const resultado: MapeoEquipoTransferenciaDto[] = [];

    for (const item of solicitado) {
      const src = srcById.get(item.idOrdenEquipoOrigen);
      if (!src) {
        throw new BadRequestException(
          `El equipo origen idOrdenEquipoOrigen=${item.idOrdenEquipoOrigen} no pertenece a la orden origen ${ctx.ordenOrigen.numero_orden}.`,
        );
      }
      if (srcVistos.has(item.idOrdenEquipoOrigen)) {
        throw new BadRequestException(
          `Mapeo duplicado para el equipo origen #${item.idOrdenEquipoOrigen}.`,
        );
      }
      srcVistos.add(item.idOrdenEquipoOrigen);

      if (item.accion === 'MAPEAR_A_DESTINO') {
        if (
          item.idOrdenEquipoDestino === undefined ||
          item.idOrdenEquipoDestino === null
        ) {
          throw new BadRequestException(
            `El equipo origen "${src.nombreEquipo}" tiene acción MAPEAR_A_DESTINO pero no especifica idOrdenEquipoDestino.`,
          );
        }
        if (!dstById.has(item.idOrdenEquipoDestino)) {
          throw new BadRequestException(
            `El equipo destino idOrdenEquipoDestino=${item.idOrdenEquipoDestino} no pertenece a la orden destino ${ctx.ordenDestino.numero_orden}.`,
          );
        }
        if (dstUsados.has(item.idOrdenEquipoDestino)) {
          throw new BadRequestException(
            `Conflicto de mapeo 1:1: dos equipos origen intentan transferir al mismo equipo destino (#${item.idOrdenEquipoDestino}).`,
          );
        }
        dstUsados.add(item.idOrdenEquipoDestino);
        resultado.push({
          idOrdenEquipoOrigen: item.idOrdenEquipoOrigen,
          accion: 'MAPEAR_A_DESTINO',
          idOrdenEquipoDestino: item.idOrdenEquipoDestino,
        });
      } else if (item.accion === 'AGREGAR_A_DESTINO') {
        if (!ctx.mismoCliente) {
          throw new BadRequestException(
            `No se puede agregar el equipo "${src.nombreEquipo}" a la orden destino porque pertenece a un cliente diferente.`,
          );
        }
        if (src.esVirtual) {
          throw new BadRequestException(
            `No se puede agregar un registro de equipo virtual a la orden destino.`,
          );
        }
        if (dstEquipoIds.has(src.idEquipo) || equiposAgregadosIds.has(src.idEquipo)) {
          throw new BadRequestException(
            `El equipo "${src.nombreEquipo}" ya existe en la orden destino; debe usar MAPEAR_A_DESTINO en lugar de AGREGAR_A_DESTINO.`,
          );
        }
        equiposAgregadosIds.add(src.idEquipo);
        resultado.push({
          idOrdenEquipoOrigen: item.idOrdenEquipoOrigen,
          accion: 'AGREGAR_A_DESTINO',
          idOrdenEquipoDestino: null,
        });
      } else {
        resultado.push({
          idOrdenEquipoOrigen: item.idOrdenEquipoOrigen,
          accion: 'DESCARTAR',
          idOrdenEquipoDestino: null,
        });
      }
    }

    // Cualquier equipo del origen no incluido explícitamente se marca como DESCARTAR
    for (const src of ctx.equiposOrigen) {
      if (!srcVistos.has(src.idOrdenEquipo)) {
        resultado.push({
          idOrdenEquipoOrigen: src.idOrdenEquipo,
          accion: 'DESCARTAR',
          idOrdenEquipoDestino: null,
        });
      }
    }

    return resultado;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. HELPERS DE DIAGNÓSTICO Y COMPATIBILIDAD
  // ═══════════════════════════════════════════════════════════════════════════

  private compararTiposOrden(
    equiposOrigen: EquipoNormalizadoInternal[],
    equiposDestino: EquipoNormalizadoInternal[],
  ): boolean {
    const tiposSrc = new Set(
      equiposOrigen.map((e) => e.idTipoEquipo).filter((t) => t != null),
    );
    const tiposDst = new Set(
      equiposDestino.map((e) => e.idTipoEquipo).filter((t) => t != null),
    );
    if (tiposSrc.size === 0 || tiposDst.size === 0) return false;
    for (const t of tiposSrc) {
      if (!tiposDst.has(t)) return true;
    }
    return false;
  }

  private contarMedicionesIncompatibles(
    medicionesOrigen: any[],
    atribucion: AtribucionOrigen,
    mapeoSugerido: SugerenciaMapeoEquipo[],
  ): number {
    const srcToDstTipo = new Map<number, number | null>();
    for (const m of mapeoSugerido) {
      if (m.accionSugerida === 'MAPEAR_A_DESTINO' && m.destinoSugerido) {
        srcToDstTipo.set(m.origen.idOrdenEquipo, m.destinoSugerido.idTipoEquipo);
      }
    }

    let count = 0;
    for (const med of medicionesOrigen) {
      const paramTipo = med.parametros_medicion?.id_tipo_equipo ?? null;
      if (paramTipo == null) continue;
      const srcOeId = atribucion.medicionAEquipo.get(med.id_medicion) ?? null;
      if (srcOeId == null || !srcToDstTipo.has(srcOeId)) continue;
      const dstTipo = srcToDstTipo.get(srcOeId);
      if (dstTipo != null && paramTipo !== dstTipo) {
        count++;
      }
    }
    return count;
  }

  private construirAdvertencias(
    ctx: ContextoTransferencia,
    mapeoSugerido: SugerenciaMapeoEquipo[],
    equiposDestinoSinAsignar: EquipoTransferenciaInfo[],
    hayCruceDeTipos: boolean,
    medicionesIncompatiblesEstimadas: number,
  ): AdvertenciaTransferencia[] {
    const adv: AdvertenciaTransferencia[] = [];

    if (!ctx.mismoCliente) {
      adv.push({
        nivel: 'warning',
        codigo: 'CLIENTE_DISTINTO',
        mensaje:
          'Las órdenes pertenecen a clientes distintos. Se conservarán el cliente, sede, técnico y equipos propios de la orden destino. Las firmas del cliente origen se desactivaron por defecto.',
      });
    }

    if (hayCruceDeTipos || !ctx.mismoTipoServicio) {
      adv.push({
        nivel: 'warning',
        codigo: 'TIPO_EQUIPO_O_SERVICIO_DISTINTO',
        mensaje:
          'Se detectaron diferencias de tipo de equipo o tipo de servicio entre origen y destino. El formato técnico, plantilla PDF y plan de actividades del destino quedarán protegidos contra contaminación.',
      });
    }

    if (medicionesIncompatiblesEstimadas > 0) {
      adv.push({
        nivel: 'info',
        codigo: 'MEDICIONES_INCOMPATIBLES_FILTRADAS',
        mensaje: `Se detectaron ${medicionesIncompatiblesEstimadas} mediciones de parámetros exclusivos de otro tipo de equipo; por defecto se filtrarán automáticamente para mantener limpio el formato destino.`,
      });
    }

    const excedentes = mapeoSugerido.filter(
      (m) => m.tipoCoincidencia === 'SIN_DESTINO',
    ).length;
    if (excedentes > 0) {
      adv.push({
        nivel: 'info',
        codigo: 'EQUIPOS_EXCEDENTES_ORIGEN',
        mensaje: `La orden origen tiene ${excedentes} equipo(s) adicional(es) que no están en destino. Quedaron desmarcados (descartar) por defecto; puede marcarlos si desea agregarlos o reasignarlos.`,
      });
    }

    if (equiposDestinoSinAsignar.length > 0) {
      adv.push({
        nivel: 'info',
        codigo: 'EQUIPOS_DESTINO_SIN_DATOS',
        mensaje: `${equiposDestinoSinAsignar.length} equipo(s) de la orden destino no tienen par asignado desde el origen y quedarán sin datos transferidos.`,
      });
    }

    if (ctx.atribucion.tieneDatosLegacySinFk) {
      adv.push({
        nivel: 'info',
        codigo: 'ORIGEN_LEGACY_RECONSTRUIDO',
        mensaje:
          'La orden origen contiene registros históricos sin vínculo explícito por equipo; el motor reconstruyó su asignación por equipo antes de aplicar el mapeo 1:1. Verifique los conteos por fila antes de confirmar.',
      });
    }

    const prevCount =
      (ctx.ordenDestino._count?.actividades_ejecutadas ?? 0) +
      (ctx.ordenDestino._count?.mediciones_servicio ?? 0) +
      (ctx.ordenDestino._count?.evidencias_fotograficas ?? 0);
    if (prevCount > 0) {
      adv.push({
        nivel: 'warning',
        codigo: 'DESTINO_CON_DATOS_PREVIOS',
        mensaje: `La orden destino ya tiene ${prevCount} registros previos (actividades/mediciones/fotos) que serán reemplazados por esta transferencia.`,
      });
    }

    return adv;
  }

  private obtenerNombreCliente(cliente: any): string {
    if (!cliente) return 'Sin cliente';
    const p = cliente.persona;
    const base =
      p?.razon_social ||
      p?.nombre_comercial ||
      p?.nombre_completo ||
      `Cliente #${cliente.id_cliente}`;
    return cliente.nombre_sede ? `${base} - ${cliente.nombre_sede}` : base;
  }

  private stripInternalEquipo(
    eq: EquipoNormalizadoInternal,
  ): EquipoTransferenciaInfo {
    const { rawOrdenEquipo: _raw, ...rest } = eq;
    return rest;
  }
}
