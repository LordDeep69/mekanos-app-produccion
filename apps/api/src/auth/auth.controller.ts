import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

/**
 * AuthController maneja endpoints de autenticación
 * 
 * Endpoints:
 * - POST /auth/login: Login con email/password
 * - POST /auth/refresh: Renovar access token con refresh token
 * - GET /auth/me: Obtener perfil del usuario autenticado
 * - GET /auth/mock-users: Listar usuarios mock (solo desarrollo)
 */
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Login con credenciales email/password
   * Retorna access_token, refresh_token y datos del usuario
   * 🛡️ SEGURIDAD: Máximo 5 intentos por minuto por IP para prevenir ataques de fuerza bruta y DoS
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  /**
   * POST /auth/refresh
   * Renueva el access token usando un refresh token válido
   */
  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<{ access_token: string; refresh_token: string }> {
    return this.authService.refreshTokens(refreshTokenDto.refresh_token);
  }

  /**
   * GET /auth/me
   * Retorna el perfil del usuario autenticado
   * Requiere JWT válido en header Authorization: Bearer <token>
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return {
      message: 'Perfil del usuario autenticado',
      user,
    };
  }

  // ✅ FASE 1: Método getMockUsers eliminado (ya no usamos mocks)

  /**
   * GET /auth/admin-test
   * Endpoint de prueba solo para admins
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin-test')
  async adminTest(@CurrentUser() user: any) {
    return {
      message: '🎉 ¡Acceso admin exitoso!',
      user,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /auth/tech-test
   * Endpoint de prueba para técnicos y admins
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'TECNICO')
  @Get('tech-test')
  async techTest(@CurrentUser() user: any) {
    return {
      message: '🔧 ¡Acceso técnico exitoso!',
      user,
      timestamp: new Date().toISOString(),
    };
  }
}
