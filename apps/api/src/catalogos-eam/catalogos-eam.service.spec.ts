/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * Pruebas Unitarias de CatalogosEamService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CatalogosEamService } from './catalogos-eam.service';
import { PrismaService } from '../database/prisma.service';
import { UomConversionService } from '../equipos/services/uom-conversion.service';

describe('CatalogosEamService (Metamodelo EAM)', () => {
  let service: CatalogosEamService;
  let mockPrisma: any;
  let uomService: UomConversionService;

  beforeEach(async () => {
    mockPrisma = {
      catalogo_magnitudes: {
        findMany: jest.fn().mockResolvedValue([
          { codigo_magnitud: 'POTENCIA', nombre_magnitud: 'Potencia Eléctrica/Mecánica' },
        ]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.codigo_magnitud === 'POTENCIA' || where.id_magnitud === 1) {
            return Promise.resolve({
              id_magnitud: 1,
              codigo_magnitud: 'POTENCIA',
              nombre_magnitud: 'Potencia Eléctrica/Mecánica',
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id_magnitud: 12, ...data })),
      },
      unidades_medida: {
        findMany: jest.fn().mockResolvedValue([
          { codigo: 'KW', nombre: 'Kilovatio', es_unidad_base: true },
        ]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.codigo === 'KW') {
            return Promise.resolve({
              codigo: 'KW',
              nombre: 'Kilovatio',
              es_unidad_base: true,
            });
          }
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          const cod = (where.codigo?.equals || where.codigo || '').toUpperCase();
          if (cod === 'KW') {
            return Promise.resolve({
              codigo: 'KW',
              nombre: 'Kilovatio',
              simbolo: 'kW',
              id_magnitud: 1,
              tipo_magnitud: 'POTENCIA',
              factor_a: 1,
              factor_b: 0,
              es_unidad_base: true,
            });
          }
          if (cod === 'HP') {
            return Promise.resolve({
              codigo: 'HP',
              nombre: 'Caballos de Fuerza',
              simbolo: 'HP',
              id_magnitud: 1,
              tipo_magnitud: 'POTENCIA',
              factor_a: 0.7457,
              factor_b: 0,
              es_unidad_base: false,
            });
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve(data)),
      },
      atributos_tecnicos: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id_atributo: 101, ...data })),
      },
      modulos_tecnicos: {
        findUnique: jest.fn().mockResolvedValue({
          id_modulo: 1,
          codigo_modulo: 'motor_combustion',
          nombre_modulo: 'Motor de Combustión',
        }),
      },
      modulo_atributos: {
        findUnique: jest.fn().mockResolvedValue({
          id_modulo: 1,
          id_atributo: 5,
          obligatorio: false,
          es_filtrable: true,
        }),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ id_modulo: 1, id_atributo: 5, ...data }),
        ),
      },
      equipos: {
        groupBy: jest.fn().mockResolvedValue([
          { id_tipo_equipo: 1, _count: { id_equipo: 86 } },
          { id_tipo_equipo: 3, _count: { id_equipo: 173 } },
          { id_tipo_equipo: 2, _count: { id_equipo: 21 } },
          { id_tipo_equipo: 5, _count: { id_equipo: 182 } },
        ]),
      },
      tipo_equipo_modulos: {
        upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve(create)),
      },
      tipo_equipo_planes: {
        upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve({ id_plan: 99, ...create })),
      },
      tipos_equipo: {
        findMany: jest.fn().mockResolvedValue([
          {
            id_tipo_equipo: 1,
            codigo_tipo: 'GENERADOR',
            nombre_tipo: 'Generador Eléctrico',
            orden: 1,
            tipo_equipo_modulos: [],
            tipo_equipo_planes: [],
            _count: { equipos: 86, modelos_equipo: 2 },
          },
          {
            id_tipo_equipo: 3,
            codigo_tipo: 'GEN',
            nombre_tipo: 'Planta Eléctrica',
            orden: 2,
            tipo_equipo_modulos: [],
            tipo_equipo_planes: [],
            _count: { equipos: 174, modelos_equipo: 0 },
          },
          {
            id_tipo_equipo: 2,
            codigo_tipo: 'BOMBA',
            nombre_tipo: 'Bomba Hidráulica',
            orden: 3,
            tipo_equipo_modulos: [],
            tipo_equipo_planes: [],
            _count: { equipos: 22, modelos_equipo: 2 },
          },
          {
            id_tipo_equipo: 5,
            codigo_tipo: 'BOM',
            nombre_tipo: 'Sistema de Bombeo',
            orden: 4,
            tipo_equipo_modulos: [],
            tipo_equipo_planes: [],
            _count: { equipos: 182, modelos_equipo: 0 },
          },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          id_tipo_equipo: 1,
          codigo_tipo: 'GEN',
          nombre_tipo: 'GENERADOR ELÉCTRICO',
          categoria: 'GENERACION',
          requiere_horometro: true,
          tipo_equipo_modulos: [
            {
              id_modulo: 1,
              obligatorio: true,
              orden_visual: 1,
              modulo: {
                id_modulo: 1,
                codigo_modulo: 'motor_combustion',
                nombre_modulo: 'Motor de Combustión',
                icono: 'engine',
                modulo_atributos: [
                  {
                    grupo_visual: 'Potencia y Rendimiento',
                    orden_visual: 1,
                    obligatorio: true,
                    es_kpi: true,
                    es_filtrable: true,
                    visible_en_pdf: true,
                    valor_defecto: null,
                    atributo: {
                      id_atributo: 1,
                      codigo_atributo: 'potencia_hp',
                      nombre_atributo: 'Potencia Mecánica HP',
                      tipo_control: 'NUMERICO',
                      rol_semantico: 'METRICA_PRIMARIA',
                      unidad_defecto_codigo: 'HP',
                      magnitud: {
                        codigo_magnitud: 'POTENCIA',
                        unidades_medida: [
                          { codigo: 'KW', nombre: 'Kilovatio', simbolo: 'kW', es_unidad_base: true },
                          { codigo: 'HP', nombre: 'Caballo de Fuerza', simbolo: 'HP', es_unidad_base: false },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          ],
          tipo_equipo_planes: [
            {
              id_plan: 1,
              id_tipo_servicio: 1,
              nombre_plan: 'Plan A Mensual',
              frecuencia_dias: 30,
              frecuencia_uso: 250,
              criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
              tipo_servicio: { nombre_tipo: 'Mantenimiento Preventivo A' },
            },
          ],
        }),
      },
    };

    uomService = new UomConversionService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogosEamService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UomConversionService, useValue: uomService },
      ],
    }).compile();

    service = module.get<CatalogosEamService>(CatalogosEamService);
  });

  it('debe estar definido e inicializado correctamente', () => {
    expect(service).toBeDefined();
  });

  it('debe listar magnitudes físicas con sus unidades', async () => {
    const magnitudes = await service.getMagnitudes();
    expect(magnitudes).toBeDefined();
    expect(magnitudes.length).toBe(1);
    expect(mockPrisma.catalogo_magnitudes.findMany).toHaveBeenCalled();
  });

  it('debe convertir unidades de medida usando el motor UoM', async () => {
    const res = await service.convertirUom({
      valor: 100,
      unidadOrigen: 'KW',
      unidadDestino: 'HP',
    });
    expect(res).toBeDefined();
    expect(res.valorDestino).toBeCloseTo(134.1, 1);
    expect(res.unidadDestino).toBe('HP');
  });

  it('debe crear un nuevo atributo técnico si no existe conflicto de código', async () => {
    const created = await service.createAtributo({
      codigo_atributo: 'presion_aceite_psi',
      nombre_atributo: 'Presión de Aceite',
      tipo_control: 'NUMERICO',
      codigo_magnitud: 'PRESION',
      unidad_defecto_codigo: 'PSI',
    });
    expect(created.id_atributo).toBe(101);
    expect(created.codigo_atributo).toBe('presion_aceite_psi');
  });

  it('debe construir el esquema dinámico de arquetipo para renderizado de formularios', async () => {
    const esquema = await service.getArquetipoEsquema(1);
    expect(esquema).toBeDefined();
    expect(esquema.arquetipo.codigo_tipo).toBe('GEN');
    expect(esquema.modulos.length).toBe(1);
    expect(esquema.modulos[0].codigo_modulo).toBe('motor_combustion');
    expect(esquema.modulos[0].grupos.length).toBe(1);
    expect(esquema.modulos[0].grupos[0].nombre).toBe('Potencia y Rendimiento');
    expect(esquema.modulos[0].grupos[0].atributos[0].codigo_atributo).toBe('potencia_hp');
    expect(esquema.modulos[0].grupos[0].atributos[0].unidades_disponibles.length).toBe(2);
    expect(esquema.planes_mantenimiento.length).toBe(1);
  });

  it('debe deduplicar pares canónicos en getArquetipos sumando equipos activos y totales (1↔3 y 2↔5)', async () => {
    const arquetipos = await service.getArquetipos();
    expect(arquetipos.length).toBe(2);

    const gen = arquetipos.find((a) => a.id_tipo_equipo === 1);
    expect(gen).toBeDefined();
    expect(gen._count.equipos).toBe(260); // 86 + 174
    expect(gen.equipos_activos).toBe(259); // 86 + 173
    expect(gen.ids_sincronizados).toEqual([1, 3]);

    const bom = arquetipos.find((a) => a.id_tipo_equipo === 2);
    expect(bom).toBeDefined();
    expect(bom._count.equipos).toBe(204); // 22 + 182
    expect(bom.equipos_activos).toBe(203); // 21 + 182
    expect(bom.ids_sincronizados).toEqual([2, 5]);
  });

  it('debe sincronizar en espejo ambos IDs del par canónico al vincular módulos o crear planes preventivos', async () => {
    await service.vincularModuloArquetipo(1, 2, true);
    expect(mockPrisma.tipo_equipo_modulos.upsert).toHaveBeenCalledTimes(2);

    await service.createPlanArquetipo(1, {
      id_tipo_servicio: 3,
      nombre_plan: 'Plan Preventivo Tipo A - Generador',
      frecuencia_dias: 90,
      frecuencia_uso: 250,
    });
    expect(mockPrisma.tipo_equipo_planes.upsert).toHaveBeenCalledTimes(2);
  });

  it('debe actualizar en caliente las banderas de un atributo dentro de un módulo técnico', async () => {
    const updated = await service.updateAtributoModulo('motor_combustion', 5, {
      obligatorio: true,
      es_kpi: true,
    });
    expect(updated.obligatorio).toBe(true);
    expect(updated.es_kpi).toBe(true);
    expect(mockPrisma.modulo_atributos.update).toHaveBeenCalledTimes(1);
  });

  it('debe permitir crear nuevas magnitudes físicas y unidades de medida', async () => {
    const mag = await service.createMagnitud({
      codigo_magnitud: 'VISCOSIDAD',
      nombre_magnitud: 'Viscosidad Cinemática',
      unidad_base_codigo: 'CST',
    });
    expect(mag.codigo_magnitud).toBe('VISCOSIDAD');

    const uni = await service.createUnidad({
      codigo: 'CST',
      nombre: 'Centistokes',
      simbolo: 'cSt',
      id_magnitud: 1,
      factor_a: 1,
      factor_b: 0,
      es_unidad_base: true,
    });
    expect(uni.codigo).toBe('CST');
  });
});
