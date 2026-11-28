import { OrdenPlanSeederService } from '../common/services/orden-plan-seeder.service';
import { sanitizeLogPayload } from '../common/utils/log-sanitizer.util';
import { FinalizacionOrdenService } from './services/finalizacion-orden.service';

describe('Fase 0: Cimientos de Datos, Seeding Unificado, Log Sanitizer y Anti-TOCTOU', () => {
  describe('OrdenPlanSeederService', () => {
    it('sembrarPlanParaOrden inserta actividades activas con skipDuplicates: true (idempotente)', async () => {
      const createMany = jest.fn(async ({ data }: any) => ({ count: data.length }));
      const mockTx = {
        catalogo_actividades: {
          findMany: jest.fn(async () => [
            { id_actividad_catalogo: 10, orden_ejecucion: 1, es_obligatoria: true },
            { id_actividad_catalogo: 11, orden_ejecucion: 2, es_obligatoria: false },
          ]),
        },
        ordenes_actividades_plan: { createMany },
      };

      const seeder = new OrdenPlanSeederService(mockTx as any);
      const res = await seeder.sembrarPlanParaOrden(mockTx, {
        idOrdenServicio: 500,
        idTipoServicio: 3,
        creadoPor: 1,
      });

      expect(res.sembradas).toBe(2);
      expect(createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skipDuplicates: true,
          data: [
            expect.objectContaining({
              id_orden_servicio: 500,
              id_actividad_catalogo: 10,
              orden_secuencia: 1,
              es_obligatoria: true,
              origen: 'ADMIN',
              creado_por: 1,
            }),
            expect.objectContaining({
              id_orden_servicio: 500,
              id_actividad_catalogo: 11,
              orden_secuencia: 2,
              es_obligatoria: false,
              origen: 'ADMIN',
              creado_por: 1,
            }),
          ],
        }),
      );
    });

    it('resembrarPlanSiCambioTipoServicio re-siembra cuando no hay actividades ejecutadas ni mediciones', async () => {
      const deleteMany = jest.fn(async () => ({ count: 3 }));
      const createMany = jest.fn(async ({ data }: any) => ({ count: data.length }));
      const mockTx = {
        actividades_ejecutadas: { count: jest.fn(async () => 0) },
        mediciones_servicio: { count: jest.fn(async () => 0) },
        ordenes_actividades_plan: { deleteMany, createMany },
        catalogo_actividades: {
          findMany: jest.fn(async () => [
            { id_actividad_catalogo: 20, orden_ejecucion: 1, es_obligatoria: true },
          ]),
        },
      };

      const seeder = new OrdenPlanSeederService(mockTx as any);
      const res = await seeder.resembrarPlanSiCambioTipoServicio(mockTx, {
        idOrdenServicio: 501,
        idTipoServicioAnterior: 3,
        idTipoServicioNuevo: 5,
        creadoPor: 2,
      });

      expect(res).toEqual({ resembrada: true, sembradas: 1 });
      expect(deleteMany).toHaveBeenCalledWith({ where: { id_orden_servicio: 501 } });
      expect(createMany).toHaveBeenCalledTimes(1);
    });

    it('resembrarPlanSiCambioTipoServicio preserva el plan si la orden ya tiene trabajo de campo', async () => {
      const deleteMany = jest.fn();
      const mockTx = {
        actividades_ejecutadas: { count: jest.fn(async () => 4) },
        mediciones_servicio: { count: jest.fn(async () => 0) },
        ordenes_actividades_plan: { deleteMany, createMany: jest.fn() },
        catalogo_actividades: { findMany: jest.fn() },
      };

      const seeder = new OrdenPlanSeederService(mockTx as any);
      const res = await seeder.resembrarPlanSiCambioTipoServicio(mockTx, {
        idOrdenServicio: 502,
        idTipoServicioAnterior: 3,
        idTipoServicioNuevo: 5,
      });

      expect(res).toEqual({ resembrada: false, sembradas: 0, motivo: 'CON_EJECUCION_PREVIA' });
      expect(deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('sanitizeLogPayload (Zero Base64 & Secret Leakage)', () => {
    it('redacta base64 crudo sin prefijo data:image/, secretos, fcm_token y arrays grandes', () => {
      const rawBase64 = 'A'.repeat(2500);
      const payload = {
        password: 'super-secret-password',
        fcm_token: 'dX_fake_fcm_token_value',
        firebase_private_key: '-----BEGIN PRIVATE KEY-----\nSECRET',
        evidencias: [
          {
            tipo: 'ANTES',
            base64: rawBase64,
            descripcion: 'Foto frontal',
          },
        ],
        firmas: {
          tecnico: {
            tipo: 'TECNICO',
            base64: 'iVBORw0KGgo' + 'B'.repeat(800),
          },
        },
        blobSinClaveConocida: 'C'.repeat(900),
        dataUri: `data:image/jpeg;base64,${'D'.repeat(400)}`,
        listaLarga: Array.from({ length: 30 }, (_, i) => i),
        normalField: 'OS-2026-0001',
      };

      const sanitized = sanitizeLogPayload(payload) as any;

      expect(sanitized.password).toBe('********');
      expect(sanitized.fcm_token).toBe('********');
      expect(sanitized.firebase_private_key).toBe('********');
      expect(sanitized.evidencias[0].base64).toContain('REDACTED_MEDIA_BASE64');
      expect(sanitized.evidencias[0].base64).not.toContain('AAAA');
      expect(sanitized.evidencias[0].descripcion).toBe('Foto frontal');
      expect(sanitized.firmas.tecnico.base64).toContain('REDACTED_MEDIA_BASE64');
      expect(sanitized.blobSinClaveConocida).toContain('REDACTED_RAW_BASE64');
      expect(sanitized.dataUri).toContain('REDACTED_DATA_URI');
      expect(sanitized.listaLarga).toHaveLength(21);
      expect(sanitized.listaLarga[20]).toContain('+10 items omitted');
      expect(sanitized.normalField).toBe('OS-2026-0001');
    });
  });

  describe('FinalizacionOrdenService Anti-TOCTOU FOR UPDATE', () => {
    it('si el lock FOR UPDATE detecta que otra petición concurrente ya completó la orden, omite limpieza y retorna éxito idempotente', async () => {
      const deleteManySpy = jest.fn();
      const txMock = {
        $queryRaw: jest.fn(async () => [
          {
            id_estado_actual: 4,
            edicion_tecnico_habilitada: false,
            codigo_estado: 'COMPLETADA',
          },
        ]),
        evidencias_fotograficas: { deleteMany: deleteManySpy },
        actividades_ejecutadas: { deleteMany: deleteManySpy },
        mediciones_servicio: { deleteMany: deleteManySpy },
      };

      const mockPrisma = {
        empleados: { findFirst: jest.fn(async () => ({ id_empleado: 7 })) },
        estados_orden: {
          findFirst: jest.fn(async () => ({ id_estado: 4, codigo_estado: 'COMPLETADA' })),
        },
        $transaction: jest.fn(async (cb: any) => cb(txMock)),
      };

      const service = new FinalizacionOrdenService(
        mockPrisma as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
      );

      // Stub fase A pre-commit para probar exclusivamente la barrera transaccional FOR UPDATE
      jest.spyOn(service as any, 'validarEntrada').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'obtenerOrdenCompleta').mockResolvedValue({
        id_orden_servicio: 999,
        numero_orden: 'OS-2026-0999',
        id_estado_actual: 3,
        edicion_tecnico_habilitada: false,
        estados_orden: { codigo_estado: 'EN_PROCESO' },
        equipos: { nombre_equipo: 'Planta 1' },
      });
      jest.spyOn(service as any, 'resolverIdPersonaFirma').mockResolvedValue(1);
      jest.spyOn(service as any, 'subirEvidenciasCloud').mockResolvedValue([]);

      const result = await service.finalizarOrden({
        idOrden: 999,
        evidencias: [],
        firmas: { tecnico: { tipo: 'TECNICO', base64: 'AAA' } },
        actividades: [],
        observaciones: 'Cierre',
        horaEntrada: '08:00',
        horaSalida: '09:00',
        usuarioId: 1,
        modo: 'SOLO_DATOS',
      });

      expect(txMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(deleteManySpy).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.datos.orden.estado).toBe('COMPLETADA');
    });
  });
});
