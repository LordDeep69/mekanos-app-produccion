import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { ConfiguracionOrganizacionController } from './configuracion-organizacion/configuracion-organizacion.controller';
import { UpdateConfiguracionOrganizacionDto } from './configuracion-organizacion/dto/update-configuracion-organizacion.dto';
import { PERMISOS_KEY } from './auth/decorators/permisos.decorator';
import { IS_PUBLIC_KEY } from './auth/decorators/public.decorator';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermisosGuard } from './auth/guards/permisos.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { decryptSecret, encryptSecret, isEncryptedSecret } from './common/utils/crypto-secrets.util';
import { EquipoSpecsReader } from './equipos/services/equipo-specs.reader';
import { HealthController } from './health/health.controller';
import { FinalizarOrdenCompletoDto } from './ordenes/dto/finalizar-orden-completo.dto';
import { buildOrgBranding, formatCurrencyOrg } from './pdf/org-branding.types';
import { buildInformeFilename } from './pdf/pdf-naming.helper';
import { PdfController } from './pdf/pdf.controller';
import { PdfService } from './pdf/pdf.service';
import { generarCorrectivoOrdenHTML, generarTipoUniversalEamHTML } from './pdf/templates';
import { SyncBatchUploadDto } from './sync/dto/sync-upload-orden.dto';
import { seedCore } from '../../../packages/database/prisma/seeds/seed-core';
import {
  SERVICIOS_UNIVERSALES,
  VERTICAL_PRESETS,
  seedCatalogPresets,
} from '../../../packages/database/prisma/seeds/seed-catalog-presets';

const LEGACY_LEAK_REGEX =
  /mekanos|cartagena|900\.542|900\.123|315-7083350|mekanossas|lorddeep|aws-1-sa-east-1/i;

function makeInMemorySeedPrisma() {
  const store = {
    configuracion_organizacion: new Map<number, any>(),
    categorias_activo: new Map<string, any>(),
    estados_orden: new Map<string, any>(),
    estados_cotizacion: new Map<string, any>(),
    roles: new Map<string, any>(),
    permisos: new Map<string, any>(),
    roles_permisos: new Set<string>(),
    catalogo_magnitudes: new Map<string, any>(),
    unidades_medida: new Map<string, any>(),
    personas: new Map<string, any>(),
    usuarios: new Map<string, any>(),
    usuarios_roles: new Set<string>(),
    tipos_equipo: new Map<string, any>(),
    tipos_servicio: new Map<string, any>(),
  };
  let seq = 1;

  const prismaMock: any = {
    store,
    configuracion_organizacion: {
      upsert: jest.fn(async ({ where, create }: any) => {
        if (!store.configuracion_organizacion.has(where.id_configuracion)) {
          store.configuracion_organizacion.set(where.id_configuracion, { ...create });
        }
        return store.configuracion_organizacion.get(where.id_configuracion);
      }),
    },
    categorias_activo: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = store.categorias_activo.get(where.codigo);
        if (!existing) {
          const rec = { id_categoria_activo: seq++, ...create };
          store.categorias_activo.set(where.codigo, rec);
          return rec;
        }
        Object.assign(existing, update);
        return existing;
      }),
      findMany: jest.fn(async () => Array.from(store.categorias_activo.values())),
    },
    estados_orden: {
      findFirst: jest.fn(async ({ where }: any) => store.estados_orden.get(where.codigo_estado) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const rec = { id_estado: seq++, ...data };
        store.estados_orden.set(data.codigo_estado, rec);
        return rec;
      }),
    },
    estados_cotizacion: {
      findFirst: jest.fn(async ({ where }: any) => store.estados_cotizacion.get(where.codigo_estado) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const rec = { id_estado: seq++, ...data };
        store.estados_cotizacion.set(data.codigo_estado, rec);
        return rec;
      }),
    },
    roles: {
      findFirst: jest.fn(async ({ where }: any) => store.roles.get(where.codigo_rol) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const rec = { id_rol: seq++, ...data };
        store.roles.set(data.codigo_rol, rec);
        return rec;
      }),
    },
    permisos: {
      findFirst: jest.fn(async ({ where }: any) => store.permisos.get(where.codigo_permiso) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const rec = { id_permiso: seq++, ...data };
        store.permisos.set(data.codigo_permiso, rec);
        return rec;
      }),
    },
    roles_permisos: {
      createMany: jest.fn(async ({ data }: any) => {
        let count = 0;
        for (const row of data) {
          const k = `${row.id_rol}:${row.id_permiso}`;
          if (!store.roles_permisos.has(k)) {
            store.roles_permisos.add(k);
            count++;
          }
        }
        return { count };
      }),
    },
    catalogo_magnitudes: {
      upsert: jest.fn(async ({ where, create }: any) => {
        if (!store.catalogo_magnitudes.has(where.codigo_magnitud)) {
          store.catalogo_magnitudes.set(where.codigo_magnitud, {
            id_magnitud: seq++,
            ...create,
          });
        }
        return store.catalogo_magnitudes.get(where.codigo_magnitud);
      }),
    },
    unidades_medida: {
      upsert: jest.fn(async ({ where, create }: any) => {
        if (!store.unidades_medida.has(where.codigo)) {
          store.unidades_medida.set(where.codigo, { id_unidad: seq++, ...create });
        }
        return store.unidades_medida.get(where.codigo);
      }),
    },
    personas: {
      findFirst: jest.fn(async ({ where }: any) => {
        const key = `${where.tipo_identificacion}:${where.numero_identificacion}`;
        return store.personas.get(key) ?? null;
      }),
      create: jest.fn(async ({ data }: any) => {
        const key = `${data.tipo_identificacion}:${data.numero_identificacion}`;
        const rec = { id_persona: seq++, ...data };
        store.personas.set(key, rec);
        return rec;
      }),
    },
    usuarios: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = store.usuarios.get(where.email);
        if (!existing) {
          const rec = { id_usuario: seq++, ...create };
          store.usuarios.set(where.email, rec);
          return rec;
        }
        Object.assign(existing, update);
        return existing;
      }),
    },
    usuarios_roles: {
      upsert: jest.fn(async ({ where }: any) => {
        const key = `${where.id_usuario_id_rol.id_usuario}:${where.id_usuario_id_rol.id_rol}`;
        store.usuarios_roles.add(key);
        return { ...where.id_usuario_id_rol };
      }),
    },
    tipos_equipo: {
      findFirst: jest.fn(async ({ where }: any) => store.tipos_equipo.get(where.codigo_tipo) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const rec = { id_tipo_equipo: seq++, ...data };
        store.tipos_equipo.set(data.codigo_tipo, rec);
        return rec;
      }),
    },
    tipos_servicio: {
      findFirst: jest.fn(async ({ where }: any) => store.tipos_servicio.get(where.codigo_tipo) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const rec = { id_tipo_servicio: seq++, ...data };
        store.tipos_servicio.set(data.codigo_tipo, rec);
        return rec;
      }),
    },
  };

  return prismaMock;
}

describe('Fase 6 - Empaquetado Comercial White-Label, Matriz V1-V8 x S1-S5 y Seguridad OWASP', () => {
  const brandEmpresaA = buildOrgBranding({
    id_configuracion: 1,
    nombre_comercial: 'Elevadores Andes S.A.',
    razon_social: 'Elevadores Andes Ingeniería S.A.S.',
    tipo_id_fiscal: 'NIT',
    numero_id_fiscal: '901.888.777-1',
    eslogan: 'Movilidad Vertical y Sistemas Críticos',
    ciudad_defecto: 'Medellín',
    pais_defecto: 'Colombia',
    codigo_pais_iso: 'CO',
    zona_horaria: 'America/Bogota',
    locale: 'es-CO',
    codigo_moneda: 'USD',
    simbolo_moneda: '$',
    decimales_moneda: 2,
    etiqueta_impuesto: 'IVA',
    tasa_impuesto_defecto: 19,
    color_primario: '#0F766E',
    color_secundario: '#0F172A',
    color_acento: '#14B8A6',
    texto_pie_pdf: 'Documento emitido electrónicamente por Elevadores Andes S.A.',
    email_contacto: 'soporte@andes-elevadores.test',
    telefono_principal: '+57 604 555 0101',
    telefono_soporte: '+57 604 555 0199',
  });

  const brandEmpresaB = buildOrgBranding({
    id_configuracion: 1,
    nombre_comercial: 'EuroClima Tech GmbH',
    razon_social: 'EuroClima Industrietechnik GmbH',
    tipo_id_fiscal: 'VAT',
    numero_id_fiscal: 'DE-812994510',
    eslogan: 'Präzisionswartung & Energie',
    ciudad_defecto: 'Múnich',
    pais_defecto: 'Alemania',
    codigo_pais_iso: 'DE',
    zona_horaria: 'Europe/Berlin',
    locale: 'de-DE',
    codigo_moneda: 'EUR',
    simbolo_moneda: '€',
    decimales_moneda: 2,
    etiqueta_impuesto: 'MwSt',
    tasa_impuesto_defecto: 19,
    color_primario: '#991B1B',
    color_secundario: '#111827',
    color_acento: '#F59E0B',
    texto_pie_pdf: 'Offizielles Serviceprotokoll · EuroClima Tech GmbH',
    email_contacto: 'service@euroclima.test',
    telefono_principal: '+49 89 5550 100',
    telefono_soporte: '+49 89 5550 199',
  });

  describe('1. Seeds Modulares e Idempotencia (V1..V8 & S1..S5)', () => {
    it('siembra núcleo RBAC + categorías + magnitudes + V1..V8 + S1..S5 sin duplicados en re-ejecución', async () => {
      const prevEnv = {
        SEED_ORG_NAME: process.env.SEED_ORG_NAME,
        SEED_ORG_CURRENCY: process.env.SEED_ORG_CURRENCY,
        SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
        SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
      };
      process.env.SEED_ORG_NAME = 'EuroClima Demo';
      process.env.SEED_ORG_CURRENCY = 'EUR';
      process.env.SEED_ADMIN_EMAIL = 'admin@euroclima.test';
      process.env.SEED_ADMIN_PASSWORD = 'BootstrapPassword2026!';

      try {
        const prismaMock = makeInMemorySeedPrisma();
        await seedCore(prismaMock, { verbose: false });
        await seedCatalogPresets(prismaMock, ['ALL']);

        expect(prismaMock.store.configuracion_organizacion.get(1)?.nombre_comercial).toBe(
          'EuroClima Demo',
        );
        expect(prismaMock.store.categorias_activo.size).toBeGreaterThanOrEqual(9);
        expect(prismaMock.store.roles.size).toBe(11);
        expect(prismaMock.store.permisos.size).toBe(46);

        // Cobertura exacta de V1..V8
        const codigosVerticales = Array.from(prismaMock.store.tipos_equipo.keys());
        for (const expectedCodigo of [
          'GENERADOR',
          'BOMBA',
          'ASCENSOR',
          'ESCALERA_ELEC',
          'PUERTA_AUTO',
          'SUBESTACION',
          'HVAC',
          'TUBERIA',
        ]) {
          expect(codigosVerticales).toContain(expectedCodigo);
        }

        // Cobertura exacta de S1..S5
        const categoriasServicios = Array.from(prismaMock.store.tipos_servicio.values()).map(
          (s: any) => s.categoria,
        );
        expect(categoriasServicios).toEqual(
          expect.arrayContaining(['PREVENTIVO', 'CORRECTIVO', 'INSPECCION', 'EMERGENCIA', 'DIAGNOSTICO']),
        );

        const createdBefore = {
          equipos: prismaMock.tipos_equipo.create.mock.calls.length,
          servicios: prismaMock.tipos_servicio.create.mock.calls.length,
          roles: prismaMock.roles.create.mock.calls.length,
          permisos: prismaMock.permisos.create.mock.calls.length,
        };

        // Re-ejecución idempotente (upgrade o re-run seguro)
        await seedCore(prismaMock, { verbose: false });
        await seedCatalogPresets(prismaMock, ['ALL']);

        expect(prismaMock.tipos_equipo.create.mock.calls.length).toBe(createdBefore.equipos);
        expect(prismaMock.tipos_servicio.create.mock.calls.length).toBe(createdBefore.servicios);
        expect(prismaMock.roles.create.mock.calls.length).toBe(createdBefore.roles);
        expect(prismaMock.permisos.create.mock.calls.length).toBe(createdBefore.permisos);
      } finally {
        Object.entries(prevEnv).forEach(([k, v]) => {
          if (v === undefined) delete process.env[k];
          else process.env[k] = v;
        });
      }
    });
  });

  describe('2. Certificación Matriz Multi-Activo V1..V8 x Multi-Servicio S1..S5 + Brand Swap', () => {
    const pdfService = new PdfService({} as any, {} as any, {} as any);

    const verticalSpecs: Array<{
      code: string;
      tipoNombre: string;
      marca: string;
      modelo: string;
      serie: string;
      unidadUso: string;
      atributos: Record<string, string | number>;
      parametro: string;
      unidadParam: string;
      valorParam: number;
    }> = [
      {
        code: 'GENERADOR',
        tipoNombre: 'Planta Eléctrica',
        marca: 'Cummins',
        modelo: 'C200D6',
        serie: 'GEN-001',
        unidadUso: 'HORAS',
        atributos: { potencia_standby_kw: '200 kW', tension_nominal: '440/254 V' },
        parametro: 'Presión Aceite Motor',
        unidadParam: 'PSI',
        valorParam: 54,
      },
      {
        code: 'BOMBA',
        tipoNombre: 'Motobomba Hidroneumática',
        marca: 'Grundfos',
        modelo: 'CR-45',
        serie: 'BOM-002',
        unidadUso: 'HORAS',
        atributos: { caudal_nominal: '45 m3/h', altura_dinamica: '60 m' },
        parametro: 'Presión Descarga',
        unidadParam: 'PSI',
        valorParam: 88,
      },
      {
        code: 'ASCENSOR',
        tipoNombre: 'Ascensor Pasajeros',
        marca: 'Schindler',
        modelo: '5500 MRL',
        serie: 'ASC-003',
        unidadUso: 'CICLOS',
        atributos: { paradas: 14, capacidad_kg: '1000 kg' },
        parametro: 'Corriente Motor Tracción',
        unidadParam: 'A',
        valorParam: 28.5,
      },
      {
        code: 'ESCALERA_ELEC',
        tipoNombre: 'Escalera Eléctrica',
        marca: 'Otis',
        modelo: '520 NPE',
        serie: 'ESC-004',
        unidadUso: 'HORAS',
        atributos: { desnivel_m: '6.5 m', ancho_peldano: '1000 mm' },
        parametro: 'Holgura Zócalo Seguridad',
        unidadParam: 'mm',
        valorParam: 2.0,
      },
      {
        code: 'PUERTA_AUTO',
        tipoNombre: 'Puerta Eléctrica Seccional',
        marca: 'Hormann',
        modelo: 'WA400',
        serie: 'ACC-005',
        unidadUso: 'CICLOS',
        atributos: { ciclos_dia: 250, proteccion_ip: 'IP65' },
        parametro: 'Fuerza Cierre Fotocelda',
        unidadParam: 'N',
        valorParam: 110,
      },
      {
        code: 'SUBESTACION',
        tipoNombre: 'Subestación Transformador MT',
        marca: 'ABB',
        modelo: 'DryResibloc',
        serie: 'SUB-006',
        unidadUso: 'MANIOBRAS',
        atributos: { tension_primaria: '13.8 kV', potencia_kva: '1000 kVA' },
        parametro: 'Temperatura Punto Caliente Fase R',
        unidadParam: '°C',
        valorParam: 58.2,
      },
      {
        code: 'HVAC',
        tipoNombre: 'Chiller Centrifugo',
        marca: 'Trane',
        modelo: 'CVHF',
        serie: 'HVAC-007',
        unidadUso: 'HORAS',
        atributos: { capacidad_tr: '250 TR', refrigerante: 'R-1233zd' },
        parametro: 'Presión Succión Evaporador',
        unidadParam: 'PSI',
        valorParam: 67,
      },
      {
        code: 'TUBERIA',
        tipoNombre: 'Red Hidrosanitaria Principal',
        marca: 'Victaulic',
        modelo: 'Sch40-Galv',
        serie: 'TUB-008',
        unidadUso: 'CAL',
        atributos: { diametro_pulg: '6 in', longitud_m: '420 m' },
        parametro: 'Prueba Hidrostática Línea',
        unidadParam: 'PSI',
        valorParam: 145,
      },
    ];

    it.each(verticalSpecs)(
      'procesa placa técnica, despacho S1/S2/S3/S4/S5 y cambio de marca A->B para vertical $code',
      (v) => {
        const equipoMock = {
          id_equipo: 100,
          codigo_equipo: `${v.code}-100`,
          nombre_equipo: v.tipoNombre,
          numero_serie_equipo: v.serie,
          tipos_equipo: { codigo_tipo: v.code, nombre_tipo: v.tipoNombre, unidad_uso: v.unidadUso },
          especificaciones: {
            marca: v.marca,
            modelo: v.modelo,
            serie: v.serie,
            modulos: { ficha_vertical: v.atributos },
          },
        };

        const placa = EquipoSpecsReader.getPlacaUniversal(equipoMock);
        expect(placa.marca).toBe(v.marca);
        expect(placa.serie).toBe(v.serie);
        expect(placa.bloques.length).toBeGreaterThan(0);

        // S1 Preventivo & S3 Predictivo -> UNIVERSAL_EAM
        expect(pdfService.determinarTipoInforme(v.code, 'PREV_A', { categoriaServicio: 'PREVENTIVO' })).toBe(
          'UNIVERSAL_EAM',
        );
        expect(
          pdfService.determinarTipoInforme(v.code, 'PREDICTIVO', { categoriaServicio: 'INSPECCION' }),
        ).toBe('UNIVERSAL_EAM');

        // S2 Correctivo, S4 Emergencia, S5 Diagnóstico -> CORRECTIVO
        for (const [svc, cat] of [
          ['CORRECTIVO', 'CORRECTIVO'],
          ['EMERGENCIA', 'EMERGENCIA'],
          ['DIAGNOSTICO', 'DIAGNOSTICO'],
        ] as const) {
          expect(pdfService.determinarTipoInforme(v.code, svc, { categoriaServicio: cat })).toBe(
            'CORRECTIVO',
          );
        }

        // Render S1 Checklist Universal bajo Empresa A
        const htmlEmpresaA = generarTipoUniversalEamHTML({
          numeroOrden: `OT-${v.code}-001`,
          cliente: 'Cliente Corporativo Demo',
          direccion: 'Zona Industrial Norte',
          sede: 'Planta Central',
          marcaEquipo: v.marca,
          serieEquipo: v.serie,
          tipoEquipo: v.code as any,
          tipoServicio: 'PREV_A',
          fecha: '16/11/2026',
          tecnico: 'Ing. Operación Campo',
          horaEntrada: '08:00',
          horaSalida: '10:30',
          placaUniversal: placa,
          actividades: [
            {
              sistema: v.tipoNombre,
              descripcion: `Inspección funcional ${v.code}`,
              resultado: 'B',
              tipoActividad: 'CHECK',
            },
          ],
          mediciones: [
            {
              parametro: v.parametro,
              valor: v.valorParam,
              unidad: v.unidadParam,
              nivelAlerta: 'OK',
            },
          ],
          evidencias: [],
          branding: brandEmpresaA,
        });

        expect(htmlEmpresaA).toContain('Elevadores Andes');
        expect(htmlEmpresaA).toContain('#0F766E');
        expect(htmlEmpresaA).toContain(v.serie);
        expect(htmlEmpresaA).not.toMatch(LEGACY_LEAK_REGEX);

        // Render S2/S4/S5 Narrativo bajo Empresa B (sin reiniciar backend)
        const htmlEmpresaB = generarCorrectivoOrdenHTML({
          numeroOrden: `CORR-${v.code}-002`,
          fecha: '16/11/2026',
          horaEntrada: '14:00',
          horaSalida: '17:00',
          tipoServicio: 'EMERGENCIA',
          cliente: 'Industria Europea GmbH',
          direccion: 'Industriepark Ost 12',
          tipoEquipo: v.code,
          marcaEquipo: v.marca,
          modeloEquipo: v.modelo,
          serieEquipo: v.serie,
          tecnico: 'Hans Weber',
          estadoInicial: 'Falla intermitente reportada',
          problemaReportado: `Alarma en subsistema ${v.tipoNombre}`,
          diagnosticoTecnico: 'Desajuste mecánico y verificación telemétrica',
          trabajosRealizados: 'Calibración completa y prueba bajo carga',
          estadoFinal: 'Operativo Nominal',
          observacionesGenerales: 'Cierre conforme protocolo certificado',
          mediciones: [
            {
              parametro: v.parametro,
              valor: v.valorParam,
              unidad: v.unidadParam,
              nivelAlerta: 'OK',
            },
          ],
          branding: brandEmpresaB,
        });

        expect(htmlEmpresaB).toContain('EuroClima Tech GmbH');
        expect(htmlEmpresaB).toContain('#991B1B');
        expect(htmlEmpresaB).not.toContain('Elevadores Andes');
        expect(htmlEmpresaB).not.toMatch(LEGACY_LEAK_REGEX);
      },
    );

    it('formatea moneda dinámica según organización A (USD) y B (EUR)', () => {
      expect(formatCurrencyOrg(1500, brandEmpresaA)).toContain('1');
      expect(formatCurrencyOrg(1500, brandEmpresaB)).toContain('€');
    });
  });

  describe('3. Contratos Estrictos Mobile -> API (ValidationPipe Zero-Trust)', () => {
    const strictPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    });

    const validFinishPayload = {
      evidencias: [{ tipo: 'ANTES', base64: 'AQIDBA==', descripcion: 'Estado inicial' }],
      firmas: {
        tecnico: { tipo: 'TECNICO', base64: 'AQIDBA==', idPersona: 10 },
      },
      actividades: [{ sistema: 'Control', descripcion: 'Prueba funcional', resultado: 'B' }],
      observaciones: 'Ejecución limpia sin errores',
      horaEntrada: '08:00',
      horaSalida: '09:30',
      modo: 'SOLO_DATOS',
    };

    it('rechaza con 400 BadRequest si el payload móvil filtra metadatos internos (_ownerUserId, evidenciasRefs)', async () => {
      await expect(
        strictPipe.transform(
          { ...validFinishPayload, _ownerUserId: 77, evidenciasRefs: [] },
          { type: 'body', metatype: FinalizarOrdenCompletoDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('acepta payload FinalizarOrdenCompletoDto y SyncBatchUploadDto saneados', async () => {
      const parsedFinish = await strictPipe.transform(validFinishPayload, {
        type: 'body',
        metatype: FinalizarOrdenCompletoDto,
      });
      expect(parsedFinish.modo).toBe('SOLO_DATOS');

      const parsedSync = await strictPipe.transform(
        {
          tecnicoId: 12,
          syncTimestamp: '2026-11-16T07:00:00.000Z',
          ordenes: [
            {
              idOrdenServicio: 505,
              version: 2,
              lastModified: '2026-11-16T07:00:00.000Z',
            },
          ],
        },
        { type: 'body', metatype: SyncBatchUploadDto },
      );
      expect(parsedSync.ordenes[0].idOrdenServicio).toBe(505);
    });

    it('valida UpdateConfiguracionOrganizacionDto sin aceptar propiedades arbitrarias', async () => {
      await expect(
        strictPipe.transform(
          { nombre_comercial: 'Marca Nueva', hackedFlag: true },
          { type: 'body', metatype: UpdateConfiguracionOrganizacionDto },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Auditoría OWASP & Higiene de Empaquetado Instalable', () => {
    it('exige JWT, Roles ADMIN y Permiso CONFIG_SYSTEM en rutas administrativas de branding y PDF', () => {
      const cfgPublic = Reflect.getMetadata(
        IS_PUBLIC_KEY,
        ConfiguracionOrganizacionController.prototype.getPublica,
      );
      const cfgUpdatePerms = Reflect.getMetadata(
        PERMISOS_KEY,
        ConfiguracionOrganizacionController.prototype.updateEmpresa,
      );
      const cfgUpdateRoles = Reflect.getMetadata(
        'roles',
        ConfiguracionOrganizacionController.prototype.updateEmpresa,
      );
      const pdfGuards = Reflect.getMetadata(GUARDS_METADATA, PdfController);

      expect(cfgPublic).toBe(true);
      expect(cfgUpdateRoles).toContain('ADMIN');
      expect(cfgUpdatePerms).toContain('CONFIG_SYSTEM');
      expect(pdfGuards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard, PermisosGuard]));

      // Simulación de escalamiento horizontal/vertical: TECNICO intentando mutar branding
      const reflector = new Reflector();
      const permisosGuard = new PermisosGuard(reflector);
      const rolesGuard = new RolesGuard(reflector);

      const mockTechCtx = {
        getHandler: () => ConfiguracionOrganizacionController.prototype.updateEmpresa,
        getClass: () => ConfiguracionOrganizacionController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: { id: 5, rol: 'TECNICO', roles: ['TECNICO'], permisos: ['ORDENES_EXECUTE'] },
          }),
        }),
      } as any;

      expect(() => rolesGuard.canActivate(mockTechCtx)).toThrow(ForbiddenException);
      expect(() => permisosGuard.canActivate(mockTechCtx)).toThrow(ForbiddenException);
    });

    it('escapa cargas XSS en observaciones y nombres de firmantes dentro de HTML para Puppeteer', () => {
      const xss = '<script>alert("xss")</script><img src=x onerror="fetch(1)">';
      const htmlUniversal = generarTipoUniversalEamHTML({
        numeroOrden: 'OT-XSS-1',
        cliente: 'Cliente',
        direccion: 'Dir',
        marcaEquipo: 'Marca',
        serieEquipo: 'SER-1',
        tipoEquipo: 'ASCENSOR' as any,
        tipoServicio: 'PREV_A',
        fecha: '16/11/2026',
        tecnico: xss,
        horaEntrada: '08:00',
        horaSalida: '09:00',
        observaciones: xss,
        actividades: [],
        mediciones: [],
        evidencias: [],
        branding: brandEmpresaA,
      });

      const htmlCorrectivo = generarCorrectivoOrdenHTML({
        numeroOrden: 'OT-XSS-2',
        fecha: '16/11/2026',
        horaEntrada: '08:00',
        horaSalida: '09:00',
        tipoServicio: 'CORRECTIVO',
        cliente: 'Cliente',
        direccion: 'Dir',
        tipoEquipo: 'HVAC',
        marcaEquipo: 'Trane',
        serieEquipo: 'SER-2',
        tecnico: xss,
        observacionesGenerales: xss,
        branding: brandEmpresaB,
      });

      expect(htmlUniversal).not.toContain('<script>');
      expect(htmlUniversal).toContain('&lt;script&gt;');
      expect(htmlCorrectivo).not.toContain('<script>');
      expect(htmlCorrectivo).toContain('&lt;script&gt;');
    });

    it('sanitiza nombres de archivo contra Path Traversal y valida cifrado AES-256-GCM', () => {
      const pdfService = new PdfService({} as any, {} as any, {} as any);
      const safeName = (pdfService as any).generarFilename(
        'UNIVERSAL_EAM',
        '../../etc/passwd\r\n;rm -rf',
        brandEmpresaA,
      );
      expect(safeName).not.toContain('..');
      expect(safeName).not.toContain('/');
      expect(safeName).not.toContain('\\');

      const informeFilename = buildInformeFilename({
        fechaServicio: '2026-11-16',
        codigoTipoServicio: 'CORRECTIVO',
        codigoTipoEquipo: 'ASCENSOR',
        nombreCliente: '../Client/../../Hack',
        nombreEquipo: 'ASC:01',
      });
      expect(informeFilename).not.toContain('..');
      expect(informeFilename.endsWith('.pdf')).toBe(true);

      const prevEncKey = process.env.CONFIG_ENCRYPTION_KEY;
      process.env.CONFIG_ENCRYPTION_KEY = 'phase6-certification-encryption-secret';
      try {
        const cipher = encryptSecret('smtp-app-password-super-secret');
        expect(isEncryptedSecret(cipher)).toBe(true);
        expect(cipher).not.toContain('smtp-app-password');
        expect(decryptSecret(cipher)).toBe('smtp-app-password-super-secret');
      } finally {
        if (prevEncKey === undefined) delete process.env.CONFIG_ENCRYPTION_KEY;
        else process.env.CONFIG_ENCRYPTION_KEY = prevEncKey;
      }
    });

    it('certifica higiene white-label de artefactos de despliegue Docker, Health y Admin NextConfig', async () => {
      const repoRoot = path.resolve(__dirname, '../../..');
      const dockerignore = fs.readFileSync(path.join(repoRoot, '.dockerignore'), 'utf8');
      const compose = fs.readFileSync(path.join(repoRoot, 'docker-compose.yml'), 'utf8');
      const envExample = fs.readFileSync(path.join(repoRoot, '.env.example'), 'utf8');
      const apiDockerfile = fs.readFileSync(path.join(repoRoot, 'apps/api/Dockerfile'), 'utf8');
      const adminDockerfile = fs.readFileSync(path.join(repoRoot, 'apps/admin/Dockerfile'), 'utf8');
      const nextConfig = fs.readFileSync(path.join(repoRoot, 'apps/admin/next.config.ts'), 'utf8');
      const mainTs = fs.readFileSync(path.join(repoRoot, 'apps/api/src/main.ts'), 'utf8');

      expect(dockerignore).toContain('.env');
      expect(compose).toContain('POSTGRES_PASSWORD:?');
      expect(compose).toContain('DIRECT_URL:');
      expect(envExample).toContain('SEED_PRESETS=ALL');
      expect(apiDockerfile).toContain('chromium');
      expect(adminDockerfile).toContain('apps/admin/server.js');
      expect(nextConfig).not.toContain("NEXT_PUBLIC_APP_NAME: 'MEKANOS Admin'");
      expect(mainTs).not.toMatch(/lorddeep/i);

      // HealthController.resolveSafeDatabaseMetadata jamás expone credenciales ni host Supabase fijo
      const prevDb = process.env.DATABASE_URL;
      process.env.DATABASE_URL = 'postgresql://eam_user:TOP_SECRET_PASS@db.internal:5432/eam_db';
      try {
        const healthCtrl = new HealthController({} as any);
        const meta = (healthCtrl as any).resolveSafeDatabaseMetadata();
        expect(meta).toEqual({ host: 'db.internal', port: 5432, pooler: 'Direct PostgreSQL' });
        expect(JSON.stringify(meta)).not.toContain('TOP_SECRET_PASS');
        expect(JSON.stringify(meta)).not.toMatch(/supabase\.com/i);
      } finally {
        if (prevDb === undefined) delete process.env.DATABASE_URL;
        else process.env.DATABASE_URL = prevDb;
      }

      // Confirmar cobertura nominal en catálogo de presets exportado
      expect(VERTICAL_PRESETS.length).toBeGreaterThanOrEqual(8);
      expect(SERVICIOS_UNIVERSALES.length).toBeGreaterThanOrEqual(5);
    });
  });
});
