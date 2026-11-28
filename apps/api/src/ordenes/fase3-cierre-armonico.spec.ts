import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { AllExceptionsFilter } from '../common/filters/http-exception.filter';
import { SyncService } from '../sync/sync.service';
import { FinalizarCommitService } from './services/finalizar-commit.service';
import { OrdenRealtimeBusService } from './services/orden-realtime-bus.service';

describe('Fase 3 — Cierre Final Armónico v2 (finalizar-commit) e Hidratación Completa (/sync/orden/:id)', () => {
  const buildTxMock = (overrides: Record<string, any> = {}) => {
    const defaultLocked = {
      id_orden_servicio: 2145,
      id_estado_actual: 3,
      edicion_tecnico_habilitada: false,
      id_tecnico_asignado: 10,
      numero_orden: 'OS-2026-2145',
      execution_sync_version: 5,
      fecha_inicio_real: new Date('2026-11-28T13:00:00.000Z'),
      fecha_fin_real: null,
      observaciones_cierre: null,
      observaciones_tecnico: 'Avance parcial',
      id_firma_tecnico: 901,
      id_firma_cliente: 902,
      id_equipo: 500,
      metadata: { existente: true },
      codigo_estado: 'EN_PROCESO',
      es_estado_final: false,
    };

    const tx: any = {
      $queryRaw: jest.fn().mockResolvedValue([overrides.locked ?? defaultLocked]),
      empleados: {
        findFirst: jest.fn().mockResolvedValue({ id_empleado: 10 }),
      },
      actividades_ejecutadas: {
        findMany: jest.fn().mockImplementation((args: any) => {
          if (args?.select?.client_uuid) {
            return Promise.resolve(overrides.foundActs ?? [{ client_uuid: 'uuid-act-1' }]);
          }
          return Promise.resolve(overrides.activeActsForHoro ?? []);
        }),
        count: jest.fn().mockResolvedValue(overrides.countActs ?? 4),
        deleteMany: jest.fn(),
      },
      mediciones_servicio: {
        findMany: jest.fn().mockImplementation((args: any) => {
          if (args?.select?.client_uuid) {
            return Promise.resolve(overrides.foundMeds ?? [{ client_uuid: 'uuid-med-1' }]);
          }
          return Promise.resolve(overrides.activeMedsForHoro ?? []);
        }),
        count: jest.fn().mockResolvedValue(overrides.countMeds ?? 2),
        deleteMany: jest.fn(),
      },
      evidencias_fotograficas: {
        findMany: jest.fn().mockResolvedValue(overrides.foundEvs ?? [{ client_uuid: 'uuid-ev-1' }]),
        count: jest.fn().mockResolvedValue(overrides.countEvs ?? 3),
        deleteMany: jest.fn(),
      },
      ordenes_pendientes: {
        findMany: jest
          .fn()
          .mockResolvedValue(overrides.foundPends ?? [{ client_uuid: 'uuid-pend-1' }]),
        count: jest.fn().mockResolvedValue(overrides.countPends ?? 2),
        deleteMany: jest.fn(),
      },
      estados_orden: {
        findFirst: jest.fn().mockResolvedValue({ id_estado: 4 }),
      },
      ordenes_servicio: {
        update: jest.fn().mockResolvedValue({ execution_sync_version: 6 }),
      },
      ordenes_equipos: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            overrides.ordenesEquipos ?? [{ id_orden_equipo: 701, id_equipo: 500 }],
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn(),
      },
      equipos: {
        findUnique: jest.fn().mockResolvedValue(
          overrides.equipo ?? {
            id_equipo: 500,
            horas_actuales: new Decimal(1200),
            lectura_uso_actual: new Decimal(1200),
          },
        ),
        update: jest.fn().mockResolvedValue({}),
      },
      lecturas_horometro: {
        findFirst: jest.fn().mockImplementation((args: any) => {
          if (args?.where?.id_orden_servicio) {
            return Promise.resolve(overrides.lecturaMismaOrden ?? null);
          }
          return Promise.resolve(
            overrides.ultimaLectura ?? {
              horas_lectura: new Decimal(1200),
              fecha_lectura: new Date('2026-11-20T10:00:00.000Z'),
            },
          );
        }),
        create: jest.fn().mockResolvedValue({ id_lectura: 88 }),
        deleteMany: jest.fn(),
      },
      historial_estados_orden: {
        create: jest.fn().mockResolvedValue({ id_historial: 77 }),
      },
    };
    return tx;
  };

  it('1. Cierre armónico v2 usa FOR UPDATE OF o, valida manifest, cierra orden/equipos, actualiza horómetro y ejecuta 0 deleteMany', async () => {
    const tx = buildTxMock({
      activeMedsForHoro: [
        {
          id_orden_equipo: 701,
          valor_numerico: new Decimal(1285),
          parametros_medicion: {
            nombre_parametro: 'Horómetro Motor',
            codigo_parametro: 'GEN_HOROMETRO',
          },
        },
      ],
    });
    const prisma: any = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };
    const realtimeBus = {
      emitOrdenEvent: jest.fn(),
    } as unknown as OrdenRealtimeBusService;

    const service = new FinalizarCommitService(prisma, realtimeBus);

    const res = await service.finalizarCommit(
      2145,
      {
        observaciones: 'Mantenimiento preventivo ejecutado al 100%',
        horaEntrada: '08:00',
        horaSalida: '10:30',
        manifest: {
          actividadesUuids: ['uuid-act-1'],
          medicionesUuids: ['uuid-med-1'],
          evidenciasUuids: ['uuid-ev-1'],
          pendientesUuids: ['uuid-pend-1'],
          firmasTipos: ['TECNICO', 'CLIENTE'],
        },
      },
      { id: 100, idEmpleado: 10, esAdmin: false },
    );

    expect(res.success).toBe(true);
    expect(res.alreadyCompleted).toBe(false);
    expect(res.estadoCodigo).toBe('COMPLETADA');
    expect(res.executionSyncVersion).toBe(6);
    expect(res.resumen).toEqual({
      actividades: 4,
      mediciones: 2,
      evidencias: 3,
      pendientes: 2,
    });

    // Lock pesimista FOR UPDATE OF o ejecutado
    const sqlArg = tx.$queryRaw.mock.calls[0][0];
    expect(JSON.stringify(sqlArg)).toContain('FOR UPDATE OF o');

    // Actualización de orden: duración = 150 min y permiso de edición revocado
    const updateData = tx.ordenes_servicio.update.mock.calls[0][0].data;
    expect(updateData.id_estado_actual).toBe(4);
    expect(updateData.duracion_minutos).toBe(150);
    expect(updateData.edicion_tecnico_habilitada).toBe(false);

    // Equipos cerrados sin borrar
    expect(tx.ordenes_equipos.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_orden_servicio: 2145 },
        data: expect.objectContaining({ estado: 'COMPLETADO' }),
      }),
    );

    // Horómetro actualizado monotónicamente a 1285
    expect(tx.lecturas_horometro.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id_equipo: 500,
          horas_lectura: 1285,
          horas_transcurridas: 85,
        }),
      }),
    );
    expect(tx.equipos.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_equipo: 500 },
        data: expect.objectContaining({ horas_actuales: 1285, lectura_uso_actual: 1285 }),
      }),
    );

    // PROHIBIDO deleteMany en CUALQUIER tabla de ejecución o pendientes Admin
    expect(tx.actividades_ejecutadas.deleteMany).not.toHaveBeenCalled();
    expect(tx.mediciones_servicio.deleteMany).not.toHaveBeenCalled();
    expect(tx.evidencias_fotograficas.deleteMany).not.toHaveBeenCalled();
    expect(tx.ordenes_pendientes.deleteMany).not.toHaveBeenCalled();
    expect(tx.ordenes_equipos.deleteMany).not.toHaveBeenCalled();
    expect(tx.lecturas_horometro.deleteMany).not.toHaveBeenCalled();

    // SSE order_finalized emitido después de commit
    expect(realtimeBus.emitOrdenEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'order_finalized',
        orderId: 2145,
        executionSyncVersion: 6,
      }),
    );
  });

  it('2. Manifiesto incompleto retorna 409 INCOMPLETE_MANIFEST con missingClientUuids exactos sin cerrar la orden', async () => {
    const tx = buildTxMock({
      locked: {
        id_orden_servicio: 2145,
        id_estado_actual: 3,
        edicion_tecnico_habilitada: false,
        id_tecnico_asignado: 10,
        numero_orden: 'OS-2026-2145',
        execution_sync_version: 5,
        fecha_inicio_real: new Date('2026-11-28T13:00:00.000Z'),
        fecha_fin_real: null,
        observaciones_cierre: null,
        observaciones_tecnico: null,
        id_firma_tecnico: 901,
        id_firma_cliente: null, // Falta firma cliente en servidor
        id_equipo: 500,
        metadata: {},
        codigo_estado: 'EN_PROCESO',
        es_estado_final: false,
      },
      foundActs: [{ client_uuid: 'uuid-act-1' }],
      foundEvs: [],
    });
    const prisma: any = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };
    const realtimeBus = { emitOrdenEvent: jest.fn() } as unknown as OrdenRealtimeBusService;
    const service = new FinalizarCommitService(prisma, realtimeBus);

    let caught: any = null;
    try {
      await service.finalizarCommit(
        2145,
        {
          manifest: {
            actividadesUuids: ['uuid-act-1', 'uuid-act-missing'],
            medicionesUuids: ['uuid-med-1'],
            evidenciasUuids: ['uuid-ev-missing'],
            pendientesUuids: ['uuid-pend-1'],
            firmasTipos: ['TECNICO', 'CLIENTE'],
          },
        },
        { id: 100, idEmpleado: 10, esAdmin: false },
      );
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ConflictException);
    const body = caught.getResponse();
    expect(body.code).toBe('INCOMPLETE_MANIFEST');
    expect(body.missingClientUuids).toEqual({
      actividades: ['uuid-act-missing'],
      mediciones: [],
      evidencias: ['uuid-ev-missing'],
      pendientes: [],
      firmas: ['CLIENTE'],
    });
    expect(tx.ordenes_servicio.update).not.toHaveBeenCalled();
    expect(tx.ordenes_equipos.updateMany).not.toHaveBeenCalled();
    expect(realtimeBus.emitOrdenEvent).not.toHaveBeenCalled();
  });

  it('3. Doble clic concurrente sobre orden ya COMPLETADA es 100% idempotente (200 alreadyCompleted sin duplicar historial ni SSE)', async () => {
    const tx = buildTxMock({
      locked: {
        id_orden_servicio: 2145,
        id_estado_actual: 4,
        edicion_tecnico_habilitada: false,
        id_tecnico_asignado: 10,
        numero_orden: 'OS-2026-2145',
        execution_sync_version: 6,
        fecha_inicio_real: new Date('2026-11-28T13:00:00.000Z'),
        fecha_fin_real: new Date('2026-11-28T15:30:00.000Z'),
        observaciones_cierre: 'Cerrada',
        observaciones_tecnico: 'Cerrada',
        id_firma_tecnico: 901,
        id_firma_cliente: 902,
        id_equipo: 500,
        metadata: {},
        codigo_estado: 'COMPLETADA',
        es_estado_final: true,
      },
    });
    const prisma: any = {
      $transaction: jest.fn().mockImplementation((cb: any) => cb(tx)),
    };
    const realtimeBus = { emitOrdenEvent: jest.fn() } as unknown as OrdenRealtimeBusService;
    const service = new FinalizarCommitService(prisma, realtimeBus);

    const res = await service.finalizarCommit(
      2145,
      { observaciones: 'Doble clic' },
      { id: 100, idEmpleado: 10, esAdmin: false },
    );

    expect(res.success).toBe(true);
    expect(res.alreadyCompleted).toBe(true);
    expect(tx.ordenes_servicio.update).not.toHaveBeenCalled();
    expect(tx.historial_estados_orden.create).not.toHaveBeenCalled();
    expect(realtimeBus.emitOrdenEvent).not.toHaveBeenCalled();
  });

  it('4. Resubida autorizada preserva fechas originales y revoca permiso; resubida sin permiso responde 403 Forbidden', async () => {
    const origInicio = new Date('2026-11-27T13:00:00.000Z');
    const origFin = new Date('2026-11-27T14:45:00.000Z');
    const txAutorizada = buildTxMock({
      locked: {
        id_orden_servicio: 2145,
        id_estado_actual: 4,
        edicion_tecnico_habilitada: true,
        id_tecnico_asignado: 10,
        numero_orden: 'OS-2026-2145',
        execution_sync_version: 6,
        fecha_inicio_real: origInicio,
        fecha_fin_real: origFin,
        observaciones_cierre: 'Original',
        observaciones_tecnico: 'Original',
        id_firma_tecnico: 901,
        id_firma_cliente: 902,
        id_equipo: 500,
        metadata: {},
        codigo_estado: 'COMPLETADA',
        es_estado_final: true,
      },
    });
    const serviceOk = new FinalizarCommitService(
      { $transaction: jest.fn().mockImplementation((cb: any) => cb(txAutorizada)) } as any,
      { emitOrdenEvent: jest.fn() } as any,
    );

    const resOk = await serviceOk.finalizarCommit(
      2145,
      {
        observaciones: 'Corregida en campo',
        horaEntrada: '22:00',
        horaSalida: '23:00',
        esResubida: true,
      },
      { id: 100, idEmpleado: 10, esAdmin: false },
    );

    expect(resOk.esResubida).toBe(true);
    const data = txAutorizada.ordenes_servicio.update.mock.calls[0][0].data;
    expect(data.fecha_inicio_real.toISOString()).toBe(origInicio.toISOString());
    expect(data.fecha_fin_real.toISOString()).toBe(origFin.toISOString());
    expect(data.edicion_tecnico_habilitada).toBe(false);
    expect(txAutorizada.historial_estados_orden.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ accion: 'RESUBIDA_TECNICO' }),
      }),
    );
    expect(txAutorizada.ordenes_pendientes.deleteMany).not.toHaveBeenCalled();

    // Resubida con permiso revocado -> ForbiddenException
    const txRevocada = buildTxMock({
      locked: {
        id_orden_servicio: 2145,
        id_estado_actual: 4,
        edicion_tecnico_habilitada: false,
        id_tecnico_asignado: 10,
        numero_orden: 'OS-2026-2145',
        execution_sync_version: 7,
        fecha_inicio_real: origInicio,
        fecha_fin_real: origFin,
        observaciones_cierre: 'Original',
        observaciones_tecnico: 'Original',
        id_firma_tecnico: 901,
        id_firma_cliente: 902,
        id_equipo: 500,
        metadata: {},
        codigo_estado: 'COMPLETADA',
        es_estado_final: true,
      },
    });
    const serviceDenied = new FinalizarCommitService({
      $transaction: jest.fn().mockImplementation((cb: any) => cb(txRevocada)),
    } as any);

    await expect(
      serviceDenied.finalizarCommit(
        2145,
        { esResubida: true },
        { id: 100, idEmpleado: 10, esAdmin: false },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('5. Anti-IDOR rechaza otro técnico y anti-rollback protege horómetro maestro cuando lectura de campo es inferior', async () => {
    const txIdor = buildTxMock();
    const serviceIdor = new FinalizarCommitService({
      $transaction: jest.fn().mockImplementation((cb: any) => cb(txIdor)),
    } as any);

    await expect(
      serviceIdor.finalizarCommit(2145, {}, { id: 999, idEmpleado: 77, esAdmin: false }),
    ).rejects.toThrow(ForbiddenException);

    // Anti-rollback horómetro: lectura 900 < acumulado 1200 -> audita lectura sin rebajar equipos.horas_actuales
    const txRollback = buildTxMock({
      activeMedsForHoro: [
        {
          id_orden_equipo: 701,
          valor_numerico: new Decimal(900),
          parametros_medicion: {
            nombre_parametro: 'Horómetro',
            codigo_parametro: 'HORO',
          },
        },
      ],
    });
    const serviceRollback = new FinalizarCommitService({
      $transaction: jest.fn().mockImplementation((cb: any) => cb(txRollback)),
    } as any);

    await serviceRollback.finalizarCommit(
      2145,
      { observaciones: 'OK' },
      { id: 100, idEmpleado: 10, esAdmin: false },
    );

    expect(txRollback.lecturas_horometro.create).toHaveBeenCalledTimes(1);
    expect(txRollback.equipos.update).not.toHaveBeenCalled();
  });

  it('6. GET /api/sync/orden/:id hidrata actividades, mediciones (incl. valor 0), evidencias con URL+SHA256+clientUuid, pendientes y firmas, con defensa IDOR', async () => {
    const prisma: any = {
      ordenes_servicio: {
        findUnique: jest.fn().mockResolvedValue({
          id_orden_servicio: 2145,
          numero_orden: 'OS-2026-2145',
          id_estado_actual: 3,
          id_tecnico_asignado: 10,
          id_cliente: 5,
          id_equipo: 500,
          id_tipo_servicio: 2,
          id_firma_tecnico: 901,
          id_firma_cliente: 902,
          nombre_quien_recibe: 'Carlos Cliente',
          cargo_quien_recibe: 'Jefe Mantenimiento',
          edicion_tecnico_habilitada: false,
          execution_sync_version: 9,
          fecha_modificacion: new Date('2026-11-28T14:00:00.000Z'),
          fecha_creacion: new Date('2026-11-28T10:00:00.000Z'),
          fecha_inicio_real: new Date('2026-11-28T13:00:00.000Z'),
          fecha_fin_real: null,
          metadata: { razon_falla: 'Fuga sello mecánico', hora_entrada: '08:00' },
          estados_orden: {
            codigo_estado: 'EN_PROCESO',
            nombre_estado: 'En Proceso',
            es_estado_final: false,
          },
          clientes: { persona: { nombre_comercial: 'Cliente Demo' } },
          sedes_cliente: null,
          equipos: { codigo_equipo: 'EQ-01', nombre_equipo: 'Generador 1' },
          tipos_servicio: { codigo_tipo: 'PREV_A', nombre_tipo: 'Preventivo A' },
          ordenes_actividades_plan: [
            {
              id_actividad_catalogo: 101,
              orden_secuencia: 1,
              origen: 'PLAN',
              es_obligatoria: true,
            },
          ],
          ordenes_equipos: [
            {
              id_orden_equipo: 701,
              id_orden_servicio: 2145,
              id_equipo: 500,
              orden_secuencia: 1,
              estado: 'EN_PROCESO',
              equipos: { codigo_equipo: 'EQ-01', nombre_equipo: 'Generador 1' },
            },
          ],
        }),
      },
      actividades_ejecutadas: {
        findMany: jest.fn().mockResolvedValue([
          {
            id_actividad_ejecutada: 3001,
            client_uuid: 'act-uuid-1',
            sync_version: 2,
            payload_hash: 'h-act-1',
            id_orden_equipo: 701,
            id_actividad_catalogo: 101,
            descripcion_manual: null,
            sistema: 'MOTOR',
            orden_secuencia: 1,
            estado: 'M',
            observaciones: 'Requiere ajuste',
            respuesta_json: null,
            ejecutada: true,
            fecha_ejecucion: new Date('2026-11-28T13:15:00.000Z'),
            catalogo_actividades: { descripcion_actividad: 'Revisar correas', orden_ejecucion: 1 },
          },
        ]),
      },
      mediciones_servicio: {
        findMany: jest.fn().mockResolvedValue([
          {
            id_medicion: 4001,
            client_uuid: 'med-uuid-0',
            sync_version: 3,
            payload_hash: 'h-med-0',
            id_orden_equipo: 701,
            id_parametro_medicion: 88,
            unidad_medida: 'VDC',
            valor_numerico: new Decimal(0),
            valor_texto: null,
            nivel_alerta: 'CRITICO',
            fuera_de_rango: true,
            observaciones: 'Batería descargada',
            fecha_medicion: new Date('2026-11-28T13:20:00.000Z'),
            parametros_medicion: { nombre_parametro: 'Voltaje Batería', unidad_medida: 'VDC' },
          },
        ]),
      },
      evidencias_fotograficas: {
        findMany: jest.fn().mockResolvedValue([
          {
            id_evidencia: 5001,
            client_uuid: 'ev-uuid-1',
            sync_version: 1,
            payload_hash: 'h-ev-1',
            id_orden_equipo: 701,
            id_actividad_ejecutada: 3001,
            tipo_evidencia: 'DURANTE',
            descripcion: 'Correa agrietada',
            nombre_archivo: 'foto1.jpg',
            ruta_archivo: 'https://res.cloudinary.com/demo/image/upload/sha256_abc.jpg',
            hash_sha256: 'abc123def456',
            storage_provider: 'CLOUDINARY',
            storage_key: 'mekanos/OS-2026-2145/sha256_abc123def456',
            tama_o_bytes: BigInt(45000),
            mime_type: 'image/jpeg',
            fecha_captura: new Date('2026-11-28T13:25:00.000Z'),
            actividades_ejecutadas: { id_actividad_ejecutada: 3001, client_uuid: 'act-uuid-1' },
          },
        ]),
      },
      ordenes_pendientes: {
        findMany: jest.fn().mockResolvedValue([
          {
            id_orden_pendiente: 6001,
            client_uuid: 'pend-uuid-1',
            sync_version: 1,
            payload_hash: 'h-pend-1',
            id_orden_equipo: 701,
            id_equipo: 500,
            id_pendiente_catalogo: null,
            descripcion: 'Cambiar correa principal',
            origen: 'MANUAL',
            prioridad: 'URGENTE',
            estado: 'PENDIENTE',
            observaciones: 'Detectado en campo',
            fecha_creacion: new Date('2026-11-28T13:30:00.000Z'),
          },
        ]),
      },
      firmas_digitales: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id_firma_digital === 901) {
            return Promise.resolve({
              id_firma_digital: 901,
              tipo_firma: 'TECNICO',
              hash_firma: 'hash-tec',
              fecha_captura: new Date('2026-11-28T13:40:00.000Z'),
              observaciones: 'Firmante: Técnico 10',
            });
          }
          return Promise.resolve({
            id_firma_digital: 902,
            tipo_firma: 'CLIENTE',
            hash_firma: 'hash-cli',
            fecha_captura: new Date('2026-11-28T13:45:00.000Z'),
            observaciones: 'Firmante: Carlos Cliente',
          });
        }),
      },
      documentos_generados: { findFirst: jest.fn().mockResolvedValue(null) },
      catalogo_sistemas: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const syncService = new SyncService(prisma);

    // IDOR: técnico distinto rechazado
    await expect(
      syncService.getOrdenCompleta(2145, { id: 99, idEmpleado: 77, esAdmin: false }),
    ).rejects.toThrow(ForbiddenException);

    // Técnico propietario recibe hidratación completa
    const hydrated = await syncService.getOrdenCompleta(2145, {
      id: 10,
      idEmpleado: 10,
      esAdmin: false,
    });

    expect(hydrated.executionSyncVersion).toBe(9);
    expect(hydrated.razonFalla).toBe('Fuga sello mecánico');
    expect(hydrated.actividadesEjecutadas).toHaveLength(1);
    expect(hydrated.actividadesEjecutadas[0]).toMatchObject({
      clientUuid: 'act-uuid-1',
      syncVersion: 2,
      estado: 'M',
    });
    expect(hydrated.mediciones).toHaveLength(1);
    expect(hydrated.mediciones[0]).toMatchObject({
      clientUuid: 'med-uuid-0',
      valorNumerico: 0,
    });
    expect(hydrated.evidencias).toHaveLength(1);
    expect(hydrated.evidencias[0]).toMatchObject({
      clientUuid: 'ev-uuid-1',
      actividadClientUuid: 'act-uuid-1',
      publicUrl: 'https://res.cloudinary.com/demo/image/upload/sha256_abc.jpg',
      hashSha256: 'abc123def456',
      storageProvider: 'CLOUDINARY',
    });
    expect(hydrated.pendientes).toHaveLength(1);
    expect(hydrated.pendientes[0].clientUuid).toBe('pend-uuid-1');
    expect(hydrated.firmas.tecnico.hashSha256).toBe('hash-tec');
    expect(hydrated.firmas.cliente.nombreFirmante).toBe('Carlos Cliente');
  });

  it('7. AllExceptionsFilter preserva code=INCOMPLETE_MANIFEST y missingClientUuids en respuestas HTTP 409', () => {
    const filter = new AllExceptionsFilter();
    const jsonMock = jest.fn();
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    const host: any = {
      switchToHttp: () => ({
        getResponse: () => ({ status: statusMock }),
        getRequest: () => ({ url: '/api/ordenes/2145/finalizar-commit', method: 'POST' }),
      }),
    };

    filter.catch(
      new ConflictException({
        statusCode: 409,
        code: 'INCOMPLETE_MANIFEST',
        message: 'Faltan registros delta por sincronizar.',
        missingClientUuids: {
          actividades: ['uuid-missing-1'],
          mediciones: [],
          evidencias: [],
          pendientes: [],
          firmas: [],
        },
      }),
      host,
    );

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        code: 'INCOMPLETE_MANIFEST',
        missingClientUuids: expect.objectContaining({
          actividades: ['uuid-missing-1'],
        }),
      }),
    );
  });
});
