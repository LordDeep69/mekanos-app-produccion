import { EventEmitter2 } from '@nestjs/event-emitter';
import { firstValueFrom, take, toArray } from 'rxjs';
import { OrdenRealtimeBusService } from './services/orden-realtime-bus.service';
import { OrdenesEspejoService } from './services/ordenes-espejo.service';
import { ProgresoRegistroService } from './services/progreso-registro.service';
import { SyncDeltaService } from './services/sync-delta.service';

describe('Fase 2 · Espejo Vivo Backend (Actividades Completas, Mediciones Multi-Equipo, Progreso 10 Fixes y SSE)', () => {
  describe('1. OrdenesEspejoService.getActividadesCompletas', () => {
    it('proyecta plan multi-equipo completo marcando SIN_REGISTRO en ítems no tocados y REGISTRADA en los ejecutados', async () => {
      const prismaMock: any = {
        ordenes_servicio: {
          findUnique: jest.fn().mockResolvedValue({
            id_orden_servicio: 500,
            id_tipo_servicio: 1,
            equipos: {
              id_equipo: 10,
              id_tipo_equipo: 1,
              codigo_equipo: 'GEN-1',
              nombre_equipo: 'Planta 1',
            },
            ordenes_equipos: [
              {
                id_orden_equipo: 101,
                id_equipo: 10,
                orden_secuencia: 1,
                nombre_sistema: 'Generador 1',
                equipos: {
                  id_equipo: 10,
                  id_tipo_equipo: 1,
                  codigo_equipo: 'GEN-1',
                  nombre_equipo: 'Planta 1',
                },
              },
              {
                id_orden_equipo: 102,
                id_equipo: 11,
                orden_secuencia: 2,
                nombre_sistema: 'Generador 2',
                equipos: {
                  id_equipo: 11,
                  id_tipo_equipo: 1,
                  codigo_equipo: 'GEN-2',
                  nombre_equipo: 'Planta 2',
                },
              },
            ],
            ordenes_actividades_plan: [
              {
                id_orden_actividad_plan: 1,
                id_actividad_catalogo: 10,
                orden_secuencia: 1,
                es_obligatoria: true,
                catalogo_actividades: {
                  id_actividad_catalogo: 10,
                  descripcion_actividad: 'Revisar correas',
                  tipo_actividad: 'INSPECCION',
                  id_parametro_medicion: null,
                  catalogo_sistemas: { nombre_sistema: 'MOTOR' },
                },
              },
              {
                id_orden_actividad_plan: 2,
                id_actividad_catalogo: 11,
                orden_secuencia: 2,
                es_obligatoria: true,
                catalogo_actividades: {
                  id_actividad_catalogo: 11,
                  descripcion_actividad: 'Verificar baterías',
                  tipo_actividad: 'INSPECCION',
                  id_parametro_medicion: null,
                  catalogo_sistemas: { nombre_sistema: 'ELECTRICO' },
                },
              },
              // Item MEDICION no debe duplicarse en checklist
              {
                id_orden_actividad_plan: 3,
                id_actividad_catalogo: 12,
                orden_secuencia: 3,
                es_obligatoria: true,
                catalogo_actividades: {
                  id_actividad_catalogo: 12,
                  descripcion_actividad: 'Medir presión aceite',
                  tipo_actividad: 'MEDICION',
                  id_parametro_medicion: 7,
                  catalogo_sistemas: { nombre_sistema: 'MOTOR' },
                },
              },
            ],
          }),
        },
        actividades_ejecutadas: {
          findMany: jest.fn().mockResolvedValue([
            {
              id_actividad_ejecutada: 9001,
              id_orden_servicio: 500,
              id_orden_equipo: 101,
              id_actividad_catalogo: 10,
              estado: 'B',
              ejecutada: true,
              observaciones: 'Tensión correcta',
              respuesta_json: null,
              orden_secuencia: 1,
              sistema: 'MOTOR',
              client_uuid: 'uuid-act-1',
              sync_version: 2,
              catalogo_actividades: {
                id_actividad_catalogo: 10,
                descripcion_actividad: 'Revisar correas',
                catalogo_sistemas: { nombre_sistema: 'MOTOR' },
              },
            },
          ]),
        },
        evidencias_fotograficas: {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { id_actividad_ejecutada: 9001 },
              { id_actividad_ejecutada: 9001 },
            ]),
        },
      };

      const service = new OrdenesEspejoService(prismaMock);
      const result = await service.getActividadesCompletas(500);

      expect(result.success).toBe(true);
      // 2 equipos × 2 actividades checklist = 4 ítems (MEDICION excluida del checklist)
      expect(result.data).toHaveLength(4);
      expect(result.resumen.total_plan).toBe(4);
      expect(result.resumen.registradas).toBe(1);
      expect(result.resumen.sin_registro).toBe(3);
      expect(result.resumen.porcentaje).toBe(25);
      expect(result.resumen.fuente_plan).toBe('PLAN_ORDEN');

      const eq1Act10 = result.data.find(
        (i) => i.id_orden_equipo === 101 && i.id_actividad_catalogo === 10,
      )!;
      expect(eq1Act10.estado_registro).toBe('REGISTRADA');
      expect(eq1Act10.estado).toBe('B');
      expect(eq1Act10.evidencias_count).toBe(2);

      const eq2Act10 = result.data.find(
        (i) => i.id_orden_equipo === 102 && i.id_actividad_catalogo === 10,
      )!;
      expect(eq2Act10.estado_registro).toBe('SIN_REGISTRO');
      expect(eq2Act10.id_actividad_ejecutada).toBeNull();
      expect(eq2Act10.estado).toBeNull();
    });
  });

  describe('2. OrdenesEspejoService.getMedicionesCompletas (Fix Multi-Equipo)', () => {
    it('trackea parámetros sin medir independientemente por cada id_orden_equipo con sus propios overrides', async () => {
      const prismaMock: any = {
        ordenes_servicio: {
          findUnique: jest.fn().mockResolvedValue({
            id_orden_servicio: 600,
            id_tipo_servicio: 1,
            equipos: {
              id_equipo: 10,
              id_tipo_equipo: 1,
              config_parametros: null,
              plantillas_parametros: null,
            },
            ordenes_equipos: [
              {
                id_orden_equipo: 201,
                orden_secuencia: 1,
                nombre_sistema: 'Planta Norte',
                equipos: {
                  id_equipo: 10,
                  codigo_equipo: 'GEN-N1',
                  nombre_equipo: 'Planta Norte',
                  id_tipo_equipo: 1,
                  config_parametros: {
                    rangos: { PRES_ACEITE: { min_normal: 30, max_normal: 60 } },
                  },
                  plantillas_parametros: null,
                },
              },
              {
                id_orden_equipo: 202,
                orden_secuencia: 2,
                nombre_sistema: 'Planta Sur',
                equipos: {
                  id_equipo: 11,
                  codigo_equipo: 'GEN-S2',
                  nombre_equipo: 'Planta Sur',
                  id_tipo_equipo: 1,
                  config_parametros: {
                    rangos: { PRES_ACEITE: { min_normal: 45, max_normal: 85 } },
                  },
                  plantillas_parametros: null,
                },
              },
            ],
            ordenes_actividades_plan: [
              {
                catalogo_actividades: {
                  tipo_actividad: 'MEDICION',
                  id_parametro_medicion: 7,
                  id_tipo_equipo: 1,
                  descripcion_actividad: 'Presión Aceite',
                },
              },
            ],
          }),
        },
        mediciones_servicio: {
          findMany: jest.fn().mockResolvedValue([
            // Solo el Equipo 201 fue medido; el Equipo 202 NO!
            {
              id_medicion: 801,
              id_orden_servicio: 600,
              id_orden_equipo: 201,
              id_parametro_medicion: 7,
              valor_numerico: 50,
              unidad_medida: 'PSI',
              parametros_medicion: {
                id_parametro_medicion: 7,
                codigo_parametro: 'PRES_ACEITE',
                nombre_parametro: 'Presión Aceite',
                unidad_medida: 'PSI',
                valor_minimo_normal: 20,
                valor_maximo_normal: 70,
                id_tipo_equipo: 1,
              },
            },
          ]),
        },
        catalogo_actividades: { findMany: jest.fn().mockResolvedValue([]) },
        parametros_medicion: {
          findMany: jest.fn().mockResolvedValue([
            {
              id_parametro_medicion: 7,
              codigo_parametro: 'PRES_ACEITE',
              nombre_parametro: 'Presión Aceite',
              unidad_medida: 'PSI',
              valor_minimo_normal: 20,
              valor_maximo_normal: 70,
              id_tipo_equipo: 1,
              activo: true,
            },
          ]),
        },
      };

      const service = new OrdenesEspejoService(prismaMock);
      const res = await service.getMedicionesCompletas(600);

      expect(res.success).toBe(true);
      // Equipo 201 tiene 0 sin medir; Equipo 202 TODAVÍA tiene Presión Aceite sin medir!
      expect(res.parametros_sin_medir).toHaveLength(1);
      expect(res.parametros_sin_medir[0].id_orden_equipo).toBe(202);
      expect(res.parametros_sin_medir[0].valor_minimo_normal).toBe(45);
      expect(res.parametros_sin_medir[0].valor_maximo_normal).toBe(85);
      expect(res.por_equipo).toHaveLength(2);
      expect(res.por_equipo[0].total_registrados).toBe(1);
      expect(res.por_equipo[0].parametros_sin_medir).toHaveLength(0);
      expect(res.por_equipo[1].total_registrados).toBe(0);
      expect(res.por_equipo[1].parametros_sin_medir).toHaveLength(1);
    });
  });

  describe('3. ProgresoRegistroService (10 Fixes Zero-Trust)', () => {
    it('no reporta falso EN_VIVO cuando Admin modifica fecha_modificacion ni marca APROBADA inicial como 100%', async () => {
      const prismaMock: any = {
        ordenes_servicio: {
          findUnique: jest.fn().mockResolvedValue({
            id_orden_servicio: 700,
            numero_orden: 'OS-2026-0700',
            id_estado_actual: 2,
            id_cliente: 1,
            id_equipo: 10,
            id_tipo_servicio: 1,
            id_tecnico_asignado: 5,
            requiere_firma_cliente: false,
            fecha_modificacion: new Date(), // Admin acaba de editar -> NO debe marcar EN_VIVO!
            fecha_cambio_estado: new Date(),
            ultima_actividad_tecnico_at: null,
            fecha_inicio_real: null,
            fecha_fin_real: null,
            duracion_minutos: null,
            execution_sync_version: 0,
            metadata: {},
            estados_orden: {
              id_estado: 2,
              codigo_estado: 'APROBADA',
              nombre_estado: 'Aprobada',
              es_estado_final: false,
            },
            clientes: { persona: { razon_social: 'Cliente Demo' } },
            sedes_cliente: null,
            equipos: {
              id_equipo: 10,
              codigo_equipo: 'EQ-1',
              nombre_equipo: 'Bomba 1',
              id_tipo_equipo: null,
            },
            ordenes_equipos: [
              { id_orden_equipo: 1, equipos: { id_tipo_equipo: null } },
              { id_orden_equipo: 2, equipos: { id_tipo_equipo: null } },
            ],
            empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
              persona: { primer_nombre: 'Juan', primer_apellido: 'Pérez' },
            },
            ordenes_actividades_plan: [
              {
                id_actividad_catalogo: 1,
                catalogo_actividades: { tipo_actividad: 'INSPECCION', id_parametro_medicion: null },
              },
              {
                id_actividad_catalogo: 2,
                catalogo_actividades: { tipo_actividad: 'INSPECCION', id_parametro_medicion: null },
              },
            ],
            actividades_ejecutadas: [],
            mediciones_servicio: [],
            evidencias_fotograficas: [],
            ordenes_pendientes: [],
          }),
        },
      };

      const service = new ProgresoRegistroService(prismaMock);
      const res = await service.getProgresoDetallado(700);

      expect(res.estado_conexion).toBe('SIN_INICIAR');
      expect(res.porcentaje_global).toBe(0);
      expect(res.actividades.total).toBe(4); // 2 plan × 2 equipos
      expect(res.evidencias_fotos_esperadas).toBe(4); // 2 equipos × 2 fotos
      expect(res.firmas.esperadas).toBe(1); // requiere_firma_cliente=false
      expect(res.pesos_efectivos!.mediciones).toBe(0);
      expect(
        res.pesos_efectivos!.actividades +
          res.pesos_efectivos!.mediciones +
          res.pesos_efectivos!.evidencias +
          res.pesos_efectivos!.firmas,
      ).toBe(100);
    });

    it('registrarHeartbeat actualiza ultima_actividad_tecnico_at SIN tocar fecha_modificacion y emite SSE heartbeat', async () => {
      const eventEmitter = new EventEmitter2();
      const realtimeBus = new OrdenRealtimeBusService(eventEmitter);
      const updateSpy = jest.fn().mockResolvedValue({});
      const prismaMock: any = {
        ordenes_servicio: {
          findUnique: jest.fn().mockResolvedValue({
            id_orden_servicio: 701,
            numero_orden: 'OS-2026-0701',
            metadata: { existing: true },
          }),
          update: updateSpy,
        },
      };

      const service = new ProgresoRegistroService(prismaMock, realtimeBus);

      const eventsPromise = firstValueFrom(
        realtimeBus.subscribeOrden(701).pipe(take(2), toArray()),
      );
      await service.registrarHeartbeat(701, {
        bateria: 82,
        red: '4G',
        actividad_actual: 'Checklist Motor',
        pendientes_outbox_mobile: 2,
      });

      const updateArg = updateSpy.mock.calls[0][0];
      expect(updateArg.data.ultima_actividad_tecnico_at).toBeInstanceOf(Date);
      expect(updateArg.data.fecha_modificacion).toBeUndefined();

      const events = await eventsPromise;
      expect(events[0].type).toBe('connected');
      expect(events[1].type).toBe('heartbeat');
      expect((events[1].data as any).sections).toEqual(
        expect.arrayContaining(['progreso', 'telemetria']),
      );

      realtimeBus.onModuleDestroy();
    });
  });

  describe('4. OrdenRealtimeBusService + SyncDeltaService SSE Integration', () => {
    it('valida tickets efímeros de un solo uso y emite delta_synced con secciones y changedIds tras commit', async () => {
      const eventEmitter = new EventEmitter2();
      const realtimeBus = new OrdenRealtimeBusService(eventEmitter);

      // 1. Ticket efímero: un solo uso y amarrado a orderId
      const { ticket } = realtimeBus.issueStreamTicket(800, 1);
      expect(realtimeBus.consumeStreamTicket(999, ticket)).toBeNull(); // otro orderId rechazado y consumido
      const { ticket: validTicket } = realtimeBus.issueStreamTicket(800, 1);
      expect(realtimeBus.consumeStreamTicket(800, validTicket)).not.toBeNull();
      expect(realtimeBus.consumeStreamTicket(800, validTicket)).toBeNull(); // replay bloqueado

      // 2. SyncDeltaService emite delta_synced en el bus SSE
      const ordenFixture = {
        id_orden_servicio: 800,
        numero_orden: 'OS-2026-0800',
        id_tecnico_asignado: 5,
        id_equipo: 10,
        id_firma_tecnico: null,
        id_firma_cliente: null,
        edicion_tecnico_habilitada: false,
        execution_sync_version: 2,
        estados_orden: { codigo_estado: 'EN_PROCESO', es_estado_final: false },
        ordenes_equipos: [],
        equipos: { config_parametros: null, plantillas_parametros: null },
        clientes: { id_persona: 20 },
      };
      const txMock: any = {
        $queryRaw: jest.fn().mockResolvedValue([{ id_orden_servicio: 800 }]),
        ordenes_servicio: {
          findUnique: jest.fn().mockResolvedValue(ordenFixture),
          update: jest.fn().mockResolvedValue({ execution_sync_version: 3 }),
        },
        actividades_ejecutadas: {
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id_actividad_ejecutada: 5001 }),
        },
        ordenes_pendientes: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ id_orden_pendiente: 6001 }),
        },
      };

      const prismaMock: any = {
        ordenes_servicio: {
          findUnique: jest.fn().mockResolvedValue(ordenFixture),
        },
        $transaction: jest.fn(async (cb: any) => cb(txMock)),
      };
      const mediaMock: any = {};

      const deltaService = new SyncDeltaService(prismaMock, mediaMock, realtimeBus);
      const eventsPromise = firstValueFrom(
        realtimeBus.subscribeOrden(800).pipe(take(2), toArray()),
      );

      await deltaService.syncDelta(
        800,
        {
          actividades: [
            {
              clientUuid: 'act-uuid-800',
              idActividadCatalogo: 10,
              estado: 'M',
              observaciones: 'Fuga detectada',
              syncVersion: 1,
            },
          ],
          pendientes: [
            {
              clientUuid: 'pend-uuid-800',
              descripcion: 'Cambiar sello mecánico',
              prioridad: 'URGENTE',
              syncVersion: 1,
            },
          ],
        },
        { id: 5, idEmpleado: 5, esAdmin: false },
      );

      const events = await eventsPromise;
      expect(events[0].type).toBe('connected');
      expect(events[1].type).toBe('delta_synced');
      const payload = events[1].data as any;
      expect(payload.orderId).toBe(800);
      expect(payload.executionSyncVersion).toBe(3);
      expect(payload.sections).toEqual(
        expect.arrayContaining(['actividades', 'pendientes', 'progreso']),
      );
      expect(payload.changedIds.actividades).toEqual([5001]);
      expect(payload.changedIds.pendientes).toEqual([6001]);

      realtimeBus.onModuleDestroy();
    });
  });
});
