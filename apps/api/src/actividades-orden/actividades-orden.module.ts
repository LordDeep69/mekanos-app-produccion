import { Module } from '@nestjs/common';
import { ActividadesOrdenController } from './actividades-orden.controller';
import { ActividadesOrdenService } from './actividades-orden.service';

@Module({
  controllers: [ActividadesOrdenController],
  providers: [ActividadesOrdenService],
  exports: [ActividadesOrdenService],
})
export class ActividadesOrdenModule {}
