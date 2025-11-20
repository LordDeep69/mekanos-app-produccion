import { ICommand } from '@nestjs/cqrs';

export class ActualizarCatalogoSistemaCommand implements ICommand {
  constructor(
    public readonly id_sistema: number,
    public readonly codigo_sistema?: string,
    public readonly nombre_sistema?: string,
    public readonly aplica_a?: string[],
    public readonly orden_visualizacion?: number,
    public readonly descripcion?: string,
    public readonly icono?: string,
    public readonly color_hex?: string,
    public readonly observaciones?: string,
  ) {}
}
