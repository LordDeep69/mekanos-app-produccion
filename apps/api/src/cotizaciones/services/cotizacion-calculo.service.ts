/**
 * COTIZACION CALCULO SERVICE
 *
 * Servicio dedicado al cálculo automático de totales para cotizaciones.
 *
 * Fórmulas:
 * - subtotal_servicios = Σ(item_servicio.subtotal)
 * - subtotal_componentes = Σ(item_componente.subtotal)
 * - subtotal_general = subtotal_servicios + subtotal_componentes
 * - descuento_valor = subtotal_general * (descuento_porcentaje / 100)
 * - subtotal_con_descuento = subtotal_general - descuento_valor
 * - iva_valor = subtotal_con_descuento * (iva_porcentaje / 100)
 * - total_cotizacion = subtotal_con_descuento + iva_valor
 *
 * Precisión: 2 decimales (DECIMAL(12,2) en BD)
 */

import { PrismaService } from '@mekanos/database';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

export interface CalculoTotalesResult {
  subtotal_servicios: Decimal;
  subtotal_componentes: Decimal;
  subtotal_general: Decimal;
  descuento_valor: Decimal;
  subtotal_con_descuento: Decimal;
  iva_valor: Decimal;
  total_cotizacion: Decimal;
  cantidad_items_servicios: number;
  cantidad_items_componentes: number;
}

export interface ItemServicioCalculo {
  cantidad: Decimal;
  precio_unitario: Decimal;
  descuento_porcentaje?: Decimal | null;
}

export interface ItemComponenteCalculo {
  cantidad: Decimal;
  precio_unitario: Decimal;
  descuento_porcentaje?: Decimal | null;
}

@Injectable()
export class CotizacionCalculoService {
  private readonly logger = new Logger(CotizacionCalculoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula el subtotal de un item individual (servicio o componente)
   * subtotal = cantidad * precio_unitario * (1 - descuento_porcentaje/100)
   */
  calcularSubtotalItem(
    cantidad: Decimal | number,
    precioUnitario: Decimal | number,
    descuentoPorcentaje?: Decimal | number | null,
  ): Decimal {
    const cant = new Decimal(cantidad.toString());
    const precio = new Decimal(precioUnitario.toString());
    const descuento = descuentoPorcentaje
      ? new Decimal(descuentoPorcentaje.toString())
      : new Decimal(0);

    // subtotal = cantidad * precio * (1 - descuento/100)
    const factor = new Decimal(1).minus(descuento.dividedBy(100));
    const subtotal = cant.times(precio).times(factor);

    // Redondear a 2 decimales
    return new Decimal(subtotal.toFixed(2));
  }

  /**
   * Recalcula todos los totales de una cotización
   * Actualiza los campos en la BD y retorna los valores calculados
   */
  async recalcularTotales(idCotizacion: number): Promise<CalculoTotalesResult> {
    this.logger.log(`Recalculando totales para cotización ${idCotizacion}`);

    // Verificar que existe la cotización
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      select: {
        id_cotizacion: true,
        descuento_porcentaje: true,
        iva_porcentaje: true,
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }

    // Obtener todos los items de servicios
    const itemsServicios = await this.prisma.items_cotizacion_servicios.findMany(
      {
        where: { id_cotizacion: idCotizacion },
      },
    );

    // Obtener todos los items de componentes
    const itemsComponentes =
      await this.prisma.items_cotizacion_componentes.findMany({
        where: { id_cotizacion: idCotizacion },
      });

    // Recalcular subtotales de cada item de servicio
    let subtotalServicios = new Decimal(0);
    for (const item of itemsServicios) {
      const subtotalItem = this.calcularSubtotalItem(
        item.cantidad,
        item.precio_unitario,
        item.descuento_porcentaje,
      );

      // Actualizar subtotal del item si es diferente
      if (!item.subtotal || !subtotalItem.equals(item.subtotal)) {
        await this.prisma.items_cotizacion_servicios.update({
          where: { id_item_servicio: item.id_item_servicio },
          data: { subtotal: subtotalItem },
        });
      }

      subtotalServicios = subtotalServicios.plus(subtotalItem);
    }

    // Recalcular subtotales de cada item de componente
    let subtotalComponentes = new Decimal(0);
    for (const item of itemsComponentes) {
      const subtotalItem = this.calcularSubtotalItem(
        item.cantidad,
        item.precio_unitario,
        item.descuento_porcentaje,
      );

      // Actualizar subtotal del item si es diferente
      if (!item.subtotal || !subtotalItem.equals(item.subtotal)) {
        await this.prisma.items_cotizacion_componentes.update({
          where: { id_item_componente: item.id_item_componente },
          data: { subtotal: subtotalItem },
        });
      }

      subtotalComponentes = subtotalComponentes.plus(subtotalItem);
    }

    // Cálculos totales de la cotización
    const subtotalGeneral = subtotalServicios.plus(subtotalComponentes);

    const descuentoPorcentaje = cotizacion.descuento_porcentaje || new Decimal(0);
    const ivaPorcentaje = cotizacion.iva_porcentaje || new Decimal(19); // Default 19% Colombia

    // descuento_valor = subtotal_general * (descuento_porcentaje / 100)
    const descuentoValor = subtotalGeneral.times(
      new Decimal(descuentoPorcentaje.toString()).dividedBy(100),
    );

    // subtotal_con_descuento = subtotal_general - descuento_valor
    const subtotalConDescuento = subtotalGeneral.minus(descuentoValor);

    // iva_valor = subtotal_con_descuento * (iva_porcentaje / 100)
    const ivaValor = subtotalConDescuento.times(
      new Decimal(ivaPorcentaje.toString()).dividedBy(100),
    );

    // total_cotizacion = subtotal_con_descuento + iva_valor
    const totalCotizacion = subtotalConDescuento.plus(ivaValor);

    // Actualizar cotización con todos los totales
    await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: {
        subtotal_servicios: new Decimal(subtotalServicios.toFixed(2)),
        subtotal_componentes: new Decimal(subtotalComponentes.toFixed(2)),
        subtotal_general: new Decimal(subtotalGeneral.toFixed(2)),
        descuento_valor: new Decimal(descuentoValor.toFixed(2)),
        subtotal_con_descuento: new Decimal(subtotalConDescuento.toFixed(2)),
        iva_valor: new Decimal(ivaValor.toFixed(2)),
        total_cotizacion: new Decimal(totalCotizacion.toFixed(2)),
        fecha_modificacion: new Date(),
      },
    });

    const result: CalculoTotalesResult = {
      subtotal_servicios: new Decimal(subtotalServicios.toFixed(2)),
      subtotal_componentes: new Decimal(subtotalComponentes.toFixed(2)),
      subtotal_general: new Decimal(subtotalGeneral.toFixed(2)),
      descuento_valor: new Decimal(descuentoValor.toFixed(2)),
      subtotal_con_descuento: new Decimal(subtotalConDescuento.toFixed(2)),
      iva_valor: new Decimal(ivaValor.toFixed(2)),
      total_cotizacion: new Decimal(totalCotizacion.toFixed(2)),
      cantidad_items_servicios: itemsServicios.length,
      cantidad_items_componentes: itemsComponentes.length,
    };

    this.logger.log(
      `Totales recalculados: ${JSON.stringify({
        subtotal_general: result.subtotal_general.toString(),
        descuento_valor: result.descuento_valor.toString(),
        iva_valor: result.iva_valor.toString(),
        total: result.total_cotizacion.toString(),
      })}`,
    );

    return result;
  }

  /**
   * Actualiza el descuento global y recalcula
   */
  async actualizarDescuento(
    idCotizacion: number,
    descuentoPorcentaje: number,
  ): Promise<CalculoTotalesResult> {
    // Validar rango de descuento
    if (descuentoPorcentaje < 0 || descuentoPorcentaje > 100) {
      throw new Error('Descuento debe estar entre 0 y 100');
    }

    await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: { descuento_porcentaje: new Decimal(descuentoPorcentaje) },
    });

    return this.recalcularTotales(idCotizacion);
  }

  /**
   * Actualiza el IVA y recalcula
   */
  async actualizarIva(
    idCotizacion: number,
    ivaPorcentaje: number,
  ): Promise<CalculoTotalesResult> {
    // Validar rango de IVA
    if (ivaPorcentaje < 0 || ivaPorcentaje > 100) {
      throw new Error('IVA debe estar entre 0 y 100');
    }

    await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: { iva_porcentaje: new Decimal(ivaPorcentaje) },
    });

    return this.recalcularTotales(idCotizacion);
  }

  /**
   * Obtiene un resumen de los totales actuales sin recalcular
   */
  async obtenerTotalesActuales(
    idCotizacion: number,
  ): Promise<CalculoTotalesResult | null> {
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        items_servicios: true,
        items_componentes: true,
      },
    });

    if (!cotizacion) return null;

    return {
      subtotal_servicios: cotizacion.subtotal_servicios || new Decimal(0),
      subtotal_componentes: cotizacion.subtotal_componentes || new Decimal(0),
      subtotal_general: cotizacion.subtotal_general || new Decimal(0),
      descuento_valor: cotizacion.descuento_valor || new Decimal(0),
      subtotal_con_descuento: cotizacion.subtotal_con_descuento || new Decimal(0),
      iva_valor: cotizacion.iva_valor || new Decimal(0),
      total_cotizacion: cotizacion.total_cotizacion || new Decimal(0),
      cantidad_items_servicios: cotizacion.items_servicios.length,
      cantidad_items_componentes: cotizacion.items_componentes.length,
    };
  }
}
