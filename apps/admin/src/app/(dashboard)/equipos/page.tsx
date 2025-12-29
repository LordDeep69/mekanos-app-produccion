/**
 * PÁGINA DE GESTIÓN DE EQUIPOS - MEKANOS S.A.S
 * 
 * Ruta: /equipos
 * 
 * Funcionalidades:
 * - Listado de equipos con filtros (cliente, tipo, estado)
 * - Crear nuevo equipo (modal con formulario dinámico)
 * - Ver detalle de equipo
 * - Cambiar estado
 */

'use client';

import type { TipoEquipo } from '@/features/equipos';
import { EquipoForm, useEquipos } from '@/features/equipos';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Building2,
  ChevronLeft, ChevronRight,
  Droplets,
  Eye,
  Loader2,
  MapPin,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  X,
  Zap
} from 'lucide-react';
import { useState } from 'react';

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
    EN_REPARACION: 'bg-yellow-100 text-yellow-800',
    FUERA_DE_SERVICIO: 'bg-red-100 text-red-800',
    BAJA: 'bg-gray-100 text-gray-500',
  };

  const labels: Record<string, string> = {
    OPERATIVO: 'Operativo',
    EN_REPARACION: 'En Reparación',
    FUERA_DE_SERVICIO: 'Fuera de Servicio',
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
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
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
// PÁGINA PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function EquiposPage() {
  const [page, setPage] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading, isError, refetch } = useEquipos({
    page,
    limit: 12,
    tipo: tipoFiltro || undefined,
    estado_equipo: estadoFiltro || undefined,
  });

  const handleCreateSuccess = (_data: unknown) => {
    setShowCreateModal(false);
    refetch();
    // TODO: Mostrar toast de éxito
  };

  const equipos = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="h-7 w-7 text-yellow-500" />
            Gestión de Equipos
          </h1>
          <p className="text-gray-500 mt-1">
            Generadores, bombas y sistemas de potencia
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="h-5 w-5" />
          Nuevo Equipo
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={tipoFiltro}
            onChange={(e) => { setTipoFiltro(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los tipos</option>
            <option value="GENERADOR">Generadores</option>
            <option value="BOMBA">Bombas</option>
          </select>

          <select
            value={estadoFiltro}
            onChange={(e) => { setEstadoFiltro(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="OPERATIVO">Operativo</option>
            <option value="EN_REPARACION">En Reparación</option>
            <option value="FUERA_DE_SERVICIO">Fuera de Servicio</option>
          </select>

          <button
            onClick={() => refetch()}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className={cn('h-5 w-5 text-gray-600', isLoading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 text-red-500">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="font-medium">Error al cargar equipos</p>
          <button onClick={() => refetch()} className="mt-2 text-sm text-blue-600 hover:underline">
            Reintentar
          </button>
        </div>
      )}

      {/* Grid de equipos */}
      {!isLoading && !isError && (
        <>
          {equipos.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Zap className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">No hay equipos registrados</p>
              <p className="text-gray-500 text-sm">Haz clic en "Nuevo Equipo" para comenzar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipos.map((equipo) => (
                <div
                  key={equipo.id_equipo}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  {/* Header de la tarjeta */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono text-sm text-gray-500">{equipo.codigo_equipo}</span>
                      <h3 className="font-semibold text-gray-900 line-clamp-1">
                        {equipo.nombre_equipo || 'Sin nombre'}
                      </h3>
                    </div>
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <MoreVertical className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <TipoBadge tipo={equipo.tipo as TipoEquipo} />
                    <EstadoBadge estado={equipo.estado_equipo} />
                    <CriticidadBadge criticidad={equipo.criticidad} />
                  </div>

                  {/* Info */}
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <span className="line-clamp-1">{equipo.cliente.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="line-clamp-1">
                        {equipo.sede?.nombre || equipo.ubicacion_texto || 'Sin ubicación'}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex justify-end mt-4 pt-3 border-t">
                    <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800">
                      <Eye className="h-4 w-4" />
                      Ver detalle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-600">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} equipos
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1 rounded border',
                    page === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.totalPages}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1 rounded border',
                    page >= pagination.totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
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
