import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CatalogoActividadesRepository } from '../../domain/catalogo-actividades.repository.interface';
import { CatalogoActividadesMapper } from '../../infrastructure/catalogo-actividades.mapper';
import { EliminarCatalogoActividadesCommand } from '../commands/eliminar-catalogo-actividades.command';
import { CatalogoActividadesResponseDto } from '../dto/catalogo-actividades-response.dto';

@CommandHandler(EliminarCatalogoActividadesCommand)
export class EliminarCatalogoActividadesHandler implements ICommandHandler<EliminarCatalogoActividadesCommand> {
  constructor(
    @Inject('CatalogoActividadesRepository')
    private readonly repository: CatalogoActividadesRepository,
  ) {}

  async execute(command: EliminarCatalogoActividadesCommand): Promise<CatalogoActividadesResponseDto> {
    const existing = await this.repository.findById(command.id);
    if (!existing) {
      throw new NotFoundException(`Actividad con ID ${command.id} no encontrada`);
    }

    const entity = await this.repository.softDelete(command.id, command.modificadoPor);
    return CatalogoActividadesMapper.toCamelCase(entity);
  }
}
