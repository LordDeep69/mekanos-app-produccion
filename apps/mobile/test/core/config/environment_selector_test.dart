import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mekanos_mobile/core/config/environment.dart';
import 'package:mekanos_mobile/core/config/local_api_discovery.dart';
import 'package:mekanos_mobile/features/auth/presentation/server_selector_sheet.dart';

void main() {
  group('Environment & LocalApiDiscovery', () {
    tearDown(() {
      Environment.useProduction();
    });

    test('arranca y vuelve permanentemente a Producción por defecto', () {
      expect(Environment.isProductionActive, isTrue);
      expect(Environment.apiBaseUrl, 'https://api.mekanosapp.dpdns.org/api');

      Environment.setLocalApiUrl(
        'http://192.168.1.2:3000/api',
        hostname: 'PC-QA',
        originLabel: 'Wi-Fi',
      );
      expect(Environment.isProductionActive, isFalse);
      expect(Environment.apiBaseUrl, 'http://192.168.1.2:3000/api');

      Environment.useProduction();
      expect(Environment.isProductionActive, isTrue);
      expect(Environment.apiBaseUrl, 'https://api.mekanosapp.dpdns.org/api');
    });

    test('normaliza URLs directas con o sin esquema ni sufijo /api', () {
      expect(
        Environment.normalizeApiBaseUrl('192.168.1.2:3000'),
        'http://192.168.1.2:3000/api',
      );
      expect(
        Environment.normalizeApiBaseUrl('http://192.168.1.2:3000/'),
        'http://192.168.1.2:3000/api',
      );
      expect(
        Environment.normalizeApiBaseUrl('https://dev.mekanos.com/api/health'),
        'https://dev.mekanos.com/api',
      );
      expect(
        Environment.normalizeApiBaseUrl('https://dev.mekanos.com/api/'),
        'https://dev.mekanos.com/api',
      );
      expect(
        Environment.normalizeApiBaseUrl('HTTP://192.168.1.2:3000'),
        'http://192.168.1.2:3000/api',
      );
      expect(Environment.normalizeApiBaseUrl('   '), isNull);
      expect(Environment.normalizeApiBaseUrl('http://192.168.1.2 3000'), isNull);
      expect(Environment.normalizeApiBaseUrl('ftp://192.168.1.2'), isNull);
    });

    test('sha256Hex y verifyQaUnlockPassword validan exactamente mekanos#qa', () {
      // Vector estándar FIPS 180-4 para "" y "abc"
      expect(
        sha256Hex(''),
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      );
      expect(
        sha256Hex('abc'),
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      );

      expect(verifyQaUnlockPassword('mekanos#qa'), isTrue);
      expect(verifyQaUnlockPassword('mekanos'), isFalse);
      expect(verifyQaUnlockPassword('MEKANOS#QA'), isFalse);
      expect(verifyQaUnlockPassword('mekanos#qa '), isFalse);
      expect(verifyQaUnlockPassword(''), isFalse);
    });

    test('VerifiedMekanosServer acepta solo identidad auténtica Mekanos API', () {
      final authentic = VerifiedMekanosServer.tryFromHealthJson(
        {
          'status': 'ok',
          'service': 'Mekanos API',
          'app': 'mekanos-api',
          'hostname': 'PC-TALLER',
          'environment': 'development',
          'commit': 'abc1234',
        },
        baseUrl: 'http://192.168.1.2:3000/api',
        originLabel: 'Wi-Fi Local',
        latencyMs: 12,
      );
      expect(authentic, isNotNull);
      expect(authentic!.hostname, 'PC-TALLER');
      expect(authentic.environment, 'development');

      final legacyProd = VerifiedMekanosServer.tryFromHealthJson(
        {
          'status': 'ok',
          'commit': '1295cec',
          'database': 'connected',
          'environment': 'production',
        },
        baseUrl: 'https://api.mekanosapp.dpdns.org/api',
        originLabel: 'Producción',
        latencyMs: 85,
      );
      expect(legacyProd, isNotNull);
      expect(legacyProd!.commit, '1295cec');
      expect(legacyProd.environment, 'production');

      final impostor = VerifiedMekanosServer.tryFromHealthJson(
        {'status': 'ok', 'service': 'Grafana'},
        baseUrl: 'http://192.168.1.50:3000/api',
        originLabel: 'Wi-Fi Local',
        latencyMs: 5,
      );
      expect(impostor, isNull);

      final genericOk = VerifiedMekanosServer.tryFromHealthJson(
        {'status': 'ok'},
        baseUrl: 'http://192.168.1.50:3000/api',
        originLabel: 'Wi-Fi Local',
        latencyMs: 5,
      );
      expect(genericOk, isNull);
    });
  });

  group('SecretEnvironmentGesture (5 toques + 6to sostenido >= 5s)', () {
    Widget buildHarness({
      required VoidCallback onUnlocked,
      required DateTime Function() clock,
    }) {
      return MaterialApp(
        home: Scaffold(
          body: Center(
            child: SecretEnvironmentGesture(
              onUnlocked: onUnlocked,
              clock: clock,
              child: const SizedBox(
                key: Key('secret_target'),
                width: 200,
                height: 60,
                child: Text('Pie conexión'),
              ),
            ),
          ),
        ),
      );
    }

    testWidgets('desbloquea exactamente tras 5 toques + 6to toque de 5 segundos', (
      tester,
    ) async {
      var now = DateTime(2026, 11, 11, 23, 0, 0);
      var unlockedCount = 0;

      await tester.pumpWidget(
        buildHarness(
          onUnlocked: () => unlockedCount++,
          clock: () => now,
        ),
      );

      final center = tester.getCenter(find.byKey(const Key('secret_target')));

      // 5 toques breves (100ms presionado, 200ms pausa)
      for (var i = 0; i < 5; i++) {
        final g = await tester.startGesture(center);
        now = now.add(const Duration(milliseconds: 100));
        await tester.pump(const Duration(milliseconds: 100));
        await g.up();
        now = now.add(const Duration(milliseconds: 200));
        await tester.pump(const Duration(milliseconds: 200));
      }
      expect(unlockedCount, 0);

      // 6to toque sostenido: antes de 5s no debe disparar
      final hold = await tester.startGesture(center);
      now = now.add(const Duration(milliseconds: 4900));
      await tester.pump(const Duration(milliseconds: 4900));
      expect(unlockedCount, 0);

      // Al completar los 5000ms dispara exactamente una vez
      now = now.add(const Duration(milliseconds: 150));
      await tester.pump(const Duration(milliseconds: 150));
      expect(unlockedCount, 1);

      await hold.up();
      await tester.pump();
      expect(unlockedCount, 1);
    });

    testWidgets('NO desbloquea con 4 toques ni al soltar antes de 5s ni al arrastrar', (
      tester,
    ) async {
      var now = DateTime(2026, 11, 11, 23, 5, 0);
      var unlockedCount = 0;

      await tester.pumpWidget(
        buildHarness(
          onUnlocked: () => unlockedCount++,
          clock: () => now,
        ),
      );

      final center = tester.getCenter(find.byKey(const Key('secret_target')));

      // Caso A: solo 4 toques + mantener 6s
      for (var i = 0; i < 4; i++) {
        final g = await tester.startGesture(center);
        now = now.add(const Duration(milliseconds: 100));
        await tester.pump(const Duration(milliseconds: 100));
        await g.up();
        now = now.add(const Duration(milliseconds: 200));
        await tester.pump(const Duration(milliseconds: 200));
      }
      final g4 = await tester.startGesture(center);
      now = now.add(const Duration(seconds: 6));
      await tester.pump(const Duration(seconds: 6));
      await g4.up();
      expect(unlockedCount, 0);

      // Caso B: 5 toques + 6to toque de solo 4.5s (suelta antes)
      now = now.add(const Duration(seconds: 5));
      for (var i = 0; i < 5; i++) {
        final g = await tester.startGesture(center);
        now = now.add(const Duration(milliseconds: 100));
        await tester.pump(const Duration(milliseconds: 100));
        await g.up();
        now = now.add(const Duration(milliseconds: 200));
        await tester.pump(const Duration(milliseconds: 200));
      }
      final shortHold = await tester.startGesture(center);
      now = now.add(const Duration(milliseconds: 4500));
      await tester.pump(const Duration(milliseconds: 4500));
      await shortHold.up();
      now = now.add(const Duration(seconds: 2));
      await tester.pump(const Duration(seconds: 2));
      expect(unlockedCount, 0);

      // Caso C: 5 toques + arrastre > 24px durante el 6to toque sostenido
      now = now.add(const Duration(seconds: 5));
      for (var i = 0; i < 5; i++) {
        final g = await tester.startGesture(center);
        now = now.add(const Duration(milliseconds: 100));
        await tester.pump(const Duration(milliseconds: 100));
        await g.up();
        now = now.add(const Duration(milliseconds: 200));
        await tester.pump(const Duration(milliseconds: 200));
      }
      final dragged = await tester.startGesture(center);
      await dragged.moveBy(const Offset(0, 40));
      now = now.add(const Duration(seconds: 6));
      await tester.pump(const Duration(seconds: 6));
      await dragged.up();
      expect(unlockedCount, 0);
    });
  });
}
