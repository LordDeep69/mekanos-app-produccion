import { EquipoEntity } from '../entities/equipo.entity';
import { EquipoId } from '../value-objects/equipo-id.vo';

/**
 * Filtros para búsqueda de equipos
 */
export interface FindEquiposFilters {
  clienteId?: number;
  sedeId?: number;
  estado?: string;
  tipoEquipoId?: number;
  skip?: number;
  take?: number;
}

/**
 * Puerto (Interface) para el repositorio de Equipos
 * Define el contrato que debe cumplir cualquier implementación
 * (Hexagonal Architecture - Port)
 */
export interface IEquipoRepository {
  /**
   * Guarda un equipo (crear o actualizar)
   */
  save(equipo: EquipoEntity): Promise<EquipoEntity>;

  /**
   * Busca un equipo por su ID
   */
  findById(id: EquipoId): Promise<EquipoEntity | null>;

  /**
   * Busca un equipo por su código
   */
  findByCodigo(codigo: string): Promise<EquipoEntity | null>;

  /**
   * Lista equipos con filtros opcionales
   */
  findAll(filters?: FindEquiposFilters): Promise<EquipoEntity[]>;

  /**
   * Cuenta equipos con filtros opcionales
   */
  count(filters?: FindEquiposFilters): Promise<number>;

  /**
   * Verifica si existe un equipo con el código dado
   */
  existsByCodigo(codigo: string): Promise<boolean>;

  /**
   * Elimina un equipo (soft delete recomendado)
   */
  delete(id: EquipoId): Promise<void>;
}
