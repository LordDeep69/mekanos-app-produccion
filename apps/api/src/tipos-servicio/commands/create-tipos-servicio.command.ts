/**
 * Command: Crear tipo de servicio
 * 
 * Encapsula los datos necesarios para crear un nuevo tipo de servicio
 * siguiendo arquitectura CQRS (Command Query Responsibility Segregation)
 */
export class CreateTiposServicioCommand {
  constructor(
    public readonly codigoTipo: string,
    public readonly nombreTipo: string,
    public readonly descripcion: string | null,
    public readonly categoria: string,
    public readonly tipoEquipoId: number | null,
    public readonly tieneChecklist: boolean,
    public readonly tienePlantillaInforme: boolean,
    public readonly requiereMediciones: boolean,
    public readonly duracionEstimadaHoras: number | null,
    public readonly ordenVisualizacion: number | null,
    public readonly icono: string | null,
    public readonly colorHex: string | null,
    public readonly activo: boolean,
    public readonly observaciones: string | null,
    public readonly userId: number | null,
  ) {}
}
