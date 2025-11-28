import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../database/prisma.module';
import { CrearHistorialEstadosOrdenHandler } from './application/handlers/crear-historial-estados-orden.handler';
import { ListarHistorialEstadosOrdenHandler } from './application/handlers/listar-historial-estados-orden.handler';
import { ListarHistorialPorOrdenHandler } from './application/handlers/listar-historial-por-orden.handler';
import { ObtenerHistorialEstadosOrdenPorIdHandler } from './application/handlers/obtener-historial-estados-orden-por-id.handler';
import { PrismaHistorialEstadosOrdenRepository } from './infrastructure/prisma-historial-estados-orden.repository';
import { HistorialEstadosOrdenController } from './presentation/historial-estados-orden.controller';

const CommandHandlers = [CrearHistorialEstadosOrdenHandler];

const QueryHandlers = [
  ListarHistorialEstadosOrdenHandler,
  ListarHistorialPorOrdenHandler,
  ObtenerHistorialEstadosOrdenPorIdHandler,
];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [HistorialEstadosOrdenController],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: 'HistorialEstadosOrdenRepositoryInterface',
      useClass: PrismaHistorialEstadosOrdenRepository,
    },
  ],
  exports: ['HistorialEstadosOrdenRepositoryInterface'],
})
export class HistorialEstadosOrdenModule {}
