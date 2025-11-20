/**
 * GetMedicionesByOrdenQuery - Query para obtener mediciones por orden
 * FASE 4.2 - Lista con ordenamiento por fecha DESC
 */

export class GetMedicionesByOrdenQuery {
  constructor(public readonly id_orden_servicio: number) {}
}
