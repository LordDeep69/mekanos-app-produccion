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
import type { ContratoMantenimiento } from '@/features/contratos/api/contratos.service';
import {
  useContratos,
  useCreateContrato,
  useCreateCronograma,
  useDesvincularEquipoContrato,
  useEquiposContrato,
  useVincularEquipoContrato,
} from '@/features/contratos/hooks/use-contratos';
import { getNombreCompleto, useAsesoresSelector, useEmpleados } from '@/features/empleados';
import { useEquipos } from '@/features/equipos/lib/equipos.service';
import { useClientesSelector, useEquiposSelector, useTiposServicio } from '@/features/ordenes/hooks/use-catalogos';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import {
  CalendarPlus,
  FileCheck2,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const PERIODICIDAD_DIAS: Record<string, number> = {
  SEMANAL: 7,
  QUINCENAL: 15,
  MENSUAL: 30,
  BIMESTRAL: 60,
  TRIMESTRAL: 90,
  SEMESTRAL: 180,
  ANUAL: 365,
};

const ESTADO_CONTRATO_BADGE: Record<string, string> = {
  ACTIVO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  SUSPENDIDO: 'bg-amber-100 text-amber-800 border-amber-200',
  FINALIZADO: 'bg-slate-100 text-slate-700 border-slate-200',
  RENOVACION_PENDIENTE: 'bg-orange-100 text-orange-800 border-orange-200',
};

export default function ContratosPage() {
  const { formatDate } = useOrgFormatters();

  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');
  const [createOpen, setCreateOpen] = useState(false);
  const [manageContrato, setManageContrato] = useState<ContratoMantenimiento | null>(null);

  // Form crear contrato
  const todayStr = new Date().toISOString().slice(0, 10);
  const nextYearStr = new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10);
  const [clienteId, setClienteId] = useState<string>('');
  const [asesorId, setAsesorId] = useState<string>('');
  const [tipoContrato, setTipoContrato] = useState<'PREVENTIVO_RECURRENTE' | 'INTEGRAL' | 'ESPECIAL'>(
    'PREVENTIVO_RECURRENTE',
  );
  const [periodicidad, setPeriodicidad] = useState<
    'SEMANAL' | 'QUINCENAL' | 'MENSUAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'
  >('MENSUAL');
  const [fechaInicio, setFechaInicio] = useState(todayStr);
  const [fechaFin, setFechaFin] = useState(nextYearStr);
  const [generaAuto, setGeneraAuto] = useState(true);
  const [diasAntic, setDiasAntic] = useState('7');
  const [observaciones, setObservaciones] = useState('');

  // Form vincular equipo + generar cronograma
  const [vincEquipoId, setVincEquipoId] = useState<string>('');
  const [vincTipoServId, setVincTipoServId] = useState<string>('');
  const [vincCriterio, setVincCriterio] = useState<'DIAS' | 'HORAS' | 'LO_QUE_OCURRA_PRIMERO'>('DIAS');
  const [vincDias, setVincDias] = useState<string>('30');
  const [vincHoras, setVincHoras] = useState<string>('250');

  const [genCantidad, setGenCantidad] = useState<string>('4');
  const [genFechaBase, setGenFechaBase] = useState<string>(todayStr);
  const [genLoadingId, setGenLoadingId] = useState<number | null>(null);

  const { data: contratosData, isLoading, refetch } = useContratos(1, 100);
  const { data: equiposContratoData } = useEquiposContrato(1, 300);
  const { data: clientes = [] } = useClientesSelector();
  const { data: asesoresData } = useAsesoresSelector();
  const { data: empleadosData } = useEmpleados({ empleado_activo: true, take: 100 });
  const { data: tiposServicio = [] } = useTiposServicio({ activo: true });
  const { data: allEquiposData } = useEquipos({ limit: 200 });
  const { data: clienteEquipos = [] } = useEquiposSelector(
    { idCliente: manageContrato?.id_cliente },
    Boolean(manageContrato?.id_cliente),
  );

  const createContratoMut = useCreateContrato();
  const vincularMut = useVincularEquipoContrato();
  const desvincularMut = useDesvincularEquipoContrato();
  const createCronogramaMut = useCreateCronograma();

  const contratos = contratosData?.data || [];
  const equiposContrato = equiposContratoData?.data || [];
  const asesores = asesoresData?.data || [];
  const empleados = empleadosData?.data || [];

  const asesoresOptions = useMemo(() => {
    if (asesores.length > 0) {
      return asesores.map((a) => ({ id: a.id_empleado, label: a.nombre_completo }));
    }
    return empleados.map((e) => ({
      id: e.id_empleado,
      label: getNombreCompleto(e.persona),
    }));
  }, [asesores, empleados]);

  const clientesMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of clientes) {
      m.set(
        c.id_cliente,
        c.nombre_sede ||
          c.persona?.nombre_comercial ||
          c.persona?.razon_social ||
          `Cliente #${c.id_cliente}`,
      );
    }
    return m;
  }, [clientes]);

  const equiposMap = useMemo(() => {
    const m = new Map<number, { codigo: string; nombre: string }>();
    for (const e of allEquiposData?.data || []) {
      m.set(e.id_equipo, {
        codigo: e.codigo_equipo,
        nombre: e.nombre_equipo || e.codigo_equipo,
      });
    }
    return m;
  }, [allEquiposData?.data]);

  const tiposServicioMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of tiposServicio) m.set(t.id_tipo_servicio, t.nombre_tipo);
    return m;
  }, [tiposServicio]);

  const filtrados = useMemo(() => {
    if (estadoFiltro === 'TODOS') return contratos;
    return contratos.filter((c) => c.estado_contrato === estadoFiltro);
  }, [contratos, estadoFiltro]);

  const equiposDelContratoSeleccionado = useMemo(() => {
    if (!manageContrato) return [];
    return equiposContrato.filter((ec) => ec.id_contrato === manageContrato.id_contrato);
  }, [equiposContrato, manageContrato]);

  const handleOpenCreate = () => {
    if (!asesorId && asesoresOptions.length > 0) setAsesorId(String(asesoresOptions[0].id));
    setCreateOpen(true);
  };

  const handleCreateContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !asesorId) {
      toast.error('Selecciona cliente y asesor responsable');
      return;
    }
    const created = await createContratoMut.mutateAsync({
      id_cliente: Number(clienteId),
      id_asesor_responsable: Number(asesorId),
      tipo_contrato: tipoContrato,
      periodicidad_default: periodicidad,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin || undefined,
      estado_contrato: 'ACTIVO',
      genera_automaticamente: generaAuto,
      dias_anticipacion_generacion: Number(diasAntic) || 7,
      observaciones: observaciones.trim() || undefined,
    });
    setCreateOpen(false);
    setObservaciones('');
    if (created?.id_contrato) setManageContrato(created);
  };

  const handleVincularEquipo = async () => {
    if (!manageContrato || !vincEquipoId || !vincTipoServId) {
      toast.error('Selecciona equipo y tipo de servicio por defecto');
      return;
    }
    await vincularMut.mutateAsync({
      id_contrato: manageContrato.id_contrato,
      id_equipo: Number(vincEquipoId),
      tipo_servicio_default: Number(vincTipoServId),
      criterio_intervalo: vincCriterio,
      intervalo_dias: Number(vincDias) || 30,
      intervalo_horas: Number(vincHoras) || 250,
      activo_en_contrato: true,
      fecha_inclusion: todayStr,
    });
    setVincEquipoId('');
  };

  const handleGenerarCronogramaParaEquipo = async (ec: (typeof equiposContrato)[number]) => {
    if (!manageContrato) return;
    const count = Math.min(12, Math.max(1, Number(genCantidad) || 1));
    const stepDays =
      ec.intervalo_dias ||
      PERIODICIDAD_DIAS[manageContrato.periodicidad_default || 'MENSUAL'] ||
      30;
    const base = new Date(`${genFechaBase}T12:00:00Z`);
    setGenLoadingId(ec.id_equipo_contrato);
    try {
      for (let i = 0; i < count; i++) {
        const dt = new Date(base.getTime() + i * stepDays * 86400_000);
        const isoDate = dt.toISOString().slice(0, 10);
        await createCronogramaMut.mutateAsync({
          id_contrato: manageContrato.id_contrato,
          id_equipo: ec.id_equipo,
          id_equipo_contrato: ec.id_equipo_contrato,
          tipo_servicio_programado: ec.tipo_servicio_default,
          fecha_prevista: isoDate,
          estado_cronograma: 'PENDIENTE',
          prioridad: 'NORMAL',
          observaciones_programacion: `Generado desde contrato ${manageContrato.codigo_contrato} (${i + 1}/${count})`,
        });
      }
      toast.success(`${count} hito(s) de cronograma generados para el equipo`);
    } finally {
      setGenLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileCheck2 className="h-7 w-7 text-primary" />
            Contratos de Mantenimiento
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Acuerdos recurrentes por cliente, parque de equipos bajo póliza y generación de cronogramas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Actualizar
          </Button>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nuevo Contrato
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Contratos Totales</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{contratos.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Activos</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {contratos.filter((c) => c.estado_contrato === 'ACTIVO').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Equipos bajo Contrato</p>
            <p className="text-2xl font-bold text-primary mt-1">{equiposContrato.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="ACTIVO">Activo</SelectItem>
                <SelectItem value="SUSPENDIDO">Suspendido</SelectItem>
                <SelectItem value="RENOVACION_PENDIENTE">Renovación Pendiente</SelectItem>
                <SelectItem value="FINALIZADO">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No hay contratos registrados con los filtros actuales.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
                  <tr>
                    <th className="py-3 px-3">Código</th>
                    <th className="py-3 px-3">Cliente</th>
                    <th className="py-3 px-3">Tipo / Periodicidad</th>
                    <th className="py-3 px-3">Vigencia</th>
                    <th className="py-3 px-3">Equipos</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtrados.map((c) => {
                    const countEq = equiposContrato.filter(
                      (ec) => ec.id_contrato === c.id_contrato,
                    ).length;
                    return (
                      <tr key={c.id_contrato} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {c.codigo_contrato}
                        </td>
                        <td className="py-3 px-3">
                          {clientesMap.get(c.id_cliente) || `Cliente #${c.id_cliente}`}
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <div className="font-semibold text-slate-700">{c.tipo_contrato}</div>
                          <div className="text-slate-500">{c.periodicidad_default}</div>
                        </td>
                        <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                          <div>Inicio: {formatDate(c.fecha_inicio)}</div>
                          <div className="text-slate-400">
                            Fin: {c.fecha_fin ? formatDate(c.fecha_fin) : 'Indefinido'}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant="outline">{countEq} equipo(s)</Badge>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              ESTADO_CONTRATO_BADGE[c.estado_contrato || ''] ||
                              'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.estado_contrato || 'ACTIVO'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setManageContrato(c);
                              setVincDias(
                                String(
                                  PERIODICIDAD_DIAS[c.periodicidad_default || 'MENSUAL'] || 30,
                                ),
                              );
                            }}
                          >
                            <Settings className="h-3.5 w-3.5 mr-1.5" />
                            Equipos y Cronograma
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

      {/* Modal Nuevo Contrato */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Nuevo Contrato de Mantenimiento</DialogTitle>
            <DialogDescription>
              El código del contrato se genera automáticamente en el servidor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateContrato} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente *</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id_cliente} value={String(c.id_cliente)}>
                      {clientesMap.get(c.id_cliente)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Asesor Responsable *</Label>
              <Select value={asesorId} onValueChange={setAsesorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar asesor" />
                </SelectTrigger>
                <SelectContent>
                  {asesoresOptions.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Contrato</Label>
                <Select
                  value={tipoContrato}
                  onValueChange={(v) =>
                    setTipoContrato(v as 'PREVENTIVO_RECURRENTE' | 'INTEGRAL' | 'ESPECIAL')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVENTIVO_RECURRENTE">Preventivo Recurrente</SelectItem>
                    <SelectItem value="INTEGRAL">Integral</SelectItem>
                    <SelectItem value="ESPECIAL">Especial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Periodicidad Base</Label>
                <Select
                  value={periodicidad}
                  onValueChange={(v) => setPeriodicidad(v as typeof periodicidad)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SEMANAL">SEMANAL</SelectItem>
                    <SelectItem value="QUINCENAL">QUINCENAL</SelectItem>
                    <SelectItem value="MENSUAL">MENSUAL</SelectItem>
                    <SelectItem value="BIMESTRAL">BIMESTRAL</SelectItem>
                    <SelectItem value="TRIMESTRAL">TRIMESTRAL</SelectItem>
                    <SelectItem value="SEMESTRAL">SEMESTRAL</SelectItem>
                    <SelectItem value="ANUAL">ANUAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Inicio *</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fin</Label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Anticipación (días)</Label>
                <Input
                  type="number"
                  min={1}
                  value={diasAntic}
                  onChange={(e) => setDiasAntic(e.target.value)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={generaAuto}
                onChange={(e) => setGeneraAuto(e.target.checked)}
              />
              Generación automática de programación preventiva habilitada
            </label>
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
              <Button type="submit" disabled={createContratoMut.isPending}>
                {createContratoMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Crear Contrato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Equipos del Contrato + Generar Cronograma */}
      <Dialog
        open={Boolean(manageContrato)}
        onOpenChange={(o) => !o && setManageContrato(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              {manageContrato?.codigo_contrato} —{' '}
              {manageContrato
                ? clientesMap.get(manageContrato.id_cliente) || `Cliente #${manageContrato.id_cliente}`
                : ''}
            </DialogTitle>
            <DialogDescription>
              Vincula activos del cliente, define frecuencias y genera el cronograma preventivo.
            </DialogDescription>
          </DialogHeader>

          {manageContrato && (
            <div className="space-y-5">
              {/* Parámetros para generación rápida de cronograma */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border text-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Fecha base primer mantenimiento</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs bg-white"
                    value={genFechaBase}
                    onChange={(e) => setGenFechaBase(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cantidad de ciclos a generar (1-12)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    className="h-8 text-xs bg-white"
                    value={genCantidad}
                    onChange={(e) => setGenCantidad(e.target.value)}
                  />
                </div>
              </div>

              {/* Lista de equipos vinculados */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800">
                  Equipos Vinculados ({equiposDelContratoSeleccionado.length})
                </h4>
                {equiposDelContratoSeleccionado.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    Aún no hay equipos vinculados a este contrato.
                  </p>
                ) : (
                  equiposDelContratoSeleccionado.map((ec) => {
                    const eqMeta = equiposMap.get(ec.id_equipo);
                    const servName =
                      tiposServicioMap.get(ec.tipo_servicio_default) ||
                      `Servicio #${ec.tipo_servicio_default}`;
                    return (
                      <div
                        key={ec.id_equipo_contrato}
                        className="p-3 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">
                            {eqMeta?.codigo || `EQ #${ec.id_equipo}`} — {eqMeta?.nombre || ''}
                          </p>
                          <p className="text-slate-500 mt-0.5">
                            Servicio: {servName} • Criterio: {ec.criterio_intervalo} (
                            {ec.intervalo_dias ? `${ec.intervalo_dias}d` : ''}
                            {ec.intervalo_horas ? ` / ${ec.intervalo_horas}h` : ''})
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={genLoadingId === ec.id_equipo_contrato}
                            onClick={() => handleGenerarCronogramaParaEquipo(ec)}
                          >
                            {genLoadingId === ec.id_equipo_contrato ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <CalendarPlus className="h-3.5 w-3.5 mr-1" />
                            )}
                            Generar Cronograma
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => desvincularMut.mutate(ec.id_equipo_contrato)}
                            title="Desvincular equipo"
                          >
                            <Trash2 className="h-4 w-4 text-rose-500" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Formulario vincular nuevo equipo */}
              <div className="p-4 border rounded-xl bg-slate-50/70 space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-700">
                  Vincular Equipo al Contrato
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Equipo del Cliente *</Label>
                    <Select value={vincEquipoId} onValueChange={setVincEquipoId}>
                      <SelectTrigger className="bg-white h-9 text-xs">
                        <SelectValue placeholder="Seleccionar equipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {clienteEquipos.map((eq) => (
                          <SelectItem key={eq.id_equipo} value={String(eq.id_equipo)}>
                            {eq.codigo_equipo} — {eq.nombre_equipo || eq.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Servicio por Defecto *</Label>
                    <Select value={vincTipoServId} onValueChange={setVincTipoServId}>
                      <SelectTrigger className="bg-white h-9 text-xs">
                        <SelectValue placeholder="Seleccionar servicio" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposServicio.map((t) => (
                          <SelectItem key={t.id_tipo_servicio} value={String(t.id_tipo_servicio)}>
                            {t.nombre_tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Criterio de Intervalo</Label>
                    <Select
                      value={vincCriterio}
                      onValueChange={(v) =>
                        setVincCriterio(v as 'DIAS' | 'HORAS' | 'LO_QUE_OCURRA_PRIMERO')
                      }
                    >
                      <SelectTrigger className="bg-white h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIAS">Por Días</SelectItem>
                        <SelectItem value="HORAS">Por Horas / Uso</SelectItem>
                        <SelectItem value="LO_QUE_OCURRA_PRIMERO">Lo que ocurra primero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Días</Label>
                      <Input
                        type="number"
                        className="bg-white h-9 text-xs"
                        value={vincDias}
                        onChange={(e) => setVincDias(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Horas / Uso</Label>
                      <Input
                        type="number"
                        className="bg-white h-9 text-xs"
                        value={vincHoras}
                        onChange={(e) => setVincHoras(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={handleVincularEquipo}
                    disabled={!vincEquipoId || !vincTipoServId || vincularMut.isPending}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Vincular Equipo
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
