/**
 * Query listar evidencias por orden de servicio
 * FASE 4.3
 */

export class GetEvidenciasByOrdenQuery {
  constructor(public readonly id_orden_servicio: number) {}
}
