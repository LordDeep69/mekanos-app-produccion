import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PrismaRemisionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CREAR REMISIÓN (Salida de bodega)
   * Genera movimientos_inventario automáticamente
   */
  async crearRemision(data: {
    id_orden_servicio?: number;
    id_tecnico_receptor: number; // Mapped to id_destino (TECNICO)
    observaciones?: string;
    entregado_por: number; // user who delivers (entregado_por)
    items: Array<{
      id_componente: number;
      cantidad: number;
      id_ubicacion?: number;
      observaciones?: string;
    }>;
  }) {
    // Validar stock disponible para TODOS los items
    for (const item of data.items) {
      const stockActual = await this.calcularStockComponente(item.id_componente);
      if (stockActual < item.cantidad) {
        const componente = await this.prisma.catalogo_componentes.findUnique({
          where: { id_componente: item.id_componente },
          select: { codigo_interno: true, descripcion_corta: true },
        });
        throw new ConflictException(
          `Stock insuficiente para ${componente?.descripcion_corta || componente?.codigo_interno}. Stock actual: ${stockActual}, Cantidad solicitada: ${item.cantidad}`,
        );
      }
    }

    // Crear remisión con transacción
    const remision = await this.prisma.$transaction(async (tx) => {
      // 1. Crear remisión
      // Resolve nombre_destinatario from empleado if possible
      let nombre_destinatario: string | null | undefined = undefined;
      if (data.id_tecnico_receptor) {
        const tecnico = await tx.empleados.findUnique({
          where: { id_empleado: data.id_tecnico_receptor },
          include: { persona: true },
        });
        nombre_destinatario = tecnico?.persona?.nombre_completo;
      }

      // Generate unique numero_remision
      const timestamp = Date.now();
      const numero_remision = `REM-${timestamp}`;

      const nuevaRemision = await tx.remisiones.create({
        data: {
          numero_remision,
          fecha_remision: new Date(),
          tipo_destino: 'TECNICO',
          id_destino: data.id_tecnico_receptor,
          nombre_destinatario: nombre_destinatario || 'TÉCNICO',
          tipo_remision: 'VALE_SALIDA_TECNICO', // REQUIRED field
          requiere_devolucion: false, // REQUIRED field - default false for standard remisiones
          id_orden_servicio: data.id_orden_servicio,
          estado_remision: 'ABIERTA',
          entregado_por: data.entregado_por,
        },
      });

      // 2. Crear items de remisión
        for (const item of data.items) {
        const componente = await tx.catalogo_componentes.findUnique({
          where: { id_componente: item.id_componente },
        });

        await tx.remisiones_detalle.create({
          data: {
            id_remision: nuevaRemision.id_remision,
            tipo_item: 'COMPONENTE', // REQUIRED field - all items are components in this flow
            id_componente: item.id_componente,
            descripcion_item: componente?.descripcion_corta || componente?.referencia_fabricante || '',
            cantidad_entregada: item.cantidad,
            observaciones: item.observaciones,
          },
        });

        // 3. Registrar movimiento inventario (SALIDA)
        await tx.movimientos_inventario.create({
          data: {
            tipo_movimiento: 'SALIDA',
            origen_movimiento: 'REMISION',
            id_componente: item.id_componente,
            cantidad: item.cantidad,
            id_ubicacion: item.id_ubicacion,
            id_orden_servicio: data.id_orden_servicio,
            id_remision: nuevaRemision.id_remision,
            observaciones: `Remisión ID ${nuevaRemision.id_remision}`,
            realizado_por: data.entregado_por, // FIX: realizado_por not creado_por
            fecha_movimiento: new Date(),
          },
        });
      }

      // Retornar remisión completa con items
      return await tx.remisiones.findUnique({
        where: { id_remision: nuevaRemision.id_remision },
        include: {
          detalles: {
            include: {
              catalogo_componentes: {
                select: {
                  codigo_interno: true,
                  descripcion_corta: true,
                  unidad_medida: true,
                },
              },
            },
          },
          usuarios: {
            include: { persona: true },
          },
          ordenes_servicio: {
            select: { numero_orden: true },
          },
        },
      });
    });

    return remision;
  }

  /**
   * ENTREGAR REMISIÓN (cambio estado PENDIENTE → ENTREGADA)
   */
  async entregarRemision(id_remision: number, _modificado_por: number) {
    const remision = await this.prisma.remisiones.findUnique({
      where: { id_remision },
    });

    if (!remision) {
      throw new NotFoundException(`Remisión ID ${id_remision} no encontrada`);
    }

    if (remision.estado_remision !== 'ABIERTA') {
      throw new ConflictException(
        `La remisión está en estado ${remision.estado_remision}, no puede ser entregada`,
      );
    }
    return await this.prisma.remisiones.update({
      where: { id_remision },
      data: {
        estado_remision: 'CERRADA',
        fecha_cierre: new Date(),
      },
      include: {
        detalles: {
          include: {
            catalogo_componentes: true,
          },
        },
        usuarios: {
          include: { persona: true },
        },
      },
    });
  }

  /**
   * CANCELAR REMISIÓN (reversar movimientos)
   */
  async cancelarRemision(
    id_remision: number,
    motivo_cancelacion: string,
    userId: number, // Renamed from modificado_por to userId for clarity
  ) {
    const remision = await this.prisma.remisiones.findUnique({
      where: { id_remision },
      include: {
        detalles: true,
      },
    });

    if (!remision) {
      throw new NotFoundException(`Remisión ID ${id_remision} no encontrada`);
    }

    if (remision.estado_remision === 'CANCELADA') {
      throw new ConflictException('La remisión ya está cancelada');
    }
    if (remision.estado_remision === 'CERRADA') {
      throw new ConflictException(
        'No se puede cancelar una remisión cerrada. Debe hacer una devolución.',
      );
    }

    // Cancelar con transacción (reversar movimientos)
    return await this.prisma.$transaction(async (tx) => {
      // 1. Registrar movimientos de ENTRADA (reversar las SALIDAS)
      for (const item of remision.detalles) {
        if (!item.id_componente) continue; // skip items without component id
        await tx.movimientos_inventario.create({
          data: {
            tipo_movimiento: 'ENTRADA',
            origen_movimiento: 'DEVOLUCION',
            id_componente: item.id_componente,
            cantidad: item.cantidad_entregada,
            id_remision,
            observaciones: `Cancelación remisión ID ${id_remision}. Motivo: ${motivo_cancelacion}`,
            realizado_por: userId, // Use userId parameter
            fecha_movimiento: new Date(),
          },
        });
      }

      // 2. Actualizar estado remisión
      return await tx.remisiones.update({
        where: { id_remision },
        data: {
          estado_remision: 'CANCELADA', // FIX: correct field name
          fecha_cierre: new Date(), // Mark as closed when cancelled
        },
        include: {
          detalles: {
            include: { catalogo_componentes: true },
          },
        },
      });
    });
  }

  /**
   * LISTAR REMISIONES CON FILTROS
   */
  async findAll(filters?: {
    id_tecnico_receptor?: number;
    id_orden_servicio?: number;
    estado?: string;
    fecha_desde?: Date;
    fecha_hasta?: Date;
    skip?: number;
    take?: number;
  }) {
    const where: any = {}; // FIX: remisiones doesn't have activo field

    if (filters?.id_tecnico_receptor) {
      // Filter by destination (TECNICO)
      where.id_destino = filters.id_tecnico_receptor;
      where.tipo_destino = 'TECNICO';
    }

    if (filters?.id_orden_servicio) {
      where.id_orden_servicio = filters.id_orden_servicio;
    }

    if (filters?.estado) {
      where.estado_remision = filters.estado;
    }

    if (filters?.fecha_desde || filters?.fecha_hasta) {
      where.fecha_remision = {};
      if (filters.fecha_desde) {
        where.fecha_remision.gte = filters.fecha_desde;
      }
      if (filters.fecha_hasta) {
        where.fecha_remision.lte = filters.fecha_hasta;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.remisiones.findMany({
        where,
        skip: filters?.skip || 0,
        take: filters?.take || 50,
        orderBy: { fecha_remision: 'desc' },
        include: {
          usuarios: {
            include: { persona: true },
          },
          ordenes_servicio: { // FIX: correct relation name
            select: { numero_orden: true },
          },
          detalles: {
            include: {
              catalogo_componentes: {
                select: {
                  codigo_interno: true,
                  descripcion_corta: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.remisiones.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * OBTENER REMISIÓN POR ID
   */
  async findById(id_remision: number) {
    const remision = await this.prisma.remisiones.findUnique({
      where: { id_remision },
      include: {
        usuarios: {
          include: { persona: true },
        },
        ordenes_servicio: { // FIX: correct relation name
          select: { numero_orden: true, id_cliente: true },
        },
        detalles: {
          include: {
            catalogo_componentes: {
              select: {
                codigo_interno: true,
                descripcion_corta: true,
                unidad_medida: true,
                precio_venta: true,
              },
            },
          },
        },
        // REMOVED: duplicate usuarios include
      },
    });

    if (!remision) {
      return null;
    }

    return remision;
  }

  /**
   * HELPER: Calcular stock actual componente
   */
  private async calcularStockComponente(id_componente: number): Promise<number> {
    const movimientos = await this.prisma.movimientos_inventario.findMany({
      where: {
        id_componente,
        // REMOVED: activo field doesn't exist in movimientos_inventario
      },
    });

    let stock = 0;
    for (const mov of movimientos) {
      // Simplified logic: ENTRADA and AJUSTE increase stock; SALIDA and TRANSFERENCIA decrease
      if (mov.tipo_movimiento === 'ENTRADA' || mov.tipo_movimiento === 'AJUSTE') {
        stock += Number(mov.cantidad);
      } else if (mov.tipo_movimiento === 'SALIDA' || mov.tipo_movimiento === 'TRANSFERENCIA') {
        stock -= Number(mov.cantidad);
      }
    }

    return stock;
  }
}
