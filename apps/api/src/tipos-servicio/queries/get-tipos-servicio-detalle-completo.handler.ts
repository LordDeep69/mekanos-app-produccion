import { PrismaService } from '@mekanos/database';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTiposServicioDetalleCompletoQuery } from './get-tipos-servicio-detalle-completo.query';

@QueryHandler(GetTiposServicioDetalleCompletoQuery)
export class GetTiposServicioDetalleCompletoHandler
    implements IQueryHandler<GetTiposServicioDetalleCompletoQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetTiposServicioDetalleCompletoQuery) {
        const { id } = query;

        const tipoServicio = await this.prisma.tipos_servicio.findUnique({
            where: { id_tipo_servicio: id },
            include: {
                tipos_equipo: true,
                catalogo_actividades: {
                    where: { activo: true },
                    include: {
                        catalogo_sistemas: true,
                        parametros_medicion: true,
                    },
                    orderBy: [
                        { catalogo_sistemas: { orden_visualizacion: 'asc' } },
                        { orden_ejecucion: 'asc' },
                    ],
                },
                _count: {
                    select: {
                        catalogo_actividades: { where: { activo: true } },
                        ordenes_servicio: true,
                    },
                },
            },
        });

        if (!tipoServicio) {
            throw new NotFoundException(`Tipo de servicio con ID ${id} no encontrado`);
        }

        // Agrupar actividades por nombre normalizado de sistema (evita duplicar General / Sin Sistema)
        const actividadesPorSistema = new Map<string, { id_sistema: number | null; nombre_sistema: string; codigo_sistema: string; acts: any[] }>();

        for (const actividad of tipoServicio.catalogo_actividades) {
            const sistema = actividad.catalogo_sistemas;
            const nombreSistema = (sistema?.nombre_sistema || 'General').trim();
            const codigoSistema = sistema?.codigo_sistema || 'GENERAL';
            const key = nombreSistema.toUpperCase();

            if (!actividadesPorSistema.has(key)) {
                actividadesPorSistema.set(key, {
                    id_sistema: actividad.id_sistema,
                    nombre_sistema: nombreSistema,
                    codigo_sistema: codigoSistema,
                    acts: [],
                });
            }
            actividadesPorSistema.get(key)!.acts.push(actividad);
        }

        // Construir respuesta estructurada
        const sistemasConActividades = [];
        for (const [, group] of actividadesPorSistema) {
            sistemasConActividades.push({
                id_sistema: group.id_sistema,
                nombre_sistema: group.nombre_sistema,
                codigo_sistema: group.codigo_sistema,
                actividades: group.acts.map(a => ({
                    id_actividad_catalogo: a.id_actividad_catalogo,
                    codigo_actividad: a.codigo_actividad,
                    descripcion_actividad: a.descripcion_actividad,
                    tipo_actividad: a.tipo_actividad,
                    es_obligatoria: a.es_obligatoria,
                    tiempo_estimado_minutos: a.tiempo_estimado_minutos,
                    parametro_medicion: a.parametros_medicion ? {
                        id: a.parametros_medicion.id_parametro_medicion,
                        nombre: a.parametros_medicion.nombre_parametro,
                        unidad: a.parametros_medicion.unidad_medida,
                        rango_min: a.parametros_medicion.valor_minimo_normal != null ? Number(a.parametros_medicion.valor_minimo_normal) : undefined,
                        rango_max: a.parametros_medicion.valor_maximo_normal != null ? Number(a.parametros_medicion.valor_maximo_normal) : undefined,
                    } : null,
                })),
                total_actividades: group.acts.length,
            });
        }

        // Ordenar sistemas
        sistemasConActividades.sort((a, b) => {
            if (a.nombre_sistema.toUpperCase() === 'GENERAL') return 1;
            if (b.nombre_sistema.toUpperCase() === 'GENERAL') return -1;
            return 0;
        });

        return {
            id_tipo_servicio: tipoServicio.id_tipo_servicio,
            codigo_tipo: tipoServicio.codigo_tipo,
            nombre_tipo: tipoServicio.nombre_tipo,
            descripcion: tipoServicio.descripcion,
            plantilla_observacion: tipoServicio.plantilla_observacion,
            activo: tipoServicio.activo,
            categoria: tipoServicio.categoria,
            color_hex: tipoServicio.color_hex,
            icono: tipoServicio.icono,
            tiene_checklist: tipoServicio.tiene_checklist,
            duracion_estimada_horas: tipoServicio.duracion_estimada_horas,
            tipo_equipo: tipoServicio.tipos_equipo ? {
                id: tipoServicio.tipos_equipo.id_tipo_equipo,
                nombre: tipoServicio.tipos_equipo.nombre_tipo,
            } : null,
            estadisticas: {
                total_actividades: tipoServicio._count.catalogo_actividades,
                total_ordenes_historicas: tipoServicio._count.ordenes_servicio,
                total_sistemas: sistemasConActividades.length,
            },
            sistemas_con_actividades: sistemasConActividades,
        };
    }
}
