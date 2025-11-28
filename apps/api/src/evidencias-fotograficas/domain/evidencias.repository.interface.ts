/**
 * IEvidenciasRepository - Interface repository evidencias fotográficas
 * FASE 3 - Tabla 11 - camelCase refactorizado
 * NOTA: Usamos sizeBytes/sizeOriginalBytes en lugar de tamañoBytes para evitar
 * problemas de encoding con ñ en PowerShell/terminal
 */

export interface IEvidenciasRepository {
  /**
   * CREATE evidencia fotográfica
   */
  create(data: {
    idOrdenServicio: number;
    idActividadEjecutada?: number | null;
    tipoEvidencia: string;
    descripcion?: string | null;
    nombreArchivo: string;
    rutaArchivo: string;
    hashSha256: string;
    sizeBytes: number; // BigInt en Prisma (alias de tamañoBytes)
    mimeType?: string;
    anchoPixels?: number | null;
    altoPixels?: number | null;
    ordenVisualizacion?: number | null;
    esPrincipal?: boolean;
    capturadaPor?: number;
    latitud?: number | null;
    longitud?: number | null;
    metadataExif?: any;
    tieneMiniatura?: boolean;
    rutaMiniatura?: string | null;
    estaComprimida?: boolean;
    sizeOriginalBytes?: number | null; // BigInt en Prisma (alias de tamañoOriginalBytes)
  }): Promise<any>;

  /**
   * UPDATE evidencia fotográfica
   */
  update(
    id: number,
    data: {
      tipoEvidencia?: string;
      descripcion?: string | null;
      ordenVisualizacion?: number | null;
      esPrincipal?: boolean;
      latitud?: number | null;
      longitud?: number | null;
      metadataExif?: any;
      tieneMiniatura?: boolean;
      rutaMiniatura?: string | null;
      estaComprimida?: boolean;
      sizeOriginalBytes?: number | null;
    },
  ): Promise<any>;

  /**
   * DELETE evidencia fotográfica
   */
  delete(id: number): Promise<void>;

  /**
   * READ ONE - obtener evidencia por ID
   */
  findById(id: number): Promise<any | null>;

  /**
   * READ ALL por orden - listar evidencias de orden específica
   */
  findByOrden(ordenId: number): Promise<any[]>;

  /**
   * READ ALL por actividad - listar evidencias de actividad específica
   */
  findByActividad(actividadId: number): Promise<any[]>;

  /**
   * READ ALL - listar todas evidencias
   */
  findAll(): Promise<any[]>;

  /**
   * Desactivar es_principal de otras evidencias de la misma orden
   */
  desactivarPrincipales(ordenId: number, exceptoId?: number): Promise<void>;
}
