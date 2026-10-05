import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateArticuloMaestroDto,
  ArticuloProveedorInicialDto,
} from './dto/create-articulo-maestro.dto';
import {
  VincularProveedorDto,
  ActualizarPrecioProveedorDto,
} from './dto/sourcing-proveedor.dto';
import { FiltrosArticulosDto } from './dto/filtros-articulos.dto';
import {
  destino_articulo_enum,
  origen_costo_enum,
  Prisma,
} from '@prisma/client';

@Injectable()
export class ArticulosService {
  private readonly logger = new Logger(ArticulosService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * =========================================================================
   * CREACIÓN ATÓMICA DE ARTÍCULO MAESTRO CON MATRIZ DE PROVEEDORES Y AUDITORÍA
   * =========================================================================
   * 1. Inserta la entidad agnóstica en `catalogo_componentes`.
   * 2. Si se suministran proveedores, los enlaza en `articulos_proveedores`.
   * 3. Registra automáticamente la primera entrada inmutable en `historial_costos_compra`.
   * Todo ejecutado en una única transacción de Prisma ($transaction).
   */
  async create(
    dto: CreateArticuloMaestroDto,
    idUsuario?: number,
  ): Promise<any> {
    this.logger.log(
      `Iniciando creación de artículo maestro: ${dto.referencia_fabricante} (${dto.destino_articulo})`,
    );

    // 1. Verificación previa de existencia de tipo_componente
    const tipo = await this.prisma.tipos_componente.findUnique({
      where: { id_tipo_componente: dto.id_tipo_componente },
    });
    if (!tipo) {
      throw new NotFoundException(
        `El tipo de componente / categoría ID ${dto.id_tipo_componente} no existe.`,
      );
    }

    // 2. Verificación previa de unicidad de código interno si fue suministrado
    if (dto.codigo_interno && dto.codigo_interno.trim() !== '') {
      const existeCodigo = await this.prisma.catalogo_componentes.findFirst({
        where: {
          codigo_interno: {
            equals: dto.codigo_interno.trim(),
            mode: 'insensitive',
          },
        },
      });
      if (existeCodigo) {
        throw new ConflictException(
          `Ya existe un artículo registrado con el código interno '${dto.codigo_interno}'.`,
        );
      }
    }

    // 3. Preparación de proveedores iniciales a vincular
    const proveedoresIniciales: ArticuloProveedorInicialDto[] = [];

    if (dto.proveedores_iniciales && dto.proveedores_iniciales.length > 0) {
      proveedoresIniciales.push(...dto.proveedores_iniciales);
    } else if (dto.id_proveedor_principal && dto.precio_compra !== undefined) {
      // Atajo de creación rápida con proveedor principal en el formulario base
      proveedoresIniciales.push({
        id_proveedor: dto.id_proveedor_principal,
        referencia_proveedor: dto.referencia_fabricante,
        marca_ofrecida: dto.marca,
        costo_actual: Number(dto.precio_compra),
        moneda: dto.moneda || 'COP',
        tiempo_entrega_dias: 1,
        cantidad_minima_compra: 1,
        es_proveedor_preferido: true,
      });
    }

    // Verificar que los proveedores indicados existan antes de abrir la transacción
    if (proveedoresIniciales.length > 0) {
      const idsProveedores = proveedoresIniciales.map((p) => p.id_proveedor);
      const provsExistentes = await this.prisma.proveedores.findMany({
        where: { id_proveedor: { in: idsProveedores } },
        select: { id_proveedor: true },
      });
      const idsExistentes = new Set(provsExistentes.map((p) => p.id_proveedor));
      for (const provId of idsProveedores) {
        if (!idsExistentes.has(provId)) {
          throw new NotFoundException(`El proveedor con ID ${provId} no existe.`);
        }
      }
    }

    // 4. Ejecución atómica en transacción Prisma
    try {
      return await this.prisma.$transaction(async (tx) => {
        // PASO 1: Insertar Recurso Base en la Tabla Maestra
        const componenteCreado = await tx.catalogo_componentes.create({
          data: {
            id_tipo_componente: dto.id_tipo_componente,
            codigo_interno: dto.codigo_interno?.trim() || null,
            referencia_fabricante: dto.referencia_fabricante.trim(),
            marca: dto.marca?.trim() || null,
            descripcion_corta: dto.descripcion_corta?.trim() || null,
            descripcion_detallada: dto.descripcion_detallada?.trim() || null,
            especificaciones_tecnicas: dto.especificaciones_tecnicas || undefined,
            tipo_comercial: (dto.tipo_comercial as any) || 'ORIGINAL',
            destino_articulo: dto.destino_articulo || destino_articulo_enum.INSUMO_SERVICIO,
            es_comprable: dto.es_comprable !== undefined ? dto.es_comprable : true,
            es_inventariable: dto.es_inventariable !== undefined ? dto.es_inventariable : true,
            es_facturable: dto.es_facturable !== undefined ? dto.es_facturable : true,
            requiere_serializacion: dto.requiere_serializacion ?? false,
            es_activo_fijo: dto.es_activo_fijo ?? false,
            numero_serie_activo: dto.numero_serie_activo?.trim() || null,
            placa_inventario: dto.placa_inventario?.trim() || null,
            frecuencia_mantenimiento_meses: dto.frecuencia_mantenimiento_meses || null,
            precio_compra: dto.precio_compra !== undefined ? new Prisma.Decimal(dto.precio_compra) : null,
            precio_venta: dto.precio_venta !== undefined ? new Prisma.Decimal(dto.precio_venta) : null,
            margen_utilidad_porcentaje:
              dto.margen_utilidad_porcentaje !== undefined
                ? new Prisma.Decimal(dto.margen_utilidad_porcentaje)
                : null,
            moneda: dto.moneda || 'COP',
            id_proveedor_principal:
              dto.id_proveedor_principal ||
              proveedoresIniciales.find((p) => p.es_proveedor_preferido)?.id_proveedor ||
              proveedoresIniciales[0]?.id_proveedor ||
              null,
            stock_minimo: dto.stock_minimo ?? 0,
            stock_actual: dto.stock_actual ?? 0,
            unidad_medida: dto.unidad_medida || 'UNIDAD',
            observaciones: dto.observaciones?.trim() || null,
            notas_instalacion: dto.notas_instalacion?.trim() || null,
            activo: true,
            creado_por: idUsuario || null,
          },
        });

        const idComponente = componenteCreado.id_componente;

        // PASO 2 & 3: Matriz de Proveedores y Bitácora de Auditoría
        for (const prov of proveedoresIniciales) {
          // Inserción en la matriz de referencias cruzadas
          await tx.articulos_proveedores.create({
            data: {
              id_componente: idComponente,
              id_proveedor: prov.id_proveedor,
              referencia_proveedor: prov.referencia_proveedor.trim(),
              marca_ofrecida: prov.marca_ofrecida?.trim() || dto.marca?.trim() || null,
              nombre_segun_proveedor: prov.nombre_segun_proveedor?.trim() || null,
              costo_actual: new Prisma.Decimal(prov.costo_actual),
              moneda: prov.moneda || 'COP',
              tiempo_entrega_dias: prov.tiempo_entrega_dias ?? 1,
              cantidad_minima_compra: prov.cantidad_minima_compra
                ? new Prisma.Decimal(prov.cantidad_minima_compra)
                : new Prisma.Decimal(1),
              escalas_precios: prov.escalas_precios ? (prov.escalas_precios as any) : undefined,
              es_proveedor_preferido: prov.es_proveedor_preferido ?? false,
              url_producto_proveedor: prov.url_producto_proveedor?.trim() || null,
              activo: true,
              notas: prov.notas?.trim() || null,
              registrado_por: idUsuario || null,
            },
          });

          // Inserción automática e inmutable en el historial de costos
          await tx.historial_costos_compra.create({
            data: {
              id_componente: idComponente,
              id_proveedor: prov.id_proveedor,
              costo_unitario: new Prisma.Decimal(prov.costo_actual),
              costo_unitario_anterior: null,
              moneda: prov.moneda || 'COP',
              porcentaje_variacion: new Prisma.Decimal(0),
              cantidad_adquirida: prov.cantidad_minima_compra
                ? new Prisma.Decimal(prov.cantidad_minima_compra)
                : null,
              origen_cambio: origen_costo_enum.REGISTRO_INICIAL,
              observaciones: 'Alta inicial del artículo y costo base de adquisición registrado.',
              id_usuario: idUsuario || null,
            },
          });
        }

        // Recuperar y retornar la entidad completa con sus relaciones
        return await tx.catalogo_componentes.findUnique({
          where: { id_componente: idComponente },
          include: {
            tipos_componente: true,
            articulos_proveedores: {
              include: {
                proveedores: {
                  include: {
                    persona: {
                      select: {
                        razon_social: true,
                        nombre_comercial: true,
                        numero_identificacion: true,
                      },
                    },
                  },
                },
              },
            },
            historial_costos_compra: {
              orderBy: { fecha_registro: 'desc' },
              include: {
                proveedores: {
                  include: {
                    persona: {
                      select: { razon_social: true, nombre_comercial: true },
                    },
                  },
                },
                usuarios: {
                  select: { username: true, email: true },
                },
              },
            },
          },
        });
      });
    } catch (error: any) {
      this.logger.error(`Error en creación atómica de artículo maestro: ${error?.message || error}`, error?.stack);
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Error al crear artículo en la base de datos: ${error?.message || error}`,
      );
    }
  }

  /**
   * =========================================================================
   * VINCULAR UN NUEVO PROVEEDOR A UN ARTÍCULO EXISTENTE (CROSS-REFERENCING)
   * =========================================================================
   */
  async vincularProveedor(
    idComponente: number,
    dto: VincularProveedorDto,
    idUsuario?: number,
  ) {
    const articulo = await this.prisma.catalogo_componentes.findUnique({
      where: { id_componente: idComponente },
    });
    if (!articulo) {
      throw new NotFoundException(`El artículo maestro ID ${idComponente} no existe.`);
    }

    const proveedor = await this.prisma.proveedores.findUnique({
      where: { id_proveedor: dto.id_proveedor },
    });
    if (!proveedor) {
      throw new NotFoundException(`El proveedor ID ${dto.id_proveedor} no existe.`);
    }

    return await this.prisma.$transaction(async (tx) => {
      // Si se marca como preferido, desmarcar los anteriores del mismo componente
      if (dto.es_proveedor_preferido) {
        await tx.articulos_proveedores.updateMany({
          where: { id_componente: idComponente },
          data: { es_proveedor_preferido: false },
        });
        await tx.catalogo_componentes.update({
          where: { id_componente: idComponente },
          data: {
            id_proveedor_principal: dto.id_proveedor,
            precio_compra: new Prisma.Decimal(dto.costo_actual),
          },
        });
      }

      // Upsert en la matriz de referencias cruzadas
      const vinculo = await tx.articulos_proveedores.upsert({
        where: {
          id_componente_id_proveedor: {
            id_componente: idComponente,
            id_proveedor: dto.id_proveedor,
          },
        },
        create: {
          id_componente: idComponente,
          id_proveedor: dto.id_proveedor,
          referencia_proveedor: dto.referencia_proveedor.trim(),
          marca_ofrecida: dto.marca_ofrecida?.trim() || articulo.marca,
          nombre_segun_proveedor: dto.nombre_segun_proveedor?.trim() || null,
          costo_actual: new Prisma.Decimal(dto.costo_actual),
          moneda: dto.moneda || 'COP',
          tiempo_entrega_dias: dto.tiempo_entrega_dias ?? 1,
          cantidad_minima_compra: dto.cantidad_minima_compra
            ? new Prisma.Decimal(dto.cantidad_minima_compra)
            : new Prisma.Decimal(1),
          escalas_precios: dto.escalas_precios ? (dto.escalas_precios as any) : undefined,
          es_proveedor_preferido: dto.es_proveedor_preferido ?? false,
          url_producto_proveedor: dto.url_producto_proveedor?.trim() || null,
          notas: dto.notas?.trim() || null,
          registrado_por: idUsuario || null,
        },
        update: {
          referencia_proveedor: dto.referencia_proveedor.trim(),
          marca_ofrecida: dto.marca_ofrecida?.trim() || articulo.marca,
          nombre_segun_proveedor: dto.nombre_segun_proveedor?.trim() || null,
          costo_actual: new Prisma.Decimal(dto.costo_actual),
          moneda: dto.moneda || 'COP',
          tiempo_entrega_dias: dto.tiempo_entrega_dias ?? 1,
          cantidad_minima_compra: dto.cantidad_minima_compra
            ? new Prisma.Decimal(dto.cantidad_minima_compra)
            : undefined,
          escalas_precios: dto.escalas_precios ? (dto.escalas_precios as any) : undefined,
          es_proveedor_preferido: dto.es_proveedor_preferido ?? false,
          url_producto_proveedor: dto.url_producto_proveedor?.trim() || null,
          notas: dto.notas?.trim() || null,
          activo: true,
          modificado_por: idUsuario || null,
        },
      });

      // Registro de bitácora
      await tx.historial_costos_compra.create({
        data: {
          id_componente: idComponente,
          id_proveedor: dto.id_proveedor,
          costo_unitario: new Prisma.Decimal(dto.costo_actual),
          moneda: dto.moneda || 'COP',
          numero_factura_oc: dto.numero_factura_oc?.trim() || null,
          origen_cambio: dto.origen_cambio || origen_costo_enum.ACTUALIZACION_PROVEEDOR,
          observaciones:
            dto.notas ||
            `Vinculación de proveedor ${dto.id_proveedor} con referencia ${dto.referencia_proveedor}`,
          id_usuario: idUsuario || null,
        },
      });

      return vinculo;
    });
  }

  /**
   * =========================================================================
   * ACTUALIZAR PRECIO DE UN PROVEEDOR CON CÁLCULO DE VARIACIÓN Y AUDITORÍA
   * =========================================================================
   */
  async actualizarPrecioProveedor(
    idComponente: number,
    idProveedor: number,
    dto: ActualizarPrecioProveedorDto,
    idUsuario?: number,
  ) {
    const vinculoExistente = await this.prisma.articulos_proveedores.findUnique({
      where: {
        id_componente_id_proveedor: {
          id_componente: idComponente,
          id_proveedor: idProveedor,
        },
      },
    });

    if (!vinculoExistente) {
      throw new NotFoundException(
        `El artículo ID ${idComponente} no tiene vinculado al proveedor ID ${idProveedor}.`,
      );
    }

    const costoAnterior = Number(vinculoExistente.costo_actual);
    const nuevoCosto = Number(dto.nuevo_costo);
    let porcentajeVariacion = 0;

    if (costoAnterior > 0) {
      porcentajeVariacion = ((nuevoCosto - costoAnterior) / costoAnterior) * 100;
      porcentajeVariacion = Math.round(porcentajeVariacion * 100) / 100; // 2 decimales
    }

    return await this.prisma.$transaction(async (tx) => {
      // 1. Actualizar el costo vigente en la matriz de referencias cruzadas
      const vinculoActualizado = await tx.articulos_proveedores.update({
        where: {
          id_componente_id_proveedor: {
            id_componente: idComponente,
            id_proveedor: idProveedor,
          },
        },
        data: {
          costo_actual: new Prisma.Decimal(nuevoCosto),
          moneda: dto.moneda || vinculoExistente.moneda,
          escalas_precios: dto.escalas_precios ? (dto.escalas_precios as any) : undefined,
          modificado_por: idUsuario || null,
        },
      });

      // 2. Si es el proveedor preferido, sincronizar también el costo base de referencia
      if (vinculoExistente.es_proveedor_preferido) {
        await tx.catalogo_componentes.update({
          where: { id_componente: idComponente },
          data: {
            precio_compra: new Prisma.Decimal(nuevoCosto),
            modificado_por: idUsuario || null,
          },
        });
      }

      // 3. Registrar entrada append-only en la bitácora inmutable de costos
      const registroHistorial = await tx.historial_costos_compra.create({
        data: {
          id_componente: idComponente,
          id_proveedor: idProveedor,
          costo_unitario: new Prisma.Decimal(nuevoCosto),
          costo_unitario_anterior: new Prisma.Decimal(costoAnterior),
          moneda: dto.moneda || vinculoExistente.moneda,
          porcentaje_variacion: new Prisma.Decimal(porcentajeVariacion),
          cantidad_adquirida: dto.cantidad_adquirida
            ? new Prisma.Decimal(dto.cantidad_adquirida)
            : null,
          numero_factura_oc: dto.numero_factura_oc?.trim() || null,
          origen_cambio: dto.origen_cambio || origen_costo_enum.ACTUALIZACION_PROVEEDOR,
          observaciones:
            dto.observaciones?.trim() ||
            `Actualización de precio de ${costoAnterior} a ${nuevoCosto} (${porcentajeVariacion > 0 ? '+' : ''}${porcentajeVariacion}%)`,
          id_usuario: idUsuario || null,
        },
      });

      return {
        vinculo: vinculoActualizado,
        historial: registroHistorial,
        variacion_porcentual: porcentajeVariacion,
      };
    });
  }

  /**
   * Desvincular o desactivar un proveedor de un artículo
   */
  async desvincularProveedor(idComponente: number, idProveedor: number) {
    const vinculo = await this.prisma.articulos_proveedores.findUnique({
      where: {
        id_componente_id_proveedor: {
          id_componente: idComponente,
          id_proveedor: idProveedor,
        },
      },
    });
    if (!vinculo) {
      throw new NotFoundException('Vínculo no encontrado');
    }

    return await this.prisma.articulos_proveedores.delete({
      where: {
        id_componente_id_proveedor: {
          id_componente: idComponente,
          id_proveedor: idProveedor,
        },
      },
    });
  }

  /**
   * Obtener matriz de referencias cruzadas / proveedores para un artículo
   */
  async getFuentesSuministro(idComponente: number) {
    return await this.prisma.articulos_proveedores.findMany({
      where: { id_componente: idComponente },
      include: {
        proveedores: {
          include: {
            persona: {
              select: {
                id_persona: true,
                razon_social: true,
                nombre_comercial: true,
                numero_identificacion: true,
                telefono_principal: true,
                email_principal: true,
              },
            },
          },
        },
      },
      orderBy: [{ es_proveedor_preferido: 'desc' }, { costo_actual: 'asc' }],
    });
  }

  /**
   * Obtener bitácora inmutable de historial de costos
   */
  async getHistorialCostos(idComponente: number, idProveedor?: number) {
    const where: Prisma.historial_costos_compraWhereInput = {
      id_componente: idComponente,
    };
    if (idProveedor) {
      where.id_proveedor = idProveedor;
    }

    return await this.prisma.historial_costos_compra.findMany({
      where,
      orderBy: { fecha_registro: 'desc' },
      include: {
        proveedores: {
          include: {
            persona: {
              select: {
                razon_social: true,
                nombre_comercial: true,
                numero_identificacion: true,
              },
            },
          },
        },
        usuarios: {
          select: {
            id_usuario: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Búsqueda y listado general con filtros avanzados
   */
  async findAll(filtros: FiltrosArticulosDto) {
    const where: Prisma.catalogo_componentesWhereInput = {};

    if (filtros.activo !== undefined) {
      where.activo = filtros.activo;
    }

    if (filtros.destino_articulo) {
      where.destino_articulo = filtros.destino_articulo;
    }

    if (filtros.id_tipo_componente) {
      where.id_tipo_componente = filtros.id_tipo_componente;
    }

    if (filtros.marca) {
      where.marca = { contains: filtros.marca, mode: 'insensitive' };
    }

    if (filtros.es_comprable !== undefined) {
      where.es_comprable = filtros.es_comprable;
    }

    if (filtros.es_inventariable !== undefined) {
      where.es_inventariable = filtros.es_inventariable;
    }

    if (filtros.id_proveedor) {
      where.articulos_proveedores = {
        some: { id_proveedor: filtros.id_proveedor },
      };
    }

    if (filtros.q && filtros.q.trim() !== '') {
      const q = filtros.q.trim();
      where.OR = [
        { codigo_interno: { contains: q, mode: 'insensitive' } },
        { referencia_fabricante: { contains: q, mode: 'insensitive' } },
        { descripcion_corta: { contains: q, mode: 'insensitive' } },
        { marca: { contains: q, mode: 'insensitive' } },
        {
          articulos_proveedores: {
            some: {
              referencia_proveedor: { contains: q, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.catalogo_componentes.findMany({
        where,
        skip: filtros.skip || 0,
        take: filtros.limit || 50,
        orderBy: { id_componente: 'desc' },
        include: {
          tipos_componente: true,
          proveedores: {
            include: {
              persona: {
                select: { razon_social: true, nombre_comercial: true },
              },
            },
          },
          articulos_proveedores: {
            where: { activo: true },
            include: {
              proveedores: {
                include: {
                  persona: {
                    select: { razon_social: true, nombre_comercial: true },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.catalogo_componentes.count({ where }),
    ]);

    return {
      items,
      total,
      skip: filtros.skip || 0,
      limit: filtros.limit || 50,
    };
  }

  /**
   * Obtener detalle completo de un artículo por su ID
   */
  async findOne(idComponente: number) {
    const item = await this.prisma.catalogo_componentes.findUnique({
      where: { id_componente: idComponente },
      include: {
        tipos_componente: true,
        proveedores: {
          include: {
            persona: true,
          },
        },
        articulos_proveedores: {
          include: {
            proveedores: {
              include: {
                persona: true,
              },
            },
          },
          orderBy: [{ es_proveedor_preferido: 'desc' }, { costo_actual: 'asc' }],
        },
        historial_costos_compra: {
          take: 15,
          orderBy: { fecha_registro: 'desc' },
          include: {
            proveedores: {
              include: {
                persona: {
                  select: { razon_social: true, nombre_comercial: true },
                },
              },
            },
            usuarios: {
              select: { username: true, email: true },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`El artículo maestro ID ${idComponente} no fue encontrado.`);
    }

    return item;
  }
}
