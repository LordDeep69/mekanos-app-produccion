import { Module, forwardRef } from '@nestjs/common';
import { PdfModule } from '../pdf/pdf.module';
import { EmailTemplatesService } from './email-templates.service';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';

/**
 * ============================================================================
 * EMAIL MODULE - MEKANOS S.A.S
 * ============================================================================
 * Módulo para envío de emails con Nodemailer (Gmail SMTP).
 * Incluye templates corporativos MEKANOS y soporte para adjuntos PDF.
 * ============================================================================
 */
@Module({
  imports: [forwardRef(() => PdfModule)],
  controllers: [EmailController],
  providers: [EmailService, EmailTemplatesService],
  exports: [EmailService, EmailTemplatesService]
})
export class EmailModule { }
