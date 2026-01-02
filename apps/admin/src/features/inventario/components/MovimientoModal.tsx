/**
 * MEKANOS S.A.S - Portal Admin
 * Modal de Movimiento de Inventario - FASE 6
 * 
 * Componente reutilizable para:
 * - Entrada de inventario
 * - Salida de inventario
 * - Ajuste de inventario
 */

'use client';

import {
    ComponenteStock,
    useComponentesStock,
    useRegistrarEntrada,
    useRegistrarSalida,
} from '@/features/inventario/api/inventario-motor.service';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ArrowDownCircle,
    ArrowUpCircle,
    Check,
    Loader2,
    Package,
    Search,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface MovimientoModalProps {
    isOpen: boolean;
    onClose: () => void;
    tipo: 'ENTRADA' | 'SALIDA';
    componentePreseleccionado?: ComponenteStock | null;
    onSuccess?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function MovimientoModal({
    isOpen,
    onClose,
    tipo,
    componentePreseleccionado,
    onSuccess,
}: MovimientoModalProps) {
    // Estados del formulario
    const [busqueda, setBusqueda] = useState('');
    const [componenteSeleccionado, setComponenteSeleccionado] = useState<ComponenteStock | null>(
        componentePreseleccionado || null
    );
    const [cantidad, setCantidad] = useState<string>('');
    const [costoUnitario, setCostoUnitario] = useState<string>('');
    const [observaciones, setObservaciones] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Hooks de datos
    const { data: componentesData } = useComponentesStock({
        busqueda: busqueda || undefined,
        limit: 10,
    });
    const entradaMutation = useRegistrarEntrada();
    const salidaMutation = useRegistrarSalida();

    // Resetear estados al cerrar
    useEffect(() => {
        if (!isOpen) {
            setBusqueda('');
            setComponenteSeleccionado(componentePreseleccionado || null);
            setCantidad('');
            setCostoUnitario('');
            setObservaciones('');
            setError(null);
            setSuccess(false);
        }
    }, [isOpen, componentePreseleccionado]);

    // Actualizar costo unitario al seleccionar componente (solo para entradas)
    useEffect(() => {
        if (componenteSeleccionado && tipo === 'ENTRADA') {
            setCostoUnitario(componenteSeleccionado.precio_compra?.toString() || '');
        }
    }, [componenteSeleccionado, tipo]);

    // Validación de stock para salidas
    const cantidadNum = parseInt(cantidad) || 0;
    const stockInsuficiente = tipo === 'SALIDA' &&
        !!componenteSeleccionado &&
        cantidadNum > componenteSeleccionado.stock_actual;

    const handleSubmit = async () => {
        if (!componenteSeleccionado || cantidadNum <= 0) {
            setError('Seleccione un componente y cantidad válida');
            return;
        }

        if (stockInsuficiente) {
            setError(`Stock insuficiente. Disponible: ${componenteSeleccionado.stock_actual}`);
            return;
        }

        try {
            setError(null);

            if (tipo === 'ENTRADA') {
                const costo = parseFloat(costoUnitario) || 0;
                if (costo <= 0) {
                    setError('Ingrese un costo unitario válido');
                    return;
                }

                await entradaMutation.mutateAsync({
                    id_componente: componenteSeleccionado.id_componente,
                    cantidad: cantidadNum,
                    costo_unitario: costo,
                    observaciones: observaciones || undefined,
                    realizado_por: 1, // TODO: Usuario de sesión
                });
            } else {
                await salidaMutation.mutateAsync({
                    id_componente: componenteSeleccionado.id_componente,
                    cantidad: cantidadNum,
                    observaciones: observaciones || undefined,
                    realizado_por: 1, // TODO: Usuario de sesión
                });
            }

            setSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 1500);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Error al procesar el movimiento');
        }
    };

    if (!isOpen) return null;

    const isLoading = entradaMutation.isPending || salidaMutation.isPending;
    const config = tipo === 'ENTRADA'
        ? { icon: ArrowDownCircle, color: 'green', title: 'Registrar Entrada' }
        : { icon: ArrowUpCircle, color: 'orange', title: 'Registrar Salida' };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className={cn(
                    'flex items-center justify-between px-6 py-4',
                    tipo === 'ENTRADA' ? 'bg-green-600' : 'bg-orange-600'
                )}>
                    <div className="flex items-center gap-3 text-white">
                        <config.icon className="h-6 w-6" />
                        <h2 className="text-lg font-semibold">{config.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {success ? (
                        <div className="flex flex-col items-center py-8">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                <Check className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-lg font-semibold text-green-700">
                                {tipo === 'ENTRADA' ? 'Entrada registrada' : 'Salida registrada'}
                            </h3>
                            <p className="text-gray-500 mt-1">
                                {cantidadNum} unidades de {componenteSeleccionado?.nombre || componenteSeleccionado?.referencia}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Selector de Componente */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Componente *
                                </label>
                                {componenteSeleccionado ? (
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                                        <Package className="h-5 w-5 text-gray-400" />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">
                                                {componenteSeleccionado.nombre || componenteSeleccionado.referencia}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {componenteSeleccionado.codigo || componenteSeleccionado.referencia} •
                                                Stock: <span className={cn(
                                                    'font-semibold',
                                                    componenteSeleccionado.estado_stock === 'AGOTADO' && 'text-red-600',
                                                    componenteSeleccionado.estado_stock === 'CRITICO' && 'text-orange-600',
                                                    componenteSeleccionado.estado_stock === 'BAJO' && 'text-yellow-600',
                                                    componenteSeleccionado.estado_stock === 'OK' && 'text-green-600'
                                                )}>
                                                    {componenteSeleccionado.stock_actual}
                                                </span>
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setComponenteSeleccionado(null);
                                                setBusqueda('');
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Buscar por código, nombre o referencia..."
                                                value={busqueda}
                                                onChange={(e) => {
                                                    setBusqueda(e.target.value);
                                                    setShowDropdown(true);
                                                }}
                                                onFocus={() => setShowDropdown(true)}
                                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                            />
                                        </div>

                                        {/* Dropdown de resultados */}
                                        {showDropdown && componentesData?.data && componentesData.data.length > 0 && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                                                {componentesData.data.map((comp) => (
                                                    <button
                                                        key={comp.id_componente}
                                                        onClick={() => {
                                                            setComponenteSeleccionado(comp);
                                                            setShowDropdown(false);
                                                            setBusqueda('');
                                                        }}
                                                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
                                                    >
                                                        <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-900 truncate">
                                                                {comp.nombre || comp.referencia}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {comp.codigo || comp.referencia} • {comp.marca}
                                                            </p>
                                                        </div>
                                                        <span className={cn(
                                                            'text-sm font-semibold',
                                                            comp.estado_stock === 'AGOTADO' && 'text-red-600',
                                                            comp.estado_stock === 'CRITICO' && 'text-orange-600',
                                                            comp.estado_stock === 'BAJO' && 'text-yellow-600',
                                                            comp.estado_stock === 'OK' && 'text-green-600'
                                                        )}>
                                                            {comp.stock_actual}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Cantidad */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Cantidad *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(e.target.value)}
                                    placeholder="Ingrese cantidad"
                                    className={cn(
                                        'w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500',
                                        stockInsuficiente && 'border-red-500 focus:ring-red-500'
                                    )}
                                />
                                {stockInsuficiente && (
                                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                                        <AlertCircle className="h-4 w-4" />
                                        Stock insuficiente. Disponible: {componenteSeleccionado?.stock_actual}
                                    </p>
                                )}
                            </div>

                            {/* Costo Unitario (solo para entradas) */}
                            {tipo === 'ENTRADA' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Costo Unitario *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={costoUnitario}
                                            onChange={(e) => setCostoUnitario(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    {componenteSeleccionado?.precio_compra && (
                                        <p className="mt-1 text-xs text-gray-500">
                                            Último precio: ${componenteSeleccionado.precio_compra.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Observaciones */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Observaciones
                                </label>
                                <textarea
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Notas adicionales sobre este movimiento..."
                                    rows={2}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                />
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!success && (
                    <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !componenteSeleccionado || cantidadNum <= 0 || stockInsuficiente}
                            className={cn(
                                'px-6 py-2 rounded-lg font-medium text-white transition-colors flex items-center gap-2',
                                tipo === 'ENTRADA'
                                    ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-300'
                                    : 'bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300'
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    {tipo === 'ENTRADA' ? (
                                        <ArrowDownCircle className="h-4 w-4" />
                                    ) : (
                                        <ArrowUpCircle className="h-4 w-4" />
                                    )}
                                    Confirmar {tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
