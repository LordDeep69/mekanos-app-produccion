import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeleteEquipoCommand } from './delete-equipo.command';
import { DeleteEquipoHandler } from './delete-equipo.handler';

describe('DeleteEquipoHandler', () => {
  let handler: DeleteEquipoHandler;
  let repositoryMock: {
    findById: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    repositoryMock = {
      findById: jest.fn(),
      delete: jest.fn(),
    };

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
    const equipoExistente = {
      id_equipo: 1,
      codigo_equipo: 'GEN-2026-0001',
      nombre_equipo: 'Grupo Electrógeno Principal',
      activo: true,
    };

    it('debe eliminar equipo existente mediante soft-delete', async () => {
      repositoryMock.findById.mockResolvedValue(equipoExistente);
      repositoryMock.delete.mockResolvedValue(undefined);

      await handler.execute(new DeleteEquipoCommand(1, 99));

      expect(repositoryMock.findById).toHaveBeenCalledWith(1);
      expect(repositoryMock.delete).toHaveBeenCalledWith(1, 99);
    });

    it('debe lanzar NotFoundException si equipo no existe', async () => {
      repositoryMock.findById.mockResolvedValue(null);

      await expect(handler.execute(new DeleteEquipoCommand(999, 99))).rejects.toThrow(
        new NotFoundException('Equipo con ID 999 no encontrado'),
      );
      expect(repositoryMock.delete).not.toHaveBeenCalled();
    });

    it('debe manejar IDs de equipos grandes', async () => {
      const idGrande = 999999;
      repositoryMock.findById.mockResolvedValue({ ...equipoExistente, id_equipo: idGrande });
      repositoryMock.delete.mockResolvedValue(undefined);

      await handler.execute(new DeleteEquipoCommand(idGrande, 7));

      expect(repositoryMock.findById).toHaveBeenCalledWith(idGrande);
      expect(repositoryMock.delete).toHaveBeenCalledWith(idGrande, 7);
    });

    it('debe propagar errores del repositorio', async () => {
      repositoryMock.findById.mockResolvedValue(equipoExistente);
      repositoryMock.delete.mockRejectedValue(new Error('Error de base de datos'));

      await expect(handler.execute(new DeleteEquipoCommand(1, 1))).rejects.toThrow(
        'Error de base de datos',
      );
    });
  });
});
