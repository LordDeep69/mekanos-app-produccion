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
      urgenciaPropuesta,
      prioridad,
      creadaPor,
    } = command;

    // PASO 1: Validar orden servicio existe y obtener datos relacionados
    const ordenServicio = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: idOrdenServicio },
      include: {
        clientes: {
          include: {
            persona: true,
          },
        },
        sedes_cliente: true,
        equipos: true,
        estados_orden: true,
      },
    });

    if (!ordenServicio) {
      throw new NotFoundException(`Orden servicio ${idOrdenServicio} no encontrada`);
    }

    // Validar orden servicio está EN_PROCESO (técnico puede generar propuestas durante ejecución)
    const codigoEstadoOrden = (ordenServicio.estados_orden.codigo_estado || '').toUpperCase();
    const nombreEstadoOrdenNorm = (ordenServicio.estados_orden.nombre_estado || '')
      .toUpperCase()
      .replace(/\s+/g, '_');
    if (codigoEstadoOrden !== 'EN_PROCESO' && nombreEstadoOrdenNorm !== 'EN_PROCESO') {
      throw new BadRequestException(
        `Solo se pueden generar propuestas desde órdenes EN_PROCESO. Estado actual: ${ordenServicio.estados_orden.nombre_estado}`,
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

    // PASO 3: Obtener estado BORRADOR para propuesta (compatible con codigo_estado y nombre_estado)
    const estadoBorrador = await this.prisma.estados_cotizacion.findFirst({
      where: {
        OR: [
          { codigo_estado: 'BORRADOR' },
          { nombre_estado: { equals: 'BORRADOR', mode: 'insensitive' } },
        ],
      },
    });

    const idEstadoBorrador = estadoBorrador?.id_estado ?? 1;

    // Normalizar enums PostgreSQL estrictos (categoria_propuesta_enum y prioridad_enum)
    const mapCategoria = (
      raw?: string,
    ): 'CORRECTIVO' | 'PREVENTIVO_URGENTE' | 'MEJORA' | 'EXTENSION_GARANTIA' => {
      const upper = String(raw || 'CORRECTIVO').toUpperCase();
      if (
        upper === 'CORRECTIVO' ||
        upper === 'PREVENTIVO_URGENTE' ||
        upper === 'MEJORA' ||
        upper === 'EXTENSION_GARANTIA'
      ) {
        return upper;
      }
      if (upper === 'PREDICTIVO') return 'PREVENTIVO_URGENTE';
      return 'CORRECTIVO';
    };

    const mapPrioridad = (
      rawPrio: number | string | undefined,
      rawUrg?: string,
    ): 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA' => {
      const prioStr = String(rawPrio ?? '').toUpperCase();
      if (
        prioStr === 'NORMAL' ||
        prioStr === 'ALTA' ||
        prioStr === 'URGENTE' ||
        prioStr === 'EMERGENCIA'
      ) {
        return prioStr;
      }
      const num = Number(rawPrio);
      if (Number.isFinite(num) && num > 0) {
        if (num >= 5) return 'EMERGENCIA';
        if (num === 4) return 'URGENTE';
        if (num === 3) return 'ALTA';
        return 'NORMAL';
      }
      const urg = String(rawUrg || '').toUpperCase();
      if (urg === 'CRITICA') return 'EMERGENCIA';
      if (urg === 'ALTA') return 'URGENTE';
      if (urg === 'MEDIA') return 'ALTA';
      return 'NORMAL';
    };

    const categoriaNormalizada = mapCategoria(tipoPropuesta);
    const prioridadNormalizada = mapPrioridad(prioridad, urgenciaPropuesta);

    // PASO 4: Crear propuesta correctivo
    const propuesta = await this.prisma.propuestas_correctivo.create({
      data: {
        numero_propuesta: numeroPropuesta,
        id_orden_servicio: idOrdenServicio,
        id_cliente: ordenServicio.id_cliente,
        id_equipo: ordenServicio.id_equipo,
        descripcion_problema: descripcionHallazgo,
        solucion_propuesta: descripcionSolucion,
        categoria: categoriaNormalizada,
        prioridad: prioridadNormalizada,
        id_estado: idEstadoBorrador,
        fecha_propuesta: new Date(),
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        subtotal_servicios: 0, // Técnico completa después
        subtotal_componentes: 0,
        total_propuesta: 0,
        metadata: {
          tipo_propuesta_original: tipoPropuesta,
          urgencia_propuesta: urgenciaPropuesta,
          prioridad_numerica: typeof prioridad === 'number' ? prioridad : null,
          tiempo_estimado_ejecucion: command.tiempoEstimadoEjecucion ?? null,
        },
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
        razon_social:
          ordenServicio.clientes.persona.razon_social ||
          `${ordenServicio.clientes.persona.primer_nombre} ${ordenServicio.clientes.persona.primer_apellido}`,
      },
    };
  }
}
