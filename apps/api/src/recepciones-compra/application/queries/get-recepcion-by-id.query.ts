import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IRecepcionesCompraRepository } from '../../domain/recepciones-compra.repository';

export class GetRecepcionByIdQuery {
  constructor(public readonly id: number) {}
}

@QueryHandler(GetRecepcionByIdQuery)
export class GetRecepcionByIdHandler implements IQueryHandler<GetRecepcionByIdQuery> {
  constructor(
    @Inject('IRecepcionesCompraRepository')
    private readonly repository: IRecepcionesCompraRepository,
  ) {}

  async execute(query: GetRecepcionByIdQuery) {
    const recepcion = await this.repository.findById(query.id);
    if (!recepcion) {
      throw new NotFoundException(`Recepción con ID ${query.id} no encontrada`);
    }
    return recepcion;
  }
}
