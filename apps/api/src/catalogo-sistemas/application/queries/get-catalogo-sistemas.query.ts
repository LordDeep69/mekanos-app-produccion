import { IQuery } from '@nestjs/cqrs';

export class GetCatalogoSistemasQuery implements IQuery {
  constructor(
    public readonly activo?: boolean,
    public readonly aplica_a?: string,
    public readonly orden_min?: number,
    public readonly orden_max?: number,
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
