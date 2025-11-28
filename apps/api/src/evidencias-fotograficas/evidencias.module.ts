import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { EvidenciasController } from './evidencias.controller';

// Repository
import { PrismaEvidenciasRepository } from './infrastructure/prisma-evidencias.repository';

// Mapper
import { EvidenciaMapper } from './application/mappers/evidencia.mapper';

// Command Handlers
import { CreateEvidenciaHandler } from './application/commands/create-evidencia.handler';
import { DeleteEvidenciaHandler } from './application/commands/delete-evidencia.handler';
import { UpdateEvidenciaHandler } from './application/commands/update-evidencia.handler';

// Query Handlers
import { GetAllEvidenciasHandler } from './application/queries/get-all-evidencias.handler';
import { GetEvidenciaByIdHandler } from './application/queries/get-evidencia-by-id.handler';
import { GetEvidenciasByActividadHandler } from './application/queries/get-evidencias-by-actividad.handler';
import { GetEvidenciasByOrdenHandler } from './application/queries/get-evidencias-by-orden.handler';

/**
 * Módulo Evidencias Fotográficas CRUD
 * FASE 3 - Tabla 11 - 3 Commands + 4 Queries + Mapper
 */

const CommandHandlers = [
  CreateEvidenciaHandler,
  UpdateEvidenciaHandler,
  DeleteEvidenciaHandler,
];

const QueryHandlers = [
  GetAllEvidenciasHandler,
  GetEvidenciaByIdHandler,
  GetEvidenciasByOrdenHandler,
  GetEvidenciasByActividadHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [EvidenciasController],
  providers: [
    {
      provide: 'IEvidenciasRepository',
      useClass: PrismaEvidenciasRepository,
    },
    EvidenciaMapper,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['IEvidenciasRepository'],
})
export class EvidenciasModule {}

