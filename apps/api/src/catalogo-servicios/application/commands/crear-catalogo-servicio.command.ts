export class CrearCatalogoServicioCommand {
  constructor(
    public readonly codigoServicio: string,
    public readonly nombreServicio: string,
    public readonly categoria: string,
    public readonly descripcion?: string,
    public readonly tipoServicioId?: number,
    public readonly tipoEquipoId?: number,
    public readonly duracionEstimadaHoras?: number,
    public readonly requiereCertificacion?: boolean,
    public readonly tipoCertificacionRequerida?: string,
    public readonly precioBase?: number,
    public readonly incluyeRepuestos?: boolean,
    public readonly activo?: boolean,
    public readonly observaciones?: string,
    public readonly creadoPor?: number,
  ) {}
}
