import { Module } from '@nestjs/common';
import { ItemsCotizacionServiciosController } from './items-cotizacion-servicios.controller';
import { ItemsCotizacionServiciosService } from './items-cotizacion-servicios.service';

@Module({
  controllers: [ItemsCotizacionServiciosController],
  providers: [ItemsCotizacionServiciosService],
  exports: [ItemsCotizacionServiciosService],
})
export class ItemsCotizacionServiciosModule {}
