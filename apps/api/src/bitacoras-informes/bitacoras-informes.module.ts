import { DatabaseModule } from '@mekanos/database';
import { Module } from '@nestjs/common';
import { BitacorasInformesController } from './bitacoras-informes.controller';
import { BitacorasInformesService } from './bitacoras-informes.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BitacorasInformesController],
  providers: [BitacorasInformesService],
  exports: [BitacorasInformesService],
})
export class BitacorasInformesModule {}
