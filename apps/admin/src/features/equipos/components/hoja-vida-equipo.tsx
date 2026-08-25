/**
 * MEKANOS S.A.S - Portal Admin
 * Componente: Hoja de Vida y Trazabilidad Operativa del Equipo
 * 
 * Muestra la cronología técnica de intervenciones sobre la máquina:
 * preventivos realizados, correctivos específicos (batería, fugas, sensores, sellos),
 * mediciones críticas capturadas, técnicos responsables y acceso a informes PDF.
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatDateSafe } from '@/lib/utils';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Gauge,
  History,
  Layers,
  Sparkles,
  Timer,
  User,
  Wrench,
  Zap
} from 'lucide-react';
import Link from 'next/link';
import { useTrazabilidadEquipo } from '../lib/equipos.service';

interface HojaVidaEquipoProps {
  equipoId: number;
}

export function HojaVidaEquipo({ equipoId }: HojaVidaEquipoProps) {
  const { data, isLoading, isError, error, refetch } = useTrazabilidadEquipo(equipoId);

  const intervenciones = data?.intervenciones || [];

  const totalPreventivos = intervenciones.filter(
    (i) => i.tipos_servicio?.categoria === 'PREVENTIVO'
  ).length;
  const totalCorrectivos = intervenciones.filter(
    (i) => i.tipos_servicio?.categoria === 'CORRECTIVO' || i.tipos_servicio?.categoria === 'EMERGENCIA'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header y Resumen de Métricas */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-xl text-blue-400">
              <History className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Hoja de Vida de Mantenimiento
                <Badge variant="outline" className="bg-blue-900/50 text-blue-300 border-blue-700 text-xs">
                  {intervenciones.length} intervenciones
                </Badge>
              </h3>
              <p className="text-xs text-slate-300">
                Historial cronológico completo de intervenciones, servicios ejecutados y mediciones técnicas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-800/80 p-3 rounded-xl border border-slate-700">
            <div className="text-center px-2 border-r border-slate-700">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Preventivos</p>
              <p className="text-lg font-bold text-blue-400">{totalPreventivos}</p>
            </div>
            <div className="text-center px-2">
              <p className="text-[10px] text-slate-400 uppercase font-bold">Correctivos</p>
              <p className="text-lg font-bold text-orange-400">{totalCorrectivos}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido / Timeline */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-200 text-red-700">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
          <p className="font-bold">Error al cargar la hoja de vida del equipo</p>
          <p className="text-xs text-red-600 mt-1">{(error as Error)?.message || 'Error desconocido'}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 bg-white">
            Reintentar
          </Button>
        </div>
      ) : intervenciones.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <Wrench className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700">No hay intervenciones registradas para este equipo</p>
          <p className="text-xs text-slate-400 mt-1">
            Cada vez que se ejecute una orden de servicio donde participe esta máquina, quedará grabada aquí su trazabilidad.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {intervenciones.map((item) => {
            const fechaIntervencion = item.fecha_programada || item.fecha_creacion;
            const docGen: any = item.informes?.[0]?.documentos_generados;
            const pdfDoc = Array.isArray(docGen)
              ? (docGen[0]?.ruta_archivo || docGen[0]?.url_documento)
              : (docGen?.ruta_archivo || docGen?.url_documento);
            const tieneCorrectivosEspecificos = item.detalle_servicios_orden && item.detalle_servicios_orden.length > 0;
            const esCorrectivo = item.tipos_servicio?.categoria === 'CORRECTIVO' || item.tipos_servicio?.categoria === 'EMERGENCIA';

            return (
              <div key={item.id_orden_servicio} className="relative group">
                {/* Indicador en timeline */}
                <div
                  className={cn(
                    'absolute -left-6 sm:-left-8 top-4 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-transform group-hover:scale-125',
                    esCorrectivo ? 'bg-orange-500' : 'bg-blue-600'
                  )}
                />

                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all space-y-4">
                  {/* Encabezado */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                        {item.numero_orden}
                      </span>
                      {item.tipos_servicio && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-bold text-xs',
                            esCorrectivo
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          )}
                        >
                          {item.tipos_servicio.nombre_tipo}
                        </Badge>
                      )}
                      {item.estados_orden && (
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: `${item.estados_orden.color_hex || '#64748b'}15`,
                            color: item.estados_orden.color_hex || '#64748b',
                            borderColor: `${item.estados_orden.color_hex || '#64748b'}30`,
                          }}
                        >
                          {item.estados_orden.nombre_estado}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>{formatDateSafe(fechaIntervencion, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <Link
                        href={`/ordenes/${item.id_orden_servicio}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors ml-2"
                      >
                        <span>Ver Orden</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Servicios Correctivos Específicos Ejecutados */}
                  {tieneCorrectivosEspecificos ? (
                    <div className="bg-orange-50/60 rounded-xl p-3.5 border border-orange-200/80 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4 text-orange-600" />
                        <p className="text-xs font-black uppercase tracking-wider text-orange-900">
                          Intervenciones Específicas Realizadas ({item.detalle_servicios_orden?.length})
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {item.detalle_servicios_orden?.map((det) => (
                          <div
                            key={det.id_detalle_servicio}
                            className="flex items-start gap-2 p-2 bg-white rounded-lg border border-orange-100 text-xs shadow-2xs"
                          >
                            <span className="font-mono text-[10px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded shrink-0">
                              {det.catalogo_servicios?.codigo_servicio}
                            </span>
                            <span className="font-bold text-slate-800 flex-1">
                              {det.catalogo_servicios?.nombre_servicio}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Diagnóstico y Trabajo Realizado */}
                  {(item.descripcion_inicial || item.diagnostico_tecnico || item.trabajo_realizado) && (
                    <div className="text-xs space-y-1.5 bg-slate-50 p-3 rounded-xl">
                      {item.descripcion_inicial && (
                        <p className="text-slate-700">
                          <strong className="text-slate-900">Motivo / Requerimiento:</strong> {item.descripcion_inicial}
                        </p>
                      )}
                      {item.diagnostico_tecnico && (
                        <p className="text-slate-700">
                          <strong className="text-slate-900">Diagnóstico técnico:</strong> {item.diagnostico_tecnico}
                        </p>
                      )}
                      {item.trabajo_realizado && (
                        <p className="text-slate-700">
                          <strong className="text-slate-900">Trabajo realizado:</strong> {item.trabajo_realizado}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Mediciones Tomadas en esta Intervención */}
                  {item.mediciones_servicio && item.mediciones_servicio.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <Gauge className="h-3.5 w-3.5 text-blue-500" /> Mediciones Registradas ({item.mediciones_servicio.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {item.mediciones_servicio.map((m) => (
                          <div
                            key={m.id_medicion}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium',
                              m.es_critico || m.fuera_de_rango
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            )}
                          >
                            <span>{m.parametros_medicion?.nombre_parametro}:</span>
                            <span className="font-bold font-mono">
                              {m.valor_medido} {m.parametros_medicion?.unidad_medida}
                            </span>
                            {(m.es_critico || m.fuera_de_rango) && (
                              <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer con Técnico y PDF */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      {item.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.persona ? (
                        <div className="flex items-center gap-1 text-slate-700 font-medium">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>Técnico: {item.empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.nombre_completo}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Sin técnico asignado</span>
                      )}
                    </div>

                    {pdfDoc && (
                      <a
                        href={pdfDoc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg font-bold transition-colors self-start sm:self-auto"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>Ver Informe Técnico (PDF)</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
