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
  ROLES_SEMANTICOS_OPTIONS,
  TIPOS_CONTROL_HUMANOS,
  getModuloBadgeInfo,
  getRolSemanticoHumano,
  getTipoControlHumano,
  parseOpcionesSeguras,
  useAtributosEam,
  useCreateAtributoEam,
  useMagnitudesEam,
  useModulosEam,
  useUpdateAtributoEam,
} from '../index';

export function TabDiccionarioAtributos() {
  const [search, setSearch] = useState('');
  const [filtroModulo, setFiltroModulo] = useState('');
  const [filtroMagnitud, setFiltroMagnitud] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const { data: magnitudes = [] } = useMagnitudesEam();
  const { data: modulos = [] } = useModulosEam();
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
    tipo_control: 'NUMERICO_MAGNITUD',
    id_magnitud: '',
    unidad_defecto_codigo: '',
    rol_semantico: 'ESTANDAR',
    opciones_csv: '',
  });

  const atributosFiltrados = useMemo(() => {
    const q = search.trim().toLowerCase();
    return atributos.filter((a) => {
      // Filtro por Parte / Subsistema
      if (filtroModulo) {
        const pertenece = (a.modulo_atributos || []).some(
          (ma) => ma.modulo?.codigo_modulo === filtroModulo,
        );
        if (!pertenece) return false;
      }

      if (!q) return true;
      const nombresModulos = (a.modulo_atributos || [])
        .map((ma) => `${ma.modulo?.nombre_modulo || ''} ${ma.grupo_visual || ''}`)
        .join(' ')
        .toLowerCase();

      return (
        a.nombre_atributo.toLowerCase().includes(q) ||
        a.codigo_atributo.toLowerCase().includes(q) ||
        (a.descripcion || '').toLowerCase().includes(q) ||
        nombresModulos.includes(q)
      );
    });
  }, [atributos, search, filtroModulo]);

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
      tipo_control: 'NUMERICO_MAGNITUD',
      id_magnitud: '',
      unidad_defecto_codigo: '',
      rol_semantico: 'ESTANDAR',
      opciones_csv: '',
    });
    setShowModal(true);
  };

  const openEditModal = (attr: AtributoTecnico) => {
    setEditingAttr(attr);
    const parsedOps = parseOpcionesSeguras(attr.opciones_json);
    setForm({
      codigo_atributo: attr.codigo_atributo,
      nombre_atributo: attr.nombre_atributo,
      descripcion: attr.descripcion || '',
      tipo_control: attr.tipo_control || 'TEXTO_CORTO',
      id_magnitud: attr.id_magnitud ? String(attr.id_magnitud) : '',
      unidad_defecto_codigo: attr.unidad_defecto_codigo || '',
      rol_semantico: attr.rol_semantico || 'ESTANDAR',
      opciones_csv: parsedOps.map((o) => o.label).filter(Boolean).join(', '),
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const isSelect = form.tipo_control === 'SELECTOR' || form.tipo_control === 'SELECT';
    const isNumMag =
      form.tipo_control === 'NUMERICO_MAGNITUD' || form.tipo_control === 'NUMERICO';

    const opciones_json =
      isSelect && form.opciones_csv.trim()
        ? form.opciones_csv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((item) => ({
              valor: item.toUpperCase().replace(/\s+/g, '_'),
              etiqueta: item,
            }))
        : undefined;

    if (editingAttr) {
      await updateAttrMut.mutateAsync({
        codigo: editingAttr.codigo_atributo,
        payload: {
          nombre_atributo: form.nombre_atributo,
          descripcion: form.descripcion || undefined,
          tipo_control: form.tipo_control,
          id_magnitud: isNumMag && form.id_magnitud ? Number(form.id_magnitud) : null,
          unidad_defecto_codigo:
            isNumMag && form.unidad_defecto_codigo ? form.unidad_defecto_codigo : null,
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
        id_magnitud: isNumMag && form.id_magnitud ? Number(form.id_magnitud) : undefined,
        unidad_defecto_codigo:
          isNumMag && form.unidad_defecto_codigo ? form.unidad_defecto_codigo : undefined,
        rol_semantico: form.rol_semantico,
        opciones_json,
      });
    }
    setShowModal(false);
  };

  return (
    <div className="space-y-5">
      {/* BARRA DE HERRAMIENTAS Y FILTROS CONTEXTUALES */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar campo técnico por nombre, descripción o parte del equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            {/* Filtro por Parte / Subsistema */}
            <select
              value={filtroModulo}
              onChange={(e) => setFiltroModulo(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">Todas las Partes / Subsistemas</option>
              {modulos.map((m) => (
                <option key={m.codigo_modulo} value={m.codigo_modulo}>
                  Parte: {m.nombre_modulo}
                </option>
              ))}
            </select>

            {/* Filtro por Tipo de Dato Humano */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">Todos los Tipos de Dato</option>
              {TIPOS_CONTROL_HUMANOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.iconSymbol} {t.shortLabel}
                </option>
              ))}
            </select>

            {/* Filtro por Magnitud */}
            <select
              value={filtroMagnitud}
              onChange={(e) => setFiltroMagnitud(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white"
            >
              <option value="">Todas las Magnitudes de Medida</option>
              {magnitudes.map((m) => (
                <option key={m.codigo_magnitud} value={m.codigo_magnitud}>
                  {m.nombre_magnitud}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between xl:justify-end gap-3 shrink-0">
          <span className="text-xs font-bold text-slate-500">
            Mostrando <strong className="text-slate-900">{atributosFiltrados.length}</strong> campos
          </span>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Campo Técnico</span>
          </button>
        </div>
      </div>

      {/* TABLA DEL CATÁLOGO DE CAMPOS TÉCNICOS CON CONTEXTO DE PARTE/SUBSISTEMA Y OPCIONES LEGIBLES */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium text-slate-600">
              Cargando catálogo de campos técnicos...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Campo Técnico</th>
                  <th className="py-3.5 px-4">Parte / Subsistema donde se usa</th>
                  <th className="py-3.5 px-4">Tipo de Dato</th>
                  <th className="py-3.5 px-4">Magnitud y Unidad</th>
                  <th className="py-3.5 px-4">Opciones de Lista / Categoría</th>
                  <th className="py-3.5 px-6 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {atributosFiltrados.map((attr) => {
                  const ctrlInfo = getTipoControlHumano(
                    attr.tipo_control,
                    Boolean(attr.id_magnitud || attr.unidad_defecto_codigo),
                  );
                  const opciones = parseOpcionesSeguras(attr.opciones_json);
                  const opcionesVisibles = opciones.slice(0, 4);
                  const opcionesRestantes = opciones.slice(4);
                  const modulosDeAtributo = attr.modulo_atributos || [];

                  return (
                    <tr key={attr.id_atributo} className="hover:bg-slate-50/80 transition-colors">
                      {/* Columna 1: Nombre del Campo */}
                      <td className="py-3.5 px-6">
                        <div className="font-bold text-slate-900 text-sm">
                          {attr.nombre_atributo}
                        </div>
                        {attr.descripcion && (
                          <div className="text-xs text-slate-500 mt-0.5">{attr.descripcion}</div>
                        )}
                      </td>

                      {/* Columna 2: Parte / Subsistema donde se usa (Contexto Inmediato) */}
                      <td className="py-3.5 px-4">
                        {modulosDeAtributo.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {modulosDeAtributo.map((ma, idx) => {
                              const badge = getModuloBadgeInfo(
                                ma.modulo?.codigo_modulo,
                                ma.modulo?.nombre_modulo,
                              );
                              return (
                                <span
                                  key={`${attr.id_atributo}-mod-${ma.modulo?.id_modulo ?? idx}`}
                                  title={
                                    ma.grupo_visual
                                      ? `${badge.fullName} • Sección: ${ma.grupo_visual}`
                                      : badge.fullName
                                  }
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-md border text-xs font-bold ${badge.badgeClass}`}
                                >
                                  {badge.shortName}
                                </span>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Disponible en catálogo</span>
                        )}
                      </td>

                      {/* Columna 3: Tipo de Dato en Lenguaje Humano */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold ${ctrlInfo.badgeClass}`}
                        >
                          <span>{ctrlInfo.iconSymbol}</span>
                          <span>{ctrlInfo.shortLabel}</span>
                        </span>
                      </td>

                      {/* Columna 4: Magnitud y Unidad */}
                      <td className="py-3.5 px-4">
                        {attr.magnitud ? (
                          <div className="space-y-0.5">
                            <div className="text-xs font-bold text-slate-800">
                              {attr.magnitud.nombre_magnitud}
                            </div>
                            <div className="text-xs text-blue-700 font-semibold">
                              Unidad por defecto:{' '}
                              <strong>
                                {attr.unidad_defecto_codigo ||
                                  attr.magnitud.unidad_base_codigo ||
                                  'Estándar'}
                              </strong>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Sin unidad física</span>
                        )}
                      </td>

                      {/* Columna 5: Opciones de Lista (máx 4 chips + badge +N más) y Categoría */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">
                            <Tag className="h-3 w-3" />
                            <span>{getRolSemanticoHumano(attr.rol_semantico)}</span>
                          </span>
                          {opciones.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 max-w-md">
                              {opcionesVisibles.map((op) => (
                                <span
                                  key={`${attr.id_atributo}-${op.key}`}
                                  className="px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-semibold"
                                >
                                  {op.label}
                                </span>
                              ))}
                              {opcionesRestantes.length > 0 && (
                                <span
                                  title={opcionesRestantes.map((o) => o.label).join(' • ')}
                                  className="px-2 py-0.5 rounded-md bg-slate-800 text-white text-[11px] font-bold cursor-help"
                                >
                                  +{opcionesRestantes.length} más
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Columna 6: Editar */}
                      <td className="py-3.5 px-6 text-right">
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

      {/* MODAL CREAR / EDITAR CAMPO TÉCNICO */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                <h4 className="text-base font-bold text-slate-900">
                  {editingAttr
                    ? `Editar Campo Técnico: ${editingAttr.nombre_atributo}`
                    : 'Crear Nuevo Campo Técnico'}
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
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Campo Técnico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Presión Nominal de Descarga"
                  value={form.nombre_atributo}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    const slug = editingAttr
                      ? form.codigo_atributo
                      : nombre
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]+/g, '_')
                          .replace(/^_+|_+$/g, '');
                    setForm({
                      ...form,
                      nombre_atributo: nombre,
                      codigo_atributo: slug,
                    });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Dato *
                  </label>
                  <select
                    value={form.tipo_control}
                    onChange={(e) => setForm({ ...form, tipo_control: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                  >
                    {TIPOS_CONTROL_HUMANOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.fullLabel}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código Identificador *
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
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-slate-50 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {(form.tipo_control === 'NUMERICO_MAGNITUD' ||
                form.tipo_control === 'NUMERICO') && (
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
                      <option value="">-- Sin Magnitud --</option>
                      {magnitudes.map((m) => (
                        <option key={m.id_magnitud} value={m.id_magnitud}>
                          {m.nombre_magnitud}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Unidad de Medida por Defecto
                    </label>
                    <select
                      value={form.unidad_defecto_codigo}
                      onChange={(e) =>
                        setForm({ ...form, unidad_defecto_codigo: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-blue-300 text-xs font-semibold bg-white"
                    >
                      <option value="">-- Seleccionar Unidad --</option>
                      {(magnitudSeleccionadaModal?.unidades_medida || []).map((u) => (
                        <option key={u.codigo} value={u.codigo}>
                          {u.nombre} ({u.simbolo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {(form.tipo_control === 'SELECTOR' || form.tipo_control === 'SELECT') && (
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200">
                  <label className="block text-xs font-bold text-purple-900 mb-1">
                    Opciones de la Lista Desplegable (separadas por coma) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Diésel (ACPM), Gas Natural, Gasolina, Eléctrico"
                    value={form.opciones_csv}
                    onChange={(e) => setForm({ ...form, opciones_csv: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-purple-300 text-xs bg-white"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoría del Campo
                  </label>
                  <select
                    value={form.rol_semantico}
                    onChange={(e) => setForm({ ...form, rol_semantico: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    {ROLES_SEMANTICOS_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descripción / Ayuda para el Usuario
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
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs"
                >
                  Guardar Campo Técnico
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
