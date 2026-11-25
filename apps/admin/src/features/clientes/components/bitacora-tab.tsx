/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: Tab Bitácora para Cliente Principal
 * 
 * Permite previsualizar informes mensuales agrupados por sede,
 * renombrar PDFs, y enviar email masivo con todos los adjuntos.
 */

'use client';


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Info,
  Loader2,
  Mail,
  MailCheck,
  Pencil,
  Plus,
  Send,
  Trash2,
  X,
  XCircle
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BitacoraHistorial, InformeHistorialBitacora, InformePreview, SedeGroup } from '../api/bitacoras.service';
import { useBitacoraHistorial, useBitacoraPreview, useEnviarBitacora, useMesesDisponibles } from '../hooks/use-bitacoras';
import { apiClient } from '@/lib/api';
import { previsualizarInformeAutenticado } from '@/lib/pdf-naming';

interface BitacoraTabProps {
  clienteId: number;
  clienteNombre: string;
}

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const CATEGORIAS = [
  { value: 'ENERGIA', label: 'Plantas Eléctricas' },
  { value: 'HIDRAULICA', label: 'Bombas' },
  { value: 'CLIMATIZACION', label: 'Climatización' },
  { value: 'COMPRESION', label: 'Compresión' },
];

const TIPOS_SERVICIO = [
  { value: 'GEN_PREV_A', label: 'Preventivo Tipo A - Generador' },
  { value: 'GEN_PREV_B', label: 'Preventivo Tipo B - Generador' },
  { value: 'BOM_PREV_A', label: 'Preventivo Tipo A - Bomba' },
  { value: 'GEN_CORR', label: 'Correctivo - Generador' },
  { value: 'BOM_CORR', label: 'Mantenimiento Correctivo - Bomba' },
  { value: 'COMP_PREV_A', label: 'Preventivo Tipo A - Compresor' },
  { value: 'BOM_PREV_A_GASOLINA', label: 'Preventivo Tipo A - Bomba Gasolina' },
  { value: 'CORRECTIVO', label: 'Mantenimiento Correctivo (General)' },
  { value: 'EMERGENCIA', label: 'Servicio de Emergencia' },
  { value: 'INSPECCION', label: 'Visita de Inspección' },
];

interface MultiCheckOption {
  value: string;
  label: string;
}

function MultiCheckDropdown({
  options,
  selected,
  onChange,
  allLabel,
  placeholder,
}: {
  options: MultiCheckOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  allLabel: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const toggleValue = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const summaryText = useMemo(() => {
    if (selected.length === 0) return allLabel;
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label || selected[0];
    }
    if (selected.length === 2) {
      return selected
        .map((v) => options.find((o) => o.value === v)?.label || v)
        .join(', ');
    }
    return `${selected.length} seleccionados`;
  }, [selected, options, allLabel]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        title={summaryText}
      >
        <span className="truncate text-left flex-1">
          {summaryText || placeholder}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selected.length > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-bold leading-none">
              {selected.length}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1.5 rounded-lg border bg-popover text-popover-foreground shadow-lg p-1.5 min-w-[230px]">
          <div className="flex items-center justify-between px-2 py-1.5 border-b mb-1">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer flex-1">
              <Checkbox
                checked={selected.length === 0}
                onCheckedChange={() => onChange([])}
              />
              <span>{allLabel}</span>
            </label>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-[11px] text-blue-600 hover:underline font-medium flex items-center gap-0.5"
              >
                <X className="h-3 w-3" />
                Limpiar
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {options.map((opt) => {
              const checked = selected.includes(opt.value);
              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                    checked ? 'bg-blue-50 text-blue-900 font-medium' : 'hover:bg-accent'
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleValue(opt.value)}
                  />
                  <span className="truncate flex-1">{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function BitacoraTab({ clienteId, clienteNombre }: BitacoraTabProps) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [categorias, setCategorias] = useState<string[]>(['ENERGIA']);
  const [tiposServicio, setTiposServicio] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [nombresCustom, setNombresCustom] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedSedes, setExpandedSedes] = useState<Set<number>>(new Set());
  const [expandedHistorial, setExpandedHistorial] = useState<Set<number>>(new Set());
  const [previewingDocId, setPreviewingDocId] = useState<number | null>(null);

  const categoriaQuery = useMemo(() => (categorias.length > 0 ? categorias.join(',') : undefined), [categorias]);
  const tipoServicioQuery = useMemo(() => (tiposServicio.length > 0 ? tiposServicio.join(',') : undefined), [tiposServicio]);

  // ✅ NUEVO: Modo rango de fechas
  const [modoRango, setModoRango] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // ✅ NUEVO: Estado para selección de documentos (inicialmente todos seleccionados)
  const [documentosSeleccionados, setDocumentosSeleccionados] = useState<Set<number>>(new Set());

  // ✅ NUEVO: Estado para emails editables
  const [emailsEditables, setEmailsEditables] = useState<string[]>([]);
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [emailEditando, setEmailEditando] = useState<number | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);
  // ✅ NUEVO: Estado para diálogo de envío con progreso
  const [showSendingDialog, setShowSendingDialog] = useState(false);
  const [sendingStep, setSendingStep] = useState<'preparing' | 'downloading' | 'sending' | 'completed' | 'error'>('preparing');
  const [sendingProgress, setSendingProgress] = useState({ current: 0, total: 0, batchInfo: '' });

  // Hooks
  const {
    data: preview,
    isLoading: loadingPreview,
    isError: errorPreview,
    error: previewError,
    refetch: refetchPreview,
  } = useBitacoraPreview(
    clienteId, mes, anio, categoriaQuery,
    { enabled: showPreview },
    modoRango ? fechaInicio : undefined,
    modoRango ? fechaFin : undefined,
    tipoServicioQuery,
  );

  const { data: historial, isLoading: loadingHistorial } = useBitacoraHistorial(clienteId);

  const { data: mesesData, isLoading: loadingMeses } = useMesesDisponibles(
    clienteId, categoriaQuery, undefined, tipoServicioQuery,
  );

  const enviarMutation = useEnviarBitacora();

  // ✅ NUEVO: Efecto para inicializar documentos seleccionados cuando carga el preview
  const documentosDisponibles = useMemo(() => {
    if (!preview?.sedes) return [];
    return preview.sedes.flatMap(s => s.informes);
  }, [preview]);

  // Inicializar todos los documentos como seleccionados cuando cambian los documentos disponibles
  useEffect(() => {
    if (documentosDisponibles.length > 0) {
      setDocumentosSeleccionados(new Set(documentosDisponibles.map(d => d.id_documento)));
    }
  }, [documentosDisponibles]);

  // ✅ NUEVO: Inicializar emails editables cuando cambia el preview
  useEffect(() => {
    if (preview?.emails_destinatarios) {
      setEmailsEditables([...preview.emails_destinatarios]);
    }
  }, [preview?.emails_destinatarios]);

  const handleBuscar = () => {
    setShowPreview(true);
    setExpandedSedes(new Set());
    setSendResult(null);
    setDocumentosSeleccionados(new Set()); // Reset selección
    setEmailsEditables([]); // Reset emails
    refetchPreview();
  };

  const toggleSede = (id: number) => {
    setExpandedSedes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    if (!preview?.sedes) return;
    setExpandedSedes(new Set(preview.sedes.map(s => s.id_cliente)));
  };

  const handleRename = (informeId: number, newName: string) => {
    setNombresCustom(prev => ({ ...prev, [informeId]: newName }));
    setEditingId(null);
  };

  // ✅ NUEVO: Funciones para manejar selección de documentos
  const toggleDocumentoSeleccionado = (idDocumento: number) => {
    setDocumentosSeleccionados(prev => {
      const next = new Set(prev);
      if (next.has(idDocumento)) {
        next.delete(idDocumento);
      } else {
        next.add(idDocumento);
      }
      return next;
    });
  };

  const documentosYaEnviados = useMemo(
    () => documentosDisponibles.filter((d) => Boolean(d.ya_enviado)),
    [documentosDisponibles],
  );

  const documentosPendientesEnvio = useMemo(
    () => documentosDisponibles.filter((d) => !d.ya_enviado),
    [documentosDisponibles],
  );

  const seleccionarTodos = () => {
    setDocumentosSeleccionados(new Set(documentosDisponibles.map(d => d.id_documento)));
  };

  const seleccionarSoloPendientes = () => {
    setDocumentosSeleccionados(new Set(documentosPendientesEnvio.map(d => d.id_documento)));
  };

  const deseleccionarTodos = () => {
    setDocumentosSeleccionados(new Set());
  };

  const toggleHistorialItem = (idBitacora: number) => {
    setExpandedHistorial((prev) => {
      const next = new Set(prev);
      if (next.has(idBitacora)) next.delete(idBitacora);
      else next.add(idBitacora);
      return next;
    });
  };

  const handleVerPdfHistorial = async (inf: InformeHistorialBitacora) => {
    if (inf.id_documento) {
      setPreviewingDocId(inf.id_documento);
      try {
        await previsualizarInformeAutenticado(apiClient, inf.id_documento);
      } catch (error) {
        console.error('[Bitácora Historial] Error visualizando informe:', error);
        if (inf.pdf_url) window.open(inf.pdf_url, '_blank', 'noopener,noreferrer');
      } finally {
        setPreviewingDocId(null);
      }
      return;
    }
    if (inf.pdf_url) {
      window.open(inf.pdf_url, '_blank', 'noopener,noreferrer');
    }
  };

  const seleccionarSede = (sede: SedeGroup, seleccionar: boolean) => {
    setDocumentosSeleccionados(prev => {
      const next = new Set(prev);
      sede.informes.forEach(informe => {
        if (seleccionar) {
          next.add(informe.id_documento);
        } else {
          next.delete(informe.id_documento);
        }
      });
      return next;
    });
  };

  // ✅ NUEVO: Funciones para gestionar emails
  const agregarEmail = () => {
    if (nuevoEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoEmail)) {
      if (!emailsEditables.includes(nuevoEmail)) {
        setEmailsEditables([...emailsEditables, nuevoEmail]);
        setNuevoEmail('');
      }
    }
  };

  const eliminarEmail = (index: number) => {
    setEmailsEditables(prev => prev.filter((_, i) => i !== index));
  };

  const editarEmail = (index: number, nuevoValor: string) => {
    setEmailsEditables(prev => {
      const nuevos = [...prev];
      nuevos[index] = nuevoValor;
      return nuevos;
    });
    setEmailEditando(null);
  };

  const documentosSeleccionadosList = useMemo(() => {
    return documentosDisponibles.filter(d => documentosSeleccionados.has(d.id_documento));
  }, [documentosDisponibles, documentosSeleccionados]);

  const handleEnviar = async () => {
    setShowConfirmDialog(false);
    setSendResult(null);
    setShowSendingDialog(true);
    setSendingStep('preparing');
    setSendingProgress({ current: 0, total: documentosSeleccionados.size, batchInfo: '' });

    // Validar que hay documentos seleccionados
    if (documentosSeleccionados.size === 0) {
      setSendingStep('error');
      setSendResult({
        success: false,
        message: 'Debe seleccionar al menos un documento para enviar',
      });
      setTimeout(() => setShowSendingDialog(false), 2000);
      return;
    }

    // Validar que hay destinatarios
    if (emailsEditables.length === 0) {
      setSendingStep('error');
      setSendResult({
        success: false,
        message: 'Debe agregar al menos un destinatario de email',
      });
      setTimeout(() => setShowSendingDialog(false), 2000);
      return;
    }

    try {
      setSendingStep('downloading');
      // Simular progreso de descarga de PDFs
      for (let i = 1; i <= Math.min(3, documentosSeleccionados.size); i++) {
        await new Promise(r => setTimeout(r, 300));
        setSendingProgress(prev => ({ ...prev, current: i }));
      }

      setSendingStep('sending');
      setSendingProgress(prev => ({ ...prev, current: documentosSeleccionados.size, batchInfo: 'Enviando emails...' }));

      const result = await enviarMutation.mutateAsync({
        id_cliente_principal: clienteId,
        mes,
        anio,
        categoria: categoriaQuery || 'TODAS',
        // ✅ NUEVO: Solo enviar documentos seleccionados
        documentos_ids: Array.from(documentosSeleccionados),
        nombres_pdf: Object.keys(nombresCustom).length > 0 ? nombresCustom : undefined,
        // ✅ NUEVO: Usar emails editables en lugar de los del sistema
        email_destino: emailsEditables.join(','),
        // ✅ Rango de fechas (si aplica)
        ...(modoRango && fechaInicio && fechaFin ? { fecha_inicio: fechaInicio, fecha_fin: fechaFin } : {}),
      });

      setSendingStep('completed');
      // Usar el conteo de destinatarios como proxy para batches (1 batch por cada 20 PDFs aprox)
      const estimatedBatches = Math.ceil(documentosSeleccionados.size / 20);
      setSendingProgress(prev => ({ ...prev, batchInfo: `${estimatedBatches} email(s) enviado(s)` }));

      setSendResult({
        success: result.email_enviado,
        message: result.email_enviado
          ? `Bitácora enviada exitosamente a ${result.destinatarios.join(', ')} (${result.informes_enviados} informes)`
          : result.error || 'Error al enviar la bitácora',
      });

      // Cerrar diálogo después de 2 segundos en éxito
      if (result.email_enviado) {
        setTimeout(() => {
          setShowSendingDialog(false);
          setTimeout(() => setSendingStep('preparing'), 300);
        }, 2500);
      }
    } catch (err: any) {
      setSendingStep('error');
      setSendResult({
        success: false,
        message: err?.response?.data?.message || err?.message || 'Error inesperado al enviar',
      });
    }
  };

  const mesLabel = MESES.find(m => m.value === mes)?.label || '';
  const catLabel =
    categorias.length === 0
      ? 'Todas las categorías'
      : categorias.map((c) => CATEGORIAS.find((item) => item.value === c)?.label || c).join(', ');
  const tipoServicioLabel =
    tiposServicio.length === 0
      ? 'Todos los tipos'
      : tiposServicio.map((t) => TIPOS_SERVICIO.find((item) => item.value === t)?.label || t).join(', ');
  const periodoResumen = modoRango && fechaInicio && fechaFin ? `${fechaInicio} a ${fechaFin}` : `${mesLabel} ${anio}`;

  // Años disponibles
  const anios = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Bitácora de Informes {modoRango ? 'por Rango de Fechas' : 'Mensuales'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle modo rango */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="modo-rango"
              checked={modoRango}
              onCheckedChange={(checked) => {
                setModoRango(!!checked);
                setShowPreview(false);
                setSendResult(null);
              }}
            />
            <Label htmlFor="modo-rango" className="text-sm font-medium cursor-pointer">
              Buscar por rango de fechas
            </Label>
            {modoRango && (
              <Badge variant="outline" className="ml-2 text-xs text-blue-600 border-blue-300">
                Modo Rango
              </Badge>
            )}
          </div>

          {/* Filtros según modo */}
          {modoRango ? (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Equipo</Label>
                <MultiCheckDropdown
                  options={CATEGORIAS}
                  selected={categorias}
                  onChange={setCategorias}
                  allLabel="Todas las categorías"
                  placeholder="Seleccionar equipos..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Servicio</Label>
                <MultiCheckDropdown
                  options={TIPOS_SERVICIO}
                  selected={tiposServicio}
                  onChange={setTiposServicio}
                  allLabel="Todos los tipos"
                  placeholder="Seleccionar servicios..."
                />
              </div>

              <Button onClick={handleBuscar} disabled={loadingPreview || !fechaInicio || !fechaFin}>
                {loadingPreview ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Buscar Informes
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label>Mes</Label>
                <Select value={String(mes)} onValueChange={v => setMes(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map(m => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Año</Label>
                <Select value={String(anio)} onValueChange={v => setAnio(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anios.map(a => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Equipo</Label>
                <MultiCheckDropdown
                  options={CATEGORIAS}
                  selected={categorias}
                  onChange={setCategorias}
                  allLabel="Todas las categorías"
                  placeholder="Seleccionar equipos..."
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Servicio</Label>
                <MultiCheckDropdown
                  options={TIPOS_SERVICIO}
                  selected={tiposServicio}
                  onChange={setTiposServicio}
                  allLabel="Todos los tipos"
                  placeholder="Seleccionar servicios..."
                />
              </div>

              <Button onClick={handleBuscar} disabled={loadingPreview}>
                {loadingPreview ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4 mr-2" />
                )}
                Buscar Informes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meses con datos disponibles */}
      {mesesData && mesesData.meses.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="py-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Meses con informes disponibles ({catLabel}{tiposServicio.length > 0 ? ` · ${tipoServicioLabel}` : ''})
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {mesesData.meses.map(m => {
                    const isSelected = m.mes === mes && m.anio === anio;
                    return (
                      <button
                        key={`${m.anio}-${m.mes}`}
                        onClick={() => { setMes(m.mes); setAnio(m.anio); }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${isSelected
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-amber-800 border-amber-300 hover:bg-amber-100'
                          }`}
                      >
                        {MESES.find(mm => mm.value === m.mes)?.label} {m.anio}
                        <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">{m.count}</Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      {mesesData && mesesData.meses.length === 0 && !loadingMeses && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-orange-500" />
              <p className="text-sm text-orange-800">
                No hay informes generados para <strong>{catLabel}</strong>
                {tiposServicio.length > 0 && <> ({tipoServicioLabel})</>} en este cliente.
                {(categorias.length > 0 || tiposServicio.length > 0) && ' Pruebe ampliando los filtros seleccionados.'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resultado: Feedback de envío */}
      {sendResult && (
        <Card className={sendResult.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              {sendResult.success ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <p className={sendResult.success ? 'text-green-800' : 'text-red-800'}>
                {sendResult.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loadingPreview && showPreview && (
        <div className="space-y-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      )}

      {/* Error */}
      {errorPreview && showPreview && (
        <Card className="border-red-300">
          <CardContent className="py-6 text-center">
            <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700">{(previewError as Error)?.message || 'Error al cargar preview'}</p>
          </CardContent>
        </Card>
      )}

      {/* Preview de informes */}
      {preview && showPreview && !loadingPreview && (
        <>
          {/* Resumen con controles de selección y alerta proactiva de informes ya enviados */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">
                  {catLabel} - {periodoResumen}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{preview.total_informes} informes</Badge>
                  <Badge variant={preview.total_con_pdf === preview.total_informes ? 'default' : 'destructive'}>
                    {preview.total_con_pdf} con PDF
                  </Badge>
                  {documentosYaEnviados.length > 0 && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                      <MailCheck className="h-3 w-3 mr-1" />
                      {documentosYaEnviados.length} ya enviado(s)
                    </Badge>
                  )}
                  {documentosPendientesEnvio.length > 0 && documentosYaEnviados.length > 0 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                      {documentosPendientesEnvio.length} pendiente(s)
                    </Badge>
                  )}
                  {preview.total_sin_pdf > 0 && (
                    <Badge variant="destructive">{preview.total_sin_pdf} sin PDF</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* ✅ Banner proactivo cuando existen informes ya enviados en bitácora u orden */}
              {documentosYaEnviados.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50/80">
                  <div className="flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        {documentosYaEnviados.length} de {documentosDisponibles.length} informe(s) ya fueron enviados anteriormente
                      </p>
                      <p className="text-amber-800 mt-0.5">
                        Cada fila muestra si el informe ya salió en otra bitácora o tiene el envío registrado en su orden (✉️). Puede excluirlos en un clic para evitar duplicados.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={seleccionarSoloPendientes}
                      disabled={documentosPendientesEnvio.length === 0}
                      className="h-8 text-xs bg-white border-amber-300 text-amber-900 hover:bg-amber-100"
                    >
                      <Filter className="h-3.5 w-3.5 mr-1.5" />
                      Solo pendientes ({documentosPendientesEnvio.length})
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={seleccionarTodos}
                      className="h-8 text-xs text-amber-900 hover:bg-amber-100"
                    >
                      Todos ({documentosDisponibles.length})
                    </Button>
                  </div>
                </div>
              )}

              {/* Controles de selección masiva */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all"
                      checked={documentosSeleccionados.size === documentosDisponibles.length && documentosDisponibles.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) seleccionarTodos();
                        else deseleccionarTodos();
                      }}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                      {documentosSeleccionados.size === documentosDisponibles.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                    </label>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {documentosSeleccionados.size} de {documentosDisponibles.length} seleccionados
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Destinatarios: </span>
                  <span className="font-medium text-foreground">
                    {preview.emails_destinatarios.length > 0
                      ? preview.emails_destinatarios.join(', ')
                      : 'Sin destinatarios configurados'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informes por sede */}
          {preview.sedes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-lg font-medium">No se encontraron informes</p>
                <p className="text-muted-foreground text-sm mt-1">
                  No hay informes generados para {catLabel} en {mesLabel} {anio}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Informes por Sede ({preview.sedes.length} sedes)
                </h3>
                <Button variant="ghost" size="sm" onClick={expandAll}>
                  Expandir todo
                </Button>
              </div>

              {preview.sedes.map((sede: SedeGroup) => (
                <SedeCard
                  key={sede.id_cliente}
                  sede={sede}
                  expanded={expandedSedes.has(sede.id_cliente)}
                  onToggle={() => toggleSede(sede.id_cliente)}
                  editingId={editingId}
                  nombresCustom={nombresCustom}
                  onStartEdit={setEditingId}
                  onRename={handleRename}
                  // ✅ NUEVO: Props de selección
                  documentosSeleccionados={documentosSeleccionados}
                  onToggleDocumento={toggleDocumentoSeleccionado}
                  onSeleccionarSede={seleccionarSede}
                />
              ))}
            </div>
          )}

          {/* Botón de enviar */}
          {documentosDisponibles.length > 0 && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">
                      {documentosSeleccionados.size} de {documentosDisponibles.length} informe(s) seleccionados para enviar
                    </p>
                    <p className="text-sm text-blue-700">
                      Se enviarán a: {emailsEditables.length > 0
                        ? emailsEditables.join(', ')
                        : preview?.emails_destinatarios.join(', ') || 'Sin destinatarios'}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => {
                      // Inicializar emails editables si están vacíos
                      if (emailsEditables.length === 0 && preview?.emails_destinatarios) {
                        setEmailsEditables([...preview.emails_destinatarios]);
                      }
                      setShowConfirmDialog(true);
                    }}
                    disabled={enviarMutation.isPending || documentosSeleccionados.size === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {enviarMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Enviar Bitácora
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Historial de Bitácoras con desglose expandible de informes enviados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Historial de Bitácoras
            </span>
            {historial && historial.length > 0 && (
              <Badge variant="outline" className="text-[11px] font-normal">
                {historial.length} envío(s) registrados · clic para ver informes
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingHistorial ? (
            <Skeleton className="h-20" />
          ) : !historial || historial.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No hay bitácoras enviadas anteriormente
            </p>
          ) : (
            <div className="space-y-2.5">
              {historial.map((b: BitacoraHistorial) => {
                const isExpanded = expandedHistorial.has(b.id_bitacora);
                const informesLista = b.informes_enviados || [];
                const fechaEnvioTexto = b.enviada_cliente_fecha
                  ? new Date(b.enviada_cliente_fecha).toLocaleString('es-CO', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : null;

                return (
                  <div
                    key={b.id_bitacora}
                    className="rounded-lg border bg-card overflow-hidden transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => toggleHistorialItem(b.id_bitacora)}
                      className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-accent/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold font-mono">{b.numero_bitacora}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {b.cantidad_informes} informe(s)
                            </Badge>
                            {informesLista.length > 0 && (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                {informesLista.length} con trazabilidad
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {MESES.find(m => m.value === b.mes)?.label} {b.anio}
                            {b.observaciones ? ` · ${b.observaciones}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant={b.estado_bitacora === 'ENVIADA' || b.estado_bitacora === 'APROBADA' ? 'default' : 'secondary'}
                          className={b.estado_bitacora === 'ENVIADA' ? 'bg-emerald-600' : ''}
                        >
                          {b.estado_bitacora}
                        </Badge>
                        {fechaEnvioTexto && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
                            {fechaEnvioTexto}
                          </span>
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t bg-slate-50/70 px-4 py-3 space-y-2">
                        {informesLista.length > 0 ? (
                          <>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              Informes enviados en {b.numero_bitacora} ({informesLista.length})
                            </p>
                            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                              {informesLista.map((inf) => (
                                <div
                                  key={`${b.id_bitacora}-${inf.id_informe}`}
                                  className="flex items-center justify-between gap-2 p-2 rounded-md border bg-white text-xs"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <span className="text-[10px] font-mono text-slate-400 w-5 text-right flex-shrink-0">
                                      #{inf.orden_bitacora}
                                    </span>
                                    <Link
                                      href={`/ordenes/${inf.id_orden_servicio}`}
                                      className="font-mono font-semibold text-blue-700 hover:underline inline-flex items-center gap-1 flex-shrink-0"
                                      title="Abrir orden de servicio"
                                    >
                                      {inf.numero_orden}
                                      <ExternalLink className="h-3 w-3" />
                                    </Link>
                                    <span className="text-slate-300">|</span>
                                    <span className="font-medium text-slate-800 truncate" title={inf.equipo_nombre}>
                                      {inf.equipo_nombre}
                                    </span>
                                    {inf.nombre_sede && (
                                      <>
                                        <span className="text-slate-300 hidden md:inline">|</span>
                                        <span className="text-slate-500 truncate hidden md:inline">
                                          {inf.nombre_sede}
                                        </span>
                                      </>
                                    )}
                                    {inf.tipo_servicio && (
                                      <>
                                        <span className="text-slate-300 hidden lg:inline">|</span>
                                        <span className="text-slate-500 truncate hidden lg:inline">
                                          {inf.tipo_servicio}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {inf.fecha_servicio && (
                                      <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                        {new Date(inf.fecha_servicio).toLocaleDateString('es-CO', {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                        })}
                                      </span>
                                    )}
                                    {(inf.id_documento || inf.pdf_url) && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleVerPdfHistorial(inf)}
                                        disabled={previewingDocId === inf.id_documento}
                                        className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                        title="Ver PDF enviado"
                                      >
                                        {previewingDocId === inf.id_documento ? (
                                          <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                          <>
                                            <Eye className="h-3 w-3 mr-1" />
                                            <span className="text-[10px]">PDF</span>
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-slate-500 py-1">
                            <Info className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                            <span>
                              Bitácora histórica anterior al registro detallado de informes por envío
                              {fechaEnvioTexto ? ` · Enviada el ${fechaEnvioTexto}` : ''}.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmación mejorado */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envío de Bitácora</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-muted-foreground space-y-4">
                <span className="block">
                  Se enviará la bitácora de <strong>{catLabel}</strong> de{' '}
                  <strong>{mesLabel} {anio}</strong> para <strong>{clienteNombre}</strong>.
                </span>

                {/* ✅ NUEVO: Resumen de documentos seleccionados */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="font-semibold text-green-900 text-sm mb-2">
                    <Check className="h-4 w-4 inline mr-1" />
                    Documentos seleccionados ({documentosSeleccionados.size} de {documentosDisponibles.length})
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {documentosSeleccionadosList.map((doc) => (
                      <div key={doc.id_documento} className="text-xs text-green-800 flex items-center gap-2 bg-white rounded p-1.5">
                        <FileText className="h-3 w-3" />
                        <span className="truncate">{nombresCustom[doc.id_documento] || doc.nombre_sugerido}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-500">{doc.nombre_sede}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ✅ NUEVO: Gestión de destinatarios editable */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
                  <p className="font-semibold text-blue-900 text-sm flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Destinatarios del Email
                  </p>

                  {/* Lista de emails editables */}
                  <div className="space-y-2">
                    {emailsEditables.map((email, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white rounded border border-blue-100 p-2">
                        {emailEditando === index ? (
                          <>
                            <Input
                              value={email}
                              onChange={(e) => editarEmail(index, e.target.value)}
                              onBlur={() => setEmailEditando(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') setEmailEditando(null);
                              }}
                              className="h-7 text-sm flex-1"
                              autoFocus
                            />
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEmailEditando(null)}>
                              <Check className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Mail className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-sm flex-1">{email}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => setEmailEditando(index)}
                            >
                              <Pencil className="h-3.5 w-3.5 text-gray-500" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-red-500 hover:text-red-700"
                              onClick={() => eliminarEmail(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Agregar nuevo email */}
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="nuevo@email.com"
                      value={nuevoEmail}
                      onChange={(e) => setNuevoEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') agregarEmail();
                      }}
                      className="h-9 text-sm flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={agregarEmail}
                      disabled={!nuevoEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nuevoEmail)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar
                    </Button>
                  </div>

                  {emailsEditables.length === 0 && (
                    <p className="text-xs text-orange-600">
                      ⚠ Agregue al menos un destinatario para poder enviar la bitácora.
                    </p>
                  )}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setEmailEditando(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEnviar}
              disabled={documentosSeleccionados.size === 0 || emailsEditables.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Confirmar Envío ({documentosSeleccionados.size} docs)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de progreso de envío */}
      <Dialog open={showSendingDialog} onOpenChange={(open) => {
        // No permitir cerrar manualmente mientras se está enviando
        if (!open && (sendingStep === 'completed' || sendingStep === 'error')) {
          setShowSendingDialog(false);
        }
      }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => {
          // Prevenir cierre al hacer clic fuera
          if (sendingStep !== 'completed' && sendingStep !== 'error') {
            e.preventDefault();
          }
        }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {sendingStep === 'completed' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : sendingStep === 'error' ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
              )}
              {sendingStep === 'preparing' && 'Preparando envío...'}
              {sendingStep === 'downloading' && 'Descargando PDFs...'}
              {sendingStep === 'sending' && 'Enviando bitácora...'}
              {sendingStep === 'completed' && '¡Envío completado!'}
              {sendingStep === 'error' && 'Error al enviar'}
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-4 pt-4">
                {/* Barra de progreso */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {sendingStep === 'preparing' && 'Verificando documentos y destinatarios...'}
                      {sendingStep === 'downloading' && `Descargando ${sendingProgress.total} documentos...`}
                      {sendingStep === 'sending' && 'Enviando emails con adjuntos...'}
                      {sendingStep === 'completed' && 'Todos los emails han sido enviados'}
                      {sendingStep === 'error' && sendResult?.message}
                    </span>
                  </div>

                  {/* Barra de progreso visual */}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${sendingStep === 'error' ? 'bg-red-500' :
                        sendingStep === 'completed' ? 'bg-green-500' : 'bg-blue-600'
                        }`}
                      style={{
                        width: sendingStep === 'completed' ? '100%' :
                          sendingStep === 'error' ? '100%' :
                            sendingStep === 'sending' ? '75%' :
                              `${(sendingProgress.current / Math.max(sendingProgress.total, 1)) * 50}%`
                      }}
                    />
                  </div>

                  {/* Info adicional */}
                  {sendingProgress.batchInfo && (
                    <p className="text-xs text-muted-foreground text-center">
                      {sendingProgress.batchInfo}
                    </p>
                  )}
                </div>

                {/* Resumen de envío */}
                {sendingStep === 'completed' && sendResult?.success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                    <p className="font-medium text-green-900">
                      {documentosSeleccionados.size} documentos enviados
                    </p>
                    <p className="text-green-700 text-xs mt-1">
                      Destinatarios: {emailsEditables.join(', ')}
                    </p>
                  </div>
                )}

                {/* Botón para cerrar en error o completado */}
                {(sendingStep === 'completed' || sendingStep === 'error') && (
                  <Button
                    onClick={() => setShowSendingDialog(false)}
                    className={`w-full ${sendingStep === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {sendingStep === 'error' ? 'Entendido' : 'Cerrar'}
                  </Button>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Subcomponente: Card de una Sede con sus informes
// ═══════════════════════════════════════════════════════════════

interface SedeCardProps {
  sede: SedeGroup;
  expanded: boolean;
  onToggle: () => void;
  editingId: number | null;
  nombresCustom: Record<number, string>;
  onStartEdit: (id: number | null) => void;
  onRename: (id: number, name: string) => void;
  // ✅ NUEVO: Props para selección
  documentosSeleccionados: Set<number>;
  onToggleDocumento: (id: number) => void;
  onSeleccionarSede: (sede: SedeGroup, seleccionar: boolean) => void;
}

function SedeCard({
  sede,
  expanded,
  onToggle,
  editingId,
  nombresCustom,
  onStartEdit,
  onRename,
  documentosSeleccionados,
  onToggleDocumento,
  onSeleccionarSede,
}: SedeCardProps) {
  // Verificar si todos los documentos de esta sede están seleccionados
  const todosSeleccionados = sede.informes.every(i => documentosSeleccionados.has(i.id_documento));
  const algunoSeleccionado = sede.informes.some(i => documentosSeleccionados.has(i.id_documento));
  const totalEnviadosSede = sede.informes.filter(i => Boolean(i.ya_enviado)).length;

  return (
    <Card>
      <div
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-t-lg cursor-pointer"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Checkbox
            checked={todosSeleccionados}
            onCheckedChange={(checked) => {
              onSeleccionarSede(sede, checked as boolean);
            }}
            onClick={(e) => e.stopPropagation()}
            className={algunoSeleccionado && !todosSeleccionados ? "bg-blue-100" : ""}
          />
          <Building2 className="h-4 w-4 text-blue-600" />
          <span className="font-semibold">{sede.nombre_sede}</span>
          <Badge variant="outline" className="text-[10px]">
            {sede.informes.filter(i => documentosSeleccionados.has(i.id_documento)).length} / {sede.informes.length} seleccionados
          </Badge>
          {totalEnviadosSede > 0 && (
            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
              <MailCheck className="h-3 w-3 mr-1" />
              {totalEnviadosSede} ya enviado(s)
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{sede.informes.length} informe(s)</Badge>
          <Badge variant="default" className="bg-green-600 text-[10px]">{sede.informes.length} PDF</Badge>
        </div>
      </div>

      {expanded && (
        <CardContent className="pt-0">
          <Separator className="mb-3" />
          <div className="space-y-2">
            {sede.informes.map((informe: InformePreview) => (
              <InformeRow
                key={informe.id_documento}
                informe={informe}
                isEditing={editingId === informe.id_documento}
                customName={nombresCustom[informe.id_documento]}
                onStartEdit={() => onStartEdit(informe.id_documento)}
                onRename={(name) => onRename(informe.id_documento, name)}
                onCancelEdit={() => onStartEdit(null)}
                // ✅ NUEVO: Props de selección
                isSelected={documentosSeleccionados.has(informe.id_documento)}
                onToggleSelect={() => onToggleDocumento(informe.id_documento)}
              />
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// Subcomponente: Fila de un informe individual
// ═══════════════════════════════════════════════════════════════

interface InformeRowProps {
  informe: InformePreview;
  isEditing: boolean;
  customName?: string;
  onStartEdit: () => void;
  onRename: (name: string) => void;
  onCancelEdit: () => void;
  // ✅ NUEVO: Props de selección
  isSelected: boolean;
  onToggleSelect: () => void;
}

function InformeRow({
  informe,
  isEditing,
  customName,
  onStartEdit,
  onRename,
  onCancelEdit,
  isSelected,
  onToggleSelect,
}: InformeRowProps) {
  const [editValue, setEditValue] = useState(customName || informe.nombre_sugerido);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const displayName = customName || informe.nombre_sugerido;
  const fechaStr = informe.fecha_servicio
    ? new Date(informe.fecha_servicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    : 'Sin fecha';

  // ✅ NUEVO: Visualizar PDF del informe en nueva pestaña
  const handleVisualizar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsPreviewing(true);
    try {
      // 1) Proxy autenticado vía endpoint /preview — streaming con Content-Disposition: inline
      if (informe.id_documento) {
        await previsualizarInformeAutenticado(apiClient, informe.id_documento);
        return;
      }
      // 2) Fallback: URL directa del PDF (R2) si no hay id_documento
      if (informe.pdf_url) {
        window.open(informe.pdf_url, '_blank', 'noopener,noreferrer');
        return;
      }
      alert('Este informe no tiene PDF disponible todavía.');
    } catch (error) {
      console.error('[Bitácora] Error visualizando informe:', error);
      alert('No se pudo visualizar el PDF. Intente nuevamente.');
    } finally {
      setIsPreviewing(false);
    }
  };

  // Determina si hay PDF disponible
  const tienePdf = Boolean(informe.pdf_url) || Boolean(informe.id_documento);

  const bitacorasPrevias = informe.bitacoras_previas || [];
  const totalEmailsOrden = informe.total_emails_enviados || 0;
  const yaEnviadoBitacora = Boolean(informe.ya_enviado_en_bitacora && bitacorasPrevias.length > 0);
  const yaEnviadoOrden = Boolean(informe.ya_enviado_en_orden || totalEmailsOrden > 0);
  const yaEnviado = Boolean(informe.ya_enviado || yaEnviadoBitacora || yaEnviadoOrden);

  const tooltipBitacoras = bitacorasPrevias
    .map((b) => {
      const f = b.fecha_envio ? new Date(b.fecha_envio).toLocaleDateString('es-CO') : `${b.mes}/${b.anio}`;
      return `${b.numero_bitacora} (${f})`;
    })
    .join(', ');

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-lg border bg-white transition-colors ${
        isSelected
          ? yaEnviado
            ? 'border-amber-300 bg-amber-50/30'
            : 'border-blue-300 bg-blue-50/30'
          : yaEnviado
            ? 'border-emerald-200/80 bg-emerald-50/20'
            : ''
      }`}
    >
      {/* ✅ NUEVO: Checkbox de selección */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        className="flex-shrink-0"
      />

      <FileText className={`h-4 w-4 flex-shrink-0 ${yaEnviado ? 'text-emerald-600' : 'text-green-600'}`} />

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Input
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              className="h-7 text-xs"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') onRename(editValue);
                if (e.key === 'Escape') onCancelEdit();
              }}
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onRename(editValue)}>
              <CheckCircle2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <p className={`text-xs font-mono truncate ${isSelected ? 'font-semibold' : ''}`} title={displayName}>
              {displayName}
            </p>
            <button onClick={onStartEdit} className="text-muted-foreground hover:text-foreground flex-shrink-0">
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
          <Link
            href={`/ordenes/${informe.id_orden_servicio}`}
            onClick={(e) => e.stopPropagation()}
            className="font-mono font-semibold text-blue-700 hover:underline inline-flex items-center gap-0.5"
            title="Ver orden de servicio"
          >
            {informe.numero_orden}
            <ExternalLink className="h-2.5 w-2.5" />
          </Link>
          <span>|</span>
          <span>{informe.equipo_nombre}</span>
          <span>|</span>
          <span>{informe.tipo_servicio || 'N/A'}</span>
          <span>|</span>
          <span>{fechaStr}</span>

          {/* ✅ Badges proactivos de envío previo */}
          {yaEnviadoBitacora && (
            <span
              title={`Enviado previamente en bitácora(s): ${tooltipBitacoras}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
            >
              <BookOpen className="h-2.5 w-2.5" />
              {bitacorasPrevias[0].numero_bitacora}
              {bitacorasPrevias.length > 1 ? ` +${bitacorasPrevias.length - 1}` : ''}
            </span>
          )}
          {yaEnviadoOrden && (
            <span
              title={
                informe.ultimo_envio_fecha
                  ? `Último envío registrado en la orden: ${new Date(informe.ultimo_envio_fecha).toLocaleString('es-CO')}`
                  : 'Orden con envío de informe registrado'
              }
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            >
              <Mail className="h-2.5 w-2.5" />
              Enviado ({totalEmailsOrden})
            </span>
          )}
          {!yaEnviado && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              Sin enviar
            </span>
          )}
        </div>
      </div>

      {/* ✅ NUEVO: Botón Visualizar PDF */}
      {tienePdf && !isEditing && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleVisualizar}
          disabled={isPreviewing}
          className="flex-shrink-0 h-7 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          title="Visualizar PDF en nueva pestaña"
        >
          {isPreviewing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span className="ml-1 text-[10px] font-semibold hidden sm:inline">Ver</span>
            </>
          )}
        </Button>
      )}

      <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${isSelected ? 'text-blue-700 border-blue-300 bg-blue-50' : 'text-green-700 border-green-300 bg-green-50'}`}>
        {isSelected ? 'INCLUIR' : 'PDF'}
      </Badge>
    </div>
  );
}
