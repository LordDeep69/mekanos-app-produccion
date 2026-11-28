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
  useEscalarPropuesta,
  usePropuestasPendientes,
} from '@/features/comercial/hooks/use-comercial';
import { useRouter } from 'next/navigation';
import { getNombreCompleto, useEmpleados } from '@/features/empleados';
import { useOrdenes } from '@/features/ordenes/hooks/use-ordenes';
import { useIsHydrated } from '@/hooks/use-is-hydrated';
import { useOrgFormatters } from '@/hooks/use-org-formatters';
import {
  AlertTriangle,
  ArrowRightCircle,
  ExternalLink,
  Eye,
  FilePlus2,
  FilterX,
  Loader2,
  Plus,
  RefreshCw,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

const PRIORIDAD_COLORS: Record<string, string> = {
  NORMAL: 'bg-slate-100 text-slate-700 border-slate-200',
  ALTA: 'bg-blue-100 text-blue-800 border-blue-200',
  URGENTE: 'bg-amber-100 text-amber-800 border-amber-200',
  EMERGENCIA: 'bg-rose-100 text-rose-800 border-rose-200',
};

const ESTADO_PROPUESTA_COLORS: Record<string, string> = {
  BORRADOR: 'bg-slate-100 text-slate-700',
  EN_REVISION: 'bg-amber-100 text-amber-800',
  APROBADA_INTERNA: 'bg-blue-100 text-blue-800',
  ENVIADA: 'bg-indigo-100 text-indigo-800',
  APROBADA_CLIENTE: 'bg-emerald-100 text-emerald-800',
  RECHAZADA: 'bg-rose-100 text-rose-800',
};

function isPrioridadAlta(prio?: string | number): boolean {
  if (typeof prio === 'number') return prio >= 4;
  const norm = String(prio || '').toUpperCase();
  return norm === 'URGENTE' || norm === 'EMERGENCIA' || norm === 'ALTA';
}

function isPropuestaAprobada(p?: PropuestaCorrectivoItem | null): boolean {
  if (!p) return false;
  const code = (p.estado_codigo || p.estado || '').toUpperCase();
  return (
    code === 'APROBADA_CLIENTE' ||
    code === 'APROBADA_INTERNA' ||
    code === 'APROBADA' ||
    code.includes('APROBADA')
  );
}

const URGENCIA_TO_PRIORIDAD: Record<'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA', number> = {
  BAJA: 2,
  MEDIA: 3,
  ALTA: 4,
  CRITICA: 5,
};

type EstadoVistaPropuesta = 'PENDIENTES' | 'ESCALADAS' | 'CONVERTIDAS' | 'TODAS';

export default function PropuestasCorrectivoPage() {
  const isHydrated = useIsHydrated();
  const { formatCurrency, formatDate } = useOrgFormatters();

  const [estadoVista, setEstadoVista] = useState<EstadoVistaPropuesta>('PENDIENTES');
  const [tipoFiltro, setTipoFiltro] = useState<string>('TODOS');
  const [urgenciaFiltro, setUrgenciaFiltro] = useState<string>('TODOS');
  const [selectedPropuesta, setSelectedPropuesta] = useState<PropuestaCorrectivoItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [ordenId, setOrdenId] = useState<string>('');
  const [tipoPropuesta, setTipoPropuesta] = useState<'CORRECTIVO' | 'MEJORA' | 'REEMPLAZO'>(
    'CORRECTIVO',
  );
  const [urgencia, setUrgencia] = useState<'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'>('ALTA');
  const [tiempoDias, setTiempoDias] = useState<string>('3');
  const [creadaPorId, setCreadaPorId] = useState<string>('');
  const [hallazgo, setHallazgo] = useState('');
  const [solucion, setSolucion] = useState('');

  const { data, isLoading, refetch } = usePropuestasPendientes({
    tipoPropuesta: tipoFiltro !== 'TODOS' ? tipoFiltro : undefined,
    urgencia: urgenciaFiltro !== 'TODOS' ? urgenciaFiltro : undefined,
    estadoVista,
    take: 100,
  });
  const { data: ordenesData } = useOrdenes({ estado: 'EN_PROCESO', limit: 50 });
  const { data: empleadosData } = useEmpleados({ empleado_activo: true, take: 100 });

  const router = useRouter();
  const createMut = useCreatePropuesta();
  const convertirMut = useConvertirPropuesta();
  const escalarMut = useEscalarPropuesta();

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
    try {
      await createMut.mutateAsync({
        id_orden_servicio: Number(ordenId),
        tipo_propuesta: tipoPropuesta,
        urgencia_propuesta: urgencia,
        prioridad: URGENCIA_TO_PRIORIDAD[urgencia],
        tiempo_estimado_ejecucion: Number(tiempoDias) || 1,
        creada_por: Number(creadaPorId),
        descripcion_hallazgo: hallazgo.trim(),
        descripcion_solucion: solucion.trim(),
      });
      setCreateOpen(false);
      setHallazgo('');
      setSolucion('');
    } catch {
      // El toast de error ya se muestra desde useCreatePropuesta
    }
  };

  const totalEstimado = propuestas.reduce((sum, p) => sum + Number(p.total_propuesta || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FilePlus2 className="h-7 w-7 text-primary" />
            Propuestas Correctivas
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Hallazgos técnicos levantados en campo con cotización asociada y conversión a orden de
            servicio.
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
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {data?.total ?? data?.pagination?.total ?? propuestas.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Prioridad Alta / Urgente
            </p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {propuestas.filter((p) => isPrioridadAlta(p.prioridad)).length}
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
        <CardHeader className="pb-3 space-y-3">
          {/* Tabs de Ciclo de Vida */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
            {(
              [
                { value: 'PENDIENTES', label: 'Pendientes' },
                { value: 'ESCALADAS', label: 'Escaladas a COT' },
                { value: 'CONVERTIDAS', label: 'Convertidas a OS' },
                { value: 'TODAS', label: 'Todas' },
              ] as const
            ).map((item) => (
              <Button
                key={item.value}
                type="button"
                size="sm"
                variant={estadoVista === item.value ? 'default' : 'ghost'}
                className="h-8 text-xs"
                onClick={() => setEstadoVista(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {isHydrated ? (
              <div className="flex flex-wrap gap-3">
                <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                  <SelectTrigger id="propuestas-filter-tipo" className="w-48">
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
                  <SelectTrigger id="propuestas-filter-urgencia" className="w-48">
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
                {(tipoFiltro !== 'TODOS' || urgenciaFiltro !== 'TODOS') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTipoFiltro('TODOS');
                      setUrgenciaFiltro('TODOS');
                    }}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    <FilterX className="h-4 w-4 mr-1.5" />
                    Limpiar filtros
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-3" aria-hidden="true">
                <div className="h-9 w-48 rounded-md border border-slate-200 bg-slate-50/80 px-3 flex items-center text-sm text-slate-500">
                  Todos los tipos
                </div>
                <div className="h-9 w-48 rounded-md border border-slate-200 bg-slate-50/80 px-3 flex items-center text-sm text-slate-500">
                  Todas las urgencias
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          ) : propuestas.length === 0 ? (
            tipoFiltro !== 'TODOS' || urgenciaFiltro !== 'TODOS' ? (
              <div className="py-14 px-6 flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mb-4">
                  <FilterX className="h-7 w-7 text-slate-400" />
                </div>
                <h3 className="text-base font-semibold text-slate-800">
                  Sin coincidencias con los filtros actuales
                </h3>
                <p className="text-sm text-slate-500 mt-1 max-w-md">
                  No se encontraron propuestas correctivas pendientes para la combinación de tipo y
                  urgencia seleccionada.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setTipoFiltro('TODOS');
                    setUrgenciaFiltro('TODOS');
                  }}
                >
                  <FilterX className="h-4 w-4 mr-1.5" />
                  Restablecer filtros
                </Button>
              </div>
            ) : (
              <div className="py-16 px-6 flex flex-col items-center justify-center text-center">
                <div className="relative mb-5">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
                    <FilePlus2 className="h-8 w-8 text-primary" />
                  </div>
                  <span className="absolute -bottom-1.5 -right-1.5 h-7 w-7 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center">
                    <Wrench className="h-3.5 w-3.5 text-amber-600" />
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  No hay propuestas correctivas pendientes
                </h3>
                <p className="text-sm text-slate-500 mt-1.5 max-w-md leading-relaxed">
                  Registra aquí hallazgos técnicos detectados durante órdenes de servicio{' '}
                  <span className="font-semibold text-slate-700">EN PROCESO</span> para escalarlos a
                  Cotización Comercial y trazabilidad de cierre.
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
                  <Button type="button" onClick={handleOpenCreate} className="gap-1.5 shadow-xs">
                    <Plus className="h-4 w-4" />
                    Crear primera propuesta
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => refetch()}
                    className="gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Actualizar listado
                  </Button>
                </div>
                {ordenesEnProceso.length > 0 && (
                  <p className="text-xs text-slate-400 mt-4">
                    {ordenesEnProceso.length}{' '}
                    {ordenesEnProceso.length === 1
                      ? 'orden de servicio EN PROCESO disponible'
                      : 'órdenes de servicio EN PROCESO disponibles'}{' '}
                    para reportar hallazgos.
                  </p>
                )}
              </div>
            )
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
                      p.cliente ||
                      p.clientes?.persona?.razon_social ||
                      [p.clientes?.persona?.primer_nombre, p.clientes?.persona?.primer_apellido]
                        .filter(Boolean)
                        .join(' ') ||
                      'Cliente';
                    const eqNombre = p.equipo || p.equipos?.nombre_equipo || 'Sin equipo';
                    const prioLabel = String(p.prioridad ?? 'NORMAL').toUpperCase();
                    const estadoKey = (p.estado_codigo || p.estado || 'BORRADOR').toUpperCase();
                    const cotDerivada = p.cotizaciones_derivadas?.[0];
                    return (
                      <tr key={p.id_propuesta} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-slate-800">
                            {p.numero_propuesta}
                          </div>
                          <div className="text-xs text-slate-400">
                            {p.fecha_propuesta ? formatDate(p.fecha_propuesta) : '—'}
                          </div>
                          {cotDerivada && (
                            <Link
                              href={`/comercial/cotizaciones/${cotDerivada.id_cotizacion}`}
                              className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] font-mono font-semibold text-emerald-700 hover:bg-emerald-100"
                            >
                              {cotDerivada.numero_cotizacion}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                          {p.orden_generada && (
                            <Link
                              href={`/ordenes/${p.orden_generada.id_orden_servicio}`}
                              className="inline-flex items-center gap-1 mt-1 ml-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[11px] font-mono font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              {p.orden_generada.numero_orden}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs">
                          {p.orden_servicio?.numero_orden ? (
                            <Link
                              href={`/ordenes/${p.orden_servicio.id_orden_servicio}`}
                              className="text-primary hover:underline"
                            >
                              {p.orden_servicio.numero_orden}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">{cliNombre}</div>
                          <div className="text-xs text-slate-500">{eqNombre}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline">
                              {p.categoria || p.tipo_propuesta || 'CORRECTIVO'}
                            </Badge>
                            <span
                              className={`inline-block px-2 py-0.5 rounded border text-[11px] font-semibold ${
                                PRIORIDAD_COLORS[prioLabel] ||
                                'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {prioLabel}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                              ESTADO_PROPUESTA_COLORS[estadoKey] || 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.estado || 'Borrador'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {formatCurrency(p.total_propuesta || 0)}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPropuesta(p)}>
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

      {/* Modales montados únicamente tras hidratación para evitar IDs dinámicos de Radix en SSR */}
      {isHydrated && (
        <>
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
                  {selectedPropuesta?.reportada_por
                    ? ` • Reportada por: ${selectedPropuesta.reportada_por}`
                    : ''}
                </DialogDescription>
              </DialogHeader>
              {selectedPropuesta && (
                <div className="space-y-4 text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <p className="text-xs font-bold uppercase text-slate-500 mb-1">
                      Hallazgo Técnico
                    </p>
                    <p className="text-slate-800 whitespace-pre-wrap">
                      {selectedPropuesta.descripcion_problema || 'Sin descripción'}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border">
                    <p className="text-xs font-bold uppercase text-slate-500 mb-1">
                      Solución Propuesta
                    </p>
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
                  {selectedPropuesta.cotizaciones_derivadas &&
                    selectedPropuesta.cotizaciones_derivadas.length > 0 && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold uppercase text-emerald-700">
                            Cotización Derivada Vinculada
                          </p>
                          <p className="text-xs text-emerald-800 mt-0.5">
                            {selectedPropuesta.cotizaciones_derivadas[0].numero_cotizacion} ·{' '}
                            {selectedPropuesta.cotizaciones_derivadas[0].estado_nombre ||
                              'Borrador'}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                          onClick={() => {
                            const cotId =
                              selectedPropuesta.cotizaciones_derivadas?.[0]?.id_cotizacion;
                            setSelectedPropuesta(null);
                            if (cotId) router.push(`/comercial/cotizaciones/${cotId}`);
                          }}
                        >
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                          Abrir Cotización
                        </Button>
                      </div>
                    )}
                </div>
              )}
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => setSelectedPropuesta(null)}>
                  Cerrar
                </Button>
                {selectedPropuesta && (
                  <>
                    <Button
                      disabled={escalarMut.isPending}
                      onClick={async () => {
                        try {
                          const res = await escalarMut.mutateAsync(selectedPropuesta.id_propuesta);
                          setSelectedPropuesta(null);
                          if (res?.cotizacion?.id_cotizacion) {
                            router.push(`/comercial/cotizaciones/${res.cotizacion.id_cotizacion}`);
                          }
                        } catch {
                          // Toast manejado por useEscalarPropuesta
                        }
                      }}
                    >
                      {escalarMut.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                      <FilePlus2 className="h-4 w-4 mr-1.5" />
                      {selectedPropuesta.cotizaciones_derivadas &&
                      selectedPropuesta.cotizaciones_derivadas.length > 0
                        ? `Abrir ${selectedPropuesta.cotizaciones_derivadas[0].numero_cotizacion}`
                        : 'Escalar a Cotización'}
                    </Button>
                    {isPropuestaAprobada(selectedPropuesta) && (
                      <Button
                        variant="secondary"
                        disabled={convertirMut.isPending}
                        onClick={async () => {
                          try {
                            const empId = empleados[0]?.id_empleado || 1;
                            await convertirMut.mutateAsync({
                              id: selectedPropuesta.id_propuesta,
                              convertida_por: empId,
                            });
                            setSelectedPropuesta(null);
                          } catch {
                            // Toast manejado por useConvertirPropuesta
                          }
                        }}
                      >
                        {convertirMut.isPending && (
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        )}
                        <ArrowRightCircle className="h-4 w-4 mr-1.5" />
                        Convertir a Orden de Servicio
                      </Button>
                    )}
                  </>
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
                          {o.numero_orden} —{' '}
                          {o.clientes?.persona?.razon_social || o.equipos?.nombre_equipo || ''}
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
                      onValueChange={(v) =>
                        setTipoPropuesta(v as 'CORRECTIVO' | 'MEJORA' | 'REEMPLAZO')
                      }
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
                    <Label>Urgencia / Prioridad Operativa</Label>
                    <Select
                      value={urgencia}
                      onValueChange={(v) => setUrgencia(v as 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BAJA">Baja · Normal</SelectItem>
                        <SelectItem value="MEDIA">Media · Alta</SelectItem>
                        <SelectItem value="ALTA">Alta · Urgente</SelectItem>
                        <SelectItem value="CRITICA">Crítica · Emergencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Días Estimados de Ejecución</Label>
                    <Input
                      type="number"
                      min={1}
                      value={tiempoDias}
                      onChange={(e) => setTiempoDias(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Técnico / Reportado por *</Label>
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
                  <div className="flex items-center justify-between">
                    <Label>Descripción del Hallazgo (mín. 20 caracteres) *</Label>
                    <span
                      className={`text-[11px] font-mono ${
                        hallazgo.trim().length >= 20 ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {hallazgo.trim().length}/20
                    </span>
                  </div>
                  <Textarea
                    rows={2}
                    value={hallazgo}
                    onChange={(e) => setHallazgo(e.target.value)}
                    placeholder="Ej. Fuga severa de aceite en sello mecánico y recalentamiento en prueba de carga..."
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Solución Propuesta (mín. 20 caracteres) *</Label>
                    <span
                      className={`text-[11px] font-mono ${
                        solucion.trim().length >= 20 ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    >
                      {solucion.trim().length}/20
                    </span>
                  </div>
                  <Textarea
                    rows={2}
                    value={solucion}
                    onChange={(e) => setSolucion(e.target.value)}
                    placeholder="Ej. Reemplazo completo de kit de empaques, sello mecánico y prueba de presión en frío..."
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
        </>
      )}
    </div>
  );
}
