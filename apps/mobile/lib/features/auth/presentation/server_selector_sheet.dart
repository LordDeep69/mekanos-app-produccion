/// Gesto secreto de precisión (5 toques + 6º toque sostenido ≥ 5s),
/// validación con contraseña y selector de entorno API en tiempo de ejecución.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/environment.dart';
import '../../../core/config/local_api_discovery.dart';
import '../../../core/database/database_service.dart';
import '../../../core/storage/secure_storage.dart';
import '../data/auth_provider.dart';

/// Detector de gesto de alta precisión basado en eventos crudos de puntero:
/// requiere exactamente [requiredTaps] toques breves consecutivos seguidos de
/// un toque final sostenido de forma continua durante al menos [holdDuration].
///
/// No emite pistas visuales antes de completar el desbloqueo ni entra en conflicto
/// con el Arena de gestos del `SingleChildScrollView` padre.
class SecretEnvironmentGesture extends StatefulWidget {
  final Widget child;
  final VoidCallback onUnlocked;
  final int requiredTaps;
  final Duration holdDuration;
  final DateTime Function()? clock;

  const SecretEnvironmentGesture({
    super.key,
    required this.child,
    required this.onUnlocked,
    this.requiredTaps = 5,
    this.holdDuration = const Duration(seconds: 5),
    this.clock,
  });

  @override
  State<SecretEnvironmentGesture> createState() =>
      _SecretEnvironmentGestureState();
}

class _SecretEnvironmentGestureState extends State<SecretEnvironmentGesture> {
  static const Duration _maxTapDuration = Duration(milliseconds: 700);
  static const Duration _maxGapBetweenTaps = Duration(milliseconds: 2500);
  static const Duration _maxGapBeforeHold = Duration(milliseconds: 3000);
  static const double _moveTolerancePx = 24.0;

  int _tapCount = 0;
  DateTime? _lastTapUpAt;
  int? _activePointer;
  Offset? _downPosition;
  DateTime? _pointerDownAt;
  Timer? _holdTimer;

  DateTime _now() => widget.clock?.call() ?? DateTime.now();

  @override
  void dispose() {
    _holdTimer?.cancel();
    super.dispose();
  }

  void _reset() {
    _holdTimer?.cancel();
    _holdTimer = null;
    _tapCount = 0;
    _lastTapUpAt = null;
    _activePointer = null;
    _downPosition = null;
    _pointerDownAt = null;
  }

  void _onPointerDown(PointerDownEvent event) {
    // Ignorar toques simultáneos si ya hay un puntero rastreado
    if (_activePointer != null) {
      _reset();
      return;
    }

    final now = _now();
    if (_tapCount == widget.requiredTaps) {
      if (_lastTapUpAt == null ||
          now.difference(_lastTapUpAt!) > _maxGapBeforeHold) {
        _reset();
      }
    } else if (_tapCount > 0) {
      if (_lastTapUpAt == null ||
          now.difference(_lastTapUpAt!) > _maxGapBetweenTaps) {
        _reset();
      }
    }

    _activePointer = event.pointer;
    _downPosition = event.position;
    _pointerDownAt = now;

    if (_tapCount == widget.requiredTaps) {
      _holdTimer?.cancel();
      _holdTimer = Timer(widget.holdDuration, _completeUnlock);
    }
  }

  void _onPointerMove(PointerMoveEvent event) {
    if (event.pointer != _activePointer || _downPosition == null) return;
    if ((event.position - _downPosition!).distance > _moveTolerancePx) {
      _reset();
    }
  }

  void _onPointerUp(PointerUpEvent event) {
    if (event.pointer != _activePointer) return;

    final elapsed = _pointerDownAt != null
        ? _now().difference(_pointerDownAt!)
        : Duration.zero;

    // Si estaba en el toque sostenido final, soltar antes de cumplirse el timer cancela el desbloqueo
    if (_tapCount >= widget.requiredTaps) {
      _reset();
      return;
    }

    if (elapsed <= _maxTapDuration) {
      _tapCount += 1;
      _lastTapUpAt = _now();
      _activePointer = null;
      _downPosition = null;
      _pointerDownAt = null;
    } else {
      _reset();
    }
  }

  void _onPointerCancel(PointerCancelEvent event) {
    if (event.pointer == _activePointer) {
      _reset();
    }
  }

  void _completeUnlock() {
    if (!mounted) return;
    _reset();
    HapticFeedback.mediumImpact();
    widget.onUnlocked();
  }

  @override
  Widget build(BuildContext context) {
    return Listener(
      behavior: HitTestBehavior.opaque,
      onPointerDown: _onPointerDown,
      onPointerMove: _onPointerMove,
      onPointerUp: _onPointerUp,
      onPointerCancel: _onPointerCancel,
      child: widget.child,
    );
  }
}

/// Solicita la contraseña de autorización QA y, si es válida, abre el selector
/// de servidor API en tiempo de ejecución.
Future<void> showQaPasswordAndServerSelector(
  BuildContext context,
  WidgetRef ref,
) async {
  final unlocked = await showDialog<bool>(
    context: context,
    barrierDismissible: true,
    builder: (ctx) => const _QaPasswordDialog(),
  );

  if (unlocked != true || !context.mounted) return;

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => const ServerSelectorSheet(),
  );
}

class _QaPasswordDialog extends StatefulWidget {
  const _QaPasswordDialog();

  @override
  State<_QaPasswordDialog> createState() => _QaPasswordDialogState();
}

class _QaPasswordDialogState extends State<_QaPasswordDialog> {
  final TextEditingController _controller = TextEditingController();
  bool _obscure = true;
  String? _errorText;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _submit() {
    final value = _controller.text;
    if (verifyQaUnlockPassword(value)) {
      Navigator.of(context).pop(true);
      return;
    }
    setState(() {
      _errorText = 'Contraseña incorrecta.';
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.verified_user_outlined, color: Colors.blue),
          SizedBox(width: 8),
          Expanded(
            child: Text(
              'Selector de API',
              style: TextStyle(fontSize: 18),
            ),
          ),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Ingresa la clave de autorización para conmutar el endpoint de esta sesión.',
            style: TextStyle(fontSize: 13, color: Colors.black87),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            obscureText: _obscure,
            autofocus: true,
            onSubmitted: (_) => _submit(),
            onChanged: (_) {
              if (_errorText != null) {
                setState(() => _errorText = null);
              }
            },
            decoration: InputDecoration(
              labelText: 'Contraseña',
              errorText: _errorText,
              border: const OutlineInputBorder(),
              suffixIcon: IconButton(
                icon: Icon(
                  _obscure ? Icons.visibility : Icons.visibility_off,
                ),
                onPressed: () => setState(() => _obscure = !_obscure),
              ),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('Cancelar'),
        ),
        ElevatedButton(
          onPressed: _submit,
          child: const Text('Desbloquear'),
        ),
      ],
    );
  }
}

class ServerSelectorSheet extends ConsumerStatefulWidget {
  const ServerSelectorSheet({super.key});

  @override
  ConsumerState<ServerSelectorSheet> createState() =>
      _ServerSelectorSheetState();
}

class _ServerSelectorSheetState extends ConsumerState<ServerSelectorSheet> {
  late final TextEditingController _customUrlController;

  bool _scanningLocal = false;
  String _scanStatus = '';
  List<VerifiedMekanosServer> _localServers = const [];

  bool _verifyingCustom = false;
  VerifiedMekanosServer? _verifiedCustomServer;
  String? _customError;

  @override
  void initState() {
    super.initState();
    final current = Environment.currentState;
    _customUrlController = TextEditingController(
      text: current.mode == ApiEnvironmentMode.custom ? current.baseUrl : '',
    );
    _runLocalDiscovery();
  }

  @override
  void dispose() {
    _customUrlController.dispose();
    super.dispose();
  }

  Future<void> _runLocalDiscovery() async {
    if (_scanningLocal) return;
    setState(() {
      _scanningLocal = true;
      _scanStatus = 'Iniciando descubrimiento en red local...';
    });

    final results = await LocalApiDiscovery.discoverLocalServers(
      onProgress: (msg) {
        if (mounted) {
          setState(() => _scanStatus = msg);
        }
      },
    );

    if (!mounted) return;
    setState(() {
      _scanningLocal = false;
      _localServers = results;
      _scanStatus = results.isEmpty
          ? 'No se detectó ningún backend Mekanos activo en puerto ${Environment.localPort}.'
          : 'Se detectaron ${results.length} servidor(es) Mekanos verificado(s).';
    });
  }

  Future<void> _verifyCustomUrl() async {
    final normalized = Environment.normalizeApiBaseUrl(_customUrlController.text);
    if (normalized == null) {
      setState(() {
        _verifiedCustomServer = null;
        _customError =
            'Ingresa una URL válida (ej: http://192.168.1.2:3000 o https://...)';
      });
      return;
    }

    setState(() {
      _verifyingCustom = true;
      _verifiedCustomServer = null;
      _customError = null;
    });

    final verified = await LocalApiDiscovery.verifyHealth(
      normalized,
      originLabel: 'URL Directa',
      timeout: const Duration(seconds: 4),
    );

    if (!mounted) return;
    setState(() {
      _verifyingCustom = false;
      _verifiedCustomServer = verified;
      if (verified == null) {
        _customError =
            'No respondió como Mekanos API en $normalized/health.';
      }
    });
  }

  Future<bool> _confirmSwitchIfPendingSync(String nextUrl) async {
    if (Environment.apiBaseUrl == nextUrl) return true;

    try {
      final db = ref.read(databaseProvider);
      final ordenes = await db.getAllOrdenes();
      final estados = await db.getAllEstadosOrden();
      final porSubirIds = <int>{};
      for (final e in estados) {
        if (e.codigo == 'POR_SUBIR') porSubirIds.add(e.id);
      }
      final pendientes = ordenes
          .where((o) => porSubirIds.contains(o.idEstado) || o.isDirty)
          .length;
      if (pendientes == 0 || !mounted) return true;

      final proceed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Órdenes pendientes sin subir'),
          content: Text(
            'Hay $pendientes orden(es) local(es) pendientes de sincronizar en este dispositivo.\n\n'
            'Cambiar de servidor cerrará la sesión vigente. ¿Deseas continuar?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Cambiar de servidor'),
            ),
          ],
        ),
      );
      return proceed == true;
    } catch (_) {
      return true;
    }
  }

  Future<void> _clearTokensIfTargetChanged(String previousUrl, String nextUrl) async {
    if (previousUrl != nextUrl) {
      await ref.read(secureStorageProvider).clearAll();
      ref.read(authStateProvider.notifier).clearError();
    }
  }

  Future<void> _selectProduction() async {
    final prev = Environment.apiBaseUrl;
    if (!await _confirmSwitchIfPendingSync(Environment.productionApiUrl)) return;
    Environment.useProduction();
    await _clearTokensIfTargetChanged(prev, Environment.apiBaseUrl);
    if (!mounted) return;
    Navigator.of(context).pop();
    _showSnack('Conectado a Producción (${Environment.apiBaseUrl})', Colors.blue);
  }

  Future<void> _selectLocalServer(VerifiedMekanosServer server) async {
    final prev = Environment.apiBaseUrl;
    if (!await _confirmSwitchIfPendingSync(server.baseUrl)) return;
    await LocalApiDiscovery.rememberLocalServer(server);
    Environment.setLocalApiUrl(
      server.baseUrl,
      hostname: server.hostname,
      serverEnvironment: server.environment,
      commit: server.commit,
      originLabel: server.originLabel,
    );
    await _clearTokensIfTargetChanged(prev, Environment.apiBaseUrl);
    if (!mounted) return;
    Navigator.of(context).pop();
    _showSnack(
      'Modo Local activo: ${server.baseUrl}${server.hostname != null ? ' (${server.hostname})' : ''}',
      Colors.amber.shade800,
    );
  }

  Future<void> _applyCustomUrl() async {
    final normalized = Environment.normalizeApiBaseUrl(_customUrlController.text);
    if (normalized == null) {
      setState(() {
        _customError = 'URL inválida. Verifica el formato e intenta de nuevo.';
      });
      return;
    }

    var verified = _verifiedCustomServer;
    if (verified == null || verified.baseUrl != normalized) {
      setState(() {
        _verifyingCustom = true;
        _customError = null;
      });
      verified = await LocalApiDiscovery.verifyHealth(
        normalized,
        originLabel: 'URL Directa',
        timeout: const Duration(seconds: 4),
      );
      if (!mounted) return;
      setState(() {
        _verifyingCustom = false;
        _verifiedCustomServer = verified;
      });
    }

    if (verified == null) {
      final forceApply = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('No se pudo verificar /health'),
          content: Text(
            'El endpoint $normalized no respondió como "Mekanos API".\n\n'
            '¿Deseas aplicarlo igualmente solo para esta sesión?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Aplicar de todos modos'),
            ),
          ],
        ),
      );
      if (forceApply != true || !mounted) return;
    }

    if (!await _confirmSwitchIfPendingSync(normalized) || !mounted) return;

    final prev = Environment.apiBaseUrl;
    Environment.setCustomApiUrl(
      normalized,
      hostname: verified?.hostname,
      serverEnvironment: verified?.environment,
      commit: verified?.commit,
    );
    await _clearTokensIfTargetChanged(prev, Environment.apiBaseUrl);
    if (!mounted) return;
    Navigator.of(context).pop();
    _showSnack('URL directa activa: ${Environment.apiBaseUrl}', Colors.deepPurple);
  }

  void _showSnack(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        duration: const Duration(seconds: 4),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final activeState = Environment.currentState;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.fromLTRB(16, 12, 16, 16 + bottomInset),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Row(
              children: [
                const Icon(Icons.dns_outlined, color: Colors.blue),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Configuración de Servidor API (Solo Sesión Actual)',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Text(
              'Al reiniciar la app siempre volverá automáticamente a Producción.',
              style: TextStyle(fontSize: 12, color: Colors.black54),
            ),
            const SizedBox(height: 12),

            // 1. Producción
            Card(
              elevation: 0,
              color: activeState.isProduction
                  ? Colors.blue.shade50
                  : Colors.grey.shade50,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(
                  color: activeState.isProduction
                      ? Colors.blue
                      : Colors.grey.shade300,
                ),
              ),
              child: ListTile(
                leading: const Icon(Icons.cloud_done, color: Colors.blue),
                title: const Text(
                  'Producción (Permanente)',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  Environment.productionApiUrl,
                  style: const TextStyle(fontSize: 12),
                ),
                trailing: activeState.isProduction
                    ? const Chip(label: Text('Activo'))
                    : FilledButton.tonal(
                        onPressed: _selectProduction,
                        child: const Text('Usar'),
                      ),
              ),
            ),
            const SizedBox(height: 12),

            // 2. Descubrimiento Local IP-Agnóstico
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.amber.shade50.withValues(alpha: 0.45),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: activeState.mode == ApiEnvironmentMode.local
                      ? Colors.amber.shade700
                      : Colors.amber.shade200,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      Icon(Icons.wifi_find, color: Colors.amber.shade800),
                      const SizedBox(width: 8),
                      const Expanded(
                        child: Text(
                          'API Local (Auto-detección independiente de IP)',
                          style: TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _scanningLocal ? null : _runLocalDiscovery,
                        icon: _scanningLocal
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Icon(Icons.refresh, size: 18),
                        label: Text(_scanningLocal ? 'Buscando' : 'Escanear'),
                      ),
                    ],
                  ),
                  Text(
                    _scanStatus,
                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                  ),
                  if (_localServers.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    ..._localServers.map((srv) {
                      final isSelected = activeState.baseUrl == srv.baseUrl;
                      return Card(
                        margin: const EdgeInsets.only(top: 6),
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                          side: BorderSide(
                            color: isSelected
                                ? Colors.amber.shade800
                                : Colors.grey.shade300,
                          ),
                        ),
                        child: ListTile(
                          dense: true,
                          title: Text(
                            srv.hostname != null
                                ? '${srv.hostname} • ${srv.originLabel}'
                                : srv.originLabel,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                          ),
                          subtitle: Text(
                            '${srv.baseUrl}\n'
                            'Entorno: ${srv.environment ?? 'local'}'
                            '${srv.commit != null ? ' • commit ${srv.commit}' : ''}'
                            ' • ${srv.latencyMs}ms',
                            style: const TextStyle(fontSize: 11),
                          ),
                          isThreeLine: true,
                          trailing: isSelected
                              ? const Chip(label: Text('Activo'))
                              : ElevatedButton(
                                  onPressed: () => _selectLocalServer(srv),
                                  child: const Text('Usar'),
                                ),
                        ),
                      );
                    }),
                  ] else if (!_scanningLocal) ...[
                    const SizedBox(height: 6),
                    const Text(
                      'Verifica que el API corra en puerto 3000, que el celular esté en el mismo Wi-Fi (o con `adb reverse tcp:3000 tcp:3000`) y que el Firewall de Windows permita conexiones entrantes.',
                      style: TextStyle(fontSize: 11, color: Colors.black54),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),

            // 3. URL Directa de la API
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: activeState.mode == ApiEnvironmentMode.custom
                      ? Colors.deepPurple
                      : Colors.grey.shade300,
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.link, color: Colors.deepPurple),
                      SizedBox(width: 8),
                      Text(
                        'URL Directa de la API',
                        style: TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _customUrlController,
                    keyboardType: TextInputType.url,
                    decoration: InputDecoration(
                      labelText: 'URL base del backend',
                      hintText: 'Ej: 192.168.1.2:3000 o https://dev-api.ejemplo.com',
                      errorText: _customError,
                      border: const OutlineInputBorder(),
                      isDense: true,
                    ),
                  ),
                  if (_verifiedCustomServer != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      '✅ Verificado: ${_verifiedCustomServer!.baseUrl}'
                      '${_verifiedCustomServer!.hostname != null ? ' (${_verifiedCustomServer!.hostname})' : ''}'
                      ' • ${_verifiedCustomServer!.latencyMs}ms',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.green.shade800,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _verifyingCustom ? null : _verifyCustomUrl,
                          icon: _verifyingCustom
                              ? const SizedBox(
                                  width: 14,
                                  height: 14,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : const Icon(Icons.health_and_safety_outlined),
                          label: const Text('Probar /health'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _verifyingCustom ? null : _applyCustomUrl,
                          child: const Text('Aplicar URL'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
