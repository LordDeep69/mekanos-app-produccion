import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UpdateEquipoCommand } from './update-equipo.command';
import { UpdateEquipoHandler } from './update-equipo.handler';

describe('UpdateEquipoHandler', () => {
  let handler: UpdateEquipoHandler;
  let repositoryMock: {
    findById: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repositoryMock = {
      findById: jest.fn(),
      save: jest.fn(),
    };

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

  const makeExistingEquipo = () => ({
    id_equipo: 1,
    codigo_equipo: 'HVAC-2026-0001',
    id_cliente: 10,
    id_tipo_equipo: 7,
    ubicacion_texto: 'Azotea Torre A',
    id_sede: 2,
    nombre_equipo: 'Chiller Principal',
    numero_serie_equipo: 'SN-12345',
    estado_equipo: 'OPERATIVO',
    criticidad: 'MEDIA',
    criticidad_justificacion: null,
    fecha_instalacion: null,
    fecha_inicio_servicio_mekanos: null,
    en_garantia: false,
    fecha_inicio_garantia: null,
    fecha_fin_garantia: null,
    proveedor_garantia: null,
    estado_pintura: null,
    requiere_pintura: false,
    tipo_contrato: null,
    intervalo_tipo_a_dias_override: null,
    intervalo_tipo_a_horas_override: null,
    intervalo_tipo_b_dias_override: null,
    intervalo_tipo_b_horas_override: null,
    criterio_intervalo_override: null,
    observaciones_generales: null,
    configuracion_especial: null,
    config_parametros: {
      planes_preventivos: { TIPO_A: [101, 102] },
    },
    creado_por: 1,
  });

  describe('execute', () => {
    it('debe actualizar equipo existente preservando campos no enviados', async () => {
      repositoryMock.findById.mockResolvedValue(makeExistingEquipo());
      repositoryMock.save.mockImplementation(async (payload) => payload);

      const command = new UpdateEquipoCommand(
        1,
        {
          nombre_equipo: 'Chiller Industrial Renovado',
          estado_equipo: 'STANDBY',
        },
        45,
      );

      const result = await handler.execute(command);

      expect(repositoryMock.findById).toHaveBeenCalledWith(1);
      expect(repositoryMock.save).toHaveBeenCalledTimes(1);
      expect(result.id_equipo).toBe(1);
      expect(result.nombre_equipo).toBe('Chiller Industrial Renovado');
      expect(result.estado_equipo).toBe('STANDBY');
      expect(result.numero_serie_equipo).toBe('SN-12345');
      expect(result.modificado_por).toBe(45);
    });

    it('debe lanzar NotFoundException si equipo no existe', async () => {
      repositoryMock.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new UpdateEquipoCommand(999, { nombre_equipo: 'X' }, 1)),
      ).rejects.toThrow(new NotFoundException('Equipo con ID 999 no encontrado'));
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('debe preservar planes_preventivos en config_parametros si update no lo sobrescribe', async () => {
      repositoryMock.findById.mockResolvedValue(makeExistingEquipo());
      repositoryMock.save.mockImplementation(async (payload) => payload);

      const command = new UpdateEquipoCommand(
        1,
        {
          config_parametros: { TEMP_MAX: 90 } as any,
        },
        88,
      );

      const result = await handler.execute(command);

      expect(result.config_parametros).toEqual({
        planes_preventivos: { TIPO_A: [101, 102] },
        TEMP_MAX: 90,
      });
    });

    it('debe convertir fechas de garantía y tolerar limpieza explícita con null', async () => {
      repositoryMock.findById.mockResolvedValue(makeExistingEquipo());
      repositoryMock.save.mockImplementation(async (payload) => payload);

      const command = new UpdateEquipoCommand(
        1,
        {
          en_garantia: true,
          fecha_inicio_garantia: '2026-06-01',
          fecha_fin_garantia: null as any,
        },
        12,
      );

      const result = await handler.execute(command);

      expect(result.en_garantia).toBe(true);
      expect(result.fecha_inicio_garantia).toBeInstanceOf(Date);
      expect(result.fecha_fin_garantia).toBeNull();
    });
  });
});
