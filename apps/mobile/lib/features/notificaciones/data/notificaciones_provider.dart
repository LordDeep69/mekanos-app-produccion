/// Provider de Notificaciones
///
/// Integración con Riverpod para gestión de estado de notificaciones
/// RUTA 14 - Notificaciones
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/api/api_client.dart';
import '../../../core/config/supabase_config.dart';
import '../../auth/data/auth_provider.dart';
import 'notificaciones_service.dart';

/// Provider del servicio de notificaciones
final notificacionesServiceProvider = Provider<NotificacionesService>((ref) {
  final apiClient = ref.watch(apiClientProvider);

  return NotificacionesService(
    dio: apiClient.dio,
    supabase: SupabaseConfig.client,
  );
});

/// Provider del conteo de notificaciones no leídas
final notificacionesConteoProvider = StreamProvider<int>((ref) {
  final service = ref.watch(notificacionesServiceProvider);

  // Obtener conteo inicial
  service.obtenerConteoNoLeidas();

  return service.onConteoChange;
});

/// Provider de lista de notificaciones
final notificacionesListaProvider =
    FutureProvider.autoDispose<List<NotificacionModel>>((ref) async {
      final service = ref.watch(notificacionesServiceProvider);
      return service.listar();
    });

/// Provider de nuevas notificaciones (stream)
final nuevaNotificacionProvider = StreamProvider<NotificacionModel>((ref) {
  final service = ref.watch(notificacionesServiceProvider);
  return service.onNuevaNotificacion;
});

/// Controller para iniciar/detener listener de notificaciones
class NotificacionesController extends StateNotifier<bool> {
  final NotificacionesService _service;
  final int? _userId;

  NotificacionesController(this._service, this._userId) : super(false) {
    if (_userId != null) {
      iniciarListener();
    }
  }

  void iniciarListener() {
    if (_userId != null) {
      _service.iniciarRealtimeListener(_userId);
      state = true;
    }
  }

  void detenerListener() {
    _service.detenerRealtimeListener();
    state = false;
  }

  @override
  void dispose() {
    _service.dispose();
    super.dispose();
  }
}

/// Provider del controller de notificaciones
final notificacionesControllerProvider =
    StateNotifierProvider<NotificacionesController, bool>((ref) {
      final service = ref.watch(notificacionesServiceProvider);
      final authState = ref.watch(authStateProvider);

      // Obtener userId del estado de auth
      final userId = authState.user?.id;

      return NotificacionesController(service, userId);
    });
