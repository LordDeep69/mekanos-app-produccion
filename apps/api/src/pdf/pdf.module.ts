import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';

/**
 * PdfModule - MEKANOS S.A.S
 * 
 * Generación de PDFs profesionales con templates HTML + Puppeteer
 * Con almacenamiento en Cloudflare R2
 * 
 * Endpoints:
 * - GET /ordenes/:id/pdf - PDF de orden específica
 * - GET /pdf/prueba - PDF de prueba
 * 
 * Templates:
 * - GENERADOR_A: Preventivo Tipo A
 * - GENERADOR_B: Preventivo Tipo B (cambio filtros)
 * - BOMBA_A: Preventivo para Bombas
 * - COTIZACION: Cotización comercial
 */
@Module({
  imports: [DatabaseModule, StorageModule],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
