/**
 * Command: Actualizar tipo de servicio
 * 
 * Encapsula los datos necesarios para actualizar un tipo de servicio existente
 */
export class UpdateTiposServicioCommand {
  constructor(
    public readonly id: number,
    public readonly data: {
      codigoTipo?: string;
      nombreTipo?: string;
      descripcion?: string | null;
      categoria?: string;
      tipoEquipoId?: number | null;
      tieneChecklist?: boolean;
      tienePlantillaInforme?: boolean;
      requiereMediciones?: boolean;
      duracionEstimadaHoras?: number | null;
      ordenVisualizacion?: number | null;
      icono?: string | null;
      colorHex?: string | null;
      activo?: boolean;
      observaciones?: string | null;
    },
    public readonly userId: number | null,
  ) {}
}
