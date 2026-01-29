/**
 * MEKANOS S.A.S - Portal Admin
 * Tabla de Firmas Administrativas
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { FirmaAdministrativaConPersona } from '@/types/firmas-administrativas';
import {
    Building2,
    Edit,
    Eye,
    MoreHorizontal,
    Plus,
    RefreshCw,
    Search,
    Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
    useDeleteFirmaAdministrativa,
    useFirmasAdministrativas,
    useRefreshFirmasAdministrativas,
} from '../hooks/use-firmas-administrativas';

export function FirmasAdministrativasTable() {
    const [search, setSearch] = useState('');

    const { data, isLoading, error } = useFirmasAdministrativas({
        firma_activa: true,
    });
    const deleteMutation = useDeleteFirmaAdministrativa();
    const refresh = useRefreshFirmasAdministrativas();

    const firmas = data?.data ?? [];

    // Filtrar por búsqueda local
    const filteredFirmas = firmas.filter((firma) => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        const nombre =
            firma.persona?.razon_social ||
            firma.persona?.nombre_comercial ||
            firma.persona?.nombre_completo ||
            '';
        return nombre.toLowerCase().includes(searchLower);
    });

    const handleDelete = async (id: number) => {
        if (confirm('¿Está seguro de desactivar esta firma administrativa?')) {
            await deleteMutation.mutateAsync(id);
        }
    };

    const getNombreFirma = (firma: FirmaAdministrativaConPersona) => {
        return (
            firma.persona?.razon_social ||
            firma.persona?.nombre_comercial ||
            firma.persona?.nombre_completo ||
            'Sin nombre'
        );
    };

    if (error) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-destructive">
                    Error al cargar firmas administrativas
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Firmas Administrativas</CardTitle>
                        <CardDescription>
                            Gestiona las firmas administrativas y sus clientes asociados
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => refresh()}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button asChild>
                            <Link href="/configuracion/firmas-administrativas/nuevo">
                                <Plus className="h-4 w-4 mr-2" />
                                Nueva Firma
                            </Link>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Búsqueda */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por nombre..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Badge variant="secondary">{filteredFirmas.length} firmas</Badge>
                </div>

                {/* Tabla */}
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Nombre / Razón Social</TableHead>
                                <TableHead>NIT / Cédula</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Observaciones</TableHead>
                                <TableHead className="w-[80px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">
                                        Cargando...
                                    </TableCell>
                                </TableRow>
                            ) : filteredFirmas.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={6}
                                        className="text-center py-10 text-muted-foreground"
                                    >
                                        No hay firmas administrativas registradas
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredFirmas.map((firma) => (
                                    <TableRow key={firma.id_firma_administrativa}>
                                        <TableCell className="font-mono text-xs">
                                            {firma.id_firma_administrativa}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                                <span className="font-medium">
                                                    {getNombreFirma(firma)}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {firma.persona?.numero_identificacion || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={firma.firma_activa ? 'default' : 'secondary'}
                                            >
                                                {firma.firma_activa ? 'Activa' : 'Inactiva'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate">
                                            {firma.observaciones || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={`/configuracion/firmas-administrativas/${firma.id_firma_administrativa}`}
                                                        >
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Ver detalle
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem asChild>
                                                        <Link
                                                            href={`/configuracion/firmas-administrativas/${firma.id_firma_administrativa}/editar`}
                                                        >
                                                            <Edit className="h-4 w-4 mr-2" />
                                                            Editar
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() =>
                                                            handleDelete(firma.id_firma_administrativa)
                                                        }
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Desactivar
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
