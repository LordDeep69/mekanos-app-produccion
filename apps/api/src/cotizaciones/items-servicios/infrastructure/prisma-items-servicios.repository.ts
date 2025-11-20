// Infrastructure Repository - Prisma Items Servicios

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { ItemsCotizacionServiciosRepository } from '../domain/items-cotizacion-servicios.repository.interface';
import { ItemCotizacionServicio } from '../domain/item-cotizacion-servicio.entity';

@Injectable()
export class PrismaItemsServiciosRepository
  implements ItemsCotizacionServiciosRepository
{
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper para mapear de Prisma a Entity Domain
   * Convierte null a undefined, Decimal a Number
   */
  private mapToEntity(item: any): ItemCotizacionServicio {
    return new ItemCotizacionServicio({
      id_item_servicio: item.id_item_servicio,
      id_cotizacion: item.id_cotizacion,
      id_servicio: item.id_servicio,
      cantidad: item.cantidad ? Number(item.cantidad) : 1,
      unidad: item.unidad ?? undefined,
      precio_unitario: Number(item.precio_unitario),
      descuento_porcentaje: item.descuento_porcentaje
        ? Number(item.descuento_porcentaje)
        : 0,
      subtotal: item.subtotal ? Number(item.subtotal) : undefined,
      descripcion_personalizada: item.descripcion_personalizada ?? undefined,
      observaciones: item.observaciones ?? undefined,
      justificacion_precio: item.justificacion_precio ?? undefined,
      orden_item: item.orden_item ?? undefined,
      fecha_registro: item.fecha_registro ?? undefined,
      registrado_por: item.registrado_por ?? undefined,
      cotizacion: item.cotizacion ?? undefined,
      servicio: item.servicio ?? undefined,
      usuario: item.usuarios ?? undefined,
    });
  }

  async save(
    data: Partial<ItemCotizacionServicio>,
  ): Promise<ItemCotizacionServicio> {
    // Calcular subtotal antes de guardar
    const itemTemp = new ItemCotizacionServicio(data);
    const subtotalCalculado = itemTemp.calcularSubtotal();

    const itemCreado = await this.prisma.items_cotizacion_servicios.create({
      data: {
        id_cotizacion: data.id_cotizacion!,
        id_servicio: data.id_servicio!,
        cantidad: data.cantidad ?? 1,
        unidad: data.unidad ?? 'servicio',
        precio_unitario: data.precio_unitario!,
        descuento_porcentaje: data.descuento_porcentaje ?? 0,
        subtotal: subtotalCalculado,
        descripcion_personalizada: data.descripcion_personalizada,
        observaciones: data.observaciones,
        justificacion_precio: data.justificacion_precio,
        orden_item: data.orden_item,
        registrado_por: data.registrado_por,
      },
    });

    return this.mapToEntity(itemCreado);
  }

  async findById(
    id: number,
    includeRelations?: {
      includeCotizacion?: boolean;
      includeServicio?: boolean;
      includeUsuario?: boolean;
    },
  ): Promise<ItemCotizacionServicio | null> {
    const item = await this.prisma.items_cotizacion_servicios.findUnique({
      where: { id_item_servicio: id },
      include: {
        cotizacion: includeRelations?.includeCotizacion ?? false,
        servicio: includeRelations?.includeServicio ?? false,
        usuarios: includeRelations?.includeUsuario ?? false,
      },
    });

    return item ? this.mapToEntity(item) : null;
  }

  async findByCotizacionId(
    idCotizacion: number,
    includeRelations?: {
      includeServicio?: boolean;
      includeUsuario?: boolean;
    },
  ): Promise<ItemCotizacionServicio[]> {
    const items = await this.prisma.items_cotizacion_servicios.findMany({
      where: { id_cotizacion: idCotizacion },
      include: {
        servicio: includeRelations?.includeServicio ?? false,
        usuarios: includeRelations?.includeUsuario ?? false,
      },
      orderBy: { orden_item: 'asc' },
    });

    return items.map((item) => this.mapToEntity(item));
  }

  async update(
    id: number,
    data: Partial<ItemCotizacionServicio>,
  ): Promise<ItemCotizacionServicio> {
    // Obtener item existente SIEMPRE para tener valores actuales
    const itemExistente = await this.findById(id);
    if (!itemExistente) {
      throw new Error(`Item servicio ${id} no encontrado`);
    }

    // Si se actualizan campos que afectan el subtotal, recalcular
    let subtotalCalculado: number;
    
    if (
      data.cantidad !== undefined ||
      data.precio_unitario !== undefined ||
      data.descuento_porcentaje !== undefined
    ) {
      const itemTemp = new ItemCotizacionServicio({
        ...itemExistente,
        ...data,
      });
      subtotalCalculado = itemTemp.calcularSubtotal();
    } else {
      subtotalCalculado = itemExistente.subtotal || 0;
    }

    // Construir objeto update solo con campos definidos
    const updateData: any = {
      subtotal: subtotalCalculado, // SIEMPRE actualizar
    };

    if (data.cantidad !== undefined) updateData.cantidad = data.cantidad;
    if (data.unidad !== undefined) updateData.unidad = data.unidad;
    if (data.precio_unitario !== undefined) updateData.precio_unitario = data.precio_unitario;
    if (data.descuento_porcentaje !== undefined) updateData.descuento_porcentaje = data.descuento_porcentaje;
    if (data.descripcion_personalizada !== undefined) updateData.descripcion_personalizada = data.descripcion_personalizada;
    if (data.observaciones !== undefined) updateData.observaciones = data.observaciones;
    if (data.justificacion_precio !== undefined) updateData.justificacion_precio = data.justificacion_precio;
    if (data.orden_item !== undefined) updateData.orden_item = data.orden_item;

    const itemActualizado =
      await this.prisma.items_cotizacion_servicios.update({
        where: { id_item_servicio: id },
        data: updateData,
      });

    return this.mapToEntity(itemActualizado);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.items_cotizacion_servicios.delete({
      where: { id_item_servicio: id },
    });
  }

  async calcularSubtotalServicios(idCotizacion: number): Promise<number> {
    const result = await this.prisma.items_cotizacion_servicios.aggregate({
      where: { id_cotizacion: idCotizacion },
      _sum: {
        subtotal: true,
      },
    });

    return result._sum.subtotal ? Number(result._sum.subtotal) : 0;
  }
}
