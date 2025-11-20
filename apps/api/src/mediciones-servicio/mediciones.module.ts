import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { MedicionesController } from './mediciones.controller';

// Repository
import { PrismaMedicionesRepository } from './infrastructure/prisma-mediciones.repository';

// Command Handlers
import { CreateMedicionHandler } from './application/commands/create-medicion.handler';
import { UpdateMedicionHandler } from './application/commands/update-medicion.handler';

// Query Handlers
import { GetMedicionByIdHandler } from './application/queries/get-medicion-by-id.handler';
import { GetMedicionesByOrdenHandler } from './application/queries/get-mediciones-by-orden.handler';

/**
 * Módulo Mediciones de Servicio con validación automática de rangos
 * FASE 4.2 - CQRS pattern + Prisma
 */

const CommandHandlers = [CreateMedicionHandler, UpdateMedicionHandler];
const QueryHandlers = [GetMedicionByIdHandler, GetMedicionesByOrdenHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [MedicionesController],
  providers: [
    {
      provide: 'IMedicionesRepository',
      useClass: PrismaMedicionesRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['IMedicionesRepository'],
})
export class MedicionesModule {}
