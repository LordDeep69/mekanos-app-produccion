import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreateOrdenCommand } from './create-orden.command';
import {
  OrdenServicioEntity,
  IOrdenServicioRepository,
  NumeroOrden,
} from '@mekanos/core';

/**
 * Handler para CreateOrdenCommand
 * Crea una nueva Orden de Servicio en estado BORRADOR
 */
@CommandHandler(CreateOrdenCommand)
export class CreateOrdenHandler implements ICommandHandler<CreateOrdenCommand> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository
  ) {}

  async execute(command: CreateOrdenCommand): Promise<OrdenServicioEntity> {
    const {
      equipoId,
      clienteId,
      tipoServicioId,
      sedeClienteId,
      descripcion,
      prioridad,
      fechaProgramada,
    } = command;

    // Obtener el último correlativo del mes para generar número de orden
    const ultimoCorrelativo = await this.ordenRepository.getUltimoCorrelativoMes();
    const numeroOrden = NumeroOrden.create(ultimoCorrelativo);

    // Verificar que no exista (extra validación)
    const existente = await this.ordenRepository.existsByNumeroOrden(
      numeroOrden.getValue()
    );
    if (existente) {
      throw new Error(`Ya existe una orden con número ${numeroOrden.getValue()}`);
    }

    // Crear entidad de dominio (estado BORRADOR por defecto)
    const orden = OrdenServicioEntity.create({
      numeroOrden: numeroOrden.getValue(),
      equipoId,
      clienteId,
      sedeClienteId,
      tipoServicioId,
      descripcion,
      prioridad,
      fechaProgramada,
    });

    // Persistir
    return await this.ordenRepository.save(orden);
  }
}
