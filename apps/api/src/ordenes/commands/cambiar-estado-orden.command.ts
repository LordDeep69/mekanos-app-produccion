/**
 * Command: CambiarEstadoOrdenCommand
 * 
 * Comando unificado para transiciones de estado de órdenes de servicio.
 * Utiliza FSM (workflow-estados.ts) para validar transiciones.
 * Registra automáticamente en historial_estados_orden.
 */
export class CambiarEstadoOrdenCommand {
  constructor(
    /** ID de la orden a modificar */
    public readonly ordenId: number,
    
    /** Código del nuevo estado (PROGRAMADA, ASIGNADA, etc.) */
    public readonly nuevoEstado: string,
    
    /** ID del usuario que realiza el cambio */
    public readonly usuarioId: number,
    
    /** Motivo del cambio de estado */
    public readonly motivo?: string,
    
    /** Observaciones adicionales */
    public readonly observaciones?: string,
    
    /** Datos adicionales según tipo de transición */
    public readonly datosAdicionales?: {
      tecnicoId?: number;
      aprobadorId?: number;
      fechaProgramada?: Date;
    },
  ) {}
}
