'use client';

import {
  useCatalogoPendientes,
  useCreateCatalogoPendiente,
  useDeleteCatalogoPendiente,
  useToggleActivoCatalogoPendiente,
  useUpdateCatalogoPendiente,
  type CatalogoPendiente,
} from '@/features/catalogos';
import { tiposEquipoService, type TipoEquipoOption } from '@/features/equipos/lib/tipos-equipo.service';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Cpu,
  Droplets,
  Edit,
  Flame,
  Globe,
  Hash,
  HelpCircle,
  Layers,
  ListTodo,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const CATEGORIAS_DEFAULT = [
  'ELECTRICO',
  'MECANICO',
  'COMBUSTIBLE',
  'HIDRAULICO',
  'ELECTRONICO',
  'INSTRUMENTACION',
  'LIMPIEZA',
  'GENERAL',
];

const CATEGORIA_ICONS: Record<string, string> = {
  ELECTRICO: '⚡',
  MECANICO: '⚙️',
  COMBUSTIBLE: '⛽',
  HIDRAULICO: '💧',
  ELECTRONICO: '📟',
  INSTRUMENTACION: '🧭',
  LIMPIEZA: '🧹',
  GENERAL: '📋',
};

const CATEGORIA_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ELECTRICO: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
  MECANICO: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
  COMBUSTIBLE: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-300' },
  HIDRAULICO: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
  ELECTRONICO: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-300' },
  INSTRUMENTACION: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-300' },
  LIMPIEZA: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  GENERAL: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
};

export default function CatalogoPendientesPage() {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS');
  const [tipoEquipoFiltro, setTipoEquipoFiltro] = useState<string>('TODOS');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogoPendiente | null>(null);
  const [tiposEquipo, setTiposEquipo] = useState<TipoEquipoOption[]>([]);
  const [categoriasDinamicas, setCategoriasDinamicas] = useState<string[]>(CATEGORIAS_DEFAULT);
  const [isAddingCategoria, setIsAddingCategoria] = useState(false);
  const [nuevaCategoriaInput, setNuevaCategoriaInput] = useState('');
  const [isCodigoManual, setIsCodigoManual] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    descripcion: '',
    codigo: '',
    categoria: 'GENERAL',
    idTipoEquipo: '' as string | number,
    ordenVisual: 0,
    activo: true,
  });

  // Query & Mutations
  const {
    data: response,
    isLoading,
    isError,
    refetch,
  } = useCatalogoPendientes({
    categoria: categoriaFiltro !== 'TODAS' ? categoriaFiltro : undefined,
    idTipoEquipo: tipoEquipoFiltro !== 'TODOS' && tipoEquipoFiltro !== 'UNIVERSAL' ? Number(tipoEquipoFiltro) : undefined,
    incluirInactivos: mostrarInactivos,
    busqueda: busqueda.trim() || undefined,
  });

  const rawPendientes = response?.data || [];
  const pendientes = useMemo(() => {
    if (tipoEquipoFiltro === 'UNIVERSAL') {
      return rawPendientes.filter((p) => p.id_tipo_equipo === null || p.id_tipo_equipo === undefined);
    }
    return rawPendientes;
  }, [rawPendientes, tipoEquipoFiltro]);

  const crearPendiente = useCreateCatalogoPendiente();
  const actualizarPendiente = useUpdateCatalogoPendiente();
  const toggleActivo = useToggleActivoCatalogoPendiente();
  const eliminarPendiente = useDeleteCatalogoPendiente();

  // Cargar tipos de equipo reales de la BD
  useEffect(() => {
    tiposEquipoService.listarTodos().then(setTiposEquipo).catch(() => {});
  }, []);

  // Cargar categorías dinámicas de la API
  useEffect(() => {
    apiClient
      .get<{ success: boolean; data: string[] }>('/ordenes/catalogo-pendientes/categorias')
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data.data)) {
          setCategoriasDinamicas(res.data.data);
        }
      })
      .catch(() => {
        // Fallback: extraer de los pendientes cargados
        if (rawPendientes.length > 0) {
          const fromItems = rawPendientes
            .map((p) => p.categoria?.trim().toUpperCase())
            .filter((c): c is string => Boolean(c));
          const union = Array.from(new Set([...CATEGORIAS_DEFAULT, ...fromItems])).sort();
          setCategoriasDinamicas(union);
        }
      });
  }, [rawPendientes.length]);

  // Lista de códigos existentes para verificación de unicidad
  const existingCodes = useMemo(() => {
    return rawPendientes
      .filter((p) => !editingItem || p.id_pendiente_catalogo !== editingItem.id_pendiente_catalogo)
      .map((p) => p.codigo?.trim().toUpperCase())
      .filter((c): c is string => Boolean(c));
  }, [rawPendientes, editingItem]);

  // Función inteligente de generación de código anti-colisión
  const generarCodigoInteligente = (
    desc: string,
    idTipo: string | number,
    cat: string
  ): string => {
    if (!desc.trim()) return '';

    // 1. Determinar prefijo según tipo de equipo o categoría
    let prefix = 'GRAL';
    if (idTipo) {
      const tipoObj = tiposEquipo.find((t) => String(t.id_tipo_equipo) === String(idTipo));
      const nom = tipoObj?.nombre_tipo?.toUpperCase() || '';
      if (nom.includes('GENERADOR')) prefix = 'GEN';
      else if (nom.includes('BOMBA')) prefix = 'BOM';
      else if (nom.includes('COMPRESOR')) prefix = 'COMP';
      else if (nom.includes('MOTOR')) prefix = 'MOT';
      else prefix = nom.replace(/[^A-Z]/g, '').slice(0, 4) || 'EQP';
    } else if (cat) {
      const catMap: Record<string, string> = {
        ELECTRICO: 'ELEC',
        MECANICO: 'MEC',
        COMBUSTIBLE: 'COMB',
        HIDRAULICO: 'HID',
        ELECTRONICO: 'ELTN',
        INSTRUMENTACION: 'INST',
        LIMPIEZA: 'LIMP',
        GENERAL: 'GRAL',
      };
      prefix = catMap[cat] || cat.slice(0, 4);
    }

    // 2. Extraer palabras clave de la descripción eliminando stopwords en español
    const stopwords = new Set([
      'DE', 'LA', 'EL', 'EN', 'UN', 'UNA', 'LOS', 'LAS', 'CON', 'PARA', 'POR', 'O', 'Y', 'AL', 'DEL', 'SE', 'SU', 'SUS'
    ]);

    const words = desc
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !stopwords.has(w));

    const slugTokens = words.slice(0, 3).map((w) => w.slice(0, 4));
    const baseSlug = slugTokens.length > 0 ? slugTokens.join('-') : 'PEND';

    let candidato = `PEND-${prefix}-${baseSlug}`;

    // 3. Garantizar unicidad con sufijo si colisiona
    if (existingCodes.includes(candidato)) {
      let suffix = 2;
      while (existingCodes.includes(`${candidato}-${String(suffix).padStart(2, '0')}`)) {
        suffix++;
      }
      candidato = `${candidato}-${String(suffix).padStart(2, '0')}`;
    }

    return candidato;
  };

  // Manejar cambio en descripción con generación en caliente si no es manual
  const handleDescripcionChange = (val: string) => {
    const updated = { ...formData, descripcion: val };
    if (!isCodigoManual && !editingItem) {
      updated.codigo = generarCodigoInteligente(val, formData.idTipoEquipo, formData.categoria);
    }
    setFormData(updated);
  };

  // Botón explícito de autogenerar código
  const handleForzarGenerarCodigo = () => {
    const code = generarCodigoInteligente(formData.descripcion, formData.idTipoEquipo, formData.categoria);
    setFormData({ ...formData, codigo: code });
    setIsCodigoManual(false);
  };

  // Crear nueva categoría en caliente
  const handleCrearNuevaCategoria = () => {
    const catLimpia = nuevaCategoriaInput.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!catLimpia) return;

    if (!categoriasDinamicas.includes(catLimpia)) {
      setCategoriasDinamicas((prev) => [...prev, catLimpia].sort());
    }
    setFormData((prev) => ({
      ...prev,
      categoria: catLimpia,
      codigo: !isCodigoManual && !editingItem ? generarCodigoInteligente(prev.descripcion, prev.idTipoEquipo, catLimpia) : prev.codigo,
    }));
    setNuevaCategoriaInput('');
    setIsAddingCategoria(false);
  };

  const handleOpenCrear = () => {
    setEditingItem(null);
    setIsCodigoManual(false);
    setIsAddingCategoria(false);
    setFormData({
      descripcion: '',
      codigo: '',
      categoria: 'GENERAL',
      idTipoEquipo: '',
      ordenVisual: (rawPendientes.length + 1) * 10,
      activo: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditar = (item: CatalogoPendiente) => {
    setEditingItem(item);
    setIsCodigoManual(true);
    setIsAddingCategoria(false);
    setFormData({
      descripcion: item.descripcion || '',
      codigo: item.codigo || '',
      categoria: item.categoria || 'GENERAL',
      idTipoEquipo: item.id_tipo_equipo ? String(item.id_tipo_equipo) : '',
      ordenVisual: item.orden_visual || 0,
      activo: item.activo,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.descripcion.trim()) return;

    const payload = {
      descripcion: formData.descripcion.trim(),
      codigo: formData.codigo.trim() || undefined,
      categoria: formData.categoria.trim() || 'GENERAL',
      idTipoEquipo: formData.idTipoEquipo ? Number(formData.idTipoEquipo) : null,
      ordenVisual: Number(formData.ordenVisual) || 0,
      activo: formData.activo,
    };

    if (editingItem) {
      await actualizarPendiente.mutateAsync({
        id: editingItem.id_pendiente_catalogo,
        data: payload,
      });
    } else {
      await crearPendiente.mutateAsync(payload);
    }

    setIsModalOpen(false);
  };

  const handleToggleActivo = async (item: CatalogoPendiente) => {
    await toggleActivo.mutateAsync({
      id: item.id_pendiente_catalogo,
      activo: !item.activo,
    });
  };

  const handleDelete = async (item: CatalogoPendiente) => {
    const uso = item._count?.ordenes_pendientes || 0;
    const msg =
      uso > 0
        ? `Este pendiente se ha usado en ${uso} orden(es). Se desactivará para mantener la integridad histórica. ¿Continuar?`
        : `¿Estás seguro de eliminar el pendiente "${item.descripcion}"?`;

    if (window.confirm(msg)) {
      await eliminarPendiente.mutateAsync({
        id: item.id_pendiente_catalogo,
        hard: uso === 0,
      });
    }
  };

  // Comprobación de código duplicado
  const isCodigoDuplicado = useMemo(() => {
    if (!formData.codigo.trim()) return false;
    return existingCodes.includes(formData.codigo.trim().toUpperCase());
  }, [formData.codigo, existingCodes]);

  // Métricas rápidas
  const totalActivos = rawPendientes.filter((p) => p.activo).length;
  const totalInactivos = rawPendientes.length - totalActivos;
  const totalUsosEnOrdenes = rawPendientes.reduce((acc, p) => acc + (p._count?.ordenes_pendientes || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListTodo className="h-7 w-7 text-amber-600" />
            Catálogo Maestro de Pendientes
          </h1>
          <p className="text-gray-500 mt-1">
            Plantillas sugeridas de hallazgos y trabajos pendientes para sincronizar con técnicos móviles
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
            title="Recargar datos"
          >
            <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={handleOpenCrear}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            Nuevo Pendiente Maestro
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Plantillas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{rawPendientes.length}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <ListTodo className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Activos en Móvil</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{totalActivos}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Desactivados</p>
            <p className="text-2xl font-bold text-gray-500 mt-1">{totalInactivos}</p>
          </div>
          <div className="p-3 bg-gray-100 rounded-lg text-gray-500">
            <Power className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Usos en Órdenes</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{totalUsosEnOrdenes}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
            <Wrench className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Buscador */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por descripción o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Filtro por Tipo de Equipo */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-gray-400" />
                Equipo:
              </label>
              <select
                value={tipoEquipoFiltro}
                onChange={(e) => setTipoEquipoFiltro(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-amber-500"
              >
                <option value="TODOS">Todos los tipos de activo</option>
                <option value="UNIVERSAL">🌐 Solo Universales (Todos)</option>
                {tiposEquipo.map((t) => (
                  <option key={t.id_tipo_equipo} value={t.id_tipo_equipo}>
                    {t.nombre_tipo}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Inactivos */}
            <label className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-600 font-medium bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 select-none">
              <input
                type="checkbox"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Ver inactivos
            </label>
          </div>
        </div>

        {/* Filtros por Categoría (Carrusel de Chips) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0 flex items-center gap-1">
            <Tag className="h-3 w-3" /> Categoría:
          </span>
          <button
            onClick={() => setCategoriaFiltro('TODAS')}
            className={cn(
              'px-3 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer',
              categoriaFiltro === 'TODAS'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Todas ({rawPendientes.length})
          </button>
          {categoriasDinamicas.map((cat) => {
            const count = rawPendientes.filter((p) => p.categoria === cat).length;
            const icon = CATEGORIA_ICONS[cat] || '🏷️';
            const isSelected = categoriaFiltro === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(cat)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer',
                  isSelected
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                )}
              >
                <span>{icon}</span>
                <span>{cat}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                      isSelected ? 'bg-amber-800/40 text-amber-100' : 'bg-gray-200/80 text-gray-600'
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla de Pendientes */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-2" />
            <p className="text-sm">Cargando catálogo de pendientes...</p>
          </div>
        ) : isError ? (
          <div className="py-20 flex flex-col items-center justify-center text-red-500">
            <AlertCircle className="h-10 w-10 mb-2" />
            <p className="font-medium">Error al cargar el catálogo de pendientes</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : pendientes.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <ListTodo className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-base font-semibold text-gray-700">No se encontraron plantillas</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm text-center">
              {busqueda
                ? 'No hay registros que coincidan con la búsqueda o filtros aplicados.'
                : 'Aún no se han configurado ítems en el catálogo de pendientes.'}
            </p>
            {!busqueda && (
              <button
                onClick={handleOpenCrear}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors shadow-sm cursor-pointer"
              >
                Agregar primer pendiente maestro
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-32">Código</th>
                  <th className="py-3 px-4">Descripción del Hallazgo</th>
                  <th className="py-3 px-4 w-36">Categoría</th>
                  <th className="py-3 px-4 w-44">Tipo de Activo</th>
                  <th className="py-3 px-4 w-24 text-center">Usos</th>
                  <th className="py-3 px-4 w-28 text-center">Estado</th>
                  <th className="py-3 px-4 w-24 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {pendientes.map((item, idx) => {
                  const catStyle = CATEGORIA_COLORS[item.categoria || 'GENERAL'] || CATEGORIA_COLORS.GENERAL;
                  const catIcon = CATEGORIA_ICONS[item.categoria || 'GENERAL'] || '🏷️';
                  return (
                    <tr
                      key={item.id_pendiente_catalogo}
                      className={cn(
                        'hover:bg-amber-50/30 transition-colors group',
                        !item.activo && 'opacity-60 bg-gray-50/40'
                      )}
                    >
                      <td className="py-3 px-4 text-center text-xs font-mono text-gray-400">
                        {item.orden_visual !== null && item.orden_visual !== undefined
                          ? item.orden_visual
                          : idx + 1}
                      </td>

                      <td className="py-3 px-4 font-mono text-xs font-bold text-gray-800">
                        {item.codigo ? (
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-800 border border-gray-200">
                            {item.codigo}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-semibold text-gray-900 max-w-md">
                        <div>
                          {item.descripcion}
                          {!item.activo && (
                            <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-normal">
                              Inactivo
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border uppercase tracking-wider',
                            catStyle.bg,
                            catStyle.text,
                            catStyle.border
                          )}
                        >
                          <span>{catIcon}</span>
                          <span>{item.categoria || 'GENERAL'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {item.tipos_equipo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            <Wrench className="h-3 w-3 text-blue-600" />
                            {item.tipos_equipo.nombre_tipo}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                            <Globe className="h-3 w-3 text-gray-500" />
                            Universal (Todos)
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-xs text-gray-600">
                        {item._count?.ordenes_pendientes ? (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                            {item._count.ordenes_pendientes}
                          </span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActivo(item)}
                          className={cn(
                            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors cursor-pointer',
                            item.activo
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', item.activo ? 'bg-green-600' : 'bg-gray-400')} />
                          {item.activo ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditar(item)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar plantilla"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar o desactivar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Inteligente: Crear / Editar Pendiente Maestro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200 max-h-[92vh] flex flex-col">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <ListTodo className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editingItem ? 'Editar Pendiente Maestro' : 'Nuevo Pendiente Maestro'}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Configuración de plantilla estándar para sincronización y cotizaciones
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {/* Campo 1: Descripción */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Descripción del Trabajo o Falla Pendiente <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {formData.descripcion.length}/300
                  </span>
                </div>
                <textarea
                  required
                  rows={2}
                  maxLength={300}
                  value={formData.descripcion}
                  onChange={(e) => handleDescripcionChange(e.target.value)}
                  placeholder="Ej: Cambiar filtro racor de combustible; Corregir fuga en sello mecánico..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none font-medium text-gray-900"
                />
              </div>

              {/* Campo 2: Tipo de Equipo al que Aplica */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Tipo de Equipo al que Aplica</span>
                  <span className="text-[11px] text-amber-700 font-normal">
                    {formData.idTipoEquipo ? 'Específico a una familia' : 'Universal (Aplica a cualquier activo)'}
                  </span>
                </label>
                <div className="relative">
                  <select
                    value={formData.idTipoEquipo}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => {
                        const updated = { ...prev, idTipoEquipo: val };
                        if (!isCodigoManual && !editingItem) {
                          updated.codigo = generarCodigoInteligente(prev.descripcion, val, prev.categoria);
                        }
                        return updated;
                      });
                    }}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white font-medium text-gray-800"
                  >
                    <option value="">🌐 Aplica Universalmente (A todos los tipos de equipo)</option>
                    {tiposEquipo.map((tipo) => (
                      <option key={tipo.id_tipo_equipo} value={tipo.id_tipo_equipo}>
                        ⚡ {tipo.nombre_tipo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Campo 3: Categoría Dinámica con selector de chips + botón nueva */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Categoría Técnica del Hallazgo
                  </label>
                  {!isAddingCategoria && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCategoria(true)}
                      className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Nueva Categoría
                    </button>
                  )}
                </div>

                {isAddingCategoria ? (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-2 animate-in fade-in">
                    <input
                      type="text"
                      autoFocus
                      placeholder="Nombre de la nueva categoría (ej: TRANSMISION, REFRIGERACION)..."
                      value={nuevaCategoriaInput}
                      onChange={(e) => setNuevaCategoriaInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleCrearNuevaCategoria();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-bold uppercase focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleCrearNuevaCategoria}
                      className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 cursor-pointer"
                    >
                      Asignar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCategoria(false);
                        setNuevaCategoriaInput('');
                      }}
                      className="p-1.5 text-gray-500 hover:text-gray-700 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {categoriasDinamicas.map((cat) => {
                      const isSelected = formData.categoria === cat;
                      const icon = CATEGORIA_ICONS[cat] || '🏷️';
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => {
                              const updated = { ...prev, categoria: cat };
                              if (!isCodigoManual && !editingItem) {
                                updated.codigo = generarCodigoInteligente(prev.descripcion, prev.idTipoEquipo, cat);
                              }
                              return updated;
                            });
                          }}
                          className={cn(
                            'px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer',
                            isSelected
                              ? 'bg-amber-600 text-white shadow-xs scale-102 ring-2 ring-amber-400/50'
                              : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                          )}
                        >
                          <span>{icon}</span>
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Campo 4: Código Mnemotécnico Inteligente Anti-Colisión */}
              <div className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Código Mnemotécnico
                  </label>
                  <button
                    type="button"
                    onClick={handleForzarGenerarCodigo}
                    className="text-xs text-amber-700 hover:text-amber-900 font-bold flex items-center gap-1 cursor-pointer hover:underline"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Regenerar sugerencia
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={formData.codigo}
                      onChange={(e) => {
                        setIsCodigoManual(true);
                        setFormData({ ...formData, codigo: e.target.value.toUpperCase().replace(/\s+/g, '-') });
                      }}
                      placeholder="Ej: PEND-GEN-FILT-AIRE"
                      className={cn(
                        'w-full px-3.5 py-2 bg-white border rounded-lg text-xs font-mono font-bold uppercase transition-colors',
                        isCodigoDuplicado
                          ? 'border-red-400 focus:ring-2 focus:ring-red-400 text-red-700'
                          : 'border-gray-300 focus:ring-2 focus:ring-amber-500 text-gray-900'
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  {isCodigoDuplicado ? (
                    <span className="text-red-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> Código ya en uso en otra plantilla del catálogo
                    </span>
                  ) : formData.codigo.trim() ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <Check className="h-3.5 w-3.5" /> Código único y válido
                    </span>
                  ) : (
                    <span className="text-gray-400">Se generará automáticamente con la descripción</span>
                  )}
                  {isCodigoManual && (
                    <span className="text-[10px] text-gray-500 italic">Personalizado manualmente</span>
                  )}
                </div>
              </div>

              {/* Campo 5: Orden Visual & Switch Activo */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Orden Visual
                  </label>
                  <input
                    type="number"
                    value={formData.ordenVisual}
                    onChange={(e) => setFormData({ ...formData, ordenVisual: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium text-gray-900"
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.activo}
                      onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                      className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-800">
                      Activo en app móvil
                    </span>
                  </label>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={crearPendiente.isPending || actualizarPendiente.isPending || isCodigoDuplicado}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-sm shadow-amber-600/20 cursor-pointer"
                >
                  {(crearPendiente.isPending || actualizarPendiente.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingItem ? 'Guardar Cambios' : 'Crear Pendiente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
