/**
 * Query: Obtener tipo de servicio por ID
 * 
 * Retorna un tipo de servicio específico con relaciones completas
 */
export class GetTiposServicioByIdQuery {
  constructor(public readonly id: number) {}
}
