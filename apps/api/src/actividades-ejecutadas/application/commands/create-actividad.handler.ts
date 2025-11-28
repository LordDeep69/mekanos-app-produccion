import { BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ResponseActividadDto } from '../../dto/response-actividad.dto';
import { PrismaActividadesRepository } from '../../infrastructure/prisma-actividades.repository';
import { ActividadMapper } from '../mappers/actividad.mapper';
import { CreateActividadCommand } from './create-actividad.command';

@CommandHandler(CreateActividadCommand)
export class CreateActividadHandler implements ICommandHandler<CreateActividadCommand> {
  constructor(
    private readonly repository: PrismaActividadesRepository,
    private readonly mapper: ActividadMapper,
  ) {}

  async execute(command: CreateActividadCommand): Promise<ResponseActividadDto> {
    // VALIDACIÓN 1: Modo dual XOR
    const hasCatalogo = command.idActividadCatalogo !== undefined && command.idActividadCatalogo !== null;
    const hasManual = command.descripcionManual !== undefined && command.descripcionManual !== null && command.descripcionManual.trim() !== '';
    
    if (hasCatalogo && hasManual) {
      throw new BadRequestException(
        'No se puede usar idActividadCatalogo y descripcionManual simultáneamente (modo dual XOR)'
      );
    }
    
    if (!hasCatalogo && !hasManual) {
      throw new BadRequestException(
        'Debe proporcionar idActividadCatalogo O descripcionManual (modo dual requerido)'
      );
    }

    // VALIDACIÓN 2: Modo manual requiere sistema
    if (hasManual && (!command.sistema || command.sistema.trim() === '')) {
      throw new BadRequestException(
        'El campo sistema es requerido cuando se usa descripcionManual (modo manual)'
      );
    }

    // VALIDACIÓN 3: ordenSecuencia > 0
    if (command.ordenSecuencia !== undefined && command.ordenSecuencia !== null && command.ordenSecuencia <= 0) {
      throw new BadRequestException('ordenSecuencia debe ser mayor a 0');
    }

    // VALIDACIÓN 4: tiempoEjecucionMinutos > 0
    if (command.tiempoEjecucionMinutos !== undefined && command.tiempoEjecucionMinutos !== null && command.tiempoEjecucionMinutos <= 0) {
      throw new BadRequestException('tiempoEjecucionMinutos debe ser mayor a 0');
    }

    const entity = await this.repository.create(command);
    return this.mapper.toDto(entity);
  }
}

