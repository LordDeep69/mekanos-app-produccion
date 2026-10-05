/**
 * MEKANOS S.A.S - Portal Admin
 * Tabla de Clientes con paginación, filtros avanzados y resumen KPI operativo
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
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  type ClienteConPersona,
} from '@/types/clientes';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  Droplets,
  Eye,
  FilePlus2,
  FileText,
  Layers,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getClientes } from '../api/clientes.service';
import { useClientes, useDeleteCliente, useRefreshClientes } from '../hooks/use-clientes';
import { EquiposClienteTable } from './equipos-cliente-table';

const PAGE_SIZE = 10;
type SortField = 'codigo' | 'nombre' | 'nit' | 'tipo' | 'estado';

export function ClientesTable() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<TipoClienteEnum | 'TODOS'>('TODOS');
  const [tipoEquipoFilter, setTipoEquipoFilter] = useState<'TODOS' | 'PLANTAS' | 'BOMBAS' | 'AMBOS' | 'SIN_EQUIPOS'>('TODOS');
  const [estructuraFilter, setEstructuraFilter] = useState<'TODOS' | 'PRINCIPALES' | 'SEDES' | 'INDEPENDIENTES'>('TODOS');
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Modal para inspección rápida de equipos
  const [selectedClienteEquipos, setSelectedClienteEquipos] = useState<{ id: number; nombre: string } | null>(null);

  // Ordenamiento local de columnas
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Estado de exportación CSV
  const [isExporting, setIsExporting] = useState(false);

  const refreshClientes = useRefreshClientes();
  const deleteMutation = useDeleteCliente();

  // Debounce optimizado a 300ms para búsqueda ágil
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Query con filtros
  const { data, isLoading, isFetching, isError, error } = useClientes({
    skip: page * PAGE_SIZE,
    take: PAGE_SIZE,
    tipo_cliente: tipoFilter !== 'TODOS' ? tipoFilter : undefined,
    tipo_equipo: tipoEquipoFilter !== 'TODOS' ? tipoEquipoFilter : undefined,
    estructura: estructuraFilter !== 'TODOS' ? estructuraFilter : undefined,
    search: search || undefined,
  });

  const clientes = data?.data ?? [];
  const total = data?.total ?? 0;
  const summary = data?.summary;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Handlers de búsqueda y filtros
  const handleSearch = (value: string) => {
    setSearchInput(value);
  };

  const handleTipoChange = (value: string) => {
    setTipoFilter(value as TipoClienteEnum | 'TODOS');
    setPage(0);
  };

  const handleTipoEquipoChange = (value: string) => {
    setTipoEquipoFilter(value as any);
    setPage(0);
  };

  const handleEstructuraChange = (value: string) => {
    setEstructuraFilter(value as any);
    setPage(0);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
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

  // Obtener nombre del cliente con resolución jerárquica
  const getClienteName = (cliente: ClienteConPersona): string => {
    const persona = cliente.persona;
    const baseName = (() => {
      if (!persona) return `Cliente #${cliente.id_cliente}`;
      if (persona.nombre_comercial && persona.nombre_comercial.trim()) return persona.nombre_comercial;
      if (persona.nombre_completo && persona.nombre_completo.trim()) return persona.nombre_completo;
      const nombrePersona = `${persona.primer_nombre || ''} ${persona.primer_apellido || ''}`.trim();
      if (nombrePersona) return nombrePersona;
      return persona.razon_social || 'Sin nombre';
    })();

    if ((cliente as any).nombre_sede) {
      return `${(cliente as any).nombre_sede} (${baseName})`;
    }

    return baseName;
  };

  const getNit = (cliente: ClienteConPersona): string => {
    return cliente.persona?.numero_identificacion || '-';
  };

  // Exportar a CSV con BOM UTF-8 y separador ';' compatible 100% con Excel en español
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const fullData = await getClientes({
        skip: 0,
        take: 1000,
        tipo_cliente: tipoFilter !== 'TODOS' ? tipoFilter : undefined,
        tipo_equipo: tipoEquipoFilter !== 'TODOS' ? tipoEquipoFilter : undefined,
        estructura: estructuraFilter !== 'TODOS' ? estructuraFilter : undefined,
        search: search || undefined,
      });

      const itemsToExport = fullData?.data || [];
      if (itemsToExport.length === 0) {
        alert('No hay clientes para exportar con los filtros seleccionados.');
        return;
      }

      const headers = [
        'Código',
        'Nombre / Razón Social',
        'Relación de Sedes',
        'Sede De',
        'Total Sedes',
        'NIT / Identificación',
        'Tipo de Cliente',
        'Asesor Asignado',
        'Teléfono',
        'Correo',
        'Ciudad',
        'Dirección',
        'Google Maps URL',
        'Tiene Plantas',
        'Total Plantas',
        'Tiene Bombas',
        'Total Bombas',
        'Estado',
      ];

      const csvRows = itemsToExport.map((c) => {
        const nombre = getClienteName(c);
        const estructura = c.es_cliente_principal
          ? 'Matriz / Principal'
          : c.id_cliente_principal
          ? 'Sede / Sucursal'
          : 'Independiente';
        const sedeDe = c.cliente_principal?.persona?.razon_social || c.cliente_principal?.persona?.nombre_comercial || '';
        const totalSedes = (c as any).total_sedes || 0;
        const nit = getNit(c);
        const tipo = TIPO_CLIENTE_LABELS[c.tipo_cliente] || c.tipo_cliente;
        const asesor = c.asesor_asignado?.persona?.nombre_completo || 'Sin asignar';
        const tel = c.persona?.telefono_principal || c.persona?.celular || '';
        const email = c.persona?.email_principal || '';
        const ciudad = c.persona?.ciudad || '';
        const dir = c.persona?.direccion_principal || '';
        const mapsUrl = (c.persona as any)?.url_ubicacion || '';
        const tienePlantas = c.tiene_plantas ? 'SÍ' : 'NO';
        const totalPlantas = c.total_equipos_plantas || 0;
        const tieneBombas = c.tiene_bombas ? 'SÍ' : 'NO';
        const totalBombas = c.total_equipos_bombas || 0;
        const estado = c.cliente_activo ? 'Activo' : 'Inactivo';

        return [
          `"${(c.codigo_cliente || '').replace(/"/g, '""')}"`,
          `"${nombre.replace(/"/g, '""')}"`,
          `"${estructura}"`,
          `"${sedeDe.replace(/"/g, '""')}"`,
          totalSedes,
          `"${nit.replace(/"/g, '""')}"`,
          `"${tipo.replace(/"/g, '""')}"`,
          `"${asesor.replace(/"/g, '""')}"`,
          `"${tel.replace(/"/g, '""')}"`,
          `"${email.replace(/"/g, '""')}"`,
          `"${ciudad.replace(/"/g, '""')}"`,
          `"${dir.replace(/"/g, '""')}"`,
          `"${mapsUrl.replace(/"/g, '""')}"`,
          `"${tienePlantas}"`,
          totalPlantas,
          `"${tieneBombas}"`,
          totalBombas,
          `"${estado}"`,
        ].join(';');
      });

      const csvContent = '\uFEFF' + [headers.join(';'), ...csvRows].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.setAttribute('href', url);
      link.setAttribute('download', `clientes_mekanos_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al exportar clientes a CSV:', err);
      alert('Ocurrió un error al generar la exportación.');
    } finally {
      setIsExporting(false);
    }
  };

  // Clientes ordenados para visualización
  const sortedClientes = [...clientes].sort((a, b) => {
    let aVal = '';
    let bVal = '';

    if (sortField === 'codigo') {
      aVal = a.codigo_cliente || '';
      bVal = b.codigo_cliente || '';
    } else if (sortField === 'nombre') {
      aVal = getClienteName(a);
      bVal = getClienteName(b);
    } else if (sortField === 'nit') {
      aVal = getNit(a);
      bVal = getNit(b);
    } else if (sortField === 'tipo') {
      aVal = a.tipo_cliente || '';
      bVal = b.tipo_cliente || '';
    } else if (sortField === 'estado') {
      aVal = a.cliente_activo ? 'Activo' : 'Inactivo';
      bVal = b.cliente_activo ? 'Activo' : 'Inactivo';
    }

    const comparison = aVal.localeCompare(bVal, 'es', { numeric: true, sensitivity: 'base' });
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Skeleton de carga inicial
  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20 sm:h-24 w-full rounded-lg" />
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Skeleton className="h-10 w-full sm:w-64" />
          <Skeleton className="h-10 w-full sm:w-32" />
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

  // Estado de error
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
    <div className="space-y-4 sm:space-y-5">
      {/* 📊 TARJETAS KPI DE RESUMEN OPERATIVO CON FILTRADO INTERACTIVO (Adaptado a móviles) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Total Clientes */}
        <Card
          onClick={() => {
            setTipoEquipoFilter('TODOS');
            setTipoFilter('TODOS');
            setPage(0);
          }}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md border-border/80 ${
            tipoEquipoFilter === 'TODOS' && tipoFilter === 'TODOS'
              ? 'ring-2 ring-primary/40 bg-accent/30'
              : 'hover:border-primary/50'
          }`}
        >
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-1.5">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                Total Clientes
              </p>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-2xl font-bold tracking-tight">
                  {summary?.total ?? total}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  ({summary?.activos ?? 0} act.)
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground/80 hidden sm:block">
                Clic para ver todos
              </p>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Clientes con Plantas */}
        <Card
          onClick={() => {
            setTipoEquipoFilter((prev) => (prev === 'PLANTAS' ? 'TODOS' : 'PLANTAS'));
            setPage(0);
          }}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            tipoEquipoFilter === 'PLANTAS'
              ? 'ring-2 ring-amber-500 bg-amber-50/70 border-amber-300'
              : 'border-border/80 hover:border-amber-400/60'
          }`}
        >
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-1.5">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-amber-700 uppercase tracking-wider truncate">
                Con Plantas
              </p>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-2xl font-bold tracking-tight text-amber-950">
                  {summary?.con_plantas ?? 0}
                </span>
                <span className="text-[10px] sm:text-xs text-amber-700/80">
                  clientes
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-amber-600/90 truncate hidden sm:block">
                {tipoEquipoFilter === 'PLANTAS' ? '✓ Filtro activo' : 'Clic para filtrar'}
              </p>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <Zap className="h-4 w-4 sm:h-5 sm:w-5 fill-amber-500 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Clientes con Bombas */}
        <Card
          onClick={() => {
            setTipoEquipoFilter((prev) => (prev === 'BOMBAS' ? 'TODOS' : 'BOMBAS'));
            setPage(0);
          }}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            tipoEquipoFilter === 'BOMBAS'
              ? 'ring-2 ring-blue-500 bg-blue-50/70 border-blue-300'
              : 'border-border/80 hover:border-blue-400/60'
          }`}
        >
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-1.5">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-blue-700 uppercase tracking-wider truncate">
                Con Bombas
              </p>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-2xl font-bold tracking-tight text-blue-950">
                  {summary?.con_bombas ?? 0}
                </span>
                <span className="text-[10px] sm:text-xs text-blue-700/80">
                  clientes
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-blue-600/90 truncate hidden sm:block">
                {tipoEquipoFilter === 'BOMBAS' ? '✓ Filtro activo' : 'Clic para filtrar'}
              </p>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Droplets className="h-4 w-4 sm:h-5 sm:w-5 fill-blue-500 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Plantas y Bombas / Estructura */}
        <Card
          onClick={() => {
            setTipoEquipoFilter((prev) => (prev === 'AMBOS' ? 'TODOS' : 'AMBOS'));
            setPage(0);
          }}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            tipoEquipoFilter === 'AMBOS'
              ? 'ring-2 ring-purple-500 bg-purple-50/70 border-purple-300'
              : 'border-border/80 hover:border-purple-400/60'
          }`}
        >
          <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-1.5">
            <div className="space-y-0.5 min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-purple-700 uppercase tracking-wider truncate">
                Ambos Equipos
              </p>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg sm:text-2xl font-bold tracking-tight text-purple-950">
                  {summary?.con_ambos ?? 0}
                </span>
                <span className="text-[10px] sm:text-xs text-purple-700/80">
                  mixtos
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground truncate hidden sm:flex">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEstructuraFilter((prev) => (prev === 'PRINCIPALES' ? 'TODOS' : 'PRINCIPALES'));
                    setPage(0);
                  }}
                  className={`hover:underline font-semibold transition-colors ${
                    estructuraFilter === 'PRINCIPALES'
                      ? 'text-indigo-800 font-bold underline bg-indigo-100/80 px-1 rounded'
                      : 'text-purple-800 hover:text-purple-950'
                  }`}
                  title="Filtrar por Clientes Principales"
                >
                  {summary?.corporativos ?? 0} corp
                </button>
                <span>·</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEstructuraFilter((prev) => (prev === 'SEDES' ? 'TODOS' : 'SEDES'));
                    setPage(0);
                  }}
                  className={`hover:underline font-semibold transition-colors ${
                    estructuraFilter === 'SEDES'
                      ? 'text-emerald-800 font-bold underline bg-emerald-100/80 px-1 rounded'
                      : 'text-purple-800 hover:text-purple-950'
                  }`}
                  title="Filtrar por Sedes / Sucursales"
                >
                  {summary?.sedes ?? 0} sedes
                </button>
              </div>
            </div>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
              <Layers className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar Responsive: Búsqueda, Filtros y Acciones */}
      <div className="flex flex-col gap-2.5">
        {/* Fila 1: Búsqueda y Botones de Acción */}
        <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center">
          {/* Campo de Búsqueda */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, NIT, sede, ciudad..."
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs sm:text-sm"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                  setPage(0);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm"
                title="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Acciones principales: Exportar y Nuevo */}
          <div className="flex gap-2 items-center justify-between sm:justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={isExporting || total === 0}
              className="h-9 flex-1 sm:flex-none text-xs sm:text-sm"
              title="Exportar listado actual a Excel / CSV"
            >
              <Download className={`h-3.5 w-3.5 mr-1.5 ${isExporting ? 'animate-bounce' : ''}`} />
              {isExporting ? 'Exportando...' : 'Exportar CSV'}
            </Button>
            <Button size="sm" onClick={handleNew} className="h-9 flex-1 sm:flex-none text-xs sm:text-sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nuevo Cliente
            </Button>
          </div>
        </div>

        {/* Fila 2: Filtros desplegables y Refrescar */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
          {/* Filtro tipo */}
          <Select value={tipoFilter} onValueChange={handleTipoChange}>
            <SelectTrigger className="w-full sm:w-[170px] h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Tipo cliente" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-200 shadow-xl z-50">
              <SelectItem value="TODOS">Todos los tipos</SelectItem>
              {Object.entries(TIPO_CLIENTE_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por tipo de equipo (Plantas / Bombas) */}
          <Select value={tipoEquipoFilter} onValueChange={handleTipoEquipoChange}>
            <SelectTrigger className="w-full sm:w-[190px] h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Equipos" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-200 shadow-xl z-50">
              <SelectItem value="TODOS">Todos los equipos</SelectItem>
              <SelectItem value="PLANTAS">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span>Con Plantas</span>
                </span>
              </SelectItem>
              <SelectItem value="BOMBAS">
                <span className="flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />
                  <span>Con Bombas</span>
                </span>
              </SelectItem>
              <SelectItem value="AMBOS">
                <span className="flex items-center gap-1.5">
                  <span className="flex -space-x-1">
                    <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <Droplets className="h-3.5 w-3.5 text-blue-500 fill-blue-500" />
                  </span>
                  <span>Plantas y Bombas</span>
                </span>
              </SelectItem>
              <SelectItem value="SIN_EQUIPOS">
                <span className="text-muted-foreground">Sin equipos</span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Filtro por relación de sedes (Matrices / Sedes / Independientes) */}
          <Select value={estructuraFilter} onValueChange={handleEstructuraChange}>
            <SelectTrigger
              className="w-full sm:w-[210px] h-9 text-xs sm:text-sm"
              title="Filtrar por Matrices, Sedes o Clientes Independientes"
            >
              <SelectValue placeholder="Matrices y Sedes" />
            </SelectTrigger>
            <SelectContent className="bg-white border border-slate-200 shadow-xl z-50">
              <SelectItem value="TODOS">
                <span>Todos los clientes</span>
              </SelectItem>
              <SelectItem value="PRINCIPALES">
                <span className="flex items-center gap-1.5">
                  <span className="text-xs">🏢</span>
                  <span>Clientes Principales ({summary?.corporativos ?? 0})</span>
                </span>
              </SelectItem>
              <SelectItem value="SEDES">
                <span className="flex items-center gap-1.5">
                  <span className="text-xs">📍</span>
                  <span>Sedes / Sucursales ({summary?.sedes ?? 0})</span>
                </span>
              </SelectItem>
              <SelectItem value="INDEPENDIENTES">
                <span className="flex items-center gap-1.5">
                  <span className="text-xs">👤</span>
                  <span>Independientes ({summary?.independientes ?? (summary ? summary.total - summary.corporativos - summary.sedes : 0)})</span>
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Refrescar */}
          <Button
            variant="outline"
            size="icon"
            onClick={refreshClientes}
            disabled={isFetching}
            title="Recargar lista"
            className="h-9 w-9 shrink-0 ml-auto sm:ml-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Tabla con scroll horizontal garantizado y columna de Acciones fija (Sticky) */}
      <div className="border rounded-lg overflow-x-auto bg-card shadow-xs">
        <Table className="min-w-[850px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead
                className="w-[90px] cursor-pointer select-none hover:text-foreground text-xs"
                onClick={() => handleSort('codigo')}
              >
                <div className="flex items-center gap-1">
                  <span>Código</span>
                  {sortField === 'codigo' ? (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="min-w-[220px] cursor-pointer select-none hover:text-foreground text-xs"
                onClick={() => handleSort('nombre')}
              >
                <div className="flex items-center gap-1">
                  <span>Nombre / Razón Social</span>
                  {sortField === 'nombre' ? (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="w-[110px] cursor-pointer select-none hover:text-foreground text-xs"
                onClick={() => handleSort('nit')}
              >
                <div className="flex items-center gap-1">
                  <span>NIT/CC</span>
                  {sortField === 'nit' ? (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="w-[120px] cursor-pointer select-none hover:text-foreground text-xs"
                onClick={() => handleSort('tipo')}
              >
                <div className="flex items-center gap-1">
                  <span>Tipo</span>
                  {sortField === 'tipo' ? (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  )}
                </div>
              </TableHead>
              <TableHead className="min-w-[130px] text-xs">Asesor</TableHead>
              <TableHead className="min-w-[150px] text-xs">Contacto</TableHead>
              <TableHead
                className="w-[90px] cursor-pointer select-none hover:text-foreground text-xs"
                onClick={() => handleSort('estado')}
              >
                <div className="flex items-center gap-1">
                  <span>Estado</span>
                  {sortField === 'estado' ? (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                  ) : (
                    <ArrowUpDown className="h-3 w-3 text-muted-foreground/60" />
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[120px] text-right sticky right-0 bg-card z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] text-xs">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedClientes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No se encontraron clientes {tipoEquipoFilter !== 'TODOS' ? `con filtro: ${tipoEquipoFilter === 'PLANTAS' ? 'Plantas' : tipoEquipoFilter === 'BOMBAS' ? 'Bombas' : tipoEquipoFilter.toLowerCase()}` : ''}
                </TableCell>
              </TableRow>
            ) : (
              sortedClientes.map((cliente) => (
                <TableRow
                  key={cliente.id_cliente}
                  className="cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => handleView(cliente.id_cliente)}
                >
                  <TableCell className="font-mono text-xs sm:text-sm font-medium">
                    {cliente.codigo_cliente || `#${cliente.id_cliente}`}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium text-foreground text-xs sm:text-sm">{getClienteName(cliente)}</span>
                        {/* Badges de Jerarquía Estructural */}
                        {cliente.es_cliente_principal && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0"
                            title="Cliente Corporativo Matriz"
                          >
                            <span>🏢 Matriz</span>
                            {Boolean((cliente as any).total_sedes && (cliente as any).total_sedes > 0) && (
                              <span className="ml-0.5 px-1 py-0.2 bg-indigo-200/80 text-indigo-900 rounded text-[9px] font-bold">
                                {(cliente as any).total_sedes} {(cliente as any).total_sedes === 1 ? 'sede' : 'sedes'}
                              </span>
                            )}
                          </span>
                        )}
                        {!cliente.es_cliente_principal && cliente.id_cliente_principal && (
                          <span
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                            title="Sede Sucursal vinculada a un cliente matriz"
                          >
                            <span>📍 Sede</span>
                          </span>
                        )}
                      </div>

                      {/* Sub-texto con enlace de matriz si es sede */}
                      {!cliente.es_cliente_principal && cliente.cliente_principal && (
                        <p className="text-[11px] text-muted-foreground pl-6 flex items-center gap-1 truncate">
                          <span className="text-slate-400">↳ Matriz:</span>
                          <span className="font-medium text-slate-700 truncate">
                            {cliente.cliente_principal.persona?.razon_social ||
                             cliente.cliente_principal.persona?.nombre_comercial ||
                             cliente.cliente_principal.nombre_sede ||
                             `Cliente #${cliente.id_cliente_principal}`}
                          </span>
                        </p>
                      )}

                      {(cliente.tiene_plantas || cliente.tiene_bombas) && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {cliente.tiene_plantas && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClienteEquipos({
                                  id: cliente.id_cliente,
                                  nombre: getClienteName(cliente),
                                });
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 transition-colors cursor-pointer"
                              title={`Ver ${cliente.total_equipos_plantas || 1} planta(s) eléctrica(s) instalada(s)`}
                            >
                              <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                              <span>Planta{cliente.total_equipos_plantas ? ` (${cliente.total_equipos_plantas})` : ''}</span>
                            </button>
                          )}
                          {cliente.tiene_bombas && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClienteEquipos({
                                  id: cliente.id_cliente,
                                  nombre: getClienteName(cliente),
                                });
                              }}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                              title={`Ver ${cliente.total_equipos_bombas || 1} bomba(s) hidráulica(s) instalada(s)`}
                            >
                              <Droplets className="h-3 w-3 text-blue-500 fill-blue-500" />
                              <span>Bomba{cliente.total_equipos_bombas ? ` (${cliente.total_equipos_bombas})` : ''}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs sm:text-sm">
                    {getNit(cliente)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {TIPO_CLIENTE_LABELS[cliente.tipo_cliente] || cliente.tipo_cliente}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {cliente.asesor_asignado?.persona?.nombre_completo ? (
                      <div className="flex items-center gap-1 text-xs sm:text-sm">
                        <UserCheck className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span className="truncate">{cliente.asesor_asignado.persona.nombre_completo}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {cliente.persona?.telefono_principal && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span>{cliente.persona.telefono_principal}</span>
                        </span>
                      )}
                      {cliente.persona?.email_principal && (
                        <span className="flex items-center gap-1 truncate max-w-[150px]" title={cliente.persona.email_principal}>
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{cliente.persona.email_principal}</span>
                        </span>
                      )}
                      {/* Enlace directo a Google Maps si tiene URL registrada */}
                      {cliente.persona?.url_ubicacion ? (
                        <a
                          href={cliente.persona.url_ubicacion}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline mt-0.5 w-fit"
                          title="Abrir ubicación exacta en Google Maps"
                        >
                          <MapPin className="h-3 w-3 text-red-500 fill-red-500/20 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">
                            {cliente.persona.ciudad ? `${cliente.persona.ciudad} (Mapa)` : 'Ver en Maps'}
                          </span>
                        </a>
                      ) : cliente.persona?.direccion_principal ? (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground truncate max-w-[150px]" title={cliente.persona.direccion_principal}>
                          <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{cliente.persona.direccion_principal}</span>
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={cliente.cliente_activo ? 'default' : 'destructive'} className="text-xs">
                      {cliente.cliente_activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right sticky right-0 bg-card group-hover:bg-muted/70 transition-colors z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                    <div className="flex justify-end items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      {/* Botón rápido Crear Orden */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={() => router.push(`/ordenes/nueva?clienteId=${cliente.id_cliente}`)}
                        title="Crear Nueva Orden de Servicio"
                      >
                        <FilePlus2 className="h-4 w-4" />
                      </Button>

                      {/* Botón rápido Ver Ficha */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleView(cliente.id_cliente)}
                        title="Ver Ficha del Cliente"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {/* Menú Desplegable con Acciones Completas (100% Opaco, Alto Contraste y Elevado) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 data-[state=open]:bg-slate-100"
                            title="Más opciones de cliente"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-56 bg-white text-slate-800 border border-slate-200/90 shadow-2xl z-50 rounded-xl p-1.5 ring-1 ring-black/5"
                        >
                          <DropdownMenuItem
                            onClick={() => router.push(`/ordenes/nueva?clienteId=${cliente.id_cliente}`)}
                            className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-900 transition-colors"
                          >
                            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-blue-50 text-blue-600 shrink-0">
                              <FileText className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-slate-800 font-medium">Nueva Orden de Servicio</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() =>
                              setSelectedClienteEquipos({
                                id: cliente.id_cliente,
                                nombre: getClienteName(cliente),
                              })
                            }
                            className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-900 transition-colors"
                          >
                            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-amber-50 text-amber-600 shrink-0">
                              <Wrench className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-slate-800 font-medium">Ver Equipos Instalados</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleView(cliente.id_cliente)}
                            className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-900 transition-colors"
                          >
                            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-slate-100 text-slate-600 shrink-0">
                              <Eye className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-slate-800 font-medium">Ver Ficha Completa</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => handleEdit(cliente.id_cliente)}
                            className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:bg-slate-100 focus:text-slate-900 transition-colors"
                          >
                            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-slate-100 text-slate-600 shrink-0">
                              <Pencil className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-slate-800 font-medium">Editar Cliente</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator className="my-1.5 bg-slate-100" />

                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteId(cliente.id_cliente)}
                            className="cursor-pointer flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 focus:bg-red-50 focus:text-red-700 transition-colors"
                          >
                            <div className="flex items-center justify-center h-6 w-6 rounded-md bg-red-50 text-red-600 shrink-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-red-600 font-medium">Eliminar Cliente</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación Responsive */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
            Mostrando {page * PAGE_SIZE + 1} - {Math.min((page + 1) * PAGE_SIZE, total)} de {total} clientes
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 text-xs sm:text-sm"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 text-xs sm:text-sm"
            >
              Siguiente
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal / Dialog para Ver Equipos del Cliente */}
      <Dialog
        open={!!selectedClienteEquipos}
        onOpenChange={(open) => !open && setSelectedClienteEquipos(null)}
      >
        <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 bg-white border border-slate-200 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                <Wrench className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-bold truncate">
                  Equipos de {selectedClienteEquipos?.nombre}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Parque de maquinaria, generadores y bombas asociadas a este cliente y sus sedes.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {selectedClienteEquipos && (
              <EquiposClienteTable clienteId={selectedClienteEquipos.id} />
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-border/80 flex flex-col-reverse sm:flex-row gap-2 items-stretch sm:items-center sm:justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (selectedClienteEquipos) {
                  router.push(`/clientes/${selectedClienteEquipos.id}`);
                }
              }}
              className="text-xs sm:text-sm"
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Ver Ficha Completa
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedClienteEquipos(null)}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
              >
                Cerrar
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (selectedClienteEquipos) {
                    router.push(`/ordenes/nueva?clienteId=${selectedClienteEquipos.id}`);
                  }
                }}
                className="flex-1 sm:flex-none text-xs sm:text-sm"
              >
                <FilePlus2 className="h-3.5 w-3.5 mr-1.5" />
                Nueva Orden
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmación eliminar */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-white border border-slate-200 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El cliente será marcado como inactivo o eliminado permanentemente.
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
