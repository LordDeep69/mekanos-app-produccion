import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Pasos del proceso de sincronización
/// Estos pasos coinciden con los emitidos por el backend durante finalizarOrden
enum SyncStep {
  // Pasos locales (pre-envío)
  preparando,           // Preparando datos locales
  
  // Pasos del servidor (en tiempo real)
  validando,            // Paso 0: Validando datos en servidor
  obteniendo_orden,     // Paso 1: Obteniendo datos de la orden
  evidencias,           // Paso 2: Subiendo evidencias a Cloudinary
  firmas,               // Paso 3: Registrando firmas digitales
  actividades,          // Paso 3.5: Registrando actividades
  mediciones,           // Paso 3.6: Registrando mediciones
  generando_pdf,        // Paso 4: Generando PDF
  subiendo_pdf,         // Paso 5: Subiendo PDF a R2
  registrando_doc,      // Paso 6: Registrando documento en BD
  enviando_email,       // Paso 7: Enviando email
  actualizando_estado,  // Paso 8: Actualizando estado
  
  // Estados finales
  completado,           // Proceso terminado exitosamente
  error,                // Error en el proceso
}

/// Mapeo de strings del backend a SyncStep
SyncStep? syncStepFromBackend(String stepName) {
  const mapping = {
    'validando': SyncStep.validando,
    'obteniendo_orden': SyncStep.obteniendo_orden,
    'evidencias': SyncStep.evidencias,
    'firmas': SyncStep.firmas,
    'actividades': SyncStep.actividades,
    'mediciones': SyncStep.mediciones,
    'generando_pdf': SyncStep.generando_pdf,
    'subiendo_pdf': SyncStep.subiendo_pdf,
    'registrando_doc': SyncStep.registrando_doc,
    'enviando_email': SyncStep.enviando_email,
    'actualizando_estado': SyncStep.actualizando_estado,
    'completado': SyncStep.completado,
    'error': SyncStep.error,
  };
  return mapping[stepName];
}

/// Estado del progreso de sincronización
class SyncProgress {
  final SyncStep pasoActual;
  final Set<SyncStep> pasosCompletados;
  final String? mensajeError;
  final String? mensajeActual;
  final int? ordenId;
  final int porcentaje;
  
  const SyncProgress({
    this.pasoActual = SyncStep.preparando,
    this.pasosCompletados = const {},
    this.mensajeError,
    this.mensajeActual,
    this.ordenId,
    this.porcentaje = 0,
  });
  
  /// Crea un nuevo estado con un paso completado
  SyncProgress completarPaso(SyncStep paso, {String? mensaje, int? progreso}) {
    return SyncProgress(
      pasoActual: pasoActual,
      pasosCompletados: {...pasosCompletados, paso},
      mensajeError: mensajeError,
      mensajeActual: mensaje ?? mensajeActual,
      ordenId: ordenId,
      porcentaje: progreso ?? porcentaje,
    );
  }
  
  /// Crea un nuevo estado avanzando al siguiente paso
  SyncProgress avanzarA(SyncStep nuevoPaso, {String? mensaje, int? progreso}) {
    return SyncProgress(
      pasoActual: nuevoPaso,
      pasosCompletados: pasosCompletados,
      mensajeError: mensajeError,
      mensajeActual: mensaje ?? mensajeActual,
      ordenId: ordenId,
      porcentaje: progreso ?? porcentaje,
    );
  }
  
  /// Crea un nuevo estado con error
  SyncProgress conError(String mensaje) {
    return SyncProgress(
      pasoActual: SyncStep.error,
      pasosCompletados: pasosCompletados,
      mensajeError: mensaje,
      mensajeActual: mensaje,
      ordenId: ordenId,
      porcentaje: porcentaje,
    );
  }
  
  /// Crea un nuevo estado inicial para una orden
  SyncProgress paraOrden(int id) {
    return SyncProgress(
      pasoActual: SyncStep.preparando,
      pasosCompletados: {},
      mensajeError: null,
      mensajeActual: 'Preparando datos...',
      ordenId: id,
      porcentaje: 0,
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
      SyncStep.validando,
      SyncStep.obteniendo_orden,
      SyncStep.evidencias,
      SyncStep.firmas,
      SyncStep.actividades,
      SyncStep.generando_pdf,
      SyncStep.subiendo_pdf,
      SyncStep.registrando_doc,
      SyncStep.enviando_email,
      SyncStep.actualizando_estado,
    },
    ordenId: ordenId,
    porcentaje: 100,
    mensajeActual: '¡Completado!',
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
  
  /// Procesa un evento de progreso del backend (SSE)
  /// Este es el método principal para actualizar el estado desde eventos del servidor
  void procesarEventoBackend(Map<String, dynamic> evento) {
    final stepName = evento['step'] as String?;
    final status = evento['status'] as String?;
    final message = evento['message'] as String?;
    final progress = evento['progress'] as int? ?? 0;
    
    debugPrint('📡 [SSE] step=$stepName, status=$status, message=$message, progress=$progress');
    
    if (stepName == null || status == null) return;
    
    final step = syncStepFromBackend(stepName);
    if (step == null) {
      debugPrint('⚠️ [SSE] Step desconocido: $stepName');
      return;
    }
    
    if (status == 'in_progress') {
      // Paso en progreso - avanzar a este paso
      state = SyncProgress(
        pasoActual: step,
        pasosCompletados: state.pasosCompletados,
        mensajeActual: message,
        ordenId: state.ordenId,
        porcentaje: progress,
      );
    } else if (status == 'completed') {
      // Paso completado - marcar como completado
      final nuevosCompletados = {...state.pasosCompletados, step};
      state = SyncProgress(
        pasoActual: step,
        pasosCompletados: nuevosCompletados,
        mensajeActual: message,
        ordenId: state.ordenId,
        porcentaje: progress,
      );
    } else if (status == 'error') {
      // Error en el proceso
      state = state.conError(message ?? 'Error desconocido');
    }
  }
  
  /// Avanza al siguiente paso (para uso local, sin SSE)
  void avanzar(SyncStep nuevoPaso, {String? mensaje, int? progreso}) {
    debugPrint('✅ [PROGRESS] Avanzando a: $nuevoPaso');
    final pasosCompletos = {...state.pasosCompletados};
    if (state.pasoActual != SyncStep.preparando && 
        state.pasoActual != SyncStep.error) {
      pasosCompletos.add(state.pasoActual);
    }
    state = SyncProgress(
      pasoActual: nuevoPaso,
      pasosCompletados: pasosCompletos,
      mensajeActual: mensaje,
      ordenId: state.ordenId,
      porcentaje: progreso ?? state.porcentaje,
    );
  }
  
  /// Marca un paso específico como completado
  void completarPaso(SyncStep paso, {String? mensaje, int? progreso}) {
    debugPrint('✅ [PROGRESS] Paso completado: $paso');
    state = state.completarPaso(paso, mensaje: mensaje, progreso: progreso);
  }
  
  /// Marca el proceso como completado exitosamente
  void completar() {
    debugPrint('🎉 [PROGRESS] Sync completado exitosamente');
    state = SyncProgress.completadoExitoso(state.ordenId ?? 0);
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

/// Pasos visibles en la UI (agrupación simplificada para mejor UX)
/// Algunos pasos del backend se agrupan para no saturar la UI
List<SyncStep> get pasosVisibles => [
  SyncStep.preparando,
  SyncStep.validando,
  SyncStep.evidencias,
  SyncStep.firmas,
  SyncStep.generando_pdf,
  SyncStep.enviando_email,
  SyncStep.completado,
];

/// Extensión para obtener información visual de cada paso
extension SyncStepInfo on SyncStep {
  String get nombre {
    switch (this) {
      case SyncStep.preparando:
        return 'Preparando datos...';
      case SyncStep.validando:
        return 'Validando en servidor...';
      case SyncStep.obteniendo_orden:
        return 'Obteniendo orden...';
      case SyncStep.evidencias:
        return 'Subiendo evidencias...';
      case SyncStep.firmas:
        return 'Registrando firmas...';
      case SyncStep.actividades:
        return 'Registrando actividades...';
      case SyncStep.mediciones:
        return 'Registrando mediciones...';
      case SyncStep.generando_pdf:
        return 'Generando PDF...';
      case SyncStep.subiendo_pdf:
        return 'Guardando PDF...';
      case SyncStep.registrando_doc:
        return 'Registrando documento...';
      case SyncStep.enviando_email:
        return 'Enviando notificación...';
      case SyncStep.actualizando_estado:
        return 'Actualizando estado...';
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
      case SyncStep.validando:
        return 'Datos validados';
      case SyncStep.obteniendo_orden:
        return 'Orden cargada';
      case SyncStep.evidencias:
        return 'Evidencias subidas';
      case SyncStep.firmas:
        return 'Firmas registradas';
      case SyncStep.actividades:
        return 'Actividades registradas';
      case SyncStep.mediciones:
        return 'Mediciones registradas';
      case SyncStep.generando_pdf:
        return 'PDF generado';
      case SyncStep.subiendo_pdf:
        return 'PDF guardado';
      case SyncStep.registrando_doc:
        return 'Documento registrado';
      case SyncStep.enviando_email:
        return 'Notificación enviada';
      case SyncStep.actualizando_estado:
        return 'Estado actualizado';
      case SyncStep.completado:
        return '¡Completado!';
      case SyncStep.error:
        return 'Error';
    }
  }
  
  /// Indica si este paso debe mostrarse en la UI simplificada
  bool get esVisible => pasosVisibles.contains(this);
}
