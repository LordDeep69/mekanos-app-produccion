import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { R2StorageService } from './r2-storage.service';

/**
 * StorageModule
 * Módulo para almacenamiento de archivos:
 * - Cloudflare R2: PDFs e informes
 * - Cloudinary: Evidencias fotográficas
 */
@Module({
  providers: [R2StorageService, CloudinaryService],
  exports: [R2StorageService, CloudinaryService]
})
export class StorageModule {}
