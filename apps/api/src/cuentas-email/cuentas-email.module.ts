import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { CuentasEmailController } from './cuentas-email.controller';
import { CuentasEmailService } from './cuentas-email.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CuentasEmailController],
  providers: [CuentasEmailService],
  exports: [CuentasEmailService],
})
export class CuentasEmailModule { }
