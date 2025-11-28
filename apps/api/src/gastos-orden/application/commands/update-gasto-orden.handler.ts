import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IGastosOrdenRepository } from '../../domain/gastos-orden.repository.interface';
import { ResponseGastoOrdenDto } from '../../dto/response-gasto-orden.dto';
import { GastoOrdenMapper } from '../mappers/gasto-orden.mapper';
import { UpdateGastoOrdenCommand } from './update-gasto-orden.command';

/**
 * Handler: Actualizar gasto de orden
 * Tabla 13/14 - FASE 3
 */
@CommandHandler(UpdateGastoOrdenCommand)
export class UpdateGastoOrdenHandler implements ICommandHandler<UpdateGastoOrdenCommand> {
  constructor(
    @Inject('IGastosOrdenRepository')
    private readonly repository: IGastosOrdenRepository,
    private readonly mapper: GastoOrdenMapper,
  ) {}

  async execute(command: UpdateGastoOrdenCommand): Promise<ResponseGastoOrdenDto> {
    // Verificar existencia
    const existing = await this.repository.findById(command.idGasto);
    if (!existing) {
      throw new NotFoundException(`Gasto con ID ${command.idGasto} no encontrado`);
    }

    // Validación: valor > 0
    if (command.valor !== undefined && command.valor <= 0) {
      throw new BadRequestException('El valor del gasto debe ser mayor a 0');
    }

    // Determinar tieneComprobante final
    const tieneComprobante = command.tieneComprobante ?? existing.tiene_comprobante;
    const numeroComprobante = command.numeroComprobante ?? existing.numero_comprobante;

    // Validación: Si tieneComprobante, numeroComprobante es requerido
    if (tieneComprobante && !numeroComprobante) {
      throw new BadRequestException('Si tiene comprobante, debe proporcionar el número de comprobante');
    }

    // Determinar valor final para lógica de requiereAprobacion
    const valorFinal = command.valor ?? Number(existing.valor);

    // Lógica de negocio: requiereAprobacion automático si valor > 100000
    const requiereAprobacion = valorFinal > 100000;

    const entity = await this.repository.update(command.idGasto, {
      tipoGasto: command.tipoGasto,
      descripcion: command.descripcion,
      justificacion: command.justificacion,
      valor: command.valor,
      tieneComprobante: command.tieneComprobante,
      numeroComprobante: command.numeroComprobante,
      proveedor: command.proveedor,
      rutaComprobante: command.rutaComprobante,
      requiereAprobacion,
      estadoAprobacion: command.estadoAprobacion,
      observacionesAprobacion: command.observacionesAprobacion,
      fechaGasto: command.fechaGasto,
      generadoPor: command.generadoPor,
      aprobadoPor: command.aprobadoPor,
      fechaAprobacion: command.fechaAprobacion,
      observaciones: command.observaciones,
      modificadoPor: command.modificadoPor,
    });

    return this.mapper.toDto(entity);
  }
}
