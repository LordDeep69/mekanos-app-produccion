/**
 * Command: Actualizar orden de servicio existente
 */
export class UpdateOrdenCommand {
  constructor(
    public readonly ordenId: number,
    public readonly dto: {
      id_sede?: number;
      id_tipo_servicio?: number;
      fecha_programada?: Date;
      hora_programada?: Date;
      prioridad?: string;
      origen_solicitud?: string;
      descripcion_inicial?: string;
      trabajo_realizado?: string;
      observaciones_tecnico?: string;
      observaciones_cierre?: string;
      requiere_firma_cliente?: boolean;
    },
    public readonly userId: number,
  ) { }
}
