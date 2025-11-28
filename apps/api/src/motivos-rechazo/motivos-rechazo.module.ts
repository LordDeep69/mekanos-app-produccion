import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { MotivosRechazoController } from './motivos-rechazo.controller';
import { MotivosRechazoService } from './motivos-rechazo.service';

@Module({
  imports: [PrismaModule],
  controllers: [MotivosRechazoController],
  providers: [MotivosRechazoService],
  exports: [MotivosRechazoService],
})
export class MotivosRechazoModule {}
