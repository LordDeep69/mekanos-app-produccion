import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IGastosOrdenRepository } from '../../domain/gastos-orden.repository.interface';
import { ResponseGastoOrdenDto } from '../../dto/response-gasto-orden.dto';
import { GastoOrdenMapper } from '../mappers/gasto-orden.mapper';
import { CreateGastoOrdenCommand } from './create-gasto-orden.command';

/**
 * Handler: Crear gasto de orden
 * Tabla 13/14 - FASE 3
 * Validaciones:
 * - valor > 0
 * - Si tieneComprobante = true, numeroComprobante es requerido
 * - Si valor > 100000, requiereAprobacion = true automático
 */
@CommandHandler(CreateGastoOrdenCommand)
export class CreateGastoOrdenHandler implements ICommandHandler<CreateGastoOrdenCommand> {
  constructor(
    @Inject('IGastosOrdenRepository')
    private readonly repository: IGastosOrdenRepository,
    private readonly mapper: GastoOrdenMapper,
  ) {}

  async execute(command: CreateGastoOrdenCommand): Promise<ResponseGastoOrdenDto> {
    // Validación: valor > 0
    if (command.valor <= 0) {
      throw new BadRequestException('El valor del gasto debe ser mayor a 0');
    }

    // Validación: Si tieneComprobante, numeroComprobante es requerido
    if (command.tieneComprobante && !command.numeroComprobante) {
      throw new BadRequestException('Si tiene comprobante, debe proporcionar el número de comprobante');
    }

    // Lógica de negocio: requiereAprobacion automático si valor > 100000
    const requiereAprobacion = command.valor > 100000;

    // Estado inicial basado en requiereAprobacion
    const estadoAprobacion = requiereAprobacion ? 'PENDIENTE' : (command.estadoAprobacion ?? 'APROBADO');

    const entity = await this.repository.create({
      idOrdenServicio: command.idOrdenServicio,
      tipoGasto: command.tipoGasto,
      descripcion: command.descripcion,
      justificacion: command.justificacion,
      valor: command.valor,
      tieneComprobante: command.tieneComprobante ?? false,
      numeroComprobante: command.numeroComprobante,
      proveedor: command.proveedor,
      rutaComprobante: command.rutaComprobante,
      requiereAprobacion,
      estadoAprobacion,
      observacionesAprobacion: command.observacionesAprobacion,
      fechaGasto: command.fechaGasto,
      generadoPor: command.generadoPor,
      observaciones: command.observaciones,
      registradoPor: command.registradoPor,
    });

    return this.mapper.toDto(entity);
  }
}
