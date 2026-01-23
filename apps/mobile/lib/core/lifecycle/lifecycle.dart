/// Módulo de Ciclo de Vida de Datos - MEKANOS MOBILE
///
/// Este módulo implementa la estrategia inteligente de gestión de datos
/// para mantener la app rápida, ligera y predecible.
///
/// Componentes:
/// - [DataLifecycleManager]: Lógica de purga y retención de datos
/// - [AppLifecycleObserver]: Integración con eventos del sistema
///
/// Uso básico:
/// ```dart
/// // En main.dart, envolver MaterialApp con LifecycleObserverWrapper
/// LifecycleObserverWrapper(
///   child: MaterialApp(...),
/// )
///
/// // Después de sync exitoso
/// ref.read(appLifecycleObserverProvider).onPostSyncExitoso();
///
/// // Limpieza manual desde configuración
/// final resultado = await ref.read(appLifecycleObserverProvider).ejecutarLimpiezaManual();
/// ```
library;

export 'app_lifecycle_observer.dart';
export 'data_lifecycle_manager.dart';
