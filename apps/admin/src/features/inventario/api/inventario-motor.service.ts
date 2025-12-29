// ═══════════════════════════════════════════════════════════════════════════════
// INVENTARIO MOTOR SERVICE - CLIENTE FRONTEND PARA MOTOR TRANSACCIONAL
// ═══════════════════════════════════════════════════════════════════════════════

import { apiClient } from '@/lib/api/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
    kpis: {
        valor_inventario: number;
        total_items: number;
        items_criticos: number;
        movimientos_hoy: number;
        alertas_pendientes: number;
    };
    top_movimientos: Array<{
        id_componente: number;
        _count: { id_movimiento: number };
    }>;
    fecha_consulta: string;
}

export interface ComponenteStock {
    id_componente: number;
    codigo: string | null;
    referencia: string;
    nombre: string | null;
    marca: string | null;
    tipo: string | null;
    stock_actual: number;
    stock_minimo: number;
    estado_stock: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO';
    precio_compra: number | null;
    precio_venta: number | null;
    valor_stock: number;
    unidad: string | null;
    activo: boolean | null;
}

export interface ListaComponentesResponse {
    data: ComponenteStock[];
    meta: {
        total: number;
        skip: number;
        limit: number;
    };
}

export interface KardexMovimiento {
    id_movimiento: number;
    fecha: string;
    tipo: string;
    origen: string;
    entrada: number;
    salida: number;
    saldo: number;
    costo_unitario: number | null;
    referencia: string;
    realizado_por: string;
    observaciones: string | null;
}

export interface KardexResponse {
    componente: {
        id: number;
        codigo: string | null;
        referencia: string;
        nombre: string | null;
        marca: string | null;
        tipo: string | null;
        stock_actual: number | null;
        stock_minimo: number | null;
        precio_compra: number | null;
        precio_venta: number | null;
        unidad: string | null;
    };
    kardex: KardexMovimiento[];
    total_movimientos: number;
}

export interface AlertaStock {
    id_alerta: number;
    tipo_alerta: string;
    nivel: string;
    mensaje: string;
    estado: string;
    fecha_generacion: string;
    catalogo_componentes?: {
        codigo_interno: string | null;
        descripcion_corta: string | null;
        stock_actual: number | null;
        stock_minimo: number | null;
    };
}

export interface EntradaInventarioDto {
    id_componente: number;
    cantidad: number;
    costo_unitario: number;
    id_ubicacion?: number;
    id_orden_compra?: number;
    observaciones?: string;
    realizado_por: number;
}

export interface SalidaInventarioDto {
    id_componente: number;
    cantidad: number;
    id_orden_servicio?: number;
    id_remision?: number;
    observaciones?: string;
    realizado_por: number;
}

export interface MovimientoResult {
    success: boolean;
    movimiento: {
        id_movimiento: number;
        tipo: string;
        origen: string;
        cantidad: number;
        fecha: string;
    };
    componente: {
        id_componente: number;
        codigo: string | null;
        nombre: string | null;
        stock_anterior: number;
        stock_actual: number;
        diferencia: number;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// API CALLS
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
    const { data } = await apiClient.get('/inventario/dashboard');
    return data;
}

export async function getComponentesStock(params?: {
    busqueda?: string;
    id_tipo?: number;
    solo_criticos?: boolean;
    skip?: number;
    limit?: number;
}): Promise<ListaComponentesResponse> {
    const { data } = await apiClient.get('/inventario/componentes', { params });
    return data;
}

export async function getKardex(idComponente: number, params?: {
    limit?: number;
    offset?: number;
}): Promise<KardexResponse> {
    const { data } = await apiClient.get(`/inventario/kardex/${idComponente}`, { params });
    return data;
}

export async function getAlertasStock(estado?: string): Promise<AlertaStock[]> {
    const { data } = await apiClient.get('/inventario/alertas', { params: { estado } });
    return data;
}

export async function registrarEntrada(dto: EntradaInventarioDto): Promise<MovimientoResult> {
    const { data } = await apiClient.post('/inventario/entrada', dto);
    return data;
}

export async function registrarSalida(dto: SalidaInventarioDto): Promise<MovimientoResult> {
    const { data } = await apiClient.post('/inventario/salida', dto);
    return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useDashboardKPIs() {
    return useQuery({
        queryKey: ['inventario', 'dashboard'],
        queryFn: getDashboardKPIs,
        staleTime: 30 * 1000, // 30 segundos
        refetchInterval: 60 * 1000, // Refrescar cada minuto
    });
}

export function useComponentesStock(params?: {
    busqueda?: string;
    id_tipo?: number;
    solo_criticos?: boolean;
    skip?: number;
    limit?: number;
}) {
    return useQuery({
        queryKey: ['inventario', 'componentes', params],
        queryFn: () => getComponentesStock(params),
        staleTime: 30 * 1000,
    });
}

export function useKardex(idComponente: number | null, params?: {
    limit?: number;
    offset?: number;
}) {
    return useQuery({
        queryKey: ['inventario', 'kardex', idComponente, params],
        queryFn: () => getKardex(idComponente!, params),
        enabled: !!idComponente,
        staleTime: 10 * 1000,
    });
}

export function useAlertasStock(estado?: string) {
    return useQuery({
        queryKey: ['inventario', 'alertas', estado],
        queryFn: () => getAlertasStock(estado),
        staleTime: 30 * 1000,
    });
}

export function useRegistrarEntrada() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: registrarEntrada,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventario'] });
        },
    });
}

export function useRegistrarSalida() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: registrarSalida,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventario'] });
        },
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// DETALLE COMPONENTE (VISTA MAESTRA)
// ─────────────────────────────────────────────────────────────────────────────

export interface DetalleComponente {
    id_componente: number;
    codigo_interno: string | null;
    referencia_fabricante: string;
    descripcion_corta: string | null;
    descripcion_detallada: string | null;
    marca: string | null;
    activo: boolean | null;
    tipo: {
        id: number;
        nombre: string;
        codigo: string;
    };
    tipo_comercial: string | null;
    especificaciones_tecnicas: any;
    unidad_medida: string | null;
    observaciones: string | null;
    notas_instalacion: string | null;
    stock: {
        actual: number;
        minimo: number;
        estado: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO';
        valor_total: number;
        es_inventariable: boolean | null;
    };
    precios: {
        compra: number;
        venta: number | null;
        moneda: string | null;
        margen_utilidad: number | null;
        ventana_costo_meses: number | null;
    };
    proveedor: {
        id: number;
        nombre: string;
        nit: string;
        contacto: string | null;
        telefono: string | null;
        email: string | null;
    } | null;
    reemplazado_por: {
        id: number;
        codigo: string | null;
        nombre: string | null;
    } | null;
    componentes_compatibles: number[];
    metricas: {
        total_movimientos: number;
        alertas_activas: number;
    };
    auditoria: {
        fecha_creacion: string | null;
        creado_por: string | null;
        fecha_modificacion: string | null;
        modificado_por: string | null;
    };
}

export interface ActualizarComponenteDto {
    codigo_interno?: string;
    referencia_fabricante?: string;
    descripcion_corta?: string;
    descripcion_detallada?: string;
    marca?: string;
    id_tipo_componente?: number;
    tipo_comercial?: string;
    unidad_medida?: string;
    stock_minimo?: number;
    precio_compra?: number;
    precio_venta?: number;
    id_proveedor_principal?: number;
    observaciones?: string;
    notas_instalacion?: string;
    especificaciones_tecnicas?: any;
    es_inventariable?: boolean;
    activo?: boolean;
    modificado_por: number;
}

export interface TipoComponenteOption {
    id: number;
    codigo: string;
    nombre: string;
}

export interface ProveedorOption {
    id: number;
    nit: string;
    nombre: string;
}

export async function getDetalleComponente(id: number): Promise<DetalleComponente> {
    const { data } = await apiClient.get(`/inventario/componente/${id}`);
    return data;
}

export async function actualizarComponente(id: number, dto: ActualizarComponenteDto): Promise<{ success: boolean; message: string }> {
    const { data } = await apiClient.put(`/inventario/componente/${id}`, dto);
    return data;
}

export async function getTiposComponente(): Promise<TipoComponenteOption[]> {
    const { data } = await apiClient.get('/inventario/tipos-componente');
    return data;
}

export async function getProveedoresSelect(): Promise<ProveedorOption[]> {
    const { data } = await apiClient.get('/inventario/proveedores');
    return data;
}

export function useDetalleComponente(id: number | null) {
    return useQuery({
        queryKey: ['inventario', 'componente', id],
        queryFn: () => getDetalleComponente(id!),
        enabled: !!id,
        staleTime: 10 * 1000,
    });
}

export function useActualizarComponente() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, dto }: { id: number; dto: ActualizarComponenteDto }) =>
            actualizarComponente(id, dto),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['inventario', 'componente', variables.id] });
            queryClient.invalidateQueries({ queryKey: ['inventario', 'componentes'] });
            queryClient.invalidateQueries({ queryKey: ['inventario', 'dashboard'] });
        },
    });
}

export function useTiposComponente() {
    return useQuery({
        queryKey: ['inventario', 'tipos-componente'],
        queryFn: getTiposComponente,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

export function useProveedoresSelect() {
    return useQuery({
        queryKey: ['inventario', 'proveedores-select'],
        queryFn: getProveedoresSelect,
        staleTime: 5 * 60 * 1000,
    });
}
