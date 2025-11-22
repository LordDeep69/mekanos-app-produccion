import { IQuery } from '@nestjs/cqrs';

/**
 * Query: Listar parámetros de medición con filtros opcionales y paginación
 * Soporta filtros: activo, categoria, tipoEquipoId, esCriticoSeguridad, esObligatorio
 */
export class ListarParametrosMedicionQuery implements IQuery {
  constructor(
    public readonly activo?: boolean,
    public readonly categoria?: string,
    public readonly tipoEquipoId?: number,
    public readonly esCriticoSeguridad?: boolean,
    public readonly esObligatorio?: boolean,
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
