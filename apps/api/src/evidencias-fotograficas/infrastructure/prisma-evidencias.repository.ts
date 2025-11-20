import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IEvidenciasRepository } from '../domain/evidencias.repository.interface';

/**
 * PrismaEvidenciasRepository - Implementación Prisma evidencias fotográficas
 * FASE 4.3 - CRUD con Cloudinary URL storage
 */

@Injectable()
export class PrismaEvidenciasRepository implements IEvidenciasRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(data: any): Promise<any> {
    if (data.id_evidencia) {
      // UPDATE
      return await this.prisma.evidencias_fotograficas.update({
        where: { id_evidencia: data.id_evidencia },
        data: {
          descripcion: data.descripcion,
          orden_visualizacion: data.orden_visualizacion,
          es_principal: data.es_principal,
          metadata_exif: data.metadata_exif,
        },
        include: this.getFullIncludes(),
      });
    } else {
      // CREATE
      return await this.prisma.evidencias_fotograficas.create({
        data: {
          id_orden_servicio: data.id_orden_servicio,
          id_actividad_ejecutada: data.id_actividad_ejecutada,
          tipo_evidencia: data.tipo_evidencia,
          descripcion: data.descripcion,
          nombre_archivo: data.nombre_archivo,
          ruta_archivo: data.ruta_archivo,
          hash_sha256: data.hash_sha256,
          tama_o_bytes: data.tama_o_bytes,
          mime_type: data.mime_type ?? 'image/jpeg',
          ancho_pixels: data.ancho_pixels,
          alto_pixels: data.alto_pixels,
          orden_visualizacion: data.orden_visualizacion,
          es_principal: data.es_principal ?? false,
          fecha_captura: data.fecha_captura ?? new Date(),
          capturada_por: data.capturada_por,
          latitud: data.latitud,
          longitud: data.longitud,
          metadata_exif: data.metadata_exif,
          tiene_miniatura: data.tiene_miniatura ?? false,
          ruta_miniatura: data.ruta_miniatura,
          esta_comprimida: data.esta_comprimida ?? false,
          tama_o_original_bytes: data.tama_o_original_bytes,
          fecha_registro: new Date(),
        },
        include: this.getFullIncludes(),
      });
    }
  }

  async findById(id: number): Promise<any | null> {
    return await this.prisma.evidencias_fotograficas.findUnique({
      where: { id_evidencia: id },
      include: this.getFullIncludes(),
    });
  }

  async findByOrden(id_orden_servicio: number): Promise<any[]> {
    return await this.prisma.evidencias_fotograficas.findMany({
      where: { id_orden_servicio },
      orderBy: [
        { es_principal: 'desc' }, // Principal primero
        { orden_visualizacion: 'asc' },
        { fecha_captura: 'desc' },
      ],
      include: this.getFullIncludes(),
    });
  }

  async findByActividad(id_actividad_ejecutada: number): Promise<any[]> {
    return await this.prisma.evidencias_fotograficas.findMany({
      where: { id_actividad_ejecutada },
      orderBy: [{ fecha_captura: 'desc' }],
      include: this.getFullIncludes(),
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.evidencias_fotograficas.delete({
      where: { id_evidencia: id },
    });
  }

  private getFullIncludes() {
    return {
      ordenes_servicio: true, // ✅ FIX: Simplificado
      actividades_ejecutadas: true,
      empleados: {
        include: {
          persona: true, // ✅ FIX: true en vez de select
        },
      },
    };
  }
}
