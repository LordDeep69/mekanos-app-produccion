import { categoria_motivo_ajuste_enum } from '@prisma/client';

export class GetMotivosAjusteQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly activo?: boolean,
    public readonly categoria?: categoria_motivo_ajuste_enum,
  ) {}
}
