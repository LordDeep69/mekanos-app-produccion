import { Module } from '@nestjs/common';
import { AprobacionesCotizacionController } from './aprobaciones-cotizacion.controller';
import { AprobacionesCotizacionService } from './aprobaciones-cotizacion.service';

@Module({
  controllers: [AprobacionesCotizacionController],
  providers: [AprobacionesCotizacionService],
  exports: [AprobacionesCotizacionService],
})
export class AprobacionesCotizacionModule {}
