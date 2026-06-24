import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

/**
 * AuthService maneja la autenticación JWT con Supabase
 * ✅ CORREGIDO FASE 1: Usa PrismaService real con schema correcto
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  // Cache en memoria para validación de usuarios (5 min TTL)
  // Evita 401 por caídas momentáneas de conexión a la BD
  private readonly userValidationCache = new Map<number, { user: any; expiresAt: number }>();
  private readonly USER_CACHE_TTL_MS = 5 * 60 * 1000;

  /**
   * Invalida la caché de un usuario (ej. después de cambiar su estado/roles)
   */
  invalidateUserCache(userId: number) {
    this.userValidationCache.delete(userId);
  }

  /**
   * Login: valida credenciales y retorna tokens JWT
   */
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    try {
      console.log('🔐 [DEBUG] Login attempt:', { email: loginDto.email, username: loginDto.username });

      // 1. Buscar usuario por email ó por username (aceptamos ambos)
      const whereClause: any = loginDto.email ? { email: loginDto.email } : loginDto.username ? { username: loginDto.username } : null;
      if (!whereClause) {
        throw new UnauthorizedException('El email o username es requerido');
      }

      const usuario = await this.prisma.usuarios.findUnique({
        where: whereClause,
        include: {
          persona: true, // ✅ Relación 'persona' → tabla 'personas'
        },
      });

      console.log('📝 [DEBUG] Usuario encontrado:', {
        exists: !!usuario,
        id: usuario?.id_usuario,
        estado: usuario?.estado,
        hasPassword: !!usuario?.password_hash,
        hasPersona: !!usuario?.persona,
      });

      if (!usuario) {
        console.log('❌ [DEBUG] Usuario no existe');
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // 2. Validar usuario activo (campo real: estado = 'ACTIVO')
      if (usuario.estado !== 'ACTIVO') {
        console.log('❌ [DEBUG] Usuario inactivo:', usuario.estado);
        throw new UnauthorizedException('Usuario inactivo. Contacte al administrador');
      }

      console.log('✅ [DEBUG] Usuario activo validado');

      // 3. Validar contraseña (campo real: password_hash)
      console.log('🔑 [DEBUG] Validando password...');
      const isPasswordValid = await bcrypt.compare(loginDto.password, usuario.password_hash);
      console.log('🔑 [DEBUG] Password válido:', isPasswordValid);

      if (!isPasswordValid) {
        console.log('❌ [DEBUG] Password inválido');
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // 4. Generar tokens JWT
      console.log('🎫 [DEBUG] Generando tokens JWT...');
      const tokens = await this.generateTokens(usuario);
      console.log('✅ [DEBUG] Tokens generados exitosamente');

      // 4.5 Buscar empleado asociado al usuario (por id_persona)
      const empleado = await this.prisma.empleados.findFirst({
        where: { id_persona: usuario.id_persona },
      });
      console.log('👷 [DEBUG] Empleado encontrado:', empleado?.id_empleado || 'NO');

      // 5. Retornar respuesta (usar nombre_completo de persona)
      const response = {
        ...tokens,
        user: {
          id: usuario.id_usuario,
          email: usuario.email,
          nombre: usuario.persona?.nombre_completo || 'Usuario',
          rol: 'USER', // TODO: Implementar sistema de roles desde usuarios_roles
          idEmpleado: empleado?.id_empleado, // Para sincronización móvil
        },
      };

      console.log('🎉 [DEBUG] Login exitoso:', { userId: usuario.id_usuario, email: usuario.email, idEmpleado: empleado?.id_empleado });
      return response;
    } catch (error) {
      console.error('💥 [DEBUG] Error en login:', error instanceof Error ? error.message : String(error));
      throw error;
    }
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

      // 2. Buscar usuario (PK real: id_usuario)
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id_usuario: payload.sub },
      });

      if (!usuario || usuario.estado !== 'ACTIVO') {
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
   * ✅ MEJORADO: Cache en memoria para tolerar caídas de conexión
   * ✅ MEJORADO: Incluye roles reales e idEmpleado para sistema multi-asesor
   */
  async validateUser(userId: number) {
    // 1. Intentar servir desde caché
    const cached = this.userValidationCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.user;
    }

    try {
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id_usuario: userId },
        include: {
          persona: true,
          usuarios_roles: {
            include: {
              roles: true,
            },
          },
        },
      });

      if (!usuario || usuario.estado !== 'ACTIVO') {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      // Buscar empleado asociado (por id_persona)
      const empleado = await this.prisma.empleados.findFirst({
        where: { id_persona: usuario.id_persona },
      });

      // Extraer roles del usuario
      const roles = usuario.usuarios_roles?.map(
        ur => ({
          id: ur.roles.id_rol,
          codigo: ur.roles.codigo_rol,
          nombre: ur.roles.nombre_rol,
        })
      ) || [];

      // Determinar si es admin (tiene rol ADMIN, GERENTE, SUPERVISOR)
      const esSuperadminPorEmail = usuario.email === 'admin@mekanos.com';
      const esAdmin = esSuperadminPorEmail || roles.some(r => ['ADMIN', 'GERENTE', 'SUPERVISOR'].includes(r.codigo));

      // Determinar si es asesor
      const esAsesor = empleado?.es_asesor || roles.some(r => r.codigo === 'ASESOR');

      const userData = {
        id: usuario.id_usuario,
        email: usuario.email,
        nombre: usuario.persona?.nombre_completo || 'Usuario',
        personaId: usuario.id_persona,
        idEmpleado: empleado?.id_empleado || null,
        roles,
        esAdmin,
        esAsesor,
      };

      // Guardar en caché
      this.userValidationCache.set(userId, {
        user: userData,
        expiresAt: Date.now() + this.USER_CACHE_TTL_MS,
      });

      return userData;
    } catch (error) {
      // Si la BD falla pero hay caché vieja, servirla (tolerancia a cortes)
      if (cached) {
        console.warn(`⚠️ [Auth] BD caída, sirviendo caché para userId=${userId}`);
        return cached.user;
      }
      throw error;
    }
  }

  /**
   * Genera access y refresh tokens
   */
  private async generateTokens(usuario: any): Promise<{ access_token: string; refresh_token: string }> {
    const payload = {
      sub: usuario.id_usuario,
      email: usuario.email,
      rol: 'USER', // TODO: Implementar roles
      personaId: usuario.id_persona,
    };

    const [access_token, refresh_token] = await Promise.all([
      // Access token (3 horas) - ✅ ENTERPRISE: Tiempo extendido para operaciones de campo
      this.jwtService.signAsync(payload, {
        expiresIn: '3h',
      }),
      // Refresh token (7 días) - override secret
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    return { access_token, refresh_token };
  }
}
