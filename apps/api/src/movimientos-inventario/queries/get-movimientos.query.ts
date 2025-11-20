export class GetMovimientosQuery {
  constructor(
    public readonly filters?: {
      id_componente?: number;
      tipo_movimiento?: string;
      fecha_desde?: Date;
      fecha_hasta?: Date;
      id_orden_servicio?: number;
      id_orden_compra?: number;
      skip?: number;
      take?: number;
    },
  ) {}
}
