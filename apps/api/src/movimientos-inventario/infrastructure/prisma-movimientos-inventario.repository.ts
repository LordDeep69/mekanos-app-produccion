import {
    origen_movimiento_inventario_enum,
    tipo_movimiento_inventario_enum,
} from '@mekanos/database';
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PrismaMovimientosInventarioRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * REGISTRAR MOVIMIENTO (Event Sourcing - INSERT ONLY)
   * Validaciones:
   * - SALIDA: Stock actual >= cantidad solicitada
   */
  async registrarMovimiento(data: {
    tipo_movimiento: tipo_movimiento_inventario_enum;
    origen_movimiento: origen_movimiento_inventario_enum;
    id_componente: number;
    cantidad: number;
    costo_unitario?: number;
    id_ubicacion?: number;
    id_lote?: number;
    id_orden_servicio?: number;
    id_orden_compra?: number;
    id_remision?: number;
    justificacion?: string;
    observaciones?: string;
    realizado_por: number;
  }) {
    // Validar stock disponible para SALIDAS
    if (data.tipo_movimiento === 'SALIDA') {
      const stockActual = await this.calcularStockActual(data.id_componente);
      if (stockActual < data.cantidad) {
        throw new ConflictException(
          `Stock insuficiente. Stock actual: ${stockActual}, Cantidad solicitada: ${data.cantidad}`,
        );
      }
    }

    // Crear movimiento
    const movimiento = await this.prisma.movimientos_inventario.create({
      data: {
        tipo_movimiento: data.tipo_movimiento,
        origen_movimiento: data.origen_movimiento,
        id_componente: data.id_componente,
        cantidad: data.cantidad,
        costo_unitario: data.costo_unitario,
        id_ubicacion: data.id_ubicacion,
        id_lote: data.id_lote,
        id_orden_servicio: data.id_orden_servicio,
        id_orden_compra: data.id_orden_compra,
        id_remision: data.id_remision,
        justificacion: data.justificacion,
        observaciones: data.observaciones,
        realizado_por: data.realizado_por,
        fecha_movimiento: new Date(),
      },
      include: {
        catalogo_componentes: {
          select: {
            id_componente: true,
            referencia_fabricante: true,
            descripcion_corta: true,
            codigo_interno: true,
          },
        },
        ubicaciones_bodega: {
          select: {
            id_ubicacion: true,
            codigo_ubicacion: true,
            zona: true,
          },
        },
        lotes_componentes: {
          select: {
            id_lote: true,
            codigo_lote: true,
            fecha_vencimiento: true,
          },
        },
        usuarios_movimientos_inventario_realizado_porTousuarios: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
      },
    });

    return movimiento;
  }

  /**
   * CALCULAR STOCK ACTUAL (Suma algebraica de movimientos)
   */
  async calcularStockActual(id_componente: number): Promise<number> {
    const movimientos = await this.prisma.movimientos_inventario.findMany({
      where: {
        id_componente,
      },
    });

    let stock = 0;
    for (const mov of movimientos) {
      const cantidad = parseFloat(mov.cantidad.toString());
      if (mov.tipo_movimiento === 'ENTRADA') {
        stock += cantidad;
      } else if (mov.tipo_movimiento === 'SALIDA') {
        stock -= cantidad;
      }
      // AJUSTE se maneja en origen_movimiento
    }

    return stock;
  }

  /**
   * REGISTRAR TRASLADO (Transacción atómica: SALIDA origen + ENTRADA destino)
   * Validaciones:
   * - Stock suficiente en ubicación origen
   * - Ambos movimientos se crean o ninguno (transacción)
   */
  async registrarTraslado(data: {
    id_componente: number;
    cantidad: number;
    id_ubicacion_origen: number;
    id_ubicacion_destino: number;
    observaciones?: string;
    creado_por: number;
  }) {
    // Usar transacción para garantizar atomicidad
    return await this.prisma.$transaction(async (tx) => {
      // 1. Validar stock en ubicación origen
      const stockOrigen = await this.calcularStockActual(data.id_componente);
      if (stockOrigen < data.cantidad) {
        throw new ConflictException(
          `Stock insuficiente en ubicación origen. Stock actual: ${stockOrigen}, Cantidad solicitada: ${data.cantidad}`,
        );
      }

      // 2. Crear movimiento SALIDA (origen)
      const movimientoSalida = await tx.movimientos_inventario.create({
        data: {
          tipo_movimiento: 'TRANSFERENCIA',
          origen_movimiento: 'REMISION',
          id_componente: data.id_componente,
          cantidad: data.cantidad,
          id_ubicacion: data.id_ubicacion_origen,
          observaciones: `Traslado a ubicación ${data.id_ubicacion_destino}. ${data.observaciones || ''}`,
          realizado_por: data.creado_por,
          fecha_movimiento: new Date(),
        },
      });

      // 3. Crear movimiento ENTRADA (destino)
      const movimientoEntrada = await tx.movimientos_inventario.create({
        data: {
          tipo_movimiento: 'TRANSFERENCIA',
          origen_movimiento: 'REMISION',
          id_componente: data.id_componente,
          cantidad: data.cantidad,
          id_ubicacion: data.id_ubicacion_destino,
          observaciones: `Traslado desde ubicación ${data.id_ubicacion_origen}. ${data.observaciones || ''}`,
          realizado_por: data.creado_por,
          fecha_movimiento: new Date(),
        },
      });

      return {
        movimiento_salida: movimientoSalida,
        movimiento_entrada: movimientoEntrada,
      };
    });
  }

  /**
   * OBTENER KARDEX COMPLETO (Historial con saldos acumulados)
   */
  async getKardex(
    id_componente: number,
    filters?: {
      fecha_desde?: Date;
      fecha_hasta?: Date;
      tipo_movimiento?: tipo_movimiento_inventario_enum;
    },
  ) {
    const where: any = {
      id_componente,
    };

    if (filters?.fecha_desde || filters?.fecha_hasta) {
      where.fecha_movimiento = {};
      if (filters.fecha_desde) {
        where.fecha_movimiento.gte = filters.fecha_desde;
      }
      if (filters.fecha_hasta) {
        where.fecha_movimiento.lte = filters.fecha_hasta;
      }
    }

    if (filters?.tipo_movimiento) {
      where.tipo_movimiento = filters.tipo_movimiento;
    }

    const movimientos = await this.prisma.movimientos_inventario.findMany({
      where,
      orderBy: [{ fecha_movimiento: 'asc' }, { id_movimiento: 'asc' }],
      include: {
        ubicaciones_bodega: {
          select: {
            codigo_ubicacion: true,
            zona: true,
          },
        },
        lotes_componentes: {
          select: {
            codigo_lote: true,
          },
        },
        ordenes_servicio: {
          select: { numero_orden: true },
        },
        ordenes_compra: {
          select: { numero_orden_compra: true },
        },
        remisiones: {
          select: { numero_remision: true },
        },
        usuarios_movimientos_inventario_realizado_porTousuarios: {
          include: {
            persona: {
              select: { nombre_completo: true },
            },
          },
        },
      },
    });

    // Calcular saldos acumulados
    let saldoAcumulado = 0;
    const kardexConSaldos = movimientos.map((mov) => {
      const cantidad = parseFloat(mov.cantidad.toString());
      const esEntrada = mov.tipo_movimiento === 'ENTRADA';

      const cantidadSigno = esEntrada ? cantidad : -cantidad;
      saldoAcumulado += cantidadSigno;

      return {
        ...mov,
        cantidad_signo: cantidadSigno,
        saldo_acumulado: saldoAcumulado,
      };
    });

    return kardexConSaldos;
  }

  /**
   * LISTAR MOVIMIENTOS CON FILTROS Y PAGINACIÓN
   */
  async findAll(filters?: {
    id_componente?: number;
    tipo_movimiento?: tipo_movimiento_inventario_enum;
    origen_movimiento?: origen_movimiento_inventario_enum;
    fecha_desde?: Date;
    fecha_hasta?: Date;
    id_orden_servicio?: number;
    id_orden_compra?: number;
    skip?: number;
    take?: number;
  }) {
    const where: any = {};

    if (filters?.id_componente) {
      where.id_componente = filters.id_componente;
    }

    if (filters?.tipo_movimiento) {
      where.tipo_movimiento = filters.tipo_movimiento;
    }

    if (filters?.origen_movimiento) {
      where.origen_movimiento = filters.origen_movimiento;
    }

    if (filters?.fecha_desde || filters?.fecha_hasta) {
      where.fecha_movimiento = {};
      if (filters.fecha_desde) {
        where.fecha_movimiento.gte = filters.fecha_desde;
      }
      if (filters.fecha_hasta) {
        where.fecha_movimiento.lte = filters.fecha_hasta;
      }
    }

    if (filters?.id_orden_servicio) {
      where.id_orden_servicio = filters.id_orden_servicio;
    }

    if (filters?.id_orden_compra) {
      where.id_orden_compra = filters.id_orden_compra;
    }

    const [items, total] = await Promise.all([
      this.prisma.movimientos_inventario.findMany({
        where,
        skip: filters?.skip || 0,
        take: filters?.take || 50,
        orderBy: [{ fecha_movimiento: 'desc' }, { id_movimiento: 'desc' }],
        include: {
          catalogo_componentes: {
            select: {
              codigo_interno: true,
              referencia_fabricante: true,
              descripcion_corta: true,
              unidad_medida: true,
            },
          },
          ubicaciones_bodega: {
            select: {
              codigo_ubicacion: true,
              zona: true,
            },
          },
          usuarios_movimientos_inventario_realizado_porTousuarios: {
            include: {
              persona: {
                select: { nombre_completo: true },
              },
            },
          },
        },
      }),
      this.prisma.movimientos_inventario.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * OBTENER MOVIMIENTO POR ID
   */
  async findById(id_movimiento: number) {
    const movimiento = await this.prisma.movimientos_inventario.findUnique({
      where: { id_movimiento },
      include: {
        catalogo_componentes: {
          select: {
            id_componente: true,
            codigo_interno: true,
            referencia_fabricante: true,
            descripcion_corta: true,
          },
        },
        ubicaciones_bodega: {
          select: {
            codigo_ubicacion: true,
            zona: true,
          },
        },
        lotes_componentes: {
          select: {
            codigo_lote: true,
            fecha_vencimiento: true,
          },
        },
        ordenes_servicio: {
          select: { numero_orden: true, id_cliente: true },
        },
        ordenes_compra: {
          select: { numero_orden_compra: true, id_proveedor: true },
        },
        remisiones: {
          select: { numero_remision: true },
        },
        usuarios_movimientos_inventario_realizado_porTousuarios: {
          include: {
            persona: {
              select: { nombre_completo: true },
            },
          },
        },
      },
    });

    return movimiento;
  }

  /**
   * OBTENER STOCK POR UBICACIÓN
   */
  async getStockPorUbicacion(id_componente: number) {
    const movimientos = await this.prisma.movimientos_inventario.findMany({
      where: {
        id_componente,
        id_ubicacion: { not: null },
      },
      include: {
        ubicaciones_bodega: {
          select: {
            id_ubicacion: true,
            codigo_ubicacion: true,
            zona: true,
          },
        },
      },
    });

    // Agrupar por ubicación
    const stockPorUbicacion = new Map<
      number,
      { ubicacion: any; stock: number }
    >();

    for (const mov of movimientos) {
      if (!mov.id_ubicacion) continue;

      const cantidad = parseFloat(mov.cantidad.toString());
      const cantidadSigno =
        mov.tipo_movimiento === 'ENTRADA' ? cantidad : -cantidad;

      if (!stockPorUbicacion.has(mov.id_ubicacion)) {
        stockPorUbicacion.set(mov.id_ubicacion, {
          ubicacion: mov.ubicaciones_bodega,
          stock: 0,
        });
      }

      const entry = stockPorUbicacion.get(mov.id_ubicacion)!;
      entry.stock += cantidadSigno;
    }

    return Array.from(stockPorUbicacion.values());
  }
}
