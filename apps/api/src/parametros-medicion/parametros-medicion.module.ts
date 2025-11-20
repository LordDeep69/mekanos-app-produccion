import { Module } from '@nestjs/common';
import { ParametrosMedicionController } from './parametros-medicion.controller';
import { ParametrosMedicionService } from './parametros-medicion.service';

@Module({
  controllers: [ParametrosMedicionController],
  providers: [ParametrosMedicionService],
  exports: [ParametrosMedicionService],
})
export class ParametrosMedicionModule {}
