import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CatalogoActividadesRepository } from '../../domain/catalogo-actividades.repository.interface';
import { CatalogoActividadesMapper } from '../../infrastructure/catalogo-actividades.mapper';
import { ActualizarCatalogoActividadesCommand } from '../commands/actualizar-catalogo-actividades.command';
import { CatalogoActividadesResponseDto } from '../dto/catalogo-actividades-response.dto';

@CommandHandler(ActualizarCatalogoActividadesCommand)
export class ActualizarCatalogoActividadesHandler implements ICommandHandler<ActualizarCatalogoActividadesCommand> {
  constructor(
    @Inject('CatalogoActividadesRepository')
    private readonly repository: CatalogoActividadesRepository,
  ) {}

  async execute(command: ActualizarCatalogoActividadesCommand): Promise<CatalogoActividadesResponseDto> {
    const existing = await this.repository.findById(command.id);
    if (!existing) {
      throw new NotFoundException(`Actividad con ID ${command.id} no encontrada`);
    }

    if (command.idTipoServicio != null) {
      const tsExists = await this.repository.existsTipoServicio(command.idTipoServicio);
      if (!tsExists) {
        throw new NotFoundException(`Tipo de servicio con ID ${command.idTipoServicio} no existe`);
      }
    }

    if (command.idTipoEquipo != null) {
      const teExists = await this.repository.existsTipoEquipo(command.idTipoEquipo);
      if (!teExists) {
        throw new NotFoundException(`Tipo de equipo con ID ${command.idTipoEquipo} no existe`);
      }
    }

    if (command.idSistema != null) {
      const sistemaExists = await this.repository.existsSistema(command.idSistema);
      if (!sistemaExists) {
        throw new NotFoundException(`Sistema con ID ${command.idSistema} no existe`);
      }
    }

    if (command.idParametroMedicion != null) {
      const parametroExists = await this.repository.existsParametroMedicion(command.idParametroMedicion);
      if (!parametroExists) {
        throw new NotFoundException(`Parámetro de medición con ID ${command.idParametroMedicion} no existe`);
      }
    }

    if (command.idTipoComponente != null) {
      const componenteExists = await this.repository.existsTipoComponente(command.idTipoComponente);
      if (!componenteExists) {
        throw new NotFoundException(`Tipo de componente con ID ${command.idTipoComponente} no existe`);
      }
    }

    if (command.ordenEjecucion != null && command.ordenEjecucion <= 0) {
      throw new BadRequestException('El orden de ejecución debe ser mayor a 0');
    }

    if (command.tiempoEstimadoMinutos != null && command.tiempoEstimadoMinutos <= 0) {
      throw new BadRequestException('El tiempo estimado debe ser mayor a 0');
    }

    const data = CatalogoActividadesMapper.toSnakeCase({
      codigoActividad: command.codigoActividad,
      descripcionActividad: command.descripcionActividad,
      idTipoServicio: command.idTipoServicio,
      idSistema: command.idSistema,
      idTipoEquipo: command.idTipoEquipo,
      tipoActividad: command.tipoActividad,
      ordenEjecucion: command.ordenEjecucion,
      esObligatoria: command.esObligatoria,
      tiempoEstimadoMinutos: command.tiempoEstimadoMinutos,
      idParametroMedicion: command.idParametroMedicion,
      idTipoComponente: command.idTipoComponente,
      instrucciones: command.instrucciones,
      precauciones: command.precauciones,
      activo: command.activo,
      observaciones: command.observaciones,
      modificadoPor: command.modificadoPor,
    });

    const entity = await this.repository.update(command.id, data);
    return CatalogoActividadesMapper.toCamelCase(entity);
  }
}
