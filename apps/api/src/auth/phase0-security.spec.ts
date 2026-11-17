import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { DashboardService } from '../dashboard/dashboard.service';
import { SyncService } from '../sync/sync.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthService } from './auth.service';
import { resolveRequiredAuthSecret } from './config/auth-secrets.helper';

describe('Fase 0 - Contención de Seguridad Zero-Trust', () => {
  describe('resolveRequiredAuthSecret', () => {
    const prevEnv = process.env.JWT_SECRET;

    afterEach(() => {
      if (prevEnv === undefined) {
        delete process.env.JWT_SECRET;
      } else {
        process.env.JWT_SECRET = prevEnv;
      }
    });

    it('debe fallar si JWT_SECRET está ausente o vacío', () => {
      delete process.env.JWT_SECRET;
      const cfg = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService;

      expect(() => resolveRequiredAuthSecret(cfg, 'JWT_SECRET')).toThrow(/obligatoria/);
    });

    it('debe rechazar fallbacks inseguros conocidos', () => {
      const cfg = { get: jest.fn().mockReturnValue('fallback-secret') } as unknown as ConfigService;

      expect(() => resolveRequiredAuthSecret(cfg, 'JWT_SECRET')).toThrow(/inseguro/);
    });

    it('debe retornar el secreto configurado cuando es válido', () => {
      const cfg = { get: jest.fn().mockReturnValue('super-strong-prod-secret-xyz') } as unknown as ConfigService;

      expect(resolveRequiredAuthSecret(cfg, 'JWT_SECRET')).toBe('super-strong-prod-secret-xyz');
    });
  });

  describe('AuthService roles reales y eliminación de backdoor', () => {
    it('emite rol real desde usuarios_roles y no concede admin implícito por email', async () => {
      const passwordHash = await bcrypt.hash('Secret123!', 10);
      const prismaMock: any = {
        usuarios: {
          findUnique: jest.fn().mockResolvedValue({
            id_usuario: 77,
            id_persona: 10,
            email: 'admin@mekanos.com',
            username: 'tech77',
            estado: 'ACTIVO',
            password_hash: passwordHash,
            persona: { nombre_completo: 'Técnico Real' },
            usuarios_roles: [
              { roles: { id_rol: 2, codigo_rol: 'TECNICO', nombre_rol: 'Técnico' } },
            ],
          }),
        },
        empleados: {
          findFirst: jest.fn().mockResolvedValue({ id_empleado: 55, es_asesor: false }),
        },
      };

      const jwtMock: any = {
        signAsync: jest.fn().mockResolvedValue('signed-token'),
        verify: jest.fn(),
      };
      const configMock: any = {
        get: jest.fn((k: string) => (k === 'JWT_REFRESH_SECRET' ? 'refresh-secret-valid' : 'jwt-secret-valid')),
      };

      const service = new AuthService(prismaMock, jwtMock, configMock);
      const res = await service.login({ email: 'admin@mekanos.com', password: 'Secret123!' });

      expect(res.user.rol).toBe('TECNICO');
      expect(res.user.roles).toEqual(['TECNICO']);
      expect(jwtMock.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 77,
          rol: 'TECNICO',
          roles: ['TECNICO'],
        }),
        expect.any(Object),
      );

      const validated = await service.validateUser(77);
      expect(validated.esAdmin).toBe(false);
      expect(validated.rol).toBe('TECNICO');
    });
  });

  describe('SyncService control IDOR y permiso-edicion', () => {
    it('bloquea acceso cuando un técnico intenta sincronizar otro tecnicoId', () => {
      const syncService = new SyncService({} as any);

      expect(() =>
        syncService.assertCanAccessTecnicoSync(99, { id: 1, idEmpleado: 12, esAdmin: false }),
      ).toThrow(ForbiddenException);

      expect(() =>
        syncService.assertCanAccessTecnicoSync(12, { id: 1, idEmpleado: 12, esAdmin: false }),
      ).not.toThrow();

      expect(() =>
        syncService.assertCanAccessTecnicoSync(99, { id: 1, idEmpleado: null, esAdmin: true }),
      ).not.toThrow();
    });

    it('no concede permiso de edición cuando el usuario carece de idEmpleado y no es admin', async () => {
      const prismaMock: any = {
        ordenes_servicio: {
          findUnique: jest.fn().mockResolvedValue({
            id_orden_servicio: 500,
            id_tecnico_asignado: 15,
            edicion_tecnico_habilitada: true,
            fecha_modificacion: new Date(),
            estados_orden: { codigo_estado: 'COMPLETADA', es_estado_final: true },
          }),
        },
      };
      const syncService = new SyncService(prismaMock);

      const permisoClienteSinEmpleado = await syncService.getPermisoEdicion(500, {
        id: 20,
        idEmpleado: null,
        esAdmin: false,
      });
      expect(permisoClienteSinEmpleado.permiteEdicionTecnico).toBe(false);
    });

    it('bloquea getOrdenCompleta si la orden pertenece a otro técnico', async () => {
      const prismaMock: any = {
        ordenes_servicio: {
          findUnique: jest.fn().mockResolvedValue({
            id_orden_servicio: 801,
            id_tecnico_asignado: 44,
          }),
        },
      };
      const syncService = new SyncService(prismaMock);

      await expect(
        syncService.getOrdenCompleta(801, { id: 2, idEmpleado: 11, esAdmin: false }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('DashboardService aislamiento de notificaciones por usuario', () => {
    it('filtra notificaciones por id_usuario del solicitante', async () => {
      const prismaMock: any = {
        notificaciones: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        contratos_mantenimiento: { count: jest.fn().mockResolvedValue(0) },
        estados_orden: { findFirst: jest.fn().mockResolvedValue(null) },
        mediciones_servicio: { count: jest.fn().mockResolvedValue(0) },
        alertas_stock: { count: jest.fn().mockResolvedValue(0) },
      };

      const dashboard = new DashboardService(prismaMock);
      await dashboard.getAlertasActivas(33);

      expect(prismaMock.notificaciones.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { leida: false, id_usuario: 33 },
        }),
      );
    });
  });

  describe('UsuariosService proyección segura sin secretos', () => {
    it('usa select seguro en findAll y findOne excluyendo password_hash y password_plain', async () => {
      const prismaMock: any = {
        usuarios: {
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
          findUnique: jest.fn().mockResolvedValue({ id_usuario: 1, email: 'a@b.com' }),
        },
      };

      const usuarios = new UsuariosService(prismaMock);
      await usuarios.findAll(1, 10);
      await usuarios.findOne(1);

      const findManyArg = prismaMock.usuarios.findMany.mock.calls[0][0];
      expect(findManyArg.select).toBeDefined();
      expect(findManyArg.select.password_hash).toBeUndefined();
      expect(findManyArg.select.password_plain).toBeUndefined();
      expect(findManyArg.select.secret_2fa).toBeUndefined();

      const findUniqueArg = prismaMock.usuarios.findUnique.mock.calls[0][0];
      expect(findUniqueArg.select).toBeDefined();
      expect(findUniqueArg.select.password_hash).toBeUndefined();
      expect(findUniqueArg.select.password_plain).toBeUndefined();
    });
  });
});
