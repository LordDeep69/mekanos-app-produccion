import { Module } from '@nestjs/common';
import { MedicionesOrdenController } from './mediciones-orden.controller';
import { MedicionesOrdenService } from './mediciones-orden.service';

@Module({
  controllers: [MedicionesOrdenController],
  providers: [MedicionesOrdenService],
  exports: [MedicionesOrdenService],
})
export class MedicionesOrdenModule {}
