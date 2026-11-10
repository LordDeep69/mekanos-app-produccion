'use client';

import { cn } from '@/lib/utils';
import { Plus, Settings2, Smartphone, Trash2, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';

export type SemaforoCodigo = 'B' | 'R' | 'M' | 'C' | 'NA';

export interface OpcionInputDeclarativo {
  valor: string;
  etiqueta: string;
  semaforo: SemaforoCodigo;
}

export interface ConfigInputDeclarativo {
  opciones?: OpcionInputDeclarativo[];
  permitirTextoLibre?: boolean;
  etiquetaTextoLibre?: string;
  placeholder?: string;
  unidad?: string;
}

export interface PresetModoRespuesta {
  value: string;
  label: string;
  shortLabel: string;
  description: string;
  previewBadges: string[];
  autoRolSemantico?: string;
}

export const MODO_RESPUESTA_PRESETS: PresetModoRespuesta[] = [
  {
    value: 'ESCALA_ESTADO',
    label: '🎛️ Evaluación (B / R / M / C / NA)',
    shortLabel: 'B / R / M / C / NA',
    description: 'Escala estándar MEKANOS con Bueno, Regular, Malo, Corregido y No Aplica',
    previewBadges: ['B Bueno', 'R Regular', 'M Malo', 'C Corregido', 'NA'],
  },
  {
    value: 'BINARIO',
    label: '✔️ Binario (Sí / No)',
    shortLabel: 'SÍ / NO',
    description: 'Confirmación rápida de cumplimiento o verificación binaria',
    previewBadges: ['SÍ', 'NO', 'N/A'],
  },
  {
    value: 'CONFORMIDAD',
    label: '🛡️ Conformidad (Conforme / No Conforme)',
    shortLabel: 'Conforme / No Conforme',
    description: 'Evaluación normativa o de seguridad industrial',
    previewBadges: ['Conforme', 'No Conforme', 'N/A'],
  },
  {
    value: 'NIVEL',
    label: '🛢️ Nivel (Lleno / 3/4 / 1/2 / 1/4 / Vacío)',
    shortLabel: 'Nivel (Lleno..Vacío)',
    description: 'Medición visual por fracciones de nivel de tanque o fluido',
    previewBadges: ['Lleno', '3/4', '1/2', '1/4', 'Vacío'],
  },
  {
    value: 'ESTADO_OPERATIVO',
    label: '⚡ Estado Operativo (Operativo / Parado / Falla)',
    shortLabel: 'Operativo / Parado / Falla',
    description: 'Diagnóstico rápido de condición de marcha del activo',
    previewBadges: ['Operativo', 'Parado', 'Falla'],
  },
  {
    value: 'SUBSISTEMAS_EQUIPO',
    label: '🧩 Subsistemas del Equipo (Dinámico)',
    shortLabel: 'Subsistemas Dinámicos',
    description: 'Lista dinámica multi-selección de los subsistemas reales del equipo',
    previewBadges: ['[✓ Subsistema 1]', '[✓ Subsistema 2]'],
  },
  {
    value: 'LECTURA_CONTADOR',
    label: '🔢 Lectura de Contador / Horómetro / Ciclos',
    shortLabel: 'Lectura Contador',
    description: 'Entrada numérica de contador que actualiza automáticamente la hoja de vida',
    previewBadges: ['1234 hrs / ciclos'],
    autoRolSemantico: 'LECTURA_CONTADOR_ACTIVO',
  },
  {
    value: 'PERSONALIZADO',
    label: '✨ Botones / Inputs Personalizados...',
    shortLabel: 'Personalizado',
    description: 'Define opciones a la medida con etiqueta y semáforo visual (B / R / M / C / NA)',
    previewBadges: ['Opción A', 'Opción B'],
  },
];

export const ROL_SEMANTICO_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Ninguno (Actividad estándar de checklist)' },
  { value: 'LECTURA_CONTADOR_ACTIVO', label: '🔢 LECTURA_CONTADOR_ACTIVO (Actualiza horómetro / ciclos / km)' },
  { value: 'CORR_ESTADO_INICIAL', label: '⚡ CORR_ESTADO_INICIAL (Sección Correctivo: Estado Inicial)' },
  { value: 'CORR_ESTADO_FINAL', label: '🏁 CORR_ESTADO_FINAL (Sección Correctivo: Estado Final)' },
  { value: 'CORR_SISTEMAS_AFECTADOS', label: '🧩 CORR_SISTEMAS_AFECTADOS (Sección Correctivo: Subsistemas)' },
  { value: 'CORR_PROBLEMA', label: '⚠️ CORR_PROBLEMA (Sección Correctivo: Problema Reportado)' },
  { value: 'CORR_FALLAS', label: '🔍 CORR_FALLAS (Sección Correctivo: Fallas Observadas)' },
  { value: 'CORR_DIAGNOSTICO', label: '🩺 CORR_DIAGNOSTICO (Sección Correctivo: Diagnóstico Técnico)' },
  { value: 'CORR_TRABAJOS', label: '🔧 CORR_TRABAJOS (Sección Correctivo: Trabajos Realizados)' },
  { value: 'CORR_PENDIENTES', label: '📌 CORR_PENDIENTES (Sección Correctivo: Trabajos Pendientes)' },
  { value: 'CORR_RECOMENDACIONES', label: '💡 CORR_RECOMENDACIONES (Sección Correctivo: Recomendaciones)' },
  { value: 'CORR_REPUESTOS', label: '🔩 CORR_REPUESTOS (Sección Correctivo: Repuestos Utilizados)' },
  { value: 'CORR_MATERIALES', label: '📦 CORR_MATERIALES (Sección Correctivo: Materiales e Insumos)' },
];

export const SEMAFORO_META: Record<
  SemaforoCodigo,
  { label: string; badgeClass: string; activeBtnClass: string }
> = {
  B: {
    label: 'B · Bueno',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    activeBtnClass: 'bg-emerald-600 text-white border-emerald-700',
  },
  R: {
    label: 'R · Regular',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    activeBtnClass: 'bg-amber-500 text-white border-amber-600',
  },
  M: {
    label: 'M · Malo',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    activeBtnClass: 'bg-rose-600 text-white border-rose-700',
  },
  C: {
    label: 'C · Corregido',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    activeBtnClass: 'bg-blue-600 text-white border-blue-700',
  },
  NA: {
    label: 'NA · No Aplica',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-300',
    activeBtnClass: 'bg-slate-600 text-white border-slate-700',
  },
};

const DEFAULT_CUSTOM_OPTIONS: OpcionInputDeclarativo[] = [
  { valor: 'OP_1', etiqueta: 'Exacta', semaforo: 'B' },
  { valor: 'OP_2', etiqueta: 'Leve', semaforo: 'R' },
  { valor: 'OP_3', etiqueta: 'Crítico', semaforo: 'M' },
];

export function parseConfigInputJson(raw: any): ConfigInputDeclarativo {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' ? raw : {};
}

export function getPresetOptions(
  tipoControlInput?: string | null,
  configInputJson?: any,
): OpcionInputDeclarativo[] {
  const tipo = (tipoControlInput || 'ESCALA_ESTADO').toUpperCase();
  const cfg = parseConfigInputJson(configInputJson);
  if (tipo === 'PERSONALIZADO' && Array.isArray(cfg.opciones) && cfg.opciones.length > 0) {
    return cfg.opciones;
  }
  switch (tipo) {
    case 'BINARIO':
      return [
        { valor: 'SI', etiqueta: 'SÍ', semaforo: 'B' },
        { valor: 'NO', etiqueta: 'NO', semaforo: 'M' },
        { valor: 'NA', etiqueta: 'N/A', semaforo: 'NA' },
      ];
    case 'CONFORMIDAD':
      return [
        { valor: 'CONFORME', etiqueta: 'Conforme', semaforo: 'B' },
        { valor: 'NO_CONFORME', etiqueta: 'No Conforme', semaforo: 'M' },
        { valor: 'NA', etiqueta: 'N/A', semaforo: 'NA' },
      ];
    case 'NIVEL':
      return [
        { valor: 'LLENO', etiqueta: 'Lleno', semaforo: 'B' },
        { valor: '3_4', etiqueta: '3/4', semaforo: 'B' },
        { valor: '1_2', etiqueta: '1/2', semaforo: 'R' },
        { valor: '1_4', etiqueta: '1/4', semaforo: 'R' },
        { valor: 'VACIO', etiqueta: 'Vacío', semaforo: 'M' },
      ];
    case 'ESTADO_OPERATIVO':
      return [
        { valor: 'OPERATIVO', etiqueta: 'Operativo', semaforo: 'B' },
        { valor: 'PARADO', etiqueta: 'Parado', semaforo: 'R' },
        { valor: 'FALLA', etiqueta: 'Falla', semaforo: 'M' },
      ];
    case 'ESCALA_ESTADO':
    default:
      return [
        { valor: 'B', etiqueta: 'B · Bueno', semaforo: 'B' },
        { valor: 'R', etiqueta: 'R · Regular', semaforo: 'R' },
        { valor: 'M', etiqueta: 'M · Malo', semaforo: 'M' },
        { valor: 'C', etiqueta: 'C · Corregido', semaforo: 'C' },
        { valor: 'NA', etiqueta: 'N/A', semaforo: 'NA' },
      ];
  }
}

export function getModoRespuestaBadgeLabel(
  tipoControlInput?: string | null,
  configInputJson?: any,
): string {
  const tipo = (tipoControlInput || 'ESCALA_ESTADO').toUpperCase();
  if (tipo === 'PERSONALIZADO') {
    const cfg = parseConfigInputJson(configInputJson);
    if (Array.isArray(cfg.opciones) && cfg.opciones.length > 0) {
      return cfg.opciones.map((o) => o.etiqueta).join(' / ');
    }
    return 'Personalizado';
  }
  const found = MODO_RESPUESTA_PRESETS.find((p) => p.value === tipo);
  return found ? found.shortLabel : 'B / R / M / C / NA';
}

interface ModoRespuestaSelectorProps {
  tipoControlInput: string;
  configInputJson: ConfigInputDeclarativo | null | undefined;
  rolSemantico: string;
  onChange: (next: {
    tipoControlInput: string;
    configInputJson: ConfigInputDeclarativo | null;
    rolSemantico: string;
  }) => void;
  compact?: boolean;
}

export function ModoRespuestaSelector({
  tipoControlInput,
  configInputJson,
  rolSemantico,
  onChange,
  compact = false,
}: ModoRespuestaSelectorProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const normalizedTipo = tipoControlInput || 'ESCALA_ESTADO';
  const cfg = useMemo(() => parseConfigInputJson(configInputJson), [configInputJson]);
  const customOptions: OpcionInputDeclarativo[] = useMemo(() => {
    if (Array.isArray(cfg.opciones) && cfg.opciones.length > 0) {
      return cfg.opciones;
    }
    return DEFAULT_CUSTOM_OPTIONS;
  }, [cfg.opciones]);

  const handleTipoChange = (newTipo: string) => {
    const preset = MODO_RESPUESTA_PRESETS.find((p) => p.value === newTipo);
    let nextRol = rolSemantico;
    if (newTipo === 'LECTURA_CONTADOR' && !nextRol) {
      nextRol = 'LECTURA_CONTADOR_ACTIVO';
    } else if (newTipo !== 'LECTURA_CONTADOR' && nextRol === 'LECTURA_CONTADOR_ACTIVO') {
      nextRol = '';
    }

    let nextCfg: ConfigInputDeclarativo | null = null;
    if (newTipo === 'PERSONALIZADO') {
      nextCfg = {
        ...cfg,
        opciones: customOptions,
      };
      if (compact) setModalOpen(true);
    } else if (preset?.autoRolSemantico && !nextRol) {
      nextRol = preset.autoRolSemantico;
    }

    onChange({
      tipoControlInput: newTipo,
      configInputJson: nextCfg,
      rolSemantico: nextRol,
    });
  };

  const updateCustomOptions = (nextOpts: OpcionInputDeclarativo[], extra?: Partial<ConfigInputDeclarativo>) => {
    onChange({
      tipoControlInput: 'PERSONALIZADO',
      configInputJson: {
        ...cfg,
        ...extra,
        opciones: nextOpts,
      },
      rolSemantico,
    });
  };

  const addCustomOption = () => {
    const idx = customOptions.length + 1;
    updateCustomOptions([
      ...customOptions,
      { valor: `OP_${idx}`, etiqueta: `Opción ${idx}`, semaforo: 'B' },
    ]);
  };

  const removeCustomOption = (index: number) => {
    if (customOptions.length <= 1) return;
    updateCustomOptions(customOptions.filter((_, i) => i !== index));
  };

  const updateOptionField = (
    index: number,
    patch: Partial<OpcionInputDeclarativo>,
  ) => {
    const next = customOptions.map((op, i) => {
      if (i !== index) return op;
      const updated = { ...op, ...patch };
      if (patch.etiqueta !== undefined) {
        const slug = patch.etiqueta
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '')
          .slice(0, 24);
        if (slug) updated.valor = slug;
      }
      return updated;
    });
    updateCustomOptions(next);
  };

  const renderConfiguratorPanel = () => (
    <div className="space-y-3 p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/90">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-extrabold text-indigo-950">
            ✨ Configurador de Botones / Respuestas Personalizadas
          </p>
          <p className="text-[11px] text-indigo-700">
            Cada botón define su etiqueta visible en campo y su semáforo (B / R / M / C / NA) para reportes y alertas.
          </p>
        </div>
        <button
          type="button"
          onClick={addCustomOption}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 inline-flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Agregar Opción</span>
        </button>
      </div>

      <div className="space-y-2">
        {customOptions.map((op, idx) => (
          <div
            key={`${idx}-${op.valor}`}
            className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 rounded-xl border border-indigo-100"
          >
            <span className="text-[11px] font-mono font-bold text-slate-400 w-5 text-center">
              #{idx + 1}
            </span>
            <input
              type="text"
              value={op.etiqueta}
              onChange={(e) => updateOptionField(idx, { etiqueta: e.target.value })}
              placeholder="Etiqueta del botón (Ej: Exacta, Leve, Crítico...)"
              className="flex-1 min-w-[140px] px-2.5 py-1.5 text-xs font-semibold border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-500"
            />
            <select
              value={op.semaforo}
              onChange={(e) => updateOptionField(idx, { semaforo: e.target.value as SemaforoCodigo })}
              className="px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded-lg bg-slate-50"
              title="Semáforo semántico equivalente"
            >
              {(['B', 'R', 'M', 'C', 'NA'] as SemaforoCodigo[]).map((cod) => (
                <option key={cod} value={cod}>
                  {SEMAFORO_META[cod].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={customOptions.length <= 1}
              onClick={() => removeCustomOption(idx)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-30 cursor-pointer"
              title="Quitar opción"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Campo de texto libre adicional opcional */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(cfg.permitirTextoLibre)}
            onChange={(e) =>
              updateCustomOptions(customOptions, {
                permitirTextoLibre: e.target.checked,
              })
            }
            className="h-3.5 w-3.5 rounded text-indigo-600 border-slate-300"
          />
          <span>Incluir campo de detalle/valor adicional para el técnico</span>
        </label>
        {cfg.permitirTextoLibre && (
          <input
            type="text"
            value={cfg.etiquetaTextoLibre || ''}
            onChange={(e) =>
              updateCustomOptions(customOptions, {
                etiquetaTextoLibre: e.target.value,
              })
            }
            placeholder="Etiqueta (ej: Desfase medido o detalle)"
            className="flex-1 min-w-[180px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg"
          />
        )}
      </div>

      {/* Vista Previa en Vivo estilo App Móvil */}
      <div className="p-3 rounded-xl bg-slate-900 text-white space-y-2">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
          <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
          <span>Vista Previa en App Móvil &amp; Portal Web</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {customOptions.map((op, i) => (
            <span
              key={i}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-bold border shadow-2xs',
                SEMAFORO_META[op.semaforo]?.badgeClass || SEMAFORO_META.B.badgeClass,
              )}
            >
              {op.etiqueta || 'Opción'}
            </span>
          ))}
        </div>
        {cfg.permitirTextoLibre && (
          <div className="px-2.5 py-1.5 rounded bg-white/10 border border-white/15 text-[11px] text-slate-300">
            📝 {cfg.etiquetaTextoLibre || 'Detalle adicional'}...
          </div>
        )}
      </div>
    </div>
  );

  if (compact) {
    return (
      <>
        <div className="flex items-center gap-1.5">
          <select
            value={normalizedTipo}
            onChange={(e) => handleTipoChange(e.target.value)}
            title="Modo de Respuesta en Móvil y Web"
            className="px-2.5 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500 max-w-[230px]"
          >
            {MODO_RESPUESTA_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {normalizedTipo === 'PERSONALIZADO' && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-2.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 inline-flex items-center gap-1 cursor-pointer shrink-0"
              title="Configurar botones y semáforo personalizados"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>({customOptions.length})</span>
            </button>
          )}
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900">
                  Configurar Respuesta Personalizada y Semáforo
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {renderConfiguratorPanel()}

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rol Semántico Opcional (Mapeo Automático en PDF / Hoja de Vida)
                </label>
                <select
                  value={rolSemantico}
                  onChange={(e) =>
                    onChange({
                      tipoControlInput: normalizedTipo,
                      configInputJson: { ...cfg, opciones: customOptions },
                      rolSemantico: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl"
                >
                  {ROL_SEMANTICO_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Listo, aplicar configuración
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Modo de Respuesta / Control Input (Mobile &amp; Web)
          </label>
          <select
            value={normalizedTipo}
            onChange={(e) => handleTipoChange(e.target.value)}
            className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-500"
          >
            {MODO_RESPUESTA_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Rol Semántico Especial (Opcional)
          </label>
          <select
            value={rolSemantico}
            onChange={(e) =>
              onChange({
                tipoControlInput: normalizedTipo,
                configInputJson:
                  normalizedTipo === 'PERSONALIZADO' ? { ...cfg, opciones: customOptions } : configInputJson || null,
                rolSemantico: e.target.value,
              })
            }
            className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-xl text-slate-700 focus:outline-none focus:border-blue-500"
          >
            {ROL_SEMANTICO_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {normalizedTipo === 'PERSONALIZADO' ? (
        renderConfiguratorPanel()
      ) : (
        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500">Vista rápida en campo:</span>
          {(
            MODO_RESPUESTA_PRESETS.find((p) => p.value === normalizedTipo)?.previewBadges || [
              'B',
              'R',
              'M',
              'C',
              'NA',
            ]
          ).map((b, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white border border-slate-200 text-slate-700"
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
