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

    // 3. Verificar que el orden de visualización no esté ocupado
    if (command.ordenVisualizacion) {
      const existeOrden = await this.repository.findByOrden(command.ordenVisualizacion);
      if (existeOrden) {
        throw new ConflictException(
          `Ya existe un sistema con orden de visualización ${command.ordenVisualizacion}`,
        );
      }
    }

    // 4. Validar que orden sea positivo
    if (command.ordenVisualizacion && command.ordenVisualizacion <= 0) {
      throw new BadRequestException('El orden de visualización debe ser mayor a 0');
    }

    // 5. Preparar datos para creación
    const createData = this.mapper.toSnakeCaseCreate({
      codigoSistema: codigoNormalizado,
      nombreSistema: command.nombreSistema,
      descripcion: command.descripcion,
      aplicaA: command.aplicaA,
      ordenVisualizacion: command.ordenVisualizacion!,
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
