import { PrioridadOrdenEnum } from '@mekanos/core';

/**
 * Command: CreateOrdenCommand
 * Soporte Multi-Equipos (Enterprise) + Encadenamiento Fractal de Visitas + Resolución de Pendientes
 */
export class CreateOrdenCommand {
  constructor(
    public readonly clienteId: number,
    public readonly equiposIds: number[], // Múltiples equipos
    public readonly tipoServicioId: number,
    public readonly serviciosIds?: number[], // Servicios específicos del catalogo_servicios
    public readonly sedeClienteId?: number,
    public readonly descripcion?: string,
    public readonly razonFalla?: string,
    public readonly prioridad?: PrioridadOrdenEnum,
    public readonly fechaProgramada?: Date,
    public readonly tecnicoId?: number, // Asignación proactiva
    public readonly userId?: number,
    public readonly idOrdenPadre?: number,
    public readonly tipoVisita?: string,
    public readonly idsPendientesAResolver?: number[],
    public readonly nombreCaso?: string,
    public readonly estadoCaso?: string,
  ) { }
}
