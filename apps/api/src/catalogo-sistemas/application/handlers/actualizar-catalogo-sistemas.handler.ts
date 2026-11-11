import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ICatalogoSistemasRepository } from '../../domain/catalogo-sistemas.repository.interface';
import { CatalogoSistemasMapper } from '../../infrastructure/catalogo-sistemas.mapper';
import { ActualizarCatalogoSistemasCommand } from '../commands/actualizar-catalogo-sistemas.command';
import { CatalogoSistemasResponseDto } from '../dto/catalogo-sistemas-response.dto';

@CommandHandler(ActualizarCatalogoSistemasCommand)
export class ActualizarCatalogoSistemasHandler
  implements ICommandHandler<ActualizarCatalogoSistemasCommand>
{
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

    // 2. Resolver intercalado si se solicitó
    const ordenFinal = command.ordenVisualizacion ? Number(command.ordenVisualizacion) : undefined;
    if (command.intercalar && ordenFinal && ordenFinal > 0) {
      const todos = await this.repository.findActivos();
      const targetAplica = command.aplicaA !== undefined ? command.aplicaA : existe.aplica_a;
      const sistemasDelAmbito =
        targetAplica && targetAplica.length > 0
          ? todos.filter((s) => (s.aplica_a || []).some((t) => targetAplica.includes(t)))
          : todos.filter((s) => !s.aplica_a || s.aplica_a.length === 0);

      const aDesplazar = sistemasDelAmbito
        .filter(
          (s) => s.id_sistema !== command.idSistema && (s.orden_visualizacion || 0) >= ordenFinal,
        )
        .sort((a, b) => (b.orden_visualizacion || 0) - (a.orden_visualizacion || 0));

      for (const s of aDesplazar) {
        await this.repository.update(s.id_sistema, {
          orden_visualizacion: (s.orden_visualizacion || 0) + 1,
        });
      }
    }

    // 3. Preparar datos para actualización
    const updateData = this.mapper.toSnakeCaseUpdate({
      nombreSistema: command.nombreSistema,
      descripcion: command.descripcion,
      aplicaA: command.aplicaA,
      ordenVisualizacion: ordenFinal,
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
