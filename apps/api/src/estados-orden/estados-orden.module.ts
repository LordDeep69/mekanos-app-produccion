import { Module } from '@nestjs/common';
import { EstadosOrdenController } from './estados-orden.controller';
import { EstadosOrdenService } from './estados-orden.service';

@Module({
  controllers: [EstadosOrdenController],
  providers: [EstadosOrdenService],
  exports: [EstadosOrdenService],
})
export class EstadosOrdenModule {}
