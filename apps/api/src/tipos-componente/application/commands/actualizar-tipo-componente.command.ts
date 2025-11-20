/**
 * Comando para actualizar un tipo de componente existente
 */
export class ActualizarTipoComponenteCommand {
  constructor(
    public readonly id: number,
    public readonly codigo_tipo?: string,
    public readonly nombre_componente?: string,
    public readonly categoria?: string,
    public readonly subcategoria?: string,
    public readonly es_consumible?: boolean,
    public readonly es_inventariable?: boolean,
    public readonly aplica_a?: string,
    public readonly descripcion?: string,
    public readonly activo?: boolean,
    public readonly modificado_por?: number,
  ) {}
}
