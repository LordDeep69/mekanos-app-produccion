import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { BitacorasController } from './bitacoras.controller';
import { BitacorasService } from './bitacoras.service';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [BitacorasController],
  providers: [BitacorasService],
  exports: [BitacorasService],
})
export class BitacorasModule { }
