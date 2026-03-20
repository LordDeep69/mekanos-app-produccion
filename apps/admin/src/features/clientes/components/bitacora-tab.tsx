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
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Send,
  Trash2,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { InformePreview, SedeGroup } from '../api/bitacoras.service';
import { useBitacoraHistorial, useBitacoraPreview, useEnviarBitacora, useMesesDisponibles } from '../hooks/use-bitacoras';

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
  { value: '', label: 'Todas las categorías' },
  { value: 'ENERGIA', label: 'Plantas Eléctricas' },
  { value: 'HIDRAULICA', label: 'Bombas' },
  { value: 'CLIMATIZACION', label: 'Climatización' },
  { value: 'COMPRESION', label: 'Compresión' },
];

export function BitacoraTab({ clienteId, clienteNombre }: BitacoraTabProps) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [categoria, setCategoria] = useState('ENERGIA');
  const [showPreview, setShowPreview] = useState(false);
  const [nombresCustom, setNombresCustom] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedSedes, setExpandedSedes] = useState<Set<number>>(new Set());

  // ✅ NUEVO: Estado para selección de documentos (inicialmente todos seleccionados)
  const [documentosSeleccionados, setDocumentosSeleccionados] = useState<Set<number>>(new Set());

  // ✅ NUEVO: Estado para emails editables
  const [emailsEditables, setEmailsEditables] = useState<string[]>([]);
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [emailEditando, setEmailEditando] = useState<number | null>(null);

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Hooks
  const {
    data: preview,
    isLoading: loadingPreview,
    isError: errorPreview,
    error: previewError,
    refetch: refetchPreview,
  } = useBitacoraPreview(clienteId, mes, anio, categoria || undefined, {
    enabled: showPreview,
  });

  const { data: historial, isLoading: loadingHistorial } = useBitacoraHistorial(clienteId);

  const { data: mesesData, isLoading: loadingMeses } = useMesesDisponibles(
    clienteId, categoria || undefined,
  );

  const enviarMutation = useEnviarBitacora();

  // ✅ NUEVO: Efecto para inicializar documentos seleccionados cuando carga el preview
  const documentosDisponibles = useMemo(() => {
    if (!preview?.sedes) return [];
    return preview.sedes.flatMap(s => s.informes);
  }, [preview]);

  // Inicializar todos los documentos como seleccionados cuando carga el preview
  useEffect(() => {
    if (documentosDisponibles.length > 0 && documentosSeleccionados.size === 0) {
      setDocumentosSeleccionados(new Set(documentosDisponibles.map(d => d.id_documento)));
    }
  }, [documentosDisponibles]);

  // ✅ NUEVO: Inicializar emails editables cuando cambia el preview
  useEffect(() => {
    if (preview?.emails_destinatarios && emailsEditables.length === 0) {
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

  const seleccionarTodos = () => {
    setDocumentosSeleccionados(new Set(documentosDisponibles.map(d => d.id_documento)));
  };

  const deseleccionarTodos = () => {
    setDocumentosSeleccionados(new Set());
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

    // Validar que hay documentos seleccionados
    if (documentosSeleccionados.size === 0) {
      setSendResult({
        success: false,
        message: 'Debe seleccionar al menos un documento para enviar',
      });
      return;
    }

    // Validar que hay destinatarios
    if (emailsEditables.length === 0) {
      setSendResult({
        success: false,
        message: 'Debe agregar al menos un destinatario de email',
      });
      return;
    }

    try {
      const result = await enviarMutation.mutateAsync({
        id_cliente_principal: clienteId,
        mes,
        anio,
        categoria: categoria || 'TODAS',
        // ✅ NUEVO: Solo enviar documentos seleccionados
        documentos_ids: Array.from(documentosSeleccionados),
        nombres_pdf: Object.keys(nombresCustom).length > 0 ? nombresCustom : undefined,
        // ✅ NUEVO: Usar emails editables en lugar de los del sistema
        email_destino: emailsEditables.join(','),
      });

      setSendResult({
        success: result.email_enviado,
        message: result.email_enviado
          ? `Bitácora enviada exitosamente a ${result.destinatarios.join(', ')} (${result.informes_enviados} informes)`
          : result.error || 'Error al enviar la bitácora',
      });
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err?.response?.data?.message || err?.message || 'Error inesperado al enviar',
      });
    }
  };

  const mesLabel = MESES.find(m => m.value === mes)?.label || '';
  const catLabel = CATEGORIAS.find(c => c.value === categoria)?.label || 'Todas';

  // Años disponibles
  const anios = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Bitácora de Informes Mensuales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
              <Select value={categoria} onValueChange={v => setCategoria(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map(c => (
                    <SelectItem key={c.value} value={c.value || '_all'}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  Meses con informes disponibles ({catLabel})
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
                No hay informes generados para <strong>{catLabel}</strong> en este cliente.
                {categoria && ' Pruebe con otra categoría o "Todas las categorías".'}
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
          {/* Resumen con controles de selección */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {catLabel} - {mesLabel} {anio}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{preview.total_informes} informes</Badge>
                  <Badge variant={preview.total_con_pdf === preview.total_informes ? 'default' : 'destructive'}>
                    {preview.total_con_pdf} con PDF
                  </Badge>
                  {preview.total_sin_pdf > 0 && (
                    <Badge variant="destructive">{preview.total_sin_pdf} sin PDF</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ✅ NUEVO: Controles de selección masiva */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Historial de Bitácoras
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
            <div className="space-y-2">
              {historial.map(b => (
                <div
                  key={b.id_bitacora}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{b.numero_bitacora}</p>
                      <p className="text-xs text-muted-foreground">
                        {MESES.find(m => m.value === b.mes)?.label} {b.anio} - {b.cantidad_informes} informes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={b.estado_bitacora === 'ENVIADA' ? 'default' : b.estado_bitacora === 'APROBADA' ? 'default' : 'secondary'}>
                      {b.estado_bitacora}
                    </Badge>
                    {b.enviada_cliente_fecha && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(b.enviada_cliente_fecha).toLocaleDateString('es-CO')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmación mejorado */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envío de Bitácora</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
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

  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
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
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{sede.informes.length} informe(s)</Badge>
          <Badge variant="default" className="bg-green-600 text-[10px]">{sede.informes.length} PDF</Badge>
        </div>
      </button>

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
  const displayName = customName || informe.nombre_sugerido;
  const fechaStr = informe.fecha_servicio
    ? new Date(informe.fecha_servicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    : 'Sin fecha';

  return (
    <div className={`flex items-center gap-3 p-2.5 rounded-lg border bg-white transition-colors ${isSelected ? 'border-blue-300 bg-blue-50/30' : ''}`}>
      {/* ✅ NUEVO: Checkbox de selección */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        className="flex-shrink-0"
      />

      <FileText className="h-4 w-4 flex-shrink-0 text-green-600" />

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
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
          <span>{informe.numero_orden}</span>
          <span>|</span>
          <span>{informe.equipo_nombre}</span>
          <span>|</span>
          <span>{informe.tipo_servicio || 'N/A'}</span>
          <span>|</span>
          <span>{fechaStr}</span>
        </div>
      </div>

      <Badge variant="outline" className={`text-[10px] flex-shrink-0 ${isSelected ? 'text-blue-700 border-blue-300 bg-blue-50' : 'text-green-700 border-green-300 bg-green-50'}`}>
        {isSelected ? 'INCLUIR' : 'PDF'}
      </Badge>
    </div>
  );
}
