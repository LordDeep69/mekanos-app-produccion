import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';

/**
 * PdfModule
 * Módulo para generación de PDFs
 */
@Module({
  providers: [PdfService],
  exports: [PdfService]
})
export class PdfModule {}
