import { Module } from '@nestjs/common';
import { ArchivosEquipoController } from './archivos-equipo.controller';
import { ArchivosEquipoService } from './archivos-equipo.service';

@Module({
  controllers: [ArchivosEquipoController],
  providers: [ArchivosEquipoService],
  exports: [ArchivosEquipoService],
})
export class ArchivosEquipoModule {}
