import { UpdateEquipoCommand } from './update-equipo.command';
import { UpdateEquipoHandler } from './update-equipo.handler';

describe('UpdateEquipoHandler - preservación de planes_preventivos en config_parametros', () => {
  it('preserva planes_preventivos previos al guardar overrides por_parametro', async () => {
    const planesExistentes = [
      {
        id_tipo_servicio: 25,
        nombre_plan: 'Preventivo Tipo A - Ascensor',
        frecuencia_dias: 30,
        frecuencia_uso: 15000,
        criterio_intervalo: 'LO_QUE_OCURRA_PRIMERO',
      },
    ];

    const repoMock = {
      findById: jest.fn().mockResolvedValue({
        id_equipo: 99,
        codigo_equipo: 'ELEV-001',
        id_cliente: 1,
        id_tipo_equipo: 22,
        ubicacion_texto: 'TORRE A',
        id_sede: null,
        nombre_equipo: 'Ascensor Principal',
        numero_serie_equipo: 'SN-1',
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
        tipo_contrato: 'SIN_CONTRATO',
        intervalo_tipo_a_dias_override: null,
        intervalo_tipo_a_horas_override: null,
        intervalo_tipo_b_dias_override: null,
        intervalo_tipo_b_horas_override: null,
        criterio_intervalo_override: null,
        observaciones_generales: null,
        configuracion_especial: null,
        creado_por: 1,
        config_parametros: {
          planes_preventivos: planesExistentes,
          por_parametro: {
            '30': { min_normal: 1.4, max_normal: 1.8 },
          },
        },
      }),
      save: jest.fn().mockImplementation(async (payload) => payload),
    };

    const handler = new UpdateEquipoHandler(repoMock as never);
    const command = new UpdateEquipoCommand(
      99,
      {
        config_parametros: {
          por_parametro: {
            '30': {
              id_parametro_medicion: 30,
              codigo_parametro: 'ELEV_VELOCIDAD_CABINA',
              min_normal: 2.3,
              max_normal: 2.7,
            },
          },
        },
      },
      7,
    );

    const saved = await handler.execute(command);

    expect(repoMock.save).toHaveBeenCalledTimes(1);
    expect(saved.config_parametros).toEqual({
      planes_preventivos: planesExistentes,
      por_parametro: {
        '30': {
          id_parametro_medicion: 30,
          codigo_parametro: 'ELEV_VELOCIDAD_CABINA',
          min_normal: 2.3,
          max_normal: 2.7,
        },
      },
    });
  });
});
