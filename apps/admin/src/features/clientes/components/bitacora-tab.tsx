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
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  Mail,
  Pencil,
  Send,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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

  // Todos los documentos disponibles (todos tienen PDF desde documentos_generados)
  const documentosDisponibles = useMemo(() => {
    if (!preview?.sedes) return [];
    return preview.sedes.flatMap(s => s.informes);
  }, [preview]);

  const handleBuscar = () => {
    setShowPreview(true);
    setExpandedSedes(new Set());
    setSendResult(null);
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

  const handleEnviar = async () => {
    setShowConfirmDialog(false);
    setSendResult(null);

    try {
      const result = await enviarMutation.mutateAsync({
        id_cliente_principal: clienteId,
        mes,
        anio,
        categoria: categoria || 'TODAS',
        documentos_ids: documentosDisponibles.map(i => i.id_documento),
        nombres_pdf: Object.keys(nombresCustom).length > 0 ? nombresCustom : undefined,
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
          {/* Resumen */}
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
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>Destinatarios: </span>
                <span className="font-medium text-foreground">
                  {preview.emails_destinatarios.length > 0
                    ? preview.emails_destinatarios.join(', ')
                    : 'Sin destinatarios configurados'}
                </span>
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
                      {documentosDisponibles.length} informe(s) listos para enviar
                    </p>
                    <p className="text-sm text-blue-700">
                      Se enviarán a: {preview.emails_destinatarios.join(', ') || 'Sin destinatarios'}
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => setShowConfirmDialog(true)}
                    disabled={enviarMutation.isPending || preview.emails_destinatarios.length === 0}
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

      {/* Dialog de confirmación */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Envío de Bitácora</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <span className="block">
                Se enviará la bitácora de <strong>{catLabel}</strong> de{' '}
                <strong>{mesLabel} {anio}</strong> para <strong>{clienteNombre}</strong>.
              </span>
              <span className="block">
                <strong>{documentosDisponibles.length}</strong> informe(s) PDF serán adjuntados.
              </span>

              {/* ✅ FIX 03-MAR-2026: Destinatarios por sede */}
              {preview && preview.sedes.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                  <p className="font-semibold text-blue-900 text-sm">Destinatarios por sede:</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {preview.sedes.map((sede) => (
                      <div key={sede.id_cliente} className="bg-white rounded border border-blue-100 p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 className="h-3.5 w-3.5 text-blue-600" />
                          <span className="font-medium text-sm text-blue-800">{sede.nombre_sede}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {sede.informes.length} informes
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 pl-5">
                          {sede.emails_destinatarios && sede.emails_destinatarios.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {sede.emails_destinatarios.map((email, idx) => (
                                <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  <Mail className="h-3 w-3" />
                                  {email}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-orange-600">⚠ Sin correos configurados</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Total destinatarios únicos */}
              <div className="pt-2 border-t">
                <span className="block text-sm">
                  <strong>Total destinatarios únicos:</strong>{' '}
                  <span className="font-medium">{preview?.emails_destinatarios.join(', ')}</span>
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnviar} className="bg-blue-600 hover:bg-blue-700">
              <Send className="h-4 w-4 mr-2" />
              Confirmar Envío
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
}

function SedeCard({ sede, expanded, onToggle, editingId, nombresCustom, onStartEdit, onRename }: SedeCardProps) {
  return (
    <Card>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <Building2 className="h-4 w-4 text-blue-600" />
          <span className="font-semibold">{sede.nombre_sede}</span>
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
}

function InformeRow({ informe, isEditing, customName, onStartEdit, onRename, onCancelEdit }: InformeRowProps) {
  const [editValue, setEditValue] = useState(customName || informe.nombre_sugerido);
  const displayName = customName || informe.nombre_sugerido;
  const fechaStr = informe.fecha_servicio
    ? new Date(informe.fecha_servicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    : 'Sin fecha';

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border bg-white">
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
            <p className="text-xs font-mono truncate" title={displayName}>
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

      <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-[10px] flex-shrink-0">
        PDF
      </Badge>
    </div>
  );
}
