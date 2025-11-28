import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

/**
 * Módulo de Sincronización Mobile - FASE 2.3
 * 
 * Provee endpoints offline-first para app móvil de técnicos:
 * - POST /sync/ordenes - Batch upload
 * - GET /sync/download/:tecnicoId - Download para trabajo offline
 */
@Module({
  imports: [CqrsModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
