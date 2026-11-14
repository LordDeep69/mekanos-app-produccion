import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mekanos_mobile/core/database/app_database.dart';
import 'package:mekanos_mobile/features/firmas/data/firma_service.dart';
import 'package:mekanos_mobile/features/firmas/presentation/firmas_section.dart';

class _MockFirmaService extends Fake implements FirmaService {
  Firma? firmaTecnico;
  Firma? firmaCliente;
  bool eliminoFirma = false;

  _MockFirmaService({required this.firmaCliente});

  @override
  Future<Firma?> getFirmaByTipo(int idOrden, String tipoFirma) async {
    return tipoFirma == 'TECNICO' ? firmaTecnico : firmaCliente;
  }

  @override
  Future<bool> actualizarDatosFirma({
    required int idFirma,
    required String nombreFirmante,
    String? cargoFirmante,
  }) async {
    if (firmaCliente != null && firmaCliente!.idLocal == idFirma) {
      firmaCliente = Firma(
        idLocal: firmaCliente!.idLocal,
        idBackend: firmaCliente!.idBackend,
        idOrden: firmaCliente!.idOrden,
        rutaLocal: firmaCliente!.rutaLocal,
        urlRemota: firmaCliente!.urlRemota,
        tipoFirma: firmaCliente!.tipoFirma,
        nombreFirmante: nombreFirmante,
        cargoFirmante: cargoFirmante,
        documentoFirmante: firmaCliente!.documentoFirmante,
        fechaFirma: firmaCliente!.fechaFirma,
        isDirty: firmaCliente!.isDirty,
        subida: firmaCliente!.subida,
        lastSyncedAt: firmaCliente!.lastSyncedAt,
      );
      return true;
    }
    return false;
  }

  @override
  Future<bool> eliminarFirma(int idFirma) async {
    eliminoFirma = true;
    return true;
  }
}

void main() {
  Widget buildTestWidget(FirmaService mockService) {
    return ProviderScope(
      overrides: [firmaServiceProvider.overrideWithValue(mockService)],
      child: const MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(child: FirmasSection(idOrden: 2140)),
        ),
      ),
    );
  }

  testWidgets(
    'Al tocar una firma ya registrada ofrece Visualizar, Editar y Rehacer sin borrar el trazo',
    (tester) async {
      final mockService = _MockFirmaService(
        firmaCliente: Firma(
          idLocal: 10,
          idOrden: 2140,
          rutaLocal: '',
          tipoFirma: 'CLIENTE',
          nombreFirmante: 'Carlos Pérez',
          cargoFirmante: 'Jefe de Mantenimiento',
          fechaFirma: DateTime(2026, 11, 12, 20, 15),
          isDirty: true,
          subida: false,
        ),
      );

      await tester.pumpWidget(buildTestWidget(mockService));
      await tester.pumpAndSettle();

      // 1. Tocar la tarjeta ya firmada abre el menú de 3 opciones
      await tester.tap(find.text('Carlos Pérez'));
      await tester.pumpAndSettle();

      expect(find.text('Visualizar firma'), findsOneWidget);
      expect(find.text('Editar'), findsOneWidget);
      expect(find.text('Rehacer'), findsOneWidget);

      // 2. Probar Visualizar firma
      await tester.tap(find.text('Visualizar firma'));
      await tester.pumpAndSettle();

      expect(find.text('Firmante: '), findsOneWidget);
      expect(find.text('Jefe de Mantenimiento'), findsWidgets);

      // Cerrar visor desde botón Editar para probar Edición directa sin perder la firma
      await tester.tap(find.text('Editar'));
      await tester.pumpAndSettle();

      expect(find.text('Editar datos (Cliente)'), findsOneWidget);
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Nombre del firmante *'),
        'Ana María Gómez',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Cargo *'),
        'Directora Operativa',
      );
      await tester.tap(find.text('Guardar'));
      await tester.pumpAndSettle();

      expect(mockService.eliminoFirma, isFalse);
      expect(find.text('Ana María Gómez'), findsOneWidget);
      expect(find.text('Directora Operativa'), findsOneWidget);

      // 3. Abrir menú nuevamente y verificar que Rehacer pide confirmación atómica
      await tester.tap(find.text('Ana María Gómez'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Rehacer'));
      await tester.pumpAndSettle();

      expect(find.text('¿Rehacer firma?'), findsOneWidget);
      expect(mockService.eliminoFirma, isFalse);
    },
  );
}
