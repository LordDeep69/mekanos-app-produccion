import { PartialType } from '@nestjs/swagger';
import { CreateEvidenciaDto } from './create-evidencia.dto';

/**
 * DTO para actualizar evidencia fotográfica
 * FASE 3 - Tabla 11
 * 
 * Campos INMUTABLES (NO actualizar):
 * - idOrdenServicio (FK - no cambiar orden)
 * - idActividadEjecutada (FK - no cambiar actividad)
 * - nombreArchivo (archivo original)
 * - rutaArchivo (URL Cloudinary)
 * - hashSha256 (integridad archivo)
 * - tamañoBytes (tamaño archivo)
 * - mimeType (tipo archivo)
 * - anchoPixels, altoPixels (dimensiones)
 * - fechaCaptura (metadata original)
 * - capturadaPor (técnico original)
 * - fechaRegistro (auditoría)
 * 
 * Campos EDITABLES:
 * - tipoEvidencia (reclasificación)
 * - descripcion (texto descriptivo)
 * - ordenVisualizacion (reordenar)
 * - esPrincipal (cambiar principal)
 * - latitud, longitud (corrección GPS)
 * - metadataExif (actualizar metadata)
 * - tieneMiniatura, rutaMiniatura (procesamiento post)
 * - estaComprimida, tamañoOriginalBytes (procesamiento post)
 */

export class UpdateEvidenciaDto extends PartialType(CreateEvidenciaDto) {}
