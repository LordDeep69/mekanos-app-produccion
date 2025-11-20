import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ITiposEquipoRepository } from '../../domain/tipos-equipo.repository.interface';
import { TIPOS_EQUIPO_REPOSITORY } from '../../tipos-equipo.constants';
import { ActualizarTipoEquipoCommand } from './actualizar-tipo-equipo.command';

@CommandHandler(ActualizarTipoEquipoCommand)
export class ActualizarTipoEquipoHandler
  implements ICommandHandler<ActualizarTipoEquipoCommand>
{
  constructor(
    @Inject(TIPOS_EQUIPO_REPOSITORY)
    private readonly repository: ITiposEquipoRepository,
  ) {}

  async execute(command: ActualizarTipoEquipoCommand) {
    return this.repository.actualizar(command.id, {
      nombre_tipo: command.nombre_tipo,
      descripcion: command.descripcion,
      tiene_motor: command.tiene_motor,
      tiene_generador: command.tiene_generador,
      tiene_bomba: command.tiene_bomba,
      requiere_horometro: command.requiere_horometro,
      permite_mantenimiento_tipo_a: command.permite_mantenimiento_tipo_a,
      permite_mantenimiento_tipo_b: command.permite_mantenimiento_tipo_b,
      intervalo_tipo_a_dias: command.intervalo_tipo_a_dias,
      intervalo_tipo_a_horas: command.intervalo_tipo_a_horas,
      intervalo_tipo_b_dias: command.intervalo_tipo_b_dias,
      intervalo_tipo_b_horas: command.intervalo_tipo_b_horas,
      criterio_intervalo: command.criterio_intervalo,
      formato_ficha_tecnica: command.formato_ficha_tecnica,
      formato_mantenimiento_tipo_a: command.formato_mantenimiento_tipo_a,
      formato_mantenimiento_tipo_b: command.formato_mantenimiento_tipo_b,
      orden: command.orden,
      metadata: command.metadata,
      disponible: command.disponible,
      modificado_por: command.modificado_por,
    });
  }
}
