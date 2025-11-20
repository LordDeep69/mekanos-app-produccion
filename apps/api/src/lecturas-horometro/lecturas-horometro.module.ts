import { Module } from '@nestjs/common';
import { LecturasHorometroController } from './lecturas-horometro.controller';
import { LecturasHorometroService } from './lecturas-horometro.service';

@Module({
  controllers: [LecturasHorometroController],
  providers: [LecturasHorometroService],
  exports: [LecturasHorometroService],
})
export class LecturasHorometroModule {}
