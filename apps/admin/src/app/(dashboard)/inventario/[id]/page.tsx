/**
 * MEKANOS S.A.S - Portal Admin
 * Vista Maestra de Componente - FASE 6 INVENTARIO
 * 
 * Ruta: /inventario/[id]
 * 
 * Tabs:
 * - General: Datos maestros editables
 * - Gestión: Stock, precios, proveedor
 * - Kardex: Historial de movimientos
 */

'use client';

import { useActualizarComponente, useDetalleComponente, useKardex } from '@/features/inventario/api/inventario-motor.service';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ArrowLeft,
    Box,
    Building2,
    Calendar,
    DollarSign,
    Edit2,
    FileText,
    History,
    Loader2,
    Package,
    Save,
    Settings,
    Tag,
    TrendingDown,
    TrendingUp,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function StockBadge({ estado }: { estado: 'OK' | 'BAJO' | 'CRITICO' | 'AGOTADO' }) {
    const config = {
        OK: { bg: 'bg-green-100', text: 'text-green-800', label: 'Stock OK' },
        BAJO: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Stock Bajo' },
        CRITICO: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Crítico' },
        AGOTADO: { bg: 'bg-red-100', text: 'text-red-800', label: 'Agotado' },
    };
    const { bg, text, label } = config[estado];
    return (
        <span className={cn('px-3 py-1 rounded-full text-sm font-semibold', bg, text)}>
            {label}
        </span>
    );
}

function InfoCard({ title, children, icon: Icon }: { title: string; children: React.ReactNode; icon: React.ElementType }) {
    return (
        <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
                <Icon className="h-5 w-5 text-gray-500" />
                <h3 className="font-semibold text-gray-700">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function TabButton({ active, onClick, children, icon: Icon }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon: React.ElementType;
}) {
    return (
        <button
            onClick={onClick}
            className={cn(
                'flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition-colors',
                active
                    ? 'bg-orange-100 text-orange-700'
                    : 'text-gray-600 hover:bg-gray-100'
            )}
        >
            <Icon className="h-4 w-4" />
            {children}
        </button>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function DetalleComponentePage() {
    const params = useParams();
    const id = Number(params.id);

    const [activeTab, setActiveTab] = useState<'general' | 'gestion' | 'kardex'>('general');
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState<Record<string, any>>({});

    const { data: componente, isLoading, isError, refetch } = useDetalleComponente(id);
    const { data: kardexData, isLoading: loadingKardex } = useKardex(activeTab === 'kardex' ? id : null);
    const actualizarMutation = useActualizarComponente();

    // Inicializar formData cuando carga el componente
    const initEditMode = () => {
        if (componente) {
            setFormData({
                codigo_interno: componente.codigo_interno || '',
                referencia_fabricante: componente.referencia_fabricante || '',
                descripcion_corta: componente.descripcion_corta || '',
                descripcion_detallada: componente.descripcion_detallada || '',
                marca: componente.marca || '',
                unidad_medida: componente.unidad_medida || '',
                stock_minimo: componente.stock.minimo,
                precio_compra: componente.precios.compra,
                precio_venta: componente.precios.venta || '',
                observaciones: componente.observaciones || '',
                notas_instalacion: componente.notas_instalacion || '',
            });
            setEditMode(true);
        }
    };

    const handleSave = async () => {
        try {
            await actualizarMutation.mutateAsync({
                id,
                dto: {
                    ...formData,
                    stock_minimo: Number(formData.stock_minimo),
                    precio_compra: Number(formData.precio_compra),
                    precio_venta: formData.precio_venta ? Number(formData.precio_venta) : undefined,
                    modificado_por: 1, // TODO: Usar usuario actual de sesión
                },
            });
            setEditMode(false);
            refetch();
        } catch (error) {
            console.error('Error al guardar:', error);
        }
    };

    const handleCancel = () => {
        setEditMode(false);
        setFormData({});
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    if (isError || !componente) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-red-500">
                <AlertCircle className="h-12 w-12 mb-4" />
                <p className="font-medium">Error al cargar el componente</p>
                <Link href="/inventario" className="mt-4 text-blue-600 hover:underline">
                    Volver al inventario
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <Link
                        href="/inventario"
                        className="p-2 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {componente.descripcion_corta || componente.referencia_fabricante}
                            </h1>
                            <StockBadge estado={componente.stock.estado} />
                            {!componente.activo && (
                                <span className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs">
                                    INACTIVO
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span className="font-mono">{componente.codigo_interno || '--'}</span>
                            <span>•</span>
                            <span>{componente.referencia_fabricante}</span>
                            <span>•</span>
                            <span>{componente.marca || 'Sin marca'}</span>
                        </div>
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2">
                    {editMode ? (
                        <>
                            <button
                                onClick={handleCancel}
                                className="flex items-center gap-2 px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-50"
                            >
                                <X className="h-4 w-4" />
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={actualizarMutation.isPending}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                {actualizarMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Guardar
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={initEditMode}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                        >
                            <Edit2 className="h-4 w-4" />
                            Editar
                        </button>
                    )}
                </div>
            </div>

            {/* KPIs Rápidos */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm">Stock Actual</span>
                        <Package className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className={cn(
                        'text-3xl font-bold mt-1',
                        componente.stock.estado === 'AGOTADO' && 'text-red-600',
                        componente.stock.estado === 'CRITICO' && 'text-orange-600',
                        componente.stock.estado === 'BAJO' && 'text-yellow-600',
                        componente.stock.estado === 'OK' && 'text-green-600'
                    )}>
                        {componente.stock.actual}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Mínimo: {componente.stock.minimo}</p>
                </div>

                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm">Valor en Stock</span>
                        <DollarSign className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold mt-1 text-green-600">
                        ${componente.stock.valor_total.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Precio compra: ${componente.precios.compra.toLocaleString()}
                    </p>
                </div>

                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm">Movimientos</span>
                        <History className="h-5 w-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold mt-1 text-purple-600">
                        {componente.metricas.total_movimientos}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Total histórico</p>
                </div>

                <div className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-sm">Alertas</span>
                        <AlertCircle className="h-5 w-5 text-red-500" />
                    </div>
                    <p className={cn(
                        'text-3xl font-bold mt-1',
                        componente.metricas.alertas_activas > 0 ? 'text-red-600' : 'text-gray-400'
                    )}>
                        {componente.metricas.alertas_activas}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">Pendientes</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
                <TabButton
                    active={activeTab === 'general'}
                    onClick={() => setActiveTab('general')}
                    icon={FileText}
                >
                    General
                </TabButton>
                <TabButton
                    active={activeTab === 'gestion'}
                    onClick={() => setActiveTab('gestion')}
                    icon={Settings}
                >
                    Gestión
                </TabButton>
                <TabButton
                    active={activeTab === 'kardex'}
                    onClick={() => setActiveTab('kardex')}
                    icon={History}
                >
                    Kardex
                </TabButton>
            </div>

            {/* Contenido de Tabs */}
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <InfoCard title="Identificación" icon={Tag}>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500">Código Interno</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={formData.codigo_interno}
                                        onChange={(e) => setFormData({ ...formData, codigo_interno: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p className="font-mono">{componente.codigo_interno || '--'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Referencia Fabricante</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={formData.referencia_fabricante}
                                        onChange={(e) => setFormData({ ...formData, referencia_fabricante: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p className="font-medium">{componente.referencia_fabricante}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Marca</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={formData.marca}
                                        onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p>{componente.marca || '--'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Tipo</label>
                                <p>{componente.tipo?.nombre || '--'}</p>
                            </div>
                        </div>
                    </InfoCard>

                    <InfoCard title="Descripción" icon={FileText}>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500">Descripción Corta</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={formData.descripcion_corta}
                                        onChange={(e) => setFormData({ ...formData, descripcion_corta: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p>{componente.descripcion_corta || '--'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Descripción Detallada</label>
                                {editMode ? (
                                    <textarea
                                        value={formData.descripcion_detallada}
                                        onChange={(e) => setFormData({ ...formData, descripcion_detallada: e.target.value })}
                                        rows={3}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600">{componente.descripcion_detallada || '--'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Unidad de Medida</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={formData.unidad_medida}
                                        onChange={(e) => setFormData({ ...formData, unidad_medida: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p>{componente.unidad_medida || '--'}</p>
                                )}
                            </div>
                        </div>
                    </InfoCard>

                    <InfoCard title="Notas" icon={Box}>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500">Observaciones</label>
                                {editMode ? (
                                    <textarea
                                        value={formData.observaciones}
                                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                        rows={2}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600">{componente.observaciones || '--'}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Notas de Instalación</label>
                                {editMode ? (
                                    <textarea
                                        value={formData.notas_instalacion}
                                        onChange={(e) => setFormData({ ...formData, notas_instalacion: e.target.value })}
                                        rows={2}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p className="text-sm text-gray-600">{componente.notas_instalacion || '--'}</p>
                                )}
                            </div>
                        </div>
                    </InfoCard>

                    <InfoCard title="Auditoría" icon={Calendar}>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Creado:</span>
                                <span>
                                    {componente.auditoria.fecha_creacion
                                        ? new Date(componente.auditoria.fecha_creacion).toLocaleDateString()
                                        : '--'}
                                    {componente.auditoria.creado_por && ` por ${componente.auditoria.creado_por}`}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Modificado:</span>
                                <span>
                                    {componente.auditoria.fecha_modificacion
                                        ? new Date(componente.auditoria.fecha_modificacion).toLocaleDateString()
                                        : '--'}
                                    {componente.auditoria.modificado_por && ` por ${componente.auditoria.modificado_por}`}
                                </span>
                            </div>
                        </div>
                    </InfoCard>
                </div>
            )}

            {activeTab === 'gestion' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <InfoCard title="Stock" icon={Package}>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500">Stock Actual</label>
                                <p className="text-2xl font-bold text-blue-600">{componente.stock.actual}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Stock Mínimo</label>
                                {editMode ? (
                                    <input
                                        type="number"
                                        value={formData.stock_minimo}
                                        onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p className="font-medium">{componente.stock.minimo}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Inventariable</label>
                                <p>{componente.stock.es_inventariable ? 'Sí' : 'No'}</p>
                            </div>
                        </div>
                    </InfoCard>

                    <InfoCard title="Precios" icon={DollarSign}>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500">Precio Compra</label>
                                {editMode ? (
                                    <input
                                        type="number"
                                        value={formData.precio_compra}
                                        onChange={(e) => setFormData({ ...formData, precio_compra: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p className="font-medium">${componente.precios.compra.toLocaleString()}</p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-gray-500">Precio Venta</label>
                                {editMode ? (
                                    <input
                                        type="number"
                                        value={formData.precio_venta}
                                        onChange={(e) => setFormData({ ...formData, precio_venta: e.target.value })}
                                        className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                    />
                                ) : (
                                    <p className="font-medium">
                                        {componente.precios.venta ? `$${componente.precios.venta.toLocaleString()}` : '--'}
                                    </p>
                                )}
                            </div>
                            {componente.precios.margen_utilidad && (
                                <div>
                                    <label className="text-xs text-gray-500">Margen de Utilidad</label>
                                    <p className="font-medium text-green-600">{componente.precios.margen_utilidad}%</p>
                                </div>
                            )}
                            <div>
                                <label className="text-xs text-gray-500">Moneda</label>
                                <p>{componente.precios.moneda || 'COP'}</p>
                            </div>
                        </div>
                    </InfoCard>

                    <InfoCard title="Proveedor Principal" icon={Building2}>
                        {componente.proveedor ? (
                            <div className="space-y-2 text-sm">
                                <p className="font-medium">{componente.proveedor.nombre}</p>
                                <p className="text-gray-500">NIT: {componente.proveedor.nit}</p>
                                {componente.proveedor.contacto && <p>Contacto: {componente.proveedor.contacto}</p>}
                                {componente.proveedor.telefono && <p>Tel: {componente.proveedor.telefono}</p>}
                                {componente.proveedor.email && <p>Email: {componente.proveedor.email}</p>}
                            </div>
                        ) : (
                            <p className="text-gray-400 text-sm">Sin proveedor asignado</p>
                        )}
                    </InfoCard>

                    {componente.reemplazado_por && (
                        <InfoCard title="Reemplazado Por" icon={TrendingUp}>
                            <Link
                                href={`/inventario/${componente.reemplazado_por.id}`}
                                className="text-blue-600 hover:underline"
                            >
                                {componente.reemplazado_por.codigo} - {componente.reemplazado_por.nombre}
                            </Link>
                        </InfoCard>
                    )}
                </div>
            )}

            {activeTab === 'kardex' && (
                <div className="bg-white rounded-lg border overflow-hidden">
                    <div className="p-4 border-b bg-gray-50">
                        <h3 className="font-semibold text-gray-700">Historial de Movimientos</h3>
                        <p className="text-sm text-gray-500">Total: {kardexData?.total_movimientos || 0} movimientos</p>
                    </div>

                    {loadingKardex ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                        </div>
                    ) : kardexData?.kardex?.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <History className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                            <p>No hay movimientos registrados</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-left">Fecha</th>
                                    <th className="px-4 py-3 text-left">Tipo</th>
                                    <th className="px-4 py-3 text-center">Entrada</th>
                                    <th className="px-4 py-3 text-center">Salida</th>
                                    <th className="px-4 py-3 text-center">Saldo</th>
                                    <th className="px-4 py-3 text-left">Referencia</th>
                                    <th className="px-4 py-3 text-left">Usuario</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {kardexData?.kardex?.map((mov) => (
                                    <tr key={mov.id_movimiento} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm">
                                            {new Date(mov.fecha).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={cn(
                                                'px-2 py-1 rounded text-xs font-medium',
                                                mov.tipo === 'ENTRADA' && 'bg-green-100 text-green-800',
                                                mov.tipo === 'SALIDA' && 'bg-red-100 text-red-800',
                                                mov.tipo === 'AJUSTE' && 'bg-blue-100 text-blue-800'
                                            )}>
                                                {mov.tipo}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {mov.entrada > 0 && (
                                                <span className="text-green-600 font-medium flex items-center justify-center gap-1">
                                                    <TrendingUp className="h-3 w-3" />
                                                    +{mov.entrada}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {mov.salida > 0 && (
                                                <span className="text-red-600 font-medium flex items-center justify-center gap-1">
                                                    <TrendingDown className="h-3 w-3" />
                                                    -{mov.salida}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-bold">
                                            {mov.saldo}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {mov.referencia}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {mov.realizado_por}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}
