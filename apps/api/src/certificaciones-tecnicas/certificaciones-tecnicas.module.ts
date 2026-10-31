import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CertificacionesTecnicasController } from './certificaciones-tecnicas.controller';
import { CertificacionesTecnicasService } from './certificaciones-tecnicas.service';

@Module({
  imports: [AuthModule],
  controllers: [CertificacionesTecnicasController],
  // PrismaService se resuelve desde PrismaModule (@Global). Declararlo aquí
  // creaba una instancia más de PrismaClient (pool propio) por módulo.
  providers: [CertificacionesTecnicasService],
  exports: [CertificacionesTecnicasService],
})
export class CertificacionesTecnicasModule {}
