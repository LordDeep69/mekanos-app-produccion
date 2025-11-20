import { PrismaService } from '@mekanos/database';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConvertirPropuestaOrdenCommand } from './convertir-propuesta-orden.command';

/**
 * ConvertirPropuestaOrdenHandler
 * FASE 4.9: Convierte propuesta aprobada en orden servicio automática
 * 
 * LÓGICA:
 * 1. Validar propuesta existe y cotización asociada está APROBADA_CLIENTE
 * 2. Validar propuesta no ha sido convertida antes
 * 3. Obtener datos cotización aprobada
 * 4. Generar número orden servicio automático
 * 5. Crear orden servicio con datos cotización
 * 6. Actualizar propuesta marcando fecha conversión
 */
@CommandHandler(ConvertirPropuestaOrdenCommand)
export class ConvertirPropuestaOrdenHandler implements ICommandHandler<ConvertirPropuestaOrdenCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ConvertirPropuestaOrdenCommand) {
    const { idPropuesta, convertidaPor } = command;

    // PASO 1: Validar propuesta existe y obtener datos relacionados
    const propuesta = await this.prisma.propuestas_correctivo.findUnique({
      where: { id_propuesta: idPropuesta },
      include: {
        orden_servicio: {
          include: {
            cliente: {
              include: { persona: true },
            },
            sede: true,
            equipo: true,
          },
        },
        cliente: {
          include: { persona: true },
        },
        equipo: true,
        estado: true,
      },
    });

    if (!propuesta) {
      throw new NotFoundException(`Propuesta ${idPropuesta} no encontrada`);
    }

    // PASO 2: Validar propuesta está APROBADA
    if (propuesta.estado.nombre_estado !== 'APROBADA') {
      throw new BadRequestException(
        `Solo se pueden convertir propuestas APROBADAS. Estado actual: ${propuesta.estado.nombre_estado}`,
      );
    }

    // PASO 3: Validar propuesta no convertida antes
    if (propuesta.id_orden_servicio_generada) {
      throw new BadRequestException(
        `Propuesta ya fue convertida en orden servicio ${propuesta.id_orden_servicio_generada}`,
      );
    }

    // PASO 4: Obtener estado PROGRAMADA para nueva orden servicio
    const estadoProgramada = await this.prisma.estados_orden.findFirst({
      where: { nombre_estado: 'PROGRAMADA' },
    });

    if (!estadoProgramada) {
      throw new BadRequestException('Estado PROGRAMADA no encontrado en estados_orden_servicio');
    }

    // PASO 5: Generar número orden servicio automático (OS-AAAA-XXXX)
    const year = new Date().getFullYear();
    const ultimaOrden = await this.prisma.ordenes_servicio.findFirst({
      where: {
        numero_orden: {
          startsWith: `OS-${year}-`,
        },
      },
      orderBy: {
        id_orden_servicio: 'desc',
      },
    });

    let consecutivo = 1;
    if (ultimaOrden) {
      const matches = ultimaOrden.numero_orden.match(/OS-\d{4}-(\d{4})/);
      if (matches) {
        consecutivo = parseInt(matches[1]) + 1;
      }
    }

    const numeroOrden = `OS-${year}-${consecutivo.toString().padStart(4, '0')}`;

    // PASO 6: Crear orden servicio + actualizar propuesta en transacción
    const result = await this.prisma.$transaction(async (prisma) => {
      // 6.1. Crear orden servicio desde propuesta
      const ordenServicio = await prisma.ordenes_servicio.create({
        data: {
          numero_orden: numeroOrden,
          id_cliente: propuesta.id_cliente,
          id_sede: propuesta.orden_servicio.id_sede,
          id_equipo: propuesta.id_equipo ?? propuesta.orden_servicio.id_equipo,
          id_estado_actual: estadoProgramada.id_estado,
          descripcion_inicial: propuesta.solucion_propuesta,
          prioridad: propuesta.prioridad || 'NORMAL',
          origen_solicitud: 'CORRECTIVO' as any,
          requiere_firma_cliente: true,
          creado_por: convertidaPor,
          fecha_creacion: new Date(),
        },
      });

      // 6.2. Actualizar propuesta marcando conversión
      const propuestaActualizada = await prisma.propuestas_correctivo.update({
        where: { id_propuesta: idPropuesta },
        data: {
          id_orden_servicio_generada: ordenServicio.id_orden_servicio,
          fecha_conversion_os: new Date(),
        },
      });

      return { ordenServicio, propuesta: propuestaActualizada };
    });

    return {
      message: 'Propuesta convertida en orden servicio exitosamente',
      orden_servicio: {
        id_orden_servicio: result.ordenServicio.id_orden_servicio,
        numero_orden: result.ordenServicio.numero_orden,
        estado: 'PROGRAMADA',
        cliente: propuesta.cliente.persona.razon_social || propuesta.cliente.persona.nombre_completo,
        equipo: propuesta.equipo?.nombre_equipo,
      },
      propuesta: {
        id_propuesta: result.propuesta.id_propuesta,
        numero_propuesta: result.propuesta.numero_propuesta,
        categoria: result.propuesta.categoria,
        fecha_conversion: result.propuesta.fecha_conversion_os,
      },
    };
  }
}
