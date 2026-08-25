'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  ExternalLink,
  X,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { getTrazabilidadPdfBlob } from '../api/clientes.service';

interface ModalVistaPreviaTrazabilidadPdfProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: number;
  clienteNombre: string;
  filtros: {
    idEquipo?: number;
    categoria?: string;
    idSede?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    search?: string;
  };
  totalOrdenes: number;
}

export function ModalVistaPreviaTrazabilidadPdf({
  isOpen,
  onClose,
  clienteId,
  clienteNombre,
  filtros,
  totalOrdenes,
}: ModalVistaPreviaTrazabilidadPdfProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>('INFORME_EJECUTIVO_TRAZABILIDAD.pdf');

  // Cargar PDF cuando se abre el modal o cambian los filtros
  useEffect(() => {
    let active = true;
    let currentObjectUrl: string | null = null;

    if (!isOpen) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      return;
    }

    async function fetchPdf() {
      try {
        setLoading(true);
        setError(null);

        const { blob, filename: serverFilename } = await getTrazabilidadPdfBlob(clienteId, {
          ...filtros,
          preview: true,
        });

        if (!active) return;

        const objectUrl = URL.createObjectURL(blob);
        currentObjectUrl = objectUrl;
        setPdfUrl(objectUrl);
        if (serverFilename) {
          setFilename(serverFilename);
        }
      } catch (err: any) {
        if (!active) return;
        console.error('Error generando vista previa de PDF:', err);
        setError(err.message || 'No se pudo generar la vista previa del informe PDF.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchPdf();

    return () => {
      active = false;
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [isOpen, clienteId, JSON.stringify(filtros)]);

  // Manejador de descarga
  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Manejador de apertura en nueva pestaña
  const handleOpenNewTab = () => {
    if (!pdfUrl) return;
    window.open(pdfUrl, '_blank');
  };

  // Manejador de impresión
  const handlePrint = () => {
    if (!pdfUrl) return;
    const iframe = document.getElementById('pdf-preview-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.open(pdfUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  const periodoLabel = filtros.fechaDesde && filtros.fechaHasta
    ? `${filtros.fechaDesde} al ${filtros.fechaHasta}`
    : filtros.fechaDesde
    ? `Desde ${filtros.fechaDesde}`
    : filtros.fechaHasta
    ? `Hasta ${filtros.fechaHasta}`
    : 'Todo el Histórico Operacional';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 rounded-3xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col border border-slate-700/60 h-[92vh]">
        
        {/* HEADER CORPORATIVO DEL MODAL */}
        <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-600/20 border border-blue-500/30 text-blue-400 shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-black bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-md border border-blue-500/30">
                  MEK-TRZ-360
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                  <Calendar className="h-3.5 w-3.5" />
                  {periodoLabel}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3" />
                  {totalOrdenes} Intervenciones
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-1 leading-tight flex items-center gap-2">
                <span>Informe Ejecutivo de Trazabilidad & Mantenimiento</span>
                <span className="text-xs font-semibold text-slate-400 hidden md:inline">
                  • {clienteNombre}
                </span>
              </h2>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center gap-2 flex-wrap self-end sm:self-center">
            <button
              type="button"
              onClick={handleDownload}
              disabled={loading || !pdfUrl}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
              title="Descargar PDF oficial"
            >
              <Download className="h-4 w-4" />
              <span>Descargar PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !pdfUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl font-semibold text-xs border border-slate-700 transition-colors"
              title="Imprimir reporte"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleOpenNewTab}
              disabled={loading || !pdfUrl}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl font-semibold text-xs border border-slate-700 transition-colors"
              title="Abrir en pestaña nueva"
            >
              <ExternalLink className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors ml-1"
              title="Cerrar vista previa"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* CUERPO DEL VISOR PDF */}
        <div className="flex-1 bg-slate-950 relative overflow-hidden flex items-center justify-center">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-4 text-center p-6 text-slate-300 animate-in fade-in duration-150">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center animate-pulse">
                  <Sparkles className="h-8 w-8 text-blue-400 animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 bg-blue-600 rounded-full text-white">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Generando Informe Ejecutivo PDF...</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Consolidando histórico operacional, métricas de confiabilidad y formateando plantilla corporativa MEKANOS.
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center gap-3 text-center p-6 text-red-400 max-w-md">
              <AlertCircle className="h-10 w-10 text-red-500" />
              <p className="text-sm font-bold text-white">Error al generar el informe PDF</p>
              <p className="text-xs text-slate-400">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  getTrazabilidadPdfBlob(clienteId, { ...filtros, preview: true })
                    .then(({ blob, filename: fName }) => {
                      const url = URL.createObjectURL(blob);
                      setPdfUrl(url);
                      if (fName) setFilename(fName);
                      setLoading(false);
                    })
                    .catch((e) => {
                      setError(e.message || 'Error al reintentar');
                      setLoading(false);
                    });
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs border border-slate-700 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reintentar Generación</span>
              </button>
            </div>
          )}

          {!loading && !error && pdfUrl && (
            <iframe
              id="pdf-preview-iframe"
              src={`${pdfUrl}#toolbar=1&navpanes=0&scrollbar=1`}
              className="w-full h-full border-none rounded-b-2xl bg-white"
              title="Vista previa del informe PDF de trazabilidad"
            />
          )}
        </div>

        {/* BARRA INFERIOR / STATUS */}
        <div className="px-5 py-2.5 bg-slate-900 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-slate-300">Archivo:</span>
            <span className="font-mono text-slate-400 truncate">{filename}</span>
          </div>
          <span className="text-slate-400 hidden sm:inline">
            Formato A4 Oficial • Motor Puppeteer MEKANOS
          </span>
        </div>

      </div>
    </div>
  );
}
