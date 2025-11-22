import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../database/prisma.service';
import { ContactosAdicionalesController } from './contactos-adicionales.controller';
import { ContactosAdicionalesService } from './contactos-adicionales.service';

@Module({
  imports: [AuthModule],
  controllers: [ContactosAdicionalesController],
  providers: [ContactosAdicionalesService, PrismaService],
  exports: [ContactosAdicionalesService],
})
export class ContactosAdicionalesModule {}
