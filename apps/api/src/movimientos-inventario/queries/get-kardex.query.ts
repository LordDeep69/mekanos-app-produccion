export class GetKardexQuery {
  constructor(
    public readonly id_componente: number,
    public readonly filters?: {
      fecha_desde?: Date;
      fecha_hasta?: Date;
      tipo_movimiento?: string;
    },
  ) {}
}
