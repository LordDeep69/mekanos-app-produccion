import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateEquipoHandler } from './create-equipo.handler';
import { CreateEquipoCommand } from './create-equipo.command';
import { IEquipoRepository } from '@mekanos/core';

describe('CreateEquipoHandler', () => {
  let handler: CreateEquipoHandler;
  let repositoryMock: jest.Mocked<IEquipoRepository>;

  beforeEach(async () => {
    // Mock del repositorio
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
        CreateEquipoHandler,
        {
          provide: 'IEquipoRepository',
          useValue: repositoryMock,
        },
      ],
    }).compile();

    handler = module.get<CreateEquipoHandler>(CreateEquipoHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validDto = {
      codigo: 'GEN-2024-0001',
      marca: 'Cummins',
      modelo: 'C150',
      serie: 'SN12345',
      clienteId: 1,
      sedeId: 1,
      tipoEquipoId: 1,
      nombreEquipo: 'Generador Principal',
    };

    it('debe crear equipo cuando código no existe', async () => {
      // Arrange
      repositoryMock.existsByCodigo.mockResolvedValue(false);
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const command = new CreateEquipoCommand(validDto);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(repositoryMock.existsByCodigo).toHaveBeenCalledWith('GEN-2024-0001');
      expect(repositoryMock.save).toHaveBeenCalled();
      expect(result.codigo.getValue()).toBe('GEN-2024-0001');
      expect(result.marca).toBe('CUMMINS'); // uppercase
    });

    it('debe lanzar ConflictException si código ya existe', async () => {
      // Arrange
      repositoryMock.existsByCodigo.mockResolvedValue(true);

      const command = new CreateEquipoCommand(validDto);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Ya existe un equipo con el código GEN-2024-0001'
      );
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('debe crear equipo sin campos opcionales', async () => {
      // Arrange
      const dtoSinOpcionales = {
        codigo: 'GEN-2024-0002',
        marca: 'Perkins',
        modelo: 'P200',
        clienteId: 1,
        tipoEquipoId: 1,
      };

      repositoryMock.existsByCodigo.mockResolvedValue(false);
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const command = new CreateEquipoCommand(dtoSinOpcionales);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.serie).toBeNull();
      expect(result.sedeId).toBeNull();
      expect(result.nombreEquipo).toBeNull();
    });

    it('debe normalizar marca y modelo a uppercase', async () => {
      // Arrange
      const dtoLowercase = {
        ...validDto,
        marca: 'cummins',
        modelo: 'c150',
      };

      repositoryMock.existsByCodigo.mockResolvedValue(false);
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const command = new CreateEquipoCommand(dtoLowercase);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.marca).toBe('CUMMINS');
      expect(result.modelo).toBe('C150');
    });

    it('debe crear equipo con estado inicial OPERATIVO', async () => {
      // Arrange
      repositoryMock.existsByCodigo.mockResolvedValue(false);
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const command = new CreateEquipoCommand(validDto);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.estado.getValue()).toBe('OPERATIVO');
      expect(result.estado.esOperativo()).toBe(true);
    });

    it('debe establecer fechaRegistro automáticamente', async () => {
      // Arrange
      repositoryMock.existsByCodigo.mockResolvedValue(false);
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const command = new CreateEquipoCommand(validDto);

      const antes = new Date();

      // Act
      const result = await handler.execute(command);

      const despues = new Date();

      // Assert
      expect(result.fechaRegistro).toBeInstanceOf(Date);
      expect(result.fechaRegistro.getTime()).toBeGreaterThanOrEqual(antes.getTime());
      expect(result.fechaRegistro.getTime()).toBeLessThanOrEqual(despues.getTime());
    });

    it('debe establecer ultimoMantenimiento como null al crear', async () => {
      // Arrange
      repositoryMock.existsByCodigo.mockResolvedValue(false);
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const command = new CreateEquipoCommand(validDto);

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.ultimoMantenimiento).toBeNull();
    });

    it('debe propagar errores de validación del entity', async () => {
      // Arrange
      const dtoInvalido = {
        ...validDto,
        marca: '', // Marca vacía debería lanzar error
      };

      repositoryMock.existsByCodigo.mockResolvedValue(false);

      const command = new CreateEquipoCommand(dtoInvalido);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Marca es requerida');
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('debe verificar existencia del código antes de crear', async () => {
      // Arrange
      repositoryMock.existsByCodigo.mockResolvedValue(false);
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const command = new CreateEquipoCommand(validDto);

      // Act
      await handler.execute(command);

      // Assert
      expect(repositoryMock.existsByCodigo).toHaveBeenCalledTimes(1);
      expect(repositoryMock.existsByCodigo).toHaveBeenCalledWith('GEN-2024-0001');
    });

    it('debe guardar el equipo en el repositorio', async () => {
      // Arrange
      repositoryMock.existsByCodigo.mockResolvedValue(false);
      repositoryMock.save.mockImplementation(async (equipo) => equipo);

      const command = new CreateEquipoCommand(validDto);

      // Act
      await handler.execute(command);

      // Assert
      expect(repositoryMock.save).toHaveBeenCalledTimes(1);
      const equipoGuardado = repositoryMock.save.mock.calls[0][0];
      expect(equipoGuardado.codigo.getValue()).toBe('GEN-2024-0001');
    });
  });
});
