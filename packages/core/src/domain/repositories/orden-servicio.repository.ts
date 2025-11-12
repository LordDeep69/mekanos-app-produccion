import { OrdenServicioEntity } from '../entities/orden-servicio.entity';
import { OrdenServicioId } from '../value-objects/orden-servicio-id.vo';
import { EstadoOrden } from '../value-objects/estado-orden.vo';

/**
 * Filtros para búsqueda de órdenes
 */
export interface FindOrdenesFilters {
  clienteId?: number;
  equipoId?: number;
  sedeClienteId?: number;
  tecnicoAsignadoId?: number;
  estado?: string;
  prioridad?: string;
  fechaDesde?: Date;
  fechaHasta?: Date;
  skip?: number;
  take?: number;
}

/**
 * Repository Port: IOrdenServicioRepository
 * Define el contrato para la persistencia de Órdenes de Servicio
 */
export interface IOrdenServicioRepository {
  /**
   * Busca una orden por su ID
   * @param id - ID de la orden
   * @returns Orden encontrada o null
   */
  findById(id: OrdenServicioId): Promise<OrdenServicioEntity | null>;

  /**
   * Busca una orden por su número de orden
   * @param numeroOrden - Número de orden (OS-YYYYMM-NNNN)
   * @returns Orden encontrada o null
   */
  findByNumeroOrden(numeroOrden: string): Promise<OrdenServicioEntity | null>;

  /**
   * Busca todas las órdenes con filtros opcionales
   * @param filters - Criterios de búsqueda
   * @returns Lista de órdenes encontradas
   */
  findAll(filters?: FindOrdenesFilters): Promise<OrdenServicioEntity[]>;

  /**
   * Busca órdenes por equipo
   * @param equipoId - ID del equipo
   * @returns Lista de órdenes del equipo
   */
  findByEquipo(equipoId: number): Promise<OrdenServicioEntity[]>;

  /**
   * Busca órdenes por cliente
   * @param clienteId - ID del cliente
   * @returns Lista de órdenes del cliente
   */
  findByCliente(clienteId: number): Promise<OrdenServicioEntity[]>;

  /**
   * Busca órdenes asignadas a un técnico
   * @param tecnicoId - ID del técnico
   * @returns Lista de órdenes asignadas
   */
  findByTecnico(tecnicoId: number): Promise<OrdenServicioEntity[]>;

  /**
   * Busca órdenes por estado
   * @param estado - Estado de la orden
   * @returns Lista de órdenes en ese estado
   */
  findByEstado(estado: EstadoOrden): Promise<OrdenServicioEntity[]>;

  /**
   * Cuenta el total de órdenes según filtros
   * @param filters - Criterios de conteo
   * @returns Total de órdenes
   */
  count(filters?: FindOrdenesFilters): Promise<number>;

  /**
   * Guarda una orden (crear o actualizar)
   * @param orden - Entidad de orden a persistir
   * @returns Orden persistida
   */
  save(orden: OrdenServicioEntity): Promise<OrdenServicioEntity>;

  /**
   * Elimina una orden (soft delete recomendado)
   * @param id - ID de la orden a eliminar
   */
  delete(id: OrdenServicioId): Promise<void>;

  /**
   * Verifica si existe una orden con un número específico
   * @param numeroOrden - Número de orden a verificar
   * @returns true si existe
   */
  existsByNumeroOrden(numeroOrden: string): Promise<boolean>;

  /**
   * Obtiene el último número correlativo del mes actual
   * @returns Último correlativo usado o 0 si no hay órdenes
   */
  getUltimoCorrelativoMes(): Promise<number>;
}
