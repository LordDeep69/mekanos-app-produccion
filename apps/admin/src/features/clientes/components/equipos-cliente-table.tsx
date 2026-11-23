/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: Tabla de Equipos del Cliente
 * Muestra los equipos asociados a un cliente con filtros
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useEquipos, useToggleVisibilidadOrdenesEquipo } from '@/features/equipos/lib/equipos.service';
import { tiposEquipoService } from '@/features/equipos/lib/tipos-equipo.service';
import type { EstadoEquipo } from '@/features/equipos/types';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Filter, Loader2, Plus, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface EquiposClienteTableProps {
    clienteId: number;
}

const ESTADO_EQUIPO_LABELS: Record<EstadoEquipo, string> = {
    OPERATIVO: 'Operativo',
    STANDBY: 'Standby',
    INACTIVO: 'Inactivo',
    EN_REPARACION: 'En Reparación',
    FUERA_SERVICIO: 'Fuera de Servicio',
    BAJA: 'Baja',
};

const ESTADO_EQUIPO_COLORS: Record<EstadoEquipo, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    OPERATIVO: 'default',
    STANDBY: 'secondary',
    INACTIVO: 'outline',
    EN_REPARACION: 'secondary',
    FUERA_SERVICIO: 'destructive',
    BAJA: 'destructive',
};

export function EquiposClienteTable({ clienteId }: EquiposClienteTableProps) {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [estadoFilter, setEstadoFilter] = useState<string>('TODOS');
    const [tipoFilter, setTipoFilter] = useState<string>('TODOS');
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const limit = 10;

    const toggleVisibilidadMutation = useToggleVisibilidadOrdenesEquipo();

    // Query para tipos de equipo
    const { data: tiposEquipo } = useQuery({
        queryKey: ['tipos-equipo'],
        queryFn: () => tiposEquipoService.listarTodos(),
    });

    // Query para equipos del cliente
    const { data: equiposData, isLoading } = useEquipos({
        id_cliente: clienteId,
        page,
        limit,
        search: search || undefined,
        estado_equipo: estadoFilter !== 'TODOS' ? estadoFilter : undefined,
        tipo: tipoFilter !== 'TODOS' ? tipoFilter : undefined,
    });

    const equipos = equiposData?.data || [];
    const total = (equiposData as any)?.pagination?.total ?? (equiposData as any)?.total ?? equipos.length;
    const totalPages = Math.ceil(total / limit) || 1;

    const handleVerEquipo = (idEquipo: number) => {
        router.push(`/equipos/${idEquipo}`);
    };

    const handleToggleVisibilidadOrdenes = async (
        idEquipo: number,
        nombreOCodigo: string,
        actualmenteOculto: boolean
    ) => {
        const nuevoEstadoOculto = !actualmenteOculto;
        setTogglingId(idEquipo);
        try {
            await toggleVisibilidadMutation.mutateAsync({
                id: idEquipo,
                oculto_en_ordenes: nuevoEstadoOculto,
            });
            toast.success(
                nuevoEstadoOculto
                    ? `${nombreOCodigo} ocultado en el selector de nuevas órdenes`
                    : `${nombreOCodigo} visible nuevamente al crear órdenes`
            );
        } catch (error: any) {
            toast.error(
                error?.response?.data?.message ||
                'No se pudo actualizar la visibilidad del equipo en órdenes'
            );
        } finally {
            setTogglingId(null);
        }
    };

    const handleResetFilters = () => {
        setSearch('');
        setEstadoFilter('TODOS');
        setTipoFilter('TODOS');
        setPage(1);
    };

    return (
        <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="p-5 border-b border-gray-100 bg-gray-50/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-base font-bold text-gray-900">
                            Equipos Asociados
                            <Badge variant="secondary" className="font-bold text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                                {total}
                            </Badge>
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500 mt-0.5">
                            Listado de equipos y maquinaria registrados para este cliente
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => router.push(`/equipos/nuevo?id_cliente=${clienteId}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs text-xs cursor-pointer"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Registrar Equipo
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
                {/* Filtros */}
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por código, nombre o ubicación..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            className="pl-9"
                        />
                    </div>

                    <Select value={estadoFilter} onValueChange={(value) => {
                        setEstadoFilter(value);
                        setPage(1);
                    }}>
                        <SelectTrigger className="w-full md:w-[200px]">
                            <SelectValue placeholder="Estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TODOS">Todos los estados</SelectItem>
                            {Object.entries(ESTADO_EQUIPO_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={tipoFilter} onValueChange={(value) => {
                        setTipoFilter(value);
                        setPage(1);
                    }}>
                        <SelectTrigger className="w-full md:w-[200px]">
                            <SelectValue placeholder="Tipo de equipo" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TODOS">Todos los tipos</SelectItem>
                            {tiposEquipo?.map((tipo) => (
                                <SelectItem key={tipo.id_tipo_equipo} value={tipo.id_tipo_equipo.toString()}>
                                    {tipo.nombre_tipo}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {(search || estadoFilter || tipoFilter) && (
                        <Button variant="outline" onClick={handleResetFilters}>
                            <Filter className="h-4 w-4 mr-2" />
                            Limpiar
                        </Button>
                    )}
                </div>

                {/* Tabla */}
                {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                        Cargando equipos...
                    </div>
                ) : equipos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        {search || estadoFilter || tipoFilter
                            ? 'No se encontraron equipos con los filtros aplicados'
                            : 'No hay equipos registrados para este cliente'}
                    </div>
                ) : (
                    <>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Nombre</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Ubicación</TableHead>
                                        <TableHead className="text-right">Acciones</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {equipos.map((equipo) => {
                                        const estaOculto = Boolean(equipo.oculto_en_ordenes);
                                        const isToggling = togglingId === equipo.id_equipo;
                                        const tipoLabel =
                                            equipo.tipo === 'GENERADOR'
                                                ? 'Generador'
                                                : equipo.tipo === 'BOMBA'
                                                    ? 'Bomba'
                                                    : equipo.tipo === 'MOTOR'
                                                        ? 'Motor'
                                                        : equipo.tipo === 'COMPRESOR'
                                                            ? 'Compresor'
                                                            : equipo.tipos_equipo?.nombre_tipo || '-';

                                        return (
                                            <TableRow
                                                key={equipo.id_equipo}
                                                className={estaOculto ? 'bg-amber-50/50 hover:bg-amber-50/80' : undefined}
                                            >
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={estaOculto ? 'text-gray-500' : undefined}>
                                                            {equipo.codigo_equipo}
                                                        </span>
                                                        {estaOculto && (
                                                            <Badge
                                                                variant="outline"
                                                                className="w-fit text-[10px] font-semibold bg-amber-100/80 text-amber-800 border-amber-300 px-1.5 py-0"
                                                            >
                                                                <EyeOff className="h-2.5 w-2.5 mr-1" />
                                                                Oculto en órdenes
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className={estaOculto ? 'text-gray-500' : undefined}>
                                                    {equipo.nombre_equipo || '-'}
                                                </TableCell>
                                                <TableCell>
                                                    {tipoLabel}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={ESTADO_EQUIPO_COLORS[equipo.estado_equipo as EstadoEquipo]}>
                                                        {ESTADO_EQUIPO_LABELS[equipo.estado_equipo as EstadoEquipo]}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="max-w-[200px] truncate">
                                                    {equipo.ubicacion_texto}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="inline-flex items-center justify-end gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            disabled={isToggling}
                                                            onClick={() =>
                                                                handleToggleVisibilidadOrdenes(
                                                                    equipo.id_equipo,
                                                                    equipo.nombre_equipo || equipo.codigo_equipo,
                                                                    estaOculto
                                                                )
                                                            }
                                                            title={
                                                                estaOculto
                                                                    ? 'Volver a mostrar este equipo en el listado al crear nuevas órdenes de servicio'
                                                                    : 'Ocultar este equipo del listado al crear nuevas órdenes de servicio'
                                                            }
                                                            className={
                                                                estaOculto
                                                                    ? 'h-8 text-xs font-medium text-emerald-700 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 cursor-pointer'
                                                                    : 'h-8 text-xs font-medium text-amber-700 border-amber-200 bg-white hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300 cursor-pointer'
                                                            }
                                                        >
                                                            {isToggling ? (
                                                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                                            ) : estaOculto ? (
                                                                <Eye className="h-3.5 w-3.5 mr-1.5" />
                                                            ) : (
                                                                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
                                                            )}
                                                            {estaOculto ? 'Mostrar en órdenes' : 'Ocultar en órdenes'}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleVerEquipo(equipo.id_equipo)}
                                                            className="h-8 text-xs cursor-pointer"
                                                        >
                                                            <Eye className="h-4 w-4 mr-1" />
                                                            Ver
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">
                                    Mostrando {(page - 1) * limit + 1} a {Math.min(page * limit, total)} de {total} equipos
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Anterior
                                    </Button>
                                    <span className="text-sm">
                                        Página {page} de {totalPages}
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Siguiente
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
