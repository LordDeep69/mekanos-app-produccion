/// Guarda segura de cierre de sesión con preservación de trabajo offline.
///
/// Verifica antes de cerrar sesión si la cuenta activa tiene órdenes locales
/// con cambios sin sincronizar (`isDirty`, `POR_SUBIR`, `CONFLICTO_ELIMINADA` o
/// en cola offline). Advierte explícitamente que sus datos quedan resguardados
/// en la bóveda privada de su cuenta (`db_user_<id>.sqlite`) sin riesgo de que
/// otra cuenta en el mismo dispositivo pueda verlos ni subirlos bajo su JWT.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/database/database_service.dart';
import '../../sync/presentation/pending_sync_screen.dart';
import '../data/auth_provider.dart';

Future<void> confirmarYCerrarSesion(BuildContext context, WidgetRef ref) async {
  int pendientes = 0;
  try {
    final db = ref.read(databaseProvider);
    pendientes = await db.countUnsyncedWork();
  } catch (_) {
    pendientes = 0;
  }

  if (!context.mounted) return;

  if (pendientes > 0) {
    final decision = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.shield_outlined, color: Colors.orange),
            SizedBox(width: 8),
            Expanded(child: Text('Trabajo offline sin sincronizar')),
          ],
        ),
        content: Text(
          'Tienes $pendientes orden(es) pendiente(s) de subir al servidor.\n\n'
          'Tus órdenes, fotos y firmas permanecerán resguardadas en la bóveda privada '
          'de tu usuario y NO se mezclarán ni subirán desde otra sesión.\n\n'
          'Podrás completar su subida al volver a iniciar sesión con esta cuenta.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop('cancel'),
            child: const Text('Cancelar'),
          ),
          TextButton.icon(
            onPressed: () => Navigator.of(ctx).pop('review'),
            icon: const Icon(Icons.cloud_upload_outlined),
            label: const Text('Ir a Órdenes por Subir'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange.shade700,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop('logout'),
            child: const Text('Cerrar sesión y resguardar'),
          ),
        ],
      ),
    );

    if (decision == 'review' && context.mounted) {
      await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const PendingSyncScreen()),
      );
      return;
    }

    if (decision != 'logout') return;
  }

  await ref.read(authStateProvider.notifier).logout();
}
