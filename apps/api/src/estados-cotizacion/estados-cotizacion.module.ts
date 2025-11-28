import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { EstadosCotizacionController } from './estados-cotizacion.controller';
import { EstadosCotizacionService } from './estados-cotizacion.service';

@Module({
  imports: [PrismaModule],
  controllers: [EstadosCotizacionController],
  providers: [EstadosCotizacionService],
  exports: [EstadosCotizacionService],
})
export class EstadosCotizacionModule {}
