import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaOrdenesCompraRepository } from './infrastructure/prisma-ordenes-compra.repository';
import { OrdenesCompraController } from './ordenes-compra.controller';

// Command Handlers
import { CancelarOrdenCompraHandler } from './commands/cancelar-orden-compra.handler';
import { CrearOrdenCompraHandler } from './commands/crear-orden-compra.handler';
import { EnviarOrdenCompraHandler } from './commands/enviar-orden-compra.handler';

// Query Handlers
import { GetOrdenCompraByIdHandler } from './queries/get-orden-compra-by-id.handler';
import { GetOrdenesActivasProveedorHandler } from './queries/get-ordenes-activas-proveedor.handler';
import { GetOrdenesCompraHandler } from './queries/get-ordenes-compra.handler';

const CommandHandlers = [
  CrearOrdenCompraHandler,
  EnviarOrdenCompraHandler,
  CancelarOrdenCompraHandler,
];

const QueryHandlers = [
  GetOrdenesCompraHandler,
  GetOrdenCompraByIdHandler,
  GetOrdenesActivasProveedorHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [OrdenesCompraController],
  providers: [
    PrismaOrdenesCompraRepository,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaOrdenesCompraRepository],
})
export class OrdenesCompraModule {}

