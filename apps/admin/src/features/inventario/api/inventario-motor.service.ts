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
        items_con_stock?: number;
        items_criticos: number;
        total_lotes_activos?: number;
        total_movimientos?: number;
        movimientos_hoy: number;
        alertas_pendientes: number;
        total_bodegas?: number;
    };
    top_movimientos?: Array<{
        id_componente: number;
        _count: { id_movimiento: number };
    }>;
    fecha_consulta?: string;
}

export interface ComponenteBodegaStock {
    id_ubicacion: number;
    codigo: string;
    nombre: string;
    stock: number;
}

export interface ComponenteStock {
    id_componente: number;
    codigo: string | null;
    referencia: string;
    nombre: string | null;
    marca: string | null;
    tipo: string | null;
    categoria?: string | null;
    categoria_padre?: string | null;
    categoria_completa?: string | null;
    stock_actual: number;
    stock_minimo: number;
    estado_stock: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO';
    precio_compra: number | null;
    precio_venta: number | null;
    valor_stock: number;
    unidad: string | null;
    bodegas?: ComponenteBodegaStock[];
    lotes_activos?: Array<{
        id_lote: number;
        codigo_lote: string;
        cantidad_actual: number;
        fecha_vencimiento?: string | null;
        id_ubicacion?: number;
        bodega_codigo?: string;
        bodega_nombre?: string;
    }>;
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
    bodega?: string;
    lote?: string;
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

export interface KardexGlobalMovimiento {
    id_movimiento: number;
    fecha: string;
    tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRANSFERENCIA';
    origen: string;
    cantidad: number;
    costo_unitario: number | null;
    componente: {
        id: number;
        codigo: string;
        referencia: string;
        nombre: string;
        unidad: string;
    };
    bodega: {
        id: number;
        codigo: string;
        zona: string;
    } | null;
    lote: {
        id: number;
        codigo: string;
        vencimiento: string | null;
    } | null;
    documento_soporte: string;
    justificacion: string | null;
    observaciones: string | null;
    realizado_por: string;
}

export interface ListaKardexGlobalResponse {
    data: KardexGlobalMovimiento[];
    meta: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
}

export interface LoteItem {
    id_lote: number;
    codigo_lote: string;
    numero_lote_fabricante: string;
    componente: {
        id: number;
        codigo: string;
        referencia: string;
        nombre: string;
        unidad: string;
        costo: number;
    };
    bodega: {
        id: number;
        codigo: string;
        zona: string;
    };
    cantidad_inicial: number;
    cantidad_actual: number;
    estado_lote: string;
    fecha_ingreso: string;
    fecha_fabricacion: string | null;
    fecha_vencimiento: string | null;
    dias_para_vencer: number | null;
    semaforo: 'OK' | 'PROXIMO' | 'CRITICO' | 'VENCIDO' | 'NO_APLICA';
    proveedor: string;
    observaciones: string | null;
}

export interface ListaLotesResponse {
    data: LoteItem[];
    meta: {
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    };
}

export interface BodegaItem {
    id_ubicacion: number;
    codigo_ubicacion: string;
    zona: string;
    pasillo: string | null;
    estante: string | null;
    nivel: string | null;
    activo: boolean;
    total_skus: number;
    total_unidades: number;
    valor_total: number;
}

export interface CrearBodegaDto {
    codigo_ubicacion: string;
    zona: string;
    pasillo?: string;
    estante?: string;
    nivel?: string;
    activo?: boolean;
}

export interface AjusteInventarioDto {
    id_componente: number;
    cantidad_nueva: number;
    id_ubicacion?: number;
    motivo: string;
    justificacion: string;
    realizado_por?: number;
    aprobado_por?: number;
}

export interface TrasladoInventarioDto {
    id_componente: number;
    cantidad: number;
    id_ubicacion_origen: number;
    id_ubicacion_destino: number;
    id_lote?: number;
    justificacion?: string;
    observaciones?: string;
    realizado_por?: number;
}

export interface MotivoAjusteItem {
    id_motivo_ajuste: number;
    codigo_motivo: string;
    nombre_motivo: string;
    tipo_afectacion: string;
    activo: boolean;
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
    id_proveedor?: number;
    numero_factura?: string;
    numero_lote_fabricante?: string;
    fecha_vencimiento?: string;
    motivo?: string;
    observaciones?: string;
    realizado_por: number;
}

export interface SalidaInventarioDto {
    id_componente: number;
    cantidad: number;
    id_ubicacion?: number;
    id_lote?: number;
    id_orden_servicio?: number;
    id_remision?: number;
    motivo?: string;
    justificacion?: string;
    observaciones?: string;
    realizado_por: number;
}

export interface MovimientoResult {
    success: boolean;
    mensaje?: string;
    movimiento?: {
        id_movimiento: number;
        tipo: string;
        origen: string;
        cantidad: number;
        fecha: string;
    };
    componente?: {
        id_componente: number;
        codigo: string | null;
        nombre: string | null;
        stock_anterior: number;
        stock_actual: number;
        diferencia: number;
    };
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
    categoria?: {
        id: number;
        nombre: string;
        codigo: string;
        padre?: string | null;
        completo?: string | null;
    };
    tipo_comercial?: string | null;
    especificaciones_tecnicas?: any;
    unidad_medida: string | null;
    observaciones: string | null;
    notas_instalacion?: string | null;
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
        margen_utilidad?: number | null;
        moneda: string | null;
    };
    proveedor: {
        id: number;
        nombre: string;
        nit: string;
        contacto?: string | null;
        telefono: string | null;
        email: string | null;
    } | null;
    proveedores_homologados?: Array<{
        id_proveedor: number;
        nombre_proveedor: string;
        nit: string;
        referencia_proveedor: string;
        marca_ofrecida: string;
        costo_actual: number;
        moneda: string;
        tiempo_entrega_dias: number;
        cantidad_minima_compra: number;
        es_proveedor_preferido: boolean;
        telefono: string;
        email: string;
    }>;
    lotes_activos?: Array<{
        id_lote: number;
        codigo_lote: string;
        numero_lote_fabricante?: string | null;
        cantidad_inicial: number;
        cantidad_actual: number;
        fecha_vencimiento?: string | null;
        estado_lote: string;
        fecha_ingreso: string;
        bodega?: string;
        zona?: string;
    }>;
    ultimos_movimientos?: Array<{
        id_movimiento: number;
        fecha: string;
        tipo: string;
        origen: string;
        cantidad: number;
        costo_unitario: number | null;
        bodega: string;
        lote: string;
        justificacion: string;
        realizado_por: string;
    }>;
    metricas?: {
        total_movimientos: number;
        alertas_activas?: number;
    };
    auditoria?: {
        fecha_creacion: string | null;
        creado_por: string | null;
        fecha_modificacion: string | null;
        modificado_por: string | null;
    };
    reemplazado_por?: {
        id: number;
        codigo: string;
        nombre: string;
    } | null;
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
    reemplazado_por?: number;
    componentes_compatibles?: number[];
    modificado_por?: number;
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
    id_categoria?: number;
    id_ubicacion?: number;
    estado_stock?: string;
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

export async function getKardexGlobal(params?: {
    tipo?: string;
    origen?: string;
    id_componente?: number;
    id_ubicacion?: number;
    busqueda?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    page?: number;
    limit?: number;
}): Promise<ListaKardexGlobalResponse> {
    const { data } = await apiClient.get('/inventario/kardex-global', { params });
    return data;
}

export async function getLotes(params?: {
    id_componente?: number;
    estado?: string;
    busqueda?: string;
    page?: number;
    limit?: number;
}): Promise<ListaLotesResponse> {
    const { data } = await apiClient.get('/inventario/lotes', { params });
    return data;
}

export async function getBodegas(): Promise<BodegaItem[]> {
    const { data } = await apiClient.get('/inventario/bodegas');
    return data;
}

export async function crearBodega(dto: CrearBodegaDto): Promise<{ success: boolean; mensaje: string; bodega: BodegaItem }> {
    const { data } = await apiClient.post('/inventario/bodegas', dto);
    return data;
}

export async function registrarAjuste(dto: AjusteInventarioDto): Promise<any> {
    const { data } = await apiClient.post('/inventario/ajuste', dto);
    return data;
}

export async function registrarTraslado(dto: TrasladoInventarioDto): Promise<any> {
    const { data } = await apiClient.post('/inventario/traslado', dto);
    return data;
}

export async function getMotivosAjuste(): Promise<MotivoAjusteItem[]> {
    const { data } = await apiClient.get('/inventario/motivos-ajuste');
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

export async function getDetalleComponente(id: number): Promise<DetalleComponente> {
    const numId = Number(id);
    if (!numId || isNaN(numId) || numId <= 0) {
        throw new Error('ID de componente numérico inválido');
    }
    const { data } = await apiClient.get(`/inventario/componente/${numId}`);
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

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────

export function useDashboardKPIs() {
    return useQuery({
        queryKey: ['inventario', 'dashboard'],
        queryFn: getDashboardKPIs,
        staleTime: 30 * 1000,
        refetchInterval: 60 * 1000,
    });
}

export function useComponentesStock(params?: {
    busqueda?: string;
    id_tipo?: number;
    id_categoria?: number;
    id_ubicacion?: number;
    estado_stock?: string;
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

export function useKardexGlobal(params?: {
    tipo?: string;
    origen?: string;
    id_componente?: number;
    id_ubicacion?: number;
    busqueda?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    page?: number;
    limit?: number;
}) {
    return useQuery({
        queryKey: ['inventario', 'kardex-global', params],
        queryFn: () => getKardexGlobal(params),
        staleTime: 10 * 1000,
    });
}

export function useLotes(params?: {
    id_componente?: number;
    estado?: string;
    busqueda?: string;
    page?: number;
    limit?: number;
}) {
    return useQuery({
        queryKey: ['inventario', 'lotes', params],
        queryFn: () => getLotes(params),
        staleTime: 10 * 1000,
    });
}

export function useBodegas() {
    return useQuery({
        queryKey: ['inventario', 'bodegas'],
        queryFn: getBodegas,
        staleTime: 30 * 1000,
    });
}

export function useCrearBodega() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: crearBodega,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventario', 'bodegas'] });
            queryClient.invalidateQueries({ queryKey: ['inventario', 'dashboard'] });
        },
    });
}

export function useRegistrarAjuste() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: registrarAjuste,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventario'] });
        },
    });
}

export function useRegistrarTraslado() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: registrarTraslado,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inventario'] });
        },
    });
}

export function useMotivosAjuste() {
    return useQuery({
        queryKey: ['inventario', 'motivos-ajuste'],
        queryFn: getMotivosAjuste,
        staleTime: 10 * 60 * 1000,
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

export function useDetalleComponente(id: number | null) {
    const validId = id && !isNaN(Number(id)) && Number(id) > 0 ? Number(id) : null;
    return useQuery({
        queryKey: ['inventario', 'componente', validId],
        queryFn: () => getDetalleComponente(validId!),
        enabled: validId !== null,
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
        staleTime: 5 * 60 * 1000,
    });
}

export function useProveedoresSelect() {
    return useQuery({
        queryKey: ['inventario', 'proveedores-select'],
        queryFn: getProveedoresSelect,
        staleTime: 5 * 60 * 1000,
    });
}
