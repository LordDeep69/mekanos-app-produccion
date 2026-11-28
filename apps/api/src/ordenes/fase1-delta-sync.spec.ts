import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CloudinaryService } from '../storage/cloudinary.service';
import { MediaUploadStrategyService } from '../storage/media-upload-strategy.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { SyncDeltaService } from './services/sync-delta.service';

describe('Fase 1: SyncDeltaService (Orden Transaccional, Monotonicidad, Dedup SHA-256 y Cloudinary JIT)', () => {
  const ORDER_ID = 2200;
  const ACT_UUID = '0195c8e0-aaaa-7000-8000-000000000001';
  const PEND_UUID = '0195c8e0-bbbb-7000-8000-000000000002';
  const MED_UUID = '0195c8e0-cccc-7000-8000-000000000003';
  const EV_UUID = '0195c8e0-dddd-7000-8000-000000000004';
  const HASH_64 = 'a'.repeat(64);

  const baseOrden = {
    id_orden_servicio: ORDER_ID,
    numero_orden: 'OS-2026-2200',
    id_cliente: 10,
    id_equipo: 20,
    id_tecnico_asignado: 7,
    id_estado_actual: 2,
    fecha_inicio_real: null,
    edicion_tecnico_habilitada: false,
    metadata: { existente: true },
    estados_orden: { codigo_estado: 'ASIGNADA' },
    ordenes_equipos: [
      { id_orden_equipo: 55, id_equipo: 20, equipos: { id_equipo: 20, config_parametros: null } },
    ],
    equipos: {
      id_equipo: 20,
      nombre_equipo: 'Planta 1',
      tipos_equipo: { nombre_tipo: 'GENERADOR' },
    },
    clientes: { id_cliente: 10, id_persona: 100 },
  };

  it('procesa en orden transaccional estricto: ordenPatch -> actividades & pendientes -> mediciones -> evidenciasMeta resolviendo actividadClientUuid', async () => {
    const executionOrder: string[] = [];
    let createdEvidenciaData: any = null;
    let createdMedicionData: any = null;

    const txMock = {
      estados_orden: {
        findFirst: jest.fn(async () => {
          executionOrder.push('ordenPatch:estado_en_proceso');
          return { id_estado: 3 };
        }),
      },
      historial_estados_orden: {
        create: jest.fn(async () => {
          executionOrder.push('ordenPatch:historial');
          return { id_historial: 1 };
        }),
      },
      actividades_ejecutadas: {
        findUnique: jest.fn(async () => null),
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => {
          executionOrder.push('actividades:create');
          return { id_actividad_ejecutada: 901, ...data };
        }),
        update: jest.fn(async ({ where, data }: any) => {
          executionOrder.push(`actividades:update:${where.id_actividad_ejecutada}`);
          return { id_actividad_ejecutada: where.id_actividad_ejecutada, ...data };
        }),
      },
      ordenes_pendientes: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => {
          executionOrder.push('pendientes:create');
          return { id_orden_pendiente: 801, ...data };
        }),
      },
      parametros_medicion: {
        findMany: jest.fn(async () => [
          {
            id_parametro_medicion: 7,
            codigo_parametro: 'PRES_ACEITE',
            nombre_parametro: 'Presión de Aceite',
            unidad_medida: 'PSI',
            valor_minimo_normal: 20,
            valor_maximo_normal: 80,
            valor_minimo_critico: 10,
            valor_maximo_critico: 100,
          },
        ]),
      },
      mediciones_servicio: {
        findUnique: jest.fn(async () => null),
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => {
          executionOrder.push('mediciones:create');
          createdMedicionData = data;
          return { id_medicion: 701, ...data };
        }),
      },
      evidencias_fotograficas: {
        findUnique: jest.fn(async () => null),
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => {
          executionOrder.push('evidenciasMeta:create');
          createdEvidenciaData = data;
          return { id_evidencia: 601, ...data };
        }),
      },
      ordenes_servicio: {
        update: jest.fn(async () => {
          executionOrder.push('orden:final_update');
          return { execution_sync_version: 1 };
        }),
      },
    };

    const mockPrisma = {
      ordenes_servicio: { findUnique: jest.fn(async () => baseOrden) },
      $transaction: jest.fn(async (cb: any) => cb(txMock)),
    };

    const service = new SyncDeltaService(mockPrisma as any, {} as any);

    const res = await service.syncDelta(
      ORDER_ID,
      {
        deviceId: 'android-dev-1',
        ordenPatch: { iniciarSiAsignada: true, observacionesTecnico: 'Inspección iniciada' },
        actividades: [
          {
            clientUuid: ACT_UUID,
            idOrdenEquipo: 55,
            idActividadCatalogo: 10,
            estado: 'M',
            observaciones: 'Fuga leve',
            syncVersion: 1,
          },
        ],
        pendientes: [
          {
            clientUuid: PEND_UUID,
            idOrdenEquipo: 55,
            descripcion: 'Cambiar empaque',
            prioridad: 'ALTA',
            origen: 'MANUAL',
            syncVersion: 1,
          },
        ],
        mediciones: [
          {
            clientUuid: MED_UUID,
            idOrdenEquipo: 55,
            idParametroMedicion: 7,
            valorNumerico: 0, // ✅ Valor 0 NO debe descartarse como falsy
            syncVersion: 1,
          },
        ],
        evidenciasMeta: [
          {
            clientUuid: EV_UUID,
            idOrdenEquipo: 55,
            actividadClientUuid: ACT_UUID, // Referencia a actividad creada en el MISMO batch
            tipoEvidencia: 'ACTIVIDAD',
            publicUrl: 'https://res.cloudinary.com/demo/image/upload/sha256_aaa.jpg',
            hashSha256: HASH_64,
            storageProvider: 'CLOUDINARY',
            storageKey: `eam-media/ordenes/OS-2026-2200/evidencias/sha256_${HASH_64}`,
            tamanoBytes: 120000,
            syncVersion: 1,
          },
        ],
      },
      { id: 1, idEmpleado: 7, esAdmin: false },
    );

    expect(res.success).toBe(true);
    expect(res.executionSyncVersion).toBe(1);

    // 1. Verificar orden transaccional exacto
    expect(executionOrder.indexOf('ordenPatch:estado_en_proceso')).toBeLessThan(
      executionOrder.indexOf('actividades:create'),
    );
    expect(executionOrder.indexOf('actividades:create')).toBeLessThan(
      executionOrder.indexOf('mediciones:create'),
    );
    expect(executionOrder.indexOf('pendientes:create')).toBeLessThan(
      executionOrder.indexOf('mediciones:create'),
    );
    expect(executionOrder.indexOf('mediciones:create')).toBeLessThan(
      executionOrder.indexOf('evidenciasMeta:create'),
    );

    // 2. Verificar enlace actividadClientUuid -> id_actividad_ejecutada = 901
    expect(createdEvidenciaData.id_actividad_ejecutada).toBe(901);
    expect(createdEvidenciaData.tipo_evidencia).toBe('DURANTE');
    expect(txMock.actividades_ejecutadas.update).toHaveBeenCalledWith({
      where: { id_actividad_ejecutada: 901 },
      data: { evidencia_capturada: true },
    });

    // 3. Verificar medición con valor 0 persistida y marcada CRITICO
    expect(createdMedicionData.valor_numerico).toBe(0);
    expect(createdMedicionData.fuera_de_rango).toBe(true);
    expect(createdMedicionData.nivel_alerta).toBe('CRITICO');
  });

  it('rechaza deltas atrasados con STALE_IGNORED y protege pendientes ya gestionados por Admin', async () => {
    const updateActSpy = jest.fn();
    const updatePendSpy = jest.fn();

    const txMock = {
      actividades_ejecutadas: {
        findUnique: jest.fn(async () => ({
          id_actividad_ejecutada: 901,
          sync_version: 5,
          client_uuid: ACT_UUID,
        })),
        update: updateActSpy,
      },
      ordenes_pendientes: {
        findUnique: jest.fn(async () => ({
          id_orden_pendiente: 801,
          sync_version: 1,
          estado: 'EN_GESTION',
        })),
        update: updatePendSpy,
      },
      ordenes_servicio: {
        update: jest.fn(async () => ({ execution_sync_version: 2 })),
      },
    };

    const mockPrisma = {
      ordenes_servicio: { findUnique: jest.fn(async () => baseOrden) },
      $transaction: jest.fn(async (cb: any) => cb(txMock)),
    };

    const service = new SyncDeltaService(mockPrisma as any, {} as any);
    const res = await service.syncDelta(
      ORDER_ID,
      {
        actividades: [{ clientUuid: ACT_UUID, estado: 'B', syncVersion: 3 }],
        pendientes: [{ clientUuid: PEND_UUID, syncVersion: 2, deleted: true }],
      },
      { id: 1, idEmpleado: 7, esAdmin: false },
    );

    expect(updateActSpy).not.toHaveBeenCalled();
    expect(updatePendSpy).not.toHaveBeenCalled();
    expect(res.acks).toEqual([
      expect.objectContaining({
        entityType: 'ACTIVIDAD',
        clientUuid: ACT_UUID,
        acceptedVersion: 5,
        status: 'STALE_IGNORED',
      }),
      expect.objectContaining({
        entityType: 'PENDIENTE',
        clientUuid: PEND_UUID,
        status: 'SKIPPED',
      }),
    ]);
  });

  it('bloquea IDOR cross-order en idOrdenEquipo y técnicos ajenos', async () => {
    const mockPrisma = {
      ordenes_servicio: { findUnique: jest.fn(async () => baseOrden) },
      $transaction: jest.fn(),
    };
    const service = new SyncDeltaService(mockPrisma as any, {} as any);

    await expect(
      service.syncDelta(
        ORDER_ID,
        {
          actividades: [
            { clientUuid: ACT_UUID, idOrdenEquipo: 99999, estado: 'B', syncVersion: 1 },
          ],
        },
        { id: 1, idEmpleado: 7, esAdmin: false },
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.syncDelta(
        ORDER_ID,
        { ordenPatch: { observacionesTecnico: 'Hack' } },
        { id: 2, idEmpleado: 99, esAdmin: false },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('prepareEvidenciasUpload deduplica por SHA-256 (0 bytes) y firma Cloudinary JIT para fotos nuevas', async () => {
    const prevCloud = process.env.CLOUDINARY_CLOUD_NAME;
    const prevKey = process.env.CLOUDINARY_API_KEY;
    const prevSecret = process.env.CLOUDINARY_API_SECRET;
    const prevProvider = process.env.MEDIA_STORAGE_PROVIDER;

    process.env.CLOUDINARY_CLOUD_NAME = 'mekanos-test-cloud';
    process.env.CLOUDINARY_API_KEY = '1234567890';
    process.env.CLOUDINARY_API_SECRET = 'super_test_secret_xyz';
    process.env.MEDIA_STORAGE_PROVIDER = 'CLOUDINARY';

    try {
      const cloudinaryService = new CloudinaryService();
      await cloudinaryService.onModuleInit();
      const r2Service = new R2StorageService();
      const strategy = new MediaUploadStrategyService(cloudinaryService, r2Service);

      const dupHash = 'b'.repeat(64);
      const newHash = 'c'.repeat(64);

      const mockPrisma = {
        ordenes_servicio: { findUnique: jest.fn(async () => baseOrden) },
        evidencias_fotograficas: {
          findFirst: jest.fn(async ({ where }: any) => {
            const orHash = where?.OR?.find((x: any) => x.hash_sha256)?.hash_sha256;
            if (orHash === dupHash) {
              return {
                id_evidencia: 444,
                ruta_archivo:
                  'https://res.cloudinary.com/mekanos-test-cloud/image/upload/sha256_bbb.jpg',
                storage_provider: 'CLOUDINARY',
                storage_key: `eam-media/ordenes/OS-2026-2200/evidencias/sha256_${dupHash}`,
              };
            }
            return null;
          }),
        },
      };

      const service = new SyncDeltaService(mockPrisma as any, strategy);
      const res = await service.prepareEvidenciasUpload(
        ORDER_ID,
        {
          items: [
            { clientUuid: ACT_UUID, hashSha256: dupHash, tipoEvidencia: 'ANTES' },
            { clientUuid: EV_UUID, hashSha256: newHash, tipoEvidencia: 'DESPUES' },
          ],
        },
        { id: 1, idEmpleado: 7, esAdmin: false },
      );

      expect(res.success).toBe(true);
      expect(res.provider).toBe('CLOUDINARY');
      expect(res.items).toHaveLength(2);

      // Item 1: Deduplicado -> 0 bytes a subir
      expect(res.items[0]).toMatchObject({
        clientUuid: ACT_UUID,
        alreadyUploaded: true,
        strategy: 'ALREADY_UPLOADED',
        existingEvidenciaId: 444,
      });

      // Item 2: Firma JIT Cloudinary con public_id determinista por SHA-256
      expect(res.items[1]).toMatchObject({
        clientUuid: EV_UUID,
        alreadyUploaded: false,
        provider: 'CLOUDINARY',
        strategy: 'CLOUDINARY_MULTIPART',
        uploadUrl: 'https://api.cloudinary.com/v1_1/mekanos-test-cloud/image/upload',
      });
      expect(res.items[1].fields?.public_id).toBe(`sha256_${newHash}`);
      expect(res.items[1].fields?.overwrite).toBe('false');
      expect(res.items[1].fields?.signature).toMatch(/^[a-f0-9]{40}$/);
      expect(res.items[1].fields?.api_key).toBe('1234567890');
    } finally {
      process.env.CLOUDINARY_CLOUD_NAME = prevCloud;
      process.env.CLOUDINARY_API_KEY = prevKey;
      process.env.CLOUDINARY_API_SECRET = prevSecret;
      process.env.MEDIA_STORAGE_PROVIDER = prevProvider;
    }
  });
});
