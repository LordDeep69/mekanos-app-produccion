/**
 * MEKANOS S.A.S - Motor Universal de Activos EAM
 * 
 * Pruebas Unitarias del Servicio de Proyección B-Tree (EquipoFilterProjectionService)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { EquipoFilterProjectionService } from './equipo-filter-projection.service';
import { PrismaService } from '../../database/prisma.service';
import { UomConversionService } from './uom-conversion.service';

describe('EquipoFilterProjectionService (Proyección B-Tree EAM)', () => {
  let service: EquipoFilterProjectionService;
  let mockPrisma: any;
  let uomService: UomConversionService;

  beforeEach(async () => {
    mockPrisma = {
      equipos_atributos_filtro: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      equipos: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    uomService = new UomConversionService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EquipoFilterProjectionService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UomConversionService, useValue: uomService },
      ],
    }).compile();

    service = module.get<EquipoFilterProjectionService>(EquipoFilterProjectionService);
  });

  it('debe estar definido e inicializado correctamente', () => {
    expect(service).toBeDefined();
  });

  it('debe limpiar proyecciones si el documento no contiene modulos', async () => {
    const proyectados = await service.proyectarFiltros(1, {} as any);
    expect(proyectados).toBe(0);
    expect(mockPrisma.equipos_atributos_filtro.deleteMany).toHaveBeenCalledWith({
      where: { id_equipo: 1 },
    });
    expect(mockPrisma.equipos_atributos_filtro.createMany).not.toHaveBeenCalled();
  });

  it('debe proyectar atributos numéricos y de texto a la tabla de filtro B-Tree', async () => {
    const doc = {
      modulos: {
        motor_combustion: {
          marca_motor: 'CUMMINS',
          potencia_kw_motor: 120,
          tipo_combustible: 'DIESEL',
        },
        alternador_generador: {
          marca_generador: 'STAMFORD',
          potencia_kva: 150,
        },
      },
    };

    const count = await service.proyectarFiltros(10, doc);

    expect(count).toBe(5);
    expect(mockPrisma.equipos_atributos_filtro.deleteMany).toHaveBeenCalledWith({
      where: { id_equipo: 10 },
    });
    expect(mockPrisma.equipos_atributos_filtro.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          id_equipo: 10,
          codigo_atributo: 'marca_motor',
          valor_texto: 'CUMMINS',
          valor_num_base: null,
        }),
        expect.objectContaining({
          id_equipo: 10,
          codigo_atributo: 'potencia_kw_motor',
          valor_texto: '120',
          unidad_base_codigo: 'KW',
        }),
        expect.objectContaining({
          id_equipo: 10,
          codigo_atributo: 'marca_generador',
          valor_texto: 'STAMFORD',
          valor_num_base: null,
        }),
        expect.objectContaining({
          id_equipo: 10,
          codigo_atributo: 'potencia_kva',
          valor_texto: '150',
          unidad_base_codigo: 'KW',
        }),
      ]),
    });
  });

  it('debe ser idempotente y no duplicar atributos si aparecen en varios módulos', async () => {
    const doc = {
      modulos: {
        m1: { marca_motor: 'PERKINS' },
        m2: { marca_motor: 'PERKINS_DUPLICADO' },
      },
    };

    const count = await service.proyectarFiltros(25, doc);
    expect(count).toBe(1);
    expect(mockPrisma.equipos_atributos_filtro.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id_equipo: 25,
          codigo_atributo: 'marca_motor',
          valor_texto: 'PERKINS',
        }),
      ],
    });
  });
});
