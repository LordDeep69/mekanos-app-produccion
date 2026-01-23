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
import type { AgendaView, NivelUrgencia, ServicioProgramado } from '@/types/agenda';
import {
    AlertTriangle,
    Calendar,
    CalendarDays,
    CalendarRange,
    CheckCircle2,
    ChevronRight,
    Clock,
    RefreshCw,
    Search,
    Users,
    Wrench
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

// Colores por nivel de urgencia
const URGENCIA_COLORS: Record<NivelUrgencia, string> = {
    CRITICA: 'bg-red-100 text-red-800 border-red-300',
    ALTA: 'bg-orange-100 text-orange-800 border-orange-300',
    MEDIA: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    NORMAL: 'bg-green-100 text-green-800 border-green-300',
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
                    <Skeleton key={i} className="h-24" />
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {cards.map((card) => (
                <Card key={card.title} className={card.alert ? 'border-red-300 animate-pulse' : ''}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className={`p-2 rounded-lg ${card.bg}`}>
                                <card.icon className={`h-5 w-5 ${card.color}`} />
                            </div>
                            {card.alert && (
                                <span className="text-xs text-red-600 font-medium">Alerta</span>
                            )}
                        </div>
                        <div className="mt-3">
                            <p className="text-2xl font-bold">{card.value}</p>
                            <p className="text-sm text-muted-foreground">{card.title}</p>
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
        return <Skeleton className="h-48" />;
    }

    if (!tecnicos || tecnicos.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                No hay técnicos registrados
            </div>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Carga de Técnicos
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {tecnicos.slice(0, 5).map((tecnico) => (
                        <div key={tecnico.id_tecnico} className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-sm">{tecnico.nombre}</p>
                                <p className="text-xs text-muted-foreground">{tecnico.zona}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm font-medium">{tecnico.servicios_semana} esta semana</p>
                                    <p className="text-xs text-muted-foreground">{tecnico.servicios_hoy} hoy</p>
                                </div>
                                <div className="w-20">
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${tecnico.carga_porcentaje >= 80
                                                ? 'bg-red-500'
                                                : tecnico.carga_porcentaje >= 60
                                                    ? 'bg-orange-500'
                                                    : 'bg-green-500'
                                                }`}
                                            style={{ width: `${tecnico.carga_porcentaje}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-center mt-1">{tecnico.carga_porcentaje}%</p>
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
                    <Skeleton key={i} className="h-16" />
                ))}
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CO', {
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
                    className="pl-10"
                />
            </div>

            {filteredServicios.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No hay servicios programados</p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[100px]">Fecha</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Equipo</TableHead>
                                <TableHead>Servicio</TableHead>
                                <TableHead className="w-[80px]">Días</TableHead>
                                <TableHead className="w-[100px]">Estado</TableHead>
                                <TableHead className="w-[80px]">Prioridad</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredServicios.map((servicio) => (
                                <TableRow
                                    key={servicio.id_cronograma}
                                    className={`cursor-pointer hover:bg-muted/50 ${servicio.nivel_urgencia === 'CRITICA' ? 'bg-red-50' : ''
                                        }`}
                                    onClick={() => {
                                        if (servicio.orden_servicio) {
                                            router.push(`/ordenes/${servicio.orden_servicio.id}`);
                                        }
                                    }}
                                >
                                    <TableCell className="font-medium">
                                        <div className={`px-2 py-1 rounded text-xs text-center ${URGENCIA_COLORS[servicio.nivel_urgencia]}`}>
                                            {formatDate(servicio.fecha_prevista)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-sm">{servicio.cliente.nombre}</p>
                                            <p className="text-xs text-muted-foreground">{servicio.cliente.codigo}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="text-sm">{servicio.equipo.codigo}</p>
                                            <p className="text-xs text-muted-foreground">{servicio.equipo.nombre_tipo}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm">{servicio.tipo_servicio.nombre}</p>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={`font-bold ${servicio.dias_restantes < 0
                                                ? 'text-red-600'
                                                : servicio.dias_restantes <= 3
                                                    ? 'text-orange-600'
                                                    : 'text-gray-600'
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
                                        <Badge variant={ESTADO_BADGES[servicio.estado_cronograma]?.variant || 'secondary'}>
                                            {ESTADO_BADGES[servicio.estado_cronograma]?.label || servicio.estado_cronograma}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={PRIORIDAD_BADGES[servicio.prioridad]?.className || ''}>
                                            {PRIORIDAD_BADGES[servicio.prioridad]?.label || servicio.prioridad}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
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
        return <Skeleton className="h-32" />;
    }

    if (!vencidos || vencidos.total === 0) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <div>
                        <p className="font-medium text-green-800">Sin servicios vencidos</p>
                        <p className="text-sm text-green-600">Todos los servicios están al día</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-red-300 bg-red-50">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-5 w-5" />
                    Servicios Vencidos ({vencidos.total})
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {vencidos.data.slice(0, 5).map((servicio) => (
                        <div
                            key={servicio.id_cronograma}
                            className="flex items-center justify-between p-2 bg-white rounded border border-red-200 cursor-pointer hover:bg-red-100"
                            onClick={() => {
                                if (servicio.orden_servicio) {
                                    router.push(`/ordenes/${servicio.orden_servicio.id}`);
                                }
                            }}
                        >
                            <div>
                                <p className="font-medium text-sm">{servicio.cliente.nombre}</p>
                                <p className="text-xs text-muted-foreground">
                                    {servicio.equipo.codigo} - {servicio.tipo_servicio.nombre}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-red-600 font-bold text-sm">
                                    {Math.abs(servicio.dias_restantes)} días atrás
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                {vencidos.total > 5 && (
                    <p className="text-xs text-red-600 mt-2 text-center">
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
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Agenda de Servicios</h1>
                        <p className="text-muted-foreground">
                            Centro de programación inteligente - {new Date().toLocaleDateString('es-CO', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                    </div>
                </div>
                <Button variant="outline" onClick={refreshAgenda}>
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
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Servicios Programados</CardTitle>
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AgendaView)}>
                            <TabsList>
                                <TabsTrigger value="hoy" className="gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Hoy
                                </TabsTrigger>
                                <TabsTrigger value="semana" className="gap-1">
                                    <CalendarDays className="h-4 w-4" />
                                    Semana
                                </TabsTrigger>
                                <TabsTrigger value="mes" className="gap-1">
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
