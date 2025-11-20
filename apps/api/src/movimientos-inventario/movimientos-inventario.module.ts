import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaMovimientosInventarioRepository } from './infrastructure/prisma-movimientos-inventario.repository';
import { MovimientosInventarioController } from './movimientos-inventario.controller';

// Command Handlers
import { RegistrarMovimientoHandler } from './commands/registrar-movimiento.handler';
import { RegistrarTrasladoHandler } from './commands/registrar-traslado.handler';

// Query Handlers
import { GetKardexHandler } from './queries/get-kardex.handler';
import { GetMovimientosHandler } from './queries/get-movimientos.handler';
import { GetStockActualHandler } from './queries/get-stock-actual.handler';

const CommandHandlers = [RegistrarMovimientoHandler, RegistrarTrasladoHandler];
const QueryHandlers = [GetMovimientosHandler, GetKardexHandler, GetStockActualHandler];

@Module({
  imports: [CqrsModule],
  controllers: [MovimientosInventarioController],
  providers: [
    PrismaMovimientosInventarioRepository,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaMovimientosInventarioRepository],
})
export class MovimientosInventarioModule {}
