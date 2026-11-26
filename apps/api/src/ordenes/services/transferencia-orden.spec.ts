import { TransferenciaOrdenService } from './transferencia-orden.service';

function createMockPrisma(
  ordenes: Record<number, any>,
  lotes: Record<number, any[]> = {},
  firmas: Record<number, any> = {},
) {
  const created = {
    ordenes_equipos: [] as any[],
    actividades_ejecutadas: [] as any[],
    mediciones_servicio: [] as any[],
    evidencias_fotograficas: [] as any[],
    lotes_galeria: [] as any[],
    componentes_usados: [] as any[],
    ordenes_actividades_plan: [] as any[],
    ordenes_pendientes: [] as any[],
    historial_estados_orden: [] as any[],
    firmas_digitales: [] as any[],
  };
  const updated = {
    ordenes_servicio: [] as any[],
    ordenes_equipos: [] as any[],
  };
  const deleted: Record<string, number> = {};
  let nextId = 50000;

  const tx: any = {
    firmas_digitales: {
      findUnique: jest.fn(async (args: any) => firmas[args.where.id_firma_digital] ?? null),
      create: jest.fn(async (args: any) => {
        const row = { id_firma_digital: ++nextId, ...args.data };
        created.firmas_digitales.push(row);
        return row;
      }),
    },
    ordenes_servicio: {
      update: jest.fn(async (args: any) => {
        updated.ordenes_servicio.push(args);
        return args.data;
      }),
    },
    ordenes_equipos: {
      update: jest.fn(async (args: any) => {
        updated.ordenes_equipos.push(args);
        return args.data;
      }),
      create: jest.fn(async (args: any) => {
        const row = { id_orden_equipo: ++nextId, ...args.data };
        created.ordenes_equipos.push(row);
        return row;
      }),
    },
    actividades_ejecutadas: {
      deleteMany: jest.fn(async () => {
        deleted.actividades_ejecutadas = (deleted.actividades_ejecutadas || 0) + 1;
        return { count: 0 };
      }),
      create: jest.fn(async (args: any) => {
        const row = { id_actividad_ejecutada: ++nextId, ...args.data };
        created.actividades_ejecutadas.push(row);
        return row;
      }),
    },
    mediciones_servicio: {
      deleteMany: jest.fn(async () => {
        deleted.mediciones_servicio = (deleted.mediciones_servicio || 0) + 1;
        return { count: 0 };
      }),
      create: jest.fn(async (args: any) => {
        const row = { id_medicion: ++nextId, ...args.data };
        created.mediciones_servicio.push(row);
        return row;
      }),
    },
    evidencias_fotograficas: {
      deleteMany: jest.fn(async () => {
        deleted.evidencias_fotograficas = (deleted.evidencias_fotograficas || 0) + 1;
        return { count: 0 };
      }),
      create: jest.fn(async (args: any) => {
        const row = { id_evidencia: ++nextId, ...args.data };
        created.evidencias_fotograficas.push(row);
        return row;
      }),
    },
    lotes_galeria: {
      deleteMany: jest.fn(async () => {
        deleted.lotes_galeria = (deleted.lotes_galeria || 0) + 1;
        return { count: 0 };
      }),
      create: jest.fn(async (args: any) => {
        const row = { id_lote_galeria: ++nextId, ...args.data };
        created.lotes_galeria.push(row);
        return row;
      }),
    },
    componentes_usados: {
      deleteMany: jest.fn(async () => {
        deleted.componentes_usados = (deleted.componentes_usados || 0) + 1;
        return { count: 0 };
      }),
      create: jest.fn(async (args: any) => {
        const row = { id_componente_usado: ++nextId, ...args.data };
        created.componentes_usados.push(row);
        return row;
      }),
    },
    ordenes_actividades_plan: {
      deleteMany: jest.fn(async () => {
        deleted.ordenes_actividades_plan = (deleted.ordenes_actividades_plan || 0) + 1;
        return { count: 0 };
      }),
      create: jest.fn(async (args: any) => {
        const row = { id_orden_actividad_plan: ++nextId, ...args.data };
        created.ordenes_actividades_plan.push(row);
        return row;
      }),
    },
    ordenes_pendientes: {
      deleteMany: jest.fn(async () => {
        deleted.ordenes_pendientes = (deleted.ordenes_pendientes || 0) + 1;
        return { count: 0 };
      }),
      create: jest.fn(async (args: any) => {
        const row = { id_orden_pendiente: ++nextId, ...args.data };
        created.ordenes_pendientes.push(row);
        return row;
      }),
    },
    historial_estados_orden: {
      create: jest.fn(async (args: any) => {
        created.historial_estados_orden.push(args.data);
        return args.data;
      }),
    },
  };

  const prisma: any = {
    ordenes_servicio: {
      findUnique: jest.fn(async (args: any) => ordenes[args.where.id_orden_servicio] ?? null),
    },
    lotes_galeria: {
      findMany: jest.fn(async (args: any) => lotes[args.where.id_orden_servicio] ?? []),
      count: jest.fn(async (args: any) => (lotes[args.where.id_orden_servicio] ?? []).length),
    },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  };

  return { prisma, created, updated, deleted };
}

function makeEquipo(
  idOe: number,
  seq: number,
  idEq: number,
  codigo: string,
  nombre: string,
  idTipo = 2,
  nombreTipo = 'Bomba',
) {
  return {
    id_orden_equipo: idOe,
    id_equipo: idEq,
    orden_secuencia: seq,
    nombre_sistema: nombre,
    estado: 'COMPLETADO',
    equipos: {
      id_equipo: idEq,
      codigo_equipo: codigo,
      nombre_equipo: nombre,
      numero_serie_equipo: `SER-${idEq}`,
      id_tipo_equipo: idTipo,
      tipos_equipo: { id_tipo_equipo: idTipo, nombre_tipo: nombreTipo },
    },
  };
}

describe('TransferenciaOrdenService - Transferencia Inteligente v2 y PDF Multi-Equipo', () => {
  const buildScenario9to6 = (legacyNullFks = false) => {
    const srcEquipos = [
      makeEquipo(1001, 1, 101, 'BOM-16462', '16462- BOMBA SIEMENS'),
      makeEquipo(1002, 2, 102, 'BOM-TOB', 'BOMBA TOBOGANES'),
      makeEquipo(1003, 3, 103, 'BOM-10535', '10535 - HIDROFLOW #1'),
      makeEquipo(1004, 4, 104, 'BOM-16459', '16459 - PULSAR 1HP'),
      makeEquipo(1005, 5, 105, 'BOM-BOSQ', 'BOMBA BOSQUE NIEBLA'),
      makeEquipo(1006, 6, 106, 'BOM-16463', '16463 - PENTAIR 3HP'),
      makeEquipo(1007, 7, 107, 'BOM-10536', '10536 - HIDROFLOW #2'),
      makeEquipo(1008, 8, 108, 'BOM-16461', '16461 - WEG 15HP'),
      makeEquipo(1009, 9, 109, 'BOM-10487', '10487 - SIEMENS 7.5'),
    ];
    const dstEquipos = [
      makeEquipo(2001, 1, 108, 'BOM-16461', '16461 - WEG 15HP'),
      makeEquipo(2002, 2, 101, 'BOM-16462', '16462- BOMBA SIEMENS'),
      makeEquipo(2003, 3, 106, 'BOM-16463', '16463 - PENTAIR 3HP'),
      makeEquipo(2004, 4, 103, 'BOM-10535', '10535 - HIDROFLOW #1'),
      makeEquipo(2005, 5, 107, 'BOM-10536', '10536 - HIDROFLOW #2'),
      makeEquipo(2006, 6, 104, 'BOM-16459', '16459 - PULSAR 1HP'),
    ];
    const ampValues = [16, 15, 8, 12, 17, 31, 2.5, 19, 22];

    const ordenOrigen = {
      id_orden_servicio: 78,
      numero_orden: 'OS-202611-0078',
      id_cliente: 50,
      id_equipo: 101,
      id_tipo_servicio: 3,
      id_tecnico_asignado: 10,
      id_estado_actual: 4,
      fecha_inicio_real: new Date('2026-11-20T08:00:00Z'),
      fecha_fin_real: new Date('2026-11-20T11:00:00Z'),
      observaciones_cierre: 'Servicio finalizado',
      id_firma_cliente: 88,
      id_firma_tecnico: 89,
      estados_orden: { codigo_estado: 'COMPLETADA', nombre_estado: 'Completada', es_estado_final: true },
      clientes: { id_cliente: 50, persona: { razon_social: 'TAKURIKA' } },
      tipos_servicio: { id_tipo_servicio: 3, nombre_tipo: 'Preventivo A - Bombas' },
      equipos: srcEquipos[0].equipos,
      ordenes_equipos: srcEquipos,
      actividades_ejecutadas: srcEquipos.map((oe, i) => ({
        id_actividad_ejecutada: 3001 + i,
        id_actividad_catalogo: 500,
        sistema: 'HIDRAULICO',
        orden_secuencia: 1,
        estado: 'B',
        observaciones: `OBS_${oe.equipos.codigo_equipo}`,
        id_orden_equipo: legacyNullFks ? null : oe.id_orden_equipo,
        excluido_pdf: i === 0,
      })),
      mediciones_servicio: srcEquipos.map((oe, i) => ({
        id_medicion: 4001 + i,
        id_parametro_medicion: 10,
        valor_numerico: ampValues[i],
        unidad_medida: 'A',
        id_orden_equipo: legacyNullFks ? null : oe.id_orden_equipo,
        excluido_pdf: false,
        parametros_medicion: { id_parametro_medicion: 10, nombre_parametro: 'Amperaje', id_tipo_equipo: null },
      })),
      evidencias_fotograficas: [
        ...srcEquipos.map((oe, i) => ({
          id_evidencia: 6001 + i,
          id_actividad_ejecutada: 3001 + i,
          tipo_evidencia: 'ANTES',
          descripcion: `FOTO_${oe.equipos.codigo_equipo}`,
          nombre_archivo: `f_${i}.jpg`,
          ruta_archivo: `https://cdn.test/${i}.jpg`,
          hash_sha256: `h_${i}`,
          tama_o_bytes: BigInt(1000),
          id_orden_equipo: oe.id_orden_equipo,
          id_lote_galeria: null,
        })),
        {
          id_evidencia: 6999,
          id_actividad_ejecutada: null,
          tipo_evidencia: 'GENERAL',
          descripcion: 'Cuarto general',
          nombre_archivo: 'gen.jpg',
          ruta_archivo: 'https://cdn.test/gen.jpg',
          hash_sha256: 'h_gen',
          tama_o_bytes: BigInt(1000),
          id_orden_equipo: null,
          id_lote_galeria: 700,
        },
      ],
      componentes_usados: [
        {
          id_componente_usado: 901,
          id_componente: 11,
          id_movimiento_inventario: 7777,
          descripcion: 'Sello mecánico',
          cantidad: 1,
          unidad: 'UND',
        },
      ],
      ordenes_actividades_plan: [{ id_actividad_catalogo: 500, orden_secuencia: 1 }],
      ordenes_pendientes: [],
    };

    const ordenDestino = {
      id_orden_servicio: 94,
      numero_orden: 'OS-202611-0094',
      id_cliente: 50,
      id_equipo: 108,
      id_tipo_servicio: 3,
      id_tecnico_asignado: 25,
      id_estado_actual: 1,
      descripcion_inicial: 'Orden destino 6 bombas',
      metadata: { clave_destino: 'KEEP' },
      estados_orden: { codigo_estado: 'ASIGNADA', nombre_estado: 'Asignada', es_estado_final: false },
      clientes: { id_cliente: 50, persona: { razon_social: 'TAKURIKA' } },
      tipos_servicio: { id_tipo_servicio: 3, nombre_tipo: 'Preventivo A - Bombas' },
      equipos: dstEquipos[0].equipos,
      ordenes_equipos: dstEquipos,
      _count: {
        actividades_ejecutadas: 0,
        mediciones_servicio: 0,
        evidencias_fotograficas: 0,
        componentes_usados: 0,
        ordenes_actividades_plan: 1,
        ordenes_pendientes: 0,
      },
    };

    const lotes = {
      78: [{ id_lote_galeria: 700, id_orden_servicio: 78, nombre_lote: 'Tablero', orden_lote: 1 }],
    };

    return { ordenOrigen, ordenDestino, lotes };
  };

  it('empareja 1:1 por id_equipo (9→6 desordenado), descarta excedentes, preserva FKs, lotes y WMS', async () => {
    const { ordenOrigen, ordenDestino, lotes } = buildScenario9to6(false);
    const { prisma, created, updated } = createMockPrisma({ 78: ordenOrigen, 94: ordenDestino }, lotes);
    const svc = new TransferenciaOrdenService(prisma);

    const preview = await svc.previsualizarTransferencia(94, 78);
    expect(preview.puedeTransferir).toBe(true);
    expect(preview.compatibilidad.coincidenciasExactas).toBe(6);
    expect(preview.compatibilidad.equiposExcedentesOrigen).toBe(3);

    const res = await svc.ejecutarTransferencia(94, { idOrdenOrigen: 78 }, 1);
    expect(res.estadisticas.equiposMapeados).toBe(6);
    expect(res.estadisticas.equiposDescartados).toBe(3);
    expect(res.estadisticas.actividadesEjecutadas).toBe(6);
    expect(res.estadisticas.medicionesServicio).toBe(6);
    expect(res.estadisticas.evidenciasEquipo).toBe(6);
    expect(res.estadisticas.evidenciasGenerales).toBe(1);
    expect(res.estadisticas.lotesGaleria).toBe(1);

    const med2001 = created.mediciones_servicio.find((m) => m.id_orden_equipo === 2001);
    expect(med2001?.valor_numerico).toBe(19);
    const ev2001 = created.evidencias_fotograficas.find((e) => e.id_orden_equipo === 2001);
    expect(ev2001?.descripcion).toBe('FOTO_BOM-16461');
    expect(created.componentes_usados[0].id_movimiento_inventario).toBeNull();
    expect(updated.ordenes_servicio[0].data.metadata.clave_destino).toBe('KEEP');
  });

  it('reconstruye atribución por equipo en órdenes origen históricas con id_orden_equipo=NULL', async () => {
    const { ordenOrigen, ordenDestino, lotes } = buildScenario9to6(true);
    const { prisma, created } = createMockPrisma({ 78: ordenOrigen, 94: ordenDestino }, lotes);
    const svc = new TransferenciaOrdenService(prisma);

    const preview = await svc.previsualizarTransferencia(94, 78);
    expect(preview.origen.tieneDatosLegacySinFk).toBe(true);

    await svc.ejecutarTransferencia(94, { idOrdenOrigen: 78 }, 1);
    const med2001 = created.mediciones_servicio.find((m) => m.id_orden_equipo === 2001);
    expect(med2001?.valor_numerico).toBe(19);
  });

  it('protege plan destino y filtra mediciones exclusivas al cruzar tipos de equipo (Generador → Bomba)', async () => {
    const srcGen = makeEquipo(3001, 1, 301, 'GEN-01', 'Planta 100kVA', 1, 'Generador');
    const dstBom = makeEquipo(4001, 1, 401, 'BOM-01', 'Bomba 10HP', 2, 'Bomba');
    const ordenGen = {
      id_orden_servicio: 10,
      numero_orden: 'OS-GEN-1',
      id_cliente: 50,
      id_equipo: 301,
      id_tipo_servicio: 1,
      id_tecnico_asignado: 10,
      id_estado_actual: 4,
      fecha_inicio_real: new Date(),
      fecha_fin_real: new Date(),
      observaciones_cierre: 'OK',
      estados_orden: { codigo_estado: 'COMPLETADA', nombre_estado: 'Completada', es_estado_final: true },
      clientes: { id_cliente: 50, persona: { razon_social: 'X' } },
      tipos_servicio: { id_tipo_servicio: 1, nombre_tipo: 'Tipo A Generador' },
      equipos: srcGen.equipos,
      ordenes_equipos: [srcGen],
      actividades_ejecutadas: [],
      mediciones_servicio: [
        {
          id_medicion: 1,
          id_parametro_medicion: 50,
          valor_numerico: 1800,
          id_orden_equipo: 3001,
          parametros_medicion: { id_parametro_medicion: 50, id_tipo_equipo: 1 },
        },
        {
          id_medicion: 2,
          id_parametro_medicion: 51,
          valor_numerico: 220,
          id_orden_equipo: 3001,
          parametros_medicion: { id_parametro_medicion: 51, id_tipo_equipo: null },
        },
      ],
      evidencias_fotograficas: [],
      componentes_usados: [],
      ordenes_actividades_plan: [{ id_actividad_catalogo: 99, orden_secuencia: 1 }],
      ordenes_pendientes: [],
    };
    const ordenBom = {
      id_orden_servicio: 20,
      numero_orden: 'OS-BOM-1',
      id_cliente: 50,
      id_equipo: 401,
      id_tipo_servicio: 3,
      id_tecnico_asignado: 10,
      id_estado_actual: 1,
      estados_orden: { codigo_estado: 'ASIGNADA', nombre_estado: 'Asignada', es_estado_final: false },
      clientes: { id_cliente: 50, persona: { razon_social: 'X' } },
      tipos_servicio: { id_tipo_servicio: 3, nombre_tipo: 'Tipo A Bomba' },
      equipos: dstBom.equipos,
      ordenes_equipos: [dstBom],
      _count: {
        actividades_ejecutadas: 0,
        mediciones_servicio: 0,
        evidencias_fotograficas: 0,
        componentes_usados: 0,
        ordenes_actividades_plan: 3,
        ordenes_pendientes: 0,
      },
    };

    const { prisma, deleted } = createMockPrisma({ 10: ordenGen, 20: ordenBom });
    const svc = new TransferenciaOrdenService(prisma);

    const preview = await svc.previsualizarTransferencia(20, 10);
    expect(preview.compatibilidad.hayCruceDeTipos).toBe(true);
    expect(preview.opcionesSugeridas.copiarPlanActividades).toBe(false);
    expect(preview.opcionesSugeridas.soloMedicionesCompatibles).toBe(true);

    const res = await svc.ejecutarTransferencia(
      20,
      { idOrdenOrigen: 10, opciones: preview.opcionesSugeridas },
      1,
    );
    expect(res.estadisticas.medicionesServicio).toBe(1);
    expect(res.estadisticas.medicionesIncompatiblesOmitidas).toBe(1);
    expect(deleted.ordenes_actividades_plan).toBeUndefined();
  });

  it('permite agregar selectivamente un equipo excedente del mismo cliente y bloquea robo entre clientes distintos', async () => {
    const { ordenOrigen, ordenDestino, lotes } = buildScenario9to6(false);
    const { prisma, created } = createMockPrisma({ 78: ordenOrigen, 94: ordenDestino }, lotes);
    const svc = new TransferenciaOrdenService(prisma);

    const preview = await svc.previsualizarTransferencia(94, 78);
    const mapeoCustom = preview.mapeoSugerido.map((m) =>
      m.origen.idOrdenEquipo === 1009
        ? { idOrdenEquipoOrigen: 1009, accion: 'AGREGAR_A_DESTINO' as const, idOrdenEquipoDestino: null }
        : {
            idOrdenEquipoOrigen: m.origen.idOrdenEquipo,
            accion: m.accionSugerida,
            idOrdenEquipoDestino: m.idOrdenEquipoDestinoSugerido,
          },
    );

    const res = await svc.ejecutarTransferencia(
      94,
      { idOrdenOrigen: 78, mapeoEquipos: mapeoCustom },
      1,
    );
    expect(res.estadisticas.equiposMapeados).toBe(6);
    expect(res.estadisticas.equiposAgregados).toBe(1);
    expect(res.estadisticas.equiposDescartados).toBe(2);
    expect(created.ordenes_equipos[0].id_equipo).toBe(109);
    expect(created.ordenes_equipos[0].orden_secuencia).toBe(7);

    // Cliente distinto NO puede usar AGREGAR_A_DESTINO
    ordenDestino.id_cliente = 999;
    await expect(
      svc.ejecutarTransferencia(
        94,
        {
          idOrdenOrigen: 78,
          mapeoEquipos: [{ idOrdenEquipoOrigen: 1009, accion: 'AGREGAR_A_DESTINO' }],
        },
        1,
      ),
    ).rejects.toThrow(/cliente diferente/i);
  });

  it('rechaza colisiones 2→1 y bloquea destinos en estado final', async () => {
    const { ordenOrigen, ordenDestino } = buildScenario9to6(false);
    const { prisma } = createMockPrisma({ 78: ordenOrigen, 94: ordenDestino });
    const svc = new TransferenciaOrdenService(prisma);

    await expect(
      svc.ejecutarTransferencia(
        94,
        {
          idOrdenOrigen: 78,
          mapeoEquipos: [
            { idOrdenEquipoOrigen: 1001, accion: 'MAPEAR_A_DESTINO', idOrdenEquipoDestino: 2001 },
            { idOrdenEquipoOrigen: 1003, accion: 'MAPEAR_A_DESTINO', idOrdenEquipoDestino: 2001 },
          ],
        },
        1,
      ),
    ).rejects.toThrow(/Conflicto de mapeo 1:1/i);

    ordenDestino.estados_orden.es_estado_final = true;
    const prev = await svc.previsualizarTransferencia(94, 78);
    expect(prev.puedeTransferir).toBe(false);
    expect(prev.bloqueos.length).toBeGreaterThan(0);
  });

  it('clona firmas del origen en filas independientes (sin compartir FK) y nunca borra con NULL una firma ya existente en destino', async () => {
    const { ordenOrigen, ordenDestino, lotes } = buildScenario9to6(false);
    ordenOrigen.id_firma_tecnico = 89;
    ordenOrigen.id_firma_cliente = null as any;
    (ordenDestino as any).id_firma_cliente = 777;
    (ordenDestino as any).id_firma_tecnico = null;
    (ordenDestino as any).nombre_quien_recibe = 'Cliente Existente';

    const firmasDb = {
      89: {
        id_firma_digital: 89,
        id_persona: 10,
        tipo_firma: 'TECNICO',
        firma_base64: 'BASE64_TEC_ORIG',
        formato_firma: 'PNG',
        hash_firma: 'HASH_TEC',
        fecha_captura: new Date('2026-11-20T10:00:00Z'),
      },
    };

    const { prisma, created, updated } = createMockPrisma(
      { 78: ordenOrigen, 94: ordenDestino },
      lotes,
      firmasDb,
    );
    const svc = new TransferenciaOrdenService(prisma);

    await svc.ejecutarTransferencia(
      94,
      { idOrdenOrigen: 78, opciones: { incluirFirmas: true } },
      1,
    );

    expect(created.firmas_digitales).toHaveLength(1);
    const firmaClonada = created.firmas_digitales[0];
    expect(firmaClonada.id_firma_digital).not.toBe(89);
    expect(firmaClonada.firma_base64).toBe('BASE64_TEC_ORIG');

    const updateOrden = updated.ordenes_servicio[0];
    expect(updateOrden.data.id_firma_tecnico).toBe(firmaClonada.id_firma_digital);
    expect(updateOrden.data.id_firma_cliente).toBe(777);
    expect(updateOrden.data.nombre_quien_recibe).toBe('Cliente Existente');
  });
});
