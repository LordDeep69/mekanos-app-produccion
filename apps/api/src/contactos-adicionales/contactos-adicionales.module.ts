import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContactosAdicionalesController } from './contactos-adicionales.controller';
import { ContactosAdicionalesService } from './contactos-adicionales.service';

@Module({
  imports: [AuthModule],
  controllers: [ContactosAdicionalesController],
  // PrismaService se resuelve desde PrismaModule (@Global). Declararlo aquí
  // creaba una instancia más de PrismaClient (pool propio) por módulo.
  providers: [ContactosAdicionalesService],
  exports: [ContactosAdicionalesService],
})
export class ContactosAdicionalesModule {}
