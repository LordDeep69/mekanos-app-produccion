import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IMedicionesRepository } from '../domain/mediciones.repository.interface';

/**
 * PrismaMedicionesRepository - Implementación con Prisma ORM - REFACTORIZADO
 * Tabla 10/14 - FASE 3 - camelCase + 3 includes + conversión Decimal
 */

@Injectable()
export class PrismaMedicionesRepository implements IMedicionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private get fullIncludes() {
    return {
      empleados: true, // ⚠️ PLURAL (consistente con Tabla 9)
      ordenes_servicio: true, // singular
      parametros_medicion: true, // singular
    };
  }

  /**
   * CREATE medición
   */
  async create(data: {
    idOrdenServicio: number;
    idParametroMedicion: number;
    valorNumerico?: number;
    valorTexto?: string;
    nivelAlerta?: string;
    mensajeAlerta?: string;
    observaciones?: string;
    temperaturaAmbiente?: number;
    humedadRelativa?: number;
    fechaMedicion?: Date;
    medidoPor?: number;
    instrumentoMedicion?: string;
  }): Promise<any> {
    return await this.prisma.mediciones_servicio.create({
      data: {
        id_orden_servicio: data.idOrdenServicio,
        id_parametro_medicion: data.idParametroMedicion,
        valor_numerico: data.valorNumerico,
        valor_texto: data.valorTexto,
        nivel_alerta: data.nivelAlerta as any,
        mensaje_alerta: data.mensajeAlerta,
        observaciones: data.observaciones,
        temperatura_ambiente: data.temperaturaAmbiente,
        humedad_relativa: data.humedadRelativa,
        fecha_medicion: data.fechaMedicion ?? new Date(),
        medido_por: data.medidoPor,
        instrumento_medicion: data.instrumentoMedicion,
        // ⚠️ Trigger BD establece: fuera_de_rango, unidad_medida
        fecha_registro: new Date(),
      },
      include: this.fullIncludes,
    });
  }

  /**
   * UPDATE medición
   */
  async update(
    id: number,
    data: {
      valorNumerico?: number;
      valorTexto?: string;
      nivelAlerta?: string;
      mensajeAlerta?: string;
      observaciones?: string;
      temperaturaAmbiente?: number;
      humedadRelativa?: number;
      fechaMedicion?: Date;
      instrumentoMedicion?: string;
    },
  ): Promise<any> {
    // Spread dinámico para solo actualizar campos provistos
    const updateData: any = {};
    if (data.valorNumerico !== undefined)
      updateData.valor_numerico = data.valorNumerico;
    if (data.valorTexto !== undefined)
      updateData.valor_texto = data.valorTexto;
    if (data.nivelAlerta !== undefined)
      updateData.nivel_alerta = data.nivelAlerta;
    if (data.mensajeAlerta !== undefined)
      updateData.mensaje_alerta = data.mensajeAlerta;
    if (data.observaciones !== undefined)
      updateData.observaciones = data.observaciones;
    if (data.temperaturaAmbiente !== undefined)
      updateData.temperatura_ambiente = data.temperaturaAmbiente;
    if (data.humedadRelativa !== undefined)
      updateData.humedad_relativa = data.humedadRelativa;
    if (data.fechaMedicion !== undefined)
      updateData.fecha_medicion = data.fechaMedicion;
    if (data.instrumentoMedicion !== undefined)
      updateData.instrumento_medicion = data.instrumentoMedicion;

    return await this.prisma.mediciones_servicio.update({
      where: { id_medicion: id },
      data: updateData,
      include: this.fullIncludes,
    });
  }

  /**
   * DELETE medición (físico - NO soft delete)
   */
  async delete(id: number): Promise<void> {
    await this.prisma.mediciones_servicio.delete({
      where: { id_medicion: id },
    });
  }

  /**
   * READ ONE - por ID con includes
   */
  async findById(id: number): Promise<any> {
    return await this.prisma.mediciones_servicio.findUnique({
      where: { id_medicion: id },
      include: this.fullIncludes,
    });
  }

  /**
   * READ por orden de servicio con includes
   * Ordenado por: fecha_medicion DESC
   */
  async findByOrden(ordenId: number): Promise<any[]> {
    return await this.prisma.mediciones_servicio.findMany({
      where: { id_orden_servicio: ordenId },
      include: this.fullIncludes,
      orderBy: [{ fecha_medicion: 'desc' }],
    });
  }

  /**
   * READ ALL con includes
   * Ordenado por: fecha_registro DESC
   */
  async findAll(): Promise<any[]> {
    return await this.prisma.mediciones_servicio.findMany({
      include: this.fullIncludes,
      orderBy: [{ fecha_registro: 'desc' }],
    });
  }

  // Método legacy save() para compatibilidad con update-handler existente
  async save(data: any): Promise<any> {
    if (data.idMedicion) {
      return this.update(data.idMedicion, data);
    }
    return this.create(data);
  }
}
