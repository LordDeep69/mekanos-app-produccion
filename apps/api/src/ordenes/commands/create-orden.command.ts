import { PrioridadOrdenEnum } from '@mekanos/core';

/**
 * Command: CreateOrdenCommand
 * Crea una nueva Orden de Servicio en estado BORRADOR
 */
export class CreateOrdenCommand {
  constructor(
    public readonly equipoId: number,
    public readonly clienteId: number,
    public readonly tipoServicioId: number,
    public readonly sedeClienteId?: number,
    public readonly descripcion?: string,
    public readonly prioridad?: PrioridadOrdenEnum,
    public readonly fechaProgramada?: Date,
    public readonly userId?: number
  ) {}
}
