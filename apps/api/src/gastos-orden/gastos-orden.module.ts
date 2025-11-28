import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';

// Controller
import { GastosOrdenController } from './gastos-orden.controller';

// Commands & Handlers
import { CreateGastoOrdenHandler } from './application/commands/create-gasto-orden.handler';
import { DeleteGastoOrdenHandler } from './application/commands/delete-gasto-orden.handler';
import { UpdateGastoOrdenHandler } from './application/commands/update-gasto-orden.handler';

// Queries & Handlers
import { GetAllGastosOrdenHandler } from './application/queries/get-all-gastos-orden.handler';
import { GetGastoOrdenByIdHandler } from './application/queries/get-gasto-orden-by-id.handler';
import { GetGastosOrdenByOrdenHandler } from './application/queries/get-gastos-orden-by-orden.handler';

// Mapper
import { GastoOrdenMapper } from './application/mappers/gasto-orden.mapper';

// Repository
import { PrismaGastosOrdenRepository } from './infrastructure/prisma-gastos-orden.repository';

/**
 * Módulo de Gastos de Orden
 * Tabla 13/14 - FASE 3
 */
const CommandHandlers = [
  CreateGastoOrdenHandler,
  UpdateGastoOrdenHandler,
  DeleteGastoOrdenHandler,
];

const QueryHandlers = [
  GetAllGastosOrdenHandler,
  GetGastoOrdenByIdHandler,
  GetGastosOrdenByOrdenHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [GastosOrdenController],
  providers: [
    // CQRS Handlers
    ...CommandHandlers,
    ...QueryHandlers,
    // Mapper
    GastoOrdenMapper,
    // Repository
    {
      provide: 'IGastosOrdenRepository',
      useClass: PrismaGastosOrdenRepository,
    },
  ],
  exports: ['IGastosOrdenRepository'],
})
export class GastosOrdenModule {}
