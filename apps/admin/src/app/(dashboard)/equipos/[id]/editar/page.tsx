/**
 * PÁGINA DE EDICIÓN DE EQUIPO - MEKANOS S.A.S
 * Ruta: /equipos/[id]/editar
 * 
 * Incluye edición de parámetros, unidades y rangos personalizados
 * @version 1.0 - 07-ENE-2026
 */

'use client';

import {
    ConfigParametros,
    ConfigParametrosEditor,
    Criticidad,
    EstadoEquipo,
    TipoEquipo,
    UpdateEquipoPayload,
    useActualizarEquipo,
    useEquipo
} from '@/features/equipos';
import { cn } from '@/lib/utils';
import {
    AlertCircle,
    ArrowLeft,
    Check,
    Droplets,
    Loader2,
    Save,
    Settings,
    X,
    Zap
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const ESTADOS_EQUIPO: { value: EstadoEquipo; label: string }[] = [
    { value: 'OPERATIVO', label: 'Operativo' },
    { value: 'EN_REPARACION', label: 'En Reparación' },
    { value: 'FUERA_SERVICIO', label: 'Fuera de Servicio' },
    { value: 'BAJA', label: 'Baja' },
];

const CRITICIDADES: { value: Criticidad; label: string }[] = [
    { value: 'BAJA', label: 'Baja' },
    { value: 'MEDIA', label: 'Media' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'CRITICA', label: 'Crítica' },
];

function FormField({ label, required, children, error }: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    error?: string;
}) {
    return (
        <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {children}
            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    );
}

function TipoIcon({ tipo }: { tipo: string }) {
    if (tipo === 'GENERADOR') return <Zap className="h-5 w-5 text-yellow-500" />;
    if (tipo === 'BOMBA') return <Droplets className="h-5 w-5 text-blue-500" />;
    return <Settings className="h-5 w-5 text-gray-500" />;
}

export default function EditarEquipoPage() {
    const params = useParams();
    const router = useRouter();
    const id = parseInt(params.id as string);

    const { data, isLoading, isError, error } = useEquipo(id);
    const actualizarMutation = useActualizarEquipo();
    const equipo = data?.data;

    // Estado del formulario
    const [formData, setFormData] = useState({
        nombre_equipo: '',
        codigo_equipo: '',
        numero_serie_equipo: '',
        ubicacion_texto: '',
        estado_equipo: 'OPERATIVO' as EstadoEquipo,
        criticidad: 'MEDIA' as Criticidad,
    });

    const [configParametros, setConfigParametros] = useState<ConfigParametros>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Cargar datos del equipo
    useEffect(() => {
        if (equipo) {
            setFormData({
                nombre_equipo: equipo.nombre_equipo || '',
                codigo_equipo: equipo.codigo_equipo || '',
                numero_serie_equipo: equipo.numero_serie_equipo || '',
                ubicacion_texto: equipo.ubicacion_texto || '',
                estado_equipo: equipo.estado_equipo as EstadoEquipo,
                criticidad: equipo.criticidad as Criticidad,
            });
            // Cargar config_parametros si existe
            if (equipo.config_parametros) {
                setConfigParametros(equipo.config_parametros as ConfigParametros);
            }
        }
    }, [equipo]);

    const handleInputChange = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    const handleConfigChange = (config: ConfigParametros) => {
        setConfigParametros(config);
        setHasChanges(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload: UpdateEquipoPayload = {
            nombre_equipo: formData.nombre_equipo,
            ubicacion_texto: formData.ubicacion_texto,
            estado_equipo: formData.estado_equipo,
            criticidad: formData.criticidad,
            config_parametros: Object.keys(configParametros).length > 0 ? configParametros : undefined,
        };

        try {
            await actualizarMutation.mutateAsync({ id, payload });
            router.push(`/equipos/${id}`);
        } catch (err) {
            console.error('Error al actualizar equipo:', err);
        }
    };

    const handleCancel = () => {
        if (hasChanges) {
            if (confirm('¿Descartar los cambios realizados?')) {
                router.push(`/equipos/${id}`);
            }
        } else {
            router.push(`/equipos/${id}`);
        }
    };

    // Loading
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-gray-500">Cargando información del equipo...</p>
                </div>
            </div>
        );
    }

    // Error
    if (isError || !equipo) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <AlertCircle className="h-12 w-12 text-red-500" />
                <h2 className="text-xl font-semibold text-gray-900">Error al cargar el equipo</h2>
                <p className="text-gray-500">{(error as Error)?.message || 'No se encontró el equipo'}</p>
                <button onClick={() => router.push('/equipos')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <ArrowLeft className="h-4 w-4" />
                    Volver a Equipos
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={handleCancel} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <TipoIcon tipo={equipo.tipo} />
                            <span className="font-mono text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {equipo.codigo_equipo}
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900">Editar Equipo</h1>
                    </div>
                </div>

                {hasChanges && (
                    <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                        Cambios sin guardar
                    </span>
                )}
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Datos Básicos */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="px-5 py-4 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900">Datos Básicos</h2>
                    </div>
                    <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField label="Nombre del Equipo" required>
                            <input
                                type="text"
                                value={formData.nombre_equipo}
                                onChange={(e) => handleInputChange('nombre_equipo', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej: Generador Principal Planta A"
                            />
                        </FormField>

                        <FormField label="Código Equipo">
                            <input
                                type="text"
                                value={formData.codigo_equipo}
                                onChange={(e) => {
                                    // ✅ FIX 27-ENE-2026: Auto-normalizar código (mayúsculas, sin espacios)
                                    const normalized = e.target.value
                                        .toUpperCase()
                                        .replace(/\s+/g, '-')
                                        .replace(/[^A-Z0-9\-]/g, '');
                                    handleInputChange('codigo_equipo', normalized);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase font-mono"
                                placeholder="Ej: GEN-NAVAS-JD-001"
                            />
                            <p className="text-xs text-blue-600 mt-1">Solo mayúsculas, números y guiones. Los espacios se convertirán automáticamente.</p>
                        </FormField>

                        <FormField label="Número de Serie">
                            <input
                                type="text"
                                value={formData.numero_serie_equipo}
                                disabled
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                            <p className="text-xs text-gray-400 mt-1">El número de serie no se puede modificar</p>
                        </FormField>

                        <FormField label="Ubicación" required>
                            <input
                                type="text"
                                value={formData.ubicacion_texto}
                                onChange={(e) => handleInputChange('ubicacion_texto', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej: Cuarto de máquinas, Nivel -1"
                            />
                        </FormField>

                        <FormField label="Estado">
                            <select
                                value={formData.estado_equipo}
                                onChange={(e) => handleInputChange('estado_equipo', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {ESTADOS_EQUIPO.map(e => (
                                    <option key={e.value} value={e.value}>{e.label}</option>
                                ))}
                            </select>
                        </FormField>

                        <FormField label="Criticidad">
                            <select
                                value={formData.criticidad}
                                onChange={(e) => handleInputChange('criticidad', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                {CRITICIDADES.map(c => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </FormField>
                    </div>
                </div>

                {/* Parámetros Personalizados */}
                {(equipo.tipo === 'GENERADOR' || equipo.tipo === 'BOMBA' || equipo.tipo === 'MOTOR') && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                        <div className="px-5 py-4 border-b border-gray-100">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Settings className="h-5 w-5 text-gray-500" />
                                Parámetros de Medición Personalizados
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">
                                Personaliza las unidades y rangos de alerta para este equipo específico
                            </p>
                        </div>
                        <div className="p-5">
                            <ConfigParametrosEditor
                                tipoEquipo={equipo.tipo as TipoEquipo}
                                value={configParametros}
                                onChange={handleConfigChange}
                            />
                        </div>
                    </div>
                )}

                {/* Botones de Acción */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={handleCancel}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <X className="h-4 w-4" />
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={actualizarMutation.isPending}
                        className={cn(
                            'flex items-center gap-2 px-6 py-2 rounded-lg transition-colors shadow-sm',
                            actualizarMutation.isPending
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        )}
                    >
                        {actualizarMutation.isPending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Guardar Cambios
                            </>
                        )}
                    </button>
                </div>

                {/* Error de Mutation */}
                {actualizarMutation.isError && (
                    <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <AlertCircle className="h-5 w-5" />
                        <span>Error al guardar: {(actualizarMutation.error as Error)?.message || 'Error desconocido'}</span>
                    </div>
                )}

                {/* Éxito */}
                {actualizarMutation.isSuccess && (
                    <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                        <Check className="h-5 w-5" />
                        <span>Equipo actualizado correctamente</span>
                    </div>
                )}
            </form>
        </div>
    );
}
