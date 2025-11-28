import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CommonServicesModule } from '../common/services/common-services.module';
import { ContratosMantenimientoController } from './contratos-mantenimiento.controller';
import { ContratosMantenimientoService } from './contratos-mantenimiento.service';

@Module({
  imports: [DatabaseModule, CommonServicesModule],
  controllers: [ContratosMantenimientoController],
  providers: [ContratosMantenimientoService],
  exports: [ContratosMantenimientoService],
})
export class ContratosMantenimientoModule {}
