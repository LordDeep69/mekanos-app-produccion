import { PrismaService } from '@mekanos/database';
import { Prisma } from '@prisma/client';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { createHash } from 'crypto';
import {
  formatCorrelativeCode,
  reserveNextSequenceCounter,
} from '../../common/utils/sequence-counter.helper';
import { CreateVersionCommand } from '../commands/versiones/create-version.command';
import { CotizacionesRepository } from '../domain/cotizaciones.repository.interface';
import {
  ConvertirCotizacionOrdenDto,
  CreateItemOtroDto,
  GuardarFirmaCotizacionDto,
  GuardarStudioCompletoDto,
  SyncEquiposCotizacionDto,
  UpdateItemOtroDto,
} from '../dto/cpq-studio.dto';
import { CotizacionCalculoService } from './cotizacion-calculo.service';

/**
 * COTIZACIONES CPQ SERVICE (Hub Comercial Universal EAM-CPQ)
 *
 * Orquesta las capacidades avanzadas de ingeniería comercial:
 * - Gestión N:M de equipos vinculados (`cotizaciones_equipos`)
 * - CRUD de Otros Rubros: Transporte, Viáticos, Pólizas, Alquileres, Disposición Ambiental (`items_cotizacion_otros`)
 * - Guardado atómico completo del Studio CPQ (`guardarStudioCompleto`)
 * - Duplicación de cotización y Reapertura controlada con versionado automático (`reabrirBorrador`)
 * - Smart Match Contextual: detección de equipos gemelos por modelo OEM / clase,
 *   ranking de plantillas reutilizables, BOM OEM con stock WMS y recursos compatibles
 * - Quote-to-Order (Q2O): conversión a Orden de Servicio multi-equipo con diagnóstico WMS
 * - Escalamiento Propuesta Correctiva → Cotización Comercial formal
 */
@Injectable()
export class CotizacionesCpqService {
  private readonly logger = new Logger(CotizacionesCpqService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculoService: CotizacionCalculoService,
    private readonly commandBus: CommandBus,
    @Inject('CotizacionesRepository')
    private readonly cotizacionesRepository: CotizacionesRepository,
  ) {}

  private async assertBorrador(idCotizacion: number) {
    const cot = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      select: { id_cotizacion: true, id_estado: true, numero_cotizacion: true },
    });
    if (!cot) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }
    if (cot.id_estado !== 1) {
      throw new BadRequestException(
        'Solo se pueden modificar cotizaciones en estado BORRADOR. Use "Reabrir como nueva versión" para editar.',
      );
    }
    return cot;
  }

  private calcularSubtotalLinea(
    cantidad: number,
    precioUnitario: number,
    descuentoPorcentaje = 0,
  ): number {
    const subtotal = cantidad * precioUnitario * (1 - descuentoPorcentaje / 100);
    return Math.round(subtotal * 100) / 100;
  }

  private normalizeItemEquipos(
    equiposIds?: number[] | null,
    idEquipo?: number | null,
  ): { id_equipo: number | null; equipos_ids: number[] } {
    const clean = Array.isArray(equiposIds)
      ? Array.from(
          new Set(equiposIds.filter((id): id is number => Number.isInteger(id) && Number(id) > 0)),
        )
      : [];
    if (clean.length === 0 && idEquipo && Number.isInteger(idEquipo) && idEquipo > 0) {
      return { id_equipo: idEquipo, equipos_ids: [idEquipo] };
    }
    return {
      id_equipo: clean.length === 1 ? clean[0] : null,
      equipos_ids: clean,
    };
  }

  // ==================== EQUIPOS N:M ====================

  async syncEquipos(idCotizacion: number, dto: SyncEquiposCotizacionDto) {
    await this.assertBorrador(idCotizacion);

    const itemsNormalizados: Array<{
      id_equipo: number;
      orden_secuencia: number;
      notas_alcance?: string;
    }> = [];
    const vistos = new Set<number>();

    if (dto.equipos && dto.equipos.length > 0) {
      dto.equipos.forEach((eq, idx) => {
        if (Number.isInteger(eq.id_equipo) && eq.id_equipo > 0 && !vistos.has(eq.id_equipo)) {
          vistos.add(eq.id_equipo);
          itemsNormalizados.push({
            id_equipo: eq.id_equipo,
            orden_secuencia: eq.orden_secuencia ?? idx + 1,
            notas_alcance: eq.notas_alcance,
          });
        }
      });
    } else if (dto.equipos_ids) {
      dto.equipos_ids.forEach((idEq, idx) => {
        if (Number.isInteger(idEq) && idEq > 0 && !vistos.has(idEq)) {
          vistos.add(idEq);
          itemsNormalizados.push({ id_equipo: idEq, orden_secuencia: idx + 1 });
        }
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cotizaciones_equipos.deleteMany({ where: { id_cotizacion: idCotizacion } });
      if (itemsNormalizados.length > 0) {
        await tx.cotizaciones_equipos.createMany({
          data: itemsNormalizados.map((item) => ({
            id_cotizacion: idCotizacion,
            id_equipo: item.id_equipo,
            orden_secuencia: item.orden_secuencia,
            notas_alcance: item.notas_alcance ?? null,
          })),
        });
      }
      await tx.cotizaciones.update({
        where: { id_cotizacion: idCotizacion },
        data: {
          id_equipo: itemsNormalizados.length > 0 ? itemsNormalizados[0].id_equipo : null,
          fecha_modificacion: new Date(),
        },
      });
    });

    return this.cotizacionesRepository.findById(idCotizacion, {
      cliente: true,
      sede: true,
      equipo: true,
      estado: true,
      items_servicios: true,
      items_componentes: true,
      aprobaciones: true,
    });
  }

  // ==================== OTROS RUBROS (LOGÍSTICA / VIÁTICOS / PÓLIZAS) ====================

  async listarItemsOtros(idCotizacion: number) {
    return this.prisma.items_cotizacion_otros.findMany({
      where: { id_cotizacion: idCotizacion },
      include: {
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
      },
      orderBy: [{ orden_item: 'asc' }, { id_item_otro: 'asc' }],
    });
  }

  async crearItemOtro(idCotizacion: number, dto: CreateItemOtroDto, userId?: number) {
    await this.assertBorrador(idCotizacion);

    const cantidad = dto.cantidad ?? 1;
    const precioUnitario = dto.precio_unitario ?? 0;
    const descuento = dto.descuento_porcentaje ?? 0;
    const subtotal = this.calcularSubtotalLinea(cantidad, precioUnitario, descuento);

    const eqNorm = this.normalizeItemEquipos(dto.equipos_ids, dto.id_equipo);
    const creado = await this.prisma.items_cotizacion_otros.create({
      data: {
        id_cotizacion: idCotizacion,
        id_equipo: eqNorm.id_equipo,
        equipos_ids: eqNorm.equipos_ids,
        categoria_rubro: (dto.categoria_rubro || 'OTRO').toUpperCase(),
        descripcion: dto.descripcion.trim(),
        detalle_calculo: dto.detalle_calculo?.trim() || null,
        cantidad,
        unidad: dto.unidad || 'global',
        costo_unitario: dto.costo_unitario ?? 0,
        precio_unitario: precioUnitario,
        descuento_porcentaje: descuento,
        subtotal,
        visible_cliente: dto.visible_cliente !== false,
        es_opcional: Boolean(dto.es_opcional),
        iva_aplicable: dto.iva_aplicable !== false,
        orden_item: dto.orden_item ?? 0,
        observaciones: dto.observaciones ?? null,
        registrado_por: userId ?? null,
      },
      include: {
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
      },
    });

    await this.calculoService.recalcularTotales(idCotizacion);
    return creado;
  }

  async actualizarItemOtro(idCotizacion: number, idItemOtro: number, dto: UpdateItemOtroDto) {
    await this.assertBorrador(idCotizacion);

    const existente = await this.prisma.items_cotizacion_otros.findUnique({
      where: { id_item_otro: idItemOtro },
    });
    if (!existente || existente.id_cotizacion !== idCotizacion) {
      throw new NotFoundException(
        `Rubro ${idItemOtro} no encontrado en la cotización ${idCotizacion}`,
      );
    }

    const cantidad = dto.cantidad ?? Number(existente.cantidad);
    const precioUnitario = dto.precio_unitario ?? Number(existente.precio_unitario);
    const descuento = dto.descuento_porcentaje ?? Number(existente.descuento_porcentaje);
    const subtotal = this.calcularSubtotalLinea(cantidad, precioUnitario, descuento);

    const eqPatch =
      dto.equipos_ids !== undefined || dto.id_equipo !== undefined
        ? this.normalizeItemEquipos(dto.equipos_ids, dto.id_equipo)
        : null;
    const actualizado = await this.prisma.items_cotizacion_otros.update({
      where: { id_item_otro: idItemOtro },
      data: {
        ...(eqPatch ? { id_equipo: eqPatch.id_equipo, equipos_ids: eqPatch.equipos_ids } : {}),
        ...(dto.categoria_rubro !== undefined
          ? { categoria_rubro: dto.categoria_rubro.toUpperCase() }
          : {}),
        ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion.trim() } : {}),
        ...(dto.detalle_calculo !== undefined ? { detalle_calculo: dto.detalle_calculo } : {}),
        cantidad,
        ...(dto.unidad !== undefined ? { unidad: dto.unidad } : {}),
        ...(dto.costo_unitario !== undefined ? { costo_unitario: dto.costo_unitario } : {}),
        precio_unitario: precioUnitario,
        descuento_porcentaje: descuento,
        subtotal,
        ...(dto.visible_cliente !== undefined ? { visible_cliente: dto.visible_cliente } : {}),
        ...(dto.es_opcional !== undefined ? { es_opcional: dto.es_opcional } : {}),
        ...(dto.iva_aplicable !== undefined ? { iva_aplicable: dto.iva_aplicable } : {}),
        ...(dto.orden_item !== undefined ? { orden_item: dto.orden_item } : {}),
        ...(dto.observaciones !== undefined ? { observaciones: dto.observaciones } : {}),
      },
      include: {
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
      },
    });

    await this.calculoService.recalcularTotales(idCotizacion);
    return actualizado;
  }

  async eliminarItemOtro(idCotizacion: number, idItemOtro: number) {
    await this.assertBorrador(idCotizacion);

    const existente = await this.prisma.items_cotizacion_otros.findUnique({
      where: { id_item_otro: idItemOtro },
    });
    if (!existente || existente.id_cotizacion !== idCotizacion) {
      throw new NotFoundException(
        `Rubro ${idItemOtro} no encontrado en la cotización ${idCotizacion}`,
      );
    }

    await this.prisma.items_cotizacion_otros.delete({ where: { id_item_otro: idItemOtro } });
    await this.calculoService.recalcularTotales(idCotizacion);
    return { message: 'Rubro eliminado exitosamente' };
  }

  // ==================== GUARDADO ATÓMICO STUDIO CPQ ====================

  async guardarStudioCompleto(
    idCotizacion: number,
    dto: GuardarStudioCompletoDto,
    userId?: number,
  ) {
    const srvIds = Array.from(
      new Set(
        (dto.items_servicios || [])
          .map((s) => s.id_servicio)
          .filter((id): id is number => typeof id === 'number' && id > 0),
      ),
    );
    const compIds = Array.from(
      new Set(
        (dto.items_componentes || [])
          .map((c) => c.id_componente)
          .filter((id): id is number => typeof id === 'number' && id > 0),
      ),
    );

    // 1. Pre-lectura paralela única (evita roundtrips secuenciales a BD remota)
    const [cotActual, orgPol, srvsCat, compsCat] = await Promise.all([
      this.prisma.cotizaciones.findUnique({
        where: { id_cotizacion: idCotizacion },
        select: {
          id_cotizacion: true,
          id_estado: true,
          id_plantilla_origen: true,
          descuento_porcentaje: true,
          iva_porcentaje: true,
          usa_aiu: true,
          aiu_admin_porcentaje: true,
          aiu_imprevistos_porcentaje: true,
          aiu_utilidad_porcentaje: true,
          iva_sobre_utilidad_aiu: true,
          cotizaciones_equipos: {
            select: { id_equipo: true, orden_secuencia: true, notas_alcance: true },
            orderBy: { orden_secuencia: 'asc' },
          },
        },
      }),
      this.prisma.configuracion_organizacion
        .findUnique({
          where: { id_configuracion: 1 },
          select: {
            enable_cpq_governance: true,
            lock_catalog_unit_price: true,
            tasa_impuesto_defecto: true,
          },
        })
        .catch(() => null),
      srvIds.length > 0
        ? this.prisma.catalogo_servicios.findMany({
            where: { id_servicio: { in: srvIds } },
            select: { id_servicio: true, precio_base: true },
          })
        : Promise.resolve([]),
      compIds.length > 0
        ? this.prisma.catalogo_componentes.findMany({
            where: { id_componente: { in: compIds } },
            select: {
              id_componente: true,
              precio_compra: true,
              precio_venta: true,
              id_tipo_componente: true,
            },
          })
        : Promise.resolve([]),
    ]);

    if (!cotActual) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }
    if (cotActual.id_estado !== 1) {
      throw new BadRequestException(
        'Solo se pueden editar cotizaciones en estado BORRADOR. Use "Reabrir como nueva versión" para modificar.',
      );
    }

    const lockCatalogUnitPrice = Boolean(
      orgPol?.enable_cpq_governance && orgPol?.lock_catalog_unit_price,
    );

    const srvCatalogoMap = new Map<number, { precio_base: number }>();
    if (lockCatalogUnitPrice) {
      for (const s of srvsCat) {
        srvCatalogoMap.set(s.id_servicio, { precio_base: Number(s.precio_base || 0) });
      }
    }

    const compCatalogoMap = new Map<
      number,
      { precio_compra: number; precio_venta: number; id_tipo_componente: number | null }
    >();
    for (const c of compsCat) {
      compCatalogoMap.set(c.id_componente, {
        precio_compra: Number(c.precio_compra || 0),
        precio_venta: Number(c.precio_venta || 0),
        id_tipo_componente: c.id_tipo_componente,
      });
    }

    // 2. Preparación de cabecera y lote atómico batch (1 ciclo transaccional sin roundtrips por línea)
    const headerData: any = {
      fecha_modificacion: new Date(),
      ...(userId ? { modificado_por: userId } : {}),
    };
    if (dto.id_cliente !== undefined) headerData.id_cliente = dto.id_cliente;
    if (dto.id_sede !== undefined) headerData.id_sede = dto.id_sede;
    if (dto.atencion_a_nombre !== undefined) {
      headerData.atencion_a_nombre = dto.atencion_a_nombre?.trim()
        ? dto.atencion_a_nombre.trim().slice(0, 200)
        : null;
    }
    if (dto.atencion_a_cargo !== undefined) {
      headerData.atencion_a_cargo = dto.atencion_a_cargo?.trim()
        ? dto.atencion_a_cargo.trim().slice(0, 120)
        : null;
    }
    if (dto.elaborada_por !== undefined) headerData.elaborada_por = dto.elaborada_por;
    if (dto.tipo_cotizacion !== undefined) {
      headerData.tipo_cotizacion = dto.tipo_cotizacion.trim().slice(0, 40) || 'SERVICIO_TECNICO';
    }
    const debeIncrementarPlantilla =
      dto.id_plantilla_origen !== undefined &&
      Boolean(dto.id_plantilla_origen) &&
      cotActual.id_plantilla_origen !== dto.id_plantilla_origen;
    if (dto.id_plantilla_origen !== undefined) {
      headerData.id_plantilla_origen = dto.id_plantilla_origen;
    }
    if (dto.moneda !== undefined) headerData.moneda = dto.moneda;
    if (dto.fecha_cotizacion !== undefined)
      headerData.fecha_cotizacion = new Date(dto.fecha_cotizacion);
    if (dto.fecha_vencimiento !== undefined)
      headerData.fecha_vencimiento = new Date(dto.fecha_vencimiento);
    if (dto.fecha_cotizacion && dto.fecha_vencimiento) {
      headerData.dias_validez = Math.max(
        1,
        Math.round(
          (new Date(dto.fecha_vencimiento).getTime() - new Date(dto.fecha_cotizacion).getTime()) /
            86400_000,
        ),
      );
    }
    if (dto.asunto !== undefined) headerData.asunto = dto.asunto;
    if (dto.descripcion_general !== undefined)
      headerData.descripcion_general = dto.descripcion_general;
    if (dto.alcance_trabajo !== undefined) headerData.alcance_trabajo = dto.alcance_trabajo;
    if (dto.exclusiones !== undefined) headerData.exclusiones = dto.exclusiones;
    if (dto.descuento_porcentaje !== undefined)
      headerData.descuento_porcentaje = dto.descuento_porcentaje;
    if (dto.iva_porcentaje !== undefined) headerData.iva_porcentaje = dto.iva_porcentaje;
    if (dto.usa_aiu !== undefined) headerData.usa_aiu = dto.usa_aiu;
    if (dto.aiu_admin_porcentaje !== undefined)
      headerData.aiu_admin_porcentaje = dto.aiu_admin_porcentaje;
    if (dto.aiu_imprevistos_porcentaje !== undefined)
      headerData.aiu_imprevistos_porcentaje = dto.aiu_imprevistos_porcentaje;
    if (dto.aiu_utilidad_porcentaje !== undefined)
      headerData.aiu_utilidad_porcentaje = dto.aiu_utilidad_porcentaje;
    if (dto.iva_sobre_utilidad_aiu !== undefined)
      headerData.iva_sobre_utilidad_aiu = dto.iva_sobre_utilidad_aiu;
    if (dto.modo_agrupacion_pdf !== undefined)
      headerData.modo_agrupacion_pdf = dto.modo_agrupacion_pdf;
    if (dto.mostrar_desglose_precios !== undefined)
      headerData.mostrar_desglose_precios = Boolean(dto.mostrar_desglose_precios);
    if (dto.forma_pago !== undefined) headerData.forma_pago = dto.forma_pago;
    if (dto.terminos_condiciones !== undefined)
      headerData.terminos_condiciones = dto.terminos_condiciones;
    if (dto.meses_garantia !== undefined) headerData.meses_garantia = dto.meses_garantia;
    if (dto.observaciones_garantia !== undefined)
      headerData.observaciones_garantia = dto.observaciones_garantia;
    if (dto.tiempo_estimado_dias !== undefined)
      headerData.tiempo_estimado_dias = dto.tiempo_estimado_dias;

    const txOps: Prisma.PrismaPromise<any>[] = [];

    // Equipos N:M (solo reescribir si cambió la lista de equipos vinculados)
    let eqRowsToInsert: Array<{
      id_equipo: number;
      orden_secuencia: number;
      notas_alcance: string | null;
    }> | null = null;
    let shouldDeleteEquipos = false;

    if (dto.equipos !== undefined || dto.equipos_ids !== undefined) {
      const vistos = new Set<number>();
      const eqRows: Array<{
        id_equipo: number;
        orden_secuencia: number;
        notas_alcance: string | null;
      }> = [];
      if (dto.equipos) {
        dto.equipos.forEach((eq, idx) => {
          if (Number.isInteger(eq.id_equipo) && eq.id_equipo > 0 && !vistos.has(eq.id_equipo)) {
            vistos.add(eq.id_equipo);
            eqRows.push({
              id_equipo: eq.id_equipo,
              orden_secuencia: eq.orden_secuencia ?? idx + 1,
              notas_alcance: eq.notas_alcance ?? null,
            });
          }
        });
      } else if (dto.equipos_ids) {
        dto.equipos_ids.forEach((idEq, idx) => {
          if (Number.isInteger(idEq) && idEq > 0 && !vistos.has(idEq)) {
            vistos.add(idEq);
            eqRows.push({ id_equipo: idEq, orden_secuencia: idx + 1, notas_alcance: null });
          }
        });
      }
      const prevEq = cotActual.cotizaciones_equipos || [];
      const equiposCambiaron =
        prevEq.length !== eqRows.length ||
        eqRows.some(
          (e, i) =>
            prevEq[i]?.id_equipo !== e.id_equipo ||
            prevEq[i]?.orden_secuencia !== e.orden_secuencia ||
            (prevEq[i]?.notas_alcance ?? null) !== e.notas_alcance,
        );
      if (equiposCambiaron) {
        shouldDeleteEquipos = true;
        eqRowsToInsert = eqRows;
      }
      headerData.id_equipo = eqRows.length > 0 ? eqRows[0].id_equipo : null;
    }

    // Preparar filas normalizadas de Servicios, Componentes y Otros (necesarias tanto para BD como cálculo en memoria)
    const serviciosData =
      dto.items_servicios !== undefined
        ? dto.items_servicios.map((s, idx) => {
            const srvCat = s.id_servicio ? srvCatalogoMap.get(s.id_servicio) : undefined;
            const precioEfectivo =
              lockCatalogUnitPrice && srvCat && srvCat.precio_base > 0
                ? srvCat.precio_base
                : s.precio_unitario;
            const eqNorm = this.normalizeItemEquipos(s.equipos_ids, s.id_equipo);
            return {
              id_cotizacion: idCotizacion,
              id_servicio: s.id_servicio ?? null,
              id_equipo: eqNorm.id_equipo,
              equipos_ids: eqNorm.equipos_ids,
              descripcion_personalizada: s.descripcion_personalizada ?? null,
              cantidad: s.cantidad,
              unidad: (s.unidad || 'servicio').trim().slice(0, 20),
              costo_unitario: s.costo_unitario ?? 0,
              precio_unitario: precioEfectivo,
              descuento_porcentaje: s.descuento_porcentaje ?? 0,
              subtotal: this.calcularSubtotalLinea(
                s.cantidad,
                precioEfectivo,
                s.descuento_porcentaje ?? 0,
              ),
              es_opcional: Boolean(s.es_opcional),
              iva_aplicable: s.iva_aplicable !== false,
              seccion_titulo: s.seccion_titulo ?? null,
              observaciones: s.observaciones ?? null,
              justificacion_precio: s.justificacion_precio ?? null,
              orden_item: s.orden_item ?? idx + 1,
              registrado_por: userId ?? null,
            };
          })
        : undefined;

    const componentesData =
      dto.items_componentes !== undefined
        ? dto.items_componentes.map((c, idx) => {
            const cat = c.id_componente ? compCatalogoMap.get(c.id_componente) : undefined;
            const precioEfectivo =
              lockCatalogUnitPrice && cat && cat.precio_venta > 0
                ? cat.precio_venta
                : c.precio_unitario;
            const eqNorm = this.normalizeItemEquipos(c.equipos_ids, c.id_equipo);
            return {
              id_cotizacion: idCotizacion,
              id_componente: c.id_componente ?? null,
              id_tipo_componente: c.id_tipo_componente ?? cat?.id_tipo_componente ?? null,
              id_equipo: eqNorm.id_equipo,
              equipos_ids: eqNorm.equipos_ids,
              descripcion: c.descripcion.trim(),
              referencia_manual: c.referencia_manual ?? null,
              marca_manual: c.marca_manual ?? null,
              cantidad: c.cantidad,
              unidad: (c.unidad || 'unidad').trim().slice(0, 20),
              costo_unitario: c.costo_unitario ?? cat?.precio_compra ?? 0,
              precio_unitario: precioEfectivo,
              descuento_porcentaje: c.descuento_porcentaje ?? 0,
              subtotal: this.calcularSubtotalLinea(
                c.cantidad,
                precioEfectivo,
                c.descuento_porcentaje ?? 0,
              ),
              es_opcional: Boolean(c.es_opcional),
              iva_aplicable: c.iva_aplicable !== false,
              seccion_titulo: c.seccion_titulo ?? null,
              garantia_meses: c.garantia_meses ?? null,
              observaciones_garantia: c.observaciones_garantia ?? null,
              observaciones: c.observaciones ?? null,
              orden_item: c.orden_item ?? idx + 1,
              registrado_por: userId ?? null,
            };
          })
        : undefined;

    const otrosData =
      dto.items_otros !== undefined
        ? dto.items_otros.map((o, idx) => {
            const cant = o.cantidad ?? 1;
            const pu = o.precio_unitario ?? 0;
            const desc = o.descuento_porcentaje ?? 0;
            const eqNorm = this.normalizeItemEquipos(o.equipos_ids, o.id_equipo);
            return {
              id_cotizacion: idCotizacion,
              id_equipo: eqNorm.id_equipo,
              equipos_ids: eqNorm.equipos_ids,
              categoria_rubro: (o.categoria_rubro || 'OTRO').toUpperCase(),
              descripcion: o.descripcion.trim(),
              detalle_calculo: o.detalle_calculo ?? null,
              cantidad: cant,
              unidad: (o.unidad || 'global').trim().slice(0, 20),
              costo_unitario: o.costo_unitario ?? 0,
              precio_unitario: pu,
              descuento_porcentaje: desc,
              subtotal: this.calcularSubtotalLinea(cant, pu, desc),
              visible_cliente: o.visible_cliente !== false,
              es_opcional: Boolean(o.es_opcional),
              iva_aplicable: o.iva_aplicable !== false,
              orden_item: o.orden_item ?? idx + 1,
              observaciones: o.observaciones ?? null,
              registrado_por: userId ?? null,
            };
          })
        : undefined;

    // Cuando el Studio envía las 3 listas completas, calculamos los totales exactos en memoria (0 ms)
    // y los persistimos atómicamente dentro del mismo UPDATE (ahorra 5 lecturas + 1 UPDATE a BD remota).
    const puedeCalcularEnMemoria =
      serviciosData !== undefined && componentesData !== undefined && otrosData !== undefined;

    if (puedeCalcularEnMemoria) {
      const totales = this.calculoService.calcularTotalesEnMemoria({
        cotizacion: {
          descuento_porcentaje:
            dto.descuento_porcentaje !== undefined
              ? dto.descuento_porcentaje
              : cotActual.descuento_porcentaje,
          iva_porcentaje:
            dto.iva_porcentaje !== undefined ? dto.iva_porcentaje : cotActual.iva_porcentaje,
          usa_aiu: dto.usa_aiu !== undefined ? dto.usa_aiu : cotActual.usa_aiu,
          aiu_admin_porcentaje:
            dto.aiu_admin_porcentaje !== undefined
              ? dto.aiu_admin_porcentaje
              : cotActual.aiu_admin_porcentaje,
          aiu_imprevistos_porcentaje:
            dto.aiu_imprevistos_porcentaje !== undefined
              ? dto.aiu_imprevistos_porcentaje
              : cotActual.aiu_imprevistos_porcentaje,
          aiu_utilidad_porcentaje:
            dto.aiu_utilidad_porcentaje !== undefined
              ? dto.aiu_utilidad_porcentaje
              : cotActual.aiu_utilidad_porcentaje,
          iva_sobre_utilidad_aiu:
            dto.iva_sobre_utilidad_aiu !== undefined
              ? dto.iva_sobre_utilidad_aiu
              : cotActual.iva_sobre_utilidad_aiu,
        },
        tasaImpuestoDefecto: orgPol?.tasa_impuesto_defecto,
        itemsServicios: serviciosData,
        itemsComponentes: componentesData,
        itemsOtros: otrosData,
      });

      Object.assign(headerData, {
        subtotal_servicios: totales.subtotal_servicios,
        subtotal_componentes: totales.subtotal_componentes,
        subtotal_otros: totales.subtotal_otros,
        subtotal_general: totales.subtotal_general,
        subtotal_opcionales: totales.subtotal_opcionales,
        descuento_valor: totales.descuento_valor,
        subtotal_con_descuento: totales.subtotal_con_descuento,
        aiu_admin_valor: totales.aiu_admin_valor,
        aiu_imprevistos_valor: totales.aiu_imprevistos_valor,
        aiu_utilidad_valor: totales.aiu_utilidad_valor,
        aiu_valor_total: totales.aiu_valor_total,
        iva_valor: totales.iva_valor,
        total_cotizacion: totales.total_cotizacion,
        costo_total_estimado: totales.costo_total_estimado,
        utilidad_bruta_estimada: totales.utilidad_bruta_estimada,
        margen_bruto_porcentaje: totales.margen_bruto_porcentaje,
      });
    }

    // Un solo CTE PostgreSQL elimina las tablas hijas modificadas en 1 único roundtrip ACID
    const deleteCtes: Prisma.Sql[] = [];
    if (shouldDeleteEquipos) {
      deleteCtes.push(
        Prisma.sql`del_eq AS (DELETE FROM cotizaciones_equipos WHERE id_cotizacion = ${idCotizacion})`,
      );
    }
    if (serviciosData !== undefined) {
      deleteCtes.push(
        Prisma.sql`del_srv AS (DELETE FROM items_cotizacion_servicios WHERE id_cotizacion = ${idCotizacion})`,
      );
    }
    if (componentesData !== undefined) {
      deleteCtes.push(
        Prisma.sql`del_cmp AS (DELETE FROM items_cotizacion_componentes WHERE id_cotizacion = ${idCotizacion})`,
      );
    }
    if (otrosData !== undefined) {
      deleteCtes.push(
        Prisma.sql`del_otr AS (DELETE FROM items_cotizacion_otros WHERE id_cotizacion = ${idCotizacion})`,
      );
    }
    if (deleteCtes.length > 0) {
      txOps.push(
        this.prisma.$executeRaw(Prisma.sql`WITH ${Prisma.join(deleteCtes, ', ')} SELECT 1`),
      );
    }

    txOps.push(
      this.prisma.cotizaciones.update({
        where: { id_cotizacion: idCotizacion },
        data: headerData,
      }),
    );

    if (eqRowsToInsert && eqRowsToInsert.length > 0) {
      txOps.push(
        this.prisma.cotizaciones_equipos.createMany({
          data: eqRowsToInsert.map((e) => ({ id_cotizacion: idCotizacion, ...e })),
        }),
      );
    }

    if (serviciosData && serviciosData.length > 0) {
      txOps.push(this.prisma.items_cotizacion_servicios.createMany({ data: serviciosData }));
    }

    if (componentesData && componentesData.length > 0) {
      txOps.push(this.prisma.items_cotizacion_componentes.createMany({ data: componentesData }));
    }

    if (otrosData && otrosData.length > 0) {
      txOps.push(this.prisma.items_cotizacion_otros.createMany({ data: otrosData }));
    }

    await this.prisma.$transaction(txOps);

    if (!puedeCalcularEnMemoria) {
      await this.calculoService.recalcularTotales(idCotizacion);
    }

    const [cotActualizada] = await Promise.all([
      this.cotizacionesRepository.findById(idCotizacion, {
        cliente: true,
        sede: true,
        equipo: true,
        estado: true,
        items_servicios: true,
        items_componentes: true,
        aprobaciones: true,
        historial_envios: true,
      }),
      debeIncrementarPlantilla && dto.id_plantilla_origen
        ? this.prisma.plantillas_cotizacion
            .update({
              where: { id_plantilla: dto.id_plantilla_origen },
              data: { veces_usada: { increment: 1 } },
            })
            .catch(() => undefined)
        : Promise.resolve(),
    ]);

    return cotActualizada;
  }

  /**
   * Actualización ultraligera de preferencia visual PDF (`mostrar_desglose_precios`),
   * sin alterar montos ni ítems de la cotización.
   */
  async actualizarPresentacionPdf(
    idCotizacion: number,
    mostrarDesglosePrecios: boolean,
    userId?: number,
  ) {
    const existe = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      select: { id_cotizacion: true },
    });
    if (!existe) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }
    const updated = await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: {
        mostrar_desglose_precios: Boolean(mostrarDesglosePrecios),
        fecha_modificacion: new Date(),
        ...(userId ? { modificado_por: userId } : {}),
      },
      select: {
        id_cotizacion: true,
        mostrar_desglose_precios: true,
        fecha_modificacion: true,
      },
    });
    return updated;
  }

  // ==================== REABRIR BORRADOR (CON SNAPSHOT DE VERSIÓN) ====================

  async reabrirBorrador(idCotizacion: number, motivoCambio: string | undefined, userId: number) {
    const cot = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      select: {
        id_cotizacion: true,
        id_estado: true,
        id_orden_servicio_generada: true,
        version: true,
      },
    });
    if (!cot) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }
    if (cot.id_estado === 1) {
      throw new BadRequestException('La cotización ya se encuentra en estado BORRADOR');
    }
    if (cot.id_estado === 5 && cot.id_orden_servicio_generada) {
      throw new BadRequestException(
        'Una cotización aprobada y ya convertida a Orden de Servicio no puede reabrirse. Use "Duplicar" para crear una nueva oferta.',
      );
    }

    // 1. Guardar snapshot auditable inmutable antes de volver a borrador
    const versionResult = await this.commandBus.execute(
      new CreateVersionCommand(
        idCotizacion,
        motivoCambio?.trim() || 'Reapertura para edición y renegociación comercial',
        userId,
      ),
    );
    const versionArchivada = Number(versionResult?.version?.numero_version || cot.version || 1);
    const nuevaVersionActiva = Math.max((cot.version || 1) + 1, versionArchivada + 1);

    // 2. Cerrar aprobaciones pendientes si venía de EN_REVISION
    await this.prisma.aprobaciones_cotizacion.updateMany({
      where: { id_cotizacion: idCotizacion, estado_aprobacion: 'PENDIENTE' },
      data: {
        estado_aprobacion: 'RECHAZADA',
        fecha_respuesta: new Date(),
        observaciones_aprobador:
          motivoCambio?.trim() || 'Cerrada automáticamente al reabrir cotización a borrador',
      },
    });

    // 3. Volver a BORRADOR (id_estado = 1), promover versión activa a v(N+1) y limpiar aprobación previa
    // para que el PDF regenere inmediatamente con marca de agua BORRADOR hasta nueva aprobación.
    const ahora = new Date();
    await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: {
        id_estado: 1,
        version: nuevaVersionActiva,
        aprobada_internamente_por: null,
        fecha_aprobacion_interna: null,
        fecha_cambio_estado: ahora,
        modificado_por: userId,
        fecha_modificacion: ahora,
      },
    });

    const cotizacionActualizada = await this.cotizacionesRepository.findById(idCotizacion, {
      cliente: true,
      sede: true,
      equipo: true,
      estado: true,
      items_servicios: true,
      items_componentes: true,
      aprobaciones: true,
      historial_envios: true,
    });

    return {
      message: `Cotización reabierta en BORRADOR como v${nuevaVersionActiva} (snapshot v${versionArchivada} archivado)`,
      version_archivada: versionResult.version,
      nueva_version: nuevaVersionActiva,
      cotizacion: cotizacionActualizada,
    };
  }

  // ==================== DUPLICAR COTIZACIÓN ====================

  async duplicarCotizacion(
    idCotizacion: number,
    userId: number,
    idEmpleadoUsuario?: number | null,
  ) {
    const origen = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        cotizaciones_equipos: { orderBy: { orden_secuencia: 'asc' } },
        items_cotizacion_servicios: { orderBy: { orden_item: 'asc' } },
        items_cotizacion_componentes: { orderBy: { orden_item: 'asc' } },
        items_cotizacion_otros: { orderBy: { orden_item: 'asc' } },
      },
    });
    if (!origen) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }

    const numeroNuevo = await this.cotizacionesRepository.generateNumeroCotizacion();
    const hoy = new Date();
    const diasValidez = origen.dias_validez || 30;
    const vencimiento = new Date(hoy.getTime() + diasValidez * 86400_000);

    const nueva = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.cotizaciones.create({
        data: {
          numero_cotizacion: numeroNuevo,
          id_cliente: origen.id_cliente,
          id_sede: origen.id_sede,
          id_equipo: origen.id_equipo,
          atencion_a_nombre: origen.atencion_a_nombre,
          atencion_a_cargo: origen.atencion_a_cargo,
          tipo_cotizacion: origen.tipo_cotizacion,
          id_plantilla_origen: origen.id_plantilla_origen,
          moneda: origen.moneda,
          fecha_cotizacion: hoy,
          fecha_vencimiento: vencimiento,
          dias_validez: diasValidez,
          id_estado: 1,
          asunto: `${origen.asunto} (Copia)`,
          descripcion_general: origen.descripcion_general,
          alcance_trabajo: origen.alcance_trabajo,
          exclusiones: origen.exclusiones,
          descuento_porcentaje: origen.descuento_porcentaje,
          usa_aiu: origen.usa_aiu,
          aiu_admin_porcentaje: origen.aiu_admin_porcentaje,
          aiu_imprevistos_porcentaje: origen.aiu_imprevistos_porcentaje,
          aiu_utilidad_porcentaje: origen.aiu_utilidad_porcentaje,
          iva_sobre_utilidad_aiu: origen.iva_sobre_utilidad_aiu,
          iva_porcentaje: origen.iva_porcentaje,
          modo_agrupacion_pdf: origen.modo_agrupacion_pdf,
          mostrar_desglose_precios: Boolean(origen.mostrar_desglose_precios ?? false),
          forma_pago: origen.forma_pago,
          terminos_condiciones: origen.terminos_condiciones,
          meses_garantia: origen.meses_garantia,
          observaciones_garantia: origen.observaciones_garantia,
          tiempo_estimado_dias: origen.tiempo_estimado_dias,
          version: 1,
          id_cotizacion_padre: origen.id_cotizacion,
          elaborada_por: idEmpleadoUsuario ?? origen.elaborada_por,
          modificado_por: userId,
        },
      });

      if (origen.cotizaciones_equipos.length > 0) {
        await tx.cotizaciones_equipos.createMany({
          data: origen.cotizaciones_equipos.map((ce) => ({
            id_cotizacion: creada.id_cotizacion,
            id_equipo: ce.id_equipo,
            orden_secuencia: ce.orden_secuencia,
            notas_alcance: ce.notas_alcance,
          })),
        });
      }

      if (origen.items_cotizacion_servicios.length > 0) {
        await tx.items_cotizacion_servicios.createMany({
          data: origen.items_cotizacion_servicios.map((s) => ({
            id_cotizacion: creada.id_cotizacion,
            id_equipo: s.id_equipo,
            equipos_ids: s.equipos_ids || [],
            id_servicio: s.id_servicio,
            cantidad: s.cantidad,
            unidad: s.unidad,
            costo_unitario: s.costo_unitario,
            precio_unitario: s.precio_unitario,
            descuento_porcentaje: s.descuento_porcentaje,
            subtotal: s.subtotal,
            es_opcional: s.es_opcional,
            iva_aplicable: s.iva_aplicable,
            seccion_titulo: s.seccion_titulo,
            descripcion_personalizada: s.descripcion_personalizada,
            observaciones: s.observaciones,
            justificacion_precio: s.justificacion_precio,
            orden_item: s.orden_item,
            registrado_por: userId,
          })),
        });
      }

      if (origen.items_cotizacion_componentes.length > 0) {
        await tx.items_cotizacion_componentes.createMany({
          data: origen.items_cotizacion_componentes.map((c) => ({
            id_cotizacion: creada.id_cotizacion,
            id_equipo: c.id_equipo,
            equipos_ids: c.equipos_ids || [],
            id_componente: c.id_componente,
            id_tipo_componente: c.id_tipo_componente,
            descripcion: c.descripcion,
            referencia_manual: c.referencia_manual,
            marca_manual: c.marca_manual,
            cantidad: c.cantidad,
            unidad: c.unidad,
            costo_unitario: c.costo_unitario,
            precio_unitario: c.precio_unitario,
            descuento_porcentaje: c.descuento_porcentaje,
            subtotal: c.subtotal,
            es_opcional: c.es_opcional,
            iva_aplicable: c.iva_aplicable,
            seccion_titulo: c.seccion_titulo,
            garantia_meses: c.garantia_meses,
            observaciones_garantia: c.observaciones_garantia,
            observaciones: c.observaciones,
            orden_item: c.orden_item,
            registrado_por: userId,
          })),
        });
      }

      if (origen.items_cotizacion_otros.length > 0) {
        await tx.items_cotizacion_otros.createMany({
          data: origen.items_cotizacion_otros.map((o) => ({
            id_cotizacion: creada.id_cotizacion,
            id_equipo: o.id_equipo,
            equipos_ids: o.equipos_ids || [],
            categoria_rubro: o.categoria_rubro,
            descripcion: o.descripcion,
            detalle_calculo: o.detalle_calculo,
            cantidad: o.cantidad,
            unidad: o.unidad,
            costo_unitario: o.costo_unitario,
            precio_unitario: o.precio_unitario,
            descuento_porcentaje: o.descuento_porcentaje,
            subtotal: o.subtotal,
            visible_cliente: o.visible_cliente,
            es_opcional: o.es_opcional,
            iva_aplicable: o.iva_aplicable,
            orden_item: o.orden_item,
            observaciones: o.observaciones,
            registrado_por: userId,
          })),
        });
      }

      return creada;
    });

    await this.calculoService.recalcularTotales(nueva.id_cotizacion);

    return this.cotizacionesRepository.findById(nueva.id_cotizacion, {
      cliente: true,
      sede: true,
      equipo: true,
      estado: true,
      items_servicios: true,
      items_componentes: true,
    });
  }

  // ==================== SMART MATCH CONTEXTUAL (EQUIPOS GEMELOS + PLANTILLAS + BOM OEM) ====================

  async obtenerSugerenciasContextuales(equiposIds: number[], tipoCotizacion?: string) {
    const cleanIds = Array.from(new Set(equiposIds.filter((id) => Number.isInteger(id) && id > 0)));

    const equipos =
      cleanIds.length > 0
        ? await this.prisma.equipos.findMany({
            where: { id_equipo: { in: cleanIds } },
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
              modelos_equipo: {
                select: {
                  id_modelo_equipo: true,
                  codigo_modelo: true,
                  marca: true,
                  modelo: true,
                  nombre_comercial: true,
                },
              },
            },
          })
        : [];

    const tiposEquipoIds = Array.from(new Set(equipos.map((e) => e.id_tipo_equipo)));
    const modelosEquipoIds = Array.from(
      new Set(
        equipos
          .map((e) => e.id_modelo_equipo)
          .filter((id): id is number => typeof id === 'number' && id > 0),
      ),
    );

    // 1. Detección de Equipos Gemelos (mismo modelo OEM o misma clase de equipo)
    const modeloGroups = new Map<
      number,
      {
        id_modelo_equipo: number;
        codigo_modelo: string;
        etiqueta: string;
        tipo_equipo: string;
        equipos: Array<{ id_equipo: number; codigo_equipo: string; nombre_equipo: string | null }>;
      }
    >();
    const tipoGroups = new Map<
      number,
      {
        id_tipo_equipo: number;
        codigo_tipo: string;
        nombre_tipo: string;
        equipos: Array<{ id_equipo: number; codigo_equipo: string; nombre_equipo: string | null }>;
      }
    >();

    for (const eq of equipos) {
      if (eq.modelos_equipo) {
        const g = modeloGroups.get(eq.modelos_equipo.id_modelo_equipo) || {
          id_modelo_equipo: eq.modelos_equipo.id_modelo_equipo,
          codigo_modelo: eq.modelos_equipo.codigo_modelo,
          etiqueta: `${eq.modelos_equipo.marca} ${eq.modelos_equipo.modelo}`.trim(),
          tipo_equipo: eq.tipos_equipo.nombre_tipo,
          equipos: [],
        };
        g.equipos.push({
          id_equipo: eq.id_equipo,
          codigo_equipo: eq.codigo_equipo,
          nombre_equipo: eq.nombre_equipo,
        });
        modeloGroups.set(eq.modelos_equipo.id_modelo_equipo, g);
      }

      const tg = tipoGroups.get(eq.id_tipo_equipo) || {
        id_tipo_equipo: eq.id_tipo_equipo,
        codigo_tipo: eq.tipos_equipo.codigo_tipo,
        nombre_tipo: eq.tipos_equipo.nombre_tipo,
        equipos: [],
      };
      tg.equipos.push({
        id_equipo: eq.id_equipo,
        codigo_equipo: eq.codigo_equipo,
        nombre_equipo: eq.nombre_equipo,
      });
      tipoGroups.set(eq.id_tipo_equipo, tg);
    }

    const gruposGemelos = [
      ...Array.from(modeloGroups.values()).map((g) => ({
        tipo_agrupacion: 'MODELO_OEM' as const,
        es_gemelo_multiple: g.equipos.length > 1,
        cantidad_equipos: g.equipos.length,
        id_modelo_equipo: g.id_modelo_equipo,
        codigo_modelo: g.codigo_modelo,
        etiqueta: g.etiqueta,
        tipo_equipo: g.tipo_equipo,
        equipos: g.equipos,
      })),
      ...Array.from(tipoGroups.values())
        .filter(
          (tg) =>
            tg.equipos.length > 1 &&
            !Array.from(modeloGroups.values()).some((m) => m.equipos.length === tg.equipos.length),
        )
        .map((tg) => ({
          tipo_agrupacion: 'TIPO_EQUIPO' as const,
          es_gemelo_multiple: tg.equipos.length > 1,
          cantidad_equipos: tg.equipos.length,
          id_tipo_equipo: tg.id_tipo_equipo,
          codigo_tipo: tg.codigo_tipo,
          etiqueta: tg.nombre_tipo,
          tipo_equipo: tg.nombre_tipo,
          equipos: tg.equipos,
        })),
    ];

    // 2. Plantillas sugeridas rankeadas
    const plantillas = await this.prisma.plantillas_cotizacion.findMany({
      where: { activo: true },
      include: {
        tipos_equipo: { select: { id_tipo_equipo: true, codigo_tipo: true, nombre_tipo: true } },
        modelos_equipo: { select: { id_modelo_equipo: true, marca: true, modelo: true } },
        items: {
          orderBy: { orden_item: 'asc' },
          include: {
            catalogo_servicios: {
              select: { id_servicio: true, nombre_servicio: true, precio_base: true },
            },
            catalogo_componentes: {
              select: {
                id_componente: true,
                descripcion_corta: true,
                precio_venta: true,
                precio_compra: true,
                stock_actual: true,
              },
            },
          },
        },
      },
      orderBy: [{ veces_usada: 'desc' }, { nombre: 'asc' }],
    });

    const numEquipos = Math.max(1, equipos.length);
    const plantillasSugeridas = plantillas
      .map((pl) => {
        let score = 0;
        const razones: string[] = [];

        if (pl.id_modelo_equipo && modelosEquipoIds.includes(pl.id_modelo_equipo)) {
          score += 100;
          razones.push(
            `Coincidencia exacta de modelo OEM (${pl.modelos_equipo?.marca} ${pl.modelos_equipo?.modelo})`,
          );
        } else if (pl.id_modelo_equipo && modelosEquipoIds.length > 0) {
          score -= 30;
        }

        if (pl.id_tipo_equipo && tiposEquipoIds.includes(pl.id_tipo_equipo)) {
          score += 50;
          razones.push(`Compatible con ${pl.tipos_equipo?.nombre_tipo}`);
        } else if (pl.id_tipo_equipo && tiposEquipoIds.length > 0) {
          score -= 20;
        }

        if (!pl.id_tipo_equipo && !pl.id_modelo_equipo) {
          score += 15;
          razones.push('Plantilla universal');
        }

        if (tipoCotizacion && pl.tipo_cotizacion === tipoCotizacion) {
          score += 30;
          razones.push(`Tipo ${pl.tipo_cotizacion}`);
        }

        // Calcular preview de subtotal estimado escalando es_por_equipo
        let estimado = 0;
        for (const it of pl.items) {
          if (it.es_opcional || !it.visible_cliente) continue;
          const mult = it.es_por_equipo ? numEquipos : 1;
          const cant = Number(it.cantidad_base) * mult;
          let pu = Number(it.precio_unitario_fijo ?? 0);
          if (it.usar_precio_catalogo) {
            if (
              it.tipo_linea === 'SERVICIO' &&
              it.catalogo_servicios?.precio_base !== null &&
              it.catalogo_servicios?.precio_base !== undefined
            ) {
              pu = Number(it.catalogo_servicios.precio_base);
            } else if (
              it.tipo_linea === 'COMPONENTE' &&
              it.catalogo_componentes?.precio_venta !== null &&
              it.catalogo_componentes?.precio_venta !== undefined
            ) {
              pu = Number(it.catalogo_componentes.precio_venta);
            }
          }
          estimado += cant * pu;
        }

        return {
          id_plantilla: pl.id_plantilla,
          codigo_plantilla: pl.codigo_plantilla,
          nombre: pl.nombre,
          descripcion: pl.descripcion,
          tipo_cotizacion: pl.tipo_cotizacion,
          id_tipo_equipo: pl.id_tipo_equipo,
          tipo_equipo: pl.tipos_equipo,
          id_modelo_equipo: pl.id_modelo_equipo,
          modelo_equipo: pl.modelos_equipo,
          usa_aiu: pl.usa_aiu,
          veces_usada: pl.veces_usada,
          total_items: pl.items.length,
          multiplicador_equipos: numEquipos,
          subtotal_estimado: Math.round(estimado * 100) / 100,
          score,
          razones,
        };
      })
      .filter((p) => p.score >= 0)
      .sort((a, b) => b.score - a.score || b.veces_usada - a.veces_usada)
      .slice(0, 12);

    // 3. Kits OEM BOM por modelos detectados
    const bomKits: Array<{
      id_modelo_equipo: number;
      etiqueta_modelo: string;
      equipos_gemelos: number;
      items: Array<{
        id_componente: number;
        codigo_interno: string | null;
        referencia_fabricante: string;
        descripcion: string;
        rol_bom: string;
        cantidad_por_equipo: number;
        cantidad_total_sugerida: number;
        unidad: string;
        precio_venta: number;
        precio_compra: number;
        stock_actual: number;
        deficit_stock: number;
      }>;
    }> = [];

    if (modelosEquipoIds.length > 0) {
      const bomRows = await this.prisma.modelos_equipo_bom.findMany({
        where: { id_modelo_equipo: { in: modelosEquipoIds } },
        include: {
          modelo_equipo: { select: { id_modelo_equipo: true, marca: true, modelo: true } },
          catalogo_componentes: {
            select: {
              id_componente: true,
              codigo_interno: true,
              referencia_fabricante: true,
              descripcion_corta: true,
              unidad_medida: true,
              precio_venta: true,
              precio_compra: true,
              stock_actual: true,
            },
          },
        },
      });

      const byModel = new Map<number, typeof bomRows>();
      for (const r of bomRows) {
        const list = byModel.get(r.id_modelo_equipo) || [];
        list.push(r);
        byModel.set(r.id_modelo_equipo, list);
      }

      for (const [idMod, rows] of byModel.entries()) {
        const countGemelos = modeloGroups.get(idMod)?.equipos.length || 1;
        const mod = rows[0].modelo_equipo;
        bomKits.push({
          id_modelo_equipo: idMod,
          etiqueta_modelo: `${mod.marca} ${mod.modelo}`.trim(),
          equipos_gemelos: countGemelos,
          items: rows.map((r) => {
            const cantPorEq = Number(r.cantidad_sugerida || 1);
            const cantTotal = Math.round(cantPorEq * countGemelos * 100) / 100;
            const stock = Number(r.catalogo_componentes.stock_actual || 0);
            return {
              id_componente: r.id_componente,
              codigo_interno: r.catalogo_componentes.codigo_interno,
              referencia_fabricante: r.catalogo_componentes.referencia_fabricante,
              descripcion:
                r.catalogo_componentes.descripcion_corta ||
                r.catalogo_componentes.referencia_fabricante,
              rol_bom: r.rol_bom,
              cantidad_por_equipo: cantPorEq,
              cantidad_total_sugerida: cantTotal,
              unidad: r.catalogo_componentes.unidad_medida || 'UNIDAD',
              precio_venta: Number(r.catalogo_componentes.precio_venta || 0),
              precio_compra: Number(r.catalogo_componentes.precio_compra || 0),
              stock_actual: stock,
              deficit_stock: Math.max(0, cantTotal - stock),
            };
          }),
        });
      }
    }

    // 4. Servicios compatibles (dinámicos por tipo de equipo + universales)
    const serviciosCompatibles = await this.prisma.catalogo_servicios.findMany({
      where: {
        activo: true,
        ...(tiposEquipoIds.length > 0
          ? { OR: [{ id_tipo_equipo: { in: tiposEquipoIds } }, { id_tipo_equipo: null }] }
          : {}),
      },
      select: {
        id_servicio: true,
        codigo_servicio: true,
        nombre_servicio: true,
        categoria: true,
        precio_base: true,
        duracion_estimada_horas: true,
        id_tipo_equipo: true,
      },
      orderBy: [{ id_tipo_equipo: 'asc' }, { nombre_servicio: 'asc' }],
      take: 40,
    });

    // 5. Repuestos compatibles usando relación N:M (`aplica_todos_tipos` + `catalogo_componentes_tipo_equipo`)
    const repuestosCompatibles = await this.prisma.catalogo_componentes.findMany({
      where: {
        activo: true,
        ...(tiposEquipoIds.length > 0
          ? {
              OR: [
                { aplica_todos_tipos: true },
                {
                  catalogo_componentes_tipo_equipo: {
                    some: { id_tipo_equipo: { in: tiposEquipoIds } },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id_componente: true,
        codigo_interno: true,
        referencia_fabricante: true,
        marca: true,
        descripcion_corta: true,
        unidad_medida: true,
        precio_venta: true,
        precio_compra: true,
        stock_actual: true,
        stock_minimo: true,
        aplica_todos_tipos: true,
      },
      orderBy: [{ stock_actual: 'desc' }, { descripcion_corta: 'asc' }],
      take: 40,
    });

    return {
      total_equipos: equipos.length,
      grupos_gemelos: gruposGemelos,
      plantillas_sugeridas: plantillasSugeridas,
      bom_kits: bomKits,
      servicios_compatibles: serviciosCompatibles.map((s) => ({
        ...s,
        precio_base: Number(s.precio_base || 0),
        duracion_estimada_horas: s.duracion_estimada_horas
          ? Number(s.duracion_estimada_horas)
          : null,
      })),
      repuestos_compatibles: repuestosCompatibles.map((r) => ({
        ...r,
        precio_venta: Number(r.precio_venta || 0),
        precio_compra: Number(r.precio_compra || 0),
        stock_actual: Number(r.stock_actual || 0),
        stock_minimo: Number(r.stock_minimo || 0),
      })),
    };
  }

  // ==================== QUOTE-TO-ORDER (CONVERTIR A ORDEN DE SERVICIO) ====================

  async convertirAOrdenServicio(
    idCotizacion: number,
    dto: ConvertirCotizacionOrdenDto,
    userId: number,
  ) {
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        estados_cotizacion: true,
        clientes: { include: { persona: true } },
        propuesta_origen: {
          select: { id_propuesta: true, numero_propuesta: true },
        },
        cotizaciones_equipos: {
          orderBy: { orden_secuencia: 'asc' },
          include: {
            equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
          },
        },
        items_cotizacion_servicios: {
          where: { es_opcional: false },
          include: { catalogo_servicios: true },
        },
        items_cotizacion_componentes: {
          where: { es_opcional: false },
          include: { catalogo_componentes: true },
        },
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }

    if (cotizacion.id_estado !== 5) {
      throw new BadRequestException(
        `Solo cotizaciones en estado APROBADA_CLIENTE pueden convertirse a Orden de Servicio. Estado actual: ${cotizacion.estados_cotizacion?.nombre_estado || cotizacion.id_estado}`,
      );
    }

    if (cotizacion.id_orden_servicio_generada) {
      throw new BadRequestException(
        `La cotización ${cotizacion.numero_cotizacion} ya generó la Orden de Servicio #${cotizacion.id_orden_servicio_generada}`,
      );
    }

    const equiposIds = Array.from(
      new Set<number>(
        [
          ...cotizacion.cotizaciones_equipos.map((ce) => ce.id_equipo),
          ...(cotizacion.id_equipo ? [cotizacion.id_equipo] : []),
          ...(dto.equipos_ids || []),
        ].filter((id) => Number.isInteger(id) && id > 0),
      ),
    );

    if (equiposIds.length === 0) {
      throw new BadRequestException(
        'La cotización debe tener al menos un equipo asociado (o enviar equipos_ids) para generar una Orden de Servicio',
      );
    }

    // Resolver tipo de servicio: explícito → primer servicio de la cotización → primer tipo activo
    let idTipoServicio =
      dto.id_tipo_servicio ??
      cotizacion.items_cotizacion_servicios.find((s) => s.catalogo_servicios?.id_tipo_servicio)
        ?.catalogo_servicios?.id_tipo_servicio ??
      null;

    if (!idTipoServicio) {
      const tsFallback = await this.prisma.tipos_servicio.findFirst({
        where: { activo: true },
        orderBy: { id_tipo_servicio: 'asc' },
        select: { id_tipo_servicio: true },
      });
      idTipoServicio = tsFallback?.id_tipo_servicio ?? null;
    }

    // Estado inicial según si tiene técnico asignado
    const codigoEstadoObjetivo = dto.id_tecnico_asignado ? 'ASIGNADA' : 'PROGRAMADA';
    const estadoOrden = await this.prisma.estados_orden.findFirst({
      where: {
        OR: [
          { codigo_estado: { equals: codigoEstadoObjetivo, mode: 'insensitive' } },
          { nombre_estado: { equals: codigoEstadoObjetivo, mode: 'insensitive' } },
        ],
      },
    });
    const idEstadoInicial = estadoOrden?.id_estado ?? (dto.id_tecnico_asignado ? 1 : 3);

    const org = await this.prisma.configuracion_organizacion
      .findUnique({
        where: { id_configuracion: 1 },
        select: { prefijo_orden: true, requiere_firma_cliente_defecto: true },
      })
      .catch(() => null);

    const safePrefix =
      (org?.prefijo_orden || 'OS')
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '') || 'OS';
    const year = new Date().getFullYear();

    const descripcionOrden = [
      `Generada desde Cotización ${cotizacion.numero_cotizacion}: ${cotizacion.asunto}`,
      cotizacion.orden_compra_cliente
        ? `Orden de Compra Cliente (PO): ${cotizacion.orden_compra_cliente}`
        : null,
      cotizacion.alcance_trabajo ? `Alcance:\n${cotizacion.alcance_trabajo}` : null,
      dto.observaciones ? `Notas de programación:\n${dto.observaciones}` : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    const ordenCreada = await this.prisma.$transaction(async (tx) => {
      let reserved = await reserveNextSequenceCounter(tx, safePrefix, year);
      let numeroOrden = formatCorrelativeCode(safePrefix, year, reserved.sequence, 4);
      while (
        await tx.ordenes_servicio.findFirst({
          where: { numero_orden: { equals: numeroOrden, mode: 'insensitive' } },
          select: { id_orden_servicio: true },
        })
      ) {
        reserved = await reserveNextSequenceCounter(tx, safePrefix, year);
        numeroOrden = formatCorrelativeCode(safePrefix, year, reserved.sequence, 4);
      }

      const rawPrioridad = String(dto.prioridad || 'NORMAL').toUpperCase();
      const prioridadValida: 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA' = (
        ['NORMAL', 'ALTA', 'URGENTE', 'EMERGENCIA'] as const
      ).includes(rawPrioridad as any)
        ? (rawPrioridad as 'NORMAL' | 'ALTA' | 'URGENTE' | 'EMERGENCIA')
        : 'NORMAL';

      const os = await tx.ordenes_servicio.create({
        data: {
          numero_orden: numeroOrden,
          id_cliente: cotizacion.id_cliente,
          id_sede: cotizacion.id_sede,
          id_equipo: equiposIds[0],
          id_tipo_servicio: idTipoServicio,
          fecha_programada: dto.fecha_programada ? new Date(dto.fecha_programada) : new Date(),
          prioridad: prioridadValida,
          origen_solicitud: 'PROGRAMADO',
          id_tecnico_asignado: dto.id_tecnico_asignado ?? null,
          fecha_asignacion: dto.id_tecnico_asignado ? new Date() : null,
          id_estado_actual: idEstadoInicial,
          requiere_firma_cliente: org?.requiere_firma_cliente_defecto ?? true,
          descripcion_inicial: descripcionOrden,
          tiene_garantia: (cotizacion.meses_garantia ?? 0) > 0,
          meses_garantia: cotizacion.meses_garantia ?? null,
          observaciones_garantia: cotizacion.observaciones_garantia ?? null,
          total_servicios: cotizacion.subtotal_servicios ?? 0,
          total_componentes: cotizacion.subtotal_componentes ?? 0,
          total_gastos: cotizacion.subtotal_otros ?? 0,
          total_general: cotizacion.total_cotizacion ?? 0,
          metadata: {
            origen: 'COTIZACION_CPQ',
            id_cotizacion: cotizacion.id_cotizacion,
            numero_cotizacion: cotizacion.numero_cotizacion,
            orden_compra_cliente: cotizacion.orden_compra_cliente || null,
            id_propuesta_origen: cotizacion.id_propuesta_origen || null,
            numero_propuesta_origen: cotizacion.propuesta_origen?.numero_propuesta || null,
          },
          creado_por: userId,
        },
      });

      // Registrar todos los equipos en ordenes_equipos (soporte multi-equipo nativo)
      await tx.ordenes_equipos.createMany({
        data: equiposIds.map((idEquipo, idx) => ({
          id_orden_servicio: os.id_orden_servicio,
          id_equipo: idEquipo,
          orden_secuencia: idx + 1,
          estado: 'PENDIENTE',
          creado_por: userId,
        })),
      });

      // Enlazar la cotización con la orden generada
      await tx.cotizaciones.update({
        where: { id_cotizacion: idCotizacion },
        data: {
          id_orden_servicio_generada: os.id_orden_servicio,
          fecha_conversion_os: new Date(),
          modificado_por: userId,
          fecha_modificacion: new Date(),
        },
      });

      // Si la cotización nació de una Propuesta Correctiva, cerrar su ciclo de vida atómicamente
      if (cotizacion.id_propuesta_origen) {
        await tx.propuestas_correctivo.update({
          where: { id_propuesta: cotizacion.id_propuesta_origen },
          data: {
            id_orden_servicio_generada: os.id_orden_servicio,
            fecha_conversion_os: new Date(),
            id_estado: 5, // APROBADA_CLIENTE / Cerrada con OS
            fecha_cambio_estado: new Date(),
            total_propuesta: cotizacion.total_cotizacion ?? 0,
            modificado_por: userId,
            fecha_modificacion: new Date(),
          },
        });
      }

      this.logger.log(
        `Cotización ${cotizacion.numero_cotizacion} convertida en Orden de Servicio ${os.numero_orden} (${equiposIds.length} equipo(s))`,
      );
      return os;
    });

    // Diagnóstico de Stock WMS para Remisión / Compra
    const itemsInventario = cotizacion.items_cotizacion_componentes
      .filter((c) => c.id_componente !== null)
      .map((c) => {
        const requerida = Number(c.cantidad);
        const disponible = Number(c.catalogo_componentes?.stock_actual || 0);
        const deficit = Math.max(0, requerida - disponible);
        return {
          id_componente: c.id_componente!,
          codigo_interno: c.catalogo_componentes?.codigo_interno || null,
          descripcion: c.descripcion,
          cantidad_requerida: requerida,
          stock_actual: disponible,
          deficit,
          accion_sugerida: deficit > 0 ? 'GENERAR_ORDEN_COMPRA' : 'LISTO_PARA_REMISION',
        };
      });

    return {
      message: `Orden de Servicio ${ordenCreada.numero_orden} creada exitosamente desde ${cotizacion.numero_cotizacion}`,
      orden_servicio: {
        id_orden_servicio: ordenCreada.id_orden_servicio,
        numero_orden: ordenCreada.numero_orden,
        estado: codigoEstadoObjetivo,
        equipos_count: equiposIds.length,
        total_general: Number(ordenCreada.total_general || 0),
      },
      diagnostico_inventario: {
        total_repuestos_catalogo: itemsInventario.length,
        listos_para_remision: itemsInventario.filter((i) => i.deficit === 0).length,
        con_deficit_compra: itemsInventario.filter((i) => i.deficit > 0).length,
        items: itemsInventario,
      },
    };
  }

  // ==================== ESCALAR PROPUESTA CORRECTIVA → COTIZACIÓN ====================

  async escalarPropuestaACotizacion(
    idPropuesta: number,
    userId: number,
    idEmpleadoUsuario?: number | null,
  ) {
    const propuesta = await this.prisma.propuestas_correctivo.findUnique({
      where: { id_propuesta: idPropuesta },
      include: {
        items_propuesta: { orderBy: { orden_item: 'asc' } },
        ordenes_servicio_propuestas_correctivo_id_orden_servicioToordenes_servicio: {
          select: {
            id_sede: true,
            id_equipo: true,
            numero_orden: true,
            ordenes_equipos: {
              orderBy: { orden_secuencia: 'asc' },
              select: { id_equipo: true },
            },
          },
        },
        equipos: { select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true } },
        cotizaciones_derivadas: {
          where: { id_estado: { notIn: [6, 7] } }, // Activas (no rechazadas ni vencidas)
          orderBy: { id_cotizacion: 'desc' },
          take: 1,
          select: { id_cotizacion: true, numero_cotizacion: true },
        },
      },
    });

    if (!propuesta) {
      throw new NotFoundException(`Propuesta correctiva ${idPropuesta} no encontrada`);
    }

    // Idempotencia anti-duplicados: si ya existe una cotización activa vinculada, devolverla
    const cotExistente = propuesta.cotizaciones_derivadas?.[0];
    if (cotExistente) {
      const completaExistente = await this.cotizacionesRepository.findById(
        cotExistente.id_cotizacion,
        {
          cliente: true,
          sede: true,
          equipo: true,
          estado: true,
          items_servicios: true,
          items_componentes: true,
        },
      );
      return {
        message: `La propuesta ${propuesta.numero_propuesta} ya está escalada en ${cotExistente.numero_cotizacion}. Abriendo cotización existente.`,
        ya_existia: true,
        cotizacion: completaExistente,
      };
    }

    const org = await this.prisma.configuracion_organizacion
      .findUnique({
        where: { id_configuracion: 1 },
        select: {
          codigo_moneda: true,
          tasa_impuesto_defecto: true,
          validez_cotizacion_dias_defecto: true,
          garantia_meses_defecto: true,
          terminos_cotizacion_defecto: true,
        },
      })
      .catch(() => null);

    const numeroCotizacion = await this.cotizacionesRepository.generateNumeroCotizacion();
    const hoy = new Date();
    const diasValidez = org?.validez_cotizacion_dias_defecto ?? 30;
    const vencimiento = new Date(hoy.getTime() + diasValidez * 86400_000);
    const ordenOrigen =
      propuesta.ordenes_servicio_propuestas_correctivo_id_orden_servicioToordenes_servicio;
    const equiposOrdenIds = Array.from(
      new Set<number>(
        [
          ...(propuesta.id_equipo ? [propuesta.id_equipo] : []),
          ...(ordenOrigen?.ordenes_equipos || []).map((oe) => oe.id_equipo),
          ...(ordenOrigen?.id_equipo ? [ordenOrigen.id_equipo] : []),
        ].filter((id) => Number.isInteger(id) && id > 0),
      ),
    );
    const idEquipo = equiposOrdenIds[0] ?? null;

    const cotizacion = await this.prisma.$transaction(async (tx) => {
      const creada = await tx.cotizaciones.create({
        data: {
          numero_cotizacion: numeroCotizacion,
          id_cliente: propuesta.id_cliente,
          id_sede: ordenOrigen?.id_sede ?? null,
          id_equipo: idEquipo,
          tipo_cotizacion: 'CORRECTIVO',
          id_propuesta_origen: propuesta.id_propuesta,
          moneda: org?.codigo_moneda || 'COP',
          fecha_cotizacion: hoy,
          fecha_vencimiento: vencimiento,
          dias_validez: diasValidez,
          id_estado: 1,
          asunto:
            `Correctivo ${propuesta.numero_propuesta}${propuesta.equipos?.nombre_equipo ? ` - ${propuesta.equipos.nombre_equipo}` : ''}`.slice(
              0,
              300,
            ),
          descripcion_general: `Hallazgo reportado en OS ${ordenOrigen?.numero_orden || propuesta.id_orden_servicio}:\n${propuesta.descripcion_problema}`,
          alcance_trabajo: propuesta.solucion_propuesta,
          iva_porcentaje: org?.tasa_impuesto_defecto ?? 19,
          meses_garantia: org?.garantia_meses_defecto ?? 3,
          terminos_condiciones: org?.terminos_cotizacion_defecto ?? null,
          forma_pago: 'CONTADO',
          elaborada_por: idEmpleadoUsuario ?? propuesta.propuesta_por,
          modificado_por: userId,
        },
      });

      if (equiposOrdenIds.length > 0) {
        await tx.cotizaciones_equipos.createMany({
          data: equiposOrdenIds.map((eqId, idx) => ({
            id_cotizacion: creada.id_cotizacion,
            id_equipo: eqId,
            orden_secuencia: idx + 1,
          })),
        });
      }

      // Copiar items_propuesta a servicios / componentes
      for (let i = 0; i < propuesta.items_propuesta.length; i++) {
        const it = propuesta.items_propuesta[i];
        const cant = Number(it.cantidad || 1);
        const pu = Number(it.precio_unitario || 0);
        const desc = Number(it.descuento_porcentaje || 0);
        const sub = this.calcularSubtotalLinea(cant, pu, desc);

        if (it.tipo_item === 'SERVICIO') {
          await tx.items_cotizacion_servicios.create({
            data: {
              id_cotizacion: creada.id_cotizacion,
              id_equipo: idEquipo,
              id_servicio: it.id_servicio ?? null,
              descripcion_personalizada: it.descripcion,
              cantidad: cant,
              unidad: it.unidad || 'servicio',
              precio_unitario: pu,
              descuento_porcentaje: desc,
              subtotal: sub,
              observaciones: it.observaciones,
              orden_item: it.orden_item ?? i + 1,
              registrado_por: userId,
            },
          });
        } else {
          await tx.items_cotizacion_componentes.create({
            data: {
              id_cotizacion: creada.id_cotizacion,
              id_equipo: idEquipo,
              id_componente: it.id_componente ?? null,
              id_tipo_componente: it.id_tipo_componente ?? null,
              descripcion: it.descripcion,
              cantidad: cant,
              unidad: it.unidad || 'unidad',
              precio_unitario: pu,
              descuento_porcentaje: desc,
              subtotal: sub,
              observaciones: it.observaciones,
              orden_item: it.orden_item ?? i + 1,
              registrado_por: userId,
            },
          });
        }
      }

      return creada;
    });

    await this.calculoService.recalcularTotales(cotizacion.id_cotizacion);

    const completa = await this.cotizacionesRepository.findById(cotizacion.id_cotizacion, {
      cliente: true,
      sede: true,
      equipo: true,
      estado: true,
      items_servicios: true,
      items_componentes: true,
    });

    return {
      message: `Propuesta ${propuesta.numero_propuesta} escalada a Cotización ${cotizacion.numero_cotizacion}`,
      cotizacion: completa,
    };
  }

  // ==================== FIRMAS DIGITALES OPCIONALES (REUTILIZA firmas_digitales) ====================

  /**
   * Obtiene hasta 3 firmas históricas agrupadas por hash_firma para un empleado (Asesor/Técnico),
   * marcando como estándar la de mayor uso (empate -> la más reciente).
   */
  async obtenerFirmasHistorialEmpleado(idEmpleado: number, excludeFirmaId?: number) {
    if (!Number.isInteger(idEmpleado) || idEmpleado <= 0) {
      return { success: true, data: [] };
    }

    const empleado = await this.prisma.empleados.findUnique({
      where: { id_empleado: idEmpleado },
      select: { id_persona: true },
    });
    if (!empleado?.id_persona) {
      return { success: true, data: [] };
    }

    const firmas = await this.prisma.firmas_digitales.findMany({
      where: {
        id_persona: empleado.id_persona,
        activa: true,
        tipo_firma: { in: ['ASESOR', 'TECNICO', 'GERENTE', 'ADMINISTRATIVA'] },
        ...(excludeFirmaId ? { id_firma_digital: { not: excludeFirmaId } } : {}),
      },
      select: {
        id_firma_digital: true,
        firma_base64: true,
        hash_firma: true,
        fecha_registro: true,
        es_firma_principal: true,
      },
      orderBy: { fecha_registro: 'desc' },
      take: 25,
    });

    const porHash = new Map<
      string,
      { id: number; base64: string; fecha: Date | null; veces: number; principal: boolean }
    >();

    for (const f of firmas) {
      if (!f.firma_base64) continue;
      const existente = porHash.get(f.hash_firma);
      if (existente) {
        existente.veces += 1;
        if (f.es_firma_principal) existente.principal = true;
        if (f.fecha_registro && (!existente.fecha || f.fecha_registro > existente.fecha)) {
          existente.id = f.id_firma_digital;
          existente.base64 = f.firma_base64;
          existente.fecha = f.fecha_registro;
        }
      } else {
        porHash.set(f.hash_firma, {
          id: f.id_firma_digital,
          base64: f.firma_base64,
          fecha: f.fecha_registro ?? null,
          veces: 1,
          principal: Boolean(f.es_firma_principal),
        });
      }
    }

    const lista = Array.from(porHash.values()).map((info) => ({
      id_firma_digital: info.id,
      firma_base64: info.base64,
      veces_usada: info.veces,
      fecha_captura: info.fecha,
      es_principal: info.principal,
    }));

    lista.sort(
      (a, b) =>
        Number(b.es_principal) - Number(a.es_principal) ||
        b.veces_usada - a.veces_usada ||
        (b.fecha_captura?.getTime() || 0) - (a.fecha_captura?.getTime() || 0),
    );

    const maxVeces = lista.length > 0 ? lista[0].veces_usada : 0;

    return {
      success: true,
      data: lista.slice(0, 3).map((f, idx) => ({
        id_firma_digital: f.id_firma_digital,
        firma_base64: f.firma_base64,
        veces_usada: f.veces_usada,
        fecha_captura: f.fecha_captura,
        es_estandar: idx === 0 || (f.veces_usada === maxVeces && maxVeces > 0),
      })),
    };
  }

  async guardarFirmaCotizacion(
    idCotizacion: number,
    tipoRaw: string,
    dto: GuardarFirmaCotizacionDto,
    userId: number,
  ) {
    const tipo = String(tipoRaw || '')
      .trim()
      .toUpperCase();
    if (tipo !== 'ASESOR' && tipo !== 'CLIENTE') {
      throw new BadRequestException('Tipo de firma inválido. Use ASESOR o CLIENTE.');
    }

    const cot = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      select: {
        id_cotizacion: true,
        id_estado: true,
        elaborada_por: true,
        id_cliente: true,
        id_firma_asesor: true,
        id_firma_cliente: true,
        empleados: { select: { id_persona: true } },
        clientes: { select: { id_persona: true } },
      },
    });

    if (!cot) {
      throw new NotFoundException(`Cotización #${idCotizacion} no encontrada`);
    }

    if (cot.id_estado === 6 || cot.id_estado === 7) {
      throw new BadRequestException(
        'No se pueden adjuntar firmas a una cotización RECHAZADA o VENCIDA.',
      );
    }

    let firmaId: number | null = null;
    let firmaRecord: {
      id_firma_digital: number;
      tipo_firma: string;
      firma_base64: string;
      formato_firma: string | null;
      fecha_captura: Date | null;
    } | null = null;

    if (dto.id_firma_digital) {
      const existing = await this.prisma.firmas_digitales.findUnique({
        where: { id_firma_digital: dto.id_firma_digital },
        select: {
          id_firma_digital: true,
          tipo_firma: true,
          firma_base64: true,
          formato_firma: true,
          fecha_captura: true,
        },
      });
      if (!existing) {
        throw new NotFoundException(`Firma digital #${dto.id_firma_digital} no encontrada`);
      }
      firmaId = existing.id_firma_digital;
      firmaRecord = existing;
    } else if (dto.firma_base64?.trim()) {
      let base64Clean = dto.firma_base64.trim();
      let formato = 'PNG';
      const dataUriMatch = base64Clean.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (dataUriMatch) {
        formato = dataUriMatch[1].toUpperCase().slice(0, 10);
        base64Clean = dataUriMatch[2];
      }

      const idPersona =
        tipo === 'ASESOR'
          ? (cot.empleados?.id_persona ?? null)
          : (cot.clientes?.id_persona ?? null);

      let resolvedPersonaId: number | null = idPersona ?? null;
      if (!resolvedPersonaId) {
        const userRow = await this.prisma.usuarios.findUnique({
          where: { id_usuario: userId },
          select: { id_persona: true },
        });
        resolvedPersonaId = userRow?.id_persona ?? null;
      }

      if (!resolvedPersonaId) {
        throw new BadRequestException(
          'No se encontró una persona asociada para registrar la firma digital.',
        );
      }

      const hashFirma = createHash('sha256').update(base64Clean).digest('hex').slice(0, 64);

      const nuevaFirma = await this.prisma.firmas_digitales.create({
        data: {
          id_persona: resolvedPersonaId,
          tipo_firma: tipo as any,
          firma_base64: base64Clean,
          formato_firma: formato,
          hash_firma: hashFirma,
          es_firma_principal: false,
          activa: true,
          registrada_por: userId,
          fecha_captura: new Date(),
          fecha_registro: new Date(),
        },
        select: {
          id_firma_digital: true,
          tipo_firma: true,
          firma_base64: true,
          formato_firma: true,
          fecha_captura: true,
        },
      });
      firmaId = nuevaFirma.id_firma_digital;
      firmaRecord = nuevaFirma;
    } else if (
      tipo === 'CLIENTE' &&
      (dto.atencion_a_nombre !== undefined || dto.atencion_a_cargo !== undefined)
    ) {
      // Permite actualizar solo los datos del firmante cliente conservando la firma existente
      firmaId = cot.id_firma_cliente ?? null;
    } else {
      throw new BadRequestException(
        'Debe enviar firma_base64, id_firma_digital o datos del firmante.',
      );
    }

    const updateData: Prisma.cotizacionesUpdateInput = {
      modificado_por: userId,
      fecha_modificacion: new Date(),
    };

    if (tipo === 'ASESOR' && firmaId !== null) {
      updateData.firma_asesor = { connect: { id_firma_digital: firmaId } };
    }
    if (tipo === 'CLIENTE') {
      if (firmaId !== null) {
        updateData.firma_cliente = { connect: { id_firma_digital: firmaId } };
      }
      if (dto.atencion_a_nombre !== undefined) {
        updateData.atencion_a_nombre = dto.atencion_a_nombre.trim()
          ? dto.atencion_a_nombre.trim().slice(0, 200)
          : null;
      }
      if (dto.atencion_a_cargo !== undefined) {
        updateData.atencion_a_cargo = dto.atencion_a_cargo.trim()
          ? dto.atencion_a_cargo.trim().slice(0, 120)
          : null;
      }
    }

    const updated = await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: updateData,
      select: {
        id_cotizacion: true,
        id_firma_asesor: true,
        id_firma_cliente: true,
        atencion_a_nombre: true,
        atencion_a_cargo: true,
        fecha_modificacion: true,
        firma_asesor: {
          select: {
            id_firma_digital: true,
            tipo_firma: true,
            firma_base64: true,
            formato_firma: true,
            fecha_captura: true,
          },
        },
        firma_cliente: {
          select: {
            id_firma_digital: true,
            tipo_firma: true,
            firma_base64: true,
            formato_firma: true,
            fecha_captura: true,
          },
        },
      },
    });

    return {
      success: true,
      message:
        tipo === 'ASESOR'
          ? 'Firma del Asesor adjuntada correctamente'
          : 'Firma de Aceptación del Cliente actualizada correctamente',
      data: {
        id_cotizacion: updated.id_cotizacion,
        tipo,
        id_firma_asesor: updated.id_firma_asesor,
        id_firma_cliente: updated.id_firma_cliente,
        firma_asesor: updated.firma_asesor ?? (tipo === 'ASESOR' ? firmaRecord : null),
        firma_cliente: updated.firma_cliente ?? (tipo === 'CLIENTE' ? firmaRecord : null),
        atencion_a_nombre: updated.atencion_a_nombre,
        atencion_a_cargo: updated.atencion_a_cargo,
        fecha_modificacion: updated.fecha_modificacion,
      },
    };
  }

  async eliminarFirmaCotizacion(idCotizacion: number, tipoRaw: string, userId: number) {
    const tipo = String(tipoRaw || '')
      .trim()
      .toUpperCase();
    if (tipo !== 'ASESOR' && tipo !== 'CLIENTE') {
      throw new BadRequestException('Tipo de firma inválido. Use ASESOR o CLIENTE.');
    }

    const cot = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      select: { id_cotizacion: true },
    });
    if (!cot) {
      throw new NotFoundException(`Cotización #${idCotizacion} no encontrada`);
    }

    const updated = await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: {
        ...(tipo === 'ASESOR' ? { id_firma_asesor: null } : { id_firma_cliente: null }),
        modificado_por: userId,
        fecha_modificacion: new Date(),
      },
      select: {
        id_cotizacion: true,
        id_firma_asesor: true,
        id_firma_cliente: true,
        fecha_modificacion: true,
      },
    });

    return {
      success: true,
      message:
        tipo === 'ASESOR'
          ? 'Firma del Asesor desvinculada de la cotización'
          : 'Firma del Cliente desvinculada de la cotización',
      data: updated,
    };
  }
}
