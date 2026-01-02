/**
 * MEKANOS S.A.S - Portal Admin
 * Página de Inventario - FASE 6
 * 
 * Ruta: /inventario
 * 
 * Funcionalidades:
 * - KPIs de inventario (valor, stock bajo, movimientos)
 * - Tabla de componentes con filtros
 * - Acciones: Ver stock, Kardex, Registrar movimiento
 */

'use client';

import { useComponentesStock, useDashboardKPIs } from '@/features/inventario/api/inventario-motor.service';
import { MovimientoModal } from '@/features/inventario/components/MovimientoModal';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ArrowDownCircle,
    ArrowUpCircle,
    ChevronLeft,
    ChevronRight,
    Eye,
    Loader2,
    Package,
    Plus,
    RefreshCw,
    Search,
    TrendingUp,
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
    icon: Icon,
    color,
    loading
}: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    loading?: boolean;
}) {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        orange: 'bg-orange-100 text-orange-600',
        red: 'bg-red-100 text-red-600',
    };

    return (
        <div className="bg-white rounded-lg border p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', colorClasses[color])}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">{title}</p>
                    {loading ? (
                        <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                    ) : (
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function InventarioPage() {
    const [page, setPage] = useState(1);
    const [busqueda, setBusqueda] = useState('');
    const [soloCriticos, setSoloCriticos] = useState(false);
    const [modalEntrada, setModalEntrada] = useState(false);
    const [modalSalida, setModalSalida] = useState(false);

    const pageSize = 20;

    // Hook del Motor de Inventario - Dashboard KPIs
    const { data: dashboardData, isLoading: loadingKPIs, refetch: refetchKPIs } = useDashboardKPIs();

    // Hook del Motor de Inventario - Lista de componentes con stock
    const { data: componentesData, isLoading, isError, refetch } = useComponentesStock({
        busqueda: busqueda || undefined,
        solo_criticos: soloCriticos || undefined,
        skip: (page - 1) * pageSize,
        limit: pageSize,
    });

    const componentes = componentesData?.data || [];
    const total = componentesData?.meta?.total || 0;
    const totalPages = Math.ceil(total / pageSize) || 1;

    // KPIs del Motor de Inventario
    const kpis = dashboardData?.kpis;

    // Refrescar todo después de un movimiento
    const handleMovimientoSuccess = () => {
        refetch();
        refetchKPIs();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package className="h-7 w-7 text-orange-600" />
                        Gestión de Inventario
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Control de repuestos, materiales y consumibles
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setModalEntrada(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                    >
                        <ArrowDownCircle className="h-4 w-4" />
                        Entrada
                    </button>
                    <button
                        onClick={() => setModalSalida(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                    >
                        <ArrowUpCircle className="h-4 w-4" />
                        Salida
                    </button>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo Item
                    </button>
                </div>
            </div>

            {/* KPIs del Motor de Inventario */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <KPICard
                    title="Valor Inventario"
                    value={kpis ? `$${(kpis.valor_inventario / 1000000).toFixed(1)}M` : '--'}
                    icon={TrendingUp}
                    color="green"
                    loading={loadingKPIs}
                />
                <KPICard
                    title="Total Items"
                    value={kpis?.total_items ?? '--'}
                    icon={Package}
                    color="blue"
                    loading={loadingKPIs}
                />
                <KPICard
                    title="Items Críticos"
                    value={kpis?.items_criticos ?? '--'}
                    icon={AlertCircle}
                    color="red"
                    loading={loadingKPIs}
                />
                <KPICard
                    title="Movimientos Hoy"
                    value={kpis?.movimientos_hoy ?? '--'}
                    icon={Wrench}
                    color="orange"
                    loading={loadingKPIs}
                />
                <KPICard
                    title="Alertas"
                    value={kpis?.alertas_pendientes ?? '--'}
                    icon={AlertCircle}
                    color="yellow"
                    loading={loadingKPIs}
                />
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, código o marca..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => { setSoloCriticos(!soloCriticos); setPage(1); }}
                        className={cn(
                            'px-3 py-2 border rounded-lg transition-colors',
                            soloCriticos
                                ? 'bg-red-100 border-red-300 text-red-700'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                        )}
                    >
                        {soloCriticos ? '🔴 Solo Críticos' : 'Todos'}
                    </button>

                    <button
                        onClick={() => refetch()}
                        className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        title="Refrescar"
                    >
                        <RefreshCw className={cn('h-5 w-5 text-gray-600', isLoading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div>
            )}

            {/* Error */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-12 text-red-500">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="font-medium">Error al cargar inventario</p>
                    <button onClick={() => refetch()} className="mt-2 text-sm text-blue-600 hover:underline">
                        Reintentar
                    </button>
                </div>
            )}

            {/* Tabla de componentes */}
            {!isLoading && !isError && (
                <>
                    {componentes.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-lg">
                            <Package className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-gray-600 font-medium">No hay componentes registrados</p>
                            <p className="text-gray-500 text-sm">Los componentes aparecerán aquí cuando se registren</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-lg border overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referencia</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marca</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Mínimo</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Estado</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {componentes.map((c) => (
                                        <tr key={c.id_componente} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-sm text-gray-600">
                                                    {c.codigo || '--'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {c.referencia || '--'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-900">{c.nombre || '--'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {c.marca || '--'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    'font-bold text-lg',
                                                    c.estado_stock === 'AGOTADO' && 'text-red-600',
                                                    c.estado_stock === 'CRITICO' && 'text-orange-600',
                                                    c.estado_stock === 'BAJO' && 'text-yellow-600',
                                                    c.estado_stock === 'OK' && 'text-green-600'
                                                )}>
                                                    {c.stock_actual}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center text-sm text-gray-500">
                                                {c.stock_minimo}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={cn(
                                                    'px-2 py-1 rounded-full text-xs font-medium',
                                                    c.estado_stock === 'AGOTADO' && 'bg-red-100 text-red-800',
                                                    c.estado_stock === 'CRITICO' && 'bg-orange-100 text-orange-800',
                                                    c.estado_stock === 'BAJO' && 'bg-yellow-100 text-yellow-800',
                                                    c.estado_stock === 'OK' && 'bg-green-100 text-green-800'
                                                )}>
                                                    {c.estado_stock}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm font-medium text-gray-700">
                                                ${c.valor_stock?.toLocaleString() || 0}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Link
                                                    href={`/inventario/${c.id_componente}`}
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    <Eye className="h-3 w-3" />
                                                    Ver Detalle
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-4">
                            <p className="text-sm text-gray-600">
                                Mostrando {((page - 1) * pageSize) + 1} a{' '}
                                {Math.min(page * pageSize, total)} de {total} items
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage(page - 1)}
                                    disabled={page === 1}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-1 rounded border',
                                        page === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setPage(page + 1)}
                                    disabled={page >= totalPages}
                                    className={cn(
                                        'flex items-center gap-1 px-3 py-1 rounded border',
                                        page >= totalPages
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white text-gray-700 hover:bg-gray-50'
                                    )}
                                >
                                    Siguiente
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modales de Movimiento */}
            <MovimientoModal
                isOpen={modalEntrada}
                onClose={() => setModalEntrada(false)}
                tipo="ENTRADA"
                onSuccess={handleMovimientoSuccess}
            />
            <MovimientoModal
                isOpen={modalSalida}
                onClose={() => setModalSalida(false)}
                tipo="SALIDA"
                onSuccess={handleMovimientoSuccess}
            />
        </div>
    );
}
