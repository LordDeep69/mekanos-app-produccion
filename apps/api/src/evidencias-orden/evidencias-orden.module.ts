import { Module } from '@nestjs/common';
import { EvidenciasOrdenController } from './evidencias-orden.controller';
import { EvidenciasOrdenService } from './evidencias-orden.service';

@Module({
  controllers: [EvidenciasOrdenController],
  providers: [EvidenciasOrdenService],
  exports: [EvidenciasOrdenService],
})
export class EvidenciasOrdenModule {}
