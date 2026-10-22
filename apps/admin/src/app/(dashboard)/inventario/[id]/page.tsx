/**
 * MEKANOS S.A.S - Portal Admin
 * Centro de Control Logístico de Ítem - EXPEDIENTE LOGÍSTICO AUDITABLE (WMS)
 * 
 * Ruta: /inventario/[id]
 * 
 * Pestañas:
 * 1. Lotes & Ubicaciones en Bodega (Activa por defecto)
 * 2. Historial Kardex Auditable
 * 3. Parámetros de Almacén & Abastecimiento (Sourcing Homologado & Taxonomía)
 */

'use client';

import {
    ComponenteStock,
    useDetalleComponente,
    useKardex,
} from '@/features/inventario/api/inventario-motor.service';
import { MovimientoModal, TipoOperacionInventario } from '@/features/inventario/components/MovimientoModal';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ArrowDownCircle,
    ArrowLeft,
    ArrowLeftRight,
    ArrowUpCircle,
    Building2,
    CheckCircle2,
    DollarSign,
    ExternalLink,
    FileText,
    History,
    Layers,
    Loader2,
    Package,
    ShoppingBag,
    SlidersHorizontal,
    Tag,
    TrendingDown,
    TrendingUp,
    Warehouse,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function StockBadge({ estado, className }: { estado: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO'; className?: string }) {
    const config = {
        OK: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-800', label: 'Stock Óptimo' },
        BAJO: { bg: 'bg-amber-50 border-amber-200 text-amber-800', label: 'Stock Bajo' },
        CRITICO: { bg: 'bg-orange-50 border-orange-200 text-orange-800', label: 'Stock Crítico' },
        AGOTADO: { bg: 'bg-rose-50 border-rose-200 text-rose-800', label: 'Agotado' },
    };
    const { bg, label } = config[estado] || config.OK;
    return (
        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border whitespace-nowrap shrink-0', bg, className)}>
            {label}
        </span>
    );
}

function TabButton({ active, onClick, children, icon: Icon, badge }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon: React.ElementType;
    badge?: number | string;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 px-4 py-2.5 font-semibold text-xs rounded-lg transition-all border cursor-pointer',
                active
                    ? 'bg-blue-50/80 text-blue-700 border-blue-200 shadow-2xs'
                    : 'text-slate-600 border-transparent hover:bg-slate-100/80 hover:text-slate-900'
            )}
        >
            <Icon className="h-4 w-4" />
            <span>{children}</span>
            {badge !== undefined && (
                <span className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px] font-bold',
                    active ? 'bg-blue-200/60 text-blue-800' : 'bg-slate-200 text-slate-700'
                )}>
                    {badge}
                </span>
            )}
        </button>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function DetalleComponentePage() {
    const params = useParams();
    const rawId = params?.id;
    const id = rawId && !isNaN(Number(rawId)) && Number(rawId) > 0 ? Number(rawId) : 0;
    const validId = id > 0 ? id : null;

    // Pestaña activa por defecto: 'lotes' (Lotes & Ubicaciones en Bodega)
    const [activeTab, setActiveTab] = useState<'lotes' | 'kardex' | 'parametros'>('lotes');

    const [modalMovimiento, setModalMovimiento] = useState<{
        open: boolean;
        tipo: TipoOperacionInventario;
    }>({ open: false, tipo: 'ENTRADA' });

    const { data: componente, isLoading, isError, refetch } = useDetalleComponente(validId);
    const { data: kardexData, isLoading: loadingKardex } = useKardex(activeTab === 'kardex' ? validId : null);

    // Resumen de existencias por bodega a partir de lotes activos
    const bodegasSummary = useMemo(() => {
        if (!componente?.lotes_activos || componente.lotes_activos.length === 0) {
            return [];
        }
        const map = new Map<string, { codigo: string; zona: string; cantidad: number; lotes: number }>();
        for (const lote of componente.lotes_activos) {
            const codigo = lote.bodega || 'BOD-CENTRAL';
            const zona = lote.zona || 'Principal';
            const existing = map.get(codigo) || { codigo, zona, cantidad: 0, lotes: 0 };
            existing.cantidad += Number(lote.cantidad_actual || 0);
            existing.lotes += 1;
            map.set(codigo, existing);
        }
        return Array.from(map.values());
    }, [componente?.lotes_activos]);

    const compStock: ComponenteStock | null = componente ? {
        id_componente: componente.id_componente || (componente as any).id || id,
        codigo: componente.codigo_interno,
        referencia: componente.referencia_fabricante,
        nombre: componente.descripcion_corta,
        tipo: componente.tipo?.nombre,
        marca: componente.marca,
        unidad: componente.unidad_medida,
        stock_actual: componente.stock?.actual ?? 0,
        stock_minimo: componente.stock?.minimo ?? 0,
        stock_seguridad: 0,
        precio_compra: componente.precios?.compra ?? 0,
        precio_venta: componente.precios?.venta ?? 0,
        valor_stock: componente.stock?.valor_total ?? 0,
        estado_stock: componente.stock?.estado ?? 'OK',
        total_lotes: componente.lotes_activos?.length || 0,
        bodegas: ((componente as any).bodegas && (componente as any).bodegas.length > 0)
            ? (componente as any).bodegas
            : bodegasSummary.map((b) => ({
                id_ubicacion: b.codigo === 'BOD-FLUIDOS' ? 2 : b.codigo === 'MOVIL-01' ? 3 : 1,
                codigo: b.codigo,
                nombre: b.zona,
                stock: b.cantidad,
            })),
        lotes_activos: componente.lotes_activos?.map((l: any) => ({
            id_lote: l.id_lote,
            codigo_lote: l.codigo_lote,
            cantidad_actual: Number(l.cantidad_actual || 0),
            fecha_vencimiento: l.fecha_vencimiento,
            id_ubicacion: l.id_ubicacion || (l.bodega === 'BOD-FLUIDOS' || l.bodega_codigo === 'BOD-FLUIDOS' ? 2 : (l.bodega === 'MOVIL-01' || l.bodega_codigo === 'MOVIL-01' ? 3 : 1)),
            bodega_codigo: l.bodega_codigo || l.bodega || 'BOD-CENTRAL',
            bodega_nombre: l.bodega_nombre || l.zona || 'Bodega Central Taller',
        })),
        activo: componente.activo,
    } : null;

    // Categoría taxonómica completa homologada
    const categoriaTexto = useMemo(() => {
        if (!componente) return 'General';
        return componente.categoria?.completo ||
            (componente.categoria?.padre ? `${componente.categoria.padre} > ${componente.categoria.nombre}` : null) ||
            componente.categoria?.nombre ||
            componente.tipo?.nombre ||
            'General';
    }, [componente]);

    // Formateador COP
    const formatCOP = (valor: number | null | undefined) => {
        if (valor === null || valor === undefined) return '$ 0';
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(Number(valor));
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm font-medium">Cargando expediente logístico del ítem...</p>
            </div>
        );
    }

    if (isError || !componente) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-rose-500">
                <AlertCircle className="h-12 w-12 mb-3 text-rose-500" />
                <p className="font-semibold text-slate-800 text-base">Error al cargar el componente</p>
                <p className="text-xs text-slate-500 mt-1">No se pudo recuperar el registro logístico solicitado.</p>
                <Link
                    href="/inventario"
                    className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors"
                >
                    Volver al inventario
                </Link>
            </div>
        );
    }

    const proveedoresHomologados = componente.proveedores_homologados || (componente.proveedor ? [{
        id_proveedor: componente.proveedor.id,
        nombre_proveedor: componente.proveedor.nombre,
        nit: componente.proveedor.nit,
        referencia_proveedor: '--',
        marca_ofrecida: componente.marca || '--',
        costo_actual: componente.precios.compra,
        moneda: componente.precios.moneda || 'COP',
        tiempo_entrega_dias: 1,
        cantidad_minima_compra: 1,
        es_proveedor_preferido: true,
        telefono: componente.proveedor.telefono || '--',
        email: componente.proveedor.email || '--',
    }] : []);

    return (
        <div className="space-y-6">
            {/* Header Ejecutivo Sobrio */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <Link
                        href="/inventario"
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shrink-0 mt-0.5 sm:mt-0"
                        title="Volver al Inventario General"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0 flex-nowrap">
                            <span className="inline-block px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded font-mono text-xs font-bold border border-slate-200 shrink-0">
                                {componente.codigo_interno || `ART-${id}`}
                            </span>
                            <h1 className="text-lg lg:text-xl font-bold text-slate-900 truncate min-w-0">
                                {componente.descripcion_corta || componente.referencia_fabricante}
                            </h1>
                            <StockBadge estado={componente.stock.estado} className="shrink-0" />
                            {!componente.activo && (
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold shrink-0">
                                    INACTIVO
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">Ref: {componente.referencia_fabricante || '--'}</span>
                            <span>•</span>
                            <span>Marca: <strong className="text-slate-700">{componente.marca || 'N/A'}</strong></span>
                            <span>•</span>
                            <span>Categoría: <strong className="text-blue-700">{categoriaTexto}</strong></span>
                            <span>•</span>
                            <span>Unidad: <strong className="text-slate-700">{componente.unidad_medida || 'UND'}</strong></span>
                        </div>
                    </div>
                </div>

                {/* Botonera Ejecutiva Homologada - 100% Monolínea */}
                <div className="flex items-center gap-1.5 shrink-0 self-start lg:self-center overflow-x-auto">
                    <Link
                        href={`/compras/catalogo/${id}`}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors whitespace-nowrap shrink-0"
                        title="Ver Ficha Comercial y Matriz de Sourcing en Catálogo"
                    >
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                        <span>Ficha Comercial</span>
                    </Link>

                    <Link
                        href={`/compras/ordenes/nueva?componenteId=${id}`}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap shrink-0"
                        title="Generar Orden de Compra para este ítem"
                    >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>Pedir a Proveedor</span>
                    </Link>

                    <button
                        onClick={() => setModalMovimiento({ open: true, tipo: 'ENTRADA' })}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title="Registrar Entrada a Inventario"
                    >
                        <ArrowDownCircle className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Entrada</span>
                    </button>

                    <button
                        onClick={() => setModalMovimiento({ open: true, tipo: 'SALIDA' })}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title="Registrar Salida / Despacho"
                    >
                        <ArrowUpCircle className="h-3.5 w-3.5 text-amber-600" />
                        <span>Salida</span>
                    </button>

                    <button
                        onClick={() => setModalMovimiento({ open: true, tipo: 'AJUSTE' })}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title="Registrar Ajuste Físico"
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5 text-violet-600" />
                        <span>Ajuste</span>
                    </button>

                    <button
                        onClick={() => setModalMovimiento({ open: true, tipo: 'TRASLADO' })}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 shadow-2xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title="Trasladar a otra Bodega"
                    >
                        <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />
                        <span>Traslado</span>
                    </button>
                </div>
            </div>

            {/* KPIs Rápidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Stock Actual</span>
                        <Package className="h-4 w-4 text-blue-500" />
                    </div>
                    <p className={cn(
                        'text-2xl font-bold mt-1.5',
                        componente.stock.estado === 'AGOTADO' && 'text-rose-600',
                        componente.stock.estado === 'CRITICO' && 'text-orange-600',
                        componente.stock.estado === 'BAJO' && 'text-amber-600',
                        componente.stock.estado === 'OK' && 'text-emerald-600'
                    )}>
                        {componente.stock.actual} <span className="text-sm font-semibold text-slate-500">{componente.unidad_medida || 'UND'}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Mínimo requerido: {componente.stock.minimo} {componente.unidad_medida || 'UND'}</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Valor en Almacén</span>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-bold mt-1.5 text-emerald-700">
                        {formatCOP(componente.stock.valor_total)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        Costo unitario (CPP): {formatCOP(componente.precios.compra)}
                    </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Lotes Activos</span>
                        <Layers className="h-4 w-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-bold mt-1.5 text-indigo-600">
                        {componente.lotes_activos?.length || 0}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Con existencias remanentes</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Movimientos Kardex</span>
                        <History className="h-4 w-4 text-purple-500" />
                    </div>
                    <p className="text-2xl font-bold mt-1.5 text-purple-600">
                        {componente.metricas?.total_movimientos ?? 0}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Transacciones auditadas</p>
                </div>
            </div>

            {/* Pestañas Principales Consolidadas */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
                <TabButton
                    active={activeTab === 'lotes'}
                    onClick={() => setActiveTab('lotes')}
                    icon={Layers}
                    badge={componente.lotes_activos?.length || 0}
                >
                    1. Lotes & Ubicaciones en Bodega
                </TabButton>
                <TabButton
                    active={activeTab === 'kardex'}
                    onClick={() => setActiveTab('kardex')}
                    icon={History}
                    badge={componente.metricas?.total_movimientos || undefined}
                >
                    2. Historial Kardex Auditable
                </TabButton>
                <TabButton
                    active={activeTab === 'parametros'}
                    onClick={() => setActiveTab('parametros')}
                    icon={FileText}
                >
                    3. Parámetros de Almacén & Abastecimiento
                </TabButton>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 1: LOTES & UBICACIONES EN BODEGA (ACTIVA POR DEFECTO) */}
            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'lotes' && (
                <div className="space-y-6">
                    {/* Tarjetas de Existencias por Bodega */}
                    {bodegasSummary.length > 0 && (
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                                Disponibilidad Física Distribuida
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {bodegasSummary.map((b) => (
                                    <div key={b.codigo} className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
                                                <Warehouse className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm text-slate-900">{b.codigo}</p>
                                                <p className="text-xs text-slate-500">Zona: {b.zona}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-emerald-700">
                                                {b.cantidad} {componente.unidad_medida || 'UND'}
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                {b.lotes} {b.lotes === 1 ? 'lote' : 'lotes'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabla de Lotes Activos */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-slate-800">Trazabilidad de Lotes Físicos en Almacén</h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Existencias remanentes, ubicación física y semáforo de vencimiento
                                </p>
                            </div>
                            <button
                                onClick={() => setModalMovimiento({ open: true, tipo: 'ENTRADA' })}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                            >
                                <ArrowDownCircle className="h-3.5 w-3.5" />
                                Nuevo Lote (Entrada)
                            </button>
                        </div>

                        {(componente.lotes_activos || []).length === 0 ? (
                            <div className="text-center py-12 text-slate-500">
                                <Layers className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                                <p className="text-sm font-semibold text-slate-700">Sin lotes activos</p>
                                <p className="text-xs text-slate-400 mt-0.5 max-w-md mx-auto">
                                    Este componente no tiene existencias físicas vinculadas a un lote activo en bodega. Puedes registrar una entrada física para aperturar un lote.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Código Lote</th>
                                            <th className="px-4 py-3">Bodega / Ubicación</th>
                                            <th className="px-4 py-3 text-center">Disponible</th>
                                            <th className="px-4 py-3 text-center">Inicial</th>
                                            <th className="px-4 py-3">Lote Fabricante / Factura</th>
                                            <th className="px-4 py-3">Fecha Ingreso</th>
                                            <th className="px-4 py-3">Vencimiento</th>
                                            <th className="px-4 py-3 text-center">Estado</th>
                                            <th className="px-4 py-3 text-right">Acciones Rápidas</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {(componente.lotes_activos || []).map((lote: any) => (
                                            <tr key={lote.id_lote} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3 font-mono font-bold text-slate-900">
                                                    {lote.codigo_lote}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <Warehouse className="h-3.5 w-3.5 text-slate-400" />
                                                        <span className="font-semibold text-slate-800">{lote.bodega || 'BOD-CENTRAL'}</span>
                                                        {lote.zona && <span className="text-[11px] text-slate-400">({lote.zona})</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <span className="inline-block whitespace-nowrap font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs border border-emerald-100">
                                                        {lote.cantidad_actual} {componente.unidad_medida || 'UND'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-500">
                                                    {lote.cantidad_inicial}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 font-mono">
                                                    {lote.numero_lote_fabricante || '--'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">
                                                    {lote.fecha_ingreso ? new Date(lote.fecha_ingreso).toLocaleDateString('es-CO') : '--'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {lote.fecha_vencimiento ? (
                                                        <span className="font-medium text-slate-700">
                                                            {new Date(lote.fecha_vencimiento).toLocaleDateString('es-CO')}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">No aplica</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={cn(
                                                        'inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                                                        lote.estado_lote === 'DISPONIBLE' && 'bg-emerald-100 text-emerald-800',
                                                        lote.estado_lote === 'CUARENTENA' && 'bg-amber-100 text-amber-800',
                                                        lote.estado_lote === 'AGOTADO' && 'bg-rose-100 text-rose-800'
                                                    )}>
                                                        {lote.estado_lote || 'DISPONIBLE'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => setModalMovimiento({ open: true, tipo: 'SALIDA' })}
                                                            className="px-2 py-1 bg-white hover:bg-slate-50 text-amber-700 border border-slate-200 rounded text-[11px] font-semibold transition-colors"
                                                            title="Despachar unidades de este lote"
                                                        >
                                                            Despachar
                                                        </button>
                                                        <button
                                                            onClick={() => setModalMovimiento({ open: true, tipo: 'TRASLADO' })}
                                                            className="px-2 py-1 bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 rounded text-[11px] font-semibold transition-colors"
                                                            title="Trasladar lote a otra bodega"
                                                        >
                                                            Trasladar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 2: HISTORIAL KARDEX AUDITABLE (SIN BORDES NEGROS NI ADMIN MEKANOS) */}
            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'kardex' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-slate-800">Historial Kardex Auditable del Ítem</h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Libro mayor inmutable de movimientos físicos y contables ({kardexData?.total_movimientos || 0} movimientos)
                            </p>
                        </div>
                    </div>

                    {loadingKardex ? (
                        <div className="flex justify-center items-center py-12 text-slate-500">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
                            <span className="text-xs font-medium">Recuperando registros inmutables de Kardex...</span>
                        </div>
                    ) : (kardexData?.kardex || []).length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <History className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                            <p className="text-sm font-semibold text-slate-700">Sin movimientos en Kardex</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                                No se han registrado movimientos de entrada, salida o ajuste físico para este ítem.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Fecha / Hora</th>
                                        <th className="px-4 py-3">Tipo & Origen</th>
                                        <th className="px-4 py-3">Bodega</th>
                                        <th className="px-4 py-3">Lote</th>
                                        <th className="px-4 py-3 text-center">Cantidad</th>
                                        <th className="px-4 py-3 text-center">Saldo Resultante</th>
                                        <th className="px-4 py-3">Documento / Observación</th>
                                        <th className="px-4 py-3">Responsable</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {kardexData?.kardex?.map((mov) => {
                                        const esEntrada = mov.entrada > 0;
                                        const cantidadValor = esEntrada ? mov.entrada : mov.salida;
                                        const responsableLimpio = (!mov.realizado_por || mov.realizado_por.toLowerCase().includes('admin') || mov.realizado_por.toLowerCase().includes('mekanos'))
                                            ? 'Administrador del Sistema'
                                            : mov.realizado_por;

                                        return (
                                            <tr key={mov.id_movimiento} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                                                    {new Date(mov.fecha).toLocaleString('es-CO', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className={cn(
                                                            'inline-block w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                                                            mov.tipo === 'ENTRADA' && 'bg-emerald-100 text-emerald-800',
                                                            mov.tipo === 'SALIDA' && 'bg-rose-100 text-rose-800',
                                                            mov.tipo === 'AJUSTE' && 'bg-violet-100 text-violet-800',
                                                            mov.tipo === 'TRANSFERENCIA' && 'bg-blue-100 text-blue-800'
                                                        )}>
                                                            {mov.tipo}
                                                        </span>
                                                        {mov.origen && (
                                                            <span className="text-[10px] text-slate-400 font-mono">
                                                                {mov.origen}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                                                    {mov.bodega || 'BOD-CENTRAL'}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-800 whitespace-nowrap">
                                                    {mov.lote && mov.lote !== '--' ? (
                                                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px] font-bold">
                                                            {mov.lote}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">--</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    {esEntrada ? (
                                                        <span className="text-emerald-700 font-bold inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                            <TrendingUp className="h-3 w-3" />
                                                            +{cantidadValor} {componente.unidad_medida || 'UND'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-rose-700 font-bold inline-flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                            <TrendingDown className="h-3 w-3" />
                                                            -{cantidadValor} {componente.unidad_medida || 'UND'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-900 whitespace-nowrap">
                                                    {mov.saldo} <span className="text-slate-400 font-normal text-[11px]">{componente.unidad_medida || 'UND'}</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 max-w-xs">
                                                    <p className="font-semibold text-slate-800 truncate">{mov.referencia || '-'}</p>
                                                    {mov.observaciones && (
                                                        <p className="text-[11px] text-slate-400 truncate">{mov.observaciones}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                    <span className="font-medium">{responsableLimpio}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {/* PESTAÑA 3: PARÁMETROS DE ALMACÉN & ABASTECIMIENTO (CONEXIÓN SOURCING REAL) */}
            {/* ═══════════════════════════════════════════════════════════════════════════ */}
            {activeTab === 'parametros' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Especificaciones Técnicas & Taxonomía */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                                <Tag className="h-4 w-4 text-blue-600" />
                                <h3 className="font-bold text-sm text-slate-800">Especificaciones Técnicas & Taxonomía</h3>
                            </div>
                            <div className="space-y-3.5 text-xs">
                                <div>
                                    <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Categoría Taxonómica Homologada</label>
                                    <div className="mt-1 flex items-center gap-2">
                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-800 font-bold rounded-md border border-blue-100">
                                            {categoriaTexto}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Código Interno (SKU)</label>
                                        <p className="mt-1 font-mono font-bold text-slate-900 text-sm">{componente.codigo_interno || `ART-${id}`}</p>
                                    </div>
                                    <div>
                                        <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Referencia Fabricante</label>
                                        <p className="mt-1 font-semibold text-slate-800 text-sm">{componente.referencia_fabricante || '--'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Marca</label>
                                        <p className="mt-1 font-medium text-slate-800">{componente.marca || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Unidad de Medida</label>
                                        <p className="mt-1 font-medium text-slate-800">{componente.unidad_medida || 'UND'}</p>
                                    </div>
                                </div>
                                {componente.descripcion_detallada && (
                                    <div>
                                        <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Descripción Detallada</label>
                                        <p className="mt-1 text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                            {componente.descripcion_detallada}
                                        </p>
                                    </div>
                                )}
                                {componente.observaciones && (
                                    <div>
                                        <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Observaciones Logísticas</label>
                                        <p className="mt-1 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                            {componente.observaciones}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Políticas de Stock & Valoración */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
                            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                                <DollarSign className="h-4 w-4 text-emerald-600" />
                                <h3 className="font-bold text-sm text-slate-800">Políticas de Stock & Valoración Contable</h3>
                            </div>
                            <div className="space-y-3.5 text-xs">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Stock Mínimo Exigido</label>
                                        <p className="mt-1 font-bold text-slate-900 text-sm">{componente.stock.minimo} {componente.unidad_medida || 'UND'}</p>
                                    </div>
                                    <div>
                                        <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Stock Físico Actual</label>
                                        <p className="mt-1 font-bold text-blue-700 text-sm">{componente.stock.actual} {componente.unidad_medida || 'UND'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Costo Unitario Compra (CPP)</label>
                                        <p className="mt-1 font-bold text-emerald-700 text-sm">{formatCOP(componente.precios.compra)}</p>
                                    </div>
                                    <div>
                                        <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Precio Venta Base</label>
                                        <p className="mt-1 font-medium text-slate-800 text-sm">
                                            {componente.precios.venta ? formatCOP(componente.precios.venta) : 'No configurado'}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">Valoración Total en Almacén</label>
                                    <p className="mt-1 font-bold text-slate-900 text-lg text-emerald-700">
                                        {formatCOP(componente.stock.valor_total)}
                                    </p>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                                    <span>Control Inventariable:</span>
                                    <span className="font-semibold text-slate-800">
                                        {componente.stock.es_inventariable ? 'Sí (Control por Lotes)' : 'No'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Matriz de Proveedores Homologados Reales */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-blue-600" />
                                <div>
                                    <h3 className="font-bold text-sm text-slate-800">Proveedores Homologados (Matriz de Sourcing)</h3>
                                    <p className="text-xs text-slate-500">
                                        Proveedores habilitados para abastecimiento con acuerdos comerciales y tiempos de entrega
                                    </p>
                                </div>
                            </div>
                            <Link
                                href={`/compras/catalogo/${id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
                            >
                                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                                Administrar en Ficha Comercial
                            </Link>
                        </div>

                        {proveedoresHomologados.length === 0 ? (
                            <div className="text-center py-10 text-slate-500">
                                <Building2 className="h-9 w-9 mx-auto text-slate-300 mb-2" />
                                <p className="text-sm font-semibold text-slate-700">Sin proveedores homologados vinculados</p>
                                <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
                                    Este ítem aún no tiene proveedores vinculados en la matriz de compras. Puedes homologar proveedores directamente desde la Ficha Comercial.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3">Proveedor / Razón Social</th>
                                            <th className="px-4 py-3">NIT / Identificación</th>
                                            <th className="px-4 py-3">Marca Ofrecida</th>
                                            <th className="px-4 py-3 text-right">Precio Pactado</th>
                                            <th className="px-4 py-3 text-center">Entrega</th>
                                            <th className="px-4 py-3 text-center">Estado Sourcing</th>
                                            <th className="px-4 py-3 text-right">Acción Directa</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {proveedoresHomologados.map((p: any) => (
                                            <tr key={p.id_proveedor} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-900">
                                                    {p.nombre_proveedor}
                                                </td>
                                                <td className="px-4 py-3 font-mono text-slate-600">
                                                    {p.nit}
                                                </td>
                                                <td className="px-4 py-3 text-slate-700">
                                                    {p.marca_ofrecida || '--'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-emerald-700">
                                                    {formatCOP(p.costo_actual)}
                                                </td>
                                                <td className="px-4 py-3 text-center text-slate-600">
                                                    {p.tiempo_entrega_dias ? `${p.tiempo_entrega_dias} d` : '1 d'}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {p.es_proveedor_preferido ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Preferente
                                                        </span>
                                                    ) : (
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                                                            Homologado
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Link
                                                        href={`/compras/ordenes/nueva?componenteId=${id}&proveedorId=${p.id_proveedor}`}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
                                                    >
                                                        <ShoppingBag className="h-3.5 w-3.5" />
                                                        Pedir a Proveedor
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Operaciones Físicas de Inventario */}
            <MovimientoModal
                isOpen={modalMovimiento.open}
                onClose={() => setModalMovimiento({ ...modalMovimiento, open: false })}
                tipo={modalMovimiento.tipo}
                componentePreseleccionado={compStock}
                onSuccess={() => {
                    refetch();
                }}
            />
        </div>
    );
}
