/**
 * Query listar evidencias por orden de servicio
 * FASE 3 - Tabla 11 - camelCase
 */

export class GetEvidenciasByOrdenQuery {
  constructor(public readonly ordenId: number) {}
}
