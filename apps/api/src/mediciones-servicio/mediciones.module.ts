import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { MedicionesController } from './mediciones.controller';

// Repository
import { PrismaMedicionesRepository } from './infrastructure/prisma-mediciones.repository';

// Mapper
import { MedicionMapper } from './application/mappers/medicion.mapper';

// Command Handlers (3)
import { CreateMedicionHandler } from './application/commands/create-medicion.handler';
import { DeleteMedicionHandler } from './application/commands/delete-medicion.handler';
import { UpdateMedicionHandler } from './application/commands/update-medicion.handler';

// Query Handlers (3)
import { GetAllMedicionesHandler } from './application/queries/get-all-mediciones.handler';
import { GetMedicionByIdHandler } from './application/queries/get-medicion-by-id.handler';
import { GetMedicionesByOrdenHandler } from './application/queries/get-mediciones-by-orden.handler';

/**
 * Módulo Mediciones de Servicio - FASE 3 Refactorizado
 * CQRS pattern + Prisma + Mapper + 3 Commands + 3 Queries
 */

const CommandHandlers = [
  CreateMedicionHandler,
  UpdateMedicionHandler,
  DeleteMedicionHandler,
];

const QueryHandlers = [
  GetAllMedicionesHandler,
  GetMedicionByIdHandler,
  GetMedicionesByOrdenHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [MedicionesController],
  providers: [
    {
      provide: 'IMedicionesRepository',
      useClass: PrismaMedicionesRepository,
    },
    MedicionMapper,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['IMedicionesRepository'],
})
export class MedicionesModule {}
