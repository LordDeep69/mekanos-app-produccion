/**
 * Command: Eliminar (soft delete) tipo de servicio
 * 
 * Marca el tipo de servicio como inactivo sin eliminarlo físicamente
 * Preserva integridad referencial y auditoría
 */
export class DeleteTiposServicioCommand {
  constructor(public readonly id: number) {}
}
