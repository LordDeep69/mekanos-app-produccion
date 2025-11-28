import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { ComponentesUsadosController } from './componentes-usados.controller';

// Repository
import { PrismaComponentesUsadosRepository } from './infrastructure/prisma-componentes-usados.repository';

// Mapper
import { ComponenteUsadoMapper } from './application/mappers/componente-usado.mapper';

// Command Handlers (3)
import { CreateComponenteUsadoHandler } from './application/commands/create-componente-usado.handler';
import { DeleteComponenteUsadoHandler } from './application/commands/delete-componente-usado.handler';
import { UpdateComponenteUsadoHandler } from './application/commands/update-componente-usado.handler';

// Query Handlers (3)
import { GetAllComponentesUsadosHandler } from './application/queries/get-all-componentes-usados.handler';
import { GetComponenteUsadoByIdHandler } from './application/queries/get-componente-usado-by-id.handler';
import { GetComponentesUsadosByOrdenHandler } from './application/queries/get-componentes-usados-by-orden.handler';

/**
 * Módulo Componentes Usados - FASE 3 Refactorizado
 * Tabla 12/14 - CQRS pattern + Prisma + Mapper
 * 3 Commands + 3 Queries + 6 Endpoints
 */
const CommandHandlers = [
  CreateComponenteUsadoHandler,
  UpdateComponenteUsadoHandler,
  DeleteComponenteUsadoHandler,
];

const QueryHandlers = [
  GetAllComponentesUsadosHandler,
  GetComponenteUsadoByIdHandler,
  GetComponentesUsadosByOrdenHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ComponentesUsadosController],
  providers: [
    {
      provide: 'IComponentesUsadosRepository',
      useClass: PrismaComponentesUsadosRepository,
    },
    ComponenteUsadoMapper,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['IComponentesUsadosRepository'],
})
export class ComponentesUsadosModule {}
