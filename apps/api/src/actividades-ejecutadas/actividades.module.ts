import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { ActividadesController } from './actividades.controller';
import { PrismaActividadesRepository } from './infrastructure/prisma-actividades.repository';

// Commands
import { CreateActividadHandler } from './application/commands/create-actividad.handler';
import { UpdateActividadHandler } from './application/commands/update-actividad.handler';

// Queries
import { GetActividadesByOrdenHandler } from './application/queries/get-actividades-by-orden.handler';
import { GetActividadByIdHandler } from './application/queries/get-actividad-by-id.handler';

/**
 * Módulo de Actividades Ejecutadas
 * FASE 4.1 - Módulos Relacionados a Órdenes
 */

const CommandHandlers = [CreateActividadHandler, UpdateActividadHandler];
const QueryHandlers = [GetActividadesByOrdenHandler, GetActividadByIdHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ActividadesController],
  providers: [
    {
      provide: 'IActividadesRepository',
      useClass: PrismaActividadesRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['IActividadesRepository'],
})
export class ActividadesEjecutadasModule {}
