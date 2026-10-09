import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  CreateRecepcionLoteData,
  IRecepcionesCompraRepository,
  ResultadoRecepcionLote,
} from '../../domain/recepciones-compra.repository';

export class RegistrarRecepcionLoteCommand {
  constructor(public readonly data: CreateRecepcionLoteData) {}
}

@CommandHandler(RegistrarRecepcionLoteCommand)
export class RegistrarRecepcionLoteHandler
  implements ICommandHandler<RegistrarRecepcionLoteCommand, ResultadoRecepcionLote>
{
  constructor(
    @Inject('IRecepcionesCompraRepository')
    private readonly repository: IRecepcionesCompraRepository,
  ) {}

  async execute(command: RegistrarRecepcionLoteCommand): Promise<ResultadoRecepcionLote> {
    return await this.repository.createLote(command.data);
  }
}
