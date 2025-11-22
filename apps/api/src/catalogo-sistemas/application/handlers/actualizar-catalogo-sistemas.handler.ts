import { ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { CatalogoSistemasMapper } from '../../infrastructure/catalogo-sistemas.mapper';
import { ActualizarCatalogoSistemasCommand } from '../commands/actualizar-catalogo-sistemas.command';
import { CatalogoSistemasResponseDto } from '../dto/catalogo-sistemas-response.dto';

@CommandHandler(ActualizarCatalogoSistemasCommand)
export class ActualizarCatalogoSistemasHandler implements ICommandHandler<ActualizarCatalogoSistemasCommand> {
  constructor(
    @Inject('ICatalogoSistemasRepository')
    private readonly repository: ICatalogoSistemasRepository,
    private readonly mapper: CatalogoSistemasMapper,
  ) {}

  async execute(command: ActualizarCatalogoSistemasCommand): Promise<CatalogoSistemasResponseDto> {
    // 1. Verificar que el sistema existe
    const existe = await this.repository.findById(command.idSistema);
    if (!existe) {
      throw new NotFoundException(`Sistema con ID ${command.idSistema} no encontrado`);
    }

    // 2. Si actualiza orden, verificar que no esté ocupado por otro registro
    if (command.ordenVisualizacion !== undefined && command.ordenVisualizacion !== existe.orden_visualizacion) {
      const existeOrden = await this.repository.findByOrden(command.ordenVisualizacion);
      if (existeOrden && existeOrden.id_sistema !== command.idSistema) {
        throw new ConflictException(
          `Ya existe otro sistema con orden de visualización ${command.ordenVisualizacion}`,
        );
      }
    }

    // 3. Preparar datos para actualización
    const updateData = this.mapper.toSnakeCaseUpdate({
      nombreSistema: command.nombreSistema,
      descripcion: command.descripcion,
      aplicaA: command.aplicaA,
      ordenVisualizacion: command.ordenVisualizacion,
      icono: command.icono,
      colorHex: command.colorHex,
      activo: command.activo,
      observaciones: command.observaciones,
    });

    // 4. Actualizar sistema
    const updated = await this.repository.update(command.idSistema, updateData);

    // 5. Retornar DTO en camelCase
    return this.mapper.toCamelCase(updated);
  }
}
