/**
 * MEKANOS S.A.S - Portal Admin
 * Edición de Orden de Servicio
 * 
 * Ruta: /ordenes/[id]/editar
 * 
 * Permite editar campos básicos de una orden:
 * - Prioridad
 * - Fecha programada
 * - Descripción inicial
 * - Observaciones del técnico
 * - Tipo de servicio
 * - Sede del cliente
 * 
 * RESTRICCIÓN: Solo se puede editar si el estado NO es final (APROBADA, CANCELADA)
 */

'use client';

import { useOrden, useTiposServicio, useUpdateOrden } from '@/features/ordenes';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ArrowLeft,
    Calendar,
    Check,
    FileText,
    Loader2,
    Save,
    Settings,
    Tag,
    X,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════════

interface FormData {
    prioridad: string;
    fecha_programada: string;
    descripcion_inicial: string;
    observaciones_tecnico: string;
    id_tipo_servicio: number | null;
    origen_solicitud: string;
}

const PRIORIDADES = [
    { value: 'NORMAL', label: 'Normal', color: 'bg-blue-100 text-blue-800' },
    { value: 'ALTA', label: 'Alta', color: 'bg-orange-100 text-orange-800' },
    { value: 'URGENTE', label: 'Urgente', color: 'bg-red-100 text-red-800' },
    { value: 'EMERGENCIA', label: 'Emergencia', color: 'bg-purple-100 text-purple-800' },
];

const ORIGENES = [
    { value: 'PROGRAMADO', label: 'Programado (Cronograma)' },
    { value: 'CLIENTE', label: 'Solicitud Cliente' },
    { value: 'INTERNO', label: 'Hallazgo Interno' },
    { value: 'EMERGENCIA', label: 'Emergencia' },
    { value: 'GARANTIA', label: 'Garantía' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function EditarOrdenPage() {
    const params = useParams();
    const router = useRouter();
    const ordenId = Number(params.id);

    // Queries
    const { data: ordenData, isLoading, isError } = useOrden(ordenId);
    const { data: tiposServicio } = useTiposServicio();
    const updateOrden = useUpdateOrden();

    const orden = ordenData?.data;

    // Form state
    const [formData, setFormData] = useState<FormData>({
        prioridad: 'NORMAL',
        fecha_programada: '',
        descripcion_inicial: '',
        observaciones_tecnico: '',
        id_tipo_servicio: null,
        origen_solicitud: 'PROGRAMADO',
    });

    const [hasChanges, setHasChanges] = useState(false);

    // Cargar datos iniciales
    useEffect(() => {
        if (orden) {
            const fechaProgramada = orden.fecha_programada
                ? orden.fecha_programada.split('T')[0]
                : '';

            setFormData({
                prioridad: orden.prioridad || 'NORMAL',
                fecha_programada: fechaProgramada,
                descripcion_inicial: orden.descripcion || '',
                observaciones_tecnico: orden.observaciones || '',
                id_tipo_servicio: orden.tipos_servicio?.id_tipo_servicio || null,
                origen_solicitud: 'PROGRAMADO', // Default, ya que no viene en el tipo Orden
            });
        }
    }, [orden]);

    // Handler de cambios
    const handleChange = (field: keyof FormData, value: string | number | null) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    // Guardar cambios
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await updateOrden.mutateAsync({
                id: ordenId,
                data: {
                    prioridad: formData.prioridad as any,
                    fecha_programada: formData.fecha_programada || undefined,
                    descripcion_inicial: formData.descripcion_inicial || undefined,
                    observaciones_tecnico: formData.observaciones_tecnico || undefined,
                    id_tipo_servicio: formData.id_tipo_servicio || undefined,
                    origen_solicitud: formData.origen_solicitud as any,
                },
            });

            // Redirigir al detalle después de guardar
            router.push(`/ordenes/${ordenId}`);
        } catch (error) {
            console.error('Error al actualizar orden:', error);
        }
    };

    // Estados de carga y error
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
                <p className="text-gray-500">Cargando orden...</p>
            </div>
        );
    }

    if (isError || !orden) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Orden no encontrada</h2>
                <p className="text-gray-500 mb-4">No se pudo cargar la información de la orden</p>
                <Link
                    href="/ordenes"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver a Órdenes
                </Link>
            </div>
        );
    }

    // Verificar si se puede editar
    const estadoActual = orden.estados_orden?.codigo_estado;
    const esEstadoFinal = ['APROBADA', 'CANCELADA'].includes(estadoActual || '');

    if (esEstadoFinal) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">No se puede editar</h2>
                <p className="text-gray-500 mb-4">
                    Las órdenes en estado <strong>{estadoActual}</strong> no pueden ser editadas.
                </p>
                <Link
                    href={`/ordenes/${ordenId}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Volver al Detalle
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <Link
                        href={`/ordenes/${ordenId}`}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al Detalle
                    </Link>

                    <h1 className="text-2xl font-bold text-gray-900">
                        Editar Orden {orden.numero_orden}
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Modifica los campos permitidos de la orden de servicio
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {hasChanges && (
                        <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                            Cambios sin guardar
                        </span>
                    )}
                </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Card: Información General */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            Información General
                        </h3>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Prioridad */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Prioridad
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PRIORIDADES.map((p) => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        onClick={() => handleChange('prioridad', p.value)}
                                        className={cn(
                                            'px-4 py-2 rounded-lg font-medium text-sm transition-all border-2',
                                            formData.prioridad === p.value
                                                ? `${p.color} border-current ring-2 ring-offset-1`
                                                : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                                        )}
                                    >
                                        {formData.prioridad === p.value && (
                                            <Check className="h-4 w-4 inline mr-1" />
                                        )}
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Fecha Programada */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Calendar className="h-4 w-4 inline mr-1" />
                                Fecha Programada
                            </label>
                            <input
                                type="date"
                                value={formData.fecha_programada}
                                onChange={(e) => handleChange('fecha_programada', e.target.value)}
                                className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        {/* Tipo de Servicio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Settings className="h-4 w-4 inline mr-1" />
                                Tipo de Servicio
                            </label>
                            <select
                                value={formData.id_tipo_servicio || ''}
                                onChange={(e) => handleChange('id_tipo_servicio', e.target.value ? Number(e.target.value) : null)}
                                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Seleccionar tipo de servicio...</option>
                                {tiposServicio?.map((tipo: any) => (
                                    <option key={tipo.id_tipo_servicio} value={tipo.id_tipo_servicio}>
                                        {tipo.codigo_tipo} - {tipo.nombre_tipo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Origen de Solicitud */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Tag className="h-4 w-4 inline mr-1" />
                                Origen de Solicitud
                            </label>
                            <select
                                value={formData.origen_solicitud}
                                onChange={(e) => handleChange('origen_solicitud', e.target.value)}
                                className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {ORIGENES.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Card: Descripción y Observaciones */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-purple-600" />
                            Descripción y Observaciones
                        </h3>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Descripción Inicial */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Descripción del Trabajo
                            </label>
                            <textarea
                                value={formData.descripcion_inicial}
                                onChange={(e) => handleChange('descripcion_inicial', e.target.value)}
                                rows={4}
                                placeholder="Describe el trabajo a realizar..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                {formData.descripcion_inicial.length} caracteres
                            </p>
                        </div>

                        {/* Observaciones del Técnico */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Observaciones
                            </label>
                            <textarea
                                value={formData.observaciones_tecnico}
                                onChange={(e) => handleChange('observaciones_tecnico', e.target.value)}
                                rows={3}
                                placeholder="Observaciones adicionales..."
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <Link
                        href={`/ordenes/${ordenId}`}
                        className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-4 w-4" />
                        Cancelar
                    </Link>

                    <button
                        type="submit"
                        disabled={updateOrden.isPending || !hasChanges}
                        className={cn(
                            'flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg',
                            hasChanges
                                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        )}
                    >
                        {updateOrden.isPending ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="h-5 w-5" />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
