'use client';

import { ArrowDown, ArrowUp, ListPlus, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { OpcionJsonItem } from '../api/catalogos-eam.service';

export interface SelectorOptionsBuilderProps {
  options: string[];
  onChange: (nextOptions: string[]) => void;
  placeholder?: string;
  label?: string;
  compact?: boolean;
  allowCustom?: boolean;
  onAllowCustomChange?: (allow: boolean) => void;
}

/**
 * Normaliza un arreglo de etiquetas humanas a la estructura persistida `opciones_json`,
 * garantizando claves `valor` únicas e inmunes a tildes, espacios o signos.
 */
export function buildOpcionesJson(items: string[]): OpcionJsonItem[] | undefined {
  const cleaned = items.map((item) => item.trim()).filter(Boolean);
  if (cleaned.length === 0) return undefined;

  const usedValues = new Set<string>();
  return cleaned.map((etiqueta) => {
    const baseSlug =
      etiqueta
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'OPCION';

    let valor = baseSlug;
    let suffix = 2;
    while (usedValues.has(valor)) {
      valor = `${baseSlug}_${suffix}`;
      suffix += 1;
    }
    usedValues.add(valor);

    return { valor, etiqueta };
  });
}

/**
 * Constructor interactivo Prémium para listas desplegables (`SELECTOR`).
 * Permite añadir opciones una a una (sin romperse si una etiqueta contiene comas),
 * detectar duplicados, reordenar y pegar múltiples líneas de golpe.
 */
export function SelectorOptionsBuilder({
  options,
  onChange,
  placeholder = 'Ej: 220/127 VAC',
  label = 'Opciones de la Lista Desplegable *',
  compact = false,
  allowCustom,
  onAllowCustomChange,
}: SelectorOptionsBuilderProps) {
  const [draft, setDraft] = useState('');
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitItems = (candidates: string[]) => {
    const next = [...options];
    const seen = new Set(next.map((item) => item.trim().toLowerCase()));
    let hadDuplicate = false;

    for (const raw of candidates) {
      const clean = raw.trim();
      if (!clean) continue;
      const key = clean.toLowerCase();
      if (seen.has(key)) {
        hadDuplicate = true;
        continue;
      }
      seen.add(key);
      next.push(clean);
    }

    if (next.length !== options.length) {
      onChange(next);
      setDraft('');
      setDuplicateError(null);
      inputRef.current?.focus();
    } else if (hadDuplicate) {
      setDuplicateError('Esa opción ya fue añadida a la lista.');
    }
  };

  const handleAddClick = () => {
    if (!draft.trim()) {
      inputRef.current?.focus();
      return;
    }
    commitItems([draft]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      handleAddClick();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && /\r?\n/.test(pasted)) {
      e.preventDefault();
      commitItems(pasted.split(/\r?\n/));
    }
  };

  const handleRemove = (index: number) => {
    onChange(options.filter((_, idx) => idx !== index));
    setDuplicateError(null);
    inputRef.current?.focus();
  };

  const handleMove = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= options.length) return;
    const copy = [...options];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    onChange(copy);
  };

  return (
    <div
      className={`rounded-xl border border-purple-200 bg-purple-50/50 ${
        compact ? 'p-3 space-y-2.5' : 'p-4 space-y-3'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
          <ListPlus className="h-3.5 w-3.5 text-purple-600 shrink-0" />
          <span>{label}</span>
        </label>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${
              options.length > 0
                ? 'bg-purple-100/90 text-purple-800 border-purple-200'
                : 'bg-white/80 text-slate-500 border-slate-200'
            }`}
          >
            {options.length} {options.length === 1 ? 'opción' : 'opciones'}
          </span>
          {options.length >= 2 && (
            <button
              type="button"
              onClick={() => {
                onChange([]);
                setDuplicateError(null);
                inputRef.current?.focus();
              }}
              className="text-[10.5px] font-semibold text-rose-600 hover:text-rose-700 inline-flex items-center gap-0.5 cursor-pointer"
              title="Vaciar lista"
            >
              <Trash2 className="h-3 w-3" />
              <span>Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Entrada 1-a-1 con tecla Enter o botón dedicado */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (duplicateError) setDuplicateError(null);
          }}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-purple-300 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500"
        />
        <button
          type="button"
          onClick={handleAddClick}
          disabled={!draft.trim()}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Añadir opción</span>
        </button>
      </div>

      {/* Mensajes de feedback contextual */}
      {duplicateError ? (
        <p className="text-[11px] font-semibold text-rose-600">{duplicateError}</p>
      ) : draft.trim() ? (
        <p className="text-[11px] font-medium text-purple-700">
          Pulsa <kbd className="px-1.5 py-0.5 rounded bg-white border border-purple-200 font-mono text-[10px]">Enter</kbd> o{' '}
          <strong>+ Añadir opción</strong> para incluir &ldquo;{draft.trim()}&rdquo;.
        </p>
      ) : null}

      {/* Lista de opciones agregadas */}
      {options.length === 0 ? (
        <div className="rounded-xl border border-dashed border-purple-200/90 bg-white/60 px-3 py-3 text-center text-[11.5px] text-slate-500 font-medium">
          Aún no hay opciones añadidas. Escribe una arriba y pulsa <strong>Enter</strong> o{' '}
          <strong>+ Añadir opción</strong>.
        </div>
      ) : (
        <div className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
          {options.map((opt, idx) => (
            <div
              key={`${opt}-${idx}`}
              className="group flex items-center justify-between gap-2 rounded-xl border border-purple-200/80 bg-white px-2.5 py-1.5 shadow-2xs"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="w-5 h-5 rounded-md bg-purple-100 text-purple-700 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <span className="text-xs font-semibold text-slate-800 truncate" title={opt}>
                  {opt}
                </span>
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {options.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 rounded-md text-slate-400 hover:text-purple-700 hover:bg-purple-50 disabled:opacity-25 cursor-pointer disabled:cursor-default"
                      title="Subir orden"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 1)}
                      disabled={idx === options.length - 1}
                      className="p-1 rounded-md text-slate-400 hover:text-purple-700 hover:bg-purple-50 disabled:opacity-25 cursor-pointer disabled:cursor-default"
                      title="Bajar orden"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Quitar opción"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {onAllowCustomChange && (
        <label className="flex items-start gap-2.5 pt-2.5 border-t border-purple-200/70 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={Boolean(allowCustom)}
            onChange={(e) => onAllowCustomChange(e.target.checked)}
            className="mt-0.5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
          />
          <div className="leading-tight">
            <span className="text-xs font-bold text-purple-950 group-hover:text-purple-700 transition-colors">
              Permitir valor personalizado («Otro...») para casos puntuales
            </span>
            <p className="text-[10.5px] text-purple-800/75 mt-0.5">
              Habilita una opción final en el desplegable para ingresar manualmente un dato atípico
              que no esté en la lista estándar.
            </p>
          </div>
        </label>
      )}
    </div>
  );
}
