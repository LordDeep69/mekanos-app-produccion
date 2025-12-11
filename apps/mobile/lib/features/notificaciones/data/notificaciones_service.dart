/// NOTIFICACIONES SERVICE - MEKANOS MOBILE
///
/// Servicio para gestión de notificaciones en la app móvil.
/// Utiliza endpoints REST del backend y Supabase Realtime.
///
/// RUTA 14 - Notificaciones
/// @author MEKANOS Development Team
library;

import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Tipos de notificación (match con backend)
enum TipoNotificacion {
  ordenAsignada,
  ordenCompletada,
  ordenVencida,
  cotizacionAprobada,
  cotizacionRechazada,
  contratoPorVencer,
  servicioProgramado,
  alertaMedicion,
  recordatorio,
  sistema,
}

/// Prioridades (match con backend)
enum PrioridadNotificacion { baja, normal, alta, urgente }

/// Modelo de notificación
class NotificacionModel {
  final int id;
  final int idUsuario;
  final String tipo;
  final String titulo;
  final String mensaje;
  final String prioridad;
  final bool leida;
  final DateTime fechaCreacion;
  final DateTime? fechaLectura;
  final int? idEntidadRelacionada;
  final String? tipoEntidadRelacionada;
  final String? urlAccion;
  final Map<String, dynamic>? datosExtra;

  NotificacionModel({
    required this.id,
    required this.idUsuario,
    required this.tipo,
    required this.titulo,
    required this.mensaje,
    required this.prioridad,
    required this.leida,
    required this.fechaCreacion,
    this.fechaLectura,
    this.idEntidadRelacionada,
    this.tipoEntidadRelacionada,
    this.urlAccion,
    this.datosExtra,
  });

  factory NotificacionModel.fromJson(Map<String, dynamic> json) {
    return NotificacionModel(
      id: json['id_notificacion'] ?? json['id'],
      idUsuario: json['id_usuario'],
      tipo: json['tipo_notificacion'] ?? json['tipo'],
      titulo: json['titulo'],
      mensaje: json['mensaje'],
      prioridad: json['prioridad'] ?? 'NORMAL',
      leida: json['leida'] ?? false,
      fechaCreacion: DateTime.parse(json['fecha_creacion']),
      fechaLectura: json['fecha_lectura'] != null
          ? DateTime.parse(json['fecha_lectura'])
          : null,
      idEntidadRelacionada: json['id_entidad_relacionada'],
      tipoEntidadRelacionada: json['tipo_entidad_relacionada'],
      urlAccion: json['url_accion'],
      datosExtra: json['datos_extra'] != null
          ? (json['datos_extra'] is String
                ? {} // Parse JSON if needed
                : json['datos_extra'] as Map<String, dynamic>)
          : null,
    );
  }

  /// Icono según tipo de notificación
  String get icono {
    switch (tipo) {
      case 'ORDEN_ASIGNADA':
        return '📋';
      case 'ORDEN_COMPLETADA':
        return '✅';
      case 'ORDEN_VENCIDA':
        return '⚠️';
      case 'SERVICIO_PROGRAMADO':
        return '📅';
      case 'ALERTA_MEDICION':
        return '📊';
      case 'RECORDATORIO':
        return '🔔';
      case 'SISTEMA':
        return '🔧';
      default:
        return '📬';
    }
  }

  /// Color según prioridad
  int get colorPrioridad {
    switch (prioridad) {
      case 'URGENTE':
        return 0xFFE53935; // Rojo
      case 'ALTA':
        return 0xFFFF9800; // Naranja
      case 'NORMAL':
        return 0xFF2196F3; // Azul
      case 'BAJA':
        return 0xFF9E9E9E; // Gris
      default:
        return 0xFF2196F3;
    }
  }
}

/// Servicio de notificaciones
class NotificacionesService {
  final Dio _dio;
  final SupabaseClient? _supabase;

  // Stream controller para notificaciones en tiempo real
  final _notificacionesController =
      StreamController<NotificacionModel>.broadcast();
  final _conteoController = StreamController<int>.broadcast();

  // Suscripción a Supabase Realtime
  RealtimeChannel? _realtimeChannel;

  // Cache de conteo
  int _conteoNoLeidas = 0;

  NotificacionesService({required Dio dio, SupabaseClient? supabase})
    : _dio = dio,
      _supabase = supabase;

  /// Stream de nuevas notificaciones (Realtime)
  Stream<NotificacionModel> get onNuevaNotificacion =>
      _notificacionesController.stream;

  /// Stream de conteo de no leídas
  Stream<int> get onConteoChange => _conteoController.stream;

  /// Conteo actual de no leídas
  int get conteoNoLeidas => _conteoNoLeidas;

  // ============================================================
  // MÉTODOS REST (Backend API)
  // ============================================================

  /// Lista notificaciones del usuario actual
  Future<List<NotificacionModel>> listar({
    bool soloNoLeidas = false,
    String? tipo,
    String? prioridad,
    int limite = 50,
    int offset = 0,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'limite': limite.toString(),
        'offset': offset.toString(),
      };

      if (soloNoLeidas) queryParams['soloNoLeidas'] = 'true';
      if (tipo != null) queryParams['tipo'] = tipo;
      if (prioridad != null) queryParams['prioridad'] = prioridad;

      final response = await _dio.get(
        '/notificaciones',
        queryParameters: queryParams,
      );

      final data = response.data['data'] as List<dynamic>? ?? [];
      final meta = response.data['meta'];

      // Actualizar conteo
      if (meta != null && meta['noLeidas'] != null) {
        _conteoNoLeidas = meta['noLeidas'];
        _conteoController.add(_conteoNoLeidas);
      }

      return data.map((json) => NotificacionModel.fromJson(json)).toList();
    } catch (e) {
      debugPrint('❌ Error listando notificaciones: $e');
      return [];
    }
  }

  /// Obtiene conteo de no leídas
  Future<int> obtenerConteoNoLeidas() async {
    try {
      final response = await _dio.get('/notificaciones/conteo');
      _conteoNoLeidas = response.data['noLeidas'] ?? 0;
      _conteoController.add(_conteoNoLeidas);
      return _conteoNoLeidas;
    } catch (e) {
      debugPrint('❌ Error obteniendo conteo: $e');
      return 0;
    }
  }

  /// Marca una notificación como leída
  Future<bool> marcarLeida(int idNotificacion) async {
    try {
      await _dio.patch('/notificaciones/$idNotificacion/leer');

      // Actualizar conteo local
      if (_conteoNoLeidas > 0) {
        _conteoNoLeidas--;
        _conteoController.add(_conteoNoLeidas);
      }

      return true;
    } catch (e) {
      debugPrint('❌ Error marcando leída: $e');
      return false;
    }
  }

  /// Marca todas las notificaciones como leídas
  Future<bool> marcarTodasLeidas() async {
    try {
      await _dio.patch('/notificaciones/leer-todas');
      _conteoNoLeidas = 0;
      _conteoController.add(_conteoNoLeidas);
      return true;
    } catch (e) {
      debugPrint('❌ Error marcando todas leídas: $e');
      return false;
    }
  }

  /// Elimina una notificación
  Future<bool> eliminar(int idNotificacion) async {
    try {
      await _dio.delete('/notificaciones/$idNotificacion');
      return true;
    } catch (e) {
      debugPrint('❌ Error eliminando notificación: $e');
      return false;
    }
  }

  // ============================================================
  // SUPABASE REALTIME
  // ============================================================

  /// Inicia escucha de notificaciones en tiempo real para un usuario
  void iniciarRealtimeListener(int idUsuario) {
    if (_supabase == null) {
      debugPrint('⚠️ Supabase no configurado para Realtime');
      return;
    }

    // Cancelar suscripción anterior si existe
    detenerRealtimeListener();

    debugPrint('🔔 Iniciando Supabase Realtime para usuario $idUsuario...');

    _realtimeChannel = _supabase.channel('notificaciones_$idUsuario');

    _realtimeChannel!
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'notificaciones',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id_usuario',
            value: idUsuario.toString(),
          ),
          callback: (payload) {
            debugPrint('📬 Nueva notificación recibida: ${payload.newRecord}');

            try {
              final notificacion = NotificacionModel.fromJson(
                payload.newRecord,
              );
              _notificacionesController.add(notificacion);

              // Incrementar conteo
              _conteoNoLeidas++;
              _conteoController.add(_conteoNoLeidas);
            } catch (e) {
              debugPrint('❌ Error procesando notificación: $e');
            }
          },
        )
        .subscribe((status, [error]) {
          debugPrint('🔔 Realtime status: $status');
          if (error != null) {
            debugPrint('❌ Realtime error: $error');
          }
        });
  }

  /// Detiene escucha de notificaciones
  void detenerRealtimeListener() {
    if (_realtimeChannel != null) {
      _supabase?.removeChannel(_realtimeChannel!);
      _realtimeChannel = null;
      debugPrint('🔕 Realtime listener detenido');
    }
  }

  /// Libera recursos
  void dispose() {
    detenerRealtimeListener();
    _notificacionesController.close();
    _conteoController.close();
  }
}
