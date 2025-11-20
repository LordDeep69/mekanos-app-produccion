import { Module } from '@nestjs/common';
import { HistorialEnviosController } from './historial-envios.controller';
import { HistorialEnviosService } from './historial-envios.service';

@Module({
  controllers: [HistorialEnviosController],
  providers: [HistorialEnviosService],
  exports: [HistorialEnviosService],
})
export class HistorialEnviosModule {}
