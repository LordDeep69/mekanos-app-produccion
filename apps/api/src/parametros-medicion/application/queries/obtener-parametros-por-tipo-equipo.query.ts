import { IQuery } from '@nestjs/cqrs';

/**
 * Query: Obtener parámetros de medición por tipo de equipo
 * Retorna solo activos ordenados por obligatoriedad
 */
export class ObtenerParametrosPorTipoEquipoQuery implements IQuery {
  constructor(public readonly tipoEquipoId: number) {}
}
