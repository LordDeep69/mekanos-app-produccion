/**
 * MEKANOS S.A.S - Portal Admin
 * Centro de Control de Inventario y Almacenes (WMS) - FASE 6 ENTERPRISE
 * 
 * Ruta: /inventario
 * 
 * Funcionalidades:
 * - KPIs Financieros y Logísticos en Tiempo Real
 * - Pestaña 1: Existencias & Stock Crítico
 * - Pestaña 2: Kardex Global Multi-Operación (Entradas, Salidas, Ajustes, Traslados)
 * - Pestaña 3: Trazabilidad de Lotes y Control de Vencimientos
 * - Pestaña 4: Bodegas, Almacenes y Valorización por Ubicación
 * - Operaciones Transaccionales: Entrada, Salida, Ajuste Físico y Traslado
 */

'use client';

import {
    useBodegas,
    useComponentesStock,
    useDashboardKPIs,
    useKardexGlobal,
    useLotes,
} from '@/features/inventario/api/inventario-motor.service';
import { BodegaModal } from '@/features/inventario/components/BodegaModal';
import { MovimientoModal, TipoOperacionInventario } from '@/features/inventario/components/MovimientoModal';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    AlertTriangle,
    ArrowDownCircle,
    ArrowLeftRight,
    ArrowUpCircle,
    Calendar,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    ExternalLink,
    Eye,
    History,
    Layers,
    Loader2,
    Package,
    Plus,
    RefreshCw,
    Search,
    ShieldAlert,
    ShoppingCart,
    SlidersHorizontal,
    TrendingUp,
    Warehouse,
    Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function KPICard({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    loading,
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    color: 'emerald' | 'blue' | 'rose' | 'amber' | 'purple';
    loading?: boolean;
}) {
    const colorClasses = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        blue: 'bg-blue-50 text-blue-600 border-blue-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
        amber: 'bg-amber-50 text-amber-600 border-amber-100',
        purple: 'bg-purple-50 text-purple-600 border-purple-100',
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="flex items-center gap-3">
                <div className={cn('w-11 h-11 rounded-lg border flex items-center justify-center shrink-0', colorClasses[color])}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">{title}</p>
                    {loading ? (
                        <div className="h-7 w-20 bg-slate-100 animate-pulse rounded mt-1" />
                    ) : (
                        <p className="text-xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
                    )}
                    {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{subtitle}</p>}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function InventarioPage() {
    // Pestaña activa
    const [tabActiva, setTabActiva] = useState<'stock' | 'kardex' | 'lotes' | 'bodegas'>('stock');

    // Modales de Operaciones
    const [modalOperacion, setModalOperacion] = useState<{
        open: boolean;
        tipo: TipoOperacionInventario;
        componente?: any;
    }>({ open: false, tipo: 'ENTRADA' });
    const [modalBodega, setModalBodega] = useState(false);

    // Filtros de Pestaña Stock
    const [stockPage, setStockPage] = useState(1);
    const [stockBusqueda, setStockBusqueda] = useState('');
    const [estadoStockFiltro, setEstadoStockFiltro] = useState<'TODOS' | 'EN_STOCK' | 'BAJO' | 'AGOTADO'>('TODOS');
    const [bodegaFiltro, setBodegaFiltro] = useState<string>('TODAS');
    const stockPageSize = 15;

    // Filtros de Pestaña Kardex
    const [kardexPage, setKardexPage] = useState(1);
    const [kardexBusqueda, setKardexBusqueda] = useState('');
    const [kardexTipo, setKardexTipo] = useState<string>('');
    const kardexPageSize = 15;

    // Filtros de Pestaña Lotes
    const [lotesPage, setLotesPage] = useState(1);
    const [lotesBusqueda, setLotesBusqueda] = useState('');
    const [lotesEstado, setLotesEstado] = useState<string>('');
    const lotesPageSize = 15;

    // Queries
    const { data: dashboardData, isLoading: loadingKPIs, refetch: refetchKPIs } = useDashboardKPIs();

    const {
        data: componentesData,
        isLoading: loadingStock,
        isError: errorStock,
        refetch: refetchStock,
    } = useComponentesStock({
        busqueda: stockBusqueda || undefined,
        id_ubicacion: bodegaFiltro !== 'TODAS' ? parseInt(bodegaFiltro, 10) : undefined,
        estado_stock: estadoStockFiltro !== 'TODOS' ? estadoStockFiltro : undefined,
        solo_criticos: estadoStockFiltro === 'BAJO' ? true : undefined,
        skip: (stockPage - 1) * stockPageSize,
        limit: stockPageSize,
    });

    const {
        data: kardexData,
        isLoading: loadingKardex,
        isError: errorKardex,
        refetch: refetchKardex,
    } = useKardexGlobal({
        tipo: kardexTipo || undefined,
        busqueda: kardexBusqueda || undefined,
        page: kardexPage,
        limit: kardexPageSize,
    });

    const {
        data: lotesData,
        isLoading: loadingLotes,
        isError: errorLotes,
        refetch: refetchLotes,
    } = useLotes({
        estado: lotesEstado || undefined,
        busqueda: lotesBusqueda || undefined,
        page: lotesPage,
        limit: lotesPageSize,
    });

    const { data: bodegas = [], isLoading: loadingBodegas, refetch: refetchBodegas } = useBodegas();

    const kpis = dashboardData?.kpis;

    const abrirOperacion = (tipo: TipoOperacionInventario, componente?: any) => {
        setModalOperacion({ open: true, tipo, componente });
    };

    const handleRefreshAll = () => {
        refetchKPIs();
        refetchStock();
        refetchKardex();
        refetchLotes();
        refetchBodegas();
    };

    return (
        <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-12">
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* HEADER CON BOTONES DE ACCIÓN */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-100">
                            <Package className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                                Gestión de Inventario & Almacenes
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Control físico de existencias, auditoría kardex, trazabilidad de lotes y traslados
                            </p>
                        </div>
                    </div>
                </div>

                {/* Acciones Rápidas */}
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => abrirOperacion('ENTRADA')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                        title="Registrar entrada de mercancía al inventario con lote"
                    >
                        <ArrowDownCircle className="h-4 w-4" />
                        Nueva Entrada
                    </button>

                    <button
                        onClick={() => abrirOperacion('SALIDA')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
                        title="Despachar repuestos para órdenes de servicio o venta"
                    >
                        <ArrowUpCircle className="h-4 w-4 text-amber-600" />
                        Salida
                    </button>

                    <button
                        onClick={() => abrirOperacion('AJUSTE')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
                        title="Ajuste por conteo físico cíclico o merma"
                    >
                        <SlidersHorizontal className="h-4 w-4 text-violet-600" />
                        Ajuste Físico
                    </button>

                    <button
                        onClick={() => abrirOperacion('TRASLADO')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
                        title="Transferir existencias entre bodegas o ubicaciones"
                    >
                        <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                        Traslado
                    </button>

                    <button
                        onClick={() => setModalBodega(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
                        title="Registrar una nueva bodega o estantería"
                    >
                        <Warehouse className="h-4 w-4 text-slate-500" />
                        Nueva Bodega
                    </button>

                    <Link
                        href="/compras/catalogo"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
                        title="Ir al Catálogo Maestro de Artículos y Repuestos"
                    >
                        <ExternalLink className="h-4 w-4 text-slate-500" />
                        Catálogo Maestro
                    </Link>

                    <button
                        onClick={handleRefreshAll}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        title="Refrescar todos los datos"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* KPIS EJECUTIVOS */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                <KPICard
                    title="Valor Inventario"
                    value={kpis ? `$${Number(kpis.valor_inventario).toLocaleString('es-CO')}` : '--'}
                    subtitle="Valorización de catálogo activo"
                    icon={TrendingUp}
                    color="emerald"
                    loading={loadingKPIs}
                />
                <KPICard
                    title="Total Artículos"
                    value={kpis?.total_items ?? '--'}
                    subtitle={`${kpis?.items_con_stock ?? 0} con existencias`}
                    icon={Package}
                    color="blue"
                    loading={loadingKPIs}
                />
                <KPICard
                    title="Stock Crítico"
                    value={kpis?.items_criticos ?? '--'}
                    subtitle="Bajo o igual a punto mínimo"
                    icon={ShieldAlert}
                    color="rose"
                    loading={loadingKPIs}
                />
                <KPICard
                    title="Lotes Activos"
                    value={kpis?.total_lotes_activos ?? '--'}
                    subtitle="Con stock remanente"
                    icon={Layers}
                    color="purple"
                    loading={loadingKPIs}
                />
                <KPICard
                    title="Movimientos Hoy"
                    value={kpis?.movimientos_hoy ?? '--'}
                    subtitle={`${kpis?.total_movimientos ?? 0} totales en kardex`}
                    icon={History}
                    color="amber"
                    loading={loadingKPIs}
                />
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* SELECTOR DE PESTAÑAS WMS */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <div className="border-b border-slate-200">
                <nav className="flex space-x-6 text-sm font-semibold">
                    <button
                        onClick={() => setTabActiva('stock')}
                        className={cn(
                            'pb-3 border-b-2 flex items-center gap-2 transition-colors',
                            tabActiva === 'stock'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        )}
                    >
                        <Package className="h-4 w-4" />
                        Existencias & Stock ({componentesData?.meta?.total ?? 0})
                    </button>

                    <button
                        onClick={() => setTabActiva('kardex')}
                        className={cn(
                            'pb-3 border-b-2 flex items-center gap-2 transition-colors',
                            tabActiva === 'kardex'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        )}
                    >
                        <History className="h-4 w-4" />
                        Kardex General ({kardexData?.meta?.total ?? 0})
                    </button>

                    <button
                        onClick={() => setTabActiva('lotes')}
                        className={cn(
                            'pb-3 border-b-2 flex items-center gap-2 transition-colors',
                            tabActiva === 'lotes'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        )}
                    >
                        <Layers className="h-4 w-4" />
                        Lotes & Vencimiento ({lotesData?.meta?.total ?? 0})
                    </button>

                    <button
                        onClick={() => setTabActiva('bodegas')}
                        className={cn(
                            'pb-3 border-b-2 flex items-center gap-2 transition-colors',
                            tabActiva === 'bodegas'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        )}
                    >
                        <Warehouse className="h-4 w-4" />
                        Bodegas & Almacenes ({bodegas.length})
                    </button>
                </nav>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 1: EXISTENCIAS & STOCK */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {tabActiva === 'stock' && (
                <div className="space-y-4">
                    {/* Filtros Stock */}
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por código, referencia, descripción o marca..."
                                value={stockBusqueda}
                                onChange={(e) => {
                                    setStockBusqueda(e.target.value);
                                    setStockPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Filtro por Bodega */}
                        <div className="relative min-w-[210px]">
                            <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            <select
                                value={bodegaFiltro}
                                onChange={(e) => {
                                    setBodegaFiltro(e.target.value);
                                    setStockPage(1);
                                }}
                                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                            >
                                <option value="TODAS">🏢 Todas las Bodegas</option>
                                {bodegas.map((b) => (
                                    <option key={b.id_ubicacion} value={b.id_ubicacion}>
                                        {b.codigo_ubicacion} - {b.zona || 'Bodega'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
                            <button
                                onClick={() => {
                                    setEstadoStockFiltro('TODOS');
                                    setStockPage(1);
                                }}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                                    estadoStockFiltro === 'TODOS'
                                        ? 'bg-white text-slate-900 shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                Todos
                            </button>
                            <button
                                onClick={() => {
                                    setEstadoStockFiltro('EN_STOCK');
                                    setStockPage(1);
                                }}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1',
                                    estadoStockFiltro === 'EN_STOCK'
                                        ? 'bg-emerald-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                En Stock
                            </button>
                            <button
                                onClick={() => {
                                    setEstadoStockFiltro('BAJO');
                                    setStockPage(1);
                                }}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1',
                                    estadoStockFiltro === 'BAJO'
                                        ? 'bg-amber-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Stock Bajo
                            </button>
                            <button
                                onClick={() => {
                                    setEstadoStockFiltro('AGOTADO');
                                    setStockPage(1);
                                }}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1',
                                    estadoStockFiltro === 'AGOTADO'
                                        ? 'bg-rose-600 text-white shadow-2xs'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                <AlertCircle className="h-3.5 w-3.5" />
                                Agotado
                            </button>
                        </div>
                    </div>

                    {/* Tabla Stock */}
                    {loadingStock ? (
                        <div className="flex justify-center items-center py-16 bg-white rounded-xl border border-slate-200">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : errorStock ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-rose-600">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                            <p className="font-semibold">Error al cargar existencias de inventario</p>
                        </div>
                    ) : (componentesData?.data || []).length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                            <Package className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No se encontraron artículos</p>
                            <p className="text-xs text-slate-500">Prueba ajustando los términos de búsqueda</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wide border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-2.5 whitespace-nowrap">Código</th>
                                            <th className="py-2.5 px-2.5 whitespace-nowrap">Referencia / Marca</th>
                                            <th className="py-2.5 px-2.5">Descripción</th>
                                            <th className="py-2.5 px-2.5 whitespace-nowrap">Tipo / Categoría</th>
                                            <th className="py-2.5 px-2 text-center whitespace-nowrap">Stock Actual</th>
                                            <th className="py-2.5 px-1.5 text-center whitespace-nowrap">Mínimo</th>
                                            <th className="py-2.5 px-2 text-center whitespace-nowrap">Estado</th>
                                            <th className="py-2.5 px-2.5 text-right whitespace-nowrap">Valorización</th>
                                            <th className="py-2.5 px-2 text-center whitespace-nowrap">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(componentesData?.data || []).map((comp) => (
                                            <tr key={comp.id_componente} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="py-2 px-2.5 whitespace-nowrap align-middle">
                                                    <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-[11px] font-semibold border border-slate-200/60">
                                                        {comp.codigo || '--'}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2.5 align-middle whitespace-nowrap">
                                                    <p className="font-semibold text-slate-900 text-xs leading-tight">{comp.referencia}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium tracking-tight uppercase">{comp.marca || 'Sin marca'}</p>
                                                </td>
                                                <td className="py-2 px-2.5 align-middle min-w-[150px] max-w-[240px]">
                                                    <p className="font-medium text-slate-800 text-xs line-clamp-2 leading-snug break-words" title={comp.nombre || ''}>
                                                        {comp.nombre || '--'}
                                                    </p>
                                                </td>
                                                <td className="py-2 px-2.5 text-slate-600 align-middle whitespace-nowrap">
                                                    <span
                                                        className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium border border-slate-200/60 max-w-[130px] truncate align-middle leading-tight"
                                                        title={(comp as any).categoria_completa || comp.categoria || comp.tipo || ''}
                                                    >
                                                        {comp.categoria || comp.tipo || 'General'}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                                                    <span className={cn(
                                                        'inline-flex items-center justify-center gap-1 whitespace-nowrap px-2 py-0.5 rounded font-bold text-[11px] font-mono',
                                                        comp.estado_stock === 'AGOTADO' && 'text-rose-700 bg-rose-50 border border-rose-200/60',
                                                        comp.estado_stock === 'CRITICO' && 'text-amber-700 bg-amber-50 border border-amber-200/60',
                                                        comp.estado_stock === 'BAJO' && 'text-yellow-700 bg-yellow-50 border border-yellow-200/60',
                                                        comp.estado_stock === 'OK' && 'text-emerald-700 bg-emerald-50 border border-emerald-200/60'
                                                    )}>
                                                        {comp.stock_actual} <span className="text-[10px] font-medium opacity-80">{comp.unidad || 'UND'}</span>
                                                    </span>
                                                    {comp.bodegas && comp.bodegas.length > 0 && (
                                                        <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                                                            {comp.bodegas.map((b, idx) => (
                                                                <span
                                                                    key={b.id_ubicacion || idx}
                                                                    className="inline-flex items-center px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px] font-mono border border-slate-200/80"
                                                                    title={`${b.nombre}: ${b.stock} ${comp.unidad || 'UND'}`}
                                                                >
                                                                    {b.codigo}: {b.stock}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2 px-1.5 text-center font-mono text-xs font-semibold text-slate-600 align-middle whitespace-nowrap">
                                                    {comp.stock_minimo}
                                                </td>
                                                <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                                                    <span className={cn(
                                                        'inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight',
                                                        comp.estado_stock === 'AGOTADO' && 'bg-rose-100 text-rose-800',
                                                        comp.estado_stock === 'CRITICO' && 'bg-amber-100 text-amber-800',
                                                        comp.estado_stock === 'BAJO' && 'bg-yellow-100 text-yellow-800',
                                                        comp.estado_stock === 'OK' && 'bg-emerald-100 text-emerald-800'
                                                    )}>
                                                        {comp.estado_stock}
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2.5 text-right font-mono text-xs font-semibold text-slate-900 whitespace-nowrap align-middle">
                                                    ${Number(comp.valor_stock || 0).toLocaleString('es-CO')}
                                                </td>
                                                <td className="py-2 px-2 text-center align-middle whitespace-nowrap">
                                                    <div className="inline-flex items-center gap-1 justify-center">
                                                        <Link
                                                            href={`/inventario/${comp.id_componente}`}
                                                            className="inline-flex items-center gap-1 px-1.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[11px] font-medium border border-blue-200/60 transition-colors"
                                                            title="Ver Ficha Logística y Kardex"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            <span>Logística</span>
                                                        </Link>
                                                        <button
                                                            onClick={() => abrirOperacion('SALIDA', comp)}
                                                            className="inline-flex items-center gap-1 px-1.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded text-[11px] font-medium border border-slate-200/70 transition-colors"
                                                            title="Operar movimiento físico para este ítem"
                                                        >
                                                            <SlidersHorizontal className="h-3 w-3" />
                                                            <span>Operar</span>
                                                        </button>
                                                        <Link
                                                            href={`/compras/ordenes/nueva?componenteId=${comp.id_componente}`}
                                                            className="inline-flex items-center gap-1 px-1.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-[11px] font-medium border border-emerald-200/60 transition-colors"
                                                            title="Crear Orden de Compra para reabastecer"
                                                        >
                                                            <ShoppingCart className="h-3 w-3" />
                                                            <span>Pedir</span>
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación Stock */}
                            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                                <p>
                                    Mostrando {(stockPage - 1) * stockPageSize + 1} a{' '}
                                    {Math.min(stockPage * stockPageSize, componentesData?.meta?.total || 0)} de{' '}
                                    {componentesData?.meta?.total || 0} artículos
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setStockPage(stockPage - 1)}
                                        disabled={stockPage === 1}
                                        className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setStockPage(stockPage + 1)}
                                        disabled={stockPage * stockPageSize >= (componentesData?.meta?.total || 0)}
                                        className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 2: KARDEX GENERAL */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {tabActiva === 'kardex' && (
                <div className="space-y-4">
                    {/* Filtros Kardex */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Filtrar por componente, documento soporte o motivo..."
                                value={kardexBusqueda}
                                onChange={(e) => {
                                    setKardexBusqueda(e.target.value);
                                    setKardexPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <select
                            value={kardexTipo}
                            onChange={(e) => {
                                setKardexTipo(e.target.value);
                                setKardexPage(1);
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-700"
                        >
                            <option value="">Todos los Tipos de Operación</option>
                            <option value="ENTRADA">Entradas</option>
                            <option value="SALIDA">Salidas</option>
                            <option value="AJUSTE">Ajustes</option>
                            <option value="TRANSFERENCIA">Traslados</option>
                        </select>
                    </div>

                    {/* Tabla Kardex */}
                    {loadingKardex ? (
                        <div className="flex justify-center items-center py-16 bg-white rounded-xl border border-slate-200">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : errorKardex ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-rose-600">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                            <p className="font-semibold">Error al cargar registros del Kardex</p>
                        </div>
                    ) : (kardexData?.data || []).length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                            <History className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No hay movimientos registrados</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wide border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-2.5 whitespace-nowrap">Fecha & Hora</th>
                                            <th className="py-2.5 px-2 text-center whitespace-nowrap">Tipo Operación</th>
                                            <th className="py-2.5 px-2.5">Artículo / Componente</th>
                                            <th className="py-2.5 px-2 text-center whitespace-nowrap">Cantidad</th>
                                            <th className="py-2.5 px-2.5 whitespace-nowrap">Bodega / Ubicación</th>
                                            <th className="py-2.5 px-2 whitespace-nowrap">Lote Asoc.</th>
                                            <th className="py-2.5 px-2.5">Documento Soporte / Justificación</th>
                                            <th className="py-2.5 px-2 whitespace-nowrap">Responsable</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(kardexData?.data || []).map((mov) => {
                                            const isEntrada = mov.tipo === 'ENTRADA';
                                            const isSalida = mov.tipo === 'SALIDA';
                                            const isAjuste = mov.tipo === 'AJUSTE';
                                            const isTraslado = mov.tipo === 'TRANSFERENCIA';

                                            return (
                                                <tr key={mov.id_movimiento} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 whitespace-nowrap align-middle">
                                                        {new Date(mov.fecha).toLocaleString('es-CO', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </td>
                                                    <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                                                        <span className={cn(
                                                            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase',
                                                            isEntrada && 'bg-emerald-100 text-emerald-800',
                                                            isSalida && 'bg-amber-100 text-amber-800',
                                                            isAjuste && 'bg-purple-100 text-purple-800',
                                                            isTraslado && 'bg-blue-100 text-blue-800'
                                                        )}>
                                                            {isEntrada && <ArrowDownCircle className="h-3 w-3" />}
                                                            {isSalida && <ArrowUpCircle className="h-3 w-3" />}
                                                            {isAjuste && <SlidersHorizontal className="h-3 w-3" />}
                                                            {isTraslado && <ArrowLeftRight className="h-3 w-3" />}
                                                            {mov.tipo}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-2.5 align-middle">
                                                        <p className="font-semibold text-slate-900 text-xs">{mov.componente?.nombre || mov.componente?.referencia}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">REF: {mov.componente?.referencia} | CÓD: {mov.componente?.codigo || '--'}</p>
                                                    </td>
                                                    <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                                                        <span className={cn(
                                                            'font-bold text-xs font-mono',
                                                            isEntrada && 'text-emerald-700',
                                                            isSalida && 'text-amber-700',
                                                            isAjuste && 'text-purple-700',
                                                            isTraslado && 'text-blue-700'
                                                        )}>
                                                            {isEntrada ? `+${mov.cantidad}` : isSalida ? `-${mov.cantidad}` : mov.cantidad}{' '}
                                                            <span className="text-[10px] font-normal text-slate-500">{mov.componente?.unidad || 'UND'}</span>
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-2.5 text-slate-700 whitespace-nowrap align-middle">
                                                        {mov.bodega ? (
                                                            <span className="inline-flex items-center gap-1 font-medium text-xs">
                                                                <Warehouse className="h-3 w-3 text-slate-400" />
                                                                {mov.bodega.codigo} ({mov.bodega.zona})
                                                            </span>
                                                        ) : (
                                                            '--'
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2 font-mono text-[11px] text-slate-600 whitespace-nowrap align-middle">
                                                        {mov.lote?.codigo || '--'}
                                                    </td>
                                                    <td className="py-2 px-2.5 max-w-xs align-middle">
                                                        <p className="font-semibold text-slate-800 text-xs">{mov.documento_soporte || '--'}</p>
                                                        <p className="text-[10px] text-slate-500 truncate" title={mov.justificacion || mov.observaciones || ''}>
                                                            {mov.justificacion || mov.observaciones || '--'}
                                                        </p>
                                                    </td>
                                                    <td className="py-2 px-2 text-slate-600 text-xs whitespace-nowrap align-middle">
                                                        {mov.realizado_por}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Paginación Kardex */}
                            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                                <p>
                                    Mostrando {(kardexPage - 1) * kardexPageSize + 1} a{' '}
                                    {Math.min(kardexPage * kardexPageSize, kardexData?.meta?.total || 0)} de{' '}
                                    {kardexData?.meta?.total || 0} movimientos
                                </p>
                                <div className="flex gap-1.5">
                                    <button
                                        onClick={() => setKardexPage(kardexPage - 1)}
                                        disabled={kardexPage === 1}
                                        className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => setKardexPage(kardexPage + 1)}
                                        disabled={kardexPage * kardexPageSize >= (kardexData?.meta?.total || 0)}
                                        className="px-2.5 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 3: LOTES & VENCIMIENTO */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {tabActiva === 'lotes' && (
                <div className="space-y-4">
                    {/* Filtros Lotes */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por código de lote, fabricante o componente..."
                                value={lotesBusqueda}
                                onChange={(e) => {
                                    setLotesBusqueda(e.target.value);
                                    setLotesPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <select
                            value={lotesEstado}
                            onChange={(e) => {
                                setLotesEstado(e.target.value);
                                setLotesPage(1);
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-700"
                        >
                            <option value="">Todos los Estados</option>
                            <option value="DISPONIBLE">Disponibles</option>
                            <option value="AGOTADO">Agotados</option>
                            <option value="VENCIDO">Vencidos</option>
                        </select>
                    </div>

                    {/* Tabla Lotes */}
                    {loadingLotes ? (
                        <div className="flex justify-center items-center py-16 bg-white rounded-xl border border-slate-200">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : errorLotes ? (
                        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-rose-600">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                            <p className="font-semibold">Error al cargar lotes</p>
                        </div>
                    ) : (lotesData?.data || []).length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                            <Layers className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No hay lotes registrados</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[11px] tracking-wide border-b border-slate-200">
                                        <tr>
                                            <th className="py-2.5 px-2.5 whitespace-nowrap">Código Lote</th>
                                            <th className="py-2.5 px-2 whitespace-nowrap">Lote Fabricante</th>
                                            <th className="py-2.5 px-2.5">Artículo Asociado</th>
                                            <th className="py-2.5 px-2.5 whitespace-nowrap">Ubicación</th>
                                            <th className="py-2.5 px-2 text-center whitespace-nowrap">Inicial / Actual</th>
                                            <th className="py-2.5 px-2 text-center whitespace-nowrap">Vencimiento</th>
                                            <th className="py-2.5 px-2 text-center whitespace-nowrap">Semáforo</th>
                                            <th className="py-2.5 px-2 whitespace-nowrap">Proveedor</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(lotesData?.data || []).map((lote) => {
                                            const semaforoClasses = {
                                                OK: 'bg-emerald-100 text-emerald-800',
                                                PROXIMO: 'bg-amber-100 text-amber-800',
                                                CRITICO: 'bg-rose-100 text-rose-800',
                                                VENCIDO: 'bg-red-200 text-red-900',
                                                NO_APLICA: 'bg-slate-100 text-slate-600',
                                            }[lote.semaforo];

                                            return (
                                                <tr key={lote.id_lote} className="hover:bg-slate-50/80 transition-colors">
                                                    <td className="py-2 px-2.5 font-mono font-bold text-xs text-blue-700 whitespace-nowrap align-middle">
                                                        {lote.codigo_lote}
                                                    </td>
                                                    <td className="py-2 px-2 font-mono text-[11px] text-slate-600 whitespace-nowrap align-middle">
                                                        {lote.numero_lote_fabricante || '--'}
                                                    </td>
                                                    <td className="py-2 px-2.5 align-middle">
                                                        <p className="font-semibold text-slate-900 text-xs">{lote.componente.nombre || lote.componente.referencia}</p>
                                                        <p className="text-[10px] text-slate-500 font-mono">REF: {lote.componente.referencia}</p>
                                                    </td>
                                                    <td className="py-2 px-2.5 align-middle whitespace-nowrap">
                                                        <span className="font-medium text-slate-700 text-xs">{lote.bodega.codigo}</span>
                                                        <span className="text-slate-500 text-[10px] block">{lote.bodega.zona}</span>
                                                    </td>
                                                    <td className="py-2 px-2 text-center whitespace-nowrap align-middle font-mono text-xs">
                                                        <span className="font-bold text-slate-900">{lote.cantidad_actual}</span>
                                                        <span className="text-slate-400 text-[11px]"> / {lote.cantidad_inicial} {lote.componente.unidad}</span>
                                                    </td>
                                                    <td className="py-2 px-2 text-center font-mono whitespace-nowrap align-middle text-xs">
                                                        {lote.fecha_vencimiento ? (
                                                            <span>{new Date(lote.fecha_vencimiento).toLocaleDateString('es-CO')}</span>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">No perecedero</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 px-2 text-center whitespace-nowrap align-middle">
                                                        <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', semaforoClasses)}>
                                                            {lote.semaforo === 'OK' && 'En Vigencia'}
                                                            {lote.semaforo === 'PROXIMO' && `${lote.dias_para_vencer} días`}
                                                            {lote.semaforo === 'CRITICO' && `¡${lote.dias_para_vencer} días!`}
                                                            {lote.semaforo === 'VENCIDO' && 'Vencido'}
                                                            {lote.semaforo === 'NO_APLICA' && 'Sin Fecha'}
                                                        </span>
                                                    </td>
                                                    <td className="py-2 px-2 text-slate-600 text-xs truncate max-w-[150px] align-middle" title={lote.proveedor || ''}>
                                                        {lote.proveedor}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 4: BODEGAS & ALMACENES */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            {tabActiva === 'bodegas' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-500">
                            Zonas, estantes y bodegas logísticas habilitadas para almacenamiento
                        </p>
                        <button
                            onClick={() => setModalBodega(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Agregar Almacén
                        </button>
                    </div>

                    {loadingBodegas ? (
                        <div className="flex justify-center items-center py-16 bg-white rounded-xl border border-slate-200">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : bodegas.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                            <Warehouse className="h-10 w-10 mx-auto text-slate-400 mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No hay bodegas configuradas</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {bodegas.map((bodega) => (
                                <div
                                    key={bodega.id_ubicacion}
                                    className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all space-y-3"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                                                <Warehouse className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900">{bodega.zona}</h3>
                                                <p className="text-xs font-mono font-semibold text-blue-600">{bodega.codigo_ubicacion}</p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            'px-2 py-0.5 rounded-full text-[11px] font-semibold',
                                            bodega.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                                        )}>
                                            {bodega.activo ? 'Operativa' : 'Inactiva'}
                                        </span>
                                    </div>

                                    {(bodega.pasillo || bodega.estante || bodega.nivel) && (
                                        <div className="flex gap-2 text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded">
                                            {bodega.pasillo && <span>P: {bodega.pasillo}</span>}
                                            {bodega.estante && <span>E: {bodega.estante}</span>}
                                            {bodega.nivel && <span>N: {bodega.nivel}</span>}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                                        <div>
                                            <p className="text-[11px] text-slate-500">SKUs</p>
                                            <p className="text-sm font-bold text-slate-800">{bodega.total_skus}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-500">Unidades</p>
                                            <p className="text-sm font-bold text-slate-800">{bodega.total_unidades}</p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-500">Valor</p>
                                            <p className="text-xs font-bold text-emerald-700 mt-0.5">
                                                ${Number(bodega.valor_total).toLocaleString('es-CO')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════ */}
            {/* MODALES DE ACCIÓN */}
            {/* ═══════════════════════════════════════════════════════════════════ */}
            <MovimientoModal
                isOpen={modalOperacion.open}
                onClose={() => setModalOperacion({ ...modalOperacion, open: false })}
                tipo={modalOperacion.tipo}
                componentePreseleccionado={modalOperacion.componente}
                onSuccess={handleRefreshAll}
            />

            <BodegaModal
                isOpen={modalBodega}
                onClose={() => setModalBodega(false)}
                onSuccess={handleRefreshAll}
            />
        </div>
    );
}
