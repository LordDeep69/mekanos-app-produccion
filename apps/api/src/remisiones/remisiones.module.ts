import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaRemisionesRepository } from './infrastructure/prisma-remisiones.repository';
import { RemisionesController } from './remisiones.controller';

// Command Handlers
import { CancelarRemisionHandler } from './commands/cancelar-remision.handler';
import { CrearRemisionHandler } from './commands/crear-remision.handler';
import { EntregarRemisionHandler } from './commands/entregar-remision.handler';

// Query Handlers
import { GetRemisionByIdHandler } from './queries/get-remision-by-id.handler';
import { GetRemisionesHandler } from './queries/get-remisiones.handler';

const CommandHandlers = [
  CrearRemisionHandler,
  EntregarRemisionHandler,
  CancelarRemisionHandler,
];

const QueryHandlers = [GetRemisionesHandler, GetRemisionByIdHandler];

@Module({
  imports: [CqrsModule],
  controllers: [RemisionesController],
  providers: [
    PrismaRemisionesRepository,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaRemisionesRepository],
})
export class RemisionesModule {}
