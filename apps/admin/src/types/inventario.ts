/**
 * MEKANOS S.A.S - Portal Admin
 * Tipos para el módulo de Inventario
 * 
 * Backend: catalogo-componentes.controller.ts + movimientos-inventario.controller.ts
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CATÁLOGO DE COMPONENTES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TipoComponente {
    id_tipo_componente: number;
    codigo: string;
    nombre: string;
    descripcion?: string;
    activo: boolean;
}

export interface Componente {
    id_componente: number;
    id_tipo_componente: number;
    codigo_interno?: string;
    numero_parte?: string;
    nombre: string;
    descripcion?: string;
    marca?: string;
    modelo?: string;
    tipo_comercial?: 'ORIGINAL' | 'GENERICO' | 'REMANUFACTURADO' | 'ALTERNO';
    unidad_medida: string;
    stock_minimo: number;
    stock_maximo?: number;
    punto_reorden?: number;
    precio_compra?: number;
    precio_venta?: number;
    id_proveedor_principal?: number;
    tiempo_entrega_dias?: number;
    ubicacion_almacen?: string;
    requiere_serial: boolean;
    activo: boolean;
    observaciones?: string;
    fecha_creacion?: string;
    tipo_componente?: TipoComponente;
    proveedor?: {
        id_proveedor: number;
        nombre_comercial: string;
    };
}

export interface ComponenteConStock extends Componente {
    stock_actual: number;
    valor_inventario: number;
    estado_stock: 'NORMAL' | 'BAJO' | 'CRITICO' | 'AGOTADO' | 'EXCESO';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOVIMIENTOS DE INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════════

export type TipoMovimiento =
    | 'ENTRADA_COMPRA'
    | 'ENTRADA_DEVOLUCION'
    | 'ENTRADA_AJUSTE'
    | 'SALIDA_ORDEN_SERVICIO'
    | 'SALIDA_VENTA'
    | 'SALIDA_AJUSTE'
    | 'SALIDA_BAJA'
    | 'TRASLADO_ENTRADA'
    | 'TRASLADO_SALIDA';

export type OrigenMovimiento =
    | 'ORDEN_COMPRA'
    | 'ORDEN_SERVICIO'
    | 'AJUSTE_INVENTARIO'
    | 'DEVOLUCION_CLIENTE'
    | 'DEVOLUCION_PROVEEDOR'
    | 'TRASLADO'
    | 'MANUAL';

export interface MovimientoInventario {
    id_movimiento: number;
    id_componente: number;
    tipo_movimiento: TipoMovimiento;
    origen_movimiento: OrigenMovimiento;
    cantidad: number;
    cantidad_anterior: number;
    cantidad_posterior: number;
    precio_unitario?: number;
    costo_total?: number;
    id_ubicacion?: number;
    id_lote?: string;
    id_orden_servicio?: number;
    id_orden_compra?: number;
    observaciones?: string;
    fecha_movimiento: string;
    registrado_por: number;
    componente?: Componente;
    usuario?: {
        id_usuario: number;
        username: string;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// KARDEX
// ═══════════════════════════════════════════════════════════════════════════════

export interface KardexEntry {
    fecha: string;
    tipo_movimiento: TipoMovimiento;
    origen: string;
    referencia?: string;
    entrada: number;
    salida: number;
    saldo: number;
    precio_unitario?: number;
    observaciones?: string;
}

export interface KardexComponente {
    componente: Componente;
    saldo_inicial: number;
    total_entradas: number;
    total_salidas: number;
    saldo_final: number;
    movimientos: KardexEntry[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK
// ═══════════════════════════════════════════════════════════════════════════════

export interface StockPorUbicacion {
    id_ubicacion: number;
    nombre_ubicacion: string;
    cantidad: number;
}

export interface StockComponente {
    id_componente: number;
    codigo_interno?: string;
    nombre: string;
    stock_total: number;
    stock_minimo: number;
    stock_maximo?: number;
    punto_reorden?: number;
    estado: 'NORMAL' | 'BAJO' | 'CRITICO' | 'AGOTADO' | 'EXCESO';
    valor_inventario: number;
    stock_por_ubicacion?: StockPorUbicacion[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY PARAMS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComponentesQueryParams {
    id_tipo_componente?: number;
    marca?: string;
    tipo_comercial?: string;
    activo?: boolean;
    skip?: number;
    limit?: number;
    search?: string;
}

export interface MovimientosQueryParams {
    id_componente?: number;
    tipo_movimiento?: TipoMovimiento;
    fecha_desde?: string;
    fecha_hasta?: string;
    id_orden_servicio?: number;
    id_orden_compra?: number;
    page?: number;
    limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DTOs
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateComponenteDto {
    id_tipo_componente: number;
    codigo_interno?: string;
    numero_parte?: string;
    nombre: string;
    descripcion?: string;
    marca?: string;
    modelo?: string;
    tipo_comercial?: string;
    unidad_medida: string;
    stock_minimo: number;
    stock_maximo?: number;
    punto_reorden?: number;
    precio_compra?: number;
    precio_venta?: number;
    id_proveedor_principal?: number;
    ubicacion_almacen?: string;
    requiere_serial?: boolean;
}

export interface RegistrarMovimientoDto {
    tipo_movimiento: TipoMovimiento;
    origen_movimiento: OrigenMovimiento;
    id_componente: number;
    cantidad: number;
    id_ubicacion?: number;
    id_lote?: string;
    id_orden_servicio?: number;
    id_orden_compra?: number;
    observaciones?: string;
}

export interface RegistrarTrasladoDto {
    id_componente: number;
    cantidad: number;
    id_ubicacion_origen: number;
    id_ubicacion_destino: number;
    observaciones?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESPUESTAS API
// ═══════════════════════════════════════════════════════════════════════════════

export interface ComponentesResponse {
    data: Componente[];
    total: number;
}

export interface MovimientosResponse {
    success: boolean;
    data: MovimientoInventario[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// KPIs INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════════

export interface InventarioKPIs {
    totalItems: number;
    valorTotal: number;
    itemsBajoStock: number;
    itemsAgotados: number;
    movimientosHoy: number;
    alertasActivas: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getEstadoStockLabel(estado: string): string {
    const labels: Record<string, string> = {
        NORMAL: 'Normal',
        BAJO: 'Stock Bajo',
        CRITICO: 'Crítico',
        AGOTADO: 'Agotado',
        EXCESO: 'Exceso',
    };
    return labels[estado] || estado;
}

export function getEstadoStockColor(estado: string): string {
    const colors: Record<string, string> = {
        NORMAL: 'green',
        BAJO: 'yellow',
        CRITICO: 'orange',
        AGOTADO: 'red',
        EXCESO: 'blue',
    };
    return colors[estado] || 'gray';
}

export function getTipoMovimientoLabel(tipo: TipoMovimiento): string {
    const labels: Record<TipoMovimiento, string> = {
        ENTRADA_COMPRA: 'Entrada (Compra)',
        ENTRADA_DEVOLUCION: 'Entrada (Devolución)',
        ENTRADA_AJUSTE: 'Entrada (Ajuste)',
        SALIDA_ORDEN_SERVICIO: 'Salida (Orden Servicio)',
        SALIDA_VENTA: 'Salida (Venta)',
        SALIDA_AJUSTE: 'Salida (Ajuste)',
        SALIDA_BAJA: 'Salida (Baja)',
        TRASLADO_ENTRADA: 'Traslado (Entrada)',
        TRASLADO_SALIDA: 'Traslado (Salida)',
    };
    return labels[tipo] || tipo;
}
