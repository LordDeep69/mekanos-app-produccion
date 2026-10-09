import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { recepciones_compra } from '@prisma/client';
import {
  CreateRecepcionCompraData,
  CreateRecepcionLoteData,
  IRecepcionesCompraRepository,
  ResultadoRecepcionLote,
} from '../../domain/recepciones-compra.repository';

@Injectable()
export class PrismaRecepcionesCompraRepository implements IRecepcionesCompraRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generación atómica del siguiente número correlativo determinista formal de Recepción de Compra.
   * Formato industrial estandarizado: REC-{YYYY}-{0001} (ej: REC-2026-0001).
   * Utiliza sequence_counter con bloqueo FOR UPDATE para serializar transacciones concurrentes.
   */
  private async generarSiguienteNumeroRecepcion(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const rows = await tx.$queryRawUnsafe(`
      SELECT id, current_value FROM sequence_counter
      WHERE type = 'REC' AND year = ${year}
      FOR UPDATE;
    `);

    let nextVal = 1;
    if (rows && rows.length > 0) {
      nextVal = Number(rows[0].current_value) + 1;
      await tx.$executeRawUnsafe(`
        UPDATE sequence_counter
        SET current_value = ${nextVal}, updated_at = NOW()
        WHERE id = ${rows[0].id};
      `);
    } else {
      const maxRes = await tx.$queryRawUnsafe(`
        SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM sequence_counter;
      `);
      const nextId = Number(maxRes[0]?.next_id || 200);
      await tx.$executeRawUnsafe(`
        INSERT INTO sequence_counter (id, type, year, current_value, created_at, updated_at)
        VALUES (${nextId}, 'REC', ${year}, 1, NOW(), NOW());
      `);
      nextVal = 1;
    }

    return `REC-${year}-${String(nextVal).padStart(4, '0')}`;
  }

  /**
   * Registra una recepción física de una sola línea de la orden
   */
  async create(data: CreateRecepcionCompraData): Promise<recepciones_compra> {
    const resultado = await this.createLote({
      id_orden_compra: data.id_orden_compra,
      recibido_por: data.recibido_por,
      id_ubicacion_destino: data.id_ubicacion_destino,
      observaciones: data.observaciones,
      items: [
        {
          id_detalle_orden: data.id_detalle_orden,
          cantidad_recibida: data.cantidad_recibida,
          cantidad_aceptada: data.cantidad_aceptada,
          cantidad_rechazada: data.cantidad_rechazada,
          calidad: data.calidad,
          id_ubicacion_destino: data.id_ubicacion_destino,
          observaciones: data.observaciones,
          costo_unitario_real: data.costo_unitario_real,
        },
      ],
    });

    return resultado.recepciones[0];
  }

  /**
   * Registra recepción física atómica por lote (múltiples líneas de una misma orden)
   * Valida saldos pendientes, consistencia de calidad, genera Kardex e incrementa stock en una transacción.
   */
  async createLote(data: CreateRecepcionLoteData): Promise<ResultadoRecepcionLote> {
    if (!data.items || data.items.length === 0) {
      throw new BadRequestException('Debe incluir al menos un ítem para registrar la recepción.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener y validar la Orden de Compra y sus líneas actuales
      const orden = await tx.ordenes_compra.findUnique({
        where: { id_orden_compra: data.id_orden_compra },
        include: {
          ordenes_compra_detalle: {
            include: {
              catalogo_componentes: true,
              recepciones_compra: true,
            },
          },
        },
      });

      if (!orden) {
        throw new NotFoundException(`Orden de compra ID ${data.id_orden_compra} no encontrada`);
      }

      if (orden.estado !== 'ENVIADA' && orden.estado !== 'PARCIAL') {
        throw new ConflictException(
          `No es posible registrar recepciones en una orden con estado '${orden.estado}'. Solo se admiten órdenes en estado 'ENVIADA' o 'PARCIAL'.`,
        );
      }

      // 2. Validaciones de negocio exhaustivas por cada línea antes de mutar
      for (const item of data.items) {
        const detalle = orden.ordenes_compra_detalle.find(
          (d) => d.id_detalle === item.id_detalle_orden,
        );

        if (!detalle) {
          throw new BadRequestException(
            `El detalle de orden ${item.id_detalle_orden} no pertenece a la orden ${data.id_orden_compra}.`,
          );
        }

        const cantPedida = Number(detalle.cantidad);
        const acumuladoPrevio = detalle.recepciones_compra.reduce(
          (acc, r) => acc + Number(r.cantidad_recibida),
          0,
        );
        const saldoPendiente = Math.max(0, cantPedida - acumuladoPrevio);

        if (Number(item.cantidad_recibida) <= 0) {
          throw new BadRequestException(
            `La cantidad recibida para el detalle #${detalle.id_detalle} debe ser mayor a 0.`,
          );
        }

        if (Number(item.cantidad_recibida) > saldoPendiente) {
          throw new BadRequestException(
            `La cantidad a recibir (${item.cantidad_recibida}) excede el saldo pendiente (${saldoPendiente}) de la línea #${detalle.id_detalle} (${detalle.catalogo_componentes?.descripcion_corta || 'Componente'}). Solicitado: ${cantPedida}, Recibido previo: ${acumuladoPrevio}.`,
          );
        }

        // Control de calidad: cantidad recibida = aceptada + rechazada
        const totalDeclarado = Number(item.cantidad_aceptada) + Number(item.cantidad_rechazada);
        if (Number(item.cantidad_recibida) !== totalDeclarado) {
          throw new BadRequestException(
            `Inconsistencia en línea #${detalle.id_detalle}: Cantidad recibida (${item.cantidad_recibida}) debe ser exactamente igual a la suma de aceptada (${item.cantidad_aceptada}) + rechazada (${item.cantidad_rechazada}).`,
          );
        }

        // Destino de mercancía aceptada
        const ubicacionDestino = item.id_ubicacion_destino || data.id_ubicacion_destino;
        if (Number(item.cantidad_aceptada) > 0 && !ubicacionDestino) {
          throw new BadRequestException(
            `Debe especificar una bodega / ubicación destino para la mercancía aceptada de la línea #${detalle.id_detalle}.`,
          );
        }

        if (ubicacionDestino) {
          const ubicacionExiste = await tx.ubicaciones_bodega.findUnique({
            where: { id_ubicacion: ubicacionDestino },
          });
          if (!ubicacionExiste) {
            throw new BadRequestException(
              `La ubicación de bodega ID ${ubicacionDestino} no existe en el sistema.`,
            );
          }
          if (!ubicacionExiste.activo) {
            throw new BadRequestException(
              `La ubicación de bodega '${ubicacionExiste.codigo_ubicacion}' se encuentra inactiva.`,
            );
          }
        }
      }

      // 3. Generar número correlativo formal determinista de recepción (único por despacho)
      const numero_recepcion = await this.generarSiguienteNumeroRecepcion(tx);

      // 4. Crear recepciones, movimientos de inventario e incrementar stock
      const recepcionesCreadas: recepciones_compra[] = [];

      for (const item of data.items) {
        const detalle = orden.ordenes_compra_detalle.find(
          (d) => d.id_detalle === item.id_detalle_orden,
        )!;
        const ubicacionDestino = item.id_ubicacion_destino || data.id_ubicacion_destino || null;

        // Determinar calidad de control físico
        let calidadFinal: 'OK' | 'PARCIAL_DA_ADO' | 'RECHAZADO' = 'OK';
        if (item.calidad) {
          calidadFinal = item.calidad;
        } else if (Number(item.cantidad_rechazada) > 0 && Number(item.cantidad_aceptada) === 0) {
          calidadFinal = 'RECHAZADO';
        } else if (Number(item.cantidad_rechazada) > 0 && Number(item.cantidad_aceptada) > 0) {
          calidadFinal = 'PARCIAL_DA_ADO';
        }

        // Determinar tipo de recepción por línea
        const acumuladoPrevio = detalle.recepciones_compra.reduce(
          (acc, r) => acc + Number(r.cantidad_recibida),
          0,
        );
        const nuevoAcumulado = acumuladoPrevio + Number(item.cantidad_recibida);
        const detalleCompletado = nuevoAcumulado >= Number(detalle.cantidad);
        const tipoFinal: 'PARCIAL' | 'FINAL' | 'UNICA' = detalleCompletado ? 'FINAL' : 'PARCIAL';

        const notasCompuestas = [
          data.guia_remision ? `Guía/Remisión: ${data.guia_remision}` : null,
          item.observaciones || null,
          data.observaciones || null,
        ]
          .filter(Boolean)
          .join(' • ')
          .normalize('NFC')
          .trim();

        // A. Crear registro en recepciones_compra
        const recepcion = await tx.recepciones_compra.create({
          data: {
            numero_recepcion,
            id_orden_compra: data.id_orden_compra,
            id_detalle_orden: item.id_detalle_orden,
            cantidad_recibida: item.cantidad_recibida,
            tipo_recepcion: tipoFinal,
            cantidad_aceptada: item.cantidad_aceptada,
            cantidad_rechazada: item.cantidad_rechazada,
            calidad: calidadFinal,
            id_ubicacion_destino: Number(item.cantidad_aceptada) > 0 ? ubicacionDestino : null,
            costo_unitario_real: item.costo_unitario_real || detalle.precio_unitario,
            observaciones: notasCompuestas || null,
            recibido_por: data.recibido_por,
          },
        });
        recepcionesCreadas.push(recepcion);

        // B. Movimiento inmutable de inventario (Kardex) si hay unidades aceptadas
        if (Number(item.cantidad_aceptada) > 0 && ubicacionDestino) {
          await tx.movimientos_inventario.create({
            data: {
              tipo_movimiento: 'ENTRADA',
              origen_movimiento: 'COMPRA',
              id_componente: detalle.id_componente,
              cantidad: item.cantidad_aceptada,
              costo_unitario: item.costo_unitario_real || detalle.precio_unitario,
              id_ubicacion: ubicacionDestino,
              id_orden_compra: data.id_orden_compra,
              justificacion: `Recepción ${numero_recepcion} de OC ${orden.numero_orden_compra}`,
              observaciones:
                notasCompuestas ||
                `Ingreso físico de ${item.cantidad_aceptada} unidades al almacén vía ${numero_recepcion}`,
              realizado_por: data.recibido_por,
            },
          });

          // C. Incrementar atómicamente stock_actual en catalogo_componentes
          await tx.catalogo_componentes.update({
            where: { id_componente: detalle.id_componente },
            data: {
              stock_actual: {
                increment: Math.round(Number(item.cantidad_aceptada)),
              },
              fecha_modificacion: new Date(),
              modificado_por: data.recibido_por,
            },
          });
        }
      }

      // 5. Evaluar y actualizar el estado de la Orden de Compra automáticamente
      const ordenActualizada = await tx.ordenes_compra.findUnique({
        where: { id_orden_compra: data.id_orden_compra },
        include: {
          ordenes_compra_detalle: {
            include: {
              recepciones_compra: true,
            },
          },
        },
      });

      let todasLineasCompletas = true;
      let algunaLineaRecibida = false;

      for (const det of ordenActualizada!.ordenes_compra_detalle) {
        const sumRecibido = det.recepciones_compra.reduce(
          (acc, r) => acc + Number(r.cantidad_recibida),
          0,
        );
        if (sumRecibido > 0) algunaLineaRecibida = true;
        if (sumRecibido < Number(det.cantidad)) {
          todasLineasCompletas = false;
        }
      }

      const nuevoEstado = todasLineasCompletas
        ? 'COMPLETADA'
        : algunaLineaRecibida
        ? 'PARCIAL'
        : orden.estado;

      if (orden.estado !== nuevoEstado) {
        await tx.ordenes_compra.update({
          where: { id_orden_compra: data.id_orden_compra },
          data: { estado: nuevoEstado },
        });
      }

      return {
        numero_recepcion,
        id_orden_compra: data.id_orden_compra,
        numero_orden_compra: orden.numero_orden_compra,
        nuevo_estado_orden: nuevoEstado,
        total_items_procesados: recepcionesCreadas.length,
        recepciones: recepcionesCreadas,
      };
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
          ordenes_compra: {
            select: {
              numero_orden_compra: true,
              id_proveedor: true,
              estado: true,
            },
          },
          ordenes_compra_detalle: {
            include: {
              catalogo_componentes: {
                select: {
                  id_componente: true,
                  codigo_interno: true,
                  referencia_fabricante: true,
                  descripcion_corta: true,
                  unidad_medida: true,
                },
              },
            },
          },
          ubicaciones_bodega: {
            select: {
              id_ubicacion: true,
              codigo_ubicacion: true,
              zona: true,
            },
          },
        },
      }),
      this.prisma.recepciones_compra.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: number): Promise<recepciones_compra | null> {
    return this.prisma.recepciones_compra.findUnique({
      where: { id_recepcion: id },
      include: {
        ordenes_compra: true,
        ordenes_compra_detalle: {
          include: {
            catalogo_componentes: true,
          },
        },
        ubicaciones_bodega: true,
      },
    });
  }

  async findByOrdenCompra(idOrdenCompra: number): Promise<recepciones_compra[]> {
    return this.prisma.recepciones_compra.findMany({
      where: { id_orden_compra: idOrdenCompra },
      orderBy: { fecha_recepcion: 'desc' },
      include: {
        ordenes_compra_detalle: {
          include: {
            catalogo_componentes: {
              select: {
                id_componente: true,
                codigo_interno: true,
                referencia_fabricante: true,
                descripcion_corta: true,
                unidad_medida: true,
              },
            },
          },
        },
        ubicaciones_bodega: {
          select: {
            id_ubicacion: true,
            codigo_ubicacion: true,
            zona: true,
          },
        },
      },
    });
  }
}
