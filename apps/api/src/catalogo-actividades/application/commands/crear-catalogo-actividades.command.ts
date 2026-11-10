import { CrearCatalogoActividadesDto } from '../dto/crear-catalogo-actividades.dto';

export class CrearCatalogoActividadesCommand {
  constructor(
    public readonly codigoActividad: string | undefined,
    public readonly descripcionActividad: string,
    public readonly idTipoServicio: number | null | undefined,
    public readonly tipoActividad: string,
    public readonly ordenEjecucion: number | undefined,
    public readonly creadoPor: number,
    public readonly idSistema?: number | null,
    public readonly idTipoEquipo?: number | null,
    public readonly idPlantillaOrigen?: number | null,
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

  static fromDto(dto: CrearCatalogoActividadesDto, userId = 1): CrearCatalogoActividadesCommand {
    return new CrearCatalogoActividadesCommand(
      dto.codigoActividad,
      dto.descripcionActividad,
      dto.idTipoServicio,
      dto.tipoActividad,
      dto.ordenEjecucion,
      dto.creadoPor ?? userId,
      dto.idSistema,
      dto.idTipoEquipo,
      dto.idPlantillaOrigen,
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
