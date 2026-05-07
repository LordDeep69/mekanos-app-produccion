/**
 * DASHBOARD SERVICE - MEKANOS S.A.S
 *
 * Servicio de métricas agregadas para el panel de administración.
 * Consolida toda la información que el admin necesita en llamadas optimizadas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * 🚀 OPTIMIZACIÓN ENTERPRISE 05-ENE-2026
 * ═══════════════════════════════════════════════════════════════════════════
 * PROBLEMA: Dashboard ejecutaba 20+ queries individuales (~4-10 segundos)
 * SOLUCIÓN: 
 *   1. Cache en memoria con TTL de 60 segundos
 *   2. Query única optimizada con $queryRaw para métricas principales
 *   3. Precarga de catálogos estáticos
 * IMPACTO: Reducción de ~3 segundos en carga del dashboard
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @author MEKANOS Development Team
 * @version 2.0.0 - Optimizado
 */

import { PrismaService } from '@mekanos/database';
import { Injectable, Logger } from '@nestjs/common';

// ═══════════════════════════════════════════════════════════════════════════
// 🚀 CACHE EN MEMORIA ENTERPRISE
// ═══════════════════════════════════════════════════════════════════════════

interface DashboardCache {
  data: any;
  expiresAt: number;
}

interface EstadosCache {
  ordenes: Map<number, string>;
  cotizaciones: Map<number, string>;
  expiresAt: number;
}

// Cache global del módulo
let dashboardCache: DashboardCache | null = null;
let estadosCache: EstadosCache | null = null;

const DASHBOARD_CACHE_TTL = 60 * 1000; // 60 segundos
const ESTADOS_CACHE_TTL = 30 * 60 * 1000; // 30 minutos (catálogos estáticos)

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * ✅ OPTIMIZADO: Dashboard completo con CACHE
   * - Primera llamada: ejecuta queries (~1-2s)
   * - Llamadas siguientes dentro de 60s: retorna cache (~0ms)
   */
  async getDashboardCompleto(mes: number, anio: number) {
    const cacheKey = `${mes}-${anio}`;

    // ✅ OPTIMIZACIÓN: Verificar cache válido
    if (dashboardCache &&
      Date.now() < dashboardCache.expiresAt &&
      dashboardCache.data?.cacheKey === cacheKey) {
      this.logger.debug('[Dashboard] ⚡ Retornando desde cache');
      return dashboardCache.data;
    }

    this.logger.debug('[Dashboard] 🔄 Ejecutando queries...');
    const startTime = Date.now();

    // Precargar catálogos de estados (se usa en múltiples métodos)
    await this.ensureEstadosCache();

    const [ordenes, comercial, alertas, resumenMes] = await Promise.all([
      this.getMetricasOrdenesOptimizado(),
      this.getMetricasComerciales(),
      this.getAlertasActivasOptimizado(),
      this.getResumenMes(mes, anio),
    ]);

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      periodo: { mes, anio },
      ordenes,
      comercial,
      alertas,
      resumenMes,
      cacheKey,
      _meta: {
        queryTimeMs: Date.now() - startTime,
        cached: false,
      },
    };

    // ✅ Guardar en cache
    dashboardCache = {
      data: { ...result, _meta: { ...result._meta, cached: true } },
      expiresAt: Date.now() + DASHBOARD_CACHE_TTL,
    };

    this.logger.debug(`[Dashboard] ✅ Completado en ${result._meta.queryTimeMs}ms`);
    return result;
  }

  /**
   * ✅ NUEVO: Precarga y cachea catálogos de estados
   */
  private async ensureEstadosCache(): Promise<void> {
    if (estadosCache && Date.now() < estadosCache.expiresAt) {
      return;
    }

    const [estadosOrden, estadosCotizacion] = await Promise.all([
      this.prisma.estados_orden.findMany({
        select: { id_estado: true, nombre_estado: true },
      }),
      this.prisma.estados_cotizacion.findMany({
        select: { id_estado: true, nombre_estado: true },
      }),
    ]);

    estadosCache = {
      ordenes: new Map(estadosOrden.map(e => [e.id_estado, e.nombre_estado])),
      cotizaciones: new Map(estadosCotizacion.map(e => [e.id_estado, e.nombre_estado])),
      expiresAt: Date.now() + ESTADOS_CACHE_TTL,
    };
  }

  /**
   * ✅ OPTIMIZADO: Métricas de órdenes en UNA sola query SQL
   */
  private async getMetricasOrdenesOptimizado() {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    // ✅ UNA SOLA QUERY con múltiples agregaciones
    const stats = await this.prisma.$queryRaw<Array<{
      total: bigint;
      ordenes_mes: bigint;
      completadas_mes: bigint;
    }>>`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE fecha_creacion >= ${inicioMes}) as ordenes_mes,
        COUNT(*) FILTER (WHERE fecha_fin_real >= ${inicioMes}) as completadas_mes
      FROM ordenes_servicio
    `;

    // Conteo por estado (necesario para el gráfico)
    const ordenesCount = await this.prisma.ordenes_servicio.groupBy({
      by: ['id_estado_actual'],
      _count: { id_orden_servicio: true },
    });

    // IDs de estados no finales para contar pendientes
    // ✅ FIX 09-ABR-2026: APROBADA NO es estado final, es el estado inicial (orden recién creada)
    const estadosPendientes = Array.from(estadosCache!.ordenes.entries())
      .filter(([_, nombre]) => !['COMPLETADA', 'CANCELADA'].includes(nombre))
      .map(([id]) => id);

    const pendientes = ordenesCount
      .filter(item => estadosPendientes.includes(item.id_estado_actual))
      .reduce((sum, item) => sum + item._count.id_orden_servicio, 0);

    return {
      total: Number(stats[0]?.total || 0),
      ordenesMes: Number(stats[0]?.ordenes_mes || 0),
      completadasMes: Number(stats[0]?.completadas_mes || 0),
      pendientes,
      porEstado: ordenesCount.map(item => ({
        estado: estadosCache!.ordenes.get(item.id_estado_actual) || 'Desconocido',
        cantidad: item._count.id_orden_servicio,
      })),
    };
  }

  /**
   * ✅ OPTIMIZADO: Alertas activas con queries reducidas
   */
  private async getAlertasActivasOptimizado() {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);

    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);

    // ID del estado PROGRAMADA (cacheado)
    const estadoProgramadaId = Array.from(estadosCache!.ordenes.entries())
      .find(([_, nombre]) => ['PROGRAMADA', 'Programada'].includes(nombre))?.[0];

    // ✅ Ejecutar todas las queries de conteo en paralelo
    const [
      notificacionesNoLeidas,
      contratosPorVencer,
      ordenesVencidas,
      equiposCriticos,
      alertasStockCriticas,
    ] = await Promise.all([
      this.prisma.notificaciones.findMany({
        where: { leida: false },
        orderBy: [{ prioridad: 'desc' }, { fecha_creacion: 'desc' }],
        take: 10,
        select: {
          id_notificacion: true,
          tipo_notificacion: true,
          titulo: true,
          mensaje: true,
          prioridad: true,
          fecha_creacion: true,
        },
      }),
      this.prisma.contratos_mantenimiento.count({
        where: {
          estado_contrato: 'ACTIVO',
          fecha_fin: { lte: fechaLimite, gte: new Date() },
        },
      }),
      estadoProgramadaId
        ? this.prisma.ordenes_servicio.count({
          where: {
            id_estado_actual: estadoProgramadaId,
            fecha_programada: { lt: ayer },
          },
        })
        : Promise.resolve(0),
      this.prisma.mediciones_servicio.count({
        where: { nivel_alerta: 'CRITICO' },
      }),
      this.prisma.alertas_stock.count({
        where: { estado: 'PENDIENTE', nivel: 'CRITICO' },
      }),
    ]);

    return {
      notificacionesNoLeidas: notificacionesNoLeidas.length,
      contratosPorVencer,
      ordenesVencidas,
      equiposCriticos,
      alertasStockCriticas,
      totalAlertas: contratosPorVencer + ordenesVencidas + equiposCriticos + alertasStockCriticas,
      ultimasNotificaciones: notificacionesNoLeidas,
    };
  }

  /**
   * Métricas de órdenes de servicio
   */
  async getMetricasOrdenes() {
    // Conteo por estado
    const ordenesCount = await this.prisma.ordenes_servicio.groupBy({
      by: ['id_estado_actual'],
      _count: { id_orden_servicio: true },
    });

    // Obtener nombres de estados
    const estados = await this.prisma.estados_orden.findMany({
      select: { id_estado: true, nombre_estado: true },
    });

    const estadosMap = new Map(estados.map(e => [e.id_estado, e.nombre_estado]));

    // Total órdenes
    const total = await this.prisma.ordenes_servicio.count();

    // Órdenes del mes actual
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const ordenesMes = await this.prisma.ordenes_servicio.count({
      where: { fecha_creacion: { gte: inicioMes } },
    });

    // Órdenes completadas este mes
    const completadasMes = await this.prisma.ordenes_servicio.count({
      where: {
        fecha_fin_real: { gte: inicioMes },
      },
    });

    // Órdenes pendientes (no completadas ni canceladas)
    const estadosPendientes = await this.prisma.estados_orden.findMany({
      // ✅ FIX 09-ABR-2026: APROBADA NO es estado final
      where: { nombre_estado: { notIn: ['COMPLETADA', 'CANCELADA'] } },
      select: { id_estado: true },
    });
    const idsPendientes = estadosPendientes.map(e => e.id_estado);

    const pendientes = await this.prisma.ordenes_servicio.count({
      where: { id_estado_actual: { in: idsPendientes } },
    });

    return {
      total,
      ordenesMes,
      completadasMes,
      pendientes,
      porEstado: ordenesCount.map(item => ({
        estado: estadosMap.get(item.id_estado_actual) || 'Desconocido',
        cantidad: item._count.id_orden_servicio,
      })),
    };
  }

  /**
   * Métricas comerciales
   */
  async getMetricasComerciales() {
    // Total cotizaciones
    const totalCotizaciones = await this.prisma.cotizaciones.count();

    // Cotizaciones por estado
    const cotizacionesPorEstado = await this.prisma.cotizaciones.groupBy({
      by: ['id_estado'],
      _count: { id_cotizacion: true },
      _sum: { total_cotizacion: true },
    });

    // Obtener nombres de estados
    const estados = await this.prisma.estados_cotizacion.findMany({
      select: { id_estado: true, nombre_estado: true },
    });
    const estadosMap = new Map(estados.map(e => [e.id_estado, e.nombre_estado]));

    // Cotizaciones pendientes de respuesta
    const estadoEnviada = estados.find(e => e.nombre_estado === 'ENVIADA');
    const pendientesRespuesta = estadoEnviada ? await this.prisma.cotizaciones.count({
      where: { id_estado: estadoEnviada.id_estado },
    }) : 0;

    // Cotizaciones aprobadas este mes
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const estadoAprobada = estados.find(e => e.nombre_estado === 'APROBADA_CLIENTE');
    const aprobadasMes = estadoAprobada ? await this.prisma.cotizaciones.count({
      where: {
        id_estado: estadoAprobada.id_estado,
        fecha_modificacion: { gte: inicioMes },
      },
    }) : 0;

    // Valor total cotizado (pendientes)
    const valorPendiente = cotizacionesPorEstado
      .filter(c => ['ENVIADA', 'EN_REVISION'].includes(estadosMap.get(c.id_estado) || ''))
      .reduce((sum, c) => sum + (Number(c._sum.total_cotizacion) || 0), 0);

    return {
      totalCotizaciones,
      pendientesRespuesta,
      aprobadasMes,
      valorPendienteCOP: valorPendiente,
      porEstado: cotizacionesPorEstado.map(item => ({
        estado: estadosMap.get(item.id_estado) || 'Desconocido',
        cantidad: item._count.id_cotizacion,
        valorTotal: Number(item._sum.total_cotizacion) || 0,
      })),
    };
  }

  /**
   * Alertas activas
   */
  async getAlertasActivas() {
    // Notificaciones no leídas (últimas 10)
    const notificacionesNoLeidas = await this.prisma.notificaciones.findMany({
      where: { leida: false },
      orderBy: [
        { prioridad: 'desc' },
        { fecha_creacion: 'desc' },
      ],
      take: 10,
      select: {
        id_notificacion: true,
        tipo_notificacion: true,
        titulo: true,
        mensaje: true,
        prioridad: true,
        fecha_creacion: true,
      },
    });

    // Contratos por vencer (30 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 30);

    const contratosPorVencer = await this.prisma.contratos_mantenimiento.count({
      where: {
        estado_contrato: 'ACTIVO',
        fecha_fin: { lte: fechaLimite, gte: new Date() },
      },
    });

    // Órdenes vencidas (programadas con fecha pasada)
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);

    const estadoProgramada = await this.prisma.estados_orden.findFirst({
      where: { nombre_estado: { in: ['PROGRAMADA', 'Programada'] } },
    });

    const ordenesVencidas = estadoProgramada ? await this.prisma.ordenes_servicio.count({
      where: {
        id_estado_actual: estadoProgramada.id_estado,
        fecha_programada: { lt: ayer },
      },
    }) : 0;

    // Equipos críticos (con mediciones fuera de rango)
    const equiposCriticos = await this.prisma.mediciones_servicio.count({
      where: { nivel_alerta: 'CRITICO' },
    });

    // Alertas stock críticas
    const alertasStockCriticas = await this.prisma.alertas_stock.count({
      where: { estado: 'PENDIENTE', nivel: 'CRITICO' },
    });

    return {
      notificacionesNoLeidas: notificacionesNoLeidas.length,
      contratosPorVencer,
      ordenesVencidas,
      equiposCriticos,
      alertasStockCriticas,
      totalAlertas: contratosPorVencer + ordenesVencidas + equiposCriticos + alertasStockCriticas,
      ultimasNotificaciones: notificacionesNoLeidas,
    };
  }

  /**
   * Resumen del mes
   */
  async getResumenMes(mes: number, anio: number) {
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0);

    const [serviciosProgramados, serviciosCompletados, ingresosMes, clientesActivos] = await Promise.all([
      this.prisma.cronogramas_servicio.count({
        where: {
          fecha_prevista: { gte: fechaInicio, lte: fechaFin },
        },
      }),
      this.prisma.ordenes_servicio.count({
        where: {
          fecha_fin_real: { gte: fechaInicio, lte: fechaFin },
        },
      }),
      this.prisma.cotizaciones.aggregate({
        where: {
          fecha_modificacion: { gte: fechaInicio, lte: fechaFin },
          estado: { nombre_estado: 'APROBADA_CLIENTE' },
        },
        _sum: { total_cotizacion: true },
      }),
      this.prisma.contratos_mantenimiento.count({
        where: { estado_contrato: 'ACTIVO' },
      }),
    ]);

    return {
      mes,
      anio,
      serviciosProgramados,
      serviciosCompletados,
      porcentajeCumplimiento: serviciosProgramados > 0
        ? Math.round((serviciosCompletados / serviciosProgramados) * 100)
        : 100,
      ingresosMesCOP: Number(ingresosMes._sum.total_cotizacion) || 0,
      clientesActivos,
    };
  }

  /**
   * Productividad por técnico
   */
  async getProductividadTecnicos(mes: number, anio: number) {
    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0);

    // Órdenes completadas por técnico
    const ordenesCompletadas = await this.prisma.ordenes_servicio.groupBy({
      by: ['id_tecnico_asignado'],
      where: {
        fecha_fin_real: { gte: fechaInicio, lte: fechaFin },
        id_tecnico_asignado: { not: null },
      },
      _count: { id_orden_servicio: true },
    });

    // Obtener nombres de técnicos
    const tecnicosIds = ordenesCompletadas.map(o => o.id_tecnico_asignado).filter(Boolean) as number[];

    const tecnicos = tecnicosIds.length > 0 ? await this.prisma.empleados.findMany({
      where: { id_empleado: { in: tecnicosIds } },
      include: { persona: { select: { nombre_completo: true } } },
    }) : [];

    const tecnicosMap = new Map(tecnicos.map(t => [
      t.id_empleado,
      t.persona.nombre_completo || `Técnico ${t.id_empleado}`,
    ]));

    return {
      mes,
      anio,
      productividadPorTecnico: ordenesCompletadas.map(item => ({
        tecnico: tecnicosMap.get(item.id_tecnico_asignado!) || 'Desconocido',
        ordenesCompletadas: item._count.id_orden_servicio,
      })).sort((a, b) => b.ordenesCompletadas - a.ordenesCompletadas),
    };
  }
}

