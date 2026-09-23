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
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Edit,
  Flame,
  Hash,
  Layers,
  ListTodo,
  Loader2,
  Plus,
  Power,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const CATEGORIAS_PREDEFINIDAS = ['GENERAL', 'GENERADOR', 'BOMBA', 'ELECTRICO', 'MECANICO'];

export default function CatalogoPendientesPage() {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODAS');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogoPendiente | null>(null);
  const [tiposEquipo, setTiposEquipo] = useState<TipoEquipoOption[]>([]);

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
    incluirInactivos: mostrarInactivos,
    busqueda: busqueda.trim() || undefined,
  });

  const pendientes = response?.data || [];
  const crearPendiente = useCreateCatalogoPendiente();
  const actualizarPendiente = useUpdateCatalogoPendiente();
  const toggleActivo = useToggleActivoCatalogoPendiente();
  const eliminarPendiente = useDeleteCatalogoPendiente();

  // Cargar tipos de equipo para el selector
  useEffect(() => {
    tiposEquipoService.listarTodos().then(setTiposEquipo).catch(() => {});
  }, []);

  const handleOpenCrear = () => {
    setEditingItem(null);
    setFormData({
      descripcion: '',
      codigo: '',
      categoria: 'GENERAL',
      idTipoEquipo: '',
      ordenVisual: (pendientes.length + 1) * 10,
      activo: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditar = (item: CatalogoPendiente) => {
    setEditingItem(item);
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
    const msg = uso > 0
      ? `Este pendiente se ha usado en ${uso} orden(es). Se desactivará para mantener la integridad histórica. ¿Continuar?`
      : `¿Estás seguro de eliminar el pendiente "${item.descripcion}"?`;

    if (window.confirm(msg)) {
      await eliminarPendiente.mutateAsync({
        id: item.id_pendiente_catalogo,
        hard: uso === 0,
      });
    }
  };

  // Métricas rápidas
  const totalActivos = pendientes.filter((p) => p.activo).length;
  const totalInactivos = pendientes.length - totalActivos;
  const totalUsosEnOrdenes = pendientes.reduce((acc, p) => acc + (p._count?.ordenes_pendientes || 0), 0);

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
            className="p-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            title="Recargar datos"
          >
            <RefreshCw className={cn('h-5 w-5', isLoading && 'animate-spin')} />
          </button>
          <button
            onClick={handleOpenCrear}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Nuevo Pendiente
          </button>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Plantillas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{pendientes.length}</p>
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

      {/* Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
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

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filtro por Categoría */}
          <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setCategoriaFiltro('TODAS')}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                categoriaFiltro === 'TODAS'
                  ? 'bg-white text-gray-900 shadow-sm font-semibold'
                  : 'text-gray-600 hover:text-gray-900'
              )}
            >
              Todas
            </button>
            {CATEGORIAS_PREDEFINIDAS.slice(0, 3).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaFiltro(cat)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  categoriaFiltro === cat
                    ? 'bg-amber-600 text-white shadow-sm font-semibold'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {cat}
              </button>
            ))}
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
            <p className="font-medium">Error al cargar el catálogo</p>
            <button
              onClick={() => refetch()}
              className="mt-3 px-4 py-1.5 bg-red-50 text-red-700 rounded-lg text-xs font-semibold hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        ) : pendientes.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <ListTodo className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-base font-semibold text-gray-700">No se encontraron pendientes</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm text-center">
              {busqueda
                ? 'No hay registros que coincidan con la búsqueda.'
                : 'Aún no se han configurado ítems en el catálogo de pendientes.'}
            </p>
            {!busqueda && (
              <button
                onClick={handleOpenCrear}
                className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors shadow-sm"
              >
                Agregar primer pendiente
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4 w-28">Código</th>
                  <th className="py-3 px-4">Descripción del Pendiente</th>
                  <th className="py-3 px-4 w-32">Categoría</th>
                  <th className="py-3 px-4 w-40">Tipo Equipo</th>
                  <th className="py-3 px-4 w-24 text-center">Uso Órdenes</th>
                  <th className="py-3 px-4 w-28 text-center">Estado</th>
                  <th className="py-3 px-4 w-28 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {pendientes.map((item, idx) => (
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

                    <td className="py-3 px-4 font-mono text-xs font-medium text-gray-700">
                      {item.codigo ? (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-700 border border-gray-200">
                          {item.codigo}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-medium text-gray-900 max-w-md">
                      <div>
                        {item.descripcion}
                        {!item.activo && (
                          <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            Inactivo
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium',
                          item.categoria === 'GENERADOR'
                            ? 'bg-blue-100 text-blue-800'
                            : item.categoria === 'BOMBA'
                            ? 'bg-cyan-100 text-cyan-800'
                            : item.categoria === 'ELECTRICO'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-purple-100 text-purple-800'
                        )}
                      >
                        <Tag className="h-3 w-3" />
                        {item.categoria || 'GENERAL'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-xs text-gray-600">
                      {item.tipos_equipo ? (
                        <span className="inline-flex items-center gap-1 text-gray-700 font-medium">
                          <Layers className="h-3.5 w-3.5 text-gray-400" />
                          {item.tipos_equipo.nombre_tipo}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Todos los equipos</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold',
                          (item._count?.ordenes_pendientes || 0) > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-400'
                        )}
                      >
                        {item._count?.ordenes_pendientes || 0}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActivo(item)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all inline-flex items-center gap-1',
                          item.activo
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        )}
                        title={item.activo ? 'Clic para desactivar' : 'Clic para activar'}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            item.activo ? 'bg-green-600' : 'bg-gray-400'
                          )}
                        />
                        {item.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditar(item)}
                          className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Eliminar / Desactivar"
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

      {/* Modal Crear / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-amber-600" />
                {editingItem ? 'Editar Pendiente Maestro' : 'Nuevo Pendiente Maestro'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Descripción del Trabajo o Falla Pendiente <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Ej: Cambiar filtro racor de combustible; Corregir fuga en manguera..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Código (Opcional)
                  </label>
                  <input
                    type="text"
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Ej: PEND-GEN-01"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Orden Visual
                  </label>
                  <input
                    type="number"
                    value={formData.ordenVisual}
                    onChange={(e) => setFormData({ ...formData, ordenVisual: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value.toUpperCase() })}
                    placeholder="GENERAL / GENERADOR / BOMBA"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent uppercase"
                    list="categorias-list"
                  />
                  <datalist id="categorias-list">
                    {CATEGORIAS_PREDEFINIDAS.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                    Tipo de Equipo
                  </label>
                  <select
                    value={formData.idTipoEquipo}
                    onChange={(e) => setFormData({ ...formData, idTipoEquipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">Aplica a todos</option>
                    {tiposEquipo.map((tipo) => (
                      <option key={tipo.id_tipo_equipo} value={tipo.id_tipo_equipo}>
                        {tipo.nombre_tipo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Activo (visible en la app móvil de los técnicos)
                  </span>
                </label>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={crearPendiente.isPending || actualizarPendiente.isPending}
                  className="flex items-center gap-2 px-5 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 shadow-sm"
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
