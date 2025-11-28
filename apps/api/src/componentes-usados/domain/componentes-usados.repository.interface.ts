import { componentes_usados } from '@prisma/client';
import { CreateComponenteUsadoDto } from '../dto/create-componente-usado.dto';
import { UpdateComponenteUsadoDto } from '../dto/update-componente-usado.dto';

/**
 * Interface del repositorio de componentes usados
 * Tabla 12/14 - FASE 3
 */
export interface IComponentesUsadosRepository {
  /**
   * Crear un nuevo componente usado
   * @param data DTO de creación + costoTotal calculado
   */
  create(data: CreateComponenteUsadoDto & { costoTotal?: number | null }): Promise<componentes_usados>;

  /**
   * Actualizar un componente usado existente
   * @param id ID del componente a actualizar
   * @param data DTO de actualización + costoTotal recalculado
   */
  update(id: number, data: UpdateComponenteUsadoDto & { costoTotal?: number | null }): Promise<componentes_usados>;

  /**
   * Eliminar un componente usado (hard delete)
   * @param id ID del componente a eliminar
   */
  delete(id: number): Promise<void>;

  /**
   * Buscar componente por ID con relaciones
   * @param id ID del componente
   */
  findById(id: number): Promise<componentes_usados | null>;

  /**
   * Listar todos los componentes usados
   */
  findAll(): Promise<componentes_usados[]>;

  /**
   * Listar componentes usados por orden de servicio
   * @param idOrden ID de la orden de servicio
   */
  findByOrden(idOrden: number): Promise<componentes_usados[]>;
}
