// Module - Items Servicios Cotización

import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { DatabaseModule } from '@mekanos/database';
import { ItemsServiciosController } from './items-servicios.controller';
import { PrismaItemsServiciosRepository } from './infrastructure/prisma-items-servicios.repository';
import { CreateItemServicioHandler } from './application/commands/create-item-servicio.handler';
import { UpdateItemServicioHandler } from './application/commands/update-item-servicio.handler';
import { DeleteItemServicioHandler } from './application/commands/delete-item-servicio.handler';
import { GetItemsServiciosHandler } from './application/queries/get-items-servicios.handler';
import { PrismaCotizacionesRepository } from '../infrastructure/prisma-cotizaciones.repository';
import { CotizacionCalculoService } from '../services/cotizacion-calculo.service';

const CommandHandlers = [
  CreateItemServicioHandler,
  UpdateItemServicioHandler,
  DeleteItemServicioHandler,
];

const QueryHandlers = [GetItemsServiciosHandler];

@Module({
  imports: [CqrsModule, DatabaseModule],
  controllers: [ItemsServiciosController],
  providers: [
    CotizacionCalculoService,
    {
      provide: 'ItemsServiciosRepository',
      useClass: PrismaItemsServiciosRepository,
    },
    {
      provide: 'CotizacionesRepository',
      useClass: PrismaCotizacionesRepository,
    },
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: ['ItemsServiciosRepository'],
})
export class ItemsServiciosModule {}
