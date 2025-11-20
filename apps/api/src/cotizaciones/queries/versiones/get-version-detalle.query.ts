/**
 * GetVersionDetalleQuery
 * FASE 4.8: Obtener detalle completo versión específica (incluye JSONB)
 */
export class GetVersionDetalleQuery {
  constructor(
    public readonly idVersion: number,
  ) {}
}
