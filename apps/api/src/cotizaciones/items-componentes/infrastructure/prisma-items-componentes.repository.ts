// Infrastructure Repository - Prisma Items Componentes (EAM-CPQ Universal)

import { Injectable } from '@nestjs/common';
import { PrismaService } from '@mekanos/database';
import { ItemsCotizacionComponentesRepository } from '../domain/items-cotizacion-componentes.repository.interface';
import { ItemCotizacionComponente } from '../domain/item-cotizacion-componente.entity';

@Injectable()
export class PrismaItemsComponentesRepository implements ItemsCotizacionComponentesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(item: any): ItemCotizacionComponente {
    return new ItemCotizacionComponente({
      id_item_componente: item.id_item_componente,
      id_cotizacion: item.id_cotizacion,
      id_componente: item.id_componente ?? undefined,
      id_tipo_componente: item.id_tipo_componente ?? undefined,
      id_equipo: item.id_equipo ?? undefined,
      descripcion: item.descripcion,
      referencia_manual: item.referencia_manual ?? undefined,
      marca_manual: item.marca_manual ?? undefined,
      cantidad: item.cantidad ? Number(item.cantidad) : 1,
      unidad: item.unidad ?? undefined,
      costo_unitario: item.costo_unitario !== null && item.costo_unitario !== undefined ? Number(item.costo_unitario) : 0,
      precio_unitario: Number(item.precio_unitario),
      descuento_porcentaje: item.descuento_porcentaje ? Number(item.descuento_porcentaje) : 0,
      subtotal: item.subtotal !== null && item.subtotal !== undefined ? Number(item.subtotal) : undefined,
      es_opcional: Boolean(item.es_opcional),
      iva_aplicable: item.iva_aplicable !== false,
      seccion_titulo: item.seccion_titulo ?? undefined,
      garantia_meses: item.garantia_meses ?? undefined,
      observaciones_garantia: item.observaciones_garantia ?? undefined,
      observaciones: item.observaciones ?? undefined,
      orden_item: item.orden_item ?? undefined,
      fecha_registro: item.fecha_registro ?? undefined,
      registrado_por: item.registrado_por ?? undefined,
      cotizacion: item.cotizaciones ?? item.cotizacion ?? undefined,
      componente: item.catalogo_componentes ?? undefined,
      tipo_componente: item.tipos_componente ?? undefined,
      equipo: item.equipos ?? undefined,
      usuario: item.usuarios ?? undefined,
    });
  }

  async save(data: Partial<ItemCotizacionComponente>): Promise<ItemCotizacionComponente> {
    const itemTemp = new ItemCotizacionComponente(data);
    const subtotalCalculado = itemTemp.calcularSubtotal();

    let costoUnitario = data.costo_unitario;
    let idTipoComponente = data.id_tipo_componente ?? null;
    if (data.id_componente && (costoUnitario === undefined || idTipoComponente === null)) {
      const comp = await this.prisma.catalogo_componentes.findUnique({
        where: { id_componente: data.id_componente },
        select: { precio_compra: true, id_tipo_componente: true },
      });
      if (comp) {
        if (costoUnitario === undefined && comp.precio_compra !== null) {
          costoUnitario = Number(comp.precio_compra);
        }
        if (idTipoComponente === null && comp.id_tipo_componente) {
          idTipoComponente = comp.id_tipo_componente;
        }
      }
    }

    const itemCreado = await this.prisma.items_cotizacion_componentes.create({
      data: {
        id_cotizacion: data.id_cotizacion!,
        id_componente: data.id_componente ?? null,
        id_tipo_componente: idTipoComponente,
        id_equipo: data.id_equipo ?? null,
        descripcion: data.descripcion!,
        referencia_manual: data.referencia_manual,
        marca_manual: data.marca_manual,
        cantidad: data.cantidad ?? 1,
        unidad: data.unidad ?? 'unidad',
        costo_unitario: costoUnitario ?? 0,
        precio_unitario: data.precio_unitario ?? 0,
        descuento_porcentaje: data.descuento_porcentaje ?? 0,
        subtotal: subtotalCalculado,
        es_opcional: Boolean(data.es_opcional),
        iva_aplicable: data.iva_aplicable !== false,
        seccion_titulo: data.seccion_titulo,
        garantia_meses: data.garantia_meses,
        observaciones_garantia: data.observaciones_garantia,
        observaciones: data.observaciones,
        orden_item: data.orden_item,
        registrado_por: data.registrado_por,
      },
      include: {
        catalogo_componentes: true,
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
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
        cotizaciones: includeRelations?.includeCotizacion ?? false,
        catalogo_componentes: includeRelations?.includeComponente ?? false,
        tipos_componente: includeRelations?.includeTipoComponente ?? false,
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
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
      },
      orderBy: [{ orden_item: 'asc' }, { id_item_componente: 'asc' }],
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

  async update(
    id: number,
    data: Partial<ItemCotizacionComponente>,
  ): Promise<ItemCotizacionComponente> {
    const itemExistente = await this.findById(id);
    if (!itemExistente) {
      throw new Error(`Item componente ${id} no encontrado`);
    }

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

    const updateData: any = {
      subtotal: subtotalCalculado,
    };

    if (data.id_equipo !== undefined) updateData.id_equipo = data.id_equipo;
    if (data.id_tipo_componente !== undefined) updateData.id_tipo_componente = data.id_tipo_componente;
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
    if (data.referencia_manual !== undefined) updateData.referencia_manual = data.referencia_manual;
    if (data.marca_manual !== undefined) updateData.marca_manual = data.marca_manual;
    if (data.cantidad !== undefined) updateData.cantidad = data.cantidad;
    if (data.unidad !== undefined) updateData.unidad = data.unidad;
    if (data.costo_unitario !== undefined) updateData.costo_unitario = data.costo_unitario;
    if (data.precio_unitario !== undefined) updateData.precio_unitario = data.precio_unitario;
    if (data.descuento_porcentaje !== undefined)
      updateData.descuento_porcentaje = data.descuento_porcentaje;
    if (data.es_opcional !== undefined) updateData.es_opcional = data.es_opcional;
    if (data.iva_aplicable !== undefined) updateData.iva_aplicable = data.iva_aplicable;
    if (data.seccion_titulo !== undefined) updateData.seccion_titulo = data.seccion_titulo;
    if (data.garantia_meses !== undefined) updateData.garantia_meses = data.garantia_meses;
    if (data.observaciones_garantia !== undefined)
      updateData.observaciones_garantia = data.observaciones_garantia;
    if (data.observaciones !== undefined) updateData.observaciones = data.observaciones;
    if (data.orden_item !== undefined) updateData.orden_item = data.orden_item;

    const itemActualizado = await this.prisma.items_cotizacion_componentes.update({
      where: { id_item_componente: id },
      data: updateData,
      include: {
        catalogo_componentes: true,
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
      },
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
      where: { id_cotizacion: idCotizacion, es_opcional: false },
      _sum: {
        subtotal: true,
      },
    });

    return result._sum.subtotal ? Number(result._sum.subtotal) : 0;
  }
}
