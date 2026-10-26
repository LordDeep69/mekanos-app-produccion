/**
 * MEKANOS S.A.S - Portal Admin
 * Página de Agenda Enterprise
 * 
 * Centro de programación inteligente de servicios
 * Vista integrada: KPIs + Calendario/Lista + Alertas
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useAgendaMetricas,
    useCargaTecnicos,
    useRefreshAgenda,
    useServiciosHoy,
    useServiciosMes,
    useServiciosSemana,
    useServiciosVencidos,
} from '@/features/agenda';
import { formatDateSafe } from '@/lib/utils';
import type { AgendaView, NivelUrgencia, ServicioProgramado } from '@/types/agenda';
import {
    AlertTriangle,
    Calendar,
    CalendarDays,
    CalendarRange,
    CheckCircle2,
    Clock,
    FileText,
    Plus,
    RefreshCw,
    Search,
    Users,
    Wrench
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

// Colores por nivel de urgencia
const URGENCIA_COLORS: Record<NivelUrgencia, string> = {
    CRITICA: 'bg-red-50 text-red-700 border-red-200',
    ALTA: 'bg-orange-50 text-orange-700 border-orange-200',
    MEDIA: 'bg-amber-50 text-amber-700 border-amber-200',
    NORMAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const ESTADO_BADGES: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
    PENDIENTE: { variant: 'secondary', label: 'Pendiente' },
    PROGRAMADA: { variant: 'default', label: 'Programada' },
    COMPLETADA: { variant: 'outline', label: 'Completada' },
    VENCIDA: { variant: 'destructive', label: 'Vencida' },
    CANCELADA: { variant: 'outline', label: 'Cancelada' },
};

const PRIORIDAD_BADGES: Record<string, { className: string; label: string }> = {
    URGENTE: { className: 'bg-red-500 text-white', label: 'Urgente' },
    ALTA: { className: 'bg-orange-500 text-white', label: 'Alta' },
    NORMAL: { className: 'bg-blue-500 text-white', label: 'Normal' },
    BAJA: { className: 'bg-gray-500 text-white', label: 'Baja' },
};

// Componente de métricas
function MetricasPanel() {
    const { data: metricas, isLoading, error } = useAgendaMetricas();
    const { data: vencidos } = useServiciosVencidos();

    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-2xl" />
                ))}
            </div>
        );
    }

    if (error || !metricas) {
        return (
            <div className="text-center py-4 text-destructive">
                Error al cargar métricas
            </div>
        );
    }

    const cards = [
        {
            title: 'Hoy',
            value: metricas.servicios_hoy,
            icon: Calendar,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            title: 'Esta Semana',
            value: metricas.servicios_semana,
            icon: CalendarDays,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50',
        },
        {
            title: 'Este Mes',
            value: metricas.servicios_mes,
            icon: CalendarRange,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
        },
        {
            title: 'Vencidos',
            value: vencidos?.total || metricas.vencidos,
            icon: AlertTriangle,
            color: 'text-red-600',
            bg: 'bg-red-50',
            alert: (vencidos?.total || metricas.vencidos) > 0,
        },
        {
            title: 'Próximos (3d)',
            value: metricas.proximos_vencer,
            icon: Clock,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            alert: metricas.proximos_vencer > 5,
        },
        {
            title: 'Total Activos',
            value: metricas.total_programados,
            icon: Wrench,
            color: 'text-gray-600',
            bg: 'bg-gray-50',
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {cards.map((card) => (
                <Card
                    key={card.title}
                    className={`border border-slate-200 bg-white shadow-xs rounded-2xl transition-all duration-200 hover:shadow-sm ${
                        card.alert ? 'border-red-300 ring-1 ring-red-200' : ''
                    }`}
                >
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className={`p-2 rounded-xl ${card.bg}`}>
                                <card.icon className={`h-5 w-5 ${card.color}`} />
                            </div>
                            {card.alert && (
                                <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                                    Alerta
                                </span>
                            )}
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold tracking-tight text-slate-900">{card.value}</p>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">{card.title}</p>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// Componente de carga de técnicos
function CargaTecnicosPanel() {
    const { data: tecnicos, isLoading } = useCargaTecnicos();

    if (isLoading) {
        return <Skeleton className="h-48 rounded-2xl" />;
    }

    if (!tecnicos || tecnicos.length === 0) {
        return (
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
                <CardContent className="p-6 text-center text-muted-foreground">
                    No hay técnicos registrados
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 font-semibold text-slate-900">
                    <Users className="h-5 w-5 text-slate-600" />
                    Carga de Técnicos
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {tecnicos.slice(0, 5).map((tecnico) => (
                        <div key={tecnico.id_tecnico} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                            <div>
                                <p className="font-semibold text-sm text-slate-900">{tecnico.nombre}</p>
                                <p className="text-xs text-slate-500">{tecnico.zona}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-slate-700">{tecnico.servicios_semana} sem</p>
                                    <p className="text-xs text-slate-400">{tecnico.servicios_hoy} hoy</p>
                                </div>
                                <div className="w-20">
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                                        <div
                                            className={`h-full rounded-full ${tecnico.carga_porcentaje >= 80
                                                ? 'bg-red-500'
                                                : tecnico.carga_porcentaje >= 60
                                                    ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                                }`}
                                            style={{ width: `${tecnico.carga_porcentaje}%` }}
                                        />
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500 text-center mt-1">{tecnico.carga_porcentaje}%</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// Componente de tabla de servicios
function ServiciosTable({ servicios, isLoading }: { servicios?: ServicioProgramado[]; isLoading: boolean }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredServicios = useMemo(() => {
        if (!servicios) return [];
        if (!searchTerm) return servicios;

        const term = searchTerm.toLowerCase();
        return servicios.filter((s) => {
            const clienteNombre = s.cliente?.nombre || '';
            const equipoCodigo = s.equipo?.codigo || '';
            const tipoServicioNombre = s.tipo_servicio?.nombre || '';
            const contratoCodigo = s.contrato?.codigo || '';
            return clienteNombre.toLowerCase().includes(term) ||
                equipoCodigo.toLowerCase().includes(term) ||
                tipoServicioNombre.toLowerCase().includes(term) ||
                contratoCodigo.toLowerCase().includes(term);
        });
    }, [servicios, searchTerm]);

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                ))}
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        return formatDateSafe(dateStr, {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
        });
    };

    return (
        <div className="space-y-4">
            {/* Búsqueda */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por cliente, equipo, servicio..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200"
                />
            </div>

            {filteredServicios.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay servicios programados</p>
                </div>
            ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50/75 border-b border-slate-200">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[110px] font-semibold text-slate-700">Fecha</TableHead>
                                <TableHead className="font-semibold text-slate-700">Cliente</TableHead>
                                <TableHead className="font-semibold text-slate-700">Equipo</TableHead>
                                <TableHead className="font-semibold text-slate-700">Servicio</TableHead>
                                <TableHead className="w-[90px] font-semibold text-slate-700">Días</TableHead>
                                <TableHead className="w-[110px] font-semibold text-slate-700">Estado</TableHead>
                                <TableHead className="w-[90px] font-semibold text-slate-700">Prioridad</TableHead>
                                <TableHead className="w-[150px] text-right font-semibold text-slate-700">Orden / Acción</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredServicios.map((servicio) => (
                                <TableRow
                                    key={servicio.id_cronograma}
                                    className={`transition-colors hover:bg-slate-50/80 cursor-pointer ${
                                        servicio.nivel_urgencia === 'CRITICA' ? 'bg-red-50/40' : ''
                                    }`}
                                    onClick={() => {
                                        if (servicio.orden_servicio) {
                                            router.push(`/ordenes/${servicio.orden_servicio.id}`);
                                        } else {
                                            router.push(`/ordenes/nueva?clienteId=${servicio.cliente.id}&equipoId=${servicio.equipo.id}`);
                                        }
                                    }}
                                >
                                    <TableCell className="font-medium">
                                        <div className={`px-2.5 py-1 rounded-lg text-xs font-semibold text-center border ${URGENCIA_COLORS[servicio.nivel_urgencia]}`}>
                                            {formatDate(servicio.fecha_prevista)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/clientes/${servicio.cliente.id}`);
                                                }}
                                                className="font-semibold text-sm text-slate-900 hover:text-blue-600 hover:underline text-left block truncate max-w-[220px]"
                                            >
                                                {servicio.cliente.nombre}
                                            </button>
                                            <p className="text-xs text-slate-500 font-mono">{servicio.cliente.codigo}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/equipos/${servicio.equipo.id}`);
                                                }}
                                                className="font-semibold text-sm text-slate-800 hover:text-blue-600 hover:underline text-left block font-mono"
                                            >
                                                {servicio.equipo.codigo}
                                            </button>
                                            <p className="text-xs text-slate-500">{servicio.equipo.nombre_tipo}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm font-medium text-slate-700">{servicio.tipo_servicio.nombre}</p>
                                        {servicio.contrato?.codigo && (
                                            <p className="text-[11px] text-slate-400 font-mono">Contr: {servicio.contrato.codigo}</p>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block ${
                                                servicio.dias_restantes < 0
                                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                                    : servicio.dias_restantes <= 3
                                                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                            }`}
                                        >
                                            {servicio.dias_restantes < 0
                                                ? `${Math.abs(servicio.dias_restantes)}d atrás`
                                                : servicio.dias_restantes === 0
                                                    ? 'Hoy'
                                                    : `${servicio.dias_restantes}d`}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={ESTADO_BADGES[servicio.estado_cronograma]?.variant || 'secondary'} className="font-medium text-xs">
                                            {ESTADO_BADGES[servicio.estado_cronograma]?.label || servicio.estado_cronograma}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={`text-xs font-semibold ${PRIORIDAD_BADGES[servicio.prioridad]?.className || ''}`}>
                                            {PRIORIDAD_BADGES[servicio.prioridad]?.label || servicio.prioridad}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {servicio.orden_servicio ? (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-8 gap-1.5 text-xs font-semibold border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors shadow-2xs"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/ordenes/${servicio.orden_servicio!.id}`);
                                                }}
                                            >
                                                <FileText className="h-3.5 w-3.5" />
                                                <span>OS #{servicio.orden_servicio.numero}</span>
                                            </Button>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="h-8 gap-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/ordenes/nueva?clienteId=${servicio.cliente.id}&equipoId=${servicio.equipo.id}`);
                                                }}
                                            >
                                                <Plus className="h-3.5 w-3.5" />
                                                <span>Generar OS</span>
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            <div className="text-sm text-muted-foreground text-right">
                {filteredServicios.length} servicios
            </div>
        </div>
    );
}

// Componente de alertas vencidas
function AlertasVencidas() {
    const { data: vencidos, isLoading } = useServiciosVencidos();
    const router = useRouter();

    if (isLoading) {
        return <Skeleton className="h-32 rounded-2xl" />;
    }

    if (!vencidos || vencidos.total === 0) {
        return (
            <Card className="border border-emerald-200 bg-emerald-50/40 rounded-2xl shadow-xs">
                <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                    <div>
                        <p className="font-semibold text-emerald-900">Sin servicios vencidos</p>
                        <p className="text-sm text-emerald-700">Todos los servicios están al día según cronograma</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border border-red-200 bg-red-50/30 rounded-2xl shadow-xs">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between text-red-900 font-semibold">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <span>Servicios Vencidos ({vencidos.total})</span>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {vencidos.data.slice(0, 5).map((servicio) => (
                        <div
                            key={servicio.id_cronograma}
                            className="flex items-center justify-between p-3 bg-white rounded-xl border border-red-200/80 shadow-2xs hover:border-red-300 hover:shadow-xs transition-all gap-3 cursor-pointer"
                            onClick={() => {
                                if (servicio.orden_servicio) {
                                    router.push(`/ordenes/${servicio.orden_servicio.id}`);
                                } else {
                                    router.push(`/ordenes/nueva?clienteId=${servicio.cliente.id}&equipoId=${servicio.equipo.id}`);
                                }
                            }}
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/clientes/${servicio.cliente.id}`);
                                        }}
                                        className="font-semibold text-sm text-slate-900 hover:text-blue-600 truncate text-left"
                                    >
                                        {servicio.cliente.nombre}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground truncate">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/equipos/${servicio.equipo.id}`);
                                        }}
                                        className="font-medium hover:text-blue-600 hover:underline"
                                    >
                                        {servicio.equipo.codigo}
                                    </button>
                                    {' • '}{servicio.tipo_servicio.nombre}
                                </p>
                            </div>
                            <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-red-700 font-bold text-xs bg-red-100/80 px-2 py-1 rounded-md border border-red-200">
                                    {Math.abs(servicio.dias_restantes)}d atrás
                                </span>
                                {servicio.orden_servicio ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs font-semibold border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 shadow-2xs"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/ordenes/${servicio.orden_servicio!.id}`);
                                        }}
                                    >
                                        OS #{servicio.orden_servicio.numero}
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="h-7 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-2xs"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            router.push(`/ordenes/nueva?clienteId=${servicio.cliente.id}&equipoId=${servicio.equipo.id}`);
                                        }}
                                    >
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        Crear OS
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {vencidos.total > 5 && (
                    <p className="text-xs text-red-600 mt-2 text-center font-medium">
                        +{vencidos.total - 5} más vencidos
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

// Página principal
export default function AgendaPage() {
    const [activeTab, setActiveTab] = useState<AgendaView>('hoy');
    const refreshAgenda = useRefreshAgenda();

    const { data: serviciosHoy, isLoading: loadingHoy } = useServiciosHoy();
    const { data: serviciosSemana, isLoading: loadingSemana } = useServiciosSemana();
    const { data: serviciosMes, isLoading: loadingMes } = useServiciosMes();

    const getActiveData = () => {
        switch (activeTab) {
            case 'hoy':
                return { data: serviciosHoy, isLoading: loadingHoy };
            case 'semana':
                return { data: serviciosSemana, isLoading: loadingSemana };
            case 'mes':
                return { data: serviciosMes, isLoading: loadingMes };
            default:
                return { data: serviciosHoy, isLoading: loadingHoy };
        }
    };

    const activeData = getActiveData();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-xl">
                        <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agenda de Servicios</h1>
                        <p className="text-muted-foreground text-sm">
                            Centro de programación inteligente - {new Date().toLocaleDateString('es-CO', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={refreshAgenda} className="border-slate-200 rounded-xl hover:bg-slate-50">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                </Button>
            </div>

            {/* Métricas KPIs */}
            <MetricasPanel />

            {/* Grid: Alertas + Carga Técnicos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AlertasVencidas />
                <CargaTecnicosPanel />
            </div>

            {/* Tabs de vista temporal */}
            <Card className="border border-slate-200 bg-white shadow-xs rounded-2xl">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-semibold text-slate-900">Servicios Programados</CardTitle>
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AgendaView)}>
                            <TabsList className="bg-slate-100 rounded-xl p-1 border border-slate-200/60">
                                <TabsTrigger value="hoy" className="gap-1 rounded-lg">
                                    <Calendar className="h-4 w-4" />
                                    Hoy
                                </TabsTrigger>
                                <TabsTrigger value="semana" className="gap-1 rounded-lg">
                                    <CalendarDays className="h-4 w-4" />
                                    Semana
                                </TabsTrigger>
                                <TabsTrigger value="mes" className="gap-1 rounded-lg">
                                    <CalendarRange className="h-4 w-4" />
                                    Mes
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
                <CardContent>
                    <ServiciosTable
                        servicios={activeData.data?.data}
                        isLoading={activeData.isLoading}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
