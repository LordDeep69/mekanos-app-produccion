import { Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { MediaUploadStrategyService } from './media-upload-strategy.service';
import { R2StorageService } from './r2-storage.service';

/**
 * StorageModule
 * Módulo para almacenamiento de archivos:
 * - Cloudflare R2: PDFs e informes (+ estrategia R2-Ready para media)
 * - Cloudinary: Evidencias fotográficas (Signed Direct Upload por defecto)
 */
@Module({
  providers: [R2StorageService, CloudinaryService, MediaUploadStrategyService],
  exports: [R2StorageService, CloudinaryService, MediaUploadStrategyService],
})
export class StorageModule {}
