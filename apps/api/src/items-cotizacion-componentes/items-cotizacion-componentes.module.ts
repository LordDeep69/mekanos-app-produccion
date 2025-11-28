import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { ItemsCotizacionComponentesController } from './items-cotizacion-componentes.controller';
import { ItemsCotizacionComponentesService } from './items-cotizacion-componentes.service';

@Module({
  imports: [PrismaModule],
  controllers: [ItemsCotizacionComponentesController],
  providers: [ItemsCotizacionComponentesService],
  exports: [ItemsCotizacionComponentesService],
})
export class ItemsCotizacionComponentesModule {}
