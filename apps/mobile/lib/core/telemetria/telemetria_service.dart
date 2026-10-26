import 'dart:async';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../api/api_client.dart';

/// Provider global para el servicio de telemetría y seguimiento en tiempo real
final telemetriaServiceProvider = Provider<TelemetriaService>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return TelemetriaService(apiClient);
});

/// Servicio de Seguimiento en Tiempo Real / Telemetría (Estilo Sytex)
/// 
/// Reporta periódicamente la presencia y actividad del técnico al backend
/// mediante el endpoint POST /api/ordenes/:id/heartbeat.
/// Esto permite que el Portal Admin visualice el estado "EN VIVO",
/// tiempo de inactividad 0 min, y la actividad actual en tiempo real.
class TelemetriaService {
  final ApiClient _apiClient;
  final Connectivity _connectivity = Connectivity();

  Timer? _heartbeatTimer;
  int? _activeIdOrdenBackend;
  String? _numeroOrden;
  String _actividadActual = 'Técnico activo en orden';
  DateTime? _ultimoPingExitoso;
  bool _enviando = false;

  TelemetriaService(this._apiClient);

  DateTime? get ultimoPingExitoso => _ultimoPingExitoso;
  bool get isRunning => _heartbeatTimer != null && _heartbeatTimer!.isActive;

  /// Inicia el seguimiento en tiempo real para una orden específica
  void startHeartbeat({
    required int idOrdenBackend,
    required String numeroOrden,
    String? actividadInicial,
  }) {
    if (_activeIdOrdenBackend == idOrdenBackend && isRunning) {
      if (actividadInicial != null) {
        updateActividad(actividadInicial);
      }
      return;
    }

    stopHeartbeat();

    _activeIdOrdenBackend = idOrdenBackend;
    _numeroOrden = numeroOrden;
    if (actividadInicial != null) {
      _actividadActual = actividadInicial;
    }

    debugPrint(
      '💓 [TELEMETRIA] Iniciando seguimiento en vivo para Orden #$_numeroOrden (ID Backend: $_activeIdOrdenBackend)',
    );

    // Enviar ping inicial de inmediato
    _enviarHeartbeat();

    // Ciclo periódico cada 20 segundos (el Portal Admin refresca cada 15s)
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 20), (_) {
      _enviarHeartbeat();
    });
  }

  /// Actualiza la actividad reportada y envía latido inmediato si han pasado >4 segundos
  void updateActividad(String nuevaActividad) {
    _actividadActual = nuevaActividad;
    final ahora = DateTime.now();
    if (_ultimoPingExitoso == null ||
        ahora.difference(_ultimoPingExitoso!).inSeconds >= 4) {
      _enviarHeartbeat();
    }
  }

  /// Detiene el ciclo de telemetría al salir de la orden o finalizar
  void stopHeartbeat() {
    if (_heartbeatTimer != null) {
      debugPrint('⏹️ [TELEMETRIA] Deteniendo seguimiento para Orden #$_numeroOrden');
      _heartbeatTimer?.cancel();
      _heartbeatTimer = null;
    }
    _activeIdOrdenBackend = null;
    _numeroOrden = null;
  }

  Future<void> _enviarHeartbeat() async {
    if (_enviando || _activeIdOrdenBackend == null) return;
    _enviando = true;

    try {
      final connectivityResult = await _connectivity.checkConnectivity();
      if (connectivityResult == ConnectivityResult.none) {
        debugPrint('📡 [TELEMETRIA] Dispositivo offline, omitiendo latido');
        return;
      }

      final red = (connectivityResult == ConnectivityResult.wifi) ? 'WIFI' : 'MOVIL';

      final payload = {
        'red': red,
        'actividad_actual': _actividadActual,
        'observacion': 'Reporte en vivo desde app móvil - Orden #$_numeroOrden',
      };

      final response = await _apiClient.dio.post(
        '/ordenes/$_activeIdOrdenBackend/heartbeat',
        data: payload,
      );

      if (response.statusCode == 200) {
        _ultimoPingExitoso = DateTime.now();
        debugPrint(
          '💓 [TELEMETRIA] Latido registrado con éxito para Orden #$_numeroOrden: $_actividadActual',
        );
      }
    } catch (e) {
      // Manejo silencioso: en campo la señal puede variar y no debe interrumpir al técnico
      debugPrint('ℹ️ [TELEMETRIA] Fallo temporal de envío de heartbeat: $e');
    } finally {
      _enviando = false;
    }
  }
}
