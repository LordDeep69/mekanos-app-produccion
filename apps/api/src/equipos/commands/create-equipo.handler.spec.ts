import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { CreateEquipoHandler } from './create-equipo.handler';
import { CreateEquipoCommand } from './create-equipo.command';
import { CreateEquipoDto } from '../dto/create-equipo.dto';
import { EquipoFilterProjectionService } from '../services/equipo-filter-projection.service';

describe('CreateEquipoHandler', () => {
  let handler: CreateEquipoHandler;
  let repositoryMock: {
    save: jest.Mock;
    existsByCodigo: jest.Mock;
  };
  let projectionMock: {
    reconstruirJsonYProyectar: jest.Mock;
  };

  beforeEach(async () => {
    repositoryMock = {
      save: jest.fn(),
      existsByCodigo: jest.fn(),
    };
    projectionMock = {
      reconstruirJsonYProyectar: jest.fn().mockResolvedValue({ ok: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateEquipoHandler,
        {
          provide: 'IEquipoRepository',
          useValue: repositoryMock,
        },
        {
          provide: EquipoFilterProjectionService,
          useValue: projectionMock,
        },
      ],
    }).compile();

    handler = module.get<CreateEquipoHandler>(CreateEquipoHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const validDto: CreateEquipoDto = {
      codigo_equipo: 'ASC-2026-0001',
      id_cliente: 1,
      id_tipo_equipo: 15,
      ubicacion_texto: 'Torre Norte Piso 1',
      nombre_equipo: 'Ascensor Principal',
      numero_serie_equipo: 'SN-OTIS-01',
      lectura_uso_actual: 12500,
    };

    it('debe crear equipo y reflejar lectura_uso_actual y estado por defecto', async () => {
      repositoryMock.existsByCodigo.mockResolvedValue(false);
      repositoryMock.save.mockImplementation(async (equipo) => ({ id_equipo: 700, ...equipo }));

      const command = new CreateEquipoCommand(validDto, 42);
      const result = await handler.execute(command);

      expect(repositoryMock.existsByCodigo).toHaveBeenCalledWith('ASC-2026-0001');
      expect(repositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo_equipo: 'ASC-2026-0001',
          id_cliente: 1,
          id_tipo_equipo: 15,
          estado_equipo: 'OPERATIVO',
          criticidad: 'MEDIA',
          lectura_uso_actual: 12500,
          horas_actuales: 12500,
          creado_por: 42,
        }),
      );
      expect(result.id_equipo).toBe(700);
      expect(projectionMock.reconstruirJsonYProyectar).not.toHaveBeenCalled();
    });

    it('debe lanzar ConflictException si el código ya existe', async () => {
      repositoryMock.existsByCodigo.mockResolvedValue(true);

      const command = new CreateEquipoCommand(validDto, 42);

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Ya existe un equipo con el código ASC-2026-0001',
      );
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('debe invocar proyección B-Tree EAM si incluye especificaciones JSONB', async () => {
      const specs = {
        _version: 1,
        modulos: {
          traccion_ascensor: {
            capacidad_carga_kg: 1000,
            velocidad_nominal_ms: 1.75,
          },
        },
      };
      repositoryMock.existsByCodigo.mockResolvedValue(false);
      repositoryMock.save.mockImplementation(async (equipo) => ({ id_equipo: 701, ...equipo }));

      const command = new CreateEquipoCommand(
        {
          ...validDto,
          codigo_equipo: 'ASC-2026-0002',
          especificaciones: specs,
        },
        42,
      );

      await handler.execute(command);

      expect(projectionMock.reconstruirJsonYProyectar).toHaveBeenCalledWith(
        701,
        undefined,
        specs,
      );
    });
  });
});
