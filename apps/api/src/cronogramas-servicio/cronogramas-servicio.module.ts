import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { CronogramasServicioController } from './cronogramas-servicio.controller';
import { CronogramasServicioService } from './cronogramas-servicio.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CronogramasServicioController],
  providers: [CronogramasServicioService],
  exports: [CronogramasServicioService],
})
export class CronogramasServicioModule {}
