/**
 * Query: Obtener listado de tipos de servicio con filtros
 * 
 * Soporta paginación y múltiples filtros
 */
export class GetTiposServicioQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 50,
    public readonly search?: string,
    public readonly categoria?: string,
    public readonly tipoEquipoId?: number,
    public readonly activo: boolean = true,
  ) {}
}
