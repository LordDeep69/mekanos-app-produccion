import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    login: jest.fn(),
    refreshTokens: jest.fn(),
    validateUser: jest.fn(),
  };

  const mockUser = {
    id: 1,
    email: 'admin@mekanos.com',
    nombre: 'Admin Mekanos',
    rol: 'ADMIN',
    personaId: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should return tokens and user info for valid credentials', async () => {
      // Arrange
      const loginDto = {
        email: 'admin@mekanos.com',
        password: 'Admin123!',
      };

      const authResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 1,
          email: 'admin@mekanos.com',
          nombre: 'Admin Mekanos',
          rol: 'ADMIN',
        },
      };

      mockAuthService.login.mockResolvedValue(authResponse);

      // Act
      const result = await controller.login(loginDto);

      // Assert
      expect(result).toEqual(authResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockAuthService.login).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      // Arrange
      const loginDto = {
        email: 'invalid@example.com',
        password: 'WrongPassword',
      };

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Credenciales inválidas')
      );

      // Act & Assert
      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('refresh', () => {
    it('should return new tokens for valid refresh token', async () => {
      // Arrange
      const refreshDto = {
        refresh_token: 'valid-refresh-token',
      };

      const tokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      };

      mockAuthService.refreshTokens.mockResolvedValue(tokens);

      // Act
      const result = await controller.refresh(refreshDto);

      // Assert
      expect(result).toEqual(tokens);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('valid-refresh-token');
      expect(mockAuthService.refreshTokens).toHaveBeenCalledTimes(1);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      // Arrange
      const refreshDto = {
        refresh_token: 'invalid-token',
      };

      mockAuthService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Refresh token inválido o expirado')
      );

      // Act & Assert
      await expect(controller.refresh(refreshDto)).rejects.toThrow(UnauthorizedException);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith('invalid-token');
    });
  });

  describe('getProfile', () => {
    it('should return current user info with message', async () => {
      // Act
      const result = await controller.getProfile(mockUser);

      // Assert
      expect(result).toEqual({
        message: 'Perfil del usuario autenticado',
        user: mockUser,
      });
    });

    it('should work for different users', async () => {
      // Arrange
      const tecnicoUser = {
        id: 2,
        email: 'tecnico@mekanos.com',
        nombre: 'Juan Pérez',
        rol: 'TECNICO',
        personaId: 2,
      };

      // Act
      const result = await controller.getProfile(tecnicoUser);

      // Assert
      expect(result).toEqual({
        message: 'Perfil del usuario autenticado',
        user: tecnicoUser,
      });
    });
  });

  describe('adminTest', () => {
    it('should return admin success message', async () => {
      // Act
      const result = await controller.adminTest(mockUser);

      // Assert
      expect(result).toEqual({
        message: '🎉 ¡Acceso admin exitoso!',
        user: mockUser,
        timestamp: expect.any(String),
      });
    });

    it('should return timestamp in ISO format', async () => {
      // Act
      const result = await controller.adminTest(mockUser);

      // Assert
      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('techTest', () => {
    it('should return tech success message', async () => {
      // Act
      const result = await controller.techTest(mockUser);

      // Assert
      expect(result).toEqual({
        message: '🔧 ¡Acceso técnico exitoso!',
        user: mockUser,
        timestamp: expect.any(String),
      });
    });

    it('should return valid timestamp', async () => {
      // Act
      const result = await controller.techTest(mockUser);

      // Assert
      const timestamp = new Date(result.timestamp);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });
  });
});
