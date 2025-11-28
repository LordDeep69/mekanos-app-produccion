import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma.service';
import { RolesPermisosController } from './roles-permisos.controller';
import { RolesPermisosService } from './roles-permisos.service';

@Module({
  imports: [AuthModule],
  controllers: [RolesPermisosController],
  providers: [RolesPermisosService, PrismaService],
  exports: [RolesPermisosService],
})
export class RolesPermisosModule {}
