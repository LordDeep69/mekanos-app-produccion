/**
 * GetPropuestasPendientesQuery
 * FASE 4.9: Listar propuestas pendientes aprobación
 */
export class GetPropuestasPendientesQuery {
  constructor(
    public readonly tipoPropuesta?: string, // Filtro opcional: CORRECTIVO | MEJORA | REEMPLAZO
    public readonly urgencia?: string, // Filtro opcional: BAJA | MEDIA | ALTA | CRITICA
    public readonly skip?: number,
    public readonly take?: number,
    public readonly estadoVista?: string, // PENDIENTES | ESCALADAS | CONVERTIDAS | TODAS
  ) {}
}
