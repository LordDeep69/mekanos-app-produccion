import { Module } from '@nestjs/common';
import { HistorialContratoController } from './historial-contrato.controller';
import { HistorialContratoService } from './historial-contrato.service';

@Module({
  controllers: [HistorialContratoController],
  providers: [HistorialContratoService],
  exports: [HistorialContratoService],
})
export class HistorialContratoModule {}
