import { ActualizarDetalleServiciosOrdenDto } from '../dto/actualizar-detalle-servicios-orden.dto';

export class ActualizarDetalleServiciosOrdenCommand {
  constructor(
    public readonly id: number,
    public readonly dto: ActualizarDetalleServiciosOrdenDto,
    public readonly userId: number,
  ) {}
}
