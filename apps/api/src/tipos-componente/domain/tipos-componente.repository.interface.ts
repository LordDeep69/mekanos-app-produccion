/**
 * Interface del repositorio para Tipos de Componente
 * Define el contrato para operaciones CRUD sobre tipos_componente
 */
export interface ITiposComponenteRepository {
  /**
   * Crear un nuevo tipo de componente
   */
  crear(data: CrearTipoComponenteData): Promise<TipoComponenteEntity>;

  /**
   * Actualizar un tipo de componente existente
   */
  actualizar(
    id: number,
    data: ActualizarTipoComponenteData,
  ): Promise<TipoComponenteEntity>;

  /**
   * Desactivar tipo de componente (soft delete)
   */
  desactivar(id: number): Promise<TipoComponenteEntity>;

  /**
   * Buscar tipo por ID
   */
  findById(id: number): Promise<TipoComponenteEntity | null>;

  /**
   * Buscar tipo por código único
   */
  findByCodigo(codigo: string): Promise<TipoComponenteEntity | null>;

  /**
   * Listar tipos con filtros y paginación
   */
  findAll(filters: TiposComponenteFilters): Promise<{
    data: TipoComponenteEntity[];
    total: number;
    page: number;
    totalPages: number;
  }>;
}

/**
 * Data Transfer Object para crear tipo de componente
 */
export interface CrearTipoComponenteData {
  codigo_tipo: string;
  nombre_componente: string;
  categoria: string;
  subcategoria?: string;
  es_consumible?: boolean;
  es_inventariable?: boolean;
  aplica_a?: string;
  aplica_todos_tipos?: boolean;
  tipos_equipo_ids?: number[];
  descripcion?: string;
  creado_por?: number;
}

/**
 * Data Transfer Object para actualizar tipo de componente
 */
export interface ActualizarTipoComponenteData {
  codigo_tipo?: string;
  nombre_componente?: string;
  categoria?: string;
  subcategoria?: string;
  es_consumible?: boolean;
  es_inventariable?: boolean;
  aplica_a?: string;
  aplica_todos_tipos?: boolean;
  tipos_equipo_ids?: number[];
  descripcion?: string;
  activo?: boolean;
  modificado_por?: number;
}

/**
 * Filtros para búsqueda de tipos de componente
 */
export interface TiposComponenteFilters {
  categoria?: string;
  aplica_a?: string;
  id_tipo_equipo?: number;
  es_consumible?: boolean;
  es_inventariable?: boolean;
  activo?: boolean;
  page?: number;
  limit?: number;
}

export interface TipoEquipoAplicableRef {
  id_tipo_equipo: number;
  codigo_tipo: string;
  nombre_tipo: string;
}

/**
 * Entity del dominio para tipo de componente
 */
export interface TipoComponenteEntity {
  id_tipo_componente: number;
  codigo_tipo: string;
  nombre_componente: string;
  categoria: string;
  subcategoria?: string;
  es_consumible: boolean;
  es_inventariable: boolean;
  aplica_a?: string | null;
  aplica_todos_tipos: boolean;
  tipos_equipo_ids: number[];
  tipos_equipo?: TipoEquipoAplicableRef[];
  descripcion?: string;
  activo: boolean;
  creado_por?: number;
  fecha_creacion: Date;
}
