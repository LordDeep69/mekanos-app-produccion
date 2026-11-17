import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../database/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { resolveRequiredAuthSecret } from './config/auth-secrets.helper';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermisosGuard } from './guards/permisos.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * AuthModule configura JWT authentication con Passport
 * ✅ CORREGIDO FASE 1: Usa PrismaModule real con Supabase
 * ✅ REFACTORIZADO FASE 2: Exporta guards para uso en otros módulos
 */
@Module({
  imports: [
    PrismaModule, // ✅ CORREGIDO: PrismaModule real
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: resolveRequiredAuthSecret(configService, 'JWT_SECRET'),
        signOptions: {
          expiresIn: '15m', // Access token expira en 15 minutos
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard, // ✅ AGREGADO FASE 2
    RolesGuard, // ✅ AGREGADO FASE 2
    PermisosGuard, // ✅ FASE 1 RBAC
  ],
  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,
    JwtAuthGuard,
    RolesGuard,
    PermisosGuard,
  ], // ✅ EXPORTADOS
})
export class AuthModule {}
