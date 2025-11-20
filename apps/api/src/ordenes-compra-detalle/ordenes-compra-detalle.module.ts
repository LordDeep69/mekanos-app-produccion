import { Module } from '@nestjs/common';
import { OrdenesCompraDetalleController } from './ordenes-compra-detalle.controller';
import { OrdenesCompraDetalleService } from './ordenes-compra-detalle.service';

@Module({
  controllers: [OrdenesCompraDetalleController],
  providers: [OrdenesCompraDetalleService],
  exports: [OrdenesCompraDetalleService],
})
export class OrdenesCompraDetalleModule {}
