'use client';

import {
  CalendarClock,
  CheckCircle2,
  Cpu,
  Eye,
  Layers,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  DynamicEquipmentFormPreview,
  TIPOS_CONTROL_HUMANOS,
  getCriterioIntervaloHumano,
  getModuloBadgeInfo,
  useArquetipoEsquemaEam,
  useArquetiposEam,
  useAsignarAtributoModuloEam,
  useCreateArquetipoEam,
  useCreateAtributoEam,
  useCreatePlanArquetipoEam,
  useDeletePlanArquetipoEam,
  useDesvincularModuloArquetipoEam,
  useMagnitudesEam,
  useModelosOemEam,
  useModulosEam,
  useResumenEjecutivoEam,
  useVincularModuloArquetipoEam,
} from '../index';

export function TabArquetiposEquipo() {
  const { data: arquetiposRaw = [], isLoading } = useArquetiposEam();
  const { data: modulosDisponibles = [] } = useModulosEam();
  const { data: resumen } = useResumenEjecutivoEam();
  const { data: magnitudes = [] } = useMagnitudesEam();
  const { data: modelosOem = [] } = useModelosOemEam();

  // Ordenar siempre por cantidad de equipos activos descendente:
  // 1° Generador Eléctrico (259), 2° Bomba Hidráulica (203), 3° Motor Industrial (2), 4° Compresor de Aire Industrial (1)
  const arquetipos = useMemo(() => {
    return [...arquetiposRaw].sort((a, b) => {
      const actA = a.equipos_activos ?? a._count?.equipos ?? 0;
      const actB = b.equipos_activos ?? b._count?.equipos ?? 0;
      if (actB !== actA) return actB - actA;
      return (a.id_tipo_equipo || 0) - (b.id_tipo_equipo || 0);
    });
  }, [arquetiposRaw]);

  const [selectedArqId, setSelectedArqId] = useState<number | null>(null);
  const [showPreviewPanel, setShowPreviewPanel] = useState<boolean>(true);

  useEffect(() => {
    if (!selectedArqId && arquetipos.length > 0) {
      setSelectedArqId(arquetipos[0].id_tipo_equipo);
    }
  }, [arquetipos, selectedArqId]);

  const selectedArquetipo = useMemo(
    () => arquetipos.find((a) => a.id_tipo_equipo === selectedArqId) || arquetipos[0] || null,
    [arquetipos, selectedArqId],
  );

  const { data: esquemaVivo, isLoading: loadingEsquema } = useArquetipoEsquemaEam(
    selectedArquetipo?.id_tipo_equipo || null,
  );

  const createArqMut = useCreateArquetipoEam();
  const vincularModMut = useVincularModuloArquetipoEam();
  const desvincularModMut = useDesvincularModuloArquetipoEam();
  const createPlanMut = useCreatePlanArquetipoEam();
  const deletePlanMut = useDeletePlanArquetipoEam();
  const createAttrMut = useCreateAtributoEam();
  const asignarAttrMut = useAsignarAtributoModuloEam();

  // Modales
  const [showNewArqModal, setShowNewArqModal] = useState(false);
  const [arqForm, setArqForm] = useState({
    codigo_tipo: '',
    nombre_tipo: '',
    categoria: 'ENERGIA',
    descripcion: '',
    requiere_horometro: true,
  });

  const [showLinkModModal, setShowLinkModModal] = useState(false);
  const [linkModId, setLinkModId] = useState<string>('');
  const [linkModObligatorio, setLinkModObligatorio] = useState<boolean>(true);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    id_tipo_servicio: '',
    nombre_plan: '',
    frecuencia_dias: '90',
    frecuencia_uso: '250',
    criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
  });

  // Modal Creación Rápida de Campo Técnico desde el Tipo de Equipo
  const [showInPlaceModal, setShowInPlaceModal] = useState(false);
  const [inPlaceForm, setInPlaceForm] = useState({
    codigo_modulo: '',
    codigo_atributo: '',
    nombre_atributo: '',
    tipo_control: 'NUMERICO_MAGNITUD',
    id_magnitud: '',
    unidad_defecto_codigo: '',
    grupo_visual: 'General',
    obligatorio: true,
  });

  const tiposServicioPreventivos = resumen?.tipos_servicio_preventivos || [];

  const handleSaveNewArq = async (e: React.FormEvent) => {
    e.preventDefault();
    const created = await createArqMut.mutateAsync(arqForm);
    setSelectedArqId(created.id_tipo_equipo);
    setShowNewArqModal(false);
  };

  const handleLinkModulo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArquetipo || !linkModId) return;
    await vincularModMut.mutateAsync({
      idTipoEquipo: selectedArquetipo.id_tipo_equipo,
      payload: {
        id_modulo: Number(linkModId),
        obligatorio: linkModObligatorio,
      },
    });
    setShowLinkModModal(false);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArquetipo || !planForm.id_tipo_servicio) return;
    await createPlanMut.mutateAsync({
      idTipoEquipo: selectedArquetipo.id_tipo_equipo,
      payload: {
        id_tipo_servicio: Number(planForm.id_tipo_servicio),
        nombre_plan: planForm.nombre_plan,
        frecuencia_dias: Number(planForm.frecuencia_dias) || 90,
        frecuencia_uso: Number(planForm.frecuencia_uso) || 250,
        criterio_intervalo: planForm.criterio_intervalo,
      },
    });
    setShowPlanModal(false);
  };

  const handleSaveInPlaceFromArq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inPlaceForm.codigo_modulo) return;
    const isNumMag = inPlaceForm.tipo_control === 'NUMERICO_MAGNITUD';
    const attr = await createAttrMut.mutateAsync({
      codigo_atributo: inPlaceForm.codigo_atributo,
      nombre_atributo: inPlaceForm.nombre_atributo,
      tipo_control: inPlaceForm.tipo_control,
      id_magnitud: isNumMag && inPlaceForm.id_magnitud ? Number(inPlaceForm.id_magnitud) : undefined,
      unidad_defecto_codigo:
        isNumMag && inPlaceForm.unidad_defecto_codigo
          ? inPlaceForm.unidad_defecto_codigo
          : undefined,
    });

    await asignarAttrMut.mutateAsync({
      codigoModulo: inPlaceForm.codigo_modulo,
      payload: {
        id_atributo: attr.id_atributo,
        grupo_visual: inPlaceForm.grupo_visual || 'General',
        obligatorio: inPlaceForm.obligatorio,
        es_filtrable: true,
        visible_en_pdf: true,
      },
    });
    setShowInPlaceModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Cargando Tipos de Equipo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SELECTOR DE TIPOS DE EQUIPO ORDENADOS POR RELEVANCIA OPERATIVA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              <span>Tipos de Equipo ({arquetipos.length} Clases)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Selecciona un tipo de equipo para configurar sus partes, planes preventivos y probar su ficha técnica en vivo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowPreviewPanel((prev) => !prev)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                showPreviewPanel
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>
                {showPreviewPanel
                  ? 'Ocultar Simulador de Ficha y PDF'
                  : 'Ver Simulador de Ficha y PDF'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewArqModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Tipo de Equipo</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {arquetipos.map((arq) => {
            const isSelected = selectedArquetipo?.id_tipo_equipo === arq.id_tipo_equipo;
            const activos = arq.equipos_activos ?? arq._count.equipos;
            const codigoLimpio = arq.codigo_corto || arq.codigo_tipo;

            return (
              <div
                key={arq.id_tipo_equipo}
                onClick={() => setSelectedArqId(arq.id_tipo_equipo)}
                className={`rounded-2xl border p-4 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-2xs'
                }`}
              >
                <div className="space-y-2">
                  {/* Línea 1: Nombre en Title Case + Horómetro */}
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                      {arq.nombre_canonico || arq.nombre_tipo}
                    </h4>
                    {arq.requiere_horometro && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold shrink-0">
                        Horómetro
                      </span>
                    )}
                  </div>
                  {/* Línea 2: 1 solo código limpio */}
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-xs font-bold">
                      Código: {codigoLimpio}
                    </span>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-blue-700 text-sm">{activos}</span>{' '}
                    <span className="text-slate-600 font-medium">equipos activos</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <span>{arq.tipo_equipo_modulos.length} partes</span>
                    <span>•</span>
                    <span>{arq.tipo_equipo_planes.length} planes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 1° PRIORIDAD VISUAL: CONFIGURACIÓN DE PARTES Y PLANES PREVENTIVOS DEL TIPO DE EQUIPO */}
      {selectedArquetipo && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SECCIÓN A: PARTES Y SUBSISTEMAS QUE COMPONEN ESTE EQUIPO */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  <span>Partes y Subsistemas del Equipo</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Secciones técnicas que integran la ficha de{' '}
                  <strong>{selectedArquetipo.nombre_canonico || selectedArquetipo.nombre_tipo}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const primerMod =
                      selectedArquetipo.tipo_equipo_modulos[0]?.modulo.codigo_modulo || '';
                    setInPlaceForm({
                      ...inPlaceForm,
                      codigo_modulo: primerMod,
                      codigo_atributo: '',
                      nombre_atributo: '',
                    });
                    setShowInPlaceModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>+ Nuevo Campo Rápido</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLinkModId(
                      modulosDisponibles[0]?.id_modulo
                        ? String(modulosDisponibles[0].id_modulo)
                        : '',
                    );
                    setLinkModObligatorio(true);
                    setShowLinkModModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Agregar Parte</span>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-3.5">
              {selectedArquetipo.tipo_equipo_modulos.map((tem) => {
                const mod = tem.modulo;
                const countAttrs = mod._count?.modulo_atributos ?? 0;
                const badgeInfo = getModuloBadgeInfo(mod.codigo_modulo, mod.nombre_modulo);
                return (
                  <div
                    key={tem.id_tipo_equipo_modulo}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 bg-slate-50/40 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {mod.nombre_modulo}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                            tem.obligatorio
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {tem.obligatorio ? 'Parte Principal (Obligatoria)' : 'Parte Opcional'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeInfo.badgeClass}`}
                        >
                          {countAttrs} campos técnicos en ficha
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          window.confirm(
                            `¿Quitar la parte "${mod.nombre_modulo}" de este tipo de equipo?`,
                          )
                        ) {
                          await desvincularModMut.mutateAsync({
                            idTipoEquipo: selectedArquetipo.id_tipo_equipo,
                            idModulo: mod.id_modulo,
                          });
                        }
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Quitar parte de este tipo de equipo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN B: PLANES PREVENTIVOS BASE DEL TIPO DE EQUIPO */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-emerald-600" />
                  <span>Planes de Mantenimiento Preventivo</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Frecuencias recomendadas por calendario (días) y horas de uso
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const firstSrv = tiposServicioPreventivos[0];
                  setPlanForm({
                    id_tipo_servicio: firstSrv ? String(firstSrv.id_tipo_servicio) : '',
                    nombre_plan: firstSrv ? `Plan Preventivo ${firstSrv.nombre_tipo}` : '',
                    frecuencia_dias: '90',
                    frecuencia_uso: '250',
                    criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
                  });
                  setShowPlanModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Plan Preventivo</span>
              </button>
            </div>

            <div className="p-5 space-y-3">
              {selectedArquetipo.tipo_equipo_planes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No hay planes preventivos registrados para este tipo de equipo.
                </div>
              ) : (
                selectedArquetipo.tipo_equipo_planes.map((plan) => (
                  <div
                    key={plan.id_plan}
                    className="p-4 rounded-xl border border-slate-200 bg-white flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-sm font-bold text-slate-900">
                          {plan.nombre_plan}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          {plan.tipo_servicio?.nombre_tipo ||
                            plan.tipo_servicio?.codigo_tipo ||
                            `Servicio #${plan.id_tipo_servicio}`}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2.5 pt-0.5">
                        <span className="font-bold text-blue-700">
                          Cada {plan.frecuencia_dias ?? 90} días
                        </span>
                        <span>•</span>
                        <span className="font-bold text-amber-700">
                          Cada {Number(plan.frecuencia_uso ?? 250)} horas
                        </span>
                        <span>•</span>
                        <span className="text-slate-600 font-medium">
                          {getCriterioIntervaloHumano(plan.criterio_intervalo)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm(`¿Eliminar el plan "${plan.nombre_plan}"?`)) {
                          await deletePlanMut.mutateAsync({
                            idTipoEquipo: selectedArquetipo.id_tipo_equipo,
                            idPlan: plan.id_plan,
                          });
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Eliminar plan"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2° DEBAJO DE PARTES Y PLANES: SIMULADOR INTERACTIVO EN VIVO (FORMULARIO Y PLACA TÉCNICA PDF) */}
      {showPreviewPanel && selectedArquetipo && (
        <div>
          {loadingEsquema || !esquemaVivo ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mb-2" />
              <p className="text-xs font-medium text-slate-500">
                Preparando simulador de formulario y placa técnica...
              </p>
            </div>
          ) : (
            <DynamicEquipmentFormPreview
              esquema={esquemaVivo}
              modelosOem={modelosOem}
              magnitudes={magnitudes}
            />
          )}
        </div>
      )}

      {/* MODAL NUEVO TIPO DE EQUIPO */}
      {showNewArqModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">Crear Nuevo Tipo de Equipo</h4>
              <button
                type="button"
                onClick={() => setShowNewArqModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveNewArq} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Código Corto Identificador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: CHILLER"
                  value={arqForm.codigo_tipo}
                  onChange={(e) =>
                    setArqForm({ ...arqForm, codigo_tipo: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Tipo de Equipo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Unidad Enfriadora de Agua (Chiller)"
                  value={arqForm.nombre_tipo}
                  onChange={(e) => setArqForm({ ...arqForm, nombre_tipo: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  value={arqForm.categoria}
                  onChange={(e) => setArqForm({ ...arqForm, categoria: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="ENERGIA">Generación de Energía</option>
                  <option value="HIDRAULICA">Bombeo e Hidráulica</option>
                  <option value="COMPRESION">Aire Comprimido y Neumática</option>
                  <option value="CLIMATIZACION">Climatización y Refrigeración</option>
                  <option value="OTRO">Otra Maquinaria Industrial</option>
                </select>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewArqModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Guardar Tipo de Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR PARTE / SUBSISTEMA */}
      {showLinkModModal && selectedArquetipo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                Agregar Parte a {selectedArquetipo.nombre_canonico || selectedArquetipo.nombre_tipo}
              </h4>
              <button
                type="button"
                onClick={() => setShowLinkModModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleLinkModulo} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Seleccionar Parte / Subsistema *
                </label>
                <select
                  required
                  value={linkModId}
                  onChange={(e) => setLinkModId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                >
                  {modulosDisponibles.map((m) => (
                    <option key={m.id_modulo} value={m.id_modulo}>
                      {m.nombre_modulo}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={linkModObligatorio}
                    onChange={(e) => setLinkModObligatorio(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <span>Es una parte principal obligatoria en este tipo de equipo</span>
                </label>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowLinkModModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Agregar Parte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AGREGAR PLAN PREVENTIVO */}
      {showPlanModal && selectedArquetipo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                Configurar Plan Preventivo
              </h4>
              <button
                type="button"
                onClick={() => setShowPlanModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSavePlan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tipo de Servicio Preventivo *
                </label>
                <select
                  required
                  value={planForm.id_tipo_servicio}
                  onChange={(e) => {
                    const idSrv = e.target.value;
                    const srv = tiposServicioPreventivos.find(
                      (s) => String(s.id_tipo_servicio) === idSrv,
                    );
                    setPlanForm({
                      ...planForm,
                      id_tipo_servicio: idSrv,
                      nombre_plan: srv ? `Plan Preventivo ${srv.nombre_tipo}` : planForm.nombre_plan,
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                >
                  {tiposServicioPreventivos.map((s) => (
                    <option key={s.id_tipo_servicio} value={s.id_tipo_servicio}>
                      {s.nombre_tipo} ({s.codigo_tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Plan Preventivo *
                </label>
                <input
                  type="text"
                  required
                  value={planForm.nombre_plan}
                  onChange={(e) => setPlanForm({ ...planForm, nombre_plan: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cada cuántos Días *
                  </label>
                  <input
                    type="number"
                    required
                    value={planForm.frecuencia_dias}
                    onChange={(e) => setPlanForm({ ...planForm, frecuencia_dias: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Cada cuántas Horas de Uso *
                  </label>
                  <input
                    type="number"
                    required
                    value={planForm.frecuencia_uso}
                    onChange={(e) => setPlanForm({ ...planForm, frecuencia_uso: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Regla de Activación del Mantenimiento
                </label>
                <select
                  value={planForm.criterio_intervalo}
                  onChange={(e) =>
                    setPlanForm({ ...planForm, criterio_intervalo: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                >
                  <option value="LO_QUE_OCURRA_PRIMERO">
                    Lo que ocurra primero (Días u Horas)
                  </option>
                  <option value="DIAS">Solo por Calendario (Días)</option>
                  <option value="HORAS">Solo por Uso (Horas de Horómetro)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Guardar Plan Preventivo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR CAMPO RÁPIDO DESDE TIPO DE EQUIPO */}
      {showInPlaceModal && selectedArquetipo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <h4 className="text-sm font-bold">
                  Crear Nuevo Campo Técnico para {selectedArquetipo.nombre_canonico || selectedArquetipo.nombre_tipo}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowInPlaceModal(false)}
                className="p-1.5 rounded-lg text-white/80 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveInPlaceFromArq} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ¿A qué Parte / Subsistema pertenece este campo? *
                </label>
                <select
                  required
                  value={inPlaceForm.codigo_modulo}
                  onChange={(e) =>
                    setInPlaceForm({ ...inPlaceForm, codigo_modulo: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white font-semibold"
                >
                  {selectedArquetipo.tipo_equipo_modulos.map((tem) => (
                    <option key={tem.id_modulo} value={tem.modulo.codigo_modulo}>
                      {tem.modulo.nombre_modulo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Campo Técnico *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Caudal Nominal de Operación"
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Dato *
                  </label>
                  <select
                    value={inPlaceForm.tipo_control}
                    onChange={(e) =>
                      setInPlaceForm({ ...inPlaceForm, tipo_control: e.target.value })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
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
                    Código Interno (Automático)
                  </label>
                  <input
                    type="text"
                    required
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
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Magnitud de Medida
                  </label>
                  <select
                    value={inPlaceForm.id_magnitud}
                    onChange={(e) => {
                      const idMag = e.target.value;
                      const mag = magnitudes.find((m) => String(m.id_magnitud) === idMag);
                      setInPlaceForm({
                        ...inPlaceForm,
                        id_magnitud: idMag,
                        unidad_defecto_codigo: mag?.unidad_base_codigo || '',
                      });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white font-semibold"
                  >
                    <option value="">-- Seleccionar Magnitud --</option>
                    {magnitudes.map((m) => (
                      <option key={m.id_magnitud} value={m.id_magnitud}>
                        {m.nombre_magnitud} (Unidad base: {m.unidad_base_codigo})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Crear y Asignar Campo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
