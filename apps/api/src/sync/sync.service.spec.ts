import { SyncService } from './sync.service';

describe('SyncService (Gate F2)', () => {
  const buildBaseOrderRecord = () => ({
    id_orden_servicio: 101,
    numero_orden: 'OS-202611-0101',
    id_tecnico_asignado: 7,
    fecha_modificacion: new Date('2026-11-16T12:00:00.000Z'),
    fecha_programada: new Date('2026-11-16T14:00:00.000Z'),
    fecha_inicio_real: new Date('2026-11-16T18:30:00.000Z'),
    fecha_fin_real: new Date('2026-11-16T20:45:00.000Z'),
    id_estado_actual: 2,
    estados_orden: {
      codigo_estado: 'PROGRAMADA',
      nombre_estado: 'Programada',
      es_estado_final: false,
    },
    edicion_tecnico_habilitada: false,
    prioridad: 'NORMAL',
    id_cliente: 15,
    clientes: {
      nombre_sede: 'Torre Empresarial',
      persona: { nombre_comercial: 'Grupo Alfa' },
    },
    id_sede: 20,
    sedes_cliente: { nombre_sede: 'Sede Centro', direccion_sede: 'Av 1 #2-3' },
    id_equipo: 40,
    equipos: {
      id_equipo: 40,
      codigo_equipo: 'ASC-01',
      nombre_equipo: 'Ascensor Principal',
      ubicacion_texto: 'Lobby',
      lectura_uso_actual: 5200,
      horas_actuales: 120,
      tipos_equipo: {
        codigo_tipo: 'ASCENSOR',
        unidad_uso: 'CICLOS',
        etiqueta_contador: 'Ciclos',
        requiere_horometro: true,
      },
      modelos_equipo: { plantilla_parametros_config: { v_min: 200 } },
      config_parametros: { v_max: 240 },
    },
    id_tipo_servicio: 5,
    tipos_servicio: { codigo_tipo: 'PREV', nombre_tipo: 'Preventivo' },
    ordenes_actividades_plan: [],
    ordenes_equipos: [],
    detalle_servicios_orden: [],
    informes: [],
    _count: { actividades_ejecutadas: 0, mediciones_servicio: 0, evidencias_fotograficas: 0 },
  });

  const buildSistemasCatalogo = () => [
    {
      id_sistema: 1,
      codigo_sistema: 'CABINA',
      nombre_sistema: 'CABINA Y PUERTAS',
      descripcion: 'Sistema de cabina',
      aplica_a: ['ASCENSOR'],
      orden_visualizacion: 1,
      id_modulo: 10,
    },
    {
      id_sistema: 2,
      codigo_sistema: 'IMPULSOR',
      nombre_sistema: 'IMPULSOR HIDRAULICO',
      descripcion: 'Solo bombas',
      aplica_a: ['BOMBA'],
      orden_visualizacion: 2,
      id_modulo: 11,
    },
    {
      id_sistema: 3,
      codigo_sistema: 'SEGURIDAD',
      nombre_sistema: 'SEGURIDAD',
      descripcion: 'Universal',
      aplica_a: ['TODOS'],
      orden_visualizacion: 3,
      id_modulo: 12,
    },
  ];

  const buildActividadesCatalogo = () => [
    {
      id_actividad_catalogo: 500,
      codigo_actividad: 'ASC-CAB-01',
      descripcion_actividad: 'Verificar fotocelda de puerta',
      tipo_actividad: 'INSPECCION',
      orden_ejecucion: 1,
      es_obligatoria: true,
      tiempo_estimado_minutos: 10,
      instrucciones: null,
      precauciones: null,
      id_parametro_medicion: null,
      id_tipo_servicio: 5,
      catalogo_sistemas: { nombre_sistema: 'CABINA Y PUERTAS' },
      naturaleza_personalizada: null,
      tipo_control_input: 'ESCALA_ESTADO',
      config_input_json: null,
      rol_semantico: null,
    },
  ];

  it('downloadForTecnico (FULL) usa IANA timezone dinámico, prioriza lectura_uso_actual e inyecta _sistemas_disponibles por arquetipo', async () => {
    const orden = buildBaseOrderRecord();
    const mockPrisma: any = {
      ordenes_servicio: {
        findMany: jest.fn().mockResolvedValue([orden]),
      },
      documentos_generados: { findMany: jest.fn().mockResolvedValue([]) },
      actividades_ejecutadas: { groupBy: jest.fn().mockResolvedValue([]) },
      mediciones_servicio: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      evidencias_fotograficas: { groupBy: jest.fn().mockResolvedValue([]) },
      catalogo_sistemas: { findMany: jest.fn().mockResolvedValue(buildSistemasCatalogo()) },
      parametros_medicion: { findMany: jest.fn().mockResolvedValue([]) },
      catalogo_actividades: { findMany: jest.fn().mockResolvedValue(buildActividadesCatalogo()) },
      estados_orden: { findMany: jest.fn().mockResolvedValue([]) },
      tipos_servicio: {
        findMany: jest.fn().mockResolvedValue([
          { id_tipo_servicio: 5, codigo_tipo: 'PREV', nombre_tipo: 'Preventivo', descripcion: null },
        ]),
      },
      catalogo_pendientes: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const mockConfigOrgService = {
      getContext: jest.fn().mockResolvedValue({ zona_horaria: 'America/Mexico_City' }),
    };

    const service = new SyncService(mockPrisma, mockConfigOrgService as any);
    const res = await service.downloadForTecnico(7, undefined, true);

    expect(res.syncType).toBe('FULL');
    expect(res.ordenes).toHaveLength(1);
    // 18:30Z en America/Mexico_City (UTC-6 estándar en noviembre) = 12:30 (NO 13:30 de -5h hardcoded)
    expect(res.ordenes[0].horaEntrada).toBe('12:30');
    expect(res.ordenes[0].horaSalida).toBe('14:45');

    const configParams = res.ordenes[0].configParametros as any;
    expect(configParams._metrologia.lecturaActual).toBe(5200);
    expect(configParams._metrologia.unidadUso).toBe('CICLOS');
    expect(configParams._sistemas_disponibles.map((s: any) => s.codigoSistema)).toEqual([
      'CABINA',
      'SEGURIDAD',
    ]);
    expect(res.catalogoSistemas).toHaveLength(3);
    expect(res.actividadesCatalogo[0]).toMatchObject({
      idActividadCatalogo: 500,
      sistema: 'CABINA Y PUERTAS',
    });
  });

  it('downloadForTecnico (DELTA sin cambios) conserva catálogos unificados de actividades, tipos de servicio y sistemas', async () => {
    const mockPrisma: any = {
      ordenes_servicio: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([]) // ordenesModificadas
        .mockResolvedValueOnce([{ id_orden_servicio: 999 }]), // tombstones
      catalogo_pendientes: { findMany: jest.fn().mockResolvedValue([]) },
      catalogo_actividades: { findMany: jest.fn().mockResolvedValue(buildActividadesCatalogo()) },
      tipos_servicio: {
        findMany: jest.fn().mockResolvedValue([
          { id_tipo_servicio: 5, codigo_tipo: 'PREV', nombre_tipo: 'Preventivo', descripcion: null },
        ]),
      },
      catalogo_sistemas: { findMany: jest.fn().mockResolvedValue(buildSistemasCatalogo()) },
    };

    const service = new SyncService(mockPrisma);
    const res = await service.downloadForTecnico(7, new Date('2026-11-16T00:00:00.000Z'), false);

    expect(res.syncType).toBe('DELTA');
    expect(res.ordenesEliminadas).toEqual([999]);
    expect(res.actividadesCatalogo).toHaveLength(1);
    expect(res.actividadesCatalogo[0].sistema).toBe('CABINA Y PUERTAS');
    expect(res.tiposServicio).toHaveLength(1);
    expect(res.catalogoSistemas).toHaveLength(3);
  });

  it('getOrdenCompleta formatea horarios en IANA timezone configurada y adjunta _sistemas_disponibles', async () => {
    const orden = buildBaseOrderRecord();
    const mockPrisma: any = {
      ordenes_servicio: { findUnique: jest.fn().mockResolvedValue(orden) },
      actividades_ejecutadas: { groupBy: jest.fn().mockResolvedValue([]) },
      mediciones_servicio: { findMany: jest.fn().mockResolvedValue([]) },
      evidencias_fotograficas: { count: jest.fn().mockResolvedValue(0) },
      documentos_generados: { findFirst: jest.fn().mockResolvedValue(null) },
      catalogo_sistemas: { findMany: jest.fn().mockResolvedValue(buildSistemasCatalogo()) },
    };
    const mockConfigOrgService = {
      getContext: jest.fn().mockResolvedValue({ zona_horaria: 'Europe/Madrid' }),
    };

    const service = new SyncService(mockPrisma, mockConfigOrgService as any);
    const res = await service.getOrdenCompleta(101, {
      id: 1,
      idEmpleado: 7,
      esAdmin: false,
    });

    // 18:30Z en Europe/Madrid (UTC+1 en noviembre) = 19:30
    expect(res.horaEntrada).toBe('19:30');
    expect(res.horaSalida).toBe('21:45');
    expect(res.configParametros._metrologia.lecturaActual).toBe(5200);
    expect(res.configParametros._sistemas_disponibles.map((s: any) => s.codigoSistema)).toEqual([
      'CABINA',
      'SEGURIDAD',
    ]);
  });
});
