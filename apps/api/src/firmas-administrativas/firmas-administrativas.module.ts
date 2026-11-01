import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FirmasAdministrativasController } from './firmas-administrativas.controller';
import { FirmasAdministrativasService } from './firmas-administrativas.service';

@Module({
  imports: [AuthModule],
  controllers: [FirmasAdministrativasController],
  // PrismaService se resuelve desde PrismaModule (@Global). Declararlo aquí
  // creaba una instancia más de PrismaClient (pool propio) por módulo.
  providers: [FirmasAdministrativasService],
  exports: [FirmasAdministrativasService],
})
export class FirmasAdministrativasModule {}
