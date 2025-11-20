import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { SedesClienteController } from './sedes-cliente.controller';
import { SedesClienteService } from './sedes-cliente.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SedesClienteController],
  providers: [SedesClienteService],
  exports: [SedesClienteService],
})
export class SedesClienteModule {}
