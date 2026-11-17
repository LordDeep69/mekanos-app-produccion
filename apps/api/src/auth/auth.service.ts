import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { resolveRequiredAuthSecret } from './config/auth-secrets.helper';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';

const ROLE_PRECEDENCE = [
  'SUPERADMIN',
  'ADMIN',
  'GERENTE',
  'SUPERVISOR',
  'ASESOR_COMERCIAL',
  'ASESOR',
  'TECNICO_SENIOR',
  'TECNICO',
  'AUXILIAR',
  'ALMACEN',
  'COMPRAS',
  'CLIENTE_PORTAL',
  'CLIENTE',
] as const;

const ADMIN_ROLE_CODES = new Set(['SUPERADMIN', 'ADMIN', 'GERENTE', 'SUPERVISOR']);

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
   * Invalida la caché de validación de todos los usuarios (ej. tras mutación de roles_permisos)
   */
  clearAllValidationCache() {
    this.userValidationCache.clear();
  }

  private extractDisplayName(usuario: any): string {
    const partes = [
      usuario.persona?.primer_nombre,
      usuario.persona?.segundo_nombre,
      usuario.persona?.primer_apellido,
      usuario.persona?.segundo_apellido,
    ]
      .map((p: any) => (typeof p === 'string' ? p.trim() : ''))
      .filter(Boolean);

    return (
      usuario.persona?.nombre_completo?.trim() ||
      (partes.length > 0 ? partes.join(' ') : null) ||
      usuario.persona?.razon_social?.trim() ||
      usuario.username ||
      'Usuario'
    );
  }

  private extractUserRoleContext(usuario: any, empleado?: any) {
    const roles =
      usuario?.usuarios_roles
        ?.map((ur: any) =>
          ur?.roles
            ? {
                id: ur.roles.id_rol,
                codigo: String(ur.roles.codigo_rol || '').toUpperCase(),
                nombre: ur.roles.nombre_rol,
              }
            : null,
        )
        .filter((r: any) => r && r.codigo) || [];

    const roleCodes: string[] = Array.from(
      new Set<string>(roles.map((r: any) => String(r.codigo))),
    );
    const permisosSet = new Set<string>();
    for (const ur of usuario?.usuarios_roles || []) {
      const rpList = ur?.roles?.roles_permisos || [];
      for (const rp of rpList) {
        const codigoPerm = rp?.permisos?.codigo_permiso;
        if (codigoPerm) {
          permisosSet.add(String(codigoPerm).toUpperCase());
        }
      }
    }
    const permisos = Array.from(permisosSet);
    const rolPrincipal =
      ROLE_PRECEDENCE.find((code) => roleCodes.includes(code)) || roleCodes[0] || 'SIN_ROL';
    const esAdmin = roleCodes.some((code) => ADMIN_ROLE_CODES.has(code));
    const esAsesor =
      Boolean(empleado?.es_asesor) ||
      roleCodes.some((c) => c === 'ASESOR' || c === 'ASESOR_COMERCIAL');

    return { roles, roleCodes, permisos, rolPrincipal, esAdmin, esAsesor };
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
          usuarios_roles: {
            include: {
              roles: {
                include: {
                  roles_permisos: {
                    include: {
                      permisos: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // 🛡️ MITIGACIÓN DE TIMING ATTACKS:
      // Ejecutar siempre bcrypt.compare con hash dummy si el usuario no existe.
      // Esto garantiza un tiempo de respuesta uniforme (~1.5s) imposibilitando
      // que un atacante deduzca qué cuentas existen mediante medición de latencia.
      const DUMMY_BCRYPT_HASH = '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW';
      const hashToCompare = usuario?.password_hash || DUMMY_BCRYPT_HASH;
      const isPasswordValid = await bcrypt.compare(loginDto.password, hashToCompare);

      if (!usuario || !isPasswordValid) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // 2. Validar usuario activo (campo real: estado = 'ACTIVO')
      if (usuario.estado !== 'ACTIVO') {
        throw new UnauthorizedException('Usuario inactivo o credenciales inválidas');
      }

      // 4. Buscar empleado asociado al usuario (por id_persona)
      const empleado = await this.prisma.empleados.findFirst({
        where: { id_persona: usuario.id_persona },
      });
      console.log('👷 [DEBUG] Empleado encontrado:', empleado?.id_empleado || 'NO');

      const roleContext = this.extractUserRoleContext(usuario, empleado);
      const nombrePersona = this.extractDisplayName(usuario);

      // Invalida cualquier caché previa para reflejar cambios recientes de rol/permisos en BD
      this.invalidateUserCache(usuario.id_usuario);

      // 4.5 Generar tokens JWT con roles reales embebidos
      console.log('🎫 [DEBUG] Generando tokens JWT...');
      const tokens = await this.generateTokens(usuario, empleado, roleContext);
      console.log('✅ [DEBUG] Tokens generados exitosamente');

      // 5. Retornar respuesta con rol principal y listado de roles reales
      const response: AuthResponseDto = {
        ...tokens,
        user: {
          id: usuario.id_usuario,
          email: usuario.email,
          nombre: nombrePersona,
          rol: roleContext.rolPrincipal,
          roles: roleContext.roleCodes,
          permisos: roleContext.permisos,
          idEmpleado: empleado?.id_empleado, // Para sincronización móvil
        },
      };

      console.log('🎉 [DEBUG] Login exitoso:', {
        userId: usuario.id_usuario,
        email: usuario.email,
        nombre: nombrePersona,
        rol: roleContext.rolPrincipal,
        idEmpleado: empleado?.id_empleado,
      });
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
        secret: resolveRequiredAuthSecret(this.configService, 'JWT_REFRESH_SECRET'),
      });

      // 2. Buscar usuario (PK real: id_usuario)
      const usuario = await this.prisma.usuarios.findUnique({
        where: { id_usuario: payload.sub },
        include: {
          persona: true,
          usuarios_roles: {
            include: {
              roles: {
                include: {
                  roles_permisos: {
                    include: {
                      permisos: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!usuario || usuario.estado !== 'ACTIVO') {
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      const empleado = await this.prisma.empleados.findFirst({
        where: { id_persona: usuario.id_persona },
      });
      const roleContext = this.extractUserRoleContext(usuario, empleado);

      // 3. Generar nuevos tokens
      return this.generateTokens(usuario, empleado, roleContext);
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
              roles: {
                include: {
                  roles_permisos: {
                    include: {
                      permisos: true,
                    },
                  },
                },
              },
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

      const roleContext = this.extractUserRoleContext(usuario, empleado);

      const userData = {
        id: usuario.id_usuario,
        email: usuario.email,
        nombre: this.extractDisplayName(usuario),
        rol: roleContext.rolPrincipal,
        personaId: usuario.id_persona,
        idEmpleado: empleado?.id_empleado || null,
        roles: roleContext.roles,
        permisos: roleContext.permisos,
        esAdmin: roleContext.esAdmin,
        esAsesor: roleContext.esAsesor,
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
  private async generateTokens(
    usuario: any,
    empleado?: any,
    roleContextInput?: ReturnType<AuthService['extractUserRoleContext']>,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const roleContext = roleContextInput ?? this.extractUserRoleContext(usuario, empleado);
    const nombrePersona = this.extractDisplayName(usuario);

    const payload = {
      sub: usuario.id_usuario,
      email: usuario.email,
      nombre: nombrePersona,
      rol: roleContext.rolPrincipal,
      roles: roleContext.roleCodes,
      personaId: usuario.id_persona,
      idEmpleado: empleado?.id_empleado,
    };

    const refreshSecret = resolveRequiredAuthSecret(this.configService, 'JWT_REFRESH_SECRET');

    const [access_token, refresh_token] = await Promise.all([
      // Access token (3 horas) - ✅ ENTERPRISE: Tiempo extendido para operaciones de campo
      this.jwtService.signAsync(payload, {
        expiresIn: '3h',
      }),
      // Refresh token (7 días) - override secret
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: '7d',
      }),
    ]);

    return { access_token, refresh_token };
  }
}
