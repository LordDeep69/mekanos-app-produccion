import { Module } from '@nestjs/common';
import { ContratosMantenimientoController } from './contratos-mantenimiento.controller';
import { ContratosMantenimientoService } from './contratos-mantenimiento.service';

@Module({
  controllers: [ContratosMantenimientoController],
  providers: [ContratosMantenimientoService],
  exports: [ContratosMantenimientoService],
})
export class ContratosMantenimientoModule {}
