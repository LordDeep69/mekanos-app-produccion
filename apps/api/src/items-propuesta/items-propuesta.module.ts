import { Module } from '@nestjs/common';
import { ItemsPropuestaController } from './items-propuesta.controller';
import { ItemsPropuestaService } from './items-propuesta.service';

@Module({
  controllers: [ItemsPropuestaController],
  providers: [ItemsPropuestaService],
  exports: [ItemsPropuestaService],
})
export class ItemsPropuestaModule {}
