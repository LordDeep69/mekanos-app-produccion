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
import type { PropuestaCorrectivoItem } from '@/features/comercial/api/comercial.service';
import {
  useConvertirPropuesta,
  useCreatePropuesta,
  usePropuestasPendientes,
} from '@/features/comercial/hooks/use-comercial';
import { getNombreCompleto, useEmpleados } from '@/features/empleados';
import { useOrdenes } from '@/features/ordenes/hooks/use-ordenes';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import {
  AlertTriangle,
  ArrowRightCircle,
  Eye,
  FilePlus2,
  Loader2,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const URGENCIA_COLORS: Record<string, string> = {
  BAJA: 'bg-slate-100 text-slate-700',
  MEDIA: 'bg-blue-100 text-blue-800',
  ALTA: 'bg-amber-100 text-amber-800',
  CRITICA: 'bg-rose-100 text-rose-800',
};

export default function PropuestasCorrectivoPage() {
  const { formatCurrency, formatDate } = useOrgFormatters();

  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
  const [urgenciaFiltro, setUrgenciaFiltro] = useState<string>('TODOS');
  const [selectedPropuesta, setSelectedPropuesta] = useState<PropuestaCorrectivoItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [ordenId, setOrdenId] = useState<string>('');
  const [tipoPropuesta, setTipoPropuesta] = useState<'CORRECTIVO' | 'MEJORA' | 'REEMPLAZO'>(
    'CORRECTIVO',
  );
  const [urgencia, setUrgencia] = useState<'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'>('ALTA');
  const [prioridad, setPrioridad] = useState<string>('4');
  const [tiempoDias, setTiempoDias] = useState<string>('3');
  const [creadaPorId, setCreadaPorId] = useState<string>('');
  const [hallazgo, setHallazgo] = useState('');
  const [solucion, setSolucion] = useState('');

  const { data, isLoading, refetch } = usePropuestasPendientes({
    tipoPropuesta: tipoFiltro !== 'TODOS' ? tipoFiltro : undefined,
    urgencia: urgenciaFiltro !== 'TODOS' ? urgenciaFiltro : undefined,
    take: 100,
  });
  const { data: ordenesData } = useOrdenes({ estado: 'EN_PROCESO', limit: 50 });
  const { data: empleadosData } = useEmpleados({ empleado_activo: true, take: 100 });

  const createMut = useCreatePropuesta();
  const convertirMut = useConvertirPropuesta();

  const propuestas = data?.propuestas || [];
  const ordenesEnProceso = ordenesData?.data || [];
  const empleados = empleadosData?.data || [];

  const handleOpenCreate = () => {
    if (!creadaPorId && empleados.length > 0) {
      setCreadaPorId(String(empleados[0].id_empleado));
    }
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ordenId || !creadaPorId) {
      toast.error('Selecciona la orden de servicio en proceso y el técnico/responsable');
      return;
    }
    if (hallazgo.trim().length < 20 || solucion.trim().length < 20) {
      toast.error('El hallazgo y la solución deben tener al menos 20 caracteres');
      return;
    }
    await createMut.mutateAsync({
      id_orden_servicio: Number(ordenId),
      tipo_propuesta: tipoPropuesta,
      urgencia_propuesta: urgencia,
      prioridad: Number(prioridad) || 3,
      tiempo_estimado_ejecucion: Number(tiempoDias) || 1,
      creada_por: Number(creadaPorId),
      descripcion_hallazgo: hallazgo.trim(),
      descripcion_solucion: solucion.trim(),
    });
    setCreateOpen(false);
    setHallazgo('');
    setSolucion('');
  };

  const totalEstimado = propuestas.reduce(
    (sum, p) => sum + Number(p.total_propuesta || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FilePlus2 className="h-7 w-7 text-primary" />
            Propuestas Correctivas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Hallazgos técnicos levantados en campo con cotización asociada y conversión a orden de servicio.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Actualizar
          </Button>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nueva Propuesta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Propuestas Pendientes</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{data?.total ?? propuestas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Prioridad Alta (4-5)</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {propuestas.filter((p) => (p.prioridad || 0) >= 4).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Valor Estimado</p>
            <p className="text-xl font-bold font-mono text-slate-900 mt-1">
              {formatCurrency(totalEstimado)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3">
            <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo de propuesta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los tipos</SelectItem>
                <SelectItem value="CORRECTIVO">Correctivo</SelectItem>
                <SelectItem value="MEJORA">Mejora</SelectItem>
                <SelectItem value="REEMPLAZO">Reemplazo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgenciaFiltro} onValueChange={setUrgenciaFiltro}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Urgencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas las urgencias</SelectItem>
                <SelectItem value="BAJA">Baja</SelectItem>
                <SelectItem value="MEDIA">Media</SelectItem>
                <SelectItem value="ALTA">Alta</SelectItem>
                <SelectItem value="CRITICA">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : propuestas.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No hay propuestas correctivas pendientes en este momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
                  <tr>
                    <th className="py-3 px-3">Propuesta</th>
                    <th className="py-3 px-3">Orden Origen</th>
                    <th className="py-3 px-3">Cliente / Equipo</th>
                    <th className="py-3 px-3">Categoría / Prio.</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Total Est.</th>
                    <th className="py-3 px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {propuestas.map((p) => {
                    const cliNombre =
                      p.clientes?.persona?.razon_social ||
                      [p.clientes?.persona?.primer_nombre, p.clientes?.persona?.primer_apellido]
                        .filter(Boolean)
                        .join(' ') ||
                      'Cliente';
                    return (
                      <tr key={p.id_propuesta} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-800">{p.numero_propuesta}</div>
                          <div className="text-xs text-slate-400">
                            {p.fecha_propuesta ? formatDate(p.fecha_propuesta) : '—'}
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-xs">
                          {p.orden_servicio?.numero_orden || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{cliNombre}</div>
                          <div className="text-xs text-slate-500">
                            {p.equipos?.nombre_equipo || 'Sin equipo'}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline">{p.categoria || p.tipo_propuesta || 'CORRECTIVO'}</Badge>
                          <span className="ml-1.5 text-xs text-slate-600 font-semibold">
                            P{p.prioridad ?? '-'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              URGENCIA_COLORS[p.estado || ''] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.estado || 'BORRADOR'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {formatCurrency(p.total_propuesta || 0)}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPropuesta(p)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detalle
                          </Button>
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

      {/* Modal Detalle y Conversión */}
      <Dialog
        open={Boolean(selectedPropuesta)}
        onOpenChange={(o) => !o && setSelectedPropuesta(null)}
      >
        <DialogContent className="max-w-xl bg-white">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {selectedPropuesta?.numero_propuesta}
            </DialogTitle>
            <DialogDescription>
              Orden origen: {selectedPropuesta?.orden_servicio?.numero_orden || '—'} • Estado:{' '}
              {selectedPropuesta?.estado}
            </DialogDescription>
          </DialogHeader>
          {selectedPropuesta && (
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Hallazgo Técnico</p>
                <p className="text-slate-800 whitespace-pre-wrap">
                  {selectedPropuesta.descripcion_problema || 'Sin descripción'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border">
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Solución Propuesta</p>
                <p className="text-slate-800 whitespace-pre-wrap">
                  {selectedPropuesta.solucion_propuesta || 'Sin descripción'}
                </p>
              </div>
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                <span className="font-semibold text-primary">Total Estimado</span>
                <span className="font-mono font-bold text-primary">
                  {formatCurrency(selectedPropuesta.total_propuesta || 0)}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPropuesta(null)}>
              Cerrar
            </Button>
            {selectedPropuesta && (
              <Button
                disabled={convertirMut.isPending}
                onClick={async () => {
                  const empId = empleados[0]?.id_empleado || 1;
                  await convertirMut.mutateAsync({
                    id: selectedPropuesta.id_propuesta,
                    convertida_por: empId,
                  });
                  setSelectedPropuesta(null);
                }}
              >
                <ArrowRightCircle className="h-4 w-4 mr-1.5" />
                Convertir a Orden de Servicio
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Nueva Propuesta */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Nueva Propuesta Correctivo</DialogTitle>
            <DialogDescription>
              Requiere una Orden de Servicio actualmente en estado EN_PROCESO.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {ordenesEnProceso.length === 0 && (
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                No hay órdenes en estado EN_PROCESO en este momento.
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Orden de Servicio (EN_PROCESO) *</Label>
              <Select value={ordenId} onValueChange={setOrdenId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar orden" />
                </SelectTrigger>
                <SelectContent>
                  {ordenesEnProceso.map((o) => (
                    <SelectItem key={o.id_orden_servicio} value={String(o.id_orden_servicio)}>
                      {o.numero_orden} — {o.clientes?.persona?.razon_social || o.equipos?.nombre_equipo || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Propuesta</Label>
                <Select
                  value={tipoPropuesta}
                  onValueChange={(v) => setTipoPropuesta(v as 'CORRECTIVO' | 'MEJORA' | 'REEMPLAZO')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CORRECTIVO">CORRECTIVO</SelectItem>
                    <SelectItem value="MEJORA">MEJORA</SelectItem>
                    <SelectItem value="REEMPLAZO">REEMPLAZO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Urgencia</Label>
                <Select
                  value={urgencia}
                  onValueChange={(v) => setUrgencia(v as 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BAJA">BAJA</SelectItem>
                    <SelectItem value="MEDIA">MEDIA</SelectItem>
                    <SelectItem value="ALTA">ALTA</SelectItem>
                    <SelectItem value="CRITICA">CRÍTICA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Prioridad (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={prioridad}
                  onChange={(e) => setPrioridad(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Días Ejecución</Label>
                <Input
                  type="number"
                  min={1}
                  value={tiempoDias}
                  onChange={(e) => setTiempoDias(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Técnico / Creador *</Label>
                <Select value={creadaPorId} onValueChange={setCreadaPorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {empleados.map((emp) => (
                      <SelectItem key={emp.id_empleado} value={String(emp.id_empleado)}>
                        {getNombreCompleto(emp.persona)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descripción del Hallazgo (mín. 20 caracteres) *</Label>
              <Textarea
                rows={2}
                value={hallazgo}
                onChange={(e) => setHallazgo(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Solución Propuesta (mín. 20 caracteres) *</Label>
              <Textarea
                rows={2}
                value={solucion}
                onChange={(e) => setSolucion(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Crear Propuesta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
