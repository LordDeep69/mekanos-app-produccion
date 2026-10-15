// ═══════════════════════════════════════════════════════════════════════════════
// MEKANOS S.A.S - Portal Admin
// MODAL DE OPERACIONES FÍSICAS DE INVENTARIO (WMS / MOVIMIENTOS)
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import {
    ComponenteStock,
    useBodegas,
    useComponentesStock,
    useMotivosAjuste,
    useRegistrarAjuste,
    useRegistrarEntrada,
    useRegistrarSalida,
    useRegistrarTraslado,
} from '@/features/inventario/api/inventario-motor.service';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ArrowDownCircle,
    ArrowLeftRight,
    ArrowUpCircle,
    Check,
    CheckCircle2,
    FileSpreadsheet,
    Loader2,
    Package,
    Search,
    SlidersHorizontal,
    Warehouse,
    X,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import React, { useEffect, useState } from 'react';

export type TipoOperacionInventario = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'TRASLADO';

interface MovimientoModalProps {
    isOpen: boolean;
    onClose: () => void;
    tipo: TipoOperacionInventario;
    componentePreseleccionado?: ComponenteStock | null;
    onSuccess?: () => void;
}

export function MovimientoModal({
    isOpen,
    onClose,
    tipo,
    componentePreseleccionado,
    onSuccess,
}: MovimientoModalProps) {
    const { data: session } = useSession();
    const usuarioId = Number((session?.user as any)?.id) || 1;

    // Tipo de operación activo (permite conmutar dentro del modal unificado)
    const [operacionActiva, setOperacionActiva] = useState<TipoOperacionInventario>(tipo);

    useEffect(() => {
        setOperacionActiva(tipo);
    }, [tipo]);

    // Selección de Componente
    const [busqueda, setBusqueda] = useState('');
    const [componenteSeleccionado, setComponenteSeleccionado] = useState<ComponenteStock | null>(
        componentePreseleccionado || null
    );
    const [showDropdown, setShowDropdown] = useState(false);

    // Campos comunes
    const [cantidad, setCantidad] = useState<string>('');
    const [observaciones, setObservaciones] = useState('');
    const [justificacion, setJustificacion] = useState('');

    // Campos de Entrada
    const [costoUnitario, setCostoUnitario] = useState<string>('');
    const [bodegaEntrada, setBodegaEntrada] = useState<string>('');
    const [numeroLote, setNumeroLote] = useState('');
    const [fechaVencimiento, setFechaVencimiento] = useState('');
    const [numeroFactura, setNumeroFactura] = useState('');

    // Campos de Salida
    const [bodegaSalida, setBodegaSalida] = useState<string>('');
    const [motivoSalida, setMotivoSalida] = useState('DESPACHO_ORDEN');

    // Campos de Ajuste
    const [nuevoStock, setNuevoStock] = useState<string>('');
    const [motivoAjuste, setMotivoAjuste] = useState<string>('');

    // Campos de Traslado
    const [bodegaOrigen, setBodegaOrigen] = useState<string>('');
    const [bodegaDestino, setBodegaDestino] = useState<string>('');

    // Estados de UI
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    // Catálogos auxiliares
    const { data: componentesData } = useComponentesStock({
        busqueda: busqueda || undefined,
        limit: 10,
    });
    const { data: bodegas = [] } = useBodegas();
    const { data: motivosAjuste = [] } = useMotivosAjuste();

    // Mutations
    const entradaMutation = useRegistrarEntrada();
    const salidaMutation = useRegistrarSalida();
    const ajusteMutation = useRegistrarAjuste();
    const trasladoMutation = useRegistrarTraslado();

    // Sincronizar selección y reseteo
    useEffect(() => {
        if (!isOpen) {
            setBusqueda('');
            setComponenteSeleccionado(componentePreseleccionado || null);
            setCantidad('');
            setCostoUnitario('');
            setObservaciones('');
            setJustificacion('');
            setNuevoStock('');
            setNumeroLote('');
            setFechaVencimiento('');
            setNumeroFactura('');
            setError(null);
            setSuccess(false);
        } else {
            if (componentePreseleccionado) {
                setComponenteSeleccionado(componentePreseleccionado);
                setNuevoStock(componentePreseleccionado.stock_actual.toString());
            }
        }
    }, [isOpen, componentePreseleccionado]);

    // Autoseleccionar primera bodega activa
    useEffect(() => {
        if (bodegas.length > 0) {
            if (!bodegaEntrada) setBodegaEntrada(bodegas[0].id_ubicacion.toString());
            if (!bodegaSalida) setBodegaSalida(bodegas[0].id_ubicacion.toString());
            if (!bodegaOrigen) setBodegaOrigen(bodegas[0].id_ubicacion.toString());
            if (!bodegaDestino && bodegas.length > 1) setBodegaDestino(bodegas[1].id_ubicacion.toString());
        }
    }, [bodegas]);

    // Establecer costo unitario al cambiar componente para ENTRADA
    useEffect(() => {
        if (componenteSeleccionado && operacionActiva === 'ENTRADA') {
            setCostoUnitario(componenteSeleccionado.precio_compra?.toString() || '');
        }
        if (componenteSeleccionado && operacionActiva === 'AJUSTE') {
            setNuevoStock(componenteSeleccionado.stock_actual.toString());
        }
    }, [componenteSeleccionado, operacionActiva]);

    if (!isOpen) return null;

    const cantidadNum = parseFloat(cantidad) || 0;
    const stockActual = componenteSeleccionado?.stock_actual ?? 0;
    const nuevoStockNum = parseFloat(nuevoStock) || 0;
    const deltaAjuste = nuevoStockNum - stockActual;

    const isLoading =
        entradaMutation.isPending ||
        salidaMutation.isPending ||
        ajusteMutation.isPending ||
        trasladoMutation.isPending;

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!componenteSeleccionado) {
            setError('Debe seleccionar un componente del catálogo');
            return;
        }

        try {
            if (operacionActiva === 'ENTRADA') {
                const costo = parseFloat(costoUnitario) || 0;
                if (cantidadNum <= 0) {
                    setError('La cantidad a ingresar debe ser mayor a 0');
                    return;
                }
                if (costo < 0) {
                    setError('El costo unitario no puede ser negativo');
                    return;
                }

                await entradaMutation.mutateAsync({
                    id_componente: componenteSeleccionado.id_componente,
                    cantidad: cantidadNum,
                    costo_unitario: costo,
                    id_ubicacion: bodegaEntrada ? parseInt(bodegaEntrada, 10) : undefined,
                    numero_lote_fabricante: numeroLote.trim() || undefined,
                    fecha_vencimiento: fechaVencimiento || undefined,
                    numero_factura: numeroFactura.trim() || undefined,
                    observaciones: observaciones.trim() || undefined,
                    realizado_por: usuarioId,
                });

                setSuccessMsg(`Entrada registrada: +${cantidadNum} unidades agregadas al stock`);
            } else if (operacionActiva === 'SALIDA') {
                if (cantidadNum <= 0) {
                    setError('La cantidad a despachar debe ser mayor a 0');
                    return;
                }
                if (cantidadNum > stockActual) {
                    setError(`Stock insuficiente. Disponible actual: ${stockActual} ${componenteSeleccionado.unidad || 'UND'}`);
                    return;
                }

                await salidaMutation.mutateAsync({
                    id_componente: componenteSeleccionado.id_componente,
                    cantidad: cantidadNum,
                    id_ubicacion: bodegaSalida ? parseInt(bodegaSalida, 10) : undefined,
                    motivo: motivoSalida,
                    justificacion: justificacion.trim() || undefined,
                    observaciones: observaciones.trim() || undefined,
                    realizado_por: usuarioId,
                });

                setSuccessMsg(`Salida registrada: -${cantidadNum} unidades despachadas`);
            } else if (operacionActiva === 'AJUSTE') {
                if (isNaN(nuevoStockNum) || nuevoStockNum < 0) {
                    setError('El conteo físico o nuevo stock debe ser mayor o igual a 0');
                    return;
                }
                if (deltaAjuste === 0) {
                    setError('El nuevo stock es idéntico al actual; no hay variación para ajustar');
                    return;
                }
                if (!justificacion.trim()) {
                    setError('La justificación del ajuste físico es obligatoria por política de auditoría');
                    return;
                }

                await ajusteMutation.mutateAsync({
                    id_componente: componenteSeleccionado.id_componente,
                    cantidad_nueva: nuevoStockNum,
                    id_ubicacion: bodegaEntrada ? parseInt(bodegaEntrada, 10) : undefined,
                    motivo: motivoAjuste || 'CONTEO_FISICO',
                    justificacion: justificacion.trim(),
                    realizado_por: usuarioId,
                });

                setSuccessMsg(`Ajuste de inventario aplicado. Nuevo stock: ${nuevoStockNum} (Variación: ${deltaAjuste > 0 ? `+${deltaAjuste}` : deltaAjuste})`);
            } else if (operacionActiva === 'TRASLADO') {
                if (cantidadNum <= 0) {
                    setError('La cantidad a transferir debe ser mayor a 0');
                    return;
                }
                if (cantidadNum > stockActual) {
                    setError(`Stock insuficiente para trasladar. Disponible: ${stockActual}`);
                    return;
                }
                if (!bodegaOrigen || !bodegaDestino) {
                    setError('Debe seleccionar bodega de origen y de destino');
                    return;
                }
                if (bodegaOrigen === bodegaDestino) {
                    setError('La bodega de origen y destino no pueden ser la misma');
                    return;
                }

                await trasladoMutation.mutateAsync({
                    id_componente: componenteSeleccionado.id_componente,
                    cantidad: cantidadNum,
                    id_ubicacion_origen: parseInt(bodegaOrigen, 10),
                    id_ubicacion_destino: parseInt(bodegaDestino, 10),
                    justificacion: justificacion.trim() || undefined,
                    observaciones: observaciones.trim() || undefined,
                    realizado_por: usuarioId,
                });

                setSuccessMsg(`Traslado registrado: ${cantidadNum} unidades transferidas exitosamente`);
            }

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onSuccess?.();
                onClose();
            }, 1300);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Error en el procesamiento de la operación');
        }
    };

    // Configuración visual según tipo de operación (Paleta Clara Corporativa)
    const visualConfig = {
        ENTRADA: {
            title: 'Entrada de Inventario & Lote',
            subtitle: 'Ingreso físico de mercancía con trazabilidad de lote y costo unitario',
            icon: ArrowDownCircle,
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        },
        SALIDA: {
            title: 'Salida / Despacho Justificado',
            subtitle: 'Descargo de repuestos con trazabilidad por bodega y regla FIFO',
            icon: ArrowUpCircle,
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
            btnBg: 'bg-amber-600 hover:bg-amber-700 text-white',
        },
        AJUSTE: {
            title: 'Ajuste de Inventario (Conteo Físico / Merma)',
            subtitle: 'Regularización de existencias con justificación de auditoría obligatoria',
            icon: SlidersHorizontal,
            badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
            btnBg: 'bg-purple-600 hover:bg-purple-700 text-white',
        },
        TRASLADO: {
            title: 'Traslado Entre Bodegas / Ubicaciones',
            subtitle: 'Transferencia entre almacenes sin alterar el stock global de la empresa',
            icon: ArrowLeftRight,
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
            btnBg: 'bg-blue-600 hover:bg-blue-700 text-white',
        },
    }[operacionActiva];

    const Icon = visualConfig.icon;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={onClose} />

            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">
                {/* Header Corporativo Elegante */}
                <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className={cn('p-2.5 rounded-lg border', visualConfig.badgeClass)}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">{visualConfig.title}</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{visualConfig.subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
                    {/* Selector Segmentado de Operación */}
                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                        {(['ENTRADA', 'SALIDA', 'AJUSTE', 'TRASLADO'] as TipoOperacionInventario[]).map((op) => (
                            <button
                                key={op}
                                type="button"
                                onClick={() => {
                                    setOperacionActiva(op);
                                    setError(null);
                                }}
                                className={cn(
                                    'flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5',
                                    operacionActiva === op
                                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                                        : 'text-slate-600 hover:text-slate-900'
                                )}
                            >
                                {op === 'ENTRADA' && <ArrowDownCircle className="h-3.5 w-3.5 text-emerald-600" />}
                                {op === 'SALIDA' && <ArrowUpCircle className="h-3.5 w-3.5 text-amber-600" />}
                                {op === 'AJUSTE' && <SlidersHorizontal className="h-3.5 w-3.5 text-purple-600" />}
                                {op === 'TRASLADO' && <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600" />}
                                <span>{op === 'ENTRADA' ? 'Entrada' : op === 'SALIDA' ? 'Salida' : op === 'AJUSTE' ? 'Ajuste' : 'Traslado'}</span>
                            </button>
                        ))}
                    </div>
                    {error && (
                        <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="p-3 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {/* Selector de Componente */}
                    <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700 uppercase">
                            Artículo / Componente *
                        </label>
                        {componenteSeleccionado ? (
                            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {componenteSeleccionado.nombre || componenteSeleccionado.referencia}
                                    </p>
                                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                                        REF: {componenteSeleccionado.referencia} | CÓD: {componenteSeleccionado.codigo || '--'} | MARCA: {componenteSeleccionado.marca || '--'}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2 text-xs">
                                        <span className="text-slate-600 font-medium">Stock Actual:</span>
                                        <span className="font-bold text-blue-700">{componenteSeleccionado.stock_actual} {componenteSeleccionado.unidad || 'UND'}</span>
                                    </div>
                                </div>
                                {!componentePreseleccionado && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setComponenteSeleccionado(null);
                                            setBusqueda('');
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800 font-medium p-1"
                                    >
                                        Cambiar
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="relative">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por código, referencia o descripción..."
                                        value={busqueda}
                                        onChange={(e) => {
                                            setBusqueda(e.target.value);
                                            setShowDropdown(true);
                                        }}
                                        onFocus={() => setShowDropdown(true)}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {showDropdown && busqueda && (
                                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                        {(componentesData?.data || []).length === 0 ? (
                                            <p className="p-3 text-xs text-slate-500 text-center">No se encontraron componentes</p>
                                        ) : (
                                            (componentesData?.data || []).map((comp) => (
                                                <button
                                                    key={comp.id_componente}
                                                    type="button"
                                                    onClick={() => {
                                                        setComponenteSeleccionado(comp);
                                                        setShowDropdown(false);
                                                    }}
                                                    className="w-full text-left p-2.5 hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between"
                                                >
                                                    <div>
                                                        <p className="text-xs font-semibold text-slate-800">{comp.nombre || comp.referencia}</p>
                                                        <p className="text-[11px] text-slate-500">REF: {comp.referencia} - {comp.marca || 'S/M'}</p>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">Stock: {comp.stock_actual}</span>
                                                </button>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CAMPOS ESPECÍFICOS POR TIPO DE OPERACIÓN */}
                    {operacionActiva === 'ENTRADA' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Cantidad a Ingresar *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        step="any"
                                        placeholder="0"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Costo Unitario ($) *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0"
                                        value={costoUnitario}
                                        onChange={(e) => setCostoUnitario(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Bodega de Destino
                                    </label>
                                    <select
                                        value={bodegaEntrada}
                                        onChange={(e) => setBodegaEntrada(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    >
                                        {bodegas.map((b) => (
                                            <option key={b.id_ubicacion} value={b.id_ubicacion}>
                                                {b.codigo_ubicacion} - {b.zona}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Factura / Remisión
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="FAC-12345"
                                        value={numeroFactura}
                                        onChange={(e) => setNumeroFactura(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>

                            {/* Gestión de Lote */}
                            <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-lg space-y-2">
                                <span className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                                    <Package className="h-3.5 w-3.5" />
                                    Trazabilidad de Lote (Opcional)
                                </span>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                                            N° Lote Fabricante
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Ej: LOT-2026-X1"
                                            value={numeroLote}
                                            onChange={(e) => setNumeroLote(e.target.value)}
                                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-medium text-slate-600 mb-0.5">
                                            Fecha Vencimiento
                                        </label>
                                        <input
                                            type="date"
                                            value={fechaVencimiento}
                                            onChange={(e) => setFechaVencimiento(e.target.value)}
                                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {operacionActiva === 'SALIDA' && (
                        <>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Cantidad a Despachar *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={stockActual}
                                        placeholder="0"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-500"
                                        required
                                    />
                                    <span className="text-[11px] text-slate-500 mt-1 block">
                                        Máx: {stockActual} unidades disponibles
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Bodega Origen
                                    </label>
                                    <select
                                        value={bodegaSalida}
                                        onChange={(e) => setBodegaSalida(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    >
                                        {bodegas.map((b) => (
                                            <option key={b.id_ubicacion} value={b.id_ubicacion}>
                                                {b.codigo_ubicacion} - {b.zona}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Motivo de Salida
                                </label>
                                <select
                                    value={motivoSalida}
                                    onChange={(e) => setMotivoSalida(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                >
                                    <option value="DESPACHO_ORDEN">Despacho para Orden de Servicio (Taller/Campo)</option>
                                    <option value="VENTA_DIRECTA">Venta Directa de Repuesto a Cliente</option>
                                    <option value="GARANTIA">Reemplazo por Garantía</option>
                                    <option value="CONSUMO_INTERNO">Consumo Interno de Operaciones</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Justificación / OT Asociada
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Para OT-2026-089 o Mantenimiento de Generador"
                                    value={justificacion}
                                    onChange={(e) => setJustificacion(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                        </>
                    )}

                    {operacionActiva === 'AJUSTE' && (
                        <>
                            <div className="grid grid-cols-2 gap-3 p-3 bg-purple-50/70 border border-purple-200 rounded-lg">
                                <div>
                                    <span className="block text-xs text-purple-900 font-medium">Stock en Sistema:</span>
                                    <span className="text-xl font-bold text-slate-800">{stockActual} {componenteSeleccionado?.unidad || 'UND'}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-purple-900 font-medium">Variación (Delta):</span>
                                    <span className={cn(
                                        'text-xl font-bold',
                                        deltaAjuste > 0 ? 'text-emerald-600' : deltaAjuste < 0 ? 'text-red-600' : 'text-slate-600'
                                    )}>
                                        {deltaAjuste > 0 ? `+${deltaAjuste}` : deltaAjuste}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Conteo Físico Real *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="any"
                                        placeholder="0"
                                        value={nuevoStock}
                                        onChange={(e) => setNuevoStock(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-base font-bold text-purple-900 focus:ring-2 focus:ring-purple-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Motivo del Ajuste *
                                    </label>
                                    <select
                                        value={motivoAjuste}
                                        onChange={(e) => setMotivoAjuste(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    >
                                        <option value="CONTEO_FISICO">Conteo Físico / Inventario Cíclico</option>
                                        <option value="MERMA">Merma / Deterioro de Material</option>
                                        <option value="OBSOLESCENCIA">Baja por Obsolescencia</option>
                                        <option value="CORRECCION_DIGITACION">Corrección de Error de Digitación</option>
                                        {motivosAjuste.map((m) => (
                                            <option key={m.id_motivo_ajuste} value={m.codigo_motivo}>
                                                {m.nombre_motivo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Justificación Auditoría *
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Explicación detallada del motivo de la discrepancia física encontrada..."
                                    value={justificacion}
                                    onChange={(e) => setJustificacion(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                    required
                                />
                            </div>
                        </>
                    )}

                    {operacionActiva === 'TRASLADO' && (
                        <>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Cantidad a Trasladar *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max={stockActual}
                                    placeholder="0"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                                <span className="text-[11px] text-slate-500 mt-1 block">
                                    Stock disponible total: {stockActual} {componenteSeleccionado?.unidad || 'UND'}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Bodega Origen *
                                    </label>
                                    <select
                                        value={bodegaOrigen}
                                        onChange={(e) => setBodegaOrigen(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    >
                                        {bodegas.map((b) => (
                                            <option key={b.id_ubicacion} value={b.id_ubicacion}>
                                                {b.codigo_ubicacion} - {b.zona}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Bodega Destino *
                                    </label>
                                    <select
                                        value={bodegaDestino}
                                        onChange={(e) => setBodegaDestino(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                                    >
                                        {bodegas.map((b) => (
                                            <option
                                                key={b.id_ubicacion}
                                                value={b.id_ubicacion}
                                                disabled={b.id_ubicacion.toString() === bodegaOrigen}
                                            >
                                                {b.codigo_ubicacion} - {b.zona} {b.id_ubicacion.toString() === bodegaOrigen ? '(Origen)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Motivo del Traslado
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ej: Reabastecimiento de Taller, Despacho hacia Zona de Ensamble"
                                    value={justificacion}
                                    onChange={(e) => setJustificacion(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                        </>
                    )}

                    {/* Observaciones Generales */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                            Observaciones Adicionales
                        </label>
                        <input
                            type="text"
                            placeholder="Comentario o nota libre..."
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                        />
                    </div>

                    {/* Botones de acción */}
                    <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || success}
                            className={cn(
                                'px-5 py-2 text-sm font-semibold text-white rounded-lg flex items-center gap-2 shadow-xs transition-colors',
                                visualConfig.btnBg,
                                'disabled:opacity-50'
                            )}
                        >
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirmar Operación
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
