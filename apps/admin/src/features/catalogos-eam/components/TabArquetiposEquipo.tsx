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
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  useArquetipoEsquemaEam,
  useArquetiposEam,
  useAsignarAtributoModuloEam,
  useCreateArquetipoEam,
  useCreateAtributoEam,
  useCreatePlanArquetipoEam,
  useDeletePlanArquetipoEam,
  useDesvincularModuloArquetipoEam,
  useMagnitudesEam,
  useModulosEam,
  useResumenEjecutivoEam,
  useVincularModuloArquetipoEam,
} from '../index';

export function TabArquetiposEquipo() {
  const { data: arquetipos = [], isLoading } = useArquetiposEam();
  const { data: modulosDisponibles = [] } = useModulosEam();
  const { data: resumen } = useResumenEjecutivoEam();
  const { data: magnitudes = [] } = useMagnitudesEam();

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

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({
    id_tipo_servicio: '',
    nombre_plan: '',
    frecuencia_dias: '90',
    frecuencia_uso: '250',
    criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
  });

  // Modal Creación Rápida "In-Place & Elevate" desde Arquetipo
  const [showInPlaceModal, setShowInPlaceModal] = useState(false);
  const [inPlaceForm, setInPlaceForm] = useState({
    codigo_modulo: '',
    codigo_atributo: '',
    nombre_atributo: '',
    tipo_control: 'NUMERICO',
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
        obligatorio: true,
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
    const attr = await createAttrMut.mutateAsync({
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
        <p className="text-sm font-medium text-slate-600">
          Cargando Arquetipos Canónicos de Equipo...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SELECTOR DE ARQUETIPOS CANÓNICOS CONSOLIDADOS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              Arquetipos Canónicos de Activos ({arquetipos.length} Clases Gobernadas)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidación simétrica de pares históricos (GENERADOR↔GEN, BOMBA↔BOM, MOTOR↔MOT) con
              módulos componibles y planes preventivos base
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
                  ? 'Ocultar Vista Previa en Vivo'
                  : '👁️ Vista Previa de Formulario y Placa Técnica'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowNewArqModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo Arquetipo</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {arquetipos.map((arq) => {
            const isSelected = selectedArquetipo?.id_tipo_equipo === arq.id_tipo_equipo;
            const activos = arq.equipos_activos ?? arq._count.equipos;
            const totales = arq._count.equipos;
            const codigosSync = arq.codigos_sincronizados || [arq.codigo_tipo];

            return (
              <div
                key={arq.id_tipo_equipo}
                onClick={() => setSelectedArqId(arq.id_tipo_equipo)}
                className={`rounded-2xl border p-5 cursor-pointer transition-all flex flex-col justify-between gap-4 ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                }`}
              >
                <div className="space-y-2">
                  {/* Línea 1: Nombre Canónico */}
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
                  {/* Línea 2: Códigos sincronizados en font-mono sin truncar */}
                  <div className="font-mono text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                    {codigosSync.map((c) => (
                      <span
                        key={c}
                        className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200/70 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-blue-700 text-sm">{activos}</span>{' '}
                    <span className="text-slate-600 font-medium">
                      activos ({totales} total)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 font-semibold">
                    <span>{arq.tipo_equipo_modulos.length} mód.</span>
                    <span>•</span>
                    <span>{arq.tipo_equipo_planes.length} planes</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CUERPO DEL ARQUETIPO SELECCIONADO: SECCIÓN A (MÓDULOS) + SECCIÓN B (PLANES PREVENTIVOS) */}
      {selectedArquetipo && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* SECCIÓN A: ESQUEMA MODULAR DEL ARQUETIPO */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  Sección A: Módulos Técnicos Heredados
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sub-sistemas que componen la ficha técnica de{' '}
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
                  <span>+ Atributo In-Place</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLinkModId(
                      modulosDisponibles[0]?.id_modulo
                        ? String(modulosDisponibles[0].id_modulo)
                        : '',
                    );
                    setShowLinkModModal(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Vincular Módulo</span>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {selectedArquetipo.tipo_equipo_modulos.map((tem) => {
                const mod = tem.modulo;
                const countAttrs = mod._count?.modulo_atributos ?? 0;
                return (
                  <div
                    key={tem.id_tipo_equipo_modulo}
                    className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 bg-slate-50/40 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {mod.nombre_modulo}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                          {tem.obligatorio ? 'Obligatorio' : 'Opcional'}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-slate-500">
                        Código: <span className="font-semibold text-slate-700">{mod.codigo_modulo}</span> •{' '}
                        {countAttrs} atributos técnicos heredados
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          window.confirm(
                            `¿Desvincular el módulo "${mod.nombre_modulo}" de este arquetipo?`,
                          )
                        ) {
                          await desvincularModMut.mutateAsync({
                            idTipoEquipo: selectedArquetipo.id_tipo_equipo,
                            idModulo: mod.id_modulo,
                          });
                        }
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Desvincular módulo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN B: PLANES PREVENTIVOS BASE DEL ARQUETIPO */}
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/60">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-emerald-600" />
                  Sección B: Planes Preventivos e Inspección Base
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Intervalos canónicos por calendario (días) y lectura de uso (horómetro)
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
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Plan Preventivo</span>
              </button>
            </div>

            <div className="p-5 space-y-3">
              {selectedArquetipo.tipo_equipo_planes.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  No hay planes preventivos registrados para este arquetipo.
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
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold">
                          {plan.tipo_servicio?.codigo_tipo || `SRV-${plan.id_tipo_servicio}`}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 pt-0.5">
                        <span className="font-mono font-semibold text-blue-700">
                          Cada {plan.frecuencia_dias ?? 90} días
                        </span>
                        <span>•</span>
                        <span className="font-mono font-semibold text-amber-700">
                          Cada {Number(plan.frecuencia_uso ?? 250)} horas
                        </span>
                        <span>•</span>
                        <span className="text-slate-500">{plan.criterio_intervalo}</span>
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

      {/* REFINAMIENTO #3: PANEL DE VISTA PREVIA DE FORMULARIO Y PLACA TÉCNICA EN VIVO */}
      {showPreviewPanel && selectedArquetipo && (
        <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-blue-950 text-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Eye className="h-5 w-5 text-indigo-400" />
              <div>
                <h4 className="text-sm font-bold text-white">
                  👁️ Vista Previa en Vivo: Renderizador Dinámico de Placa Técnica y Formulario
                </h4>
                <p className="text-xs text-indigo-200">
                  Contrato JSON en tiempo real (GET /catalogos/arquetipos/{selectedArquetipo.id_tipo_equipo}/esquema)
                  para <strong>{selectedArquetipo.nombre_canonico || selectedArquetipo.nombre_tipo}</strong>
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/40 font-mono text-xs text-indigo-200">
              {esquemaVivo?.modulos?.length || 0} Módulos • Renderizado Universal EAM
            </span>
          </div>

          {loadingEsquema || !esquemaVivo ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="p-6 space-y-6 bg-slate-50/50">
              {esquemaVivo.modulos.map((mod) => (
                <div
                  key={mod.id_modulo}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-indigo-600" />
                      <h5 className="text-sm font-extrabold text-slate-900">
                        Módulo: {mod.nombre_modulo}
                      </h5>
                      <span className="font-mono text-xs text-slate-500">
                        ({mod.codigo_modulo})
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {mod.grupos.length} grupos visuales
                    </span>
                  </div>

                  <div className="space-y-5">
                    {mod.grupos.map((grp) => (
                      <div key={grp.nombre} className="space-y-2.5">
                        <div className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
                          ▸ {grp.nombre}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                          {grp.atributos.map((attr) => (
                            <div
                              key={attr.id_atributo}
                              className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-1.5"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800">
                                  {attr.nombre_atributo}
                                  {attr.obligatorio && (
                                    <span className="text-rose-600 ml-1">*</span>
                                  )}
                                </span>
                                {attr.es_kpi && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                    KPI
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                                <span>{attr.codigo_atributo}</span>
                                <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">
                                  {attr.tipo_control}
                                  {attr.unidad_defecto ? ` (${attr.unidad_defecto})` : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL NUEVO ARQUETIPO */}
      {showNewArqModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">Crear Nuevo Arquetipo de Equipo</h4>
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
                  Código Canónico *
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
                  Nombre de la Clase de Activo *
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
                  <option value="ENERGIA">ENERGIA</option>
                  <option value="HIDRAULICA">HIDRAULICA</option>
                  <option value="COMPRESION">COMPRESION</option>
                  <option value="CLIMATIZACION">CLIMATIZACION</option>
                  <option value="OTRO">OTRO</option>
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
                  Crear Arquetipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR MÓDULO */}
      {showLinkModModal && selectedArquetipo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h4 className="text-base font-bold text-slate-900">
                Vincular Módulo a {selectedArquetipo.codigo_tipo}
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
                  Módulo Técnico Funcional *
                </label>
                <select
                  required
                  value={linkModId}
                  onChange={(e) => setLinkModId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  {modulosDisponibles.map((m) => (
                    <option key={m.id_modulo} value={m.id_modulo}>
                      {m.nombre_modulo} ({m.codigo_modulo})
                    </option>
                  ))}
                </select>
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
                  Vincular Módulo
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
                Configurar Plan Preventivo ({selectedArquetipo.codigo_tipo})
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
                  Tipo de Servicio Preventivo / Diagnóstico *
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
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  {tiposServicioPreventivos.map((s) => (
                    <option key={s.id_tipo_servicio} value={s.id_tipo_servicio}>
                      [{s.codigo_tipo}] {s.nombre_tipo} ({s.categoria})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Descriptivo del Plan *
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
                    Frecuencia Calendario (Días) *
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
                    Frecuencia Uso (Horas) *
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

      {/* MODAL IN-PLACE DESDE ARQUETIPO */}
      {showInPlaceModal && selectedArquetipo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <h4 className="text-sm font-bold">
                  + Crear y Asignar Atributo Rápido (In-Place)
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
                  Módulo Destino en {selectedArquetipo.codigo_tipo} *
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
                      {tem.modulo.nombre_modulo} ({tem.modulo.codigo_modulo})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código Atributo (snake_case) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: caudal_nominal_lpm"
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
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="NUMERICO">NUMERICO</option>
                    <option value="TEXTO">TEXTO</option>
                    <option value="BOOLEANO">BOOLEANO</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre del Atributo *
                </label>
                <input
                  type="text"
                  required
                  value={inPlaceForm.nombre_atributo}
                  onChange={(e) =>
                    setInPlaceForm({ ...inPlaceForm, nombre_atributo: e.target.value })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              {inPlaceForm.tipo_control === 'NUMERICO' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Magnitud Física
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
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="">-- Sin Magnitud --</option>
                    {magnitudes.map((m) => (
                      <option key={m.id_magnitud} value={m.id_magnitud}>
                        {m.nombre_magnitud} ({m.codigo_magnitud})
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
                  Crear y Asignar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
