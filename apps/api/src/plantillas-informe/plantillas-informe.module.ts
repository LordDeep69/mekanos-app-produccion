import { Module } from '@nestjs/common';
import { PlantillasInformeController } from './plantillas-informe.controller';
import { PlantillasInformeService } from './plantillas-informe.service';

@Module({
  controllers: [PlantillasInformeController],
  providers: [PlantillasInformeService],
  exports: [PlantillasInformeService],
})
export class PlantillasInformeModule {}
