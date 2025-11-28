import { Injectable } from '@nestjs/common';
import { ResponseEvidenciaDto } from '../../dto/response-evidencia.dto';
import { TipoEvidenciaEnum } from '../enums/tipo-evidencia.enum';

/**
 * Mapper evidencias_fotograficas Prisma entity → ResponseEvidenciaDto
 * FASE 3 - Tabla 11 - 25 campos + 3 nested relations
 * Conversiones: BigInt → Number, Decimal → Number
 */

@Injectable()
export class EvidenciaMapper {
  /**
   * Convierte entidad Prisma a DTO response
   * @param entity - Prisma evidencias_fotograficas entity
   * @returns ResponseEvidenciaDto con conversiones BigInt/Decimal y nested relations
   */
  toDto(entity: any): ResponseEvidenciaDto {
    const dto = new ResponseEvidenciaDto();

    // Identificación
    dto.idEvidencia = entity.id_evidencia;
    dto.idOrdenServicio = entity.id_orden_servicio;
    dto.idActividadEjecutada = entity.id_actividad_ejecutada ?? null;

    // Clasificación
    dto.tipoEvidencia = entity.tipo_evidencia as TipoEvidenciaEnum;
    dto.descripcion = entity.descripcion ?? null;

    // Archivo
    dto.nombreArchivo = entity.nombre_archivo;
    dto.rutaArchivo = entity.ruta_archivo;
    dto.hashSha256 = entity.hash_sha256;
    
    // ✅ Conversión BigInt → Number (tama_o_bytes)
    dto.tamañoBytes = entity.tama_o_bytes 
      ? Number(entity.tama_o_bytes) 
      : 0;

    dto.mimeType = entity.mime_type ?? null;
    dto.anchoPixels = entity.ancho_pixels ?? null;
    dto.altoPixels = entity.alto_pixels ?? null;

    // Visualización
    dto.ordenVisualizacion = entity.orden_visualizacion ?? null;
    dto.esPrincipal = entity.es_principal ?? null;

    // Metadata
    dto.fechaCaptura = entity.fecha_captura ?? null;
    dto.capturadaPor = entity.capturada_por ?? null;

    // ✅ Conversión Decimal → Number (latitud/longitud)
    dto.latitud = entity.latitud 
      ? Number(entity.latitud) 
      : null;
    dto.longitud = entity.longitud 
      ? Number(entity.longitud) 
      : null;

    dto.metadataExif = entity.metadata_exif ?? null;

    // Procesamiento
    dto.tieneMiniatura = entity.tiene_miniatura ?? null;
    dto.rutaMiniatura = entity.ruta_miniatura ?? null;
    dto.estaComprimida = entity.esta_comprimida ?? null;

    // ✅ Conversión BigInt → Number (tama_o_original_bytes)
    dto.tamañoOriginalBytes = entity.tama_o_original_bytes 
      ? Number(entity.tama_o_original_bytes) 
      : null;

    // Auditoría
    dto.fechaRegistro = entity.fecha_registro ?? null;

    // ✅ Nested relation 1: empleados (SINGULAR)
    if (entity.empleados) {
      dto.empleado = {
        idEmpleado: entity.empleados.id_empleado,
        codigoEmpleado: entity.empleados.codigo_empleado ?? '',
        cargo: String(entity.empleados.cargo ?? ''),
        esTecnico: entity.empleados.es_tecnico ?? false,
      };
    } else {
      dto.empleado = null;
    }

    // ✅ Nested relation 2: actividades_ejecutadas (SINGULAR)
    if (entity.actividades_ejecutadas) {
      dto.actividadEjecutada = {
        idActividadEjecutada: entity.actividades_ejecutadas.id_actividad_ejecutada,
        idOrdenServicio: entity.actividades_ejecutadas.id_orden_servicio,
        descripcionManual: entity.actividades_ejecutadas.descripcion_manual ?? null,
      };
    } else {
      dto.actividadEjecutada = null;
    }

    // ✅ Nested relation 3: ordenes_servicio (SINGULAR)
    dto.ordenServicio = {
      idOrdenServicio: entity.ordenes_servicio.id_orden_servicio,
      numeroOrden: entity.ordenes_servicio.numero_orden,
      idCliente: entity.ordenes_servicio.id_cliente,
      idEquipo: entity.ordenes_servicio.id_equipo,
    };

    return dto;
  }
}
