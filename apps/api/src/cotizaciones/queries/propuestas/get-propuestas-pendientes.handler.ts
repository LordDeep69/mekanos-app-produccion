import { PrismaService } from '@mekanos/database';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetPropuestasPendientesQuery } from './get-propuestas-pendientes.query';

/**
 * GetPropuestasPendientesHandler
 * FASE 4.9: Lista propuestas pendientes aprobación (Dashboard supervisor/gerente)
 */
@QueryHandler(GetPropuestasPendientesQuery)
export class GetPropuestasPendientesHandler implements IQueryHandler<GetPropuestasPendientesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetPropuestasPendientesQuery) {
    const { tipoPropuesta, urgencia, skip = 0, take = 50 } = query;

    // Obtener estado BORRADOR (propuestas pendientes)
    const estadoBorrador = await this.prisma.estados_cotizacion.findFirst({
      where: { nombre_estado: 'BORRADOR' },
    });

    // Construir filtros dinámicos
    const where: any = {
      id_estado: estadoBorrador?.id_estado,
      id_orden_servicio_generada: null, // No convertidas aún
    };

    if (tipoPropuesta) {
      where.tipo_propuesta = tipoPropuesta;
    }

    if (urgencia) {
      where.urgencia_propuesta = urgencia;
    }

    // Obtener propuestas con relaciones
    const propuestas = await this.prisma.propuestas_correctivo.findMany({
      where,
      orderBy: [
        { prioridad: 'desc' }, // Prioridad ALTA primero
        { fecha_propuesta: 'desc' }, // Más recientes primero
      ],
      skip,
      take,
      include: {
        ordenes_servicio_propuestas_correctivo_id_orden_servicioToordenes_servicio: {
          select: {
            id_orden_servicio: true,
            numero_orden: true,
          },
        },
        clientes: {
          include: {
            persona: {
              select: {
                razon_social: true,
                primer_nombre: true,
                primer_apellido: true,
              },
            },
          },
        },
        equipos: {
          select: {
            id_equipo: true,
            nombre_equipo: true,
          },
        },
        estados_cotizacion: {
          select: {
            nombre_estado: true,
          },
        },
      },
    });

    // Total propuestas para paginación
    const total = await this.prisma.propuestas_correctivo.count({
      where,
    });

    return {
      propuestas: propuestas.map((p) => {
        const ordenOrigen =
          p.ordenes_servicio_propuestas_correctivo_id_orden_servicioToordenes_servicio;
        return {
          id_propuesta: p.id_propuesta,
          numero_propuesta: p.numero_propuesta,
          categoria: p.categoria,
          descripcion_problema: p.descripcion_problema,
          solucion_propuesta: p.solucion_propuesta,
          prioridad: p.prioridad,
          fecha_propuesta: p.fecha_propuesta,
          fecha_vencimiento: p.fecha_vencimiento,
          subtotal_servicios: p.subtotal_servicios,
          subtotal_componentes: p.subtotal_componentes,
          total_propuesta: p.total_propuesta,
          estado: p.estados_cotizacion.nombre_estado,
          orden_servicio: {
            id_orden_servicio: ordenOrigen.id_orden_servicio,
            numero_orden: ordenOrigen.numero_orden,
          },
          cliente:
            p.clientes.persona.razon_social ||
            `${p.clientes.persona.primer_nombre} ${p.clientes.persona.primer_apellido}`,
          equipo: p.equipos?.nombre_equipo,
          convertida_a_orden: !!p.id_orden_servicio_generada,
        };
      }),
      pagination: {
        total,
        skip,
        take,
        has_more: skip + take < total,
      },
    };
  }
}
