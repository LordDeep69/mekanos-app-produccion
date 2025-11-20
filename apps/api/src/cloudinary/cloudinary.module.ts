import { Module, Global } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';

/**
 * CloudinaryModule - Módulo global para upload imágenes
 * FASE 4.3 - @Global para disponibilidad en todos módulos
 */

@Global()
@Module({
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
