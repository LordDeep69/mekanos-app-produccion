import {
    BadRequestException,
    ConflictException,
    NotFoundException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaEstadosOrdenRepository } from '../../infrastructure/prisma-estados-orden.repository';
import { ActualizarEstadosOrdenCommand } from './actualizar-estados-orden.command';

/**
 * Handler para actualizar estado de orden
 * 
 * VALIDACIONES:
 * 1. Verificar que estado existe
 * 2. Si se actualiza codigo_estado, normalizar y validar unicidad
 * 3. Validar constraint orden_visualizacion > 0
 * 4. Validar lógica de negocio: estado final no puede permitir eliminación
 * 5. Validar formato color_hex
 */
@CommandHandler(ActualizarEstadosOrdenCommand)
export class ActualizarEstadosOrdenHandler
  implements ICommandHandler<ActualizarEstadosOrdenCommand>
{
  constructor(
    private readonly repository: PrismaEstadosOrdenRepository,
  ) {}

  async execute(command: ActualizarEstadosOrdenCommand): Promise<any> {
    // 1. Verificar existencia
    const estadoExistente = await this.repository.findById(command.idEstado);
    if (!estadoExistente) {
      throw new NotFoundException(
        `Estado con ID ${command.idEstado} no encontrado`,
      );
    }

    const dataUpdate: any = {};

    // 2. Validar y normalizar codigo_estado si se proporciona
    if (command.codigoEstado !== undefined) {
      const codigoNormalizado = command.codigoEstado.toUpperCase().trim();
      
      // Verificar unicidad solo si cambió
      if (codigoNormalizado !== estadoExistente.codigo_estado) {
        const existente = await this.repository.findByCodigo(codigoNormalizado);
        if (existente) {
          throw new ConflictException(
            `Ya existe un estado con código '${codigoNormalizado}'`,
          );
        }
      }

      dataUpdate.codigo_estado = codigoNormalizado;
    }

    // 3. Validar constraint orden_visualizacion
    if (command.ordenVisualizacion !== undefined && command.ordenVisualizacion !== null) {
      if (command.ordenVisualizacion <= 0) {
        throw new BadRequestException(
          'orden_visualizacion debe ser mayor que 0 o null',
        );
      }
      dataUpdate.orden_visualizacion = command.ordenVisualizacion;
    }

    // 4. Validar lógica de negocio: estado final + permite_eliminacion
    const esEstadoFinal = command.esEstadoFinal ?? estadoExistente.es_estado_final;
    const permiteEliminacion = command.permiteEliminacion ?? estadoExistente.permite_eliminacion;

    if (esEstadoFinal === true && permiteEliminacion === true) {
      throw new BadRequestException(
        'Un estado final (es_estado_final=true) no puede permitir eliminación (permite_eliminacion debe ser false)',
      );
    }

    // 5. Validar formato color_hex si se proporciona
    if (command.colorHex !== undefined) {
      if (command.colorHex) {
        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!colorRegex.test(command.colorHex)) {
          throw new BadRequestException(
            'color_hex debe tener formato #RRGGBB (ej: #3B82F6)',
          );
        }
      }
      dataUpdate.color_hex = command.colorHex;
    }

    // 6. Asignar campos restantes
    if (command.nombreEstado !== undefined) {
      dataUpdate.nombre_estado = command.nombreEstado;
    }

    if (command.descripcion !== undefined) {
      dataUpdate.descripcion = command.descripcion;
    }

    if (command.permiteEdicion !== undefined) {
      dataUpdate.permite_edicion = command.permiteEdicion;
    }

    if (command.permiteEliminacion !== undefined) {
      dataUpdate.permite_eliminacion = command.permiteEliminacion;
    }

    if (command.esEstadoFinal !== undefined) {
      dataUpdate.es_estado_final = command.esEstadoFinal;
    }

    if (command.icono !== undefined) {
      dataUpdate.icono = command.icono;
    }

    if (command.activo !== undefined) {
      dataUpdate.activo = command.activo;
    }

    // 7. Actualizar estado
    return this.repository.update(command.idEstado, dataUpdate);
  }
}
