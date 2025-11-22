import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma.service';
import { CertificacionesTecnicasController } from './certificaciones-tecnicas.controller';
import { CertificacionesTecnicasService } from './certificaciones-tecnicas.service';

@Module({
  imports: [AuthModule],
  controllers: [CertificacionesTecnicasController],
  providers: [CertificacionesTecnicasService, PrismaService],
  exports: [CertificacionesTecnicasService],
})
export class CertificacionesTecnicasModule {}
