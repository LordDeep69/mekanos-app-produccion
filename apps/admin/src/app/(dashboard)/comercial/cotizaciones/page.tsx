'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  downloadCotizacionPdf,
  type CotizacionRecord,
} from '@/features/comercial/api/comercial.service';
import {
  useAprobacionesPendientes,
  useCotizacionDetalle,
  useCotizacionItemActions,
  useCotizacionWorkflowActions,
  useCotizaciones,
  useCreateCotizacion,
  useMotivosRechazo,
  useTiposComponente,
} from '@/features/comercial/hooks/use-comercial';
import { getNombreCompleto, useEmpleados } from '@/features/empleados';
import { useComponentesStock } from '@/features/inventario/api/inventario-motor.service';
import {
  useClientesSelector,
  useEquiposSelector,
  useSedesCliente,
  useServiciosComerciales,
} from '@/features/ordenes/hooks/use-catalogos';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import {
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const ESTADO_STYLE: Record<string, string> = {
  BORRADOR: 'bg-slate-100 text-slate-700 border-slate-200',
  EN_REVISION: 'bg-amber-100 text-amber-800 border-amber-200',
  APROBADA_INTERNA: 'bg-blue-100 text-blue-800 border-blue-200',
  ENVIADA: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  APROBADA_CLIENTE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  RECHAZADA: 'bg-rose-100 text-rose-800 border-rose-200',
};

function getEstadoName(c: CotizacionRecord): string {
  return (
    c.estado?.nombre_estado ||
    c.estados_cotizacion?.nombre_estado ||
    `ESTADO_${c.id_estado}`
  );
}

export default function CotizacionesPage() {
  const { formatCurrency, formatDate, taxLabel, taxRate } = useOrgFormatters();

  const [tab, setTab] = useState<'listado' | 'aprobaciones'>('listado');
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Enviar / Aprobar / Rechazar dialogs
  const [enviarOpen, setEnviarOpen] = useState(false);
  const [enviarEmail, setEnviarEmail] = useState('');
  const [enviarNombre, setEnviarNombre] = useState('');
  const [enviarCopia, setEnviarCopia] = useState('');

  const [solicitarOpen, setSolicitarOpen] = useState(false);
  const [solicitarObs, setSolicitarObs] = useState('');

  const [rechazarOpen, setRechazarOpen] = useState(false);
  const [motivoRechazoId, setMotivoRechazoId] = useState<string>('');
  const [obsRechazo, setObsRechazo] = useState('');

  // Form nueva cotización
  const todayStr = new Date().toISOString().slice(0, 10);
  const in30DaysStr = new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
  const [formClienteId, setFormClienteId] = useState<string>('');
  const [formSedeId, setFormSedeId] = useState<string>('');
  const [formEquipoId, setFormEquipoId] = useState<string>('');
  const [formElaboradaPor, setFormElaboradaPor] = useState<string>('');
  const [formAsunto, setFormAsunto] = useState('');
  const [formFechaCot, setFormFechaCot] = useState(todayStr);
  const [formFechaVen, setFormFechaVen] = useState(in30DaysStr);
  const [formIva, setFormIva] = useState<string>(String(taxRate ?? 0));
  const [formDesc, setFormDesc] = useState<string>('0');
  const [formFormaPago, setFormFormaPago] = useState('CONTADO');
  const [formDias, setFormDias] = useState('5');
  const [formGarantia, setFormGarantia] = useState('6');
  const [formAlcance, setFormAlcance] = useState('');

  // Form items en detalle
  const [addServId, setAddServId] = useState<string>('');
  const [addServCant, setAddServCant] = useState<string>('1');
  const [addServPrecio, setAddServPrecio] = useState<string>('');
  const [addCompStockId, setAddCompStockId] = useState<string>('');
  const [addCompTipoId, setAddCompTipoId] = useState<string>('');
  const [addCompDesc, setAddCompDesc] = useState<string>('');
  const [addCompCant, setAddCompCant] = useState<string>('1');
  const [addCompPrecio, setAddCompPrecio] = useState<string>('');

  //Queries
  const { data: cotData, isLoading, refetch } = useCotizaciones({ take: 100 });
  const { data: detalle, isLoading: loadingDetalle } = useCotizacionDetalle(selectedId);
  const { data: aprobacionesData } = useAprobacionesPendientes();
  const { data: clientes = [] } = useClientesSelector();
  const { data: sedes = [] } = useSedesCliente(formClienteId ? Number(formClienteId) : undefined);
  const { data: equipos = [] } = useEquiposSelector(
    { idCliente: formClienteId ? Number(formClienteId) : undefined },
    Boolean(formClienteId),
  );
  const { data: empleadosData } = useEmpleados({ empleado_activo: true, take: 100 });
  const { data: serviciosCatalogo = [] } = useServiciosComerciales({ activo: true, limit: 200 });
  const { data: componentesWmsData } = useComponentesStock({ limit: 150 });
  const { data: tiposComponente = [] } = useTiposComponente();
  const { data: motivosRechazo = [] } = useMotivosRechazo();

  const createMut = useCreateCotizacion();
  const itemActions = useCotizacionItemActions(selectedId);
  const workflow = useCotizacionWorkflowActions();

  const empleados = empleadosData?.data || [];
  const cotizaciones = cotData?.cotizaciones || [];
  const aprobacionesPendientes =
    aprobacionesData?.aprobaciones || aprobacionesData?.data || [];
  const componentesWms = componentesWmsData?.data || [];

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

  const filtradas = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cotizaciones.filter((c) => {
      const est = getEstadoName(c);
      if (estadoFiltro !== 'TODOS' && est !== estadoFiltro) return false;
      if (!q) return true;
      const cliName = clientesMap.get(c.id_cliente) || '';
      return (
        c.numero_cotizacion.toLowerCase().includes(q) ||
        (c.asunto || '').toLowerCase().includes(q) ||
        cliName.toLowerCase().includes(q)
      );
    });
  }, [cotizaciones, search, estadoFiltro, clientesMap]);

  const kpis = useMemo(() => {
    let borrador = 0;
    let enviadas = 0;
    let aprobadas = 0;
    let montoActivo = 0;
    for (const c of cotizaciones) {
      const est = getEstadoName(c);
      if (est === 'BORRADOR' || est === 'EN_REVISION' || est === 'APROBADA_INTERNA') borrador++;
      if (est === 'ENVIADA') enviadas++;
      if (est === 'APROBADA_CLIENTE') aprobadas++;
      if (est !== 'RECHAZADA') montoActivo += Number(c.total_cotizacion || 0);
    }
    return { total: cotizaciones.length, borrador, enviadas, aprobadas, montoActivo };
  }, [cotizaciones]);

  const handleOpenCreate = () => {
    setFormIva(String(taxRate ?? 0));
    if (!formElaboradaPor && empleados.length > 0) {
      setFormElaboradaPor(String(empleados[0].id_empleado));
    }
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClienteId || !formAsunto.trim() || !formElaboradaPor) {
      toast.error('Completa cliente, asunto y responsable');
      return;
    }
    const created = await createMut.mutateAsync({
      id_cliente: Number(formClienteId),
      id_sede: formSedeId ? Number(formSedeId) : undefined,
      id_equipo: formEquipoId ? Number(formEquipoId) : undefined,
      fecha_cotizacion: formFechaCot,
      fecha_vencimiento: formFechaVen,
      asunto: formAsunto.trim(),
      alcance_trabajo: formAlcance.trim() || undefined,
      descuento_porcentaje: Number(formDesc) || 0,
      iva_porcentaje: Number(formIva) || 0,
      tiempo_estimado_dias: Number(formDias) || undefined,
      forma_pago: formFormaPago,
      meses_garantia: Number(formGarantia) || undefined,
      elaborada_por: Number(formElaboradaPor),
    });
    setCreateOpen(false);
    setFormAsunto('');
    setFormAlcance('');
    if (created?.id_cotizacion) {
      setSelectedId(created.id_cotizacion);
    }
  };

  const handleAddServicio = async () => {
    if (!selectedId || !addServId) return;
    const serv = serviciosCatalogo.find((s) => s.id_servicio === Number(addServId));
    const precio = Number(addServPrecio || serv?.precio_base || 0);
    await itemActions.addServicio.mutateAsync({
      id_servicio: Number(addServId),
      cantidad: Number(addServCant) || 1,
      precio_unitario: precio,
    });
    setAddServId('');
    setAddServPrecio('');
    setAddServCant('1');
  };

  const handleAddComponente = async () => {
    if (!selectedId || !addCompTipoId || !addCompDesc.trim()) {
      toast.error('Selecciona tipo de componente y descripción');
      return;
    }
    await itemActions.addComponente.mutateAsync({
      id_componente: addCompStockId ? Number(addCompStockId) : undefined,
      id_tipo_componente: Number(addCompTipoId),
      descripcion: addCompDesc.trim(),
      cantidad: Number(addCompCant) || 1,
      precio_unitario: Number(addCompPrecio) || 0,
    });
    setAddCompStockId('');
    setAddCompDesc('');
    setAddCompPrecio('');
    setAddCompCant('1');
  };

  const estadoDetalle = detalle ? getEstadoName(detalle) : '';
  const esBorradorDetalle = estadoDetalle === 'BORRADOR';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-primary" />
            Cotizaciones Comerciales
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Elaboración de ofertas técnicas, aprobaciones internas, envío al cliente y generación de PDF.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Actualizar
          </Button>
          <Button size="sm" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nueva Cotización
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Total Cotizaciones</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">{kpis.borrador} en elaboración/revisión</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Enviadas</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">{kpis.enviadas}</p>
            <p className="text-xs text-slate-500 mt-0.5">Pendientes de respuesta cliente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Aprobadas</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{kpis.aprobadas}</p>
            <p className="text-xs text-slate-500 mt-0.5">Aceptadas comercialmente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Pipeline Activo</p>
            <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(kpis.montoActivo)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Acumulado vigente</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setTab('listado')}
          className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'listado'
              ? 'bg-primary text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Listado General ({cotizaciones.length})
        </button>
        <button
          type="button"
          onClick={() => setTab('aprobaciones')}
          className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
            tab === 'aprobaciones'
              ? 'bg-primary text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Aprobaciones Pendientes
          {aprobacionesPendientes.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {aprobacionesPendientes.length}
            </Badge>
          )}
        </button>
      </div>

      {tab === 'listado' ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Buscar por número, asunto o cliente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger className="w-full sm:w-52">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS">Todos los estados</SelectItem>
                  <SelectItem value="BORRADOR">Borrador</SelectItem>
                  <SelectItem value="EN_REVISION">En Revisión</SelectItem>
                  <SelectItem value="APROBADA_INTERNA">Aprobada Interna</SelectItem>
                  <SelectItem value="ENVIADA">Enviada</SelectItem>
                  <SelectItem value="APROBADA_CLIENTE">Aprobada Cliente</SelectItem>
                  <SelectItem value="RECHAZADA">Rechazada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : filtradas.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                No se encontraron cotizaciones con los filtros actuales.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
                    <tr>
                      <th className="py-3 px-3">Número</th>
                      <th className="py-3 px-3">Cliente</th>
                      <th className="py-3 px-3">Asunto</th>
                      <th className="py-3 px-3">Fecha / Venc.</th>
                      <th className="py-3 px-3">Estado</th>
                      <th className="py-3 px-3 text-right">Total</th>
                      <th className="py-3 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtradas.map((cot) => {
                      const est = getEstadoName(cot);
                      return (
                        <tr key={cot.id_cotizacion} className="hover:bg-slate-50/70">
                          <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                            {cot.numero_cotizacion}
                          </td>
                          <td className="py-3 px-3">
                            {cot.cliente?.persona?.razon_social ||
                              cot.cliente?.persona?.nombre_comercial ||
                              clientesMap.get(cot.id_cliente) ||
                              `Cliente #${cot.id_cliente}`}
                          </td>
                          <td className="py-3 px-3 max-w-xs truncate">{cot.asunto}</td>
                          <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                            <div>{formatDate(cot.fecha_cotizacion)}</div>
                            <div className="text-slate-400">Vence: {formatDate(cot.fecha_vencimiento)}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                                ESTADO_STYLE[est] || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {est}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(cot.total_cotizacion || 0)}
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedId(cot.id_cotizacion)}
                                title="Ver detalle e ítems"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Gestionar
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Descargar PDF"
                                onClick={() =>
                                  downloadCotizacionPdf(cot.id_cotizacion, cot.numero_cotizacion).catch(
                                    () => toast.error('Error al generar PDF de cotización'),
                                  )
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cola de Aprobación Interna</CardTitle>
          </CardHeader>
          <CardContent>
            {aprobacionesPendientes.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No hay aprobaciones internas pendientes.
              </div>
            ) : (
              <div className="space-y-3">
                {aprobacionesPendientes.map((ap) => (
                  <div
                    key={ap.id_aprobacion}
                    className="p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm">
                          {ap.cotizaciones?.numero_cotizacion || `COT #${ap.id_cotizacion}`}
                        </span>
                        {ap.nivel_aprobacion && (
                          <Badge variant="outline">{ap.nivel_aprobacion}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-700">{ap.cotizaciones?.asunto}</p>
                      {ap.observaciones_solicitante && (
                        <p className="text-xs text-slate-500 italic">
                          Solicitud: {ap.observaciones_solicitante}
                        </p>
                      )}
                      {ap.cotizaciones?.total_cotizacion !== undefined && (
                        <p className="text-xs font-mono font-bold text-slate-900">
                          Total: {formatCurrency(ap.cotizaciones.total_cotizacion)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        disabled={workflow.procesar.isPending}
                        onClick={() =>
                          workflow.procesar.mutate({
                            idAprobacion: ap.id_aprobacion,
                            decision: 'APROBADA',
                            observaciones: 'Aprobación interna autorizada desde Portal Admin.',
                          })
                        }
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-rose-700 border-rose-200 hover:bg-rose-50"
                        disabled={workflow.procesar.isPending}
                        onClick={() =>
                          workflow.procesar.mutate({
                            idAprobacion: ap.id_aprobacion,
                            decision: 'RECHAZADA',
                            observaciones: 'Devuelta a borrador para ajustes comerciales.',
                          })
                        }
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Devolver
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal Nueva Cotización */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle>Nueva Cotización Comercial</DialogTitle>
            <DialogDescription>
              Crea una cotización en borrador para agregar luego ítems de servicios y repuestos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cliente *</Label>
                <Select
                  value={formClienteId}
                  onValueChange={(v) => {
                    setFormClienteId(v);
                    setFormSedeId('');
                    setFormEquipoId('');
                  }}
                >
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
                <Label>Elaborada por (Empleado) *</Label>
                <Select value={formElaboradaPor} onValueChange={setFormElaboradaPor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar responsable" />
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
              <div className="space-y-1.5">
                <Label>Sede (Opcional)</Label>
                <Select value={formSedeId} onValueChange={setFormSedeId} disabled={!formClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin sede específica" />
                  </SelectTrigger>
                  <SelectContent>
                    {sedes.map((s) => (
                      <SelectItem key={s.id_sede} value={String(s.id_sede)}>
                        {s.nombre_sede}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Equipo (Opcional)</Label>
                <Select value={formEquipoId} onValueChange={setFormEquipoId} disabled={!formClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin equipo específico" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipos.map((eq) => (
                      <SelectItem key={eq.id_equipo} value={String(eq.id_equipo)}>
                        {eq.codigo_equipo} — {eq.nombre_equipo || eq.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Asunto / Título de la Oferta *</Label>
              <Input
                value={formAsunto}
                onChange={(e) => setFormAsunto(e.target.value)}
                placeholder="Ej: Servicio preventivo programado y reemplazo de consumibles"
                required
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha Emisión *</Label>
                <Input
                  type="date"
                  value={formFechaCot}
                  onChange={(e) => setFormFechaCot(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vencimiento *</Label>
                <Input
                  type="date"
                  value={formFechaVen}
                  onChange={(e) => setFormFechaVen(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>{taxLabel} (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formIva}
                  onChange={(e) => setFormIva(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Descuento (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Forma de Pago</Label>
                <Select value={formFormaPago} onValueChange={setFormFormaPago}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CONTADO">CONTADO</SelectItem>
                    <SelectItem value="CREDITO">CREDITO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tiempo Est. (días)</Label>
                <Input
                  type="number"
                  value={formDias}
                  onChange={(e) => setFormDias(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Garantía (meses)</Label>
                <Input
                  type="number"
                  value={formGarantia}
                  onChange={(e) => setFormGarantia(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Alcance de Trabajo</Label>
              <Textarea
                rows={3}
                value={formAlcance}
                onChange={(e) => setFormAlcance(e.target.value)}
                placeholder="Detalle técnico del alcance incluido en esta oferta..."
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                Crear Borrador
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle e Items */}
      <Dialog open={Boolean(selectedId)} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono">{detalle?.numero_cotizacion || `Cotización #${selectedId}`}</span>
              {estadoDetalle && (
                <Badge className={ESTADO_STYLE[estadoDetalle] || ''}>{estadoDetalle}</Badge>
              )}
            </DialogTitle>
            <DialogDescription>{detalle?.asunto}</DialogDescription>
          </DialogHeader>

          {loadingDetalle || !detalle ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Barra de acciones workflow */}
              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    downloadCotizacionPdf(detalle.id_cotizacion, detalle.numero_cotizacion).catch(
                      () => toast.error('Error al descargar PDF'),
                    )
                  }
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  PDF Oficial
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => itemActions.recalcular.mutate()}
                  disabled={itemActions.recalcular.isPending}
                >
                  <Calculator className="h-4 w-4 mr-1.5" />
                  Recalcular
                </Button>
                {esBorradorDetalle && (
                  <Button size="sm" onClick={() => setSolicitarOpen(true)}>
                    <ClipboardCheck className="h-4 w-4 mr-1.5" />
                    Solicitar Aprobación
                  </Button>
                )}
                {estadoDetalle === 'APROBADA_INTERNA' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      const cli = clientes.find((c) => c.id_cliente === detalle.id_cliente);
                      setEnviarNombre(
                        cli?.persona?.nombre_comercial || cli?.persona?.razon_social || '',
                      );
                      setEnviarEmail(detalle.cliente?.persona?.email_principal || '');
                      setEnviarOpen(true);
                    }}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Enviar a Cliente
                  </Button>
                )}
                {estadoDetalle === 'ENVIADA' && (
                  <>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() =>
                        workflow.aprobarCliente.mutate({
                          id: detalle.id_cotizacion,
                          observaciones: 'Aprobación registrada desde Portal Admin',
                        })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Aprobó Cliente
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRechazarOpen(true)}
                    >
                      <XCircle className="h-4 w-4 mr-1.5" />
                      Rechazada
                    </Button>
                  </>
                )}
              </div>

              {/* Resumen financiero */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-slate-500">Servicios</p>
                  <p className="text-sm font-bold font-mono mt-0.5">
                    {formatCurrency(detalle.subtotal_servicios || 0)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-slate-500">Componentes</p>
                  <p className="text-sm font-bold font-mono mt-0.5">
                    {formatCurrency(detalle.subtotal_componentes || 0)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <p className="text-slate-500">
                    {taxLabel} ({Number(detalle.iva_porcentaje || 0)}%)
                  </p>
                  <p className="text-sm font-bold font-mono mt-0.5">
                    {formatCurrency(detalle.iva_valor || 0)}
                  </p>
                </div>
                <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-primary font-semibold">Total Oferta</p>
                  <p className="text-base font-extrabold font-mono text-primary mt-0.5">
                    {formatCurrency(detalle.total_cotizacion || 0)}
                  </p>
                </div>
              </div>

              {/* Items Servicios */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800">
                  Servicios Incluidos ({detalle.items_servicios?.length || 0})
                </h4>
                {(detalle.items_servicios || []).map((item, idx) => (
                  <div
                    key={item.id_item_servicio || idx}
                    className="flex items-center justify-between p-2.5 border rounded-lg text-xs bg-white"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {item.descripcion_personalizada ||
                          item.catalogo_servicios?.nombre_servicio ||
                          `Servicio #${item.id_servicio}`}
                      </p>
                      <p className="text-slate-500">
                        {Number(item.cantidad)} × {formatCurrency(item.precio_unitario)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">
                        {formatCurrency(
                          item.subtotal ??
                            Number(item.cantidad) * Number(item.precio_unitario),
                        )}
                      </span>
                      {esBorradorDetalle && item.id_item_servicio && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => itemActions.removeServicio.mutate(item.id_item_servicio!)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {esBorradorDetalle && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                    <div className="sm:col-span-6">
                      <Select
                        value={addServId}
                        onValueChange={(v) => {
                          setAddServId(v);
                          const found = serviciosCatalogo.find(
                            (s) => s.id_servicio === Number(v),
                          );
                          if (found?.precio_base) setAddServPrecio(String(found.precio_base));
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Agregar servicio del catálogo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {serviciosCatalogo.map((s) => (
                            <SelectItem key={s.id_servicio} value={String(s.id_servicio)}>
                              {s.codigo_servicio} — {s.nombre_servicio}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      className="sm:col-span-2 h-9 text-xs"
                      placeholder="Cant."
                      value={addServCant}
                      onChange={(e) => setAddServCant(e.target.value)}
                    />
                    <Input
                      type="number"
                      className="sm:col-span-2 h-9 text-xs"
                      placeholder="Precio"
                      value={addServPrecio}
                      onChange={(e) => setAddServPrecio(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="sm:col-span-2 h-9"
                      onClick={handleAddServicio}
                      disabled={!addServId || itemActions.addServicio.isPending}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Añadir
                    </Button>
                  </div>
                )}
              </div>

              {/* Items Componentes */}
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-slate-800">
                  Repuestos / Materiales ({detalle.items_componentes?.length || 0})
                </h4>
                {(detalle.items_componentes || []).map((item, idx) => (
                  <div
                    key={item.id_item_componente || idx}
                    className="flex items-center justify-between p-2.5 border rounded-lg text-xs bg-white"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">{item.descripcion}</p>
                      <p className="text-slate-500">
                        {Number(item.cantidad)} × {formatCurrency(item.precio_unitario)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">
                        {formatCurrency(
                          item.subtotal ??
                            Number(item.cantidad) * Number(item.precio_unitario),
                        )}
                      </span>
                      {esBorradorDetalle && item.id_item_componente && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            itemActions.removeComponente.mutate(item.id_item_componente!)
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {esBorradorDetalle && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                    <div className="sm:col-span-3">
                      <Select
                        value={addCompStockId}
                        onValueChange={(v) => {
                          setAddCompStockId(v);
                          const c = componentesWms.find((x) => x.id_componente === Number(v));
                          if (c) {
                            setAddCompDesc(c.nombre || c.referencia || '');
                            setAddCompPrecio(String(c.precio_venta || c.precio_compra || 0));
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="WMS (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {componentesWms.map((c) => (
                            <SelectItem key={c.id_componente} value={String(c.id_componente)}>
                              {c.codigo} — {c.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="sm:col-span-2">
                      <Select value={addCompTipoId} onValueChange={setAddCompTipoId}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Tipo *" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposComponente.map((t) => (
                            <SelectItem
                              key={t.id_tipo_componente}
                              value={String(t.id_tipo_componente)}
                            >
                              {t.nombre_componente}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      className="sm:col-span-3 h-9 text-xs"
                      placeholder="Descripción repuesto *"
                      value={addCompDesc}
                      onChange={(e) => setAddCompDesc(e.target.value)}
                    />
                    <Input
                      type="number"
                      className="sm:col-span-1 h-9 text-xs"
                      placeholder="Cant"
                      value={addCompCant}
                      onChange={(e) => setAddCompCant(e.target.value)}
                    />
                    <Input
                      type="number"
                      className="sm:col-span-2 h-9 text-xs"
                      placeholder="Precio"
                      value={addCompPrecio}
                      onChange={(e) => setAddCompPrecio(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="sm:col-span-1 h-9"
                      onClick={handleAddComponente}
                      disabled={itemActions.addComponente.isPending}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Solicitar Aprobación */}
      <Dialog open={solicitarOpen} onOpenChange={setSolicitarOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Solicitar Aprobación Interna</DialogTitle>
            <DialogDescription>
              Envía la cotización a revisión gerencial (observaciones mín. 10 caracteres).
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={3}
            value={solicitarObs}
            onChange={(e) => setSolicitarObs(e.target.value)}
            placeholder="Justificación comercial o condiciones especiales..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSolicitarOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={solicitarObs.trim().length < 10 || workflow.solicitarAprobacion.isPending}
              onClick={async () => {
                if (!selectedId) return;
                await workflow.solicitarAprobacion.mutateAsync({
                  id: selectedId,
                  observaciones: solicitarObs.trim(),
                });
                setSolicitarOpen(false);
                setSolicitarObs('');
              }}
            >
              Enviar a Revisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Enviar Cliente */}
      <Dialog open={enviarOpen} onOpenChange={setEnviarOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Enviar Cotización al Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre destinatario *</Label>
              <Input value={enviarNombre} onChange={(e) => setEnviarNombre(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email destinatario *</Label>
              <Input
                type="email"
                value={enviarEmail}
                onChange={(e) => setEnviarEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>CC (separados por coma, opcional)</Label>
              <Input
                value={enviarCopia}
                onChange={(e) => setEnviarCopia(e.target.value)}
                placeholder="gerencia@cliente.com, compras@cliente.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnviarOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!enviarEmail.trim() || !enviarNombre.trim() || workflow.enviar.isPending}
              onClick={async () => {
                if (!selectedId) return;
                const cc = enviarCopia
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean);
                await workflow.enviar.mutateAsync({
                  id: selectedId,
                  destinatario_email: enviarEmail.trim(),
                  destinatario_nombre: enviarNombre.trim(),
                  emails_copia: cc.length ? cc : undefined,
                });
                setEnviarOpen(false);
              }}
            >
              Enviar Oferta + PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Rechazar Cliente */}
      <Dialog open={rechazarOpen} onOpenChange={setRechazarOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>Registrar Rechazo del Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Motivo de rechazo *</Label>
              <Select value={motivoRechazoId} onValueChange={setMotivoRechazoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar motivo" />
                </SelectTrigger>
                <SelectContent>
                  {motivosRechazo.map((m) => (
                    <SelectItem key={m.id_motivo_rechazo} value={String(m.id_motivo_rechazo)}>
                      {m.nombre_motivo || m.descripcion || `Motivo #${m.id_motivo_rechazo}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Observaciones (mín. 10 caracteres) *</Label>
              <Textarea
                rows={3}
                value={obsRechazo}
                onChange={(e) => setObsRechazo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={
                !motivoRechazoId ||
                obsRechazo.trim().length < 10 ||
                workflow.rechazarCliente.isPending
              }
              onClick={async () => {
                if (!selectedId) return;
                await workflow.rechazarCliente.mutateAsync({
                  id: selectedId,
                  id_motivo_rechazo: Number(motivoRechazoId),
                  observaciones_rechazo: obsRechazo.trim(),
                });
                setRechazarOpen(false);
                setObsRechazo('');
              }}
            >
              Confirmar Rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
