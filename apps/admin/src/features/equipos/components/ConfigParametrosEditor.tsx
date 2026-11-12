'use client';

import React, { useMemo, useState } from 'react';
import { EamSelect, type EamSelectOption } from '@/features/catalogos-eam';
import { useUnidadesEam } from '@/features/catalogos-eam/hooks/use-catalogos-eam';
import type { UnidadMedidaEam } from '@/features/catalogos-eam/api/catalogos-eam.service';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Sliders,
  Trash2,
  Zap,
} from 'lucide-react';
import { useParametrosTelemetriaTipoEquipo } from '../lib/equipos.service';
import type {
  ConfigParametros,
  ParametroCatalogoArquetipo,
  ParametroOverrideEquipo,
  TipoEquipo,
} from '../types';

export type { ConfigParametros };

interface ConfigParametrosEditorProps {
  tipoEquipo?: TipoEquipo;
  idTipoEquipo?: number | null;
  codigoTipo?: string | null;
  value?: ConfigParametros;
  onChange: (config: ConfigParametros) => void;
  disabled?: boolean;
}

function toNumOrUndefined(raw: string): number | undefined {
  if (raw.trim() === '') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inferirMagnitudLegacy(
  codigo?: string | null,
  unidad?: string | null,
): keyof NonNullable<ConfigParametros['unidades']> | null {
  const c = (codigo || '').toUpperCase();
  const u = (unidad || '').toLowerCase();
  if (c.includes('TEMP') || u.includes('°c') || u.includes('°f')) return 'temperatura';
  if (c.includes('PRES') || u === 'psi' || u === 'bar' || u === 'kpa') return 'presion';
  if (c.includes('VOLT') || c.includes('TENSION') || u === 'v' || u === 'vac' || u === 'vdc')
    return 'voltaje';
  if (c.includes('FREC') || u === 'hz') return 'frecuencia';
  if (c.includes('CORR') || c.includes('AMP') || u === 'a') return 'corriente';
  if (c.includes('RPM') || c.includes('VEL') || u === 'rpm') return 'velocidad';
  if (c.includes('VIB') || u === 'mm/s') return 'vibracion';
  if (c.includes('POT') || u === 'kw' || u === 'hp') return 'potencia';
  return null;
}

function formatRangeSummary(min?: number | null, max?: number | null, unidad?: string): string {
  const hasMin = min !== null && min !== undefined;
  const hasMax = max !== null && max !== undefined;
  const u = unidad ? ` ${unidad}` : '';
  if (hasMin && hasMax) return `[${min} — ${max}]${u}`;
  if (hasMin) return `[≥ ${min}]${u}`;
  if (hasMax) return `[≤ ${max}]${u}`;
  return 'Sin rango definido en catálogo';
}

function buildUnidadOptions(
  param: ParametroCatalogoArquetipo | null,
  todasUnidades: UnidadMedidaEam[],
  currentUnit?: string,
): EamSelectOption[] {
  const compatibles: EamSelectOption[] = [];
  const resto: EamSelectOption[] = [];
  const seen = new Set<string>();

  const pushOpt = (target: EamSelectOption[], u: UnidadMedidaEam, badge: string | null) => {
    const val = u.codigo || u.simbolo;
    const key = val.toLowerCase();
    if (!val || seen.has(key)) return;
    seen.add(key);
    target.push({
      value: val,
      label: `${u.simbolo} — ${u.nombre}`,
      badge,
      description: u.magnitud?.nombre_magnitud || u.tipo_magnitud,
    });
  };

  for (const u of todasUnidades) {
    if (!u.activo) continue;
    const matchesMagId =
      param?.id_magnitud != null && u.id_magnitud != null && u.id_magnitud === param.id_magnitud;
    const matchesTipoMag =
      param?.tipo_magnitud &&
      u.tipo_magnitud &&
      u.tipo_magnitud.toUpperCase() === param.tipo_magnitud.toUpperCase();

    if (matchesMagId || matchesTipoMag) {
      pushOpt(
        compatibles,
        u,
        param?.nombre_magnitud ? `Compatible · ${param.nombre_magnitud}` : `Compatible`,
      );
    } else {
      pushOpt(resto, u, u.tipo_magnitud || null);
    }
  }

  const extras: EamSelectOption[] = [];
  const checkLiteral = (literal?: string | null, tag?: string) => {
    const clean = (literal || '').trim();
    if (!clean) return;
    if (seen.has(clean.toLowerCase())) return;
    seen.add(clean.toLowerCase());
    extras.push({
      value: clean,
      label: clean,
      badge: tag || 'Catálogo',
      description: 'Unidad configurada',
    });
  };

  checkLiteral(param?.unidad_medida, 'Estándar');
  checkLiteral(currentUnit, 'Actual');

  return [...extras, ...compatibles, ...resto];
}

const EMPTY_CONFIG_PARAMETROS: ConfigParametros = {};

function resolveOverrideForParam(
  p: ParametroCatalogoArquetipo,
  config: ConfigParametros,
): ParametroOverrideEquipo {
  const porParametro = config.por_parametro || {};
  const idKey = String(p.id_parametro_medicion);
  const byPorParam =
    porParametro[idKey] ||
    porParametro[p.codigo_parametro] ||
    porParametro[p.codigo_parametro.toUpperCase()];

  const legacyRange =
    config.rangos?.[p.codigo_parametro] || config.rangos?.[p.codigo_parametro.toUpperCase()];

  const legacyMag = inferirMagnitudLegacy(p.codigo_parametro, p.unidad_medida);
  const legacyUnit = legacyMag ? config.unidades?.[legacyMag] : undefined;

  return {
    id_parametro_medicion: p.id_parametro_medicion,
    codigo_parametro: p.codigo_parametro,
    nombre_parametro: p.nombre_parametro,
    nombre_sistema: p.nombre_sistema || undefined,
    unidad_medida: byPorParam?.unidad_medida || legacyUnit || undefined,
    min_normal: byPorParam?.min_normal ?? legacyRange?.min_normal,
    max_normal: byPorParam?.max_normal ?? legacyRange?.max_normal,
    min_critico: byPorParam?.min_critico ?? legacyRange?.min_critico,
    max_critico: byPorParam?.max_critico ?? legacyRange?.max_critico,
    valor_ideal: byPorParam?.valor_ideal ?? legacyRange?.valor_ideal,
  };
}

function isParamCustomized(p: ParametroCatalogoArquetipo, ov: ParametroOverrideEquipo): boolean {
  const unitChanged =
    Boolean(ov.unidad_medida && ov.unidad_medida.trim() !== '') &&
    ov.unidad_medida!.trim() !== (p.unidad_medida || '').trim();
  const minNChanged =
    ov.min_normal !== undefined && ov.min_normal !== (p.valor_minimo_normal ?? undefined);
  const maxNChanged =
    ov.max_normal !== undefined && ov.max_normal !== (p.valor_maximo_normal ?? undefined);
  const minCChanged =
    ov.min_critico !== undefined && ov.min_critico !== (p.valor_minimo_critico ?? undefined);
  const maxCChanged =
    ov.max_critico !== undefined && ov.max_critico !== (p.valor_maximo_critico ?? undefined);
  return unitChanged || minNChanged || maxNChanged || minCChanged || maxCChanged;
}

export function ConfigParametrosEditor({
  tipoEquipo,
  idTipoEquipo,
  codigoTipo,
  value,
  onChange,
  disabled = false,
}: ConfigParametrosEditorProps) {
  const { data: parametrosCatalogo = [], isLoading: isLoadingParams } =
    useParametrosTelemetriaTipoEquipo(idTipoEquipo);
  const { data: unidadesEam = [] } = useUnidadesEam();

  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newSistema, setNewSistema] = useState('');
  const [newUnidad, setNewUnidad] = useState('');
  const [newMinNormal, setNewMinNormal] = useState('');
  const [newMaxNormal, setNewMaxNormal] = useState('');
  const [newMinCritico, setNewMinCritico] = useState('');
  const [newMaxCritico, setNewMaxCritico] = useState('');

  const configActual: ConfigParametros = value || EMPTY_CONFIG_PARAMETROS;
  const adicionales = Array.isArray(configActual.parametros_adicionales)
    ? configActual.parametros_adicionales
    : [];

  const getOverrideForParam = (p: ParametroCatalogoArquetipo): ParametroOverrideEquipo =>
    resolveOverrideForParam(p, configActual);

  const emitConfig = (next: ConfigParametros) => {
    const cleaned: ConfigParametros = { ...next };
    if (cleaned.por_parametro && Object.keys(cleaned.por_parametro).length === 0) {
      delete cleaned.por_parametro;
    }
    if (cleaned.rangos && Object.keys(cleaned.rangos).length === 0) {
      delete cleaned.rangos;
    }
    if (cleaned.unidades && Object.keys(cleaned.unidades).length === 0) {
      delete cleaned.unidades;
    }
    if (cleaned.parametros_adicionales && cleaned.parametros_adicionales.length === 0) {
      delete cleaned.parametros_adicionales;
    }
    onChange(cleaned);
  };

  const updateParamOverride = (
    p: ParametroCatalogoArquetipo,
    patch: Partial<ParametroOverrideEquipo>,
  ) => {
    const current = getOverrideForParam(p);
    const merged: ParametroOverrideEquipo = {
      ...current,
      ...patch,
      id_parametro_medicion: p.id_parametro_medicion,
      codigo_parametro: p.codigo_parametro,
      nombre_parametro: p.nombre_parametro,
      nombre_sistema: p.nombre_sistema || undefined,
    };

    // Normalizar campos que regresan exactamente al catálogo
    if (merged.unidad_medida && merged.unidad_medida.trim() === (p.unidad_medida || '').trim()) {
      delete merged.unidad_medida;
    }
    if (merged.min_normal === (p.valor_minimo_normal ?? undefined)) {
      delete merged.min_normal;
    }
    if (merged.max_normal === (p.valor_maximo_normal ?? undefined)) {
      delete merged.max_normal;
    }
    if (merged.min_critico === (p.valor_minimo_critico ?? undefined)) {
      delete merged.min_critico;
    }
    if (merged.max_critico === (p.valor_maximo_critico ?? undefined)) {
      delete merged.max_critico;
    }

    const idKey = String(p.id_parametro_medicion);
    const nextPorParam = { ...(configActual.por_parametro || {}) };
    const nextRangos = { ...(configActual.rangos || {}) };

    if (!isParamCustomized(p, merged)) {
      delete nextPorParam[idKey];
      delete nextPorParam[p.codigo_parametro];
      delete nextRangos[p.codigo_parametro];
    } else {
      nextPorParam[idKey] = merged;
      const rangoMirror = {
        ...(merged.min_normal !== undefined ? { min_normal: merged.min_normal } : {}),
        ...(merged.max_normal !== undefined ? { max_normal: merged.max_normal } : {}),
        ...(merged.min_critico !== undefined ? { min_critico: merged.min_critico } : {}),
        ...(merged.max_critico !== undefined ? { max_critico: merged.max_critico } : {}),
      };
      if (Object.keys(rangoMirror).length > 0) {
        nextRangos[p.codigo_parametro] = rangoMirror;
      } else {
        delete nextRangos[p.codigo_parametro];
      }
    }

    emitConfig({
      ...configActual,
      por_parametro: nextPorParam,
      rangos: nextRangos,
    });
  };

  const resetParamOverride = (p: ParametroCatalogoArquetipo) => {
    const idKey = String(p.id_parametro_medicion);
    const nextPorParam = { ...(configActual.por_parametro || {}) };
    const nextRangos = { ...(configActual.rangos || {}) };
    delete nextPorParam[idKey];
    delete nextPorParam[p.codigo_parametro];
    delete nextPorParam[p.codigo_parametro.toUpperCase()];
    delete nextRangos[p.codigo_parametro];
    delete nextRangos[p.codigo_parametro.toUpperCase()];
    emitConfig({
      ...configActual,
      por_parametro: nextPorParam,
      rangos: nextRangos,
    });
  };

  const resetAll = () => {
    const next: ConfigParametros = { ...configActual };
    delete next.por_parametro;
    delete next.rangos;
    delete next.unidades;
    delete next.parametros_adicionales;
    emitConfig(next);
  };

  const customizedCount = useMemo(() => {
    return parametrosCatalogo.filter((p) =>
      isParamCustomized(p, resolveOverrideForParam(p, configActual)),
    ).length;
  }, [parametrosCatalogo, configActual]);

  const allUomOptions = useMemo(
    () => buildUnidadOptions(null, unidadesEam, newUnidad),
    [unidadesEam, newUnidad],
  );

  const handleAddCustom = () => {
    const nombre = newNombre.trim();
    const unidad = newUnidad.trim();
    if (!nombre || !unidad) return;

    const slug = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 28);
    const codigo = `EQ_CUSTOM_${slug}_${Date.now().toString(36).toUpperCase().slice(-4)}`;

    const nuevo: ParametroOverrideEquipo = {
      codigo_parametro: codigo,
      nombre_parametro: nombre,
      nombre_sistema: newSistema.trim() || undefined,
      unidad_medida: unidad,
      min_normal: toNumOrUndefined(newMinNormal),
      max_normal: toNumOrUndefined(newMaxNormal),
      min_critico: toNumOrUndefined(newMinCritico),
      max_critico: toNumOrUndefined(newMaxCritico),
      es_adicional_equipo: true,
    };

    const nextPorParam = { ...(configActual.por_parametro || {}), [codigo]: nuevo };
    const nextAdicionales = [...adicionales, nuevo];

    emitConfig({
      ...configActual,
      por_parametro: nextPorParam,
      parametros_adicionales: nextAdicionales,
    });

    setNewNombre('');
    setNewSistema('');
    setNewUnidad('');
    setNewMinNormal('');
    setNewMaxNormal('');
    setNewMinCritico('');
    setNewMaxCritico('');
    setShowAddCustom(false);
  };

  const handleRemoveAdicional = (idx: number) => {
    const target = adicionales[idx];
    const nextAdicionales = adicionales.filter((_, i) => i !== idx);
    const nextPorParam = { ...(configActual.por_parametro || {}) };
    if (target?.codigo_parametro) {
      delete nextPorParam[target.codigo_parametro];
    }
    emitConfig({
      ...configActual,
      por_parametro: nextPorParam,
      parametros_adicionales: nextAdicionales,
    });
  };

  const archetypeLabel = codigoTipo || tipoEquipo || 'EAM';

  return (
    <div className="space-y-4">
      {/* Cabecera Ejecutiva */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-700 border border-blue-200">
            <Sliders className="h-4 w-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                Configuración de Parámetros y Rangos de Telemetría
              </h4>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                {archetypeLabel}
              </span>
              {customizedCount + adicionales.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                  <Zap className="h-3 w-3" />
                  {customizedCount + adicionales.length} personalizado
                  {customizedCount + adicionales.length === 1 ? '' : 's'} para este equipo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  Usando estándar del catálogo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Sobrescribe únicamente los parámetros que operan con umbrales o unidades distintas al
              catálogo estándar del Tipo de Equipo. Lo que dejes vacío heredará automáticamente el
              rango estándar.
            </p>
          </div>
        </div>

        {(customizedCount > 0 || adicionales.length > 0) && !disabled && (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 self-start sm:self-center shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
            Restaurar todo al estándar
          </button>
        )}
      </div>

      {/* Estado de carga */}
      {isLoadingParams && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 py-8 text-xs font-semibold text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          Cargando parámetros de telemetría reales para {archetypeLabel}...
        </div>
      )}

      {/* Parámetros reales del Tipo de Equipo */}
      {!isLoadingParams && parametrosCatalogo.length > 0 && (
        <div className="space-y-3">
          {parametrosCatalogo.map((param) => {
            const ov = getOverrideForParam(param);
            const customized = isParamCustomized(param, ov);
            const unidadOptions = buildUnidadOptions(param, unidadesEam, ov.unidad_medida);
            const unitValue = ov.unidad_medida || param.unidad_medida || '';

            const effMinN = ov.min_normal ?? param.valor_minimo_normal ?? undefined;
            const effMaxN = ov.max_normal ?? param.valor_maximo_normal ?? undefined;
            const effMinC = ov.min_critico ?? param.valor_minimo_critico ?? undefined;
            const effMaxC = ov.max_critico ?? param.valor_maximo_critico ?? undefined;

            const hasInvalidRange =
              (effMinN !== undefined && effMaxN !== undefined && effMinN > effMaxN) ||
              (effMinC !== undefined && effMaxC !== undefined && effMinC > effMaxC) ||
              (effMinC !== undefined && effMinN !== undefined && effMinC > effMinN) ||
              (effMaxC !== undefined && effMaxN !== undefined && effMaxC < effMaxN);

            return (
              <div
                key={param.id_parametro_medicion}
                className={`rounded-xl border p-4 transition-all ${
                  customized
                    ? 'border-amber-300 bg-amber-50/35 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Fila título y metadata */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Activity className="h-4 w-4 text-sky-600 shrink-0" />
                      <span className="text-sm font-bold text-slate-900">
                        {param.nombre_parametro}
                      </span>
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
                        {param.codigo_parametro}
                      </code>
                      {param.nombre_sistema && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                          <Layers className="h-3 w-3" />
                          {param.nombre_sistema}
                        </span>
                      )}
                      {param.es_critico_seguridad && (
                        <span className="inline-flex items-center rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase">
                          Seguridad
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        Estándar catálogo:{' '}
                        <strong className="font-mono text-slate-900">
                          {formatRangeSummary(
                            param.valor_minimo_normal,
                            param.valor_maximo_normal,
                            param.unidad_medida,
                          )}
                        </strong>
                      </span>
                      {(param.valor_minimo_critico !== null &&
                        param.valor_minimo_critico !== undefined) ||
                      (param.valor_maximo_critico !== null &&
                        param.valor_maximo_critico !== undefined) ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-50/70 px-2 py-0.5 text-rose-700 font-medium">
                          Crítico catálogo: [{param.valor_minimo_critico ?? '—'} |{' '}
                          {param.valor_maximo_critico ?? '—'}] {param.unidad_medida}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {customized ? (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-1 text-[11px] font-bold text-amber-900">
                          <Zap className="h-3 w-3 text-amber-600" />
                          Personalizado para este equipo
                        </span>
                        {!disabled && (
                          <button
                            type="button"
                            onClick={() => resetParamOverride(param)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Volver a los valores estándar del catálogo"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Restaurar estándar
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                        Hereda estándar
                      </span>
                    )}
                  </div>
                </div>

                {/* Controles unificados: Unidad + 4 umbrales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3">
                  <div className="lg:col-span-4 min-w-0">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide mb-1">
                      Unidad Efectiva
                    </label>
                    <EamSelect
                      value={unitValue}
                      onChange={(nextUnit) =>
                        updateParamOverride(param, {
                          unidad_medida: nextUnit || param.unidad_medida,
                        })
                      }
                      options={unidadOptions}
                      size="sm"
                      disabled={disabled}
                      usePortal={true}
                      minDropdownWidth={300}
                      searchPlaceholder="Buscar unidad o símbolo..."
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-1">
                      Mín. Normal
                    </label>
                    <input
                      type="number"
                      step="any"
                      disabled={disabled}
                      value={ov.min_normal ?? ''}
                      onChange={(e) =>
                        updateParamOverride(param, {
                          min_normal: toNumOrUndefined(e.target.value),
                        })
                      }
                      placeholder={
                        param.valor_minimo_normal !== null &&
                        param.valor_minimo_normal !== undefined
                          ? String(param.valor_minimo_normal)
                          : 'Opcional'
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-bold text-emerald-700 uppercase tracking-wide mb-1">
                      Máx. Normal
                    </label>
                    <input
                      type="number"
                      step="any"
                      disabled={disabled}
                      value={ov.max_normal ?? ''}
                      onChange={(e) =>
                        updateParamOverride(param, {
                          max_normal: toNumOrUndefined(e.target.value),
                        })
                      }
                      placeholder={
                        param.valor_maximo_normal !== null &&
                        param.valor_maximo_normal !== undefined
                          ? String(param.valor_maximo_normal)
                          : 'Opcional'
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-bold text-rose-700 uppercase tracking-wide mb-1">
                      Mín. Crítico
                    </label>
                    <input
                      type="number"
                      step="any"
                      disabled={disabled}
                      value={ov.min_critico ?? ''}
                      onChange={(e) =>
                        updateParamOverride(param, {
                          min_critico: toNumOrUndefined(e.target.value),
                        })
                      }
                      placeholder={
                        param.valor_minimo_critico !== null &&
                        param.valor_minimo_critico !== undefined
                          ? String(param.valor_minimo_critico)
                          : 'Opcional'
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:bg-slate-100"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-[11px] font-bold text-rose-700 uppercase tracking-wide mb-1">
                      Máx. Crítico
                    </label>
                    <input
                      type="number"
                      step="any"
                      disabled={disabled}
                      value={ov.max_critico ?? ''}
                      onChange={(e) =>
                        updateParamOverride(param, {
                          max_critico: toNumOrUndefined(e.target.value),
                        })
                      }
                      placeholder={
                        param.valor_maximo_critico !== null &&
                        param.valor_maximo_critico !== undefined
                          ? String(param.valor_maximo_critico)
                          : 'Opcional'
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:bg-slate-100"
                    />
                  </div>
                </div>

                {hasInvalidRange && (
                  <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Revisa la coherencia matemática: Crítico Mín ≤ Normal Mín ≤ Normal Máx ≤ Crítico
                    Máx.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Estado vacío si el arquetipo todavía no tiene parámetros en sus protocolos */}
      {!isLoadingParams && parametrosCatalogo.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center space-y-1.5">
          <Cpu className="h-6 w-6 text-slate-400 mx-auto" />
          <p className="text-xs font-bold text-slate-800">
            Este Tipo de Equipo ({archetypeLabel}) aún no tiene puntos de medición vinculados en sus
            protocolos de servicio.
          </p>
          <p className="text-[11px] text-slate-500 max-w-xl mx-auto">
            Puedes registrar sus parámetros maestros en{' '}
            <strong>Hub EAM → Protocolos y Actividades</strong> o agregar un parámetro específico
            para este activo usando el botón inferior.
          </p>
        </div>
      )}

      {/* Parámetros adicionales específicos de este activo */}
      {adicionales.length > 0 && (
        <div className="space-y-2 pt-1">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-600" />
            Parámetros Adicionales Exclusivos de este Activo ({adicionales.length})
          </h5>
          <div className="space-y-2">
            {adicionales.map((ad, idx) => (
              <div
                key={ad.codigo_parametro || `${ad.nombre_parametro}-${idx}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/40 px-4 py-3"
              >
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {ad.nombre_parametro || ad.codigo_parametro}
                    </span>
                    {ad.nombre_sistema && (
                      <span className="rounded bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        {ad.nombre_sistema}
                      </span>
                    )}
                    <span className="rounded bg-slate-900 px-2 py-0.5 font-mono text-[10px] font-bold text-white">
                      {ad.unidad_medida}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-600">
                    Normal: {formatRangeSummary(ad.min_normal, ad.max_normal, ad.unidad_medida)}
                    {(ad.min_critico !== undefined || ad.max_critico !== undefined) &&
                      ` • Crítico: [${ad.min_critico ?? '—'} | ${ad.max_critico ?? '—'}] ${ad.unidad_medida || ''}`}
                  </p>
                </div>

                {!disabled && (
                  <button
                    type="button"
                    onClick={() => handleRemoveAdicional(idx)}
                    className="inline-flex items-center gap-1 self-start sm:self-center rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón / Constructor inline para parámetro específico del equipo */}
      {!disabled && (
        <div className="pt-1">
          {!showAddCustom ? (
            <button
              type="button"
              onClick={() => setShowAddCustom(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50/50 px-4 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Agregar parámetro específico para este equipo
            </button>
          ) : (
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold uppercase tracking-wider text-blue-950">
                  Nuevo Instrumento / Parámetro Específico de este Activo
                </h5>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nombre del Parámetro *
                  </label>
                  <input
                    type="text"
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Ej: Temperatura Variador Frecuencia Cabina"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Subsistema (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newSistema}
                    onChange={(e) => setNewSistema(e.target.value)}
                    placeholder="Ej: Control y Maniobra"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
                <div className="lg:col-span-4 min-w-0">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Unidad de Medida *
                  </label>
                  <EamSelect
                    value={newUnidad}
                    onChange={setNewUnidad}
                    options={allUomOptions}
                    placeholder="Seleccionar unidad..."
                    size="sm"
                    usePortal={true}
                    minDropdownWidth={300}
                    searchPlaceholder="Buscar unidad, símbolo o magnitud..."
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                    Mín. Normal
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newMinNormal}
                    onChange={(e) => setNewMinNormal(e.target.value)}
                    placeholder="Ej: 10"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-emerald-700 mb-1">
                    Máx. Normal
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newMaxNormal}
                    onChange={(e) => setNewMaxNormal(e.target.value)}
                    placeholder="Ej: 55"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-rose-700 mb-1">
                    Mín. Crítico
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newMinCritico}
                    onChange={(e) => setNewMinCritico(e.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-bold text-rose-700 mb-1">
                    Máx. Crítico
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newMaxCritico}
                    onChange={(e) => setNewMaxCritico(e.target.value)}
                    placeholder="Ej: 70"
                    className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={!newNombre.trim() || !newUnidad.trim()}
                  onClick={handleAddCustom}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Guardar parámetro en equipo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ConfigParametrosEditor;
