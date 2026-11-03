'use client';

import {
  Boxes,
  Check,
  Edit3,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ModuloAtributoItem,
  ModuloTecnico,
  useAsignarAtributoModuloEam,
  useAtributosEam,
  useCreateAtributoEam,
  useCreateModuloEam,
  useDesasignarAtributoModuloEam,
  useMagnitudesEam,
  useModuloDetalleEam,
  useModulosEam,
  useUpdateAtributoModuloEam,
  useUpdateModuloEam,
} from '../index';

export function TabModulosTecnicos() {
  const { data: modulos = [], isLoading } = useModulosEam();
  const [selectedModuloCode, setSelectedModuloCode] = useState<string>('');

  useEffect(() => {
    if (!selectedModuloCode && modulos.length > 0) {
      setSelectedModuloCode(modulos[0].codigo_modulo);
    }
  }, [modulos, selectedModuloCode]);

  const { data: moduloDetalle, isLoading: loadingDetalle } =
    useModuloDetalleEam(selectedModuloCode || null);

  const { data: todosAtributos = [] } = useAtributosEam();
  const { data: magnitudes = [] } = useMagnitudesEam();

  const createModMut = useCreateModuloEam();
  const updateModMut = useUpdateModuloEam();
  const asignarMut = useAsignarAtributoModuloEam();
  const updateFlagMut = useUpdateAtributoModuloEam();
  const desasignarMut = useDesasignarAtributoModuloEam();
  const createAttrMut = useCreateAtributoEam();

  // Modal Crear / Editar Módulo
  const [showModModal, setShowModModal] = useState(false);
  const [editingMod, setEditingMod] = useState<ModuloTecnico | null>(null);
  const [modForm, setModForm] = useState({
    codigo_modulo: '',
    nombre_modulo: '',
    descripcion: '',
    color_ui: '#3B82F6',
  });

  // Modal Asignar Atributo Existente
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    id_atributo: '',
    grupo_visual: 'Identificación',
    orden_visual: '10',
    obligatorio: false,
    es_kpi: false,
    es_filtrable: true,
    visible_en_pdf: true,
  });

  // Modal Creación Rápida "In-Place & Elevate" (Crear en Diccionario + Asignar al Módulo en 1 paso)
  const [showInPlaceModal, setShowInPlaceModal] = useState(false);
  const [inPlaceForm, setInPlaceForm] = useState({
    codigo_atributo: '',
    nombre_atributo: '',
    tipo_control: 'NUMERICO',
    id_magnitud: '',
    unidad_defecto_codigo: '',
    opciones_csv: '',
    grupo_visual: 'Identificación',
    orden_visual: '20',
    obligatorio: false,
    es_kpi: false,
    es_filtrable: true,
    visible_en_pdf: true,
  });

  const gruposVisualesMap = useMemo(() => {
    const map = new Map<string, ModuloAtributoItem[]>();
    const items = moduloDetalle?.modulo_atributos || [];
    for (const item of items) {
      const grp = item.grupo_visual || 'General';
      if (!map.has(grp)) map.set(grp, []);
      map.get(grp)!.push(item);
    }
    return Array.from(map.entries());
  }, [moduloDetalle]);

  const atributosDisponiblesParaAsignar = useMemo(() => {
    const yaAsignados = new Set(
      (moduloDetalle?.modulo_atributos || []).map((ma) => ma.id_atributo),
    );
    return todosAtributos.filter((a) => !yaAsignados.has(a.id_atributo));
  }, [todosAtributos, moduloDetalle]);

  const magnitudInPlaceObj = useMemo(
    () =>
      magnitudes.find((m) => String(m.id_magnitud) === String(inPlaceForm.id_magnitud)) || null,
    [magnitudes, inPlaceForm.id_magnitud],
  );

  const handleToggleFlag = async (
    item: ModuloAtributoItem,
    field: 'obligatorio' | 'es_filtrable' | 'es_kpi' | 'visible_en_pdf',
  ) => {
    if (!selectedModuloCode) return;
    await updateFlagMut.mutateAsync({
      codigoModulo: selectedModuloCode,
      idAtributo: item.id_atributo,
      payload: {
        [field]: !item[field],
      },
    });
  };

  const handleOpenNewMod = () => {
    setEditingMod(null);
    setModForm({
      codigo_modulo: '',
      nombre_modulo: '',
      descripcion: '',
      color_ui: '#3B82F6',
    });
    setShowModModal(true);
  };

  const handleOpenEditMod = (mod: ModuloTecnico) => {
    setEditingMod(mod);
    setModForm({
      codigo_modulo: mod.codigo_modulo,
      nombre_modulo: mod.nombre_modulo,
      descripcion: mod.descripcion || '',
      color_ui: mod.color_ui || '#3B82F6',
    });
    setShowModModal(true);
  };

  const handleSaveMod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMod) {
      await updateModMut.mutateAsync({
        codigo: editingMod.codigo_modulo,
        payload: {
          nombre_modulo: modForm.nombre_modulo,
          descripcion: modForm.descripcion,
          color_ui: modForm.color_ui,
        },
      });
    } else {
      const created = await createModMut.mutateAsync({
        codigo_modulo: modForm.codigo_modulo,
        nombre_modulo: modForm.nombre_modulo,
        descripcion: modForm.descripcion,
        color_ui: modForm.color_ui,
      });
      setSelectedModuloCode(created.codigo_modulo);
    }
    setShowModModal(false);
  };

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuloCode || !assignForm.id_atributo) return;
    await asignarMut.mutateAsync({
      codigoModulo: selectedModuloCode,
      payload: {
        id_atributo: Number(assignForm.id_atributo),
        grupo_visual: assignForm.grupo_visual || 'General',
        orden_visual: Number(assignForm.orden_visual) || 10,
        obligatorio: assignForm.obligatorio,
        es_kpi: assignForm.es_kpi,
        es_filtrable: assignForm.es_filtrable,
        visible_en_pdf: assignForm.visible_en_pdf,
      },
    });
    setShowAssignModal(false);
  };

  const handleSaveInPlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuloCode) return;

    const opciones_json =
      inPlaceForm.tipo_control === 'SELECT' && inPlaceForm.opciones_csv.trim()
        ? inPlaceForm.opciones_csv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

    // 1. Elevar y crear atributo en el Diccionario Global
    const nuevoAtributo = await createAttrMut.mutateAsync({
      codigo_atributo: inPlaceForm.codigo_atributo,
      nombre_atributo: inPlaceForm.nombre_atributo,
      tipo_control: inPlaceForm.tipo_control,
      id_magnitud:
        inPlaceForm.tipo_control === 'NUMERICO' && inPlaceForm.id_magnitud
          ? Number(inPlaceForm.id_magnitud)
          : undefined,
      unidad_defecto_codigo:
        inPlaceForm.tipo_control === 'NUMERICO' && inPlaceForm.unidad_defecto_codigo
          ? inPlaceForm.unidad_defecto_codigo
          : undefined,
      opciones_json,
    });

    // 2. Asignar inmediatamente al Módulo Activo
    await asignarMut.mutateAsync({
      codigoModulo: selectedModuloCode,
      payload: {
        id_atributo: nuevoAtributo.id_atributo,
        grupo_visual: inPlaceForm.grupo_visual || 'General',
        orden_visual: Number(inPlaceForm.orden_visual) || 20,
        obligatorio: inPlaceForm.obligatorio,
        es_kpi: inPlaceForm.es_kpi,
        es_filtrable: inPlaceForm.es_filtrable,
        visible_en_pdf: inPlaceForm.visible_en_pdf,
      },
    });

    setShowInPlaceModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">
          Cargando módulos técnicos componibles...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* COLUMNA IZQUIERDA: LISTA DE MÓDULOS TÉCNICOS COMPONIBLES */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-600" />
              Módulos Técnicos ({modulos.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Sub-sistemas reutilizables entre arquetipos
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNewMod}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nuevo Módulo</span>
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {modulos.map((mod) => {
            const isSelected = mod.codigo_modulo === selectedModuloCode;
            const totalAttrs = mod._count?.modulo_atributos ?? 0;
            return (
              <div
                key={mod.id_modulo}
                onClick={() => setSelectedModuloCode(mod.codigo_modulo)}
                className={`p-5 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: mod.color_ui || '#3B82F6' }}
                    />
                    <span className="text-sm font-bold text-slate-900">{mod.nombre_modulo}</span>
                  </div>
                  <div className="font-mono text-xs text-slate-500">{mod.codigo_modulo}</div>
                  {mod.descripcion && (
                    <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                      {mod.descripcion}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                    {totalAttrs} atributos
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditMod(mod);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Editar módulo"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COLUMNA DERECHA: MATRIZ DE ATRIBUTOS CON SWITCHES INTERACTIVOS EN CALIENTE */}
      <div className="lg:col-span-8 space-y-5">
        {loadingDetalle || !moduloDetalle ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-slate-500">Cargando atributos del módulo...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Cabecera del Módulo Seleccionado */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2.5">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    {moduloDetalle.nombre_modulo}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-xs font-bold">
                    {moduloDetalle.codigo_modulo}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Conmuta en caliente las banderas de obligatoriedad, indexación B-Tree, KPI primario y
                  visibilidad en informe PDF.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAssignForm({
                      id_atributo: atributosDisponiblesParaAsignar[0]?.id_atributo
                        ? String(atributosDisponiblesParaAsignar[0].id_atributo)
                        : '',
                      grupo_visual: gruposVisualesMap[0]?.[0] || 'Identificación',
                      orden_visual: '10',
                      obligatorio: false,
                      es_kpi: false,
                      es_filtrable: true,
                      visible_en_pdf: true,
                    });
                    setShowAssignModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition-colors"
                >
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>Vincular Atributo Existente</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInPlaceForm({
                      codigo_atributo: '',
                      nombre_atributo: '',
                      tipo_control: 'NUMERICO',
                      id_magnitud: '',
                      unidad_defecto_codigo: '',
                      opciones_csv: '',
                      grupo_visual: gruposVisualesMap[0]?.[0] || 'Identificación',
                      orden_visual: '20',
                      obligatorio: false,
                      es_kpi: false,
                      es_filtrable: true,
                      visible_en_pdf: true,
                    });
                    setShowInPlaceModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-md transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>+ Crear y Asignar Atributo Rápido (In-Place)</span>
                </button>
              </div>
            </div>

            {/* Grupos Visuales del Módulo */}
            <div className="p-6 space-y-6">
              {gruposVisualesMap.map(([grupoNombre, items]) => (
                <div
                  key={grupoNombre}
                  className="rounded-xl border border-slate-200 overflow-hidden"
                >
                  <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Grupo Visual: {grupoNombre}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {items.length} atributos
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase">
                          <th className="py-3 px-5">Atributo / Código Canónico</th>
                          <th className="py-3 px-3">Control / UoM</th>
                          <th className="py-3 px-3 text-center">Obligatorio</th>
                          <th className="py-3 px-3 text-center">Filtrable B-Tree</th>
                          <th className="py-3 px-3 text-center">KPI Ficha</th>
                          <th className="py-3 px-3 text-center">Visible PDF</th>
                          <th className="py-3 px-4 text-right">Quitar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {items.map((ma) => {
                          const attr = ma.atributo;
                          return (
                            <tr
                              key={ma.id_modulo_atributo}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="py-3.5 px-5">
                                <div className="font-bold text-slate-900 text-sm">
                                  {attr.nombre_atributo}
                                </div>
                                <div className="font-mono text-xs text-slate-500 mt-0.5">
                                  {attr.codigo_atributo}
                                </div>
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex flex-col gap-1 items-start">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-bold">
                                    {attr.tipo_control}
                                  </span>
                                  {attr.unidad_defecto_codigo && (
                                    <span className="text-[11px] font-mono text-blue-600 font-semibold">
                                      UoM: {attr.unidad_defecto_codigo}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Switch Obligatorio */}
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFlag(ma, 'obligatorio')}
                                  className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                    ma.obligatorio ? 'bg-rose-600' : 'bg-slate-200'
                                  }`}
                                  title="Conmutar Obligatorio"
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                      ma.obligatorio ? 'translate-x-2' : '-translate-x-2'
                                    }`}
                                  />
                                </button>
                              </td>

                              {/* Switch Filtrable B-Tree */}
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFlag(ma, 'es_filtrable')}
                                  className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                    ma.es_filtrable ? 'bg-blue-600' : 'bg-slate-200'
                                  }`}
                                  title="Conmutar Indexación B-Tree"
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                      ma.es_filtrable ? 'translate-x-2' : '-translate-x-2'
                                    }`}
                                  />
                                </button>
                              </td>

                              {/* Switch KPI Ficha */}
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFlag(ma, 'es_kpi')}
                                  className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                    ma.es_kpi ? 'bg-amber-500' : 'bg-slate-200'
                                  }`}
                                  title="Conmutar KPI Destacado"
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                      ma.es_kpi ? 'translate-x-2' : '-translate-x-2'
                                    }`}
                                  />
                                </button>
                              </td>

                              {/* Switch Visible PDF */}
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFlag(ma, 'visible_en_pdf')}
                                  className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                    ma.visible_en_pdf ? 'bg-emerald-600' : 'bg-slate-200'
                                  }`}
                                  title="Conmutar Visible en Ficha / PDF"
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                      ma.visible_en_pdf ? 'translate-x-2' : '-translate-x-2'
                                    }`}
                                  />
                                </button>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (
                                      window.confirm(
                                        `¿Desvincular el atributo "${attr.nombre_atributo}" de este módulo?`,
                                      )
                                    ) {
                                      await desasignarMut.mutateAsync({
                                        codigoModulo: moduloDetalle.codigo_modulo,
                                        idAtributo: attr.id_atributo,
                                      });
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Desvincular atributo"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* MODAL CREAR / EDITAR MÓDULO TÉCNICO */}
      {showModModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                {editingMod ? `Editar Módulo: ${editingMod.codigo_modulo}` : 'Nuevo Módulo Técnico'}
              </h4>
              <button
                type="button"
                onClick={() => setShowModModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveMod} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código del Módulo (snake_case) *
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingMod)}
                  placeholder="Ej: tablero_transferencia_ats"
                  value={modForm.codigo_modulo}
                  onChange={(e) =>
                    setModForm({
                      ...modForm,
                      codigo_modulo: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Módulo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tablero de Transferencia Automática (ATS)"
                  value={modForm.nombre_modulo}
                  onChange={(e) => setModForm({ ...modForm, nombre_modulo: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción Funcional
                </label>
                <textarea
                  rows={2}
                  value={modForm.descripcion}
                  onChange={(e) => setModForm({ ...modForm, descripcion: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Guardar Módulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASIGNAR ATRIBUTO EXISTENTE */}
      {showAssignModal && moduloDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                Vincular Atributo a {moduloDetalle.nombre_modulo}
              </h4>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAssign} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seleccionar Atributo del Diccionario *
                </label>
                <select
                  required
                  value={assignForm.id_atributo}
                  onChange={(e) => setAssignForm({ ...assignForm, id_atributo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="">-- Seleccionar Atributo --</option>
                  {atributosDisponiblesParaAsignar.map((a) => (
                    <option key={a.id_atributo} value={a.id_atributo}>
                      {a.nombre_atributo} ({a.codigo_atributo}) [{a.tipo_control}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grupo Visual en Formulario *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Identificación, Desempeño..."
                    value={assignForm.grupo_visual}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, grupo_visual: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Orden Visual
                  </label>
                  <input
                    type="number"
                    value={assignForm.orden_visual}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, orden_visual: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignForm.obligatorio}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, obligatorio: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Obligatorio en Alta</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignForm.es_filtrable}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, es_filtrable: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Indexar en B-Tree</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignForm.es_kpi}
                    onChange={(e) => setAssignForm({ ...assignForm, es_kpi: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>KPI Primario en Ficha</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignForm.visible_en_pdf}
                    onChange={(e) =>
                      setAssignForm({ ...assignForm, visible_en_pdf: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Visible en PDF</span>
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={asignarMut.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Vincular al Módulo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREACIÓN RÁPIDA "IN-PLACE & ELEVATE" */}
      {showInPlaceModal && moduloDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <div>
                  <h4 className="text-sm font-bold">
                    Creación Rápida &quot;In-Place &amp; Elevate&quot;
                  </h4>
                  <p className="text-[11px] text-blue-100">
                    Crea el atributo en el Diccionario Global y lo asigna a{' '}
                    <strong>{moduloDetalle.nombre_modulo}</strong> en un solo paso
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInPlaceModal(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInPlace} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código Canónico (snake_case) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: temperatura_devanado_c"
                    value={inPlaceForm.codigo_atributo}
                    onChange={(e) =>
                      setInPlaceForm({
                        ...inPlaceForm,
                        codigo_atributo: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Control *
                  </label>
                  <select
                    value={inPlaceForm.tipo_control}
                    onChange={(e) =>
                      setInPlaceForm({ ...inPlaceForm, tipo_control: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                  >
                    <option value="NUMERICO">NUMERICO (Con UoM)</option>
                    <option value="TEXTO">TEXTO (Alfanumérico)</option>
                    <option value="SELECT">SELECT (Lista de Opciones)</option>
                    <option value="BOOLEANO">BOOLEANO (Sí / No)</option>
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
                  placeholder="Ej: Temperatura Máxima de Devanado"
                  value={inPlaceForm.nombre_atributo}
                  onChange={(e) =>
                    setInPlaceForm({ ...inPlaceForm, nombre_atributo: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              {inPlaceForm.tipo_control === 'NUMERICO' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/70 p-4 rounded-xl border border-blue-200">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Magnitud Física
                    </label>
                    <select
                      value={inPlaceForm.id_magnitud}
                      onChange={(e) => {
                        const idMag = e.target.value;
                        const magObj = magnitudes.find((m) => String(m.id_magnitud) === idMag);
                        setInPlaceForm({
                          ...inPlaceForm,
                          id_magnitud: idMag,
                          unidad_defecto_codigo: magObj?.unidad_base_codigo || '',
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-blue-300 text-xs font-semibold bg-white"
                    >
                      <option value="">-- Sin Magnitud --</option>
                      {magnitudes.map((m) => (
                        <option key={m.id_magnitud} value={m.id_magnitud}>
                          {m.nombre_magnitud} ({m.codigo_magnitud})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Unidad Canónica Default
                    </label>
                    <select
                      value={inPlaceForm.unidad_defecto_codigo}
                      onChange={(e) =>
                        setInPlaceForm({ ...inPlaceForm, unidad_defecto_codigo: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-blue-300 font-mono text-xs font-semibold bg-white"
                    >
                      <option value="">-- Seleccionar UoM --</option>
                      {(magnitudInPlaceObj?.unidades_medida || []).map((u) => (
                        <option key={u.codigo} value={u.codigo}>
                          [{u.codigo}] {u.nombre} ({u.simbolo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {inPlaceForm.tipo_control === 'SELECT' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Opciones separadas por coma *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: IP23, IP54, IP55, IP68"
                    value={inPlaceForm.opciones_csv}
                    onChange={(e) =>
                      setInPlaceForm({ ...inPlaceForm, opciones_csv: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Grupo Visual en {moduloDetalle.nombre_modulo} *
                  </label>
                  <input
                    type="text"
                    required
                    value={inPlaceForm.grupo_visual}
                    onChange={(e) =>
                      setInPlaceForm({ ...inPlaceForm, grupo_visual: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                  />
                </div>
                <div className="flex items-end pb-1 gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={inPlaceForm.obligatorio}
                      onChange={(e) =>
                        setInPlaceForm({ ...inPlaceForm, obligatorio: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Obligatorio</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={inPlaceForm.es_kpi}
                      onChange={(e) =>
                        setInPlaceForm({ ...inPlaceForm, es_kpi: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span>KPI Primario</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInPlaceModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createAttrMut.isPending || asignarMut.isPending}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-md"
                >
                  <Check className="h-4 w-4" />
                  <span>Crear en Diccionario y Asignar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
