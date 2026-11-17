import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../database/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let adminHash: string;

  const prismaMock = {
    usuarios: {
      findUnique: jest.fn(),
    },
    empleados: {
      findFirst: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'unit-test-jwt-secret-key-min-32-chars-2026';
      if (key === 'JWT_REFRESH_SECRET') return 'unit-test-refresh-secret-key-min-32-chars-2026';
      if (key === 'JWT_EXPIRATION') return '15m';
      if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
      return null;
    }),
  };

  const buildActiveAdminRecord = () => ({
    id_usuario: 1,
    id_persona: 10,
    email: 'admin@empresa.test',
    username: 'admin.test',
    password_hash: adminHash,
    estado: 'ACTIVO',
    persona: {
      nombre_completo: 'Admin Plataforma',
      primer_nombre: 'Admin',
      primer_apellido: 'Plataforma',
    },
    usuarios_roles: [
      {
        roles: {
          id_rol: 1,
          codigo_rol: 'ADMIN',
          nombre_rol: 'Administrador',
          roles_permisos: [
            { permisos: { codigo_permiso: 'CONFIG_SYSTEM' } },
            { permisos: { codigo_permiso: 'ORDENES_READ' } },
          ],
        },
      },
    ],
  });

  beforeAll(async () => {
    adminHash = await bcrypt.hash('Admin123!', 10);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock.usuarios.findUnique.mockResolvedValue(buildActiveAdminRecord());
    prismaMock.empleados.findFirst.mockResolvedValue({ id_empleado: 100, es_asesor: false });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    service.clearAllValidationCache();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens, real roles and permissions for valid credentials', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('mock-access-token')
        .mockResolvedValueOnce('mock-refresh-token');

      const result = await service.login({
        email: 'admin@empresa.test',
        password: 'Admin123!',
      });

      expect(result).toHaveProperty('access_token', 'mock-access-token');
      expect(result).toHaveProperty('refresh_token', 'mock-refresh-token');
      expect(result.user).toMatchObject({
        id: 1,
        email: 'admin@empresa.test',
        rol: 'ADMIN',
        roles: ['ADMIN'],
        permisos: ['CONFIG_SYSTEM', 'ORDENES_READ'],
        idEmpleado: 100,
      });
      expect(result.user.nombre).toContain('Admin');
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      prismaMock.usuarios.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'missing@empresa.test', password: 'WrongPassword' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      await expect(
        service.login({ email: 'admin@empresa.test', password: 'WrongPassword123!' }),
      ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      prismaMock.usuarios.findUnique.mockResolvedValue({
        ...buildActiveAdminRecord(),
        id_usuario: 999,
        estado: 'INACTIVO',
      });

      await expect(
        service.login({ email: 'admin@empresa.test', password: 'Admin123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return hydrated user context for valid userId', async () => {
      const result = await service.validateUser(1);

      expect(result).toMatchObject({
        id: 1,
        email: 'admin@empresa.test',
        rol: 'ADMIN',
        esAdmin: true,
        permisos: ['CONFIG_SYSTEM', 'ORDENES_READ'],
      });
      expect(result.nombre).toContain('Admin');
    });

    it('should throw UnauthorizedException for missing userId', async () => {
      prismaMock.usuarios.findUnique.mockResolvedValue(null);

      await expect(service.validateUser(9999)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      prismaMock.usuarios.findUnique.mockResolvedValueOnce({
        ...buildActiveAdminRecord(),
        id_usuario: 888,
        estado: 'BLOQUEADO',
      });

      await expect(service.validateUser(888)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens for valid refresh token', async () => {
      mockJwtService.verify.mockReturnValueOnce({ sub: 1, email: 'admin@empresa.test' });
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens('valid-refresh-token');

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      });
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-refresh-token', {
        secret: 'unit-test-refresh-secret-key-min-32-chars-2026',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(
        new UnauthorizedException('Refresh token inválido o expirado'),
      );
    });

    it('should throw UnauthorizedException for inactive user during refresh', async () => {
      mockJwtService.verify.mockReturnValueOnce({ sub: 999 });
      prismaMock.usuarios.findUnique.mockResolvedValueOnce({
        ...buildActiveAdminRecord(),
        id_usuario: 999,
        estado: 'INACTIVO',
      });

      await expect(service.refreshTokens('valid-refresh-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
