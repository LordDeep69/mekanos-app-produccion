/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos para el Dashboard
 *
 * ZERO TRUST: Tipos estrictos basados en la respuesta real del backend.
 * NO usar 'any'. Si algo no viene, usar undefined o valores por defecto.
 */

// ============================================================
// TIPOS PARA ALERTAS
// ============================================================

export interface DashboardAlertas {
  notificacionesNoLeidas: number;
  contratosPorVencer: number;
  ordenesVencidas: number;
  equiposCriticos: number;
  alertasStockCriticas: number;
  totalAlertas: number;
  ultimasNotificaciones: NotificacionResumen[];
}

export interface NotificacionResumen {
  id_notificacion: number;
  tipo_notificacion: string;
  titulo: string;
  mensaje: string;
  prioridad: string;
  fecha_creacion: string;
}

// ============================================================
// TIPOS PARA ÓRDENES
// ============================================================

export interface DashboardOrdenes {
  total: number;
  ordenesMes: number;
  completadasMes: number;
  pendientes: number;
  porEstado: EstadoOrdenCount[];
}

export interface EstadoOrdenCount {
  estado: string;
  cantidad: number;
}

// ============================================================
// TIPOS PARA COMERCIAL
// ============================================================

export interface DashboardComercial {
  totalCotizaciones: number;
  pendientesRespuesta: number;
  aprobadasMes: number;
  valorPendienteCOP: number;
  porEstado: EstadoCotizacionCount[];
}

export interface EstadoCotizacionCount {
  estado: string;
  cantidad: number;
  valorTotal: number;
}

// ============================================================
// TIPOS PARA RESUMEN DEL MES
// ============================================================

export interface DashboardResumenMes {
  mes: number;
  anio: number;
  serviciosProgramados: number;
  serviciosCompletados: number;
  porcentajeCumplimiento: number;
  ingresosMesCOP: number;
  clientesActivos: number;
}

// ============================================================
// TIPOS PARA PRODUCTIVIDAD
// ============================================================

export interface DashboardProductividad {
  mes: number;
  anio: number;
  productividadPorTecnico: ProductividadTecnico[];
}

export interface ProductividadTecnico {
  tecnico: string;
  ordenesCompletadas: number;
}

// ============================================================
// TIPO CONSOLIDADO (cuando /api/dashboard funcione completamente)
// ============================================================

export interface DashboardCompleto {
  success: boolean;
  timestamp: string;
  periodo: {
    mes: number;
    anio: number;
  };
  ordenes: DashboardOrdenes;
  comercial: DashboardComercial;
  alertas: DashboardAlertas;
  resumenMes: DashboardResumenMes;
}

// ============================================================
// TIPOS PARA KPIs
// ============================================================

export type KPIVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface KPIData {
  id: string;
  title: string;
  value: number | string;
  subtitle?: string;
  icon: string; // Nombre del icono de Lucide
  variant: KPIVariant;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

// ============================================================
// TIPOS PARA ÓRDENES RECIENTES (para tabla)
// ============================================================

export interface OrdenReciente {
  id: number;
  numeroOrden: string;
  cliente: string;
  equipo: string;
  estado: string;
  fecha: string;
  tecnico?: string;
}
