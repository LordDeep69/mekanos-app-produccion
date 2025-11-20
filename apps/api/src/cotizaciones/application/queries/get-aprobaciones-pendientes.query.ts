// Query - Listar Aprobaciones Pendientes

export class GetAprobacionesPendientesQuery {
  constructor(
    public readonly nivelAprobacion?: string, // SUPERVISOR, GERENTE
    public readonly skip: number = 0,
    public readonly take: number = 50,
  ) {}
}
