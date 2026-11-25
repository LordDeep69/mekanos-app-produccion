import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CotizacionesRepository } from '../domain/cotizaciones.repository.interface';
import { CotizacionCalculoService } from '../services/cotizacion-calculo.service';
import {
  AplicarPlantillaDto,
  CreatePlantillaCotizacionDto,
  GuardarComoPlantillaDto,
  ImportarBomModeloDto,
  UpdatePlantillaCotizacionDto,
} from './plantillas-cotizacion.dto';

/**
 * PLANTILLAS COTIZACION SERVICE (Motor Universal de Plantillas CPQ)
 *
 * Permite definir plantillas reutilizables para cualquier tipo de oferta
 * (ej. "Suministro e Instalación de Baterías", "Mantenimiento Preventivo",
 * "Correctivo con Logística y Viáticos", etc.), opcionalmente vinculadas
 * a un tipo de equipo, modelo OEM exacto o subsistema, con auto-escalado
 * `es_por_equipo` y sincronización de precios vivos de catálogo.
 */
@Injectable()
export class PlantillasCotizacionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calculoService: CotizacionCalculoService,
    @Inject('CotizacionesRepository')
    private readonly cotizacionesRepository: CotizacionesRepository,
  ) {}

  private buildCodigoPlantilla(nombre: string, custom?: string): string {
    if (custom && custom.trim()) {
      const normalized = custom
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
      return normalized || `TPL-${Date.now()}`;
    }

    const STOPWORDS = new Set([
      'DE',
      'DEL',
      'LA',
      'LAS',
      'EL',
      'LOS',
      'Y',
      'E',
      'O',
      'U',
      'EN',
      'PARA',
      'CON',
      'POR',
      'A',
      'AL',
      'UN',
      'UNA',
      'UNOS',
      'UNAS',
      'SU',
      'SUS',
      'SIN',
      'SOBRE',
      'ENTRE',
    ]);

    const allTokens = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .split(/[^A-Z0-9]+/)
      .filter(Boolean);

    const meaningful = allTokens.filter((t) => !STOPWORDS.has(t));
    const source = meaningful.length > 0 ? meaningful : allTokens;

    const chosen: string[] = [];
    let current = 'TPL';
    for (const tok of source) {
      if (chosen.length >= 3) break;
      const next = `${current}-${tok}`;
      if (chosen.length === 0) {
        chosen.push(tok.slice(0, 22));
        current = `TPL-${chosen[0]}`;
      } else if (next.length <= 28) {
        chosen.push(tok);
        current = next;
      }
    }

    return chosen.length > 0 ? current : `TPL-${Date.now().toString().slice(-6)}`;
  }

  private mapPlantilla(pl: any) {
    return {
      ...pl,
      aiu_admin_porcentaje: Number(pl.aiu_admin_porcentaje || 0),
      aiu_imprevistos_porcentaje: Number(pl.aiu_imprevistos_porcentaje || 0),
      aiu_utilidad_porcentaje: Number(pl.aiu_utilidad_porcentaje || 0),
      items: (pl.items || []).map((it: any) => ({
        ...it,
        cantidad_base: Number(it.cantidad_base || 1),
        precio_unitario_fijo:
          it.precio_unitario_fijo !== null && it.precio_unitario_fijo !== undefined
            ? Number(it.precio_unitario_fijo)
            : null,
        costo_unitario_fijo:
          it.costo_unitario_fijo !== null && it.costo_unitario_fijo !== undefined
            ? Number(it.costo_unitario_fijo)
            : null,
      })),
    };
  }

  async listar(filtros?: {
    search?: string;
    tipo_cotizacion?: string;
    id_tipo_equipo?: number;
    id_modelo_equipo?: number;
    solo_activas?: boolean;
  }) {
    const where: any = {};
    if (filtros?.solo_activas !== false) where.activo = true;
    if (filtros?.tipo_cotizacion) where.tipo_cotizacion = filtros.tipo_cotizacion;
    if (filtros?.id_tipo_equipo) where.id_tipo_equipo = filtros.id_tipo_equipo;
    if (filtros?.id_modelo_equipo) where.id_modelo_equipo = filtros.id_modelo_equipo;
    if (filtros?.search?.trim()) {
      const q = filtros.search.trim();
      where.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { codigo_plantilla: { contains: q, mode: 'insensitive' } },
        { descripcion: { contains: q, mode: 'insensitive' } },
        { tipo_cotizacion: { contains: q, mode: 'insensitive' } },
      ];
    }

    const rows = await this.prisma.plantillas_cotizacion.findMany({
      where,
      include: {
        tipos_equipo: { select: { id_tipo_equipo: true, codigo_tipo: true, nombre_tipo: true } },
        modelos_equipo: {
          select: { id_modelo_equipo: true, codigo_modelo: true, marca: true, modelo: true },
        },
        modulos_tecnicos: { select: { id_modulo: true, codigo_modulo: true, nombre_modulo: true } },
        items: {
          orderBy: [{ orden_item: 'asc' }, { id_plantilla_item: 'asc' }],
          include: {
            catalogo_servicios: {
              select: {
                id_servicio: true,
                codigo_servicio: true,
                nombre_servicio: true,
                precio_base: true,
              },
            },
            catalogo_componentes: {
              select: {
                id_componente: true,
                id_tipo_componente: true,
                codigo_interno: true,
                referencia_fabricante: true,
                marca: true,
                descripcion_corta: true,
                precio_venta: true,
                precio_compra: true,
                stock_actual: true,
                es_inventariable: true,
                unidad_medida: true,
              },
            },
          },
        },
      },
      orderBy: [{ veces_usada: 'desc' }, { nombre: 'asc' }],
    });

    return rows.map((r) => this.mapPlantilla(r));
  }

  async obtenerPorId(idPlantilla: number) {
    const row = await this.prisma.plantillas_cotizacion.findUnique({
      where: { id_plantilla: idPlantilla },
      include: {
        tipos_equipo: { select: { id_tipo_equipo: true, codigo_tipo: true, nombre_tipo: true } },
        modelos_equipo: {
          select: { id_modelo_equipo: true, codigo_modelo: true, marca: true, modelo: true },
        },
        modulos_tecnicos: { select: { id_modulo: true, codigo_modulo: true, nombre_modulo: true } },
        items: {
          orderBy: [{ orden_item: 'asc' }, { id_plantilla_item: 'asc' }],
          include: {
            catalogo_servicios: {
              select: {
                id_servicio: true,
                codigo_servicio: true,
                nombre_servicio: true,
                precio_base: true,
              },
            },
            catalogo_componentes: {
              select: {
                id_componente: true,
                id_tipo_componente: true,
                codigo_interno: true,
                referencia_fabricante: true,
                marca: true,
                descripcion_corta: true,
                precio_venta: true,
                precio_compra: true,
                stock_actual: true,
                es_inventariable: true,
                unidad_medida: true,
              },
            },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException(`Plantilla de cotización ${idPlantilla} no encontrada`);
    }
    return this.mapPlantilla(row);
  }

  async crear(dto: CreatePlantillaCotizacionDto, userId?: number) {
    const baseCode = this.buildCodigoPlantilla(dto.nombre, dto.codigo_plantilla);
    let codigo = baseCode;
    const existe = await this.prisma.plantillas_cotizacion.findUnique({
      where: { codigo_plantilla: codigo },
      select: { id_plantilla: true },
    });
    if (existe) {
      if (dto.codigo_plantilla) {
        throw new ConflictException(`Ya existe una plantilla con el código ${codigo}`);
      }
      codigo = `${baseCode.slice(0, 48)}-${Date.now().toString().slice(-6)}`;
    }

    const creada = await this.prisma.$transaction(async (tx) => {
      const pl = await tx.plantillas_cotizacion.create({
        data: {
          codigo_plantilla: codigo,
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion ?? null,
          tipo_cotizacion: dto.tipo_cotizacion || 'SERVICIO_TECNICO',
          id_tipo_equipo: dto.id_tipo_equipo ?? null,
          id_modelo_equipo: dto.id_modelo_equipo ?? null,
          id_modulo: dto.id_modulo ?? null,
          asunto_sugerido: dto.asunto_sugerido ?? null,
          descripcion_general: dto.descripcion_general ?? null,
          alcance_trabajo: dto.alcance_trabajo ?? null,
          exclusiones: dto.exclusiones ?? null,
          terminos_condiciones: dto.terminos_condiciones ?? null,
          forma_pago: dto.forma_pago || 'CONTADO',
          meses_garantia: dto.meses_garantia ?? 3,
          tiempo_estimado_dias: dto.tiempo_estimado_dias ?? null,
          usa_aiu: Boolean(dto.usa_aiu),
          aiu_admin_porcentaje: dto.aiu_admin_porcentaje ?? 0,
          aiu_imprevistos_porcentaje: dto.aiu_imprevistos_porcentaje ?? 0,
          aiu_utilidad_porcentaje: dto.aiu_utilidad_porcentaje ?? 0,
          iva_sobre_utilidad_aiu: Boolean(dto.iva_sobre_utilidad_aiu),
          mostrar_desglose_precios:
            dto.mostrar_desglose_precios !== undefined ? dto.mostrar_desglose_precios : null,
          activo: dto.activo !== false,
          creado_por: userId ?? null,
        },
      });

      if (dto.items && dto.items.length > 0) {
        await tx.plantillas_cotizacion_items.createMany({
          data: dto.items.map((it, idx) => ({
            id_plantilla: pl.id_plantilla,
            tipo_linea: it.tipo_linea,
            id_servicio: it.tipo_linea === 'SERVICIO' ? (it.id_servicio ?? null) : null,
            id_componente: it.tipo_linea === 'COMPONENTE' ? (it.id_componente ?? null) : null,
            categoria_rubro:
              it.tipo_linea === 'OTRO' ? (it.categoria_rubro || 'OTRO').toUpperCase() : null,
            descripcion: it.descripcion.trim(),
            detalle_calculo: it.detalle_calculo ?? null,
            unidad:
              it.unidad ||
              (it.tipo_linea === 'SERVICIO'
                ? 'servicio'
                : it.tipo_linea === 'OTRO'
                  ? 'global'
                  : 'unidad'),
            cantidad_base: it.cantidad_base ?? 1,
            es_por_equipo: it.es_por_equipo !== false,
            usar_precio_catalogo: it.usar_precio_catalogo !== false,
            precio_unitario_fijo: it.precio_unitario_fijo ?? null,
            costo_unitario_fijo: it.costo_unitario_fijo ?? null,
            visible_cliente: it.visible_cliente !== false,
            es_opcional: Boolean(it.es_opcional),
            iva_aplicable: it.iva_aplicable !== false,
            garantia_meses: it.garantia_meses ?? null,
            orden_item: it.orden_item ?? idx + 1,
            observaciones: it.observaciones ?? null,
          })),
        });
      }

      return pl;
    });

    return this.obtenerPorId(creada.id_plantilla);
  }

  async actualizar(idPlantilla: number, dto: UpdatePlantillaCotizacionDto) {
    const actual = await this.obtenerPorId(idPlantilla);

    if (dto.codigo_plantilla && dto.codigo_plantilla.trim()) {
      const nuevoCodigo = dto.codigo_plantilla.trim().toUpperCase();
      if (nuevoCodigo !== actual.codigo_plantilla) {
        const duplicada = await this.prisma.plantillas_cotizacion.findUnique({
          where: { codigo_plantilla: nuevoCodigo },
          select: { id_plantilla: true },
        });
        if (duplicada && duplicada.id_plantilla !== idPlantilla) {
          throw new ConflictException(`Ya existe una plantilla con el código ${nuevoCodigo}`);
        }
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.plantillas_cotizacion.update({
        where: { id_plantilla: idPlantilla },
        data: {
          ...(dto.codigo_plantilla
            ? { codigo_plantilla: dto.codigo_plantilla.trim().toUpperCase() }
            : {}),
          ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
          ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
          ...(dto.tipo_cotizacion !== undefined ? { tipo_cotizacion: dto.tipo_cotizacion } : {}),
          ...(dto.id_tipo_equipo !== undefined ? { id_tipo_equipo: dto.id_tipo_equipo } : {}),
          ...(dto.id_modelo_equipo !== undefined ? { id_modelo_equipo: dto.id_modelo_equipo } : {}),
          ...(dto.id_modulo !== undefined ? { id_modulo: dto.id_modulo } : {}),
          ...(dto.asunto_sugerido !== undefined ? { asunto_sugerido: dto.asunto_sugerido } : {}),
          ...(dto.descripcion_general !== undefined
            ? { descripcion_general: dto.descripcion_general }
            : {}),
          ...(dto.alcance_trabajo !== undefined ? { alcance_trabajo: dto.alcance_trabajo } : {}),
          ...(dto.exclusiones !== undefined ? { exclusiones: dto.exclusiones } : {}),
          ...(dto.terminos_condiciones !== undefined
            ? { terminos_condiciones: dto.terminos_condiciones }
            : {}),
          ...(dto.forma_pago !== undefined ? { forma_pago: dto.forma_pago } : {}),
          ...(dto.meses_garantia !== undefined ? { meses_garantia: dto.meses_garantia } : {}),
          ...(dto.tiempo_estimado_dias !== undefined
            ? { tiempo_estimado_dias: dto.tiempo_estimado_dias }
            : {}),
          ...(dto.usa_aiu !== undefined ? { usa_aiu: dto.usa_aiu } : {}),
          ...(dto.aiu_admin_porcentaje !== undefined
            ? { aiu_admin_porcentaje: dto.aiu_admin_porcentaje }
            : {}),
          ...(dto.aiu_imprevistos_porcentaje !== undefined
            ? { aiu_imprevistos_porcentaje: dto.aiu_imprevistos_porcentaje }
            : {}),
          ...(dto.aiu_utilidad_porcentaje !== undefined
            ? { aiu_utilidad_porcentaje: dto.aiu_utilidad_porcentaje }
            : {}),
          ...(dto.iva_sobre_utilidad_aiu !== undefined
            ? { iva_sobre_utilidad_aiu: dto.iva_sobre_utilidad_aiu }
            : {}),
          ...(dto.mostrar_desglose_precios !== undefined
            ? { mostrar_desglose_precios: dto.mostrar_desglose_precios }
            : {}),
          ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
          fecha_modificacion: new Date(),
        },
      });

      if (dto.items !== undefined) {
        await tx.plantillas_cotizacion_items.deleteMany({
          where: { id_plantilla: idPlantilla },
        });
        if (dto.items.length > 0) {
          await tx.plantillas_cotizacion_items.createMany({
            data: dto.items.map((it, idx) => ({
              id_plantilla: idPlantilla,
              tipo_linea: it.tipo_linea,
              id_servicio: it.tipo_linea === 'SERVICIO' ? (it.id_servicio ?? null) : null,
              id_componente: it.tipo_linea === 'COMPONENTE' ? (it.id_componente ?? null) : null,
              categoria_rubro:
                it.tipo_linea === 'OTRO' ? (it.categoria_rubro || 'OTRO').toUpperCase() : null,
              descripcion: it.descripcion.trim(),
              detalle_calculo: it.detalle_calculo ?? null,
              unidad:
                it.unidad ||
                (it.tipo_linea === 'SERVICIO'
                  ? 'servicio'
                  : it.tipo_linea === 'OTRO'
                    ? 'global'
                    : 'unidad'),
              cantidad_base: it.cantidad_base ?? 1,
              es_por_equipo: it.es_por_equipo !== false,
              usar_precio_catalogo: it.usar_precio_catalogo !== false,
              precio_unitario_fijo: it.precio_unitario_fijo ?? null,
              costo_unitario_fijo: it.costo_unitario_fijo ?? null,
              visible_cliente: it.visible_cliente !== false,
              es_opcional: Boolean(it.es_opcional),
              iva_aplicable: it.iva_aplicable !== false,
              garantia_meses: it.garantia_meses ?? null,
              orden_item: it.orden_item ?? idx + 1,
              observaciones: it.observaciones ?? null,
            })),
          });
        }
      }
    });

    return this.obtenerPorId(idPlantilla);
  }

  async eliminar(idPlantilla: number) {
    await this.obtenerPorId(idPlantilla);
    await this.prisma.plantillas_cotizacion.update({
      where: { id_plantilla: idPlantilla },
      data: { activo: false, fecha_modificacion: new Date() },
    });
    return { message: 'Plantilla desactivada exitosamente' };
  }

  // ==================== APLICAR PLANTILLA A COTIZACIÓN ====================

  async aplicarPlantilla(
    idCotizacion: number,
    idPlantilla: number,
    dto: AplicarPlantillaDto,
    userId?: number,
  ) {
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: { cotizaciones_equipos: true },
    });
    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }
    if (cotizacion.id_estado !== 1) {
      throw new BadRequestException(
        'Solo se puede aplicar una plantilla a cotizaciones en BORRADOR',
      );
    }

    const plantilla = await this.prisma.plantillas_cotizacion.findUnique({
      where: { id_plantilla: idPlantilla },
      include: {
        items: {
          orderBy: [{ orden_item: 'asc' }, { id_plantilla_item: 'asc' }],
          include: {
            catalogo_servicios: true,
            catalogo_componentes: true,
          },
        },
      },
    });
    if (!plantilla) {
      throw new NotFoundException(`Plantilla ${idPlantilla} no encontrada`);
    }

    const equiposVinculadosCount =
      cotizacion.cotizaciones_equipos.length || (cotizacion.id_equipo ? 1 : 1);
    const multiplicador = Math.max(1, dto.multiplicador_equipos ?? equiposVinculadosCount);
    const reemplazar = Boolean(dto.reemplazar_items);
    const aplicarTextos = dto.aplicar_textos_comerciales !== false;

    let agregadosServicios = 0;
    let agregadosComponentes = 0;
    let agregadosOtros = 0;

    await this.prisma.$transaction(async (tx) => {
      if (reemplazar) {
        await tx.items_cotizacion_servicios.deleteMany({ where: { id_cotizacion: idCotizacion } });
        await tx.items_cotizacion_componentes.deleteMany({
          where: { id_cotizacion: idCotizacion },
        });
        await tx.items_cotizacion_otros.deleteMany({ where: { id_cotizacion: idCotizacion } });
      }

      const [maxServ, maxComp, maxOtros] = await Promise.all([
        tx.items_cotizacion_servicios.count({ where: { id_cotizacion: idCotizacion } }),
        tx.items_cotizacion_componentes.count({ where: { id_cotizacion: idCotizacion } }),
        tx.items_cotizacion_otros.count({ where: { id_cotizacion: idCotizacion } }),
      ]);

      let ordS = maxServ;
      let ordC = maxComp;
      let ordO = maxOtros;

      for (const it of plantilla.items) {
        const cantBase = Number(it.cantidad_base || 1);
        const cantidad = Math.round(cantBase * (it.es_por_equipo ? multiplicador : 1) * 100) / 100;

        if (it.tipo_linea === 'SERVICIO') {
          ordS += 1;
          const pu =
            it.usar_precio_catalogo &&
            it.catalogo_servicios?.precio_base !== null &&
            it.catalogo_servicios?.precio_base !== undefined
              ? Number(it.catalogo_servicios.precio_base)
              : Number(it.precio_unitario_fijo ?? 0);
          const cu = Number(it.costo_unitario_fijo ?? 0);
          await tx.items_cotizacion_servicios.create({
            data: {
              id_cotizacion: idCotizacion,
              id_servicio: it.id_servicio ?? null,
              descripcion_personalizada: it.descripcion,
              cantidad,
              unidad: it.unidad || 'servicio',
              costo_unitario: cu,
              precio_unitario: pu,
              descuento_porcentaje: 0,
              subtotal: Math.round(cantidad * pu * 100) / 100,
              es_opcional: it.es_opcional,
              iva_aplicable: it.iva_aplicable,
              observaciones: it.observaciones,
              orden_item: ordS,
              registrado_por: userId ?? null,
            },
          });
          agregadosServicios += 1;
        } else if (it.tipo_linea === 'COMPONENTE') {
          ordC += 1;
          const comp = it.catalogo_componentes;
          const pu =
            it.usar_precio_catalogo &&
            comp?.precio_venta !== null &&
            comp?.precio_venta !== undefined
              ? Number(comp.precio_venta)
              : Number(it.precio_unitario_fijo ?? 0);
          const cu =
            it.usar_precio_catalogo &&
            comp?.precio_compra !== null &&
            comp?.precio_compra !== undefined
              ? Number(comp.precio_compra)
              : Number(it.costo_unitario_fijo ?? 0);
          await tx.items_cotizacion_componentes.create({
            data: {
              id_cotizacion: idCotizacion,
              id_componente: it.id_componente ?? null,
              id_tipo_componente: comp?.id_tipo_componente ?? null,
              descripcion: it.descripcion,
              referencia_manual: comp?.referencia_fabricante ?? null,
              marca_manual: comp?.marca ?? null,
              cantidad,
              unidad: it.unidad || comp?.unidad_medida || 'unidad',
              costo_unitario: cu,
              precio_unitario: pu,
              descuento_porcentaje: 0,
              subtotal: Math.round(cantidad * pu * 100) / 100,
              es_opcional: it.es_opcional,
              iva_aplicable: it.iva_aplicable,
              garantia_meses: it.garantia_meses ?? null,
              observaciones: it.observaciones,
              orden_item: ordC,
              registrado_por: userId ?? null,
            },
          });
          agregadosComponentes += 1;
        } else {
          ordO += 1;
          const pu = Number(it.precio_unitario_fijo ?? 0);
          const cu = Number(it.costo_unitario_fijo ?? 0);
          await tx.items_cotizacion_otros.create({
            data: {
              id_cotizacion: idCotizacion,
              categoria_rubro: (it.categoria_rubro || 'OTRO').toUpperCase(),
              descripcion: it.descripcion,
              detalle_calculo: it.detalle_calculo ?? null,
              cantidad,
              unidad: it.unidad || 'global',
              costo_unitario: cu,
              precio_unitario: pu,
              descuento_porcentaje: 0,
              subtotal: Math.round(cantidad * pu * 100) / 100,
              visible_cliente: it.visible_cliente,
              es_opcional: it.es_opcional,
              iva_aplicable: it.iva_aplicable,
              observaciones: it.observaciones,
              orden_item: ordO,
              registrado_por: userId ?? null,
            },
          });
          agregadosOtros += 1;
        }
      }

      const headerUpdate: any = {
        id_plantilla_origen: plantilla.id_plantilla,
        tipo_cotizacion: plantilla.tipo_cotizacion,
        fecha_modificacion: new Date(),
        ...(userId ? { modificado_por: userId } : {}),
      };

      if (aplicarTextos) {
        if (plantilla.asunto_sugerido && (!cotizacion.asunto || reemplazar)) {
          headerUpdate.asunto = plantilla.asunto_sugerido;
        }
        if (plantilla.descripcion_general && (!cotizacion.descripcion_general || reemplazar)) {
          headerUpdate.descripcion_general = plantilla.descripcion_general;
        }
        if (plantilla.alcance_trabajo && (!cotizacion.alcance_trabajo || reemplazar)) {
          headerUpdate.alcance_trabajo = plantilla.alcance_trabajo;
        }
        if (plantilla.exclusiones && (!cotizacion.exclusiones || reemplazar)) {
          headerUpdate.exclusiones = plantilla.exclusiones;
        }
        if (plantilla.terminos_condiciones && (!cotizacion.terminos_condiciones || reemplazar)) {
          headerUpdate.terminos_condiciones = plantilla.terminos_condiciones;
        }
        if (plantilla.forma_pago) headerUpdate.forma_pago = plantilla.forma_pago;
        if (plantilla.meses_garantia !== null && plantilla.meses_garantia !== undefined) {
          headerUpdate.meses_garantia = plantilla.meses_garantia;
        }
        if (
          plantilla.tiempo_estimado_dias !== null &&
          plantilla.tiempo_estimado_dias !== undefined
        ) {
          headerUpdate.tiempo_estimado_dias = plantilla.tiempo_estimado_dias;
        }
        if (plantilla.usa_aiu) {
          headerUpdate.usa_aiu = true;
          headerUpdate.aiu_admin_porcentaje = plantilla.aiu_admin_porcentaje;
          headerUpdate.aiu_imprevistos_porcentaje = plantilla.aiu_imprevistos_porcentaje;
          headerUpdate.aiu_utilidad_porcentaje = plantilla.aiu_utilidad_porcentaje;
          headerUpdate.iva_sobre_utilidad_aiu = plantilla.iva_sobre_utilidad_aiu;
        }
        if (
          plantilla.mostrar_desglose_precios !== null &&
          plantilla.mostrar_desglose_precios !== undefined
        ) {
          headerUpdate.mostrar_desglose_precios = plantilla.mostrar_desglose_precios;
        }
      }

      await tx.cotizaciones.update({
        where: { id_cotizacion: idCotizacion },
        data: headerUpdate,
      });

      await tx.plantillas_cotizacion.update({
        where: { id_plantilla: idPlantilla },
        data: { veces_usada: { increment: 1 } },
      });
    });

    await this.calculoService.recalcularTotales(idCotizacion);

    const cotizacionActualizada = await this.cotizacionesRepository.findById(idCotizacion, {
      cliente: true,
      sede: true,
      equipo: true,
      estado: true,
      items_servicios: true,
      items_componentes: true,
      aprobaciones: true,
    });

    return {
      message: `Plantilla "${plantilla.nombre}" aplicada (x${multiplicador} equipo(s)): +${agregadosServicios} servicios, +${agregadosComponentes} repuestos, +${agregadosOtros} rubros`,
      resumen: {
        multiplicador_equipos: multiplicador,
        agregados_servicios: agregadosServicios,
        agregados_componentes: agregadosComponentes,
        agregados_otros: agregadosOtros,
      },
      cotizacion: cotizacionActualizada,
    };
  }

  // ==================== IMPORTAR BOM DE MODELO OEM ====================

  async importarBomModelo(
    idCotizacion: number,
    idModeloEquipo: number,
    dto: ImportarBomModeloDto,
    userId?: number,
  ) {
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        cotizaciones_equipos: {
          include: { equipos: { select: { id_equipo: true, id_modelo_equipo: true } } },
        },
      },
    });
    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }
    if (cotizacion.id_estado !== 1) {
      throw new BadRequestException('Solo se puede importar BOM OEM a cotizaciones en BORRADOR');
    }

    const modelo = await this.prisma.modelos_equipo.findUnique({
      where: { id_modelo_equipo: idModeloEquipo },
      include: {
        modelos_equipo_bom: {
          include: { catalogo_componentes: true },
        },
      },
    });
    if (!modelo) {
      throw new NotFoundException(`Modelo de equipo ${idModeloEquipo} no encontrado`);
    }

    const countGemelos = cotizacion.cotizaciones_equipos.filter(
      (ce) => ce.equipos.id_modelo_equipo === idModeloEquipo,
    ).length;
    const multiplicador = Math.max(1, dto.multiplicador_equipos ?? (countGemelos || 1));

    const bomFiltrado = modelo.modelos_equipo_bom.filter(
      (b) => b.rol_bom === 'TITULAR' || dto.incluir_alternos_como_opcionales,
    );
    if (bomFiltrado.length === 0) {
      throw new BadRequestException(
        `El modelo ${modelo.marca} ${modelo.modelo} no tiene repuestos BOM configurados`,
      );
    }

    const existingCount = await this.prisma.items_cotizacion_componentes.count({
      where: { id_cotizacion: idCotizacion },
    });

    await this.prisma.items_cotizacion_componentes.createMany({
      data: bomFiltrado.map((b, idx) => {
        const comp = b.catalogo_componentes;
        const cantidad = Math.round(Number(b.cantidad_sugerida || 1) * multiplicador * 100) / 100;
        const pu = Number(comp.precio_venta || 0);
        const cu = Number(comp.precio_compra || 0);
        return {
          id_cotizacion: idCotizacion,
          id_componente: comp.id_componente,
          id_tipo_componente: comp.id_tipo_componente ?? null,
          descripcion: comp.descripcion_corta || comp.referencia_fabricante,
          referencia_manual: comp.referencia_fabricante,
          marca_manual: comp.marca ?? null,
          cantidad,
          unidad: comp.unidad_medida || 'unidad',
          costo_unitario: cu,
          precio_unitario: pu,
          descuento_porcentaje: 0,
          subtotal: Math.round(cantidad * pu * 100) / 100,
          es_opcional: b.rol_bom !== 'TITULAR',
          iva_aplicable: true,
          seccion_titulo: `Kit BOM OEM · ${modelo.marca} ${modelo.modelo}`,
          observaciones: b.notas ?? null,
          orden_item: existingCount + idx + 1,
          registrado_por: userId ?? null,
        };
      }),
    });

    await this.calculoService.recalcularTotales(idCotizacion);

    return {
      message: `Importados ${bomFiltrado.length} repuesto(s) del BOM ${modelo.marca} ${modelo.modelo} (x${multiplicador} equipo(s))`,
      items_importados: bomFiltrado.length,
      multiplicador_equipos: multiplicador,
      cotizacion: await this.cotizacionesRepository.findById(idCotizacion, {
        cliente: true,
        sede: true,
        equipo: true,
        estado: true,
        items_servicios: true,
        items_componentes: true,
      }),
    };
  }

  // ==================== GUARDAR COTIZACIÓN ACTUAL COMO PLANTILLA ====================

  async guardarCotizacionComoPlantilla(
    idCotizacion: number,
    dto: GuardarComoPlantillaDto,
    userId?: number,
  ) {
    const cot = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        equipos: { select: { id_tipo_equipo: true, id_modelo_equipo: true } },
        cotizaciones_equipos: {
          include: { equipos: { select: { id_tipo_equipo: true, id_modelo_equipo: true } } },
        },
        items_cotizacion_servicios: {
          orderBy: { orden_item: 'asc' },
          include: { catalogo_servicios: true },
        },
        items_cotizacion_componentes: {
          orderBy: { orden_item: 'asc' },
          include: { catalogo_componentes: true },
        },
        items_cotizacion_otros: { orderBy: { orden_item: 'asc' } },
      },
    });
    if (!cot) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }

    const numEquipos = Math.max(1, cot.cotizaciones_equipos.length || 1);
    const divisor = dto.normalizar_por_equipo !== false ? numEquipos : 1;

    // Inferir tipo_equipo / modelo_equipo si todos los equipos coinciden (con fallback al equipo legacy)
    const equiposFuente =
      cot.cotizaciones_equipos.length > 0
        ? cot.cotizaciones_equipos.map((e) => e.equipos)
        : cot.equipos
          ? [cot.equipos]
          : [];
    const tiposUnicos = Array.from(new Set(equiposFuente.map((e) => e.id_tipo_equipo)));
    const modelosUnicos = Array.from(
      new Set(
        equiposFuente
          .map((e) => e.id_modelo_equipo)
          .filter((id): id is number => typeof id === 'number'),
      ),
    );

    const idTipoEquipo =
      dto.id_tipo_equipo !== undefined
        ? dto.id_tipo_equipo
        : tiposUnicos.length === 1
          ? tiposUnicos[0]
          : null;
    const idModeloEquipo =
      dto.id_modelo_equipo !== undefined
        ? dto.id_modelo_equipo
        : modelosUnicos.length === 1
          ? modelosUnicos[0]
          : null;

    const items: CreatePlantillaCotizacionDto['items'] = [];
    let ord = 0;

    for (const s of cot.items_cotizacion_servicios) {
      ord += 1;
      const cantNorm = Math.max(0.01, Math.round((Number(s.cantidad) / divisor) * 100) / 100);
      const precioLinea = Number(s.precio_unitario);
      const precioCat =
        s.catalogo_servicios?.precio_base !== null &&
        s.catalogo_servicios?.precio_base !== undefined
          ? Number(s.catalogo_servicios.precio_base)
          : null;
      const usaPrecioVivo =
        Boolean(s.id_servicio) && (precioCat === null || Math.abs(precioLinea - precioCat) < 0.01);
      items.push({
        tipo_linea: 'SERVICIO',
        id_servicio: s.id_servicio ?? null,
        descripcion:
          s.descripcion_personalizada ||
          s.catalogo_servicios?.nombre_servicio ||
          'Servicio Técnico',
        unidad: s.unidad || 'servicio',
        cantidad_base: cantNorm,
        es_por_equipo: true,
        usar_precio_catalogo: usaPrecioVivo,
        precio_unitario_fijo: precioLinea,
        costo_unitario_fijo: Number(s.costo_unitario || 0),
        visible_cliente: true,
        es_opcional: s.es_opcional,
        iva_aplicable: s.iva_aplicable,
        orden_item: ord,
        observaciones: s.observaciones ?? null,
      });
    }

    for (const c of cot.items_cotizacion_componentes) {
      ord += 1;
      const cantNorm = Math.max(0.01, Math.round((Number(c.cantidad) / divisor) * 100) / 100);
      const precioLinea = Number(c.precio_unitario);
      const precioCat =
        c.catalogo_componentes?.precio_venta !== null &&
        c.catalogo_componentes?.precio_venta !== undefined
          ? Number(c.catalogo_componentes.precio_venta)
          : null;
      const usaPrecioVivo =
        Boolean(c.id_componente) &&
        (precioCat === null || Math.abs(precioLinea - precioCat) < 0.01);
      items.push({
        tipo_linea: 'COMPONENTE',
        id_componente: c.id_componente ?? null,
        descripcion: c.descripcion,
        unidad: c.unidad || 'unidad',
        cantidad_base: cantNorm,
        es_por_equipo: true,
        usar_precio_catalogo: usaPrecioVivo,
        precio_unitario_fijo: precioLinea,
        costo_unitario_fijo: Number(c.costo_unitario || 0),
        visible_cliente: true,
        es_opcional: c.es_opcional,
        iva_aplicable: c.iva_aplicable,
        garantia_meses: c.garantia_meses ?? null,
        orden_item: ord,
        observaciones: c.observaciones ?? null,
      });
    }

    for (const o of cot.items_cotizacion_otros) {
      ord += 1;
      items.push({
        tipo_linea: 'OTRO',
        categoria_rubro: o.categoria_rubro,
        descripcion: o.descripcion,
        detalle_calculo: o.detalle_calculo ?? null,
        unidad: o.unidad || 'global',
        cantidad_base: Number(o.cantidad),
        es_por_equipo: false, // Logística, transporte, viáticos y pólizas no se multiplican por equipo
        usar_precio_catalogo: false,
        precio_unitario_fijo: Number(o.precio_unitario),
        costo_unitario_fijo: Number(o.costo_unitario || 0),
        visible_cliente: o.visible_cliente,
        es_opcional: o.es_opcional,
        iva_aplicable: o.iva_aplicable,
        orden_item: ord,
        observaciones: o.observaciones ?? null,
      });
    }

    return this.crear(
      {
        codigo_plantilla: dto.codigo_plantilla,
        nombre: dto.nombre,
        descripcion:
          dto.descripcion || `Plantilla creada a partir de cotización ${cot.numero_cotizacion}`,
        tipo_cotizacion: cot.tipo_cotizacion,
        id_tipo_equipo: idTipoEquipo,
        id_modelo_equipo: idModeloEquipo,
        asunto_sugerido: cot.asunto,
        descripcion_general: cot.descripcion_general ?? null,
        alcance_trabajo: cot.alcance_trabajo ?? null,
        exclusiones: cot.exclusiones ?? null,
        terminos_condiciones: cot.terminos_condiciones ?? null,
        forma_pago: cot.forma_pago || 'CONTADO',
        meses_garantia: cot.meses_garantia ?? 3,
        tiempo_estimado_dias: cot.tiempo_estimado_dias ?? null,
        usa_aiu: cot.usa_aiu,
        aiu_admin_porcentaje: Number(cot.aiu_admin_porcentaje || 0),
        aiu_imprevistos_porcentaje: Number(cot.aiu_imprevistos_porcentaje || 0),
        aiu_utilidad_porcentaje: Number(cot.aiu_utilidad_porcentaje || 0),
        iva_sobre_utilidad_aiu: cot.iva_sobre_utilidad_aiu,
        mostrar_desglose_precios: cot.mostrar_desglose_precios,
        items,
      },
      userId,
    );
  }
}
