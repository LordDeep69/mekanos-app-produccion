/**
 * Comando para crear un nuevo tipo de componente
 */
export class CrearTipoComponenteCommand {
  constructor(
    public readonly codigo_tipo: string,
    public readonly nombre_componente: string,
    public readonly categoria: string,
    public readonly aplica_a: string,
    public readonly subcategoria?: string,
    public readonly es_consumible?: boolean,
    public readonly es_inventariable?: boolean,
    public readonly descripcion?: string,
    public readonly creado_por?: number,
  ) {}
}
