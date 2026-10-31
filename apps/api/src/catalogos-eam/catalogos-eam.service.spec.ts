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
        findUnique: jest.fn().mockResolvedValue({
          id_magnitud: 1,
          codigo_magnitud: 'POTENCIA',
          nombre_magnitud: 'Potencia Eléctrica/Mecánica',
        }),
      },
      unidades_medida: {
        findMany: jest.fn().mockResolvedValue([
          { codigo: 'KW', nombre: 'Kilovatio', es_unidad_base: true },
        ]),
        findUnique: jest.fn().mockResolvedValue({
          codigo: 'KW',
          nombre: 'Kilovatio',
          es_unidad_base: true,
        }),
      },
      atributos_tecnicos: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id_atributo: 101, ...data })),
      },
      tipos_equipo: {
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

  it('debe convertir unidades de medida usando el motor UoM', () => {
    const res = service.convertirUom({
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
});
