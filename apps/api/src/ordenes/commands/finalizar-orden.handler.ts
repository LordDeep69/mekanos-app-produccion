import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { FinalizarOrdenCommand } from './finalizar-orden.command';
import { OrdenServicioEntity, IOrdenServicioRepository, OrdenServicioId } from '@mekanos/core';
import { PdfService } from '../../pdf/pdf.service';
import { R2StorageService } from '../../storage/r2-storage.service';
import { EmailService } from '../../email/email.service';

@CommandHandler(FinalizarOrdenCommand)
export class FinalizarOrdenHandler implements ICommandHandler<FinalizarOrdenCommand> {
  constructor(
    @Inject('IOrdenServicioRepository')
    private readonly ordenRepository: IOrdenServicioRepository,
    private readonly pdfService: PdfService,
    private readonly r2Storage: R2StorageService,
    private readonly emailService: EmailService
  ) {}

  async execute(command: FinalizarOrdenCommand): Promise<OrdenServicioEntity> {
    const { ordenId, observaciones } = command;

    const orden = await this.ordenRepository.findById(OrdenServicioId.from(ordenId));
    if (!orden) {
      throw new NotFoundException(`Orden con ID ${ordenId} no encontrada`);
    }

    // Finalizar orden (cambio de estado)
    orden.finalizar(observaciones);
    const ordenGuardada = await this.ordenRepository.save(orden);

    // ========== GENERACIÓN AUTOMÁTICA PDF + EMAIL ==========
    // Non-blocking: Si falla, la orden ya está finalizada
    this.generateAndSendPdfAsync(ordenId, ordenGuardada.toObject().numeroOrden)
      .catch(error => {
        console.error(`❌ Error generando PDF/Email para orden ${ordenId}:`, error);
      });

    return ordenGuardada;
  }

  /**
   * Genera PDF y envía email en background
   * No bloquea la respuesta de finalización de la orden
   */
  private async generateAndSendPdfAsync(ordenId: string, numeroOrden: string): Promise<void> {
    try {
      console.log(`📄 Generando PDF para orden ${numeroOrden}...`);

      // 1. Obtener orden del repositorio
      const orden = await this.ordenRepository.findById(OrdenServicioId.from(ordenId));
      if (!orden) {
        throw new Error(`Orden ${ordenId} no encontrada`);
      }

      const ordenObj = orden.toObject();

      // 2. Generar PDF con los datos de la orden
      const pdfData = {
        numeroOrden: ordenObj.numeroOrden,
        estado: ordenObj.estado,
        prioridad: ordenObj.prioridad,
        clienteNombre: String(ordenObj.clienteId), // TODO: Resolver nombre desde ClienteRepository
        equipoNombre: String(ordenObj.equipoId), // TODO: Resolver nombre desde EquipoRepository
        fechaCreacion: ordenObj.createdAt,
        fechaProgramada: ordenObj.fechaProgramada,
        fechaInicio: ordenObj.fechaInicio,
        fechaFinalizacion: ordenObj.fechaFin,
        tecnicoAsignado: ordenObj.tecnicoAsignadoId ? String(ordenObj.tecnicoAsignadoId) : undefined,
        descripcion: ordenObj.descripcion,
        observaciones: ordenObj.observaciones,
        firmaDigital: ordenObj.firmaClienteUrl
      };

      const pdfBuffer = await this.pdfService.generateOrdenServicioPdf(pdfData);
      console.log(`✅ PDF generado (${pdfBuffer.length} bytes)`);

      // 3. Subir a R2 (solo si está configurado)
      let pdfUrl: string;
      if (this.r2Storage.isConfigured()) {
        const filename = `orden-${numeroOrden}-${Date.now()}.pdf`;
        pdfUrl = await this.r2Storage.uploadPDF(pdfBuffer, filename);
        console.log(`✅ PDF subido a R2: ${pdfUrl}`);
      } else {
        pdfUrl = `http://localhost:3000/ordenes/${ordenId}/pdf`;
        console.log(`⚠️ R2 no configurado - URL local: ${pdfUrl}`);
      }

      // 3. Enviar email al cliente (solo si Resend está configurado)
      // TODO: Obtener email del cliente desde ClienteRepository
      const clienteEmail = process.env.TEST_CLIENT_EMAIL || 'cliente@example.com';
      
      if (this.emailService.isConfigured()) {
        await this.emailService.sendOrdenCompletadaEmail(
          numeroOrden,
          clienteEmail,
          pdfUrl
        );
        console.log(`✅ Email enviado a ${clienteEmail}`);
      } else {
        console.log(`⚠️ Resend no configurado - Email no enviado a ${clienteEmail}`);
      }

      console.log(`🎉 Proceso PDF/Email completado para orden ${numeroOrden}`);

    } catch (error) {
      // Log error pero no propagar (orden ya está finalizada)
      console.error(`❌ Error en proceso PDF/Email:`, error);
      throw error; // Re-throw para que el catch del caller lo capture
    }
  }
}
