import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:mekanos_mobile/features/ejecucion/data/parametro_override_resolver.dart';

void main() {
  group('ParametroOverrideResolver', () {
    test('resuelve override ELEV por_parametro usando idParametro=30', () {
      final configJson = jsonEncode({
        'por_parametro': {
          '30': {
            'id_parametro_medicion': 30,
            'codigo_parametro': 'ELEV_VELOCIDAD_CABINA',
            'unidad_medida': 'm/min',
            'min_normal': 135,
            'max_normal': 165,
            'min_critico': 120,
            'max_critico': 180,
          },
        },
        'planes_preventivos': [
          {'id_tipo_servicio': 25, 'frecuencia_dias': 30, 'frecuencia_uso': 15000},
        ],
      });

      final rangos = ParametroOverrideResolver.resolverOverride(
        configParametrosJson: configJson,
        codigoParametro: 'ELEV_VELOCIDAD_CABINA',
        idParametro: 30,
      );
      final unidad = ParametroOverrideResolver.resolverUnidadPersonalizada(
        configParametrosJson: configJson,
        codigoParametro: 'ELEV_VELOCIDAD_CABINA',
        idParametro: 30,
      );

      expect(rangos, isNotNull);
      expect(rangos!.minNormal, 135.0);
      expect(rangos.maxNormal, 165.0);
      expect(rangos.minCritico, 120.0);
      expect(rangos.maxCritico, 180.0);
      expect(unidad, 'm/min');
    });

    test('no colisiona ELEV_VELOCIDAD_CABINA (m/s) con unidades.velocidad legacy', () {
      final configJson = jsonEncode({
        'unidades': {'velocidad': 'RPM', 'temperatura': '°F'},
      });

      final unidadElev = ParametroOverrideResolver.resolverUnidadPersonalizada(
        configParametrosJson: configJson,
        codigoParametro: 'ELEV_VELOCIDAD_CABINA',
        idParametro: 30,
      );

      expect(unidadElev, isNull);
    });

    test('mantiene retrocompatibilidad con config legacy de generador', () {
      final configJson = jsonEncode({
        'unidades': {'temperatura': '°F'},
        'rangos': {
          'temperatura_refrigerante': {
            'min_normal': 160,
            'max_normal': 205,
            'max_critico': 220,
          },
        },
      });

      final rangos = ParametroOverrideResolver.resolverOverride(
        configParametrosJson: configJson,
        codigoParametro: 'GEN_TEMP_REFRIGERANTE',
      );
      final unidad = ParametroOverrideResolver.resolverUnidadPersonalizada(
        configParametrosJson: configJson,
        codigoParametro: 'GEN_TEMP_REFRIGERANTE',
      );

      expect(rangos, isNotNull);
      expect(rangos!.minNormal, 160.0);
      expect(rangos.maxNormal, 205.0);
      expect(rangos.maxCritico, 220.0);
      expect(unidad, '°F');
    });

    test('soporta parametros_adicionales y rangos directos por codigo_parametro', () {
      final configJson = jsonEncode({
        'parametros_adicionales': [
          {
            'codigo_parametro': 'CUSTOM_VIB_CABINA',
            'unidad_medida': 'mm/s',
            'min_normal': 0.2,
            'max_normal': 2.5,
          },
        ],
      });

      final rangos = ParametroOverrideResolver.resolverOverride(
        configParametrosJson: configJson,
        codigoParametro: 'CUSTOM_VIB_CABINA',
      );

      expect(rangos, isNotNull);
      expect(rangos!.minNormal, 0.2);
      expect(rangos.maxNormal, 2.5);
      expect(rangos.unidadMedida, 'mm/s');
    });
  });
}
