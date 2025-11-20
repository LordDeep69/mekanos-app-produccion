import { Module } from '@nestjs/common';
import { HistorialEstadosEquipoController } from './historial-estados-equipo.controller';
import { HistorialEstadosEquipoService } from './historial-estados-equipo.service';

@Module({
  controllers: [HistorialEstadosEquipoController],
  providers: [HistorialEstadosEquipoService],
  exports: [HistorialEstadosEquipoService],
})
export class HistorialEstadosEquipoModule {}
