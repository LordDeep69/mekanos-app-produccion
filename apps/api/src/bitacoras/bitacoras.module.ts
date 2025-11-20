import { Module } from '@nestjs/common';
import { BitacorasController } from './bitacoras.controller';
import { BitacorasService } from './bitacoras.service';

@Module({
  controllers: [BitacorasController],
  providers: [BitacorasService],
  exports: [BitacorasService],
})
export class BitacorasModule {}
