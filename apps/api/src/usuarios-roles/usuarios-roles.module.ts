import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsuariosRolesController } from './usuarios-roles.controller';
import { UsuariosRolesService } from './usuarios-roles.service';

@Module({
  imports: [AuthModule],
  controllers: [UsuariosRolesController],
  // PrismaService se resuelve desde PrismaModule (@Global). Declararlo aquí
  // creaba una instancia más de PrismaClient (pool propio) por módulo.
  providers: [UsuariosRolesService],
  exports: [UsuariosRolesService],
})
export class UsuariosRolesModule {}
