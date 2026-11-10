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
    // 1. Resolver o autogenerar código normalizado
    let codigoNormalizado = command.codigoActividad?.toUpperCase().trim() || '';
    if (!codigoNormalizado) {
      const slug = command.descripcionActividad
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 24) || 'TASK';
      const prefix = command.tipoActividad.slice(0, 4).toUpperCase();
      const stamp = Date.now().toString(36).toUpperCase().slice(-5);
      codigoNormalizado = `ACT_${prefix}_${slug}_${stamp}`.slice(0, 50);
    }

    // 2. Verificar si ya existe el código (disambiguar si fue autogenerado, lanzar Conflict si fue explícito)
    const existing = await this.repository.findByCodigo(codigoNormalizado);
    if (existing) {
      if (command.codigoActividad?.trim()) {
        throw new ConflictException(`Ya existe una actividad con el código: ${codigoNormalizado}`);
      }
      codigoNormalizado = `${codigoNormalizado.slice(0, 43)}_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 3. Validar FK opcional: tipo_servicio (puede ser NULL para plantillas del Banco Universal)
    if (command.idTipoServicio != null) {
      const tipoServicioExists = await this.repository.existsTipoServicio(command.idTipoServicio);
      if (!tipoServicioExists) {
        throw new NotFoundException(`Tipo de servicio con ID ${command.idTipoServicio} no existe`);
      }
    }

    // 4. Validar FKs opcionales
    if (command.idTipoEquipo != null) {
      const tipoEquipoExists = await this.repository.existsTipoEquipo(command.idTipoEquipo);
      if (!tipoEquipoExists) {
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

    // 5. Resolver orden de ejecución y validar constraints
    let ordenEjecucion = command.ordenEjecucion;
    if (ordenEjecucion == null) {
      const maxOrden = await this.repository.getMaxOrdenPorServicio(command.idTipoServicio);
      ordenEjecucion = maxOrden + 1;
    }
    if (ordenEjecucion <= 0) {
      throw new BadRequestException('El orden de ejecución debe ser mayor a 0');
    }

    if (command.tiempoEstimadoMinutos != null && command.tiempoEstimadoMinutos <= 0) {
      throw new BadRequestException('El tiempo estimado debe ser mayor a 0');
    }

    // 6. Crear entidad
    const data = CatalogoActividadesMapper.toSnakeCase({
      codigoActividad: codigoNormalizado,
      descripcionActividad: command.descripcionActividad.trim(),
      idTipoServicio: command.idTipoServicio ?? null,
      idSistema: command.idSistema ?? null,
      idTipoEquipo: command.idTipoEquipo ?? null,
      idPlantillaOrigen: command.idPlantillaOrigen ?? null,
      tipoActividad: command.tipoActividad,
      ordenEjecucion,
      esObligatoria: command.esObligatoria ?? true,
      tiempoEstimadoMinutos: command.tiempoEstimadoMinutos ?? null,
      idParametroMedicion: command.idParametroMedicion ?? null,
      idTipoComponente: command.idTipoComponente ?? null,
      instrucciones: command.instrucciones ?? null,
      precauciones: command.precauciones ?? null,
      activo: command.activo ?? true,
      observaciones: command.observaciones ?? null,
      creadoPor: command.creadoPor,
    });

    const entity = await this.repository.create(data);
    return CatalogoActividadesMapper.toCamelCase(entity);
  }
}
