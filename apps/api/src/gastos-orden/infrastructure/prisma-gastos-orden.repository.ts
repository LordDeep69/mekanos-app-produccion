import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
    CreateGastoOrdenData,
    IGastosOrdenRepository,
    UpdateGastoOrdenData,
} from '../domain/gastos-orden.repository.interface';

/**
 * Implementación Prisma del repositorio de gastos de orden
 * Tabla 13/14 - FASE 3
 * 
 * Relaciones incluidas:
 * - ordenes_servicio: CASCADE
 * - empleados: generado_por
 * - usuarios_gastos_orden_aprobado_porTousuarios: aprobado_por
 */
@Injectable()
export class PrismaGastosOrdenRepository implements IGastosOrdenRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Includes estándar para relaciones
   * Usa fecha_programada (NO fecha_servicio)
   */
  private readonly includeRelations = {
    ordenes_servicio: {
      select: {
        id_orden_servicio: true,
        numero_orden: true,
        fecha_programada: true,
      },
    },
    empleados: {
      select: {
        id_empleado: true,
        codigo_empleado: true,
      },
    },
    usuarios_gastos_orden_aprobado_porTousuarios: {
      select: {
        id_usuario: true,
        username: true,
      },
    },
  };

  async create(data: CreateGastoOrdenData): Promise<any> {
    return this.prisma.gastos_orden.create({
      data: {
        id_orden_servicio: data.idOrdenServicio,
        tipo_gasto: data.tipoGasto as any,
        descripcion: data.descripcion,
        justificacion: data.justificacion,
        valor: data.valor,
        tiene_comprobante: data.tieneComprobante ?? false,
        numero_comprobante: data.numeroComprobante,
        proveedor: data.proveedor,
        ruta_comprobante: data.rutaComprobante,
        requiere_aprobacion: data.requiereAprobacion ?? false,
        estado_aprobacion: (data.estadoAprobacion as any) ?? 'PENDIENTE',
        observaciones_aprobacion: data.observacionesAprobacion,
        fecha_gasto: data.fechaGasto ? new Date(data.fechaGasto) : null,
        generado_por: data.generadoPor,
        observaciones: data.observaciones,
        registrado_por: data.registradoPor,
      },
      include: this.includeRelations,
    });
  }

  async findAll(): Promise<any[]> {
    return this.prisma.gastos_orden.findMany({
      include: this.includeRelations,
      orderBy: { id_gasto: 'desc' },
    });
  }

  async findById(idGasto: number): Promise<any | null> {
    return this.prisma.gastos_orden.findUnique({
      where: { id_gasto: idGasto },
      include: this.includeRelations,
    });
  }

  async findByOrdenServicio(idOrdenServicio: number): Promise<any[]> {
    return this.prisma.gastos_orden.findMany({
      where: { id_orden_servicio: idOrdenServicio },
      include: this.includeRelations,
      orderBy: { id_gasto: 'desc' },
    });
  }

  async update(idGasto: number, data: UpdateGastoOrdenData): Promise<any> {
    const updateData: any = {};

    if (data.tipoGasto !== undefined) updateData.tipo_gasto = data.tipoGasto;
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
    if (data.justificacion !== undefined) updateData.justificacion = data.justificacion;
    if (data.valor !== undefined) updateData.valor = data.valor;
    if (data.tieneComprobante !== undefined) updateData.tiene_comprobante = data.tieneComprobante;
    if (data.numeroComprobante !== undefined) updateData.numero_comprobante = data.numeroComprobante;
    if (data.proveedor !== undefined) updateData.proveedor = data.proveedor;
    if (data.rutaComprobante !== undefined) updateData.ruta_comprobante = data.rutaComprobante;
    if (data.requiereAprobacion !== undefined) updateData.requiere_aprobacion = data.requiereAprobacion;
    if (data.estadoAprobacion !== undefined) updateData.estado_aprobacion = data.estadoAprobacion;
    if (data.observacionesAprobacion !== undefined) updateData.observaciones_aprobacion = data.observacionesAprobacion;
    if (data.fechaGasto !== undefined) updateData.fecha_gasto = new Date(data.fechaGasto);
    if (data.generadoPor !== undefined) updateData.generado_por = data.generadoPor;
    if (data.aprobadoPor !== undefined) updateData.aprobado_por = data.aprobadoPor;
    if (data.fechaAprobacion !== undefined) updateData.fecha_aprobacion = new Date(data.fechaAprobacion);
    if (data.observaciones !== undefined) updateData.observaciones = data.observaciones;
    if (data.modificadoPor !== undefined) updateData.modificado_por = data.modificadoPor;

    return this.prisma.gastos_orden.update({
      where: { id_gasto: idGasto },
      data: updateData,
      include: this.includeRelations,
    });
  }

  async delete(idGasto: number): Promise<void> {
    await this.prisma.gastos_orden.delete({
      where: { id_gasto: idGasto },
    });
  }
}
