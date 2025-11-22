import { IQuery } from '@nestjs/cqrs';

/**
 * Query: Buscar parámetro de medición por código
 * Normaliza código a UPPER antes de buscar
 */
export class BuscarParametroMedicionPorCodigoQuery implements IQuery {
  constructor(public readonly codigoParametro: string) {}
}
