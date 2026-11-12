/// Descubrimiento y verificación Zero-Trust de servidores Mekanos API.
///
/// Garantiza que la opción "Local" conecte al backend Mekanos real
/// independientemente de la IP DHCP actual de la PC servidora, probando:
/// 1. Rutas IP-independientes (USB `adb reverse` 127.0.0.1, Emulador 10.0.2.2,
///    mDNS `<hostname>.local`, y caché de la última sesión local exitosa).
/// 2. Escaneo paralelo TCP en puerto 3000 sobre las subredes Wi-Fi / LAN reales
///    del dispositivo, validando identidad mediante `GET /api/health`.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart' show debugPrint;
import 'package:shared_preferences/shared_preferences.dart';

import 'environment.dart';

/// Hash SHA-256 UTF-8 de la contraseña por defecto (`mekanos#qa`) para evitar
/// exponer credenciales en texto claro dentro del binario.
const String _defaultQaUnlockSha256 =
    'a7917ff099c2196829b89bb84d8bcb4a7a6944a8489038e1d235d2c39c3219d4';

const String _configuredQaUnlockSha256 = String.fromEnvironment(
  'MEKANOS_QA_PASS_SHA256',
  defaultValue: _defaultQaUnlockSha256,
);

/// Valida la contraseña de desbloqueo QA comparando su digest SHA-256
/// en tiempo constante.
bool verifyQaUnlockPassword(String password) {
  final actual = sha256Hex(password);
  final expected = _configuredQaUnlockSha256.toLowerCase();
  if (actual.length != expected.length) return false;
  var diff = 0;
  for (var i = 0; i < actual.length; i++) {
    diff |= actual.codeUnitAt(i) ^ expected.codeUnitAt(i);
  }
  return diff == 0;
}

/// Implementación pura en Dart de SHA-256 (FIPS 180-4) sin dependencias extra.
String sha256Hex(String input) {
  const k = <int>[
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  final h = <int>[
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  int rotr(int x, int n) => ((x & 0xffffffff) >>> n) | ((x << (32 - n)) & 0xffffffff);

  final bytes = List<int>.from(utf8.encode(input));
  final bitLen = bytes.length * 8;
  bytes.add(0x80);
  while ((bytes.length % 64) != 56) {
    bytes.add(0);
  }
  for (var shift = 56; shift >= 0; shift -= 8) {
    bytes.add((bitLen >> shift) & 0xff);
  }

  final w = List<int>.filled(64, 0);
  for (var offset = 0; offset < bytes.length; offset += 64) {
    for (var i = 0; i < 16; i++) {
      final idx = offset + i * 4;
      w[i] = ((bytes[idx] << 24) |
              (bytes[idx + 1] << 16) |
              (bytes[idx + 2] << 8) |
              bytes[idx + 3]) &
          0xffffffff;
    }
    for (var i = 16; i < 64; i++) {
      final s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ ((w[i - 15] & 0xffffffff) >>> 3);
      final s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ ((w[i - 2] & 0xffffffff) >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) & 0xffffffff;
    }

    var a = h[0], b = h[1], c = h[2], d = h[3];
    var e = h[4], f = h[5], g = h[6], hh = h[7];

    for (var i = 0; i < 64; i++) {
      final s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      final ch = (e & f) ^ ((~e) & g);
      final temp1 = (hh + s1 + ch + k[i] + w[i]) & 0xffffffff;
      final s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      final maj = (a & b) ^ (a & c) ^ (b & c);
      final temp2 = (s0 + maj) & 0xffffffff;

      hh = g;
      g = f;
      f = e;
      e = (d + temp1) & 0xffffffff;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) & 0xffffffff;
    }

    h[0] = (h[0] + a) & 0xffffffff;
    h[1] = (h[1] + b) & 0xffffffff;
    h[2] = (h[2] + c) & 0xffffffff;
    h[3] = (h[3] + d) & 0xffffffff;
    h[4] = (h[4] + e) & 0xffffffff;
    h[5] = (h[5] + f) & 0xffffffff;
    h[6] = (h[6] + g) & 0xffffffff;
    h[7] = (h[7] + hh) & 0xffffffff;
  }

  final buffer = StringBuffer();
  for (final word in h) {
    buffer.write(word.toRadixString(16).padLeft(8, '0'));
  }
  return buffer.toString();
}

/// Servidor Mekanos API verificado mediante respuesta auténtica de `/api/health`.
class VerifiedMekanosServer {
  final String baseUrl;
  final String originLabel;
  final String? hostname;
  final String? environment;
  final String? commit;
  final String? version;
  final int latencyMs;

  const VerifiedMekanosServer({
    required this.baseUrl,
    required this.originLabel,
    required this.latencyMs,
    this.hostname,
    this.environment,
    this.commit,
    this.version,
  });

  /// Valida que el payload JSON corresponda inequívocamente a Mekanos API.
  static VerifiedMekanosServer? tryFromHealthJson(
    dynamic data, {
    required String baseUrl,
    required String originLabel,
    required int latencyMs,
  }) {
    if (data is! Map) return null;

    final status = (data['status']?.toString() ?? '').toLowerCase().trim();
    if (status != 'ok' && status != 'healthy') return null;

    final service = (data['service']?.toString() ?? '').trim();
    final app = (data['app']?.toString() ?? '').trim();
    final hasExplicitIdentity = service.isNotEmpty || app.isNotEmpty;

    if (hasExplicitIdentity) {
      if (service != 'Mekanos API' && app != 'mekanos-api') {
        return null;
      }
    } else {
      // Compatibilidad con deploys anteriores de Producción que solo exponían
      // el contrato de AppService.getHealth (database + commit + environment).
      final db = (data['database']?.toString() ?? '').trim().toLowerCase();
      final commit = _nonEmpty(data['commit']);
      final env = _nonEmpty(data['environment']);
      if ((db != 'connected' && db != 'disconnected') ||
          commit == null ||
          env == null) {
        return null;
      }
    }

    return VerifiedMekanosServer(
      baseUrl: baseUrl,
      originLabel: originLabel,
      hostname: _nonEmpty(data['hostname']),
      environment: _nonEmpty(data['environment']),
      commit: _nonEmpty(data['commit']),
      version: _nonEmpty(data['version']),
      latencyMs: latencyMs,
    );
  }

  static String? _nonEmpty(Object? val) {
    final s = val?.toString().trim();
    return (s != null && s.isNotEmpty) ? s : null;
  }
}

class LocalApiDiscovery {
  LocalApiDiscovery._();

  static const String _prefLastLocalUrl = 'qa_last_verified_local_api_url';
  static const String _prefLastLocalHost = 'qa_last_verified_local_hostname';

  /// Verifica un endpoint puntual vía `GET <baseUrl>/health` sin interceptores.
  static Future<VerifiedMekanosServer?> verifyHealth(
    String rawBaseUrl, {
    String originLabel = 'Verificación directa',
    Duration timeout = const Duration(seconds: 3),
  }) async {
    final normalized = Environment.normalizeApiBaseUrl(rawBaseUrl);
    if (normalized == null) return null;

    final dio = Dio(
      BaseOptions(
        connectTimeout: timeout,
        receiveTimeout: timeout,
        sendTimeout: timeout,
        validateStatus: (code) => code != null && code < 500,
      ),
    );

    final sw = Stopwatch()..start();
    try {
      final response = await dio.get('$normalized/health');
      sw.stop();
      if (response.statusCode != 200) return null;
      return VerifiedMekanosServer.tryFromHealthJson(
        response.data,
        baseUrl: normalized,
        originLabel: originLabel,
        latencyMs: sw.elapsedMilliseconds,
      );
    } catch (_) {
      return null;
    } finally {
      dio.close(force: true);
    }
  }

  /// Guarda pista de último servidor local verificado (solo aceleración de sonda).
  static Future<void> rememberLocalServer(VerifiedMekanosServer server) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_prefLastLocalUrl, server.baseUrl);
      if (server.hostname != null) {
        await prefs.setString(_prefLastLocalHost, server.hostname!);
      }
    } catch (_) {}
  }

  /// Descubre servidores Mekanos API locales activos independiente de la IP actual.
  static Future<List<VerifiedMekanosServer>> discoverLocalServers({
    int port = Environment.localPort,
    void Function(String status)? onProgress,
  }) async {
    final int targetPort = port;
    final found = <String, VerifiedMekanosServer>{};
    final alreadyProbedHosts = <String>{};

    void recordResult(VerifiedMekanosServer? srv) {
      if (srv == null) return;
      final existing = found[srv.baseUrl];
      if (existing == null || srv.latencyMs < existing.latencyMs) {
        found[srv.baseUrl] = srv;
      }
    }

    onProgress?.call('Probando rutas locales rápidas (USB / Emulador / Caché)...');

    String? cachedUrl;
    String? cachedHostname;
    try {
      final prefs = await SharedPreferences.getInstance();
      cachedUrl = prefs.getString(_prefLastLocalUrl);
      cachedHostname = prefs.getString(_prefLastLocalHost);
    } catch (_) {}

    final fastCandidates = <MapEntry<String, String>>[
      MapEntry('http://127.0.0.1:$targetPort/api', 'USB / Localhost (adb reverse)'),
      MapEntry('http://localhost:$targetPort/api', 'Localhost'),
      if (Platform.isAndroid)
        MapEntry('http://10.0.2.2:$targetPort/api', 'Emulador Android'),
      if (cachedUrl != null && cachedUrl.isNotEmpty)
        MapEntry(cachedUrl, 'Última IP local usada'),
    ];

    // Intentar resolver nombre de host previo vía mDNS local (<PC>.local)
    if (cachedHostname != null && cachedHostname.isNotEmpty) {
      try {
        final addrs = await InternetAddress.lookup(
          '$cachedHostname.local',
          type: InternetAddressType.IPv4,
        ).timeout(const Duration(milliseconds: 700));
        for (final addr in addrs) {
          fastCandidates.add(
            MapEntry(
              'http://${addr.address}:$targetPort/api',
              'mDNS ($cachedHostname.local)',
            ),
          );
        }
      } catch (_) {}
    }

    for (final c in fastCandidates) {
      final uri = Uri.tryParse(c.key);
      if (uri != null && uri.host.isNotEmpty) {
        alreadyProbedHosts.add(uri.host);
      }
    }

    final fastResults = await Future.wait(
      fastCandidates.map(
        (c) => verifyHealth(
          c.key,
          originLabel: c.value,
          timeout: const Duration(milliseconds: 1100),
        ),
      ),
    );
    for (final res in fastResults) {
      recordResult(res);
    }

    // Fase 2: barrido de subredes Wi-Fi / Ethernet locales reales del dispositivo
    onProgress?.call('Escaneando red Wi-Fi local (puerto $targetPort)...');
    final subnetTargets = await _collectLocalSubnetTargets();

    for (final target in subnetTargets) {
      final prefix = target.subnetPrefix;
      final candidateIps = <String>[];
      for (var host = 1; host <= 254; host++) {
        final ip = '$prefix.$host';
        if (ip == target.deviceIp || alreadyProbedHosts.contains(ip)) continue;
        alreadyProbedHosts.add(ip);
        candidateIps.add(ip);
      }

      // Barrido TCP rápido en lotes de 48 sockets (máx ~2s por subred /24)
      final openIps = <String>[];
      const batchSize = 48;
      for (var i = 0; i < candidateIps.length; i += batchSize) {
        final end = (i + batchSize > candidateIps.length)
            ? candidateIps.length
            : i + batchSize;
        final batch = candidateIps.sublist(i, end);
        final results = await Future.wait(
          batch.map((ip) => _isTcpPortOpen(ip, targetPort)),
        );
        for (var j = 0; j < batch.length; j++) {
          if (results[j]) openIps.add(batch[j]);
        }
      }

      if (openIps.isNotEmpty) {
        onProgress?.call('Verificando identidad Mekanos API (${openIps.length})...');
        final verified = await Future.wait(
          openIps.map(
            (ip) => verifyHealth(
              'http://$ip:$targetPort/api',
              originLabel: 'Wi-Fi / LAN (${target.interfaceName})',
              timeout: const Duration(milliseconds: 1500),
            ),
          ),
        );
        for (final srv in verified) {
          recordResult(srv);
        }
      }
    }

    final list = found.values.toList();
    list.sort((a, b) => a.latencyMs.compareTo(b.latencyMs));
    debugPrint('🔎 [Discovery] Encontrados ${list.length} servidor(es) Mekanos local(es)');
    return list;
  }

  /// Re-descubre automáticamente el mejor servidor local ante cambio de IP DHCP.
  static Future<VerifiedMekanosServer?> rediscoverBestLocal({
    String? previousHostname,
  }) async {
    final servers = await discoverLocalServers();
    if (servers.isEmpty) return null;

    if (previousHostname != null && previousHostname.isNotEmpty) {
      for (final s in servers) {
        if (s.hostname == previousHostname) {
          await rememberLocalServer(s);
          return s;
        }
      }
    }

    await rememberLocalServer(servers.first);
    return servers.first;
  }

  static Future<bool> _isTcpPortOpen(String host, int port) async {
    Socket? socket;
    try {
      socket = await Socket.connect(
        host,
        port,
        timeout: const Duration(milliseconds: 350),
      );
      return true;
    } catch (_) {
      return false;
    } finally {
      try {
        socket?.destroy();
      } catch (_) {}
    }
  }

  static Future<List<_SubnetTarget>> _collectLocalSubnetTargets() async {
    final targets = <_SubnetTarget>[];
    final seenPrefixes = <String>{};

    try {
      final interfaces = await NetworkInterface.list(
        type: InternetAddressType.IPv4,
        includeLoopback: false,
        includeLinkLocal: false,
      );

      // Priorizar Wi-Fi / Ethernet sobre interfaces celulares o virtuales
      interfaces.sort((a, b) {
        final sa = _interfacePriority(a.name);
        final sb = _interfacePriority(b.name);
        return sa.compareTo(sb);
      });

      for (final iface in interfaces) {
        final lowerName = iface.name.toLowerCase();
        // Omitir interfaces móviles celulares o VPN carrier que nunca alojan la PC dev
        if (lowerName.startsWith('rmnet') ||
            lowerName.startsWith('ccmni') ||
            lowerName.startsWith('pdp') ||
            lowerName.startsWith('tun')) {
          continue;
        }

        for (final addr in iface.addresses) {
          final ip = addr.address;
          if (!_isScannablePrivateIpv4(ip)) continue;
          final parts = ip.split('.');
          if (parts.length != 4) continue;
          final prefix = '${parts[0]}.${parts[1]}.${parts[2]}';
          if (seenPrefixes.add(prefix)) {
            targets.add(
              _SubnetTarget(
                interfaceName: iface.name,
                deviceIp: ip,
                subnetPrefix: prefix,
              ),
            );
          }
        }
      }
    } catch (e) {
      debugPrint('⚠️ [Discovery] Error leyendo interfaces de red: $e');
    }

    return targets.take(2).toList();
  }

  static int _interfacePriority(String name) {
    final n = name.toLowerCase();
    if (n.contains('wlan') || n.contains('wi-fi') || n.contains('wifi') || n == 'en0') {
      return 0;
    }
    if (n.contains('eth') || n.contains('en')) return 1;
    return 2;
  }

  static bool _isScannablePrivateIpv4(String ip) {
    final parts = ip.split('.').map(int.tryParse).toList();
    if (parts.length != 4 || parts.any((p) => p == null)) return false;
    final a = parts[0]!;
    final b = parts[1]!;

    // Excluir loopback 127.*, link-local 169.254.*, y red interna emulador 10.0.2.*
    if (a == 127 || (a == 169 && b == 254)) return false;
    if (a == 10 && b == 0 && parts[2] == 2) return false;

    return (a == 192 && b == 168) ||
        a == 10 ||
        (a == 172 && b >= 16 && b <= 31);
  }
}

class _SubnetTarget {
  final String interfaceName;
  final String deviceIp;
  final String subnetPrefix;

  const _SubnetTarget({
    required this.interfaceName,
    required this.deviceIp,
    required this.subnetPrefix,
  });
}
