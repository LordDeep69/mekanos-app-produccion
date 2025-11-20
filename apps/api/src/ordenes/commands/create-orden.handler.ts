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
    const now = new Date();
    const anio = now.getFullYear();
    const mes = now.getMonth() + 1; // getMonth() es 0-based
    const ultimoCorrelativo = await this.ordenRepository.getUltimoCorrelativoMes(anio, mes);
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

    // Extraer datos para persistencia + agregar metadata
    const ordenData = {
      numero_orden: orden.numeroOrden.getValue(),
      id_cliente: orden.clienteId,
      id_equipo: orden.equipoId,
      id_tipo_servicio: orden.tipoServicioId,
      id_sede: orden.sedeClienteId,
      descripcion_inicial: orden.descripcion,
      fecha_programada: orden.fechaProgramada,
      prioridad: orden.prioridad.getValue(),
      origen_solicitud: 'PROGRAMADO',
      id_estado_actual: 1, // Estado BORRADOR (asumiendo ID 1 del seed)
      requiere_firma_cliente: true,
      creado_por: command.userId,
    };

    // Persistir y retornar (cast necesario hasta refactor de repository)
    return await this.ordenRepository.save(ordenData as any);
  }
}
