import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma.service';
import { PermisosController } from './permisos.controller';
import { PermisosService } from './permisos.service';

@Module({
  imports: [AuthModule],
  controllers: [PermisosController],
  providers: [PermisosService, PrismaService],
  exports: [PermisosService],
})
export class PermisosModule {}
