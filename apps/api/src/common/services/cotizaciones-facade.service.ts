/**
 * COTIZACIONES FACADE SERVICE - MEKANOS S.A.S
 *
 * Servicio encapsulado para todas las operaciones de cotizaciones comerciales.
 * Este facade unifica y simplifica el acceso a:
 *
 * - Creación y gestión de cotizaciones
 * - FSM de estados (BORRADOR → ENVIADA → APROBADA)
 * - Cálculo automático de totales con IVA
 * - Generación de PDF comercial
 * - Envío de email con cotización
 * - Propuestas correctivas
 * - Conversión propuesta → orden de servicio
 *
 * @author MEKANOS Development Team
 * @version 1.0.0
 * @since FASE 4 POST-CRUD
 */

import { PrismaService } from '@mekanos/database';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CotizacionCalculoService } from '../../cotizaciones/services/cotizacion-calculo.service';
import { EmailService } from '../../email/email.service';
import { PdfService } from '../../pdf/pdf.service';
import { NumeracionService } from './numeracion.service';

// ==================== TIPOS DE ENTRADA SIMPLIFICADOS ====================

/**
 * Datos mínimos para crear una cotización
 */
export interface CrearCotizacionInput {
  idCliente: number;
  idSede?: number;
  idEquipo?: number;
  asunto: string;
  descripcionGeneral?: string;
  alcanceTrabajo?: string;
  exclusiones?: string;
  descuentoPorcentaje?: number;
  ivaPorcentaje?: number;
  diasValidez?: number;
  formaPago?: string;
  tiempoEstimadoDias?: number;
  mesesGarantia?: number;
  observacionesGarantia?: string;
  terminosCondiciones?: string;
  elaboradaPor: number;
}

/**
 * Item de servicio para agregar a cotización
 */
export interface ItemServicioInput {
  idServicioCatalogo?: number;
  descripcionPersonalizada?: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPorcentaje?: number;
  observaciones?: string;
}

/**
 * Item de componente para agregar a cotización
 */
export interface ItemComponenteInput {
  idComponenteCatalogo?: number;
  descripcion?: string;
  referenciaManual?: string;
  cantidad: number;
  precioUnitario: number;
  descuentoPorcentaje?: number;
  observaciones?: string;
}

/**
 * Datos para enviar cotización a cliente
 */
export interface EnviarCotizacionInput {
  idCotizacion: number;
  destinatarioEmail: string;
  destinatarioNombre: string;
  emailsCopia?: string[];
  enviadoPor: number;
}

/**
 * Datos para crear propuesta correctiva
 */
export interface CrearPropuestaInput {
  idOrdenServicio: number;
  tipoPropuesta: 'CORRECTIVO' | 'MEJORA' | 'REEMPLAZO';
  descripcionHallazgo: string;
  descripcionSolucion: string;
  prioridad: 'BAJA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  creadaPor: number;
}

/**
 * Resultado de operación de cotización
 */
export interface CotizacionResult {
  success: boolean;
  idCotizacion?: number;
  numeroCotizacion?: string;
  estado?: string;
  totales?: {
    subtotalServicios: string;
    subtotalComponentes: string;
    subtotalGeneral: string;
    descuentoValor: string;
    ivaValor: string;
    totalCotizacion: string;
  };
  mensaje?: string;
  error?: string;
}

/**
 * Resultado de envío de cotización
 */
export interface EnvioCotizacionResult {
  success: boolean;
  pdfGenerado: boolean;
  emailEnviado: boolean;
  numeroCotizacion: string;
  destinatario: string;
  error?: string;
}

// ==================== SERVICIO PRINCIPAL ====================

@Injectable()
export class CotizacionesFacadeService {
  private readonly logger = new Logger(CotizacionesFacadeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    private readonly calculoService: CotizacionCalculoService,
    private readonly numeracionService: NumeracionService,
  ) {}

  // ==================== GESTIÓN DE COTIZACIONES ====================

  /**
   * Crea una nueva cotización en estado BORRADOR
   * - Genera número automático (COT-YYYY-XXXX)
   * - Establece fechas de emisión y vencimiento
   * - Configura IVA por defecto 19%
   */
  async crearCotizacion(input: CrearCotizacionInput): Promise<CotizacionResult> {
    try {
      this.logger.log(`Creando cotización para cliente ${input.idCliente}`);

      // Verificar que el cliente existe
      const cliente = await this.prisma.clientes.findUnique({
        where: { id_cliente: input.idCliente },
        include: { persona: true },
      });

      if (!cliente) {
        throw new NotFoundException(`Cliente ${input.idCliente} no encontrado`);
      }

      // Obtener estado BORRADOR
      const estadoBorrador = await this.prisma.estados_cotizacion.findFirst({
        where: { nombre_estado: 'BORRADOR' },
      });

      if (!estadoBorrador) {
        throw new BadRequestException('Estado BORRADOR no configurado en el sistema');
      }

      // Generar número de cotización
      const numeracion = await this.numeracionService.generarNumero('COTIZACION');

      // Calcular fecha de vencimiento
      const fechaCotizacion = new Date();
      const diasValidez = input.diasValidez || 30;
      const fechaVencimiento = new Date(fechaCotizacion);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + diasValidez);

      // Crear cotización
      const cotizacion = await this.prisma.cotizaciones.create({
        data: {
          numero_cotizacion: numeracion.codigo,
          id_cliente: input.idCliente,
          id_sede: input.idSede,
          id_equipo: input.idEquipo,
          id_estado: estadoBorrador.id_estado,
          fecha_cotizacion: fechaCotizacion,
          fecha_vencimiento: fechaVencimiento,
          dias_validez: diasValidez,
          asunto: input.asunto,
          descripcion_general: input.descripcionGeneral,
          alcance_trabajo: input.alcanceTrabajo,
          exclusiones: input.exclusiones,
          descuento_porcentaje: new Decimal(input.descuentoPorcentaje || 0),
          iva_porcentaje: new Decimal(input.ivaPorcentaje || 19), // IVA Colombia default
          forma_pago: input.formaPago || 'CONTADO',
          tiempo_estimado_dias: input.tiempoEstimadoDias,
          meses_garantia: input.mesesGarantia || 6,
          observaciones_garantia: input.observacionesGarantia,
          terminos_condiciones: input.terminosCondiciones,
          elaborada_por: input.elaboradaPor,
          // Inicializar totales en 0
          subtotal_servicios: new Decimal(0),
          subtotal_componentes: new Decimal(0),
          subtotal_general: new Decimal(0),
          descuento_valor: new Decimal(0),
          subtotal_con_descuento: new Decimal(0),
          iva_valor: new Decimal(0),
          total_cotizacion: new Decimal(0),
        },
      });

      this.logger.log(`✅ Cotización creada: ${numeracion.codigo}`);

      return {
        success: true,
        idCotizacion: cotizacion.id_cotizacion,
        numeroCotizacion: cotizacion.numero_cotizacion,
        estado: 'BORRADOR',
        mensaje: `Cotización ${numeracion.codigo} creada exitosamente`,
      };
    } catch (error) {
      this.logger.error(`Error creando cotización: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Agrega un item de servicio a la cotización
   * - Calcula subtotal automáticamente
   * - Recalcula totales de la cotización
   */
  async agregarItemServicio(
    idCotizacion: number,
    item: ItemServicioInput,
  ): Promise<CotizacionResult> {
    try {
      // Verificar cotización existe y está en BORRADOR
      const cotizacion = await this.verificarCotizacionEditable(idCotizacion);

      // Calcular subtotal del item
      const subtotal = this.calcularSubtotalItem(
        item.cantidad,
        item.precioUnitario,
        item.descuentoPorcentaje || 0,
      );

      // Crear item de servicio
      await this.prisma.items_cotizacion_servicios.create({
        data: {
          id_cotizacion: idCotizacion,
          id_servicio: item.idServicioCatalogo,
          descripcion_personalizada: item.descripcionPersonalizada,
          cantidad: new Decimal(item.cantidad),
          precio_unitario: new Decimal(item.precioUnitario),
          descuento_porcentaje: new Decimal(item.descuentoPorcentaje || 0),
          subtotal: new Decimal(subtotal),
          observaciones: item.observaciones,
        },
      });

      // Recalcular totales
      const totales = await this.calculoService.recalcularTotales(idCotizacion);

      this.logger.log(`✅ Item servicio agregado a cotización ${cotizacion.numero_cotizacion}`);

      return {
        success: true,
        idCotizacion,
        numeroCotizacion: cotizacion.numero_cotizacion,
        totales: this.formatearTotales(totales),
        mensaje: 'Item de servicio agregado exitosamente',
      };
    } catch (error) {
      this.logger.error(`Error agregando item servicio: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Agrega un item de componente a la cotización
   */
  async agregarItemComponente(
    idCotizacion: number,
    item: ItemComponenteInput,
  ): Promise<CotizacionResult> {
    try {
      const cotizacion = await this.verificarCotizacionEditable(idCotizacion);

      const subtotal = this.calcularSubtotalItem(
        item.cantidad,
        item.precioUnitario,
        item.descuentoPorcentaje || 0,
      );

      await this.prisma.items_cotizacion_componentes.create({
        data: {
          id_cotizacion: idCotizacion,
          id_componente: item.idComponenteCatalogo,
          descripcion: item.descripcion,
          referencia_manual: item.referenciaManual,
          cantidad: new Decimal(item.cantidad),
          precio_unitario: new Decimal(item.precioUnitario),
          descuento_porcentaje: new Decimal(item.descuentoPorcentaje || 0),
          subtotal: new Decimal(subtotal),
          observaciones: item.observaciones,
        },
      });

      const totales = await this.calculoService.recalcularTotales(idCotizacion);

      this.logger.log(`✅ Item componente agregado a cotización ${cotizacion.numero_cotizacion}`);

      return {
        success: true,
        idCotizacion,
        numeroCotizacion: cotizacion.numero_cotizacion,
        totales: this.formatearTotales(totales),
        mensaje: 'Item de componente agregado exitosamente',
      };
    } catch (error) {
      this.logger.error(`Error agregando item componente: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Recalcula todos los totales de una cotización
   */
  async recalcularTotales(idCotizacion: number): Promise<CotizacionResult> {
    try {
      const cotizacion = await this.prisma.cotizaciones.findUnique({
        where: { id_cotizacion: idCotizacion },
      });

      if (!cotizacion) {
        throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
      }

      const totales = await this.calculoService.recalcularTotales(idCotizacion);

      return {
        success: true,
        idCotizacion,
        numeroCotizacion: cotizacion.numero_cotizacion,
        totales: this.formatearTotales(totales),
        mensaje: 'Totales recalculados exitosamente',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== FLUJO DE ESTADOS (FSM) ====================

  /**
   * Solicita aprobación interna para la cotización
   * Transición: BORRADOR → EN_REVISION
   */
  async solicitarAprobacion(
    idCotizacion: number,
    solicitadaPor: number,
    observaciones?: string,
  ): Promise<CotizacionResult> {
    try {
      const cotizacion = await this.verificarCotizacionEditable(idCotizacion);

      // Obtener estado EN_REVISION
      const estadoRevision = await this.prisma.estados_cotizacion.findFirst({
        where: { nombre_estado: 'EN_REVISION' },
      });

      if (!estadoRevision) {
        throw new BadRequestException('Estado EN_REVISION no configurado');
      }

      // Actualizar estado
      await this.prisma.cotizaciones.update({
        where: { id_cotizacion: idCotizacion },
        data: {
          id_estado: estadoRevision.id_estado,
          fecha_modificacion: new Date(),
        },
      });

      // Crear registro de aprobación pendiente
      await this.prisma.aprobaciones_cotizacion.create({
        data: {
          id_cotizacion: idCotizacion,
          nivel_aprobacion: 'SUPERVISOR',
          estado_aprobacion: 'PENDIENTE',
          solicitada_por: solicitadaPor,
          observaciones_solicitante: observaciones,
          fecha_solicitud: new Date(),
        },
      });

      this.logger.log(`✅ Aprobación solicitada para ${cotizacion.numero_cotizacion}`);

      return {
        success: true,
        idCotizacion,
        numeroCotizacion: cotizacion.numero_cotizacion,
        estado: 'EN_REVISION',
        mensaje: 'Aprobación solicitada exitosamente',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía la cotización al cliente con PDF adjunto
   * Transición: APROBADA_INTERNA → ENVIADA
   */
  async enviarCotizacion(input: EnviarCotizacionInput): Promise<EnvioCotizacionResult> {
    try {
      this.logger.log(`Enviando cotización ${input.idCotizacion} a ${input.destinatarioEmail}`);

      // Verificar cotización está aprobada internamente
      const cotizacion = await this.prisma.cotizaciones.findUnique({
        where: { id_cotizacion: input.idCotizacion },
        include: {
          estado: true,
          cliente: { include: { persona: true } },
          empleados: { include: { persona: true } },
          items_servicios: { include: { servicio: true } },
          items_componentes: { include: { catalogo_componentes: true } },
        },
      });

      if (!cotizacion) {
        throw new NotFoundException(`Cotización ${input.idCotizacion} no encontrada`);
      }

      if (cotizacion.estado.nombre_estado !== 'APROBADA_INTERNA') {
        throw new BadRequestException(
          `Solo cotizaciones APROBADA_INTERNA pueden enviarse. Estado actual: ${cotizacion.estado.nombre_estado}`,
        );
      }

      // Preparar datos para PDF
      const datosPDF = this.prepararDatosPDF(cotizacion, input);

      // Generar PDF
      let pdfGenerado = false;
      let pdfBuffer: Buffer | null = null;
      let pdfFilename = '';

      try {
        const pdfResult = await this.pdfService.generarPDFCotizacion(datosPDF);
        pdfBuffer = pdfResult.buffer;
        pdfFilename = pdfResult.filename;
        pdfGenerado = true;
        this.logger.log(`PDF generado: ${pdfFilename} (${pdfBuffer.length} bytes)`);
      } catch (pdfError) {
        this.logger.warn(`No se pudo generar PDF: ${pdfError.message}`);
      }

      // Enviar email
      let emailEnviado = false;
      const asunto = `Cotización ${cotizacion.numero_cotizacion} - MEKANOS S.A.S`;
      const cuerpoHtml = this.generarEmailCotizacion(cotizacion, input.destinatarioNombre);

      try {
        const emailResult = await this.emailService.sendEmail({
          to: input.destinatarioEmail,
          cc: input.emailsCopia?.join(', '),
          subject: asunto,
          html: cuerpoHtml,
          attachments: pdfBuffer
            ? [
                {
                  filename: pdfFilename,
                  content: pdfBuffer,
                  contentType: 'application/pdf',
                },
              ]
            : undefined,
        });
        emailEnviado = emailResult.success;
      } catch (emailError) {
        this.logger.warn(`No se pudo enviar email: ${emailError.message}`);
      }

      // Cambiar estado a ENVIADA
      const estadoEnviada = await this.prisma.estados_cotizacion.findFirst({
        where: { nombre_estado: 'ENVIADA' },
      });

      await this.prisma.cotizaciones.update({
        where: { id_cotizacion: input.idCotizacion },
        data: {
          id_estado: estadoEnviada?.id_estado,
          fecha_modificacion: new Date(),
        },
      });

      // Registrar historial de envío
      await this.prisma.historial_envios.create({
        data: {
          tipo_documento: 'COTIZACION',
          id_cotizacion: input.idCotizacion,
          fecha_envio: new Date(),
          enviado_por: input.enviadoPor,
          canal_envio: 'EMAIL',
          destinatario_email: input.destinatarioEmail,
          destinatario_nombre: input.destinatarioNombre,
          emails_copia: input.emailsCopia,
          asunto_email: asunto,
          estado_envio: emailEnviado ? 'ENVIADO' : 'PENDIENTE',
          ruta_pdf_generado: pdfFilename || undefined,
        },
      });

      this.logger.log(`✅ Cotización ${cotizacion.numero_cotizacion} procesada para envío`);

      return {
        success: true,
        pdfGenerado,
        emailEnviado,
        numeroCotizacion: cotizacion.numero_cotizacion,
        destinatario: input.destinatarioEmail,
      };
    } catch (error) {
      this.logger.error(`Error enviando cotización: ${error.message}`);
      return {
        success: false,
        pdfGenerado: false,
        emailEnviado: false,
        numeroCotizacion: '',
        destinatario: input.destinatarioEmail,
        error: error.message,
      };
    }
  }

  /**
   * Registra la aprobación del cliente
   * Transición: ENVIADA → APROBADA_CLIENTE
   */
  async aprobarPorCliente(
    idCotizacion: number,
    aprobadoPor: number,
    observaciones?: string,
  ): Promise<CotizacionResult> {
    try {
      const cotizacion = await this.prisma.cotizaciones.findUnique({
        where: { id_cotizacion: idCotizacion },
        include: { estado: true },
      });

      if (!cotizacion) {
        throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
      }

      if (cotizacion.estado.nombre_estado !== 'ENVIADA') {
        throw new BadRequestException(
          `Solo cotizaciones ENVIADA pueden aprobarse. Estado: ${cotizacion.estado.nombre_estado}`,
        );
      }

      const estadoAprobada = await this.prisma.estados_cotizacion.findFirst({
        where: { nombre_estado: 'APROBADA_CLIENTE' },
      });

      await this.prisma.cotizaciones.update({
        where: { id_cotizacion: idCotizacion },
        data: {
          id_estado: estadoAprobada?.id_estado,
          fecha_aprobacion: new Date(),
          aprobada_por: aprobadoPor,
          fecha_modificacion: new Date(),
        },
      });

      this.logger.log(`✅ Cotización ${cotizacion.numero_cotizacion} aprobada por cliente`);

      return {
        success: true,
        idCotizacion,
        numeroCotizacion: cotizacion.numero_cotizacion,
        estado: 'APROBADA_CLIENTE',
        mensaje: 'Cotización aprobada por cliente exitosamente',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Registra el rechazo del cliente
   * Transición: ENVIADA → RECHAZADA
   */
  async rechazarPorCliente(
    idCotizacion: number,
    motivoRechazo: string,
    rechazadoPor: number,
  ): Promise<CotizacionResult> {
    try {
      const cotizacion = await this.prisma.cotizaciones.findUnique({
        where: { id_cotizacion: idCotizacion },
        include: { estado: true },
      });

      if (!cotizacion) {
        throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
      }

      if (cotizacion.estado.nombre_estado !== 'ENVIADA') {
        throw new BadRequestException(
          `Solo cotizaciones ENVIADA pueden rechazarse. Estado: ${cotizacion.estado.nombre_estado}`,
        );
      }

      const estadoRechazada = await this.prisma.estados_cotizacion.findFirst({
        where: { nombre_estado: 'RECHAZADA' },
      });

      await this.prisma.cotizaciones.update({
        where: { id_cotizacion: idCotizacion },
        data: {
          id_estado: estadoRechazada?.id_estado,
          motivo_rechazo: motivoRechazo,
          rechazada_por: rechazadoPor,
          fecha_rechazo: new Date(),
          fecha_modificacion: new Date(),
        },
      });

      this.logger.log(`✅ Cotización ${cotizacion.numero_cotizacion} rechazada por cliente`);

      return {
        success: true,
        idCotizacion,
        numeroCotizacion: cotizacion.numero_cotizacion,
        estado: 'RECHAZADA',
        mensaje: 'Cotización rechazada por cliente',
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== PROPUESTAS CORRECTIVAS ====================

  /**
   * Crea una propuesta correctiva desde una orden de servicio
   * - Solo desde órdenes EN_PROCESO
   * - Genera número automático PROP-YYYY-XXXX
   */
  async crearPropuestaCorrectiva(input: CrearPropuestaInput): Promise<CotizacionResult> {
    try {
      this.logger.log(`Creando propuesta correctiva desde orden ${input.idOrdenServicio}`);

      // Verificar orden existe y está EN_PROCESO
      const orden = await this.prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: input.idOrdenServicio },
        include: {
          cliente: { include: { persona: true } },
          equipo: true,
          estado: true,
        },
      });

      if (!orden) {
        throw new NotFoundException(`Orden de servicio ${input.idOrdenServicio} no encontrada`);
      }

      if (orden.estado.nombre_estado !== 'EN_PROCESO') {
        throw new BadRequestException(
          `Solo órdenes EN_PROCESO pueden generar propuestas. Estado actual: ${orden.estado.nombre_estado}`,
        );
      }

      // Generar número de propuesta
      const year = new Date().getFullYear();
      const ultimaPropuesta = await this.prisma.propuestas_correctivo.findFirst({
        where: {
          numero_propuesta: { startsWith: `PROP-${year}-` },
        },
        orderBy: { id_propuesta: 'desc' },
      });

      let consecutivo = 1;
      if (ultimaPropuesta) {
        const matches = ultimaPropuesta.numero_propuesta.match(/PROP-\d{4}-(\d{4})/);
        if (matches) {
          consecutivo = parseInt(matches[1]) + 1;
        }
      }
      const numeroPropuesta = `PROP-${year}-${consecutivo.toString().padStart(4, '0')}`;

      // Obtener estado BORRADOR
      const estadoBorrador = await this.prisma.estados_cotizacion.findFirst({
        where: { nombre_estado: 'BORRADOR' },
      });

      // Crear propuesta
      const propuesta = await this.prisma.propuestas_correctivo.create({
        data: {
          numero_propuesta: numeroPropuesta,
          id_orden_servicio: input.idOrdenServicio,
          id_cliente: orden.id_cliente,
          id_equipo: orden.id_equipo,
          descripcion_problema: input.descripcionHallazgo,
          solucion_propuesta: input.descripcionSolucion,
          categoria: input.tipoPropuesta,
          prioridad: input.prioridad,
          id_estado: estadoBorrador?.id_estado,
          fecha_propuesta: new Date(),
          fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          subtotal_servicios: 0,
          subtotal_componentes: 0,
          total_propuesta: 0,
          propuesta_por: input.creadaPor,
        },
      });

      this.logger.log(`✅ Propuesta correctiva creada: ${numeroPropuesta}`);

      return {
        success: true,
        idCotizacion: propuesta.id_propuesta,
        numeroCotizacion: numeroPropuesta,
        estado: 'BORRADOR',
        mensaje: `Propuesta ${numeroPropuesta} creada exitosamente`,
      };
    } catch (error) {
      this.logger.error(`Error creando propuesta: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Convierte una propuesta aprobada en orden de servicio
   */
  async convertirPropuestaAOrden(
    idPropuesta: number,
    convertidaPor: number,
  ): Promise<CotizacionResult> {
    try {
      const propuesta = await this.prisma.propuestas_correctivo.findUnique({
        where: { id_propuesta: idPropuesta },
        include: {
          orden_servicio: { include: { cliente: { include: { persona: true } }, sede: true } },
          estado: true,
        },
      });

      if (!propuesta) {
        throw new NotFoundException(`Propuesta ${idPropuesta} no encontrada`);
      }

      if (propuesta.estado?.nombre_estado !== 'APROBADA') {
        throw new BadRequestException(
          `Solo propuestas APROBADAS pueden convertirse. Estado: ${propuesta.estado?.nombre_estado}`,
        );
      }

      if (propuesta.id_orden_servicio_generada) {
        throw new BadRequestException(
          `Propuesta ya convertida en orden ${propuesta.id_orden_servicio_generada}`,
        );
      }

      // Generar número de orden
      const numeracion = await this.numeracionService.generarNumero('ORDEN_SERVICIO');

      // Obtener estado PROGRAMADA
      const estadoProgramada = await this.prisma.estados_orden.findFirst({
        where: { nombre_estado: 'PROGRAMADA' },
      });

      // Crear orden y actualizar propuesta en transacción
      const result = await this.prisma.$transaction(async (prisma) => {
        const orden = await prisma.ordenes_servicio.create({
          data: {
            numero_orden: numeracion.codigo,
            id_cliente: propuesta.id_cliente,
            id_sede: propuesta.orden_servicio?.id_sede,
            id_equipo: propuesta.id_equipo,
            id_estado_actual: estadoProgramada?.id_estado,
            descripcion_inicial: propuesta.solucion_propuesta,
            prioridad: propuesta.prioridad || 'NORMAL',
            origen_solicitud: 'CORRECTIVO',
            creado_por: convertidaPor,
          },
        });

        await prisma.propuestas_correctivo.update({
          where: { id_propuesta: idPropuesta },
          data: {
            id_orden_servicio_generada: orden.id_orden_servicio,
            fecha_conversion_os: new Date(),
          },
        });

        return orden;
      });

      this.logger.log(
        `✅ Propuesta ${propuesta.numero_propuesta} convertida a orden ${numeracion.codigo}`,
      );

      return {
        success: true,
        idCotizacion: result.id_orden_servicio,
        numeroCotizacion: numeracion.codigo,
        estado: 'PROGRAMADA',
        mensaje: `Propuesta convertida exitosamente a orden ${numeracion.codigo}`,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== CONSULTAS ====================

  /**
   * Obtiene el resumen completo de una cotización
   */
  async obtenerCotizacion(idCotizacion: number): Promise<any> {
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: {
        cliente: { include: { persona: true } },
        sede: true,
        equipo: true,
        estado: true,
        items_servicios: { include: { servicio: true } },
        items_componentes: { include: { catalogo_componentes: true } },
        aprobaciones: true,
      },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }

    return cotizacion;
  }

  /**
   * Lista cotizaciones pendientes de aprobación interna
   */
  async listarPendientesAprobacion(): Promise<any[]> {
    return this.prisma.aprobaciones_cotizacion.findMany({
      where: { estado_aprobacion: 'PENDIENTE' },
      include: {
        cotizacion: {
          include: {
            cliente: { include: { persona: true } },
            estado: true,
          },
        },
      },
      orderBy: { fecha_solicitud: 'asc' },
    });
  }

  // ==================== MÉTODOS AUXILIARES ====================

  private async verificarCotizacionEditable(idCotizacion: number): Promise<any> {
    const cotizacion = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: idCotizacion },
      include: { estado: true },
    });

    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${idCotizacion} no encontrada`);
    }

    if (cotizacion.estado.nombre_estado !== 'BORRADOR') {
      throw new BadRequestException(
        `Solo cotizaciones en BORRADOR pueden editarse. Estado actual: ${cotizacion.estado.nombre_estado}`,
      );
    }

    return cotizacion;
  }

  private calcularSubtotalItem(
    cantidad: number,
    precioUnitario: number,
    descuentoPorcentaje: number,
  ): number {
    const factor = 1 - descuentoPorcentaje / 100;
    return cantidad * precioUnitario * factor;
  }

  private formatearTotales(totales: any): CotizacionResult['totales'] {
    return {
      subtotalServicios: totales.subtotal_servicios.toString(),
      subtotalComponentes: totales.subtotal_componentes.toString(),
      subtotalGeneral: totales.subtotal_general.toString(),
      descuentoValor: totales.descuento_valor.toString(),
      ivaValor: totales.iva_valor.toString(),
      totalCotizacion: totales.total_cotizacion.toString(),
    };
  }

  private prepararDatosPDF(cotizacion: any, input: EnviarCotizacionInput): any {
    const clientePersona = cotizacion.cliente?.persona;
    const empleadoPersona = cotizacion.empleados?.persona;

    return {
      numeroCotizacion: cotizacion.numero_cotizacion,
      fecha: new Date(cotizacion.fecha_cotizacion).toLocaleDateString('es-CO'),
      validezDias: cotizacion.dias_validez || 30,
      cliente: {
        nombre:
          clientePersona?.razon_social || clientePersona?.nombre_completo || 'N/A',
        nit: clientePersona?.numero_identificacion || 'N/A',
        direccion: clientePersona?.direccion_principal || 'N/A',
        telefono: clientePersona?.telefono_principal || 'N/A',
        email: clientePersona?.email_principal || 'N/A',
        contacto: input.destinatarioNombre,
      },
      vendedor: {
        nombre: empleadoPersona
          ? `${empleadoPersona.primer_nombre || ''} ${empleadoPersona.primer_apellido || ''}`.trim()
          : 'Equipo MEKANOS',
        cargo: 'Asesor Comercial',
        telefono: empleadoPersona?.celular || 'N/A',
        email: empleadoPersona?.email_principal || 'N/A',
      },
      servicios:
        cotizacion.items_servicios?.map((item: any) => ({
          descripcion: item.descripcion_personalizada || item.servicio?.nombre_servicio,
          cantidad: Number(item.cantidad),
          precioUnitario: Number(item.precio_unitario),
          descuento: Number(item.descuento_porcentaje || 0),
          subtotal: Number(item.subtotal),
        })) || [],
      componentes:
        cotizacion.items_componentes?.map((item: any) => ({
          codigo: item.catalogo_componentes?.codigo_interno || item.referencia_manual || '',
          descripcion: item.descripcion || item.catalogo_componentes?.descripcion_corta,
          cantidad: Number(item.cantidad),
          precioUnitario: Number(item.precio_unitario),
          descuento: Number(item.descuento_porcentaje || 0),
          subtotal: Number(item.subtotal),
        })) || [],
      subtotalServicios: Number(cotizacion.subtotal_servicios || 0),
      subtotalComponentes: Number(cotizacion.subtotal_componentes || 0),
      subtotalGeneral: Number(cotizacion.subtotal_general || 0),
      descuentoGlobal: {
        tipo: 'valor',
        valor: Number(cotizacion.descuento_valor || 0),
        monto: Number(cotizacion.descuento_valor || 0),
      },
      baseImponible: Number(cotizacion.subtotal_con_descuento || 0),
      iva: {
        porcentaje: Number(cotizacion.iva_porcentaje || 19),
        monto: Number(cotizacion.iva_valor || 0),
      },
      total: Number(cotizacion.total_cotizacion || 0),
      formaPago: cotizacion.forma_pago || 'Contado',
      tiempoEntrega: cotizacion.tiempo_estimado_dias
        ? `${cotizacion.tiempo_estimado_dias} días`
        : 'Por confirmar',
      garantia: cotizacion.meses_garantia
        ? `${cotizacion.meses_garantia} meses`
        : 'Garantía estándar',
      notas: cotizacion.terminos_condiciones || '',
      estado: cotizacion.estado?.nombre_estado || 'ENVIADA',
    };
  }

  private generarEmailCotizacion(cotizacion: any, destinatarioNombre: string): string {
    const total = Number(cotizacion.total_cotizacion || 0);
    const subtotalServicios = Number(cotizacion.subtotal_servicios || 0);
    const subtotalComponentes = Number(cotizacion.subtotal_componentes || 0);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #244673; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background: #f9f9f9; }
    .highlight { background: #3290A6; color: white; padding: 10px; margin: 10px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; border: 1px solid #ddd; }
    th { background: #244673; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>MEKANOS S.A.S</h1>
      <p>Especialistas en Equipos Electrógenos</p>
    </div>
    <div class="content">
      <p>Estimado/a <strong>${destinatarioNombre}</strong>,</p>
      <p>Es un placer contactarle. Adjunto encontrará nuestra propuesta comercial:</p>
      <div class="highlight">
        <strong>Cotización:</strong> ${cotizacion.numero_cotizacion}<br>
        <strong>Fecha:</strong> ${new Date(cotizacion.fecha_cotizacion).toLocaleDateString('es-CO')}<br>
        <strong>Validez:</strong> ${cotizacion.dias_validez || 30} días
      </div>
      <table>
        <tr><th>Concepto</th><th style="text-align:right">Valor</th></tr>
        <tr><td>Subtotal Servicios</td><td style="text-align:right">$ ${subtotalServicios.toLocaleString('es-CO')}</td></tr>
        <tr><td>Subtotal Componentes</td><td style="text-align:right">$ ${subtotalComponentes.toLocaleString('es-CO')}</td></tr>
        <tr><td><strong>TOTAL</strong></td><td style="text-align:right"><strong>$ ${total.toLocaleString('es-CO')}</strong></td></tr>
      </table>
      <p>Quedamos atentos a cualquier consulta.</p>
      <p>Cordialmente,<br><strong>Equipo MEKANOS S.A.S</strong></p>
    </div>
    <div class="footer">
      <p><strong>MEKANOS S.A.S</strong> | Cartagena de Indias, Colombia<br>
      Tel: (605) 642-1234 | www.mekanosrep.com</p>
    </div>
  </div>
</body>
</html>`.trim();
  }
}

