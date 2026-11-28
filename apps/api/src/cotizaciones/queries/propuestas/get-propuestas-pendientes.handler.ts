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
    const { tipoPropuesta, urgencia, skip = 0, take = 50, estadoVista } = query;

    // Obtener estado BORRADOR (propuestas pendientes)
    const estadoBorrador = await this.prisma.estados_cotizacion.findFirst({
      where: {
        OR: [
          { codigo_estado: 'BORRADOR' },
          { nombre_estado: { equals: 'BORRADOR', mode: 'insensitive' } },
        ],
      },
    });

    // Construir filtros dinámicos sobre columnas reales de propuestas_correctivo
    const vistaNorm = String(estadoVista || 'PENDIENTES').toUpperCase();
    const where: any = {};
    if (vistaNorm === 'CONVERTIDAS') {
      where.id_orden_servicio_generada = { not: null };
    } else if (vistaNorm === 'ESCALADAS') {
      where.id_orden_servicio_generada = null;
      where.cotizaciones_derivadas = { some: {} };
    } else if (vistaNorm === 'TODAS') {
      // Sin filtro restrictivo de estado
    } else {
      // PENDIENTES (default retrocompatible): sin orden generada y en estado BORRADOR (o pendientes de cierre)
      where.id_estado = estadoBorrador?.id_estado ?? 1;
      where.id_orden_servicio_generada = null;
    }

    if (tipoPropuesta) {
      const upper = tipoPropuesta.toUpperCase();
      if (
        upper === 'CORRECTIVO' ||
        upper === 'PREVENTIVO_URGENTE' ||
        upper === 'MEJORA' ||
        upper === 'EXTENSION_GARANTIA'
      ) {
        where.categoria = upper;
      } else if (upper === 'REEMPLAZO') {
        where.categoria = 'CORRECTIVO';
      } else if (upper === 'PREDICTIVO') {
        where.categoria = 'PREVENTIVO_URGENTE';
      }
    }

    if (urgencia) {
      const urgUpper = urgencia.toUpperCase();
      const mapUrgPrio: Record<string, string> = {
        BAJA: 'NORMAL',
        MEDIA: 'ALTA',
        ALTA: 'URGENTE',
        CRITICA: 'EMERGENCIA',
        NORMAL: 'NORMAL',
        URGENTE: 'URGENTE',
        EMERGENCIA: 'EMERGENCIA',
      };
      if (mapUrgPrio[urgUpper]) {
        where.prioridad = mapUrgPrio[urgUpper];
      }
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
        empleados: {
          select: {
            id_empleado: true,
            persona: {
              select: {
                nombre_completo: true,
                primer_nombre: true,
                segundo_nombre: true,
                primer_apellido: true,
                segundo_apellido: true,
              },
            },
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
            codigo_estado: true,
            nombre_estado: true,
          },
        },
        cotizaciones_derivadas: {
          orderBy: { id_cotizacion: 'desc' },
          take: 5,
          select: {
            id_cotizacion: true,
            numero_cotizacion: true,
            total_cotizacion: true,
            id_orden_servicio_generada: true,
            estados_cotizacion: {
              select: {
                codigo_estado: true,
                nombre_estado: true,
              },
            },
          },
        },
      },
    });

    // Total propuestas para paginación
    const total = await this.prisma.propuestas_correctivo.count({
      where,
    });

    // Resolver órdenes generadas en consulta separada (evita colisión de alias >63 bytes en PostgreSQL al hacer doble JOIN sobre ordenes_servicio)
    const ordenGeneradaIds = Array.from(
      new Set(
        propuestas
          .map((p) => p.id_orden_servicio_generada)
          .filter((id): id is number => typeof id === 'number' && id > 0),
      ),
    );
    const ordenGeneradaMap = new Map<number, { id_orden_servicio: number; numero_orden: string }>();
    if (ordenGeneradaIds.length > 0) {
      const ordenesGen = await this.prisma.ordenes_servicio.findMany({
        where: { id_orden_servicio: { in: ordenGeneradaIds } },
        select: { id_orden_servicio: true, numero_orden: true },
      });
      for (const og of ordenesGen) {
        ordenGeneradaMap.set(og.id_orden_servicio, og);
      }
    }

    return {
      total,
      propuestas: propuestas.map((p) => {
        const ordenOrigen =
          p.ordenes_servicio_propuestas_correctivo_id_orden_servicioToordenes_servicio;
        const ordenGenerada = p.id_orden_servicio_generada
          ? (ordenGeneradaMap.get(p.id_orden_servicio_generada) ?? null)
          : null;
        const meta = (p.metadata ?? {}) as Record<string, unknown>;
        const empPersona = p.empleados?.persona;
        const reportadaPorNombre =
          empPersona?.nombre_completo?.trim() ||
          [
            empPersona?.primer_nombre,
            empPersona?.segundo_nombre,
            empPersona?.primer_apellido,
            empPersona?.segundo_apellido,
          ]
            .filter(Boolean)
            .join(' ')
            .trim() ||
          null;
        const cotDerivadas = (p.cotizaciones_derivadas || []).map((c) => ({
          id_cotizacion: c.id_cotizacion,
          numero_cotizacion: c.numero_cotizacion,
          total_cotizacion: Number(c.total_cotizacion || 0),
          id_orden_servicio_generada: c.id_orden_servicio_generada ?? null,
          estado_codigo: c.estados_cotizacion?.codigo_estado,
          estado_nombre: c.estados_cotizacion?.nombre_estado,
        }));
        const totalBase = Number(p.total_propuesta || 0);
        const totalEfectivo = totalBase > 0 ? totalBase : (cotDerivadas[0]?.total_cotizacion ?? 0);
        return {
          id_propuesta: p.id_propuesta,
          numero_propuesta: p.numero_propuesta,
          categoria: p.categoria,
          tipo_propuesta:
            typeof meta.tipo_propuesta_original === 'string'
              ? meta.tipo_propuesta_original
              : p.categoria,
          urgencia_propuesta:
            typeof meta.urgencia_propuesta === 'string' ? meta.urgencia_propuesta : undefined,
          descripcion_problema: p.descripcion_problema,
          solucion_propuesta: p.solucion_propuesta,
          prioridad: p.prioridad,
          fecha_propuesta: p.fecha_propuesta,
          fecha_vencimiento: p.fecha_vencimiento,
          subtotal_servicios: p.subtotal_servicios,
          subtotal_componentes: p.subtotal_componentes,
          total_propuesta: totalEfectivo,
          estado: p.estados_cotizacion.nombre_estado,
          estado_codigo: p.estados_cotizacion.codigo_estado,
          reportada_por: reportadaPorNombre,
          orden_servicio: {
            id_orden_servicio: ordenOrigen.id_orden_servicio,
            numero_orden: ordenOrigen.numero_orden,
          },
          orden_generada: ordenGenerada
            ? {
                id_orden_servicio: ordenGenerada.id_orden_servicio,
                numero_orden: ordenGenerada.numero_orden,
              }
            : null,
          cliente:
            p.clientes.persona.razon_social ||
            `${p.clientes.persona.primer_nombre} ${p.clientes.persona.primer_apellido}`,
          equipo: p.equipos?.nombre_equipo ?? null,
          convertida_a_orden: !!p.id_orden_servicio_generada,
          cotizaciones_derivadas: cotDerivadas,
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
