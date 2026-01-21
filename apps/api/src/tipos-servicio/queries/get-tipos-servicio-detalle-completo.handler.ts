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

        // Agrupar actividades por sistema
        const actividadesPorSistema = new Map<number | null, any[]>();

        for (const actividad of tipoServicio.catalogo_actividades) {
            const sistemaId = actividad.id_sistema;
            if (!actividadesPorSistema.has(sistemaId)) {
                actividadesPorSistema.set(sistemaId, []);
            }
            actividadesPorSistema.get(sistemaId)!.push(actividad);
        }

        // Construir respuesta estructurada
        const sistemasConActividades = [];
        for (const [sistemaId, actividades] of actividadesPorSistema) {
            const sistema = actividades[0]?.catalogo_sistemas;
            sistemasConActividades.push({
                id_sistema: sistemaId,
                nombre_sistema: sistema?.nombre_sistema || 'Sin Sistema',
                codigo_sistema: sistema?.codigo_sistema || 'GENERAL',
                actividades: actividades.map(a => ({
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
                        rango_min: a.parametros_medicion.rango_minimo,
                        rango_max: a.parametros_medicion.rango_maximo,
                    } : null,
                })),
                total_actividades: actividades.length,
            });
        }

        // Ordenar sistemas
        sistemasConActividades.sort((a, b) => {
            if (a.id_sistema === null) return 1;
            if (b.id_sistema === null) return -1;
            return 0;
        });

        return {
            id_tipo_servicio: tipoServicio.id_tipo_servicio,
            codigo_tipo: tipoServicio.codigo_tipo,
            nombre_tipo: tipoServicio.nombre_tipo,
            descripcion: tipoServicio.descripcion,
            categoria: tipoServicio.categoria,
            color_hex: tipoServicio.color_hex,
            icono: tipoServicio.icono,
            tiene_checklist: tipoServicio.tiene_checklist,
            duracion_estimada_horas: tipoServicio.duracion_estimada_horas,
            tipo_equipo: tipoServicio.tipos_equipo ? {
                id: tipoServicio.tipos_equipo.id_tipo_equipo,
                nombre: tipoServicio.tipos_equipo.nombre,
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
