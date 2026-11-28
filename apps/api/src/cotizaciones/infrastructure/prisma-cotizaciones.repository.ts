import { Injectable } from '@nestjs/common';
import {
  formatCorrelativeCode,
  reserveNextSequenceCounter,
} from '../../common/utils/sequence-counter.helper';
import { PrismaService } from '../../database/prisma.service';
import { Cotizacion } from '../domain/cotizacion.entity';
import { CotizacionesRepository } from '../domain/cotizaciones.repository.interface';

/**
 * PRISMA REPOSITORY - Infrastructure Layer (EAM-CPQ Hardened)
 *
 * - Persiste correctamente cambios de estado, motivos, AIU, márgenes y trazabilidad.
 * - Incluye relaciones enriquecidas (persona, multiequipo, stock WMS, servicios, otros, versiones).
 * - Genera consecutivos atómicos vía sequence_counter FOR UPDATE respetando prefijo White-Label.
 */
@Injectable()
export class PrismaCotizacionesRepository implements CotizacionesRepository {
  constructor(private readonly prisma: PrismaService) {}

  private mapToEntity(c: any): Cotizacion {
    return new Cotizacion({
      ...c,
      fecha_cotizacion: c.fecha_cotizacion ?? new Date(),
      id_sede: c.id_sede ?? undefined,
      id_equipo: c.id_equipo ?? undefined,
      atencion_a_nombre: c.atencion_a_nombre ?? undefined,
      atencion_a_cargo: c.atencion_a_cargo ?? undefined,
      id_plantilla_origen: c.id_plantilla_origen ?? undefined,
      id_propuesta_origen: c.id_propuesta_origen ?? undefined,
      tipo_cotizacion: c.tipo_cotizacion ?? 'SERVICIO_TECNICO',
      moneda: c.moneda ?? undefined,
      dias_validez: c.dias_validez ?? undefined,
      fecha_cambio_estado: c.fecha_cambio_estado ?? undefined,
      id_motivo_rechazo: c.id_motivo_rechazo ?? undefined,
      observaciones_rechazo: c.observaciones_rechazo ?? undefined,
      observaciones_aprobacion_cliente: c.observaciones_aprobacion_cliente ?? undefined,
      orden_compra_cliente: c.orden_compra_cliente ?? undefined,
      modo_agrupacion_pdf: c.modo_agrupacion_pdf ?? 'POR_CATEGORIA',
      mostrar_desglose_precios: Boolean(c.mostrar_desglose_precios ?? false),
      descripcion_general: c.descripcion_general ?? undefined,
      alcance_trabajo: c.alcance_trabajo ?? undefined,
      exclusiones: c.exclusiones ?? undefined,
      subtotal_servicios: c.subtotal_servicios ? Number(c.subtotal_servicios) : 0,
      subtotal_componentes: c.subtotal_componentes ? Number(c.subtotal_componentes) : 0,
      subtotal_otros: c.subtotal_otros ? Number(c.subtotal_otros) : 0,
      subtotal_general: c.subtotal_general ? Number(c.subtotal_general) : 0,
      subtotal_opcionales: c.subtotal_opcionales ? Number(c.subtotal_opcionales) : 0,
      descuento_porcentaje: c.descuento_porcentaje ? Number(c.descuento_porcentaje) : 0,
      descuento_valor: c.descuento_valor ? Number(c.descuento_valor) : 0,
      subtotal_con_descuento: c.subtotal_con_descuento ? Number(c.subtotal_con_descuento) : 0,
      usa_aiu: Boolean(c.usa_aiu),
      aiu_admin_porcentaje: c.aiu_admin_porcentaje ? Number(c.aiu_admin_porcentaje) : 0,
      aiu_imprevistos_porcentaje: c.aiu_imprevistos_porcentaje
        ? Number(c.aiu_imprevistos_porcentaje)
        : 0,
      aiu_utilidad_porcentaje: c.aiu_utilidad_porcentaje ? Number(c.aiu_utilidad_porcentaje) : 0,
      aiu_admin_valor: c.aiu_admin_valor ? Number(c.aiu_admin_valor) : 0,
      aiu_imprevistos_valor: c.aiu_imprevistos_valor ? Number(c.aiu_imprevistos_valor) : 0,
      aiu_utilidad_valor: c.aiu_utilidad_valor ? Number(c.aiu_utilidad_valor) : 0,
      aiu_valor_total: c.aiu_valor_total ? Number(c.aiu_valor_total) : 0,
      iva_sobre_utilidad_aiu: Boolean(c.iva_sobre_utilidad_aiu),
      iva_porcentaje:
        c.iva_porcentaje !== null && c.iva_porcentaje !== undefined ? Number(c.iva_porcentaje) : 0,
      iva_valor: c.iva_valor ? Number(c.iva_valor) : 0,
      total_cotizacion: c.total_cotizacion ? Number(c.total_cotizacion) : 0,
      costo_total_estimado: c.costo_total_estimado ? Number(c.costo_total_estimado) : 0,
      utilidad_bruta_estimada: c.utilidad_bruta_estimada ? Number(c.utilidad_bruta_estimada) : 0,
      margen_bruto_porcentaje: c.margen_bruto_porcentaje ? Number(c.margen_bruto_porcentaje) : 0,
      forma_pago: c.forma_pago ?? undefined,
      terminos_condiciones: c.terminos_condiciones ?? undefined,
      meses_garantia: c.meses_garantia ?? undefined,
      observaciones_garantia: c.observaciones_garantia ?? undefined,
      tiempo_estimado_dias: c.tiempo_estimado_dias ?? undefined,
      version: c.version ?? 1,
      id_cotizacion_padre: c.id_cotizacion_padre ?? undefined,
      id_orden_servicio_generada: c.id_orden_servicio_generada ?? undefined,
      fecha_conversion_os: c.fecha_conversion_os ?? undefined,
      id_firma_asesor: c.id_firma_asesor ?? undefined,
      id_firma_cliente: c.id_firma_cliente ?? undefined,
      aprobada_internamente_por: c.aprobada_internamente_por ?? undefined,
      fecha_aprobacion_interna: c.fecha_aprobacion_interna ?? undefined,
      modificado_por: c.modificado_por ?? undefined,
      cliente: c.clientes ?? c.cliente ?? undefined,
      sede: c.sedes_cliente ?? c.sede ?? undefined,
      equipo: c.equipos ?? c.equipo ?? undefined,
      equipos_vinculados: c.cotizaciones_equipos ?? undefined,
      estado: c.estados_cotizacion ?? c.estado ?? undefined,
      items_servicios: c.items_cotizacion_servicios ?? c.items_servicios ?? undefined,
      items_componentes: c.items_cotizacion_componentes ?? c.items_componentes ?? undefined,
      items_otros: c.items_cotizacion_otros ?? c.items_otros ?? undefined,
      plantilla_origen: c.plantilla_origen ?? undefined,
      propuesta_origen: c.propuesta_origen ?? undefined,
      firma_asesor: c.firma_asesor ?? undefined,
      firma_cliente: c.firma_cliente ?? undefined,
      aprobaciones: c.aprobaciones_cotizacion ?? c.aprobaciones ?? undefined,
      versiones: c.versiones_cotizacion ?? undefined,
      historial_envios: c.historial_envios ?? undefined,
      elaborador: c.empleados ?? undefined,
    });
  }

  async save(data: Partial<Cotizacion>): Promise<Cotizacion> {
    const diasValidez =
      data.dias_validez ??
      (data.fecha_cotizacion && data.fecha_vencimiento
        ? Math.max(
            1,
            Math.round(
              (new Date(data.fecha_vencimiento).getTime() -
                new Date(data.fecha_cotizacion).getTime()) /
                86400_000,
            ),
          )
        : 30);

    const cotizacion = await this.prisma.cotizaciones.create({
      data: {
        numero_cotizacion: data.numero_cotizacion!,
        id_cliente: data.id_cliente!,
        id_sede: data.id_sede,
        id_equipo: data.id_equipo,
        atencion_a_nombre: data.atencion_a_nombre?.trim()
          ? data.atencion_a_nombre.trim().slice(0, 200)
          : null,
        atencion_a_cargo: data.atencion_a_cargo?.trim()
          ? data.atencion_a_cargo.trim().slice(0, 120)
          : null,
        tipo_cotizacion: data.tipo_cotizacion || 'SERVICIO_TECNICO',
        id_plantilla_origen: data.id_plantilla_origen,
        id_propuesta_origen: data.id_propuesta_origen,
        moneda: data.moneda,
        fecha_cotizacion: data.fecha_cotizacion!,
        fecha_vencimiento: data.fecha_vencimiento!,
        dias_validez: diasValidez,
        id_estado: data.id_estado || 1,
        asunto: data.asunto!,
        descripcion_general: data.descripcion_general,
        alcance_trabajo: data.alcance_trabajo,
        exclusiones: data.exclusiones,
        subtotal_servicios: data.subtotal_servicios || 0,
        subtotal_componentes: data.subtotal_componentes || 0,
        subtotal_otros: data.subtotal_otros || 0,
        subtotal_general: data.subtotal_general || 0,
        subtotal_opcionales: data.subtotal_opcionales || 0,
        descuento_porcentaje: data.descuento_porcentaje || 0,
        descuento_valor: data.descuento_valor || 0,
        subtotal_con_descuento: data.subtotal_con_descuento || 0,
        usa_aiu: Boolean(data.usa_aiu),
        aiu_admin_porcentaje: data.aiu_admin_porcentaje || 0,
        aiu_imprevistos_porcentaje: data.aiu_imprevistos_porcentaje || 0,
        aiu_utilidad_porcentaje: data.aiu_utilidad_porcentaje || 0,
        iva_sobre_utilidad_aiu: Boolean(data.iva_sobre_utilidad_aiu),
        iva_porcentaje: data.iva_porcentaje ?? 0,
        iva_valor: data.iva_valor || 0,
        total_cotizacion: data.total_cotizacion || 0,
        forma_pago: data.forma_pago || 'CONTADO',
        terminos_condiciones: data.terminos_condiciones,
        meses_garantia: data.meses_garantia ?? 3,
        observaciones_garantia: data.observaciones_garantia,
        tiempo_estimado_dias: data.tiempo_estimado_dias,
        modo_agrupacion_pdf: data.modo_agrupacion_pdf || 'POR_CATEGORIA',
        mostrar_desglose_precios: Boolean(data.mostrar_desglose_precios ?? false),
        version: data.version || 1,
        id_cotizacion_padre: data.id_cotizacion_padre,
        metadata: data.metadata,
        elaborada_por: data.elaborada_por!,
        modificado_por: data.modificado_por,
      },
      include: {
        estados_cotizacion: true,
        clientes: { include: { persona: true } },
      },
    });

    if (data.id_equipo) {
      await this.prisma.cotizaciones_equipos
        .upsert({
          where: {
            id_cotizacion_id_equipo: {
              id_cotizacion: cotizacion.id_cotizacion,
              id_equipo: data.id_equipo,
            },
          },
          create: {
            id_cotizacion: cotizacion.id_cotizacion,
            id_equipo: data.id_equipo,
            orden_secuencia: 1,
          },
          update: {},
        })
        .catch(() => undefined);
    }

    return this.mapToEntity(cotizacion);
  }

  async findById(
    idCotizacion: number,
    includeRelations?: {
      cliente?: boolean;
      sede?: boolean;
      equipo?: boolean;
      estado?: boolean;
      items_servicios?: boolean;
      items_componentes?: boolean;
      aprobaciones?: boolean;
      historial_envios?: boolean;
    },
  ): Promise<Cotizacion | null> {
    const includeItems = Boolean(
      includeRelations?.items_servicios || includeRelations?.items_componentes,
    );
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        clientes: includeRelations?.cliente ? { include: { persona: true } } : false,
        sedes_cliente: includeRelations?.sede || false,
        equipos: includeRelations?.equipo
          ? { include: { tipos_equipo: true, modelos_equipo: true } }
          : false,
        cotizaciones_equipos:
          includeRelations?.equipo || includeItems
            ? {
                orderBy: { orden_secuencia: 'asc' },
                include: {
                  equipos: {
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
                        },
                      },
                    },
                  },
                },
              }
            : false,
        empleados: includeRelations?.cliente ? { include: { persona: true } } : false,
        estados_cotizacion: includeRelations?.estado ?? true,
        plantilla_origen: {
          select: {
            id_plantilla: true,
            codigo_plantilla: true,
            nombre: true,
            tipo_cotizacion: true,
          },
        },
        propuesta_origen: {
          select: {
            id_propuesta: true,
            numero_propuesta: true,
            id_orden_servicio: true,
          },
        },
        firma_asesor: includeItems
          ? {
              select: {
                id_firma_digital: true,
                id_persona: true,
                tipo_firma: true,
                firma_base64: true,
                formato_firma: true,
                fecha_captura: true,
              },
            }
          : false,
        firma_cliente: includeItems
          ? {
              select: {
                id_firma_digital: true,
                id_persona: true,
                tipo_firma: true,
                firma_base64: true,
                formato_firma: true,
                fecha_captura: true,
              },
            }
          : false,
        items_cotizacion_servicios: includeRelations?.items_servicios
          ? {
              orderBy: [{ orden_item: 'asc' }, { id_item_servicio: 'asc' }],
              include: {
                catalogo_servicios: true,
                equipos: {
                  select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true },
                },
              },
            }
          : false,
        items_cotizacion_componentes: includeRelations?.items_componentes
          ? {
              orderBy: [{ orden_item: 'asc' }, { id_item_componente: 'asc' }],
              include: {
                catalogo_componentes: {
                  select: {
                    id_componente: true,
                    codigo_interno: true,
                    referencia_fabricante: true,
                    descripcion_corta: true,
                    stock_actual: true,
                    stock_minimo: true,
                    precio_compra: true,
                    precio_venta: true,
                    unidad_medida: true,
                  },
                },
                tipos_componente: true,
                equipos: {
                  select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true },
                },
              },
            }
          : false,
        items_cotizacion_otros: includeItems
          ? {
              orderBy: [{ orden_item: 'asc' }, { id_item_otro: 'asc' }],
              include: {
                equipos: {
                  select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true },
                },
              },
            }
          : false,
        aprobaciones_cotizacion: includeRelations?.aprobaciones
          ? { orderBy: { fecha_solicitud: 'desc' } }
          : false,
        versiones_cotizacion: includeItems
          ? { orderBy: { numero_version: 'desc' }, take: 20 }
          : false,
        historial_envios: includeRelations?.historial_envios
          ? { orderBy: { fecha_envio: 'desc' }, take: 20 }
          : false,
      },
    });

    if (!cotizacion) return null;

    // Enriquecer versiones con nombre del asesor y metadatos clave del snapshot sin sobrecargar el payload
    if (
      includeItems &&
      Array.isArray(cotizacion.versiones_cotizacion) &&
      cotizacion.versiones_cotizacion.length > 0
    ) {
      const creadorIds = Array.from(
        new Set(
          cotizacion.versiones_cotizacion
            .map((v) => v.creada_por)
            .filter((id): id is number => typeof id === 'number' && id > 0),
        ),
      );

      const usuarioNombreById = new Map<number, string>();
      if (creadorIds.length > 0) {
        const usuarios = await this.prisma.usuarios.findMany({
          where: { id_usuario: { in: creadorIds } },
          select: {
            id_usuario: true,
            username: true,
            persona: {
              select: {
                nombre_completo: true,
                primer_nombre: true,
                segundo_nombre: true,
                primer_apellido: true,
                segundo_apellido: true,
              },
            },
          },
        });
        for (const u of usuarios) {
          const full =
            u.persona?.nombre_completo?.trim() ||
            [
              u.persona?.primer_nombre,
              u.persona?.segundo_nombre,
              u.persona?.primer_apellido,
              u.persona?.segundo_apellido,
            ]
              .filter(Boolean)
              .join(' ')
              .trim() ||
            u.username;
          if (full) {
            usuarioNombreById.set(u.id_usuario, full);
          }
        }
      }

      const elaboradorPersona = (cotizacion as any).empleados?.persona;
      const elaboradorActualNombre =
        elaboradorPersona?.nombre_completo?.trim() ||
        [
          elaboradorPersona?.primer_nombre,
          elaboradorPersona?.segundo_nombre,
          elaboradorPersona?.primer_apellido,
          elaboradorPersona?.segundo_apellido,
        ]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        null;

      (cotizacion as any).versiones_cotizacion = cotizacion.versiones_cotizacion.map((v) => {
        const datos = (v.datos_cotizacion ?? {}) as Record<string, unknown>;
        const elaboradorSnap =
          typeof datos.elaborado_por === 'string' && datos.elaborado_por.trim()
            ? datos.elaborado_por.trim()
            : null;
        const creadaPorNombre =
          typeof v.creada_por === 'number' ? usuarioNombreById.get(v.creada_por) || null : null;
        const descRaw = datos.descuento_porcentaje;
        const descuentoPct =
          descRaw !== undefined && descRaw !== null && Number.isFinite(Number(descRaw))
            ? Number(descRaw)
            : null;

        return {
          id_version: v.id_version,
          id_cotizacion: v.id_cotizacion,
          numero_version: v.numero_version,
          fecha_version: v.fecha_version,
          motivo_cambio: v.motivo_cambio,
          resumen_cambios: v.resumen_cambios,
          subtotal_version: v.subtotal_version ? Number(v.subtotal_version) : 0,
          total_version: v.total_version ? Number(v.total_version) : 0,
          creada_por: v.creada_por,
          asesor_nombre: elaboradorSnap || elaboradorActualNombre || creadaPorNombre,
          creada_por_nombre: creadaPorNombre,
          estado_codigo: typeof datos.estado === 'string' ? datos.estado : null,
          estado_nombre: typeof datos.estado_nombre === 'string' ? datos.estado_nombre : null,
          descuento_porcentaje: descuentoPct,
          moneda:
            typeof datos.moneda === 'string' && datos.moneda.trim()
              ? datos.moneda.trim()
              : cotizacion.moneda || 'COP',
          items_servicios_count: Array.isArray(v.items_servicios) ? v.items_servicios.length : 0,
          items_componentes_count: Array.isArray(v.items_componentes)
            ? v.items_componentes.length
            : 0,
          items_otros_count: Array.isArray(datos.items_otros) ? datos.items_otros.length : 0,
        };
      });
    }

    return this.mapToEntity(cotizacion);
  }

  async findAll(filters: {
    clienteId?: number;
    sedeId?: number;
    estadoId?: number;
    fechaCotizacionDesde?: Date;
    fechaCotizacionHasta?: Date;
    elaboradaPor?: number;
    skip?: number;
    take?: number;
  }): Promise<{ cotizaciones: Cotizacion[]; total: number }> {
    const where: any = {};

    if (filters.clienteId) where.id_cliente = filters.clienteId;
    if (filters.sedeId) where.id_sede = filters.sedeId;
    if (filters.estadoId) where.id_estado = filters.estadoId;
    if (filters.elaboradaPor) where.elaborada_por = filters.elaboradaPor;

    if (filters.fechaCotizacionDesde || filters.fechaCotizacionHasta) {
      where.fecha_cotizacion = {};
      if (filters.fechaCotizacionDesde) where.fecha_cotizacion.gte = filters.fechaCotizacionDesde;
      if (filters.fechaCotizacionHasta) where.fecha_cotizacion.lte = filters.fechaCotizacionHasta;
    }

    const [cotizaciones, total] = await Promise.all([
      this.prisma.cotizaciones.findMany({
        where,
        include: {
          clientes: { include: { persona: true } },
          estados_cotizacion: true,
          cotizaciones_equipos: {
            select: {
              id_equipo: true,
              equipos: {
                select: {
                  id_equipo: true,
                  codigo_equipo: true,
                  nombre_equipo: true,
                  tipos_equipo: { select: { codigo_tipo: true, nombre_tipo: true } },
                },
              },
            },
          },
          plantilla_origen: {
            select: { id_plantilla: true, nombre: true, tipo_cotizacion: true },
          },
          propuesta_origen: {
            select: { id_propuesta: true, numero_propuesta: true },
          },
        },
        orderBy: [{ fecha_cotizacion: 'desc' }, { id_cotizacion: 'desc' }],
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      this.prisma.cotizaciones.count({ where }),
    ]);

    return {
      cotizaciones: cotizaciones.map((c) => this.mapToEntity(c)),
      total,
    };
  }

  async findByNumero(numeroCotizacion: string): Promise<Cotizacion | null> {
    const cotizacion = await this.prisma.cotizaciones.findFirst({
      where: { numero_cotizacion: numeroCotizacion },
      include: { estados_cotizacion: true },
    });

    if (!cotizacion) return null;

    return this.mapToEntity(cotizacion);
  }

  async update(idCotizacion: number, data: Partial<Cotizacion>): Promise<Cotizacion> {
    const updateData: any = {
      fecha_modificacion: new Date(),
    };

    if (data.id_sede !== undefined) updateData.id_sede = data.id_sede;
    if (data.id_equipo !== undefined) updateData.id_equipo = data.id_equipo;
    if (data.atencion_a_nombre !== undefined) {
      updateData.atencion_a_nombre = data.atencion_a_nombre?.trim()
        ? data.atencion_a_nombre.trim().slice(0, 200)
        : null;
    }
    if (data.atencion_a_cargo !== undefined) {
      updateData.atencion_a_cargo = data.atencion_a_cargo?.trim()
        ? data.atencion_a_cargo.trim().slice(0, 120)
        : null;
    }
    if (data.tipo_cotizacion !== undefined) updateData.tipo_cotizacion = data.tipo_cotizacion;
    if (data.id_plantilla_origen !== undefined)
      updateData.id_plantilla_origen = data.id_plantilla_origen;
    if (data.moneda !== undefined) updateData.moneda = data.moneda;
    if (data.fecha_cotizacion !== undefined) updateData.fecha_cotizacion = data.fecha_cotizacion;
    if (data.fecha_vencimiento !== undefined) updateData.fecha_vencimiento = data.fecha_vencimiento;
    if (data.dias_validez !== undefined) updateData.dias_validez = data.dias_validez;
    if (data.id_estado !== undefined) {
      updateData.id_estado = data.id_estado;
      updateData.fecha_cambio_estado = new Date();
    }
    if (data.id_motivo_rechazo !== undefined) updateData.id_motivo_rechazo = data.id_motivo_rechazo;
    if (data.observaciones_rechazo !== undefined)
      updateData.observaciones_rechazo = data.observaciones_rechazo;
    if (data.observaciones_aprobacion_cliente !== undefined)
      updateData.observaciones_aprobacion_cliente = data.observaciones_aprobacion_cliente;
    if (data.orden_compra_cliente !== undefined)
      updateData.orden_compra_cliente = data.orden_compra_cliente;
    if (data.asunto !== undefined) updateData.asunto = data.asunto;
    if (data.descripcion_general !== undefined)
      updateData.descripcion_general = data.descripcion_general;
    if (data.alcance_trabajo !== undefined) updateData.alcance_trabajo = data.alcance_trabajo;
    if (data.exclusiones !== undefined) updateData.exclusiones = data.exclusiones;
    if (data.subtotal_servicios !== undefined)
      updateData.subtotal_servicios = data.subtotal_servicios;
    if (data.subtotal_componentes !== undefined)
      updateData.subtotal_componentes = data.subtotal_componentes;
    if (data.subtotal_otros !== undefined) updateData.subtotal_otros = data.subtotal_otros;
    if (data.descuento_porcentaje !== undefined)
      updateData.descuento_porcentaje = data.descuento_porcentaje;
    if (data.descuento_valor !== undefined) updateData.descuento_valor = data.descuento_valor;
    if (data.usa_aiu !== undefined) updateData.usa_aiu = data.usa_aiu;
    if (data.aiu_admin_porcentaje !== undefined)
      updateData.aiu_admin_porcentaje = data.aiu_admin_porcentaje;
    if (data.aiu_imprevistos_porcentaje !== undefined)
      updateData.aiu_imprevistos_porcentaje = data.aiu_imprevistos_porcentaje;
    if (data.aiu_utilidad_porcentaje !== undefined)
      updateData.aiu_utilidad_porcentaje = data.aiu_utilidad_porcentaje;
    if (data.iva_sobre_utilidad_aiu !== undefined)
      updateData.iva_sobre_utilidad_aiu = data.iva_sobre_utilidad_aiu;
    if (data.iva_porcentaje !== undefined) updateData.iva_porcentaje = data.iva_porcentaje;
    if (data.tiempo_estimado_dias !== undefined)
      updateData.tiempo_estimado_dias = data.tiempo_estimado_dias;
    if (data.forma_pago !== undefined) updateData.forma_pago = data.forma_pago;
    if (data.terminos_condiciones !== undefined)
      updateData.terminos_condiciones = data.terminos_condiciones;
    if (data.meses_garantia !== undefined) updateData.meses_garantia = data.meses_garantia;
    if (data.observaciones_garantia !== undefined)
      updateData.observaciones_garantia = data.observaciones_garantia;
    if (data.modo_agrupacion_pdf !== undefined)
      updateData.modo_agrupacion_pdf = data.modo_agrupacion_pdf;
    if (data.mostrar_desglose_precios !== undefined)
      updateData.mostrar_desglose_precios = Boolean(data.mostrar_desglose_precios);
    if (data.aprobada_internamente_por !== undefined)
      updateData.aprobada_internamente_por = data.aprobada_internamente_por;
    if (data.fecha_aprobacion_interna !== undefined)
      updateData.fecha_aprobacion_interna = data.fecha_aprobacion_interna;
    if (data.version !== undefined) updateData.version = data.version;
    if (data.modificado_por !== undefined) updateData.modificado_por = data.modificado_por;

    const cotizacion = await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: updateData,
      include: { estados_cotizacion: true },
    });

    return this.mapToEntity(cotizacion);
  }

  async delete(idCotizacion: number): Promise<void> {
    await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: { id_estado: 6, fecha_cambio_estado: new Date() },
    });
  }

  async updateEstado(idCotizacion: number, idEstado: number, userId: number): Promise<Cotizacion> {
    const cotizacion = await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: {
        id_estado: idEstado,
        fecha_cambio_estado: new Date(),
        modificado_por: userId,
        fecha_modificacion: new Date(),
      },
      include: { estados_cotizacion: true },
    });

    return this.mapToEntity(cotizacion);
  }

  async updateTotales(
    idCotizacion: number,
    totales: {
      subtotal_servicios: number;
      subtotal_componentes: number;
      subtotal_general: number;
      descuento_valor: number;
      subtotal_con_descuento: number;
      iva_valor: number;
      total_cotizacion: number;
    },
  ): Promise<Cotizacion> {
    const cotizacion = await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: {
        subtotal_servicios: totales.subtotal_servicios,
        subtotal_componentes: totales.subtotal_componentes,
        subtotal_general: totales.subtotal_general,
        descuento_valor: totales.descuento_valor,
        subtotal_con_descuento: totales.subtotal_con_descuento,
        iva_valor: totales.iva_valor,
        total_cotizacion: totales.total_cotizacion,
        fecha_modificacion: new Date(),
      },
      include: { estados_cotizacion: true },
    });

    return this.mapToEntity(cotizacion);
  }

  async findProximasVencer(diasAnticipacion: number): Promise<Cotizacion[]> {
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + diasAnticipacion);

    const cotizaciones = await this.prisma.cotizaciones.findMany({
      where: {
        id_estado: 4, // ENVIADA (corregido: antes era 2 EN_REVISION)
        fecha_vencimiento: {
          lte: fechaLimite,
          gte: new Date(),
        },
      },
      include: {
        clientes: { include: { persona: true } },
        estados_cotizacion: true,
      },
    });

    return cotizaciones.map((c) => this.mapToEntity(c));
  }

  async generateNumeroCotizacion(): Promise<string> {
    const year = new Date().getFullYear();
    const org = await this.prisma.configuracion_organizacion
      .findUnique({
        where: { id_configuracion: 1 },
        select: { prefijo_cotizacion: true },
      })
      .catch(() => null);
    const prefijo = (org?.prefijo_cotizacion || 'COT')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, '');
    const safePrefix = prefijo || 'COT';

    return await this.prisma.$transaction(async (tx) => {
      let reserved = await reserveNextSequenceCounter(tx, safePrefix, year);
      let candidato = formatCorrelativeCode(safePrefix, year, reserved.sequence, 4);

      let existe = await tx.cotizaciones.findFirst({
        where: { numero_cotizacion: { equals: candidato, mode: 'insensitive' } },
        select: { id_cotizacion: true },
      });

      while (existe) {
        reserved = await reserveNextSequenceCounter(tx, safePrefix, year);
        candidato = formatCorrelativeCode(safePrefix, year, reserved.sequence, 4);
        existe = await tx.cotizaciones.findFirst({
          where: { numero_cotizacion: { equals: candidato, mode: 'insensitive' } },
          select: { id_cotizacion: true },
        });
      }

      return candidato;
    });
  }
}
