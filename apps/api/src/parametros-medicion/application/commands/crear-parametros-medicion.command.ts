import { ICommand } from '@nestjs/cqrs';

/**
 * Command: Crear nuevo parámetro de medición
 * Validaciones en handler: código único, rangos coherentes, crítico seguridad requiere rangos
 */
export class CrearParametrosMedicionCommand implements ICommand {
  constructor(
    public readonly codigoParametro: string,
    public readonly nombreParametro: string,
    public readonly unidadMedida: string,
    public readonly categoria: string,
    public readonly descripcion?: string,
    public readonly tipoDato?: string,
    public readonly valorMinimoNormal?: number,
    public readonly valorMaximoNormal?: number,
    public readonly valorMinimoCritico?: number,
    public readonly valorMaximoCritico?: number,
    public readonly valorIdeal?: number,
    public readonly tipoEquipoId?: number,
    public readonly esCriticoSeguridad?: boolean,
    public readonly esObligatorio?: boolean,
    public readonly decimalesPrecision?: number,
    public readonly activo?: boolean,
    public readonly observaciones?: string,
    public readonly creadoPor?: number,
  ) {}
}
