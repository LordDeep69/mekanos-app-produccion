import { Global, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../database/prisma.module';
import { ConfiguracionOrganizacionController } from './configuracion-organizacion.controller';
import { ConfiguracionOrganizacionService } from './configuracion-organizacion.service';

@Global()
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ConfiguracionOrganizacionController],
  providers: [ConfiguracionOrganizacionService],
  exports: [ConfiguracionOrganizacionService],
})
export class ConfiguracionOrganizacionModule {}
