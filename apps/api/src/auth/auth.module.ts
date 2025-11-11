import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MockPrismaService } from '../common/mocks/mock-prisma.service';

/**
 * AuthModule configura JWT authentication con Passport
 * Usa MockPrismaService mientras la BD real no esté disponible
 * 
 * TODO: Reemplazar MockPrismaService por PrismaModule cuando BD esté disponible
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
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
    MockPrismaService, // TODO: Reemplazar con PrismaService real
  ],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
