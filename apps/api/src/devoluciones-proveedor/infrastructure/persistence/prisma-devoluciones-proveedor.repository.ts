import { PrismaService } from '@mekanos/database';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IDevolucionesProveedorRepository } from '../../domain/devoluciones-proveedor.repository';

/**
 * Implementación del repositorio de Devoluciones con Prisma ORM
 * Maneja transacciones, validaciones y lógica de integración con inventario
 */
@Injectable()
export class PrismaDevolucionesProveedorRepository implements IDevolucionesProveedorRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una nueva devolución al proveedor (Estado inicial: SOLICITADA)
   */
  async crear(data: any): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validar que la orden de compra existe
      const ordenCompra = await tx.ordenes_compra.findUnique({
        where: { id_orden_compra: data.id_orden_compra },
      });

      if (!ordenCompra) {
        throw new NotFoundException(`Orden de compra ID ${data.id_orden_compra} no encontrada`);
      }

      // 2. Si hay id_lote, validar que existe y tiene stock suficiente
      if (data.id_lote) {
        const lote = await tx.lotes_componentes.findUnique({
          where: { id_lote: data.id_lote },
        });

        if (!lote) {
          throw new NotFoundException(`Lote ID ${data.id_lote} no encontrado`);
        }

        // Convertir Decimal a number para comparar
        const cantidadDisponible = Number(lote.cantidad_actual);
        const cantidadRequerida = Number(data.cantidad_devuelta);

        if (cantidadDisponible < cantidadRequerida) {
          throw new BadRequestException(
            `Stock insuficiente en lote. Disponible: ${cantidadDisponible}, requerido: ${cantidadRequerida}`,
          );
        }
      }

      // 3. Generar numero_devolucion único
      const count = await tx.devoluciones_proveedor.count();
      const numero_devolucion = `DEV-${Date.now()}-${count + 1}`;

      // 4. Crear la devolución (estado inicial: SOLICITADA)
      const devolucion = await tx.devoluciones_proveedor.create({
        data: {
          numero_devolucion,
          id_orden_compra: data.id_orden_compra,
          id_lote: data.id_lote,
          motivo: data.motivo,
          cantidad_devuelta: data.cantidad_devuelta,
          estado_devolucion: 'SOLICITADA',
          solicitada_por: data.solicitada_por,
          fecha_solicitud: new Date(),
          observaciones: data.observaciones_solicitud || null,
        },
      });

      return devolucion;
    });
  }

  /**
   * Procesa una devolución (aprueba, retira o acredita)
   * Si se aprueba, crea movimiento SALIDA y actualiza stock del lote
   */
  async procesar(
    id_devolucion: number,
    estado_devolucion: 'APROBADA_PROVEEDOR' | 'RETIRADA' | 'ACREDITADA',
    procesada_por: number,
    observaciones_procesamiento?: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Validar que la devolución existe
      const devolucion = await tx.devoluciones_proveedor.findUnique({
        where: { id_devolucion },
      });

      if (!devolucion) {
        throw new NotFoundException(`Devolución ID ${id_devolucion} no encontrada`);
      }

      if (devolucion.estado_devolucion === 'ACREDITADA') {
        throw new BadRequestException('Devolución ya fue acreditada. No se puede modificar.');
      }

      // 2. Si se aprueba y hay lote, crear movimiento de salida y actualizar stock
      if (estado_devolucion === 'APROBADA_PROVEEDOR' && devolucion.id_lote) {
        const lote = await tx.lotes_componentes.findUnique({
          where: { id_lote: devolucion.id_lote },
        });

        if (!lote) {
          throw new NotFoundException(`Lote ID ${devolucion.id_lote} no encontrado`);
        }

        // Convertir Decimal a number para comparar
        const cantidadDisponible = Number(lote.cantidad_actual);
        const cantidadRequerida = Number(devolucion.cantidad_devuelta);

        if (cantidadDisponible < cantidadRequerida) {
          throw new BadRequestException(
            `Stock insuficiente en lote. Disponible: ${cantidadDisponible}, requerido: ${cantidadRequerida}`,
          );
        }

        // Crear movimiento de inventario (SALIDA por DEVOLUCION)
        await tx.movimientos_inventario.create({
          data: {
            tipo_movimiento: 'SALIDA',
            origen_movimiento: 'DEVOLUCION',
            id_componente: lote.id_componente,
            cantidad: devolucion.cantidad_devuelta,
            costo_unitario: 0,
            id_lote: devolucion.id_lote,
            id_orden_compra: devolucion.id_orden_compra,
            observaciones: `Devolución ${devolucion.numero_devolucion} - Motivo: ${devolucion.motivo}`,
            realizado_por: procesada_por,
            fecha_movimiento: new Date(),
          },
        });

        // Actualizar cantidad_actual del lote (decrementar)
        await tx.lotes_componentes.update({
          where: { id_lote: devolucion.id_lote },
          data: {
            cantidad_actual: {
              decrement: devolucion.cantidad_devuelta,
            },
          },
        });
      }

      // 3. Actualizar estado de la devolución
      const devolucionActualizada = await tx.devoluciones_proveedor.update({
        where: { id_devolucion },
        data: {
          estado_devolucion,
          fecha_devolucion: new Date(),
          observaciones: observaciones_procesamiento || devolucion.observaciones,
        },
      });

      return devolucionActualizada;
    });
  }

  /**
   * Lista devoluciones con filtros y paginación
   */
  async findAll(filters?: any, page: number = 1, limit: number = 10): Promise<any> {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.estado_devolucion) {
      where.estado_devolucion = filters.estado_devolucion;
    }
    if (filters?.id_orden_compra) {
      where.id_orden_compra = filters.id_orden_compra;
    }
    if (filters?.motivo) {
      where.motivo = filters.motivo;
    }

    const [data, total] = await Promise.all([
      this.prisma.devoluciones_proveedor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_solicitud: 'desc' },
      }),
      this.prisma.devoluciones_proveedor.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Obtiene una devolución por su ID
   */
  async findById(id_devolucion: number): Promise<any> {
    const devolucion = await this.prisma.devoluciones_proveedor.findUnique({
      where: { id_devolucion },
    });

    if (!devolucion) {
      throw new NotFoundException(`Devolución ID ${id_devolucion} no encontrada`);
    }

    return devolucion;
  }

  /**
   * Obtiene devoluciones de una orden de compra específica
   */
  async findByOrdenCompra(id_orden_compra: number): Promise<any[]> {
    return this.prisma.devoluciones_proveedor.findMany({
      where: { id_orden_compra },
      orderBy: { fecha_solicitud: 'desc' },
    });
  }
}
