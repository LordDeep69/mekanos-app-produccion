'use client';

import {
  Database,
  Edit3,
  Filter,
  Loader2,
  Plus,
  Search,
  Tag,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  AtributoTecnico,
  useAtributosEam,
  useCreateAtributoEam,
  useMagnitudesEam,
  useUpdateAtributoEam,
} from '../index';

const TIPOS_CONTROL = [
  { value: 'NUMERICO', label: 'Numérico (Con Magnitud / UoM)', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'SELECT', label: 'Selección / Enumeración (Opciones)', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  { value: 'TEXTO', label: 'Texto / Alfanumérico (Serie, Modelo)', badge: 'bg-slate-100 text-slate-800 border-slate-200' },
  { value: 'BOOLEANO', label: 'Booleano (Sí / No)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
];

const ROLES_SEMANTICOS = [
  'IDENTIFICADOR',
  'CAPACIDAD_NOMINAL',
  'METRICA_PRIMARIA',
  'CONSUMIBLE_CAPACIDAD',
  'PROTECCION_SEGURIDAD',
  'CONFIGURACION',
  'ESTANDAR',
];

export function TabDiccionarioAtributos() {
  const [search, setSearch] = useState('');
  const [filtroMagnitud, setFiltroMagnitud] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const { data: magnitudes = [] } = useMagnitudesEam();
  const { data: atributos = [], isLoading } = useAtributosEam({
    magnitud: filtroMagnitud || undefined,
    tipoDato: filtroTipo || undefined,
  });

  const createAttrMut = useCreateAtributoEam();
  const updateAttrMut = useUpdateAtributoEam();

  const [showModal, setShowModal] = useState(false);
  const [editingAttr, setEditingAttr] = useState<AtributoTecnico | null>(null);
  const [form, setForm] = useState({
    codigo_atributo: '',
    nombre_atributo: '',
    descripcion: '',
    tipo_control: 'NUMERICO',
    id_magnitud: '',
    unidad_defecto_codigo: '',
    rol_semantico: 'ESTANDAR',
    opciones_csv: '',
  });

  const atributosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return atributos;
    return atributos.filter(
      (a) =>
        a.codigo_atributo.toLowerCase().includes(q) ||
        a.nombre_atributo.toLowerCase().includes(q) ||
        (a.descripcion || '').toLowerCase().includes(q) ||
        (a.rol_semantico || '').toLowerCase().includes(q),
    );
  }, [atributos, search]);

  const magnitudSeleccionadaModal = useMemo(
    () => magnitudes.find((m) => String(m.id_magnitud) === String(form.id_magnitud)) || null,
    [magnitudes, form.id_magnitud],
  );

  const openCreateModal = () => {
    setEditingAttr(null);
    setForm({
      codigo_atributo: '',
      nombre_atributo: '',
      descripcion: '',
      tipo_control: 'NUMERICO',
      id_magnitud: '',
      unidad_defecto_codigo: '',
      rol_semantico: 'ESTANDAR',
      opciones_csv: '',
    });
    setShowModal(true);
  };

  const openEditModal = (attr: AtributoTecnico) => {
    setEditingAttr(attr);
    const opcionesArr = Array.isArray(attr.opciones_json) ? attr.opciones_json : [];
    setForm({
      codigo_atributo: attr.codigo_atributo,
      nombre_atributo: attr.nombre_atributo,
      descripcion: attr.descripcion || '',
      tipo_control: attr.tipo_control || 'TEXTO',
      id_magnitud: attr.id_magnitud ? String(attr.id_magnitud) : '',
      unidad_defecto_codigo: attr.unidad_defecto_codigo || '',
      rol_semantico: attr.rol_semantico || 'ESTANDAR',
      opciones_csv: opcionesArr.join(', '),
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const opciones_json =
      form.tipo_control === 'SELECT' && form.opciones_csv.trim()
        ? form.opciones_csv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    if (editingAttr) {
      await updateAttrMut.mutateAsync({
        codigo: editingAttr.codigo_atributo,
        payload: {
          nombre_atributo: form.nombre_atributo,
          descripcion: form.descripcion || undefined,
          tipo_control: form.tipo_control,
          id_magnitud:
            form.tipo_control === 'NUMERICO' && form.id_magnitud
              ? Number(form.id_magnitud)
              : null,
          unidad_defecto_codigo:
            form.tipo_control === 'NUMERICO' && form.unidad_defecto_codigo
              ? form.unidad_defecto_codigo
              : null,
          rol_semantico: form.rol_semantico,
          opciones_json,
        },
      });
    } else {
      await createAttrMut.mutateAsync({
        codigo_atributo: form.codigo_atributo,
        nombre_atributo: form.nombre_atributo,
        descripcion: form.descripcion || undefined,
        tipo_control: form.tipo_control,
        id_magnitud:
          form.tipo_control === 'NUMERICO' && form.id_magnitud
            ? Number(form.id_magnitud)
            : undefined,
        unidad_defecto_codigo:
          form.tipo_control === 'NUMERICO' && form.unidad_defecto_codigo
            ? form.unidad_defecto_codigo
            : undefined,
        rol_semantico: form.rol_semantico,
        opciones_json,
      });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      {/* BARRA DE HERRAMIENTAS Y FILTROS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar atributo por nombre, código snake_case o rol semántico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">Todos los Tipos de Dato</option>
              {TIPOS_CONTROL.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.value} — {t.label}
                </option>
              ))}
            </select>

            <select
              value={filtroMagnitud}
              onChange={(e) => setFiltroMagnitud(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">Todas las Magnitudes SI</option>
              {magnitudes.map((m) => (
                <option key={m.codigo_magnitud} value={m.codigo_magnitud}>
                  {m.nombre_magnitud} ({m.codigo_magnitud})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-500">
            Mostrando <strong className="text-slate-900">{atributosFiltrados.length}</strong> atributos
          </span>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Atributo Técnico</span>
          </button>
        </div>
      </div>

      {/* TABLA DEL DICCIONARIO DE ATRIBUTOS TÉCNICOS (JERARQUÍA 2 LÍNEAS SIN TRUNCAMIENTO) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium text-slate-600">
              Cargando diccionario de atributos técnicos...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Atributo Técnico y Código Canónico</th>
                  <th className="py-3.5 px-4">Tipo de Control</th>
                  <th className="py-3.5 px-4">Magnitud SI y Unidad</th>
                  <th className="py-3.5 px-4">Opciones Enum / Rol Semántico</th>
                  <th className="py-3.5 px-4 text-center">Módulos</th>
                  <th className="py-3.5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {atributosFiltrados.map((attr) => {
                  const tipoInfo =
                    TIPOS_CONTROL.find((t) => t.value === attr.tipo_control) || {
                      value: attr.tipo_control,
                      label: attr.tipo_control,
                      badge: 'bg-slate-100 text-slate-700 border-slate-200',
                    };
                  const opciones = Array.isArray(attr.opciones_json) ? attr.opciones_json : [];

                  return (
                    <tr key={attr.id_atributo} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        {/* Línea 1: Nombre legible */}
                        <div className="font-bold text-slate-900 text-sm">
                          {attr.nombre_atributo}
                        </div>
                        {/* Línea 2: Código completo en font-mono text-xs text-slate-500 sin truncar */}
                        <div className="font-mono text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                          <span className="text-slate-700 font-semibold">
                            {attr.codigo_atributo}
                          </span>
                          {attr.descripcion && (
                            <span className="font-sans text-slate-400">• {attr.descripcion}</span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-xs font-bold ${tipoInfo.badge}`}
                        >
                          {attr.tipo_control}
                        </span>
                      </td>

                      <td className="py-4 px-4">
                        {attr.magnitud ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-800">
                              {attr.magnitud.nombre_magnitud}
                            </div>
                            <div className="font-mono text-xs text-blue-600 font-semibold">
                              UoM Default: {attr.unidad_defecto_codigo || attr.magnitud.unidad_base_codigo || 'SI'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Adimensional / N/A</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[11px] font-semibold">
                            <Tag className="h-3 w-3" />
                            {attr.rol_semantico}
                          </span>
                          {opciones.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 max-w-md">
                              {opciones.map((op) => (
                                <span
                                  key={String(op)}
                                  className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-800 font-mono text-[11px] font-medium"
                                >
                                  {String(op)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                          {attr._count?.modulo_atributos ?? 0}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => openEditModal(attr)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Editar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR ATRIBUTO TÉCNICO */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <h4 className="text-base font-bold text-slate-900">
                  {editingAttr
                    ? `Editar Atributo: ${editingAttr.codigo_atributo}`
                    : 'Crear Nuevo Atributo Técnico en Diccionario'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código Canónico (snake_case) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingAttr)}
                    placeholder="Ej: presion_descarga_bar"
                    value={form.codigo_atributo}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        codigo_atributo: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Control *
                  </label>
                  <select
                    value={form.tipo_control}
                    onChange={(e) => setForm({ ...form, tipo_control: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                  >
                    {TIPOS_CONTROL.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.value} — {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Legible del Atributo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Presión Nominal de Descarga"
                  value={form.nombre_atributo}
                  onChange={(e) => setForm({ ...form, nombre_atributo: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              {form.tipo_control === 'NUMERICO' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/60 p-4 rounded-xl border border-blue-200">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Magnitud Física Asociada
                    </label>
                    <select
                      value={form.id_magnitud}
                      onChange={(e) => {
                        const idMag = e.target.value;
                        const magObj = magnitudes.find((m) => String(m.id_magnitud) === idMag);
                        setForm({
                          ...form,
                          id_magnitud: idMag,
                          unidad_defecto_codigo: magObj?.unidad_base_codigo || '',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-blue-300 text-xs font-semibold bg-white"
                    >
                      <option value="">-- Adimensional / Sin Magnitud --</option>
                      {magnitudes.map((m) => (
                        <option key={m.id_magnitud} value={m.id_magnitud}>
                          {m.nombre_magnitud} ({m.codigo_magnitud})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Unidad Canónica por Defecto
                    </label>
                    <select
                      value={form.unidad_defecto_codigo}
                      onChange={(e) =>
                        setForm({ ...form, unidad_defecto_codigo: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-blue-300 font-mono text-xs font-semibold bg-white"
                    >
                      <option value="">-- Seleccionar Unidad --</option>
                      {(magnitudSeleccionadaModal?.unidades_medida || []).map((u) => (
                        <option key={u.codigo} value={u.codigo}>
                          [{u.codigo}] {u.nombre} ({u.simbolo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {form.tipo_control === 'SELECT' && (
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200">
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    Opciones Permitidas (separadas por coma) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: DIESEL, GASOLINA, GAS_NATURAL, GLP"
                    value={form.opciones_csv}
                    onChange={(e) => setForm({ ...form, opciones_csv: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-purple-300 font-mono text-xs bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Rol Semántico
                  </label>
                  <select
                    value={form.rol_semantico}
                    onChange={(e) => setForm({ ...form, rol_semantico: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white"
                  >
                    {ROLES_SEMANTICOS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descripción / Ayuda de Campo
                  </label>
                  <input
                    type="text"
                    placeholder="Opcional..."
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createAttrMut.isPending || updateAttrMut.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  Guardar Atributo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
