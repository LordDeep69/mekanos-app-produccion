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
import { useEquipos } from '@/features/equipos/lib/equipos.service';
import { tiposEquipoService } from '@/features/equipos/lib/tipos-equipo.service';
import type { EstadoEquipo } from '@/features/equipos/types';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Eye, Filter, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
    const [estadoFilter, setEstadoFilter] = useState<string>('');
    const [tipoFilter, setTipoFilter] = useState<string>('');
    const limit = 10;

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
        estado_equipo: estadoFilter || undefined,
        tipo: tipoFilter || undefined,
    });

    const equipos = equiposData?.data || [];
    const total = equiposData?.total || 0;
    const totalPages = Math.ceil(total / limit);

    const handleVerEquipo = (idEquipo: number) => {
        router.push(`/equipos/${idEquipo}`);
    };

    const handleResetFilters = () => {
        setSearch('');
        setEstadoFilter('');
        setTipoFilter('');
        setPage(1);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    Equipos Asociados
                    <Badge variant="secondary">{total}</Badge>
                </CardTitle>
                <CardDescription>
                    Listado de equipos registrados para este cliente
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                            <SelectItem value="">Todos los estados</SelectItem>
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
                            <SelectItem value="">Todos los tipos</SelectItem>
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
                                    {equipos.map((equipo) => (
                                        <TableRow key={equipo.id_equipo}>
                                            <TableCell className="font-medium">
                                                {equipo.codigo_equipo}
                                            </TableCell>
                                            <TableCell>
                                                {equipo.nombre_equipo || '-'}
                                            </TableCell>
                                            <TableCell>
                                                {equipo.tipo_equipo?.nombre_tipo || '-'}
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
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleVerEquipo(equipo.id_equipo)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Ver
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
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
