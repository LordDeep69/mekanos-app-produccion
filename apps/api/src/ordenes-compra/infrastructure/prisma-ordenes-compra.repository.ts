import { PrismaService } from '@mekanos/database';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
    CrearOrdenCompraData,
    IOrdenesCompraRepository,
    OrdenCompraResult,
    OrdenesCompraFilters,
    OrdenesCompraPaginatedResult,
} from '../interfaces/ordenes-compra.repository.interface';

@Injectable()
export class PrismaOrdenesCompraRepository implements IOrdenesCompraRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea una orden de compra con items en transacción atómica
   * Estado inicial: BORRADOR
   */
  async crearOrdenCompra(data: CrearOrdenCompraData): Promise<OrdenCompraResult> {
    // Validar proveedor existe
    const proveedor = await this.prisma.proveedores.findUnique({
      where: { id_proveedor: data.id_proveedor },
    });

    if (!proveedor) {
      throw new NotFoundException(`Proveedor ID ${data.id_proveedor} no encontrado`);
    }

    // Validar componentes existen
    const componentesIds = data.items.map((item) => item.id_componente);
    const componentes = await this.prisma.catalogo_componentes.findMany({
      where: { id_componente: { in: componentesIds } },
    });

    if (componentes.length !== componentesIds.length) {
      throw new NotFoundException('Uno o más componentes no encontrados');
    }

    // Validar número orden compra no duplicado
    const existente = await this.prisma.ordenes_compra.findUnique({
      where: { numero_orden_compra: data.numero_orden_compra },
    });

    if (existente) {
      throw new ConflictException(`Número orden compra '${data.numero_orden_compra}' ya existe`);
    }

    // Transacción atómica: orden + detalles
    const ordenCreada = await this.prisma.$transaction(async (tx) => {
      // Crear orden compra
      const orden = await tx.ordenes_compra.create({
        data: {
          numero_orden_compra: data.numero_orden_compra,
          id_proveedor: data.id_proveedor,
          fecha_necesidad: data.fecha_necesidad || null,
          estado: 'BORRADOR',
          observaciones: data.observaciones || null,
          solicitada_por: data.solicitada_por,
        },
      });

      // Crear detalles
      const detallesData = data.items.map((item) => ({
        id_orden_compra: orden.id_orden_compra,
        id_componente: item.id_componente,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        observaciones: item.observaciones || null,
      }));

      await tx.ordenes_compra_detalle.createMany({
        data: detallesData,
      });

      // Retornar orden completa con relaciones
      return await tx.ordenes_compra.findUnique({
        where: { id_orden_compra: orden.id_orden_compra },
        include: {
          proveedores: {
            select: {
              id_proveedor: true,
              persona: {
                select: {
                  nombre_completo: true,
                },
              },
            },
          },
          usuarios_ordenes_compra_solicitada_porTousuarios: {
            include: {
              persona: {
                select: {
                  nombre_completo: true,
                },
              },
            },
          },
          detalles: {
            include: {
              catalogo_componentes: {
                select: {
                  id_componente: true,
                  referencia_fabricante: true,
                  descripcion_corta: true,
                  codigo_interno: true,
                },
              },
            },
          },
        },
      });
    });

    return this.mapOrdenCompraToResult(ordenCreada);
  }

  /**
   * Envía orden compra: BORRADOR → ENVIADA
   * Solo se puede enviar si está en BORRADOR
   */
  async enviarOrdenCompra(idOrdenCompra: number, userId: number): Promise<OrdenCompraResult> {
    const orden = await this.prisma.ordenes_compra.findUnique({
      where: { id_orden_compra: idOrdenCompra },
    });

    if (!orden) {
      throw new NotFoundException(`Orden compra ID ${idOrdenCompra} no encontrada`);
    }

    if (orden.estado !== 'BORRADOR') {
      throw new ConflictException(`Orden compra debe estar en BORRADOR para enviar (actual: ${orden.estado})`);
    }

    // Actualizar estado y aprobar
    const ordenActualizada = await this.prisma.ordenes_compra.update({
      where: { id_orden_compra: idOrdenCompra },
      data: {
        estado: 'ENVIADA',
        aprobada_por: userId,
        fecha_aprobacion: new Date(),
      },
      include: {
        proveedores: {
          select: {
            id_proveedor: true,
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
        usuarios_ordenes_compra_solicitada_porTousuarios: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
        usuarios_ordenes_compra_aprobada_porTousuarios: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
        detalles: {
          include: {
            catalogo_componentes: {
              select: {
                id_componente: true,
                referencia_fabricante: true,
                descripcion_corta: true,
                codigo_interno: true,
              },
            },
          },
        },
      },
    });

    return this.mapOrdenCompraToResult(ordenActualizada);
  }

  /**
   * Cancela orden compra
   * Solo se puede cancelar si NO está COMPLETADA
   */
  async cancelarOrdenCompra(idOrdenCompra: number, motivo: string, _userId: number): Promise<OrdenCompraResult> {
    const orden = await this.prisma.ordenes_compra.findUnique({
      where: { id_orden_compra: idOrdenCompra },
    });

    if (!orden) {
      throw new NotFoundException(`Orden compra ID ${idOrdenCompra} no encontrada`);
    }

    if (orden.estado === 'COMPLETADA') {
      throw new ConflictException('No se puede cancelar orden compra COMPLETADA');
    }

    if (orden.estado === 'CANCELADA') {
      throw new ConflictException('Orden compra ya está CANCELADA');
    }

    // Actualizar estado y motivo
    const ordenCancelada = await this.prisma.ordenes_compra.update({
      where: { id_orden_compra: idOrdenCompra },
      data: {
        estado: 'CANCELADA',
        observaciones: `${orden.observaciones || ''}\n\nCANCELADA: ${motivo}`.trim(),
        // REMOVED: modificado_por doesn't exist in ordenes_compra model
      },
      include: {
        proveedores: {
          select: {
            id_proveedor: true,
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
        usuarios_ordenes_compra_solicitada_porTousuarios: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
        detalles: {
          include: {
            catalogo_componentes: {
              select: {
                id_componente: true,
                referencia_fabricante: true,
                descripcion_corta: true,
                codigo_interno: true,
              },
            },
          },
        },
      },
    });

    return this.mapOrdenCompraToResult(ordenCancelada);
  }

  /**
   * Lista órdenes compra con filtros y paginación
   */
  async findAll(filters: OrdenesCompraFilters): Promise<OrdenesCompraPaginatedResult> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Construir filtros dinámicos
    const where: any = {};

    if (filters.id_proveedor) {
      where.id_proveedor = filters.id_proveedor;
    }

    if (filters.estado) {
      where.estado = filters.estado;
    }

    if (filters.numero_orden) {
      where.numero_orden_compra = {
        contains: filters.numero_orden,
      };
    }

    if (filters.fecha_desde || filters.fecha_hasta) {
      where.fecha_solicitud = {};
      if (filters.fecha_desde) {
        where.fecha_solicitud.gte = filters.fecha_desde;
      }
      if (filters.fecha_hasta) {
        where.fecha_solicitud.lte = filters.fecha_hasta;
      }
    }

    // Consulta paginada
    const [ordenes, total] = await Promise.all([
      this.prisma.ordenes_compra.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha_solicitud: 'desc' },
        include: {
          proveedores: {
            select: {
              id_proveedor: true,
              persona: {
                select: {
                  nombre_completo: true,
                },
              },
            },
          },
          usuarios_ordenes_compra_solicitada_porTousuarios: {
            include: {
              persona: {
                select: {
                  nombre_completo: true,
                },
              },
            },
          },
          usuarios_ordenes_compra_aprobada_porTousuarios: {
            include: {
              persona: {
                select: {
                  nombre_completo: true,
                },
              },
            },
          },
          detalles: {
            include: {
              catalogo_componentes: {
                select: {
                  id_componente: true,
                  referencia_fabricante: true,
                  descripcion_corta: true,
                  codigo_interno: true,
                },
              },
            },
          },
          recepciones: {
            select: {
              id_recepcion: true,
              numero_recepcion: true,
              cantidad_recibida: true,
              cantidad_aceptada: true,
              cantidad_rechazada: true,
              calidad: true,
              fecha_recepcion: true,
            },
          },
        },
      }),
      this.prisma.ordenes_compra.count({ where }),
    ]);

    return {
      data: ordenes.map((orden) => this.mapOrdenCompraToResult(orden)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtiene orden compra por ID con todas relaciones
   */
  async findById(idOrdenCompra: number): Promise<OrdenCompraResult> {
    const orden = await this.prisma.ordenes_compra.findUnique({
      where: { id_orden_compra: idOrdenCompra },
      include: {
        proveedores: {
          select: {
            id_proveedor: true,
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
        usuarios_ordenes_compra_solicitada_porTousuarios: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
        usuarios_ordenes_compra_aprobada_porTousuarios: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
        detalles: {
          include: {
            catalogo_componentes: {
              select: {
                id_componente: true,
                referencia_fabricante: true,
                descripcion_corta: true,
                codigo_interno: true,
              },
            },
          },
        },
        recepciones: {
          select: {
            id_recepcion: true,
            numero_recepcion: true,
            cantidad_recibida: true,
            cantidad_aceptada: true,
            cantidad_rechazada: true,
            calidad: true,
            fecha_recepcion: true,
          },
          orderBy: {
            fecha_recepcion: 'desc',
          },
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden compra ID ${idOrdenCompra} no encontrada`);
    }

    return this.mapOrdenCompraToResult(orden);
  }

  /**
   * Obtiene órdenes activas (ENVIADA, PARCIAL) de un proveedor
   */
  async getOrdenesActivasProveedor(idProveedor: number): Promise<OrdenCompraResult[]> {
    const ordenes = await this.prisma.ordenes_compra.findMany({
      where: {
        id_proveedor: idProveedor,
        estado: {
          in: ['ENVIADA', 'PARCIAL'],
        },
      },
      orderBy: {
        fecha_solicitud: 'desc',
      },
      include: {
        proveedores: {
          select: {
            id_proveedor: true,
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
        usuarios_ordenes_compra_solicitada_porTousuarios: {
          include: {
            persona: {
              select: {
                nombre_completo: true,
              },
            },
          },
        },
        detalles: {
          include: {
            catalogo_componentes: {
              select: {
                id_componente: true,
                referencia_fabricante: true,
                descripcion_corta: true,
                codigo_interno: true,
              },
            },
          },
        },
      },
    });

    return ordenes.map((orden) => this.mapOrdenCompraToResult(orden));
  }

  /**
   * Mapper: Prisma entity → Result DTO
   */
  private mapOrdenCompraToResult(orden: any): OrdenCompraResult {
    return {
      id_orden_compra: orden.id_orden_compra,
      numero_orden_compra: orden.numero_orden_compra,
      id_proveedor: orden.id_proveedor,
      fecha_solicitud: orden.fecha_solicitud,
      fecha_necesidad: orden.fecha_necesidad,
      estado: orden.estado,
      observaciones: orden.observaciones,
      solicitada_por: orden.solicitada_por,
      aprobada_por: orden.aprobada_por,
      fecha_aprobacion: orden.fecha_aprobacion,
      proveedor: orden.proveedores
        ? {
            id_proveedor: orden.proveedores.id_proveedor,
            nombre_completo: orden.proveedores.persona?.nombre_completo || 'N/A',
          }
        : undefined,
      solicitante: orden.usuarios_ordenes_compra_solicitada_porTousuarios
        ? {
            id_usuario: orden.usuarios_ordenes_compra_solicitada_porTousuarios.id_usuario,
            nombre_completo:
              orden.usuarios_ordenes_compra_solicitada_porTousuarios.persona?.nombre_completo || 'N/A',
          }
        : undefined,
      aprobador: orden.usuarios_ordenes_compra_aprobada_porTousuarios
        ? {
            id_usuario: orden.usuarios_ordenes_compra_aprobada_porTousuarios.id_usuario,
            nombre_completo:
              orden.usuarios_ordenes_compra_aprobada_porTousuarios.persona?.nombre_completo || 'N/A',
          }
        : null,
      detalles: orden.detalles?.map((detalle: any) => ({
        id_detalle: detalle.id_detalle,
        id_componente: detalle.id_componente,
        cantidad: parseFloat(detalle.cantidad.toString()),
        precio_unitario: parseFloat(detalle.precio_unitario.toString()),
        subtotal: parseFloat(detalle.subtotal?.toString() || '0'),
        observaciones: detalle.observaciones,
        componente: detalle.catalogo_componentes
          ? {
              id_componente: detalle.catalogo_componentes.id_componente,
              referencia_fabricante: detalle.catalogo_componentes.referencia_fabricante,
              descripcion_corta: detalle.catalogo_componentes.descripcion_corta,
              codigo_interno: detalle.catalogo_componentes.codigo_interno,
            }
          : undefined,
      })),
      recepciones: orden.recepciones?.map((recepcion: any) => ({
        id_recepcion: recepcion.id_recepcion,
        numero_recepcion: recepcion.numero_recepcion,
        cantidad_recibida: parseFloat(recepcion.cantidad_recibida.toString()),
        cantidad_aceptada: parseFloat(recepcion.cantidad_aceptada.toString()),
        cantidad_rechazada: parseFloat(recepcion.cantidad_rechazada.toString()),
        calidad: recepcion.calidad,
        fecha_recepcion: recepcion.fecha_recepcion,
      })),
    };
  }
}
