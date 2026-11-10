import { ActualizarCatalogoActividadesDto } from '../dto/actualizar-catalogo-actividades.dto';

export class ActualizarCatalogoActividadesCommand {
  constructor(
    public readonly id: number,
    public readonly modificadoPor: number,
    public readonly codigoActividad?: string,
    public readonly descripcionActividad?: string,
    public readonly idTipoServicio?: number | null,
    public readonly idSistema?: number | null,
    public readonly idTipoEquipo?: number | null,
    public readonly tipoActividad?: string,
    public readonly ordenEjecucion?: number,
    public readonly esObligatoria?: boolean,
    public readonly tiempoEstimadoMinutos?: number | null,
    public readonly idParametroMedicion?: number | null,
    public readonly idTipoComponente?: number | null,
    public readonly instrucciones?: string | null,
    public readonly precauciones?: string | null,
    public readonly activo?: boolean,
    public readonly observaciones?: string | null,
    public readonly naturalezaPersonalizada?: string | null,
    public readonly tipoControlInput?: string,
    public readonly configInputJson?: any,
    public readonly rolSemantico?: string | null,
  ) {}

  static fromDto(
    id: number,
    dto: ActualizarCatalogoActividadesDto,
    userId = 1,
  ): ActualizarCatalogoActividadesCommand {
    return new ActualizarCatalogoActividadesCommand(
      id,
      dto.modificadoPor ?? userId,
      dto.codigoActividad,
      dto.descripcionActividad,
      dto.idTipoServicio,
      dto.idSistema,
      dto.idTipoEquipo,
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
      dto.naturalezaPersonalizada,
      dto.tipoControlInput,
      dto.configInputJson,
      dto.rolSemantico,
    );
  }
}
