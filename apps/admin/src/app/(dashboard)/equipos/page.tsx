/**
 * PÁGINA DE GESTIÓN DE EQUIPOS (PARQUE DE ACTIVOS INDUSTRIALES EAM) - MEKANOS S.A.S
 *
 * Ruta: /equipos
 * Estándar: Industrial Corporate Light Mode (Zero-Trust EAM 360°)
 * - 4 Tarjetas KPI ejecutivas del parque instalado
 * - Filtros rápidos por tipo (Generador, Bomba, Motor, Compresor) y estado operativo
 * - Tarjetas enriquecidas con métricas técnicas (kVA/kW/HP, Motor, RPM, Horómetro)
 * - Enlace directo al expediente del cliente (/clientes/[id]) y al expediente 360° (/equipos/[id])
 */

'use client';

import type { EquipoListItem, TipoEquipo } from '@/features/equipos';
import { EquipoForm, useEliminarEquipoCompletamente, useEquipos } from '@/features/equipos';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Edit,
  ExternalLink,
  Eye,
  Fuel,
  Gauge,
  Grid3X3,
  Layers,
  List,
  MapPin,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Timer,
  Trash2,
  Wind,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES DE ETIQUETAS (BADGES)
// ═══════════════════════════════════════════════════════════════════════════════

function TipoBadge({ tipo }: { tipo: TipoEquipo | string }) {
  const config = {
    GENERADOR: {
      icon: Zap,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      label: 'Generador',
    },
    BOMBA: {
      icon: Droplets,
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      label: 'Bomba',
    },
    MOTOR: {
      icon: Settings,
      color: 'bg-violet-50 text-violet-800 border-violet-200',
      label: 'Motor',
    },
    COMPRESOR: {
      icon: Wind,
      color: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      label: 'Compresor',
    },
  }[tipo] || {
    icon: Zap,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    label: tipo || 'Equipo',
  };

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap',
        config.color,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {config.label}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    OPERATIVO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    STANDBY: 'bg-blue-50 text-blue-700 border-blue-200',
    INACTIVO: 'bg-slate-100 text-slate-600 border-slate-200',
    EN_REPARACION: 'bg-amber-50 text-amber-800 border-amber-200',
    FUERA_SERVICIO: 'bg-rose-50 text-rose-700 border-rose-200',
    BAJA: 'bg-slate-100 text-slate-500 border-slate-200',
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
    <span
      className={cn(
        'px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap',
        colors[estado] || 'bg-slate-100 text-slate-700 border-slate-200',
      )}
    >
      {labels[estado] || estado}
    </span>
  );
}

function CriticidadBadge({ criticidad }: { criticidad: string }) {
  const config: Record<string, { color: string; dot: string }> = {
    BAJA: { color: 'text-slate-600 bg-slate-50 border-slate-200', dot: 'bg-blue-500' },
    MEDIA: { color: 'text-amber-700 bg-amber-50/60 border-amber-200', dot: 'bg-amber-500' },
    ALTA: { color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-500' },
    CRITICA: { color: 'text-rose-700 bg-rose-50 border-rose-200', dot: 'bg-rose-600' },
  };

  const { color, dot } = config[criticidad] || config.MEDIA;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border whitespace-nowrap',
        color,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />
      {criticidad}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL CREACIÓN
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[1px]" />
        <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          <div className="p-6 max-h-[calc(100vh-160px)] overflow-y-auto">{children}</div>
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
    <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="space-y-2">
          <div className="h-4 w-28 bg-slate-200 rounded" />
          <div className="h-5 w-44 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="flex gap-2 mb-3">
        <div className="h-5 w-20 bg-slate-200 rounded" />
        <div className="h-5 w-16 bg-slate-200 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-36 bg-slate-200 rounded" />
        <div className="h-4 w-28 bg-slate-200 rounded" />
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="h-4 w-24 bg-slate-200 rounded ml-auto" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TARJETA DE EQUIPO (ESTÁNDAR EAM 360°)
// ═══════════════════════════════════════════════════════════════════════════════

function EquipoCard({ equipo }: { equipo: EquipoListItem }) {
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showHardDeleteConfirm, setShowHardDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const hardDelete = useEliminarEquipoCompletamente();
  const menuRef = useRef<HTMLDivElement>(null);

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
        confirmacion: confirmText,
      });
      setShowHardDeleteConfirm(false);
      setConfirmText('');
    } catch (error) {
      console.error('Error al eliminar equipo:', error);
    }
  };

  // Extraer métricas técnicas rápidas de datos_especificos y motor
  const datosEsp = (equipo.datos_especificos || {}) as Record<string, any>;
  const motor = (equipo.motor || datosEsp.motor || null) as Record<string, any> | null;

  const potenciaTexto = useMemo(() => {
    const kva = Number(datosEsp.potencia_kva);
    if (Number.isFinite(kva) && kva > 0) return `${kva} kVA`;
    const kw = Number(datosEsp.potencia_kw);
    if (Number.isFinite(kw) && kw > 0) return `${kw} kW`;
    const hidKw = Number(datosEsp.potencia_hidraulica_kw);
    if (Number.isFinite(hidKw) && hidKw > 0) return `${hidKw} kW`;
    const hp = Number(motor?.potencia_hp);
    if (Number.isFinite(hp) && hp > 0) return `${hp} HP`;
    const mkw = Number(motor?.potencia_kw);
    if (Number.isFinite(mkw) && mkw > 0) return `${mkw} kW`;
    return null;
  }, [datosEsp, motor]);

  const motorTexto = useMemo(() => {
    const marca = motor?.marca_motor?.toString().trim();
    if (!marca || marca.toUpperCase() === 'GENERICO' || marca.toUpperCase() === 'N/A' || marca === '0' || marca.toLowerCase() === 'null') return null;
    const modelo = motor?.modelo_motor?.toString().trim();
    const mod = modelo && modelo.toUpperCase() !== 'N/A' && modelo !== '0' && modelo.toLowerCase() !== 'null' ? ` ${modelo}` : '';
    return `${marca}${mod}`;
  }, [motor]);

  const rpmTexto = useMemo(() => {
    const rpm = Number(motor?.velocidad_nominal_rpm);
    return Number.isFinite(rpm) && rpm > 0 ? `${rpm} RPM` : null;
  }, [motor]);

  const horasNum = Number(equipo.horas_actuales || 0);

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition-all group flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={`/equipos/${equipo.id_equipo}`}
                  className="font-mono text-xs font-bold text-slate-800 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 px-2 py-0.5 rounded transition-colors"
                >
                  {equipo.codigo_equipo}
                </Link>
                {equipo.numero_serie_equipo && (
                  <span className="font-mono text-[11px] text-slate-400 truncate max-w-[140px]" title={`S/N: ${equipo.numero_serie_equipo}`}>
                    SN: {equipo.numero_serie_equipo}
                  </span>
                )}
              </div>
              <Link href={`/equipos/${equipo.id_equipo}`} className="block mt-1.5">
                <h3 className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-1 text-sm">
                  {equipo.nombre_equipo || 'Sin nombre'}
                </h3>
              </Link>
            </div>

            {/* Dropdown Menu */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                title="Acciones del activo"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {showActionsMenu && (
                <div className="absolute right-0 mt-1 w-52 bg-white rounded-xl shadow-lg border border-slate-200 z-20 py-1">
                  <Link
                    href={`/equipos/${equipo.id_equipo}`}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowActionsMenu(false)}
                  >
                    <Eye className="h-3.5 w-3.5 text-blue-600" />
                    Ver Expediente 360°
                  </Link>
                  <Link
                    href={`/equipos/${equipo.id_equipo}/editar`}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowActionsMenu(false)}
                  >
                    <Edit className="h-3.5 w-3.5 text-slate-500" />
                    Editar Ficha Técnica
                  </Link>
                  <Link
                    href={`/ordenes/nueva?clienteId=${equipo.cliente?.id_cliente || ''}&equipoId=${equipo.id_equipo}`}
                    className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                    onClick={() => setShowActionsMenu(false)}
                  >
                    <Wrench className="h-3.5 w-3.5 text-emerald-600" />
                    Crear Orden de Servicio
                  </Link>

                  {equipo.activo === false && (
                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowHardDeleteConfirm(true);
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 w-full text-left border-t border-slate-100 mt-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Eliminar permanentemente
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <TipoBadge tipo={equipo.tipo as TipoEquipo} />
            <EstadoBadge estado={equipo.estado_equipo} />
            <CriticidadBadge criticidad={equipo.criticidad} />
          </div>

          {/* Cliente (con enlace real) y Ubicación */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {equipo.cliente?.id_cliente ? (
                <Link
                  href={`/clientes/${equipo.cliente.id_cliente}`}
                  className="font-semibold text-slate-800 hover:text-blue-600 hover:underline truncate transition-colors"
                  title={`Ver expediente del cliente: ${equipo.cliente.nombre}`}
                >
                  {equipo.cliente.nombre}
                </Link>
              ) : (
                <span className="truncate">{equipo.cliente?.nombre || 'Sin cliente'}</span>
              )}
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate text-slate-500">
                {equipo.sede?.nombre ? `${equipo.sede.nombre} • ${equipo.ubicacion_texto || ''}` : equipo.ubicacion_texto || 'Sin ubicación'}
              </span>
            </div>
          </div>

          {/* Franja de Especificaciones Rápidas (Motor / Potencia / RPM / Horómetro) */}
          {(potenciaTexto || motorTexto || rpmTexto || horasNum > 0) && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
              {potenciaTexto && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200/80 rounded text-[11px] font-mono font-semibold">
                  <Zap className="h-3 w-3 text-amber-500" />
                  {potenciaTexto}
                </span>
              )}
              {motorTexto && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-700 border border-slate-200/80 rounded text-[11px] font-medium truncate max-w-[170px]" title={`Motor / Impulsor: ${motorTexto}`}>
                  <Settings className="h-3 w-3 text-slate-500 shrink-0" />
                  <span className="truncate">{motorTexto}</span>
                </span>
              )}
              {rpmTexto && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-600 border border-slate-200/80 rounded text-[11px] font-mono">
                  <Gauge className="h-3 w-3 text-slate-400" />
                  {rpmTexto}
                </span>
              )}
              {horasNum > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/70 text-blue-700 border border-blue-200/70 rounded text-[11px] font-mono font-semibold">
                  <Timer className="h-3 w-3 text-blue-600" />
                  {horasNum.toLocaleString()} hrs
                </span>
              )}
            </div>
          )}
        </div>

        {/* Footer de Acciones Directas */}
        <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-100">
          <Link
            href={`/ordenes/nueva?clienteId=${equipo.cliente?.id_cliente || ''}&equipoId=${equipo.id_equipo}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-emerald-700 transition-colors"
            title="Programar Orden de Servicio para este equipo"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva OT
          </Link>

          <Link
            href={`/equipos/${equipo.id_equipo}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <Eye className="h-3.5 w-3.5" />
            Expediente 360°
          </Link>
        </div>
      </div>

      {/* Hard Delete Confirmation Modal */}
      {showHardDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/50" onClick={() => setShowHardDeleteConfirm(false)} />
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200">
              <div className="flex items-center gap-3 p-6 border-b border-rose-100">
                <div className="p-3 bg-rose-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Eliminar permanentemente</h3>
                  <p className="text-xs text-slate-600">Esta acción no se puede deshacer</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-rose-700">
                      <p className="font-bold mb-1">¿Está seguro de eliminar este equipo?</p>
                      <p className="mb-2">Se eliminarán permanentemente:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>El equipo principal y su BOM asociado</li>
                        <li>Especificaciones de motor, generador o bomba</li>
                        <li>Historial de estados y lecturas de horómetro</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    Escriba{' '}
                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">
                      ELIMINAR_EQUIPO_COMPLETAMENTE
                    </span>{' '}
                    para confirmar:
                  </label>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    placeholder="ELIMINAR_EQUIPO_COMPLETAMENTE"
                  />
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={() => setShowHardDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleHardDelete}
                  disabled={confirmText !== 'ELIMINAR_EQUIPO_COMPLETAMENTE' || hardDelete.isPending}
                  className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hardDelete.isPending ? 'Eliminando...' : 'Eliminar'}
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
// PÁGINA PRINCIPAL (/equipos)
// ═══════════════════════════════════════════════════════════════════════════════

type SortBy = 'codigo' | 'nombre' | 'fecha';
type SortOrder = 'asc' | 'desc';

export default function EquiposPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortBy>('codigo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
  const resumen = data?.resumen;

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (tipoFiltro) count++;
    if (estadoFiltro) count++;
    if (debouncedSearch) count++;
    return count;
  }, [tipoFiltro, estadoFiltro, debouncedSearch]);

  const clearFilters = useCallback(() => {
    setSearchInput('');
    setDebouncedSearch('');
    setTipoFiltro('');
    setEstadoFiltro('');
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (field: SortBy) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        setSortOrder('asc');
      }
      setPage(1);
    },
    [sortBy],
  );

  const handleCreateSuccess = useCallback(() => {
    setShowCreateModal(false);
    refetch();
  }, [refetch]);

  const totalParque = resumen?.total_parque ?? pagination?.total ?? 0;
  const totalGeneradores = resumen?.generadores ?? 0;
  const totalBombas = resumen?.bombas ?? 0;
  const totalOtros = resumen?.otros ?? Math.max(0, totalParque - totalGeneradores - totalBombas);
  const totalOperativos = resumen?.operativos ?? 0;
  const pctOperativo = totalParque > 0 ? Math.round((totalOperativos / totalParque) * 100) : 100;

  return (
    <div className="space-y-5">
      {/* Header Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 lg:p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Parque de Activos Industriales (EAM 360°)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Gestión técnica de plantas eléctricas, bombas, hojas de vida, repuestos compatibles (BOM) y trazabilidad WMS
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-2xs text-xs font-semibold shrink-0 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nuevo Equipo
        </button>
      </div>

      {/* 4 Tarjetas KPI Ejecutivas del Parque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          type="button"
          onClick={() => {
            setTipoFiltro('');
            setEstadoFiltro('');
            setPage(1);
          }}
          className={cn(
            'text-left bg-white p-4 rounded-xl border transition-all shadow-2xs cursor-pointer',
            !tipoFiltro && !estadoFiltro
              ? 'border-blue-300 ring-1 ring-blue-100'
              : 'border-slate-200 hover:border-slate-300',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Parque Activo
            </span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalParque.toLocaleString()}</span>
            <span className="text-xs font-medium text-slate-500">equipos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate" title={`${totalGeneradores} Generadores • ${totalBombas} Bombas • ${totalOtros} Otros Activos (Total: ${totalParque})`}>
            <strong>{totalGeneradores}</strong> Gen • <strong>{totalBombas}</strong> Bombas • <strong>{totalOtros}</strong> Otros
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setTipoFiltro(tipoFiltro === 'GENERADOR' ? '' : 'GENERADOR');
            setPage(1);
          }}
          className={cn(
            'text-left bg-white p-4 rounded-xl border transition-all shadow-2xs cursor-pointer',
            tipoFiltro === 'GENERADOR'
              ? 'border-amber-400 ring-1 ring-amber-100 bg-amber-50/20'
              : 'border-slate-200 hover:border-amber-200',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Plantas Eléctricas
            </span>
            <div className="p-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalGeneradores.toLocaleString()}</span>
            <span className="text-xs font-semibold text-amber-700">Generadores</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalParque > 0 ? `${Math.round((totalGeneradores / totalParque) * 100)}% del parque • ` : ''}Grupos electrógenos
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setTipoFiltro(tipoFiltro === 'BOMBA' ? '' : 'BOMBA');
            setPage(1);
          }}
          className={cn(
            'text-left bg-white p-4 rounded-xl border transition-all shadow-2xs cursor-pointer',
            tipoFiltro === 'BOMBA'
              ? 'border-blue-400 ring-1 ring-blue-100 bg-blue-50/20'
              : 'border-slate-200 hover:border-blue-200',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Sistemas de Bombeo
            </span>
            <div className="p-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg">
              <Droplets className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{totalBombas.toLocaleString()}</span>
            <span className="text-xs font-semibold text-blue-700">Bombas</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalParque > 0 ? `${Math.round((totalBombas / totalParque) * 100)}% del parque • ` : ''}Presión y red de agua
          </p>
        </button>

        <button
          type="button"
          onClick={() => {
            setEstadoFiltro(estadoFiltro === 'OPERATIVO' ? '' : 'OPERATIVO');
            setPage(1);
          }}
          className={cn(
            'text-left bg-white p-4 rounded-xl border transition-all shadow-2xs cursor-pointer',
            estadoFiltro === 'OPERATIVO'
              ? 'border-emerald-400 ring-1 ring-emerald-100 bg-emerald-50/20'
              : 'border-slate-200 hover:border-emerald-200',
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Disponibilidad Operativa
            </span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{totalOperativos.toLocaleString()}</span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {pctOperativo}% Operativo
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            En reparación: <strong className="text-amber-700">{resumen?.en_reparacion ?? 0}</strong> • Fuera serv.:{' '}
            <strong className="text-rose-700">{resumen?.fuera_servicio ?? 0}</strong>
          </p>
        </button>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
        {/* Fila 1: Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código (ej: GEN-CLI-DDQU49), nombre del equipo, número de serie o cliente..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          )}
        </div>

        {/* Fila 2: Filtros y ordenación */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro Tipo */}
          <select
            value={tipoFiltro}
            onChange={(e) => {
              setTipoFiltro(e.target.value);
              setPage(1);
            }}
            className={cn(
              'px-3 py-1.5 border rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500',
              tipoFiltro ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-300 text-slate-700',
            )}
          >
            <option value="">Todos los tipos de activo</option>
            <option value="GENERADOR">⚡ Generadores / Plantas</option>
            <option value="BOMBA">💧 Bombas Hidráulicas</option>
            <option value="MOTOR">⚙️ Motores</option>
            <option value="COMPRESOR">🌀 Compresores</option>
          </select>

          {/* Filtro Estado */}
          <select
            value={estadoFiltro}
            onChange={(e) => {
              setEstadoFiltro(e.target.value);
              setPage(1);
            }}
            className={cn(
              'px-3 py-1.5 border rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500',
              estadoFiltro ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-slate-300 text-slate-700',
            )}
          >
            <option value="">Todos los estados</option>
            <option value="OPERATIVO">Operativo</option>
            <option value="STANDBY">Standby</option>
            <option value="EN_REPARACION">En Reparación</option>
            <option value="FUERA_SERVICIO">Fuera de Servicio</option>
            <option value="BAJA">Baja</option>
          </select>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Ordenación */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500 hidden sm:inline mr-1">Ordenar:</span>
            <button
              onClick={() => toggleSort('codigo')}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                sortBy === 'codigo'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              Código {sortBy === 'codigo' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('nombre')}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                sortBy === 'nombre'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              Nombre {sortBy === 'nombre' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button
              onClick={() => toggleSort('fecha')}
              className={cn(
                'px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                sortBy === 'fecha'
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50',
              )}
            >
              Fecha {sortBy === 'fecha' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>

          <div className="flex-1" />

          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar ({activeFiltersCount})
            </button>
          )}

          {/* Vista Grid/Lista */}
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn('p-1.5', viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-500')}
              title="Vista cuadrícula"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn('p-1.5', viewMode === 'list' ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-50 text-slate-500')}
              title="Vista lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
            title="Actualizar listado"
          >
            <RefreshCw className={cn('h-4 w-4 text-slate-600', isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <EquipoCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="flex flex-col items-center justify-center py-12 bg-rose-50 rounded-xl border border-rose-200">
          <AlertCircle className="h-10 w-10 text-rose-500 mb-3" />
          <p className="font-bold text-rose-700">Error al cargar el parque de equipos</p>
          <p className="text-rose-600 text-xs mt-1">Por favor, verifica tu conexión e intenta nuevamente</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Contenido */}
      {!isLoading && !isError && (
        <>
          {equipos.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200">
              {debouncedSearch || tipoFiltro || estadoFiltro ? (
                <>
                  <Search className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-700 font-bold text-sm">No se encontraron equipos con esos filtros</p>
                  <p className="text-slate-500 text-xs mt-1">Intenta con otros términos de búsqueda</p>
                  <button
                    onClick={clearFilters}
                    className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                  >
                    Limpiar filtros
                  </button>
                </>
              ) : (
                <>
                  <Zap className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-700 font-bold text-sm">No hay equipos registrados</p>
                  <p className="text-slate-500 text-xs mt-1">Comienza registrando tu primer activo industrial</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo Equipo
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                    : 'space-y-3',
                )}
              >
                {equipos.map((equipo) => (
                  <EquipoCard key={equipo.id_equipo} equipo={equipo} />
                ))}
              </div>

              {/* Paginación */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-600">
                    Mostrando{' '}
                    <span className="font-bold text-slate-800">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-bold text-slate-800">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    de <span className="font-bold text-slate-800">{pagination.total}</span> equipos
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg border text-xs font-medium',
                        page === 1
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      Primera
                    </button>
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium',
                        page === 1
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Anterior
                    </button>

                    <span className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-xs font-bold">
                      {page} / {pagination.totalPages}
                    </span>

                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-medium',
                        page >= pagination.totalPages
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
                      )}
                    >
                      Siguiente
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setPage(pagination.totalPages)}
                      disabled={page >= pagination.totalPages}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg border text-xs font-medium',
                        page >= pagination.totalPages
                          ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50',
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
        title="Registrar Nuevo Activo Industrial"
      >
        <EquipoForm onSuccess={handleCreateSuccess} onCancel={() => setShowCreateModal(false)} />
      </Modal>
    </div>
  );
}
