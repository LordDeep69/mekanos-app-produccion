import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { EvidenciasController } from './evidencias.controller';

// Repository
import { PrismaEvidenciasRepository } from './infrastructure/prisma-evidencias.repository';

// Command Handlers
import { CreateEvidenciaHandler } from './application/commands/create-evidencia.handler';

// Query Handlers
import { GetEvidenciaByIdHandler } from './application/queries/get-evidencia-by-id.handler';
import { GetEvidenciasByOrdenHandler } from './application/queries/get-evidencias-by-orden.handler';

/**
 * Módulo Evidencias Fotográficas con Upload Cloudinary Real
 * FASE 4.3 - File upload + metadata hash/exif + CDN storage
 */

const CommandHandlers = [CreateEvidenciaHandler];
const QueryHandlers = [GetEvidenciaByIdHandler, GetEvidenciasByOrdenHandler];

@Module({
  imports: [CqrsModule, PrismaModule, CloudinaryModule],
  controllers: [EvidenciasController],
  providers: [
    {
      provide: 'IEvidenciasRepository',
      useClass: PrismaEvidenciasRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['IEvidenciasRepository'],
})
export class EvidenciasModule {}
