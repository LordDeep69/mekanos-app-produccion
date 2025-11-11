import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * PrismaModule - Módulo global para Prisma Client
 * 
 * @Global decorator hace que PrismaService esté disponible
 * en toda la aplicación sin necesidad de importar el módulo
 * en cada feature module
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
