import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IEvidenciasRepository } from '../domain/evidencias.repository.interface';

/**
 * PrismaEvidenciasRepository - Implementación Prisma evidencias fotográficas
 * FASE 3 - Tabla 11 - CRUD Estándar refactorizado camelCase
 */

@Injectable()
export class PrismaEvidenciasRepository implements IEvidenciasRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get fullIncludes() {
    return {
      ordenes_servicio: true,
      actividades_ejecutadas: true,
      empleados: true,
    };
  }

  async create(data: {
    idOrdenServicio: number;
    idActividadEjecutada?: number | null;
    tipoEvidencia: string;
    descripcion?: string | null;
    nombreArchivo: string;
    rutaArchivo: string;
    hashSha256: string;
    sizeBytes: number;
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
    sizeOriginalBytes?: number | null;
  }): Promise<any> {
    return await this.prisma.evidencias_fotograficas.create({
      data: {
        id_orden_servicio: data.idOrdenServicio,
        id_actividad_ejecutada: data.idActividadEjecutada ?? null,
        tipo_evidencia: data.tipoEvidencia as any, // ✅ Cast to Prisma enum
        descripcion: data.descripcion ?? null,
        nombre_archivo: data.nombreArchivo,
        ruta_archivo: data.rutaArchivo,
        hash_sha256: data.hashSha256,
        tama_o_bytes: BigInt(data.sizeBytes), // ✅ Convert to BigInt
        mime_type: data.mimeType ?? 'image/jpeg',
        ancho_pixels: data.anchoPixels ?? null,
        alto_pixels: data.altoPixels ?? null,
        orden_visualizacion: data.ordenVisualizacion ?? null,
        es_principal: data.esPrincipal ?? false,
        fecha_captura: new Date(),
        capturada_por: data.capturadaPor ?? null,
        latitud: data.latitud ?? null,
        longitud: data.longitud ?? null,
        metadata_exif: data.metadataExif ?? null,
        tiene_miniatura: data.tieneMiniatura ?? false,
        ruta_miniatura: data.rutaMiniatura ?? null,
        esta_comprimida: data.estaComprimida ?? false,
        tama_o_original_bytes: data.sizeOriginalBytes
          ? BigInt(data.sizeOriginalBytes)
          : null,
        fecha_registro: new Date(),
      },
      include: this.fullIncludes,
    });
  }

  async update(
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
  ): Promise<any> {
    const updateData: any = {};

    if (data.tipoEvidencia !== undefined)
      updateData.tipo_evidencia = data.tipoEvidencia;
    if (data.descripcion !== undefined)
      updateData.descripcion = data.descripcion;
    if (data.ordenVisualizacion !== undefined)
      updateData.orden_visualizacion = data.ordenVisualizacion;
    if (data.esPrincipal !== undefined)
      updateData.es_principal = data.esPrincipal;
    if (data.latitud !== undefined) updateData.latitud = data.latitud;
    if (data.longitud !== undefined) updateData.longitud = data.longitud;
    if (data.metadataExif !== undefined)
      updateData.metadata_exif = data.metadataExif;
    if (data.tieneMiniatura !== undefined)
      updateData.tiene_miniatura = data.tieneMiniatura;
    if (data.rutaMiniatura !== undefined)
      updateData.ruta_miniatura = data.rutaMiniatura;
    if (data.estaComprimida !== undefined)
      updateData.esta_comprimida = data.estaComprimida;
    if (data.sizeOriginalBytes !== undefined)
      updateData.tama_o_original_bytes = data.sizeOriginalBytes !== null
        ? BigInt(data.sizeOriginalBytes)
        : null; // ✅ Validate null before BigInt

    return await this.prisma.evidencias_fotograficas.update({
      where: { id_evidencia: id },
      data: updateData,
      include: this.fullIncludes,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.evidencias_fotograficas.delete({
      where: { id_evidencia: id },
    });
  }

  async findById(id: number): Promise<any | null> {
    return await this.prisma.evidencias_fotograficas.findUnique({
      where: { id_evidencia: id },
      include: this.fullIncludes,
    });
  }

  async findByOrden(ordenId: number): Promise<any[]> {
    return await this.prisma.evidencias_fotograficas.findMany({
      where: { id_orden_servicio: ordenId },
      orderBy: [
        { es_principal: 'desc' },
        { orden_visualizacion: 'asc' },
        { fecha_captura: 'desc' },
      ],
      include: this.fullIncludes,
    });
  }

  async findByActividad(actividadId: number): Promise<any[]> {
    return await this.prisma.evidencias_fotograficas.findMany({
      where: { id_actividad_ejecutada: actividadId },
      orderBy: [{ fecha_captura: 'desc' }],
      include: this.fullIncludes,
    });
  }

  async findAll(): Promise<any[]> {
    return await this.prisma.evidencias_fotograficas.findMany({
      orderBy: [{ fecha_captura: 'desc' }],
      include: this.fullIncludes,
    });
  }

  async desactivarPrincipales(
    ordenId: number,
    exceptoId?: number,
  ): Promise<void> {
    await this.prisma.evidencias_fotograficas.updateMany({
      where: {
        id_orden_servicio: ordenId,
        es_principal: true,
        ...(exceptoId && { id_evidencia: { not: exceptoId } }),
      },
      data: {
        es_principal: false,
      },
    });
  }
}

