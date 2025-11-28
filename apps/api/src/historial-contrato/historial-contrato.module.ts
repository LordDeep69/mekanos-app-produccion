import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { HistorialContratoController } from './historial-contrato.controller';
import { HistorialContratoService } from './historial-contrato.service';

@Module({
  imports: [DatabaseModule],
  controllers: [HistorialContratoController],
  providers: [HistorialContratoService],
  exports: [HistorialContratoService],
})
export class HistorialContratoModule {}
