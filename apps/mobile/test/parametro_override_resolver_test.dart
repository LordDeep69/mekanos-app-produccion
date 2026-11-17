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

    test('resuelve rangos directos por codigo_parametro sin diccionarios legacy de vertical', () {
      final configJson = jsonEncode({
        'rangos': {
          'TEMP_TABLERO_PRINCIPAL': {
            'unidad_medida': '°F',
            'min_normal': 68,
            'max_normal': 115,
            'max_critico': 140,
          },
        },
      });

      final rangos = ParametroOverrideResolver.resolverOverride(
        configParametrosJson: configJson,
        codigoParametro: 'temp_tablero_principal',
      );
      final unidad = ParametroOverrideResolver.resolverUnidadPersonalizada(
        configParametrosJson: configJson,
        codigoParametro: 'TEMP_TABLERO_PRINCIPAL',
      );

      expect(rangos, isNotNull);
      expect(rangos!.minNormal, 68.0);
      expect(rangos.maxNormal, 115.0);
      expect(rangos.maxCritico, 140.0);
      expect(unidad, '°F');

      // Asegurar que ya no resuelve diccionarios hardcoded legacy si no hay entrada explícita
      expect(
        ParametroOverrideResolver.resolverOverride(
          configParametrosJson: configJson,
          codigoParametro: 'GEN_TEMP_REFRIGERANTE',
        ),
        isNull,
      );
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
