/**
 * Query: GetOrdenesQuery
 * Obtiene lista paginada de órdenes con filtros y ordenamiento
 * 
 * ENTERPRISE: Soporta sortBy y sortOrder para ordenamiento flexible
 */
export class GetOrdenesQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly clienteId?: number,
    public readonly equipoId?: number,
    public readonly tecnicoId?: number,
    public readonly estado?: string,
    public readonly prioridad?: string,
    public readonly sortBy: string = 'fecha_creacion', // Campo por el cual ordenar
    public readonly sortOrder: 'asc' | 'desc' = 'desc', // Dirección del ordenamiento
    public readonly tipoServicioId?: number, // Filtro por tipo de servicio
    public readonly fechaDesde?: string, // Filtro fecha desde (ISO string)
    public readonly fechaHasta?: string, // Filtro fecha hasta (ISO string)
  ) { }
}
