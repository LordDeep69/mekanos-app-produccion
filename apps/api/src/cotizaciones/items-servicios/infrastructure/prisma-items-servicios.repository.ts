// Infrastructure Repository - Prisma Items Servicios (EAM-CPQ Universal)

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { ItemsCotizacionServiciosRepository } from '../domain/items-cotizacion-servicios.repository.interface';
import { ItemCotizacionServicio } from '../domain/item-cotizacion-servicio.entity';

@Injectable()
export class PrismaItemsServiciosRepository implements ItemsCotizacionServiciosRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(item: any): ItemCotizacionServicio {
    return new ItemCotizacionServicio({
      id_item_servicio: item.id_item_servicio,
      id_cotizacion: item.id_cotizacion,
      id_servicio: item.id_servicio ?? undefined,
      id_equipo: item.id_equipo ?? undefined,
      cantidad: item.cantidad ? Number(item.cantidad) : 1,
      unidad: item.unidad ?? undefined,
      costo_unitario:
        item.costo_unitario !== null && item.costo_unitario !== undefined
          ? Number(item.costo_unitario)
          : 0,
      precio_unitario: Number(item.precio_unitario),
      descuento_porcentaje: item.descuento_porcentaje ? Number(item.descuento_porcentaje) : 0,
      subtotal: item.subtotal !== null && item.subtotal !== undefined ? Number(item.subtotal) : undefined,
      es_opcional: Boolean(item.es_opcional),
      iva_aplicable: item.iva_aplicable !== false,
      seccion_titulo: item.seccion_titulo ?? undefined,
      descripcion_personalizada: item.descripcion_personalizada ?? undefined,
      observaciones: item.observaciones ?? undefined,
      justificacion_precio: item.justificacion_precio ?? undefined,
      orden_item: item.orden_item ?? undefined,
      fecha_registro: item.fecha_registro ?? undefined,
      registrado_por: item.registrado_por ?? undefined,
      cotizacion: item.cotizaciones ?? item.cotizacion ?? undefined,
      servicio: item.catalogo_servicios ?? item.servicio ?? undefined,
      equipo: item.equipos ?? undefined,
      usuario: item.usuarios ?? undefined,
    });
  }

  async save(data: Partial<ItemCotizacionServicio>): Promise<ItemCotizacionServicio> {
    const itemTemp = new ItemCotizacionServicio(data);
    const subtotalCalculado = itemTemp.calcularSubtotal();

    const itemCreado = await this.prisma.items_cotizacion_servicios.create({
      data: {
        id_cotizacion: data.id_cotizacion!,
        id_servicio: data.id_servicio ?? null,
        id_equipo: data.id_equipo ?? null,
        cantidad: data.cantidad ?? 1,
        unidad: data.unidad ?? 'servicio',
        costo_unitario: data.costo_unitario ?? 0,
        precio_unitario: data.precio_unitario ?? 0,
        descuento_porcentaje: data.descuento_porcentaje ?? 0,
        subtotal: subtotalCalculado,
        es_opcional: Boolean(data.es_opcional),
        iva_aplicable: data.iva_aplicable !== false,
        seccion_titulo: data.seccion_titulo,
        descripcion_personalizada: data.descripcion_personalizada,
        observaciones: data.observaciones,
        justificacion_precio: data.justificacion_precio,
        orden_item: data.orden_item,
        registrado_por: data.registrado_por,
      },
      include: {
        catalogo_servicios: true,
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
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
        cotizaciones: includeRelations?.includeCotizacion ?? false,
        catalogo_servicios: includeRelations?.includeServicio ?? false,
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
      },
    });

    if (!item) return null;

    if (includeRelations?.includeUsuario && item.registrado_por) {
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id_usuario: item.registrado_por },
      });
      return this.mapToEntity({ ...item, usuarios: usuario });
    }

    return this.mapToEntity(item);
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
        catalogo_servicios: includeRelations?.includeServicio ?? false,
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
      },
      orderBy: [{ orden_item: 'asc' }, { id_item_servicio: 'asc' }],
    });

    if (includeRelations?.includeUsuario) {
      const userIds = Array.from(
        new Set(items.map((i) => i.registrado_por).filter((u): u is number => u !== null)),
      );
      const usuarios = userIds.length
        ? await this.prisma.usuarios.findMany({ where: { id_usuario: { in: userIds } } })
        : [];
      const userMap = new Map(usuarios.map((u) => [u.id_usuario, u]));
      return items.map((item) =>
        this.mapToEntity({
          ...item,
          usuarios: item.registrado_por ? userMap.get(item.registrado_por) : undefined,
        }),
      );
    }

    return items.map((item) => this.mapToEntity(item));
  }

  async update(id: number, data: Partial<ItemCotizacionServicio>): Promise<ItemCotizacionServicio> {
    const itemExistente = await this.findById(id);
    if (!itemExistente) {
      throw new Error(`Item servicio ${id} no encontrado`);
    }

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

    const updateData: any = {
      subtotal: subtotalCalculado,
    };

    if (data.id_equipo !== undefined) updateData.id_equipo = data.id_equipo;
    if (data.cantidad !== undefined) updateData.cantidad = data.cantidad;
    if (data.unidad !== undefined) updateData.unidad = data.unidad;
    if (data.costo_unitario !== undefined) updateData.costo_unitario = data.costo_unitario;
    if (data.precio_unitario !== undefined) updateData.precio_unitario = data.precio_unitario;
    if (data.descuento_porcentaje !== undefined)
      updateData.descuento_porcentaje = data.descuento_porcentaje;
    if (data.es_opcional !== undefined) updateData.es_opcional = data.es_opcional;
    if (data.iva_aplicable !== undefined) updateData.iva_aplicable = data.iva_aplicable;
    if (data.seccion_titulo !== undefined) updateData.seccion_titulo = data.seccion_titulo;
    if (data.descripcion_personalizada !== undefined)
      updateData.descripcion_personalizada = data.descripcion_personalizada;
    if (data.observaciones !== undefined) updateData.observaciones = data.observaciones;
    if (data.justificacion_precio !== undefined)
      updateData.justificacion_precio = data.justificacion_precio;
    if (data.orden_item !== undefined) updateData.orden_item = data.orden_item;

    const itemActualizado = await this.prisma.items_cotizacion_servicios.update({
      where: { id_item_servicio: id },
      data: updateData,
      include: {
        catalogo_servicios: true,
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
      },
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
      where: { id_cotizacion: idCotizacion, es_opcional: false },
      _sum: {
        subtotal: true,
      },
    });

    return result._sum.subtotal ? Number(result._sum.subtotal) : 0;
  }
}
