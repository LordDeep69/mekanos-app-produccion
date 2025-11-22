import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { CatalogoSistemasMapper } from '../../infrastructure/catalogo-sistemas.mapper';
import { EliminarCatalogoSistemasCommand } from '../commands/eliminar-catalogo-sistemas.command';
import { CatalogoSistemasResponseDto } from '../dto/catalogo-sistemas-response.dto';

@CommandHandler(EliminarCatalogoSistemasCommand)
export class EliminarCatalogoSistemasHandler implements ICommandHandler<EliminarCatalogoSistemasCommand> {
  constructor(
    @Inject('ICatalogoSistemasRepository')
    private readonly repository: ICatalogoSistemasRepository,
    private readonly mapper: CatalogoSistemasMapper,
  ) {}

  async execute(command: EliminarCatalogoSistemasCommand): Promise<CatalogoSistemasResponseDto> {
    // 1. Verificar que el sistema existe
    const existe = await this.repository.findById(command.idSistema);
    if (!existe) {
      throw new NotFoundException(`Sistema con ID ${command.idSistema} no encontrado`);
    }

    // 2. Soft delete: marcar como inactivo
    const deleted = await this.repository.softDelete(command.idSistema);

    // 3. Retornar DTO en camelCase
    return this.mapper.toCamelCase(deleted);
  }
}
