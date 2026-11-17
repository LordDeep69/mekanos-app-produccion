import { BadRequestException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CreateAlertasStockDto } from '../alertas-stock/dto/create-alertas-stock.dto';
import { decryptSecret, encryptSecret, isEncryptedSecret } from '../common/utils/crypto-secrets.util';
import { ConfiguracionOrganizacionService } from '../configuracion-organizacion/configuracion-organizacion.service';
import { UpdateConfiguracionOrganizacionDto } from '../configuracion-organizacion/dto/update-configuracion-organizacion.dto';
import { CreateContratosMantenimientoDto } from '../contratos-mantenimiento/dto/create-contratos-mantenimiento.dto';
import { CuentasEmailService } from '../cuentas-email/cuentas-email.service';
import { RolesPermisosService } from '../roles-permisos/roles-permisos.service';
import { CreateTiposComponenteDto, CategoriaComponenteEnum } from '../tipos-componente/dto/create-tipos-componente.dto';
import { PrismaTiposComponenteRepository } from '../tipos-componente/infrastructure/prisma-tipos-componente.repository';
import { UsuariosRolesService } from '../usuarios-roles/usuarios-roles.service';
import { PermisosGuard } from './guards/permisos.guard';

describe('Fase 1 - Cimientos White-Label, RBAC, Cifrado y DTOs Estrictos', () => {
  describe('PermisosGuard', () => {
    const createMockContext = (user: any) =>
      ({
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      }) as any;

    it('rechaza con 403 cuando un TECNICO no tiene el permiso requerido', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['CONFIG_SYSTEM']),
      } as unknown as Reflector;
      const guard = new PermisosGuard(reflector);

      expect(() =>
        guard.canActivate(
          createMockContext({
            id: 2,
            rol: 'TECNICO',
            roles: ['TECNICO'],
            permisos: ['ORDENES_READ', 'ORDENES_EXECUTE'],
          }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('permite acceso cuando el usuario posee todos los permisos requeridos', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['ORDENES_READ', 'ORDENES_EXECUTE']),
      } as unknown as Reflector;
      const guard = new PermisosGuard(reflector);

      expect(
        guard.canActivate(
          createMockContext({
            id: 2,
            rol: 'TECNICO',
            roles: ['TECNICO'],
            permisos: ['ORDENES_READ', 'ORDENES_EXECUTE', 'ORDENES_EVIDENCE'],
          }),
        ),
      ).toBe(true);
    });

    it('concede bypass para rol ADMIN o SUPERADMIN', () => {
      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(['CONFIG_SYSTEM']),
      } as unknown as Reflector;
      const guard = new PermisosGuard(reflector);

      expect(
        guard.canActivate(
          createMockContext({
            id: 1,
            rol: 'ADMIN',
            roles: ['ADMIN'],
            permisos: [],
          }),
        ),
      ).toBe(true);
    });
  });

  describe('Invalidación de caché RBAC ante mutaciones', () => {
    it('limpia toda la caché en RolesPermisosService.asignarPermiso y removerPermiso', async () => {
      const authMock = { clearAllValidationCache: jest.fn() } as any;
      const prismaMock: any = {
        roles: { findUnique: jest.fn().mockResolvedValue({ id_rol: 13 }) },
        permisos: { findUnique: jest.fn().mockResolvedValue({ id_permiso: 10 }) },
        roles_permisos: {
          findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id_rol: 13 }),
          create: jest.fn().mockResolvedValue({ id_rol: 13, id_permiso: 10 }),
          delete: jest.fn().mockResolvedValue({ id_rol: 13, id_permiso: 10 }),
        },
      };
      const service = new RolesPermisosService(prismaMock, authMock);

      await service.asignarPermiso({ id_rol: 13, id_permiso: 10 }, 1);
      await service.removerPermiso(13, 10);

      expect(authMock.clearAllValidationCache).toHaveBeenCalledTimes(2);
    });

    it('invalida la caché puntual en UsuariosRolesService.asignarRol y removerRol', async () => {
      const authMock = { invalidateUserCache: jest.fn() } as any;
      const prismaMock: any = {
        usuarios: { findUnique: jest.fn().mockResolvedValue({ id_usuario: 7 }) },
        roles: { findUnique: jest.fn().mockResolvedValue({ id_rol: 5 }) },
        usuarios_roles: {
          findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id_usuario: 7 }),
          create: jest.fn().mockResolvedValue({ id_usuario: 7, id_rol: 5 }),
          delete: jest.fn().mockResolvedValue({ id_usuario: 7, id_rol: 5 }),
        },
      };
      const service = new UsuariosRolesService(prismaMock, authMock);

      await service.asignarRol({ id_usuario: 7, id_rol: 5 }, 1);
      await service.removerRol(7, 5);

      expect(authMock.invalidateUserCache).toHaveBeenNthCalledWith(1, 7);
      expect(authMock.invalidateUserCache).toHaveBeenNthCalledWith(2, 7);
    });
  });

  describe('CryptoSecretsUtil AES-256-GCM', () => {
    const validMasterKey = 'super-secure-master-encryption-key-2026!';

    it('cifra con IV aleatorio y descifra idénticamente el secreto', () => {
      const c1 = encryptSecret('SmtpPass$123', validMasterKey);
      const c2 = encryptSecret('SmtpPass$123', validMasterKey);

      expect(c1).not.toBe(c2);
      expect(isEncryptedSecret(c1)).toBe(true);
      expect(decryptSecret(c1, validMasterKey)).toBe('SmtpPass$123');
      expect(decryptSecret(c2, validMasterKey)).toBe('SmtpPass$123');
    });

    it('detecta adulteración del payload cifrado', () => {
      const encrypted = encryptSecret('SmtpPass$123', validMasterKey);
      const parts = encrypted.split(':');
      parts[3] = Buffer.from('tampered-ciphertext').toString('base64');

      expect(() => decryptSecret(parts.join(':'), validMasterKey)).toThrow();
    });

    it('rechaza claves maestras inseguras o cortas', () => {
      expect(() => encryptSecret('SmtpPass$123', 'fallback-secret')).toThrow(/insegura/i);
      expect(() => encryptSecret('SmtpPass$123', 'short')).toThrow(/corta/i);
    });
  });

  describe('ConfiguracionOrganizacionService', () => {
    it('expone solo campos públicos en getPublica y actualiza caché con updateEmpresa', async () => {
      const storedRow = {
        id_configuracion: 1,
        nombre_comercial: 'Mi Organización',
        razon_social: 'Mi Organización S.A.',
        tipo_id_fiscal: 'NIT',
        numero_id_fiscal: 'SECRET-TAX-999',
        eslogan: 'Precisión Industrial',
        sitio_web: 'https://acme.example',
        email_contacto: 'info@acme.example',
        telefono_principal: '+34910000000',
        telefono_soporte: '+34910000001',
        direccion_linea1: 'Calle 1',
        ciudad_defecto: 'Madrid',
        departamento_defecto: 'Madrid',
        pais_defecto: 'España',
        codigo_pais_iso: 'ES',
        logo_principal_url: null,
        logo_claro_url: null,
        isotipo_url: null,
        favicon_url: null,
        color_primario: '#112233',
        color_secundario: '#0F172A',
        color_acento: '#0EA5E9',
        color_exito: '#16A34A',
        color_alerta: '#D97706',
        color_peligro: '#DC2626',
        zona_horaria: 'Europe/Madrid',
        locale: 'es-ES',
        codigo_moneda: 'EUR',
        simbolo_moneda: '€',
        decimales_moneda: 2,
        etiqueta_impuesto: 'IVA',
        tasa_impuesto_defecto: 21,
        prefijo_orden: 'OT',
        prefijo_cotizacion: 'PRES',
        prefijo_informe: 'INF',
        prefijo_remision: 'ALB',
        prefijo_oc: 'OC',
        prefijo_contrato: 'CONT',
        prefijo_propuesta: 'PROP',
        texto_pie_pdf: null,
        texto_disclaimer_repuestos_cliente: null,
        garantia_meses_defecto: 6,
        validez_cotizacion_dias_defecto: 15,
        requiere_firma_cliente_defecto: true,
        storage_prefijo_raiz: 'acme-tenant-bucket',
        politica_retencion_mobile_dias: 30,
        modulo_comercial_activo: true,
        modulo_inventario_activo: true,
        fecha_creacion: new Date(),
        fecha_modificacion: new Date(),
        modificado_por: 1,
      };

      const prismaMock: any = {
        configuracion_organizacion: {
          findUnique: jest.fn().mockResolvedValue(storedRow),
          upsert: jest.fn().mockImplementation(async ({ update }) => ({
            ...storedRow,
            ...update,
          })),
        },
      };

      const service = new ConfiguracionOrganizacionService(prismaMock);
      const publicaInicial: any = await service.getPublica();
      expect(publicaInicial.nombre_comercial).toBe('Mi Organización');
      expect(publicaInicial.numero_id_fiscal).toBeUndefined();
      expect(publicaInicial.storage_prefijo_raiz).toBeUndefined();

      await service.updateEmpresa(
        {
          nombre_comercial: 'ClimaTotal Europe',
          codigo_moneda: 'USD',
          simbolo_moneda: '$',
          tasa_impuesto_defecto: 16,
          zona_horaria: 'Europe/Madrid',
        },
        99,
      );

      const publicaActualizada = await service.getPublica();
      expect(publicaActualizada.nombre_comercial).toBe('ClimaTotal Europe');
      expect(publicaActualizada.codigo_moneda).toBe('USD');
      expect(publicaActualizada.tasa_impuesto_defecto).toBe(16);
      expect(publicaActualizada.zona_horaria).toBe('Europe/Madrid');
    });
  });

  describe('CuentasEmailService SMTP + AES-256-GCM', () => {
    const prevKey = process.env.CONFIG_ENCRYPTION_KEY;

    beforeEach(() => {
      process.env.CONFIG_ENCRYPTION_KEY = 'unit-test-crypto-master-secret-2026';
    });

    afterEach(() => {
      if (prevKey === undefined) delete process.env.CONFIG_ENCRYPTION_KEY;
      else process.env.CONFIG_ENCRYPTION_KEY = prevKey;
    });

    it('cifra smtp_password antes de persistir y nunca la expone en sanitizeCuenta', async () => {
      const prismaMock: any = {
        cuentas_email: {
          updateMany: jest.fn(),
          create: jest.fn().mockImplementation(async ({ data }) => ({
            id_cuenta_email: 10,
            ...data,
          })),
        },
      };
      const service = new CuentasEmailService(prismaMock);
      jest.spyOn(service, 'verificarCredencialesSmtp').mockResolvedValue(true);

      const res: any = await service.create(
        {
          nombre: 'SMTP Corporativo',
          email: 'soporte@empresa.test',
          tipo_proveedor: 'SMTP',
          smtp_host: 'smtp.empresa.test',
          smtp_port: 465,
          smtp_secure: true,
          smtp_user: 'soporte@empresa.test',
          smtp_password: 'UltraSecretSmtpPassword!',
          es_cuenta_principal: true,
        },
        5,
      );

      const persisted = prismaMock.cuentas_email.create.mock.calls[0][0].data;
      expect(isEncryptedSecret(persisted.smtp_password_enc)).toBe(true);
      expect(decryptSecret(persisted.smtp_password_enc)).toBe('UltraSecretSmtpPassword!');
      expect(res.smtp_password_enc).toBeUndefined();
      expect(res.smtp_password).toBeUndefined();
      expect(res.smtp_password_configurada).toBe(true);
      expect(res.credenciales_configuradas).toBe(true);
    });
  });

  describe('TiposComponenteRepository N:M', () => {
    it('persiste relación N:M para Ascensores y consulta por id_tipo_equipo sin PK manual', async () => {
      const txMock = {
        tipos_equipo: {
          findMany: jest.fn().mockResolvedValue([{ id_tipo_equipo: 22 }]),
        },
        tipos_componente: {
          create: jest.fn().mockResolvedValue({
            id_tipo_componente: 30,
            codigo_tipo: 'CABLE_TRACCION_ASC',
            nombre_componente: 'Cable de Tracción',
            categoria: 'OTRO',
            subcategoria: null,
            es_consumible: true,
            es_inventariable: true,
            aplica_a: null,
            aplica_todos_tipos: false,
            descripcion: null,
            activo: true,
            creado_por: 1,
            fecha_creacion: new Date(),
            tipos_componente_tipo_equipo: [
              {
                id_tipo_equipo: 22,
                tipos_equipo: { id_tipo_equipo: 22, codigo_tipo: 'ELEV', nombre_tipo: 'Ascensor' },
              },
            ],
          }),
        },
      };
      const prismaMock: any = {
        tipos_componente: {
          findFirst: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
        },
        $transaction: jest.fn().mockImplementation((cb) => cb(txMock)),
      };

      const repo = new PrismaTiposComponenteRepository(prismaMock);
      const created = await repo.crear({
        codigo_tipo: 'CABLE_TRACCION_ASC',
        nombre_componente: 'Cable de Tracción',
        categoria: 'OTRO',
        tipos_equipo_ids: [22],
        aplica_todos_tipos: false,
        creado_por: 1,
      });

      const createPayload = txMock.tipos_componente.create.mock.calls[0][0].data;
      expect(createPayload.id_tipo_componente).toBeUndefined();
      expect(created.tipos_equipo_ids).toEqual([22]);

      await repo.findAll({ id_tipo_equipo: 22 });
      expect(prismaMock.tipos_componente.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { aplica_todos_tipos: true },
              { tipos_componente_tipo_equipo: { some: { id_tipo_equipo: 22 } } },
            ],
          },
        }),
      );
    });
  });

  describe('ValidationPipe estricto (whitelist + forbidNonWhitelisted)', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });

    it('rechaza campos extra no declarados en CreateContratosMantenimientoDto y CreateAlertasStockDto', async () => {
      await expect(
        pipe.transform(
          {
            id_cliente: 1,
            id_asesor_responsable: 2,
            fecha_inicio: '2026-11-16',
            es_admin_oculto: true,
          },
          { type: 'body', metatype: CreateContratosMantenimientoDto },
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        pipe.transform(
          {
            tipo_alerta: 'STOCK_MINIMO',
            nivel: 'ADVERTENCIA',
            mensaje: 'Stock bajo',
            propiedad_inyectada: 'hack',
          },
          { type: 'body', metatype: CreateAlertasStockDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('acepta payloads válidos en UpdateConfiguracionOrganizacionDto y CreateTiposComponenteDto', async () => {
      const cfg = await pipe.transform(
        {
          nombre_comercial: 'ClimaTotal EUR',
          codigo_moneda: 'EUR',
          tasa_impuesto_defecto: 21,
          color_primario: '#0A2540',
        },
        { type: 'body', metatype: UpdateConfiguracionOrganizacionDto },
      );
      expect(cfg.nombre_comercial).toBe('ClimaTotal EUR');

      const tc = await pipe.transform(
        {
          codigo_tipo: 'SENSOR_PUERTA',
          nombre_componente: 'Sensor Cortina de Luz',
          categoria: CategoriaComponenteEnum.ELECTRICO,
          aplica_todos_tipos: false,
          tipos_equipo_ids: [22],
        },
        { type: 'body', metatype: CreateTiposComponenteDto },
      );
      expect(tc.tipos_equipo_ids).toEqual([22]);
    });
  });
});
