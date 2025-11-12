import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UpdateEquipoHandler } from './update-equipo.handler';
import { UpdateEquipoCommand } from './update-equipo.command';
import { IEquipoRepository, EquipoEntity, EstadoEquipoEnum } from '@mekanos/core';

describe('UpdateEquipoHandler', () => {
  let handler: UpdateEquipoHandler;
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
        UpdateEquipoHandler,
        {
          provide: 'IEquipoRepository',
          useValue: repositoryMock,
        },
      ],
    }).compile();

    handler = module.get<UpdateEquipoHandler>(UpdateEquipoHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const createEquipoMock = () => EquipoEntity.create({
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      serie: 'SN12345',
      clienteId: 1,
      sedeId: 1,
      tipoEquipoId: 1,
      nombreEquipo: 'Generador Principal',
    });

    it('debe actualizar equipo existente', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(createEquipoMock());
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const updateDto = {
        marca: 'Perkins',
        modelo: 'P200',
      };

      const command = new UpdateEquipoCommand(1, updateDto);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(repositoryMock.findById).toHaveBeenCalled();
      expect(repositoryMock.save).toHaveBeenCalled();
      expect(result.marca).toBe('PERKINS');
      expect(result.modelo).toBe('P200');
    });

    it('debe lanzar NotFoundException si equipo no existe', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(null);

      const updateDto = { marca: 'Perkins' };
      const command = new UpdateEquipoCommand(999, updateDto);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow('Equipo con ID 999 no encontrado');
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('debe actualizar solo los campos proporcionados', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(createEquipoMock());
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const updateDto = { marca: 'Perkins' }; // Solo marca

      const command = new UpdateEquipoCommand(1, updateDto);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.marca).toBe('PERKINS');
      expect(result.modelo).toBe('C150'); // No cambió
      expect(result.serie).toBe('SN12345'); // No cambió
    });

    it('debe cambiar estado si se proporciona', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(createEquipoMock());
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const updateDto = { estado: EstadoEquipoEnum.STANDBY };
      const command = new UpdateEquipoCommand(1, updateDto);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.estado.getValue()).toBe(EstadoEquipoEnum.STANDBY);
    });

    it('debe validar transiciones de estado', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(createEquipoMock());

      const updateDto = { estado: EstadoEquipoEnum.BAJA }; // Transición inválida desde OPERATIVO
      const command = new UpdateEquipoCommand(1, updateDto);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'No se puede transicionar de OPERATIVO a BAJA'
      );
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('debe permitir actualizar serie', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(createEquipoMock());
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const updateDto = { serie: 'NEW123' };
      const command = new UpdateEquipoCommand(1, updateDto);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.serie).toBe('NEW123');
    });

    it('debe permitir actualizar nombreEquipo', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(createEquipoMock());
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const updateDto = { nombreEquipo: 'Generador Secundario' };
      const command = new UpdateEquipoCommand(1, updateDto);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.nombreEquipo).toBe('Generador Secundario');
    });

    it('debe normalizar valores a uppercase', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(createEquipoMock());
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const updateDto = {
        marca: 'perkins',
        modelo: 'p200',
        serie: 'new123',
      };

      const command = new UpdateEquipoCommand(1, updateDto);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.marca).toBe('PERKINS');
      expect(result.modelo).toBe('P200');
      expect(result.serie).toBe('NEW123');
    });

    it('NO debe actualizar equipo dado de baja', async () => {
      // Arrange
      const equipoBaja = EquipoEntity.create({
        codigo: 'GEN-2024-0002',
        marca: 'Cummins',
        modelo: 'C150',
        clienteId: 1,
        tipoEquipoId: 1,
      });
      equipoBaja.desactivar();
      equipoBaja.darDeBaja();

      repositoryMock.findById.mockResolvedValue(equipoBaja);

      const updateDto = { marca: 'Perkins' };
      const command = new UpdateEquipoCommand(1, updateDto);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(
        'No se puede actualizar un equipo dado de baja'
      );
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('debe actualizar múltiples campos simultáneamente', async () => {
      // Arrange
      repositoryMock.findById.mockResolvedValue(createEquipoMock());
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const updateDto = {
        marca: 'Perkins',
        modelo: 'P200',
        serie: 'NEW123',
        nombreEquipo: 'Generador Actualizado',
      };

      const command = new UpdateEquipoCommand(1, updateDto);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.marca).toBe('PERKINS');
      expect(result.modelo).toBe('P200');
      expect(result.serie).toBe('NEW123');
      expect(result.nombreEquipo).toBe('Generador Actualizado');
    });
  });
});
