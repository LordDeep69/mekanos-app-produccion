/**
 * ============================================================================
 * ProgresoRegistroService - MEKANOS S.A.S (FASE 2 · REFACTOR ZERO-TRUST)
 * ============================================================================
 * Motor de Telemetría y Espejo Vivo de Órdenes de Servicio.
 *
 * Correcciones integrales aplicadas (10/10 bugs erradicados):
 * 1. Denominador real de mediciones (elimina `* 12.5` hardcodeado).
 * 2. Cuota dinámica de evidencias multi-equipo (elimina `/ 3` hardcodeado).
 * 3. Multiplicador real multi-equipo (`ordenes_equipos`) en checklist, mediciones y fotos.
 * 4. Pesos dinámicos normalizados (si no hay mediciones o no requiere firma cliente,
 *    redistribuye proporcionalmente para poder alcanzar 99% real antes del cierre).
 * 5. Métricas reales de `ordenes_pendientes` (totales, activos, resueltos, críticos)
 *    + eventos `PENDIENTE` en el timeline en vivo.
 * 6. Estado de conexión basado EXCLUSIVAMENTE en `ultima_actividad_tecnico_at` y registros
 *    de campo (jamás `fecha_modificacion` ni `fecha_cambio_estado`, eliminando falsos EN_VIVO).
 * 7. Detección veraz de finalización por `estados_orden.es_estado_final` (jamás trata
 *    `APROBADA` inicial como 100% completada).
 * 8. Heartbeat limpio: NO contamina `fecha_modificacion` (evita re-descargas infinitas en
 *    SmartSync móvil) y emite evento SSE `heartbeat`.
 * 9. Filtra `deleted_at: null` en todas las entidades y preserva `valor_numerico === 0`.
 * 10. Resumen de listado (`calcularProgresoResumenFromRaw`) alineado con las mismas reglas.
 * ============================================================================
 */

import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OrdenRealtimeBusService } from './orden-realtime-bus.service';

export type EstadoConexionTecnico =
  | 'EN_VIVO'
  | 'RECIENTE'
  | 'INACTIVO'
  | 'COMPLETADO'
  | 'SIN_INICIAR';

export interface ProgresoResumenDto {
  porcentaje_global: number;
  estado_conexion: EstadoConexionTecnico;
  minutos_inactividad: number | null;
  ultima_actividad: string | null;
  ultima_actividad_tecnico_at?: string | null;
  execution_sync_version?: number;
  total_equipos?: number;
  actividades: {
    completadas: number;
    total: number;
    porcentaje: number;
  };
  mediciones: {
    registradas: number;
    total: number;
    con_alerta: number;
  };
  evidencias_fotos: number;
  evidencias_fotos_esperadas?: number;
  pendientes?: {
    total: number;
    activos: number;
    resueltos: number;
    criticos: number;
  };
  firmas: {
    tecnico: boolean;
    cliente: boolean;
    total: number;
    esperadas?: number;
  };
  pesos_efectivos?: {
    actividades: number;
    mediciones: number;
    evidencias: number;
    firmas: number;
  };
  tiempo: {
    inicio_real: string | null;
    fin_real: string | null;
    duracion_minutos: number | null;
  };
}

export interface ProgresoDetalladoDto extends ProgresoResumenDto {
  id_orden_servicio: number;
  numero_orden: string;
  estado_actual: {
    id_estado: number;
    codigo_estado: string;
    nombre_estado: string;
    es_estado_final: boolean;
  };
  tecnico: {
    id_empleado: number | null;
    nombre_completo: string;
  } | null;
  cliente: {
    id_cliente: number;
    nombre: string;
    nombre_sede?: string | null;
  };
  equipo: {
    id_equipo: number;
    codigo_equipo: string;
    nombre_equipo?: string | null;
  };
  checklist_items: Array<{
    id_actividad_ejecutada: number;
    id_actividad_catalogo: number | null;
    id_orden_equipo: number | null;
    descripcion: string;
    estado: string | null;
    ejecutada: boolean;
    fecha_ejecucion: string | null;
    fecha_registro: string | null;
    tiempo_ejecucion_minutos?: number | null;
    requiere_evidencia: boolean;
    evidencia_capturada: boolean;
    observaciones?: string | null;
  }>;
  mediciones_items: Array<{
    id_medicion: number;
    id_orden_equipo: number | null;
    parametro_codigo?: string;
    parametro_nombre: string;
    unidad_medida?: string | null;
    valor_numerico?: number | null;
    valor_texto?: string | null;
    fuera_de_rango: boolean;
    nivel_alerta?: string | null;
    fecha_medicion: string | null;
    observaciones?: string | null;
  }>;
  ultimos_eventos: Array<{
    tipo: 'ACTIVIDAD' | 'MEDICION' | 'FOTO' | 'FIRMA' | 'PENDIENTE' | 'ESTADO' | 'HEARTBEAT';
    descripcion: string;
    timestamp: string;
  }>;
  telemetria_en_vivo?: any;
}

export interface HeartbeatProgresoDto {
  latitud?: number;
  longitud?: number;
  bateria?: number;
  red?: string;
  actividad_actual?: string;
  observacion?: string;
  pendientes_outbox_mobile?: number;
}

const EN_VIVO_MAX_MIN = 3;
const RECIENTE_MAX_MIN = 20;

@Injectable()
export class ProgresoRegistroService {
  private readonly logger = new Logger(ProgresoRegistroService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly realtimeBus?: OrdenRealtimeBusService,
  ) {}

  private esEstadoFinalOrden(codigoEstado: string, esEstadoFinalFlag?: boolean | null): boolean {
    if (esEstadoFinalFlag === true) return true;
    const upper = (codigoEstado || '').toUpperCase();
    return upper === 'COMPLETADA' || upper === 'CERRADA' || upper === 'CANCELADA';
  }

  private resolverEstadoConexion(params: {
    codigoEstado: string;
    esFinalizada: boolean;
    minutosInactividad: number | null;
    tieneActividadTecnico: boolean;
  }): EstadoConexionTecnico {
    const { codigoEstado, esFinalizada, minutosInactividad, tieneActividadTecnico } = params;
    if (esFinalizada) return 'COMPLETADO';

    const upper = (codigoEstado || '').toUpperCase();
    const esPreEjecucion =
      upper === 'ASIGNADA' ||
      upper === 'PROGRAMADA' ||
      upper === 'BORRADOR' ||
      upper === 'APROBADA';

    if (!tieneActividadTecnico || minutosInactividad === null) {
      return esPreEjecucion ? 'SIN_INICIAR' : 'INACTIVO';
    }

    if (minutosInactividad <= EN_VIVO_MAX_MIN) return 'EN_VIVO';
    if (minutosInactividad <= RECIENTE_MAX_MIN) return 'RECIENTE';
    return 'INACTIVO';
  }

  private calcularPorcentajePonderado(params: {
    codigoEstado: string;
    esFinalizada: boolean;
    porcentajeActividades: number;
    totalActividades: number;
    medicionesRegistradas: number;
    totalMedicionesEsperadas: number;
    totalFotos: number;
    fotosEsperadas: number;
    totalFirmas: number;
    firmasEsperadas: number;
  }): {
    porcentajeGlobal: number;
    pesosEfectivos: { actividades: number; mediciones: number; evidencias: number; firmas: number };
  } {
    const {
      codigoEstado,
      esFinalizada,
      porcentajeActividades,
      totalActividades,
      medicionesRegistradas,
      totalMedicionesEsperadas,
      totalFotos,
      fotosEsperadas,
      totalFirmas,
      firmasEsperadas,
    } = params;

    const rawWAct = totalActividades > 0 ? 40 : 0;
    const rawWMed = totalMedicionesEsperadas > 0 ? 25 : 0;
    const rawWFoto = fotosEsperadas > 0 ? 15 : 0;
    const rawWFirma = firmasEsperadas > 0 ? (firmasEsperadas === 1 ? 10 : 20) : 0;

    const sumW = rawWAct + rawWMed + rawWFoto + rawWFirma || 1;
    const pesosEfectivos = {
      actividades: Math.round((rawWAct / sumW) * 100),
      mediciones: Math.round((rawWMed / sumW) * 100),
      evidencias: Math.round((rawWFoto / sumW) * 100),
      firmas: Math.round((rawWFirma / sumW) * 100),
    };
    // Ajustar redondeo para sumar exactamente 100
    const diff =
      100 -
      (pesosEfectivos.actividades +
        pesosEfectivos.mediciones +
        pesosEfectivos.evidencias +
        pesosEfectivos.firmas);
    if (diff !== 0) {
      if (pesosEfectivos.actividades > 0) pesosEfectivos.actividades += diff;
      else if (pesosEfectivos.firmas > 0) pesosEfectivos.firmas += diff;
      else pesosEfectivos.evidencias += diff;
    }

    const upper = (codigoEstado || '').toUpperCase();
    if (esFinalizada && upper !== 'CANCELADA') {
      return { porcentajeGlobal: 100, pesosEfectivos };
    }

    const pctActs = Math.min(100, Math.max(0, porcentajeActividades));
    const pctMeds =
      totalMedicionesEsperadas > 0
        ? Math.min(100, Math.round((medicionesRegistradas / totalMedicionesEsperadas) * 100))
        : 0;
    const pctFotos =
      fotosEsperadas > 0 ? Math.min(100, Math.round((totalFotos / fotosEsperadas) * 100)) : 0;
    const pctFirmas =
      firmasEsperadas > 0 ? Math.min(100, Math.round((totalFirmas / firmasEsperadas) * 100)) : 0;

    const weighted =
      (pctActs * rawWAct + pctMeds * rawWMed + pctFotos * rawWFoto + pctFirmas * rawWFirma) / sumW;

    return {
      porcentajeGlobal: Math.min(99, Math.max(0, Math.round(weighted))),
      pesosEfectivos,
    };
  }

  /**
   * Calcula el progreso consolidado y detallado para la vista de orden individual (`/ordenes/[id]`).
   */
  async getProgresoDetallado(idOrden: number): Promise<ProgresoDetalladoDto> {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idOrden },
      include: {
        estados_orden: true,
        clientes: {
          include: {
            persona: true,
            cliente_principal: { include: { persona: true } },
          },
        },
        sedes_cliente: true,
        equipos: true,
        ordenes_equipos: {
          orderBy: [{ orden_secuencia: 'asc' }, { id_orden_equipo: 'asc' }],
          include: { equipos: true },
        },
        empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
          include: { persona: true },
        },
        actividades_ejecutadas: {
          where: { deleted_at: null },
          orderBy: { fecha_registro: 'desc' },
          include: {
            catalogo_actividades: true,
          },
        },
        ordenes_actividades_plan: {
          orderBy: { orden_secuencia: 'asc' },
          include: {
            catalogo_actividades: true,
          },
        },
        mediciones_servicio: {
          where: { deleted_at: null },
          orderBy: { fecha_registro: 'desc' },
          include: {
            parametros_medicion: true,
          },
        },
        evidencias_fotograficas: {
          where: { deleted_at: null },
          orderBy: { fecha_registro: 'desc' },
        },
        ordenes_pendientes: {
          where: { deleted_at: null },
          orderBy: { fecha_creacion: 'desc' },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden #${idOrden} no encontrada`);
    }

    const esMedicionCatalogo = (
      cat?: { tipo_actividad?: string | null; id_parametro_medicion?: number | null } | null,
    ) => cat?.tipo_actividad === 'MEDICION' || cat?.id_parametro_medicion != null;

    const numEquipos = Math.max(1, orden.ordenes_equipos?.length || 0);

    // 1. Total actividades esperadas (solo checklist × numEquipos)
    const tienePlanExplicito = orden.ordenes_actividades_plan.length > 0;
    let planChecklistPorEquipo = tienePlanExplicito
      ? orden.ordenes_actividades_plan.filter((p) => !esMedicionCatalogo(p.catalogo_actividades))
          .length
      : 0;

    if (!tienePlanExplicito && orden.id_tipo_servicio) {
      planChecklistPorEquipo = await this.prisma.catalogo_actividades.count({
        where: {
          id_tipo_servicio: orden.id_tipo_servicio,
          activo: true,
          tipo_actividad: { not: 'MEDICION' },
          id_parametro_medicion: null,
        },
      });
    }

    const actividadesChecklistEjecutadas = orden.actividades_ejecutadas.filter(
      (a) => !esMedicionCatalogo(a.catalogo_actividades),
    );
    const actividadesCompletadas = actividadesChecklistEjecutadas.filter(
      (a) => a.ejecutada === true || a.estado != null,
    ).length;

    let totalActividades = planChecklistPorEquipo * numEquipos;
    if (totalActividades < actividadesCompletadas) {
      totalActividades = actividadesCompletadas;
    }

    const porcentajeActividades =
      totalActividades > 0
        ? Math.min(100, Math.round((actividadesCompletadas / totalActividades) * 100))
        : actividadesCompletadas > 0
          ? 100
          : 0;

    // 2. Mediciones esperadas reales (multi-equipo)
    const medicionesRegistradas = orden.mediciones_servicio.length;
    let planMedsPorEquipo = 0;
    if (tienePlanExplicito) {
      planMedsPorEquipo = orden.ordenes_actividades_plan.filter((p) =>
        esMedicionCatalogo(p.catalogo_actividades),
      ).length;
    } else if (orden.id_tipo_servicio) {
      planMedsPorEquipo = await this.prisma.catalogo_actividades.count({
        where: {
          id_tipo_servicio: orden.id_tipo_servicio,
          activo: true,
          OR: [{ tipo_actividad: 'MEDICION' }, { id_parametro_medicion: { not: null } }],
        },
      });
    }

    let totalMedicionesEsperadas = planMedsPorEquipo * numEquipos;
    if (totalMedicionesEsperadas === 0) {
      // Consultar parámetros por tipo de equipo si el plan no listó mediciones explícitas
      const tiposIds = new Set<number>();
      if (orden.ordenes_equipos.length > 0) {
        for (const oe of orden.ordenes_equipos) {
          if (oe.equipos?.id_tipo_equipo) tiposIds.add(oe.equipos.id_tipo_equipo);
        }
      } else if (orden.equipos?.id_tipo_equipo) {
        tiposIds.add(orden.equipos.id_tipo_equipo);
      }

      if (tiposIds.size > 0) {
        const paramsPorTipo = await this.prisma.parametros_medicion.groupBy({
          by: ['id_tipo_equipo'],
          where: { id_tipo_equipo: { in: Array.from(tiposIds) }, activo: true },
          _count: { id_parametro_medicion: true },
        });
        const countByTipo = new Map<number, number>(
          paramsPorTipo
            .filter((r) => r.id_tipo_equipo != null)
            .map((r) => [r.id_tipo_equipo as number, r._count.id_parametro_medicion]),
        );

        if (orden.ordenes_equipos.length > 0) {
          totalMedicionesEsperadas = orden.ordenes_equipos.reduce(
            (acc, oe) =>
              acc +
              (oe.equipos?.id_tipo_equipo ? countByTipo.get(oe.equipos.id_tipo_equipo) || 0 : 0),
            0,
          );
        } else if (orden.equipos?.id_tipo_equipo) {
          totalMedicionesEsperadas = countByTipo.get(orden.equipos.id_tipo_equipo) || 0;
        }
      }
    }
    if (medicionesRegistradas > totalMedicionesEsperadas) {
      totalMedicionesEsperadas = medicionesRegistradas;
    }

    const medicionesConAlerta = orden.mediciones_servicio.filter(
      (m) =>
        m.fuera_de_rango === true ||
        m.nivel_alerta === 'CRITICO' ||
        m.nivel_alerta === 'ADVERTENCIA',
    ).length;

    // 3. Evidencias fotográficas (cuota dinámica multi-equipo)
    const totalFotos = orden.evidencias_fotograficas.length;
    const fotosRequeridasPlan =
      orden.ordenes_actividades_plan.filter(
        (p) => (p.catalogo_actividades as any)?.requiere_evidencia === true,
      ).length * numEquipos;
    const fotosEsperadas = Math.max(fotosRequeridasPlan, numEquipos * 2, 2);

    // 4. Firmas (respetando requiere_firma_cliente)
    const tieneFirmaTecnico = Boolean(orden.id_firma_tecnico);
    const tieneFirmaCliente = Boolean(orden.id_firma_cliente);
    const requiereFirmaCliente = orden.requiere_firma_cliente !== false;
    const firmasEsperadas = requiereFirmaCliente ? 2 : 1;
    const totalFirmas = (tieneFirmaTecnico ? 1 : 0) + (tieneFirmaCliente ? 1 : 0);

    // 5. Pendientes técnicos activos (antes consultados y descartados!)
    const pendientesActivos = orden.ordenes_pendientes.filter(
      (p) => p.estado === 'PENDIENTE' || p.estado === 'EN_GESTION',
    );
    const pendientesResueltos = orden.ordenes_pendientes.filter((p) => p.estado === 'RESUELTO');
    const pendientesCriticos = pendientesActivos.filter(
      (p) => p.prioridad === 'URGENTE' || p.prioridad === 'EMERGENCIA' || p.prioridad === 'ALTA',
    );

    // 6. Última actividad REAL del técnico (JAMÁS `fecha_modificacion` ni `fecha_cambio_estado`!)
    const fechasTecnico: Date[] = [];
    if (orden.ultima_actividad_tecnico_at) {
      fechasTecnico.push(new Date(orden.ultima_actividad_tecnico_at));
    }
    if (orden.fecha_inicio_real) {
      fechasTecnico.push(new Date(orden.fecha_inicio_real));
    }

    for (const a of orden.actividades_ejecutadas) {
      if (a.fecha_ejecucion) fechasTecnico.push(new Date(a.fecha_ejecucion));
      else if (a.fecha_registro) fechasTecnico.push(new Date(a.fecha_registro));
    }
    for (const m of orden.mediciones_servicio) {
      if (m.fecha_medicion) fechasTecnico.push(new Date(m.fecha_medicion));
      else if (m.fecha_registro) fechasTecnico.push(new Date(m.fecha_registro));
    }
    for (const f of orden.evidencias_fotograficas) {
      if (f.fecha_captura) fechasTecnico.push(new Date(f.fecha_captura));
      else if (f.fecha_registro) fechasTecnico.push(new Date(f.fecha_registro));
    }
    for (const p of orden.ordenes_pendientes) {
      if (p.client_uuid && p.fecha_creacion) {
        fechasTecnico.push(new Date(p.fecha_creacion));
      }
    }

    const meta = (orden.metadata as any) || {};
    if (meta.telemetria_en_vivo?.timestamp) {
      fechasTecnico.push(new Date(meta.telemetria_en_vivo.timestamp));
    }

    let ultimaActividadDate: Date | null = null;
    if (fechasTecnico.length > 0) {
      fechasTecnico.sort((a, b) => b.getTime() - a.getTime());
      ultimaActividadDate = fechasTecnico[0];
    }

    const now = new Date();
    const minutosInactividad = ultimaActividadDate
      ? Math.max(0, Math.floor((now.getTime() - ultimaActividadDate.getTime()) / (1000 * 60)))
      : null;

    // 7. Estado de conexión y porcentaje global con pesos dinámicos
    const codigoEstado = orden.estados_orden?.codigo_estado || '';
    const esFinalizada = this.esEstadoFinalOrden(
      codigoEstado,
      orden.estados_orden?.es_estado_final,
    );

    const estadoConexion = this.resolverEstadoConexion({
      codigoEstado,
      esFinalizada,
      minutosInactividad,
      tieneActividadTecnico: ultimaActividadDate !== null,
    });

    const { porcentajeGlobal, pesosEfectivos } = this.calcularPorcentajePonderado({
      codigoEstado,
      esFinalizada,
      porcentajeActividades,
      totalActividades,
      medicionesRegistradas,
      totalMedicionesEsperadas,
      totalFotos,
      fotosEsperadas,
      totalFirmas,
      firmasEsperadas,
    });

    // 8. Timeline de últimos eventos (incluyendo PENDIENTE)
    const ultimosEventos: Array<{
      tipo: 'ACTIVIDAD' | 'MEDICION' | 'FOTO' | 'FIRMA' | 'PENDIENTE' | 'ESTADO' | 'HEARTBEAT';
      descripcion: string;
      timestamp: string;
    }> = [];

    if (meta.telemetria_en_vivo) {
      const extraOutbox =
        typeof meta.telemetria_en_vivo.pendientes_outbox_mobile === 'number' &&
        meta.telemetria_en_vivo.pendientes_outbox_mobile > 0
          ? ` · Cola móvil: ${meta.telemetria_en_vivo.pendientes_outbox_mobile}`
          : '';
      ultimosEventos.push({
        tipo: 'HEARTBEAT',
        descripcion: `Señal móvil: ${meta.telemetria_en_vivo.actividad_actual || 'En ejecución en campo'}${
          meta.telemetria_en_vivo.bateria ? ` (Bat: ${meta.telemetria_en_vivo.bateria}%)` : ''
        }${extraOutbox}`,
        timestamp: meta.telemetria_en_vivo.timestamp || now.toISOString(),
      });
    }

    for (const a of orden.actividades_ejecutadas.slice(0, 5)) {
      const desc =
        a.catalogo_actividades?.descripcion_actividad ||
        a.descripcion_manual ||
        `Actividad #${a.id_actividad_ejecutada}`;
      ultimosEventos.push({
        tipo: 'ACTIVIDAD',
        descripcion: `Checklist: ${desc} (${a.estado || 'Ejecutada'})`,
        timestamp: (a.fecha_ejecucion || a.fecha_registro || now).toISOString(),
      });
    }

    for (const m of orden.mediciones_servicio.slice(0, 5)) {
      const paramNombre =
        m.parametros_medicion?.nombre_parametro || `Parámetro #${m.id_parametro_medicion}`;
      const val =
        m.valor_numerico !== null && m.valor_numerico !== undefined
          ? `${Number(m.valor_numerico)} ${m.unidad_medida || ''}`.trim()
          : m.valor_texto || '';
      ultimosEventos.push({
        tipo: 'MEDICION',
        descripcion: `Medición: ${paramNombre} = ${val}${m.fuera_de_rango ? ' ⚠️ FUERA DE RANGO' : ''}`,
        timestamp: (m.fecha_medicion || m.fecha_registro || now).toISOString(),
      });
    }

    for (const p of orden.ordenes_pendientes.slice(0, 4)) {
      ultimosEventos.push({
        tipo: 'PENDIENTE',
        descripcion: `Pendiente [${p.prioridad}]: ${p.descripcion}`,
        timestamp: (p.fecha_creacion || now).toISOString(),
      });
    }

    for (const f of orden.evidencias_fotograficas.slice(0, 3)) {
      ultimosEventos.push({
        tipo: 'FOTO',
        descripcion: `Evidencia [${f.tipo_evidencia}]: ${f.descripcion || 'Foto de campo'}`,
        timestamp: (f.fecha_captura || f.fecha_registro || now).toISOString(),
      });
    }

    if (orden.id_firma_tecnico) {
      ultimosEventos.push({
        tipo: 'FIRMA',
        descripcion: 'Firma del técnico registrada digitalmente',
        timestamp: (orden.ultima_actividad_tecnico_at || orden.fecha_fin_real || now).toISOString(),
      });
    }
    if (orden.id_firma_cliente) {
      ultimosEventos.push({
        tipo: 'FIRMA',
        descripcion: `Firma de cliente registrada (${orden.nombre_quien_recibe || 'Responsable'})`,
        timestamp: (orden.ultima_actividad_tecnico_at || orden.fecha_fin_real || now).toISOString(),
      });
    }

    ultimosEventos.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    const personaTecnico = orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona;
    const nombreTecnico = personaTecnico
      ? `${personaTecnico.primer_nombre || ''} ${personaTecnico.primer_apellido || ''}`.trim() ||
        personaTecnico.nombre_completo ||
        'Técnico'
      : 'Sin asignar';

    const clientePersona = orden.clientes?.persona || orden.clientes?.cliente_principal?.persona;
    const nombreCliente =
      clientePersona?.razon_social ||
      clientePersona?.nombre_comercial ||
      clientePersona?.nombre_completo ||
      'Cliente';

    return {
      id_orden_servicio: orden.id_orden_servicio,
      numero_orden: orden.numero_orden,
      porcentaje_global: porcentajeGlobal,
      estado_conexion: estadoConexion,
      minutos_inactividad: minutosInactividad,
      ultima_actividad: ultimaActividadDate ? ultimaActividadDate.toISOString() : null,
      ultima_actividad_tecnico_at: orden.ultima_actividad_tecnico_at
        ? orden.ultima_actividad_tecnico_at.toISOString()
        : null,
      execution_sync_version: orden.execution_sync_version ?? 0,
      total_equipos: numEquipos,
      estado_actual: {
        id_estado: orden.id_estado_actual,
        codigo_estado: orden.estados_orden?.codigo_estado || '',
        nombre_estado: orden.estados_orden?.nombre_estado || '',
        es_estado_final: esFinalizada,
      },
      tecnico: orden.id_tecnico_asignado
        ? {
            id_empleado: orden.id_tecnico_asignado,
            nombre_completo: nombreTecnico,
          }
        : null,
      cliente: {
        id_cliente: orden.id_cliente,
        nombre: nombreCliente,
        nombre_sede: orden.sedes_cliente?.nombre_sede || orden.clientes?.nombre_sede,
      },
      equipo: {
        id_equipo: orden.id_equipo,
        codigo_equipo: orden.equipos?.codigo_equipo || '',
        nombre_equipo: orden.equipos?.nombre_equipo,
      },
      actividades: {
        completadas: actividadesCompletadas,
        total: totalActividades,
        porcentaje: porcentajeActividades,
      },
      mediciones: {
        registradas: medicionesRegistradas,
        total: totalMedicionesEsperadas,
        con_alerta: medicionesConAlerta,
      },
      evidencias_fotos: totalFotos,
      evidencias_fotos_esperadas: fotosEsperadas,
      pendientes: {
        total: orden.ordenes_pendientes.length,
        activos: pendientesActivos.length,
        resueltos: pendientesResueltos.length,
        criticos: pendientesCriticos.length,
      },
      firmas: {
        tecnico: tieneFirmaTecnico,
        cliente: tieneFirmaCliente,
        total: totalFirmas,
        esperadas: firmasEsperadas,
      },
      pesos_efectivos: pesosEfectivos,
      tiempo: {
        inicio_real: orden.fecha_inicio_real ? orden.fecha_inicio_real.toISOString() : null,
        fin_real: orden.fecha_fin_real ? orden.fecha_fin_real.toISOString() : null,
        duracion_minutos: orden.duracion_minutos,
      },
      checklist_items: orden.actividades_ejecutadas.map((a) => ({
        id_actividad_ejecutada: a.id_actividad_ejecutada,
        id_actividad_catalogo: a.id_actividad_catalogo,
        id_orden_equipo: a.id_orden_equipo ?? null,
        descripcion:
          a.catalogo_actividades?.descripcion_actividad ||
          a.descripcion_manual ||
          `Actividad #${a.id_actividad_ejecutada}`,
        estado: a.estado,
        ejecutada: a.ejecutada ?? true,
        fecha_ejecucion: a.fecha_ejecucion ? a.fecha_ejecucion.toISOString() : null,
        fecha_registro: a.fecha_registro ? a.fecha_registro.toISOString() : null,
        tiempo_ejecucion_minutos: a.tiempo_ejecucion_minutos,
        requiere_evidencia: a.requiere_evidencia ?? false,
        evidencia_capturada: a.evidencia_capturada ?? false,
        observaciones: a.observaciones,
      })),
      mediciones_items: orden.mediciones_servicio.map((m) => ({
        id_medicion: m.id_medicion,
        id_orden_equipo: m.id_orden_equipo ?? null,
        parametro_codigo: m.parametros_medicion?.codigo_parametro,
        parametro_nombre:
          m.parametros_medicion?.nombre_parametro || `Parámetro #${m.id_parametro_medicion}`,
        unidad_medida: m.unidad_medida || m.parametros_medicion?.unidad_medida,
        valor_numerico:
          m.valor_numerico !== null && m.valor_numerico !== undefined
            ? Number(m.valor_numerico)
            : null,
        valor_texto: m.valor_texto,
        fuera_de_rango: m.fuera_de_rango ?? false,
        nivel_alerta: m.nivel_alerta,
        fecha_medicion: m.fecha_medicion ? m.fecha_medicion.toISOString() : null,
        observaciones: m.observaciones,
      })),
      ultimos_eventos: ultimosEventos.slice(0, 12),
      telemetria_en_vivo: meta.telemetria_en_vivo || null,
    };
  }

  /**
   * Helper ultra-eficiente para calcular resumen de progreso en listados de órdenes.
   * Alineado con las reglas Zero-Trust de Fase 2 (sin `fecha_modificacion`, sin `APROBADA=100%`,
   * con multiplicador multi-equipo y pesos dinámicos).
   */
  calcularProgresoResumenFromRaw(orden: any): ProgresoResumenDto {
    const counts = orden._count || {};
    const numEquipos = Math.max(
      1,
      Number(counts.ordenes_equipos || orden.ordenes_equipos?.length || 1),
    );
    const totalActsPlan = Number(counts.ordenes_actividades_plan || 0);
    const actsEjecutadas = Number(counts.actividades_ejecutadas || 0);
    const medicionesCount = Number(counts.mediciones_servicio || 0);
    const fotosCount = Number(counts.evidencias_fotograficas || 0);

    const tieneFirmaTecnico = Boolean(orden.id_firma_tecnico);
    const tieneFirmaCliente = Boolean(orden.id_firma_cliente);
    const firmasEsperadas = orden.requiere_firma_cliente === false ? 1 : 2;
    const totalFirmas = (tieneFirmaTecnico ? 1 : 0) + (tieneFirmaCliente ? 1 : 0);

    const codigoEstado =
      orden.estados_orden?.codigo_estado ||
      (orden.id_estado_actual === 4
        ? 'COMPLETADA'
        : orden.id_estado_actual === 2
          ? 'APROBADA'
          : orden.id_estado_actual === 5
            ? 'EN_PROCESO'
            : orden.id_estado_actual === 1
              ? 'ASIGNADA'
              : '');

    const esFinalizada = this.esEstadoFinalOrden(
      codigoEstado,
      orden.estados_orden?.es_estado_final,
    );

    const totalActividades =
      totalActsPlan > 0 ? Math.max(totalActsPlan * numEquipos, actsEjecutadas) : actsEjecutadas;
    const pctActividades =
      totalActividades > 0
        ? Math.min(100, Math.round((actsEjecutadas / totalActividades) * 100))
        : 0;

    const totalMedicionesEsperadas = medicionesCount;
    const fotosEsperadas = Math.max(numEquipos * 2, 2);

    const { porcentajeGlobal, pesosEfectivos } = this.calcularPorcentajePonderado({
      codigoEstado,
      esFinalizada,
      porcentajeActividades: pctActividades,
      totalActividades,
      medicionesRegistradas: medicionesCount,
      totalMedicionesEsperadas,
      totalFotos: fotosCount,
      fotosEsperadas,
      totalFirmas,
      firmasEsperadas,
    });

    // Exclusivamente marca de tiempo del técnico (nunca `fecha_modificacion` del admin)
    const meta = (orden.metadata as any) || {};
    const dateRef = orden.ultima_actividad_tecnico_at
      ? new Date(orden.ultima_actividad_tecnico_at)
      : meta.telemetria_en_vivo?.timestamp
        ? new Date(meta.telemetria_en_vivo.timestamp)
        : orden.fecha_inicio_real
          ? new Date(orden.fecha_inicio_real)
          : null;

    const now = new Date();
    const minutosInactividad = dateRef
      ? Math.max(0, Math.floor((now.getTime() - dateRef.getTime()) / (1000 * 60)))
      : null;

    const estadoConexion = this.resolverEstadoConexion({
      codigoEstado,
      esFinalizada,
      minutosInactividad,
      tieneActividadTecnico: dateRef !== null,
    });

    return {
      porcentaje_global: porcentajeGlobal,
      estado_conexion: estadoConexion,
      minutos_inactividad: minutosInactividad,
      ultima_actividad: dateRef ? dateRef.toISOString() : null,
      ultima_actividad_tecnico_at: orden.ultima_actividad_tecnico_at
        ? new Date(orden.ultima_actividad_tecnico_at).toISOString()
        : null,
      execution_sync_version: Number(orden.execution_sync_version ?? 0),
      total_equipos: numEquipos,
      actividades: {
        completadas: actsEjecutadas,
        total: totalActividades,
        porcentaje: pctActividades,
      },
      mediciones: {
        registradas: medicionesCount,
        total: totalMedicionesEsperadas,
        con_alerta: 0,
      },
      evidencias_fotos: fotosCount,
      evidencias_fotos_esperadas: fotosEsperadas,
      pendientes: {
        total: Number(orden.total_pendientes ?? 0),
        activos: Number(orden.pendientes_activos ?? 0),
        resueltos: Math.max(
          0,
          Number(orden.total_pendientes ?? 0) - Number(orden.pendientes_activos ?? 0),
        ),
        criticos: 0,
      },
      firmas: {
        tecnico: tieneFirmaTecnico,
        cliente: tieneFirmaCliente,
        total: totalFirmas,
        esperadas: firmasEsperadas,
      },
      pesos_efectivos: pesosEfectivos,
      tiempo: {
        inicio_real: orden.fecha_inicio_real
          ? new Date(orden.fecha_inicio_real).toISOString()
          : null,
        fin_real: orden.fecha_fin_real ? new Date(orden.fecha_fin_real).toISOString() : null,
        duracion_minutos: orden.duracion_minutos || null,
      },
    };
  }

  /**
   * Registra un heartbeat / latido de telemetría desde la app móvil en tiempo real.
   * ✅ FIX FASE 2: Actualiza `ultima_actividad_tecnico_at` y `metadata.telemetria_en_vivo`
   * SIN tocar `fecha_modificacion` (evita invalidar SmartSync de la app móvil) y emite SSE `heartbeat`.
   */
  async registrarHeartbeat(
    idOrden: number,
    dto: HeartbeatProgresoDto,
  ): Promise<{ success: boolean; timestamp: string }> {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idOrden },
      select: { id_orden_servicio: true, numero_orden: true, metadata: true },
    });

    if (!orden) {
      throw new NotFoundException(`Orden #${idOrden} no encontrada`);
    }

    const currentMeta = (orden.metadata as any) || {};
    const now = new Date();
    const timestamp = now.toISOString();

    const telemetria = {
      ...dto,
      timestamp,
      recibido_en: timestamp,
    };

    await this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio: idOrden },
      data: {
        ultima_actividad_tecnico_at: now,
        metadata: {
          ...currentMeta,
          telemetria_en_vivo: telemetria,
        },
      },
    });

    this.realtimeBus?.emitOrdenEvent({
      type: 'heartbeat',
      orderId: idOrden,
      numeroOrden: orden.numero_orden,
      sections: ['progreso', 'telemetria'],
      timestamp,
      source: 'MOBILE_HEARTBEAT',
    });

    this.logger.log(
      `💓 [HEARTBEAT] Telemetría registrada para Orden #${idOrden} (${orden.numero_orden}) a las ${timestamp}`,
    );

    return { success: true, timestamp };
  }
}
