import { Module } from '@nestjs/common';
import { ItemsCotizacionComponentesController } from './items-cotizacion-componentes.controller';
import { ItemsCotizacionComponentesService } from './items-cotizacion-componentes.service';

@Module({
  controllers: [ItemsCotizacionComponentesController],
  providers: [ItemsCotizacionComponentesService],
  exports: [ItemsCotizacionComponentesService],
})
export class ItemsCotizacionComponentesModule {}
