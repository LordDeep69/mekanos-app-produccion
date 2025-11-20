export class CrearRemisionCommand {
  constructor(
    public readonly id_orden_servicio: number | undefined,
    public readonly id_tecnico_receptor: number,
    public readonly observaciones: string | undefined,
    public readonly userId: number,
    public readonly items: Array<{
      id_componente: number;
      cantidad: number;
      id_ubicacion?: number;
      observaciones?: string;
    }>,
  ) {}
}
