'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useBodegas,
  useComponentesStock,
} from '@/features/inventario/api/inventario-motor.service';
import { useTecnicosSelector } from '@/features/ordenes/hooks/use-catalogos';
import { useOrdenes } from '@/features/ordenes/hooks/use-ordenes';
import type {
  RemisionItem,
  RemisionItemInput,
} from '@/features/remisiones/api/remisiones.service';
import {
  useCancelarRemision,
  useCreateRemision,
  useEntregarRemision,
  useRemision,
  useRemisiones,
} from '@/features/remisiones/hooks/use-remisiones';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import { getTecnicoLabel } from '@/types/ordenes';
import {
  CheckCircle2,
  ClipboardList,
  Eye,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const ESTADO_REM_STYLE: Record<string, string> = {
  ABIERTA: 'bg-amber-100 text-amber-800 border-amber-200',
  CERRADA: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  ENTREGADA: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  VENCIDA: 'bg-slate-200 text-slate-700 border-slate-300',
  CANCELADA: 'bg-rose-100 text-rose-800 border-rose-200',
};

export default function RemisionesPage() {
  const { formatDateTime } = useOrgFormatters();

  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');
  const [tecnicoFiltro, setTecnicoFiltro] = useState<string>('TODOS');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<RemisionItem | null>(null);
  const [motivoCancel, setMotivoCancel] = useState('');

  // Form nueva remisión
  const [tecnicoReceptorId, setTecnicoReceptorId] = useState<string>('');
  const [ordenId, setOrdenId] = useState<string>('NINGUNA');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<RemisionItemInput[]>([
    { id_componente: 0, cantidad: 1, id_ubicacion: undefined },
  ]);

  const { data: remData, isLoading, refetch } = useRemisiones({
    estado: estadoFiltro !== 'TODOS' ? estadoFiltro : undefined,
    id_tecnico_receptor: tecnicoFiltro !== 'TODOS' ? Number(tecnicoFiltro) : undefined,
    limit: 100,
  });
  const { data: detalleResp, isLoading: loadingDetalle } = useRemision(selectedId);
  const { data: tecnicos = [] } = useTecnicosSelector();
  const { data: ordenesData } = useOrdenes({ limit: 80 });
  const { data: componentesData } = useComponentesStock({ limit: 200 });
  const { data: bodegas = [] } = useBodegas();

  const createMut = useCreateRemision();
  const entregarMut = useEntregarRemision();
  const cancelarMut = useCancelarRemision();

  const remisiones = remData?.data || [];
  const detalle = detalleResp?.data;
  const ordenes = ordenesData?.data || [];
  const componentes = componentesData?.data || [];

  const handleAddRow = () => {
    setItems((prev) => [...prev, { id_componente: 0, cantidad: 1, id_ubicacion: undefined }]);
  };

  const handleRemoveRow = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRow = (index: number, patch: Partial<RemisionItemInput>) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tecnicoReceptorId) {
      toast.error('Selecciona el técnico receptor');
      return;
    }
    const validItems = items.filter((it) => it.id_componente > 0 && it.cantidad > 0);
    if (validItems.length === 0) {
      toast.error('Agrega al menos un material con cantidad positiva');
      return;
    }

    await createMut.mutateAsync({
      id_tecnico_receptor: Number(tecnicoReceptorId),
      id_orden_servicio: ordenId !== 'NINGUNA' ? Number(ordenId) : undefined,
      observaciones: observaciones.trim() || undefined,
      items: validItems,
    });
    setCreateOpen(false);
    setObservaciones('');
    setItems([{ id_componente: 0, cantidad: 1, id_ubicacion: undefined }]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <ClipboardList className="h-7 w-7 text-primary" />
            Remisiones de Materiales
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Vales de salida de almacén hacia técnicos de campo, entrega física y trazabilidad de inventario.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nueva Remisión
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Total Remisiones</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {remData?.meta?.total ?? remisiones.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Abiertas / En Tránsito</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {remisiones.filter((r) => r.estado_remision === 'ABIERTA').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Entregadas / Cerradas</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {
                remisiones.filter(
                  (r) => r.estado_remision === 'CERRADA' || r.estado_remision === 'ENTREGADA',
                ).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="ABIERTA">Abierta</SelectItem>
                <SelectItem value="CERRADA">Entregada / Cerrada</SelectItem>
                <SelectItem value="VENCIDA">Vencida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tecnicoFiltro} onValueChange={setTecnicoFiltro}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Técnico receptor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los técnicos</SelectItem>
                {tecnicos.map((t) => (
                  <SelectItem key={t.id_empleado} value={String(t.id_empleado)}>
                    {getTecnicoLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : remisiones.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No se encontraron remisiones registradas.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
                  <tr>
                    <th className="py-3 px-3">Número</th>
                    <th className="py-3 px-3">Fecha Emisión</th>
                    <th className="py-3 px-3">Destinatario / Técnico</th>
                    <th className="py-3 px-3">Orden Asociada</th>
                    <th className="py-3 px-3">Ítems</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {remisiones.map((r) => {
                    const est = r.estado_remision || 'ABIERTA';
                    return (
                      <tr key={r.id_remision} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {r.numero_remision}
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                          {formatDateTime(r.fecha_remision)}
                        </td>
                        <td className="py-3 px-3">{r.nombre_destinatario || 'Técnico'}</td>
                        <td className="py-3 px-3 font-mono text-xs">
                          {r.ordenes_servicio?.numero_orden ||
                            (r.id_orden_servicio ? `OS #${r.id_orden_servicio}` : 'Sin orden')}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline">{r.remisiones_detalle?.length || 0} ítem(s)</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              ESTADO_REM_STYLE[est] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {est}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedId(r.id_remision)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            {est === 'ABIERTA' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                  disabled={entregarMut.isPending}
                                  onClick={() => entregarMut.mutate(r.id_remision)}
                                >
                                  <PackageCheck className="h-3.5 w-3.5 mr-1" />
                                  Entregar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-rose-600 hover:bg-rose-50"
                                  onClick={() => setCancelTarget(r)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Detalle Remisión */}
      <Dialog open={Boolean(selectedId)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-xl bg-white">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {detalle?.numero_remision || `Remisión #${selectedId}`}
            </DialogTitle>
            <DialogDescription>
              Receptor: {detalle?.nombre_destinatario} • Estado: {detalle?.estado_remision}
            </DialogDescription>
          </DialogHeader>
          {loadingDetalle || !detalle ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs p-3 bg-slate-50 rounded-lg border">
                <div>
                  <p className="text-slate-500">Emisión</p>
                  <p className="font-semibold">{formatDateTime(detalle.fecha_remision)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Entrega</p>
                  <p className="font-semibold">
                    {detalle.fecha_entrega ? formatDateTime(detalle.fecha_entrega) : 'Pendiente'}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800">Materiales Despachados</h4>
                {(detalle.remisiones_detalle || []).map((it, idx) => (
                  <div
                    key={it.id_detalle || idx}
                    className="p-2.5 border rounded-lg flex items-center justify-between text-xs bg-white"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {it.catalogo_componentes?.descripcion_corta ||
                          it.descripcion_item ||
                          `Componente #${it.id_componente}`}
                      </p>
                      {it.catalogo_componentes?.codigo_interno && (
                        <p className="font-mono text-slate-500">
                          {it.catalogo_componentes.codigo_interno}
                        </p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-slate-900">
                      Cant: {Number(it.cantidad_entregada)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              Cerrar
            </Button>
            {detalle?.estado_remision === 'ABIERTA' && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={async () => {
                  await entregarMut.mutateAsync(detalle.id_remision);
                  setSelectedId(null);
                }}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Registrar Recepción
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nueva Remisión */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Nueva Remisión de Materiales</DialogTitle>
            <DialogDescription>
              Descuenta inventario del almacén y genera el vale de salida para el técnico.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Técnico Receptor *</Label>
                <Select value={tecnicoReceptorId} onValueChange={setTecnicoReceptorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar técnico" />
                  </SelectTrigger>
                  <SelectContent>
                    {tecnicos.map((t) => (
                      <SelectItem key={t.id_empleado} value={String(t.id_empleado)}>
                        {getTecnicoLabel(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Orden de Servicio (Opcional)</Label>
                <Select value={ordenId} onValueChange={setOrdenId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin orden asociada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NINGUNA">Sin orden asociada</SelectItem>
                    {ordenes.map((o) => (
                      <SelectItem key={o.id_orden_servicio} value={String(o.id_orden_servicio)}>
                        {o.numero_orden} — {o.clientes?.persona?.razon_social || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ítems a Remisionar *</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Agregar Ítem
                </Button>
              </div>

              {items.map((row, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-6">
                    <Select
                      value={row.id_componente ? String(row.id_componente) : ''}
                      onValueChange={(v) => handleUpdateRow(idx, { id_componente: Number(v) })}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Componente *" />
                      </SelectTrigger>
                      <SelectContent>
                        {componentes.map((c) => (
                          <SelectItem key={c.id_componente} value={String(c.id_componente)}>
                            {c.codigo || `ID-${c.id_componente}`} — {c.nombre} (Disp:{' '}
                            {c.stock_actual})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="sm:col-span-3">
                    <Select
                      value={row.id_ubicacion ? String(row.id_ubicacion) : ''}
                      onValueChange={(v) =>
                        handleUpdateRow(idx, { id_ubicacion: v ? Number(v) : undefined })
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Bodega" />
                      </SelectTrigger>
                      <SelectContent>
                        {bodegas.map((b) => (
                          <SelectItem key={b.id_ubicacion} value={String(b.id_ubicacion)}>
                            {b.codigo_ubicacion}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min={0.01}
                    step="0.01"
                    className="sm:col-span-2 h-9 text-xs"
                    placeholder="Cant."
                    value={row.cantidad}
                    onChange={(e) =>
                      handleUpdateRow(idx, { cantidad: Number(e.target.value) || 0 })
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="sm:col-span-1"
                    disabled={items.length <= 1}
                    onClick={() => handleRemoveRow(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Emitir Remisión
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Cancelar Remisión */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Cancelar Remisión {cancelTarget?.numero_remision}</DialogTitle>
            <DialogDescription>
              Reintegrará las existencias reservadas de vuelta al inventario.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={motivoCancel}
            onChange={(e) => setMotivoCancel(e.target.value)}
            placeholder="Motivo de cancelación..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Volver
            </Button>
            <Button
              variant="destructive"
              disabled={!motivoCancel.trim() || cancelarMut.isPending}
              onClick={async () => {
                if (!cancelTarget) return;
                await cancelarMut.mutateAsync({
                  id: cancelTarget.id_remision,
                  motivo_cancelacion: motivoCancel.trim(),
                });
                setCancelTarget(null);
                setMotivoCancel('');
              }}
            >
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
