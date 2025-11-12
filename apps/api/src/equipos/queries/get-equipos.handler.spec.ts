import { Test, TestingModule } from '@nestjs/testing';
import { GetEquiposHandler } from './get-equipos.handler';
import { GetEquiposQuery } from './get-equipos.query';
import { IEquipoRepository, EquipoEntity, EstadoEquipoEnum } from '@mekanos/core';

describe('GetEquiposHandler', () => {
  let handler: GetEquiposHandler;
  let repositoryMock: jest.Mocked<IEquipoRepository>;

  beforeEach(async () => {
    repositoryMock = {
      save: jest.fn(),
      findById: jest.fn(),
      findByCodigo: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      existsByCodigo: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IEquipoRepository>;

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

  describe('execute', () => {
    const equiposMock = [
      EquipoEntity.create({
        codigo: 'GEN-2024-0001',
        marca: 'Cummins',
        modelo: 'C150',
        clienteId: 1,
        tipoEquipoId: 1,
      }),
      EquipoEntity.create({
        codigo: 'GEN-2024-0002',
        marca: 'Perkins',
        modelo: 'P200',
        clienteId: 1,
        tipoEquipoId: 1,
      }),
    ];

    it('debe retornar lista de equipos con paginación', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(2);

      const query = new GetEquiposQuery(undefined, undefined, undefined, undefined, 1, 10);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.equipos).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('debe aplicar valores por defecto de paginación', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(2);

      const query = new GetEquiposQuery(undefined, undefined, undefined, undefined, undefined, undefined); // Sin page ni limit

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('debe calcular skip correctamente para paginación', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(25);

      const query = new GetEquiposQuery(undefined, undefined, undefined, undefined, 3, 10);

      // Act
      await handler.execute(query);

      // Assert
      const filtrosUsados = repositoryMock.findAll.mock.calls[0][0];
      expect(filtrosUsados!.skip).toBe(20); // (3-1) * 10
      expect(filtrosUsados!.take).toBe(10);
    });

    it('debe calcular totalPages correctamente', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(25);

      const query = new GetEquiposQuery(undefined, undefined, undefined, undefined, 1, 10);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.totalPages).toBe(3); // Math.ceil(25 / 10)
    });

    it('debe filtrar por clienteId', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(2);

      const query = new GetEquiposQuery(1, undefined, undefined, undefined, 1, 10);

      // Act
      await handler.execute(query);

      // Assert
      const filtrosUsados = repositoryMock.findAll.mock.calls[0][0];
      expect(filtrosUsados!.clienteId).toBe(1);
    });

    it('debe filtrar por sedeId', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(2);

      const query = new GetEquiposQuery(undefined, 1, undefined, undefined, 1, 10);

      // Act
      await handler.execute(query);

      // Assert
      const filtrosUsados = repositoryMock.findAll.mock.calls[0][0];
      expect(filtrosUsados!.sedeId).toBe(1);
    });

    it('debe filtrar por estado', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(2);

      const query = new GetEquiposQuery(undefined, undefined, EstadoEquipoEnum.OPERATIVO, undefined, 1, 10);

      // Act
      await handler.execute(query);

      // Assert
      const filtrosUsados = repositoryMock.findAll.mock.calls[0][0];
      expect(filtrosUsados!.estado).toBe(EstadoEquipoEnum.OPERATIVO);
    });

    it('debe filtrar por tipoEquipoId', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(2);

      const query = new GetEquiposQuery(undefined, undefined, undefined, 1, 1, 10);

      // Act
      await handler.execute(query);

      // Assert
      const filtrosUsados = repositoryMock.findAll.mock.calls[0][0];
      expect(filtrosUsados!.tipoEquipoId).toBe(1);
    });

    it('debe aplicar múltiples filtros simultáneamente', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(2);

      const query = new GetEquiposQuery(1, 2, EstadoEquipoEnum.OPERATIVO, 1, 1, 10);

      // Act
      await handler.execute(query);

      // Assert
      const filtrosUsados = repositoryMock.findAll.mock.calls[0][0];
      expect(filtrosUsados!.clienteId).toBe(1);
      expect(filtrosUsados!.sedeId).toBe(2);
      expect(filtrosUsados!.estado).toBe(EstadoEquipoEnum.OPERATIVO);
      expect(filtrosUsados!.tipoEquipoId).toBe(1);
    });

    it('debe retornar lista vacía si no hay equipos', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue([]);
      repositoryMock.count.mockResolvedValue(0);

      const query = new GetEquiposQuery(undefined, undefined, undefined, undefined, 1, 10);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.equipos).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('debe llamar a count con los mismos filtros que findAll', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(2);

      const query = new GetEquiposQuery(1, undefined, EstadoEquipoEnum.OPERATIVO, undefined, 1, 10);

      // Act
      await handler.execute(query);

      // Assert
      expect(repositoryMock.count).toHaveBeenCalledTimes(1);
      const filtrosCount = repositoryMock.count.mock.calls[0][0];
      expect(filtrosCount!.clienteId).toBe(1);
      expect(filtrosCount!.estado).toBe(EstadoEquipoEnum.OPERATIVO);
    });

    it('debe manejar límites grandes de paginación', async () => {
      // Arrange
      repositoryMock.findAll.mockResolvedValue(equiposMock);
      repositoryMock.count.mockResolvedValue(100);

      const query = new GetEquiposQuery(undefined, undefined, undefined, undefined, 1, 100);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.limit).toBe(100);
      expect(result.totalPages).toBe(1);
    });

    it('debe propagar errores del repositorio', async () => {
      // Arrange
      repositoryMock.findAll.mockRejectedValue(new Error('Error de base de datos'));

      const query = new GetEquiposQuery(undefined, undefined, undefined, undefined, 1, 10);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Error de base de datos');
    });
  });
});
