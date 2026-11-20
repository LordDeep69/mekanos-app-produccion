/**
 * COTIZACION CALCULO SERVICE (Motor Financiero & Rentabilidad EAM-CPQ)
 *
 * Fuente única de verdad para todos los cálculos monetarios y de margen:
 * - Servicios (`items_cotizacion_servicios`)
 * - Repuestos / Insumos (`items_cotizacion_componentes`)
 * - Logística, Viáticos, Pólizas e Indirectos (`items_cotizacion_otros`)
 * - Ítems opcionales (`es_opcional = true`) separados en `subtotal_opcionales`
 * - Costos indirectos absorbidos (`visible_cliente = false`) sumados solo a `costo_total_estimado`
 * - Descuento global
 * - AIU opcional (`Administración %`, `Imprevistos %`, `Utilidad %`)
 * - Régimen tributario dual:
 *     - Estándar: IVA sobre líneas gravables netas (+ AIU si aplica)
 *     - Contrato AIU Colombia (`usa_aiu && iva_sobre_utilidad_aiu`): IVA únicamente sobre Utilidad AIU
 * - Rentabilidad interna privada: Costo Total, Utilidad Bruta ($) y Margen Bruto (%)
 */

import { PrismaService } from '@mekanos/database';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

export interface CalculoTotalesResult {
  subtotal_servicios: Decimal;
  subtotal_componentes: Decimal;
  subtotal_otros: Decimal;
  subtotal_general: Decimal;
  subtotal_opcionales: Decimal;
  descuento_valor: Decimal;
  subtotal_con_descuento: Decimal;
  usa_aiu: boolean;
  aiu_admin_valor: Decimal;
  aiu_imprevistos_valor: Decimal;
  aiu_utilidad_valor: Decimal;
  aiu_valor_total: Decimal;
  iva_sobre_utilidad_aiu: boolean;
  iva_porcentaje: Decimal;
  iva_valor: Decimal;
  total_cotizacion: Decimal;
  costo_total_estimado: Decimal;
  utilidad_bruta_estimada: Decimal;
  margen_bruto_porcentaje: Decimal;
  cantidad_items_servicios: number;
  cantidad_items_componentes: number;
  cantidad_items_otros: number;
}

@Injectable()
export class CotizacionCalculoService {
  private readonly logger = new Logger(CotizacionCalculoService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula el subtotal de un ítem individual con precisión Decimal(12,2):
   * subtotal = cantidad * precio_unitario * (1 - descuento_porcentaje / 100)
   */
  calcularSubtotalItem(
    cantidad: Decimal | number,
    precioUnitario: Decimal | number,
    descuentoPorcentaje?: Decimal | number | null,
  ): Decimal {
    const cant = new Decimal(cantidad?.toString() || '0');
    const precio = new Decimal(precioUnitario?.toString() || '0');
    const descuento = descuentoPorcentaje
      ? new Decimal(descuentoPorcentaje.toString())
      : new Decimal(0);

    const factor = new Decimal(1).minus(descuento.dividedBy(100));
    const subtotal = cant.times(precio).times(factor);
    return new Decimal(subtotal.toFixed(2));
  }

  /**
   * Calcula costo total de una línea (cantidad * costo_unitario).
   */
  calcularCostoItem(cantidad: Decimal | number, costoUnitario?: Decimal | number | null): Decimal {
    const cant = new Decimal(cantidad?.toString() || '0');
    const costo = costoUnitario ? new Decimal(costoUnitario.toString()) : new Decimal(0);
    return new Decimal(cant.times(costo).toFixed(2));
  }

  /**
   * Recalcula todos los subtotales, AIU, IVA, total cliente y rentabilidad interna,
   * actualizando de forma consistente en BD.
   */
  async recalcularTotales(idCotizacion: number): Promise<CalculoTotalesResult> {
    this.logger.log(`Recalculando totales CPQ para cotización ${idCotizacion}`);

    const [cotizacion, orgConfig, itemsServicios, itemsComponentes, itemsOtros] = await Promise.all(
      [
        this.prisma.cotizaciones.findUnique({
          where: { id_cotizacion: idCotizacion },
          select: {
            id_cotizacion: true,
            descuento_porcentaje: true,
            iva_porcentaje: true,
            usa_aiu: true,
            aiu_admin_porcentaje: true,
            aiu_imprevistos_porcentaje: true,
            aiu_utilidad_porcentaje: true,
            iva_sobre_utilidad_aiu: true,
          },
        }),
        this.prisma.configuracion_organizacion.findUnique({
          where: { id_configuracion: 1 },
          select: { tasa_impuesto_defecto: true },
        }),
        this.prisma.items_cotizacion_servicios.findMany({
          where: { id_cotizacion: idCotizacion },
        }),
        this.prisma.items_cotizacion_componentes.findMany({
          where: { id_cotizacion: idCotizacion },
        }),
        this.prisma.items_cotizacion_otros.findMany({
          where: { id_cotizacion: idCotizacion },
        }),
      ],
    );

    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }

    let subtotalServicios = new Decimal(0);
    let subtotalComponentes = new Decimal(0);
    let subtotalOtros = new Decimal(0);
    let subtotalOpcionales = new Decimal(0);
    let subtotalGravableBruto = new Decimal(0);
    let costoTotal = new Decimal(0);

    // 1. Servicios
    for (const item of itemsServicios) {
      const subtotalItem = this.calcularSubtotalItem(
        item.cantidad,
        item.precio_unitario,
        item.descuento_porcentaje,
      );
      if (!item.subtotal || !subtotalItem.equals(item.subtotal)) {
        await this.prisma.items_cotizacion_servicios.update({
          where: { id_item_servicio: item.id_item_servicio },
          data: { subtotal: subtotalItem },
        });
      }

      if (item.es_opcional) {
        subtotalOpcionales = subtotalOpcionales.plus(subtotalItem);
      } else {
        subtotalServicios = subtotalServicios.plus(subtotalItem);
        if (item.iva_aplicable !== false) {
          subtotalGravableBruto = subtotalGravableBruto.plus(subtotalItem);
        }
        costoTotal = costoTotal.plus(this.calcularCostoItem(item.cantidad, item.costo_unitario));
      }
    }

    // 2. Componentes / Repuestos
    for (const item of itemsComponentes) {
      const subtotalItem = this.calcularSubtotalItem(
        item.cantidad,
        item.precio_unitario,
        item.descuento_porcentaje,
      );
      if (!item.subtotal || !subtotalItem.equals(item.subtotal)) {
        await this.prisma.items_cotizacion_componentes.update({
          where: { id_item_componente: item.id_item_componente },
          data: { subtotal: subtotalItem },
        });
      }

      if (item.es_opcional) {
        subtotalOpcionales = subtotalOpcionales.plus(subtotalItem);
      } else {
        subtotalComponentes = subtotalComponentes.plus(subtotalItem);
        if (item.iva_aplicable !== false) {
          subtotalGravableBruto = subtotalGravableBruto.plus(subtotalItem);
        }
        costoTotal = costoTotal.plus(this.calcularCostoItem(item.cantidad, item.costo_unitario));
      }
    }

    // 3. Otros rubros (Logística, Viáticos, Pólizas, Alquiler, Disposición Ambiental)
    for (const item of itemsOtros) {
      const subtotalItem = this.calcularSubtotalItem(
        item.cantidad,
        item.precio_unitario,
        item.descuento_porcentaje,
      );
      if (!item.subtotal || !subtotalItem.equals(item.subtotal)) {
        await this.prisma.items_cotizacion_otros.update({
          where: { id_item_otro: item.id_item_otro },
          data: { subtotal: subtotalItem },
        });
      }

      const costoUnitarioEfectivo =
        Number(item.costo_unitario || 0) > 0
          ? item.costo_unitario
          : item.visible_cliente === false
            ? item.precio_unitario
            : new Decimal(0);

      if (item.es_opcional) {
        if (item.visible_cliente !== false) {
          subtotalOpcionales = subtotalOpcionales.plus(subtotalItem);
        }
      } else {
        costoTotal = costoTotal.plus(this.calcularCostoItem(item.cantidad, costoUnitarioEfectivo));
        if (item.visible_cliente !== false) {
          subtotalOtros = subtotalOtros.plus(subtotalItem);
          if (item.iva_aplicable !== false) {
            subtotalGravableBruto = subtotalGravableBruto.plus(subtotalItem);
          }
        }
      }
    }

    // 4. Subtotal General y Descuento Global
    const subtotalGeneral = new Decimal(
      subtotalServicios.plus(subtotalComponentes).plus(subtotalOtros).toFixed(2),
    );
    const descuentoPorcentaje = cotizacion.descuento_porcentaje
      ? new Decimal(cotizacion.descuento_porcentaje.toString())
      : new Decimal(0);
    const descuentoFactor = new Decimal(1).minus(descuentoPorcentaje.dividedBy(100));

    const descuentoValor = new Decimal(
      subtotalGeneral.times(descuentoPorcentaje.dividedBy(100)).toFixed(2),
    );
    const subtotalConDescuento = new Decimal(subtotalGeneral.minus(descuentoValor).toFixed(2));

    // 5. AIU Opcional
    const usaAiu = Boolean(cotizacion.usa_aiu);
    const aiuAdminPct = usaAiu
      ? new Decimal(cotizacion.aiu_admin_porcentaje?.toString() || '0')
      : new Decimal(0);
    const aiuImprevPct = usaAiu
      ? new Decimal(cotizacion.aiu_imprevistos_porcentaje?.toString() || '0')
      : new Decimal(0);
    const aiuUtilPct = usaAiu
      ? new Decimal(cotizacion.aiu_utilidad_porcentaje?.toString() || '0')
      : new Decimal(0);

    const aiuAdminValor = new Decimal(
      subtotalConDescuento.times(aiuAdminPct.dividedBy(100)).toFixed(2),
    );
    const aiuImprevistosValor = new Decimal(
      subtotalConDescuento.times(aiuImprevPct.dividedBy(100)).toFixed(2),
    );
    const aiuUtilidadValor = new Decimal(
      subtotalConDescuento.times(aiuUtilPct.dividedBy(100)).toFixed(2),
    );
    const aiuValorTotal = new Decimal(
      aiuAdminValor.plus(aiuImprevistosValor).plus(aiuUtilidadValor).toFixed(2),
    );

    // 6. IVA (respeta 0% explícito; solo hace fallback si es null/undefined)
    const ivaPorcentaje =
      cotizacion.iva_porcentaje !== null && cotizacion.iva_porcentaje !== undefined
        ? new Decimal(cotizacion.iva_porcentaje.toString())
        : new Decimal(orgConfig?.tasa_impuesto_defecto?.toString() || '0');

    const ivaSobreUtilidadAiu = usaAiu && Boolean(cotizacion.iva_sobre_utilidad_aiu);
    let baseGravableIva: Decimal;
    if (ivaSobreUtilidadAiu) {
      baseGravableIva = aiuUtilidadValor;
    } else {
      const baseGravableNeta = new Decimal(
        subtotalGravableBruto.times(descuentoFactor).toFixed(2),
      );
      baseGravableIva = usaAiu
        ? new Decimal(baseGravableNeta.plus(aiuValorTotal).toFixed(2))
        : baseGravableNeta;
    }

    const ivaValor = new Decimal(baseGravableIva.times(ivaPorcentaje.dividedBy(100)).toFixed(2));

    // 7. Total Cliente & Rentabilidad Privada
    const ingresoNetoSinIva = new Decimal(subtotalConDescuento.plus(aiuValorTotal).toFixed(2));
    const totalCotizacion = new Decimal(ingresoNetoSinIva.plus(ivaValor).toFixed(2));
    const costoEstimadoFinal = new Decimal(costoTotal.toFixed(2));
    const utilidadBruta = new Decimal(ingresoNetoSinIva.minus(costoEstimadoFinal).toFixed(2));
    const margenBrutoPct = ingresoNetoSinIva.gt(0)
      ? new Decimal(utilidadBruta.dividedBy(ingresoNetoSinIva).times(100).toFixed(2))
      : new Decimal(0);

    await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: {
        subtotal_servicios: new Decimal(subtotalServicios.toFixed(2)),
        subtotal_componentes: new Decimal(subtotalComponentes.toFixed(2)),
        subtotal_otros: new Decimal(subtotalOtros.toFixed(2)),
        subtotal_general: subtotalGeneral,
        subtotal_opcionales: new Decimal(subtotalOpcionales.toFixed(2)),
        descuento_valor: descuentoValor,
        subtotal_con_descuento: subtotalConDescuento,
        aiu_admin_valor: aiuAdminValor,
        aiu_imprevistos_valor: aiuImprevistosValor,
        aiu_utilidad_valor: aiuUtilidadValor,
        aiu_valor_total: aiuValorTotal,
        iva_valor: ivaValor,
        total_cotizacion: totalCotizacion,
        costo_total_estimado: costoEstimadoFinal,
        utilidad_bruta_estimada: utilidadBruta,
        margen_bruto_porcentaje: margenBrutoPct,
        fecha_modificacion: new Date(),
      },
    });

    return {
      subtotal_servicios: new Decimal(subtotalServicios.toFixed(2)),
      subtotal_componentes: new Decimal(subtotalComponentes.toFixed(2)),
      subtotal_otros: new Decimal(subtotalOtros.toFixed(2)),
      subtotal_general: subtotalGeneral,
      subtotal_opcionales: new Decimal(subtotalOpcionales.toFixed(2)),
      descuento_valor: descuentoValor,
      subtotal_con_descuento: subtotalConDescuento,
      usa_aiu: usaAiu,
      aiu_admin_valor: aiuAdminValor,
      aiu_imprevistos_valor: aiuImprevistosValor,
      aiu_utilidad_valor: aiuUtilidadValor,
      aiu_valor_total: aiuValorTotal,
      iva_sobre_utilidad_aiu: ivaSobreUtilidadAiu,
      iva_porcentaje: ivaPorcentaje,
      iva_valor: ivaValor,
      total_cotizacion: totalCotizacion,
      costo_total_estimado: costoEstimadoFinal,
      utilidad_bruta_estimada: utilidadBruta,
      margen_bruto_porcentaje: margenBrutoPct,
      cantidad_items_servicios: itemsServicios.length,
      cantidad_items_componentes: itemsComponentes.length,
      cantidad_items_otros: itemsOtros.length,
    };
  }

  async actualizarDescuento(
    idCotizacion: number,
    descuentoPorcentaje: number,
  ): Promise<CalculoTotalesResult> {
    if (descuentoPorcentaje < 0 || descuentoPorcentaje > 100) {
      throw new Error('Descuento debe estar entre 0 y 100');
    }
    await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: { descuento_porcentaje: new Decimal(descuentoPorcentaje) },
    });
    return this.recalcularTotales(idCotizacion);
  }

  async actualizarIva(idCotizacion: number, ivaPorcentaje: number): Promise<CalculoTotalesResult> {
    if (ivaPorcentaje < 0 || ivaPorcentaje > 100) {
      throw new Error('IVA debe estar entre 0 y 100');
    }
    await this.prisma.cotizaciones.update({
      where: { id_cotizacion: idCotizacion },
      data: { iva_porcentaje: new Decimal(ivaPorcentaje) },
    });
    return this.recalcularTotales(idCotizacion);
  }

  async obtenerTotalesActuales(idCotizacion: number): Promise<CalculoTotalesResult | null> {
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        items_cotizacion_servicios: { select: { id_item_servicio: true } },
        items_cotizacion_componentes: { select: { id_item_componente: true } },
        items_cotizacion_otros: { select: { id_item_otro: true } },
      },
    });

    if (!cotizacion) return null;

    return {
      subtotal_servicios: cotizacion.subtotal_servicios || new Decimal(0),
      subtotal_componentes: cotizacion.subtotal_componentes || new Decimal(0),
      subtotal_otros: cotizacion.subtotal_otros || new Decimal(0),
      subtotal_general: cotizacion.subtotal_general || new Decimal(0),
      subtotal_opcionales: cotizacion.subtotal_opcionales || new Decimal(0),
      descuento_valor: cotizacion.descuento_valor || new Decimal(0),
      subtotal_con_descuento: cotizacion.subtotal_con_descuento || new Decimal(0),
      usa_aiu: Boolean(cotizacion.usa_aiu),
      aiu_admin_valor: cotizacion.aiu_admin_valor || new Decimal(0),
      aiu_imprevistos_valor: cotizacion.aiu_imprevistos_valor || new Decimal(0),
      aiu_utilidad_valor: cotizacion.aiu_utilidad_valor || new Decimal(0),
      aiu_valor_total: cotizacion.aiu_valor_total || new Decimal(0),
      iva_sobre_utilidad_aiu: Boolean(cotizacion.iva_sobre_utilidad_aiu),
      iva_porcentaje: cotizacion.iva_porcentaje || new Decimal(0),
      iva_valor: cotizacion.iva_valor || new Decimal(0),
      total_cotizacion: cotizacion.total_cotizacion || new Decimal(0),
      costo_total_estimado: cotizacion.costo_total_estimado || new Decimal(0),
      utilidad_bruta_estimada: cotizacion.utilidad_bruta_estimada || new Decimal(0),
      margen_bruto_porcentaje: cotizacion.margen_bruto_porcentaje || new Decimal(0),
      cantidad_items_servicios: cotizacion.items_cotizacion_servicios.length,
      cantidad_items_componentes: cotizacion.items_cotizacion_componentes.length,
      cantidad_items_otros: cotizacion.items_cotizacion_otros.length,
    };
  }
}
