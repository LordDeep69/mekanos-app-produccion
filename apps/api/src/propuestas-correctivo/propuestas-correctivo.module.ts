import { Module } from '@nestjs/common';
import { PropuestasCorrectivoController } from './propuestas-correctivo.controller';
import { PropuestasCorrectivoService } from './propuestas-correctivo.service';

@Module({
  controllers: [PropuestasCorrectivoController],
  providers: [PropuestasCorrectivoService],
  exports: [PropuestasCorrectivoService],
})
export class PropuestasCorrectivoModule {}
