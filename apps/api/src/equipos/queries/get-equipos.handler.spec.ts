import { Test, TestingModule } from '@nestjs/testing';
import { GetEquiposHandler } from './get-equipos.handler';
import { GetEquiposQuery } from './get-equipos.query';

describe('GetEquiposHandler', () => {
  let handler: GetEquiposHandler;
  let repositoryMock: {
    findAll: jest.Mock;
  };

  beforeEach(async () => {
    repositoryMock = {
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetEquiposHandler,
        {
          provide: 'IEquipoRepository',
          useValue: repositoryMock,
        },
      ],
    }).compile();

    handler = module.get<GetEquiposHandler>(GetEquiposHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const equiposMock = [
    { id_equipo: 1, codigo_equipo: 'ASC-2026-0001', nombre_equipo: 'Ascensor A' },
    { id_equipo: 2, codigo_equipo: 'HVAC-2026-0002', nombre_equipo: 'Chiller B' },
  ];

  describe('execute', () => {
    it('debe retornar lista paginada de equipos', async () => {
      repositoryMock.findAll.mockResolvedValue({ items: equiposMock, total: 2 });

      const result = await handler.execute(
        new GetEquiposQuery(undefined, undefined, undefined, undefined, true, 1, 10),
      );

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('debe aplicar valores por defecto de paginación', async () => {
      repositoryMock.findAll.mockResolvedValue({ items: equiposMock, total: 2 });

      const result = await handler.execute(new GetEquiposQuery());

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(repositoryMock.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ activo: true, skip: 0, take: 10 }),
      );
    });

    it('debe calcular skip correctamente y propagar filtros snake_case y asesor', async () => {
      repositoryMock.findAll.mockResolvedValue({ items: equiposMock, total: 25 });

      const result = await handler.execute(
        new GetEquiposQuery(1, 2, 'OPERATIVO', 3, false, 3, 10, 77),
      );

      expect(result.totalPages).toBe(3);
      expect(repositoryMock.findAll).toHaveBeenCalledWith({
        id_cliente: 1,
        id_sede: 2,
        estado_equipo: 'OPERATIVO',
        id_tipo_equipo: 3,
        activo: false,
        skip: 20,
        take: 10,
        idAsesorAsignado: 77,
      });
    });

    it('debe retornar lista vacía si no hay equipos', async () => {
      repositoryMock.findAll.mockResolvedValue({ items: [], total: 0 });

      const result = await handler.execute(new GetEquiposQuery());

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('debe manejar límites grandes de paginación', async () => {
      repositoryMock.findAll.mockResolvedValue({ items: equiposMock, total: 100 });

      const result = await handler.execute(
        new GetEquiposQuery(undefined, undefined, undefined, undefined, undefined, 1, 100),
      );

      expect(result.limit).toBe(100);
      expect(result.totalPages).toBe(1);
    });

    it('debe propagar errores del repositorio', async () => {
      repositoryMock.findAll.mockRejectedValue(new Error('Error de base de datos'));

      await expect(handler.execute(new GetEquiposQuery())).rejects.toThrow(
        'Error de base de datos',
      );
    });
  });
});
