'use client';

/**
 * MEKANOS S.A.S - Portal Admin
 * <DynamicEquipmentFormPreview />
 *
 * Componente interactivo dual reutilizable (Fase 3.5 y Fase 4):
 * - Modo 1 ("formulario"): Renderiza el Formulario de Registro real con inputs numéricos,
 *   selectores de unidad UoM con conversión en vivo, listas desplegables reales y switches Sí/No.
 * - Modo 2 ("placa_pdf"): Renderiza la Placa Técnica Corporativa tal como se imprime en el
 *   informe PDF de Mekanos y en la Hoja de Vida del equipo.
 */

import {
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Factory,
  FileText,
  FormInput,
  Sparkles,
  Star,
  Wrench,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ArquetipoEsquemaResponse,
  MagnitudFisica,
  ModeloEquipoOem,
} from '../api/catalogos-eam.service';
import {
  getCriterioIntervaloHumano,
  getModuloBadgeInfo,
  parseOpcionesSeguras,
} from '../utils/eam-humanizer';
import { EamSelect, EamUomSelect } from './EamSelect';
import { MarcaCombobox } from './MarcaCombobox';

const getDynamicNumericPlaceholder = (codigo: string, nombre: string): string => {
  const c = (codigo || '').toLowerCase();
  const n = (nombre || '').toLowerCase();
  if (c.includes('rpm') || c.includes('velocidad') || n.includes('rpm')) return 'Ej: 1800';
  if (c.includes('ano') || c.includes('año') || c.includes('fabricacion')) return 'Ej: 2024';
  if (c.includes('factor') || c.includes('fp') || c.includes('cos')) return 'Ej: 0.85';
  if (c.includes('frecuencia') || c.includes('hz')) return 'Ej: 60';
  if (c.includes('voltaje') || c.includes('vac') || c.includes('vdc')) return 'Ej: 220';
  if (c.includes('amperaje') || c.includes('amp') || c.includes('corriente')) return 'Ej: 15';
  if (c.includes('fases') || c.includes('polos')) return 'Ej: 3';
  if (c.includes('temperatura') || c.includes('temp')) return 'Ej: 80';
  if (c.includes('presion') || c.includes('psi')) return 'Ej: 120';
  if (c.includes('horas') || c.includes('horometro')) return 'Ej: 1500';
  return '0.00';
};

interface DynamicEquipmentFormPreviewProps {
  esquema: ArquetipoEsquemaResponse;
  modelosOem?: ModeloEquipoOem[];
  magnitudes?: MagnitudFisica[];
  initialValues?: Record<string, Record<string, unknown>>;
  onChangeValues?: (values: Record<string, Record<string, unknown>>) => void;
}

export function DynamicEquipmentFormPreview({
  esquema,
  modelosOem = [],
  magnitudes = [],
  initialValues,
  onChangeValues,
}: DynamicEquipmentFormPreviewProps) {
  const [previewMode, setPreviewMode] = useState<'formulario' | 'placa_pdf'>('formulario');
  const [selectedOemId, setSelectedOemId] = useState<string>('');
  const [collapsedModules, setCollapsedModules] = useState<Record<string, boolean>>({});

  // Estado de valores por módulo: { [codigo_modulo]: { [codigo_atributo]: valor } }
  const [formValues, setFormValues] = useState<Record<string, Record<string, unknown>>>({});
  // Estado de unidades seleccionadas por campo: { [codigo_modulo.codigo_atributo]: codigo_unidad }
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});

  // Mapa rápido de factores de conversión UoM desde magnitudes
  const uomMap = useMemo(() => {
    const map = new Map<
      string,
      { factor_a: number; factor_b: number; simbolo: string; nombre: string }
    >();
    for (const mag of magnitudes) {
      for (const u of mag.unidades_medida || []) {
        map.set(u.codigo.toUpperCase(), {
          factor_a: Number(u.factor_a ?? 1),
          factor_b: Number(u.factor_b ?? 0),
          simbolo: u.simbolo || u.codigo,
          nombre: u.nombre,
        });
      }
    }
    return map;
  }, [magnitudes]);

  // Modelos OEM disponibles para este tipo de equipo
  const modelosDelArquetipo = useMemo(() => {
    const idTipo = esquema.arquetipo.id_tipo_equipo;
    const filtrados = modelosOem.filter((m) => m.id_tipo_equipo === idTipo);
    return filtrados.length > 0 ? filtrados : modelosOem;
  }, [modelosOem, esquema.arquetipo.id_tipo_equipo]);

  const modeloSeleccionadoObj = useMemo(
    () => modelosDelArquetipo.find((m) => String(m.id_modelo_equipo) === selectedOemId) || null,
    [modelosDelArquetipo, selectedOemId],
  );

  // Inicializar valores cuando cambia el esquema o cuando hay un modelo OEM compatible
  useEffect(() => {
    const baseValues: Record<string, Record<string, unknown>> = {};
    const baseUnits: Record<string, string> = {};

    // Si hay un modelo OEM del mismo tipo de equipo, pre-seleccionarlo por defecto para demostración viva
    const primerModeloCompatible = modelosOem.find(
      (m) => m.id_tipo_equipo === esquema.arquetipo.id_tipo_equipo,
    );
    const specsModelo =
      (
        primerModeloCompatible?.especificaciones_base as
          | { modulos?: Record<string, Record<string, unknown>> }
          | undefined
      )?.modulos || {};

    if (primerModeloCompatible) {
      setSelectedOemId(String(primerModeloCompatible.id_modelo_equipo));
    } else {
      setSelectedOemId('');
    }

    for (const mod of esquema.modulos) {
      baseValues[mod.codigo_modulo] = {};
      const modDefaults =
        initialValues?.[mod.codigo_modulo] || specsModelo[mod.codigo_modulo] || {};

      for (const grp of mod.grupos) {
        for (const attr of grp.atributos) {
          const unitKey = `${mod.codigo_modulo}.${attr.codigo_atributo}`;
          const defaultUnit = attr.unidad_defecto || attr.unidades_disponibles?.[0]?.codigo || '';
          if (defaultUnit) {
            baseUnits[unitKey] = defaultUnit;
          }

          if (modDefaults[attr.codigo_atributo] !== undefined) {
            baseValues[mod.codigo_modulo][attr.codigo_atributo] = modDefaults[attr.codigo_atributo];
          } else if (attr.valor_defecto !== null && attr.valor_defecto !== undefined) {
            baseValues[mod.codigo_modulo][attr.codigo_atributo] = attr.valor_defecto;
          } else if ((attr.tipo_control || '').toUpperCase() === 'BOOLEANO') {
            baseValues[mod.codigo_modulo][attr.codigo_atributo] = false;
          } else {
            baseValues[mod.codigo_modulo][attr.codigo_atributo] = '';
          }
        }
      }
    }

    setFormValues(baseValues);
    setSelectedUnits(baseUnits);
    setCollapsedModules({});
  }, [esquema, modelosOem, initialValues]);

  // Aplicar plantilla de Modelo OEM cuando el usuario cambia el selector
  const handleSelectOemModel = (idModeloStr: string) => {
    setSelectedOemId(idModeloStr);
    const modOem = modelosDelArquetipo.find((m) => String(m.id_modelo_equipo) === idModeloStr);
    const specsModulos =
      (
        modOem?.especificaciones_base as
          | { modulos?: Record<string, Record<string, unknown>> }
          | undefined
      )?.modulos || {};

    const nextValues: Record<string, Record<string, unknown>> = {};
    for (const mod of esquema.modulos) {
      nextValues[mod.codigo_modulo] = {};
      const preset = specsModulos[mod.codigo_modulo] || {};
      for (const grp of mod.grupos) {
        for (const attr of grp.atributos) {
          if (preset[attr.codigo_atributo] !== undefined) {
            nextValues[mod.codigo_modulo][attr.codigo_atributo] = preset[attr.codigo_atributo];
          } else if ((attr.tipo_control || '').toUpperCase() === 'BOOLEANO') {
            nextValues[mod.codigo_modulo][attr.codigo_atributo] = false;
          } else {
            nextValues[mod.codigo_modulo][attr.codigo_atributo] = '';
          }
        }
      }
    }
    setFormValues(nextValues);
    onChangeValues?.(nextValues);
  };

  const handleFieldChange = (codigoModulo: string, codigoAtributo: string, val: unknown) => {
    setFormValues((prev) => {
      const next = {
        ...prev,
        [codigoModulo]: {
          ...(prev[codigoModulo] || {}),
          [codigoAtributo]: val,
        },
      };
      onChangeValues?.(next);
      return next;
    });
  };

  // Cambiar la unidad de un campo numérico convirtiendo el valor automáticamente si es número
  const handleUnitChange = (codigoModulo: string, codigoAtributo: string, newUnitCode: string) => {
    const unitKey = `${codigoModulo}.${codigoAtributo}`;
    const oldUnitCode = selectedUnits[unitKey];
    const currentRawVal = formValues[codigoModulo]?.[codigoAtributo];
    const numVal = parseFloat(String(currentRawVal));

    if (!isNaN(numVal) && oldUnitCode && oldUnitCode !== newUnitCode) {
      const origInfo = uomMap.get(oldUnitCode.toUpperCase());
      const destInfo = uomMap.get(newUnitCode.toUpperCase());
      if (origInfo && destInfo && destInfo.factor_a !== 0) {
        const valorBase = origInfo.factor_a * numVal + origInfo.factor_b;
        const convertido = (valorBase - destInfo.factor_b) / destInfo.factor_a;
        const redondeado = Math.round(convertido * 100) / 100;
        handleFieldChange(codigoModulo, codigoAtributo, redondeado);
      }
    }

    setSelectedUnits((prev) => ({
      ...prev,
      [unitKey]: newUnitCode,
    }));
  };

  const toggleCollapseModule = (codigoModulo: string) => {
    setCollapsedModules((prev) => ({
      ...prev,
      [codigoModulo]: !prev[codigoModulo],
    }));
  };

  // Formatear un valor para la Placa Técnica PDF
  const formatValueForPlate = (
    codigoModulo: string,
    attr: ArquetipoEsquemaResponse['modulos'][0]['grupos'][0]['atributos'][0],
  ): string => {
    const rawVal = formValues[codigoModulo]?.[attr.codigo_atributo];
    const ctrl = (attr.tipo_control || '').toUpperCase();

    if (ctrl === 'BOOLEANO') {
      return rawVal === true || rawVal === 'true' ? 'Sí (Incluido)' : 'No';
    }

    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') {
      return '—';
    }

    if (ctrl === 'SELECTOR' || ctrl === 'SELECT') {
      const opciones = parseOpcionesSeguras(attr.opciones);
      const match = opciones.find(
        (o) => o.value.toUpperCase() === String(rawVal).trim().toUpperCase(),
      );
      return match ? match.label : String(rawVal);
    }

    const unitKey = `${codigoModulo}.${attr.codigo_atributo}`;
    const uCode = selectedUnits[unitKey] || attr.unidad_defecto || '';
    if (uCode) {
      const uInfo = uomMap.get(uCode.toUpperCase());
      const symbol = uInfo?.simbolo || uCode;
      return `${rawVal} ${symbol}`;
    }

    return String(rawVal);
  };

  // Extraer KPIs principales para la cabecera de la Placa PDF
  const kpisDestacados = useMemo(() => {
    const list: Array<{
      key: string;
      label: string;
      formattedValue: string;
      moduloNombre: string;
    }> = [];

    for (const mod of esquema.modulos) {
      for (const grp of mod.grupos) {
        for (const attr of grp.atributos) {
          if (attr.es_kpi) {
            const val = formatValueForPlate(mod.codigo_modulo, attr);
            if (val !== '—') {
              list.push({
                key: `${mod.codigo_modulo}.${attr.codigo_atributo}`,
                label: attr.nombre_atributo,
                formattedValue: val,
                moduloNombre: mod.nombre_modulo,
              });
            }
          }
        }
      }
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esquema, formValues, selectedUnits]);

  // Metrología dinámica del arquetipo (Horómetro / Ciclos / Odómetro / Calendario)
  const arq = esquema.arquetipo;
  const unidadUso = arq.unidad_uso || 'HORAS';
  const etiquetaRaw = arq.etiqueta_contador;
  const requiereContador = arq.requiere_horometro !== false && unidadUso !== 'CAL';

  const etiquetaMedidor = etiquetaRaw
    ? `Control por ${etiquetaRaw}`
    : unidadUso === 'CICLOS'
      ? 'Control por Ciclos de Viaje'
      : unidadUso === 'KM_ODO'
        ? 'Control por Odómetro'
        : unidadUso === 'UPM'
          ? 'Control por Unidades de Producción'
          : unidadUso === 'CAL'
            ? 'Mantenimiento por Calendario'
            : 'Control por Horómetro';

  const sufijoUso =
    unidadUso === 'CICLOS'
      ? 'ciclos'
      : unidadUso === 'KM_ODO'
        ? 'km'
        : unidadUso === 'UPM'
          ? 'und'
          : unidadUso === 'CAL'
            ? ''
            : 'horas';

  const labelIntervencion =
    unidadUso === 'CICLOS'
      ? `${etiquetaRaw || 'Ciclos'} Intervención`
      : unidadUso === 'KM_ODO'
        ? `${etiquetaRaw || 'Kilometraje'} Intervención`
        : unidadUso === 'UPM'
          ? `${etiquetaRaw || 'Producción'} Intervención`
          : `${etiquetaRaw || 'Horómetro'} Intervención`;

  const labelAcumulado =
    unidadUso === 'CICLOS'
      ? `${etiquetaRaw || 'Ciclos'} Acumulados (Hoja de Vida)`
      : unidadUso === 'KM_ODO'
        ? `${etiquetaRaw || 'Kilometraje'} Acumulado`
        : unidadUso === 'UPM'
          ? `${etiquetaRaw || 'Producción'} Acumulada`
          : `${etiquetaRaw || 'Horómetro'} Acumulado (Hoja de Vida)`;

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200/90 shadow-md overflow-hidden">
      {/* BARRA SUPERIOR DEL SIMULADOR CON CONMUTADOR DE 2 MODOS Y PRE-LLENADO OEM */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h4 className="text-sm font-extrabold text-white tracking-wide">
              Simulador Interactivo: {esquema.arquetipo.nombre_tipo}
            </h4>
          </div>
          <p className="text-xs text-slate-300">
            Prueba cómo registrará el coordinador este equipo y cómo se imprimirá su Placa Técnica
            en el PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Selector de Modelo de Fábrica (OEM) para probar pre-llenado */}
          {modelosDelArquetipo.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700">
              <Factory className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-300">
                Pre-llenar con Modelo:
              </span>
              <div className="w-56">
                <EamSelect
                  variant="dark"
                  size="sm"
                  value={selectedOemId}
                  options={[
                    { value: '', label: '-- Formulario en Blanco --' },
                    ...modelosDelArquetipo.map((m) => ({
                      value: String(m.id_modelo_equipo),
                      label: `${m.marca} ${m.modelo}`,
                      badge: m.nombre_comercial ? m.nombre_comercial : undefined,
                    })),
                  ]}
                  onChange={(val) => handleSelectOemModel(val)}
                  placeholder="-- Formulario en Blanco --"
                />
              </div>
            </div>
          )}

          {/* Conmutador de los 2 Modos */}
          <div className="inline-flex rounded-xl bg-slate-950/80 p-1 border border-slate-700">
            <button
              type="button"
              onClick={() => setPreviewMode('formulario')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                previewMode === 'formulario'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FormInput className="h-3.5 w-3.5" />
              <span>📝 Así se verá el Formulario de Registro</span>
            </button>

            <button
              type="button"
              onClick={() => setPreviewMode('placa_pdf')}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                previewMode === 'placa_pdf'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>📄 Así se verá la Placa Técnica en el PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODO 1: FORMULARIO DE REGISTRO INTERACTIVO REAL */}
      {previewMode === 'formulario' ? (
        <div className="p-6 space-y-5 bg-slate-50/60">
          {esquema.modulos.map((mod) => {
            const isCollapsed = Boolean(collapsedModules[mod.codigo_modulo]);
            const modBadge = getModuloBadgeInfo(mod.codigo_modulo, mod.nombre_modulo);
            const totalCamposModulo = mod.grupos.reduce((acc, g) => acc + g.atributos.length, 0);
            const camposConValor = mod.grupos.reduce(
              (acc, g) =>
                acc +
                g.atributos.filter((a) => {
                  const v = formValues[mod.codigo_modulo]?.[a.codigo_atributo];
                  return v !== undefined && v !== null && String(v).trim() !== '' && v !== false;
                }).length,
              0,
            );

            return (
              <div
                key={mod.id_modulo}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* Cabecera Acordeón de Parte / Subsistema */}
                <button
                  type="button"
                  onClick={() => toggleCollapseModule(mod.codigo_modulo)}
                  className="w-full px-6 py-4 bg-slate-50/80 hover:bg-slate-100/70 border-b border-slate-200/80 flex items-center justify-between gap-4 text-left transition-colors"
                >
                  <div className="flex items-center flex-wrap gap-3">
                    {isCollapsed ? (
                      <ChevronRight className="h-5 w-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-blue-600" />
                    )}
                    <Wrench className="h-4 w-4 text-blue-600" />
                    <span className="text-base font-extrabold text-slate-900">
                      Parte: {mod.nombre_modulo}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        mod.obligatorio
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {mod.obligatorio ? 'Parte Principal' : 'Parte Opcional'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${modBadge.badgeClass}`}
                    >
                      {camposConValor} de {totalCamposModulo} campos con datos
                    </span>
                  </div>
                </button>

                {/* Cuerpo del Acordeón con Grupos Visuales e Inputs Reales */}
                {!isCollapsed && (
                  <div className="p-6 space-y-6">
                    {mod.grupos.map((grp) => (
                      <div key={grp.nombre} className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                          <span className="text-xs font-extrabold text-blue-800 uppercase tracking-wider">
                            ▸ {grp.nombre}
                          </span>
                          <span className="text-[11px] text-slate-400 font-medium">
                            ({grp.atributos.length} campos)
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {grp.atributos.map((attr) => {
                            const ctrl = (attr.tipo_control || '').toUpperCase();
                            const val = formValues[mod.codigo_modulo]?.[attr.codigo_atributo] ?? '';
                            const unitKey = `${mod.codigo_modulo}.${attr.codigo_atributo}`;
                            const activeUnit =
                              selectedUnits[unitKey] ||
                              attr.unidad_defecto ||
                              attr.unidades_disponibles?.[0]?.codigo ||
                              '';
                            const opciones = parseOpcionesSeguras(attr.opciones);

                            return (
                              <div
                                key={attr.id_atributo}
                                className="p-3.5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-300 transition-colors flex flex-col justify-between gap-2 shadow-2xs"
                              >
                                {/* Etiqueta superior del campo */}
                                <div className="flex items-start justify-between gap-2">
                                  <label className="text-xs font-bold text-slate-800 leading-snug">
                                    {attr.nombre_atributo}
                                    {attr.obligatorio && (
                                      <span
                                        className="text-rose-600 font-extrabold ml-1"
                                        title="Campo obligatorio"
                                      >
                                        *
                                      </span>
                                    )}
                                  </label>
                                  {attr.es_kpi && (
                                    <span
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold shrink-0"
                                      title="Este dato se destaca en las tarjetas del directorio y en la cabecera del PDF"
                                    >
                                      <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                      <span>Destacado</span>
                                    </span>
                                  )}
                                </div>

                                {/* Control interactivo real según el tipo de campo */}
                                {ctrl === 'BOOLEANO' ? (
                                  <div className="pt-1 flex items-center justify-between">
                                    <span className="text-xs text-slate-600 font-medium">
                                      {val === true || val === 'true'
                                        ? 'Sí (Activo / Incluido)'
                                        : 'No aplica / No tiene'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleFieldChange(
                                          mod.codigo_modulo,
                                          attr.codigo_atributo,
                                          !(val === true || val === 'true'),
                                        )
                                      }
                                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                        val === true || val === 'true'
                                          ? 'bg-emerald-600'
                                          : 'bg-slate-200'
                                      }`}
                                    >
                                      <span
                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                          val === true || val === 'true'
                                            ? 'translate-x-5'
                                            : 'translate-x-0'
                                        }`}
                                      />
                                    </button>
                                  </div>
                                ) : ctrl === 'SELECTOR' || ctrl === 'SELECT' ? (
                                  <EamSelect
                                    value={String(val)}
                                    onChange={(selectedVal) =>
                                      handleFieldChange(
                                        mod.codigo_modulo,
                                        attr.codigo_atributo,
                                        selectedVal,
                                      )
                                    }
                                    options={opciones.map((op) => ({
                                      value: op.value,
                                      label: op.label,
                                    }))}
                                    placeholder="-- Seleccionar opción --"
                                  />
                                ) : ctrl === 'NUMERICO_MAGNITUD' ||
                                  (attr.unidades_disponibles &&
                                    attr.unidades_disponibles.length > 0) ? (
                                  <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                                    <input
                                      type="number"
                                      step="any"
                                      placeholder="0.00"
                                      value={
                                        typeof val === 'string' || typeof val === 'number'
                                          ? val
                                          : ''
                                      }
                                      onChange={(e) =>
                                        handleFieldChange(
                                          mod.codigo_modulo,
                                          attr.codigo_atributo,
                                          e.target.value,
                                        )
                                      }
                                      className="w-full h-9 px-3 text-xs font-bold text-slate-900 border-0 focus:ring-0 focus:outline-none"
                                    />
                                    <EamUomSelect
                                      value={activeUnit}
                                      units={attr.unidades_disponibles}
                                      onChange={(newUnitCode) =>
                                        handleUnitChange(
                                          mod.codigo_modulo,
                                          attr.codigo_atributo,
                                          newUnitCode,
                                        )
                                      }
                                    />
                                  </div>
                                ) : ctrl === 'NUMERICO_PURO' || ctrl === 'NUMERICO' ? (
                                  <input
                                    type="number"
                                    step="any"
                                    placeholder={getDynamicNumericPlaceholder(
                                      attr.codigo_atributo,
                                      attr.nombre_atributo,
                                    )}
                                    value={
                                      typeof val === 'string' || typeof val === 'number' ? val : ''
                                    }
                                    onChange={(e) =>
                                      handleFieldChange(
                                        mod.codigo_modulo,
                                        attr.codigo_atributo,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                                  />
                                ) : attr.codigo_atributo === 'marca' ||
                                  attr.codigo_atributo.startsWith('marca_') ||
                                  attr.rol_semantico === 'MARCA_PRINCIPAL' ? (
                                  <MarcaCombobox
                                    size="sm"
                                    value={typeof val === 'string' ? val : String(val || '')}
                                    onChange={(newVal) =>
                                      handleFieldChange(
                                        mod.codigo_modulo,
                                        attr.codigo_atributo,
                                        newVal,
                                      )
                                    }
                                    placeholder="Buscar o registrar marca..."
                                  />
                                ) : (
                                  <input
                                    type="text"
                                    placeholder={`Escribir ${attr.nombre_atributo.toLowerCase()}...`}
                                    value={
                                      typeof val === 'string' || typeof val === 'number'
                                        ? val
                                        : String(val || '')
                                    }
                                    onChange={(e) =>
                                      handleFieldChange(
                                        mod.codigo_modulo,
                                        attr.codigo_atributo,
                                        e.target.value,
                                      )
                                    }
                                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* MODO 2: PLACA TÉCNICA CORPORATIVA EN EL PDF */
        <div className="p-6 bg-slate-100/80">
          <div className="max-w-5xl mx-auto bg-white rounded-xl border-2 border-slate-800 shadow-lg overflow-hidden">
            {/* Encabezado estilo Informe Técnico PDF Mekanos */}
            <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b-4 border-blue-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-lg">
                  M
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
                    MEKANOS S.A.S. • FICHA TÉCNICA DE ACTIVO INDUSTRIAL
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {esquema.arquetipo.nombre_tipo.toUpperCase()}
                    {modeloSeleccionadoObj
                      ? ` — ${modeloSeleccionadoObj.marca} ${modeloSeleccionadoObj.modelo}`
                      : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {requiereContador && (
                  <span className="px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                    {etiquetaMedidor}
                  </span>
                )}
                {unidadUso === 'CAL' && (
                  <span className="px-2.5 py-1 rounded bg-slate-700/60 border border-slate-600 text-slate-300 text-xs font-bold">
                    Mantenimiento por Calendario
                  </span>
                )}
                <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200">
                  Vista Previa de Impresión PDF
                </span>
              </div>
            </div>

            {/* Franja de Contador Operativo Simulador (Horómetro / Ciclos / Odómetro) */}
            {requiereContador && (
              <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <span className="font-bold">Métrica de Operación:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-extrabold text-[11px] border border-blue-200">
                    {etiquetaMedidor}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {labelIntervencion}:
                    </span>
                    <span className="font-extrabold text-slate-900 font-mono">0 {sufijoUso}</span>
                  </div>
                  <div className="bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-semibold">
                      {labelAcumulado}:
                    </span>
                    <span className="font-extrabold text-slate-900 font-mono">0 {sufijoUso}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Franja de Indicadores Principales (KPIs Destacados de Cabecera) */}
            {kpisDestacados.length > 0 && (
              <div className="px-6 py-4 bg-blue-50/60 border-b border-slate-200">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900 mb-2.5 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span>Indicadores Principales de Placa (KPIs Destacados)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {kpisDestacados.map((kpi) => (
                    <div
                      key={kpi.key}
                      className="bg-white rounded-lg border border-blue-200 px-3.5 py-2.5 shadow-2xs"
                    >
                      <div className="text-[11px] font-semibold text-slate-500 truncate">
                        {kpi.label}
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {kpi.formattedValue}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bloques de Especificaciones por Parte / Subsistema */}
            <div className="p-6 space-y-6">
              {esquema.modulos.map((mod) => {
                const atributosPdf = mod.grupos.flatMap((g) =>
                  g.atributos.filter((a) => a.visible_en_pdf),
                );
                return (
                  <div
                    key={mod.id_modulo}
                    className="border border-slate-300 rounded-lg overflow-hidden"
                  >
                    <div className="bg-slate-800 text-white px-4 py-2 flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider">
                        ESPECIFICACIONES DE {mod.nombre_modulo.toUpperCase()}
                      </span>
                      <span className="text-[11px] text-slate-300">
                        {atributosPdf.length} parámetros en placa
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 divide-y sm:divide-y-0 sm:gap-px bg-slate-200">
                      {atributosPdf.map((attr) => {
                        const formatted = formatValueForPlate(mod.codigo_modulo, attr);
                        return (
                          <div
                            key={attr.id_atributo}
                            className="bg-white px-4 py-2.5 flex flex-col justify-between"
                          >
                            <span className="text-[11px] font-semibold text-slate-500">
                              {attr.nombre_atributo}
                            </span>
                            <span
                              className={`text-xs font-extrabold mt-0.5 ${
                                formatted === '—' ? 'text-slate-300' : 'text-slate-900'
                              }`}
                            >
                              {formatted}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Pie de Placa PDF: Planes Preventivos Asociados */}
              {esquema.planes_mantenimiento && esquema.planes_mantenimiento.length > 0 && (
                <div className="border border-emerald-300 rounded-lg overflow-hidden bg-emerald-50/30">
                  <div className="bg-emerald-800 text-white px-4 py-2 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    <span className="text-xs font-extrabold uppercase tracking-wider">
                      PROGRAMA DE MANTENIMIENTO PREVENTIVO SUGERIDO
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {esquema.planes_mantenimiento.map((plan) => (
                      <div
                        key={plan.id_plan}
                        className="bg-white rounded-lg border border-emerald-200 p-3 space-y-1"
                      >
                        <div className="text-xs font-bold text-slate-900">{plan.nombre_plan}</div>
                        <div className="text-xs font-semibold text-emerald-700">
                          Cada {plan.frecuencia_dias ?? 90} días
                          {plan.frecuencia_uso && sufijoUso
                            ? ` o ${plan.frecuencia_uso} ${sufijoUso}`
                            : ''}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {getCriterioIntervaloHumano(plan.criterio_intervalo, {
                            unidadUso: arq.unidad_uso,
                            etiquetaContador: arq.etiqueta_contador,
                            requiereHorometro: arq.requiere_horometro,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
