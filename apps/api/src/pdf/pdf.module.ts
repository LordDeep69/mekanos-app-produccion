import { DatabaseModule } from '@mekanos/database';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigParametrosModule } from '../config-parametros/config-parametros.module';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';
import { PdfAssemblerService } from './pdf-assembler.service';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';

/**
 * PdfModule - Motor Documental White-Label
 */
@Module({
  imports: [DatabaseModule, StorageModule, ConfigParametrosModule, forwardRef(() => EmailModule)],
  controllers: [PdfController],
  providers: [PdfService, PdfAssemblerService],
  exports: [PdfService, PdfAssemblerService],
})
export class PdfModule {}
