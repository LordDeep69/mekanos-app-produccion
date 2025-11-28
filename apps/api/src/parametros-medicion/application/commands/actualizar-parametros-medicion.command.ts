import { ICommand } from '@nestjs/cqrs';

/**
 * Command: Actualizar parámetro de medición existente
 * Validaciones en handler: código único (si cambió), rangos coherentes, FK válidas
 */
export class ActualizarParametrosMedicionCommand implements ICommand {
  constructor(
    public readonly id: number,
    public readonly codigoParametro?: string,
    public readonly nombreParametro?: string,
    public readonly unidadMedida?: string,
    public readonly categoria?: string,
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
    public readonly modificadoPor?: number,
  ) {}
}
