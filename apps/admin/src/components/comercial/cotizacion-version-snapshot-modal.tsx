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
import {
  ESTADO_LABELS_COTIZACION,
  getVersionCotizacionDetalle,
  type CotizacionVersionDatosSnapshot,
  type CotizacionVersionDetalle,
  type CotizacionVersionSnapshotComponente,
  type CotizacionVersionSnapshotEquipo,
  type CotizacionVersionSnapshotOtro,
  type CotizacionVersionSnapshotServicio,
} from '@/features/comercial/api/comercial.service';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Cpu,
  Eye,
  FileText,
  History,
  Layers,
  Loader2,
  Lock,
  Package,
  Truck,
  Wrench,
} from 'lucide-react';

export interface CotizacionVersionSnapshotModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versionId: number | null;
  numeroCotizacion?: string;
  onOpenPdf?: (version: {
    id_version: number;
    numero_version: number;
    fecha_version?: string;
    motivo_cambio?: string | null;
    total_version?: number | string | null;
    estadoLabel?: string;
  }) => void;
}

function normalizeEstadoSnap(raw?: string | null): string {
  const norm = String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (!norm) return 'ARCHIVADA';
  if (norm.includes('BORRADOR')) return 'BORRADOR';
  if (norm.includes('REVISION')) return 'EN_REVISION';
  if (norm.includes('APROBADA_CLIENTE')) return 'APROBADA_CLIENTE';
  if (norm.includes('APROBADA')) return 'APROBADA_INTERNA';
  if (norm.includes('ENVIADA')) return 'ENVIADA';
  if (norm.includes('RECHAZADA')) return 'RECHAZADA';
  if (norm.includes('VENCIDA')) return 'VENCIDA';
  return norm;
}

export function CotizacionVersionSnapshotModal({
  open,
  onOpenChange,
  versionId,
  numeroCotizacion,
  onOpenPdf,
}: CotizacionVersionSnapshotModalProps) {
  const { formatCurrency, formatDate } = useOrgFormatters();

  const { data, isLoading, isError } = useQuery<CotizacionVersionDetalle>({
    queryKey: ['cotizacion-version-detalle', versionId],
    queryFn: () => getVersionCotizacionDetalle(versionId!),
    enabled: open && Boolean(versionId),
    staleTime: 60_000,
  });

  const snap: CotizacionVersionDatosSnapshot = data?.datos_cotizacion || {};
  const servicios: CotizacionVersionSnapshotServicio[] = Array.isArray(data?.items_servicios)
    ? data.items_servicios
    : [];
  const componentes: CotizacionVersionSnapshotComponente[] = Array.isArray(data?.items_componentes)
    ? data.items_componentes
    : [];
  const otros: CotizacionVersionSnapshotOtro[] = Array.isArray(snap.items_otros)
    ? snap.items_otros
    : [];
  const equipos: CotizacionVersionSnapshotEquipo[] = Array.isArray(snap.equipos_vinculados)
    ? snap.equipos_vinculados
    : [];

  const estadoCodigo = normalizeEstadoSnap(snap.estado);
  const estadoLabel =
    ESTADO_LABELS_COTIZACION[estadoCodigo] || snap.estado_nombre || snap.estado || 'Archivada';
  const numVersion = data?.numero_version ?? 1;
  const numCot = data?.cotizacion?.numero_cotizacion || numeroCotizacion || '';
  const margenPct = Number(snap.margen_bruto_porcentaje || 0);
  const utilidadBruta = Number(snap.utilidad_bruta_estimada || 0);
  const costoTotal = Number(snap.costo_total_estimado || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-slate-950/70 backdrop-blur-sm"
        className="w-[95vw] max-w-[1040px] sm:max-w-[1040px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden bg-white rounded-xl border-slate-200 shadow-2xl"
      >
        <DialogHeader className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/90 shrink-0 pr-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                <Eye className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>Inspección de Snapshot Histórico</span>
                  {numCot && <span className="font-mono text-primary">{numCot}</span>}
                  {data && (
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] inline-flex items-center gap-1 ${
                        numVersion >= 2
                          ? 'bg-amber-100 text-amber-800 border-amber-200 font-bold'
                          : 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                      }`}
                    >
                      {numVersion >= 2 && <History className="h-2.5 w-2.5" />}v{numVersion}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-50 text-amber-900 border-amber-200 font-semibold"
                  >
                    Solo Lectura
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500">
                  Registro inmutable archivado para auditoría comercial. No modifica la versión
                  activa.
                </DialogDescription>
              </div>
            </div>

            {data && onOpenPdf && (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  onOpenPdf({
                    id_version: data.id_version,
                    numero_version: data.numero_version,
                    fecha_version: data.fecha_creacion,
                    motivo_cambio: data.motivo_cambio || data.resumen_cambios,
                    total_version: data.total,
                    estadoLabel,
                  });
                }}
              >
                <FileText className="h-3.5 w-3.5" />
                Ver PDF v{data.numero_version}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          {isLoading && (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-xs font-medium">Cargando snapshot histórico inmutable...</span>
            </div>
          )}

          {isError && !isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-rose-700">
              <AlertTriangle className="h-7 w-7" />
              <p className="text-sm font-semibold">No se pudo cargar el detalle de esta versión.</p>
            </div>
          )}

          {data && !isLoading && (
            <>
              {/* Encabezado de Auditoría */}
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="font-bold text-amber-900 uppercase tracking-wide text-[10px]">
                      Motivo de archivo / cambio
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-white text-slate-700">
                      Estado al archivar: {estadoLabel}
                    </Badge>
                    {data.fecha_creacion && (
                      <span className="text-[11px] text-amber-800/80">
                        · Archivado el {formatDate(data.fecha_creacion)}
                      </span>
                    )}
                    {data.creada_por?.username && (
                      <span className="text-[11px] text-amber-800/80">
                        · por <strong>{data.creada_por.username}</strong>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-800 leading-relaxed break-words">
                    {data.motivo_cambio || data.resumen_cambios || 'Snapshot histórico archivado'}
                  </p>
                </div>
                <div className="shrink-0 sm:text-right bg-white px-3 py-2 rounded-lg border border-amber-200/80">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Total Versión</p>
                  <p className="text-base font-extrabold font-mono text-slate-900 tabular-nums">
                    {formatCurrency(Number(data.total ?? snap.total_cotizacion ?? 0))}
                  </p>
                </div>
              </div>

              {/* Resumen Comercial + Financiero */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                    Contexto Comercial y Alcance
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Asunto</span>
                      <p className="font-semibold text-slate-900 break-words">
                        {snap.asunto || '—'}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <span className="text-slate-500 block text-[11px]">Cliente</span>
                        <p className="font-medium text-slate-800">
                          {snap.cliente?.razon_social ||
                            snap.cliente?.nombre_comercial ||
                            snap.cliente?.nombre_completo ||
                            '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          Forma de pago / Garantía
                        </span>
                        <p className="font-medium text-slate-800">
                          {snap.forma_pago || 'Contado'} · {snap.meses_garantia ?? 0} mes(es)
                        </p>
                      </div>
                    </div>
                    {equipos.length > 0 && (
                      <div className="pt-1">
                        <span className="text-slate-500 block text-[11px] mb-1">
                          Equipos cubiertos ({equipos.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {equipos.map((eq, idx) => (
                            <span
                              key={eq.id_equipo ?? idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] font-mono text-slate-700"
                            >
                              <Cpu className="h-3 w-3 text-primary" />
                              {eq.codigo_equipo || eq.nombre_equipo || `Equipo #${idx + 1}`}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {snap.alcance_trabajo && (
                      <div className="pt-1">
                        <span className="text-slate-500 block text-[11px]">Alcance incluido</span>
                        <p className="text-slate-700 whitespace-pre-line bg-slate-50 rounded-md p-2 border border-slate-100 text-[11px] leading-relaxed">
                          {snap.alcance_trabajo}
                        </p>
                      </div>
                    )}
                    {snap.exclusiones && (
                      <div>
                        <span className="text-slate-500 block text-[11px]">Exclusiones</span>
                        <p className="text-slate-700 whitespace-pre-line bg-slate-50 rounded-md p-2 border border-slate-100 text-[11px] leading-relaxed">
                          {snap.exclusiones}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-xs">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Desglose Financiero Archivado
                    </h3>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Servicios</span>
                      <span className="font-mono font-medium">
                        {formatCurrency(Number(snap.subtotal_servicios || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Repuestos WMS</span>
                      <span className="font-mono font-medium">
                        {formatCurrency(Number(snap.subtotal_componentes || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Logística, Viáticos y Otros</span>
                      <span className="font-mono font-medium">
                        {formatCurrency(Number(snap.subtotal_otros || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold text-slate-800 pt-1.5 border-t border-slate-100">
                      <span>Subtotal Directo</span>
                      <span className="font-mono">
                        {formatCurrency(Number(snap.subtotal_general ?? data.subtotal ?? 0))}
                      </span>
                    </div>
                    {Number(snap.descuento_porcentaje || 0) > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Descuento ({Number(snap.descuento_porcentaje)}%)</span>
                        <span className="font-mono font-semibold">
                          -{formatCurrency(Number(snap.descuento_valor || 0))}
                        </span>
                      </div>
                    )}
                    {Boolean(snap.usa_aiu) && Number(snap.aiu_valor_total || 0) > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>AIU Total</span>
                        <span className="font-mono">
                          {formatCurrency(Number(snap.aiu_valor_total || 0))}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>IVA ({Number(snap.iva_porcentaje ?? 19)}%)</span>
                      <span className="font-mono font-medium">
                        {formatCurrency(Number(snap.iva_valor || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-extrabold text-primary pt-2 border-t border-slate-200">
                      <span>TOTAL OFERTA v{numVersion}</span>
                      <span className="font-mono">
                        {formatCurrency(Number(snap.total_cotizacion ?? data.total ?? 0))}
                      </span>
                    </div>
                  </div>

                  {/* Rentabilidad Interna Archivada */}
                  <div className="rounded-xl bg-slate-900 text-slate-100 p-3.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <Lock className="h-3 w-3 text-amber-400" />
                        Rentabilidad v{numVersion} (Privado)
                      </span>
                      <Badge className="bg-slate-800 text-slate-200 border border-slate-700 text-[10px]">
                        Margen: {margenPct.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between text-slate-300">
                      <span>Costo Total Estimado</span>
                      <span className="font-mono">{formatCurrency(costoTotal)}</span>
                    </div>
                    <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                      <span>Utilidad Bruta</span>
                      <span
                        className={`font-mono ${
                          utilidadBruta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {formatCurrency(utilidadBruta)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tablas de Ítems Archivados */}
              {servicios.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-primary" />
                    Servicios Técnicos ({servicios.length})
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {servicios.map((it, idx) => (
                      <div
                        key={it.id_item ?? idx}
                        className="px-4 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 break-words">
                            {it.descripcion || it.servicio || 'Servicio'}
                            {it.es_opcional && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                Opcional
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Cant: {it.cantidad} {it.unidad || 'und'} · Unit:{' '}
                            {formatCurrency(Number(it.precio_unitario || 0))}
                            {Number(it.descuento_porcentaje || 0) > 0 &&
                              ` · Desc ${it.descuento_porcentaje}%`}
                          </p>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 shrink-0">
                          {formatCurrency(Number(it.subtotal || 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {componentes.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    Repuestos y Componentes ({componentes.length})
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {componentes.map((it, idx) => (
                      <div
                        key={it.id_item ?? idx}
                        className="px-4 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 break-words">
                            {it.descripcion || it.componente || 'Componente'}
                            {it.es_opcional && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                Opcional
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Cant: {it.cantidad} {it.unidad || 'und'} · Unit:{' '}
                            {formatCurrency(Number(it.precio_unitario || 0))}
                            {(it.codigo_interno || it.referencia_manual) &&
                              ` · Ref: ${it.codigo_interno || it.referencia_manual}`}
                          </p>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 shrink-0">
                          {formatCurrency(Number(it.subtotal || 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {otros.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                    Logística, Viáticos y Otros Rubros ({otros.length})
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {otros.map((it, idx) => (
                      <div
                        key={it.id_item_otro ?? idx}
                        className="px-4 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 break-words">
                            <span className="text-[10px] uppercase font-bold text-slate-500 mr-1.5">
                              [{it.categoria_rubro || 'OTRO'}]
                            </span>
                            {it.descripcion}
                            {it.visible_cliente === false && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                                Costo absorbido oculto
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Cant: {it.cantidad} {it.unidad || 'global'} · Costo:{' '}
                            {formatCurrency(Number(it.costo_unitario || 0))} · Precio Cliente:{' '}
                            {formatCurrency(Number(it.precio_unitario || 0))}
                          </p>
                        </div>
                        <span className="font-mono font-semibold text-slate-900 shrink-0">
                          {it.visible_cliente === false
                            ? 'Absorb.'
                            : formatCurrency(Number(it.subtotal || 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
