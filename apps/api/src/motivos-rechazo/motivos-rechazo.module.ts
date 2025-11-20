import { Module } from '@nestjs/common';
import { MotivosRechazoController } from './motivos-rechazo.controller';
import { MotivosRechazoService } from './motivos-rechazo.service';

@Module({
  controllers: [MotivosRechazoController],
  providers: [MotivosRechazoService],
  exports: [MotivosRechazoService],
})
export class MotivosRechazoModule {}
