import { Module } from '@nestjs/common';
import { R2StorageService } from './r2-storage.service';

/**
 * StorageModule
 * Módulo para almacenamiento de archivos en Cloudflare R2
 */
@Module({
  providers: [R2StorageService],
  exports: [R2StorageService]
})
export class StorageModule {}
