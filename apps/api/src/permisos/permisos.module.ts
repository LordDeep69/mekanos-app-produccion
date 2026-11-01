import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PermisosController } from './permisos.controller';
import { PermisosService } from './permisos.service';

@Module({
  imports: [AuthModule],
  controllers: [PermisosController],
  // PrismaService se resuelve desde PrismaModule (@Global). Declararlo aquí
  // creaba una instancia más de PrismaClient (pool propio) por módulo.
  providers: [PermisosService],
  exports: [PermisosService],
})
export class PermisosModule {}
