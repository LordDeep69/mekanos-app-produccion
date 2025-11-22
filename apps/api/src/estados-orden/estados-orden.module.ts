import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controller
import { EstadosOrdenController } from './estados-orden.controller';

// Repository
import { PrismaEstadosOrdenRepository } from './infrastructure/prisma-estados-orden.repository';

// Command Handlers
import { ActualizarEstadosOrdenHandler } from './application/commands/actualizar-estados-orden.handler';
import { CrearEstadosOrdenHandler } from './application/commands/crear-estados-orden.handler';
import { EliminarEstadosOrdenHandler } from './application/commands/eliminar-estados-orden.handler';

// Query Handlers
import { BuscarEstadosOrdenPorCodigoHandler } from './application/queries/buscar-estados-orden-por-codigo.handler';
import { ListarEstadosOrdenHandler } from './application/queries/listar-estados-orden.handler';
import { ObtenerEstadosActivosHandler } from './application/queries/obtener-estados-activos.handler';
import { ObtenerEstadosOrdenPorIdHandler } from './application/queries/obtener-estados-orden-por-id.handler';

const CommandHandlers = [
  CrearEstadosOrdenHandler,
  ActualizarEstadosOrdenHandler,
  EliminarEstadosOrdenHandler,
];

const QueryHandlers = [
  ObtenerEstadosOrdenPorIdHandler,
  ListarEstadosOrdenHandler,
  BuscarEstadosOrdenPorCodigoHandler,
  ObtenerEstadosActivosHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [EstadosOrdenController],
  providers: [
    PrismaEstadosOrdenRepository,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaEstadosOrdenRepository],
})
export class EstadosOrdenModule {}

