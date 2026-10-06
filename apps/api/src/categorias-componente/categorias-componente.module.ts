import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module';
import { CategoriasComponenteController } from './categorias-componente.controller';
import { CategoriasComponenteService } from './categorias-componente.service';

@Module({
  imports: [PrismaModule],
  controllers: [CategoriasComponenteController],
  providers: [CategoriasComponenteService],
  exports: [CategoriasComponenteService],
})
export class CategoriasComponenteModule {}
