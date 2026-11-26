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
  actualizarPresentacionPdfCotizacion,
  fetchCotizacionPdfBlob,
  fetchVersionCotizacionPdfBlob,
  type CotizacionRecord,
} from '@/features/comercial/api/comercial.service';
import { COMERCIAL_KEYS } from '@/features/comercial/hooks/use-comercial';
import {
  getConfiguracionEmpresa,
  type ConfiguracionEmpresa,
} from '@/features/configuracion/api/configuracion.service';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  Eye,
  FileText,
  History,
  LayoutList,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

export interface CotizacionPdfPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotizacionId: number | null;
  versionId?: number | null;
  numeroCotizacion?: string;
  version?: number | null;
  estadoLabel?: string;
  cacheKey?: string | number | null;
  mostrarDesglosePrecios?: boolean;
  onDesgloseChange?: (mostrarDesglose: boolean) => void;
  historicalMeta?: {
    fecha?: string;
    motivo?: string | null;
  } | null;
  onInspectReadOnly?: () => void;
}

export function CotizacionPdfPreviewModal({
  open,
  onOpenChange,
  cotizacionId,
  versionId = null,
  numeroCotizacion,
  version,
  estadoLabel,
  cacheKey,
  mostrarDesglosePrecios = false,
  onDesgloseChange,
  historicalMeta = null,
  onInspectReadOnly,
}: CotizacionPdfPreviewModalProps) {
  const qc = useQueryClient();
  const [fullscreen, setFullscreen] = useState(false);
  const [localOverride, setLocalOverride] = useState<{
    key: string;
    value: boolean;
  } | null>(null);
  const forceNextRefreshRef = useRef(false);

  const isHistorical = Boolean(versionId && versionId > 0);
  const targetKey = isHistorical ? `ver-${versionId}` : `cot-${cotizacionId ?? 0}`;

  const activeDesglose =
    localOverride && localOverride.key === targetKey
      ? localOverride.value
      : Boolean(mostrarDesglosePrecios);

  const toggleModeMut = useMutation({
    mutationFn: async (nextVal: boolean) => {
      if (!cotizacionId) throw new Error('Cotización no identificada');
      return actualizarPresentacionPdfCotizacion(cotizacionId, nextVal);
    },
    onSuccess: (res) => {
      const nextVal = Boolean(res.mostrar_desglose_precios);
      if (cotizacionId) {
        setLocalOverride({ key: `cot-${cotizacionId}`, value: nextVal });
        qc.setQueryData<CotizacionRecord | undefined>(
          COMERCIAL_KEYS.cotizacion(cotizacionId),
          (prev) => (prev ? { ...prev, mostrar_desglose_precios: nextVal } : prev),
        );
      }
      qc.invalidateQueries({ queryKey: COMERCIAL_KEYS.cotizaciones });
      onDesgloseChange?.(nextVal);
      toast.success(
        nextVal
          ? 'Modo PDF actualizado: Detallado con Precios'
          : 'Modo PDF actualizado: Suma Alzada (Compacto)',
      );
    },
    onError: () => {
      toast.error('No fue posible cambiar el formato de presentación del PDF');
    },
  });

  // Lee siempre firma fresca de configuración de empresa (gobernanza + marca blanca)
  // para garantizar 0% caché fantasma cuando se altera /configuracion/empresa.
  const { data: orgCfg } = useQuery<ConfiguracionEmpresa>({
    queryKey: ['config-org-empresa-cpq'],
    queryFn: () => getConfiguracionEmpresa(),
    enabled: open,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const orgSignature = useMemo(() => {
    if (!orgCfg) return 'org:pending';
    return [
      orgCfg.fecha_modificacion ?? '',
      orgCfg.enable_cpq_governance ? '1' : '0',
      orgCfg.lock_catalog_unit_price ? '1' : '0',
      orgCfg.cot_mostrar_desglose_precios ? '1' : '0',
      orgCfg.umbral_aprobacion_supervisor ?? 0,
      orgCfg.umbral_aprobacion_gerente ?? 0,
      orgCfg.descuento_max_sin_aprobacion ?? 0,
      orgCfg.margen_minimo_alerta ?? 0,
      orgCfg.margen_minimo_aprobacion ?? 0,
      orgCfg.color_primario ?? '',
      orgCfg.texto_pie_pdf ?? '',
    ].join('|');
  }, [orgCfg]);

  const {
    data: pdfBlob,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      'cotizacion-pdf-preview',
      isHistorical ? `version-${versionId}` : cotizacionId,
      activeDesglose ? 'detallado' : 'suma-alzada',
      cacheKey ?? version ?? 'v1',
      orgSignature,
    ],
    queryFn: () => {
      if (isHistorical && versionId) {
        return fetchVersionCotizacionPdfBlob(versionId, activeDesglose);
      }
      const force = forceNextRefreshRef.current;
      forceNextRefreshRef.current = false;
      return fetchCotizacionPdfBlob(cotizacionId!, force);
    },
    enabled: open && Boolean(isHistorical ? versionId : cotizacionId) && !toggleModeMut.isPending,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  });

  const blobUrl = useMemo(() => {
    if (!open || !pdfBlob) return null;
    return URL.createObjectURL(pdfBlob);
  }, [open, pdfBlob]);

  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  const baseName = numeroCotizacion || `COTIZACION-${cotizacionId ?? ''}`;
  const filename = isHistorical && version ? `${baseName}-v${version}.pdf` : `${baseName}.pdf`;
  const isLoadingPdf = isFetching || toggleModeMut.isPending;

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Descargando ${filename}`);
  };

  const handleOpenNewTab = () => {
    if (!blobUrl) return;
    window.open(blobUrl, '_blank', 'noopener,noreferrer');
  };

  const handleReload = () => {
    forceNextRefreshRef.current = true;
    refetch();
  };

  const handleSelectMode = (nextVal: boolean) => {
    if (nextVal === activeDesglose || toggleModeMut.isPending) return;
    if (isHistorical) {
      // En modo snapshot histórico, alterna solo la vista previa sin mutar la BD activa
      setLocalOverride({ key: targetKey, value: nextVal });
      return;
    }
    if (!cotizacionId) return;
    toggleModeMut.mutate(nextVal);
  };

  const errorMessage =
    error instanceof Error ? error.message : 'No fue posible generar la vista previa del PDF.';

  const numVersion = Number(version ?? 1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-slate-950/75 backdrop-blur-sm"
        className={`flex flex-col p-0 gap-0 overflow-hidden bg-white transition-all duration-150 shadow-2xl ${
          fullscreen
            ? 'w-screen max-w-none sm:max-w-none xl:max-w-none h-dvh rounded-none border-0'
            : 'w-[96vw] max-w-[96vw] sm:max-w-[96vw] xl:max-w-[1400px] h-[94vh] rounded-xl border-slate-300/80'
        }`}
      >
        <DialogHeader className="px-5 py-3 border-b border-slate-200 bg-slate-50/90 shrink-0 pr-12 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`h-8 w-8 rounded-lg border flex items-center justify-center shrink-0 ${
                  isHistorical
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-primary/10 text-primary border-primary/20'
                }`}
              >
                {isHistorical ? <History className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                  <span>{isHistorical ? 'PDF Histórico Archivado' : 'Vista Previa PDF'}</span>
                  {numeroCotizacion && (
                    <span className="font-mono text-primary">{numeroCotizacion}</span>
                  )}
                  {version != null && (
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] inline-flex items-center gap-1 ${
                        numVersion >= 2
                          ? 'bg-amber-100 text-amber-800 border-amber-200 font-bold'
                          : 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                      }`}
                    >
                      {numVersion >= 2 && <History className="h-2.5 w-2.5 shrink-0" />}v{numVersion}
                    </Badge>
                  )}
                  {isHistorical && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-amber-50 text-amber-900 border-amber-200 font-semibold"
                    >
                      Snapshot Histórico
                    </Badge>
                  )}
                  {estadoLabel && (
                    <Badge variant="outline" className="text-[10px] bg-white text-slate-600">
                      {estadoLabel}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-500">
                  {isHistorical
                    ? `Copia inmutable archivada${historicalMeta?.fecha ? ` (${historicalMeta.fecha})` : ''}${historicalMeta?.motivo ? ` · ${historicalMeta.motivo}` : ''}. Cambiar formato aquí solo afecta esta vista previa.`
                    : 'Documento comercial corporativo listo para revisión, comparación de formato o descarga.'}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isHistorical && onInspectReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100"
                  onClick={onInspectReadOnly}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Ver Solo Lectura
                </Button>
              )}
              {/* Toggle rápido Suma Alzada vs Detallado */}
              <div
                className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs"
                role="group"
                aria-label="Formato de presentación del PDF"
              >
                <button
                  type="button"
                  disabled={toggleModeMut.isPending}
                  onClick={() => handleSelectMode(false)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    !activeDesglose
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="h-3 w-3 shrink-0" />
                  <span>Suma Alzada (Compacto)</span>
                </button>
                <button
                  type="button"
                  disabled={toggleModeMut.isPending}
                  onClick={() => handleSelectMode(true)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    activeDesglose
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <LayoutList className="h-3 w-3 shrink-0" />
                  <span>Detallado con Precios</span>
                </button>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white"
                onClick={() => setFullscreen((v) => !v)}
                title={fullscreen ? 'Salir de pantalla completa' : 'Expandir a pantalla completa'}
              >
                {fullscreen ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5 mr-1.5" />
                    Restaurar
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 mr-1.5" />
                    Expandir
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white"
                disabled={isLoadingPdf}
                onClick={handleReload}
                title="Regenerar PDF desde el servidor"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoadingPdf ? 'animate-spin' : ''}`} />
                Recargar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs bg-white"
                disabled={!blobUrl || isLoadingPdf}
                onClick={handleOpenNewTab}
                title="Abrir PDF en una nueva pestaña del navegador"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Abrir pestaña
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                disabled={!blobUrl || isLoadingPdf}
                onClick={handleDownload}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-slate-800/90 relative">
          {isLoadingPdf && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 backdrop-blur-[1px] z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center space-y-0.5">
                <p className="text-sm font-semibold text-slate-800">
                  {toggleModeMut.isPending
                    ? 'Actualizando formato de presentación...'
                    : activeDesglose
                      ? 'Generando PDF Detallado con precios unitarios...'
                      : 'Generando PDF Ejecutivo Suma Alzada (Compacto)...'}
                </p>
                <p className="text-xs text-slate-500">
                  Aplicando marca blanca, alcance comercial y totales fiscales.
                </p>
              </div>
            </div>
          )}

          {isError && !isLoadingPdf && (
            <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center bg-white">
              <div className="h-12 w-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <p className="text-sm font-bold text-slate-900">Error al generar el PDF</p>
                <p className="text-xs text-slate-600">{errorMessage}</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleReload}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reintentar
              </Button>
            </div>
          )}

          {blobUrl && !isError && (
            <iframe
              src={`${blobUrl}#toolbar=1&navpanes=0&view=FitH`}
              title={`Vista previa ${filename}`}
              className="w-full h-full border-0"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
