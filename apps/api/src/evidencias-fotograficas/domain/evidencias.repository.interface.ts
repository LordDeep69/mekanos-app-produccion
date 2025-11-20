/**
 * IEvidenciasRepository - Interface repository evidencias fotográficas
 * FASE 4.3 - Upload Cloudinary + metadata hash/exif
 */

export interface IEvidenciasRepository {
  /**
   * CREATE/UPDATE evidencia fotográfica
   */
  save(data: {
    id_evidencia?: number;
    id_orden_servicio: number;
    id_actividad_ejecutada?: number | null;
    tipo_evidencia: string;
    descripcion?: string | null;
    nombre_archivo: string;
    ruta_archivo: string; // URL Cloudinary
    hash_sha256: string;
    tama_o_bytes: bigint;
    mime_type?: string;
    ancho_pixels?: number;
    alto_pixels?: number;
    orden_visualizacion?: number;
    es_principal?: boolean;
    fecha_captura?: Date;
    capturada_por?: number;
    latitud?: number | null;
    longitud?: number | null;
    metadata_exif?: any;
    tiene_miniatura?: boolean;
    ruta_miniatura?: string | null;
    esta_comprimida?: boolean;
    tama_o_original_bytes?: bigint | null;
  }): Promise<any>;

  /**
   * READ ONE - obtener evidencia por ID
   */
  findById(id: number): Promise<any | null>;

  /**
   * READ ALL por orden - listar evidencias de orden específica
   */
  findByOrden(id_orden_servicio: number): Promise<any[]>;

  /**
   * READ ALL por actividad - listar evidencias de actividad específica
   */
  findByActividad(id_actividad_ejecutada: number): Promise<any[]>;

  /**
   * DELETE - eliminar evidencia (también borrar de Cloudinary)
   */
  delete(id: number): Promise<void>;
}
