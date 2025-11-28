import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { ItemsPropuestaController } from './items-propuesta.controller';
import { ItemsPropuestaService } from './items-propuesta.service';

@Module({
  imports: [PrismaModule],
  controllers: [ItemsPropuestaController],
  providers: [ItemsPropuestaService],
  exports: [ItemsPropuestaService],
})
export class ItemsPropuestaModule {}
