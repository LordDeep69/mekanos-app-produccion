import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { ItemsCotizacionServiciosController } from './items-cotizacion-servicios.controller';
import { ItemsCotizacionServiciosService } from './items-cotizacion-servicios.service';

@Module({
  imports: [PrismaModule],
  controllers: [ItemsCotizacionServiciosController],
  providers: [ItemsCotizacionServiciosService],
  exports: [ItemsCotizacionServiciosService],
})
export class ItemsCotizacionServiciosModule {}
