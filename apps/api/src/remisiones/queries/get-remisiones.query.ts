export class GetRemisionesQuery {
  constructor(
    public readonly filters?: {
      id_tecnico_receptor?: number;
      id_orden_servicio?: number;
      estado?: string;
      fecha_desde?: Date;
      fecha_hasta?: Date;
      skip?: number;
      take?: number;
    },
  ) {}
}
