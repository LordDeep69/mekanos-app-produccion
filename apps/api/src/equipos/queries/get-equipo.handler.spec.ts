import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { GetEquipoHandler } from './get-equipo.handler';
import { GetEquipoQuery } from './get-equipo.query';

describe('GetEquipoHandler', () => {
  let handler: GetEquipoHandler;
  let repositoryMock: {
    findById: jest.Mock;
  };

  beforeEach(async () => {
    repositoryMock = {
      findById: jest.fn(),
    };

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
    const equipoExistente = {
      id_equipo: 1,
      codigo_equipo: 'ASC-2026-0001',
      nombre_equipo: 'Ascensor Torre Norte',
      numero_serie_equipo: 'SN-12345',
      id_cliente: 1,
      id_sede: 1,
      id_tipo_equipo: 3,
      estado_equipo: 'OPERATIVO',
      fecha_creacion: new Date('2026-01-01T00:00:00Z'),
    };

    it('debe retornar equipo existente por id numérico', async () => {
      repositoryMock.findById.mockResolvedValue(equipoExistente);

      const result = await handler.execute(new GetEquipoQuery(1));

      expect(repositoryMock.findById).toHaveBeenCalledWith(1);
      expect(result).toBeDefined();
      expect(result.codigo_equipo).toBe('ASC-2026-0001');
      expect(result.estado_equipo).toBe('OPERATIVO');
    });

    it('debe lanzar NotFoundException si equipo no existe', async () => {
      repositoryMock.findById.mockResolvedValue(null);

      await expect(handler.execute(new GetEquipoQuery(999))).rejects.toThrow(
        new NotFoundException('Equipo con ID 999 no encontrado'),
      );
    });

    it('debe manejar equipos con campos opcionales en null', async () => {
      repositoryMock.findById.mockResolvedValue({
        id_equipo: 2,
        codigo_equipo: 'TUB-2026-0002',
        id_cliente: 1,
        id_tipo_equipo: 8,
        numero_serie_equipo: null,
        id_sede: null,
        nombre_equipo: null,
      });

      const result = await handler.execute(new GetEquipoQuery(2));

      expect(result.numero_serie_equipo).toBeNull();
      expect(result.id_sede).toBeNull();
      expect(result.nombre_equipo).toBeNull();
    });

    it('debe propagar errores del repositorio', async () => {
      repositoryMock.findById.mockRejectedValue(new Error('Error de conexión'));

      await expect(handler.execute(new GetEquipoQuery(1))).rejects.toThrow('Error de conexión');
    });
  });
});
