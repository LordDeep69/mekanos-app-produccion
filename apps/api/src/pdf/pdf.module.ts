import { DatabaseModule } from '@mekanos/database';
import { Module, forwardRef } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
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
 * - POST /ordenes/:id/pdf/regenerar - Regenerar PDF y enviar por email
 * - GET /pdf/prueba - PDF de prueba
 * 
 * Templates:
 * - GENERADOR_A: Preventivo Tipo A
 * - GENERADOR_B: Preventivo Tipo B (cambio filtros)
 * - BOMBA_A: Preventivo para Bombas
 * - COTIZACION: Cotización comercial
 */
@Module({
  imports: [DatabaseModule, StorageModule, forwardRef(() => EmailModule)],
  controllers: [PdfController],
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule { }
