import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResponseActividadDto } from '../../dto/response-actividad.dto';
import { PrismaActividadesRepository } from '../../infrastructure/prisma-actividades.repository';
import { ActividadMapper } from '../mappers/actividad.mapper';
import { UpdateActividadCommand } from './update-actividad.command';

@CommandHandler(UpdateActividadCommand)
export class UpdateActividadHandler implements ICommandHandler<UpdateActividadCommand> {
  constructor(
    private readonly repository: PrismaActividadesRepository,
    private readonly mapper: ActividadMapper,
  ) {}

  async execute(command: UpdateActividadCommand): Promise<ResponseActividadDto> {
    // Validar existencia
    const existe = await this.repository.findById(command.id);
    if (!existe) {
      throw new NotFoundException(`Actividad ${command.id} no encontrada`);
    }

    // VALIDACIÓN: ordenSecuencia > 0
    if (command.ordenSecuencia !== undefined && command.ordenSecuencia !== null && command.ordenSecuencia <= 0) {
      throw new BadRequestException('ordenSecuencia debe ser mayor a 0');
    }

    // VALIDACIÓN: tiempoEjecucionMinutos > 0
    if (command.tiempoEjecucionMinutos !== undefined && command.tiempoEjecucionMinutos !== null && command.tiempoEjecucionMinutos <= 0) {
      throw new BadRequestException('tiempoEjecucionMinutos debe ser mayor a 0');
    }

    const entity = await this.repository.update(command.id, command);
    return this.mapper.toDto(entity);
  }
}

