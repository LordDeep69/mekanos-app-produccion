// Module - Items Componentes Cotización

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '@mekanos/database';
import { ItemsComponentesController } from './items-componentes.controller';
import { PrismaItemsComponentesRepository } from './infrastructure/prisma-items-componentes.repository';
import { CreateItemComponenteHandler } from './application/commands/create-item-componente.handler';
import { UpdateItemComponenteHandler } from './application/commands/update-item-componente.handler';
import { DeleteItemComponenteHandler } from './application/commands/delete-item-componente.handler';
import { GetItemsComponentesHandler } from './application/queries/get-items-componentes.handler';
import { PrismaCotizacionesRepository } from '../infrastructure/prisma-cotizaciones.repository';

const CommandHandlers = [
  CreateItemComponenteHandler,
  UpdateItemComponenteHandler,
  DeleteItemComponenteHandler,
];

const QueryHandlers = [GetItemsComponentesHandler];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [ItemsComponentesController],
  providers: [
    {
      provide: 'ItemsComponentesRepository',
      useClass: PrismaItemsComponentesRepository,
    },
    {
      provide: 'CotizacionesRepository',
      useClass: PrismaCotizacionesRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['ItemsComponentesRepository'],
})
export class ItemsComponentesModule {}
