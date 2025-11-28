import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { PlantillasInformeController } from './plantillas-informe.controller';
import { PlantillasInformeService } from './plantillas-informe.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PlantillasInformeController],
  providers: [PlantillasInformeService],
  exports: [PlantillasInformeService],
})
export class PlantillasInformeModule {}
