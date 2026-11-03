'use client';

import {
  ArrowRightLeft,
  Calculator,
  CheckCircle2,
  Edit3,
  Gauge,
  Loader2,
  Plus,
  Ruler,
  Scale,
  Sparkles,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  MagnitudFisica,
  UnidadMedidaEam,
  useConvertirUomEam,
  useCreateMagnitudEam,
  useCreateUnidadEam,
  useMagnitudesEam,
  useUpdateMagnitudEam,
  useUpdateUnidadEam,
} from '../index';

export function TabMagnitudesUom() {
  const { data: magnitudes = [], isLoading } = useMagnitudesEam();
  const [selectedMagCode, setSelectedMagCode] = useState<string>('');

  // Estado Calculadora Metrológica en Vivo
  const [calcMagCode, setCalcMagCode] = useState<string>('PRESION');
  const [calcValor, setCalcValor] = useState<string>('150');
  const [calcOrigen, setCalcOrigen] = useState<string>('PSI');
  const [calcDestino, setCalcDestino] = useState<string>('BAR');
  const convertirMut = useConvertirUomEam();

  // Modales CRUD Magnitud y Unidad
  const [showMagModal, setShowMagModal] = useState(false);
  const [editingMag, setEditingMag] = useState<MagnitudFisica | null>(null);
  const [magForm, setMagForm] = useState({
    codigo_magnitud: '',
    nombre_magnitud: '',
    descripcion: '',
    unidad_base_codigo: '',
  });

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnidadMedidaEam | null>(null);
  const [unitForm, setUnitForm] = useState({
    codigo: '',
    nombre: '',
    simbolo: '',
    factor_a: '1',
    factor_b: '0',
    es_unidad_base: false,
    permite_decimales: true,
  });

  const createMagMut = useCreateMagnitudEam();
  const updateMagMut = useUpdateMagnitudEam();
  const createUnitMut = useCreateUnidadEam();
  const updateUnitMut = useUpdateUnidadEam();

  useEffect(() => {
    if (!selectedMagCode && magnitudes.length > 0) {
      setSelectedMagCode(magnitudes[0].codigo_magnitud);
    }
  }, [magnitudes, selectedMagCode]);

  const selectedMagnitud = useMemo(
    () => magnitudes.find((m) => m.codigo_magnitud === selectedMagCode) || magnitudes[0] || null,
    [magnitudes, selectedMagCode],
  );

  const calcMagnitudObj = useMemo(
    () => magnitudes.find((m) => m.codigo_magnitud === calcMagCode) || magnitudes[0] || null,
    [magnitudes, calcMagCode],
  );

  const unidadesCalcDisponibles = useMemo(
    () => calcMagnitudObj?.unidades_medida || [],
    [calcMagnitudObj],
  );

  const handleSelectCalcMagnitud = (cod: string) => {
    setCalcMagCode(cod);
    const mag = magnitudes.find((m) => m.codigo_magnitud === cod);
    const units = mag?.unidades_medida || [];
    if (units.length >= 2) {
      setCalcOrigen(units[1].codigo);
      setCalcDestino(units[0].codigo);
    } else if (units.length === 1) {
      setCalcOrigen(units[0].codigo);
      setCalcDestino(units[0].codigo);
    }
  };

  const handleRunConversion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(calcValor);
    if (isNaN(num) || !calcOrigen || !calcDestino) return;
    await convertirMut.mutateAsync({
      valor: num,
      unidadOrigen: calcOrigen,
      unidadDestino: calcDestino,
    });
  };

  // Disparar conversión inicial al montar cuando estén listas las magnitudes
  useEffect(() => {
    if (magnitudes.length > 0 && !convertirMut.data && !convertirMut.isPending) {
      convertirMut.mutate({
        valor: 150,
        unidadOrigen: 'PSI',
        unidadDestino: 'BAR',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [magnitudes.length]);

  const openNewMagnitud = () => {
    setEditingMag(null);
    setMagForm({
      codigo_magnitud: '',
      nombre_magnitud: '',
      descripcion: '',
      unidad_base_codigo: '',
    });
    setShowMagModal(true);
  };

  const openEditMagnitud = (mag: MagnitudFisica) => {
    setEditingMag(mag);
    setMagForm({
      codigo_magnitud: mag.codigo_magnitud,
      nombre_magnitud: mag.nombre_magnitud,
      descripcion: mag.descripcion || '',
      unidad_base_codigo: mag.unidad_base_codigo || '',
    });
    setShowMagModal(true);
  };

  const handleSaveMagnitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMag) {
      await updateMagMut.mutateAsync({
        codigo: editingMag.codigo_magnitud,
        payload: {
          nombre_magnitud: magForm.nombre_magnitud,
          descripcion: magForm.descripcion,
          unidad_base_codigo: magForm.unidad_base_codigo || undefined,
        },
      });
    } else {
      const created = await createMagMut.mutateAsync({
        codigo_magnitud: magForm.codigo_magnitud,
        nombre_magnitud: magForm.nombre_magnitud,
        descripcion: magForm.descripcion || undefined,
        unidad_base_codigo: magForm.unidad_base_codigo || undefined,
      });
      setSelectedMagCode(created.codigo_magnitud);
    }
    setShowMagModal(false);
  };

  const openNewUnit = () => {
    setEditingUnit(null);
    setUnitForm({
      codigo: '',
      nombre: '',
      simbolo: '',
      factor_a: '1',
      factor_b: '0',
      es_unidad_base: false,
      permite_decimales: true,
    });
    setShowUnitModal(true);
  };

  const openEditUnit = (u: UnidadMedidaEam) => {
    setEditingUnit(u);
    setUnitForm({
      codigo: u.codigo,
      nombre: u.nombre,
      simbolo: u.simbolo,
      factor_a: String(u.factor_a ?? 1),
      factor_b: String(u.factor_b ?? 0),
      es_unidad_base: Boolean(u.es_unidad_base),
      permite_decimales: Boolean(u.permite_decimales),
    });
    setShowUnitModal(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMagnitud) return;

    if (editingUnit) {
      await updateUnitMut.mutateAsync({
        codigo: editingUnit.codigo,
        payload: {
          nombre: unitForm.nombre,
          simbolo: unitForm.simbolo,
          id_magnitud: selectedMagnitud.id_magnitud,
          factor_a: parseFloat(unitForm.factor_a) || 1,
          factor_b: parseFloat(unitForm.factor_b) || 0,
          es_unidad_base: unitForm.es_unidad_base,
          permite_decimales: unitForm.permite_decimales,
        },
      });
    } else {
      await createUnitMut.mutateAsync({
        codigo: unitForm.codigo,
        nombre: unitForm.nombre,
        simbolo: unitForm.simbolo,
        id_magnitud: selectedMagnitud.id_magnitud,
        codigo_magnitud: selectedMagnitud.codigo_magnitud,
        factor_a: parseFloat(unitForm.factor_a) || 1,
        factor_b: parseFloat(unitForm.factor_b) || 0,
        es_unidad_base: unitForm.es_unidad_base,
        permite_decimales: unitForm.permite_decimales,
      });
    }
    setShowUnitModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200">
        <Loader2 className="h-9 w-9 animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium text-slate-600">Cargando Sistema Metrológico SI...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WIDGET SUPERIOR: CALCULADORA METROLÓGICA UoM EN VIVO */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-6 shadow-lg border border-slate-700/80">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <Calculator className="h-3.5 w-3.5" />
              <span>MOTOR AFÍN EXACTO • y = a·x + b</span>
            </div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Calculadora Metrológica UoM en Vivo
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Valida en tiempo real la conversión bidireccional entre unidades afines (incluyendo desplazamientos
              térmicos como °F ↔ °C ↔ K y presiones PSI ↔ BAR ↔ kPa).
            </p>
          </div>

          <form
            onSubmit={handleRunConversion}
            className="flex flex-wrap items-end gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-700/80"
          >
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Magnitud Física
              </label>
              <select
                value={calcMagCode}
                onChange={(e) => handleSelectCalcMagnitud(e.target.value)}
                className="h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-medium focus:ring-2 focus:ring-blue-500"
              >
                {magnitudes.map((m) => (
                  <option key={m.codigo_magnitud} value={m.codigo_magnitud}>
                    {m.nombre_magnitud} ({m.codigo_magnitud})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Valor Entrada
              </label>
              <input
                type="number"
                step="any"
                value={calcValor}
                onChange={(e) => setCalcValor(e.target.value)}
                className="h-10 w-28 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-sm font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Unidad Origen
              </label>
              <select
                value={calcOrigen}
                onChange={(e) => setCalcOrigen(e.target.value)}
                className="h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:ring-2 focus:ring-blue-500"
              >
                {unidadesCalcDisponibles.map((u) => (
                  <option key={u.codigo} value={u.codigo}>
                    [{u.codigo}] {u.nombre} ({u.simbolo})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                const tmp = calcOrigen;
                setCalcOrigen(calcDestino);
                setCalcDestino(tmp);
              }}
              className="h-10 w-10 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-200 transition-colors"
              title="Invertir unidades"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </button>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Unidad Destino
              </label>
              <select
                value={calcDestino}
                onChange={(e) => setCalcDestino(e.target.value)}
                className="h-10 px-3 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:ring-2 focus:ring-blue-500"
              >
                {unidadesCalcDisponibles.map((u) => (
                  <option key={u.codigo} value={u.codigo}>
                    [{u.codigo}] {u.nombre} ({u.simbolo})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={convertirMut.isPending}
              className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all"
            >
              {convertirMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span>Convertir</span>
            </button>

            {convertirMut.data && (
              <div className="px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/40 flex flex-col justify-center min-w-[170px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  Resultado Exacto
                </span>
                <span className="text-base font-extrabold font-mono text-white">
                  {Number(convertirMut.data.valorDestino).toLocaleString('es-CO', {
                    maximumFractionDigits: 6,
                  })}{' '}
                  <span className="text-emerald-300">{convertirMut.data.unidadDestino}</span>
                </span>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* MAESTRO-DETALLE: 11 MAGNITUDES A LA IZQUIERDA • UNIDADES A LA DERECHA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Lista de Magnitudes Físicas */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                Magnitudes Físicas ({magnitudes.length})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecciona una dimensión física para gobernar sus unidades
              </p>
            </div>
            <button
              type="button"
              onClick={openNewMagnitud}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nueva Magnitud</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
            {magnitudes.map((mag) => {
              const isSelected = selectedMagnitud?.codigo_magnitud === mag.codigo_magnitud;
              const numUnidades = mag.unidades_medida?.length || 0;
              return (
                <div
                  key={mag.id_magnitud}
                  onClick={() => setSelectedMagCode(mag.codigo_magnitud)}
                  className={`p-4 cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-4 border-l-blue-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    {/* Línea 1: Nombre legible + badge Unidad Base SI */}
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {mag.nombre_magnitud}
                      </span>
                      {mag.unidad_base_codigo && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-mono text-[11px] font-bold">
                          Base SI: {mag.unidad_base_codigo}
                        </span>
                      )}
                    </div>
                    {/* Línea 2: Código completo en font-mono sin truncamiento */}
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono text-xs text-slate-600 font-semibold">
                        {mag.codigo_magnitud}
                      </span>
                      {mag.descripcion && (
                        <>
                          <span>•</span>
                          <span className="text-slate-500">{mag.descripcion}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold">
                      {numUnidades} UoM
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditMagnitud(mag);
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Editar magnitud"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha: Unidades de Medida de la Magnitud Seleccionada */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {selectedMagnitud ? (
            <>
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <Ruler className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-base font-bold text-slate-900">
                      Unidades de {selectedMagnitud.nombre_magnitud}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-mono text-xs font-bold">
                      {selectedMagnitud.codigo_magnitud}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Fórmula afín hacia la unidad base ({selectedMagnitud.unidad_base_codigo || 'SI'}):{' '}
                    <code className="font-mono text-slate-700 bg-slate-200/70 px-1.5 py-0.5 rounded">
                      valor_base = factor_a × valor + factor_b
                    </code>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openNewUnit}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>Nueva Unidad UoM</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-5">Unidad / Código Canónico</th>
                      <th className="py-3.5 px-4">Símbolo</th>
                      <th className="py-3.5 px-4">Rol SI</th>
                      <th className="py-3.5 px-4 font-mono">Factor Escala (a)</th>
                      <th className="py-3.5 px-4 font-mono">Offset (b)</th>
                      <th className="py-3.5 px-5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {(selectedMagnitud.unidades_medida || []).map((u) => (
                      <tr key={u.codigo} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-5">
                          {/* Jerarquía de 2 líneas sin truncamiento */}
                          <div className="font-bold text-slate-900">{u.nombre}</div>
                          <div className="font-mono text-xs text-slate-500 mt-0.5">
                            Código: <span className="font-semibold text-slate-700">{u.codigo}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-xs font-bold">
                            {u.simbolo}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {u.es_unidad_base ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Base SI</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
                              Derivada Afín
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-700 font-semibold">
                          {Number(u.factor_a)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                          {Number(u.factor_b)}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={() => openEditUnit(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-xs font-semibold text-slate-700 hover:text-blue-700 transition-colors"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-500 text-sm">
              Selecciona una magnitud física a la izquierda.
            </div>
          )}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR MAGNITUD FÍSICA */}
      {showMagModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-blue-600" />
                <h4 className="text-base font-bold text-slate-900">
                  {editingMag ? `Editar Magnitud: ${editingMag.codigo_magnitud}` : 'Nueva Magnitud Física'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowMagModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMagnitud} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código Canónico *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingMag)}
                    placeholder="Ej: VISCOSIDAD"
                    value={magForm.codigo_magnitud}
                    onChange={(e) =>
                      setMagForm({ ...magForm, codigo_magnitud: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código Unidad Base SI
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: BAR, KW, L"
                    value={magForm.unidad_base_codigo}
                    onChange={(e) =>
                      setMagForm({ ...magForm, unidad_base_codigo: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Magnitud Física *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Presión Manométrica / Hidráulica"
                  value={magForm.nombre_magnitud}
                  onChange={(e) => setMagForm({ ...magForm, nombre_magnitud: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción Metrológica
                </label>
                <textarea
                  rows={2}
                  placeholder="Descripción del uso en activos industriales..."
                  value={magForm.descripcion}
                  onChange={(e) => setMagForm({ ...magForm, descripcion: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMagModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMagMut.isPending || updateMagMut.isPending}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm"
                >
                  Guardar Magnitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR UNIDAD DE MEDIDA */}
      {showUnitModal && selectedMagnitud && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Ruler className="h-5 w-5 text-indigo-600" />
                <h4 className="text-base font-bold text-slate-900">
                  {editingUnit
                    ? `Editar Unidad: ${editingUnit.codigo}`
                    : `Nueva Unidad para ${selectedMagnitud.nombre_magnitud}`}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowUnitModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código UoM *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingUnit)}
                    placeholder="Ej: PSI"
                    value={unitForm.codigo}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, codigo: e.target.value.toUpperCase() })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Símbolo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: psi"
                    value={unitForm.simbolo}
                    onChange={(e) => setUnitForm({ ...unitForm, simbolo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-sm"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                    <input
                      type="checkbox"
                      checked={unitForm.es_unidad_base}
                      onChange={(e) =>
                        setUnitForm({ ...unitForm, es_unidad_base: e.target.checked })
                      }
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                    <span>Es Unidad Base SI</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre Descriptivo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Libras por Pulgada Cuadrada"
                  value={unitForm.nombre}
                  onChange={(e) => setUnitForm({ ...unitForm, nombre: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Factor Escala (factor_a) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={unitForm.factor_a}
                    onChange={(e) => setUnitForm({ ...unitForm, factor_a: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Offset Térmico / Cero (factor_b)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={unitForm.factor_b}
                    onChange={(e) => setUnitForm({ ...unitForm, factor_b: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-sm bg-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUnitModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createUnitMut.isPending || updateUnitMut.isPending}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
                >
                  Guardar Unidad UoM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
