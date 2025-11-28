import { PrismaService } from '@mekanos/database';
import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EmailService } from '../../../email/email.service';
import { PdfService } from '../../../pdf/pdf.service';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { EnviarCotizacionCommand } from './enviar-cotizacion.command';

/**
 * ENVIAR COTIZACION HANDLER
 *
 * Flujo:
 * 1. Verificar cotización existe
 * 2. Validar estado APROBADA_INTERNA (id_estado = 3)
 * 3. Generar PDF de la cotización
 * 4. Enviar email con PDF adjunto
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
  ) {}

  async execute(command: EnviarCotizacionCommand): Promise<any> {
    this.logger.log(`Enviando cotización ${command.idCotizacion} a ${command.destinatarioEmail}`);

    // 1. Verificar cotización existe
    const cotizacion = await this.repository.findById(command.idCotizacion);
    if (!cotizacion) {
      throw new NotFoundException(`Cotización ${command.idCotizacion} no encontrada`);
    }

    // 2. Validar estado APROBADA_INTERNA (id_estado = 3)
    if (cotizacion.id_estado !== 3) {
      throw new BadRequestException(
        `Solo cotizaciones APROBADA_INTERNA pueden enviarse. Estado actual: ${cotizacion.id_estado}`
      );
    }

    // 3. Obtener datos completos para generar PDF
    const cotizacionCompleta = await this.prisma.cotizaciones.findUnique({
      where: { id_cotizacion: command.idCotizacion },
      include: {
        cliente: {
          include: {
            persona: true,
          },
        },
        empleados: {
          include: {
            persona: true,
          },
        },
        estado: true,
        items_servicios: {
          include: {
            servicio: true,
          },
        },
        items_componentes: {
          include: {
            catalogo_componentes: true,
          },
        },
      },
    });

    // 4. Construir datos para PDF
    const clientePersona = cotizacionCompleta?.cliente?.persona;
    const empleadoPersona = cotizacionCompleta?.empleados?.persona;

    const subtotalServicios = cotizacionCompleta?.items_servicios?.reduce(
      (acc, item) => acc + (Number(item.subtotal) || 0), 0
    ) || 0;
    
    const subtotalComponentes = cotizacionCompleta?.items_componentes?.reduce(
      (acc, item) => acc + (Number(item.subtotal) || 0), 0
    ) || 0;

    const subtotalGeneral = subtotalServicios + subtotalComponentes;
    const descuentoMonto = Number(cotizacionCompleta?.descuento_valor) || 0;
    const baseImponible = subtotalGeneral - descuentoMonto;
    const ivaPorcentaje = Number(cotizacionCompleta?.iva_porcentaje) || 19;
    const ivaMonto = Number(cotizacionCompleta?.iva_valor) || (baseImponible * ivaPorcentaje / 100);
    const total = Number(cotizacionCompleta?.total_cotizacion) || (baseImponible + ivaMonto);

    const datosCotizacion = {
      numeroCotizacion: cotizacionCompleta?.numero_cotizacion || `COT-${command.idCotizacion}`,
      fecha: cotizacionCompleta?.fecha_cotizacion
        ? new Date(cotizacionCompleta.fecha_cotizacion).toLocaleDateString('es-CO')
        : new Date().toLocaleDateString('es-CO'),
      validezDias: cotizacionCompleta?.dias_validez || 30,

      cliente: {
        nombre: clientePersona?.razon_social || clientePersona?.nombre_comercial || clientePersona?.nombre_completo || 'N/A',
        nit: clientePersona?.numero_identificacion || 'N/A',
        direccion: clientePersona?.direccion_principal || 'N/A',
        telefono: clientePersona?.telefono_principal || clientePersona?.celular || 'N/A',
        email: clientePersona?.email_principal || 'N/A',
        contacto: command.destinatarioNombre || 'N/A',
      },

      vendedor: {
        nombre: empleadoPersona
          ? `${empleadoPersona.primer_nombre || ''} ${empleadoPersona.primer_apellido || ''}`.trim()
          : 'N/A',
        cargo: 'Asesor Comercial',
        telefono: empleadoPersona?.celular || empleadoPersona?.telefono_principal || 'N/A',
        email: empleadoPersona?.email_principal || 'N/A',
      },

      servicios: cotizacionCompleta?.items_servicios?.map(item => ({
        descripcion: item.descripcion_personalizada || item.servicio?.nombre_servicio || 'Servicio',
        cantidad: Number(item.cantidad) || 1,
        precioUnitario: Number(item.precio_unitario) || 0,
        descuento: Number(item.descuento_porcentaje) || 0,
        subtotal: Number(item.subtotal) || 0,
      })) || [],

      componentes: cotizacionCompleta?.items_componentes?.map(item => ({
        codigo: item.catalogo_componentes?.codigo_interno || item.referencia_manual || 'N/A',
        descripcion: item.descripcion || item.catalogo_componentes?.descripcion_corta || 'Componente',
        cantidad: Number(item.cantidad) || 1,
        precioUnitario: Number(item.precio_unitario) || 0,
        descuento: Number(item.descuento_porcentaje) || 0,
        subtotal: Number(item.subtotal) || 0,
      })) || [],

      subtotalServicios,
      subtotalComponentes,
      subtotalGeneral,
      descuentoGlobal: {
        tipo: 'valor' as const,
        valor: descuentoMonto,
        monto: descuentoMonto,
      },
      baseImponible,
      iva: {
        porcentaje: ivaPorcentaje,
        monto: ivaMonto,
      },
      total,

      formaPago: cotizacionCompleta?.forma_pago || 'Contado',
      tiempoEntrega: cotizacionCompleta?.tiempo_estimado_dias ? `${cotizacionCompleta.tiempo_estimado_dias} días` : 'Por confirmar',
      garantia: cotizacionCompleta?.meses_garantia ? `${cotizacionCompleta.meses_garantia} meses` : 'Garantía estándar',
      notas: cotizacionCompleta?.terminos_condiciones || '',
      estado: cotizacionCompleta?.estado?.nombre_estado || 'APROBADA_INTERNA',
    };

    // 5. Generar PDF
    this.logger.log(`Generando PDF para cotización ${cotizacion.numero_cotizacion}...`);
    let pdfResult: { buffer: Buffer; filename: string } | null = null;
    try {
      pdfResult = await this.pdfService.generarPDFCotizacion(datosCotizacion);
      this.logger.log(`PDF generado: ${pdfResult.filename} (${pdfResult.buffer.length} bytes)`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(`Error generando PDF: ${errorMessage}`);
      // Continuamos sin PDF si falla
    }

    // 6. Enviar email con PDF adjunto
    const asunto = `Cotización ${cotizacion.numero_cotizacion} - MEKANOS S.A.S`;
    const cuerpoHtml = this.generarCuerpoEmail(datosCotizacion, command.destinatarioNombre);
    
    let emailEnviado = false;
    let mensajeExterno = null;

    try {
      const resultadoEmail = await this.emailService.sendEmail({
        to: command.destinatarioEmail,
        cc: command.emailsCopia?.join(', '),
        subject: asunto,
        html: cuerpoHtml,
        attachments: pdfResult ? [{
          filename: pdfResult.filename,
          content: pdfResult.buffer,
          contentType: 'application/pdf',
        }] : undefined,
      });

      emailEnviado = resultadoEmail.success;
      mensajeExterno = resultadoEmail.messageId;
      this.logger.log(`Email enviado: ${emailEnviado}, messageId: ${mensajeExterno}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      this.logger.error(`Error enviando email: ${errorMessage}`);
    }

    // 7. Cambiar estado a ENVIADA (id_estado = 4)
    await this.repository.update(command.idCotizacion, {
      id_estado: 4, // ENVIADA
    });

    // 8. Registrar historial_envios
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

    this.logger.log(`Cotización ${cotizacion.numero_cotizacion} enviada exitosamente`);

    return {
      message: 'Cotización enviada exitosamente',
      cotizacion: await this.repository.findById(command.idCotizacion),
      historial_envio: historialEnvio,
      pdf_generado: !!pdfResult,
      email_enviado: emailEnviado,
    };
  }

  /**
   * Genera el cuerpo HTML del email de cotización
   */
  private generarCuerpoEmail(datos: any, destinatarioNombre: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #244673; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; background: #f9f9f9; }
    .highlight { background: #3290A6; color: white; padding: 10px; margin: 10px 0; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    .button { 
      display: inline-block; 
      background: #56A672; 
      color: white; 
      padding: 12px 24px; 
      text-decoration: none; 
      border-radius: 4px; 
      margin: 20px 0;
    }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
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
      
      <p>Es un placer contactarle. A continuación encontrará nuestra propuesta comercial:</p>
      
      <div class="highlight">
        <strong>Cotización:</strong> ${datos.numeroCotizacion}<br>
        <strong>Fecha:</strong> ${datos.fecha}<br>
        <strong>Validez:</strong> ${datos.validezDias} días
      </div>
      
      <table>
        <tr>
          <th>Concepto</th>
          <th style="text-align: right;">Valor</th>
        </tr>
        <tr>
          <td>Subtotal Servicios</td>
          <td style="text-align: right;">$ ${datos.subtotalServicios.toLocaleString('es-CO')}</td>
        </tr>
        <tr>
          <td>Subtotal Componentes</td>
          <td style="text-align: right;">$ ${datos.subtotalComponentes.toLocaleString('es-CO')}</td>
        </tr>
        <tr>
          <td><strong>TOTAL</strong></td>
          <td style="text-align: right;"><strong>$ ${datos.total.toLocaleString('es-CO')}</strong></td>
        </tr>
      </table>
      
      <p>Adjunto encontrará el documento PDF con el detalle completo de la cotización.</p>
      
      <p><strong>Condiciones:</strong></p>
      <ul>
        <li>Forma de pago: ${datos.formaPago}</li>
        <li>Tiempo de entrega: ${datos.tiempoEntrega}</li>
        <li>Garantía: ${datos.garantia}</li>
      </ul>
      
      <p>Quedamos atentos a cualquier consulta o aclaración que requiera.</p>
      
      <p>Cordialmente,</p>
      <p>
        <strong>${datos.vendedor.nombre}</strong><br>
        ${datos.vendedor.cargo}<br>
        ${datos.vendedor.telefono}<br>
        ${datos.vendedor.email}
      </p>
    </div>
    
    <div class="footer">
      <p>
        <strong>MEKANOS S.A.S</strong><br>
        Cartagena de Indias, Colombia<br>
        Tel: (605) 642-1234 | www.mekanosrep.com
      </p>
      <p>Este mensaje es confidencial y está destinado únicamente al destinatario.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
