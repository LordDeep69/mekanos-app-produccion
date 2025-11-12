import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * EmailModule
 * Módulo para envío de emails con Resend.com
 */
@Module({
  providers: [EmailService],
  exports: [EmailService]
})
export class EmailModule {}
