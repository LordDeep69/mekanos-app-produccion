import { CrearCatalogoActividadesDto } from '../dto/crear-catalogo-actividades.dto';

export class CrearCatalogoActividadesCommand {
  constructor(
    public readonly codigoActividad: string,
    public readonly descripcionActividad: string,
    public readonly idTipoServicio: number,
    public readonly tipoActividad: string,
    public readonly ordenEjecucion: number,
    public readonly creadoPor: number,
    public readonly idSistema?: number,
    public readonly esObligatoria?: boolean,
    public readonly tiempoEstimadoMinutos?: number,
    public readonly idParametroMedicion?: number,
    public readonly idTipoComponente?: number,
    public readonly instrucciones?: string,
    public readonly precauciones?: string,
    public readonly activo?: boolean,
    public readonly observaciones?: string,
  ) {}

  static fromDto(dto: CrearCatalogoActividadesDto): CrearCatalogoActividadesCommand {
    return new CrearCatalogoActividadesCommand(
      dto.codigoActividad,
      dto.descripcionActividad,
      dto.idTipoServicio,
      dto.tipoActividad,
      dto.ordenEjecucion,
      dto.creadoPor,
      dto.idSistema,
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
