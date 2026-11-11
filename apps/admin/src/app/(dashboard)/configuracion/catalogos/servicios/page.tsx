'use client';

import {
  useActualizarServicioComercial,
  useCrearServicioComercial,
  useEliminarServicioComercial,
  useServiciosComerciales,
  useTiposServicio,
  type CatalogoServicio,
  type TipoServicio,
} from '@/features/ordenes';
import {
  getCategoriaServicioColor,
  getCategoriaServicioLabel,
} from '@/features/ordenes/api/catalogos.service';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  Clock,
  DollarSign,
  Edit,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Tag,
  Trash2,
  Wrench,
  X,
  Lock,
  Unlock,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { calculateSmartMatchScore } from '@/lib/search-utils';
import {
  generarCodigoServicioComercial,
  verificarCodigoDuplicado,
  EamSelect,
} from '@/features/catalogos-eam';

const CATEGORIAS_COMERCIALES = [
  {
    value: 'CORRECTIVO',
    label: 'Correctivo (Específico)',
    badge: 'Correctivo',
    description: 'Reparaciones, cambios de componentes y solución de averías',
  },
  {
    value: 'PREVENTIVO',
    label: 'Preventivo',
    badge: 'Preventivo',
    description: 'Mantenimientos periódicos, inspecciones programadas y rutinas',
  },
  {
    value: 'EMERGENCIA',
    label: 'Emergencia / Urgente',
    badge: 'Emergencia',
    description: 'Atención 24/7 y contingencias críticas de clientes',
  },
  {
    value: 'ESPECIALIZADO',
    label: 'Especializado',
    badge: 'Especializado',
    description: 'Pruebas de carga, análisis termográfico o ingeniería técnica',
  },
  {
    value: 'OTRO',
    label: 'Otro / General',
    badge: 'General',
    description: 'Servicios comerciales complementarios o no catalogados',
  },
];

export default function CatalogoServiciosComercialesPage() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipoServicio, setFiltroTipoServicio] = useState<string>('');
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServicio, setEditingServicio] = useState<CatalogoServicio | null>(null);

  const {
    data: servicios,
    isLoading,
    isError,
    refetch,
  } = useServiciosComerciales({
    idTipoServicio: filtroTipoServicio ? Number(filtroTipoServicio) : undefined,
    limit: 100,
  });

  // Universo completo para garantizar detección de colisiones global sin importar filtros en pantalla
  const { data: todosLosServicios } = useServiciosComerciales({ limit: 500 });

  const {
    data: tiposServicio,
    isLoading: loadingTipos,
    isError: errorTipos,
    refetch: refetchTipos,
  } = useTiposServicio({ activo: true });

  const crearServicio = useCrearServicioComercial();
  const actualizarServicio = useActualizarServicioComercial();
  const eliminarServicio = useEliminarServicioComercial();

  // Refrescar tipos de servicio al abrir modal
  useEffect(() => {
    if (isModalOpen) {
      refetchTipos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  const handleEdit = (servicio: CatalogoServicio) => {
    setEditingServicio(servicio);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de desactivar este servicio comercial?')) {
      await eliminarServicio.mutateAsync(id);
    }
  };

  // Métricas KPI
  const metricas = useMemo(() => {
    const total = servicios?.length || 0;
    const conPrecio =
      servicios?.filter((s) => s.precio_base && Number(s.precio_base) > 0).length || 0;
    const conCertificacion = servicios?.filter((s) => s.requiere_certificacion).length || 0;
    const conTipoVinculado = servicios?.filter((s) => s.id_tipo_servicio != null).length || 0;
    return { total, conPrecio, conCertificacion, conTipoVinculado };
  }, [servicios]);

  // Opciones para filtros
  const tiposServicioFilterOptions = useMemo(() => {
    return [
      { value: '', label: 'Todos los tipos de servicio' },
      ...(tiposServicio || []).map((t) => ({
        value: String(t.id_tipo_servicio),
        label: t.nombre_tipo,
        badge: t.codigo_tipo || undefined,
      })),
    ];
  }, [tiposServicio]);

  const categoriasFilterOptions = useMemo(() => {
    return [
      { value: '', label: 'Todas las categorías' },
      ...CATEGORIAS_COMERCIALES.map((c) => ({
        value: c.value,
        label: c.label,
        badge: c.badge,
      })),
    ];
  }, []);

  // Filtrado inteligente: categoría, tipo de servicio y texto
  const filteredServicios = useMemo(() => {
    if (!servicios) return [];
    let list = servicios;

    if (filtroCategoria) {
      list = list.filter(
        (s) => (s.categoria || '').toUpperCase() === filtroCategoria.toUpperCase(),
      );
    }

    const query = busqueda.trim();
    if (!query) return list;

    const scored = list
      .map((s) => ({
        servicio: s,
        score: calculateSmartMatchScore(query, {
          primary: s.nombre_servicio,
          secondary: s.codigo_servicio,
          extra: [s.descripcion, s.categoria, s.tipos_servicio?.nombre_tipo],
        }),
      }))
      .filter((item) => item.score > 0);

    scored.sort((a, b) => b.score - a.score);
    return scored.map((item) => item.servicio);
  }, [servicios, busqueda, filtroCategoria]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Tag className="h-7 w-7 text-blue-600" />
            Catálogo Comercial de Servicios
          </h1>
          <p className="text-gray-500 mt-1">
            Define los precios base, tarifas técnicas y certificaciones de los servicios facturables
          </p>
        </div>
        <button
          onClick={() => {
            setEditingServicio(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-sm hover:shadow cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nuevo Servicio Comercial
        </button>
      </div>

      {/* KPIs Métricas Rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 leading-tight">{metricas.total}</p>
            <p className="text-xs text-slate-500 font-medium">Servicios Totales</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 leading-tight">
              {metricas.conPrecio}
            </p>
            <p className="text-xs text-slate-500 font-medium">Con Tarifa Base</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 leading-tight">
              {metricas.conCertificacion}
            </p>
            <p className="text-xs text-slate-500 font-medium">Con Certificación</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 leading-tight">
              {metricas.conTipoVinculado}
            </p>
            <p className="text-xs text-slate-500 font-medium">Vinculados Técnicos</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Prémium */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Buscador inteligente */}
          <div className="relative md:col-span-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, código o alcance comercial..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder:text-slate-400 outline-none transition-all font-medium"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro por Categoría */}
          <div className="md:col-span-3">
            <EamSelect
              value={filtroCategoria}
              onChange={(val) => setFiltroCategoria(val)}
              options={categoriasFilterOptions}
              placeholder="Todas las categorías..."
            />
          </div>

          {/* Filtro por Tipo de Servicio Vinculado */}
          <div className="md:col-span-4">
            <EamSelect
              value={filtroTipoServicio}
              onChange={(val) => setFiltroTipoServicio(val)}
              options={tiposServicioFilterOptions}
              placeholder="Todos los tipos de servicio..."
              searchable
              disabled={loadingTipos}
            />
          </div>
        </div>

        {/* Chips de Categoría de Acceso Rápido */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Categoría:
          </span>
          <button
            type="button"
            onClick={() => setFiltroCategoria('')}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs',
              !filtroCategoria
                ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            <span>Todas</span>
            <span
              className={cn(
                'px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold',
                !filtroCategoria ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700',
              )}
            >
              {servicios?.length || 0}
            </span>
          </button>
          {CATEGORIAS_COMERCIALES.map((cat) => {
            const isSelected = filtroCategoria === cat.value;
            const count = (servicios || []).filter(
              (s) => (s.categoria || '').toUpperCase() === cat.value.toUpperCase(),
            ).length;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFiltroCategoria(cat.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border shadow-2xs',
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900',
                )}
              >
                <span>{cat.badge}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold',
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla de Servicios */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-3" />
            <p className="text-slate-500 text-sm font-medium">Cargando catálogo comercial...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 text-rose-500">
            <AlertCircle className="h-12 w-12 mb-3" />
            <p className="font-bold text-base">Error al cargar servicios comerciales</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 font-bold text-xs transition-colors cursor-pointer"
            >
              Reintentar carga
            </button>
          </div>
        ) : filteredServicios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Tag className="h-14 w-14 mb-3 opacity-20" />
            <p className="text-base font-bold text-slate-600">
              No se encontraron servicios comerciales
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Prueba ajustando los filtros de búsqueda o categoría.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Servicio Comercial</th>
                  <th className="px-6 py-3.5">Categoría / Tipo Técnico</th>
                  <th className="px-6 py-3.5">Tarifa Base ($)</th>
                  <th className="px-6 py-3.5">Requisitos y Tiempos</th>
                  <th className="px-6 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredServicios.map((servicio, idx) => (
                  <tr
                    key={servicio.id_servicio ?? `servicio-${idx}`}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {servicio.nombre_servicio}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {servicio.codigo_servicio}
                          </span>
                          {servicio.descripcion && (
                            <span
                              className="text-xs text-slate-400 truncate max-w-[280px]"
                              title={servicio.descripcion}
                            >
                              {servicio.descripcion}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span
                          className={cn(
                            'px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider',
                            getCategoriaServicioColor(servicio.categoria),
                          )}
                        >
                          {getCategoriaServicioLabel(servicio.categoria)}
                        </span>
                        <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                          <Layers className="h-3 w-3 text-slate-400" />
                          {servicio.tipos_servicio?.nombre_tipo || 'Universal (Sin vincular)'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
                        <DollarSign className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                          {servicio.precio_base != null && Number(servicio.precio_base) > 0
                            ? `$ ${Number(servicio.precio_base).toLocaleString('es-CO')}`
                            : 'Por cotizar'}
                        </span>
                      </div>
                      {servicio.incluye_repuestos ? (
                        <span className="inline-block mt-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                          + Repuestos Incluidos
                        </span>
                      ) : (
                        <span className="inline-block mt-0.5 text-[10px] font-medium text-slate-400">
                          Solo mano de obra
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {servicio.duracion_estimada_horas ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 text-[11px] font-bold font-mono">
                            <Clock className="h-3 w-3 text-slate-500" />{' '}
                            {servicio.duracion_estimada_horas}h
                          </span>
                        ) : null}
                        {servicio.requiere_certificacion ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold">
                            <ShieldCheck className="h-3 w-3 text-rose-600" />
                            {servicio.tipo_certificacion_requerida || 'Certificación'}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEdit(servicio)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all cursor-pointer"
                          title="Editar servicio"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(servicio.id_servicio)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Desactivar servicio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Servicio Comercial */}
      {isModalOpen && (
        <ServicioComercialModal
          onClose={() => setIsModalOpen(false)}
          servicio={editingServicio}
          servicios={todosLosServicios || servicios || []}
          tiposServicio={tiposServicio || []}
          tiposServicioLoading={loadingTipos}
          tiposServicioError={errorTipos}
          onReintentarTipos={() => refetchTipos()}
          onSubmit={async (formData: Partial<CatalogoServicio>) => {
            if (editingServicio) {
              await actualizarServicio.mutateAsync({
                id: editingServicio.id_servicio,
                data: formData,
              });
            } else {
              await crearServicio.mutateAsync(formData);
            }
            setIsModalOpen(false);
          }}
          isLoading={crearServicio.isPending || actualizarServicio.isPending}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODAL PRÉMIUM DE CREACIÓN / EDICIÓN DE SERVICIO COMERCIAL
// ═══════════════════════════════════════════════════════════════════════════════

interface ServicioComercialModalProps {
  onClose: () => void;
  servicio?: CatalogoServicio | null;
  servicios: CatalogoServicio[];
  tiposServicio: TipoServicio[];
  tiposServicioLoading: boolean;
  tiposServicioError: boolean;
  onReintentarTipos?: () => void;
  onSubmit: (formData: Partial<CatalogoServicio>) => Promise<void>;
  isLoading: boolean;
}

function ServicioComercialModal({
  onClose,
  servicio,
  servicios = [],
  tiposServicio = [],
  tiposServicioLoading,
  tiposServicioError,
  onReintentarTipos,
  onSubmit,
  isLoading,
}: ServicioComercialModalProps) {
  const codigosExistentes = useMemo(() => {
    return new Set<string>(
      (servicios || [])
        .filter((s) => !servicio || s.id_servicio !== servicio.id_servicio)
        .map((s) => (s.codigo_servicio || '').toUpperCase().trim())
        .filter(Boolean),
    );
  }, [servicios, servicio]);

  const [isAutoCodigo, setIsAutoCodigo] = useState(!servicio);

  const [formData, setFormData] = useState({
    nombre_servicio: servicio?.nombre_servicio || '',
    codigo_servicio: servicio?.codigo_servicio || '',
    categoria: servicio?.categoria || 'CORRECTIVO',
    id_tipo_servicio: servicio?.id_tipo_servicio ? String(servicio.id_tipo_servicio) : '',
    descripcion: servicio?.descripcion || '',
    precio_base: servicio?.precio_base != null ? servicio.precio_base : '',
    duracion_estimada_horas:
      servicio?.duracion_estimada_horas != null ? servicio.duracion_estimada_horas : '',
    requiere_certificacion: Boolean(servicio?.requiere_certificacion),
    tipo_certificacion_requerida: servicio?.tipo_certificacion_requerida || '',
    incluye_repuestos: Boolean(servicio?.incluye_repuestos),
  });

  const isCodigoDuplicado = useMemo(() => {
    return verificarCodigoDuplicado(
      formData.codigo_servicio,
      codigosExistentes,
      servicio?.codigo_servicio,
    );
  }, [formData.codigo_servicio, codigosExistentes, servicio]);

  const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNombre = e.target.value;
    const newCode =
      isAutoCodigo && !servicio
        ? generarCodigoServicioComercial(newNombre, formData.categoria, codigosExistentes)
        : formData.codigo_servicio;
    setFormData({
      ...formData,
      nombre_servicio: newNombre,
      codigo_servicio: newCode,
    });
  };

  const handleCategoriaSelect = (newCat: string) => {
    const newCode =
      isAutoCodigo && !servicio
        ? generarCodigoServicioComercial(formData.nombre_servicio, newCat, codigosExistentes)
        : formData.codigo_servicio;
    setFormData((prev) => ({
      ...prev,
      categoria: newCat,
      codigo_servicio: newCode,
    }));
  };

  const handleToggleAutoCodigo = () => {
    const nuevoModo = !isAutoCodigo;
    setIsAutoCodigo(nuevoModo);
    if (nuevoModo) {
      const auto = generarCodigoServicioComercial(
        formData.nombre_servicio,
        formData.categoria,
        codigosExistentes,
      );
      setFormData((prev) => ({ ...prev, codigo_servicio: auto }));
    }
  };

  // Opciones para el selector de Tipos de Servicio en modal
  const tiposServicioModalOptions = useMemo(() => {
    return [
      {
        value: '',
        label: 'No vincular (General / Multi-tipo)',
        badge: 'Universal',
        description: 'El servicio comercial aplica a cualquier tipo de equipo',
      },
      ...(tiposServicio || []).map((t) => ({
        value: String(t.id_tipo_servicio),
        label: t.nombre_tipo,
        badge: t.codigo_tipo || undefined,
        description: t.categoria ? `Categoría Técnica: ${t.categoria}` : undefined,
      })),
    ];
  }, [tiposServicio]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCodigoDuplicado) return;
    const finalCode =
      formData.codigo_servicio.trim() ||
      generarCodigoServicioComercial(
        formData.nombre_servicio,
        formData.categoria,
        codigosExistentes,
      );
    const data: Partial<CatalogoServicio> = {
      ...formData,
      codigo_servicio: finalCode.toUpperCase().trim(),
      id_tipo_servicio: formData.id_tipo_servicio ? Number(formData.id_tipo_servicio) : null,
      precio_base:
        formData.precio_base !== '' && formData.precio_base != null
          ? Number(formData.precio_base)
          : null,
      duracion_estimada_horas:
        formData.duracion_estimada_horas !== '' && formData.duracion_estimada_horas != null
          ? Number(formData.duracion_estimada_horas)
          : null,
    };
    onSubmit(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header Modal con Gradiente */}
        <div className="p-5 px-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-blue-50/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              {servicio ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {servicio ? 'Editar Servicio Comercial' : 'Nuevo Servicio Comercial'}
              </h2>
              <p className="text-xs text-gray-500">
                Define tarifas base, alcance técnico y certificaciones del servicio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulario con Scroll Cómodo */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 overflow-y-auto max-h-[calc(92vh-140px)]"
        >
          {/* PASO 1: Identificación Comercial */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                Nombre del Servicio *
              </label>
              <input
                required
                type="text"
                value={formData.nombre_servicio}
                onChange={handleNombreChange}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
                placeholder="Ej: Cambio de Filtro de Aire"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                  Código Comercial *
                </label>
                {!servicio && (
                  <button
                    type="button"
                    onClick={handleToggleAutoCodigo}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {isAutoCodigo ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    <span>{isAutoCodigo ? 'Personalizar código' : 'Auto-generar'}</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={formData.codigo_servicio}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      codigo_servicio: e.target.value.toUpperCase().trim(),
                    });
                  }}
                  className={cn(
                    'w-full pl-3.5 pr-14 py-2.5 border rounded-xl outline-none text-xs font-mono font-bold tracking-tight uppercase transition-colors',
                    isAutoCodigo
                      ? 'bg-emerald-50/50 border-emerald-300 text-emerald-950'
                      : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-blue-500',
                    isCodigoDuplicado
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900 focus:ring-rose-500'
                      : '',
                  )}
                  placeholder="CORR-CAMB-FILT-AIRE"
                  disabled={Boolean(servicio) || isAutoCodigo}
                />
                {isAutoCodigo && !servicio && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    ✓ Auto
                  </span>
                )}
              </div>
              {isCodigoDuplicado ? (
                <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                  ✕ Código en uso. Modifícalo para que sea único.
                </p>
              ) : formData.codigo_servicio && !servicio ? (
                <p className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Código único garantizado disponible</span>
                </p>
              ) : null}
            </div>
          </div>

          {/* PASO 2: Selectores Prémium con EamSelect */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                Categoría Comercial *
              </label>
              <EamSelect
                value={formData.categoria}
                onChange={handleCategoriaSelect}
                options={CATEGORIAS_COMERCIALES}
                placeholder="Seleccionar categoría..."
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                Vincular a Tipo de Servicio (Opcional)
              </label>
              <EamSelect
                value={formData.id_tipo_servicio}
                onChange={(val) => setFormData((prev) => ({ ...prev, id_tipo_servicio: val }))}
                options={tiposServicioModalOptions}
                placeholder="Seleccionar tipo de servicio o Universal..."
                searchable
                disabled={tiposServicioLoading}
              />
              {tiposServicioLoading ? (
                <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Cargando tipos de servicio...
                </p>
              ) : tiposServicioError ? (
                <p className="text-[10px] text-red-600 mt-1">
                  No se pudieron cargar los tipos.{' '}
                  <button
                    type="button"
                    onClick={() => onReintentarTipos?.()}
                    className="font-bold underline hover:text-red-800 cursor-pointer"
                  >
                    Reintentar
                  </button>
                </p>
              ) : tiposServicio && tiposServicio.length > 0 ? (
                <p className="text-[10px] text-gray-400 mt-1 font-medium">
                  {tiposServicio.length} tipo{tiposServicio.length === 1 ? '' : 's'} técnico
                  {tiposServicio.length === 1 ? '' : 's'} activo
                  {tiposServicio.length === 1 ? '' : 's'} disponible
                  {tiposServicio.length === 1 ? '' : 's'}.
                </p>
              ) : null}
            </div>
          </div>

          {/* PASO 3: Parámetros Económicos y Operativos */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Precio Base ($)
                </span>
                <span className="text-[10px] font-normal text-slate-400 normal-case">
                  (Opcional)
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.precio_base}
                  onChange={(e) => setFormData({ ...formData, precio_base: e.target.value })}
                  className="w-full pl-8 pr-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-bold bg-white transition-all font-mono"
                  placeholder="Ej: 150000"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Tarifa sugerida en cotizaciones y órdenes de servicio.
              </p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-600" /> Duración Est. (h)
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                value={formData.duracion_estimada_horas}
                onChange={(e) =>
                  setFormData({ ...formData, duracion_estimada_horas: e.target.value })
                }
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-bold bg-white transition-all font-mono"
                placeholder="Ej: 2.0"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Tiempo de mano de obra estimado en campo.
              </p>
            </div>
          </div>

          {/* PASO 4: Tarjetas Interactivas de Condiciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() =>
                setFormData((prev) => ({ ...prev, incluye_repuestos: !prev.incluye_repuestos }))
              }
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer',
                formData.incluye_repuestos
                  ? 'bg-blue-50/80 border-blue-300 text-blue-950 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
              )}
            >
              <input
                type="checkbox"
                checked={formData.incluye_repuestos}
                onChange={(e) => setFormData({ ...formData, incluye_repuestos: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 mt-0.5 cursor-pointer"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold">Precio incluye repuestos</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  El valor cotizado ya contempla insumos y materiales.
                </p>
              </div>
            </div>

            <div
              onClick={() =>
                setFormData((prev) => ({
                  ...prev,
                  requiere_certificacion: !prev.requiere_certificacion,
                }))
              }
              className={cn(
                'flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer',
                formData.requiere_certificacion
                  ? 'bg-rose-50/80 border-rose-300 text-rose-950 shadow-xs'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50',
              )}
            >
              <input
                type="checkbox"
                checked={formData.requiere_certificacion}
                onChange={(e) =>
                  setFormData({ ...formData, requiere_certificacion: e.target.checked })
                }
                className="w-4 h-4 rounded text-rose-600 mt-0.5 cursor-pointer"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-rose-600" />
                  Requiere Certificación Especial
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Exige técnico certificado (Alturas, RETIE, etc.).
                </p>
              </div>
            </div>
          </div>

          {/* Detalle de Certificación si aplica */}
          {formData.requiere_certificacion && (
            <div className="p-3.5 bg-rose-50/90 rounded-xl border border-rose-200 animate-in fade-in">
              <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <ShieldCheck className="h-4 w-4 text-rose-600" />
                Tipo de Certificación Requerida *
              </label>
              <input
                type="text"
                required={formData.requiere_certificacion}
                value={formData.tipo_certificacion_requerida}
                onChange={(e) =>
                  setFormData({ ...formData, tipo_certificacion_requerida: e.target.value })
                }
                className="w-full px-3.5 py-2 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-xs font-medium bg-white"
                placeholder="Ej: Trabajo Seguro en Alturas / Tarjeta Profesional CONTE"
              />
            </div>
          )}

          {/* Alcance Comercial */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Descripción / Alcance Comercial
            </label>
            <textarea
              rows={3}
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
              placeholder="Detalla qué incluye y qué excluye este servicio comercial para el cliente..."
            />
          </div>
        </form>

        {/* Footer Modal */}
        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-bold transition-all text-sm cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              isLoading ||
              isCodigoDuplicado ||
              !formData.nombre_servicio.trim() ||
              !formData.codigo_servicio.trim()
            }
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {servicio ? 'Guardar Cambios' : 'Crear Servicio'}
          </button>
        </div>
      </div>
    </div>
  );
}
