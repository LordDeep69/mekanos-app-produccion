import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeleteEquipoHandler } from './delete-equipo.handler';
import { DeleteEquipoCommand } from './delete-equipo.command';
import { IEquipoRepository, EquipoEntity } from '@mekanos/core';

describe('DeleteEquipoHandler', () => {
  let handler: DeleteEquipoHandler;
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
        DeleteEquipoHandler,
        {
          provide: 'IEquipoRepository',
          useValue: repositoryMock,
        },
      ],
    }).compile();

    handler = module.get<DeleteEquipoHandler>(DeleteEquipoHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const equipoExistente = EquipoEntity.create({
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      clienteId: 1,
      tipoEquipoId: 1,
    });

    it('debe eliminar equipo existente', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(equipoExistente);
      repositoryMock.delete.mockResolvedValue(undefined);

      const command = new DeleteEquipoCommand(1);

      // Act
      await handler.execute(command);

      // Assert
      expect(repositoryMock.findById).toHaveBeenCalled();
      expect(repositoryMock.delete).toHaveBeenCalled();
    });

    it('debe lanzar NotFoundException si equipo no existe', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(null);

      const command = new DeleteEquipoCommand(999);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Equipo con ID 999 no encontrado'
      );
      expect(repositoryMock.delete).not.toHaveBeenCalled();
    });

    it('debe verificar existencia del equipo antes de eliminar', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(equipoExistente);
      repositoryMock.delete.mockResolvedValue(undefined);

      const command = new DeleteEquipoCommand(1);

      // Act
      await handler.execute(command);

      // Assert
      expect(repositoryMock.findById).toHaveBeenCalledTimes(1);
    });

    it('debe llamar al método delete del repositorio con el EquipoId correcto', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(equipoExistente);
      repositoryMock.delete.mockResolvedValue(undefined);

      const command = new DeleteEquipoCommand(1);

      // Act
      await handler.execute(command);

      // Assert
      expect(repositoryMock.delete).toHaveBeenCalledTimes(1);
      const equipoIdPasado = repositoryMock.delete.mock.calls[0][0];
      expect(equipoIdPasado.getValue()).toBe(1);
    });

    it('debe manejar IDs de equipos grandes', async () => {
      // Arrange
      const idGrande = 999999;
      repositoryMock.findById.mockResolvedValue(equipoExistente);
      repositoryMock.delete.mockResolvedValue(undefined);

      const command = new DeleteEquipoCommand(idGrande);

      // Act
      await handler.execute(command);

      // Assert
      const equipoIdPasado = repositoryMock.delete.mock.calls[0][0];
      expect(equipoIdPasado.getValue()).toBe(idGrande);
    });

    it('debe propagar errores del repositorio', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(equipoExistente);
      repositoryMock.delete.mockRejectedValue(new Error('Error de base de datos'));

      const command = new DeleteEquipoCommand(1);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Error de base de datos');
    });
  });
});
