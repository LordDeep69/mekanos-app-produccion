export class RegistrarTrasladoCommand {
  constructor(
    public readonly id_componente: number,
    public readonly cantidad: number,
    public readonly id_ubicacion_origen: number,
    public readonly id_ubicacion_destino: number,
    public readonly userId: number,
    public readonly observaciones?: string,
  ) {}
}
