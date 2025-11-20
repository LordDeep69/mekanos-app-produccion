import { IQuery } from '@nestjs/cqrs';

export class GetCatalogoSistemaByIdQuery implements IQuery {
  constructor(public readonly id_sistema: number) {}
}
