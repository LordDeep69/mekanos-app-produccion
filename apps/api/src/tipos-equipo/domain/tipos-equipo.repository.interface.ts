/**
 * Interface del repositorio para Tipos de Equipo
 * Define el contrato para operaciones CRUD sobre tipos_equipo
 */
export interface ITiposEquipoRepository {
  /**
   * Crear un nuevo tipo de equipo
   */
  crear(data: CrearTipoEquipoData): Promise<TipoEquipoEntity>;

  /**
   * Actualizar un tipo de equipo existente
   */
  actualizar(id: number, data: ActualizarTipoEquipoData): Promise<TipoEquipoEntity>;

  /**
   * Desactivar tipo de equipo (soft delete)
   */
  desactivar(id: number): Promise<TipoEquipoEntity>;

  /**
   * Buscar tipo por ID
   */
  findById(id: number): Promise<TipoEquipoEntity | null>;

  /**
   * Buscar tipo por código único
   */
  findByCodigo(codigo: string): Promise<TipoEquipoEntity | null>;

  /**
   * Listar tipos con filtros y paginación
   */
  findAll(filters: TiposEquipoFilters): Promise<{
    data: TipoEquipoEntity[];
    total: number;
    page: number;
    totalPages: number;
  }>;
}

// DTOs internos del dominio
export interface CrearTipoEquipoData {
  codigo_tipo: string;
  nombre_tipo: string;
  descripcion?: string;
  categoria: string; // ENUM: categoria_equipo_enum
  tiene_motor?: boolean;
  tiene_generador?: boolean;
  tiene_bomba?: boolean;
  requiere_horometro?: boolean;
  permite_mantenimiento_tipo_a?: boolean;
  permite_mantenimiento_tipo_b?: boolean;
  intervalo_tipo_a_dias?: number;
  intervalo_tipo_a_horas?: number;
  intervalo_tipo_b_dias?: number;
  intervalo_tipo_b_horas?: number;
  criterio_intervalo?: string; // ENUM: criterio_intervalo_enum
  formato_ficha_tecnica: string;
  formato_mantenimiento_tipo_a?: string;
  formato_mantenimiento_tipo_b?: string;
  orden?: number;
  metadata?: any;
  creado_por?: number;
}

export interface ActualizarTipoEquipoData {
  nombre_tipo?: string;
  descripcion?: string;
  tiene_motor?: boolean;
  tiene_generador?: boolean;
  tiene_bomba?: boolean;
  requiere_horometro?: boolean;
  permite_mantenimiento_tipo_a?: boolean;
  permite_mantenimiento_tipo_b?: boolean;
  intervalo_tipo_a_dias?: number;
  intervalo_tipo_a_horas?: number;
  intervalo_tipo_b_dias?: number;
  intervalo_tipo_b_horas?: number;
  criterio_intervalo?: string;
  formato_ficha_tecnica?: string;
  formato_mantenimiento_tipo_a?: string;
  formato_mantenimiento_tipo_b?: string;
  orden?: number;
  metadata?: any;
  disponible?: boolean;
  modificado_por?: number;
}

export interface TiposEquipoFilters {
  page?: number;
  limit?: number;
  categoria?: string;
  activo?: boolean;
  disponible?: boolean;
  tiene_motor?: boolean;
  tiene_generador?: boolean;
  tiene_bomba?: boolean;
}

// Entity del dominio
export interface TipoEquipoEntity {
  id_tipo_equipo: number;
  codigo_tipo: string;
  nombre_tipo: string;
  descripcion?: string;
  categoria: string;
  tiene_motor: boolean;
  tiene_generador: boolean;
  tiene_bomba: boolean;
  requiere_horometro: boolean;
  permite_mantenimiento_tipo_a: boolean;
  permite_mantenimiento_tipo_b: boolean;
  intervalo_tipo_a_dias?: number;
  intervalo_tipo_a_horas?: number;
  intervalo_tipo_b_dias?: number;
  intervalo_tipo_b_horas?: number;
  criterio_intervalo?: string;
  formato_ficha_tecnica: string;
  formato_mantenimiento_tipo_a?: string;
  formato_mantenimiento_tipo_b?: string;
  orden: number;
  metadata?: any;
  activo: boolean;
  disponible: boolean;
  creado_por?: number;
  fecha_creacion: Date;
  modificado_por?: number;
  fecha_modificacion?: Date;
}
