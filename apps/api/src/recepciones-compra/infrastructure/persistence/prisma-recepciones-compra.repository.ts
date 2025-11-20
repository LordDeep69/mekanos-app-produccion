import { PrismaService } from '@mekanos/database';
import { Injectable } from '@nestjs/common';
import { recepciones_compra } from '@prisma/client';
import { CreateRecepcionCompraData, IRecepcionesCompraRepository } from '../../domain/recepciones-compra.repository';

@Injectable()
export class PrismaRecepcionesCompraRepository implements IRecepcionesCompraRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRecepcionCompraData): Promise<recepciones_compra> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener detalle de orden para saber componente
      const detalle = await tx.ordenes_compra_detalle.findUnique({
        where: { id_detalle: data.id_detalle_orden },
      });

      if (!detalle) {
        throw new Error(`Detalle de orden ${data.id_detalle_orden} no encontrado`);
      }

      if (detalle.id_orden_compra !== data.id_orden_compra) {
        throw new Error(`El detalle ${data.id_detalle_orden} no pertenece a la orden ${data.id_orden_compra}`);
      }

      // 2. Generar número de recepción
      const count = await tx.recepciones_compra.count();
      const numero_recepcion = `REC-${Date.now()}-${count + 1}`;

      // 3. Crear recepción
      const recepcion = await tx.recepciones_compra.create({
        data: {
          numero_recepcion,
          id_orden_compra: data.id_orden_compra,
          id_detalle_orden: data.id_detalle_orden,
          cantidad_recibida: data.cantidad_recibida,
          tipo_recepcion: data.tipo_recepcion,
          cantidad_aceptada: data.cantidad_aceptada,
          cantidad_rechazada: data.cantidad_rechazada,
          calidad: data.calidad,
          id_ubicacion_destino: data.id_ubicacion_destino,
          costo_unitario_real: data.costo_unitario_real || detalle.precio_unitario, // Usar precio orden si no hay real
          observaciones: data.observaciones,
          recibido_por: data.recibido_por,
        },
      });

      // 4. Crear movimiento de inventario (ENTRADA por COMPRA) si hay cantidad aceptada
      if (data.cantidad_aceptada > 0 && data.id_ubicacion_destino) {
        await tx.movimientos_inventario.create({
          data: {
            tipo_movimiento: 'ENTRADA',
            origen_movimiento: 'COMPRA',
            id_componente: detalle.id_componente,
            cantidad: data.cantidad_aceptada,
            costo_unitario: data.costo_unitario_real || detalle.precio_unitario,
            id_ubicacion: data.id_ubicacion_destino,
            id_orden_compra: data.id_orden_compra,
            observaciones: `Recepción OC ${data.id_orden_compra} - ${data.observaciones || ''}`,
            realizado_por: data.recibido_por,
          },
        });
      }

      // 5. Actualizar estado de la Orden de Compra (Simplificado)
      // Si la orden está ENVIADA, cambiar a PARCIAL al recibir
      const orden = await tx.ordenes_compra.findUnique({
        where: { id_orden_compra: data.id_orden_compra },
      });

      if (orden && orden.estado === 'ENVIADA') {
        await tx.ordenes_compra.update({
          where: { id_orden_compra: data.id_orden_compra },
          data: { estado: 'PARCIAL' }, // Lógica completa requeriría verificar totales
        });
      }

      return recepcion;
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    id_orden_compra?: number;
  }): Promise<{ data: recepciones_compra[]; total: number }> {
    const where = params.id_orden_compra ? { id_orden_compra: params.id_orden_compra } : {};
    
    const [data, total] = await Promise.all([
      this.prisma.recepciones_compra.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { fecha_recepcion: 'desc' },
        include: {
          orden_compra: {
            select: { numero_orden_compra: true }
          },
          ordenes_compra_detalle: {
            include: { catalogo_componentes: true }
          }
        }
      }),
      this.prisma.recepciones_compra.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: number): Promise<recepciones_compra | null> {
    return this.prisma.recepciones_compra.findUnique({
      where: { id_recepcion: id },
      include: {
        orden_compra: true,
        ordenes_compra_detalle: {
          include: { catalogo_componentes: true }
        }
      }
    });
  }

  async findByOrdenCompra(idOrdenCompra: number): Promise<recepciones_compra[]> {
    return this.prisma.recepciones_compra.findMany({
      where: { id_orden_compra: idOrdenCompra },
      orderBy: { fecha_recepcion: 'desc' },
    });
  }
}
