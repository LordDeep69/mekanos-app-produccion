import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../database/prisma.service';
import { HistorialEstadosOrdenRepositoryInterface } from '../../domain/historial-estados-orden.repository.interface';
import { CrearHistorialEstadosOrdenCommand } from '../commands/crear-historial-estados-orden.command';

@CommandHandler(CrearHistorialEstadosOrdenCommand)
export class CrearHistorialEstadosOrdenHandler
  implements ICommandHandler<CrearHistorialEstadosOrdenCommand>
{
  constructor(
    @Inject('HistorialEstadosOrdenRepositoryInterface')
    private readonly repository: HistorialEstadosOrdenRepositoryInterface,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: CrearHistorialEstadosOrdenCommand): Promise<any> {
    // Validación 1: idOrdenServicio existe (REQUIRED)
    const ordenExists = await this.prisma.ordenes_servicio.findUnique({
      where: { id_orden_servicio: command.idOrdenServicio },
    });
    if (!ordenExists) {
      throw new NotFoundException(
        `La orden de servicio con ID ${command.idOrdenServicio} no existe`,
      );
    }

    // Validación 2: idEstadoAnterior existe (OPTIONAL)
    if (command.idEstadoAnterior !== undefined) {
      const estadoAnteriorExists = await this.prisma.estados_orden.findUnique({
        where: { id_estado: command.idEstadoAnterior },
      });
      if (!estadoAnteriorExists) {
        throw new NotFoundException(
          `El estado anterior con ID ${command.idEstadoAnterior} no existe`,
        );
      }
    }

    // Validación 3: idEstadoNuevo existe (REQUIRED)
    const estadoNuevoExists = await this.prisma.estados_orden.findUnique({
      where: { id_estado: command.idEstadoNuevo },
    });
    if (!estadoNuevoExists) {
      throw new NotFoundException(
        `El estado nuevo con ID ${command.idEstadoNuevo} no existe`,
      );
    }

    // Validación 4: realizadoPor existe (REQUIRED)
    const usuarioExists = await this.prisma.usuarios.findUnique({
      where: { id_usuario: command.realizadoPor },
    });
    if (!usuarioExists) {
      throw new NotFoundException(
        `El usuario con ID ${command.realizadoPor} no existe`,
      );
    }

    // Validación 5: CHECK duracion >= 0
    if (
      command.duracionEstadoAnteriorMinutos !== undefined &&
      command.duracionEstadoAnteriorMinutos < 0
    ) {
      throw new BadRequestException(
        'duracionEstadoAnteriorMinutos debe ser mayor o igual a 0',
      );
    }

    // Crear historial
    return await this.repository.crear(
      command.idOrdenServicio,
      command.idEstadoAnterior,
      command.idEstadoNuevo,
      command.motivoCambio,
      command.observaciones,
      command.accion,
      command.realizadoPor,
      command.ipOrigen,
      command.userAgent,
      command.duracionEstadoAnteriorMinutos,
      command.metadata,
    );
  }
}
