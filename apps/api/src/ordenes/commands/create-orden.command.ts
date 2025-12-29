import { PrioridadOrdenEnum } from '@mekanos/core';

/**
 * Command: CreateOrdenCommand
 * Soporte Multi-Equipos (Enterprise)
 */
export class CreateOrdenCommand {
  constructor(
    public readonly clienteId: number,
    public readonly equiposIds: number[], // Múltiples equipos
    public readonly tipoServicioId: number,
    public readonly sedeClienteId?: number,
    public readonly descripcion?: string,
    public readonly prioridad?: PrioridadOrdenEnum,
    public readonly fechaProgramada?: Date,
    public readonly tecnicoId?: number, // Asignación proactiva
    public readonly userId?: number
  ) { }
}
