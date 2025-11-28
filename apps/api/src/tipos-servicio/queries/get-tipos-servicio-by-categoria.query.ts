/**
 * Query: Obtener tipos de servicio por categoría
 * 
 * Filtra tipos de servicio por categoría_servicio_enum
 */
export class GetTiposServicioByCategoriaQuery {
  constructor(
    public readonly categoria: string,
    public readonly soloActivos: boolean = true,
  ) {}
}
