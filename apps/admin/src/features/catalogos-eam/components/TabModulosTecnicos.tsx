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
  TIPOS_CONTROL_HUMANOS,
  getTipoControlHumano,
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

  // Modal Crear / Editar Parte o Subsistema
  const [showModModal, setShowModModal] = useState(false);
  const [editingMod, setEditingMod] = useState<ModuloTecnico | null>(null);
  const [modForm, setModForm] = useState({
    codigo_modulo: '',
    nombre_modulo: '',
    descripcion: '',
    color_ui: '#3B82F6',
  });

  // Modal Asignar Campo Existente
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

  // Modal Crear y Asignar Nuevo Campo en un solo paso
  const [showInPlaceModal, setShowInPlaceModal] = useState(false);
  const [inPlaceForm, setInPlaceForm] = useState({
    codigo_atributo: '',
    nombre_atributo: '',
    tipo_control: 'NUMERICO_MAGNITUD',
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

    const isSelect =
      inPlaceForm.tipo_control === 'SELECTOR' || inPlaceForm.tipo_control === 'SELECT';
    const isNumMag = inPlaceForm.tipo_control === 'NUMERICO_MAGNITUD';

    const opciones_json =
      isSelect && inPlaceForm.opciones_csv.trim()
        ? inPlaceForm.opciones_csv
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .map((item) => ({
              valor: item.toUpperCase().replace(/\s+/g, '_'),
              etiqueta: item,
            }))
        : undefined;

    // 1. Crear el campo técnico en el Catálogo General
    const nuevoAtributo = await createAttrMut.mutateAsync({
      codigo_atributo: inPlaceForm.codigo_atributo,
      nombre_atributo: inPlaceForm.nombre_atributo,
      tipo_control: inPlaceForm.tipo_control,
      id_magnitud:
        isNumMag && inPlaceForm.id_magnitud ? Number(inPlaceForm.id_magnitud) : undefined,
      unidad_defecto_codigo:
        isNumMag && inPlaceForm.unidad_defecto_codigo
          ? inPlaceForm.unidad_defecto_codigo
          : undefined,
      opciones_json,
    });

    // 2. Asignar inmediatamente a la Parte / Subsistema activo
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
          Cargando Partes y Subsistemas...
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* COLUMNA IZQUIERDA: LISTA DE PARTES Y SUBSISTEMAS */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="h-5 w-5 text-blue-600" />
              <span>Partes y Subsistemas ({modulos.length})</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Secciones reutilizables que componen las fichas de los equipos
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenNewMod}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nueva Parte</span>
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
                    <span className="text-sm font-bold text-slate-900">
                      {mod.nombre_modulo}
                    </span>
                  </div>
                  {mod.descripcion && (
                    <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
                      {mod.descripcion}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold">
                    {totalAttrs} campos
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditMod(mod);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Editar parte o subsistema"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COLUMNA DERECHA: CAMPOS TÉCNICOS DE LA PARTE Y CONTROLES EN VIVO */}
      <div className="lg:col-span-8 space-y-5">
        {loadingDetalle || !moduloDetalle ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
            <p className="text-sm text-slate-500">Cargando campos de la parte...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            {/* Cabecera de la Parte Seleccionada */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center flex-wrap gap-2.5">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    {moduloDetalle.nombre_modulo}
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Elige qué campos son obligatorios al registrar el equipo, cuáles sirven para filtrar en el directorio, cuáles se destacan en las tarjetas y cuáles se imprimen en el PDF.
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors"
                >
                  <Plus className="h-4 w-4 text-blue-600" />
                  <span>Agregar Campo Existente</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInPlaceForm({
                      codigo_atributo: '',
                      nombre_atributo: '',
                      tipo_control: 'NUMERICO_MAGNITUD',
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>+ Crear Nuevo Campo aquí</span>
                </button>
              </div>
            </div>

            {/* Secciones Visuales de la Parte */}
            <div className="p-6 space-y-6">
              {gruposVisualesMap.map(([grupoNombre, items]) => (
                <div
                  key={grupoNombre}
                  className="rounded-xl border border-slate-200 overflow-hidden"
                >
                  <div className="px-5 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                      Sección de Ficha: {grupoNombre}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {items.length} campos
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase">
                          <th className="py-3 px-5">Campo Técnico</th>
                          <th className="py-3 px-3">Tipo de Dato y Unidad</th>
                          <th className="py-3 px-3 text-center">Obligatorio</th>
                          <th className="py-3 px-3 text-center">Permitir Filtrar</th>
                          <th className="py-3 px-3 text-center">Destacar en Tarjeta (KPI)</th>
                          <th className="py-3 px-3 text-center">Imprimir en PDF</th>
                          <th className="py-3 px-4 text-right">Quitar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {items.map((ma) => {
                          const attr = ma.atributo;
                          const ctrlInfo = getTipoControlHumano(
                            attr.tipo_control,
                            Boolean(attr.id_magnitud || attr.unidad_defecto_codigo),
                          );

                          return (
                            <tr
                              key={ma.id_modulo_atributo}
                              className="hover:bg-slate-50/80 transition-colors"
                            >
                              <td className="py-3.5 px-5">
                                <div className="font-bold text-slate-900 text-sm">
                                  {attr.nombre_atributo}
                                </div>
                                {attr.descripcion && (
                                  <div className="text-xs text-slate-500 mt-0.5">
                                    {attr.descripcion}
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-3">
                                <div className="flex flex-col gap-1 items-start">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold ${ctrlInfo.badgeClass}`}
                                  >
                                    <span>{ctrlInfo.iconSymbol}</span>
                                    <span>{ctrlInfo.shortLabel}</span>
                                  </span>
                                  {attr.unidad_defecto_codigo && (
                                    <span className="text-[11px] text-blue-700 font-semibold">
                                      Unidad: {attr.unidad_defecto_codigo}
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
                                  title="Exigir este dato obligatoriamente al registrar el equipo"
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                      ma.obligatorio ? 'translate-x-2' : '-translate-x-2'
                                    }`}
                                  />
                                </button>
                              </td>

                              {/* Switch Permitir Filtrar */}
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFlag(ma, 'es_filtrable')}
                                  className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                    ma.es_filtrable ? 'bg-blue-600' : 'bg-slate-200'
                                  }`}
                                  title="Permitir buscar y filtrar equipos por este campo en el directorio"
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                      ma.es_filtrable ? 'translate-x-2' : '-translate-x-2'
                                    }`}
                                  />
                                </button>
                              </td>

                              {/* Switch Destacar en Tarjeta (KPI) */}
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFlag(ma, 'es_kpi')}
                                  className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                    ma.es_kpi ? 'bg-amber-500' : 'bg-slate-200'
                                  }`}
                                  title="Destacar como dato principal en la tarjeta del equipo y cabecera del PDF"
                                >
                                  <span
                                    className={`w-3.5 h-3.5 rounded-full bg-white shadow transform transition-transform ${
                                      ma.es_kpi ? 'translate-x-2' : '-translate-x-2'
                                    }`}
                                  />
                                </button>
                              </td>

                              {/* Switch Imprimir en PDF */}
                              <td className="py-3.5 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleFlag(ma, 'visible_en_pdf')}
                                  className={`inline-flex items-center justify-center w-9 h-5 rounded-full transition-colors ${
                                    ma.visible_en_pdf ? 'bg-emerald-600' : 'bg-slate-200'
                                  }`}
                                  title="Incluir este campo en la placa técnica del informe PDF"
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
                                        `¿Quitar el campo "${attr.nombre_atributo}" de esta parte?`,
                                      )
                                    ) {
                                      await desasignarMut.mutateAsync({
                                        codigoModulo: moduloDetalle.codigo_modulo,
                                        idAtributo: attr.id_atributo,
                                      });
                                    }
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Quitar campo de esta parte"
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

      {/* MODAL CREAR / EDITAR PARTE O SUBSISTEMA */}
      {showModModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                {editingMod ? `Editar Parte: ${editingMod.nombre_modulo}` : 'Nueva Parte o Subsistema'}
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
                  Nombre de la Parte o Subsistema *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tablero de Transferencia Automática (ATS)"
                  value={modForm.nombre_modulo}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    const slug = editingMod
                      ? modForm.codigo_modulo
                      : nombre
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]+/g, '_')
                          .replace(/^_+|_+$/g, '');
                    setModForm({
                      ...modForm,
                      nombre_modulo: nombre,
                      codigo_modulo: slug,
                    });
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código Identificador *
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
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-slate-50 disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción Breve
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
                  Guardar Parte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR CAMPO EXISTENTE */}
      {showAssignModal && moduloDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                Agregar Campo Existente a {moduloDetalle.nombre_modulo}
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
                  Seleccionar Campo del Catálogo *
                </label>
                <select
                  required
                  value={assignForm.id_atributo}
                  onChange={(e) => setAssignForm({ ...assignForm, id_atributo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                >
                  <option value="">-- Seleccionar Campo Técnico --</option>
                  {atributosDisponiblesParaAsignar.map((a) => {
                    const info = getTipoControlHumano(a.tipo_control, Boolean(a.id_magnitud));
                    return (
                      <option key={a.id_atributo} value={a.id_atributo}>
                        {a.nombre_atributo} ({info.shortLabel})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sección en el Formulario *
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
                    Orden de Aparición
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
                  <span>Obligatorio al Registrar</span>
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
                  <span>Permitir Filtrar en Directorio</span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignForm.es_kpi}
                    onChange={(e) => setAssignForm({ ...assignForm, es_kpi: e.target.checked })}
                    className="rounded text-blue-600"
                  />
                  <span>Destacar en Tarjeta (KPI)</span>
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
                  <span>Imprimir en PDF</span>
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
                  Agregar a la Parte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVO CAMPO Y ASIGNAR EN UN PASO */}
      {showInPlaceModal && moduloDetalle && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <div>
                  <h4 className="text-sm font-bold">
                    Crear Nuevo Campo Técnico para {moduloDetalle.nombre_modulo}
                  </h4>
                  <p className="text-[11px] text-blue-100">
                    Se guardará en el Catálogo General y quedará asignado a esta parte de inmediato.
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
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Campo Técnico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Temperatura Máxima de Devanado"
                  value={inPlaceForm.nombre_atributo}
                  onChange={(e) => {
                    const nombre = e.target.value;
                    const slug = nombre
                      .toLowerCase()
                      .normalize('NFD')
                      .replace(/[\u0300-\u036f]/g, '')
                      .replace(/[^a-z0-9]+/g, '_')
                      .replace(/^_+|_+$/g, '');
                    setInPlaceForm({
                      ...inPlaceForm,
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
                    value={inPlaceForm.tipo_control}
                    onChange={(e) =>
                      setInPlaceForm({ ...inPlaceForm, tipo_control: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                  >
                    {TIPOS_CONTROL_HUMANOS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.iconSymbol} {t.shortLabel}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código Identificador (Automático) *
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
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-slate-50"
                  />
                </div>
              </div>

              {inPlaceForm.tipo_control === 'NUMERICO_MAGNITUD' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-blue-50/70 p-4 rounded-xl border border-blue-200">
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Magnitud de Medida
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
                      <option value="">-- Seleccionar Magnitud --</option>
                      {magnitudes.map((m) => (
                        <option key={m.id_magnitud} value={m.id_magnitud}>
                          {m.nombre_magnitud}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-blue-900 mb-1">
                      Unidad por Defecto
                    </label>
                    <select
                      value={inPlaceForm.unidad_defecto_codigo}
                      onChange={(e) =>
                        setInPlaceForm({ ...inPlaceForm, unidad_defecto_codigo: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg border border-blue-300 text-xs font-semibold bg-white"
                    >
                      <option value="">-- Seleccionar Unidad --</option>
                      {(magnitudInPlaceObj?.unidades_medida || []).map((u) => (
                        <option key={u.codigo} value={u.codigo}>
                          {u.nombre} ({u.simbolo})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {(inPlaceForm.tipo_control === 'SELECTOR' ||
                inPlaceForm.tipo_control === 'SELECT') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Opciones de la Lista (separadas por coma) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: IP23, IP54, IP55, IP68"
                    value={inPlaceForm.opciones_csv}
                    onChange={(e) =>
                      setInPlaceForm({ ...inPlaceForm, opciones_csv: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sección en {moduloDetalle.nombre_modulo} *
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
                    <span>Destacar (KPI)</span>
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
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold shadow-sm"
                >
                  <Check className="h-4 w-4" />
                  <span>Guardar y Asignar Campo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
