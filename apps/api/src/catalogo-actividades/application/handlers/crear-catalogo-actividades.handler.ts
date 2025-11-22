import { BadRequestException, ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CatalogoActividadesRepository } from '../../domain/catalogo-actividades.repository.interface';
import { CatalogoActividadesMapper } from '../../infrastructure/catalogo-actividades.mapper';
import { CrearCatalogoActividadesCommand } from '../commands/crear-catalogo-actividades.command';
import { CatalogoActividadesResponseDto } from '../dto/catalogo-actividades-response.dto';

@CommandHandler(CrearCatalogoActividadesCommand)
export class CrearCatalogoActividadesHandler implements ICommandHandler<CrearCatalogoActividadesCommand> {
  constructor(
    @Inject('CatalogoActividadesRepository')
    private readonly repository: CatalogoActividadesRepository,
  ) {}

  async execute(command: CrearCatalogoActividadesCommand): Promise<CatalogoActividadesResponseDto> {
    // 1. Normalizar código
    const codigoNormalizado = command.codigoActividad.toUpperCase().trim();

    // 2. Verificar si ya existe el código
    const existing = await this.repository.findByCodigo(codigoNormalizado);
    if (existing) {
      throw new ConflictException(`Ya existe una actividad con el código: ${codigoNormalizado}`);
    }

    // 3. Validar FK requerido: tipo_servicio
    const tipoServicioExists = await this.repository.existsTipoServicio(command.idTipoServicio);
    if (!tipoServicioExists) {
      throw new NotFoundException(`Tipo de servicio con ID ${command.idTipoServicio} no existe`);
    }

    // 4. Validar FKs opcionales
    if (command.idSistema) {
      const sistemaExists = await this.repository.existsSistema(command.idSistema);
      if (!sistemaExists) {
        throw new NotFoundException(`Sistema con ID ${command.idSistema} no existe`);
      }
    }

    if (command.idParametroMedicion) {
      const parametroExists = await this.repository.existsParametroMedicion(command.idParametroMedicion);
      if (!parametroExists) {
        throw new NotFoundException(`Parámetro de medición con ID ${command.idParametroMedicion} no existe`);
      }
    }

    if (command.idTipoComponente) {
      const componenteExists = await this.repository.existsTipoComponente(command.idTipoComponente);
      if (!componenteExists) {
        throw new NotFoundException(`Tipo de componente con ID ${command.idTipoComponente} no existe`);
      }
    }

    // 5. Validar CHECK constraints
    if (command.ordenEjecucion <= 0) {
      throw new BadRequestException('El orden de ejecución debe ser mayor a 0');
    }

    if (command.tiempoEstimadoMinutos && command.tiempoEstimadoMinutos <= 0) {
      throw new BadRequestException('El tiempo estimado debe ser mayor a 0');
    }

    // 6. Crear entidad
    const data = CatalogoActividadesMapper.toSnakeCase({
      codigoActividad: codigoNormalizado,
      descripcionActividad: command.descripcionActividad,
      idTipoServicio: command.idTipoServicio,
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
      creadoPor: command.creadoPor,
    });

    const entity = await this.repository.create(data);
    return CatalogoActividadesMapper.toCamelCase(entity);
  }
}
