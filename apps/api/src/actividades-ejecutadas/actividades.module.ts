import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { ActividadesController } from './actividades.controller';
import { ActividadMapper } from './application/mappers/actividad.mapper';
import { PrismaActividadesRepository } from './infrastructure/prisma-actividades.repository';

// Commands
import { CreateActividadHandler } from './application/commands/create-actividad.handler';
import { DeleteActividadHandler } from './application/commands/delete-actividad.handler';
import { UpdateActividadHandler } from './application/commands/update-actividad.handler';

// Queries
import { GetActividadByIdHandler } from './application/queries/get-actividad-by-id.handler';
import { GetActividadesByOrdenHandler } from './application/queries/get-actividades-by-orden.handler';
import { GetAllActividadesHandler } from './application/queries/get-all-actividades.handler';

const CommandHandlers = [
  CreateActividadHandler,
  UpdateActividadHandler,
  DeleteActividadHandler,
];

const QueryHandlers = [
  GetAllActividadesHandler,
  GetActividadByIdHandler,
  GetActividadesByOrdenHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ActividadesController],
  providers: [
    PrismaActividadesRepository,
    ActividadMapper,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaActividadesRepository],
})
export class ActividadesEjecutadasModule {}

