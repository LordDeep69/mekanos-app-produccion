import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ITiposEquipoRepository } from '../../domain/tipos-equipo.repository.interface';
import { TIPOS_EQUIPO_REPOSITORY } from '../../tipos-equipo.constants';
import { CrearTipoEquipoCommand } from './crear-tipo-equipo.command';

@CommandHandler(CrearTipoEquipoCommand)
export class CrearTipoEquipoHandler
  implements ICommandHandler<CrearTipoEquipoCommand>
{
  constructor(
    @Inject(TIPOS_EQUIPO_REPOSITORY)
    private readonly repository: ITiposEquipoRepository,
  ) {}

  async execute(command: CrearTipoEquipoCommand) {
    return this.repository.crear({
      codigo_tipo: command.codigo_tipo,
      nombre_tipo: command.nombre_tipo,
      categoria: command.categoria,
      formato_ficha_tecnica: command.formato_ficha_tecnica,
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
      formato_mantenimiento_tipo_a: command.formato_mantenimiento_tipo_a,
      formato_mantenimiento_tipo_b: command.formato_mantenimiento_tipo_b,
      orden: command.orden,
      metadata: command.metadata,
      creado_por: command.creado_por,
    });
  }
}
