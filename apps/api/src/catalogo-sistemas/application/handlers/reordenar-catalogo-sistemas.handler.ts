import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { ReordenarCatalogoSistemasCommand } from '../commands/reordenar-catalogo-sistemas.command';

@CommandHandler(ReordenarCatalogoSistemasCommand)
export class ReordenarCatalogoSistemasHandler implements ICommandHandler<ReordenarCatalogoSistemasCommand> {
  constructor(
    @Inject('ICatalogoSistemasRepository')
    private readonly repository: ICatalogoSistemasRepository,
  ) {}

  async execute(command: ReordenarCatalogoSistemasCommand): Promise<{ success: boolean; reordenados: number }> {
    if (!command.items || command.items.length === 0) {
      throw new BadRequestException('La lista de subsistemas a reordenar no puede estar vacía');
    }

    // Ejecutar reordenamiento atómico
    await this.repository.reordenar(command.items);

    return {
      success: true,
      reordenados: command.items.length,
    };
  }
}
