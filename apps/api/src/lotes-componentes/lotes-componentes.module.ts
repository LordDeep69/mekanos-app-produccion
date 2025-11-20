import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CrearLoteHandler } from './commands/crear-lote.handler';
import { PrismaLotesComponentesRepository } from './infrastructure/prisma-lotes-componentes.repository';
import { LotesComponentesController } from './lotes-componentes.controller';
import { GetLoteByIdHandler } from './queries/get-lote-by-id.handler';
import { GetLotesHandler } from './queries/get-lotes.handler';
import { GetProximosAVencerHandler } from './queries/get-proximos-a-vencer.handler';

const CommandHandlers = [CrearLoteHandler];
const QueryHandlers = [
  GetLotesHandler,
  GetProximosAVencerHandler,
  GetLoteByIdHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [LotesComponentesController],
  providers: [
    {
      provide: 'ILotesComponentesRepository',
      useClass: PrismaLotesComponentesRepository,
    },
    PrismaLotesComponentesRepository,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [PrismaLotesComponentesRepository],
})
export class LotesComponentesModule {}
