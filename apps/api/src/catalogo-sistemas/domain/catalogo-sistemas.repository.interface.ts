// Domain Interface para catalogo_sistemas
// Representa los sistemas catalogados aplicables a equipos (motor, generador, bomba)

export interface CrearCatalogoSistemaData {
  codigo_sistema: string;
  nombre_sistema: string;
  descripcion?: string;
  aplica_a: string[]; // Array de categorías: ["MOTOR", "GENERADOR", "BOMBA"]
  orden_visualizacion: number;
  icono?: string;
  color_hex?: string;
  observaciones?: string;
}

export interface ActualizarCatalogoSistemaData {
  codigo_sistema?: string;
  nombre_sistema?: string;
  descripcion?: string;
  aplica_a?: string[];
  orden_visualizacion?: number;
  icono?: string;
  color_hex?: string;
  observaciones?: string;
}

export interface CatalogoSistemasFilters {
  activo?: boolean;
  aplica_a?: string; // Filtrar por categoría específica
  orden_min?: number;
  orden_max?: number;
  page?: number;
  limit?: number;
}

export interface CatalogoSistemaEntity {
  id_sistema: number;
  codigo_sistema: string;
  nombre_sistema: string;
  descripcion?: string;
  aplica_a: string[];
  orden_visualizacion: number;
  icono?: string;
  color_hex?: string;
  activo: boolean;
  observaciones?: string;
  fecha_creacion: Date;
}

export interface ICatalogoSistemasRepository {
  crear(data: CrearCatalogoSistemaData): Promise<CatalogoSistemaEntity>;
  actualizar(
    id: number,
    data: ActualizarCatalogoSistemaData,
  ): Promise<CatalogoSistemaEntity>;
  desactivar(id: number): Promise<CatalogoSistemaEntity>;
  findById(id: number): Promise<CatalogoSistemaEntity | null>;
  findByCodigo(codigo: string): Promise<CatalogoSistemaEntity | null>;
  findAll(
    filters: CatalogoSistemasFilters,
  ): Promise<{ data: CatalogoSistemaEntity[]; total: number }>;
}
