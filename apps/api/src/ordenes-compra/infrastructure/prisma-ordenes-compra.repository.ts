import { PrismaService } from '@mekanos/database';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ArticuloSourcingResult,
  CostoComponenteResult,
  CrearOrdenCompraData,
  IOrdenesCompraRepository,
  OrdenCompraResult,
  OrdenesCompraFilters,
  OrdenesCompraPaginatedResult,
  OrdenesCompraResumenKpis,
} from '../interfaces/ordenes-compra.repository.interface';

@Injectable()
export class PrismaOrdenesCompraRepository implements IOrdenesCompraRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generación atómica del siguiente número correlativo determinista formal de Orden de Compra.
   * Formato industrial estandarizado: OC-{YYYY}-{0001} (ej: OC-2026-0001).
   * Utiliza sequence_counter con bloqueo FOR UPDATE para serializar transacciones concurrentes.
   */
  private async generarSiguienteNumeroOrden(tx: any): Promise<string> {
    const year = new Date().getFullYear();
    const rows = await tx.$queryRawUnsafe(`
      SELECT id, current_value FROM sequence_counter
      WHERE type = 'OC' AND year = ${year}
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
      const nextId = Number(maxRes[0]?.next_id || 100);
      await tx.$executeRawUnsafe(`
        INSERT INTO sequence_counter (id, type, year, current_value, created_at, updated_at)
        VALUES (${nextId}, 'OC', ${year}, 1, NOW(), NOW());
      `);
      nextVal = 1;
    }

    return `OC-${year}-${String(nextVal).padStart(4, '0')}`;
  }

  /**
   * Helper para resolver nombres de usuarios en lote a partir de sus IDs
   */
  private async obtenerMapUsuarios(
    userIds: number[],
  ): Promise<Map<number, { id_usuario: number; nombre_completo: string; username: string }>> {
    const ids = Array.from(new Set(userIds.filter((id) => id && id > 0)));
    const map = new Map<number, { id_usuario: number; nombre_completo: string; username: string }>();
    if (ids.length === 0) return map;

    const usuarios = await this.prisma.usuarios.findMany({
      where: { id_usuario: { in: ids } },
      select: {
        id_usuario: true,
        username: true,
        persona: {
          select: {
            nombre_completo: true,
          },
        },
      },
    });

    for (const u of usuarios) {
      map.set(u.id_usuario, {
        id_usuario: u.id_usuario,
        nombre_completo: u.persona?.nombre_completo || u.username || `Usuario #${u.id_usuario}`,
        username: u.username,
      });
    }

    return map;
  }

  /**
   * Crea una orden de compra con items en transacción atómica
   * Estado inicial: BORRADOR
   */
  async crearOrdenCompra(data: CrearOrdenCompraData): Promise<OrdenCompraResult> {
    // Validar proveedor existe
    const proveedor = await this.prisma.proveedores.findUnique({
      where: { id_proveedor: data.id_proveedor },
      include: {
        persona: {
          select: {
            nombre_completo: true,
            razon_social: true,
            numero_identificacion: true,
          },
        },
      },
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
      throw new NotFoundException('Uno o más componentes especificados no existen en el catálogo');
    }

    // Transacción atómica: generación de correlativo + orden + detalles
    const ordenCreada = await this.prisma.$transaction(async (tx) => {
      let numeroOrden = data.numero_orden_compra?.trim();

      if (numeroOrden) {
        // Validar número orden compra no duplicado
        const existente = await tx.ordenes_compra.findFirst({
          where: { numero_orden_compra: numeroOrden },
        });

        if (existente) {
          throw new ConflictException(`Número orden compra '${numeroOrden}' ya existe en el sistema`);
        }
      } else {
        // Autogeneración determinista formal via sequence_counter
        numeroOrden = await this.generarSiguienteNumeroOrden(tx);
      }

      // Crear orden compra cabecera
      const orden = await tx.ordenes_compra.create({
        data: {
          numero_orden_compra: numeroOrden,
          id_proveedor: data.id_proveedor,
          fecha_necesidad: data.fecha_necesidad || null,
          estado: 'BORRADOR',
          observaciones: data.observaciones || null,
          solicitada_por: data.solicitada_por,
        },
      });

      // Crear detalles con subtotal calculado
      for (const item of data.items) {
        const subtotal = Number((item.cantidad * item.precio_unitario).toFixed(2));
        await tx.ordenes_compra_detalle.create({
          data: {
            id_orden_compra: orden.id_orden_compra,
            id_componente: item.id_componente,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: subtotal,
            observaciones: item.observaciones || null,
          },
        });

        // Auto-vinculación comercial en segundo plano a la matriz del proveedor si se solicitó
        if (item.vincular_proveedor) {
          const comp = componentes.find((c) => c.id_componente === item.id_componente);
          const refProveedor =
            item.codigo_proveedor?.trim() ||
            comp?.referencia_fabricante ||
            comp?.codigo_interno ||
            `REF-${item.id_componente}`;

          // Consultar costo anterior si existía para la bitácora
          const vinculoPrevio = await tx.articulos_proveedores.findUnique({
            where: {
              id_componente_id_proveedor: {
                id_componente: item.id_componente,
                id_proveedor: data.id_proveedor,
              },
            },
          });

          const costoAnterior = vinculoPrevio
            ? Number(vinculoPrevio.costo_actual)
            : comp?.precio_compra
            ? Number(comp.precio_compra)
            : null;

          let porcentajeVariacion: number | null = null;
          if (costoAnterior !== null && costoAnterior > 0) {
            const variacionCalc = Number((((item.precio_unitario - costoAnterior) / costoAnterior) * 100).toFixed(2));
            porcentajeVariacion = Math.abs(variacionCalc) < 9999 ? variacionCalc : null;
          }

          // Upsert en articulos_proveedores
          await tx.articulos_proveedores.upsert({
            where: {
              id_componente_id_proveedor: {
                id_componente: item.id_componente,
                id_proveedor: data.id_proveedor,
              },
            },
            create: {
              id_componente: item.id_componente,
              id_proveedor: data.id_proveedor,
              referencia_proveedor: refProveedor,
              nombre_segun_proveedor: comp?.descripcion_corta || undefined,
              costo_actual: item.precio_unitario,
              moneda: 'COP',
              activo: true,
              registrado_por: data.solicitada_por,
              modificado_por: data.solicitada_por,
            },
            update: {
              costo_actual: item.precio_unitario,
              referencia_proveedor: item.codigo_proveedor?.trim() || undefined,
              activo: true,
              fecha_actualizacion: new Date(),
              modificado_por: data.solicitada_por,
            },
          });

          // Registrar bitácora inmutable en historial_costos_compra con origen ACTUALIZACION_PROVEEDOR
          await tx.historial_costos_compra.create({
            data: {
              id_componente: item.id_componente,
              id_proveedor: data.id_proveedor,
              costo_unitario: item.precio_unitario,
              costo_unitario_anterior: costoAnterior,
              porcentaje_variacion: porcentajeVariacion,
              cantidad_adquirida: item.cantidad,
              numero_factura_oc: numeroOrden,
              origen_cambio: 'ACTUALIZACION_PROVEEDOR',
              observaciones: `Auto-vinculación comercial desde OC ${numeroOrden}`,
              id_usuario: data.solicitada_por,
            },
          });
        }
      }

      // Retornar orden completa con relaciones reales de Prisma
      return await tx.ordenes_compra.findUnique({
        where: { id_orden_compra: orden.id_orden_compra },
        include: {
          proveedores: {
            select: {
              id_proveedor: true,
              id_persona: true,
              persona: {
                select: {
                  nombre_completo: true,
                  razon_social: true,
                  numero_identificacion: true,
                },
              },
            },
          },
          ordenes_compra_detalle: {
            include: {
              catalogo_componentes: {
                select: {
                  id_componente: true,
                  referencia_fabricante: true,
                  descripcion_corta: true,
                  codigo_interno: true,
                  unidad_medida: true,
                },
              },
            },
          },
          recepciones_compra: true,
        },
      });
    });

    const usuariosMap = await this.obtenerMapUsuarios([ordenCreada!.solicitada_por]);
    return this.mapOrdenCompraToResult(ordenCreada, usuariosMap);
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
      throw new ConflictException(`Orden compra debe estar en BORRADOR para ser enviada/emitida (actual: ${orden.estado})`);
    }

    // Actualizar estado y registrar aprobador
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
            id_persona: true,
            persona: {
              select: {
                nombre_completo: true,
                razon_social: true,
                numero_identificacion: true,
              },
            },
          },
        },
        ordenes_compra_detalle: {
          include: {
            catalogo_componentes: {
              select: {
                id_componente: true,
                referencia_fabricante: true,
                descripcion_corta: true,
                codigo_interno: true,
                unidad_medida: true,
              },
            },
          },
        },
        recepciones_compra: true,
      },
    });

    const usuariosMap = await this.obtenerMapUsuarios([
      ordenActualizada.solicitada_por,
      ordenActualizada.aprobada_por || 0,
    ]);
    return this.mapOrdenCompraToResult(ordenActualizada, usuariosMap);
  }

  /**
   * Cancela orden compra
   * Solo se puede cancelar si NO está COMPLETADA ni ya CANCELADA
   */
  async cancelarOrdenCompra(idOrdenCompra: number, motivo: string, _userId: number): Promise<OrdenCompraResult> {
    const orden = await this.prisma.ordenes_compra.findUnique({
      where: { id_orden_compra: idOrdenCompra },
    });

    if (!orden) {
      throw new NotFoundException(`Orden compra ID ${idOrdenCompra} no encontrada`);
    }

    if (orden.estado === 'COMPLETADA') {
      throw new ConflictException('No se puede cancelar una orden de compra COMPLETADA');
    }

    if (orden.estado === 'CANCELADA') {
      throw new ConflictException('La orden de compra ya se encuentra CANCELADA');
    }

    // Actualizar estado y motivo en observaciones
    const ordenCancelada = await this.prisma.ordenes_compra.update({
      where: { id_orden_compra: idOrdenCompra },
      data: {
        estado: 'CANCELADA',
        observaciones: `${orden.observaciones ? orden.observaciones + '\n' : ''}[CANCELADA]: ${motivo}`.trim(),
      },
      include: {
        proveedores: {
          select: {
            id_proveedor: true,
            id_persona: true,
            persona: {
              select: {
                nombre_completo: true,
                razon_social: true,
                numero_identificacion: true,
              },
            },
          },
        },
        ordenes_compra_detalle: {
          include: {
            catalogo_componentes: {
              select: {
                id_componente: true,
                referencia_fabricante: true,
                descripcion_corta: true,
                codigo_interno: true,
                unidad_medida: true,
              },
            },
          },
        },
        recepciones_compra: true,
      },
    });

    const usuariosMap = await this.obtenerMapUsuarios([
      ordenCancelada.solicitada_por,
      ordenCancelada.aprobada_por || 0,
    ]);
    return this.mapOrdenCompraToResult(ordenCancelada, usuariosMap);
  }

  /**
   * Lista órdenes compra con filtros y paginación
   */
  async findAll(filters: OrdenesCompraFilters): Promise<OrdenesCompraPaginatedResult> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? filters.limit : 10;
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
        mode: 'insensitive',
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

    // Consulta paginada concurrente
    const [ordenes, total] = await Promise.all([
      this.prisma.ordenes_compra.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id_orden_compra: 'desc' },
        include: {
          proveedores: {
            select: {
              id_proveedor: true,
              id_persona: true,
              persona: {
                select: {
                  nombre_completo: true,
                  razon_social: true,
                  numero_identificacion: true,
                },
              },
            },
          },
          ordenes_compra_detalle: {
            include: {
              catalogo_componentes: {
                select: {
                  id_componente: true,
                  referencia_fabricante: true,
                  descripcion_corta: true,
                  codigo_interno: true,
                  unidad_medida: true,
                },
              },
            },
          },
          recepciones_compra: {
            include: {
              ubicaciones_bodega: {
                select: {
                  id_ubicacion: true,
                  codigo_ubicacion: true,
                  zona: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.ordenes_compra.count({ where }),
    ]);

    // Recolectar IDs de usuarios de todas las órdenes para resolver en un solo query
    const userIds: number[] = [];
    for (const o of ordenes) {
      if (o.solicitada_por) userIds.push(o.solicitada_por);
      if (o.aprobada_por) userIds.push(o.aprobada_por);
    }
    const usuariosMap = await this.obtenerMapUsuarios(userIds);

    return {
      data: ordenes.map((orden) => this.mapOrdenCompraToResult(orden, usuariosMap)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Obtiene orden compra por ID con todas sus relaciones
   */
  async findById(idOrdenCompra: number): Promise<OrdenCompraResult> {
    const orden = await this.prisma.ordenes_compra.findUnique({
      where: { id_orden_compra: idOrdenCompra },
      include: {
        proveedores: {
          select: {
            id_proveedor: true,
            id_persona: true,
            persona: {
              select: {
                nombre_completo: true,
                razon_social: true,
                numero_identificacion: true,
              },
            },
          },
        },
        ordenes_compra_detalle: {
          include: {
            catalogo_componentes: {
              select: {
                id_componente: true,
                referencia_fabricante: true,
                descripcion_corta: true,
                codigo_interno: true,
                unidad_medida: true,
              },
            },
          },
        },
        recepciones_compra: {
          orderBy: {
            fecha_recepcion: 'desc',
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
        },
      },
    });

    if (!orden) {
      throw new NotFoundException(`Orden compra ID ${idOrdenCompra} no encontrada`);
    }

    const userIds = [orden.solicitada_por];
    if (orden.aprobada_por) userIds.push(orden.aprobada_por);
    const usuariosMap = await this.obtenerMapUsuarios(userIds);

    return this.mapOrdenCompraToResult(orden, usuariosMap);
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
            id_persona: true,
            persona: {
              select: {
                nombre_completo: true,
                razon_social: true,
                numero_identificacion: true,
              },
            },
          },
        },
        ordenes_compra_detalle: {
          include: {
            catalogo_componentes: {
              select: {
                id_componente: true,
                referencia_fabricante: true,
                descripcion_corta: true,
                codigo_interno: true,
                unidad_medida: true,
              },
            },
          },
        },
        recepciones_compra: true,
      },
    });

    const userIds: number[] = [];
    for (const o of ordenes) {
      if (o.solicitada_por) userIds.push(o.solicitada_por);
      if (o.aprobada_por) userIds.push(o.aprobada_por);
    }
    const usuariosMap = await this.obtenerMapUsuarios(userIds);

    return ordenes.map((orden) => this.mapOrdenCompraToResult(orden, usuariosMap));
  }

  /**
   * KPIs agregados para el dashboard comercial de órdenes de compra
   */
  async getResumenKpis(): Promise<OrdenesCompraResumenKpis> {
    const [total, borradores, enviadas, parciales, completadas, canceladas, ordenesActivas] = await Promise.all([
      this.prisma.ordenes_compra.count(),
      this.prisma.ordenes_compra.count({ where: { estado: 'BORRADOR' } }),
      this.prisma.ordenes_compra.count({ where: { estado: 'ENVIADA' } }),
      this.prisma.ordenes_compra.count({ where: { estado: 'PARCIAL' } }),
      this.prisma.ordenes_compra.count({ where: { estado: 'COMPLETADA' } }),
      this.prisma.ordenes_compra.count({ where: { estado: 'CANCELADA' } }),
      this.prisma.ordenes_compra.findMany({
        where: { estado: { in: ['ENVIADA', 'PARCIAL', 'COMPLETADA'] } },
        select: {
          ordenes_compra_detalle: {
            select: {
              subtotal: true,
              cantidad: true,
              precio_unitario: true,
            },
          },
        },
      }),
    ]);

    let montoTotal = 0;
    for (const oc of ordenesActivas) {
      for (const d of oc.ordenes_compra_detalle) {
        const sub = d.subtotal ? Number(d.subtotal) : Number(d.cantidad) * Number(d.precio_unitario);
        montoTotal += sub * 1.19; // IVA 19%
      }
    }

    return {
      total_ordenes: total,
      borradores,
      enviadas,
      parciales,
      completadas,
      canceladas,
      monto_total_comprometido: Math.round(montoTotal),
    };
  }

  /**
   * Obtiene catálogo de artículos para un proveedor (articulos_proveedores pactados + catálogo base)
   */
  async getSourcingProveedor(idProveedor: number): Promise<ArticuloSourcingResult[]> {
    // 1. Obtener los pactados para este proveedor
    const pactados = await this.prisma.articulos_proveedores.findMany({
      where: {
        id_proveedor: idProveedor,
        activo: true,
      },
      include: {
        catalogo_componentes: {
          select: {
            id_componente: true,
            codigo_interno: true,
            descripcion_corta: true,
            referencia_fabricante: true,
            precio_compra: true,
            stock_actual: true,
            unidad_medida: true,
          },
        },
      },
    });

    const pactadosMap = new Map<number, (typeof pactados)[0]>();
    for (const p of pactados) {
      pactadosMap.set(p.id_componente, p);
    }

    // 2. Obtener componentes activos del catálogo
    const todosComponentes = await this.prisma.catalogo_componentes.findMany({
      where: { activo: true, es_comprable: true },
      select: {
        id_componente: true,
        codigo_interno: true,
        descripcion_corta: true,
        referencia_fabricante: true,
        precio_compra: true,
        stock_actual: true,
        unidad_medida: true,
      },
      orderBy: { descripcion_corta: 'asc' },
    });

    return todosComponentes.map((c) => {
      const pactado = pactadosMap.get(c.id_componente);
      if (pactado) {
        return {
          id_componente: c.id_componente,
          codigo_interno: c.codigo_interno,
          descripcion_corta: c.descripcion_corta,
          referencia_fabricante: c.referencia_fabricante,
          referencia_proveedor: pactado.referencia_proveedor,
          costo_actual: Number(pactado.costo_actual),
          moneda: pactado.moneda,
          tiempo_entrega_dias: pactado.tiempo_entrega_dias,
          cantidad_minima_compra: pactado.cantidad_minima_compra ? Number(pactado.cantidad_minima_compra) : null,
          es_pactado: true,
          stock_actual: c.stock_actual,
          unidad_medida: c.unidad_medida,
        };
      }

      return {
        id_componente: c.id_componente,
        codigo_interno: c.codigo_interno,
        descripcion_corta: c.descripcion_corta,
        referencia_fabricante: c.referencia_fabricante,
        referencia_proveedor: null,
        costo_actual: Number(c.precio_compra || 0),
        moneda: 'COP',
        tiempo_entrega_dias: null,
        cantidad_minima_compra: null,
        es_pactado: false,
        stock_actual: c.stock_actual,
        unidad_medida: c.unidad_medida,
      };
    });
  }

  /**
   * Obtiene el costo específico de un componente para un proveedor
   */
  async getCostoComponente(idProveedor: number, idComponente: number): Promise<CostoComponenteResult> {
    const pactado = await this.prisma.articulos_proveedores.findUnique({
      where: {
        id_componente_id_proveedor: {
          id_componente: idComponente,
          id_proveedor: idProveedor,
        },
      },
    });

    if (pactado && pactado.activo) {
      return {
        id_componente: idComponente,
        id_proveedor: idProveedor,
        costo: Number(pactado.costo_actual),
        moneda: pactado.moneda,
        referencia_proveedor: pactado.referencia_proveedor,
        tiempo_entrega_dias: pactado.tiempo_entrega_dias,
        es_pactado: true,
      };
    }

    const componente = await this.prisma.catalogo_componentes.findUnique({
      where: { id_componente: idComponente },
      select: { id_componente: true, precio_compra: true, referencia_fabricante: true },
    });

    if (!componente) {
      throw new NotFoundException(`Componente ID ${idComponente} no encontrado en el catálogo`);
    }

    return {
      id_componente: idComponente,
      id_proveedor: idProveedor,
      costo: Number(componente.precio_compra || 0),
      moneda: 'COP',
      referencia_proveedor: null,
      tiempo_entrega_dias: null,
      es_pactado: false,
    };
  }

  /**
   * Mapper: Prisma entity → Result DTO con cálculos financieros transparentes
   */
  private mapOrdenCompraToResult(
    orden: any,
    usuariosMap?: Map<number, { id_usuario: number; nombre_completo: string; username: string }>,
  ): OrdenCompraResult {
    const detallesRaw = orden.ordenes_compra_detalle || [];
    let subtotalCalculado = 0;

    const detalles = detallesRaw.map((detalle: any) => {
      const cantidad = parseFloat(detalle.cantidad?.toString() || '0');
      const precioUnitario = parseFloat(detalle.precio_unitario?.toString() || '0');
      const subtotalItem = detalle.subtotal
        ? parseFloat(detalle.subtotal.toString())
        : parseFloat((cantidad * precioUnitario).toFixed(2));

      subtotalCalculado += subtotalItem;

      // Calcular acumulados de recepciones para esta línea
      const recepcionesDetalle = (orden.recepciones_compra || []).filter(
        (r: any) => r.id_detalle_orden === detalle.id_detalle,
      );
      const cantidad_recibida_acumulada = recepcionesDetalle.reduce(
        (acc: number, r: any) => acc + parseFloat(r.cantidad_recibida?.toString() || '0'),
        0,
      );
      const cantidad_aceptada_acumulada = recepcionesDetalle.reduce(
        (acc: number, r: any) => acc + parseFloat(r.cantidad_aceptada?.toString() || '0'),
        0,
      );
      const cantidad_rechazada_acumulada = recepcionesDetalle.reduce(
        (acc: number, r: any) => acc + parseFloat(r.cantidad_rechazada?.toString() || '0'),
        0,
      );
      const cantidad_pendiente = Math.max(0, cantidad - cantidad_recibida_acumulada);

      return {
        id_detalle: detalle.id_detalle,
        id_componente: detalle.id_componente,
        cantidad,
        cantidad_recibida_acumulada,
        cantidad_aceptada_acumulada,
        cantidad_rechazada_acumulada,
        cantidad_pendiente,
        precio_unitario: precioUnitario,
        subtotal: subtotalItem,
        observaciones: detalle.observaciones,
        componente: detalle.catalogo_componentes
          ? {
              id_componente: detalle.catalogo_componentes.id_componente,
              referencia_fabricante: detalle.catalogo_componentes.referencia_fabricante,
              descripcion_corta: detalle.catalogo_componentes.descripcion_corta,
              codigo_interno: detalle.catalogo_componentes.codigo_interno,
              unidad_medida: detalle.catalogo_componentes.unidad_medida,
            }
          : undefined,
      };
    });

    const porcentajeIva = 19;
    const ivaCalculado = parseFloat((subtotalCalculado * (porcentajeIva / 100)).toFixed(2));
    const totalCalculado = parseFloat((subtotalCalculado + ivaCalculado).toFixed(2));

    const solicitanteInfo = usuariosMap?.get(orden.solicitada_por);
    const aprobadorInfo = orden.aprobada_por ? usuariosMap?.get(orden.aprobada_por) : null;

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
      subtotal: parseFloat(subtotalCalculado.toFixed(2)),
      porcentaje_iva: porcentajeIva,
      iva: ivaCalculado,
      total: totalCalculado,
      total_items: detalles.length,
      proveedor: orden.proveedores
        ? {
            id_proveedor: orden.proveedores.id_proveedor,
            nombre_completo: orden.proveedores.persona?.nombre_completo || 'N/A',
            razon_social: orden.proveedores.persona?.razon_social || null,
            numero_identificacion: orden.proveedores.persona?.numero_identificacion || null,
          }
        : undefined,
      solicitante: solicitanteInfo
        ? {
            id_usuario: solicitanteInfo.id_usuario,
            nombre_completo: solicitanteInfo.nombre_completo,
            username: solicitanteInfo.username,
          }
        : undefined,
      aprobador: aprobadorInfo
        ? {
            id_usuario: aprobadorInfo.id_usuario,
            nombre_completo: aprobadorInfo.nombre_completo,
            username: aprobadorInfo.username,
          }
        : null,
      detalles,
      recepciones: (orden.recepciones_compra || []).map((recepcion: any) => ({
        id_recepcion: recepcion.id_recepcion,
        numero_recepcion: recepcion.numero_recepcion,
        id_detalle_orden: recepcion.id_detalle_orden,
        cantidad_recibida: parseFloat(recepcion.cantidad_recibida?.toString() || '0'),
        cantidad_aceptada: parseFloat(recepcion.cantidad_aceptada?.toString() || '0'),
        cantidad_rechazada: parseFloat(recepcion.cantidad_rechazada?.toString() || '0'),
        tipo_recepcion: recepcion.tipo_recepcion,
        calidad: recepcion.calidad,
        id_ubicacion_destino: recepcion.id_ubicacion_destino,
        ubicacion_nombre: recepcion.ubicaciones_bodega?.codigo_ubicacion || null,
        observaciones: recepcion.observaciones,
        fecha_recepcion: recepcion.fecha_recepcion,
      })),
    };
  }
}
