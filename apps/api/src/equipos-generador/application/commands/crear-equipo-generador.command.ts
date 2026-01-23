import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EQUIPOS_GENERADOR_REPOSITORY_TOKEN } from '../../constants';
import { IEquiposGeneradorRepository } from '../../domain/equipos-generador.repository';

export class CrearEquipoGeneradorCommand {
  constructor(
    public readonly id_equipo: number,
    public readonly marca_generador: string,
    public readonly voltaje_salida: string,
    public readonly creado_por: number,
    public readonly modelo_generador?: string,
    public readonly numero_serie_generador?: string,
    public readonly marca_alternador?: string,
    public readonly modelo_alternador?: string,
    public readonly numero_serie_alternador?: string,
    public readonly potencia_kw?: number,
    public readonly potencia_kva?: number,
    public readonly factor_potencia?: number,
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
    public readonly a_o_fabricacion?: number,
    public readonly observaciones?: string,
    public readonly metadata?: Record<string, any>,
  ) { }
}

@CommandHandler(CrearEquipoGeneradorCommand)
export class CrearEquipoGeneradorHandler implements ICommandHandler<CrearEquipoGeneradorCommand> {
  constructor(
    @Inject(EQUIPOS_GENERADOR_REPOSITORY_TOKEN)
    private readonly repository: IEquiposGeneradorRepository,
  ) { }

  async execute(command: CrearEquipoGeneradorCommand) {
    return this.repository.crear({
      id_equipo: command.id_equipo,
      marca_generador: command.marca_generador,
      voltaje_salida: command.voltaje_salida,
      modelo_generador: command.modelo_generador,
      numero_serie_generador: command.numero_serie_generador,
      marca_alternador: command.marca_alternador,
      modelo_alternador: command.modelo_alternador,
      numero_serie_alternador: command.numero_serie_alternador,
      potencia_kw: command.potencia_kw,
      potencia_kva: command.potencia_kva,
      factor_potencia: command.factor_potencia,
      numero_fases: command.numero_fases,
      frecuencia_hz: command.frecuencia_hz,
      amperaje_nominal_salida: command.amperaje_nominal_salida,
      tiene_avr: command.tiene_avr,
      marca_avr: command.marca_avr,
      modelo_avr: command.modelo_avr,
      referencia_avr: command.referencia_avr,
      tiene_modulo_control: command.tiene_modulo_control,
      marca_modulo_control: command.marca_modulo_control,
      modelo_modulo_control: command.modelo_modulo_control,
      tiene_arranque_automatico: command.tiene_arranque_automatico,
      capacidad_tanque_principal_litros: command.capacidad_tanque_principal_litros,
      tiene_tanque_auxiliar: command.tiene_tanque_auxiliar,
      capacidad_tanque_auxiliar_litros: command.capacidad_tanque_auxiliar_litros,
      clase_aislamiento: command.clase_aislamiento,
      grado_proteccion_ip: command.grado_proteccion_ip,
      a_o_fabricacion: command.a_o_fabricacion,
      observaciones: command.observaciones,
      metadata: command.metadata,
      creado_por: command.creado_por,
    });
  }
}
