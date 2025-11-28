import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { AprobacionesCotizacionController } from './aprobaciones-cotizacion.controller';
import { AprobacionesCotizacionService } from './aprobaciones-cotizacion.service';

@Module({
  imports: [PrismaModule],
  controllers: [AprobacionesCotizacionController],
  providers: [AprobacionesCotizacionService],
  exports: [AprobacionesCotizacionService],
})
export class AprobacionesCotizacionModule {}
