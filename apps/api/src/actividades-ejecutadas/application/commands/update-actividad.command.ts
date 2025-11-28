import { EstadoActividadEnum } from '../enums/estado-actividad.enum';

export class UpdateActividadCommand {
  constructor(
    public readonly id: number,
    public readonly idOrdenServicio?: number,
    public readonly idActividadCatalogo?: number,
    public readonly descripcionManual?: string,
    public readonly sistema?: string,
    public readonly ordenSecuencia?: number,
    public readonly estado?: EstadoActividadEnum,
    public readonly observaciones?: string,
    public readonly ejecutada?: boolean,
    public readonly ejecutadaPor?: number,
    public readonly tiempoEjecucionMinutos?: number,
    public readonly requiereEvidencia?: boolean,
    public readonly evidenciaCapturada?: boolean,
  ) {}
}

