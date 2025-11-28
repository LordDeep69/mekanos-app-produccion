import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { BitacorasController } from './bitacoras.controller';
import { BitacorasService } from './bitacoras.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BitacorasController],
  providers: [BitacorasService],
  exports: [BitacorasService],
})
export class BitacorasModule {}
