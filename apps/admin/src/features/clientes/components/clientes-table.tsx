/**
 * MEKANOS S.A.S - Portal Admin
 * Tabla de Clientes con paginación y búsqueda
 */

'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    TIPO_CLIENTE_LABELS,
    TipoClienteEnum,
    type ClienteConPersona
} from '@/types/clientes';
import {
    Building2,
    ChevronLeft,
    ChevronRight,
    Eye,
    Mail,
    Pencil,
    Phone,
    Plus,
    RefreshCw,
    Search,
    Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useClientes, useDeleteCliente, useRefreshClientes } from '../hooks/use-clientes';

const PAGE_SIZE = 10;

export function ClientesTable() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoClienteEnum | 'TODOS'>('TODOS');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const refreshClientes = useRefreshClientes();
  const deleteMutation = useDeleteCliente();

  // Query con filtros
  const { data, isLoading, isError, error } = useClientes({
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    tipo_cliente: tipoFilter !== 'TODOS' ? tipoFilter : undefined,
    search: search || undefined,
  });

  const clientes = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Handlers
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0); // Reset a primera página
  };

  const handleTipoChange = (value: string) => {
    setTipoFilter(value as TipoClienteEnum | 'TODOS');
    setPage(0);
  };

  const handleView = (id: number) => {
    router.push(`/clientes/${id}`);
  };

  const handleEdit = (id: number) => {
    router.push(`/clientes/${id}/editar`);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleNew = () => {
    router.push('/clientes/nuevo');
  };

  // Obtener nombre del cliente (persona natural o jurídica)
  const getClienteName = (cliente: ClienteConPersona): string => {
    const persona = cliente.persona;
    if (!persona) return `Cliente #${cliente.id_cliente}`;
    
    if (persona.tipo_persona === 'JURIDICA') {
      return persona.razon_social || persona.nombre_comercial || 'Sin nombre';
    }
    return persona.nombre_completo || 
           `${persona.primer_nombre || ''} ${persona.primer_apellido || ''}`.trim() || 
           'Sin nombre';
  };

  const getNit = (cliente: ClienteConPersona): string => {
    return cliente.persona?.numero_identificacion || '-';
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-lg">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex p-4 border-b last:border-0">
              <Skeleton className="h-6 flex-1" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">
          Error al cargar clientes: {(error as Error)?.message || 'Error desconocido'}
        </p>
        <Button onClick={refreshClientes} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar: Búsqueda, Filtros, Acciones */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-1 gap-4">
          {/* Búsqueda */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, NIT..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro tipo */}
          <Select value={tipoFilter} onValueChange={handleTipoChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo cliente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos los tipos</SelectItem>
              {Object.entries(TIPO_CLIENTE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Refrescar */}
          <Button variant="outline" size="icon" onClick={refreshClientes}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Nuevo Cliente */}
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Código</TableHead>
              <TableHead>Nombre / Razón Social</TableHead>
              <TableHead>NIT/CC</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px] text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No se encontraron clientes
                </TableCell>
              </TableRow>
            ) : (
              clientes.map((cliente) => (
                <TableRow 
                  key={cliente.id_cliente}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleView(cliente.id_cliente)}
                >
                  <TableCell className="font-mono text-sm">
                    {cliente.codigo_cliente || `#${cliente.id_cliente}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{getClienteName(cliente)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {getNit(cliente)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {TIPO_CLIENTE_LABELS[cliente.tipo_cliente] || cliente.tipo_cliente}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {cliente.persona?.telefono_principal && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {cliente.persona.telefono_principal}
                        </span>
                      )}
                      {cliente.persona?.email_principal && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {cliente.persona.email_principal}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cliente.cliente_activo ? 'default' : 'destructive'}>
                      {cliente.cliente_activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(cliente.id_cliente)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(cliente.id_cliente)}
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(cliente.id_cliente)}
                        title="Eliminar"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog confirmación eliminar */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El cliente será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
