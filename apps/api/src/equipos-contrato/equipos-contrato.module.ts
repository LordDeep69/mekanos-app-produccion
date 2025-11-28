import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { EquiposContratoController } from './equipos-contrato.controller';
import { EquiposContratoService } from './equipos-contrato.service';

@Module({
  imports: [DatabaseModule],
  controllers: [EquiposContratoController],
  providers: [EquiposContratoService],
  exports: [EquiposContratoService],
})
export class EquiposContratoModule {}
