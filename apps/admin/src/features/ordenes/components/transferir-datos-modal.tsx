'use client';

import {
    AccionEquipoTransferencia,
    EquipoTransferenciaInfo,
    getOrdenes,
    MapeoEquipoTransferenciaInput,
    OpcionesTransferenciaInput,
    PreviewTransferenciaResponse,
    previsualizarTransferenciaOrden,
    ResultadoTransferenciaOrden,
    SugerenciaMapeoEquipo,
    TipoCoincidenciaEquipo,
    transferirDatosOrden,
} from '@/features/ordenes/api/ordenes.service';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
    AlertCircle,
    AlertTriangle,
    ArrowRight,
    ArrowRightLeft,
    Camera,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Gauge,
    Info,
    Loader2,
    PlusCircle,
    RotateCcw,
    Search,
    ShieldCheck,
    Sparkles,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface TransferirDatosModalProps {
    isOpen: boolean;
    onClose: () => void;
    ordenDestino: {
        id_orden_servicio: number;
        numero_orden: string;
        equipos?: { codigo_equipo?: string | null; nombre_equipo?: string | null } | null;
        empleados_ordenes_servicio_id_tecnico_asignadoToempleados?: {
            persona?: { primer_nombre?: string | null; primer_apellido?: string | null } | null;
        } | null;
    };
    onSuccess: () => void;
}

interface EstadoMapeoFila {
    idOrdenEquipoOrigen: number;
    accion: AccionEquipoTransferencia;
    idOrdenEquipoDestino: number | null;
}

function getClienteNombreResumen(o: any): string {
    const p = o?.clientes?.persona;
    const base =
        p?.razon_social ||
        p?.nombre_comercial ||
        p?.nombre_completo ||
        `Cliente #${o?.id_cliente ?? 'N/A'}`;
    return o?.clientes?.nombre_sede ? `${base} - ${o.clientes.nombre_sede}` : base;
}

function getEstadoBadgeClass(codigo?: string | null): string {
    switch ((codigo || '').toUpperCase()) {
        case 'COMPLETADA':
            return 'bg-emerald-100 text-emerald-800 border-emerald-200';
        case 'EN_PROCESO':
            return 'bg-amber-100 text-amber-800 border-amber-200';
        case 'ASIGNADA':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'CANCELADA':
            return 'bg-red-100 text-red-800 border-red-200';
        default:
            return 'bg-slate-100 text-slate-700 border-slate-200';
    }
}

function getCoincidenciaBadge(
    tipo: TipoCoincidenciaEquipo,
    accionActual: AccionEquipoTransferencia,
    tiposCompatibles: boolean
): { label: string; className: string } {
    if (accionActual === 'DESCARTAR') {
        return {
            label: 'Descartado',
            className: 'bg-slate-100 text-slate-500 border-slate-200',
        };
    }
    if (accionActual === 'AGREGAR_A_DESTINO') {
        return {
            label: 'Se agregará a destino',
            className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        };
    }
    if (tipo === 'EXACTA_ID_EQUIPO') {
        return {
            label: 'Coincidencia exacta 1:1',
            className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
    }
    if (tipo === 'EXACTA_CODIGO_SERIE') {
        return {
            label: 'Coincidencia código/serie',
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
    }
    if (!tiposCompatibles) {
        return {
            label: 'Tipo diferente (formato destino protegido)',
            className: 'bg-amber-100 text-amber-800 border-amber-300',
        };
    }
    return {
        label: 'Asignación sugerida',
        className: 'bg-sky-100 text-sky-800 border-sky-200',
    };
}

function formatearNombreEquipo(eq: EquipoTransferenciaInfo): string {
    const base = eq.nombreSistema || eq.nombreEquipo || eq.codigoEquipo;
    return `EQ${eq.ordenSecuencia}: ${base}`;
}

export function TransferirDatosModal({
    isOpen,
    onClose,
    ordenDestino,
    onSuccess,
}: TransferirDatosModalProps) {
    const queryClient = useQueryClient();

    const [searchText, setSearchText] = useState('');
    const [searching, setSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [preview, setPreview] = useState<PreviewTransferenciaResponse | null>(null);

    const [mapeoEstado, setMapeoEstado] = useState<EstadoMapeoFila[]>([]);
    const [opciones, setOpciones] = useState<Required<OpcionesTransferenciaInput> | null>(null);
    const [mostrarOpcionesAvanzadas, setMostrarOpcionesAvanzadas] = useState(false);

    const [executing, setExecuting] = useState(false);
    const [execError, setExecError] = useState<string | null>(null);
    const [result, setResult] = useState<ResultadoTransferenciaOrden | null>(null);

    // Reiniciar estado cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            setSearchText('');
            setSearchResults([]);
            setHasSearched(false);
            setSelectedOrder(null);
            setPreview(null);
            setPreviewError(null);
            setMapeoEstado([]);
            setOpciones(null);
            setMostrarOpcionesAvanzadas(false);
            setExecError(null);
            setResult(null);
        }
    }, [isOpen]);

    // Cerrar con Escape si no está ejecutando
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !executing) {
                onClose();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, executing, onClose]);

    const inicializarDesdePreview = (data: PreviewTransferenciaResponse) => {
        setMapeoEstado(
            data.mapeoSugerido.map((item) => ({
                idOrdenEquipoOrigen: item.origen.idOrdenEquipo,
                accion: item.accionSugerida,
                idOrdenEquipoDestino: item.idOrdenEquipoDestinoSugerido,
            }))
        );
        setOpciones({ ...data.opcionesSugeridas });
        setMostrarOpcionesAvanzadas(
            !data.compatibilidad.mismoCliente ||
                data.compatibilidad.hayCruceDeTipos ||
                !data.compatibilidad.mismoTipoServicio
        );
    };

    const handleSearch = async () => {
        if (!searchText.trim()) return;
        setSearching(true);
        setHasSearched(true);
        setSelectedOrder(null);
        setPreview(null);
        setPreviewError(null);
        setExecError(null);
        try {
            const res = await getOrdenes({ busqueda: searchText.trim(), limit: 12 });
            const filtradas = (res.data || []).filter(
                (o: any) => o.id_orden_servicio !== ordenDestino.id_orden_servicio
            );
            setSearchResults(filtradas);
        } catch (err) {
            console.error('Error buscando órdenes origen:', err);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleSelectOrder = async (order: any) => {
        setSelectedOrder(order);
        setPreviewLoading(true);
        setPreviewError(null);
        setPreview(null);
        setExecError(null);
        try {
            const data = await previsualizarTransferenciaOrden(
                ordenDestino.id_orden_servicio,
                order.id_orden_servicio
            );
            setPreview(data);
            inicializarDesdePreview(data);
        } catch (error: any) {
            const msg =
                error?.response?.data?.message ||
                error?.message ||
                'No se pudo analizar la orden origen seleccionada';
            setPreviewError(Array.isArray(msg) ? msg.join('. ') : String(msg));
        } finally {
            setPreviewLoading(false);
        }
    };

    // Mapa destino -> qué equipo origen lo está usando actualmente
    const dstUsoPorId = useMemo(() => {
        const map = new Map<number, number>();
        for (const row of mapeoEstado) {
            if (row.accion === 'MAPEAR_A_DESTINO' && row.idOrdenEquipoDestino !== null) {
                map.set(row.idOrdenEquipoDestino, row.idOrdenEquipoOrigen);
            }
        }
        return map;
    }, [mapeoEstado]);

    const destinoById = useMemo(() => {
        const map = new Map<number, EquipoTransferenciaInfo>();
        for (const dst of preview?.destino.equipos || []) {
            map.set(dst.idOrdenEquipo, dst);
        }
        return map;
    }, [preview]);

    const sugerenciaBySrcId = useMemo(() => {
        const map = new Map<number, SugerenciaMapeoEquipo>();
        for (const sug of preview?.mapeoSugerido || []) {
            map.set(sug.origen.idOrdenEquipo, sug);
        }
        return map;
    }, [preview]);

    const equiposDestinoLibres = useMemo(() => {
        if (!preview) return [];
        return preview.destino.equipos.filter(
            (dst) => !dstUsoPorId.has(dst.idOrdenEquipo)
        );
    }, [preview, dstUsoPorId]);

    const resumenEnVivo = useMemo(() => {
        if (!preview || !opciones) {
            return {
                mapeados: 0,
                agregados: 0,
                descartados: 0,
                actividades: 0,
                mediciones: 0,
                evidenciasEquipo: 0,
                fotosGenerales: 0,
                cruceDeTiposActual: false,
            };
        }
        let mapeados = 0;
        let agregados = 0;
        let descartados = 0;
        let actividades = 0;
        let mediciones = 0;
        let evidenciasEquipo = 0;
        let cruceDeTiposActual = false;

        for (const row of mapeoEstado) {
            const sug = sugerenciaBySrcId.get(row.idOrdenEquipoOrigen);
            if (!sug) continue;
            if (row.accion === 'DESCARTAR') {
                descartados++;
                continue;
            }
            if (row.accion === 'MAPEAR_A_DESTINO') {
                mapeados++;
                const dst =
                    row.idOrdenEquipoDestino !== null
                        ? destinoById.get(row.idOrdenEquipoDestino)
                        : null;
                if (
                    dst &&
                    sug.origen.idTipoEquipo !== null &&
                    dst.idTipoEquipo !== null &&
                    sug.origen.idTipoEquipo !== dst.idTipoEquipo
                ) {
                    cruceDeTiposActual = true;
                }
            } else if (row.accion === 'AGREGAR_A_DESTINO') {
                agregados++;
            }
            if (opciones.incluirActividades) actividades += sug.conteos.actividades;
            if (opciones.incluirMediciones) mediciones += sug.conteos.mediciones;
            if (opciones.incluirEvidenciasEquipo)
                evidenciasEquipo += sug.conteos.evidencias;
        }

        const fotosGenerales = opciones.incluirFotosGenerales
            ? preview.resumenDatosOrigen.totalFotosGenerales +
              preview.resumenDatosOrigen.totalFotosHuerfanasComoGenerales
            : 0;

        return {
            mapeados,
            agregados,
            descartados,
            actividades,
            mediciones,
            evidenciasEquipo,
            fotosGenerales,
            cruceDeTiposActual,
        };
    }, [preview, opciones, mapeoEstado, sugerenciaBySrcId, destinoById]);

    const handleToggleEquipoCheckbox = (srcId: number) => {
        const sug = sugerenciaBySrcId.get(srcId);
        if (!sug) return;

        setMapeoEstado((prev) => {
            const actual = prev.find((r) => r.idOrdenEquipoOrigen === srcId);
            if (!actual) return prev;

            // Si ya estaba activo → desmarcar = DESCARTAR
            if (actual.accion !== 'DESCARTAR') {
                return prev.map((r) =>
                    r.idOrdenEquipoOrigen === srcId
                        ? { ...r, accion: 'DESCARTAR', idOrdenEquipoDestino: null }
                        : r
                );
            }

            // Si estaba descartado → reactivar de la forma más inteligente disponible
            const ocupados = new Set(
                prev
                    .filter(
                        (r) =>
                            r.accion === 'MAPEAR_A_DESTINO' &&
                            r.idOrdenEquipoDestino !== null
                    )
                    .map((r) => r.idOrdenEquipoDestino!)
            );

            // 1. Si tenía destino sugerido y sigue libre, restaurarlo
            if (
                sug.idOrdenEquipoDestinoSugerido !== null &&
                !ocupados.has(sug.idOrdenEquipoDestinoSugerido)
            ) {
                return prev.map((r) =>
                    r.idOrdenEquipoOrigen === srcId
                        ? {
                              ...r,
                              accion: 'MAPEAR_A_DESTINO',
                              idOrdenEquipoDestino: sug.idOrdenEquipoDestinoSugerido,
                          }
                        : r
                );
            }

            // 2. Si es un equipo excedente del mismo cliente que se puede agregar, agregarlo a destino
            if (sug.puedeAgregarADestino) {
                return prev.map((r) =>
                    r.idOrdenEquipoOrigen === srcId
                        ? { ...r, accion: 'AGREGAR_A_DESTINO', idOrdenEquipoDestino: null }
                        : r
                );
            }

            // 3. Si hay algún equipo destino libre, asignarlo al primero libre
            const primerLibre = preview?.destino.equipos.find(
                (dst) => !ocupados.has(dst.idOrdenEquipo)
            );
            if (primerLibre) {
                return prev.map((r) =>
                    r.idOrdenEquipoOrigen === srcId
                        ? {
                              ...r,
                              accion: 'MAPEAR_A_DESTINO',
                              idOrdenEquipoDestino: primerLibre.idOrdenEquipo,
                          }
                        : r
                );
            }

            return prev;
        });
    };

    const handleChangeDestinoSelect = (srcId: number, value: string) => {
        setMapeoEstado((prev) =>
            prev.map((row) => {
                if (row.idOrdenEquipoOrigen !== srcId) return row;
                if (value === 'DESCARTAR') {
                    return { ...row, accion: 'DESCARTAR', idOrdenEquipoDestino: null };
                }
                if (value === 'AGREGAR') {
                    return {
                        ...row,
                        accion: 'AGREGAR_A_DESTINO',
                        idOrdenEquipoDestino: null,
                    };
                }
                if (value.startsWith('MAPEAR:')) {
                    const dstId = Number(value.replace('MAPEAR:', ''));
                    return {
                        ...row,
                        accion: 'MAPEAR_A_DESTINO',
                        idOrdenEquipoDestino: dstId,
                    };
                }
                return row;
            })
        );
    };

    const handleEjecutarTransferencia = async () => {
        if (!preview || !selectedOrder || !opciones) return;
        setExecuting(true);
        setExecError(null);
        try {
            const payloadMapeo: MapeoEquipoTransferenciaInput[] = mapeoEstado.map((r) => ({
                idOrdenEquipoOrigen: r.idOrdenEquipoOrigen,
                accion: r.accion,
                idOrdenEquipoDestino:
                    r.accion === 'MAPEAR_A_DESTINO' ? r.idOrdenEquipoDestino : null,
            }));

            const res = await transferirDatosOrden(
                ordenDestino.id_orden_servicio,
                selectedOrder.id_orden_servicio,
                {
                    mapeoEquipos: payloadMapeo,
                    opciones,
                }
            );
            setResult(res);

            // Invalidar todas las cachés asociadas a esta orden para refrescar todas las pestañas inmediatamente
            const idDest = ordenDestino.id_orden_servicio;
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['ordenes'] }),
                queryClient.invalidateQueries({ queryKey: ['orden', idDest] }),
                queryClient.invalidateQueries({ queryKey: ['actividades-orden'] }),
                queryClient.invalidateQueries({ queryKey: ['mediciones-orden'] }),
                queryClient.invalidateQueries({ queryKey: ['evidencias-orden'] }),
                queryClient.invalidateQueries({ queryKey: ['evidencias-actividad'] }),
                queryClient.invalidateQueries({
                    queryKey: ['evidencias-generales', idDest],
                }),
                queryClient.invalidateQueries({ queryKey: ['galeria-lotes', idDest] }),
                queryClient.invalidateQueries({ queryKey: ['orden-historial', idDest] }),
                queryClient.invalidateQueries({ queryKey: ['orden-pdf-url', idDest] }),
                queryClient.invalidateQueries({ queryKey: ['progreso-registro'] }),
                queryClient.invalidateQueries({ queryKey: ['componentes-orden'] }),
            ]);

            onSuccess();
        } catch (error: any) {
            const msg =
                error?.response?.data?.message ||
                error?.message ||
                'Error al ejecutar la transferencia de datos';
            setExecError(Array.isArray(msg) ? msg.join('. ') : String(msg));
        } finally {
            setExecuting(false);
        }
    };

    if (!isOpen) return null;

    const tecnicoNombre = (() => {
        const p =
            ordenDestino.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona;
        const full = p
            ? [p.primer_nombre, p.primer_apellido].filter(Boolean).join(' ').trim()
            : '';
        return full || 'Sin asignar (conservado)';
    })();

    const wideMode = Boolean(preview || result);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
            <div
                className={cn(
                    'bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col max-h-[92vh] transition-all duration-200',
                    wideMode ? 'max-w-4xl' : 'max-w-xl'
                )}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-sky-50 flex items-center justify-between flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                            Transferencia Inteligente de Datos
                        </h2>
                        <p className="text-xs text-slate-600 mt-0.5">
                            Orden destino:{' '}
                            <strong className="font-mono text-blue-700">
                                {ordenDestino.numero_orden}
                            </strong>{' '}
                            · Emparejamiento 1:1 por equipo y protección del formato destino
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={executing}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/70 transition-colors disabled:opacity-40"
                        title="Cerrar"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* PASO 3: Resultado exitoso */}
                {result ? (
                    <div className="p-6 space-y-5 overflow-y-auto">
                        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-3">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1 flex-1">
                                <p className="font-bold text-emerald-900 text-base">
                                    Transferencia completada con integridad 1:1
                                </p>
                                <p className="text-sm text-emerald-800">{result.message}</p>
                            </div>
                        </div>

                        {/* Métricas consolidadas */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase">
                                    Equipos
                                </p>
                                <p className="text-lg font-bold text-slate-900 mt-0.5">
                                    {result.estadisticas.equiposMapeados} mapeados
                                </p>
                                <p className="text-[11px] text-slate-500">
                                    +{result.estadisticas.equiposAgregados} agregados ·{' '}
                                    {result.estadisticas.equiposDescartados} descartados
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                                <p className="text-[11px] font-semibold text-blue-600 uppercase">
                                    Actividades
                                </p>
                                <p className="text-lg font-bold text-blue-900 mt-0.5">
                                    {result.estadisticas.actividadesEjecutadas}
                                </p>
                                <p className="text-[11px] text-blue-700/80">
                                    {result.estadisticas.actividadesDescartadas} descartadas
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200">
                                <p className="text-[11px] font-semibold text-indigo-600 uppercase">
                                    Mediciones
                                </p>
                                <p className="text-lg font-bold text-indigo-900 mt-0.5">
                                    {result.estadisticas.medicionesServicio}
                                </p>
                                <p className="text-[11px] text-indigo-700/80">
                                    {result.estadisticas.medicionesDescartadas} desc.
                                    {result.estadisticas.medicionesIncompatiblesOmitidas > 0
                                        ? ` · ${result.estadisticas.medicionesIncompatiblesOmitidas} incomp.`
                                        : ''}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                                <p className="text-[11px] font-semibold text-emerald-700 uppercase">
                                    Evidencias
                                </p>
                                <p className="text-lg font-bold text-emerald-900 mt-0.5">
                                    {result.estadisticas.evidenciasFotograficas}
                                </p>
                                <p className="text-[11px] text-emerald-700/80">
                                    {result.estadisticas.evidenciasEquipo} eq. ·{' '}
                                    {result.estadisticas.evidenciasGenerales} gen.
                                    {result.estadisticas.lotesGaleria > 0
                                        ? ` (${result.estadisticas.lotesGaleria} lotes)`
                                        : ''}
                                </p>
                            </div>
                        </div>

                        {/* Detalle adicional */}
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                                Componentes: <strong>{result.estadisticas.componentesUsados}</strong>
                            </span>
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                                Plan actividades:{' '}
                                <strong>{result.estadisticas.ordenesActividadesPlan}</strong>
                            </span>
                            {result.estadisticas.pendientesTransferidos > 0 && (
                                <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                                    Pendientes:{' '}
                                    <strong>{result.estadisticas.pendientesTransferidos}</strong>
                                </span>
                            )}
                        </div>

                        {/* Mapeo aplicado */}
                        {result.mapeoAplicado.length > 0 && (
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">
                                    Asociación de equipos aplicada
                                </div>
                                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                                    {result.mapeoAplicado.map((m) => (
                                        <div
                                            key={m.idOrdenEquipoOrigen}
                                            className="px-3.5 py-2 text-xs flex items-center justify-between gap-2"
                                        >
                                            <span className="font-medium text-slate-800 truncate">
                                                {m.equipoOrigenNombre}
                                            </span>
                                            <ArrowRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                                            {m.accion === 'DESCARTAR' ? (
                                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                                                    Descartado
                                                </span>
                                            ) : m.accion === 'AGREGAR_A_DESTINO' ? (
                                                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-medium truncate">
                                                    {m.equipoDestinoNombre}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium truncate">
                                                    {m.equipoDestinoNombre}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2">
                            <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            <span>
                                Todas las pestañas fueron actualizadas. Si necesita el informe PDF
                                actualizado con estos datos, utilice <strong>Regenerar PDF</strong> en la
                                sección de informe.
                            </span>
                        </div>

                        <div className="flex justify-end pt-1">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-colors"
                            >
                                Entendido, cerrar
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Body scrollable */}
                        <div className="p-5 space-y-4 overflow-y-auto flex-1">
                            {/* PASO 1: Buscador de orden origen */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wide text-slate-700">
                                        1. Seleccionar Orden Origen
                                    </label>
                                    {selectedOrder && (
                                        <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                                            Seleccionada: {selectedOrder.numero_orden}
                                        </span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSearch();
                                            }
                                        }}
                                        placeholder="Buscar por número de orden (Ej: OS-202611-0078) o cliente..."
                                        className="flex-1 px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={!searchText.trim() || searching}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 text-sm font-semibold"
                                    >
                                        {searching ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Search className="h-4 w-4" />
                                        )}
                                        Buscar
                                    </button>
                                </div>

                                {searchResults.length > 0 && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                                        {searchResults.map((o: any) => {
                                            const isSelected =
                                                selectedOrder?.id_orden_servicio ===
                                                o.id_orden_servicio;
                                            const eqCount =
                                                o.ordenes_equipos?.length ||
                                                o._count?.ordenes_equipos ||
                                                1;
                                            return (
                                                <button
                                                    key={o.id_orden_servicio}
                                                    type="button"
                                                    onClick={() => handleSelectOrder(o)}
                                                    className={cn(
                                                        'text-left p-2.5 rounded-xl border-2 transition-all bg-white',
                                                        isSelected
                                                            ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-300'
                                                            : 'border-slate-200 hover:border-blue-300'
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="font-mono font-bold text-xs text-slate-900">
                                                            {o.numero_orden}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'px-2 py-0.5 rounded-full text-[10px] font-bold border',
                                                                getEstadoBadgeClass(
                                                                    o.estados_orden?.codigo_estado
                                                                )
                                                            )}
                                                        >
                                                            {o.estados_orden?.nombre_estado || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 mt-1 truncate">
                                                        {getClienteNombreResumen(o)}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                                                        {eqCount}{' '}
                                                        {eqCount === 1 ? 'equipo' : 'equipos'} ·{' '}
                                                        {o.tipos_servicio?.nombre_tipo ||
                                                            o.equipos?.codigo_equipo ||
                                                            'Servicio'}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {hasSearched && searchResults.length === 0 && !searching && (
                                    <p className="text-xs text-slate-400 text-center py-2">
                                        No se encontraron órdenes con ese criterio.
                                    </p>
                                )}
                            </div>

                            {/* Cargando preview */}
                            {previewLoading && (
                                <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-500">
                                    <Loader2 className="h-7 w-7 animate-spin text-blue-600" />
                                    <p className="text-sm font-medium">
                                        Analizando equipos, evidencias y compatibilidad 1:1...
                                    </p>
                                </div>
                            )}

                            {/* Error de preview */}
                            {previewError && (
                                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-800">
                                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold">No se pudo analizar la transferencia</p>
                                        <p className="text-xs mt-0.5">{previewError}</p>
                                    </div>
                                </div>
                            )}

                            {/* PASO 2: Diagnóstico interactivo y matriz de mapeo 1:1 */}
                            {preview && opciones && !previewLoading && (
                                <div className="space-y-4">
                                    {/* Bloqueos duros */}
                                    {preview.bloqueos.length > 0 && (
                                        <div className="p-4 rounded-xl bg-red-50 border border-red-300 space-y-1.5">
                                            <p className="text-sm font-bold text-red-800 flex items-center gap-2">
                                                <XCircle className="h-4 w-4 text-red-600" />
                                                No es posible ejecutar esta transferencia
                                            </p>
                                            {preview.bloqueos.map((b, i) => (
                                                <p key={i} className="text-xs text-red-700">
                                                    • {b}
                                                </p>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tarjeta comparativa Origen → Destino */}
                                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-center bg-gradient-to-r from-slate-50 via-blue-50/40 to-emerald-50/40 border border-slate-200 rounded-xl p-3.5">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                                                    Origen
                                                </span>
                                                <span className="font-mono font-bold text-sm text-slate-900">
                                                    {preview.origen.numero}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'px-1.5 py-0.5 rounded text-[10px] font-bold border',
                                                        getEstadoBadgeClass(preview.origen.estado)
                                                    )}
                                                >
                                                    {preview.origen.estadoNombre}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-700 font-medium truncate mt-1">
                                                {preview.origen.nombreCliente}
                                            </p>
                                            <p className="text-[11px] text-slate-500 truncate">
                                                {preview.origen.nombreTipoServicio} ·{' '}
                                                <strong>{preview.origen.totalEquipos}</strong>{' '}
                                                {preview.origen.totalEquipos === 1
                                                    ? 'equipo'
                                                    : 'equipos'}
                                            </p>
                                        </div>

                                        <div className="hidden md:flex items-center justify-center">
                                            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-sm">
                                                <ArrowRight className="h-4 w-4" />
                                            </div>
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                    Destino (conserva identidad)
                                                </span>
                                                <span className="font-mono font-bold text-sm text-slate-900">
                                                    {preview.destino.numero}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-700 font-medium truncate mt-1">
                                                {preview.destino.nombreCliente}
                                            </p>
                                            <p className="text-[11px] text-slate-500 truncate">
                                                {preview.destino.nombreTipoServicio} ·{' '}
                                                <strong>{preview.destino.totalEquipos}</strong>{' '}
                                                {preview.destino.totalEquipos === 1
                                                    ? 'equipo'
                                                    : 'equipos'}{' '}
                                                · Técnico: {tecnicoNombre}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Pills de diagnóstico rápido */}
                                    <div className="flex flex-wrap gap-1.5">
                                        <span
                                            className={cn(
                                                'px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                                                preview.compatibilidad.mismoCliente
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                            )}
                                        >
                                            {preview.compatibilidad.mismoCliente
                                                ? '✓ Mismo cliente'
                                                : '⚠ Clientes distintos (se conserva destino)'}
                                        </span>
                                        <span
                                            className={cn(
                                                'px-2.5 py-1 rounded-full text-[11px] font-semibold border',
                                                !resumenEnVivo.cruceDeTiposActual &&
                                                    preview.compatibilidad.mismoTipoServicio
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                            )}
                                        >
                                            {!resumenEnVivo.cruceDeTiposActual &&
                                            preview.compatibilidad.mismoTipoServicio
                                                ? '✓ Mismo tipo de servicio y equipos'
                                                : '🛡 Cruce de tipo detectado — formato destino protegido'}
                                        </span>
                                        {preview.compatibilidad.coincidenciasExactas > 0 && (
                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                                <Sparkles className="h-3 w-3" />
                                                {preview.compatibilidad.coincidenciasExactas}{' '}
                                                coincidencia(s) física(s) 1:1
                                            </span>
                                        )}
                                        {preview.origen.tieneDatosLegacySinFk && (
                                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
                                                Origen histórico reconstruido
                                            </span>
                                        )}
                                    </div>

                                    {/* Advertencias contextuales */}
                                    {preview.advertencias.length > 0 && (
                                        <div className="space-y-1.5">
                                            {preview.advertencias.map((adv, idx) => (
                                                <div
                                                    key={`${adv.codigo}-${idx}`}
                                                    className={cn(
                                                        'px-3 py-2 rounded-lg border text-xs flex items-start gap-2',
                                                        adv.nivel === 'warning'
                                                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                                                            : adv.nivel === 'danger'
                                                              ? 'bg-red-50 border-red-200 text-red-900'
                                                              : 'bg-sky-50 border-sky-200 text-sky-900'
                                                    )}
                                                >
                                                    {adv.nivel === 'warning' ? (
                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                                                    ) : (
                                                        <Info className="h-3.5 w-3.5 text-sky-600 flex-shrink-0 mt-0.5" />
                                                    )}
                                                    <span>{adv.mensaje}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* MATRIZ INTERACTIVA DE ASOCIACIÓN DE EQUIPOS */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                                            <div>
                                                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">
                                                    2. Asociación de Equipos (Origen → Destino)
                                                </h3>
                                                <p className="text-[11px] text-slate-500">
                                                    Use el check para incluir o descartar cada equipo
                                                    del origen y el selector para verificar o cambiar a
                                                    qué equipo del destino se asigna.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => inicializarDesdePreview(preview)}
                                                className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white border border-blue-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                                            >
                                                <RotateCcw className="h-3 w-3" />
                                                Restaurar sugerido
                                            </button>
                                        </div>

                                        <div className="divide-y divide-slate-100">
                                            {preview.mapeoSugerido.map((sug) => {
                                                const row = mapeoEstado.find(
                                                    (r) =>
                                                        r.idOrdenEquipoOrigen ===
                                                        sug.origen.idOrdenEquipo
                                                ) || {
                                                    idOrdenEquipoOrigen: sug.origen.idOrdenEquipo,
                                                    accion: sug.accionSugerida,
                                                    idOrdenEquipoDestino:
                                                        sug.idOrdenEquipoDestinoSugerido,
                                                };

                                                const isIncluded = row.accion !== 'DESCARTAR';
                                                const dstActual =
                                                    row.accion === 'MAPEAR_A_DESTINO' &&
                                                    row.idOrdenEquipoDestino !== null
                                                        ? destinoById.get(
                                                              row.idOrdenEquipoDestino
                                                          ) || null
                                                        : null;
                                                const tiposCompatiblesActual =
                                                    !dstActual ||
                                                    sug.origen.idTipoEquipo === null ||
                                                    dstActual.idTipoEquipo === null ||
                                                    sug.origen.idTipoEquipo ===
                                                        dstActual.idTipoEquipo;

                                                const badge = getCoincidenciaBadge(
                                                    sug.tipoCoincidencia,
                                                    row.accion,
                                                    tiposCompatiblesActual
                                                );

                                                const selectValue =
                                                    row.accion === 'DESCARTAR'
                                                        ? 'DESCARTAR'
                                                        : row.accion === 'AGREGAR_A_DESTINO'
                                                          ? 'AGREGAR'
                                                          : `MAPEAR:${row.idOrdenEquipoDestino}`;

                                                return (
                                                    <div
                                                        key={sug.origen.idOrdenEquipo}
                                                        className={cn(
                                                            'px-4 py-3 transition-colors grid grid-cols-1 lg:grid-cols-[auto_1fr_auto_1fr] gap-3 items-center',
                                                            !isIncluded
                                                                ? 'bg-slate-50/80 opacity-75'
                                                                : row.accion === 'AGREGAR_A_DESTINO'
                                                                  ? 'bg-indigo-50/40'
                                                                  : 'bg-white'
                                                        )}
                                                    >
                                                        {/* Checkbox incluir / descartar */}
                                                        <label
                                                            className="flex items-center cursor-pointer"
                                                            title={
                                                                isIncluded
                                                                    ? 'Desmarcar para descartar este equipo'
                                                                    : 'Marcar para incluir este equipo en la transferencia'
                                                            }
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isIncluded}
                                                                onChange={() =>
                                                                    handleToggleEquipoCheckbox(
                                                                        sug.origen.idOrdenEquipo
                                                                    )
                                                                }
                                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                            />
                                                        </label>

                                                        {/* Columna Origen */}
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-white font-mono text-[10px] font-bold">
                                                                    EQ{sug.origen.ordenSecuencia}
                                                                </span>
                                                                <span
                                                                    className={cn(
                                                                        'text-xs font-bold truncate',
                                                                        isIncluded
                                                                            ? 'text-slate-900'
                                                                            : 'text-slate-500 line-through'
                                                                    )}
                                                                >
                                                                    {sug.origen.nombreSistema ||
                                                                        sug.origen.nombreEquipo}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                                                <span className="font-mono">
                                                                    {sug.origen.codigoEquipo}
                                                                </span>{' '}
                                                                · {sug.origen.nombreTipoEquipo}
                                                            </p>
                                                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-600">
                                                                <span className="inline-flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    <ClipboardList className="h-3 w-3 text-blue-600" />
                                                                    {sug.conteos.actividades} act
                                                                </span>
                                                                <span className="inline-flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    <Gauge className="h-3 w-3 text-indigo-600" />
                                                                    {sug.conteos.mediciones} med
                                                                </span>
                                                                <span className="inline-flex items-center gap-0.5 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                    <Camera className="h-3 w-3 text-emerald-600" />
                                                                    {sug.conteos.evidencias} fotos
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Flecha + badge */}
                                                        <div className="flex lg:flex-col items-center gap-1 justify-center">
                                                            <ArrowRight
                                                                className={cn(
                                                                    'h-4 w-4',
                                                                    isIncluded
                                                                        ? 'text-blue-600'
                                                                        : 'text-slate-300'
                                                                )}
                                                            />
                                                            <span
                                                                className={cn(
                                                                    'px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap',
                                                                    badge.className
                                                                )}
                                                            >
                                                                {badge.label}
                                                            </span>
                                                        </div>

                                                        {/* Columna Destino (Selector) */}
                                                        <div className="min-w-0 space-y-1">
                                                            <select
                                                                value={selectValue}
                                                                onChange={(e) =>
                                                                    handleChangeDestinoSelect(
                                                                        sug.origen.idOrdenEquipo,
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className={cn(
                                                                    'w-full text-xs rounded-lg border px-2.5 py-2 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
                                                                    row.accion === 'DESCARTAR'
                                                                        ? 'bg-slate-100 border-slate-200 text-slate-500'
                                                                        : row.accion ===
                                                                            'AGREGAR_A_DESTINO'
                                                                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900'
                                                                          : !tiposCompatiblesActual
                                                                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                                                                            : 'bg-white border-slate-300 text-slate-900'
                                                                )}
                                                            >
                                                                <optgroup label="Asignar a equipo de la orden destino">
                                                                    {preview.destino.equipos.map(
                                                                        (dst) => {
                                                                            const usadoPorSrc =
                                                                                dstUsoPorId.get(
                                                                                    dst.idOrdenEquipo
                                                                                );
                                                                            const ocupadoPorOtro =
                                                                                usadoPorSrc !==
                                                                                    undefined &&
                                                                                usadoPorSrc !==
                                                                                    sug.origen
                                                                                        .idOrdenEquipo;
                                                                            return (
                                                                                <option
                                                                                    key={
                                                                                        dst.idOrdenEquipo
                                                                                    }
                                                                                    value={`MAPEAR:${dst.idOrdenEquipo}`}
                                                                                    disabled={
                                                                                        ocupadoPorOtro
                                                                                    }
                                                                                >
                                                                                    {formatearNombreEquipo(
                                                                                        dst
                                                                                    )}{' '}
                                                                                    ({dst.codigoEquipo})
                                                                                    {ocupadoPorOtro
                                                                                        ? ' [En uso]'
                                                                                        : ''}
                                                                                </option>
                                                                            );
                                                                        }
                                                                    )}
                                                                </optgroup>
                                                                {sug.puedeAgregarADestino && (
                                                                    <optgroup label="Incorporar equipo excedente">
                                                                        <option value="AGREGAR">
                                                                            + Agregar este equipo a la
                                                                            orden destino
                                                                        </option>
                                                                    </optgroup>
                                                                )}
                                                                <optgroup label="Excluir">
                                                                    <option value="DESCARTAR">
                                                                        ✕ No transferir (Descartar)
                                                                    </option>
                                                                </optgroup>
                                                            </select>

                                                            {row.accion === 'AGREGAR_A_DESTINO' && (
                                                                <p className="text-[10px] text-indigo-700 flex items-center gap-1">
                                                                    <PlusCircle className="h-3 w-3 flex-shrink-0" />
                                                                    Se creará como equipo adicional en{' '}
                                                                    {preview.destino.numero} con todos
                                                                    sus datos.
                                                                </p>
                                                            )}
                                                            {row.accion === 'DESCARTAR' &&
                                                                sug.puedeAgregarADestino && (
                                                                    <p className="text-[10px] text-slate-500">
                                                                        Marque el check si desea
                                                                        incluirlo también en la orden
                                                                        destino.
                                                                    </p>
                                                                )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Equipos destino que actualmente quedarán sin datos */}
                                        {equiposDestinoLibres.length > 0 && (
                                            <div className="px-4 py-2.5 bg-amber-50/70 border-t border-amber-200 text-[11px] text-amber-900">
                                                <strong>
                                                    Equipos en destino sin datos asignados (
                                                    {equiposDestinoLibres.length}):
                                                </strong>{' '}
                                                {equiposDestinoLibres
                                                    .map((d) => formatearNombreEquipo(d))
                                                    .join(', ')}
                                            </div>
                                        )}
                                    </div>

                                    {/* BLOQUES Y OPCIONES GRANULARES */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMostrarOpcionesAvanzadas((v) => !v)
                                            }
                                            className="w-full px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between text-xs font-bold text-slate-800"
                                        >
                                            <span className="flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-blue-600" />
                                                3. Qué información transferir y protecciones de formato
                                            </span>
                                            {mostrarOpcionesAvanzadas ? (
                                                <ChevronUp className="h-4 w-4 text-slate-500" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 text-slate-500" />
                                            )}
                                        </button>

                                        {mostrarOpcionesAvanzadas && (
                                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs bg-white border-t border-slate-200">
                                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={opciones.incluirActividades}
                                                        onChange={(e) =>
                                                            setOpciones({
                                                                ...opciones,
                                                                incluirActividades:
                                                                    e.target.checked,
                                                            })
                                                        }
                                                        className="mt-0.5 rounded border-slate-300 text-blue-600"
                                                    />
                                                    <span>
                                                        <strong className="text-slate-800">
                                                            Actividades / Checklist (
                                                            {
                                                                preview.resumenDatosOrigen
                                                                    .totalActividades
                                                            }
                                                            )
                                                        </strong>
                                                        <span className="block text-[11px] text-slate-500">
                                                            Conserva observaciones individuales y
                                                            estados por equipo.
                                                        </span>
                                                    </span>
                                                </label>

                                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={opciones.incluirMediciones}
                                                        onChange={(e) =>
                                                            setOpciones({
                                                                ...opciones,
                                                                incluirMediciones:
                                                                    e.target.checked,
                                                            })
                                                        }
                                                        className="mt-0.5 rounded border-slate-300 text-blue-600"
                                                    />
                                                    <span>
                                                        <strong className="text-slate-800">
                                                            Mediciones técnicas (
                                                            {
                                                                preview.resumenDatosOrigen
                                                                    .totalMediciones
                                                            }
                                                            )
                                                        </strong>
                                                        <span className="block text-[11px] text-slate-500">
                                                            Vinculadas a cada equipo destino sin
                                                            mezclas posicionales.
                                                        </span>
                                                    </span>
                                                </label>

                                                {(preview.compatibilidad.hayCruceDeTipos ||
                                                    resumenEnVivo.cruceDeTiposActual) &&
                                                    opciones.incluirMediciones && (
                                                        <label className="sm:col-span-2 flex items-start gap-2 cursor-pointer p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    opciones.soloMedicionesCompatibles
                                                                }
                                                                onChange={(e) =>
                                                                    setOpciones({
                                                                        ...opciones,
                                                                        soloMedicionesCompatibles:
                                                                            e.target.checked,
                                                                    })
                                                                }
                                                                className="mt-0.5 rounded border-amber-400 text-amber-600"
                                                            />
                                                            <span>
                                                                <strong className="text-amber-900">
                                                                    Filtrar parámetros exclusivos de
                                                                    otro tipo de equipo (Recomendado)
                                                                </strong>
                                                                <span className="block text-[11px] text-amber-800">
                                                                    Evita contaminar el formato del
                                                                    equipo destino con parámetros
                                                                    exclusivos de otro tipo de activo.
                                                                </span>
                                                            </span>
                                                        </label>
                                                    )}

                                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={opciones.incluirEvidenciasEquipo}
                                                        onChange={(e) =>
                                                            setOpciones({
                                                                ...opciones,
                                                                incluirEvidenciasEquipo:
                                                                    e.target.checked,
                                                            })
                                                        }
                                                        className="mt-0.5 rounded border-slate-300 text-blue-600"
                                                    />
                                                    <span>
                                                        <strong className="text-slate-800">
                                                            Evidencias fotográficas por equipo (
                                                            {
                                                                preview.resumenDatosOrigen
                                                                    .totalEvidenciasEquipo
                                                            }
                                                            )
                                                        </strong>
                                                        <span className="block text-[11px] text-slate-500">
                                                            Revincula fotos a su equipo y actividad
                                                            exacta en destino.
                                                        </span>
                                                    </span>
                                                </label>

                                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={opciones.incluirFotosGenerales}
                                                        onChange={(e) =>
                                                            setOpciones({
                                                                ...opciones,
                                                                incluirFotosGenerales:
                                                                    e.target.checked,
                                                            })
                                                        }
                                                        className="mt-0.5 rounded border-slate-300 text-blue-600"
                                                    />
                                                    <span>
                                                        <strong className="text-slate-800">
                                                            Fotos generales y lotes (
                                                            {preview.resumenDatosOrigen
                                                                .totalFotosGenerales +
                                                                preview.resumenDatosOrigen
                                                                    .totalFotosHuerfanasComoGenerales}{' '}
                                                            fotos ·{' '}
                                                            {
                                                                preview.resumenDatosOrigen
                                                                    .totalLotesGaleria
                                                            }{' '}
                                                            lotes)
                                                        </strong>
                                                        <span className="block text-[11px] text-slate-500">
                                                            Incluye galería general organizada por
                                                            lotes sin romper el PDF.
                                                        </span>
                                                    </span>
                                                </label>

                                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={opciones.incluirObservaciones}
                                                        onChange={(e) =>
                                                            setOpciones({
                                                                ...opciones,
                                                                incluirObservaciones:
                                                                    e.target.checked,
                                                            })
                                                        }
                                                        className="mt-0.5 rounded border-slate-300 text-blue-600"
                                                    />
                                                    <span>
                                                        <strong className="text-slate-800">
                                                            Observaciones y cierre técnico
                                                        </strong>
                                                        <span className="block text-[11px] text-slate-500">
                                                            Trabajo realizado, observaciones del
                                                            técnico, cierre y garantía.
                                                        </span>
                                                    </span>
                                                </label>

                                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={opciones.incluirFirmas}
                                                        onChange={(e) =>
                                                            setOpciones({
                                                                ...opciones,
                                                                incluirFirmas: e.target.checked,
                                                            })
                                                        }
                                                        className="mt-0.5 rounded border-slate-300 text-blue-600"
                                                    />
                                                    <span>
                                                        <strong className="text-slate-800">
                                                            Firmas digitales y recepción
                                                        </strong>
                                                        <span className="block text-[11px] text-slate-500">
                                                            {preview.compatibilidad.mismoCliente
                                                                ? 'Firma del técnico, firma del cliente y quien recibe.'
                                                                : 'Desactivado por defecto al ser un cliente distinto.'}
                                                        </span>
                                                    </span>
                                                </label>

                                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={opciones.incluirComponentes}
                                                        onChange={(e) =>
                                                            setOpciones({
                                                                ...opciones,
                                                                incluirComponentes:
                                                                    e.target.checked,
                                                            })
                                                        }
                                                        className="mt-0.5 rounded border-slate-300 text-blue-600"
                                                    />
                                                    <span>
                                                        <strong className="text-slate-800">
                                                            Repuestos / Componentes (
                                                            {
                                                                preview.resumenDatosOrigen
                                                                    .totalComponentes
                                                            }
                                                            )
                                                        </strong>
                                                        <span className="block text-[11px] text-slate-500">
                                                            Copia informativa sin duplicar salidas de
                                                            inventario WMS.
                                                        </span>
                                                    </span>
                                                </label>

                                                <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                                    <input
                                                        type="checkbox"
                                                        checked={opciones.copiarPlanActividades}
                                                        onChange={(e) =>
                                                            setOpciones({
                                                                ...opciones,
                                                                copiarPlanActividades:
                                                                    e.target.checked,
                                                            })
                                                        }
                                                        className="mt-0.5 rounded border-slate-300 text-blue-600"
                                                    />
                                                    <span>
                                                        <strong className="text-slate-800">
                                                            Plan de actividades (
                                                            {
                                                                preview.resumenDatosOrigen
                                                                    .totalPlanActividades
                                                            }
                                                            )
                                                        </strong>
                                                        <span className="block text-[11px] text-slate-500">
                                                            {preview.compatibilidad
                                                                .mismoTipoServicio &&
                                                            !resumenEnVivo.cruceDeTiposActual
                                                                ? 'Reemplaza el plan de destino con el del origen.'
                                                                : 'Protegido (OFF) porque el tipo de equipo/servicio difiere.'}
                                                        </span>
                                                    </span>
                                                </label>

                                                {preview.resumenDatosOrigen.totalPendientes > 0 && (
                                                    <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                                        <input
                                                            type="checkbox"
                                                            checked={opciones.incluirPendientes}
                                                            onChange={(e) =>
                                                                setOpciones({
                                                                    ...opciones,
                                                                    incluirPendientes:
                                                                        e.target.checked,
                                                                })
                                                            }
                                                            className="mt-0.5 rounded border-slate-300 text-blue-600"
                                                        />
                                                        <span>
                                                            <strong className="text-slate-800">
                                                                Pendientes registrados (
                                                                {
                                                                    preview.resumenDatosOrigen
                                                                        .totalPendientes
                                                                }
                                                                )
                                                            </strong>
                                                            <span className="block text-[11px] text-slate-500">
                                                                Se reasignan al cliente y equipos de
                                                                la orden destino.
                                                            </span>
                                                        </span>
                                                    </label>
                                                )}

                                                {preview.destino.tieneDescripcionInicial && (
                                                    <label className="flex items-start gap-2 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                opciones.conservarDescripcionDestino
                                                            }
                                                            onChange={(e) =>
                                                                setOpciones({
                                                                    ...opciones,
                                                                    conservarDescripcionDestino:
                                                                        e.target.checked,
                                                                })
                                                            }
                                                            className="mt-0.5 rounded border-slate-300 text-blue-600"
                                                        />
                                                        <span>
                                                            <strong className="text-slate-800">
                                                                Conservar descripción inicial destino
                                                            </strong>
                                                            <span className="block text-[11px] text-slate-500">
                                                                Mantiene la descripción que ya tiene{' '}
                                                                {preview.destino.numero}.
                                                            </span>
                                                        </span>
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {execError && (
                                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2 text-xs text-red-800">
                                            <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                                            <span>{execError}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer fijo con resumen en vivo */}
                        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-shrink-0">
                            <div className="text-xs text-slate-600">
                                {preview ? (
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="font-bold text-slate-800">
                                            {resumenEnVivo.mapeados} mapeado(s)
                                        </span>
                                        {resumenEnVivo.agregados > 0 && (
                                            <span className="font-semibold text-indigo-700">
                                                · +{resumenEnVivo.agregados} nuevo(s)
                                            </span>
                                        )}
                                        {resumenEnVivo.descartados > 0 && (
                                            <span className="text-slate-500">
                                                · {resumenEnVivo.descartados} descartado(s)
                                            </span>
                                        )}
                                        <span className="text-slate-400">|</span>
                                        <span>
                                            {resumenEnVivo.actividades} act ·{' '}
                                            {resumenEnVivo.mediciones} med ·{' '}
                                            {resumenEnVivo.evidenciasEquipo +
                                                resumenEnVivo.fotosGenerales}{' '}
                                            fotos
                                        </span>
                                    </div>
                                ) : (
                                    <span>
                                        Busque y seleccione una orden origen para previsualizar el
                                        mapeo por equipo.
                                    </span>
                                )}
                            </div>

                            <div className="flex gap-2.5 flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={executing}
                                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleEjecutarTransferencia}
                                    disabled={
                                        !preview ||
                                        !preview.puedeTransferir ||
                                        previewLoading ||
                                        executing
                                    }
                                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    {executing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Transfiriendo...
                                        </>
                                    ) : (
                                        <>
                                            <ArrowRightLeft className="h-4 w-4" />
                                            Confirmar Transferencia
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
