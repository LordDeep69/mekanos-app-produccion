import { PrismaService } from '@mekanos/database';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfiguracionOrganizacionService } from '../../../configuracion-organizacion/configuracion-organizacion.service';
import { EmailService } from '../../../email/email.service';
import {
  DEFAULT_ORG_BRANDING,
  OrgBrandingContext,
  buildOrgBranding,
  escapeBrandHtml,
  formatCurrencyOrg,
  formatDateOrg,
  resolveOrgBranding,
} from '../../../pdf/org-branding.types';
import { PdfAssemblerService } from '../../../pdf/pdf-assembler.service';
import { PdfService } from '../../../pdf/pdf.service';
import { DatosCotizacionPDF } from '../../../pdf/templates/cotizacion.template';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { EnviarCotizacionCommand } from './enviar-cotizacion.command';

/**
 * ENVIAR COTIZACION HANDLER (White-Label)
 *
 * Flujo:
 * 1. Verificar cotización existe
 * 2. Validar estado APROBADA_INTERNA (id_estado = 3)
 * 3. Ensamblar y generar PDF corporativo de la cotización
 * 4. Enviar email White-Label con PDF adjunto
 * 5. Cambiar estado a ENVIADA (id_estado = 4)
 * 6. Registrar historial_envios
 */
@Injectable()
@CommandHandler(EnviarCotizacionCommand)
export class EnviarCotizacionHandler implements ICommandHandler<EnviarCotizacionCommand> {
  private readonly logger = new Logger(EnviarCotizacionHandler.name);

  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
    private readonly prisma: PrismaService,
    private readonly pdfService: PdfService,
    private readonly emailService: EmailService,
    @Optional() private readonly pdfAssembler?: PdfAssemblerService,
    @Optional() private readonly configOrgService?: ConfiguracionOrganizacionService,
  ) {}

  private async resolveBranding(): Promise<OrgBrandingContext> {
    if (this.pdfAssembler) {
      return this.pdfAssembler.resolveBranding();
    }
    if (typeof (this.pdfService as any)?.resolveBranding === 'function') {
      return (this.pdfService as any).resolveBranding();
    }
    if (this.configOrgService) {
      const ctx = await this.configOrgService.getContext().catch(() => null);
      if (ctx) return buildOrgBranding(ctx);
    }
    return DEFAULT_ORG_BRANDING;
  }

  async execute(command: EnviarCotizacionCommand): Promise<any> {
    this.logger.log(`Enviando cotización ${command.idCotizacion} a ${command.destinatarioEmail}`);

    const cotizacion = await this.repository.findById(command.idCotizacion);
    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${command.idCotizacion} no encontrada`);
    }

    if (cotizacion.id_estado !== 3) {
      throw new BadRequestException(
        `Solo cotizaciones APROBADA_INTERNA pueden enviarse. Estado actual: ${cotizacion.id_estado}`,
      );
    }

    let brand: OrgBrandingContext;
    let datosCotizacion: DatosCotizacionPDF;
    let vendedorTelefono = 'N/A';
    let vendedorEmail = 'N/A';

    if (this.pdfAssembler) {
      const assembled = await this.pdfAssembler.assembleCotizacionPdf(command.idCotizacion);
      brand = assembled.branding;
      datosCotizacion = assembled.datosCotizacion;
      const empPersona = assembled.cotizacion?.empleados?.persona;
      vendedorTelefono = empPersona?.celular || empPersona?.telefono_principal || 'N/A';
      vendedorEmail = empPersona?.email_principal || 'N/A';
      if (command.destinatarioNombre && !datosCotizacion.cliente.contacto) {
        datosCotizacion.cliente.contacto = command.destinatarioNombre;
      }
    } else {
      brand = await this.resolveBranding();
      const fallback = await this.buildFallbackDatosCotizacion(command, cotizacion, brand);
      datosCotizacion = fallback.datosCotizacion;
      vendedorTelefono = fallback.vendedorTelefono;
      vendedorEmail = fallback.vendedorEmail;
    }

    let pdfResult: { buffer: Buffer; filename: string } | null = null;
    try {
      pdfResult = await this.pdfService.generarPDFCotizacion(datosCotizacion);
      this.logger.log(`PDF generado: ${pdfResult.filename} (${pdfResult.buffer.length} bytes)`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(`Error generando PDF: ${errorMessage}`);
    }

    const asunto = `Cotización ${cotizacion.numero_cotizacion} - ${brand.nombreComercial}`;
    const cuerpoHtml = this.generarCuerpoEmail(
      datosCotizacion,
      command.destinatarioNombre,
      {
        nombre: datosCotizacion.elaboradoPor,
        cargo: datosCotizacion.cargoElaborador || 'Asesor Comercial',
        telefono: vendedorTelefono,
        email: vendedorEmail,
      },
      brand,
    );

    let emailEnviado = false;
    let mensajeExterno: string | undefined;

    try {
      const resultadoEmail = await this.emailService.sendEmail({
        to: command.destinatarioEmail,
        cc: command.emailsCopia?.join(', '),
        subject: asunto,
        html: cuerpoHtml,
        attachments: pdfResult
          ? [
              {
                filename: pdfResult.filename,
                content: pdfResult.buffer,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
      });

      emailEnviado = resultadoEmail.success;
      mensajeExterno = resultadoEmail.messageId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(`Error enviando email: ${errorMessage}`);
    }

    await this.repository.update(command.idCotizacion, {
      id_estado: 4, // ENVIADA
    });

    const historialEnvio = await this.prisma.historial_envios.create({
      data: {
        tipo_documento: 'COTIZACION',
        id_cotizacion: command.idCotizacion,
        fecha_envio: new Date(),
        enviado_por: command.enviadoPor,
        canal_envio: 'EMAIL',
        destinatario_email: command.destinatarioEmail,
        destinatario_nombre: command.destinatarioNombre,
        emails_copia: command.emailsCopia,
        asunto_email: asunto,
        cuerpo_email: cuerpoHtml,
        estado_envio: emailEnviado ? 'ENVIADO' : 'PENDIENTE',
        ruta_pdf_generado: pdfResult?.filename,
        id_mensaje_externo: mensajeExterno,
      },
    });

    return {
      message: 'Cotización enviada exitosamente',
      cotizacion: await this.repository.findById(command.idCotizacion),
      historial_envio: historialEnvio,
      pdf_generado: !!pdfResult,
      email_enviado: emailEnviado,
    };
  }

  private async buildFallbackDatosCotizacion(
    command: EnviarCotizacionCommand,
    cotizacion: any,
    brand: OrgBrandingContext,
  ): Promise<{
    datosCotizacion: DatosCotizacionPDF;
    vendedorTelefono: string;
    vendedorEmail: string;
  }> {
    const cotizacionCompleta = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: command.idCotizacion },
      include: {
        clientes: { include: { persona: true } },
        empleados: { include: { persona: true } },
        estados_cotizacion: true,
        items_cotizacion_servicios: { include: { catalogo_servicios: true } },
        items_cotizacion_componentes: { include: { catalogo_componentes: true } },
      },
    });

    const clientePersona = cotizacionCompleta?.clientes?.persona;
    const empleadoPersona = cotizacionCompleta?.empleados?.persona;
    const subtotalServicios =
      cotizacionCompleta?.items_cotizacion_servicios?.reduce(
        (acc, item) => acc + (Number(item.subtotal) || 0),
        0,
      ) || 0;
    const subtotalComponentes =
      cotizacionCompleta?.items_cotizacion_componentes?.reduce(
        (acc, item) => acc + (Number(item.subtotal) || 0),
        0,
      ) || 0;
    const subtotalGeneral = subtotalServicios + subtotalComponentes;
    const descuentoPorcentaje = Number(cotizacionCompleta?.descuento_porcentaje) || 0;
    const descuentoMonto = Number(cotizacionCompleta?.descuento_valor) || 0;
    const baseImponible = subtotalGeneral - descuentoMonto;
    const ivaPorcentaje =
      cotizacionCompleta?.iva_porcentaje != null
        ? Number(cotizacionCompleta.iva_porcentaje)
        : brand.tasaImpuestoDefecto;
    const ivaMonto =
      cotizacionCompleta?.iva_valor != null
        ? Number(cotizacionCompleta.iva_valor)
        : (baseImponible * ivaPorcentaje) / 100;
    const total =
      cotizacionCompleta?.total_cotizacion != null
        ? Number(cotizacionCompleta.total_cotizacion)
        : baseImponible + ivaMonto;
    const diasValidez = cotizacionCompleta?.dias_validez ?? brand.validezCotizacionDiasDefecto;
    const fechaBase = cotizacionCompleta?.fecha_cotizacion
      ? new Date(cotizacionCompleta.fecha_cotizacion)
      : new Date();
    const fechaVencimientoBase = cotizacionCompleta?.fecha_vencimiento
      ? new Date(cotizacionCompleta.fecha_vencimiento)
      : new Date(fechaBase.getTime() + diasValidez * 86400000);
    const elaboradorNombre = empleadoPersona
      ? `${empleadoPersona.primer_nombre || ''} ${empleadoPersona.primer_apellido || ''}`.trim() ||
        'Asesor Comercial'
      : `Equipo ${brand.nombreComercial}`;

    return {
      vendedorTelefono:
        empleadoPersona?.celular ||
        empleadoPersona?.telefono_principal ||
        brand.telefonoPrincipal ||
        'N/A',
      vendedorEmail: empleadoPersona?.email_principal || brand.emailContacto || 'N/A',
      datosCotizacion: {
        branding: brand,
        numeroCotizacion:
          cotizacionCompleta?.numero_cotizacion || `COT-${command.idCotizacion}`,
        fechaCotizacion: formatDateOrg(fechaBase, brand),
        fechaVencimiento: formatDateOrg(fechaVencimientoBase, brand),
        diasValidez,
        version: cotizacionCompleta?.version || 1,
        cliente: {
          nombre:
            clientePersona?.razon_social ||
            clientePersona?.nombre_comercial ||
            clientePersona?.nombre_completo ||
            'N/A',
          nit: clientePersona?.numero_identificacion || 'N/A',
          direccion: clientePersona?.direccion_principal || brand.ciudadDefecto || 'N/A',
          telefono: clientePersona?.telefono_principal || clientePersona?.celular || 'N/A',
          email: clientePersona?.email_principal || 'N/A',
          contacto: command.destinatarioNombre || 'N/A',
        },
        asunto: cotizacionCompleta?.asunto || `Cotización ${cotizacion.numero_cotizacion}`,
        descripcionGeneral: cotizacionCompleta?.descripcion_general || undefined,
        alcanceTrabajo: cotizacionCompleta?.alcance_trabajo || undefined,
        exclusiones: cotizacionCompleta?.exclusiones || undefined,
        itemsServicios:
          cotizacionCompleta?.items_cotizacion_servicios?.map((item, idx) => ({
            orden: item.orden_item ?? idx + 1,
            descripcion:
              item.descripcion_personalizada ||
              item.catalogo_servicios?.nombre_servicio ||
              'Servicio',
            cantidad: Number(item.cantidad) || 1,
            unidad: item.unidad || 'UND',
            precioUnitario: Number(item.precio_unitario) || 0,
            descuentoPorcentaje: Number(item.descuento_porcentaje) || 0,
            subtotal: Number(item.subtotal) || 0,
          })) || [],
        itemsComponentes:
          cotizacionCompleta?.items_cotizacion_componentes?.map((item, idx) => ({
            orden: item.orden_item ?? idx + 1,
            descripcion:
              item.descripcion || item.catalogo_componentes?.descripcion_corta || 'Componente',
            referencia:
              item.catalogo_componentes?.codigo_interno || item.referencia_manual || undefined,
            cantidad: Number(item.cantidad) || 1,
            unidad: item.unidad || 'UND',
            precioUnitario: Number(item.precio_unitario) || 0,
            descuentoPorcentaje: Number(item.descuento_porcentaje) || 0,
            subtotal: Number(item.subtotal) || 0,
          })) || [],
        totales: {
          subtotalServicios,
          subtotalComponentes,
          subtotalGeneral,
          descuentoPorcentaje,
          descuentoValor: descuentoMonto,
          subtotalConDescuento: baseImponible,
          ivaPorcentaje,
          ivaValor: ivaMonto,
          totalCotizacion: total,
        },
        formaPago: cotizacionCompleta?.forma_pago || 'Contado',
        tiempoEstimadoDias: cotizacionCompleta?.tiempo_estimado_dias ?? undefined,
        mesesGarantia: cotizacionCompleta?.meses_garantia ?? brand.garantiaMesesDefecto,
        observacionesGarantia: cotizacionCompleta?.observaciones_garantia || undefined,
        terminosCondiciones: cotizacionCompleta?.terminos_condiciones || undefined,
        elaboradoPor: elaboradorNombre,
        cargoElaborador: 'Asesor Comercial',
      },
    };
  }

  /**
   * Genera el cuerpo HTML del email de cotización usando branding, colores y moneda del tenant.
   */
  generarCuerpoEmail(
    datos: DatosCotizacionPDF,
    destinatarioNombre: string,
    vendedor: { nombre: string; cargo: string; telefono: string; email: string },
    branding?: Partial<OrgBrandingContext>,
  ): string {
    const brand = resolveOrgBranding(branding || datos.branding);
    const { colores } = brand;
    const orgNombre = escapeBrandHtml(brand.nombreComercial);
    const ubicacion = [brand.ciudadDefecto, brand.paisDefecto]
      .filter(Boolean)
      .map(escapeBrandHtml)
      .join(', ');
    const footerContacto = [
      brand.telefonoPrincipal ? `Tel: ${escapeBrandHtml(brand.telefonoPrincipal)}` : null,
      brand.sitioWeb ? escapeBrandHtml(brand.sitioWeb) : null,
      brand.emailContacto ? escapeBrandHtml(brand.emailContacto) : null,
    ]
      .filter(Boolean)
      .join(' | ');

    return `
<!DOCTYPE html>
<html lang="${escapeBrandHtml(brand.locale || 'es')}">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: ${colores.text}; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${colores.primary}; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; background: ${colores.background}; }
    .highlight { background: ${colores.accent}; color: white; padding: 10px 14px; margin: 10px 0; border-radius: 4px; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: ${colores.mutedText}; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; border: 1px solid ${colores.border}; text-align: left; }
    th { background: ${colores.primary}; color: white; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${orgNombre}</h1>
      ${brand.eslogan ? `<p style="margin: 4px 0 0 0;">${escapeBrandHtml(brand.eslogan)}</p>` : ''}
    </div>

    <div class="content">
      <p>Estimado/a <strong>${escapeBrandHtml(destinatarioNombre)}</strong>,</p>

      <p>Es un placer contactarle. A continuación encontrará nuestra propuesta comercial:</p>

      <div class="highlight">
        <strong>Cotización:</strong> ${escapeBrandHtml(datos.numeroCotizacion)}<br>
        <strong>Fecha:</strong> ${escapeBrandHtml(datos.fechaCotizacion)}<br>
        <strong>Validez:</strong> ${datos.diasValidez} días
      </div>

      <table>
        <tr>
          <th>Concepto</th>
          <th style="text-align: right;">Valor</th>
        </tr>
        <tr>
          <td>Subtotal Servicios</td>
          <td style="text-align: right;">${escapeBrandHtml(formatCurrencyOrg(datos.totales.subtotalServicios, brand))}</td>
        </tr>
        <tr>
          <td>Subtotal Componentes</td>
          <td style="text-align: right;">${escapeBrandHtml(formatCurrencyOrg(datos.totales.subtotalComponentes, brand))}</td>
        </tr>
        <tr>
          <td><strong>TOTAL</strong></td>
          <td style="text-align: right;"><strong>${escapeBrandHtml(formatCurrencyOrg(datos.totales.totalCotizacion, brand))}</strong></td>
        </tr>
      </table>

      <p>Adjunto encontrará el documento PDF con el detalle completo de la cotización.</p>

      <p><strong>Condiciones:</strong></p>
      <ul>
        <li>Forma de pago: ${escapeBrandHtml(datos.formaPago)}</li>
        <li>Tiempo de entrega: ${datos.tiempoEstimadoDias ? `${datos.tiempoEstimadoDias} días` : 'Por confirmar'}</li>
        <li>Garantía: ${datos.mesesGarantia ? `${datos.mesesGarantia} meses` : 'Garantía estándar'}</li>
      </ul>

      <p>Quedamos atentos a cualquier consulta o aclaración que requiera.</p>

      <p>Cordialmente,</p>
      <p>
        <strong>${escapeBrandHtml(vendedor.nombre)}</strong><br>
        ${escapeBrandHtml(vendedor.cargo)}<br>
        ${escapeBrandHtml(vendedor.telefono)}<br>
        ${escapeBrandHtml(vendedor.email)}
      </p>
    </div>

    <div class="footer">
      <p>
        <strong>${orgNombre}</strong><br>
        ${ubicacion ? `${ubicacion}<br>` : ''}
        ${footerContacto}
      </p>
      <p>Este mensaje es confidencial y está destinado únicamente al destinatario.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
