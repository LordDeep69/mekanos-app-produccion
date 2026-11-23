import {
  BadRequestException,
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
import { UpdateCatalogoComponenteDto } from './dto/update-catalogo-componente.dto';
import { VincularProveedorDto, ActualizarPrecioProveedorDto } from './dto/sourcing-proveedor.dto';
import { FiltrosArticulosDto } from './dto/filtros-articulos.dto';
import {
  formatCorrelativeCode,
  reserveNextSequenceCounter,
} from '../common/utils/sequence-counter.helper';
import {
  PG_ACCENT_FROM,
  PG_ACCENT_TO,
  tokenizeSearchQuery,
} from '../common/utils/search-tokens.helper';
import {
  destino_articulo_enum,
  origen_costo_enum,
  Prisma,
  tipo_componente_comercial_enum,
} from '@prisma/client';

@Injectable()
export class ArticulosService {
  private readonly logger = new Logger(ArticulosService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resuelve el `id_tipo_componente` legacy (columna opcional Int? en PostgreSQL).
   * - Si el cliente lo envía, se valida que exista.
   * - Si no viene, se asigna `null`, desacoplando completamente la taxonomía legacy.
   * La clasificación real del artículo es `id_categoria` (categorias_componente).
   */
  private async resolverTipoComponente(idTipo?: number): Promise<number | null> {
    if (idTipo !== undefined && idTipo !== null) {
      const tipo = await this.prisma.tipos_componente.findUnique({
        where: { id_tipo_componente: idTipo },
      });
      if (!tipo) {
        throw new NotFoundException(
          `El tipo de componente legacy ID ${idTipo} no existe en el sistema.`,
        );
      }
      return tipo.id_tipo_componente;
    }
    return null;
  }

  private readonly includeAplicabilidadTiposEquipo = {
    catalogo_componentes_tipo_equipo: {
      include: {
        tipos_equipo: {
          select: {
            id_tipo_equipo: true,
            codigo_tipo: true,
            nombre_tipo: true,
            color_hex: true,
            icono_ui: true,
          },
        },
      },
    },
    catalogo_componentes_modulo_tecnico: {
      include: {
        modulos_tecnicos: {
          select: {
            id_modulo: true,
            codigo_modulo: true,
            nombre_modulo: true,
            icono: true,
            color_ui: true,
          },
        },
      },
    },
  } as const;

  private async normalizarAplicabilidadTiposEquipo(
    aplicaTodos?: boolean,
    tiposIds?: number[],
    modulosIds?: number[],
  ): Promise<{ aplicaTodos: boolean; uniqueIds: number[]; uniqueModuloIds: number[] }> {
    const cleanIds = Array.isArray(tiposIds)
      ? Array.from(new Set(tiposIds.map((id) => Number(id)).filter((n) => Number.isInteger(n) && n > 0)))
      : [];

    // Si el usuario selecciona explícitamente tipos específicos y no marca "aplica_todos_tipos: true"
    const esUniversal =
      aplicaTodos === true
        ? true
        : aplicaTodos === false
          ? cleanIds.length === 0
          : cleanIds.length === 0;

    if (esUniversal) {
      return { aplicaTodos: true, uniqueIds: [], uniqueModuloIds: [] };
    }

    const existentes = await this.prisma.tipos_equipo.findMany({
      where: { id_tipo_equipo: { in: cleanIds } },
      select: { id_tipo_equipo: true },
    });
    const setExistentes = new Set(existentes.map((t) => t.id_tipo_equipo));
    const faltantes = cleanIds.filter((id) => !setExistentes.has(id));
    if (faltantes.length > 0) {
      throw new NotFoundException(
        `Los siguientes tipos de equipo no existen: ${faltantes.join(', ')}`,
      );
    }

    const cleanModIds = Array.isArray(modulosIds)
      ? Array.from(
          new Set(modulosIds.map((id) => Number(id)).filter((n) => Number.isInteger(n) && n > 0)),
        )
      : [];

    if (cleanModIds.length > 0) {
      const modsExistentes = await this.prisma.modulos_tecnicos.findMany({
        where: { id_modulo: { in: cleanModIds } },
        select: { id_modulo: true },
      });
      const setMods = new Set(modsExistentes.map((m) => m.id_modulo));
      const faltantesMod = cleanModIds.filter((id) => !setMods.has(id));
      if (faltantesMod.length > 0) {
        throw new NotFoundException(
          `Las siguientes partes/subsistemas técnicos no existen: ${faltantesMod.join(', ')}`,
        );
      }
    }

    return { aplicaTodos: false, uniqueIds: cleanIds, uniqueModuloIds: cleanModIds };
  }

  private enriquecerAplicabilidad<T extends Record<string, any>>(item: T): T {
    if (!item) return item;
    const relaciones = Array.isArray(item.catalogo_componentes_tipo_equipo)
      ? item.catalogo_componentes_tipo_equipo
      : [];
    const tiposEquipo = relaciones
      .map((r: any) => r?.tipos_equipo)
      .filter(Boolean)
      .sort((a: any, b: any) =>
        String(a.nombre_tipo || '').localeCompare(String(b.nombre_tipo || ''), 'es'),
      );
    const tiposEquipoIds = tiposEquipo.map((t: any) => t.id_tipo_equipo);
    const aplicaTodos = item.aplica_todos_tipos !== false && tiposEquipoIds.length === 0;

    const relModulos = Array.isArray(item.catalogo_componentes_modulo_tecnico)
      ? item.catalogo_componentes_modulo_tecnico
      : [];
    const modulosTecnicos = relModulos
      .map((r: any) => r?.modulos_tecnicos)
      .filter(Boolean)
      .sort((a: any, b: any) =>
        String(a.nombre_modulo || '').localeCompare(String(b.nombre_modulo || ''), 'es'),
      );
    const modulosTecnicosIds = modulosTecnicos.map((m: any) => m.id_modulo);

    return {
      ...item,
      aplica_todos_tipos: aplicaTodos,
      tipos_equipo_ids: tiposEquipoIds,
      tipos_equipo: tiposEquipo,
      modulos_tecnicos_ids: modulosTecnicosIds,
      modulos_tecnicos: modulosTecnicos,
    };
  }

  /**
   * Generación atómica del siguiente SKU formal vía sequence_counter.
   * Formato industrial estandarizado: ART-{YYYY}-{0001} (ej: ART-2026-0001).
   */
  private async generarSiguienteSku(tx: Prisma.TransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    let reserved = await reserveNextSequenceCounter(tx, 'ART', year);
    let candidato = formatCorrelativeCode('ART', year, reserved.sequence, 4);

    let existe = await tx.catalogo_componentes.findFirst({
      where: { codigo_interno: { equals: candidato, mode: 'insensitive' } },
    });

    while (existe) {
      reserved = await reserveNextSequenceCounter(tx, 'ART', year);
      candidato = formatCorrelativeCode('ART', year, reserved.sequence, 4);
      existe = await tx.catalogo_componentes.findFirst({
        where: { codigo_interno: { equals: candidato, mode: 'insensitive' } },
      });
    }

    return candidato;
  }

  /**
   * Obtiene el siguiente SKU sugerido sin bloquear ni consumir la secuencia.
   */
  async obtenerSiguienteSku(): Promise<{
    siguiente_codigo: string;
    correlativo: number;
    prefijo: string;
    anio: number;
  }> {
    const year = new Date().getFullYear();
    const seq = await this.prisma.sequence_counter.findFirst({
      where: { type: 'ART', year },
    });
    let nextVal = Number(seq?.current_value || 0) + 1;

    const articulosAnio = await this.prisma.catalogo_componentes.findMany({
      where: {
        codigo_interno: {
          startsWith: `ART-${year}-`,
        },
      },
      select: { codigo_interno: true },
    });

    for (const art of articulosAnio) {
      if (art.codigo_interno) {
        const parts = art.codigo_interno.split('-');
        if (parts.length === 3) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num) && num >= nextVal) {
            nextVal = num + 1;
          }
        }
      }
    }

    let candidato = `ART-${year}-${String(nextVal).padStart(4, '0')}`;
    let existe = await this.prisma.catalogo_componentes.findFirst({
      where: { codigo_interno: { equals: candidato, mode: 'insensitive' } },
    });

    while (existe) {
      nextVal++;
      candidato = `ART-${year}-${String(nextVal).padStart(4, '0')}`;
      existe = await this.prisma.catalogo_componentes.findFirst({
        where: { codigo_interno: { equals: candidato, mode: 'insensitive' } },
      });
    }

    return {
      siguiente_codigo: candidato,
      correlativo: nextVal,
      prefijo: 'ART',
      anio: year,
    };
  }

  /**
   * Valida en tiempo real si un código interno o SKU está disponible o ya existe.
   */
  async validarCodigoInterno(
    codigo: string,
    idComponenteActual?: number,
  ): Promise<{
    disponible: boolean;
    codigo: string;
    motivo: string;
    articulo_existente?: {
      id_componente: number;
      descripcion_corta: string | null;
      referencia_fabricante: string;
      codigo_interno: string | null;
    };
  }> {
    const clean = codigo?.trim();
    if (!clean) {
      return {
        disponible: true,
        codigo: '',
        motivo: 'Código vacío (se auto-generará si se deja en blanco)',
      };
    }

    const where = {
      codigo_interno: {
        equals: clean,
        mode: 'insensitive' as const,
      },
    } as any;

    if (idComponenteActual) {
      where.id_componente = { not: idComponenteActual };
    }

    const existente = await this.prisma.catalogo_componentes.findFirst({
      where,
      select: {
        id_componente: true,
        descripcion_corta: true,
        referencia_fabricante: true,
        codigo_interno: true,
      },
    });

    if (existente) {
      return {
        disponible: false,
        codigo: clean,
        motivo: `El código "${clean}" ya se encuentra asignado a: ${
          existente.descripcion_corta || existente.referencia_fabricante
        } (ID #${existente.id_componente})`,
        articulo_existente: existente,
      };
    }

    return {
      disponible: true,
      codigo: clean,
      motivo: 'Código único y disponible para su asignación.',
    };
  }

  /** IDs de una categoría y todos sus descendientes (tabla pequeña: recorrido en memoria). */
  private async obtenerIdsCategoriaConDescendientes(idRaiz: number): Promise<number[]> {
    const todas = await this.prisma.categorias_componente.findMany({
      select: { id_categoria: true, id_padre: true },
    });
    const hijosPorPadre = new Map<number, number[]>();
    for (const c of todas) {
      if (c.id_padre === null) continue;
      const lista = hijosPorPadre.get(c.id_padre) ?? [];
      lista.push(c.id_categoria);
      hijosPorPadre.set(c.id_padre, lista);
    }
    const resultado: number[] = [];
    const pila = [idRaiz];
    const visitados = new Set<number>();
    while (pila.length) {
      const actual = pila.pop() as number;
      if (visitados.has(actual)) continue;
      visitados.add(actual);
      resultado.push(actual);
      pila.push(...(hijosPorPadre.get(actual) ?? []));
    }
    return resultado;
  }

  /**
   * =========================================================================
   * CREACIÓN ATÓMICA DE ARTÍCULO MAESTRO CON MATRIZ DE PROVEEDORES Y AUDITORÍA
   * =========================================================================
   * 1. Inserta la entidad agnóstica en `catalogo_componentes`.
   * 2. Si se suministran proveedores, los enlaza en `articulos_proveedores`.
   * 3. Registra automáticamente la primera entrada inmutable en `historial_costos_compra`.
   * Todo ejecutado en una única transacción de Prisma ($transaction).
   */
  async create(dto: CreateArticuloMaestroDto, idUsuario?: number): Promise<any> {
    this.logger.log(
      `Iniciando creación de artículo maestro: ${dto.referencia_fabricante} (${dto.destino_articulo})`,
    );

    // 1. Resolución del tipo legacy (opcional desde el cliente)
    const idTipoComponente = await this.resolverTipoComponente(dto.id_tipo_componente);

    // 1b. Resolución de aplicabilidad directa N:M por tipos_equipo y modulos_tecnicos (partes/subsistemas)
    const aplicabilidad = await this.normalizarAplicabilidadTiposEquipo(
      dto.aplica_todos_tipos,
      dto.tipos_equipo_ids,
      dto.modulos_tecnicos_ids,
    );

    // 2. Verificación y resolución de llaves foráneas normalizadas
    let marcaTexto = dto.marca?.trim() || null;
    if (dto.id_marca) {
      const marcaEntity = await this.prisma.marcas.findUnique({
        where: { id_marca: dto.id_marca },
      });
      if (!marcaEntity) {
        throw new NotFoundException(`La marca con ID ${dto.id_marca} no existe en el sistema.`);
      }
      if (!marcaTexto) {
        marcaTexto = marcaEntity.nombre;
      }
    }

    let unidadTexto = (dto.unidad_medida?.trim() || 'UNIDAD').slice(0, 20);
    if (dto.codigo_unidad_medida) {
      const codigoUnidad = dto.codigo_unidad_medida.trim().toUpperCase();
      const unidadEntity = await this.prisma.unidades_medida.findUnique({
        where: { codigo: codigoUnidad },
      });
      if (!unidadEntity) {
        throw new NotFoundException(`La unidad de medida '${dto.codigo_unidad_medida}' no existe.`);
      }
      if (!dto.unidad_medida || dto.unidad_medida === 'UNIDAD') {
        const nom = unidadEntity.nombre.trim();
        unidadTexto = (nom.length <= 20 ? nom : unidadEntity.simbolo || unidadEntity.codigo)
          .trim()
          .slice(0, 20);
      }
    }

    if (dto.id_categoria) {
      const catEntity = await this.prisma.categorias_componente.findUnique({
        where: { id_categoria: dto.id_categoria },
      });
      if (!catEntity) {
        throw new NotFoundException(
          `La categoría taxonómica con ID ${dto.id_categoria} no existe en el sistema.`,
        );
      }
    }

    // 3. Verificación previa de unicidad de código interno si fue suministrado
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

    // 4. Preparación de proveedores iniciales a vincular
    const proveedoresIniciales: ArticuloProveedorInicialDto[] = [];

    if (dto.proveedores_iniciales && dto.proveedores_iniciales.length > 0) {
      proveedoresIniciales.push(...dto.proveedores_iniciales);
    } else if (dto.id_proveedor_principal && dto.precio_compra !== undefined) {
      // Atajo de creación rápida con proveedor principal en el formulario base
      proveedoresIniciales.push({
        id_proveedor: dto.id_proveedor_principal,
        referencia_proveedor: dto.referencia_fabricante,
        marca_ofrecida: marcaTexto || dto.marca,
        id_marca_ofrecida: dto.id_marca,
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

    // 5. Ejecución atómica en transacción Prisma
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Generar SKU formal correlativo si el cliente no lo suministró
        let codigoInterno = dto.codigo_interno?.trim() || null;
        if (!codigoInterno) {
          codigoInterno = await this.generarSiguienteSku(tx);
        }

        // PASO 1: Insertar Recurso Base en la Tabla Maestra con llaves foráneas normalizadas
        const esInventariable = dto.es_inventariable !== undefined ? dto.es_inventariable : true;
        const stockInicial = esInventariable ? Math.max(0, dto.stock_actual ?? 0) : 0;

        const componenteCreado = await tx.catalogo_componentes.create({
          data: {
            id_tipo_componente: idTipoComponente,
            id_marca: dto.id_marca || null,
            codigo_unidad_medida: dto.codigo_unidad_medida
              ? dto.codigo_unidad_medida.trim().toUpperCase()
              : null,
            id_categoria: dto.id_categoria || null,
            codigo_interno: codigoInterno,
            referencia_fabricante: dto.referencia_fabricante.trim(),
            marca: marcaTexto,
            descripcion_corta: dto.descripcion_corta?.trim() || null,
            descripcion_detallada: dto.descripcion_detallada?.trim() || null,
            especificaciones_tecnicas: dto.especificaciones_tecnicas || undefined,
            tipo_comercial: dto.tipo_comercial || tipo_componente_comercial_enum.ORIGINAL,
            destino_articulo: dto.destino_articulo || destino_articulo_enum.INSUMO_SERVICIO,
            es_comprable: dto.es_comprable !== undefined ? dto.es_comprable : true,
            es_inventariable: dto.es_inventariable !== undefined ? dto.es_inventariable : true,
            es_facturable: dto.es_facturable !== undefined ? dto.es_facturable : true,
            requiere_serializacion: dto.requiere_serializacion ?? false,
            es_activo_fijo: dto.es_activo_fijo ?? false,
            numero_serie_activo: dto.numero_serie_activo?.trim() || null,
            placa_inventario: dto.placa_inventario?.trim() || null,
            frecuencia_mantenimiento_meses: dto.frecuencia_mantenimiento_meses || null,
            precio_compra:
              dto.precio_compra !== undefined ? new Prisma.Decimal(dto.precio_compra) : null,
            precio_venta:
              dto.precio_venta !== undefined ? new Prisma.Decimal(dto.precio_venta) : null,
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
            stock_actual: stockInicial,
            unidad_medida: unidadTexto,
            observaciones: dto.observaciones?.trim() || null,
            notas_instalacion: dto.notas_instalacion?.trim() || null,
            aplica_todos_tipos: aplicabilidad.aplicaTodos,
            activo: true,
            creado_por: idUsuario || null,
          },
        });

        const idComponente = componenteCreado.id_componente;

        if (!aplicabilidad.aplicaTodos && aplicabilidad.uniqueIds.length > 0) {
          await tx.catalogo_componentes_tipo_equipo.createMany({
            data: aplicabilidad.uniqueIds.map((idTipoEquipo) => ({
              id_componente: idComponente,
              id_tipo_equipo: idTipoEquipo,
            })),
            skipDuplicates: true,
          });
          if (aplicabilidad.uniqueModuloIds.length > 0) {
            await tx.catalogo_componentes_modulo_tecnico.createMany({
              data: aplicabilidad.uniqueModuloIds.map((idModulo) => ({
                id_componente: idComponente,
                id_modulo: idModulo,
              })),
              skipDuplicates: true,
            });
          }
        }

        // Stock inicial = movimiento auditable en Kardex (el stock nunca se "digita")
        if (stockInicial > 0) {
          const bodega = await tx.ubicaciones_bodega.findFirst({
            where: { activo: true },
          });

          await tx.movimientos_inventario.create({
            data: {
              tipo_movimiento: 'ENTRADA',
              origen_movimiento: 'INVENTARIO_INICIAL',
              id_componente: idComponente,
              cantidad: new Prisma.Decimal(stockInicial),
              costo_unitario:
                dto.precio_compra !== undefined && dto.precio_compra !== null
                  ? new Prisma.Decimal(dto.precio_compra)
                  : null,
              id_ubicacion: bodega?.id_ubicacion || null,
              justificacion: 'Stock inicial registrado en el alta del artículo.',
              observaciones: 'Apertura de balance de inventario formal.',
              realizado_por: idUsuario || 1,
              fecha_movimiento: new Date(),
            },
          });
        }

        // PASO 2 & 3: Matriz de Proveedores y Bitácora de Auditoría
        for (const prov of proveedoresIniciales) {
          // Inserción en la matriz de referencias cruzadas
          await tx.articulos_proveedores.create({
            data: {
              id_componente: idComponente,
              id_proveedor: prov.id_proveedor,
              referencia_proveedor: prov.referencia_proveedor.trim(),
              marca_ofrecida: prov.marca_ofrecida?.trim() || marcaTexto || null,
              id_marca_ofrecida: prov.id_marca_ofrecida || dto.id_marca || null,
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

        // Recuperar y retornar la entidad completa con todas sus relaciones taxonómicas
        const completo = await tx.catalogo_componentes.findUnique({
          where: { id_componente: idComponente },
          include: {
            tipos_componente: true,
            marcas: true,
            unidades_medida: true,
            categorias_componente: true,
            ...this.includeAplicabilidadTiposEquipo,
            articulos_proveedores: {
              include: {
                marcas: true,
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
        return this.enriquecerAplicabilidad(completo as any);
      });
    } catch (error: any) {
      this.logger.error(
        `Error en creación atómica de artículo maestro: ${error?.message || error}`,
        error?.stack,
      );
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
  async vincularProveedor(idComponente: number, dto: VincularProveedorDto, idUsuario?: number) {
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
      // 1. Si se marca como preferido, desmarcar los anteriores del mismo componente
      const esPreferido =
        dto.es_proveedor_preferido !== undefined
          ? dto.es_proveedor_preferido
          : vinculoExistente.es_proveedor_preferido;

      if (dto.es_proveedor_preferido === true) {
        await tx.articulos_proveedores.updateMany({
          where: { id_componente: idComponente },
          data: { es_proveedor_preferido: false },
        });
      }

      // 2. Actualizar datos en la matriz de referencias cruzadas con trazabilidad completa
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
          referencia_proveedor:
            dto.referencia_proveedor?.trim() || vinculoExistente.referencia_proveedor,
          nombre_segun_proveedor:
            dto.nombre_segun_proveedor !== undefined
              ? dto.nombre_segun_proveedor.trim() || null
              : vinculoExistente.nombre_segun_proveedor,
          marca_ofrecida:
            dto.marca_ofrecida !== undefined
              ? dto.marca_ofrecida.trim() || null
              : vinculoExistente.marca_ofrecida,
          id_marca_ofrecida:
            dto.id_marca_ofrecida !== undefined
              ? dto.id_marca_ofrecida
              : vinculoExistente.id_marca_ofrecida,
          cantidad_minima_compra:
            dto.cantidad_minima_compra !== undefined
              ? new Prisma.Decimal(dto.cantidad_minima_compra)
              : vinculoExistente.cantidad_minima_compra,
          tiempo_entrega_dias:
            dto.tiempo_entrega_dias !== undefined
              ? dto.tiempo_entrega_dias
              : vinculoExistente.tiempo_entrega_dias,
          es_proveedor_preferido: esPreferido,
          url_producto_proveedor:
            dto.url_producto_proveedor !== undefined
              ? dto.url_producto_proveedor.trim() || null
              : vinculoExistente.url_producto_proveedor,
          notas:
            (dto.observaciones || dto.notas) !== undefined
              ? (dto.observaciones || dto.notas || '').trim() || null
              : vinculoExistente.notas,
          escalas_precios: dto.escalas_precios ? (dto.escalas_precios as any) : undefined,
          modificado_por: idUsuario || null,
        },
      });

      // 3. Si es o pasa a ser el proveedor preferido, sincronizar también el costo base de referencia
      if (esPreferido) {
        await tx.catalogo_componentes.update({
          where: { id_componente: idComponente },
          data: {
            id_proveedor_principal: idProveedor,
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
   * =========================================================================
   * ACTUALIZACIÓN ATÓMICA DE ARTÍCULO MAESTRO (CON RELACIONES NORMALIZADAS)
   * =========================================================================
   * Modifica los atributos del recurso base, validando e inyectando las nuevas
   * llaves foráneas (id_marca, codigo_unidad_medida, id_categoria) en una transacción.
   */
  async update(id: number, dto: UpdateCatalogoComponenteDto, idUsuario?: number) {
    this.logger.log(`Iniciando actualización de artículo maestro ID ${id}`);

    // 1. Verificar existencia del artículo
    const articuloActual = await this.prisma.catalogo_componentes.findUnique({
      where: { id_componente: id },
    });
    if (!articuloActual) {
      throw new NotFoundException(`El artículo maestro ID ${id} no existe.`);
    }

    // 2. Validar tipo_componente si se modifica
    if (dto.id_tipo_componente !== undefined) {
      await this.resolverTipoComponente(dto.id_tipo_componente);
    }

    // 2b. El stock solo cambia mediante movimientos de inventario (Kardex)
    if (
      (dto as any).stock_actual !== undefined &&
      (dto as any).stock_actual !== (articuloActual.stock_actual ?? 0)
    ) {
      throw new BadRequestException(
        'El stock no se edita desde el catálogo. Registra un movimiento (entrada, salida o ajuste) en Inventario.',
      );
    }

    // 3. Validar y sincronizar id_marca si se suministra
    let marcaTexto: string | null | undefined =
      dto.marca !== undefined ? dto.marca?.trim() || null : undefined;

    if (dto.id_marca !== undefined) {
      if (dto.id_marca) {
        const marcaEntity = await this.prisma.marcas.findUnique({
          where: { id_marca: dto.id_marca },
        });
        if (!marcaEntity) {
          throw new NotFoundException(`La marca con ID ${dto.id_marca} no existe en el sistema.`);
        }
        if (!marcaTexto) {
          marcaTexto = marcaEntity.nombre;
        }
      } else {
        marcaTexto = null;
      }
    }

    // 4. Validar y sincronizar codigo_unidad_medida si se suministra
    let unidadTexto: string | null | undefined =
      dto.unidad_medida !== undefined ? dto.unidad_medida?.trim().slice(0, 20) || null : undefined;

    if (dto.codigo_unidad_medida !== undefined) {
      if (dto.codigo_unidad_medida) {
        const cod = dto.codigo_unidad_medida.trim().toUpperCase();
        const unidadEntity = await this.prisma.unidades_medida.findUnique({
          where: { codigo: cod },
        });
        if (!unidadEntity) {
          throw new NotFoundException(
            `La unidad de medida '${dto.codigo_unidad_medida}' no existe en el sistema.`,
          );
        }
        if (!unidadTexto || unidadTexto === 'UNIDAD') {
          const nom = unidadEntity.nombre.trim();
          unidadTexto = (nom.length <= 20 ? nom : unidadEntity.simbolo || unidadEntity.codigo)
            .trim()
            .slice(0, 20);
        }
      }
    }

    // 5. Validar id_categoria si se suministra
    if (dto.id_categoria !== undefined && dto.id_categoria) {
      const catEntity = await this.prisma.categorias_componente.findUnique({
        where: { id_categoria: dto.id_categoria },
      });
      if (!catEntity) {
        throw new NotFoundException(
          `La categoría taxonómica con ID ${dto.id_categoria} no existe en el sistema.`,
        );
      }
    }

    // 6. Validar unicidad de código interno si se modifica
    if (
      dto.codigo_interno !== undefined &&
      dto.codigo_interno !== null &&
      dto.codigo_interno.trim() !== ''
    ) {
      const duplicado = await this.prisma.catalogo_componentes.findFirst({
        where: {
          id_componente: { not: id },
          codigo_interno: {
            equals: dto.codigo_interno.trim(),
            mode: 'insensitive',
          },
        },
      });
      if (duplicado) {
        throw new ConflictException(
          `Ya existe otro artículo registrado con el código interno '${dto.codigo_interno}'.`,
        );
      }
    }

    // 6b. Validar aplicabilidad N:M por tipos_equipo y modulos_tecnicos si se modifica
    const actualizaAplicabilidad =
      dto.aplica_todos_tipos !== undefined ||
      dto.tipos_equipo_ids !== undefined ||
      dto.modulos_tecnicos_ids !== undefined;
    const nuevaAplicabilidad = actualizaAplicabilidad
      ? await this.normalizarAplicabilidadTiposEquipo(
          dto.aplica_todos_tipos,
          dto.tipos_equipo_ids,
          dto.modulos_tecnicos_ids,
        )
      : null;

    // 7. Ejecutar actualización atómica en transacción
    return await this.prisma.$transaction(async (tx) => {
      const data: Prisma.catalogo_componentesUpdateInput = {
        fecha_modificacion: new Date(),
        modificado_por: idUsuario || null,
      };

      if (dto.id_tipo_componente !== undefined) {
        data.tipos_componente = dto.id_tipo_componente
          ? { connect: { id_tipo_componente: dto.id_tipo_componente } }
          : { disconnect: true };
      }

      if (dto.id_marca !== undefined) {
        data.marcas = dto.id_marca ? { connect: { id_marca: dto.id_marca } } : { disconnect: true };
      }

      if (dto.codigo_unidad_medida !== undefined) {
        data.unidades_medida = dto.codigo_unidad_medida
          ? { connect: { codigo: dto.codigo_unidad_medida.trim().toUpperCase() } }
          : { disconnect: true };
      }

      if (dto.id_categoria !== undefined) {
        data.categorias_componente = dto.id_categoria
          ? { connect: { id_categoria: dto.id_categoria } }
          : { disconnect: true };
      }

      if (dto.codigo_interno !== undefined) {
        data.codigo_interno = dto.codigo_interno?.trim() || null;
      }

      if (dto.referencia_fabricante !== undefined) {
        data.referencia_fabricante = dto.referencia_fabricante.trim();
      }

      if (marcaTexto !== undefined) {
        data.marca = marcaTexto;
      }

      if (dto.descripcion_corta !== undefined) {
        data.descripcion_corta = dto.descripcion_corta?.trim() || null;
      }

      if (dto.descripcion_detallada !== undefined) {
        data.descripcion_detallada = dto.descripcion_detallada?.trim() || null;
      }

      if (dto.especificaciones_tecnicas !== undefined) {
        data.especificaciones_tecnicas = dto.especificaciones_tecnicas;
      }

      if (dto.tipo_comercial !== undefined) {
        data.tipo_comercial = dto.tipo_comercial;
      }

      if (dto.destino_articulo !== undefined) {
        data.destino_articulo = dto.destino_articulo;
      }

      if (dto.es_comprable !== undefined) data.es_comprable = dto.es_comprable;
      if (dto.es_inventariable !== undefined) data.es_inventariable = dto.es_inventariable;
      if (dto.es_facturable !== undefined) data.es_facturable = dto.es_facturable;
      if (dto.requiere_serializacion !== undefined)
        data.requiere_serializacion = dto.requiere_serializacion;
      if (dto.es_activo_fijo !== undefined) data.es_activo_fijo = dto.es_activo_fijo;
      if (dto.numero_serie_activo !== undefined)
        data.numero_serie_activo = dto.numero_serie_activo?.trim() || null;
      if (dto.placa_inventario !== undefined)
        data.placa_inventario = dto.placa_inventario?.trim() || null;
      if (dto.frecuencia_mantenimiento_meses !== undefined)
        data.frecuencia_mantenimiento_meses = dto.frecuencia_mantenimiento_meses;

      if (dto.precio_compra !== undefined) {
        data.precio_compra =
          dto.precio_compra !== null ? new Prisma.Decimal(dto.precio_compra) : null;
      }

      if (dto.precio_venta !== undefined) {
        data.precio_venta = dto.precio_venta !== null ? new Prisma.Decimal(dto.precio_venta) : null;
      }

      if (dto.margen_utilidad_porcentaje !== undefined) {
        data.margen_utilidad_porcentaje =
          dto.margen_utilidad_porcentaje !== null
            ? new Prisma.Decimal(dto.margen_utilidad_porcentaje)
            : null;
      }

      if (dto.moneda !== undefined) data.moneda = dto.moneda || 'COP';
      if (dto.id_proveedor_principal !== undefined) {
        data.proveedores = dto.id_proveedor_principal
          ? { connect: { id_proveedor: dto.id_proveedor_principal } }
          : { disconnect: true };
      }
      if (dto.stock_minimo !== undefined) data.stock_minimo = dto.stock_minimo;
      if (unidadTexto !== undefined) data.unidad_medida = unidadTexto;
      if (dto.observaciones !== undefined) data.observaciones = dto.observaciones?.trim() || null;
      if (dto.notas_instalacion !== undefined)
        data.notas_instalacion = dto.notas_instalacion?.trim() || null;
      if (nuevaAplicabilidad) {
        data.aplica_todos_tipos = nuevaAplicabilidad.aplicaTodos;
      }

      await tx.catalogo_componentes.update({
        where: { id_componente: id },
        data,
      });

      if (nuevaAplicabilidad) {
        await tx.catalogo_componentes_tipo_equipo.deleteMany({
          where: { id_componente: id },
        });
        await tx.catalogo_componentes_modulo_tecnico.deleteMany({
          where: { id_componente: id },
        });
        if (!nuevaAplicabilidad.aplicaTodos && nuevaAplicabilidad.uniqueIds.length > 0) {
          await tx.catalogo_componentes_tipo_equipo.createMany({
            data: nuevaAplicabilidad.uniqueIds.map((idTipoEquipo) => ({
              id_componente: id,
              id_tipo_equipo: idTipoEquipo,
            })),
            skipDuplicates: true,
          });
          if (nuevaAplicabilidad.uniqueModuloIds.length > 0) {
            await tx.catalogo_componentes_modulo_tecnico.createMany({
              data: nuevaAplicabilidad.uniqueModuloIds.map((idModulo) => ({
                id_componente: id,
                id_modulo: idModulo,
              })),
              skipDuplicates: true,
            });
          }
        }
      }

      const actualizado = await tx.catalogo_componentes.findUnique({
        where: { id_componente: id },
        include: {
          tipos_componente: true,
          marcas: true,
          unidades_medida: true,
          categorias_componente: true,
          ...this.includeAplicabilidadTiposEquipo,
          proveedores: {
            include: {
              persona: true,
            },
          },
          articulos_proveedores: {
            where: { activo: true },
            include: {
              marcas: true,
              proveedores: {
                include: {
                  persona: true,
                },
              },
            },
          },
        },
      });
      return this.enriquecerAplicabilidad(actualizado as any);
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

    if (filtros.id_marca) {
      where.id_marca = filtros.id_marca;
    }

    if (filtros.id_categoria) {
      // Incluye la categoría seleccionada y TODAS sus subcategorías (coherente con el árbol)
      const idsCategoria = await this.obtenerIdsCategoriaConDescendientes(filtros.id_categoria);
      where.id_categoria = { in: idsCategoria };
    }

    const filterEquipoIds: number[] = [];
    if (filtros.id_tipo_equipo) {
      filterEquipoIds.push(Number(filtros.id_tipo_equipo));
    }
    if (filtros.tipos_equipo_ids && filtros.tipos_equipo_ids.trim() !== '') {
      for (const raw of filtros.tipos_equipo_ids.split(',')) {
        const n = Number(raw.trim());
        if (Number.isInteger(n) && n > 0) filterEquipoIds.push(n);
      }
    }
    if (filterEquipoIds.length > 0) {
      const uniqueEquipoIds = Array.from(new Set(filterEquipoIds));
      const equipoCond: Prisma.catalogo_componentesWhereInput = {
        OR: [
          { aplica_todos_tipos: true },
          {
            catalogo_componentes_tipo_equipo: {
              some: { id_tipo_equipo: { in: uniqueEquipoIds } },
            },
          },
        ],
      };
      if (where.AND) {
        if (Array.isArray(where.AND)) {
          (where.AND as any[]).push(equipoCond);
        } else {
          where.AND = [where.AND, equipoCond];
        }
      } else {
        where.AND = [equipoCond];
      }
    }

    if (filtros.id_modulo) {
      const moduloCond: Prisma.catalogo_componentesWhereInput = {
        OR: [
          { aplica_todos_tipos: true },
          { catalogo_componentes_modulo_tecnico: { none: {} } },
          {
            catalogo_componentes_modulo_tecnico: {
              some: { id_modulo: Number(filtros.id_modulo) },
            },
          },
        ],
      };
      if (where.AND) {
        if (Array.isArray(where.AND)) {
          (where.AND as any[]).push(moduloCond);
        } else {
          where.AND = [where.AND, moduloCond];
        }
      } else {
        where.AND = [moduloCond];
      }
    }

    if (filtros.codigo_unidad_medida) {
      where.codigo_unidad_medida = filtros.codigo_unidad_medida;
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
      const provCondition: Prisma.catalogo_componentesWhereInput = {
        OR: [
          { id_proveedor_principal: filtros.id_proveedor },
          {
            articulos_proveedores: {
              some: { id_proveedor: filtros.id_proveedor },
            },
          },
        ],
      };
      if (where.AND) {
        if (Array.isArray(where.AND)) {
          (where.AND as any[]).push(provCondition);
        } else {
          where.AND = [where.AND, provCondition];
        }
      } else {
        where.AND = [provCondition];
      }
    }

    if (filtros.q && filtros.q.trim() !== '') {
      const tokens = tokenizeSearchQuery(filtros.q);
      if (tokens.length > 0) {
        const tokenClauses = tokens.map((tok) => {
          const pattern = `%${tok}%`;
          return Prisma.sql`(
            translate(lower(COALESCE(cc.codigo_interno, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}
            OR translate(lower(COALESCE(cc.referencia_fabricante, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}
            OR translate(lower(COALESCE(cc.descripcion_corta, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}
            OR translate(lower(COALESCE(cc.marca, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}
            OR translate(lower(COALESCE(m.nombre, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}
            OR translate(lower(COALESCE(cat.nombre, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}
            OR EXISTS (
              SELECT 1 FROM articulos_proveedores ap
              WHERE ap.id_componente = cc.id_componente
                AND translate(lower(COALESCE(ap.referencia_proveedor, '')), ${PG_ACCENT_FROM}, ${PG_ACCENT_TO}) LIKE ${pattern}
            )
          )`;
        });

        const matchedRows = await this.prisma.$queryRaw<{ id_componente: number }[]>(
          Prisma.sql`
            SELECT cc.id_componente
            FROM catalogo_componentes cc
            LEFT JOIN marcas m ON m.id_marca = cc.id_marca
            LEFT JOIN categorias_componente cat ON cat.id_categoria = cc.id_categoria
            WHERE ${Prisma.join(tokenClauses, ' AND ')}
          `,
        );

        const matchedIds = matchedRows.map((r) => r.id_componente);
        const searchIdCondition = { id_componente: { in: matchedIds } };
        if (where.AND) {
          if (Array.isArray(where.AND)) {
            (where.AND as any[]).push(searchIdCondition);
          } else {
            where.AND = [where.AND, searchIdCondition];
          }
        } else {
          where.AND = [searchIdCondition];
        }
      }
    }

    const page = filtros.page ? Math.max(1, filtros.page) : undefined;
    const limit = filtros.limit ? Math.max(1, filtros.limit) : 50;
    const skip = filtros.skip !== undefined ? filtros.skip : page ? (page - 1) * limit : 0;

    const [items, total] = await Promise.all([
      this.prisma.catalogo_componentes.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id_componente: 'desc' },
        include: {
          tipos_componente: true,
          marcas: true,
          unidades_medida: true,
          categorias_componente: true,
          ...this.includeAplicabilidadTiposEquipo,
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
              marcas: true,
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

    const currentPage = page ?? Math.floor(skip / limit) + 1;
    const totalPages = Math.ceil(total / limit);

    return {
      items: items.map((it) => this.enriquecerAplicabilidad(it as any)),
      total,
      skip,
      limit,
      page: currentPage,
      totalPages,
    };
  }

  /**
   * Obtener detalle completo de un artículo por su ID (Ficha 360°)
   */
  async findOne(idComponente: number) {
    const item = await this.prisma.catalogo_componentes.findUnique({
      where: { id_componente: idComponente },
      include: {
        tipos_componente: true,
        marcas: true,
        unidades_medida: true,
        categorias_componente: true,
        ...this.includeAplicabilidadTiposEquipo,
        proveedores: {
          include: {
            persona: true,
          },
        },
        articulos_proveedores: {
          include: {
            marcas: true,
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
        lotes_componentes: {
          where: { cantidad_actual: { gt: 0 } },
          include: {
            movimientos_inventario: {
              take: 1,
              orderBy: { fecha_movimiento: 'desc' },
              include: {
                ubicaciones_bodega: {
                  select: {
                    id_ubicacion: true,
                    codigo_ubicacion: true,
                    zona: true,
                    pasillo: true,
                    estante: true,
                    nivel: true,
                  },
                },
              },
            },
          },
          orderBy: { fecha_ingreso: 'desc' },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`El artículo maestro ID ${idComponente} no fue encontrado.`);
    }

    return this.enriquecerAplicabilidad(item as any);
  }

  /**
   * Valida restricciones de integridad de negocio antes de desactivar un repuesto.
   * Reglas Zero-Trust:
   * 1. No se puede desactivar un repuesto con existencias físicas en bodega (> 0).
   * 2. No se puede desactivar si está comprometido en órdenes de compra abiertas.
   */
  async validarDesactivacion(idComponente: number): Promise<void> {
    const articulo = await this.prisma.catalogo_componentes.findUnique({
      where: { id_componente: idComponente },
      select: {
        id_componente: true,
        descripcion_corta: true,
        referencia_fabricante: true,
        stock_actual: true,
        ordenes_compra_detalle: {
          select: {
            id_orden_compra: true,
            ordenes_compra: {
              select: {
                numero_orden_compra: true,
                estado: true,
              },
            },
          },
        },
      },
    });

    if (!articulo) {
      throw new NotFoundException(`El artículo ID ${idComponente} no existe.`);
    }

    if (articulo.stock_actual && articulo.stock_actual > 0) {
      throw new BadRequestException(
        `No es posible desactivar el repuesto '${articulo.descripcion_corta || articulo.referencia_fabricante}' porque cuenta con ${articulo.stock_actual} unidades en existencias físicas en bodega. Debe regularizarse el inventario antes de archivarlo.`,
      );
    }

    const ocActivas = articulo.ordenes_compra_detalle.filter((det) => {
      const estado = det.ordenes_compra?.estado;
      return (
        estado && ['BORRADOR', 'PENDIENTE', 'APROBADA', 'EN_TRANSITO'].includes(estado as string)
      );
    });

    if (ocActivas.length > 0) {
      const ocNumeros = ocActivas
        .map((o) => o.ordenes_compra?.numero_orden_compra || `#${o.id_orden_compra}`)
        .join(', ');
      throw new BadRequestException(
        `No es posible desactivar el repuesto porque está comprometido en órdenes de compra en curso: ${ocNumeros}.`,
      );
    }
  }

  /**
   * Desactivar (soft-delete) con guardas de integridad
   */
  async desactivar(idComponente: number, idUsuario: number = 1) {
    await this.validarDesactivacion(idComponente);

    return await this.prisma.catalogo_componentes.update({
      where: { id_componente: idComponente },
      data: {
        activo: false,
        modificado_por: idUsuario,
        fecha_modificacion: new Date(),
      },
    });
  }

  /**
   * Reactivar un artículo previamente archivado
   */
  async reactivar(idComponente: number, idUsuario: number = 1) {
    const articulo = await this.prisma.catalogo_componentes.findUnique({
      where: { id_componente: idComponente },
    });
    if (!articulo) {
      throw new NotFoundException(`El artículo ID ${idComponente} no existe.`);
    }

    return await this.prisma.catalogo_componentes.update({
      where: { id_componente: idComponente },
      data: {
        activo: true,
        modificado_por: idUsuario,
        fecha_modificacion: new Date(),
      },
    });
  }

  /**
   * Resumen y KPIs globales del Catálogo Maestro
   */
  async getResumen() {
    const [
      totalArticulos,
      totalActivos,
      totalInactivos,
      totalInventariables,
      arquetiposGroup,
      articulosActivos,
    ] = await Promise.all([
      this.prisma.catalogo_componentes.count(),
      this.prisma.catalogo_componentes.count({ where: { activo: true } }),
      this.prisma.catalogo_componentes.count({ where: { activo: false } }),
      this.prisma.catalogo_componentes.count({
        where: { activo: true, es_inventariable: true },
      }),
      this.prisma.catalogo_componentes.groupBy({
        by: ['destino_articulo'],
        where: { activo: true },
        _count: { id_componente: true },
      }),
      this.prisma.catalogo_componentes.findMany({
        where: { activo: true },
        select: {
          stock_actual: true,
          stock_minimo: true,
          precio_compra: true,
        },
      }),
    ]);

    let articulosStockBajo = 0;
    let articulosSinStock = 0;
    let valorTotalInventario = 0;

    for (const item of articulosActivos) {
      const stock = item.stock_actual || 0;
      const min = item.stock_minimo || 0;
      const costo = item.precio_compra ? Number(item.precio_compra) : 0;

      if (stock === 0) {
        articulosSinStock++;
      }
      if (min > 0 && stock <= min) {
        articulosStockBajo++;
      }
      valorTotalInventario += stock * costo;
    }

    const porArquetipo: Record<string, number> = {};
    for (const g of arquetiposGroup) {
      if (g.destino_articulo) {
        porArquetipo[g.destino_articulo] = g._count.id_componente;
      }
    }

    return {
      total_articulos: totalArticulos,
      total_activos: totalActivos,
      total_inactivos: totalInactivos,
      total_inventariables: totalInventariables,
      articulos_stock_bajo: articulosStockBajo,
      articulos_sin_stock: articulosSinStock,
      valor_total_inventario: Math.round(valorTotalInventario * 100) / 100,
      por_arquetipo: porArquetipo,
    };
  }
}
