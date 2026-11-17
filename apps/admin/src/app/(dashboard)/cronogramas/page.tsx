'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CronogramaServicio } from '@/features/contratos/api/contratos.service';
import {
  useContratos,
  useCronogramas,
  useUpdateCronograma,
} from '@/features/contratos/hooks/use-contratos';
import { useEquipos } from '@/features/equipos/lib/equipos.service';
import { useClientesSelector, useTiposServicio } from '@/features/ordenes/hooks/use-catalogos';
import { useCrearOrden } from '@/features/ordenes/hooks/use-ordenes';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import { CalendarClock, ExternalLink, Loader2, PlayCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const ESTADO_CRON_STYLE: Record<string, string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800 border-amber-200',
  PROGRAMADA: 'bg-blue-100 text-blue-800 border-blue-200',
  COMPLETADA: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  VENCIDA: 'bg-rose-100 text-rose-800 border-rose-200',
  CANCELADA: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function CronogramasPage() {
  const { formatDate } = useOrgFormatters();

  const [contratoFiltro, setContratoFiltro] = useState<string>('TODOS');
  const [estadoFiltro, setEstadoFiltro] = useState<string>('TODOS');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [generandoId, setGenerandoId] = useState<number | null>(null);

  const { data: cronogramasData, isLoading, refetch } = useCronogramas(1, 200);
  const { data: contratosData } = useContratos(1, 100);
  const { data: clientes = [] } = useClientesSelector();
  const { data: equiposData } = useEquipos({ limit: 200 });
  const { data: tiposServicio = [] } = useTiposServicio({ activo: true });

  const crearOrdenMut = useCrearOrden();
  const updateCronMut = useUpdateCronograma();

  const cronogramas = cronogramasData?.data || [];
  const contratos = contratosData?.data || [];
  const equipos = equiposData?.data || [];

  const contratosMap = useMemo(() => {
    const m = new Map<number, (typeof contratos)[number]>();
    for (const c of contratos) m.set(c.id_contrato, c);
    return m;
  }, [contratos]);

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
    const m = new Map<number, (typeof equipos)[number]>();
    for (const e of equipos) m.set(e.id_equipo, e);
    return m;
  }, [equipos]);

  const tiposServicioMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of tiposServicio) m.set(t.id_tipo_servicio, t.nombre_tipo);
    return m;
  }, [tiposServicio]);

  const filtrados = useMemo(() => {
    return cronogramas.filter((item) => {
      if (contratoFiltro !== 'TODOS' && String(item.id_contrato) !== contratoFiltro) {
        return false;
      }
      if (estadoFiltro !== 'TODOS' && item.estado_cronograma !== estadoFiltro) {
        return false;
      }
      const prevStr = (item.fecha_prevista || '').slice(0, 10);
      if (fechaDesde && prevStr < fechaDesde) return false;
      if (fechaHasta && prevStr > fechaHasta) return false;
      return true;
    });
  }, [cronogramas, contratoFiltro, estadoFiltro, fechaDesde, fechaHasta]);

  const handleGenerarOrden = async (item: CronogramaServicio) => {
    const contrato = contratosMap.get(item.id_contrato);
    const equipo = equiposMap.get(item.id_equipo);
    const clienteId = contrato?.id_cliente || equipo?.cliente?.id_cliente;

    if (!clienteId) {
      toast.error('No se pudo determinar el cliente del contrato/equipo');
      return;
    }

    setGenerandoId(item.id_cronograma);
    try {
      const ordenRes = await crearOrdenMut.mutateAsync({
        clienteId,
        equipoId: item.id_equipo,
        equiposIds: [item.id_equipo],
        tipoServicioId: item.tipo_servicio_programado,
        fechaProgramada: (item.fecha_prevista || '').slice(0, 10),
        prioridad:
          (item.prioridad as 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA') || 'NORMAL',
        descripcion:
          item.observaciones_programacion ||
          `Servicio programado por contrato ${contrato?.codigo_contrato || `#${item.id_contrato}`}`,
      });

      const idOrdenGenerada = ordenRes?.data?.id_orden_servicio;
      if (idOrdenGenerada) {
        await updateCronMut.mutateAsync({
          id: item.id_cronograma,
          payload: {
            id_orden_servicio_generada: idOrdenGenerada,
            estado_cronograma: 'PROGRAMADA',
            fecha_generacion_os: new Date().toISOString(),
          },
        });
      }
    } finally {
      setGenerandoId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <CalendarClock className="h-7 w-7 text-primary" />
            Cronogramas de Servicio
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Programación preventiva derivada de contratos y generación directa de Órdenes de Servicio.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Hitos Programados</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{cronogramas.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Pendientes</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {cronogramas.filter((c) => c.estado_cronograma === 'PENDIENTE').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Con Orden Generada</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {cronogramas.filter((c) => Boolean(c.id_orden_servicio_generada)).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Completados</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {cronogramas.filter((c) => c.estado_cronograma === 'COMPLETADA').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Select value={contratoFiltro} onValueChange={setContratoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Contrato" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los contratos</SelectItem>
                {contratos.map((c) => (
                  <SelectItem key={c.id_contrato} value={String(c.id_contrato)}>
                    {c.codigo_contrato} — {clientesMap.get(c.id_cliente) || ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="PROGRAMADA">Programada</SelectItem>
                <SelectItem value="COMPLETADA">Completada</SelectItem>
                <SelectItem value="VENCIDA">Vencida</SelectItem>
                <SelectItem value="CANCELADA">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              title="Fecha prevista desde"
            />
            <Input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              title="Fecha prevista hasta"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No hay hitos de cronograma para los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b">
                  <tr>
                    <th className="py-3 px-3">Fecha Prevista</th>
                    <th className="py-3 px-3">Contrato / Cliente</th>
                    <th className="py-3 px-3">Equipo</th>
                    <th className="py-3 px-3">Tipo de Servicio</th>
                    <th className="py-3 px-3">Estado</th>
                    <th className="py-3 px-3 text-right">Orden / Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtrados.map((item) => {
                    const contrato = contratosMap.get(item.id_contrato);
                    const equipo = equiposMap.get(item.id_equipo);
                    const cliNombre = contrato
                      ? clientesMap.get(contrato.id_cliente)
                      : equipo?.cliente?.nombre;
                    const est = item.estado_cronograma || 'PENDIENTE';
                    return (
                      <tr key={item.id_cronograma} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 font-mono text-xs font-semibold whitespace-nowrap">
                          {formatDate(item.fecha_prevista)}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono text-xs font-bold text-slate-800">
                            {contrato?.codigo_contrato || `CTR #${item.id_contrato}`}
                          </div>
                          <div className="text-xs text-slate-500">{cliNombre || '—'}</div>
                        </td>
                        <td className="py-3 px-3 text-xs">
                          <div className="font-semibold text-slate-800">
                            {equipo?.codigo_equipo || `EQ #${item.id_equipo}`}
                          </div>
                          <div className="text-slate-500">{equipo?.nombre_equipo || ''}</div>
                        </td>
                        <td className="py-3 px-3 text-xs">
                          {tiposServicioMap.get(item.tipo_servicio_programado) ||
                            `Servicio #${item.tipo_servicio_programado}`}
                          {item.prioridad && (
                            <Badge variant="outline" className="ml-2 text-[10px]">
                              {item.prioridad}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                              ESTADO_CRON_STYLE[est] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {est}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {item.id_orden_servicio_generada ? (
                            <Link href={`/ordenes/${item.id_orden_servicio_generada}`}>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                                OS #{item.id_orden_servicio_generada}
                              </Button>
                            </Link>
                          ) : est === 'PENDIENTE' || est === 'VENCIDA' ? (
                            <Button
                              size="sm"
                              disabled={generandoId === item.id_cronograma}
                              onClick={() => handleGenerarOrden(item)}
                            >
                              {generandoId === item.id_cronograma ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                              )}
                              Generar Orden
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
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
    </div>
  );
}
