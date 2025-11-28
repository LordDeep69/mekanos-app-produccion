import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { RemisionesDetalleController } from './remisiones-detalle.controller';
import { RemisionesDetalleService } from './remisiones-detalle.service';

@Module({
  imports: [DatabaseModule],
  controllers: [RemisionesDetalleController],
  providers: [RemisionesDetalleService],
  exports: [RemisionesDetalleService],
})
export class RemisionesDetalleModule {}
