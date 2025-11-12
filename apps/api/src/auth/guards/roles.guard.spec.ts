import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 1, rol: 'ADMIN' },
        }),
      }),
    } as unknown as ExecutionContext;

    // Act
    const result = guard.canActivate(mockExecutionContext);

    // Assert
    expect(result).toBe(true);
  });

  it('should allow access when user has required role', () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 1, email: 'admin@mekanos.com', rol: 'ADMIN' },
        }),
      }),
    } as unknown as ExecutionContext;

    // Act
    const result = guard.canActivate(mockExecutionContext);

    // Assert
    expect(result).toBe(true);
  });

  it('should deny access when user does not have required role', () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 2, email: 'tecnico@mekanos.com', rol: 'TECNICO' },
        }),
      }),
    } as unknown as ExecutionContext;

    // Act & Assert
    expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(mockExecutionContext)).toThrow('Acceso denegado');
  });

  it('should allow access when user has one of multiple required roles', () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'TECNICO']);

    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 2, email: 'tecnico@mekanos.com', rol: 'TECNICO' },
        }),
      }),
    } as unknown as ExecutionContext;

    // Act
    const result = guard.canActivate(mockExecutionContext);

    // Assert
    expect(result).toBe(true);
  });

  it('should deny access when user has none of the required roles', () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN', 'TECNICO']);

    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          user: { id: 3, email: 'cliente@empresa.com', rol: 'CLIENTE' },
        }),
      }),
    } as unknown as ExecutionContext;

    // Act & Assert
    expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(mockExecutionContext)).toThrow('Acceso denegado');
  });

  it('should deny access when no user is present', () => {
    // Arrange
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['ADMIN']);

    const mockExecutionContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;

    // Act & Assert
    expect(() => guard.canActivate(mockExecutionContext)).toThrow(TypeError);
  });
});
