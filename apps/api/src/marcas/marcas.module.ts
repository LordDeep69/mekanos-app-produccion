import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { MarcasController } from './marcas.controller';
import { MarcasService } from './marcas.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarcasController],
  providers: [MarcasService],
  exports: [MarcasService],
})
export class MarcasModule {}
