import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma.service';
import { FirmasAdministrativasController } from './firmas-administrativas.controller';
import { FirmasAdministrativasService } from './firmas-administrativas.service';

@Module({
  imports: [AuthModule],
  controllers: [FirmasAdministrativasController],
  providers: [FirmasAdministrativasService, PrismaService],
  exports: [FirmasAdministrativasService],
})
export class FirmasAdministrativasModule {}
