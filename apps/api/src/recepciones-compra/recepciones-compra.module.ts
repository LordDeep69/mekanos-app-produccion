import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { RegistrarRecepcionHandler } from './application/commands/registrar-recepcion.command';
import { GetRecepcionByIdHandler } from './application/queries/get-recepcion-by-id.query';
import { GetRecepcionesHandler } from './application/queries/get-recepciones.query';
import { PrismaRecepcionesCompraRepository } from './infrastructure/persistence/prisma-recepciones-compra.repository';
import { RecepcionesCompraController } from './recepciones-compra.controller';

const CommandHandlers = [RegistrarRecepcionHandler];
const QueryHandlers = [GetRecepcionesHandler, GetRecepcionByIdHandler];

@Module({
  imports: [CqrsModule],
  controllers: [RecepcionesCompraController],
  providers: [
    {
      provide: 'IRecepcionesCompraRepository',
      useClass: PrismaRecepcionesCompraRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['IRecepcionesCompraRepository'],
})
export class RecepcionesCompraModule {}
