import { PrismaService } from '@mekanos/database';
import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateVersionCommand } from './create-version.command';

/**
 * CreateVersionHandler
 * FASE 4.8: Crea snapshot completo cotización (datos + items)
 * 
 * Funcionalidad:
 * 1. Valida cotización existe
 * 2. Serializa datos cotización → JSONB
 * 3. Serializa items servicios → JSONB
 * 4. Serializa items componentes → JSONB
 * 5. Calcula número versión automático (max + 1)
 * 6. Crea registro versiones_cotizacion
 */
@CommandHandler(CreateVersionCommand)
export class CreateVersionHandler implements ICommandHandler<CreateVersionCommand> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: CreateVersionCommand) {
    const { idCotizacion, motivoCambio, creadaPor } = command;

    // ========================================
    // 1. VALIDAR COTIZACIÓN EXISTE
    // ========================================
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        estado: true,
        cliente: {
          include: { persona: true },
        },
        sede: true,
        equipo: true,
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }

    // ========================================
    // 2. OBTENER ITEMS SERVICIOS
    // ========================================
    const itemsServicios = await this.prisma.items_cotizacion_servicios.findMany({
      where: { id_cotizacion: idCotizacion },
      include: {
        servicio: true,
      },
    });

    // ========================================
    // 3. OBTENER ITEMS COMPONENTES
    // ========================================
    const itemsComponentes = await this.prisma.items_cotizacion_componentes.findMany({
      where: { id_cotizacion: idCotizacion },
      include: {
        catalogo_componentes: true,
      },
    });

    // ========================================
    // 4. CALCULAR NÚMERO VERSIÓN
    // ========================================
    const versionesExistentes = await this.prisma.versiones_cotizacion.findMany({
      where: { id_cotizacion: idCotizacion },
      orderBy: { numero_version: 'desc' },
      take: 1,
    });

    const numeroVersion = versionesExistentes.length > 0 
      ? versionesExistentes[0].numero_version + 1
      : 1;

    // ========================================
    // 5. SERIALIZAR DATOS COTIZACIÓN
    // ========================================
    const datosCotizacion = {
      numero_cotizacion: cotizacion.numero_cotizacion,
      fecha_cotizacion: cotizacion.fecha_cotizacion,
      fecha_vencimiento: cotizacion.fecha_vencimiento,
      asunto: cotizacion.asunto,
      estado: cotizacion.estado?.nombre_estado,
      cliente: {
        razon_social: cotizacion.cliente?.persona?.razon_social,
        nombre_completo: cotizacion.cliente?.persona?.nombre_completo,
      },
      sede: cotizacion.sede?.nombre_sede,
      equipo: cotizacion.equipo?.nombre_equipo,
      descripcion_general: cotizacion.descripcion_general,
      alcance_trabajo: cotizacion.alcance_trabajo,
      exclusiones: cotizacion.exclusiones,
      subtotal_servicios: cotizacion.subtotal_servicios,
      subtotal_componentes: cotizacion.subtotal_componentes,
      subtotal_general: cotizacion.subtotal_general,
      descuento_porcentaje: cotizacion.descuento_porcentaje,
      descuento_valor: cotizacion.descuento_valor,
      subtotal_con_descuento: cotizacion.subtotal_con_descuento,
      iva_porcentaje: cotizacion.iva_porcentaje,
      iva_valor: cotizacion.iva_valor,
      total_cotizacion: cotizacion.total_cotizacion,
      tiempo_estimado_dias: cotizacion.tiempo_estimado_dias,
      forma_pago: cotizacion.forma_pago,
      meses_garantia: cotizacion.meses_garantia,
    };

    // ========================================
    // 6. SERIALIZAR ITEMS SERVICIOS
    // ========================================
    const serviciosSnapshot = itemsServicios.map((item) => ({
      id_item: item.id_item_servicio,
      servicio: item.servicio?.nombre_servicio,
      descripcion: item.descripcion_personalizada || item.servicio?.descripcion,
      cantidad: item.cantidad,
      unidad: item.unidad,
      precio_unitario: item.precio_unitario,
      descuento_porcentaje: item.descuento_porcentaje,
      subtotal: item.subtotal,
      observaciones: item.observaciones,
    }));

    // ========================================
    // 7. SERIALIZAR ITEMS COMPONENTES
    // ========================================
    const componentesSnapshot = itemsComponentes.map((item) => ({
      id_item: item.id_item_componente,
      componente: item.catalogo_componentes?.referencia_fabricante,
      descripcion: item.descripcion,
      referencia_manual: item.referencia_manual,
      marca_manual: item.marca_manual,
      cantidad: item.cantidad,
      unidad: item.unidad,
      precio_unitario: item.precio_unitario,
      descuento_porcentaje: item.descuento_porcentaje,
      subtotal: item.subtotal,
      garantia_meses: item.garantia_meses,
      observaciones: item.observaciones,
    }));

    // ========================================
    // 8. CREAR VERSIÓN
    // ========================================
    const version = await this.prisma.versiones_cotizacion.create({
      data: {
        id_cotizacion: idCotizacion,
        numero_version: numeroVersion,
        datos_cotizacion: datosCotizacion as any, // JSONB
        items_servicios: serviciosSnapshot as any, // JSONB
        items_componentes: componentesSnapshot as any, // JSONB
        subtotal_version: cotizacion.subtotal_general,
        total_version: cotizacion.total_cotizacion,
        motivo_cambio: motivoCambio,
        resumen_cambios: motivoCambio,
        creada_por: creadaPor,
      },
    });

    return {
      message: 'Versión cotización creada exitosamente',
      version: {
        id_version: version.id_version,
        numero_version: version.numero_version,
        fecha_creacion: version.fecha_version,
        resumen_cambios: version.resumen_cambios,
        total: version.total_version,
        items_servicios_count: serviciosSnapshot.length,
        items_componentes_count: componentesSnapshot.length,
      },
      cotizacion: {
        id_cotizacion: cotizacion.id_cotizacion,
        numero_cotizacion: cotizacion.numero_cotizacion,
        estado: cotizacion.estado?.nombre_estado,
      },
    };
  }
}
