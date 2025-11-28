import { BadRequestException, ConflictException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaEstadosOrdenRepository } from '../../infrastructure/prisma-estados-orden.repository';
import { CrearEstadosOrdenCommand } from './crear-estados-orden.command';

/**
 * Handler para crear estado de orden
 * 
 * VALIDACIONES:
 * 1. Normalizar codigo_estado a UPPER TRIM
 * 2. Validar codigo_estado único (constraint DB)
 * 3. Validar constraint: orden_visualizacion > 0 OR NULL
 * 4. Validar lógica de negocio: si es_estado_final=true, permite_eliminacion debe ser false
 */
@CommandHandler(CrearEstadosOrdenCommand)
export class CrearEstadosOrdenHandler
  implements ICommandHandler<CrearEstadosOrdenCommand>
{
  constructor(
    private readonly repository: PrismaEstadosOrdenRepository,
  ) {}

  async execute(command: CrearEstadosOrdenCommand): Promise<any> {
    // 1. Normalizar codigo_estado
    const codigoNormalizado = command.codigoEstado.toUpperCase().trim();

    // 2. Validar código único
    const existente = await this.repository.findByCodigo(codigoNormalizado);
    if (existente) {
      throw new ConflictException(
        `Ya existe un estado con código '${codigoNormalizado}'`,
      );
    }

    // 3. Validar constraint orden_visualizacion
    if (command.ordenVisualizacion !== undefined && command.ordenVisualizacion !== null) {
      if (command.ordenVisualizacion <= 0) {
        throw new BadRequestException(
          'orden_visualizacion debe ser mayor que 0 o null',
        );
      }
    }

    // 4. Validar lógica de negocio: estado final no puede permitir eliminación
    if (command.esEstadoFinal === true && command.permiteEliminacion === true) {
      throw new BadRequestException(
        'Un estado final (es_estado_final=true) no puede permitir eliminación (permite_eliminacion debe ser false)',
      );
    }

    // 5. Validar formato color_hex si se proporciona
    if (command.colorHex) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!colorRegex.test(command.colorHex)) {
        throw new BadRequestException(
          'color_hex debe tener formato #RRGGBB (ej: #3B82F6)',
        );
      }
    }

    // 6. Crear estado
    return this.repository.create({
      codigo_estado: codigoNormalizado,
      nombre_estado: command.nombreEstado,
      descripcion: command.descripcion,
      permite_edicion: command.permiteEdicion,
      permite_eliminacion: command.permiteEliminacion,
      es_estado_final: command.esEstadoFinal,
      color_hex: command.colorHex,
      icono: command.icono,
      orden_visualizacion: command.ordenVisualizacion,
      activo: command.activo,
    });
  }
}
