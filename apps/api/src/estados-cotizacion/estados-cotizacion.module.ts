import { Module } from '@nestjs/common';
import { EstadosCotizacionController } from './estados-cotizacion.controller';
import { EstadosCotizacionService } from './estados-cotizacion.service';

@Module({
  controllers: [EstadosCotizacionController],
  providers: [EstadosCotizacionService],
  exports: [EstadosCotizacionService],
})
export class EstadosCotizacionModule {}
