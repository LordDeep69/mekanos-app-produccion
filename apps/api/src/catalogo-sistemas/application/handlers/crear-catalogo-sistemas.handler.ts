import { BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { CatalogoSistemasMapper } from '../../infrastructure/catalogo-sistemas.mapper';
import { CrearCatalogoSistemasCommand } from '../commands/crear-catalogo-sistemas.command';
import { CatalogoSistemasResponseDto } from '../dto/catalogo-sistemas-response.dto';

@CommandHandler(CrearCatalogoSistemasCommand)
export class CrearCatalogoSistemasHandler implements ICommandHandler<CrearCatalogoSistemasCommand> {
  constructor(
    @Inject('ICatalogoSistemasRepository')
    private readonly repository: ICatalogoSistemasRepository,
    private readonly mapper: CatalogoSistemasMapper,
  ) {}

  async execute(command: CrearCatalogoSistemasCommand): Promise<CatalogoSistemasResponseDto> {
    // 1. Normalizar código a MAYÚSCULAS
    const codigoNormalizado = command.codigoSistema.toUpperCase().trim();

    // 2. Verificar que el código no exista
    const existeCodigo = await this.repository.findByCodigo(codigoNormalizado);
    if (existeCodigo) {
      throw new ConflictException(`Ya existe un sistema con código '${codigoNormalizado}'`);
    }

    // 3. Determinar orden de visualización inteligente (si no viene o es <= 0, asignar max + 1)
    let ordenFinal = command.ordenVisualizacion ? Number(command.ordenVisualizacion) : 0;
    if (ordenFinal <= 0) {
      const todos = await this.repository.findActivos();
      const maxOrden = todos.reduce((max, s) => Math.max(max, s.orden_visualizacion || 0), 0);
      ordenFinal = maxOrden + 1;
    }

    // 4. Preparar datos para creación
    const createData = this.mapper.toSnakeCaseCreate({
      codigoSistema: codigoNormalizado,
      nombreSistema: command.nombreSistema,
      descripcion: command.descripcion,
      aplicaA: command.aplicaA,
      ordenVisualizacion: ordenFinal,
      icono: command.icono,
      colorHex: command.colorHex,
      activo: command.activo ?? true,
      observaciones: command.observaciones,
    });

    // 6. Crear sistema
    const created = await this.repository.create(createData);

    // 7. Retornar DTO en camelCase
    return this.mapper.toCamelCase(created);
  }
}
