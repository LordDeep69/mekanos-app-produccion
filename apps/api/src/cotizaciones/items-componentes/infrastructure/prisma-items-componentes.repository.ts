// Infrastructure Repository - Prisma Items Componentes

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { ItemsCotizacionComponentesRepository } from '../domain/items-cotizacion-componentes.repository.interface';
import { ItemCotizacionComponente } from '../domain/item-cotizacion-componente.entity';

@Injectable()
export class PrismaItemsComponentesRepository
  implements ItemsCotizacionComponentesRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(item: any): ItemCotizacionComponente {
    return new ItemCotizacionComponente({
      id_item_componente: item.id_item_componente,
      id_cotizacion: item.id_cotizacion,
      id_componente: item.id_componente ?? undefined,
      id_tipo_componente: item.id_tipo_componente,
      descripcion: item.descripcion,
      referencia_manual: item.referencia_manual ?? undefined,
      marca_manual: item.marca_manual ?? undefined,
      cantidad: item.cantidad ? Number(item.cantidad) : 1,
      unidad: item.unidad ?? undefined,
      precio_unitario: Number(item.precio_unitario),
      descuento_porcentaje: item.descuento_porcentaje
        ? Number(item.descuento_porcentaje)
        : 0,
      subtotal: item.subtotal ? Number(item.subtotal) : undefined,
      garantia_meses: item.garantia_meses ?? undefined,
      observaciones_garantia: item.observaciones_garantia ?? undefined,
      observaciones: item.observaciones ?? undefined,
      orden_item: item.orden_item ?? undefined,
      fecha_registro: item.fecha_registro ?? undefined,
      registrado_por: item.registrado_por ?? undefined,
      cotizacion: item.cotizacion ?? undefined,
      componente: item.catalogo_componentes ?? undefined,
      tipo_componente: item.tipos_componente ?? undefined,
      usuario: item.usuarios ?? undefined,
    });
  }

  async save(
    data: Partial<ItemCotizacionComponente>,
  ): Promise<ItemCotizacionComponente> {
    const itemTemp = new ItemCotizacionComponente(data);
    const subtotalCalculado = itemTemp.calcularSubtotal();

    const itemCreado = await this.prisma.items_cotizacion_componentes.create({
      data: {
        id_cotizacion: data.id_cotizacion!,
        id_componente: data.id_componente,
        id_tipo_componente: data.id_tipo_componente!,
        descripcion: data.descripcion!,
        referencia_manual: data.referencia_manual,
        marca_manual: data.marca_manual,
        cantidad: data.cantidad ?? 1,
        unidad: data.unidad ?? 'unidad',
        precio_unitario: data.precio_unitario!,
        descuento_porcentaje: data.descuento_porcentaje ?? 0,
        subtotal: subtotalCalculado,
        garantia_meses: data.garantia_meses,
        observaciones_garantia: data.observaciones_garantia,
        observaciones: data.observaciones,
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
      includeComponente?: boolean;
      includeTipoComponente?: boolean;
      includeUsuario?: boolean;
    },
  ): Promise<ItemCotizacionComponente | null> {
    const item = await this.prisma.items_cotizacion_componentes.findUnique({
      where: { id_item_componente: id },
      include: {
        cotizacion: includeRelations?.includeCotizacion ?? false,
        catalogo_componentes: includeRelations?.includeComponente ?? false,
        tipos_componente: includeRelations?.includeTipoComponente ?? false,
        usuarios: includeRelations?.includeUsuario ?? false,
      },
    });

    return item ? this.mapToEntity(item) : null;
  }

  async findByCotizacionId(
    idCotizacion: number,
    includeRelations?: {
      includeComponente?: boolean;
      includeTipoComponente?: boolean;
      includeUsuario?: boolean;
    },
  ): Promise<ItemCotizacionComponente[]> {
    const items = await this.prisma.items_cotizacion_componentes.findMany({
      where: { id_cotizacion: idCotizacion },
      include: {
        catalogo_componentes: includeRelations?.includeComponente ?? false,
        tipos_componente: includeRelations?.includeTipoComponente ?? false,
        usuarios: includeRelations?.includeUsuario ?? false,
      },
      orderBy: { orden_item: 'asc' },
    });

    return items.map((item) => this.mapToEntity(item));
  }

  async update(
    id: number,
    data: Partial<ItemCotizacionComponente>,
  ): Promise<ItemCotizacionComponente> {
    // Obtener item existente SIEMPRE para tener valores actuales
    const itemExistente = await this.findById(id);
    if (!itemExistente) {
      throw new Error(`Item componente ${id} no encontrado`);
    }

    // Si se actualizan campos que afectan el subtotal, recalcular
    let subtotalCalculado: number;

    if (
      data.cantidad !== undefined ||
      data.precio_unitario !== undefined ||
      data.descuento_porcentaje !== undefined
    ) {
      const itemTemp = new ItemCotizacionComponente({
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

    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
    if (data.referencia_manual !== undefined) updateData.referencia_manual = data.referencia_manual;
    if (data.marca_manual !== undefined) updateData.marca_manual = data.marca_manual;
    if (data.cantidad !== undefined) updateData.cantidad = data.cantidad;
    if (data.unidad !== undefined) updateData.unidad = data.unidad;
    if (data.precio_unitario !== undefined) updateData.precio_unitario = data.precio_unitario;
    if (data.descuento_porcentaje !== undefined) updateData.descuento_porcentaje = data.descuento_porcentaje;
    if (data.garantia_meses !== undefined) updateData.garantia_meses = data.garantia_meses;
    if (data.observaciones_garantia !== undefined) updateData.observaciones_garantia = data.observaciones_garantia;
    if (data.observaciones !== undefined) updateData.observaciones = data.observaciones;
    if (data.orden_item !== undefined) updateData.orden_item = data.orden_item;

    const itemActualizado =
      await this.prisma.items_cotizacion_componentes.update({
        where: { id_item_componente: id },
        data: updateData,
      });

    return this.mapToEntity(itemActualizado);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.items_cotizacion_componentes.delete({
      where: { id_item_componente: id },
    });
  }

  async calcularSubtotalComponentes(idCotizacion: number): Promise<number> {
    const result = await this.prisma.items_cotizacion_componentes.aggregate({
      where: { id_cotizacion: idCotizacion },
      _sum: {
        subtotal: true,
      },
    });

    return result._sum.subtotal ? Number(result._sum.subtotal) : 0;
  }
}
