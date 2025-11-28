import { CrearDetalleServiciosOrdenDto } from '../dto/crear-detalle-servicios-orden.dto';

export class CrearDetalleServiciosOrdenCommand {
  constructor(
    public readonly dto: CrearDetalleServiciosOrdenDto,
    public readonly userId: number,
  ) {}
}
