'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { CotizacionVersionItem } from '@/features/comercial/api/comercial.service';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import { Calendar, CheckCircle2, Eye, FileText, History, Layers, Tag, User } from 'lucide-react';

interface CotizacionVersionHistoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroCotizacion: string;
  versionActual: number;
  estadoActualLabel: string;
  estadoActualClassName?: string;
  totalActual: number;
  asesorActualNombre?: string | null;
  versiones: CotizacionVersionItem[];
  onOpenCurrentPdf: () => void;
  onOpenVersionPdf: (version: CotizacionVersionItem) => void;
  onInspectVersionReadOnly: (version: CotizacionVersionItem) => void;
}

function formatVersionTimestamp(
  isoDate: string | undefined,
  formatDate: (d: string | Date) => string,
): string {
  if (!isoDate) return 'Fecha no registrada';
  const base = formatDate(isoDate);
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return base;
  const hora = parsed.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${base} · ${hora}`;
}

export function CotizacionVersionHistoryDrawer({
  open,
  onOpenChange,
  numeroCotizacion,
  versionActual,
  estadoActualLabel,
  estadoActualClassName,
  totalActual,
  asesorActualNombre,
  versiones,
  onOpenCurrentPdf,
  onOpenVersionPdf,
  onInspectVersionReadOnly,
}: CotizacionVersionHistoryDrawerProps) {
  const { formatCurrency, formatDate } = useOrgFormatters();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[540px] p-0 bg-white flex flex-col gap-0 border-l border-slate-200"
      >
        {/* Cabecera fija del Drawer */}
        <SheetHeader className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 shrink-0 pr-12">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <History className="h-4.5 w-4.5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>Historial de Versiones</span>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                  {numeroCotizacion}
                </span>
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500 mt-0.5">
                {versiones.length}{' '}
                {versiones.length === 1 ? 'snapshot archivado' : 'snapshots archivados'} · Versión
                vigente{' '}
                <span className="font-mono font-semibold text-slate-700">v{versionActual}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {/* Cuerpo scrollable con Línea de Tiempo vertical */}
        <div className="flex-1 overflow-y-auto px-6 py-6 [scrollbar-width:thin]">
          <div className="relative">
            {/* Línea vertical continua de la Timeline */}
            <div
              className="absolute left-[15px] top-4 bottom-6 w-[2px] bg-gradient-to-b from-emerald-300 via-amber-200 to-slate-200"
              aria-hidden="true"
            />

            <ol className="space-y-6">
              {/* Nodo superior: Versión Vigente */}
              <li className="relative pl-11">
                <span
                  className="absolute left-0 top-1.5 h-8 w-8 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center shadow-xs"
                  aria-hidden="true"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </span>

                <div className="rounded-xl border-2 border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold border ${
                            versionActual >= 2
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {versionActual >= 2 && <History className="h-3 w-3" />}v{versionActual}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                          Versión Vigente
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] py-0 ${
                            estadoActualClassName || 'bg-white text-slate-700 border-slate-200'
                          }`}
                        >
                          {estadoActualLabel}
                        </Badge>
                      </div>
                      {asesorActualNombre && (
                        <p className="text-xs text-slate-600 flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-700">{asesorActualNombre}</span>
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Total Actual
                      </p>
                      <p className="font-mono font-bold text-base text-slate-900 tabular-nums">
                        {formatCurrency(totalActual)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-emerald-200/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-emerald-800/80">
                      Versión activa en el Studio
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5 bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                      onClick={() => {
                        onOpenChange(false);
                        onOpenCurrentPdf();
                      }}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Ver PDF v{versionActual}
                    </Button>
                  </div>
                </div>
              </li>

              {/* Nodos históricos archivados */}
              {versiones.map((v) => {
                const isDerived = v.numero_version >= 2;
                const motivoTexto =
                  v.motivo_cambio?.trim() ||
                  v.resumen_cambios?.trim() ||
                  'Snapshot histórico archivado al renegociar la oferta.';
                const asesorLabel =
                  v.asesor_nombre ||
                  v.creada_por_nombre ||
                  asesorActualNombre ||
                  'Asesor comercial';
                const showArchivador =
                  Boolean(v.creada_por_nombre) &&
                  v.creada_por_nombre?.toLowerCase() !== asesorLabel.toLowerCase();
                const itemsSummaryParts = [
                  v.items_servicios_count
                    ? `${v.items_servicios_count} ${v.items_servicios_count === 1 ? 'serv.' : 'servs.'}`
                    : null,
                  v.items_componentes_count
                    ? `${v.items_componentes_count} ${v.items_componentes_count === 1 ? 'rep.' : 'reps.'}`
                    : null,
                  v.items_otros_count
                    ? `${v.items_otros_count} ${v.items_otros_count === 1 ? 'rubro' : 'rubros'}`
                    : null,
                ].filter(Boolean);

                return (
                  <li key={v.id_version} className="relative pl-11">
                    {/* Punto del nodo en la línea de tiempo */}
                    <span
                      className={`absolute left-0 top-1.5 h-8 w-8 rounded-full border-2 flex items-center justify-center font-mono text-[11px] font-bold shadow-xs ${
                        isDerived
                          ? 'bg-amber-50 border-amber-400 text-amber-800'
                          : 'bg-blue-50 border-blue-400 text-blue-700'
                      }`}
                      aria-hidden="true"
                    >
                      v{v.numero_version}
                    </span>

                    <article className="group rounded-xl border border-slate-200 bg-white hover:border-amber-300/90 hover:shadow-md transition-all p-4 space-y-3">
                      {/* Encabezado del nodo: Badge + Fecha + Monto resaltado */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-bold border ${
                                isDerived
                                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {isDerived && <History className="h-3 w-3 shrink-0" />}v
                              {v.numero_version}
                            </span>

                            {v.estado_nombre && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/80">
                                {v.estado_nombre}
                              </span>
                            )}

                            {typeof v.descuento_porcentaje === 'number' &&
                              v.descuento_porcentaje > 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  <Tag className="h-2.5 w-2.5" />-{v.descuento_porcentaje}%
                                </span>
                              )}
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{formatVersionTimestamp(v.fecha_version, formatDate)}</span>
                          </div>
                        </div>

                        <div className="shrink-0 text-right bg-slate-50 group-hover:bg-amber-50/70 border border-slate-200/90 group-hover:border-amber-200 rounded-lg px-3 py-1.5 transition-colors">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Monto Total
                          </p>
                          <p className="font-mono font-bold text-sm text-slate-900 tabular-nums">
                            {formatCurrency(v.total_version || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Nombre del Asesor */}
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-500">Asesor:</span>
                          <span className="font-semibold text-slate-800">{asesorLabel}</span>
                        </span>
                        {showArchivador && (
                          <span className="text-[11px] text-slate-400">
                            · Archivada por {v.creada_por_nombre}
                          </span>
                        )}
                      </div>

                      {/* Motivo del Cambio con amplio espacio de lectura */}
                      <div className="rounded-lg bg-slate-50/90 border border-slate-200/70 px-3.5 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Motivo del cambio
                        </p>
                        <p className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                          {motivoTexto}
                        </p>
                      </div>

                      {/* Footer del nodo: conteo de líneas + Acciones Ver PDF y Solo Lectura */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                          {itemsSummaryParts.length > 0 && (
                            <>
                              <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{itemsSummaryParts.join(' · ')}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1.5 border-slate-200 text-slate-700 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300"
                            onClick={() => {
                              onOpenChange(false);
                              onInspectVersionReadOnly(v);
                            }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Solo Lectura
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs gap-1.5"
                            onClick={() => {
                              onOpenChange(false);
                              onOpenVersionPdf(v);
                            }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                            Ver PDF
                          </Button>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
