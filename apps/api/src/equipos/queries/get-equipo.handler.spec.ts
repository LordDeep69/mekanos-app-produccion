import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetEquipoHandler } from './get-equipo.handler';
import { GetEquipoQuery } from './get-equipo.query';
import { IEquipoRepository, EquipoEntity } from '@mekanos/core';

describe('GetEquipoHandler', () => {
  let handler: GetEquipoHandler;
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
        GetEquipoHandler,
        {
          provide: 'IEquipoRepository',
          useValue: repositoryMock,
        },
      ],
    }).compile();

    handler = module.get<GetEquipoHandler>(GetEquipoHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const equipoExistente = EquipoEntity.create({
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      serie: 'SN12345',
      clienteId: 1,
      sedeId: 1,
      tipoEquipoId: 1,
      nombreEquipo: 'Generador Principal',
    });

    it('debe retornar equipo existente', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(equipoExistente);

      const query = new GetEquipoQuery(1);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(repositoryMock.findById).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.codigo.getValue()).toBe('GEN-2024-0001');
      expect(result.marca).toBe('CUMMINS');
    });

    it('debe lanzar NotFoundException si equipo no existe', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(null);

      const query = new GetEquipoQuery(999);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(query)).rejects.toThrow('Equipo con ID 999 no encontrado');
    });

    it('debe llamar al repositorio con el EquipoId correcto', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(equipoExistente);

      const query = new GetEquipoQuery(1);

      // Act
      await handler.execute(query);

      // Assert
      expect(repositoryMock.findById).toHaveBeenCalledTimes(1);
      const equipoIdPasado = repositoryMock.findById.mock.calls[0][0];
      expect(equipoIdPasado.getValue()).toBe(1);
    });

    it('debe retornar equipo con todos los campos', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(equipoExistente);

      const query = new GetEquipoQuery(1);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.codigo).toBeDefined();
      expect(result.marca).toBeDefined();
      expect(result.modelo).toBeDefined();
      expect(result.estado).toBeDefined();
      expect(result.fechaRegistro).toBeDefined();
    });

    it('debe manejar equipos con campos opcionales null', async () => {
      // Arrange
      const equipoSinOpcionales = EquipoEntity.create({
        codigo: 'GEN-2024-0002',
        marca: 'Perkins',
        modelo: 'P200',
        clienteId: 1,
        tipoEquipoId: 1,
      });

      repositoryMock.findById.mockResolvedValue(equipoSinOpcionales);

      const query = new GetEquipoQuery(1);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.serie).toBeNull();
      expect(result.sedeId).toBeNull();
      expect(result.nombreEquipo).toBeNull();
      expect(result.ultimoMantenimiento).toBeNull();
    });

    it('debe propagar errores del repositorio', async () => {
      // Arrange
      repositoryMock.findById.mockRejectedValue(new Error('Error de conexión'));

      const query = new GetEquipoQuery(1);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow('Error de conexión');
    });
  });
});
