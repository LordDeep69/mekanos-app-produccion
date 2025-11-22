import { ActualizarCatalogoActividadesDto } from '../dto/actualizar-catalogo-actividades.dto';

export class ActualizarCatalogoActividadesCommand {
  constructor(
    public readonly id: number,
    public readonly modificadoPor: number,
    public readonly descripcionActividad?: string,
    public readonly idSistema?: number,
    public readonly tipoActividad?: string,
    public readonly ordenEjecucion?: number,
    public readonly esObligatoria?: boolean,
    public readonly tiempoEstimadoMinutos?: number,
    public readonly idParametroMedicion?: number,
    public readonly idTipoComponente?: number,
    public readonly instrucciones?: string,
    public readonly precauciones?: string,
    public readonly activo?: boolean,
    public readonly observaciones?: string,
  ) {}

  static fromDto(id: number, dto: ActualizarCatalogoActividadesDto): ActualizarCatalogoActividadesCommand {
    return new ActualizarCatalogoActividadesCommand(
      id,
      dto.modificadoPor,
      dto.descripcionActividad,
      dto.idSistema,
      dto.tipoActividad,
      dto.ordenEjecucion,
      dto.esObligatoria,
      dto.tiempoEstimadoMinutos,
      dto.idParametroMedicion,
      dto.idTipoComponente,
      dto.instrucciones,
      dto.precauciones,
      dto.activo,
      dto.observaciones,
    );
  }
}
