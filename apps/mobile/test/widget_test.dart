// Test básico de la app Mekanos

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mekanos_mobile/main.dart';

void main() {
  testWidgets('App loads without errors', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MekanosApp()));

    // La app debe mostrar algo (loading o login)
    expect(find.byType(MekanosApp), findsOneWidget);
  });
}
