import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { MockPrismaService } from '../common/mocks/mock-prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

/**
 * AuthService maneja la autenticación JWT con usuarios mock
 * TODO: Reemplazar MockPrismaService por PrismaService real cuando BD esté disponible
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: MockPrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Login: valida credenciales y retorna tokens JWT
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // 1. Buscar usuario por email
    const usuario = await this.prisma.usuarios.findUnique({
      where: { email: loginDto.email },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Validar usuario activo
    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario inactivo. Contacte al administrador');
    }

    // 3. Validar contraseña
    const isPasswordValid = await bcrypt.compare(loginDto.password, usuario.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 4. Generar tokens JWT
    const tokens = await this.generateTokens(usuario);

    // 5. Retornar respuesta
    return {
      ...tokens,
      user: {
        id: usuario.id,
        email: usuario.email,
        nombre: `${usuario.persona.nombre} ${usuario.persona.apellido}`,
        rol: usuario.rol,
      },
    };
  }

  /**
   * Refresh: genera nuevos tokens desde un refresh token válido
   */
  async refreshTokens(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    try {
      // 1. Verificar refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // 2. Buscar usuario
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id: payload.sub },
      });

      if (!usuario || !usuario.activo) {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      // 3. Generar nuevos tokens
      return this.generateTokens(usuario);
    } catch (error) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  /**
   * Valida un usuario desde el JWT payload (usado por JwtStrategy)
   */
  async validateUser(userId: number) {
    const usuario = await this.prisma.usuarios.findUnique({
      where: { id: userId },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nombre: `${usuario.persona.nombre} ${usuario.persona.apellido}`,
      rol: usuario.rol,
      personaId: usuario.personaId,
    };
  }

  /**
   * Genera access y refresh tokens
   */
  private async generateTokens(usuario: any): Promise<{ access_token: string; refresh_token: string }> {
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
      personaId: usuario.personaId,
    };

    const [access_token, refresh_token] = await Promise.all([
      // Access token (15 minutos)
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      }),
      // Refresh token (7 días)
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { access_token, refresh_token };
  }

  /**
   * Helper para obtener usuarios mock (útil para testing)
   */
  getMockUsers() {
    return this.prisma.getAllMockUsers().map((u) => ({
      id: u.id,
      email: u.email,
      nombre: `${u.persona.nombre} ${u.persona.apellido}`,
      rol: u.rol,
    }));
  }
}
