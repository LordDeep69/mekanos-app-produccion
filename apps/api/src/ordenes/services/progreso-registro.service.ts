/**
 * ============================================================================
 * ProgresoRegistroService - MEKANOS S.A.S
 * ============================================================================
 * FEATURE: LECTURA EN TIEMPO REAL DE AVANCE DE REGISTRO (ESTILO SYTEX)
 * 
 * Permite monitorear la telemetría y el porcentaje real de avance de las
 * órdenes de servicio en campo:
 * 
 * 1. % Total ponderado de registro (Checklist, Mediciones, Fotos, Firmas).
 * 2. Desglose detallado por secciones con alertas de fuera de rango.
 * 3. Indicador de estado de conexión y última actividad en vivo.
 * 4. Recepción de señales de latido (Heartbeat) desde la app móvil.
 * ============================================================================
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

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
  actividades: {
    completadas: number;
    total: number;
    porcentaje: number;
  };
  mediciones: {
    registradas: number;
    con_alerta: number;
  };
  evidencias_fotos: number;
  firmas: {
    tecnico: boolean;
    cliente: boolean;
    total: number;
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
    tipo: 'ACTIVIDAD' | 'MEDICION' | 'FOTO' | 'FIRMA' | 'ESTADO' | 'HEARTBEAT';
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
}

@Injectable()
export class ProgresoRegistroService {
  private readonly logger = new Logger(ProgresoRegistroService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula el progreso consolidado y detallado para la vista de orden individual
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
        empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
          include: { persona: true },
        },
        actividades_ejecutadas: {
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
          orderBy: { fecha_registro: 'desc' },
          include: {
            parametros_medicion: true,
          },
        },
        evidencias_fotograficas: {
          orderBy: { fecha_registro: 'desc' },
        },
        ordenes_pendientes: true,
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden #${idOrden} no encontrada`);
    }

    // 1. Total actividades esperadas
    let totalActividades = orden.ordenes_actividades_plan.length;
    if (totalActividades === 0 && orden.id_tipo_servicio) {
      totalActividades = await this.prisma.catalogo_actividades.count({
        where: { id_tipo_servicio: orden.id_tipo_servicio, activo: true },
      });
    }
    // Si aún es 0 pero hay actividades ejecutadas, el total es al menos las ejecutadas
    if (totalActividades === 0) {
      totalActividades = orden.actividades_ejecutadas.length;
    }

    const actividadesCompletadas = orden.actividades_ejecutadas.filter(
      (a) => a.ejecutada === true || a.estado === 'COMPLETADA',
    ).length;

    const porcentajeActividades =
      totalActividades > 0
        ? Math.min(100, Math.round((actividadesCompletadas / totalActividades) * 100))
        : orden.actividades_ejecutadas.length > 0
        ? 100
        : 0;

    // 2. Mediciones
    const medicionesRegistradas = orden.mediciones_servicio.length;
    const medicionesConAlerta = orden.mediciones_servicio.filter(
      (m) => m.fuera_de_rango === true || m.nivel_alerta === 'CRITICO' || m.nivel_alerta === 'ALERTA',
    ).length;

    // 3. Evidencias
    const totalFotos = orden.evidencias_fotograficas.length;

    // 4. Firmas
    const tieneFirmaTecnico = Boolean(orden.id_firma_tecnico);
    const tieneFirmaCliente = Boolean(orden.id_firma_cliente);
    const totalFirmas = (tieneFirmaTecnico ? 1 : 0) + (tieneFirmaCliente ? 1 : 0);

    // 5. Determinar la última actividad cronológica
    const fechasActividad: Date[] = [];
    if (orden.fecha_cambio_estado) fechasActividad.push(new Date(orden.fecha_cambio_estado));
    if (orden.fecha_modificacion) fechasActividad.push(new Date(orden.fecha_modificacion));
    if (orden.fecha_inicio_real) fechasActividad.push(new Date(orden.fecha_inicio_real));

    for (const a of orden.actividades_ejecutadas) {
      if (a.fecha_registro) fechasActividad.push(new Date(a.fecha_registro));
      if (a.fecha_ejecucion) fechasActividad.push(new Date(a.fecha_ejecucion));
    }
    for (const m of orden.mediciones_servicio) {
      if (m.fecha_registro) fechasActividad.push(new Date(m.fecha_registro));
      if (m.fecha_medicion) fechasActividad.push(new Date(m.fecha_medicion));
    }
    for (const f of orden.evidencias_fotograficas) {
      if (f.fecha_registro) fechasActividad.push(new Date(f.fecha_registro));
    }

    // Si hay telemetría de heartbeat
    const meta = (orden.metadata as any) || {};
    if (meta.telemetria_en_vivo?.timestamp) {
      fechasActividad.push(new Date(meta.telemetria_en_vivo.timestamp));
    }

    let ultimaActividadDate: Date | null = null;
    if (fechasActividad.length > 0) {
      fechasActividad.sort((a, b) => b.getTime() - a.getTime());
      ultimaActividadDate = fechasActividad[0];
    }

    const now = new Date();
    const minutosInactividad = ultimaActividadDate
      ? Math.max(0, Math.floor((now.getTime() - ultimaActividadDate.getTime()) / (1000 * 60)))
      : null;

    // 6. Estado de conexión del técnico en vivo
    const codigoEstado = orden.estados_orden?.codigo_estado || '';
    const esFinalizada =
      codigoEstado === 'COMPLETADA' ||
      codigoEstado === 'APROBADA' ||
      codigoEstado === 'CANCELADA';

    let estadoConexion: EstadoConexionTecnico = 'SIN_INICIAR';
    if (esFinalizada) {
      estadoConexion = 'COMPLETADO';
    } else if (minutosInactividad !== null) {
      if (minutosInactividad <= 10) {
        estadoConexion = 'EN_VIVO';
      } else if (minutosInactividad <= 60) {
        estadoConexion = 'RECIENTE';
      } else {
        estadoConexion = 'INACTIVO';
      }
    } else if (codigoEstado === 'EN_PROCESO') {
      estadoConexion = 'EN_VIVO';
    }

    // 7. Porcentaje global ponderado (Estilo Sytex)
    let porcentajeGlobal = 0;
    if (codigoEstado === 'COMPLETADA' || codigoEstado === 'APROBADA') {
      porcentajeGlobal = 100;
    } else {
      const pctActs = porcentajeActividades;
      const pctMeds = medicionesRegistradas > 0 ? Math.min(100, medicionesRegistradas * 12.5) : 0;
      const pctFotos = Math.min(100, Math.round((totalFotos / 3) * 100));
      const pctFirmas = totalFirmas * 50;

      porcentajeGlobal = Math.min(
        99,
        Math.round(pctActs * 0.4 + pctMeds * 0.25 + pctFotos * 0.15 + pctFirmas * 0.2),
      );
    }

    // 8. Construir timeline de últimos eventos
    const ultimosEventos: Array<{
      tipo: 'ACTIVIDAD' | 'MEDICION' | 'FOTO' | 'FIRMA' | 'ESTADO' | 'HEARTBEAT';
      descripcion: string;
      timestamp: string;
    }> = [];

    if (meta.telemetria_en_vivo) {
      ultimosEventos.push({
        tipo: 'HEARTBEAT',
        descripcion: `Señal activa móvil: ${meta.telemetria_en_vivo.actividad_actual || 'En ejecución en campo'}${
          meta.telemetria_en_vivo.bateria ? ` (Bat: ${meta.telemetria_en_vivo.bateria}%)` : ''
        }`,
        timestamp: meta.telemetria_en_vivo.timestamp || now.toISOString(),
      });
    }

    for (const a of orden.actividades_ejecutadas.slice(0, 5)) {
      const desc =
        a.catalogo_actividades?.nombre_actividad ||
        a.descripcion_manual ||
        `Actividad #${a.id_actividad_ejecutada}`;
      ultimosEventos.push({
        tipo: 'ACTIVIDAD',
        descripcion: `Checklist: ${desc} (${a.estado || 'Ejecutada'})`,
        timestamp: (a.fecha_registro || a.fecha_ejecucion || now).toISOString(),
      });
    }

    for (const m of orden.mediciones_servicio.slice(0, 5)) {
      const paramNombre =
        m.parametros_medicion?.nombre_parametro || `Parámetro #${m.id_parametro_medicion}`;
      const val = m.valor_numerico !== null ? `${m.valor_numerico} ${m.unidad_medida || ''}` : m.valor_texto || '';
      ultimosEventos.push({
        tipo: 'MEDICION',
        descripcion: `Medición: ${paramNombre} = ${val}${m.fuera_de_rango ? ' ⚠️ FUERA DE RANGO' : ''}`,
        timestamp: (m.fecha_registro || m.fecha_medicion || now).toISOString(),
      });
    }

    for (const f of orden.evidencias_fotograficas.slice(0, 3)) {
      ultimosEventos.push({
        tipo: 'FOTO',
        descripcion: `Evidencia fotográfica [${f.tipo_evidencia}]: ${f.descripcion || 'Foto de campo'}`,
        timestamp: (f.fecha_registro || now).toISOString(),
      });
    }

    if (orden.id_firma_tecnico) {
      ultimosEventos.push({
        tipo: 'FIRMA',
        descripcion: 'Firma del técnico registrada digitalmente',
        timestamp: (orden.fecha_cambio_estado || now).toISOString(),
      });
    }
    if (orden.id_firma_cliente) {
      ultimosEventos.push({
        tipo: 'FIRMA',
        descripcion: `Firma de cliente registrada (${orden.nombre_quien_recibe || 'Responsable'})`,
        timestamp: (orden.fecha_cambio_estado || now).toISOString(),
      });
    }

    // Ordenar cronológicamente descendente
    ultimosEventos.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Nombres
    const personaTecnico =
      orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona;
    const nombreTecnico = personaTecnico
      ? `${personaTecnico.primer_nombre || ''} ${personaTecnico.primer_apellido || ''}`.trim() ||
        personaTecnico.nombre_completo ||
        'Técnico'
      : 'Sin asignar';

    const clientePersona =
      orden.clientes?.persona || orden.clientes?.cliente_principal?.persona;
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
      estado_actual: {
        id_estado: orden.id_estado_actual,
        codigo_estado: orden.estados_orden?.codigo_estado || '',
        nombre_estado: orden.estados_orden?.nombre_estado || '',
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
        con_alerta: medicionesConAlerta,
      },
      evidencias_fotos: totalFotos,
      firmas: {
        tecnico: tieneFirmaTecnico,
        cliente: tieneFirmaCliente,
        total: totalFirmas,
      },
      tiempo: {
        inicio_real: orden.fecha_inicio_real ? orden.fecha_inicio_real.toISOString() : null,
        fin_real: orden.fecha_fin_real ? orden.fecha_fin_real.toISOString() : null,
        duracion_minutos: orden.duracion_minutos,
      },
      checklist_items: orden.actividades_ejecutadas.map((a) => ({
        id_actividad_ejecutada: a.id_actividad_ejecutada,
        id_actividad_catalogo: a.id_actividad_catalogo,
        descripcion:
          a.catalogo_actividades?.nombre_actividad ||
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
        parametro_codigo: m.parametros_medicion?.codigo_parametro,
        parametro_nombre:
          m.parametros_medicion?.nombre_parametro || `Parámetro #${m.id_parametro_medicion}`,
        unidad_medida: m.unidad_medida || m.parametros_medicion?.unidad_medida,
        valor_numerico: m.valor_numerico ? Number(m.valor_numerico) : null,
        valor_texto: m.valor_texto,
        fuera_de_rango: m.fuera_de_rango ?? false,
        nivel_alerta: m.nivel_alerta,
        fecha_medicion: m.fecha_medicion ? m.fecha_medicion.toISOString() : null,
        observaciones: m.observaciones,
      })),
      ultimos_eventos: ultimosEventos.slice(0, 10),
      telemetria_en_vivo: meta.telemetria_en_vivo || null,
    };
  }

  /**
   * Helper ultra-eficiente para calcular resumen de progreso para cada orden en listados
   */
  calcularProgresoResumenFromRaw(orden: any): ProgresoResumenDto {
    const counts = orden._count || {};
    const totalActsPlan = counts.ordenes_actividades_plan || 0;
    const actsEjecutadas = counts.actividades_ejecutadas || 0;
    const medicionesCount = counts.mediciones_servicio || 0;
    const fotosCount = counts.evidencias_fotograficas || 0;

    const tieneFirmaTecnico = Boolean(orden.id_firma_tecnico);
    const tieneFirmaCliente = Boolean(orden.id_firma_cliente);
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

    const totalActividades = totalActsPlan > 0 ? totalActsPlan : Math.max(actsEjecutadas, 10);
    const pctActividades =
      totalActividades > 0
        ? Math.min(100, Math.round((actsEjecutadas / totalActividades) * 100))
        : 0;

    let pctGlobal = 0;
    if (codigoEstado === 'COMPLETADA' || codigoEstado === 'APROBADA') {
      pctGlobal = 100;
    } else {
      const pctMeds = medicionesCount > 0 ? Math.min(100, medicionesCount * 12.5) : 0;
      const pctFotos = Math.min(100, Math.round((fotosCount / 3) * 100));
      const pctFirmas = totalFirmas * 50;

      pctGlobal = Math.min(
        99,
        Math.round(pctActividades * 0.4 + pctMeds * 0.25 + pctFotos * 0.15 + pctFirmas * 0.2),
      );
    }

    // Calcular inactividad desde fecha_modificacion o fecha_cambio_estado
    const dateRef = orden.fecha_modificacion
      ? new Date(orden.fecha_modificacion)
      : orden.fecha_cambio_estado
      ? new Date(orden.fecha_cambio_estado)
      : null;

    const now = new Date();
    const minutosInactividad = dateRef
      ? Math.max(0, Math.floor((now.getTime() - dateRef.getTime()) / (1000 * 60)))
      : null;

    let estadoConexion: EstadoConexionTecnico = 'SIN_INICIAR';
    if (codigoEstado === 'COMPLETADA' || codigoEstado === 'APROBADA') {
      estadoConexion = 'COMPLETADO';
    } else if (minutosInactividad !== null) {
      if (minutosInactividad <= 10) {
        estadoConexion = 'EN_VIVO';
      } else if (minutosInactividad <= 60) {
        estadoConexion = 'RECIENTE';
      } else {
        estadoConexion = 'INACTIVO';
      }
    } else if (codigoEstado === 'EN_PROCESO') {
      estadoConexion = 'EN_VIVO';
    }

    return {
      porcentaje_global: pctGlobal,
      estado_conexion: estadoConexion,
      minutos_inactividad: minutosInactividad,
      ultima_actividad: dateRef ? dateRef.toISOString() : null,
      actividades: {
        completadas: actsEjecutadas,
        total: totalActividades,
        porcentaje: pctActividades,
      },
      mediciones: {
        registradas: medicionesCount,
        con_alerta: 0,
      },
      evidencias_fotos: fotosCount,
      firmas: {
        tecnico: tieneFirmaTecnico,
        cliente: tieneFirmaCliente,
        total: totalFirmas,
      },
      tiempo: {
        inicio_real: orden.fecha_inicio_real ? new Date(orden.fecha_inicio_real).toISOString() : null,
        fin_real: orden.fecha_fin_real ? new Date(orden.fecha_fin_real).toISOString() : null,
        duracion_minutos: orden.duracion_minutos || null,
      },
    };
  }

  /**
   * Registra un heartbeat / latido de telemetría desde la app móvil en tiempo real
   */
  async registrarHeartbeat(idOrden: number, dto: HeartbeatProgresoDto): Promise<{ success: boolean; timestamp: string }> {
    const orden = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idOrden },
      select: { id_orden_servicio: true, metadata: true },
    });

    if (!orden) {
      throw new NotFoundException(`Orden #${idOrden} no encontrada`);
    }

    const currentMeta = (orden.metadata as any) || {};
    const timestamp = new Date().toISOString();

    const telemetria = {
      ...dto,
      timestamp,
      recibido_en: timestamp,
    };

    await this.prisma.ordenes_servicio.update({
      where: { id_orden_servicio: idOrden },
      data: {
        fecha_modificacion: new Date(),
        metadata: {
          ...currentMeta,
          telemetria_en_vivo: telemetria,
        },
      },
    });

    this.logger.log(`💓 [HEARTBEAT] Telemetría registrada para Orden #${idOrden} a las ${timestamp}`);

    return { success: true, timestamp };
  }
}
