import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IRecepcionesCompraRepository } from '../../domain/recepciones-compra.repository';

export class RegistrarRecepcionCommand {
  constructor(
    public readonly id_orden_compra: number,
    public readonly id_detalle_orden: number,
    public readonly cantidad_recibida: number,
    public readonly cantidad_aceptada: number,
    public readonly cantidad_rechazada: number,
    public readonly tipo_recepcion: 'PARCIAL' | 'FINAL' | 'UNICA',
    public readonly calidad: 'OK' | 'PARCIAL_DA_ADO' | 'RECHAZADO',
    public readonly recibido_por: number,
    public readonly id_ubicacion_destino?: number,
    public readonly observaciones?: string,
    public readonly costo_unitario_real?: number,
  ) {}
}

@CommandHandler(RegistrarRecepcionCommand)
export class RegistrarRecepcionHandler implements ICommandHandler<RegistrarRecepcionCommand> {
  constructor(
    @Inject('IRecepcionesCompraRepository')
    private readonly repository: IRecepcionesCompraRepository,
  ) {}

  async execute(command: RegistrarRecepcionCommand) {
    return await this.repository.create({
      id_orden_compra: command.id_orden_compra,
      id_detalle_orden: command.id_detalle_orden,
      cantidad_recibida: command.cantidad_recibida,
      cantidad_aceptada: command.cantidad_aceptada,
      cantidad_rechazada: command.cantidad_rechazada,
      tipo_recepcion: command.tipo_recepcion,
      calidad: command.calidad,
      recibido_por: command.recibido_por,
      id_ubicacion_destino: command.id_ubicacion_destino,
      observaciones: command.observaciones,
      costo_unitario_real: command.costo_unitario_real,
    });
  }
}
