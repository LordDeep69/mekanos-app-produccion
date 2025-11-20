import { Module } from '@nestjs/common';
import { RemisionesDetalleController } from './remisiones-detalle.controller';
import { RemisionesDetalleService } from './remisiones-detalle.service';

@Module({
  controllers: [RemisionesDetalleController],
  providers: [RemisionesDetalleService],
  exports: [RemisionesDetalleService],
})
export class RemisionesDetalleModule {}
