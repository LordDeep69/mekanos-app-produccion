import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RolesPermisosController } from './roles-permisos.controller';
import { RolesPermisosService } from './roles-permisos.service';

@Module({
  imports: [AuthModule],
  controllers: [RolesPermisosController],
  // PrismaService se resuelve desde PrismaModule (@Global). Declararlo aquí
  // creaba una instancia más de PrismaClient (pool propio) por módulo.
  providers: [RolesPermisosService],
  exports: [RolesPermisosService],
})
export class RolesPermisosModule {}
