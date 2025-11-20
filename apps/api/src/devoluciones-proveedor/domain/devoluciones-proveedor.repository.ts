/**
 * Interface del repositorio de Devoluciones a Proveedor (Domain Layer)
 * Define el contrato para operaciones de devoluciones sin dependencias de infraestructura
 */
export interface IDevolucionesProveedorRepository {
  /**
   * Crea una nueva devolución al proveedor
   * @param data Datos de la devolución a crear
   * @returns Devolución creada
   */
  crear(data: any): Promise<any>;

  /**
   * Procesa una devolución (aprueba o rechaza)
   * @param id_devolucion ID de la devolución
   * @param estado_devolucion Nuevo estado (APROBADA_PROVEEDOR | ACREDITADA)
   * @param procesada_por ID del usuario que procesa
   * @param observaciones_procesamiento Observaciones del procesamiento
   * @returns Devolución actualizada
   */
  procesar(
    id_devolucion: number,
    estado_devolucion: 'APROBADA_PROVEEDOR' | 'ACREDITADA',
    procesada_por: number,
    observaciones_procesamiento?: string,
  ): Promise<any>;

  /**
   * Obtiene todas las devoluciones con filtros opcionales
   * @param filters Filtros opcionales (estado, proveedor, fechas)
   * @param page Página actual
   * @param limit Cantidad de resultados por página
   * @returns Lista paginada de devoluciones
   */
  findAll(filters: any, page: number, limit: number): Promise<{ data: any[]; total: number }>;

  /**
   * Obtiene una devolución por su ID
   * @param id_devolucion ID de la devolución
   * @returns Devolución con relaciones completas
   */
  findById(id_devolucion: number): Promise<any>;

  /**
   * Obtiene devoluciones por orden de compra
   * @param id_orden_compra ID de la orden de compra
   * @returns Lista de devoluciones
   */
  findByOrdenCompra(id_orden_compra: number): Promise<any[]>;
}
