import {
  evaluarValorContraRangos,
  extraerConfigEquipoDeOrden,
  resolverParametroConConfig,
} from './parametros-override.helper';

describe('parametros-override.helper (EAM Universal Override Engine)', () => {
  const paramVelocidadElev = {
    id_parametro_medicion: 30,
    codigo_parametro: 'PAR_VELOCIDAD_REAL_DE_CABINA_E_A66T',
    nombre_parametro: 'Velocidad Real de Cabina en Viaje',
    unidad_medida: 'm/s',
    valor_minimo_normal: 1.4,
    valor_maximo_normal: 1.8,
    valor_minimo_critico: 1.0,
    valor_maximo_critico: 2.2,
  };

  it('usa catálogo global cuando el equipo no tiene config_parametros', () => {
    const resolved = resolverParametroConConfig(paramVelocidadElev, null);

    expect(resolved.esPersonalizado).toBe(false);
    expect(resolved.origen).toBe('GLOBAL');
    expect(resolved.unidadMedida).toBe('m/s');
    expect(resolved.minNormal).toBe(1.4);
    expect(resolved.maxNormal).toBe(1.8);

    // 2.5 está fuera del catálogo estándar [1.4 — 1.8] (> 2.2 crítico)
    const ev = evaluarValorContraRangos(2.5, resolved, resolved.unidadMedida, 'OK');
    expect(ev.nivelAlerta).toBe('CRITICO');
    expect(ev.fueraDeRango).toBe(true);
  });

  it('aplica override específico por id_parametro_medicion (ej. Ascensor Alta Velocidad [2.3 — 2.7 m/s])', () => {
    const configEquipo = {
      por_parametro: {
        '30': {
          id_parametro_medicion: 30,
          codigo_parametro: 'PAR_VELOCIDAD_REAL_DE_CABINA_E_A66T',
          unidad_medida: 'm/s',
          min_normal: 2.3,
          max_normal: 2.7,
          min_critico: 2.0,
          max_critico: 3.1,
        },
      },
    };

    const resolved = resolverParametroConConfig(paramVelocidadElev, configEquipo);

    expect(resolved.esPersonalizado).toBe(true);
    expect(resolved.origen).toBe('EQUIPO');
    expect(resolved.minNormal).toBe(2.3);
    expect(resolved.maxNormal).toBe(2.7);
    expect(resolved.minNormalCatalogo).toBe(1.4);
    expect(resolved.maxNormalCatalogo).toBe(1.8);

    // 2.5 ahora es OK para este equipo de alta velocidad
    const evOk = evaluarValorContraRangos(2.5, resolved, resolved.unidadMedida, 'OK');
    expect(evOk.nivelAlerta).toBe('OK');
    expect(evOk.fueraDeRango).toBe(false);

    // 1.6 estaba en catálogo estándar, pero para este equipo es CRÍTICO (< 2.0)
    const evCrit = evaluarValorContraRangos(1.6, resolved, resolved.unidadMedida, 'OK');
    expect(evCrit.nivelAlerta).toBe('CRITICO');
    expect(evCrit.fueraDeRango).toBe(true);
  });

  it('mantiene retrocompatibilidad 100% con config legacy { unidades, rangos }', () => {
    const paramTempGen = {
      id_parametro_medicion: 9,
      codigo_parametro: 'GEN_TEMP_REFRIGERANTE',
      nombre_parametro: 'Temperatura Refrigerante',
      unidad_medida: '°C',
      valor_minimo_normal: 70,
      valor_maximo_normal: 95,
    };
    const legacyConfig = {
      unidades: { temperatura: '°F' },
      rangos: {
        GEN_TEMP_REFRIGERANTE: { min_normal: 160, max_normal: 205 },
      },
    };

    const resolved = resolverParametroConConfig(paramTempGen, legacyConfig);
    expect(resolved.esPersonalizado).toBe(true);
    expect(resolved.unidadMedida).toBe('°F');
    expect(resolved.minNormal).toBe(160);
    expect(resolved.maxNormal).toBe(205);
  });

  it('extrae config_parametros del equipo correcto en órdenes multi-equipo', () => {
    const orden = {
      equipos: { config_parametros: { por_parametro: { '30': { max_normal: 1.9 } } } },
      ordenes_equipos: [
        {
          id_orden_equipo: 101,
          equipos: { config_parametros: { por_parametro: { '30': { max_normal: 2.7 } } } },
        },
        {
          id_orden_equipo: 102,
          equipos: { config_parametros: { por_parametro: { '30': { max_normal: 3.2 } } } },
        },
      ],
    };

    const eq102 = extraerConfigEquipoDeOrden(orden, 102);
    const res102 = resolverParametroConConfig(paramVelocidadElev, eq102.configEquipo);
    expect(res102.maxNormal).toBe(3.2);
  });
});
