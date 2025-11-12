import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { MockPrismaService } from '../common/mocks/mock-prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: MockPrismaService;

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        MockPrismaService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    mockPrisma = module.get<MockPrismaService>(MockPrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens and user info for valid credentials', async () => {
      // Arrange
      const loginDto = {
        email: 'admin@mekanos.com',
        password: 'Admin123!',
      };

      mockJwtService.signAsync.mockResolvedValueOnce('mock-access-token');
      mockJwtService.signAsync.mockResolvedValueOnce('mock-refresh-token');

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toHaveProperty('access_token', 'mock-access-token');
      expect(result).toHaveProperty('refresh_token', 'mock-refresh-token');
      expect(result.user).toMatchObject({
        email: 'admin@mekanos.com',
        rol: 'ADMIN',
      });
      expect(result.user.nombre).toContain('Admin');
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      // Arrange
      const loginDto = {
        email: 'invalid@example.com',
        password: 'WrongPassword',
      };

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      // Arrange
      const loginDto = {
        email: 'admin@mekanos.com',
        password: 'WrongPassword123!',
      };

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      // Arrange
      const inactiveUser = {
        id: 999,
        email: 'inactive@mekanos.com',
        passwordHash: await bcrypt.hash('Test123!', 10),
        activo: false,
        rol: 'CLIENTE' as const,
        personaId: 999,
        fechaCreacion: new Date(),
        ultimaActualizacion: new Date(),
        persona: {
          id: 999,
          nombre: 'Usuario',
          apellido: 'Inactivo',
          tipoDocumento: 'CC' as const,
          numeroDocumento: '999999999',
          telefono: '',
          email: 'inactive@mekanos.com',
          activo: true,
          direccion: null,
          ciudad: null,
          departamento: null,
          fechaCreacion: new Date(),
          ultimaActualizacion: new Date(),
        },
      };

      // Mock findUnique to return inactive user (need two calls since we call login twice)
      jest.spyOn(mockPrisma.usuarios, 'findUnique')
        .mockResolvedValueOnce(inactiveUser as any)
        .mockResolvedValueOnce(inactiveUser as any);

      const loginDto = {
        email: 'inactive@mekanos.com',
        password: 'Test123!',
      };

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
      await expect(service.login(loginDto)).rejects.toThrow('Usuario inactivo');
    });
  });

  describe('validateUser', () => {
    it('should return user data for valid userId', async () => {
      // Arrange
      const userId = 1; // Admin user

      // Act
      const result = await service.validateUser(userId);

      // Assert
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('email', 'admin@mekanos.com');
      expect(result).toHaveProperty('rol', 'ADMIN');
      expect(result.nombre).toContain('Admin');
    });

    it('should throw UnauthorizedException for invalid userId', async () => {
      // Arrange
      const invalidUserId = 9999;

      // Act & Assert
      await expect(service.validateUser(invalidUserId)).rejects.toThrow(UnauthorizedException);
      await expect(service.validateUser(invalidUserId)).rejects.toThrow('Usuario no encontrado o inactivo');
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      // Arrange
      const inactiveUser = {
        id: 888,
        email: 'inactive2@mekanos.com',
        passwordHash: await bcrypt.hash('Test123!', 10),
        activo: false,
        rol: 'TECNICO' as const,
        personaId: 888,
        fechaCreacion: new Date(),
        ultimaActualizacion: new Date(),
        persona: {
          id: 888,
          nombre: 'Tecnico',
          apellido: 'Inactivo',
          tipoDocumento: 'CC' as const,
          numeroDocumento: '888888888',
          telefono: '',
          email: 'inactive2@mekanos.com',
          activo: true,
          fechaCreacion: new Date(),
          ultimaActualizacion: new Date(),
        },
      };

      jest.spyOn(mockPrisma.usuarios, 'findUnique').mockResolvedValueOnce(inactiveUser as any);

      // Act & Assert
      await expect(service.validateUser(888)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens for valid refresh token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { sub: 1, email: 'admin@mekanos.com', rol: 'ADMIN' };

      mockJwtService.verify.mockReturnValueOnce(mockPayload);
      mockJwtService.signAsync.mockResolvedValueOnce('new-access-token');
      mockJwtService.signAsync.mockResolvedValueOnce('new-refresh-token');

      // Act
      const result = await service.refreshTokens(refreshToken);

      // Assert
      expect(result).toHaveProperty('access_token', 'new-access-token');
      expect(result).toHaveProperty('refresh_token', 'new-refresh-token');
      expect(mockJwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret',
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const invalidToken = 'invalid-token';
      mockJwtService.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshTokens(invalidToken)).rejects.toThrow(UnauthorizedException);
      await expect(service.refreshTokens(invalidToken)).rejects.toThrow('Refresh token inválido o expirado');
    });

    it('should throw UnauthorizedException for inactive user during refresh', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const mockPayload = { sub: 999, email: 'inactive@mekanos.com', rol: 'CLIENTE' };

      const inactiveUser = {
        id: 999,
        email: 'inactive@mekanos.com',
        passwordHash: await bcrypt.hash('Test123!', 10),
        activo: false,
        rol: 'CLIENTE' as const,
        personaId: 999,
        fechaCreacion: new Date(),
        ultimaActualizacion: new Date(),
        persona: {
          id: 999,
          nombre: 'Usuario',
          apellido: 'Inactivo',
          tipoDocumento: 'CC' as const,
          numeroDocumento: '999999999',
          telefono: '',
          email: 'inactive@mekanos.com',
          activo: true,
          fechaCreacion: new Date(),
          ultimaActualizacion: new Date(),
        },
      };

      mockJwtService.verify.mockReturnValueOnce(mockPayload);
      jest.spyOn(mockPrisma.usuarios, 'findUnique').mockResolvedValueOnce(inactiveUser as any);

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getMockUsers', () => {
    it('should return list of mock users without sensitive data', () => {
      // Act
      const users = service.getMockUsers();

      // Assert
      expect(users).toHaveLength(3);
      expect(users[0]).toHaveProperty('id');
      expect(users[0]).toHaveProperty('email');
      expect(users[0]).toHaveProperty('nombre');
      expect(users[0]).toHaveProperty('rol');
      expect(users[0]).not.toHaveProperty('passwordHash');
      
      // Verify all roles are present
      const roles = users.map(u => u.rol);
      expect(roles).toContain('ADMIN');
      expect(roles).toContain('TECNICO');
      expect(roles).toContain('CLIENTE');
    });
  });
});
