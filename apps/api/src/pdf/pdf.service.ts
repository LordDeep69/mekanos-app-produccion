import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

/**
 * Datos necesarios para generar el PDF de una orden
 */
export interface OrdenPdfData {
  numeroOrden: string;
  estado: string;
  prioridad: string;
  clienteNombre?: string | null;
  equipoNombre?: string | null;
  fechaCreacion?: Date | null;
  fechaProgramada?: Date | null;
  fechaInicio?: Date | null;
  fechaFinalizacion?: Date | null;
  tecnicoAsignado?: string | null;
  descripcion?: string | null;
  observaciones?: string | null;
  firmaDigital?: string | null;
}

/**
 * PdfService
 * Servicio para generación de PDFs de órdenes de servicio
 * 
 * NOTA: Este es un template PROTOTIPO minimalista.
 * El diseño profesional final incluirá:
 * - Logo de Mekanos en alta resolución
 * - Diseño gráfico profesional
 * - Tablas de mediciones detalladas
 * - Firmas digitales y código QR
 * - Marca de agua "ORIGINAL"
 */
@Injectable()
export class PdfService {
  /**
   * Genera PDF de una orden de servicio
   * @param data - Datos de la orden
   * @returns Buffer del PDF generado
   */
  async generateOrdenServicioPdf(data: OrdenPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Crear documento PDF
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          },
          info: {
            Title: `Orden de Servicio ${data.numeroOrden}`,
            Author: 'MEKANOS S.A.S',
            Subject: 'Informe Técnico',
            CreationDate: new Date()
          }
        });

        const buffers: Buffer[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(buffers);
          resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // ==================== CONTENIDO DEL PDF ====================

        // ENCABEZADO
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .text('MEKANOS S.A.S', { align: 'center' })
          .moveDown(0.3);

        doc
          .fontSize(10)
          .font('Helvetica')
          .text('Mantenimiento y Reparación de Equipos Industriales', { align: 'center' })
          .text('Cartagena de Indias, Colombia', { align: 'center' })
          .text('Tel: 315-7083350 | Email: mekanossas2@gmail.com', { align: 'center' })
          .moveDown(1);

        // Línea separadora
        doc
          .moveTo(50, doc.y)
          .lineTo(545, doc.y)
          .stroke()
          .moveDown(1);

        // TÍTULO ORDEN
        doc
          .fontSize(18)
          .font('Helvetica-Bold')
          .text('ORDEN DE SERVICIO', { align: 'center' })
          .moveDown(0.5);

        doc
          .fontSize(14)
          .text(`No. ${data.numeroOrden}`, { align: 'center' })
          .moveDown(1);

        // INFORMACIÓN GENERAL
        const leftColumn = 70;
        let currentY = doc.y;

        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('INFORMACIÓN GENERAL', leftColumn, currentY);
        currentY += 20;

        doc.fontSize(10).font('Helvetica');

        // Columna izquierda
        doc.font('Helvetica-Bold').text('Estado:', leftColumn, currentY);
        doc.font('Helvetica').text(data.estado, leftColumn + 100, currentY);
        currentY += 18;

        doc.font('Helvetica-Bold').text('Prioridad:', leftColumn, currentY);
        doc.font('Helvetica').text(data.prioridad, leftColumn + 100, currentY);
        currentY += 18;

        doc.font('Helvetica-Bold').text('Cliente:', leftColumn, currentY);
        doc.font('Helvetica').text(data.clienteNombre || "N/A", leftColumn + 100, currentY);
        currentY += 18;

        doc.font('Helvetica-Bold').text('Equipo:', leftColumn, currentY);
        doc.font('Helvetica').text(data.equipoNombre || "N/A", leftColumn + 100, currentY);
        currentY += 25;

        // FECHAS
        doc.fontSize(11).font('Helvetica-Bold');
        doc.text('CRONOLOGÍA', leftColumn, currentY);
        currentY += 20;

        doc.fontSize(10).font('Helvetica');

        doc.font('Helvetica-Bold').text('Creación:', leftColumn, currentY);
        doc.font('Helvetica').text(
          this.formatDate(data.fechaCreacion),
          leftColumn + 120,
          currentY
        );
        currentY += 18;

        if (data.fechaProgramada) {
          doc.font('Helvetica-Bold').text('Fecha Programada:', leftColumn, currentY);
          doc.font('Helvetica').text(
            this.formatDate(data.fechaProgramada),
            leftColumn + 120,
            currentY
          );
          currentY += 18;
        }

        if (data.fechaInicio) {
          doc.font('Helvetica-Bold').text('Fecha Inicio:', leftColumn, currentY);
          doc.font('Helvetica').text(
            this.formatDate(data.fechaInicio),
            leftColumn + 120,
            currentY
          );
          currentY += 18;
        }

        if (data.fechaFinalizacion) {
          doc.font('Helvetica-Bold').text('Fecha Finalización:', leftColumn, currentY);
          doc.font('Helvetica').text(
            this.formatDate(data.fechaFinalizacion),
            leftColumn + 120,
            currentY
          );
          currentY += 18;
        }

        if (data.tecnicoAsignado) {
          currentY += 10;
          doc.font('Helvetica-Bold').text('Técnico Asignado:', leftColumn, currentY);
          doc.font('Helvetica').text(
            data.tecnicoAsignado,
            leftColumn + 120,
            currentY
          );
          currentY += 18;
        }

        // DESCRIPCIÓN
        if (data.descripcion) {
          currentY += 15;
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text('DESCRIPCIÓN DEL SERVICIO', leftColumn, currentY);
          currentY += 20;

          doc.fontSize(10).font('Helvetica');
          doc.text(data.descripcion, leftColumn, currentY, {
            width: 475,
            align: 'justify'
          });
          currentY = doc.y + 15;
        }

        // OBSERVACIONES
        if (data.observaciones) {
          currentY += 5;
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text('OBSERVACIONES TÉCNICAS', leftColumn, currentY);
          currentY += 20;

          doc.fontSize(10).font('Helvetica');
          doc.text(data.observaciones, leftColumn, currentY, {
            width: 475,
            align: 'justify'
          });
          currentY = doc.y + 15;
        }

        // FIRMA (si existe)
        if (data.firmaDigital) {
          currentY += 20;
          doc.fontSize(10).font('Helvetica-Bold');
          doc.text('FIRMA DIGITAL CLIENTE:', leftColumn, currentY);
          currentY += 18;
          doc.fontSize(9).font('Helvetica');
          doc.text(data.firmaDigital, leftColumn, currentY, { width: 475 });
          currentY = doc.y + 15;
        }

        // FOOTER
        const pageHeight = 792; // A4 height in points
        const footerY = pageHeight - 70;

        // Línea separadora footer
        doc
          .moveTo(50, footerY)
          .lineTo(545, footerY)
          .stroke();

        doc.fontSize(8).font('Helvetica-Oblique');
        doc.text(
          '⚠️ PROTOTIPO - Diseño final incluirá logo, firmas digitales y código QR de validación',
          50,
          footerY + 10,
          { align: 'center', width: 495 }
        );

        doc.text(
          `Generado automáticamente el ${this.formatDate(new Date())}`,
          50,
          footerY + 25,
          { align: 'center', width: 495 }
        );

        // Finalizar documento
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Formatea fecha a string legible
   */
  private formatDate(date: Date | null | undefined): string {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    return d.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Bogota'
    });
  }
}

