/**
 * PÁGINA DE GESTIÓN DE EQUIPOS - MEKANOS S.A.S
 * 
 * Ruta: /equipos
 * ✅ 08-ENE-2026: Refactorizado con búsqueda, filtros funcionales, ordenación y UX mejorada
 * 
 * Funcionalidades:
 * - Listado de equipos con filtros funcionales (tipo, estado)
 * - Búsqueda por código, nombre, serie o cliente
 * - Ordenación por código, nombre o fecha
 * - Crear nuevo equipo (modal)
 * - Ver detalle de equipo
 * - Acciones rápidas (editar, cambiar estado)
 */

'use client';

import type { EquipoListItem, TipoEquipo } from '@/features/equipos';
import { EquipoForm, useEliminarEquipoCompletamente, useEquipos } from '@/features/equipos';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Edit,
  Eye,
  Gauge,
  Grid3X3,
  List,
  MapPin,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

function TipoBadge({ tipo }: { tipo: TipoEquipo }) {
  const config = {
    GENERADOR: { icon: Zap, color: 'bg-yellow-100 text-yellow-800', label: 'Generador' },
    BOMBA: { icon: Droplets, color: 'bg-blue-100 text-blue-800', label: 'Bomba' },
    MOTOR: { icon: Zap, color: 'bg-purple-100 text-purple-800', label: 'Motor' },
  }[tipo] || { icon: Zap, color: 'bg-gray-100 text-gray-800', label: tipo };

  const Icon = config.icon;

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium', config.color)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    OPERATIVO: 'bg-green-100 text-green-800',
    STANDBY: 'bg-blue-100 text-blue-800',
    INACTIVO: 'bg-gray-100 text-gray-600',
    EN_REPARACION: 'bg-yellow-100 text-yellow-800',
    FUERA_SERVICIO: 'bg-red-100 text-red-800',
    BAJA: 'bg-gray-100 text-gray-500',
  };

  const labels: Record<string, string> = {
    OPERATIVO: 'Operativo',
    STANDBY: 'Standby',
    INACTIVO: 'Inactivo',
    EN_REPARACION: 'En Reparación',
    FUERA_SERVICIO: 'Fuera de Servicio',
    BAJA: 'Baja',
  };

  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', colors[estado] || 'bg-gray-100')}>
      {labels[estado] || estado}
    </span>
  );
}

function CriticidadBadge({ criticidad }: { criticidad: string }) {
  const config: Record<string, { color: string; dot: string }> = {
    BAJA: { color: 'text-blue-600', dot: 'bg-blue-500' },
    MEDIA: { color: 'text-yellow-600', dot: 'bg-yellow-500' },
    ALTA: { color: 'text-orange-600', dot: 'bg-orange-500' },
    CRITICA: { color: 'text-red-600', dot: 'bg-red-500' },
  };

  const { color, dot } = config[criticidad] || config.MEDIA;

  return (
    <span className={cn('flex items-center gap-1 text-xs', color)}>
      <span className={cn('w-2 h-2 rounded-full', dot)} />
      {criticidad}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL
// ═══════════════════════════════════════════════════════════════════════════════

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* ✅ FIX 27-ENE-2026: Remover onClick para evitar cierre accidental */}
        <div className="fixed inset-0 bg-black/50" />
        <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SKELETON LOADING
// ═══════════════════════════════════════════════════════════════════════════════

function EquipoCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-gray-200 rounded" />
          <div className="h-5 w-40 bg-gray-200 rounded" />
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        <div className="h-6 w-20 bg-gray-200 rounded-full" />
        <div className="h-6 w-16 bg-gray-200 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-4 w-28 bg-gray-200 rounded" />
      </div>
      <div className="mt-4 pt-3 border-t">
        <div className="h-4 w-20 bg-gray-200 rounded ml-auto" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TARJETA DE EQUIPO
// ═══════════════════════════════════════════════════════════════════════════════

function EquipoCard({ equipo }: { equipo: EquipoListItem }) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const hardDelete = useEliminarEquipoCompletamente();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    }

    if (showActionsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActionsMenu]);

  const handleHardDelete = async () => {
    if (confirmText !== 'ELIMINAR_EQUIPO_COMPLETAMENTE') {
      return;
    }

    try {
      await hardDelete.mutateAsync({
        id: equipo.id_equipo,
        confirmacion: confirmText
      });
      setShowHardDeleteConfirm(false);
      setConfirmText('');
    } catch (error) {
      console.error('Error al eliminar equipo:', error);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-blue-200 transition-all group">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
              {equipo.codigo_equipo}
            </span>
            <h3 className="font-semibold text-gray-900 line-clamp-1 mt-1">
              {equipo.nombre_equipo || 'Sin nombre'}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {/* Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-1.5 hover:bg-gray-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="Acciones"
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </button>

              {showActionsMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="py-1">
                    <Link
                      href={`/equipos/${equipo.id_equipo}/editar`}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowActionsMenu(false)}
                    >
                      <Edit className="h-4 w-4" />
                      Editar
                    </Link>

                    {equipo.activo === false && (
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          setShowHardDeleteConfirm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar permanentemente
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <TipoBadge tipo={equipo.tipo as TipoEquipo} />
          <EstadoBadge estado={equipo.estado_equipo} />
          <CriticidadBadge criticidad={equipo.criticidad} />
        </div>

        {/* Info */}
        <div className="space-y-1.5 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="line-clamp-1">{equipo.cliente?.nombre || 'Sin cliente'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="line-clamp-1">
              {equipo.sede?.nombre || equipo.ubicacion_texto || 'Sin ubicación'}
            </span>
          </div>
          {equipo.motor?.velocidad_nominal_rpm && (
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span className="font-mono text-xs">{equipo.motor.velocidad_nominal_rpm} RPM</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end mt-4 pt-3 border-t border-gray-100">
          <Link
            href={`/equipos/${equipo.id_equipo}`}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            <Eye className="h-4 w-4" />
            Ver detalle
          </Link>
        </div>
      </div>

      {/* Hard Delete Confirmation Modal */}
      {showHardDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/50" onClick={() => setShowHardDeleteConfirm(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full">
              <div className="flex items-center gap-3 p-6 border-b border-red-100">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Eliminar permanentemente</h3>
                  <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">
                      <p className="font-semibold mb-1">¿Está seguro de eliminar este equipo?</p>
                      <p className="mb-2">Se eliminarán permanentemente:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>El equipo principal</li>
                        <li>Especificaciones de motor (si existen)</li>
                        <li>Especificaciones de generador/bomba (si existen)</li>
                        <li>Archivos asociados</li>
                        <li>Historial de estados</li>
                        <li>Lecturas de horómetro</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Escriba <span className="font-mono bg-gray-100 px-1 py-0.5 rounded text-xs">ELIMINAR_EQUIPO_COMPLETAMENTE</span> para confirmar:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="ELIMINAR_EQUIPO_COMPLETAMENTE"
                  />
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={() => setShowHardDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleHardDelete}
                  disabled={confirmText !== 'ELIMINAR_EQUIPO_COMPLETAMENTE' || hardDelete.isPending}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hardDelete.isPending ? 'Eliminando...' : 'Eliminar permanentemente'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

type SortBy = 'codigo' | 'nombre' | 'fecha';
type SortOrder = 'asc' | 'desc';

export default function EquiposPage() {
  // Estados de filtros y paginación
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('codigo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Debounce de búsqueda (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Query con todos los parámetros
  const { data, isLoading, isError, refetch, isFetching } = useEquipos({
    page,
    limit: 12,
    tipo: tipoFiltro || undefined,
    estado_equipo: estadoFiltro || undefined,
    search: debouncedSearch || undefined,
    sortBy,
    sortOrder,
  });

  const equipos = data?.data || [];
  const pagination = data?.pagination;

  // Conteo de filtros activos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (tipoFiltro) count++;
    if (estadoFiltro) count++;
    if (debouncedSearch) count++;
    return count;
  }, [tipoFiltro, estadoFiltro, debouncedSearch]);

  // Limpiar todos los filtros
  const clearFilters = useCallback(() => {
    setSearchInput('');
    setDebouncedSearch('');
    setTipoFiltro('');
    setEstadoFiltro('');
    setPage(1);
  }, []);

  // Toggle ordenación
  const toggleSort = useCallback((field: SortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
    setPage(1);
  }, [sortBy]);

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    refetch();
  }, [refetch]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-7 w-7 text-yellow-500" />
            Gestión de Equipos
          </h1>
          <p className="text-gray-500 mt-1">
            {pagination ? `${pagination.total} equipos registrados` : 'Generadores, bombas y sistemas de potencia'}
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
        >
          <Plus className="h-5 w-5" />
          Nuevo Equipo
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
        {/* Fila 1: Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, nombre, serie o cliente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Fila 2: Filtros y ordenación */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Tipo */}
          <select
            value={tipoFiltro}
            onChange={(e) => { setTipoFiltro(e.target.value); setPage(1); }}
            className={cn(
              'px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500',
              tipoFiltro ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
            )}
          >
            <option value="">Todos los tipos</option>
            <option value="GENERADOR">🔌 Generadores</option>
            <option value="BOMBA">💧 Bombas</option>
          </select>

          {/* Filtro Estado */}
          <select
            value={estadoFiltro}
            onChange={(e) => { setEstadoFiltro(e.target.value); setPage(1); }}
            className={cn(
              'px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500',
              estadoFiltro ? 'border-blue-300 bg-blue-50' : 'border-gray-300'
            )}
          >
            <option value="">Todos los estados</option>
            <option value="OPERATIVO">✅ Operativo</option>
            <option value="STANDBY">⏸️ Standby</option>
            <option value="EN_REPARACION">🔧 En Reparación</option>
            <option value="FUERA_SERVICIO">❌ Fuera de Servicio</option>
            <option value="BAJA">📦 Baja</option>
          </select>

          {/* Separador */}
          <div className="h-6 w-px bg-gray-300 hidden sm:block" />

          {/* Ordenación */}
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-500 hidden sm:inline">Ordenar:</span>
            <button
              onClick={() => toggleSort('codigo')}
              className={cn(
                'px-2 py-1.5 text-sm rounded border transition-colors',
                sortBy === 'codigo' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
              )}
            >
              Código {sortBy === 'codigo' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('nombre')}
              className={cn(
                'px-2 py-1.5 text-sm rounded border transition-colors',
                sortBy === 'nombre' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
              )}
            >
              Nombre {sortBy === 'nombre' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('fecha')}
              className={cn(
                'px-2 py-1.5 text-sm rounded border transition-colors',
                sortBy === 'fecha' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 hover:bg-gray-50'
              )}
            >
              Fecha {sortBy === 'fecha' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Limpiar filtros */}
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
            >
              <X className="h-4 w-4" />
              Limpiar ({activeFiltersCount})
            </button>
          )}

          {/* Vista Grid/Lista */}
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-2', viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50')}
              title="Vista cuadrícula"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-2', viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50')}
              title="Vista lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Refrescar */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            title="Actualizar"
          >
            <RefreshCw className={cn('h-4 w-4 text-gray-600', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <EquipoCardSkeleton key={i} />)}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-lg border border-red-200">
          <AlertCircle className="h-10 w-10 text-red-500 mb-3" />
          <p className="font-semibold text-red-700">Error al cargar equipos</p>
          <p className="text-red-600 text-sm mt-1">Por favor, verifica tu conexión</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Contenido */}
      {!isLoading && !isError && (
        <>
          {/* Empty State */}
          {equipos.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              {debouncedSearch || tipoFiltro || estadoFiltro ? (
                <>
                  <Search className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 font-medium">No se encontraron equipos</p>
                  <p className="text-gray-500 text-sm mt-1">Intenta con otros filtros o términos de búsqueda</p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                  >
                    Limpiar filtros
                  </button>
                </>
              ) : (
                <>
                  <Zap className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-600 font-medium">No hay equipos registrados</p>
                  <p className="text-gray-500 text-sm mt-1">Comienza registrando tu primer equipo</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo Equipo
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Grid de equipos */}
              <div className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'space-y-3'
              )}>
                {equipos.map((equipo) => (
                  <EquipoCard key={equipo.id_equipo} equipo={equipo} />
                ))}
              </div>

              {/* Paginación */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Mostrando <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> a{' '}
                    <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> de{' '}
                    <span className="font-medium">{pagination.total}</span> equipos
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className={cn(
                        'px-2 py-1 rounded border text-sm',
                        page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                      )}
                    >
                      Primera
                    </button>
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded border',
                        page === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                      )}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </button>

                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-medium">
                      {page} / {pagination.totalPages}
                    </span>

                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded border',
                        page >= pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                      )}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setPage(pagination.totalPages)}
                      disabled={page >= pagination.totalPages}
                      className={cn(
                        'px-2 py-1 rounded border text-sm',
                        page >= pagination.totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
                      )}
                    >
                      Última
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Modal de creación */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Registrar Nuevo Equipo"
      >
        <EquipoForm
          onSuccess={handleCreateSuccess}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>
    </div>
  );
}
