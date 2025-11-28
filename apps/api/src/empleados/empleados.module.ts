import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { EmpleadosController } from './empleados.controller';
import { EmpleadosService } from './empleados.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
  exports: [EmpleadosService],
})
export class EmpleadosModule {}
