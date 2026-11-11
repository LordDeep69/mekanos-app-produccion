import { OrdenServicioEntity } from '../entities/orden-servicio.entity';
import { EstadoOrden } from '../value-objects/estado-orden.vo';
import { OrdenServicioId } from '../value-objects/orden-servicio-id.vo';

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

export interface OrdenWithEquiposInput {
  numero_orden: string;
  id_cliente: number;
  id_sede?: number | null;
  id_equipo: number;
  id_tipo_servicio?: number | null;
  id_cronograma?: number | null;
  fecha_programada?: Date | null;
  hora_programada?: Date | null;
  prioridad?: string;
  origen_solicitud?: string;
  id_tecnico_asignado?: number | null;
  fecha_asignacion?: Date | null;
  id_estado_actual: number;
  descripcion_inicial?: string | null;
  requiere_firma_cliente?: boolean;
  creado_por: number;
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
   * Guarda una orden con soporte para múltiples equipos (Enterprise)
   * @param orden - Datos de la orden a persistir
   * @param equiposIds - Lista de IDs de equipos a vincular
   * @returns Orden persistida
   */
  saveWithEquipos(
    orden: OrdenWithEquiposInput,
    equiposIds: number[],
    serviciosIds?: number[],
  ): Promise<unknown>;

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
   * @param anio Año
   * @param mes Mes (1-12)
   * @returns Último correlativo usado o 0 si no hay órdenes
   */
  getUltimoCorrelativoMes(anio: number, mes: number): Promise<number>;
}
