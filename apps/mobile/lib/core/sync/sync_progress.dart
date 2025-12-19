import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Pasos del proceso de sincronización
enum SyncStep {
  preparando,       // Preparando datos locales
  evidencias,       // Subiendo evidencias
  firmas,           // Subiendo firmas
  enviando,         // Enviando al servidor
  pdf,              // Generando PDF
  email,            // Enviando notificación
  completado,       // Proceso terminado
  error,            // Error en el proceso
}

/// Estado del progreso de sincronización
class SyncProgress {
  final SyncStep pasoActual;
  final Set<SyncStep> pasosCompletados;
  final String? mensajeError;
  final int? ordenId;
  
  const SyncProgress({
    this.pasoActual = SyncStep.preparando,
    this.pasosCompletados = const {},
    this.mensajeError,
    this.ordenId,
  });
  
  /// Crea un nuevo estado con un paso completado
  SyncProgress completarPaso(SyncStep paso) {
    return SyncProgress(
      pasoActual: pasoActual,
      pasosCompletados: {...pasosCompletados, paso},
      mensajeError: mensajeError,
      ordenId: ordenId,
    );
  }
  
  /// Crea un nuevo estado avanzando al siguiente paso
  SyncProgress avanzarA(SyncStep nuevoPaso) {
    return SyncProgress(
      pasoActual: nuevoPaso,
      pasosCompletados: pasosCompletados,
      mensajeError: mensajeError,
      ordenId: ordenId,
    );
  }
  
  /// Crea un nuevo estado con error
  SyncProgress conError(String mensaje) {
    return SyncProgress(
      pasoActual: SyncStep.error,
      pasosCompletados: pasosCompletados,
      mensajeError: mensaje,
      ordenId: ordenId,
    );
  }
  
  /// Crea un nuevo estado inicial para una orden
  SyncProgress paraOrden(int id) {
    return SyncProgress(
      pasoActual: SyncStep.preparando,
      pasosCompletados: {},
      mensajeError: null,
      ordenId: id,
    );
  }
  
  /// Verifica si un paso está completado
  bool estaCompletado(SyncStep paso) => pasosCompletados.contains(paso);
  
  /// Verifica si el proceso terminó (éxito o error)
  bool get terminado => pasoActual == SyncStep.completado || pasoActual == SyncStep.error;
  
  /// Estado inicial
  static const initial = SyncProgress();
  
  /// Estado completado
  static SyncProgress completadoExitoso(int ordenId) => SyncProgress(
    pasoActual: SyncStep.completado,
    pasosCompletados: {
      SyncStep.preparando,
      SyncStep.evidencias,
      SyncStep.firmas,
      SyncStep.enviando,
      SyncStep.pdf,
      SyncStep.email,
    },
    ordenId: ordenId,
  );
}

/// Notifier para el progreso de sincronización
/// Emite eventos de progreso que la UI puede escuchar
class SyncProgressNotifier extends StateNotifier<SyncProgress> {
  SyncProgressNotifier() : super(SyncProgress.initial);
  
  /// Reinicia el progreso para una nueva orden
  void iniciar(int ordenId) {
    debugPrint('🔄 [PROGRESS] Iniciando sync para orden $ordenId');
    state = state.paraOrden(ordenId);
  }
  
  /// Avanza al siguiente paso y marca el anterior como completado
  void avanzar(SyncStep nuevoPaso) {
    debugPrint('✅ [PROGRESS] Avanzando a: $nuevoPaso');
    // Marcar el paso actual como completado antes de avanzar
    final pasosCompletos = {...state.pasosCompletados};
    if (state.pasoActual != SyncStep.preparando) {
      pasosCompletos.add(state.pasoActual);
    }
    state = SyncProgress(
      pasoActual: nuevoPaso,
      pasosCompletados: pasosCompletos,
      ordenId: state.ordenId,
    );
  }
  
  /// Marca un paso específico como completado
  void completarPaso(SyncStep paso) {
    debugPrint('✅ [PROGRESS] Paso completado: $paso');
    state = state.completarPaso(paso);
  }
  
  /// Marca el proceso como completado exitosamente
  void completar() {
    debugPrint('🎉 [PROGRESS] Sync completado exitosamente');
    state = SyncProgress(
      pasoActual: SyncStep.completado,
      pasosCompletados: {
        SyncStep.preparando,
        SyncStep.evidencias,
        SyncStep.firmas,
        SyncStep.enviando,
        SyncStep.pdf,
        SyncStep.email,
      },
      ordenId: state.ordenId,
    );
  }
  
  /// Marca error en el proceso
  void error(String mensaje) {
    debugPrint('❌ [PROGRESS] Error: $mensaje');
    state = state.conError(mensaje);
  }
  
  /// Reinicia el estado
  void reset() {
    state = SyncProgress.initial;
  }
}

/// Provider global del progreso de sincronización
final syncProgressProvider = StateNotifierProvider<SyncProgressNotifier, SyncProgress>(
  (ref) => SyncProgressNotifier(),
);

/// Extensión para obtener información visual de cada paso
extension SyncStepInfo on SyncStep {
  String get nombre {
    switch (this) {
      case SyncStep.preparando:
        return 'Preparando datos...';
      case SyncStep.evidencias:
        return 'Subiendo evidencias...';
      case SyncStep.firmas:
        return 'Subiendo firmas...';
      case SyncStep.enviando:
        return 'Enviando al servidor...';
      case SyncStep.pdf:
        return 'Generando PDF...';
      case SyncStep.email:
        return 'Enviando notificación...';
      case SyncStep.completado:
        return '¡Completado!';
      case SyncStep.error:
        return 'Error';
    }
  }
  
  String get nombreCompletado {
    switch (this) {
      case SyncStep.preparando:
        return 'Datos preparados';
      case SyncStep.evidencias:
        return 'Evidencias subidas';
      case SyncStep.firmas:
        return 'Firmas subidas';
      case SyncStep.enviando:
        return 'Enviado al servidor';
      case SyncStep.pdf:
        return 'PDF generado';
      case SyncStep.email:
        return 'Notificación enviada';
      case SyncStep.completado:
        return '¡Completado!';
      case SyncStep.error:
        return 'Error';
    }
  }
}
