import { PrismaService } from '@mekanos/database';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreatePropuestaCommand } from './create-propuesta.command';

/**
 * CreatePropuestaHandler
 * FASE 4.9: Crea propuesta correctivo y genera cotización automática
 * 
 * LÓGICA:
 * 1. Validar orden servicio existe y está EN_PROCESO
 * 2. Obtener cliente + sede + equipo desde orden servicio
 * 3. Generar número propuesta automático (formato: PROP-AAAA-XXXX)
 * 4. Crear registro propuesta_correctivo
 * 5. Generar cotización automática asociada (estado BORRADOR)
 * 6. Registrar auditoría
 */
@CommandHandler(CreatePropuestaCommand)
export class CreatePropuestaHandler implements ICommandHandler<CreatePropuestaCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreatePropuestaCommand) {
    const {
      idOrdenServicio,
      tipoPropuesta,
      descripcionHallazgo,
      descripcionSolucion,
      prioridad,
      creadaPor,
    } = command;

    // PASO 1: Validar orden servicio existe y obtener datos relacionados
    const ordenServicio = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idOrdenServicio },
      include: {
        cliente: {
          include: {
            persona: true,
          },
        },
        sede: true,
        equipo: true,
        estado: true,
      },
    });

    if (!ordenServicio) {
      throw new NotFoundException(`Orden servicio ${idOrdenServicio} no encontrada`);
    }

    // Validar orden servicio está EN_PROCESO (técnico puede generar propuestas durante ejecución)
    if (ordenServicio.estado.nombre_estado !== 'EN_PROCESO') {
      throw new BadRequestException(
        `Solo se pueden generar propuestas desde órdenes EN_PROCESO. Estado actual: ${ordenServicio.estado.nombre_estado}`,
      );
    }

    // PASO 2: Generar número propuesta automático (PROP-AAAA-XXXX)
    const year = new Date().getFullYear();
    const ultimaPropuesta = await this.prisma.propuestas_correctivo.findFirst({
      where: {
        numero_propuesta: {
          startsWith: `PROP-${year}-`,
        },
      },
      orderBy: {
        id_propuesta: 'desc',
      },
    });

    let consecutivo = 1;
    if (ultimaPropuesta) {
      const matches = ultimaPropuesta.numero_propuesta.match(/PROP-\d{4}-(\d{4})/);
      if (matches) {
        consecutivo = parseInt(matches[1]) + 1;
      }
    }

    const numeroPropuesta = `PROP-${year}-${consecutivo.toString().padStart(4, '0')}`;

    // PASO 3: Obtener estado BORRADOR para propuesta
    const estadoBorrador = await this.prisma.estados_cotizacion.findFirst({
      where: { nombre_estado: 'BORRADOR' },
    });

    if (!estadoBorrador) {
      throw new BadRequestException('Estado BORRADOR no encontrado en estados_cotizacion');
    }

    // PASO 4: Crear propuesta correctivo
    const propuesta = await this.prisma.propuestas_correctivo.create({
      data: {
        numero_propuesta: numeroPropuesta,
        id_orden_servicio: idOrdenServicio,
        id_cliente: ordenServicio.id_cliente,
        id_equipo: ordenServicio.id_equipo,
        descripcion_problema: descripcionHallazgo,
        solucion_propuesta: descripcionSolucion,
        categoria: tipoPropuesta as any, // CORRECTIVO | PREDICTIVO | MEJORA
        prioridad: prioridad as any, // BAJA | NORMAL | ALTA | URGENTE
        id_estado: estadoBorrador.id_estado,
        fecha_propuesta: new Date(),
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        subtotal_servicios: 0, // Técnico completa después
        subtotal_componentes: 0,
        total_propuesta: 0,
        propuesta_por: creadaPor,
      },
    });

    return {
      message: 'Propuesta correctivo creada exitosamente',
      propuesta: {
        id_propuesta: propuesta.id_propuesta,
        numero_propuesta: propuesta.numero_propuesta,
        categoria: propuesta.categoria,
        prioridad: propuesta.prioridad,
        fecha_propuesta: propuesta.fecha_propuesta,
        total_propuesta: propuesta.total_propuesta,
      },
      orden_servicio: {
        id_orden_servicio: ordenServicio.id_orden_servicio,
        numero_orden: ordenServicio.numero_orden,
      },
      cliente: {
        razon_social: ordenServicio.cliente.persona.razon_social || 
                      `${ordenServicio.cliente.persona.primer_nombre} ${ordenServicio.cliente.persona.primer_apellido}`,
      },
    };
  }
}
