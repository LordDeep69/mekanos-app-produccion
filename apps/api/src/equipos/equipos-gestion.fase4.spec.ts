import { PrismaService } from '@mekanos/database';
import { EquiposGestionService } from './equipos-gestion.service';
import { EquipoFilterProjectionService } from './services/equipo-filter-projection.service';
import { UomConversionService } from './services/uom-conversion.service';

describe('Fase 4 — EquiposGestionService (Filtros B-Tree SI, Wizard Dual-Write, Herencia Kit BOM OEM y Ficha 360°)', () => {
  let service: EquiposGestionService;
  let uomService: UomConversionService;
  let projectionService: EquipoFilterProjectionService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      unidades_medida: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      equipos: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn().mockResolvedValue({ id_equipo: 500 }),
      },
      tipos_equipo: {
        findMany: jest.fn().mockResolvedValue([
          { id_tipo_equipo: 1, codigo_tipo: 'GENERADOR', nombre_tipo: 'Generador Eléctrico' },
          { id_tipo_equipo: 2, codigo_tipo: 'BOMBA', nombre_tipo: 'Bomba Hidráulica' },
          { id_tipo_equipo: 11, codigo_tipo: 'COMPRESOR', nombre_tipo: 'Compresor de Aire' },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id_tipo_equipo: 11,
          codigo_tipo: 'COMPRESOR',
          nombre_tipo: 'Compresor de Aire',
        }),
      },
      clientes: {
        findUnique: jest.fn().mockResolvedValue({
          id_cliente: 10,
          id_persona: 1,
          persona: { nombre_comercial: 'HOTEL CARIBE' },
        }),
      },
      personas: {
        findUnique: jest.fn().mockResolvedValue({
          id_persona: 1,
          razon_social: 'HOTEL CARIBE S.A.S.',
          tipo_persona: 'JURIDICA',
        }),
      },
      sedes_cliente: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      equipos_motor: {
        create: jest.fn().mockResolvedValue({ id_equipo: 500 }),
        upsert: jest.fn().mockResolvedValue({ id_equipo: 500 }),
      },
      equipos_generador: {
        create: jest.fn().mockResolvedValue({ id_equipo: 500 }),
        upsert: jest.fn().mockResolvedValue({ id_equipo: 500 }),
      },
      equipos_bomba: {
        create: jest.fn().mockResolvedValue({ id_equipo: 500 }),
        upsert: jest.fn().mockResolvedValue({ id_equipo: 500 }),
      },
      equipos_atributos_filtro: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
      modelos_equipo_bom: {
        findMany: jest.fn().mockResolvedValue([
          {
            id_modelo_bom: 1,
            id_modelo_equipo: 3,
            id_componente: 101,
            cantidad_sugerida: 1,
            rol_bom: 'FILTRO_ACEITE_TITULAR',
            notas: 'Filtro aceite OEM',
            catalogo_componentes: {
              id_componente: 101,
              referencia_fabricante: 'LF16015',
              descripcion_corta: 'Filtro de Aceite Fleetguard',
            },
          },
          {
            id_modelo_bom: 2,
            id_modelo_equipo: 3,
            id_componente: 102,
            cantidad_sugerida: 2,
            rol_bom: 'FILTRO_COMBUSTIBLE_TITULAR',
            notas: 'Filtro combustible primario',
            catalogo_componentes: {
              id_componente: 102,
              referencia_fabricante: 'FF5421',
              descripcion_corta: 'Filtro Combustible',
            },
          },
        ]),
      },
      componentes_equipo: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest.fn(async (cb: any) => cb(prismaMock)),
    };

    uomService = new UomConversionService(prismaMock as unknown as PrismaService);
    projectionService = new EquipoFilterProjectionService(
      prismaMock as unknown as PrismaService,
      uomService,
    );
    service = new EquiposGestionService(
      prismaMock as unknown as PrismaService,
      undefined,
      projectionService,
      uomService,
    );
  });

  describe('Frente 4.1 — Filtros Técnicos B-Tree con Conversión de Unidades SI', () => {
    it('convierte rango numérico en KVA (100 a 250 KVA) a unidad base SI (80 a 200 KW) al consultar equipos_atributos_filtro', async () => {
      await service.listarEquiposCompletos({
        page: 1,
        limit: 12,
        filtroAtributoCodigo: 'potencia_kva',
        filtroAtributoValorMin: 100,
        filtroAtributoValorMax: 250,
        filtroAtributoUnidad: 'KVA',
      });

      expect(prismaMock.equipos.findMany).toHaveBeenCalled();
      const callArg = prismaMock.equipos.findMany.mock.calls[0][0];
      const btreeFilter = callArg.where.equipos_atributos_filtro;

      expect(btreeFilter).toBeDefined();
      expect(btreeFilter.some.codigo_atributo).toBe('potencia_kva');
      expect(btreeFilter.some.valor_num_base.gte).toBeCloseTo(80, 3);
      expect(btreeFilter.some.valor_num_base.lte).toBeCloseTo(200, 3);
    });

    it('convierte rango de caudal en GPM (50 a 100 GPM) a unidad base SI (M3H) al filtrar bombas', async () => {
      await service.listarEquiposCompletos({
        page: 1,
        limit: 12,
        tipo: 'BOMBA',
        filtroAtributoCodigo: 'caudal_maximo_m3h',
        filtroAtributoValorMin: 50,
        filtroAtributoValorMax: 100,
        filtroAtributoUnidad: 'GPM',
      });

      const callArg = prismaMock.equipos.findMany.mock.calls[0][0];
      const btreeFilter = callArg.where.equipos_atributos_filtro;

      expect(btreeFilter).toBeDefined();
      expect(btreeFilter.some.valor_num_base.gte).toBeCloseTo(
        50 * 0.2271247,
        3,
      );
      expect(btreeFilter.some.valor_num_base.lte).toBeCloseTo(
        100 * 0.2271247,
        3,
      );
    });

    it('filtra atributos booleanos (tiene_cabina_insonorizada = true) en equipos_atributos_filtro', async () => {
      await service.listarEquiposCompletos({
        page: 1,
        limit: 12,
        filtroAtributoCodigo: 'tiene_cabina_insonorizada',
        filtroAtributoBooleano: 'true',
      });

      const callArg = prismaMock.equipos.findMany.mock.calls[0][0];
      const btreeFilter = callArg.where.equipos_atributos_filtro;

      expect(btreeFilter.some).toEqual({
        codigo_atributo: 'tiene_cabina_insonorizada',
        valor_texto: { equals: 'true', mode: 'insensitive' },
      });
    });
  });

  describe('Frente 4.2 — Creación Polimórfica con Dual-Write, Proyección B-Tree y Herencia Kit BOM OEM', () => {
    it('crea un equipo desde plantilla OEM haciendo dual-write a satélites, proyectando B-Tree y vinculando el Kit BOM WMS', async () => {
      prismaMock.equipos.create.mockResolvedValue({
        id_equipo: 500,
        codigo_equipo: 'GEN-HOTE-001',
        nombre_equipo: 'Cummins C100D5 Principal',
        id_cliente: 10,
        id_tipo_equipo: 1,
      });

      const spyReconstruir = jest.spyOn(projectionService, 'reconstruirJsonYProyectar');

      const result = await service.crearEquipoCompleto(
        {
          tipo: 'GENERADOR',
          id_modelo_equipo: 3,
          vincular_kit_bom: true,
          datosEquipo: {
            codigo_equipo: 'GEN-HOTE-001',
            id_cliente: 10,
            id_tipo_equipo: 1,
            ubicacion_texto: 'Subestación Principal Sótano 1',
            estado_equipo: 'OPERATIVO' as any,
            criticidad: 'ALTA' as any,
          },
          especificaciones: {
            _version: 1,
            modulos: {
              motor_combustion: {
                marca_motor: 'CUMMINS',
                modelo_motor: '6BT5.9-G2',
                potencia_motor_hp: 150,
                capacidad_aceite_l: 16.4,
                tipo_combustible: 'DIESEL',
              },
              alternador_generador: {
                marca_generador: 'STAMFORD',
                modelo_generador: 'UCI274C',
                potencia_kva: 100,
                potencia_kw: 80,
                voltaje_salida_vac: '220/127V',
              },
            },
            origen_atributos: {
              marca_motor: 'MODELO',
              potencia_kva: 'MODELO',
            },
            unidades_personalizadas: {
              potencia_kva: 'KVA',
            },
          },
        },
        1,
      );

      expect(result.data.id_equipo).toBe(500);
      // 1. Verifica Dual-Write hacia tablas satélite (equipos_motor y equipos_generador)
      expect(prismaMock.equipos_motor.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_equipo: 500,
            marca_motor: 'CUMMINS',
            potencia_hp: 150,
            capacidad_aceite_litros: 16.4,
          }),
        }),
      );
      expect(prismaMock.equipos_generador.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_equipo: 500,
            marca_generador: 'STAMFORD',
            potencia_kva: 100,
            potencia_kw: 80,
          }),
        }),
      );

      // 2. Verifica Proyección B-Tree y persistencia de especificaciones JSONB
      expect(spyReconstruir).toHaveBeenCalledWith(
        500,
        undefined,
        expect.objectContaining({
          modulos: expect.objectContaining({
            motor_combustion: expect.objectContaining({ marca_motor: 'CUMMINS' }),
          }),
        }),
      );

      // 3. Verifica Herencia Automática del Kit de Repuestos (BOM) desde el Modelo OEM
      expect(prismaMock.componentes_equipo.create).toHaveBeenCalledTimes(2);
      expect(prismaMock.componentes_equipo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_equipo: 500,
            id_componente: 101,
            unidades_por_cambio: 1,
          }),
        }),
      );
      expect(prismaMock.componentes_equipo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id_equipo: 500,
            id_componente: 102,
            unidades_por_cambio: 2,
          }),
        }),
      );
    });
  });

  describe('Frente 4.3 — Consolidación de Ficha Polimórfica 360° (Compresor ID 214 y Arquetipos Universales)', () => {
    it('expone especificaciones JSONB y aplana datos_especificos para activos sin tabla satélite dedicada (ej. Compresor ID 214)', async () => {
      prismaMock.equipos.findUnique.mockResolvedValue({
        id_equipo: 214,
        codigo_equipo: 'BOM-TAKU-HL3IAD',
        nombre_equipo: 'Compresor Industrial Ingersoll Rand',
        id_tipo_equipo: 11,
        id_modelo_equipo: 4,
        ubicacion_texto: 'Planta Compresores',
        estado_equipo: 'OPERATIVO',
        criticidad: 'ALTA',
        activo: true,
        especificaciones: {
          _version: 1,
          modulos: {
            compresor_industrial: {
              marca_compresor: 'INGERSOLL RAND',
              modelo_compresor: '2475N7.5-P',
              presion_maxima_psi: 175,
              caudal_aire_cfm: 24,
              capacidad_tanque_galones: 80,
              tipo_compresor: 'PISTON_RECIPROCANTE',
            },
            motor_electrico: {
              marca_motor_electrico: 'WEG',
              potencia_hp_electrico: 7.5,
              voltaje_operacion_vac: '220',
              velocidad_rpm: 1750,
            },
          },
          origen_atributos: {
            marca_compresor: 'MODELO',
            presion_maxima_psi: 'MODELO',
          },
        },
        clientes: {
          id_cliente: 5,
          codigo_cliente: 'CLI-05',
          persona: { nombre_comercial: 'TAKUMI' },
        },
        sedes_cliente: null,
        tipos_equipo: {
          id_tipo_equipo: 11,
          codigo_tipo: 'COMPRESOR',
          nombre_tipo: 'COMPRESOR DE AIRE',
        },
        modelos_equipo: {
          id_modelo_equipo: 4,
          marca: 'INGERSOLL RAND',
          modelo: '2475N7.5-P',
          nombre_comercial: 'Compresor Pistón 7.5 HP 80 Gal',
        },
        equipos_motor: null,
        equipos_generador: null,
        equipos_bomba: null,
        lecturas_horometro: [],
        historial_estados_equipo: [],
      });

      const detalle = await service.obtenerEquipoCompleto(214);

      expect(detalle.tipo).toBe('COMPRESOR');
      expect(detalle.modelo_oem).toEqual({
        id_modelo_equipo: 4,
        marca: 'INGERSOLL RAND',
        modelo: '2475N7.5-P',
        nombre_comercial: 'Compresor Pistón 7.5 HP 80 Gal',
      });
      expect(detalle.especificaciones.modulos.compresor_industrial.presion_maxima_psi).toBe(175);
      expect(detalle.datos_especificos.marca_compresor).toBe('INGERSOLL RAND');
      expect(detalle.datos_especificos.presion_maxima_psi).toBe(175);
      expect(detalle.datos_especificos.caudal_aire_cfm).toBe(24);
      expect(detalle.datos_especificos.potencia_hp_electrico).toBe(7.5);
    });
  });
});
