/// Metadatos dinámicos de metrología de uso en Mobile según `_metrologia` del arquetipo.
library;

import 'dart:convert';

import 'package:flutter/material.dart';

class MetricaUsoMobile {
  final String unidadUso;
  final String prefijo;
  final String sufijo;
  final String etiqueta;
  final String tituloDialogo;
  final String labelInput;
  final String textoRegistrar;
  final String hint;
  final IconData icono;
  final double? lecturaActual;

  const MetricaUsoMobile({
    required this.unidadUso,
    required this.prefijo,
    required this.sufijo,
    required this.etiqueta,
    required this.tituloDialogo,
    required this.labelInput,
    required this.textoRegistrar,
    required this.hint,
    required this.icono,
    this.lecturaActual,
  });

  factory MetricaUsoMobile.desdeConfig(String? configParametrosJson) {
    String rawUnidadOriginal = 'HORAS';
    String rawUnidad = 'HORAS';
    String etiquetaCfg = '';
    bool requiereHorometro = true;
    double? lecturaActual;

    if (configParametrosJson != null && configParametrosJson.trim().isNotEmpty) {
      try {
        final decoded = jsonDecode(configParametrosJson);
        if (decoded is Map && decoded['_metrologia'] is Map) {
          final metro = Map<String, dynamic>.from(decoded['_metrologia'] as Map);
          rawUnidadOriginal = (metro['unidadUso']?.toString() ?? 'HORAS').trim();
          rawUnidad = rawUnidadOriginal.toUpperCase();
          etiquetaCfg = (metro['etiquetaContador']?.toString() ?? '').trim();
          requiereHorometro = metro['requiereHorometro'] != false;
          final rawLectura = metro['lecturaActual'];
          if (rawLectura != null) {
            lecturaActual = double.tryParse(rawLectura.toString());
          }
        }
      } catch (_) {}
    }

    if (rawUnidad == 'CAL' ||
        !requiereHorometro ||
        etiquetaCfg.toUpperCase() == 'N/A') {
      final etq = (etiquetaCfg.isNotEmpty && etiquetaCfg.toUpperCase() != 'N/A')
          ? etiquetaCfg
          : 'Control por Calendario';
      return MetricaUsoMobile(
        unidadUso: rawUnidad == 'CAL' ? 'CAL' : rawUnidad,
        prefijo: 'CONTADOR',
        sufijo: '',
        etiqueta: etq,
        tituloDialogo: 'Lectura de $etq',
        labelInput: etq,
        textoRegistrar: 'Registrar ${etq.toLowerCase()}',
        hint: 'Ej: 100',
        icono: Icons.numbers,
        lecturaActual: lecturaActual,
      );
    }

    if (rawUnidad == 'CICLOS' || etiquetaCfg.toUpperCase().contains('CICLO')) {
      final etq = etiquetaCfg.isNotEmpty ? etiquetaCfg : 'Ciclos de Operación';
      return MetricaUsoMobile(
        unidadUso: 'CICLOS',
        prefijo: 'CICLOS',
        sufijo: 'ciclos',
        etiqueta: etq,
        tituloDialogo: 'Lectura de $etq',
        labelInput: etq,
        textoRegistrar: 'Registrar ${etq.toLowerCase()}',
        hint: 'Ej: 15000',
        icono: Icons.repeat,
        lecturaActual: lecturaActual,
      );
    }

    if (rawUnidad == 'KM_ODO' || rawUnidad == 'KM') {
      final etq =
          etiquetaCfg.isNotEmpty ? etiquetaCfg : 'Kilometraje (Odómetro)';
      return MetricaUsoMobile(
        unidadUso: 'KM_ODO',
        prefijo: 'KM',
        sufijo: 'km',
        etiqueta: etq,
        tituloDialogo: 'Lectura de $etq',
        labelInput: etq,
        textoRegistrar: 'Registrar ${etq.toLowerCase()}',
        hint: 'Ej: 45200',
        icono: Icons.speed,
        lecturaActual: lecturaActual,
      );
    }

    if (rawUnidad == 'UPM' || rawUnidad == 'UNIDADES') {
      final etq =
          etiquetaCfg.isNotEmpty ? etiquetaCfg : 'Unidades Producidas';
      return MetricaUsoMobile(
        unidadUso: 'UPM',
        prefijo: 'UPM',
        sufijo: 'uds',
        etiqueta: etq,
        tituloDialogo: 'Lectura de $etq',
        labelInput: etq,
        textoRegistrar: 'Registrar ${etq.toLowerCase()}',
        hint: 'Ej: 1200',
        icono: Icons.numbers,
        lecturaActual: lecturaActual,
      );
    }

    if (rawUnidad.isNotEmpty &&
        rawUnidad != 'HORAS' &&
        rawUnidad != 'HRS' &&
        rawUnidad != 'H') {
      final etq = etiquetaCfg.isNotEmpty ? etiquetaCfg : rawUnidadOriginal;
      final suf = rawUnidadOriginal.toLowerCase();
      final pref = rawUnidad.replaceAll(RegExp(r'[^A-Z0-9_]'), '');
      return MetricaUsoMobile(
        unidadUso: rawUnidad,
        prefijo: pref.isNotEmpty ? pref : 'CONTADOR',
        sufijo: suf,
        etiqueta: etq,
        tituloDialogo: 'Lectura de $etq',
        labelInput: '$etq ($suf)',
        textoRegistrar: 'Registrar ${etq.toLowerCase()}',
        hint: 'Ej: 1500',
        icono: Icons.pin_outlined,
        lecturaActual: lecturaActual,
      );
    }

    final etq = etiquetaCfg.isNotEmpty ? etiquetaCfg : 'Horómetro';
    return MetricaUsoMobile(
      unidadUso: 'HORAS',
      prefijo: 'HORAS',
      sufijo: 'hrs',
      etiqueta: etq,
      tituloDialogo: 'Lectura $etq',
      labelInput: 'Horas de trabajo',
      textoRegistrar: 'Registrar horas',
      hint: 'Ej: 12345.5',
      icono: Icons.timer,
      lecturaActual: lecturaActual,
    );
  }
}
