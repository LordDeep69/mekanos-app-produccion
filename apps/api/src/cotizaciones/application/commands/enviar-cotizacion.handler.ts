import { Injectable, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EnviarCotizacionCommand } from './enviar-cotizacion.command';
import { CotizacionesRepository } from '../../domain/cotizaciones.repository.interface';
import { PrismaService } from '@mekanos/database';

/**
 * ENVIAR COTIZACION HANDLER
 *
 * Flujo:
 * 1. Verificar cotización existe
 * 2. Validar estado APROBADA_INTERNA (id_estado = 3)
 * 3. Cambiar estado a ENVIADA (id_estado = 4)
 * 4. Registrar historial_envios
 * 5. TODO: Enviar email real (Fase 7 - integración Resend)
 */
@Injectable()
@CommandHandler(EnviarCotizacionCommand)
export class EnviarCotizacionHandler implements ICommandHandler<EnviarCotizacionCommand> {
  constructor(
    @Inject('CotizacionesRepository')
    private readonly repository: CotizacionesRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: EnviarCotizacionCommand): Promise<any> {
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

    // 3. Cambiar estado a ENVIADA (id_estado = 4)
    await this.repository.update(command.idCotizacion, {
      id_estado: 4, // ENVIADA
    });

    // 4. Registrar historial_envios
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
        asunto_email: `Cotización ${cotizacion.numero_cotizacion} - Mekanos S.A.S`,
        cuerpo_email: `Estimado/a ${command.destinatarioNombre},\n\nAdjunto encontrará la cotización ${cotizacion.numero_cotizacion}.\n\nSaludos cordiales,\nMekanos S.A.S`,
        estado_envio: 'ENVIADO',
        // TODO: ruta_pdf_generado, hash_pdf_sha256, id_mensaje_externo (Fase 7)
      },
    });

    // 5. TODO: Enviar email real con Resend + PDF adjunto (Fase 7)
    // await this.emailService.sendCotizacion(...)

    return {
      message: 'Cotización enviada exitosamente',
      cotizacion: await this.repository.findById(command.idCotizacion),
      historial_envio: historialEnvio,
    };
  }
}
