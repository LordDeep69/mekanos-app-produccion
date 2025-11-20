import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EQUIPOS_GENERADOR_REPOSITORY_TOKEN } from '../../constants';
import {
    IEquiposGeneradorRepository
} from '../../domain/equipos-generador.repository';

export class ActualizarEquipoGeneradorCommand {
  constructor(
    public readonly id_equipo: number,
    public readonly marca_generador?: string,
    public readonly modelo_generador?: string,
    public readonly numero_serie_generador?: string,
    public readonly marca_alternador?: string,
    public readonly modelo_alternador?: string,
    public readonly numero_serie_alternador?: string,
    public readonly potencia_kw?: number,
    public readonly potencia_kva?: number,
    public readonly factor_potencia?: number,
    public readonly voltaje_salida?: string,
    public readonly numero_fases?: number,
    public readonly frecuencia_hz?: number,
    public readonly amperaje_nominal_salida?: number,
    public readonly tiene_avr?: boolean,
    public readonly marca_avr?: string,
    public readonly modelo_avr?: string,
    public readonly referencia_avr?: string,
    public readonly tiene_modulo_control?: boolean,
    public readonly marca_modulo_control?: string,
    public readonly modelo_modulo_control?: string,
    public readonly tiene_arranque_automatico?: boolean,
    public readonly capacidad_tanque_principal_litros?: number,
    public readonly tiene_tanque_auxiliar?: boolean,
    public readonly capacidad_tanque_auxiliar_litros?: number,
    public readonly clase_aislamiento?: string,
    public readonly grado_proteccion_ip?: string,
    public readonly año_fabricacion?: number,
    public readonly observaciones?: string,
    public readonly metadata?: Record<string, any>,
    public readonly modificado_por?: number,
  ) {}
}

@CommandHandler(ActualizarEquipoGeneradorCommand)
export class ActualizarEquipoGeneradorHandler implements ICommandHandler<ActualizarEquipoGeneradorCommand> {
  constructor(
    @Inject(EQUIPOS_GENERADOR_REPOSITORY_TOKEN)
    private readonly repository: IEquiposGeneradorRepository,
  ) {}

  async execute(command: ActualizarEquipoGeneradorCommand) {
    const { id_equipo, ...dataFields } = command;
    return this.repository.actualizar(id_equipo, dataFields as any);
  }
}
