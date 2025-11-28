import { IQuery } from '@nestjs/cqrs';

/**
 * Query: Obtener parámetro de medición por ID
 * Retorna parámetro con todas sus relaciones
 */
export class ObtenerParametroMedicionPorIdQuery implements IQuery {
  constructor(public readonly id: number) {}
}
