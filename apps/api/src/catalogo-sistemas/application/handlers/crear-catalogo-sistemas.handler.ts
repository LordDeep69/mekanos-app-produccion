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

    // 3. Determinar orden de visualización inteligente y resolver intercalado
    const todos = await this.repository.findActivos();
    const sistemasDelAmbito = (command.aplicaA && command.aplicaA.length > 0)
      ? todos.filter(s => (s.aplica_a || []).some(t => command.aplicaA!.includes(t)))
      : todos.filter(s => !s.aplica_a || s.aplica_a.length === 0);

    let ordenFinal = command.ordenVisualizacion ? Number(command.ordenVisualizacion) : 0;
    if (ordenFinal <= 0) {
      const maxOrden = sistemasDelAmbito.reduce((max, s) => Math.max(max, s.orden_visualizacion || 0), 0);
      ordenFinal = maxOrden + 1;
    } else if (command.intercalar) {
      // Intercalar: desplazar sistemas del mismo ámbito con orden >= ordenFinal (+1)
      const aDesplazar = sistemasDelAmbito
        .filter(s => (s.orden_visualizacion || 0) >= ordenFinal)
        .sort((a, b) => (b.orden_visualizacion || 0) - (a.orden_visualizacion || 0));

      for (const s of aDesplazar) {
        await this.repository.update(s.id_sistema, {
          orden_visualizacion: (s.orden_visualizacion || 0) + 1,
        });
      }
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
