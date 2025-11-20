/**
 * GET COTIZACION BY ID QUERY
 */
export class GetCotizacionByIdQuery {
  constructor(
    public readonly id_cotizacion: number,
    public readonly includeRelations: {
      cliente?: boolean;
      sede?: boolean;
      equipo?: boolean;
      estado?: boolean;
      items_servicios?: boolean;
      items_componentes?: boolean;
      aprobaciones?: boolean;
      historial_envios?: boolean;
    } = {},
  ) {}
}
