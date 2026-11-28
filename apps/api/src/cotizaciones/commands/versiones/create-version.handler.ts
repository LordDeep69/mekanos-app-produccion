import { PrismaService } from '@mekanos/database';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EquipoSpecsReader } from '../../../equipos/services/equipo-specs.reader';
import { CreateVersionCommand } from './create-version.command';

/**
 * CreateVersionHandler (EAM-CPQ Completo)
 * Crea snapshot JSONB auditable e inmutable (apto para reconstrucción fiel de PDF histórico),
 * incluyendo equipos vinculados, servicios, componentes, logística/otros, AIU, opcionales,
 * condiciones comerciales y métricas de rentabilidad.
 */
@CommandHandler(CreateVersionCommand)
export class CreateVersionHandler implements ICommandHandler<CreateVersionCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateVersionCommand) {
    const { idCotizacion, motivoCambio, creadaPor } = command;

    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        estados_cotizacion: true,
        clientes: { include: { persona: true } },
        sedes_cliente: true,
        empleados: { include: { persona: true } },
        equipos: {
          include: {
            tipos_equipo: true,
            modelos_equipo: true,
            equipos_generador: true,
            equipos_motor: true,
            equipos_bomba: true,
          },
        },
        cotizaciones_equipos: {
          orderBy: { orden_secuencia: 'asc' },
          include: {
            equipos: {
              include: {
                tipos_equipo: { select: { codigo_tipo: true, nombre_tipo: true } },
                modelos_equipo: { select: { marca: true, modelo: true } },
                equipos_generador: true,
                equipos_motor: true,
                equipos_bomba: true,
              },
            },
          },
        },
        items_cotizacion_servicios: {
          orderBy: [{ orden_item: 'asc' }, { id_item_servicio: 'asc' }],
          include: { catalogo_servicios: true },
        },
        items_cotizacion_componentes: {
          orderBy: [{ orden_item: 'asc' }, { id_item_componente: 'asc' }],
          include: { catalogo_componentes: true },
        },
        items_cotizacion_otros: {
          orderBy: [{ orden_item: 'asc' }, { id_item_otro: 'asc' }],
        },
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }

    const ultimaVersion = await this.prisma.versiones_cotizacion.findFirst({
      where: { id_cotizacion: idCotizacion },
      orderBy: { numero_version: 'desc' },
      select: { numero_version: true },
    });

    const numeroVersion = ultimaVersion ? ultimaVersion.numero_version + 1 : 1;

    const elaboradorPersona = cotizacion.empleados?.persona;
    const elaboradoPorNombre =
      elaboradorPersona?.nombre_completo ||
      [
        elaboradorPersona?.primer_nombre,
        elaboradorPersona?.segundo_nombre,
        elaboradorPersona?.primer_apellido,
        elaboradorPersona?.segundo_apellido,
      ]
        .filter(Boolean)
        .join(' ') ||
      null;

    const datosCotizacion = {
      numero_cotizacion: cotizacion.numero_cotizacion,
      tipo_cotizacion: cotizacion.tipo_cotizacion,
      moneda: cotizacion.moneda,
      fecha_cotizacion: cotizacion.fecha_cotizacion,
      fecha_vencimiento: cotizacion.fecha_vencimiento,
      dias_validez: cotizacion.dias_validez,
      asunto: cotizacion.asunto,
      estado_id: cotizacion.id_estado,
      estado:
        cotizacion.estados_cotizacion?.codigo_estado ||
        cotizacion.estados_cotizacion?.nombre_estado,
      estado_nombre: cotizacion.estados_cotizacion?.nombre_estado,
      orden_compra_cliente: cotizacion.orden_compra_cliente,
      atencion_a_nombre: cotizacion.atencion_a_nombre,
      atencion_a_cargo: cotizacion.atencion_a_cargo,
      mostrar_desglose_precios: Boolean(cotizacion.mostrar_desglose_precios ?? false),
      elaborado_por: elaboradoPorNombre,
      cliente: {
        id_cliente: cotizacion.id_cliente,
        razon_social: cotizacion.clientes?.persona?.razon_social,
        nombre_comercial: cotizacion.clientes?.persona?.nombre_comercial,
        nombre_completo: cotizacion.clientes?.persona?.nombre_completo,
        numero_identificacion: cotizacion.clientes?.persona?.numero_identificacion,
        direccion_principal: cotizacion.clientes?.persona?.direccion_principal,
        telefono_principal: cotizacion.clientes?.persona?.telefono_principal,
        celular: cotizacion.clientes?.persona?.celular,
        email_principal: cotizacion.clientes?.persona?.email_principal,
      },
      sede: cotizacion.sedes_cliente?.nombre_sede,
      sede_detalle: cotizacion.sedes_cliente
        ? {
            id_sede: cotizacion.sedes_cliente.id_sede,
            nombre_sede: cotizacion.sedes_cliente.nombre_sede,
            direccion_sede: cotizacion.sedes_cliente.direccion_sede,
            telefono_sede: cotizacion.sedes_cliente.telefono_sede,
            email_sede: cotizacion.sedes_cliente.email_sede,
          }
        : null,
      equipo: cotizacion.equipos?.nombre_equipo,
      equipos_vinculados: cotizacion.cotizaciones_equipos.map((ce) => ({
        id_equipo: ce.id_equipo,
        codigo_equipo: ce.equipos.codigo_equipo,
        nombre_equipo: ce.equipos.nombre_equipo,
        tipo_equipo: ce.equipos.tipos_equipo?.nombre_tipo,
        marca: ce.equipos.modelos_equipo?.marca || EquipoSpecsReader.getMarca(ce.equipos as any),
        modelo: ce.equipos.modelos_equipo?.modelo || EquipoSpecsReader.getModelo(ce.equipos as any),
        serie: EquipoSpecsReader.getSerie(ce.equipos as any),
        ubicacion_texto: ce.equipos.ubicacion_texto,
        notas_alcance: ce.notas_alcance,
      })),
      descripcion_general: cotizacion.descripcion_general,
      alcance_trabajo: cotizacion.alcance_trabajo,
      exclusiones: cotizacion.exclusiones,
      subtotal_servicios: Number(cotizacion.subtotal_servicios || 0),
      subtotal_componentes: Number(cotizacion.subtotal_componentes || 0),
      subtotal_otros: Number(cotizacion.subtotal_otros || 0),
      subtotal_general: Number(cotizacion.subtotal_general || 0),
      subtotal_opcionales: Number(cotizacion.subtotal_opcionales || 0),
      descuento_porcentaje: Number(cotizacion.descuento_porcentaje || 0),
      descuento_valor: Number(cotizacion.descuento_valor || 0),
      subtotal_con_descuento: Number(cotizacion.subtotal_con_descuento || 0),
      usa_aiu: cotizacion.usa_aiu,
      aiu_admin_porcentaje: Number(cotizacion.aiu_admin_porcentaje || 0),
      aiu_admin_valor: Number(cotizacion.aiu_admin_valor || 0),
      aiu_imprevistos_porcentaje: Number(cotizacion.aiu_imprevistos_porcentaje || 0),
      aiu_imprevistos_valor: Number(cotizacion.aiu_imprevistos_valor || 0),
      aiu_utilidad_porcentaje: Number(cotizacion.aiu_utilidad_porcentaje || 0),
      aiu_utilidad_valor: Number(cotizacion.aiu_utilidad_valor || 0),
      aiu_valor_total: Number(cotizacion.aiu_valor_total || 0),
      iva_sobre_utilidad_aiu: cotizacion.iva_sobre_utilidad_aiu,
      iva_porcentaje: Number(cotizacion.iva_porcentaje || 0),
      iva_valor: Number(cotizacion.iva_valor || 0),
      total_cotizacion: Number(cotizacion.total_cotizacion || 0),
      costo_total_estimado: Number(cotizacion.costo_total_estimado || 0),
      utilidad_bruta_estimada: Number(cotizacion.utilidad_bruta_estimada || 0),
      margen_bruto_porcentaje: Number(cotizacion.margen_bruto_porcentaje || 0),
      tiempo_estimado_dias: cotizacion.tiempo_estimado_dias,
      forma_pago: cotizacion.forma_pago,
      meses_garantia: cotizacion.meses_garantia,
      observaciones_garantia: cotizacion.observaciones_garantia,
      terminos_condiciones: cotizacion.terminos_condiciones,
      items_otros: cotizacion.items_cotizacion_otros.map((o) => ({
        id_item_otro: o.id_item_otro,
        id_equipo: o.id_equipo,
        equipos_ids: Array.isArray((o as any).equipos_ids) ? (o as any).equipos_ids : [],
        orden_item: o.orden_item,
        categoria_rubro: o.categoria_rubro,
        descripcion: o.descripcion,
        detalle_calculo: o.detalle_calculo,
        cantidad: Number(o.cantidad),
        unidad: o.unidad,
        costo_unitario: Number(o.costo_unitario),
        precio_unitario: Number(o.precio_unitario),
        descuento_porcentaje: Number(o.descuento_porcentaje || 0),
        subtotal: Number(o.subtotal),
        visible_cliente: o.visible_cliente,
        es_opcional: o.es_opcional,
        iva_aplicable: o.iva_aplicable,
      })),
    };

    const serviciosSnapshot = cotizacion.items_cotizacion_servicios.map((item) => ({
      id_item: item.id_item_servicio,
      id_servicio: item.id_servicio,
      id_equipo: item.id_equipo,
      equipos_ids: Array.isArray((item as any).equipos_ids) ? (item as any).equipos_ids : [],
      orden_item: item.orden_item,
      servicio: item.catalogo_servicios?.nombre_servicio,
      descripcion: item.descripcion_personalizada || item.catalogo_servicios?.nombre_servicio,
      cantidad: Number(item.cantidad),
      unidad: item.unidad,
      costo_unitario: Number(item.costo_unitario || 0),
      precio_unitario: Number(item.precio_unitario),
      descuento_porcentaje: Number(item.descuento_porcentaje || 0),
      subtotal: Number(item.subtotal || 0),
      es_opcional: item.es_opcional,
      iva_aplicable: item.iva_aplicable,
      observaciones: item.observaciones,
    }));

    const componentesSnapshot = cotizacion.items_cotizacion_componentes.map((item) => ({
      id_item: item.id_item_componente,
      id_componente: item.id_componente,
      id_equipo: item.id_equipo,
      equipos_ids: Array.isArray((item as any).equipos_ids) ? (item as any).equipos_ids : [],
      orden_item: item.orden_item,
      componente: item.catalogo_componentes?.referencia_fabricante,
      codigo_interno: item.catalogo_componentes?.codigo_interno,
      marca: item.marca_manual || item.catalogo_componentes?.marca,
      descripcion: item.descripcion,
      referencia_manual: item.referencia_manual,
      marca_manual: item.marca_manual,
      cantidad: Number(item.cantidad),
      unidad: item.unidad,
      costo_unitario: Number(item.costo_unitario || 0),
      precio_unitario: Number(item.precio_unitario),
      descuento_porcentaje: Number(item.descuento_porcentaje || 0),
      subtotal: Number(item.subtotal || 0),
      es_opcional: item.es_opcional,
      iva_aplicable: item.iva_aplicable,
      garantia_meses: item.garantia_meses,
      observaciones: item.observaciones,
    }));

    const version = await this.prisma.versiones_cotizacion.create({
      data: {
        id_cotizacion: idCotizacion,
        numero_version: numeroVersion,
        datos_cotizacion: datosCotizacion as any,
        items_servicios: serviciosSnapshot as any,
        items_componentes: componentesSnapshot as any,
        subtotal_version: cotizacion.subtotal_general,
        total_version: cotizacion.total_cotizacion,
        motivo_cambio: motivoCambio,
        resumen_cambios: motivoCambio,
        creada_por: creadaPor,
      },
    });

    const versionActiva = Math.max(cotizacion.version || 1, numeroVersion);
    await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: { version: versionActiva },
    });

    return {
      message: 'Versión cotización creada exitosamente',
      version: {
        id_version: version.id_version,
        numero_version: version.numero_version,
        fecha_creacion: version.fecha_version,
        resumen_cambios: version.resumen_cambios,
        total: Number(version.total_version || 0),
        items_servicios_count: serviciosSnapshot.length,
        items_componentes_count: componentesSnapshot.length,
        items_otros_count: cotizacion.items_cotizacion_otros.length,
      },
      cotizacion: {
        id_cotizacion: cotizacion.id_cotizacion,
        numero_cotizacion: cotizacion.numero_cotizacion,
        version: versionActiva,
        estado: cotizacion.estados_cotizacion?.nombre_estado,
      },
    };
  }
}
