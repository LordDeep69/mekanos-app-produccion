import { Module } from '@nestjs/common';
import { EquiposContratoController } from './equipos-contrato.controller';
import { EquiposContratoService } from './equipos-contrato.service';

@Module({
  controllers: [EquiposContratoController],
  providers: [EquiposContratoService],
  exports: [EquiposContratoService],
})
export class EquiposContratoModule {}
