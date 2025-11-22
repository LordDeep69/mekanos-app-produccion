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
    // 1. Verificar existencia
    const existing = await this.repository.findById(command.id);
    if (!existing) {
      throw new NotFoundException(`Actividad con ID ${command.id} no encontrada`);
    }

    // 2. Validar FKs opcionales si se están actualizando
    if (command.idSistema !== undefined) {
      const sistemaExists = await this.repository.existsSistema(command.idSistema);
      if (!sistemaExists) {
        throw new NotFoundException(`Sistema con ID ${command.idSistema} no existe`);
      }
    }

    if (command.idParametroMedicion !== undefined) {
      const parametroExists = await this.repository.existsParametroMedicion(command.idParametroMedicion);
      if (!parametroExists) {
        throw new NotFoundException(`Parámetro de medición con ID ${command.idParametroMedicion} no existe`);
      }
    }

    if (command.idTipoComponente !== undefined) {
      const componenteExists = await this.repository.existsTipoComponente(command.idTipoComponente);
      if (!componenteExists) {
        throw new NotFoundException(`Tipo de componente con ID ${command.idTipoComponente} no existe`);
      }
    }

    // 3. Validar CHECK constraints
    if (command.ordenEjecucion !== undefined && command.ordenEjecucion <= 0) {
      throw new BadRequestException('El orden de ejecución debe ser mayor a 0');
    }

    if (command.tiempoEstimadoMinutos !== undefined && command.tiempoEstimadoMinutos <= 0) {
      throw new BadRequestException('El tiempo estimado debe ser mayor a 0');
    }

    // 4. Actualizar entidad
    const data = CatalogoActividadesMapper.toSnakeCase({
      descripcionActividad: command.descripcionActividad,
      idSistema: command.idSistema,
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

    // Remover campos undefined
    Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

    const entity = await this.repository.update(command.id, data);
    return CatalogoActividadesMapper.toCamelCase(entity);
  }
}
