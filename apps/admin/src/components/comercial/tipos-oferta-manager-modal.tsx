'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type TipoOfertaCatalogoRecord } from '@/features/comercial/api/comercial.service';
import {
  useTiposOfertaActions,
  useTiposOfertaCotizacion,
} from '@/features/comercial/hooks/use-comercial';
import { Check, Edit3, Loader2, Lock, Plus, Settings2, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  normalizeSearchText,
  TIPO_OFERTA_COMBOBOX_OPTIONS,
  type CpqComboboxOption,
} from './cpq-premium-controls';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTipo?: (codigo: string) => void;
}

export function normalizeTipoOfertaCodigo(raw: string): string {
  return raw
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

/**
 * Construye las opciones del combobox de Tipo de Oferta desde el catálogo unificado en BD,
 * con fallback limpio a los presets base mientras carga.
 */
export function buildTipoOfertaComboboxOptions(
  tipos: TipoOfertaCatalogoRecord[] | undefined,
): CpqComboboxOption[] {
  if (!tipos || tipos.length === 0) {
    return TIPO_OFERTA_COMBOBOX_OPTIONS;
  }
  return tipos.map((t) => ({
    value: t.codigo,
    label: t.nombre,
    description: t.descripcion || undefined,
    badge: t.badge || undefined,
    group: t.es_sistema ? 'Tipos de Oferta Estándar' : 'Tipos Personalizados',
  }));
}

/**
 * Resuelve la etiqueta humana legible (con tildes y mayúsculas originales) para un código de tipo de oferta.
 */
export function resolveTipoOfertaLabel(
  code?: string | null,
  tipos?: TipoOfertaCatalogoRecord[],
): string {
  const normalized = String(code || 'SERVICIO_TECNICO')
    .trim()
    .toUpperCase();
  const fromCatalog = tipos?.find((t) => t.codigo.toUpperCase() === normalized);
  if (fromCatalog) return fromCatalog.nombre;

  const fromPreset = TIPO_OFERTA_COMBOBOX_OPTIONS.find((o) => o.value.toUpperCase() === normalized);
  if (fromPreset) return fromPreset.label;

  return normalized
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function TiposOfertaManagerModal({ open, onOpenChange, onSelectTipo }: Props) {
  const { data: tipos = [], isLoading } = useTiposOfertaCotizacion();
  const { crear, actualizar, eliminar } = useTiposOfertaActions();

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaDesc, setNuevaDesc] = useState('');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const codigoPreview = useMemo(() => normalizeTipoOfertaCodigo(nuevoNombre), [nuevoNombre]);

  const duplicadoEnVivo = useMemo(() => {
    if (!nuevoNombre.trim()) return null;
    const normNew = normalizeSearchText(nuevoNombre).replace(/[^a-z0-9]+/g, '');
    return (
      tipos.find(
        (t) =>
          t.codigo === codigoPreview ||
          normalizeSearchText(t.nombre).replace(/[^a-z0-9]+/g, '') === normNew,
      ) || null
    );
  }, [nuevoNombre, codigoPreview, tipos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !codigoPreview) {
      toast.error('Ingresa un nombre válido para el nuevo tipo de oferta');
      return;
    }
    if (duplicadoEnVivo) {
      toast.error(
        `Ya existe "${duplicadoEnVivo.nombre}" (${duplicadoEnVivo.codigo}). Selecciónalo o usa otro nombre.`,
      );
      return;
    }
    try {
      const created = await crear.mutateAsync({
        nombre: nuevoNombre.trim(),
        codigo: codigoPreview,
        descripcion: nuevaDesc.trim() || undefined,
      });
      setNuevoNombre('');
      setNuevaDesc('');
      onSelectTipo?.(created.codigo);
    } catch {
      // El toast de error ya se muestra desde useTiposOfertaActions
    }
  };

  const startEdit = (t: TipoOfertaCatalogoRecord) => {
    setEditingCode(t.codigo);
    setEditNombre(t.nombre);
    setEditDesc(t.descripcion || '');
  };

  const saveEdit = async () => {
    if (!editingCode || !editNombre.trim()) return;
    try {
      await actualizar.mutateAsync({
        codigo: editingCode,
        payload: { nombre: editNombre.trim(), descripcion: editDesc.trim() || null },
      });
      setEditingCode(null);
    } catch {
      // Toast manejado por el hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings2 className="h-4 w-4 text-primary" />
            Catálogo Unificado de Tipos de Oferta (CPQ)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Los tipos creados o renombrados aquí se reflejan instantáneamente en el Template Studio,
            el Studio de Cotizaciones y todos los filtros del Hub Comercial.
          </DialogDescription>
        </DialogHeader>

        {/* Formulario compacto para crear nuevo tipo */}
        <form
          onSubmit={handleCreate}
          className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" />
              Crear Nuevo Tipo de Oferta
            </span>
            {codigoPreview && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                Código: <strong>{codigoPreview}</strong>
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-5">
              <Label className="sr-only">Etiqueta legible</Label>
              <Input
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                placeholder="Ej: Overhaul Turbo Especial"
                className="h-8 text-xs bg-white"
                maxLength={120}
              />
            </div>
            <div className="sm:col-span-5">
              <Label className="sr-only">Descripción opcional</Label>
              <Input
                value={nuevaDesc}
                onChange={(e) => setNuevaDesc(e.target.value)}
                placeholder="Descripción breve (opcional)"
                className="h-8 text-xs bg-white"
                maxLength={250}
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                size="sm"
                className="w-full h-8 text-xs"
                disabled={crear.isPending || !nuevoNombre.trim() || Boolean(duplicadoEnVivo)}
              >
                {crear.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Crear'}
              </Button>
            </div>
          </div>
          {duplicadoEnVivo && (
            <p className="text-[11px] font-medium text-rose-600">
              ✕ Ya existe &ldquo;{duplicadoEnVivo.nombre}&rdquo; ({duplicadoEnVivo.codigo}).
            </p>
          )}
        </form>

        {/* Listado de tipos existentes con conteo real de uso */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span className="font-semibold uppercase tracking-wider">
              Tipos Activos ({tipos.length})
            </span>
            <span>Uso real en Plantillas y Cotizaciones</span>
          </div>

          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[340px] overflow-y-auto bg-white">
              {tipos.map((t) => {
                const isEditing = editingCode === t.codigo;
                const canDelete = !t.es_sistema && t.uso_total === 0;

                return (
                  <div key={t.codigo} className="p-2.5 hover:bg-slate-50/70 transition-colors">
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Input
                            value={editNombre}
                            onChange={(e) => setEditNombre(e.target.value)}
                            className="h-8 text-xs bg-white"
                            placeholder="Etiqueta legible"
                            autoFocus
                          />
                          <Input
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="h-8 text-xs bg-white"
                            placeholder="Descripción opcional"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono text-slate-400">
                            Código fijo: {t.codigo}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => setEditingCode(null)}
                            >
                              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={actualizar.isPending || !editNombre.trim()}
                              onClick={() => void saveEdit()}
                            >
                              {actualizar.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Check className="h-3.5 w-3.5 mr-1" />
                              )}
                              Guardar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900">{t.nombre}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {t.codigo}
                            </span>
                            {t.es_sistema && (
                              <Badge
                                variant="outline"
                                className="text-[9px] h-4 px-1.5 bg-slate-50 text-slate-500 border-slate-200 gap-0.5"
                              >
                                <Lock className="h-2.5 w-2.5" /> Base
                              </Badge>
                            )}
                          </div>
                          {t.descripcion && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {t.descripcion}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right text-[10px] text-slate-500 font-mono leading-tight">
                            <div>
                              <strong>{t.uso_plantillas}</strong> plant.
                            </div>
                            <div>
                              <strong>{t.uso_cotizaciones}</strong> COT
                            </div>
                          </div>

                          {onSelectTipo && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => {
                                onSelectTipo(t.codigo);
                                onOpenChange(false);
                              }}
                            >
                              Usar
                            </Button>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-slate-500 hover:text-primary"
                            title="Renombrar etiqueta o descripción"
                            onClick={() => startEdit(t)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 disabled:opacity-30"
                            disabled={!canDelete || eliminar.isPending}
                            title={
                              t.es_sistema
                                ? 'Tipo base del sistema (no eliminable)'
                                : t.uso_total > 0
                                  ? `En uso por ${t.uso_plantillas} plantilla(s) y ${t.uso_cotizaciones} COT`
                                  : 'Eliminar tipo personalizado'
                            }
                            onClick={() => eliminar.mutate(t.codigo)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
