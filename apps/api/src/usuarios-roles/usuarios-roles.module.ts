import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma.service';
import { UsuariosRolesController } from './usuarios-roles.controller';
import { UsuariosRolesService } from './usuarios-roles.service';

@Module({
  imports: [AuthModule],
  controllers: [UsuariosRolesController],
  providers: [UsuariosRolesService, PrismaService],
  exports: [UsuariosRolesService],
})
export class UsuariosRolesModule {}
