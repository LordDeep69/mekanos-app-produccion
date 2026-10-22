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
import { getClienteNombre, useOrdenes, type Orden } from '@/features/ordenes';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ArrowDownCircle,
    ArrowLeftRight,
    ArrowUpCircle,
    Check,
    CheckCircle2,
    FileSpreadsheet,
    Layers,
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
    const [loteSalida, setLoteSalida] = useState<string>('');
    const [busquedaOrden, setBusquedaOrden] = useState<string>('');
    const [ordenSeleccionada, setOrdenSeleccionada] = useState<Orden | null>(null);
    const [showOrdenDropdown, setShowOrdenDropdown] = useState<boolean>(false);

    // Campos de Ajuste
    const [bodegaAjuste, setBodegaAjuste] = useState<string>('');
    const [nuevoStock, setNuevoStock] = useState<string>('');
    const [motivoAjuste, setMotivoAjuste] = useState<string>('');

    // Campos de Traslado
    const [bodegaOrigen, setBodegaOrigen] = useState<string>('');
    const [bodegaDestino, setBodegaDestino] = useState<string>('');
    const [loteTraslado, setLoteTraslado] = useState<string>('');

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
    const { data: ordenesData, isLoading: isLoadingOrdenes } = useOrdenes({
        busqueda: busquedaOrden || undefined,
        limit: 12,
    });

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
            setLoteSalida('');
            setLoteTraslado('');
            setBusquedaOrden('');
            setOrdenSeleccionada(null);
            setShowOrdenDropdown(false);
            setError(null);
            setSuccess(false);
        } else {
            if (componentePreseleccionado) {
                setComponenteSeleccionado(componentePreseleccionado);
                setNuevoStock(componentePreseleccionado.stock_actual.toString());
            }
        }
    }, [isOpen, componentePreseleccionado]);

    // Bodegas efectivas del componente con resolución Zero-Trust (.bodegas o .lotes_activos)
    const bodegasEfectivas = React.useMemo(() => {
        if (componenteSeleccionado?.bodegas && componenteSeleccionado.bodegas.length > 0) {
            return componenteSeleccionado.bodegas;
        }
        if (componenteSeleccionado?.lotes_activos && componenteSeleccionado.lotes_activos.length > 0) {
            const bMap = new Map<number, { id_ubicacion: number; codigo: string; nombre: string; stock: number }>();
            for (const l of componenteSeleccionado.lotes_activos) {
                const cod = l.bodega_codigo || (l as any).bodega || 'BOD-CENTRAL';
                const idU = l.id_ubicacion || (cod === 'BOD-FLUIDOS' ? 2 : cod === 'MOVIL-01' ? 3 : 1);
                const nom = l.bodega_nombre || (l as any).zona || (idU === 2 ? 'Almacén de Lubricantes y Químicos' : idU === 3 ? 'Unidad Móvil' : 'Bodega Central Taller');
                const exist = bMap.get(idU) || { id_ubicacion: idU, codigo: cod, nombre: nom, stock: 0 };
                exist.stock += Number(l.cantidad_actual || 0);
                bMap.set(idU, exist);
            }
            return Array.from(bMap.values());
        }
        if (componenteSeleccionado && componenteSeleccionado.stock_actual > 0) {
            return [{
                id_ubicacion: 1,
                codigo: 'BOD-CENTRAL',
                nombre: 'Bodega Central Taller',
                stock: componenteSeleccionado.stock_actual,
            }];
        }
        return [];
    }, [componenteSeleccionado]);

    // Lotes activos garantizados con id_ubicacion para filtrado FIFO en Salida y Traslado
    const lotesActivosEfectivos = React.useMemo(() => {
        if (!componenteSeleccionado?.lotes_activos) return [];
        return componenteSeleccionado.lotes_activos.map((l: any) => {
            const cod = l.bodega_codigo || l.bodega || 'BOD-CENTRAL';
            const idU = l.id_ubicacion || (cod === 'BOD-FLUIDOS' ? 2 : cod === 'MOVIL-01' ? 3 : 1);
            return {
                ...l,
                id_ubicacion: idU,
                bodega_codigo: cod,
                bodega_nombre: l.bodega_nombre || l.zona || 'Bodega Central Taller',
            };
        });
    }, [componenteSeleccionado]);

    // Encontrar primera bodega con existencias reales (stock > 0) para el ítem
    const getBodegaConStock = (comp: ComponenteStock | null, fallbackId?: string): string => {
        if (!comp) return fallbackId || (bodegas[0]?.id_ubicacion?.toString() || '1');
        const bList = (comp.bodegas && comp.bodegas.length > 0) ? comp.bodegas : bodegasEfectivas;
        if (!bList || bList.length === 0) {
            return fallbackId || (bodegas[0]?.id_ubicacion?.toString() || '1');
        }
        const bodegaConSaldo = bList.find((b) => b.stock > 0);
        if (bodegaConSaldo) return bodegaConSaldo.id_ubicacion.toString();
        return fallbackId || (bodegas[0]?.id_ubicacion?.toString() || '1');
    };

    // Preselección inteligente de bodegas según existencias del componente
    useEffect(() => {
        if (!isOpen || bodegas.length === 0) return;

        const defaultId = bodegas[0].id_ubicacion.toString();
        const bestBodegaId = getBodegaConStock(componenteSeleccionado, defaultId);

        if (!bodegaEntrada) setBodegaEntrada(defaultId);
        setBodegaSalida(bestBodegaId);
        setBodegaAjuste(bestBodegaId);
        setBodegaOrigen(bestBodegaId);

        // En traslado, seleccionar un destino diferente al origen
        const destinoDiff = bodegas.find((b) => b.id_ubicacion.toString() !== bestBodegaId);
        setBodegaDestino(destinoDiff ? destinoDiff.id_ubicacion.toString() : defaultId);

        if (componenteSeleccionado) {
            const stockAudit = bodegasEfectivas.find((b) => b.id_ubicacion.toString() === bestBodegaId)?.stock ?? 0;
            setNuevoStock(stockAudit.toString());
            if (operacionActiva === 'ENTRADA') {
                setCostoUnitario(componenteSeleccionado.precio_compra?.toString() || '');
            }
        }
    }, [isOpen, componenteSeleccionado, bodegasEfectivas, operacionActiva, bodegas]);

    if (!isOpen) return null;

    const cantidadNum = parseFloat(cantidad) || 0;
    const stockActual = componenteSeleccionado?.stock_actual ?? 0;
    const nuevoStockNum = parseFloat(nuevoStock) || 0;

    // Métricas por bodega para cálculos de stock (Estricto Cero Trust con bodegasEfectivas)
    const bodegaAjusteId = parseInt(bodegaAjuste, 10);
    const stockEnBodegaAjuste =
        bodegasEfectivas.find((b) => b.id_ubicacion === bodegaAjusteId)?.stock ?? 0;
    const deltaAjuste = nuevoStockNum - stockEnBodegaAjuste;

    const bodegaSalidaId = parseInt(bodegaSalida, 10);
    const stockEnBodegaSalida =
        bodegasEfectivas.find((b) => b.id_ubicacion === bodegaSalidaId)?.stock ?? 0;

    const bodegaOrigenId = parseInt(bodegaOrigen, 10);
    const stockEnBodegaOrigen =
        bodegasEfectivas.find((b) => b.id_ubicacion === bodegaOrigenId)?.stock ?? 0;

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
                if (cantidadNum > stockEnBodegaSalida) {
                    const bodNom = bodegas.find((b) => b.id_ubicacion === bodegaSalidaId)?.zona || 'la bodega seleccionada';
                    setError(`Stock insuficiente en ${bodNom}. Disponible: ${stockEnBodegaSalida} ${componenteSeleccionado.unidad || 'UND'}`);
                    return;
                }

                const idOrdenFk =
                    motivoSalida === 'DESPACHO_ORDEN' && ordenSeleccionada
                        ? ordenSeleccionada.id_orden_servicio
                        : undefined;

                await salidaMutation.mutateAsync({
                    id_componente: componenteSeleccionado.id_componente,
                    cantidad: cantidadNum,
                    id_ubicacion: bodegaSalida ? parseInt(bodegaSalida, 10) : undefined,
                    id_lote: loteSalida ? parseInt(loteSalida, 10) : undefined,
                    id_orden_servicio: idOrdenFk,
                    motivo: motivoSalida,
                    justificacion:
                        justificacion.trim() ||
                        (ordenSeleccionada ? `Despacho WMS a Orden ${ordenSeleccionada.numero_orden}` : undefined),
                    observaciones: observaciones.trim() || undefined,
                    realizado_por: usuarioId,
                });

                setSuccessMsg(
                    ordenSeleccionada && motivoSalida === 'DESPACHO_ORDEN'
                        ? `Salida registrada: -${cantidadNum} ${componenteSeleccionado.unidad || 'UND'} despachadas e imputadas a ${ordenSeleccionada.numero_orden}`
                        : `Salida registrada: -${cantidadNum} unidades despachadas`
                );
            } else if (operacionActiva === 'AJUSTE') {
                if (!bodegaAjuste) {
                    setError('Debe seleccionar la bodega auditada');
                    return;
                }
                if (isNaN(nuevoStockNum) || nuevoStockNum < 0) {
                    setError('El conteo físico o nuevo stock debe ser mayor o igual a 0');
                    return;
                }
                if (deltaAjuste === 0) {
                    setError('El nuevo conteo físico coincide con el inventario registrado en esta bodega; no hay variación para ajustar');
                    return;
                }
                if (!justificacion.trim()) {
                    setError('La justificación del ajuste físico es obligatoria por política de auditoría');
                    return;
                }

                await ajusteMutation.mutateAsync({
                    id_componente: componenteSeleccionado.id_componente,
                    cantidad_nueva: nuevoStockNum,
                    id_ubicacion: parseInt(bodegaAjuste, 10),
                    motivo: motivoAjuste || 'CONTEO_FISICO',
                    justificacion: justificacion.trim(),
                    realizado_por: usuarioId,
                });

                setSuccessMsg(`Ajuste de inventario aplicado en bodega. Nuevo stock: ${nuevoStockNum} (Variación: ${deltaAjuste > 0 ? `+${deltaAjuste}` : deltaAjuste})`);
            } else if (operacionActiva === 'TRASLADO') {
                if (cantidadNum <= 0) {
                    setError('La cantidad a transferir debe ser mayor a 0');
                    return;
                }
                if (cantidadNum > stockEnBodegaOrigen) {
                    const bodNom = bodegas.find((b) => b.id_ubicacion === bodegaOrigenId)?.zona || 'la bodega origen';
                    setError(`Stock insuficiente en ${bodNom}. Disponible: ${stockEnBodegaOrigen} ${componenteSeleccionado.unidad || 'UND'}`);
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
                    id_lote: loteTraslado ? parseInt(loteTraslado, 10) : undefined,
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

            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
                {/* Header Corporativo Elegante */}
                <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={cn('p-2 rounded-lg border', visualConfig.badgeClass)}>
                            <Icon className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">{visualConfig.title}</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{visualConfig.subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Formulario con Scroll Interno y Footer Fijo */}
                <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
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
                            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl shadow-2xs space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-slate-800 bg-slate-200/80 px-2 py-0.5 rounded border border-slate-300/60">
                                            {componenteSeleccionado.codigo || `ART-${componenteSeleccionado.id_componente}`}
                                        </span>
                                        <p className="text-sm font-bold text-slate-900">
                                            {componenteSeleccionado.nombre || componenteSeleccionado.referencia}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setComponenteSeleccionado(null);
                                            setBusqueda('');
                                        }}
                                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-blue-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs shrink-0"
                                    >
                                        Cambiar artículo
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Ref: <span className="font-semibold text-slate-700">{componenteSeleccionado.referencia}</span> | Marca: <span className="font-semibold text-slate-700">{componenteSeleccionado.marca || 'N/A'}</span>
                                </p>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-500 font-medium">Stock Global:</span>
                                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                        {componenteSeleccionado.stock_actual} {componenteSeleccionado.unidad || 'UND'}
                                    </span>
                                    {componenteSeleccionado.precio_compra && componenteSeleccionado.precio_compra > 0 && (
                                        <span className="text-slate-400 text-[11px]">
                                            • Costo base: ${Number(componenteSeleccionado.precio_compra).toLocaleString('es-CO')} COP
                                        </span>
                                    )}
                                </div>
                                {componenteSeleccionado.bodegas && componenteSeleccionado.bodegas.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                                        <span className="text-[11px] text-slate-500 font-medium">Desglose por Bodega:</span>
                                        {componenteSeleccionado.bodegas.map((b) => (
                                            <span
                                                key={b.id_ubicacion}
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] text-slate-700 shadow-2xs"
                                                title={`${b.nombre}: ${b.stock} ${componenteSeleccionado.unidad || 'UND'}`}
                                            >
                                                <span className="font-semibold text-slate-500">{b.codigo}:</span>
                                                <span className="font-bold text-slate-900">{b.stock}</span>
                                            </span>
                                        ))}
                                    </div>
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
                                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
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
                                                    className="w-full text-left p-2.5 hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between transition-colors"
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                {comp.codigo || `ART-${comp.id_componente}`}
                                                            </span>
                                                            <p className="text-xs font-bold text-slate-900">{comp.nombre || comp.referencia}</p>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">REF: {comp.referencia} • Marca: {comp.marca || 'S/M'}</p>
                                                    </div>
                                                    <div className="text-right shrink-0 ml-3">
                                                        <span className="text-xs font-bold text-slate-800 block">Stock: {comp.stock_actual} {comp.unidad || 'UND'}</span>
                                                        {comp.precio_compra ? (
                                                            <span className="text-[10px] text-slate-400 font-mono">${Number(comp.precio_compra).toLocaleString('es-CO')}</span>
                                                        ) : null}
                                                    </div>
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
                                    {Number(costoUnitario) > 0 && (
                                        <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                                            Preview: $ {Number(costoUnitario).toLocaleString('es-CO')} COP
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Bodega de Destino *
                                    </label>
                                    <select
                                        value={bodegaEntrada}
                                        onChange={(e) => setBodegaEntrada(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 truncate"
                                        required
                                    >
                                        {bodegas.map((b) => (
                                            <option key={b.id_ubicacion} value={b.id_ubicacion}>
                                                [{b.codigo_ubicacion}] {b.zona || 'Bodega Principal'}
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
                            {lotesActivosEfectivos.length > 0 && (
                                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-amber-900 flex items-center gap-1.5">
                                            <Layers className="h-3.5 w-3.5 text-amber-700" />
                                            Lotes Físicos Disponibles (Sugerencia FIFO/FEFO)
                                        </span>
                                        <span className="text-[10px] text-amber-800 font-semibold uppercase">
                                            {lotesActivosEfectivos.length} {lotesActivosEfectivos.length === 1 ? 'lote' : 'lotes'}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {lotesActivosEfectivos.map((lote) => (
                                            <span
                                                key={lote.id_lote}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-amber-200 rounded font-mono text-[11px] text-slate-800 shadow-2xs"
                                            >
                                                <strong>{lote.codigo_lote}</strong>: {lote.cantidad_actual} {componenteSeleccionado?.unidad || 'UND'}
                                                {lote.fecha_vencimiento && (
                                                    <span className="text-[10px] text-slate-400 font-sans">
                                                        (Vence: {new Date(lote.fecha_vencimiento).toLocaleDateString('es-CO')})
                                                    </span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Bodega Origen *
                                    </label>
                                    <select
                                        value={bodegaSalida}
                                        onChange={(e) => {
                                            setBodegaSalida(e.target.value);
                                            setLoteSalida('');
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 truncate"
                                        required
                                    >
                                        {bodegas.map((b) => {
                                            const s = bodegasEfectivas.find((x) => x.id_ubicacion === b.id_ubicacion)?.stock ?? 0;
                                            const zonaCorta = (b.zona || 'Bodega Principal')
                                                .replace('Almacén de Lubricantes y Químicos', 'Almacén Lubricantes')
                                                .replace('Bodega Central Taller', 'Taller Central')
                                                .replace('Unidad Móvil Servicio', 'Unidad Móvil');
                                            return (
                                                <option key={b.id_ubicacion} value={b.id_ubicacion}>
                                                    [{b.codigo_ubicacion}] (Disp: {s} {componenteSeleccionado?.unidad || 'UND'}) • {zonaCorta}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Cantidad a Despachar *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={stockEnBodegaSalida > 0 ? stockEnBodegaSalida : 1}
                                        disabled={stockEnBodegaSalida <= 0}
                                        placeholder="0"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        className={cn(
                                            'w-full px-3 py-2 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-500',
                                            stockEnBodegaSalida <= 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'border-slate-300'
                                        )}
                                        required
                                    />
                                    <span className={cn(
                                        'text-[11px] font-medium mt-1 block',
                                        stockEnBodegaSalida > 0 ? 'text-slate-500' : 'text-rose-600 font-semibold'
                                    )}>
                                        {stockEnBodegaSalida > 0
                                            ? `Disponible en bodega: ${stockEnBodegaSalida} ${componenteSeleccionado?.unidad || 'UND'}`
                                            : `⚠️ Sin existencias en esta bodega (${stockEnBodegaSalida} ${componenteSeleccionado?.unidad || 'UND'}). Despacho no disponible.`}
                                    </span>
                                </div>
                            </div>

                            {/* Selector de Lote Específico si hay varios */}
                            {lotesActivosEfectivos.length > 0 && (
                                <div className="space-y-1">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Lote a Despachar (FIFO)
                                    </label>
                                    <select
                                        value={loteSalida}
                                        onChange={(e) => setLoteSalida(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500"
                                    >
                                        <option value="">-- Regla Automática FIFO / FEFO (Recomendado) --</option>
                                        {lotesActivosEfectivos
                                            .filter((l) => !bodegaSalida || l.id_ubicacion === parseInt(bodegaSalida, 10))
                                            .map((lote) => (
                                                <option key={lote.id_lote} value={lote.id_lote}>
                                                    [{lote.codigo_lote}] Disp: {lote.cantidad_actual} {componenteSeleccionado?.unidad || 'UND'} {lote.fecha_vencimiento ? `• Vence: ${new Date(lote.fecha_vencimiento).toLocaleDateString('es-CO')}` : ''}
                                                </option>
                                            ))}
                                    </select>
                                    {lotesActivosEfectivos.filter((l) => !bodegaSalida || l.id_ubicacion === parseInt(bodegaSalida, 10)).length === 0 && (
                                        <p className="text-[11px] text-amber-700 italic">No hay lotes con existencias en la bodega seleccionada.</p>
                                    )}
                                </div>
                            )}

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

                            {motivoSalida === 'DESPACHO_ORDEN' && (
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Orden de Servicio Destino (Imputación Transaccional WMS ⇄ OS)
                                    </label>
                                    {ordenSeleccionada ? (
                                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-xs font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-300">
                                                        {ordenSeleccionada.numero_orden}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-900">
                                                        {getClienteNombre(ordenSeleccionada)}
                                                    </span>
                                                    {ordenSeleccionada.estados_orden?.nombre_estado && (
                                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                                                            {ordenSeleccionada.estados_orden.nombre_estado}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOrdenSeleccionada(null);
                                                        setBusquedaOrden('');
                                                    }}
                                                    className="px-2 py-1 text-[11px] font-semibold text-amber-800 bg-white hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors shrink-0 cursor-pointer"
                                                >
                                                    Cambiar OT
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-emerald-800 font-medium">
                                                ✓ Al confirmar, se asentará en Kardex como CONSUMO_OS y se agregará automáticamente a los Repuestos & Costos de {ordenSeleccionada.numero_orden}.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    type="text"
                                                    placeholder="Buscar Orden de Servicio por código (Ej: OS-2026) o cliente..."
                                                    value={busquedaOrden}
                                                    onChange={(e) => {
                                                        setBusquedaOrden(e.target.value);
                                                        setShowOrdenDropdown(true);
                                                    }}
                                                    onFocus={() => setShowOrdenDropdown(true)}
                                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                                                />
                                            </div>
                                            {showOrdenDropdown && (
                                                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                                                    {isLoadingOrdenes ? (
                                                        <div className="p-3 text-xs text-slate-500 flex items-center justify-center gap-2">
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                                                            Buscando órdenes activas...
                                                        </div>
                                                    ) : (ordenesData?.data || []).length === 0 ? (
                                                        <p className="p-3 text-xs text-slate-500 text-center">
                                                            No se encontraron órdenes con ese criterio
                                                        </p>
                                                    ) : (
                                                        (ordenesData?.data || []).map((ord) => {
                                                            const eqCod =
                                                                ord.equipos?.codigo_equipo ||
                                                                ord.ordenes_equipos?.[0]?.equipo?.codigo_equipo ||
                                                                '';
                                                            return (
                                                                <button
                                                                    key={ord.id_orden_servicio}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setOrdenSeleccionada(ord);
                                                                        setShowOrdenDropdown(false);
                                                                    }}
                                                                    className="w-full text-left p-2.5 hover:bg-amber-50/60 border-b border-slate-100 flex items-center justify-between transition-colors cursor-pointer"
                                                                >
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                                {ord.numero_orden}
                                                                            </span>
                                                                            <span className="text-xs font-bold text-slate-800">
                                                                                {getClienteNombre(ord)}
                                                                            </span>
                                                                        </div>
                                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                                            {eqCod ? `Equipo: ${eqCod} • ` : ''}
                                                                            {ord.tipos_servicio?.nombre_tipo || 'Servicio Técnico'}
                                                                        </p>
                                                                    </div>
                                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 shrink-0 ml-2">
                                                                        {ord.estados_orden?.nombre_estado || ord.estados_orden?.codigo_estado || 'ACTIVA'}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Justificación / Nota de Despacho {motivoSalida === 'DESPACHO_ORDEN' && ordenSeleccionada ? '(Opcional)' : ''}
                                </label>
                                <input
                                    type="text"
                                    placeholder={
                                        motivoSalida === 'DESPACHO_ORDEN' && ordenSeleccionada
                                            ? `Despacho WMS a Orden ${ordenSeleccionada.numero_orden} (o escriba nota adicional)`
                                            : 'Ej: Para mantenimiento correctivo o reemplazo preventivo en campo'
                                    }
                                    value={justificacion}
                                    onChange={(e) => setJustificacion(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                        </>
                    )}

                    {operacionActiva === 'AJUSTE' && (
                        <>
                            <div className="grid grid-cols-3 gap-2.5 p-3.5 bg-purple-50/70 border border-purple-200 rounded-xl">
                                <div>
                                    <span className="block text-[11px] text-purple-900 font-semibold uppercase">Stock en Bodega Auditada:</span>
                                    <span className="text-lg font-bold text-slate-900">{stockEnBodegaAjuste} {componenteSeleccionado?.unidad || 'UND'}</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] text-purple-900 font-semibold uppercase">Stock Global en Sistema:</span>
                                    <span className="text-lg font-bold text-slate-700">{stockActual} {componenteSeleccionado?.unidad || 'UND'}</span>
                                </div>
                                <div>
                                    <span className="block text-[11px] text-purple-900 font-semibold uppercase">Variación (Delta):</span>
                                    <span className={cn(
                                        'text-lg font-bold font-mono',
                                        deltaAjuste > 0 ? 'text-emerald-600' : deltaAjuste < 0 ? 'text-red-600' : 'text-slate-600'
                                    )}>
                                        {deltaAjuste > 0 ? `+${deltaAjuste}` : deltaAjuste}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Bodega Auditada *
                                    </label>
                                    <select
                                        value={bodegaAjuste}
                                        onChange={(e) => {
                                            setBodegaAjuste(e.target.value);
                                            const bId = parseInt(e.target.value, 10);
                                            const s = bodegasEfectivas.find((x) => x.id_ubicacion === bId)?.stock ?? 0;
                                            setNuevoStock(s.toString());
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-purple-500 truncate"
                                        required
                                    >
                                        {bodegas.map((b) => {
                                            const s = bodegasEfectivas.find((x) => x.id_ubicacion === b.id_ubicacion)?.stock ?? 0;
                                            const zonaCorta = (b.zona || 'Bodega Principal')
                                                .replace('Almacén de Lubricantes y Químicos', 'Almacén Lubricantes')
                                                .replace('Bodega Central Taller', 'Taller Central')
                                                .replace('Unidad Móvil Servicio', 'Unidad Móvil');
                                            return (
                                                <option key={b.id_ubicacion} value={b.id_ubicacion}>
                                                    [{b.codigo_ubicacion}] (Disp: {s} {componenteSeleccionado?.unidad || 'UND'}) • {zonaCorta}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
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

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                    Justificación Auditoría *
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Explicación detallada del motivo de la discrepancia física encontrada en la bodega auditada..."
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
                            {lotesActivosEfectivos.length > 0 && (
                                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-bold text-blue-900 flex items-center gap-1.5">
                                            <Layers className="h-3.5 w-3.5 text-blue-700" />
                                            Lotes Físicos Disponibles para Traslado
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                                        {lotesActivosEfectivos.map((lote) => (
                                            <span
                                                key={lote.id_lote}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 rounded font-mono text-[11px] text-slate-800 shadow-2xs"
                                            >
                                                <strong>{lote.codigo_lote}</strong>: {lote.cantidad_actual} {componenteSeleccionado?.unidad || 'UND'}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Bodega Origen *
                                    </label>
                                    <select
                                        value={bodegaOrigen}
                                        onChange={(e) => {
                                            setBodegaOrigen(e.target.value);
                                            setLoteTraslado('');
                                            if (bodegaDestino === e.target.value) {
                                                const otra = bodegas.find((b) => b.id_ubicacion.toString() !== e.target.value);
                                                if (otra) setBodegaDestino(otra.id_ubicacion.toString());
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 truncate"
                                        required
                                    >
                                        {bodegas.map((b) => {
                                            const s = bodegasEfectivas.find((x) => x.id_ubicacion === b.id_ubicacion)?.stock ?? 0;
                                            const zonaCorta = (b.zona || 'Bodega Principal')
                                                .replace('Almacén de Lubricantes y Químicos', 'Almacén Lubricantes')
                                                .replace('Bodega Central Taller', 'Taller Central')
                                                .replace('Unidad Móvil Servicio', 'Unidad Móvil');
                                            return (
                                                <option key={b.id_ubicacion} value={b.id_ubicacion}>
                                                    [{b.codigo_ubicacion}] (Disp: {s} {componenteSeleccionado?.unidad || 'UND'}) • {zonaCorta}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Bodega Destino *
                                    </label>
                                    <select
                                        value={bodegaDestino}
                                        onChange={(e) => setBodegaDestino(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 truncate"
                                        required
                                    >
                                        {bodegas.map((b) => (
                                            <option
                                                key={b.id_ubicacion}
                                                value={b.id_ubicacion}
                                                disabled={b.id_ubicacion.toString() === bodegaOrigen}
                                            >
                                                [{b.codigo_ubicacion}] {b.zona || 'Bodega Principal'} {b.id_ubicacion.toString() === bodegaOrigen ? '(Origen)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Cantidad a Trasladar *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={stockEnBodegaOrigen > 0 ? stockEnBodegaOrigen : 1}
                                        disabled={stockEnBodegaOrigen <= 0}
                                        placeholder="0"
                                        value={cantidad}
                                        onChange={(e) => setCantidad(e.target.value)}
                                        className={cn(
                                            'w-full px-3 py-2 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500',
                                            stockEnBodegaOrigen <= 0 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'border-slate-300'
                                        )}
                                        required
                                    />
                                    <span className={cn(
                                        'text-[11px] font-medium mt-1 block',
                                        stockEnBodegaOrigen > 0 ? 'text-slate-500' : 'text-rose-600 font-semibold'
                                    )}>
                                        {stockEnBodegaOrigen > 0
                                            ? `Disponible en origen: ${stockEnBodegaOrigen} ${componenteSeleccionado?.unidad || 'UND'}`
                                            : `⚠️ Sin existencias en origen (${stockEnBodegaOrigen} ${componenteSeleccionado?.unidad || 'UND'}). Traslado no disponible.`}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Lote a Trasladar (FIFO)
                                    </label>
                                    <select
                                        value={loteTraslado}
                                        onChange={(e) => setLoteTraslado(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Asignación Automática FIFO --</option>
                                        {(lotesActivosEfectivos || [])
                                            .filter((l) => !bodegaOrigen || l.id_ubicacion === parseInt(bodegaOrigen, 10))
                                            .map((lote) => (
                                                <option key={lote.id_lote} value={lote.id_lote}>
                                                    {lote.codigo_lote} (Disp: {lote.cantidad_actual})
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
                </div>

                {/* Botones de acción - Footer Sticky / Fijo */}
                <div className="px-5 py-3 bg-slate-50/90 backdrop-blur-xs border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200/60 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading || success}
                        className={cn(
                            'px-5 py-2 text-sm font-semibold text-white rounded-lg flex items-center gap-2 shadow-xs transition-colors cursor-pointer',
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
