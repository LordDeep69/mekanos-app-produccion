// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'app_database.dart';

// ignore_for_file: type=lint
class $EstadosOrdenTable extends EstadosOrden
    with TableInfo<$EstadosOrdenTable, EstadosOrdenData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $EstadosOrdenTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _codigoMeta = const VerificationMeta('codigo');
  @override
  late final GeneratedColumn<String> codigo = GeneratedColumn<String>(
    'codigo',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 50),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nombreMeta = const VerificationMeta('nombre');
  @override
  late final GeneratedColumn<String> nombre = GeneratedColumn<String>(
    'nombre',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 100),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _esEstadoFinalMeta = const VerificationMeta(
    'esEstadoFinal',
  );
  @override
  late final GeneratedColumn<bool> esEstadoFinal = GeneratedColumn<bool>(
    'es_estado_final',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("es_estado_final" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    codigo,
    nombre,
    esEstadoFinal,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'estados_orden';
  @override
  VerificationContext validateIntegrity(
    Insertable<EstadosOrdenData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('codigo')) {
      context.handle(
        _codigoMeta,
        codigo.isAcceptableOrUnknown(data['codigo']!, _codigoMeta),
      );
    } else if (isInserting) {
      context.missing(_codigoMeta);
    }
    if (data.containsKey('nombre')) {
      context.handle(
        _nombreMeta,
        nombre.isAcceptableOrUnknown(data['nombre']!, _nombreMeta),
      );
    } else if (isInserting) {
      context.missing(_nombreMeta);
    }
    if (data.containsKey('es_estado_final')) {
      context.handle(
        _esEstadoFinalMeta,
        esEstadoFinal.isAcceptableOrUnknown(
          data['es_estado_final']!,
          _esEstadoFinalMeta,
        ),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  EstadosOrdenData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return EstadosOrdenData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      codigo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}codigo'],
      )!,
      nombre: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nombre'],
      )!,
      esEstadoFinal: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}es_estado_final'],
      )!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $EstadosOrdenTable createAlias(String alias) {
    return $EstadosOrdenTable(attachedDatabase, alias);
  }
}

class EstadosOrdenData extends DataClass
    implements Insertable<EstadosOrdenData> {
  final int id;
  final String codigo;
  final String nombre;
  final bool esEstadoFinal;
  final DateTime? lastSyncedAt;
  const EstadosOrdenData({
    required this.id,
    required this.codigo,
    required this.nombre,
    required this.esEstadoFinal,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['codigo'] = Variable<String>(codigo);
    map['nombre'] = Variable<String>(nombre);
    map['es_estado_final'] = Variable<bool>(esEstadoFinal);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  EstadosOrdenCompanion toCompanion(bool nullToAbsent) {
    return EstadosOrdenCompanion(
      id: Value(id),
      codigo: Value(codigo),
      nombre: Value(nombre),
      esEstadoFinal: Value(esEstadoFinal),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory EstadosOrdenData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return EstadosOrdenData(
      id: serializer.fromJson<int>(json['id']),
      codigo: serializer.fromJson<String>(json['codigo']),
      nombre: serializer.fromJson<String>(json['nombre']),
      esEstadoFinal: serializer.fromJson<bool>(json['esEstadoFinal']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'codigo': serializer.toJson<String>(codigo),
      'nombre': serializer.toJson<String>(nombre),
      'esEstadoFinal': serializer.toJson<bool>(esEstadoFinal),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  EstadosOrdenData copyWith({
    int? id,
    String? codigo,
    String? nombre,
    bool? esEstadoFinal,
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => EstadosOrdenData(
    id: id ?? this.id,
    codigo: codigo ?? this.codigo,
    nombre: nombre ?? this.nombre,
    esEstadoFinal: esEstadoFinal ?? this.esEstadoFinal,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  EstadosOrdenData copyWithCompanion(EstadosOrdenCompanion data) {
    return EstadosOrdenData(
      id: data.id.present ? data.id.value : this.id,
      codigo: data.codigo.present ? data.codigo.value : this.codigo,
      nombre: data.nombre.present ? data.nombre.value : this.nombre,
      esEstadoFinal: data.esEstadoFinal.present
          ? data.esEstadoFinal.value
          : this.esEstadoFinal,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('EstadosOrdenData(')
          ..write('id: $id, ')
          ..write('codigo: $codigo, ')
          ..write('nombre: $nombre, ')
          ..write('esEstadoFinal: $esEstadoFinal, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, codigo, nombre, esEstadoFinal, lastSyncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is EstadosOrdenData &&
          other.id == this.id &&
          other.codigo == this.codigo &&
          other.nombre == this.nombre &&
          other.esEstadoFinal == this.esEstadoFinal &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class EstadosOrdenCompanion extends UpdateCompanion<EstadosOrdenData> {
  final Value<int> id;
  final Value<String> codigo;
  final Value<String> nombre;
  final Value<bool> esEstadoFinal;
  final Value<DateTime?> lastSyncedAt;
  const EstadosOrdenCompanion({
    this.id = const Value.absent(),
    this.codigo = const Value.absent(),
    this.nombre = const Value.absent(),
    this.esEstadoFinal = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  EstadosOrdenCompanion.insert({
    this.id = const Value.absent(),
    required String codigo,
    required String nombre,
    this.esEstadoFinal = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : codigo = Value(codigo),
       nombre = Value(nombre);
  static Insertable<EstadosOrdenData> custom({
    Expression<int>? id,
    Expression<String>? codigo,
    Expression<String>? nombre,
    Expression<bool>? esEstadoFinal,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (codigo != null) 'codigo': codigo,
      if (nombre != null) 'nombre': nombre,
      if (esEstadoFinal != null) 'es_estado_final': esEstadoFinal,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  EstadosOrdenCompanion copyWith({
    Value<int>? id,
    Value<String>? codigo,
    Value<String>? nombre,
    Value<bool>? esEstadoFinal,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return EstadosOrdenCompanion(
      id: id ?? this.id,
      codigo: codigo ?? this.codigo,
      nombre: nombre ?? this.nombre,
      esEstadoFinal: esEstadoFinal ?? this.esEstadoFinal,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (codigo.present) {
      map['codigo'] = Variable<String>(codigo.value);
    }
    if (nombre.present) {
      map['nombre'] = Variable<String>(nombre.value);
    }
    if (esEstadoFinal.present) {
      map['es_estado_final'] = Variable<bool>(esEstadoFinal.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('EstadosOrdenCompanion(')
          ..write('id: $id, ')
          ..write('codigo: $codigo, ')
          ..write('nombre: $nombre, ')
          ..write('esEstadoFinal: $esEstadoFinal, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $TiposServicioTable extends TiposServicio
    with TableInfo<$TiposServicioTable, TiposServicioData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $TiposServicioTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _codigoMeta = const VerificationMeta('codigo');
  @override
  late final GeneratedColumn<String> codigo = GeneratedColumn<String>(
    'codigo',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 50),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nombreMeta = const VerificationMeta('nombre');
  @override
  late final GeneratedColumn<String> nombre = GeneratedColumn<String>(
    'nombre',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 150),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _descripcionMeta = const VerificationMeta(
    'descripcion',
  );
  @override
  late final GeneratedColumn<String> descripcion = GeneratedColumn<String>(
    'descripcion',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _activoMeta = const VerificationMeta('activo');
  @override
  late final GeneratedColumn<bool> activo = GeneratedColumn<bool>(
    'activo',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("activo" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    codigo,
    nombre,
    descripcion,
    activo,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'tipos_servicio';
  @override
  VerificationContext validateIntegrity(
    Insertable<TiposServicioData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('codigo')) {
      context.handle(
        _codigoMeta,
        codigo.isAcceptableOrUnknown(data['codigo']!, _codigoMeta),
      );
    } else if (isInserting) {
      context.missing(_codigoMeta);
    }
    if (data.containsKey('nombre')) {
      context.handle(
        _nombreMeta,
        nombre.isAcceptableOrUnknown(data['nombre']!, _nombreMeta),
      );
    } else if (isInserting) {
      context.missing(_nombreMeta);
    }
    if (data.containsKey('descripcion')) {
      context.handle(
        _descripcionMeta,
        descripcion.isAcceptableOrUnknown(
          data['descripcion']!,
          _descripcionMeta,
        ),
      );
    }
    if (data.containsKey('activo')) {
      context.handle(
        _activoMeta,
        activo.isAcceptableOrUnknown(data['activo']!, _activoMeta),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  TiposServicioData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return TiposServicioData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      codigo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}codigo'],
      )!,
      nombre: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nombre'],
      )!,
      descripcion: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}descripcion'],
      ),
      activo: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}activo'],
      )!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $TiposServicioTable createAlias(String alias) {
    return $TiposServicioTable(attachedDatabase, alias);
  }
}

class TiposServicioData extends DataClass
    implements Insertable<TiposServicioData> {
  final int id;
  final String codigo;
  final String nombre;
  final String? descripcion;
  final bool activo;
  final DateTime? lastSyncedAt;
  const TiposServicioData({
    required this.id,
    required this.codigo,
    required this.nombre,
    this.descripcion,
    required this.activo,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['codigo'] = Variable<String>(codigo);
    map['nombre'] = Variable<String>(nombre);
    if (!nullToAbsent || descripcion != null) {
      map['descripcion'] = Variable<String>(descripcion);
    }
    map['activo'] = Variable<bool>(activo);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  TiposServicioCompanion toCompanion(bool nullToAbsent) {
    return TiposServicioCompanion(
      id: Value(id),
      codigo: Value(codigo),
      nombre: Value(nombre),
      descripcion: descripcion == null && nullToAbsent
          ? const Value.absent()
          : Value(descripcion),
      activo: Value(activo),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory TiposServicioData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return TiposServicioData(
      id: serializer.fromJson<int>(json['id']),
      codigo: serializer.fromJson<String>(json['codigo']),
      nombre: serializer.fromJson<String>(json['nombre']),
      descripcion: serializer.fromJson<String?>(json['descripcion']),
      activo: serializer.fromJson<bool>(json['activo']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'codigo': serializer.toJson<String>(codigo),
      'nombre': serializer.toJson<String>(nombre),
      'descripcion': serializer.toJson<String?>(descripcion),
      'activo': serializer.toJson<bool>(activo),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  TiposServicioData copyWith({
    int? id,
    String? codigo,
    String? nombre,
    Value<String?> descripcion = const Value.absent(),
    bool? activo,
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => TiposServicioData(
    id: id ?? this.id,
    codigo: codigo ?? this.codigo,
    nombre: nombre ?? this.nombre,
    descripcion: descripcion.present ? descripcion.value : this.descripcion,
    activo: activo ?? this.activo,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  TiposServicioData copyWithCompanion(TiposServicioCompanion data) {
    return TiposServicioData(
      id: data.id.present ? data.id.value : this.id,
      codigo: data.codigo.present ? data.codigo.value : this.codigo,
      nombre: data.nombre.present ? data.nombre.value : this.nombre,
      descripcion: data.descripcion.present
          ? data.descripcion.value
          : this.descripcion,
      activo: data.activo.present ? data.activo.value : this.activo,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('TiposServicioData(')
          ..write('id: $id, ')
          ..write('codigo: $codigo, ')
          ..write('nombre: $nombre, ')
          ..write('descripcion: $descripcion, ')
          ..write('activo: $activo, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode =>
      Object.hash(id, codigo, nombre, descripcion, activo, lastSyncedAt);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is TiposServicioData &&
          other.id == this.id &&
          other.codigo == this.codigo &&
          other.nombre == this.nombre &&
          other.descripcion == this.descripcion &&
          other.activo == this.activo &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class TiposServicioCompanion extends UpdateCompanion<TiposServicioData> {
  final Value<int> id;
  final Value<String> codigo;
  final Value<String> nombre;
  final Value<String?> descripcion;
  final Value<bool> activo;
  final Value<DateTime?> lastSyncedAt;
  const TiposServicioCompanion({
    this.id = const Value.absent(),
    this.codigo = const Value.absent(),
    this.nombre = const Value.absent(),
    this.descripcion = const Value.absent(),
    this.activo = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  TiposServicioCompanion.insert({
    this.id = const Value.absent(),
    required String codigo,
    required String nombre,
    this.descripcion = const Value.absent(),
    this.activo = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : codigo = Value(codigo),
       nombre = Value(nombre);
  static Insertable<TiposServicioData> custom({
    Expression<int>? id,
    Expression<String>? codigo,
    Expression<String>? nombre,
    Expression<String>? descripcion,
    Expression<bool>? activo,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (codigo != null) 'codigo': codigo,
      if (nombre != null) 'nombre': nombre,
      if (descripcion != null) 'descripcion': descripcion,
      if (activo != null) 'activo': activo,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  TiposServicioCompanion copyWith({
    Value<int>? id,
    Value<String>? codigo,
    Value<String>? nombre,
    Value<String?>? descripcion,
    Value<bool>? activo,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return TiposServicioCompanion(
      id: id ?? this.id,
      codigo: codigo ?? this.codigo,
      nombre: nombre ?? this.nombre,
      descripcion: descripcion ?? this.descripcion,
      activo: activo ?? this.activo,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (codigo.present) {
      map['codigo'] = Variable<String>(codigo.value);
    }
    if (nombre.present) {
      map['nombre'] = Variable<String>(nombre.value);
    }
    if (descripcion.present) {
      map['descripcion'] = Variable<String>(descripcion.value);
    }
    if (activo.present) {
      map['activo'] = Variable<bool>(activo.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('TiposServicioCompanion(')
          ..write('id: $id, ')
          ..write('codigo: $codigo, ')
          ..write('nombre: $nombre, ')
          ..write('descripcion: $descripcion, ')
          ..write('activo: $activo, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $ParametrosCatalogoTable extends ParametrosCatalogo
    with TableInfo<$ParametrosCatalogoTable, ParametrosCatalogoData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ParametrosCatalogoTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _codigoMeta = const VerificationMeta('codigo');
  @override
  late final GeneratedColumn<String> codigo = GeneratedColumn<String>(
    'codigo',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 50),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nombreMeta = const VerificationMeta('nombre');
  @override
  late final GeneratedColumn<String> nombre = GeneratedColumn<String>(
    'nombre',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 200),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _unidadMeta = const VerificationMeta('unidad');
  @override
  late final GeneratedColumn<String> unidad = GeneratedColumn<String>(
    'unidad',
    aliasedName,
    true,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 30),
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _valorMinimoNormalMeta = const VerificationMeta(
    'valorMinimoNormal',
  );
  @override
  late final GeneratedColumn<double> valorMinimoNormal =
      GeneratedColumn<double>(
        'valor_minimo_normal',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _valorMaximoNormalMeta = const VerificationMeta(
    'valorMaximoNormal',
  );
  @override
  late final GeneratedColumn<double> valorMaximoNormal =
      GeneratedColumn<double>(
        'valor_maximo_normal',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _valorMinimoAdvertenciaMeta =
      const VerificationMeta('valorMinimoAdvertencia');
  @override
  late final GeneratedColumn<double> valorMinimoAdvertencia =
      GeneratedColumn<double>(
        'valor_minimo_advertencia',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _valorMaximoAdvertenciaMeta =
      const VerificationMeta('valorMaximoAdvertencia');
  @override
  late final GeneratedColumn<double> valorMaximoAdvertencia =
      GeneratedColumn<double>(
        'valor_maximo_advertencia',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _valorMinimoCriticoMeta =
      const VerificationMeta('valorMinimoCritico');
  @override
  late final GeneratedColumn<double> valorMinimoCritico =
      GeneratedColumn<double>(
        'valor_minimo_critico',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _valorMaximoCriticoMeta =
      const VerificationMeta('valorMaximoCritico');
  @override
  late final GeneratedColumn<double> valorMaximoCritico =
      GeneratedColumn<double>(
        'valor_maximo_critico',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _tipoEquipoAplicaMeta = const VerificationMeta(
    'tipoEquipoAplica',
  );
  @override
  late final GeneratedColumn<String> tipoEquipoAplica = GeneratedColumn<String>(
    'tipo_equipo_aplica',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    codigo,
    nombre,
    unidad,
    valorMinimoNormal,
    valorMaximoNormal,
    valorMinimoAdvertencia,
    valorMaximoAdvertencia,
    valorMinimoCritico,
    valorMaximoCritico,
    tipoEquipoAplica,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'parametros_catalogo';
  @override
  VerificationContext validateIntegrity(
    Insertable<ParametrosCatalogoData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('codigo')) {
      context.handle(
        _codigoMeta,
        codigo.isAcceptableOrUnknown(data['codigo']!, _codigoMeta),
      );
    } else if (isInserting) {
      context.missing(_codigoMeta);
    }
    if (data.containsKey('nombre')) {
      context.handle(
        _nombreMeta,
        nombre.isAcceptableOrUnknown(data['nombre']!, _nombreMeta),
      );
    } else if (isInserting) {
      context.missing(_nombreMeta);
    }
    if (data.containsKey('unidad')) {
      context.handle(
        _unidadMeta,
        unidad.isAcceptableOrUnknown(data['unidad']!, _unidadMeta),
      );
    }
    if (data.containsKey('valor_minimo_normal')) {
      context.handle(
        _valorMinimoNormalMeta,
        valorMinimoNormal.isAcceptableOrUnknown(
          data['valor_minimo_normal']!,
          _valorMinimoNormalMeta,
        ),
      );
    }
    if (data.containsKey('valor_maximo_normal')) {
      context.handle(
        _valorMaximoNormalMeta,
        valorMaximoNormal.isAcceptableOrUnknown(
          data['valor_maximo_normal']!,
          _valorMaximoNormalMeta,
        ),
      );
    }
    if (data.containsKey('valor_minimo_advertencia')) {
      context.handle(
        _valorMinimoAdvertenciaMeta,
        valorMinimoAdvertencia.isAcceptableOrUnknown(
          data['valor_minimo_advertencia']!,
          _valorMinimoAdvertenciaMeta,
        ),
      );
    }
    if (data.containsKey('valor_maximo_advertencia')) {
      context.handle(
        _valorMaximoAdvertenciaMeta,
        valorMaximoAdvertencia.isAcceptableOrUnknown(
          data['valor_maximo_advertencia']!,
          _valorMaximoAdvertenciaMeta,
        ),
      );
    }
    if (data.containsKey('valor_minimo_critico')) {
      context.handle(
        _valorMinimoCriticoMeta,
        valorMinimoCritico.isAcceptableOrUnknown(
          data['valor_minimo_critico']!,
          _valorMinimoCriticoMeta,
        ),
      );
    }
    if (data.containsKey('valor_maximo_critico')) {
      context.handle(
        _valorMaximoCriticoMeta,
        valorMaximoCritico.isAcceptableOrUnknown(
          data['valor_maximo_critico']!,
          _valorMaximoCriticoMeta,
        ),
      );
    }
    if (data.containsKey('tipo_equipo_aplica')) {
      context.handle(
        _tipoEquipoAplicaMeta,
        tipoEquipoAplica.isAcceptableOrUnknown(
          data['tipo_equipo_aplica']!,
          _tipoEquipoAplicaMeta,
        ),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ParametrosCatalogoData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ParametrosCatalogoData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      codigo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}codigo'],
      )!,
      nombre: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nombre'],
      )!,
      unidad: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}unidad'],
      ),
      valorMinimoNormal: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}valor_minimo_normal'],
      ),
      valorMaximoNormal: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}valor_maximo_normal'],
      ),
      valorMinimoAdvertencia: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}valor_minimo_advertencia'],
      ),
      valorMaximoAdvertencia: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}valor_maximo_advertencia'],
      ),
      valorMinimoCritico: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}valor_minimo_critico'],
      ),
      valorMaximoCritico: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}valor_maximo_critico'],
      ),
      tipoEquipoAplica: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tipo_equipo_aplica'],
      ),
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $ParametrosCatalogoTable createAlias(String alias) {
    return $ParametrosCatalogoTable(attachedDatabase, alias);
  }
}

class ParametrosCatalogoData extends DataClass
    implements Insertable<ParametrosCatalogoData> {
  final int id;
  final String codigo;
  final String nombre;
  final String? unidad;
  final double? valorMinimoNormal;
  final double? valorMaximoNormal;
  final double? valorMinimoAdvertencia;
  final double? valorMaximoAdvertencia;
  final double? valorMinimoCritico;
  final double? valorMaximoCritico;
  final String? tipoEquipoAplica;
  final DateTime? lastSyncedAt;
  const ParametrosCatalogoData({
    required this.id,
    required this.codigo,
    required this.nombre,
    this.unidad,
    this.valorMinimoNormal,
    this.valorMaximoNormal,
    this.valorMinimoAdvertencia,
    this.valorMaximoAdvertencia,
    this.valorMinimoCritico,
    this.valorMaximoCritico,
    this.tipoEquipoAplica,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['codigo'] = Variable<String>(codigo);
    map['nombre'] = Variable<String>(nombre);
    if (!nullToAbsent || unidad != null) {
      map['unidad'] = Variable<String>(unidad);
    }
    if (!nullToAbsent || valorMinimoNormal != null) {
      map['valor_minimo_normal'] = Variable<double>(valorMinimoNormal);
    }
    if (!nullToAbsent || valorMaximoNormal != null) {
      map['valor_maximo_normal'] = Variable<double>(valorMaximoNormal);
    }
    if (!nullToAbsent || valorMinimoAdvertencia != null) {
      map['valor_minimo_advertencia'] = Variable<double>(
        valorMinimoAdvertencia,
      );
    }
    if (!nullToAbsent || valorMaximoAdvertencia != null) {
      map['valor_maximo_advertencia'] = Variable<double>(
        valorMaximoAdvertencia,
      );
    }
    if (!nullToAbsent || valorMinimoCritico != null) {
      map['valor_minimo_critico'] = Variable<double>(valorMinimoCritico);
    }
    if (!nullToAbsent || valorMaximoCritico != null) {
      map['valor_maximo_critico'] = Variable<double>(valorMaximoCritico);
    }
    if (!nullToAbsent || tipoEquipoAplica != null) {
      map['tipo_equipo_aplica'] = Variable<String>(tipoEquipoAplica);
    }
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  ParametrosCatalogoCompanion toCompanion(bool nullToAbsent) {
    return ParametrosCatalogoCompanion(
      id: Value(id),
      codigo: Value(codigo),
      nombre: Value(nombre),
      unidad: unidad == null && nullToAbsent
          ? const Value.absent()
          : Value(unidad),
      valorMinimoNormal: valorMinimoNormal == null && nullToAbsent
          ? const Value.absent()
          : Value(valorMinimoNormal),
      valorMaximoNormal: valorMaximoNormal == null && nullToAbsent
          ? const Value.absent()
          : Value(valorMaximoNormal),
      valorMinimoAdvertencia: valorMinimoAdvertencia == null && nullToAbsent
          ? const Value.absent()
          : Value(valorMinimoAdvertencia),
      valorMaximoAdvertencia: valorMaximoAdvertencia == null && nullToAbsent
          ? const Value.absent()
          : Value(valorMaximoAdvertencia),
      valorMinimoCritico: valorMinimoCritico == null && nullToAbsent
          ? const Value.absent()
          : Value(valorMinimoCritico),
      valorMaximoCritico: valorMaximoCritico == null && nullToAbsent
          ? const Value.absent()
          : Value(valorMaximoCritico),
      tipoEquipoAplica: tipoEquipoAplica == null && nullToAbsent
          ? const Value.absent()
          : Value(tipoEquipoAplica),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory ParametrosCatalogoData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ParametrosCatalogoData(
      id: serializer.fromJson<int>(json['id']),
      codigo: serializer.fromJson<String>(json['codigo']),
      nombre: serializer.fromJson<String>(json['nombre']),
      unidad: serializer.fromJson<String?>(json['unidad']),
      valorMinimoNormal: serializer.fromJson<double?>(
        json['valorMinimoNormal'],
      ),
      valorMaximoNormal: serializer.fromJson<double?>(
        json['valorMaximoNormal'],
      ),
      valorMinimoAdvertencia: serializer.fromJson<double?>(
        json['valorMinimoAdvertencia'],
      ),
      valorMaximoAdvertencia: serializer.fromJson<double?>(
        json['valorMaximoAdvertencia'],
      ),
      valorMinimoCritico: serializer.fromJson<double?>(
        json['valorMinimoCritico'],
      ),
      valorMaximoCritico: serializer.fromJson<double?>(
        json['valorMaximoCritico'],
      ),
      tipoEquipoAplica: serializer.fromJson<String?>(json['tipoEquipoAplica']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'codigo': serializer.toJson<String>(codigo),
      'nombre': serializer.toJson<String>(nombre),
      'unidad': serializer.toJson<String?>(unidad),
      'valorMinimoNormal': serializer.toJson<double?>(valorMinimoNormal),
      'valorMaximoNormal': serializer.toJson<double?>(valorMaximoNormal),
      'valorMinimoAdvertencia': serializer.toJson<double?>(
        valorMinimoAdvertencia,
      ),
      'valorMaximoAdvertencia': serializer.toJson<double?>(
        valorMaximoAdvertencia,
      ),
      'valorMinimoCritico': serializer.toJson<double?>(valorMinimoCritico),
      'valorMaximoCritico': serializer.toJson<double?>(valorMaximoCritico),
      'tipoEquipoAplica': serializer.toJson<String?>(tipoEquipoAplica),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  ParametrosCatalogoData copyWith({
    int? id,
    String? codigo,
    String? nombre,
    Value<String?> unidad = const Value.absent(),
    Value<double?> valorMinimoNormal = const Value.absent(),
    Value<double?> valorMaximoNormal = const Value.absent(),
    Value<double?> valorMinimoAdvertencia = const Value.absent(),
    Value<double?> valorMaximoAdvertencia = const Value.absent(),
    Value<double?> valorMinimoCritico = const Value.absent(),
    Value<double?> valorMaximoCritico = const Value.absent(),
    Value<String?> tipoEquipoAplica = const Value.absent(),
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => ParametrosCatalogoData(
    id: id ?? this.id,
    codigo: codigo ?? this.codigo,
    nombre: nombre ?? this.nombre,
    unidad: unidad.present ? unidad.value : this.unidad,
    valorMinimoNormal: valorMinimoNormal.present
        ? valorMinimoNormal.value
        : this.valorMinimoNormal,
    valorMaximoNormal: valorMaximoNormal.present
        ? valorMaximoNormal.value
        : this.valorMaximoNormal,
    valorMinimoAdvertencia: valorMinimoAdvertencia.present
        ? valorMinimoAdvertencia.value
        : this.valorMinimoAdvertencia,
    valorMaximoAdvertencia: valorMaximoAdvertencia.present
        ? valorMaximoAdvertencia.value
        : this.valorMaximoAdvertencia,
    valorMinimoCritico: valorMinimoCritico.present
        ? valorMinimoCritico.value
        : this.valorMinimoCritico,
    valorMaximoCritico: valorMaximoCritico.present
        ? valorMaximoCritico.value
        : this.valorMaximoCritico,
    tipoEquipoAplica: tipoEquipoAplica.present
        ? tipoEquipoAplica.value
        : this.tipoEquipoAplica,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  ParametrosCatalogoData copyWithCompanion(ParametrosCatalogoCompanion data) {
    return ParametrosCatalogoData(
      id: data.id.present ? data.id.value : this.id,
      codigo: data.codigo.present ? data.codigo.value : this.codigo,
      nombre: data.nombre.present ? data.nombre.value : this.nombre,
      unidad: data.unidad.present ? data.unidad.value : this.unidad,
      valorMinimoNormal: data.valorMinimoNormal.present
          ? data.valorMinimoNormal.value
          : this.valorMinimoNormal,
      valorMaximoNormal: data.valorMaximoNormal.present
          ? data.valorMaximoNormal.value
          : this.valorMaximoNormal,
      valorMinimoAdvertencia: data.valorMinimoAdvertencia.present
          ? data.valorMinimoAdvertencia.value
          : this.valorMinimoAdvertencia,
      valorMaximoAdvertencia: data.valorMaximoAdvertencia.present
          ? data.valorMaximoAdvertencia.value
          : this.valorMaximoAdvertencia,
      valorMinimoCritico: data.valorMinimoCritico.present
          ? data.valorMinimoCritico.value
          : this.valorMinimoCritico,
      valorMaximoCritico: data.valorMaximoCritico.present
          ? data.valorMaximoCritico.value
          : this.valorMaximoCritico,
      tipoEquipoAplica: data.tipoEquipoAplica.present
          ? data.tipoEquipoAplica.value
          : this.tipoEquipoAplica,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ParametrosCatalogoData(')
          ..write('id: $id, ')
          ..write('codigo: $codigo, ')
          ..write('nombre: $nombre, ')
          ..write('unidad: $unidad, ')
          ..write('valorMinimoNormal: $valorMinimoNormal, ')
          ..write('valorMaximoNormal: $valorMaximoNormal, ')
          ..write('valorMinimoAdvertencia: $valorMinimoAdvertencia, ')
          ..write('valorMaximoAdvertencia: $valorMaximoAdvertencia, ')
          ..write('valorMinimoCritico: $valorMinimoCritico, ')
          ..write('valorMaximoCritico: $valorMaximoCritico, ')
          ..write('tipoEquipoAplica: $tipoEquipoAplica, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    codigo,
    nombre,
    unidad,
    valorMinimoNormal,
    valorMaximoNormal,
    valorMinimoAdvertencia,
    valorMaximoAdvertencia,
    valorMinimoCritico,
    valorMaximoCritico,
    tipoEquipoAplica,
    lastSyncedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ParametrosCatalogoData &&
          other.id == this.id &&
          other.codigo == this.codigo &&
          other.nombre == this.nombre &&
          other.unidad == this.unidad &&
          other.valorMinimoNormal == this.valorMinimoNormal &&
          other.valorMaximoNormal == this.valorMaximoNormal &&
          other.valorMinimoAdvertencia == this.valorMinimoAdvertencia &&
          other.valorMaximoAdvertencia == this.valorMaximoAdvertencia &&
          other.valorMinimoCritico == this.valorMinimoCritico &&
          other.valorMaximoCritico == this.valorMaximoCritico &&
          other.tipoEquipoAplica == this.tipoEquipoAplica &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class ParametrosCatalogoCompanion
    extends UpdateCompanion<ParametrosCatalogoData> {
  final Value<int> id;
  final Value<String> codigo;
  final Value<String> nombre;
  final Value<String?> unidad;
  final Value<double?> valorMinimoNormal;
  final Value<double?> valorMaximoNormal;
  final Value<double?> valorMinimoAdvertencia;
  final Value<double?> valorMaximoAdvertencia;
  final Value<double?> valorMinimoCritico;
  final Value<double?> valorMaximoCritico;
  final Value<String?> tipoEquipoAplica;
  final Value<DateTime?> lastSyncedAt;
  const ParametrosCatalogoCompanion({
    this.id = const Value.absent(),
    this.codigo = const Value.absent(),
    this.nombre = const Value.absent(),
    this.unidad = const Value.absent(),
    this.valorMinimoNormal = const Value.absent(),
    this.valorMaximoNormal = const Value.absent(),
    this.valorMinimoAdvertencia = const Value.absent(),
    this.valorMaximoAdvertencia = const Value.absent(),
    this.valorMinimoCritico = const Value.absent(),
    this.valorMaximoCritico = const Value.absent(),
    this.tipoEquipoAplica = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  ParametrosCatalogoCompanion.insert({
    this.id = const Value.absent(),
    required String codigo,
    required String nombre,
    this.unidad = const Value.absent(),
    this.valorMinimoNormal = const Value.absent(),
    this.valorMaximoNormal = const Value.absent(),
    this.valorMinimoAdvertencia = const Value.absent(),
    this.valorMaximoAdvertencia = const Value.absent(),
    this.valorMinimoCritico = const Value.absent(),
    this.valorMaximoCritico = const Value.absent(),
    this.tipoEquipoAplica = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : codigo = Value(codigo),
       nombre = Value(nombre);
  static Insertable<ParametrosCatalogoData> custom({
    Expression<int>? id,
    Expression<String>? codigo,
    Expression<String>? nombre,
    Expression<String>? unidad,
    Expression<double>? valorMinimoNormal,
    Expression<double>? valorMaximoNormal,
    Expression<double>? valorMinimoAdvertencia,
    Expression<double>? valorMaximoAdvertencia,
    Expression<double>? valorMinimoCritico,
    Expression<double>? valorMaximoCritico,
    Expression<String>? tipoEquipoAplica,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (codigo != null) 'codigo': codigo,
      if (nombre != null) 'nombre': nombre,
      if (unidad != null) 'unidad': unidad,
      if (valorMinimoNormal != null) 'valor_minimo_normal': valorMinimoNormal,
      if (valorMaximoNormal != null) 'valor_maximo_normal': valorMaximoNormal,
      if (valorMinimoAdvertencia != null)
        'valor_minimo_advertencia': valorMinimoAdvertencia,
      if (valorMaximoAdvertencia != null)
        'valor_maximo_advertencia': valorMaximoAdvertencia,
      if (valorMinimoCritico != null)
        'valor_minimo_critico': valorMinimoCritico,
      if (valorMaximoCritico != null)
        'valor_maximo_critico': valorMaximoCritico,
      if (tipoEquipoAplica != null) 'tipo_equipo_aplica': tipoEquipoAplica,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  ParametrosCatalogoCompanion copyWith({
    Value<int>? id,
    Value<String>? codigo,
    Value<String>? nombre,
    Value<String?>? unidad,
    Value<double?>? valorMinimoNormal,
    Value<double?>? valorMaximoNormal,
    Value<double?>? valorMinimoAdvertencia,
    Value<double?>? valorMaximoAdvertencia,
    Value<double?>? valorMinimoCritico,
    Value<double?>? valorMaximoCritico,
    Value<String?>? tipoEquipoAplica,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return ParametrosCatalogoCompanion(
      id: id ?? this.id,
      codigo: codigo ?? this.codigo,
      nombre: nombre ?? this.nombre,
      unidad: unidad ?? this.unidad,
      valorMinimoNormal: valorMinimoNormal ?? this.valorMinimoNormal,
      valorMaximoNormal: valorMaximoNormal ?? this.valorMaximoNormal,
      valorMinimoAdvertencia:
          valorMinimoAdvertencia ?? this.valorMinimoAdvertencia,
      valorMaximoAdvertencia:
          valorMaximoAdvertencia ?? this.valorMaximoAdvertencia,
      valorMinimoCritico: valorMinimoCritico ?? this.valorMinimoCritico,
      valorMaximoCritico: valorMaximoCritico ?? this.valorMaximoCritico,
      tipoEquipoAplica: tipoEquipoAplica ?? this.tipoEquipoAplica,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (codigo.present) {
      map['codigo'] = Variable<String>(codigo.value);
    }
    if (nombre.present) {
      map['nombre'] = Variable<String>(nombre.value);
    }
    if (unidad.present) {
      map['unidad'] = Variable<String>(unidad.value);
    }
    if (valorMinimoNormal.present) {
      map['valor_minimo_normal'] = Variable<double>(valorMinimoNormal.value);
    }
    if (valorMaximoNormal.present) {
      map['valor_maximo_normal'] = Variable<double>(valorMaximoNormal.value);
    }
    if (valorMinimoAdvertencia.present) {
      map['valor_minimo_advertencia'] = Variable<double>(
        valorMinimoAdvertencia.value,
      );
    }
    if (valorMaximoAdvertencia.present) {
      map['valor_maximo_advertencia'] = Variable<double>(
        valorMaximoAdvertencia.value,
      );
    }
    if (valorMinimoCritico.present) {
      map['valor_minimo_critico'] = Variable<double>(valorMinimoCritico.value);
    }
    if (valorMaximoCritico.present) {
      map['valor_maximo_critico'] = Variable<double>(valorMaximoCritico.value);
    }
    if (tipoEquipoAplica.present) {
      map['tipo_equipo_aplica'] = Variable<String>(tipoEquipoAplica.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ParametrosCatalogoCompanion(')
          ..write('id: $id, ')
          ..write('codigo: $codigo, ')
          ..write('nombre: $nombre, ')
          ..write('unidad: $unidad, ')
          ..write('valorMinimoNormal: $valorMinimoNormal, ')
          ..write('valorMaximoNormal: $valorMaximoNormal, ')
          ..write('valorMinimoAdvertencia: $valorMinimoAdvertencia, ')
          ..write('valorMaximoAdvertencia: $valorMaximoAdvertencia, ')
          ..write('valorMinimoCritico: $valorMinimoCritico, ')
          ..write('valorMaximoCritico: $valorMaximoCritico, ')
          ..write('tipoEquipoAplica: $tipoEquipoAplica, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $ActividadesCatalogoTable extends ActividadesCatalogo
    with TableInfo<$ActividadesCatalogoTable, ActividadesCatalogoData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ActividadesCatalogoTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _codigoMeta = const VerificationMeta('codigo');
  @override
  late final GeneratedColumn<String> codigo = GeneratedColumn<String>(
    'codigo',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 50),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _descripcionMeta = const VerificationMeta(
    'descripcion',
  );
  @override
  late final GeneratedColumn<String> descripcion = GeneratedColumn<String>(
    'descripcion',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _tipoActividadMeta = const VerificationMeta(
    'tipoActividad',
  );
  @override
  late final GeneratedColumn<String> tipoActividad = GeneratedColumn<String>(
    'tipo_actividad',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 30),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _ordenEjecucionMeta = const VerificationMeta(
    'ordenEjecucion',
  );
  @override
  late final GeneratedColumn<int> ordenEjecucion = GeneratedColumn<int>(
    'orden_ejecucion',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _esObligatoriaMeta = const VerificationMeta(
    'esObligatoria',
  );
  @override
  late final GeneratedColumn<bool> esObligatoria = GeneratedColumn<bool>(
    'es_obligatoria',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("es_obligatoria" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _tiempoEstimadoMinutosMeta =
      const VerificationMeta('tiempoEstimadoMinutos');
  @override
  late final GeneratedColumn<int> tiempoEstimadoMinutos = GeneratedColumn<int>(
    'tiempo_estimado_minutos',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _instruccionesMeta = const VerificationMeta(
    'instrucciones',
  );
  @override
  late final GeneratedColumn<String> instrucciones = GeneratedColumn<String>(
    'instrucciones',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _precaucionesMeta = const VerificationMeta(
    'precauciones',
  );
  @override
  late final GeneratedColumn<String> precauciones = GeneratedColumn<String>(
    'precauciones',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _idParametroMedicionMeta =
      const VerificationMeta('idParametroMedicion');
  @override
  late final GeneratedColumn<int> idParametroMedicion = GeneratedColumn<int>(
    'id_parametro_medicion',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES parametros_catalogo (id)',
    ),
  );
  static const VerificationMeta _sistemaMeta = const VerificationMeta(
    'sistema',
  );
  @override
  late final GeneratedColumn<String> sistema = GeneratedColumn<String>(
    'sistema',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _idTipoServicioMeta = const VerificationMeta(
    'idTipoServicio',
  );
  @override
  late final GeneratedColumn<int> idTipoServicio = GeneratedColumn<int>(
    'id_tipo_servicio',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES tipos_servicio (id)',
    ),
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    codigo,
    descripcion,
    tipoActividad,
    ordenEjecucion,
    esObligatoria,
    tiempoEstimadoMinutos,
    instrucciones,
    precauciones,
    idParametroMedicion,
    sistema,
    idTipoServicio,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'actividades_catalogo';
  @override
  VerificationContext validateIntegrity(
    Insertable<ActividadesCatalogoData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('codigo')) {
      context.handle(
        _codigoMeta,
        codigo.isAcceptableOrUnknown(data['codigo']!, _codigoMeta),
      );
    } else if (isInserting) {
      context.missing(_codigoMeta);
    }
    if (data.containsKey('descripcion')) {
      context.handle(
        _descripcionMeta,
        descripcion.isAcceptableOrUnknown(
          data['descripcion']!,
          _descripcionMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_descripcionMeta);
    }
    if (data.containsKey('tipo_actividad')) {
      context.handle(
        _tipoActividadMeta,
        tipoActividad.isAcceptableOrUnknown(
          data['tipo_actividad']!,
          _tipoActividadMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_tipoActividadMeta);
    }
    if (data.containsKey('orden_ejecucion')) {
      context.handle(
        _ordenEjecucionMeta,
        ordenEjecucion.isAcceptableOrUnknown(
          data['orden_ejecucion']!,
          _ordenEjecucionMeta,
        ),
      );
    }
    if (data.containsKey('es_obligatoria')) {
      context.handle(
        _esObligatoriaMeta,
        esObligatoria.isAcceptableOrUnknown(
          data['es_obligatoria']!,
          _esObligatoriaMeta,
        ),
      );
    }
    if (data.containsKey('tiempo_estimado_minutos')) {
      context.handle(
        _tiempoEstimadoMinutosMeta,
        tiempoEstimadoMinutos.isAcceptableOrUnknown(
          data['tiempo_estimado_minutos']!,
          _tiempoEstimadoMinutosMeta,
        ),
      );
    }
    if (data.containsKey('instrucciones')) {
      context.handle(
        _instruccionesMeta,
        instrucciones.isAcceptableOrUnknown(
          data['instrucciones']!,
          _instruccionesMeta,
        ),
      );
    }
    if (data.containsKey('precauciones')) {
      context.handle(
        _precaucionesMeta,
        precauciones.isAcceptableOrUnknown(
          data['precauciones']!,
          _precaucionesMeta,
        ),
      );
    }
    if (data.containsKey('id_parametro_medicion')) {
      context.handle(
        _idParametroMedicionMeta,
        idParametroMedicion.isAcceptableOrUnknown(
          data['id_parametro_medicion']!,
          _idParametroMedicionMeta,
        ),
      );
    }
    if (data.containsKey('sistema')) {
      context.handle(
        _sistemaMeta,
        sistema.isAcceptableOrUnknown(data['sistema']!, _sistemaMeta),
      );
    }
    if (data.containsKey('id_tipo_servicio')) {
      context.handle(
        _idTipoServicioMeta,
        idTipoServicio.isAcceptableOrUnknown(
          data['id_tipo_servicio']!,
          _idTipoServicioMeta,
        ),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  ActividadesCatalogoData map(
    Map<String, dynamic> data, {
    String? tablePrefix,
  }) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ActividadesCatalogoData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      codigo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}codigo'],
      )!,
      descripcion: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}descripcion'],
      )!,
      tipoActividad: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tipo_actividad'],
      )!,
      ordenEjecucion: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}orden_ejecucion'],
      )!,
      esObligatoria: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}es_obligatoria'],
      )!,
      tiempoEstimadoMinutos: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}tiempo_estimado_minutos'],
      ),
      instrucciones: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}instrucciones'],
      ),
      precauciones: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}precauciones'],
      ),
      idParametroMedicion: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_parametro_medicion'],
      ),
      sistema: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sistema'],
      ),
      idTipoServicio: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_tipo_servicio'],
      ),
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $ActividadesCatalogoTable createAlias(String alias) {
    return $ActividadesCatalogoTable(attachedDatabase, alias);
  }
}

class ActividadesCatalogoData extends DataClass
    implements Insertable<ActividadesCatalogoData> {
  final int id;
  final String codigo;
  final String descripcion;
  final String tipoActividad;
  final int ordenEjecucion;
  final bool esObligatoria;
  final int? tiempoEstimadoMinutos;
  final String? instrucciones;
  final String? precauciones;
  final int? idParametroMedicion;
  final String? sistema;
  final int? idTipoServicio;
  final DateTime? lastSyncedAt;
  const ActividadesCatalogoData({
    required this.id,
    required this.codigo,
    required this.descripcion,
    required this.tipoActividad,
    required this.ordenEjecucion,
    required this.esObligatoria,
    this.tiempoEstimadoMinutos,
    this.instrucciones,
    this.precauciones,
    this.idParametroMedicion,
    this.sistema,
    this.idTipoServicio,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['codigo'] = Variable<String>(codigo);
    map['descripcion'] = Variable<String>(descripcion);
    map['tipo_actividad'] = Variable<String>(tipoActividad);
    map['orden_ejecucion'] = Variable<int>(ordenEjecucion);
    map['es_obligatoria'] = Variable<bool>(esObligatoria);
    if (!nullToAbsent || tiempoEstimadoMinutos != null) {
      map['tiempo_estimado_minutos'] = Variable<int>(tiempoEstimadoMinutos);
    }
    if (!nullToAbsent || instrucciones != null) {
      map['instrucciones'] = Variable<String>(instrucciones);
    }
    if (!nullToAbsent || precauciones != null) {
      map['precauciones'] = Variable<String>(precauciones);
    }
    if (!nullToAbsent || idParametroMedicion != null) {
      map['id_parametro_medicion'] = Variable<int>(idParametroMedicion);
    }
    if (!nullToAbsent || sistema != null) {
      map['sistema'] = Variable<String>(sistema);
    }
    if (!nullToAbsent || idTipoServicio != null) {
      map['id_tipo_servicio'] = Variable<int>(idTipoServicio);
    }
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  ActividadesCatalogoCompanion toCompanion(bool nullToAbsent) {
    return ActividadesCatalogoCompanion(
      id: Value(id),
      codigo: Value(codigo),
      descripcion: Value(descripcion),
      tipoActividad: Value(tipoActividad),
      ordenEjecucion: Value(ordenEjecucion),
      esObligatoria: Value(esObligatoria),
      tiempoEstimadoMinutos: tiempoEstimadoMinutos == null && nullToAbsent
          ? const Value.absent()
          : Value(tiempoEstimadoMinutos),
      instrucciones: instrucciones == null && nullToAbsent
          ? const Value.absent()
          : Value(instrucciones),
      precauciones: precauciones == null && nullToAbsent
          ? const Value.absent()
          : Value(precauciones),
      idParametroMedicion: idParametroMedicion == null && nullToAbsent
          ? const Value.absent()
          : Value(idParametroMedicion),
      sistema: sistema == null && nullToAbsent
          ? const Value.absent()
          : Value(sistema),
      idTipoServicio: idTipoServicio == null && nullToAbsent
          ? const Value.absent()
          : Value(idTipoServicio),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory ActividadesCatalogoData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ActividadesCatalogoData(
      id: serializer.fromJson<int>(json['id']),
      codigo: serializer.fromJson<String>(json['codigo']),
      descripcion: serializer.fromJson<String>(json['descripcion']),
      tipoActividad: serializer.fromJson<String>(json['tipoActividad']),
      ordenEjecucion: serializer.fromJson<int>(json['ordenEjecucion']),
      esObligatoria: serializer.fromJson<bool>(json['esObligatoria']),
      tiempoEstimadoMinutos: serializer.fromJson<int?>(
        json['tiempoEstimadoMinutos'],
      ),
      instrucciones: serializer.fromJson<String?>(json['instrucciones']),
      precauciones: serializer.fromJson<String?>(json['precauciones']),
      idParametroMedicion: serializer.fromJson<int?>(
        json['idParametroMedicion'],
      ),
      sistema: serializer.fromJson<String?>(json['sistema']),
      idTipoServicio: serializer.fromJson<int?>(json['idTipoServicio']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'codigo': serializer.toJson<String>(codigo),
      'descripcion': serializer.toJson<String>(descripcion),
      'tipoActividad': serializer.toJson<String>(tipoActividad),
      'ordenEjecucion': serializer.toJson<int>(ordenEjecucion),
      'esObligatoria': serializer.toJson<bool>(esObligatoria),
      'tiempoEstimadoMinutos': serializer.toJson<int?>(tiempoEstimadoMinutos),
      'instrucciones': serializer.toJson<String?>(instrucciones),
      'precauciones': serializer.toJson<String?>(precauciones),
      'idParametroMedicion': serializer.toJson<int?>(idParametroMedicion),
      'sistema': serializer.toJson<String?>(sistema),
      'idTipoServicio': serializer.toJson<int?>(idTipoServicio),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  ActividadesCatalogoData copyWith({
    int? id,
    String? codigo,
    String? descripcion,
    String? tipoActividad,
    int? ordenEjecucion,
    bool? esObligatoria,
    Value<int?> tiempoEstimadoMinutos = const Value.absent(),
    Value<String?> instrucciones = const Value.absent(),
    Value<String?> precauciones = const Value.absent(),
    Value<int?> idParametroMedicion = const Value.absent(),
    Value<String?> sistema = const Value.absent(),
    Value<int?> idTipoServicio = const Value.absent(),
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => ActividadesCatalogoData(
    id: id ?? this.id,
    codigo: codigo ?? this.codigo,
    descripcion: descripcion ?? this.descripcion,
    tipoActividad: tipoActividad ?? this.tipoActividad,
    ordenEjecucion: ordenEjecucion ?? this.ordenEjecucion,
    esObligatoria: esObligatoria ?? this.esObligatoria,
    tiempoEstimadoMinutos: tiempoEstimadoMinutos.present
        ? tiempoEstimadoMinutos.value
        : this.tiempoEstimadoMinutos,
    instrucciones: instrucciones.present
        ? instrucciones.value
        : this.instrucciones,
    precauciones: precauciones.present ? precauciones.value : this.precauciones,
    idParametroMedicion: idParametroMedicion.present
        ? idParametroMedicion.value
        : this.idParametroMedicion,
    sistema: sistema.present ? sistema.value : this.sistema,
    idTipoServicio: idTipoServicio.present
        ? idTipoServicio.value
        : this.idTipoServicio,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  ActividadesCatalogoData copyWithCompanion(ActividadesCatalogoCompanion data) {
    return ActividadesCatalogoData(
      id: data.id.present ? data.id.value : this.id,
      codigo: data.codigo.present ? data.codigo.value : this.codigo,
      descripcion: data.descripcion.present
          ? data.descripcion.value
          : this.descripcion,
      tipoActividad: data.tipoActividad.present
          ? data.tipoActividad.value
          : this.tipoActividad,
      ordenEjecucion: data.ordenEjecucion.present
          ? data.ordenEjecucion.value
          : this.ordenEjecucion,
      esObligatoria: data.esObligatoria.present
          ? data.esObligatoria.value
          : this.esObligatoria,
      tiempoEstimadoMinutos: data.tiempoEstimadoMinutos.present
          ? data.tiempoEstimadoMinutos.value
          : this.tiempoEstimadoMinutos,
      instrucciones: data.instrucciones.present
          ? data.instrucciones.value
          : this.instrucciones,
      precauciones: data.precauciones.present
          ? data.precauciones.value
          : this.precauciones,
      idParametroMedicion: data.idParametroMedicion.present
          ? data.idParametroMedicion.value
          : this.idParametroMedicion,
      sistema: data.sistema.present ? data.sistema.value : this.sistema,
      idTipoServicio: data.idTipoServicio.present
          ? data.idTipoServicio.value
          : this.idTipoServicio,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ActividadesCatalogoData(')
          ..write('id: $id, ')
          ..write('codigo: $codigo, ')
          ..write('descripcion: $descripcion, ')
          ..write('tipoActividad: $tipoActividad, ')
          ..write('ordenEjecucion: $ordenEjecucion, ')
          ..write('esObligatoria: $esObligatoria, ')
          ..write('tiempoEstimadoMinutos: $tiempoEstimadoMinutos, ')
          ..write('instrucciones: $instrucciones, ')
          ..write('precauciones: $precauciones, ')
          ..write('idParametroMedicion: $idParametroMedicion, ')
          ..write('sistema: $sistema, ')
          ..write('idTipoServicio: $idTipoServicio, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    codigo,
    descripcion,
    tipoActividad,
    ordenEjecucion,
    esObligatoria,
    tiempoEstimadoMinutos,
    instrucciones,
    precauciones,
    idParametroMedicion,
    sistema,
    idTipoServicio,
    lastSyncedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ActividadesCatalogoData &&
          other.id == this.id &&
          other.codigo == this.codigo &&
          other.descripcion == this.descripcion &&
          other.tipoActividad == this.tipoActividad &&
          other.ordenEjecucion == this.ordenEjecucion &&
          other.esObligatoria == this.esObligatoria &&
          other.tiempoEstimadoMinutos == this.tiempoEstimadoMinutos &&
          other.instrucciones == this.instrucciones &&
          other.precauciones == this.precauciones &&
          other.idParametroMedicion == this.idParametroMedicion &&
          other.sistema == this.sistema &&
          other.idTipoServicio == this.idTipoServicio &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class ActividadesCatalogoCompanion
    extends UpdateCompanion<ActividadesCatalogoData> {
  final Value<int> id;
  final Value<String> codigo;
  final Value<String> descripcion;
  final Value<String> tipoActividad;
  final Value<int> ordenEjecucion;
  final Value<bool> esObligatoria;
  final Value<int?> tiempoEstimadoMinutos;
  final Value<String?> instrucciones;
  final Value<String?> precauciones;
  final Value<int?> idParametroMedicion;
  final Value<String?> sistema;
  final Value<int?> idTipoServicio;
  final Value<DateTime?> lastSyncedAt;
  const ActividadesCatalogoCompanion({
    this.id = const Value.absent(),
    this.codigo = const Value.absent(),
    this.descripcion = const Value.absent(),
    this.tipoActividad = const Value.absent(),
    this.ordenEjecucion = const Value.absent(),
    this.esObligatoria = const Value.absent(),
    this.tiempoEstimadoMinutos = const Value.absent(),
    this.instrucciones = const Value.absent(),
    this.precauciones = const Value.absent(),
    this.idParametroMedicion = const Value.absent(),
    this.sistema = const Value.absent(),
    this.idTipoServicio = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  ActividadesCatalogoCompanion.insert({
    this.id = const Value.absent(),
    required String codigo,
    required String descripcion,
    required String tipoActividad,
    this.ordenEjecucion = const Value.absent(),
    this.esObligatoria = const Value.absent(),
    this.tiempoEstimadoMinutos = const Value.absent(),
    this.instrucciones = const Value.absent(),
    this.precauciones = const Value.absent(),
    this.idParametroMedicion = const Value.absent(),
    this.sistema = const Value.absent(),
    this.idTipoServicio = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : codigo = Value(codigo),
       descripcion = Value(descripcion),
       tipoActividad = Value(tipoActividad);
  static Insertable<ActividadesCatalogoData> custom({
    Expression<int>? id,
    Expression<String>? codigo,
    Expression<String>? descripcion,
    Expression<String>? tipoActividad,
    Expression<int>? ordenEjecucion,
    Expression<bool>? esObligatoria,
    Expression<int>? tiempoEstimadoMinutos,
    Expression<String>? instrucciones,
    Expression<String>? precauciones,
    Expression<int>? idParametroMedicion,
    Expression<String>? sistema,
    Expression<int>? idTipoServicio,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (codigo != null) 'codigo': codigo,
      if (descripcion != null) 'descripcion': descripcion,
      if (tipoActividad != null) 'tipo_actividad': tipoActividad,
      if (ordenEjecucion != null) 'orden_ejecucion': ordenEjecucion,
      if (esObligatoria != null) 'es_obligatoria': esObligatoria,
      if (tiempoEstimadoMinutos != null)
        'tiempo_estimado_minutos': tiempoEstimadoMinutos,
      if (instrucciones != null) 'instrucciones': instrucciones,
      if (precauciones != null) 'precauciones': precauciones,
      if (idParametroMedicion != null)
        'id_parametro_medicion': idParametroMedicion,
      if (sistema != null) 'sistema': sistema,
      if (idTipoServicio != null) 'id_tipo_servicio': idTipoServicio,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  ActividadesCatalogoCompanion copyWith({
    Value<int>? id,
    Value<String>? codigo,
    Value<String>? descripcion,
    Value<String>? tipoActividad,
    Value<int>? ordenEjecucion,
    Value<bool>? esObligatoria,
    Value<int?>? tiempoEstimadoMinutos,
    Value<String?>? instrucciones,
    Value<String?>? precauciones,
    Value<int?>? idParametroMedicion,
    Value<String?>? sistema,
    Value<int?>? idTipoServicio,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return ActividadesCatalogoCompanion(
      id: id ?? this.id,
      codigo: codigo ?? this.codigo,
      descripcion: descripcion ?? this.descripcion,
      tipoActividad: tipoActividad ?? this.tipoActividad,
      ordenEjecucion: ordenEjecucion ?? this.ordenEjecucion,
      esObligatoria: esObligatoria ?? this.esObligatoria,
      tiempoEstimadoMinutos:
          tiempoEstimadoMinutos ?? this.tiempoEstimadoMinutos,
      instrucciones: instrucciones ?? this.instrucciones,
      precauciones: precauciones ?? this.precauciones,
      idParametroMedicion: idParametroMedicion ?? this.idParametroMedicion,
      sistema: sistema ?? this.sistema,
      idTipoServicio: idTipoServicio ?? this.idTipoServicio,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (codigo.present) {
      map['codigo'] = Variable<String>(codigo.value);
    }
    if (descripcion.present) {
      map['descripcion'] = Variable<String>(descripcion.value);
    }
    if (tipoActividad.present) {
      map['tipo_actividad'] = Variable<String>(tipoActividad.value);
    }
    if (ordenEjecucion.present) {
      map['orden_ejecucion'] = Variable<int>(ordenEjecucion.value);
    }
    if (esObligatoria.present) {
      map['es_obligatoria'] = Variable<bool>(esObligatoria.value);
    }
    if (tiempoEstimadoMinutos.present) {
      map['tiempo_estimado_minutos'] = Variable<int>(
        tiempoEstimadoMinutos.value,
      );
    }
    if (instrucciones.present) {
      map['instrucciones'] = Variable<String>(instrucciones.value);
    }
    if (precauciones.present) {
      map['precauciones'] = Variable<String>(precauciones.value);
    }
    if (idParametroMedicion.present) {
      map['id_parametro_medicion'] = Variable<int>(idParametroMedicion.value);
    }
    if (sistema.present) {
      map['sistema'] = Variable<String>(sistema.value);
    }
    if (idTipoServicio.present) {
      map['id_tipo_servicio'] = Variable<int>(idTipoServicio.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ActividadesCatalogoCompanion(')
          ..write('id: $id, ')
          ..write('codigo: $codigo, ')
          ..write('descripcion: $descripcion, ')
          ..write('tipoActividad: $tipoActividad, ')
          ..write('ordenEjecucion: $ordenEjecucion, ')
          ..write('esObligatoria: $esObligatoria, ')
          ..write('tiempoEstimadoMinutos: $tiempoEstimadoMinutos, ')
          ..write('instrucciones: $instrucciones, ')
          ..write('precauciones: $precauciones, ')
          ..write('idParametroMedicion: $idParametroMedicion, ')
          ..write('sistema: $sistema, ')
          ..write('idTipoServicio: $idTipoServicio, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $ClientesTable extends Clientes with TableInfo<$ClientesTable, Cliente> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ClientesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _nombreMeta = const VerificationMeta('nombre');
  @override
  late final GeneratedColumn<String> nombre = GeneratedColumn<String>(
    'nombre',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 200),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _direccionMeta = const VerificationMeta(
    'direccion',
  );
  @override
  late final GeneratedColumn<String> direccion = GeneratedColumn<String>(
    'direccion',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _telefonoMeta = const VerificationMeta(
    'telefono',
  );
  @override
  late final GeneratedColumn<String> telefono = GeneratedColumn<String>(
    'telefono',
    aliasedName,
    true,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 50),
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _emailMeta = const VerificationMeta('email');
  @override
  late final GeneratedColumn<String> email = GeneratedColumn<String>(
    'email',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _nitMeta = const VerificationMeta('nit');
  @override
  late final GeneratedColumn<String> nit = GeneratedColumn<String>(
    'nit',
    aliasedName,
    true,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 50),
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _activoMeta = const VerificationMeta('activo');
  @override
  late final GeneratedColumn<bool> activo = GeneratedColumn<bool>(
    'activo',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("activo" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    nombre,
    direccion,
    telefono,
    email,
    nit,
    activo,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'clientes';
  @override
  VerificationContext validateIntegrity(
    Insertable<Cliente> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('nombre')) {
      context.handle(
        _nombreMeta,
        nombre.isAcceptableOrUnknown(data['nombre']!, _nombreMeta),
      );
    } else if (isInserting) {
      context.missing(_nombreMeta);
    }
    if (data.containsKey('direccion')) {
      context.handle(
        _direccionMeta,
        direccion.isAcceptableOrUnknown(data['direccion']!, _direccionMeta),
      );
    }
    if (data.containsKey('telefono')) {
      context.handle(
        _telefonoMeta,
        telefono.isAcceptableOrUnknown(data['telefono']!, _telefonoMeta),
      );
    }
    if (data.containsKey('email')) {
      context.handle(
        _emailMeta,
        email.isAcceptableOrUnknown(data['email']!, _emailMeta),
      );
    }
    if (data.containsKey('nit')) {
      context.handle(
        _nitMeta,
        nit.isAcceptableOrUnknown(data['nit']!, _nitMeta),
      );
    }
    if (data.containsKey('activo')) {
      context.handle(
        _activoMeta,
        activo.isAcceptableOrUnknown(data['activo']!, _activoMeta),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Cliente map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Cliente(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      nombre: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nombre'],
      )!,
      direccion: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}direccion'],
      ),
      telefono: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}telefono'],
      ),
      email: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}email'],
      ),
      nit: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nit'],
      ),
      activo: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}activo'],
      )!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $ClientesTable createAlias(String alias) {
    return $ClientesTable(attachedDatabase, alias);
  }
}

class Cliente extends DataClass implements Insertable<Cliente> {
  final int id;
  final String nombre;
  final String? direccion;
  final String? telefono;
  final String? email;
  final String? nit;
  final bool activo;
  final DateTime? lastSyncedAt;
  const Cliente({
    required this.id,
    required this.nombre,
    this.direccion,
    this.telefono,
    this.email,
    this.nit,
    required this.activo,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['nombre'] = Variable<String>(nombre);
    if (!nullToAbsent || direccion != null) {
      map['direccion'] = Variable<String>(direccion);
    }
    if (!nullToAbsent || telefono != null) {
      map['telefono'] = Variable<String>(telefono);
    }
    if (!nullToAbsent || email != null) {
      map['email'] = Variable<String>(email);
    }
    if (!nullToAbsent || nit != null) {
      map['nit'] = Variable<String>(nit);
    }
    map['activo'] = Variable<bool>(activo);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  ClientesCompanion toCompanion(bool nullToAbsent) {
    return ClientesCompanion(
      id: Value(id),
      nombre: Value(nombre),
      direccion: direccion == null && nullToAbsent
          ? const Value.absent()
          : Value(direccion),
      telefono: telefono == null && nullToAbsent
          ? const Value.absent()
          : Value(telefono),
      email: email == null && nullToAbsent
          ? const Value.absent()
          : Value(email),
      nit: nit == null && nullToAbsent ? const Value.absent() : Value(nit),
      activo: Value(activo),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory Cliente.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Cliente(
      id: serializer.fromJson<int>(json['id']),
      nombre: serializer.fromJson<String>(json['nombre']),
      direccion: serializer.fromJson<String?>(json['direccion']),
      telefono: serializer.fromJson<String?>(json['telefono']),
      email: serializer.fromJson<String?>(json['email']),
      nit: serializer.fromJson<String?>(json['nit']),
      activo: serializer.fromJson<bool>(json['activo']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'nombre': serializer.toJson<String>(nombre),
      'direccion': serializer.toJson<String?>(direccion),
      'telefono': serializer.toJson<String?>(telefono),
      'email': serializer.toJson<String?>(email),
      'nit': serializer.toJson<String?>(nit),
      'activo': serializer.toJson<bool>(activo),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  Cliente copyWith({
    int? id,
    String? nombre,
    Value<String?> direccion = const Value.absent(),
    Value<String?> telefono = const Value.absent(),
    Value<String?> email = const Value.absent(),
    Value<String?> nit = const Value.absent(),
    bool? activo,
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => Cliente(
    id: id ?? this.id,
    nombre: nombre ?? this.nombre,
    direccion: direccion.present ? direccion.value : this.direccion,
    telefono: telefono.present ? telefono.value : this.telefono,
    email: email.present ? email.value : this.email,
    nit: nit.present ? nit.value : this.nit,
    activo: activo ?? this.activo,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  Cliente copyWithCompanion(ClientesCompanion data) {
    return Cliente(
      id: data.id.present ? data.id.value : this.id,
      nombre: data.nombre.present ? data.nombre.value : this.nombre,
      direccion: data.direccion.present ? data.direccion.value : this.direccion,
      telefono: data.telefono.present ? data.telefono.value : this.telefono,
      email: data.email.present ? data.email.value : this.email,
      nit: data.nit.present ? data.nit.value : this.nit,
      activo: data.activo.present ? data.activo.value : this.activo,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Cliente(')
          ..write('id: $id, ')
          ..write('nombre: $nombre, ')
          ..write('direccion: $direccion, ')
          ..write('telefono: $telefono, ')
          ..write('email: $email, ')
          ..write('nit: $nit, ')
          ..write('activo: $activo, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    nombre,
    direccion,
    telefono,
    email,
    nit,
    activo,
    lastSyncedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Cliente &&
          other.id == this.id &&
          other.nombre == this.nombre &&
          other.direccion == this.direccion &&
          other.telefono == this.telefono &&
          other.email == this.email &&
          other.nit == this.nit &&
          other.activo == this.activo &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class ClientesCompanion extends UpdateCompanion<Cliente> {
  final Value<int> id;
  final Value<String> nombre;
  final Value<String?> direccion;
  final Value<String?> telefono;
  final Value<String?> email;
  final Value<String?> nit;
  final Value<bool> activo;
  final Value<DateTime?> lastSyncedAt;
  const ClientesCompanion({
    this.id = const Value.absent(),
    this.nombre = const Value.absent(),
    this.direccion = const Value.absent(),
    this.telefono = const Value.absent(),
    this.email = const Value.absent(),
    this.nit = const Value.absent(),
    this.activo = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  ClientesCompanion.insert({
    this.id = const Value.absent(),
    required String nombre,
    this.direccion = const Value.absent(),
    this.telefono = const Value.absent(),
    this.email = const Value.absent(),
    this.nit = const Value.absent(),
    this.activo = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : nombre = Value(nombre);
  static Insertable<Cliente> custom({
    Expression<int>? id,
    Expression<String>? nombre,
    Expression<String>? direccion,
    Expression<String>? telefono,
    Expression<String>? email,
    Expression<String>? nit,
    Expression<bool>? activo,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (nombre != null) 'nombre': nombre,
      if (direccion != null) 'direccion': direccion,
      if (telefono != null) 'telefono': telefono,
      if (email != null) 'email': email,
      if (nit != null) 'nit': nit,
      if (activo != null) 'activo': activo,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  ClientesCompanion copyWith({
    Value<int>? id,
    Value<String>? nombre,
    Value<String?>? direccion,
    Value<String?>? telefono,
    Value<String?>? email,
    Value<String?>? nit,
    Value<bool>? activo,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return ClientesCompanion(
      id: id ?? this.id,
      nombre: nombre ?? this.nombre,
      direccion: direccion ?? this.direccion,
      telefono: telefono ?? this.telefono,
      email: email ?? this.email,
      nit: nit ?? this.nit,
      activo: activo ?? this.activo,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (nombre.present) {
      map['nombre'] = Variable<String>(nombre.value);
    }
    if (direccion.present) {
      map['direccion'] = Variable<String>(direccion.value);
    }
    if (telefono.present) {
      map['telefono'] = Variable<String>(telefono.value);
    }
    if (email.present) {
      map['email'] = Variable<String>(email.value);
    }
    if (nit.present) {
      map['nit'] = Variable<String>(nit.value);
    }
    if (activo.present) {
      map['activo'] = Variable<bool>(activo.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ClientesCompanion(')
          ..write('id: $id, ')
          ..write('nombre: $nombre, ')
          ..write('direccion: $direccion, ')
          ..write('telefono: $telefono, ')
          ..write('email: $email, ')
          ..write('nit: $nit, ')
          ..write('activo: $activo, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $EquiposTable extends Equipos with TableInfo<$EquiposTable, Equipo> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $EquiposTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _codigoMeta = const VerificationMeta('codigo');
  @override
  late final GeneratedColumn<String> codigo = GeneratedColumn<String>(
    'codigo',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 50),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nombreMeta = const VerificationMeta('nombre');
  @override
  late final GeneratedColumn<String> nombre = GeneratedColumn<String>(
    'nombre',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 200),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _marcaMeta = const VerificationMeta('marca');
  @override
  late final GeneratedColumn<String> marca = GeneratedColumn<String>(
    'marca',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _modeloMeta = const VerificationMeta('modelo');
  @override
  late final GeneratedColumn<String> modelo = GeneratedColumn<String>(
    'modelo',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _serieMeta = const VerificationMeta('serie');
  @override
  late final GeneratedColumn<String> serie = GeneratedColumn<String>(
    'serie',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _ubicacionMeta = const VerificationMeta(
    'ubicacion',
  );
  @override
  late final GeneratedColumn<String> ubicacion = GeneratedColumn<String>(
    'ubicacion',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _tipoEquipoMeta = const VerificationMeta(
    'tipoEquipo',
  );
  @override
  late final GeneratedColumn<String> tipoEquipo = GeneratedColumn<String>(
    'tipo_equipo',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _idClienteMeta = const VerificationMeta(
    'idCliente',
  );
  @override
  late final GeneratedColumn<int> idCliente = GeneratedColumn<int>(
    'id_cliente',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES clientes (id)',
    ),
  );
  static const VerificationMeta _activoMeta = const VerificationMeta('activo');
  @override
  late final GeneratedColumn<bool> activo = GeneratedColumn<bool>(
    'activo',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("activo" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _configParametrosMeta = const VerificationMeta(
    'configParametros',
  );
  @override
  late final GeneratedColumn<String> configParametros = GeneratedColumn<String>(
    'config_parametros',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    codigo,
    nombre,
    marca,
    modelo,
    serie,
    ubicacion,
    tipoEquipo,
    idCliente,
    activo,
    configParametros,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'equipos';
  @override
  VerificationContext validateIntegrity(
    Insertable<Equipo> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('codigo')) {
      context.handle(
        _codigoMeta,
        codigo.isAcceptableOrUnknown(data['codigo']!, _codigoMeta),
      );
    } else if (isInserting) {
      context.missing(_codigoMeta);
    }
    if (data.containsKey('nombre')) {
      context.handle(
        _nombreMeta,
        nombre.isAcceptableOrUnknown(data['nombre']!, _nombreMeta),
      );
    } else if (isInserting) {
      context.missing(_nombreMeta);
    }
    if (data.containsKey('marca')) {
      context.handle(
        _marcaMeta,
        marca.isAcceptableOrUnknown(data['marca']!, _marcaMeta),
      );
    }
    if (data.containsKey('modelo')) {
      context.handle(
        _modeloMeta,
        modelo.isAcceptableOrUnknown(data['modelo']!, _modeloMeta),
      );
    }
    if (data.containsKey('serie')) {
      context.handle(
        _serieMeta,
        serie.isAcceptableOrUnknown(data['serie']!, _serieMeta),
      );
    }
    if (data.containsKey('ubicacion')) {
      context.handle(
        _ubicacionMeta,
        ubicacion.isAcceptableOrUnknown(data['ubicacion']!, _ubicacionMeta),
      );
    }
    if (data.containsKey('tipo_equipo')) {
      context.handle(
        _tipoEquipoMeta,
        tipoEquipo.isAcceptableOrUnknown(data['tipo_equipo']!, _tipoEquipoMeta),
      );
    }
    if (data.containsKey('id_cliente')) {
      context.handle(
        _idClienteMeta,
        idCliente.isAcceptableOrUnknown(data['id_cliente']!, _idClienteMeta),
      );
    }
    if (data.containsKey('activo')) {
      context.handle(
        _activoMeta,
        activo.isAcceptableOrUnknown(data['activo']!, _activoMeta),
      );
    }
    if (data.containsKey('config_parametros')) {
      context.handle(
        _configParametrosMeta,
        configParametros.isAcceptableOrUnknown(
          data['config_parametros']!,
          _configParametrosMeta,
        ),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  Equipo map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Equipo(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      codigo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}codigo'],
      )!,
      nombre: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nombre'],
      )!,
      marca: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}marca'],
      ),
      modelo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}modelo'],
      ),
      serie: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}serie'],
      ),
      ubicacion: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}ubicacion'],
      ),
      tipoEquipo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tipo_equipo'],
      ),
      idCliente: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_cliente'],
      ),
      activo: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}activo'],
      )!,
      configParametros: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}config_parametros'],
      ),
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $EquiposTable createAlias(String alias) {
    return $EquiposTable(attachedDatabase, alias);
  }
}

class Equipo extends DataClass implements Insertable<Equipo> {
  final int id;
  final String codigo;
  final String nombre;
  final String? marca;
  final String? modelo;
  final String? serie;
  final String? ubicacion;
  final String? tipoEquipo;
  final int? idCliente;
  final bool activo;
  final String? configParametros;
  final DateTime? lastSyncedAt;
  const Equipo({
    required this.id,
    required this.codigo,
    required this.nombre,
    this.marca,
    this.modelo,
    this.serie,
    this.ubicacion,
    this.tipoEquipo,
    this.idCliente,
    required this.activo,
    this.configParametros,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['codigo'] = Variable<String>(codigo);
    map['nombre'] = Variable<String>(nombre);
    if (!nullToAbsent || marca != null) {
      map['marca'] = Variable<String>(marca);
    }
    if (!nullToAbsent || modelo != null) {
      map['modelo'] = Variable<String>(modelo);
    }
    if (!nullToAbsent || serie != null) {
      map['serie'] = Variable<String>(serie);
    }
    if (!nullToAbsent || ubicacion != null) {
      map['ubicacion'] = Variable<String>(ubicacion);
    }
    if (!nullToAbsent || tipoEquipo != null) {
      map['tipo_equipo'] = Variable<String>(tipoEquipo);
    }
    if (!nullToAbsent || idCliente != null) {
      map['id_cliente'] = Variable<int>(idCliente);
    }
    map['activo'] = Variable<bool>(activo);
    if (!nullToAbsent || configParametros != null) {
      map['config_parametros'] = Variable<String>(configParametros);
    }
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  EquiposCompanion toCompanion(bool nullToAbsent) {
    return EquiposCompanion(
      id: Value(id),
      codigo: Value(codigo),
      nombre: Value(nombre),
      marca: marca == null && nullToAbsent
          ? const Value.absent()
          : Value(marca),
      modelo: modelo == null && nullToAbsent
          ? const Value.absent()
          : Value(modelo),
      serie: serie == null && nullToAbsent
          ? const Value.absent()
          : Value(serie),
      ubicacion: ubicacion == null && nullToAbsent
          ? const Value.absent()
          : Value(ubicacion),
      tipoEquipo: tipoEquipo == null && nullToAbsent
          ? const Value.absent()
          : Value(tipoEquipo),
      idCliente: idCliente == null && nullToAbsent
          ? const Value.absent()
          : Value(idCliente),
      activo: Value(activo),
      configParametros: configParametros == null && nullToAbsent
          ? const Value.absent()
          : Value(configParametros),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory Equipo.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Equipo(
      id: serializer.fromJson<int>(json['id']),
      codigo: serializer.fromJson<String>(json['codigo']),
      nombre: serializer.fromJson<String>(json['nombre']),
      marca: serializer.fromJson<String?>(json['marca']),
      modelo: serializer.fromJson<String?>(json['modelo']),
      serie: serializer.fromJson<String?>(json['serie']),
      ubicacion: serializer.fromJson<String?>(json['ubicacion']),
      tipoEquipo: serializer.fromJson<String?>(json['tipoEquipo']),
      idCliente: serializer.fromJson<int?>(json['idCliente']),
      activo: serializer.fromJson<bool>(json['activo']),
      configParametros: serializer.fromJson<String?>(json['configParametros']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'codigo': serializer.toJson<String>(codigo),
      'nombre': serializer.toJson<String>(nombre),
      'marca': serializer.toJson<String?>(marca),
      'modelo': serializer.toJson<String?>(modelo),
      'serie': serializer.toJson<String?>(serie),
      'ubicacion': serializer.toJson<String?>(ubicacion),
      'tipoEquipo': serializer.toJson<String?>(tipoEquipo),
      'idCliente': serializer.toJson<int?>(idCliente),
      'activo': serializer.toJson<bool>(activo),
      'configParametros': serializer.toJson<String?>(configParametros),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  Equipo copyWith({
    int? id,
    String? codigo,
    String? nombre,
    Value<String?> marca = const Value.absent(),
    Value<String?> modelo = const Value.absent(),
    Value<String?> serie = const Value.absent(),
    Value<String?> ubicacion = const Value.absent(),
    Value<String?> tipoEquipo = const Value.absent(),
    Value<int?> idCliente = const Value.absent(),
    bool? activo,
    Value<String?> configParametros = const Value.absent(),
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => Equipo(
    id: id ?? this.id,
    codigo: codigo ?? this.codigo,
    nombre: nombre ?? this.nombre,
    marca: marca.present ? marca.value : this.marca,
    modelo: modelo.present ? modelo.value : this.modelo,
    serie: serie.present ? serie.value : this.serie,
    ubicacion: ubicacion.present ? ubicacion.value : this.ubicacion,
    tipoEquipo: tipoEquipo.present ? tipoEquipo.value : this.tipoEquipo,
    idCliente: idCliente.present ? idCliente.value : this.idCliente,
    activo: activo ?? this.activo,
    configParametros: configParametros.present
        ? configParametros.value
        : this.configParametros,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  Equipo copyWithCompanion(EquiposCompanion data) {
    return Equipo(
      id: data.id.present ? data.id.value : this.id,
      codigo: data.codigo.present ? data.codigo.value : this.codigo,
      nombre: data.nombre.present ? data.nombre.value : this.nombre,
      marca: data.marca.present ? data.marca.value : this.marca,
      modelo: data.modelo.present ? data.modelo.value : this.modelo,
      serie: data.serie.present ? data.serie.value : this.serie,
      ubicacion: data.ubicacion.present ? data.ubicacion.value : this.ubicacion,
      tipoEquipo: data.tipoEquipo.present
          ? data.tipoEquipo.value
          : this.tipoEquipo,
      idCliente: data.idCliente.present ? data.idCliente.value : this.idCliente,
      activo: data.activo.present ? data.activo.value : this.activo,
      configParametros: data.configParametros.present
          ? data.configParametros.value
          : this.configParametros,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Equipo(')
          ..write('id: $id, ')
          ..write('codigo: $codigo, ')
          ..write('nombre: $nombre, ')
          ..write('marca: $marca, ')
          ..write('modelo: $modelo, ')
          ..write('serie: $serie, ')
          ..write('ubicacion: $ubicacion, ')
          ..write('tipoEquipo: $tipoEquipo, ')
          ..write('idCliente: $idCliente, ')
          ..write('activo: $activo, ')
          ..write('configParametros: $configParametros, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    codigo,
    nombre,
    marca,
    modelo,
    serie,
    ubicacion,
    tipoEquipo,
    idCliente,
    activo,
    configParametros,
    lastSyncedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Equipo &&
          other.id == this.id &&
          other.codigo == this.codigo &&
          other.nombre == this.nombre &&
          other.marca == this.marca &&
          other.modelo == this.modelo &&
          other.serie == this.serie &&
          other.ubicacion == this.ubicacion &&
          other.tipoEquipo == this.tipoEquipo &&
          other.idCliente == this.idCliente &&
          other.activo == this.activo &&
          other.configParametros == this.configParametros &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class EquiposCompanion extends UpdateCompanion<Equipo> {
  final Value<int> id;
  final Value<String> codigo;
  final Value<String> nombre;
  final Value<String?> marca;
  final Value<String?> modelo;
  final Value<String?> serie;
  final Value<String?> ubicacion;
  final Value<String?> tipoEquipo;
  final Value<int?> idCliente;
  final Value<bool> activo;
  final Value<String?> configParametros;
  final Value<DateTime?> lastSyncedAt;
  const EquiposCompanion({
    this.id = const Value.absent(),
    this.codigo = const Value.absent(),
    this.nombre = const Value.absent(),
    this.marca = const Value.absent(),
    this.modelo = const Value.absent(),
    this.serie = const Value.absent(),
    this.ubicacion = const Value.absent(),
    this.tipoEquipo = const Value.absent(),
    this.idCliente = const Value.absent(),
    this.activo = const Value.absent(),
    this.configParametros = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  EquiposCompanion.insert({
    this.id = const Value.absent(),
    required String codigo,
    required String nombre,
    this.marca = const Value.absent(),
    this.modelo = const Value.absent(),
    this.serie = const Value.absent(),
    this.ubicacion = const Value.absent(),
    this.tipoEquipo = const Value.absent(),
    this.idCliente = const Value.absent(),
    this.activo = const Value.absent(),
    this.configParametros = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : codigo = Value(codigo),
       nombre = Value(nombre);
  static Insertable<Equipo> custom({
    Expression<int>? id,
    Expression<String>? codigo,
    Expression<String>? nombre,
    Expression<String>? marca,
    Expression<String>? modelo,
    Expression<String>? serie,
    Expression<String>? ubicacion,
    Expression<String>? tipoEquipo,
    Expression<int>? idCliente,
    Expression<bool>? activo,
    Expression<String>? configParametros,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (codigo != null) 'codigo': codigo,
      if (nombre != null) 'nombre': nombre,
      if (marca != null) 'marca': marca,
      if (modelo != null) 'modelo': modelo,
      if (serie != null) 'serie': serie,
      if (ubicacion != null) 'ubicacion': ubicacion,
      if (tipoEquipo != null) 'tipo_equipo': tipoEquipo,
      if (idCliente != null) 'id_cliente': idCliente,
      if (activo != null) 'activo': activo,
      if (configParametros != null) 'config_parametros': configParametros,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  EquiposCompanion copyWith({
    Value<int>? id,
    Value<String>? codigo,
    Value<String>? nombre,
    Value<String?>? marca,
    Value<String?>? modelo,
    Value<String?>? serie,
    Value<String?>? ubicacion,
    Value<String?>? tipoEquipo,
    Value<int?>? idCliente,
    Value<bool>? activo,
    Value<String?>? configParametros,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return EquiposCompanion(
      id: id ?? this.id,
      codigo: codigo ?? this.codigo,
      nombre: nombre ?? this.nombre,
      marca: marca ?? this.marca,
      modelo: modelo ?? this.modelo,
      serie: serie ?? this.serie,
      ubicacion: ubicacion ?? this.ubicacion,
      tipoEquipo: tipoEquipo ?? this.tipoEquipo,
      idCliente: idCliente ?? this.idCliente,
      activo: activo ?? this.activo,
      configParametros: configParametros ?? this.configParametros,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (codigo.present) {
      map['codigo'] = Variable<String>(codigo.value);
    }
    if (nombre.present) {
      map['nombre'] = Variable<String>(nombre.value);
    }
    if (marca.present) {
      map['marca'] = Variable<String>(marca.value);
    }
    if (modelo.present) {
      map['modelo'] = Variable<String>(modelo.value);
    }
    if (serie.present) {
      map['serie'] = Variable<String>(serie.value);
    }
    if (ubicacion.present) {
      map['ubicacion'] = Variable<String>(ubicacion.value);
    }
    if (tipoEquipo.present) {
      map['tipo_equipo'] = Variable<String>(tipoEquipo.value);
    }
    if (idCliente.present) {
      map['id_cliente'] = Variable<int>(idCliente.value);
    }
    if (activo.present) {
      map['activo'] = Variable<bool>(activo.value);
    }
    if (configParametros.present) {
      map['config_parametros'] = Variable<String>(configParametros.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('EquiposCompanion(')
          ..write('id: $id, ')
          ..write('codigo: $codigo, ')
          ..write('nombre: $nombre, ')
          ..write('marca: $marca, ')
          ..write('modelo: $modelo, ')
          ..write('serie: $serie, ')
          ..write('ubicacion: $ubicacion, ')
          ..write('tipoEquipo: $tipoEquipo, ')
          ..write('idCliente: $idCliente, ')
          ..write('activo: $activo, ')
          ..write('configParametros: $configParametros, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $OrdenesEquiposTable extends OrdenesEquipos
    with TableInfo<$OrdenesEquiposTable, OrdenesEquipo> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OrdenesEquiposTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idOrdenEquipoMeta = const VerificationMeta(
    'idOrdenEquipo',
  );
  @override
  late final GeneratedColumn<int> idOrdenEquipo = GeneratedColumn<int>(
    'id_orden_equipo',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _idOrdenServicioMeta = const VerificationMeta(
    'idOrdenServicio',
  );
  @override
  late final GeneratedColumn<int> idOrdenServicio = GeneratedColumn<int>(
    'id_orden_servicio',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _idEquipoMeta = const VerificationMeta(
    'idEquipo',
  );
  @override
  late final GeneratedColumn<int> idEquipo = GeneratedColumn<int>(
    'id_equipo',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _ordenSecuenciaMeta = const VerificationMeta(
    'ordenSecuencia',
  );
  @override
  late final GeneratedColumn<int> ordenSecuencia = GeneratedColumn<int>(
    'orden_secuencia',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _nombreSistemaMeta = const VerificationMeta(
    'nombreSistema',
  );
  @override
  late final GeneratedColumn<String> nombreSistema = GeneratedColumn<String>(
    'nombre_sistema',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _codigoEquipoMeta = const VerificationMeta(
    'codigoEquipo',
  );
  @override
  late final GeneratedColumn<String> codigoEquipo = GeneratedColumn<String>(
    'codigo_equipo',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _nombreEquipoMeta = const VerificationMeta(
    'nombreEquipo',
  );
  @override
  late final GeneratedColumn<String> nombreEquipo = GeneratedColumn<String>(
    'nombre_equipo',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _estadoMeta = const VerificationMeta('estado');
  @override
  late final GeneratedColumn<String> estado = GeneratedColumn<String>(
    'estado',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 20),
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('PENDIENTE'),
  );
  static const VerificationMeta _fechaInicioMeta = const VerificationMeta(
    'fechaInicio',
  );
  @override
  late final GeneratedColumn<DateTime> fechaInicio = GeneratedColumn<DateTime>(
    'fecha_inicio',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fechaFinMeta = const VerificationMeta(
    'fechaFin',
  );
  @override
  late final GeneratedColumn<DateTime> fechaFin = GeneratedColumn<DateTime>(
    'fecha_fin',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _observacionesMeta = const VerificationMeta(
    'observaciones',
  );
  @override
  late final GeneratedColumn<String> observaciones = GeneratedColumn<String>(
    'observaciones',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    idOrdenEquipo,
    idOrdenServicio,
    idEquipo,
    ordenSecuencia,
    nombreSistema,
    codigoEquipo,
    nombreEquipo,
    estado,
    fechaInicio,
    fechaFin,
    observaciones,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'ordenes_equipos';
  @override
  VerificationContext validateIntegrity(
    Insertable<OrdenesEquipo> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id_orden_equipo')) {
      context.handle(
        _idOrdenEquipoMeta,
        idOrdenEquipo.isAcceptableOrUnknown(
          data['id_orden_equipo']!,
          _idOrdenEquipoMeta,
        ),
      );
    }
    if (data.containsKey('id_orden_servicio')) {
      context.handle(
        _idOrdenServicioMeta,
        idOrdenServicio.isAcceptableOrUnknown(
          data['id_orden_servicio']!,
          _idOrdenServicioMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_idOrdenServicioMeta);
    }
    if (data.containsKey('id_equipo')) {
      context.handle(
        _idEquipoMeta,
        idEquipo.isAcceptableOrUnknown(data['id_equipo']!, _idEquipoMeta),
      );
    } else if (isInserting) {
      context.missing(_idEquipoMeta);
    }
    if (data.containsKey('orden_secuencia')) {
      context.handle(
        _ordenSecuenciaMeta,
        ordenSecuencia.isAcceptableOrUnknown(
          data['orden_secuencia']!,
          _ordenSecuenciaMeta,
        ),
      );
    }
    if (data.containsKey('nombre_sistema')) {
      context.handle(
        _nombreSistemaMeta,
        nombreSistema.isAcceptableOrUnknown(
          data['nombre_sistema']!,
          _nombreSistemaMeta,
        ),
      );
    }
    if (data.containsKey('codigo_equipo')) {
      context.handle(
        _codigoEquipoMeta,
        codigoEquipo.isAcceptableOrUnknown(
          data['codigo_equipo']!,
          _codigoEquipoMeta,
        ),
      );
    }
    if (data.containsKey('nombre_equipo')) {
      context.handle(
        _nombreEquipoMeta,
        nombreEquipo.isAcceptableOrUnknown(
          data['nombre_equipo']!,
          _nombreEquipoMeta,
        ),
      );
    }
    if (data.containsKey('estado')) {
      context.handle(
        _estadoMeta,
        estado.isAcceptableOrUnknown(data['estado']!, _estadoMeta),
      );
    }
    if (data.containsKey('fecha_inicio')) {
      context.handle(
        _fechaInicioMeta,
        fechaInicio.isAcceptableOrUnknown(
          data['fecha_inicio']!,
          _fechaInicioMeta,
        ),
      );
    }
    if (data.containsKey('fecha_fin')) {
      context.handle(
        _fechaFinMeta,
        fechaFin.isAcceptableOrUnknown(data['fecha_fin']!, _fechaFinMeta),
      );
    }
    if (data.containsKey('observaciones')) {
      context.handle(
        _observacionesMeta,
        observaciones.isAcceptableOrUnknown(
          data['observaciones']!,
          _observacionesMeta,
        ),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {idOrdenEquipo};
  @override
  OrdenesEquipo map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OrdenesEquipo(
      idOrdenEquipo: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden_equipo'],
      )!,
      idOrdenServicio: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden_servicio'],
      )!,
      idEquipo: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_equipo'],
      )!,
      ordenSecuencia: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}orden_secuencia'],
      )!,
      nombreSistema: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nombre_sistema'],
      ),
      codigoEquipo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}codigo_equipo'],
      ),
      nombreEquipo: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nombre_equipo'],
      ),
      estado: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}estado'],
      )!,
      fechaInicio: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_inicio'],
      ),
      fechaFin: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_fin'],
      ),
      observaciones: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}observaciones'],
      ),
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $OrdenesEquiposTable createAlias(String alias) {
    return $OrdenesEquiposTable(attachedDatabase, alias);
  }
}

class OrdenesEquipo extends DataClass implements Insertable<OrdenesEquipo> {
  final int idOrdenEquipo;
  final int idOrdenServicio;
  final int idEquipo;
  final int ordenSecuencia;
  final String? nombreSistema;
  final String? codigoEquipo;
  final String? nombreEquipo;
  final String estado;
  final DateTime? fechaInicio;
  final DateTime? fechaFin;
  final String? observaciones;
  final DateTime? lastSyncedAt;
  const OrdenesEquipo({
    required this.idOrdenEquipo,
    required this.idOrdenServicio,
    required this.idEquipo,
    required this.ordenSecuencia,
    this.nombreSistema,
    this.codigoEquipo,
    this.nombreEquipo,
    required this.estado,
    this.fechaInicio,
    this.fechaFin,
    this.observaciones,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id_orden_equipo'] = Variable<int>(idOrdenEquipo);
    map['id_orden_servicio'] = Variable<int>(idOrdenServicio);
    map['id_equipo'] = Variable<int>(idEquipo);
    map['orden_secuencia'] = Variable<int>(ordenSecuencia);
    if (!nullToAbsent || nombreSistema != null) {
      map['nombre_sistema'] = Variable<String>(nombreSistema);
    }
    if (!nullToAbsent || codigoEquipo != null) {
      map['codigo_equipo'] = Variable<String>(codigoEquipo);
    }
    if (!nullToAbsent || nombreEquipo != null) {
      map['nombre_equipo'] = Variable<String>(nombreEquipo);
    }
    map['estado'] = Variable<String>(estado);
    if (!nullToAbsent || fechaInicio != null) {
      map['fecha_inicio'] = Variable<DateTime>(fechaInicio);
    }
    if (!nullToAbsent || fechaFin != null) {
      map['fecha_fin'] = Variable<DateTime>(fechaFin);
    }
    if (!nullToAbsent || observaciones != null) {
      map['observaciones'] = Variable<String>(observaciones);
    }
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  OrdenesEquiposCompanion toCompanion(bool nullToAbsent) {
    return OrdenesEquiposCompanion(
      idOrdenEquipo: Value(idOrdenEquipo),
      idOrdenServicio: Value(idOrdenServicio),
      idEquipo: Value(idEquipo),
      ordenSecuencia: Value(ordenSecuencia),
      nombreSistema: nombreSistema == null && nullToAbsent
          ? const Value.absent()
          : Value(nombreSistema),
      codigoEquipo: codigoEquipo == null && nullToAbsent
          ? const Value.absent()
          : Value(codigoEquipo),
      nombreEquipo: nombreEquipo == null && nullToAbsent
          ? const Value.absent()
          : Value(nombreEquipo),
      estado: Value(estado),
      fechaInicio: fechaInicio == null && nullToAbsent
          ? const Value.absent()
          : Value(fechaInicio),
      fechaFin: fechaFin == null && nullToAbsent
          ? const Value.absent()
          : Value(fechaFin),
      observaciones: observaciones == null && nullToAbsent
          ? const Value.absent()
          : Value(observaciones),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory OrdenesEquipo.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OrdenesEquipo(
      idOrdenEquipo: serializer.fromJson<int>(json['idOrdenEquipo']),
      idOrdenServicio: serializer.fromJson<int>(json['idOrdenServicio']),
      idEquipo: serializer.fromJson<int>(json['idEquipo']),
      ordenSecuencia: serializer.fromJson<int>(json['ordenSecuencia']),
      nombreSistema: serializer.fromJson<String?>(json['nombreSistema']),
      codigoEquipo: serializer.fromJson<String?>(json['codigoEquipo']),
      nombreEquipo: serializer.fromJson<String?>(json['nombreEquipo']),
      estado: serializer.fromJson<String>(json['estado']),
      fechaInicio: serializer.fromJson<DateTime?>(json['fechaInicio']),
      fechaFin: serializer.fromJson<DateTime?>(json['fechaFin']),
      observaciones: serializer.fromJson<String?>(json['observaciones']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'idOrdenEquipo': serializer.toJson<int>(idOrdenEquipo),
      'idOrdenServicio': serializer.toJson<int>(idOrdenServicio),
      'idEquipo': serializer.toJson<int>(idEquipo),
      'ordenSecuencia': serializer.toJson<int>(ordenSecuencia),
      'nombreSistema': serializer.toJson<String?>(nombreSistema),
      'codigoEquipo': serializer.toJson<String?>(codigoEquipo),
      'nombreEquipo': serializer.toJson<String?>(nombreEquipo),
      'estado': serializer.toJson<String>(estado),
      'fechaInicio': serializer.toJson<DateTime?>(fechaInicio),
      'fechaFin': serializer.toJson<DateTime?>(fechaFin),
      'observaciones': serializer.toJson<String?>(observaciones),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  OrdenesEquipo copyWith({
    int? idOrdenEquipo,
    int? idOrdenServicio,
    int? idEquipo,
    int? ordenSecuencia,
    Value<String?> nombreSistema = const Value.absent(),
    Value<String?> codigoEquipo = const Value.absent(),
    Value<String?> nombreEquipo = const Value.absent(),
    String? estado,
    Value<DateTime?> fechaInicio = const Value.absent(),
    Value<DateTime?> fechaFin = const Value.absent(),
    Value<String?> observaciones = const Value.absent(),
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => OrdenesEquipo(
    idOrdenEquipo: idOrdenEquipo ?? this.idOrdenEquipo,
    idOrdenServicio: idOrdenServicio ?? this.idOrdenServicio,
    idEquipo: idEquipo ?? this.idEquipo,
    ordenSecuencia: ordenSecuencia ?? this.ordenSecuencia,
    nombreSistema: nombreSistema.present
        ? nombreSistema.value
        : this.nombreSistema,
    codigoEquipo: codigoEquipo.present ? codigoEquipo.value : this.codigoEquipo,
    nombreEquipo: nombreEquipo.present ? nombreEquipo.value : this.nombreEquipo,
    estado: estado ?? this.estado,
    fechaInicio: fechaInicio.present ? fechaInicio.value : this.fechaInicio,
    fechaFin: fechaFin.present ? fechaFin.value : this.fechaFin,
    observaciones: observaciones.present
        ? observaciones.value
        : this.observaciones,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  OrdenesEquipo copyWithCompanion(OrdenesEquiposCompanion data) {
    return OrdenesEquipo(
      idOrdenEquipo: data.idOrdenEquipo.present
          ? data.idOrdenEquipo.value
          : this.idOrdenEquipo,
      idOrdenServicio: data.idOrdenServicio.present
          ? data.idOrdenServicio.value
          : this.idOrdenServicio,
      idEquipo: data.idEquipo.present ? data.idEquipo.value : this.idEquipo,
      ordenSecuencia: data.ordenSecuencia.present
          ? data.ordenSecuencia.value
          : this.ordenSecuencia,
      nombreSistema: data.nombreSistema.present
          ? data.nombreSistema.value
          : this.nombreSistema,
      codigoEquipo: data.codigoEquipo.present
          ? data.codigoEquipo.value
          : this.codigoEquipo,
      nombreEquipo: data.nombreEquipo.present
          ? data.nombreEquipo.value
          : this.nombreEquipo,
      estado: data.estado.present ? data.estado.value : this.estado,
      fechaInicio: data.fechaInicio.present
          ? data.fechaInicio.value
          : this.fechaInicio,
      fechaFin: data.fechaFin.present ? data.fechaFin.value : this.fechaFin,
      observaciones: data.observaciones.present
          ? data.observaciones.value
          : this.observaciones,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OrdenesEquipo(')
          ..write('idOrdenEquipo: $idOrdenEquipo, ')
          ..write('idOrdenServicio: $idOrdenServicio, ')
          ..write('idEquipo: $idEquipo, ')
          ..write('ordenSecuencia: $ordenSecuencia, ')
          ..write('nombreSistema: $nombreSistema, ')
          ..write('codigoEquipo: $codigoEquipo, ')
          ..write('nombreEquipo: $nombreEquipo, ')
          ..write('estado: $estado, ')
          ..write('fechaInicio: $fechaInicio, ')
          ..write('fechaFin: $fechaFin, ')
          ..write('observaciones: $observaciones, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    idOrdenEquipo,
    idOrdenServicio,
    idEquipo,
    ordenSecuencia,
    nombreSistema,
    codigoEquipo,
    nombreEquipo,
    estado,
    fechaInicio,
    fechaFin,
    observaciones,
    lastSyncedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OrdenesEquipo &&
          other.idOrdenEquipo == this.idOrdenEquipo &&
          other.idOrdenServicio == this.idOrdenServicio &&
          other.idEquipo == this.idEquipo &&
          other.ordenSecuencia == this.ordenSecuencia &&
          other.nombreSistema == this.nombreSistema &&
          other.codigoEquipo == this.codigoEquipo &&
          other.nombreEquipo == this.nombreEquipo &&
          other.estado == this.estado &&
          other.fechaInicio == this.fechaInicio &&
          other.fechaFin == this.fechaFin &&
          other.observaciones == this.observaciones &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class OrdenesEquiposCompanion extends UpdateCompanion<OrdenesEquipo> {
  final Value<int> idOrdenEquipo;
  final Value<int> idOrdenServicio;
  final Value<int> idEquipo;
  final Value<int> ordenSecuencia;
  final Value<String?> nombreSistema;
  final Value<String?> codigoEquipo;
  final Value<String?> nombreEquipo;
  final Value<String> estado;
  final Value<DateTime?> fechaInicio;
  final Value<DateTime?> fechaFin;
  final Value<String?> observaciones;
  final Value<DateTime?> lastSyncedAt;
  const OrdenesEquiposCompanion({
    this.idOrdenEquipo = const Value.absent(),
    this.idOrdenServicio = const Value.absent(),
    this.idEquipo = const Value.absent(),
    this.ordenSecuencia = const Value.absent(),
    this.nombreSistema = const Value.absent(),
    this.codigoEquipo = const Value.absent(),
    this.nombreEquipo = const Value.absent(),
    this.estado = const Value.absent(),
    this.fechaInicio = const Value.absent(),
    this.fechaFin = const Value.absent(),
    this.observaciones = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  OrdenesEquiposCompanion.insert({
    this.idOrdenEquipo = const Value.absent(),
    required int idOrdenServicio,
    required int idEquipo,
    this.ordenSecuencia = const Value.absent(),
    this.nombreSistema = const Value.absent(),
    this.codigoEquipo = const Value.absent(),
    this.nombreEquipo = const Value.absent(),
    this.estado = const Value.absent(),
    this.fechaInicio = const Value.absent(),
    this.fechaFin = const Value.absent(),
    this.observaciones = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : idOrdenServicio = Value(idOrdenServicio),
       idEquipo = Value(idEquipo);
  static Insertable<OrdenesEquipo> custom({
    Expression<int>? idOrdenEquipo,
    Expression<int>? idOrdenServicio,
    Expression<int>? idEquipo,
    Expression<int>? ordenSecuencia,
    Expression<String>? nombreSistema,
    Expression<String>? codigoEquipo,
    Expression<String>? nombreEquipo,
    Expression<String>? estado,
    Expression<DateTime>? fechaInicio,
    Expression<DateTime>? fechaFin,
    Expression<String>? observaciones,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (idOrdenEquipo != null) 'id_orden_equipo': idOrdenEquipo,
      if (idOrdenServicio != null) 'id_orden_servicio': idOrdenServicio,
      if (idEquipo != null) 'id_equipo': idEquipo,
      if (ordenSecuencia != null) 'orden_secuencia': ordenSecuencia,
      if (nombreSistema != null) 'nombre_sistema': nombreSistema,
      if (codigoEquipo != null) 'codigo_equipo': codigoEquipo,
      if (nombreEquipo != null) 'nombre_equipo': nombreEquipo,
      if (estado != null) 'estado': estado,
      if (fechaInicio != null) 'fecha_inicio': fechaInicio,
      if (fechaFin != null) 'fecha_fin': fechaFin,
      if (observaciones != null) 'observaciones': observaciones,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  OrdenesEquiposCompanion copyWith({
    Value<int>? idOrdenEquipo,
    Value<int>? idOrdenServicio,
    Value<int>? idEquipo,
    Value<int>? ordenSecuencia,
    Value<String?>? nombreSistema,
    Value<String?>? codigoEquipo,
    Value<String?>? nombreEquipo,
    Value<String>? estado,
    Value<DateTime?>? fechaInicio,
    Value<DateTime?>? fechaFin,
    Value<String?>? observaciones,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return OrdenesEquiposCompanion(
      idOrdenEquipo: idOrdenEquipo ?? this.idOrdenEquipo,
      idOrdenServicio: idOrdenServicio ?? this.idOrdenServicio,
      idEquipo: idEquipo ?? this.idEquipo,
      ordenSecuencia: ordenSecuencia ?? this.ordenSecuencia,
      nombreSistema: nombreSistema ?? this.nombreSistema,
      codigoEquipo: codigoEquipo ?? this.codigoEquipo,
      nombreEquipo: nombreEquipo ?? this.nombreEquipo,
      estado: estado ?? this.estado,
      fechaInicio: fechaInicio ?? this.fechaInicio,
      fechaFin: fechaFin ?? this.fechaFin,
      observaciones: observaciones ?? this.observaciones,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (idOrdenEquipo.present) {
      map['id_orden_equipo'] = Variable<int>(idOrdenEquipo.value);
    }
    if (idOrdenServicio.present) {
      map['id_orden_servicio'] = Variable<int>(idOrdenServicio.value);
    }
    if (idEquipo.present) {
      map['id_equipo'] = Variable<int>(idEquipo.value);
    }
    if (ordenSecuencia.present) {
      map['orden_secuencia'] = Variable<int>(ordenSecuencia.value);
    }
    if (nombreSistema.present) {
      map['nombre_sistema'] = Variable<String>(nombreSistema.value);
    }
    if (codigoEquipo.present) {
      map['codigo_equipo'] = Variable<String>(codigoEquipo.value);
    }
    if (nombreEquipo.present) {
      map['nombre_equipo'] = Variable<String>(nombreEquipo.value);
    }
    if (estado.present) {
      map['estado'] = Variable<String>(estado.value);
    }
    if (fechaInicio.present) {
      map['fecha_inicio'] = Variable<DateTime>(fechaInicio.value);
    }
    if (fechaFin.present) {
      map['fecha_fin'] = Variable<DateTime>(fechaFin.value);
    }
    if (observaciones.present) {
      map['observaciones'] = Variable<String>(observaciones.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OrdenesEquiposCompanion(')
          ..write('idOrdenEquipo: $idOrdenEquipo, ')
          ..write('idOrdenServicio: $idOrdenServicio, ')
          ..write('idEquipo: $idEquipo, ')
          ..write('ordenSecuencia: $ordenSecuencia, ')
          ..write('nombreSistema: $nombreSistema, ')
          ..write('codigoEquipo: $codigoEquipo, ')
          ..write('nombreEquipo: $nombreEquipo, ')
          ..write('estado: $estado, ')
          ..write('fechaInicio: $fechaInicio, ')
          ..write('fechaFin: $fechaFin, ')
          ..write('observaciones: $observaciones, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $OrdenesTable extends Ordenes with TableInfo<$OrdenesTable, Ordene> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OrdenesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idLocalMeta = const VerificationMeta(
    'idLocal',
  );
  @override
  late final GeneratedColumn<int> idLocal = GeneratedColumn<int>(
    'id_local',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _idBackendMeta = const VerificationMeta(
    'idBackend',
  );
  @override
  late final GeneratedColumn<int> idBackend = GeneratedColumn<int>(
    'id_backend',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _numeroOrdenMeta = const VerificationMeta(
    'numeroOrden',
  );
  @override
  late final GeneratedColumn<String> numeroOrden = GeneratedColumn<String>(
    'numero_orden',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 50),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _versionMeta = const VerificationMeta(
    'version',
  );
  @override
  late final GeneratedColumn<int> version = GeneratedColumn<int>(
    'version',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _idEstadoMeta = const VerificationMeta(
    'idEstado',
  );
  @override
  late final GeneratedColumn<int> idEstado = GeneratedColumn<int>(
    'id_estado',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES estados_orden (id)',
    ),
  );
  static const VerificationMeta _idClienteMeta = const VerificationMeta(
    'idCliente',
  );
  @override
  late final GeneratedColumn<int> idCliente = GeneratedColumn<int>(
    'id_cliente',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES clientes (id)',
    ),
  );
  static const VerificationMeta _idEquipoMeta = const VerificationMeta(
    'idEquipo',
  );
  @override
  late final GeneratedColumn<int> idEquipo = GeneratedColumn<int>(
    'id_equipo',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES equipos (id)',
    ),
  );
  static const VerificationMeta _idTipoServicioMeta = const VerificationMeta(
    'idTipoServicio',
  );
  @override
  late final GeneratedColumn<int> idTipoServicio = GeneratedColumn<int>(
    'id_tipo_servicio',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES tipos_servicio (id)',
    ),
  );
  static const VerificationMeta _prioridadMeta = const VerificationMeta(
    'prioridad',
  );
  @override
  late final GeneratedColumn<String> prioridad = GeneratedColumn<String>(
    'prioridad',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 20),
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('MEDIA'),
  );
  static const VerificationMeta _fechaProgramadaMeta = const VerificationMeta(
    'fechaProgramada',
  );
  @override
  late final GeneratedColumn<DateTime> fechaProgramada =
      GeneratedColumn<DateTime>(
        'fecha_programada',
        aliasedName,
        true,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _fechaInicioMeta = const VerificationMeta(
    'fechaInicio',
  );
  @override
  late final GeneratedColumn<DateTime> fechaInicio = GeneratedColumn<DateTime>(
    'fecha_inicio',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fechaFinMeta = const VerificationMeta(
    'fechaFin',
  );
  @override
  late final GeneratedColumn<DateTime> fechaFin = GeneratedColumn<DateTime>(
    'fecha_fin',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _descripcionInicialMeta =
      const VerificationMeta('descripcionInicial');
  @override
  late final GeneratedColumn<String> descripcionInicial =
      GeneratedColumn<String>(
        'descripcion_inicial',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _trabajoRealizadoMeta = const VerificationMeta(
    'trabajoRealizado',
  );
  @override
  late final GeneratedColumn<String> trabajoRealizado = GeneratedColumn<String>(
    'trabajo_realizado',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _observacionesTecnicoMeta =
      const VerificationMeta('observacionesTecnico');
  @override
  late final GeneratedColumn<String> observacionesTecnico =
      GeneratedColumn<String>(
        'observaciones_tecnico',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _urlPdfMeta = const VerificationMeta('urlPdf');
  @override
  late final GeneratedColumn<String> urlPdf = GeneratedColumn<String>(
    'url_pdf',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _totalActividadesMeta = const VerificationMeta(
    'totalActividades',
  );
  @override
  late final GeneratedColumn<int> totalActividades = GeneratedColumn<int>(
    'total_actividades',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _totalMedicionesMeta = const VerificationMeta(
    'totalMediciones',
  );
  @override
  late final GeneratedColumn<int> totalMediciones = GeneratedColumn<int>(
    'total_mediciones',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _totalEvidenciasMeta = const VerificationMeta(
    'totalEvidencias',
  );
  @override
  late final GeneratedColumn<int> totalEvidencias = GeneratedColumn<int>(
    'total_evidencias',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _totalFirmasMeta = const VerificationMeta(
    'totalFirmas',
  );
  @override
  late final GeneratedColumn<int> totalFirmas = GeneratedColumn<int>(
    'total_firmas',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _actividadesBuenasMeta = const VerificationMeta(
    'actividadesBuenas',
  );
  @override
  late final GeneratedColumn<int> actividadesBuenas = GeneratedColumn<int>(
    'actividades_buenas',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _actividadesMalasMeta = const VerificationMeta(
    'actividadesMalas',
  );
  @override
  late final GeneratedColumn<int> actividadesMalas = GeneratedColumn<int>(
    'actividades_malas',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _actividadesCorregidasMeta =
      const VerificationMeta('actividadesCorregidas');
  @override
  late final GeneratedColumn<int> actividadesCorregidas = GeneratedColumn<int>(
    'actividades_corregidas',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _actividadesNAMeta = const VerificationMeta(
    'actividadesNA',
  );
  @override
  late final GeneratedColumn<int> actividadesNA = GeneratedColumn<int>(
    'actividades_n_a',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _medicionesNormalesMeta =
      const VerificationMeta('medicionesNormales');
  @override
  late final GeneratedColumn<int> medicionesNormales = GeneratedColumn<int>(
    'mediciones_normales',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _medicionesAdvertenciaMeta =
      const VerificationMeta('medicionesAdvertencia');
  @override
  late final GeneratedColumn<int> medicionesAdvertencia = GeneratedColumn<int>(
    'mediciones_advertencia',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _medicionesCriticasMeta =
      const VerificationMeta('medicionesCriticas');
  @override
  late final GeneratedColumn<int> medicionesCriticas = GeneratedColumn<int>(
    'mediciones_criticas',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _horaEntradaTextoMeta = const VerificationMeta(
    'horaEntradaTexto',
  );
  @override
  late final GeneratedColumn<String> horaEntradaTexto = GeneratedColumn<String>(
    'hora_entrada_texto',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _horaSalidaTextoMeta = const VerificationMeta(
    'horaSalidaTexto',
  );
  @override
  late final GeneratedColumn<String> horaSalidaTexto = GeneratedColumn<String>(
    'hora_salida_texto',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _razonFallaMeta = const VerificationMeta(
    'razonFalla',
  );
  @override
  late final GeneratedColumn<String> razonFalla = GeneratedColumn<String>(
    'razon_falla',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _isDirtyMeta = const VerificationMeta(
    'isDirty',
  );
  @override
  late final GeneratedColumn<bool> isDirty = GeneratedColumn<bool>(
    'is_dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("is_dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  static const VerificationMeta _updatedAtMeta = const VerificationMeta(
    'updatedAt',
  );
  @override
  late final GeneratedColumn<DateTime> updatedAt = GeneratedColumn<DateTime>(
    'updated_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    idLocal,
    idBackend,
    numeroOrden,
    version,
    idEstado,
    idCliente,
    idEquipo,
    idTipoServicio,
    prioridad,
    fechaProgramada,
    fechaInicio,
    fechaFin,
    descripcionInicial,
    trabajoRealizado,
    observacionesTecnico,
    urlPdf,
    totalActividades,
    totalMediciones,
    totalEvidencias,
    totalFirmas,
    actividadesBuenas,
    actividadesMalas,
    actividadesCorregidas,
    actividadesNA,
    medicionesNormales,
    medicionesAdvertencia,
    medicionesCriticas,
    horaEntradaTexto,
    horaSalidaTexto,
    razonFalla,
    isDirty,
    lastSyncedAt,
    createdAt,
    updatedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'ordenes';
  @override
  VerificationContext validateIntegrity(
    Insertable<Ordene> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id_local')) {
      context.handle(
        _idLocalMeta,
        idLocal.isAcceptableOrUnknown(data['id_local']!, _idLocalMeta),
      );
    }
    if (data.containsKey('id_backend')) {
      context.handle(
        _idBackendMeta,
        idBackend.isAcceptableOrUnknown(data['id_backend']!, _idBackendMeta),
      );
    }
    if (data.containsKey('numero_orden')) {
      context.handle(
        _numeroOrdenMeta,
        numeroOrden.isAcceptableOrUnknown(
          data['numero_orden']!,
          _numeroOrdenMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_numeroOrdenMeta);
    }
    if (data.containsKey('version')) {
      context.handle(
        _versionMeta,
        version.isAcceptableOrUnknown(data['version']!, _versionMeta),
      );
    }
    if (data.containsKey('id_estado')) {
      context.handle(
        _idEstadoMeta,
        idEstado.isAcceptableOrUnknown(data['id_estado']!, _idEstadoMeta),
      );
    } else if (isInserting) {
      context.missing(_idEstadoMeta);
    }
    if (data.containsKey('id_cliente')) {
      context.handle(
        _idClienteMeta,
        idCliente.isAcceptableOrUnknown(data['id_cliente']!, _idClienteMeta),
      );
    } else if (isInserting) {
      context.missing(_idClienteMeta);
    }
    if (data.containsKey('id_equipo')) {
      context.handle(
        _idEquipoMeta,
        idEquipo.isAcceptableOrUnknown(data['id_equipo']!, _idEquipoMeta),
      );
    } else if (isInserting) {
      context.missing(_idEquipoMeta);
    }
    if (data.containsKey('id_tipo_servicio')) {
      context.handle(
        _idTipoServicioMeta,
        idTipoServicio.isAcceptableOrUnknown(
          data['id_tipo_servicio']!,
          _idTipoServicioMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_idTipoServicioMeta);
    }
    if (data.containsKey('prioridad')) {
      context.handle(
        _prioridadMeta,
        prioridad.isAcceptableOrUnknown(data['prioridad']!, _prioridadMeta),
      );
    }
    if (data.containsKey('fecha_programada')) {
      context.handle(
        _fechaProgramadaMeta,
        fechaProgramada.isAcceptableOrUnknown(
          data['fecha_programada']!,
          _fechaProgramadaMeta,
        ),
      );
    }
    if (data.containsKey('fecha_inicio')) {
      context.handle(
        _fechaInicioMeta,
        fechaInicio.isAcceptableOrUnknown(
          data['fecha_inicio']!,
          _fechaInicioMeta,
        ),
      );
    }
    if (data.containsKey('fecha_fin')) {
      context.handle(
        _fechaFinMeta,
        fechaFin.isAcceptableOrUnknown(data['fecha_fin']!, _fechaFinMeta),
      );
    }
    if (data.containsKey('descripcion_inicial')) {
      context.handle(
        _descripcionInicialMeta,
        descripcionInicial.isAcceptableOrUnknown(
          data['descripcion_inicial']!,
          _descripcionInicialMeta,
        ),
      );
    }
    if (data.containsKey('trabajo_realizado')) {
      context.handle(
        _trabajoRealizadoMeta,
        trabajoRealizado.isAcceptableOrUnknown(
          data['trabajo_realizado']!,
          _trabajoRealizadoMeta,
        ),
      );
    }
    if (data.containsKey('observaciones_tecnico')) {
      context.handle(
        _observacionesTecnicoMeta,
        observacionesTecnico.isAcceptableOrUnknown(
          data['observaciones_tecnico']!,
          _observacionesTecnicoMeta,
        ),
      );
    }
    if (data.containsKey('url_pdf')) {
      context.handle(
        _urlPdfMeta,
        urlPdf.isAcceptableOrUnknown(data['url_pdf']!, _urlPdfMeta),
      );
    }
    if (data.containsKey('total_actividades')) {
      context.handle(
        _totalActividadesMeta,
        totalActividades.isAcceptableOrUnknown(
          data['total_actividades']!,
          _totalActividadesMeta,
        ),
      );
    }
    if (data.containsKey('total_mediciones')) {
      context.handle(
        _totalMedicionesMeta,
        totalMediciones.isAcceptableOrUnknown(
          data['total_mediciones']!,
          _totalMedicionesMeta,
        ),
      );
    }
    if (data.containsKey('total_evidencias')) {
      context.handle(
        _totalEvidenciasMeta,
        totalEvidencias.isAcceptableOrUnknown(
          data['total_evidencias']!,
          _totalEvidenciasMeta,
        ),
      );
    }
    if (data.containsKey('total_firmas')) {
      context.handle(
        _totalFirmasMeta,
        totalFirmas.isAcceptableOrUnknown(
          data['total_firmas']!,
          _totalFirmasMeta,
        ),
      );
    }
    if (data.containsKey('actividades_buenas')) {
      context.handle(
        _actividadesBuenasMeta,
        actividadesBuenas.isAcceptableOrUnknown(
          data['actividades_buenas']!,
          _actividadesBuenasMeta,
        ),
      );
    }
    if (data.containsKey('actividades_malas')) {
      context.handle(
        _actividadesMalasMeta,
        actividadesMalas.isAcceptableOrUnknown(
          data['actividades_malas']!,
          _actividadesMalasMeta,
        ),
      );
    }
    if (data.containsKey('actividades_corregidas')) {
      context.handle(
        _actividadesCorregidasMeta,
        actividadesCorregidas.isAcceptableOrUnknown(
          data['actividades_corregidas']!,
          _actividadesCorregidasMeta,
        ),
      );
    }
    if (data.containsKey('actividades_n_a')) {
      context.handle(
        _actividadesNAMeta,
        actividadesNA.isAcceptableOrUnknown(
          data['actividades_n_a']!,
          _actividadesNAMeta,
        ),
      );
    }
    if (data.containsKey('mediciones_normales')) {
      context.handle(
        _medicionesNormalesMeta,
        medicionesNormales.isAcceptableOrUnknown(
          data['mediciones_normales']!,
          _medicionesNormalesMeta,
        ),
      );
    }
    if (data.containsKey('mediciones_advertencia')) {
      context.handle(
        _medicionesAdvertenciaMeta,
        medicionesAdvertencia.isAcceptableOrUnknown(
          data['mediciones_advertencia']!,
          _medicionesAdvertenciaMeta,
        ),
      );
    }
    if (data.containsKey('mediciones_criticas')) {
      context.handle(
        _medicionesCriticasMeta,
        medicionesCriticas.isAcceptableOrUnknown(
          data['mediciones_criticas']!,
          _medicionesCriticasMeta,
        ),
      );
    }
    if (data.containsKey('hora_entrada_texto')) {
      context.handle(
        _horaEntradaTextoMeta,
        horaEntradaTexto.isAcceptableOrUnknown(
          data['hora_entrada_texto']!,
          _horaEntradaTextoMeta,
        ),
      );
    }
    if (data.containsKey('hora_salida_texto')) {
      context.handle(
        _horaSalidaTextoMeta,
        horaSalidaTexto.isAcceptableOrUnknown(
          data['hora_salida_texto']!,
          _horaSalidaTextoMeta,
        ),
      );
    }
    if (data.containsKey('razon_falla')) {
      context.handle(
        _razonFallaMeta,
        razonFalla.isAcceptableOrUnknown(data['razon_falla']!, _razonFallaMeta),
      );
    }
    if (data.containsKey('is_dirty')) {
      context.handle(
        _isDirtyMeta,
        isDirty.isAcceptableOrUnknown(data['is_dirty']!, _isDirtyMeta),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    }
    if (data.containsKey('updated_at')) {
      context.handle(
        _updatedAtMeta,
        updatedAt.isAcceptableOrUnknown(data['updated_at']!, _updatedAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {idLocal};
  @override
  Ordene map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Ordene(
      idLocal: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_local'],
      )!,
      idBackend: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_backend'],
      ),
      numeroOrden: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}numero_orden'],
      )!,
      version: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}version'],
      )!,
      idEstado: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_estado'],
      )!,
      idCliente: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_cliente'],
      )!,
      idEquipo: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_equipo'],
      )!,
      idTipoServicio: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_tipo_servicio'],
      )!,
      prioridad: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}prioridad'],
      )!,
      fechaProgramada: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_programada'],
      ),
      fechaInicio: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_inicio'],
      ),
      fechaFin: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_fin'],
      ),
      descripcionInicial: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}descripcion_inicial'],
      ),
      trabajoRealizado: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}trabajo_realizado'],
      ),
      observacionesTecnico: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}observaciones_tecnico'],
      ),
      urlPdf: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}url_pdf'],
      ),
      totalActividades: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}total_actividades'],
      )!,
      totalMediciones: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}total_mediciones'],
      )!,
      totalEvidencias: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}total_evidencias'],
      )!,
      totalFirmas: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}total_firmas'],
      )!,
      actividadesBuenas: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}actividades_buenas'],
      )!,
      actividadesMalas: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}actividades_malas'],
      )!,
      actividadesCorregidas: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}actividades_corregidas'],
      )!,
      actividadesNA: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}actividades_n_a'],
      )!,
      medicionesNormales: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}mediciones_normales'],
      )!,
      medicionesAdvertencia: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}mediciones_advertencia'],
      )!,
      medicionesCriticas: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}mediciones_criticas'],
      )!,
      horaEntradaTexto: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}hora_entrada_texto'],
      ),
      horaSalidaTexto: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}hora_salida_texto'],
      ),
      razonFalla: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}razon_falla'],
      ),
      isDirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}is_dirty'],
      )!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
      updatedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}updated_at'],
      )!,
    );
  }

  @override
  $OrdenesTable createAlias(String alias) {
    return $OrdenesTable(attachedDatabase, alias);
  }
}

class Ordene extends DataClass implements Insertable<Ordene> {
  final int idLocal;
  final int? idBackend;
  final String numeroOrden;
  final int version;
  final int idEstado;
  final int idCliente;
  final int idEquipo;
  final int idTipoServicio;
  final String prioridad;
  final DateTime? fechaProgramada;
  final DateTime? fechaInicio;
  final DateTime? fechaFin;
  final String? descripcionInicial;
  final String? trabajoRealizado;
  final String? observacionesTecnico;
  final String? urlPdf;
  final int totalActividades;
  final int totalMediciones;
  final int totalEvidencias;
  final int totalFirmas;
  final int actividadesBuenas;
  final int actividadesMalas;
  final int actividadesCorregidas;
  final int actividadesNA;
  final int medicionesNormales;
  final int medicionesAdvertencia;
  final int medicionesCriticas;
  final String? horaEntradaTexto;
  final String? horaSalidaTexto;
  final String? razonFalla;
  final bool isDirty;
  final DateTime? lastSyncedAt;
  final DateTime createdAt;
  final DateTime updatedAt;
  const Ordene({
    required this.idLocal,
    this.idBackend,
    required this.numeroOrden,
    required this.version,
    required this.idEstado,
    required this.idCliente,
    required this.idEquipo,
    required this.idTipoServicio,
    required this.prioridad,
    this.fechaProgramada,
    this.fechaInicio,
    this.fechaFin,
    this.descripcionInicial,
    this.trabajoRealizado,
    this.observacionesTecnico,
    this.urlPdf,
    required this.totalActividades,
    required this.totalMediciones,
    required this.totalEvidencias,
    required this.totalFirmas,
    required this.actividadesBuenas,
    required this.actividadesMalas,
    required this.actividadesCorregidas,
    required this.actividadesNA,
    required this.medicionesNormales,
    required this.medicionesAdvertencia,
    required this.medicionesCriticas,
    this.horaEntradaTexto,
    this.horaSalidaTexto,
    this.razonFalla,
    required this.isDirty,
    this.lastSyncedAt,
    required this.createdAt,
    required this.updatedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id_local'] = Variable<int>(idLocal);
    if (!nullToAbsent || idBackend != null) {
      map['id_backend'] = Variable<int>(idBackend);
    }
    map['numero_orden'] = Variable<String>(numeroOrden);
    map['version'] = Variable<int>(version);
    map['id_estado'] = Variable<int>(idEstado);
    map['id_cliente'] = Variable<int>(idCliente);
    map['id_equipo'] = Variable<int>(idEquipo);
    map['id_tipo_servicio'] = Variable<int>(idTipoServicio);
    map['prioridad'] = Variable<String>(prioridad);
    if (!nullToAbsent || fechaProgramada != null) {
      map['fecha_programada'] = Variable<DateTime>(fechaProgramada);
    }
    if (!nullToAbsent || fechaInicio != null) {
      map['fecha_inicio'] = Variable<DateTime>(fechaInicio);
    }
    if (!nullToAbsent || fechaFin != null) {
      map['fecha_fin'] = Variable<DateTime>(fechaFin);
    }
    if (!nullToAbsent || descripcionInicial != null) {
      map['descripcion_inicial'] = Variable<String>(descripcionInicial);
    }
    if (!nullToAbsent || trabajoRealizado != null) {
      map['trabajo_realizado'] = Variable<String>(trabajoRealizado);
    }
    if (!nullToAbsent || observacionesTecnico != null) {
      map['observaciones_tecnico'] = Variable<String>(observacionesTecnico);
    }
    if (!nullToAbsent || urlPdf != null) {
      map['url_pdf'] = Variable<String>(urlPdf);
    }
    map['total_actividades'] = Variable<int>(totalActividades);
    map['total_mediciones'] = Variable<int>(totalMediciones);
    map['total_evidencias'] = Variable<int>(totalEvidencias);
    map['total_firmas'] = Variable<int>(totalFirmas);
    map['actividades_buenas'] = Variable<int>(actividadesBuenas);
    map['actividades_malas'] = Variable<int>(actividadesMalas);
    map['actividades_corregidas'] = Variable<int>(actividadesCorregidas);
    map['actividades_n_a'] = Variable<int>(actividadesNA);
    map['mediciones_normales'] = Variable<int>(medicionesNormales);
    map['mediciones_advertencia'] = Variable<int>(medicionesAdvertencia);
    map['mediciones_criticas'] = Variable<int>(medicionesCriticas);
    if (!nullToAbsent || horaEntradaTexto != null) {
      map['hora_entrada_texto'] = Variable<String>(horaEntradaTexto);
    }
    if (!nullToAbsent || horaSalidaTexto != null) {
      map['hora_salida_texto'] = Variable<String>(horaSalidaTexto);
    }
    if (!nullToAbsent || razonFalla != null) {
      map['razon_falla'] = Variable<String>(razonFalla);
    }
    map['is_dirty'] = Variable<bool>(isDirty);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    map['updated_at'] = Variable<DateTime>(updatedAt);
    return map;
  }

  OrdenesCompanion toCompanion(bool nullToAbsent) {
    return OrdenesCompanion(
      idLocal: Value(idLocal),
      idBackend: idBackend == null && nullToAbsent
          ? const Value.absent()
          : Value(idBackend),
      numeroOrden: Value(numeroOrden),
      version: Value(version),
      idEstado: Value(idEstado),
      idCliente: Value(idCliente),
      idEquipo: Value(idEquipo),
      idTipoServicio: Value(idTipoServicio),
      prioridad: Value(prioridad),
      fechaProgramada: fechaProgramada == null && nullToAbsent
          ? const Value.absent()
          : Value(fechaProgramada),
      fechaInicio: fechaInicio == null && nullToAbsent
          ? const Value.absent()
          : Value(fechaInicio),
      fechaFin: fechaFin == null && nullToAbsent
          ? const Value.absent()
          : Value(fechaFin),
      descripcionInicial: descripcionInicial == null && nullToAbsent
          ? const Value.absent()
          : Value(descripcionInicial),
      trabajoRealizado: trabajoRealizado == null && nullToAbsent
          ? const Value.absent()
          : Value(trabajoRealizado),
      observacionesTecnico: observacionesTecnico == null && nullToAbsent
          ? const Value.absent()
          : Value(observacionesTecnico),
      urlPdf: urlPdf == null && nullToAbsent
          ? const Value.absent()
          : Value(urlPdf),
      totalActividades: Value(totalActividades),
      totalMediciones: Value(totalMediciones),
      totalEvidencias: Value(totalEvidencias),
      totalFirmas: Value(totalFirmas),
      actividadesBuenas: Value(actividadesBuenas),
      actividadesMalas: Value(actividadesMalas),
      actividadesCorregidas: Value(actividadesCorregidas),
      actividadesNA: Value(actividadesNA),
      medicionesNormales: Value(medicionesNormales),
      medicionesAdvertencia: Value(medicionesAdvertencia),
      medicionesCriticas: Value(medicionesCriticas),
      horaEntradaTexto: horaEntradaTexto == null && nullToAbsent
          ? const Value.absent()
          : Value(horaEntradaTexto),
      horaSalidaTexto: horaSalidaTexto == null && nullToAbsent
          ? const Value.absent()
          : Value(horaSalidaTexto),
      razonFalla: razonFalla == null && nullToAbsent
          ? const Value.absent()
          : Value(razonFalla),
      isDirty: Value(isDirty),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
      createdAt: Value(createdAt),
      updatedAt: Value(updatedAt),
    );
  }

  factory Ordene.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Ordene(
      idLocal: serializer.fromJson<int>(json['idLocal']),
      idBackend: serializer.fromJson<int?>(json['idBackend']),
      numeroOrden: serializer.fromJson<String>(json['numeroOrden']),
      version: serializer.fromJson<int>(json['version']),
      idEstado: serializer.fromJson<int>(json['idEstado']),
      idCliente: serializer.fromJson<int>(json['idCliente']),
      idEquipo: serializer.fromJson<int>(json['idEquipo']),
      idTipoServicio: serializer.fromJson<int>(json['idTipoServicio']),
      prioridad: serializer.fromJson<String>(json['prioridad']),
      fechaProgramada: serializer.fromJson<DateTime?>(json['fechaProgramada']),
      fechaInicio: serializer.fromJson<DateTime?>(json['fechaInicio']),
      fechaFin: serializer.fromJson<DateTime?>(json['fechaFin']),
      descripcionInicial: serializer.fromJson<String?>(
        json['descripcionInicial'],
      ),
      trabajoRealizado: serializer.fromJson<String?>(json['trabajoRealizado']),
      observacionesTecnico: serializer.fromJson<String?>(
        json['observacionesTecnico'],
      ),
      urlPdf: serializer.fromJson<String?>(json['urlPdf']),
      totalActividades: serializer.fromJson<int>(json['totalActividades']),
      totalMediciones: serializer.fromJson<int>(json['totalMediciones']),
      totalEvidencias: serializer.fromJson<int>(json['totalEvidencias']),
      totalFirmas: serializer.fromJson<int>(json['totalFirmas']),
      actividadesBuenas: serializer.fromJson<int>(json['actividadesBuenas']),
      actividadesMalas: serializer.fromJson<int>(json['actividadesMalas']),
      actividadesCorregidas: serializer.fromJson<int>(
        json['actividadesCorregidas'],
      ),
      actividadesNA: serializer.fromJson<int>(json['actividadesNA']),
      medicionesNormales: serializer.fromJson<int>(json['medicionesNormales']),
      medicionesAdvertencia: serializer.fromJson<int>(
        json['medicionesAdvertencia'],
      ),
      medicionesCriticas: serializer.fromJson<int>(json['medicionesCriticas']),
      horaEntradaTexto: serializer.fromJson<String?>(json['horaEntradaTexto']),
      horaSalidaTexto: serializer.fromJson<String?>(json['horaSalidaTexto']),
      razonFalla: serializer.fromJson<String?>(json['razonFalla']),
      isDirty: serializer.fromJson<bool>(json['isDirty']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
      updatedAt: serializer.fromJson<DateTime>(json['updatedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'idLocal': serializer.toJson<int>(idLocal),
      'idBackend': serializer.toJson<int?>(idBackend),
      'numeroOrden': serializer.toJson<String>(numeroOrden),
      'version': serializer.toJson<int>(version),
      'idEstado': serializer.toJson<int>(idEstado),
      'idCliente': serializer.toJson<int>(idCliente),
      'idEquipo': serializer.toJson<int>(idEquipo),
      'idTipoServicio': serializer.toJson<int>(idTipoServicio),
      'prioridad': serializer.toJson<String>(prioridad),
      'fechaProgramada': serializer.toJson<DateTime?>(fechaProgramada),
      'fechaInicio': serializer.toJson<DateTime?>(fechaInicio),
      'fechaFin': serializer.toJson<DateTime?>(fechaFin),
      'descripcionInicial': serializer.toJson<String?>(descripcionInicial),
      'trabajoRealizado': serializer.toJson<String?>(trabajoRealizado),
      'observacionesTecnico': serializer.toJson<String?>(observacionesTecnico),
      'urlPdf': serializer.toJson<String?>(urlPdf),
      'totalActividades': serializer.toJson<int>(totalActividades),
      'totalMediciones': serializer.toJson<int>(totalMediciones),
      'totalEvidencias': serializer.toJson<int>(totalEvidencias),
      'totalFirmas': serializer.toJson<int>(totalFirmas),
      'actividadesBuenas': serializer.toJson<int>(actividadesBuenas),
      'actividadesMalas': serializer.toJson<int>(actividadesMalas),
      'actividadesCorregidas': serializer.toJson<int>(actividadesCorregidas),
      'actividadesNA': serializer.toJson<int>(actividadesNA),
      'medicionesNormales': serializer.toJson<int>(medicionesNormales),
      'medicionesAdvertencia': serializer.toJson<int>(medicionesAdvertencia),
      'medicionesCriticas': serializer.toJson<int>(medicionesCriticas),
      'horaEntradaTexto': serializer.toJson<String?>(horaEntradaTexto),
      'horaSalidaTexto': serializer.toJson<String?>(horaSalidaTexto),
      'razonFalla': serializer.toJson<String?>(razonFalla),
      'isDirty': serializer.toJson<bool>(isDirty),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
      'createdAt': serializer.toJson<DateTime>(createdAt),
      'updatedAt': serializer.toJson<DateTime>(updatedAt),
    };
  }

  Ordene copyWith({
    int? idLocal,
    Value<int?> idBackend = const Value.absent(),
    String? numeroOrden,
    int? version,
    int? idEstado,
    int? idCliente,
    int? idEquipo,
    int? idTipoServicio,
    String? prioridad,
    Value<DateTime?> fechaProgramada = const Value.absent(),
    Value<DateTime?> fechaInicio = const Value.absent(),
    Value<DateTime?> fechaFin = const Value.absent(),
    Value<String?> descripcionInicial = const Value.absent(),
    Value<String?> trabajoRealizado = const Value.absent(),
    Value<String?> observacionesTecnico = const Value.absent(),
    Value<String?> urlPdf = const Value.absent(),
    int? totalActividades,
    int? totalMediciones,
    int? totalEvidencias,
    int? totalFirmas,
    int? actividadesBuenas,
    int? actividadesMalas,
    int? actividadesCorregidas,
    int? actividadesNA,
    int? medicionesNormales,
    int? medicionesAdvertencia,
    int? medicionesCriticas,
    Value<String?> horaEntradaTexto = const Value.absent(),
    Value<String?> horaSalidaTexto = const Value.absent(),
    Value<String?> razonFalla = const Value.absent(),
    bool? isDirty,
    Value<DateTime?> lastSyncedAt = const Value.absent(),
    DateTime? createdAt,
    DateTime? updatedAt,
  }) => Ordene(
    idLocal: idLocal ?? this.idLocal,
    idBackend: idBackend.present ? idBackend.value : this.idBackend,
    numeroOrden: numeroOrden ?? this.numeroOrden,
    version: version ?? this.version,
    idEstado: idEstado ?? this.idEstado,
    idCliente: idCliente ?? this.idCliente,
    idEquipo: idEquipo ?? this.idEquipo,
    idTipoServicio: idTipoServicio ?? this.idTipoServicio,
    prioridad: prioridad ?? this.prioridad,
    fechaProgramada: fechaProgramada.present
        ? fechaProgramada.value
        : this.fechaProgramada,
    fechaInicio: fechaInicio.present ? fechaInicio.value : this.fechaInicio,
    fechaFin: fechaFin.present ? fechaFin.value : this.fechaFin,
    descripcionInicial: descripcionInicial.present
        ? descripcionInicial.value
        : this.descripcionInicial,
    trabajoRealizado: trabajoRealizado.present
        ? trabajoRealizado.value
        : this.trabajoRealizado,
    observacionesTecnico: observacionesTecnico.present
        ? observacionesTecnico.value
        : this.observacionesTecnico,
    urlPdf: urlPdf.present ? urlPdf.value : this.urlPdf,
    totalActividades: totalActividades ?? this.totalActividades,
    totalMediciones: totalMediciones ?? this.totalMediciones,
    totalEvidencias: totalEvidencias ?? this.totalEvidencias,
    totalFirmas: totalFirmas ?? this.totalFirmas,
    actividadesBuenas: actividadesBuenas ?? this.actividadesBuenas,
    actividadesMalas: actividadesMalas ?? this.actividadesMalas,
    actividadesCorregidas: actividadesCorregidas ?? this.actividadesCorregidas,
    actividadesNA: actividadesNA ?? this.actividadesNA,
    medicionesNormales: medicionesNormales ?? this.medicionesNormales,
    medicionesAdvertencia: medicionesAdvertencia ?? this.medicionesAdvertencia,
    medicionesCriticas: medicionesCriticas ?? this.medicionesCriticas,
    horaEntradaTexto: horaEntradaTexto.present
        ? horaEntradaTexto.value
        : this.horaEntradaTexto,
    horaSalidaTexto: horaSalidaTexto.present
        ? horaSalidaTexto.value
        : this.horaSalidaTexto,
    razonFalla: razonFalla.present ? razonFalla.value : this.razonFalla,
    isDirty: isDirty ?? this.isDirty,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
    createdAt: createdAt ?? this.createdAt,
    updatedAt: updatedAt ?? this.updatedAt,
  );
  Ordene copyWithCompanion(OrdenesCompanion data) {
    return Ordene(
      idLocal: data.idLocal.present ? data.idLocal.value : this.idLocal,
      idBackend: data.idBackend.present ? data.idBackend.value : this.idBackend,
      numeroOrden: data.numeroOrden.present
          ? data.numeroOrden.value
          : this.numeroOrden,
      version: data.version.present ? data.version.value : this.version,
      idEstado: data.idEstado.present ? data.idEstado.value : this.idEstado,
      idCliente: data.idCliente.present ? data.idCliente.value : this.idCliente,
      idEquipo: data.idEquipo.present ? data.idEquipo.value : this.idEquipo,
      idTipoServicio: data.idTipoServicio.present
          ? data.idTipoServicio.value
          : this.idTipoServicio,
      prioridad: data.prioridad.present ? data.prioridad.value : this.prioridad,
      fechaProgramada: data.fechaProgramada.present
          ? data.fechaProgramada.value
          : this.fechaProgramada,
      fechaInicio: data.fechaInicio.present
          ? data.fechaInicio.value
          : this.fechaInicio,
      fechaFin: data.fechaFin.present ? data.fechaFin.value : this.fechaFin,
      descripcionInicial: data.descripcionInicial.present
          ? data.descripcionInicial.value
          : this.descripcionInicial,
      trabajoRealizado: data.trabajoRealizado.present
          ? data.trabajoRealizado.value
          : this.trabajoRealizado,
      observacionesTecnico: data.observacionesTecnico.present
          ? data.observacionesTecnico.value
          : this.observacionesTecnico,
      urlPdf: data.urlPdf.present ? data.urlPdf.value : this.urlPdf,
      totalActividades: data.totalActividades.present
          ? data.totalActividades.value
          : this.totalActividades,
      totalMediciones: data.totalMediciones.present
          ? data.totalMediciones.value
          : this.totalMediciones,
      totalEvidencias: data.totalEvidencias.present
          ? data.totalEvidencias.value
          : this.totalEvidencias,
      totalFirmas: data.totalFirmas.present
          ? data.totalFirmas.value
          : this.totalFirmas,
      actividadesBuenas: data.actividadesBuenas.present
          ? data.actividadesBuenas.value
          : this.actividadesBuenas,
      actividadesMalas: data.actividadesMalas.present
          ? data.actividadesMalas.value
          : this.actividadesMalas,
      actividadesCorregidas: data.actividadesCorregidas.present
          ? data.actividadesCorregidas.value
          : this.actividadesCorregidas,
      actividadesNA: data.actividadesNA.present
          ? data.actividadesNA.value
          : this.actividadesNA,
      medicionesNormales: data.medicionesNormales.present
          ? data.medicionesNormales.value
          : this.medicionesNormales,
      medicionesAdvertencia: data.medicionesAdvertencia.present
          ? data.medicionesAdvertencia.value
          : this.medicionesAdvertencia,
      medicionesCriticas: data.medicionesCriticas.present
          ? data.medicionesCriticas.value
          : this.medicionesCriticas,
      horaEntradaTexto: data.horaEntradaTexto.present
          ? data.horaEntradaTexto.value
          : this.horaEntradaTexto,
      horaSalidaTexto: data.horaSalidaTexto.present
          ? data.horaSalidaTexto.value
          : this.horaSalidaTexto,
      razonFalla: data.razonFalla.present
          ? data.razonFalla.value
          : this.razonFalla,
      isDirty: data.isDirty.present ? data.isDirty.value : this.isDirty,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
      updatedAt: data.updatedAt.present ? data.updatedAt.value : this.updatedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Ordene(')
          ..write('idLocal: $idLocal, ')
          ..write('idBackend: $idBackend, ')
          ..write('numeroOrden: $numeroOrden, ')
          ..write('version: $version, ')
          ..write('idEstado: $idEstado, ')
          ..write('idCliente: $idCliente, ')
          ..write('idEquipo: $idEquipo, ')
          ..write('idTipoServicio: $idTipoServicio, ')
          ..write('prioridad: $prioridad, ')
          ..write('fechaProgramada: $fechaProgramada, ')
          ..write('fechaInicio: $fechaInicio, ')
          ..write('fechaFin: $fechaFin, ')
          ..write('descripcionInicial: $descripcionInicial, ')
          ..write('trabajoRealizado: $trabajoRealizado, ')
          ..write('observacionesTecnico: $observacionesTecnico, ')
          ..write('urlPdf: $urlPdf, ')
          ..write('totalActividades: $totalActividades, ')
          ..write('totalMediciones: $totalMediciones, ')
          ..write('totalEvidencias: $totalEvidencias, ')
          ..write('totalFirmas: $totalFirmas, ')
          ..write('actividadesBuenas: $actividadesBuenas, ')
          ..write('actividadesMalas: $actividadesMalas, ')
          ..write('actividadesCorregidas: $actividadesCorregidas, ')
          ..write('actividadesNA: $actividadesNA, ')
          ..write('medicionesNormales: $medicionesNormales, ')
          ..write('medicionesAdvertencia: $medicionesAdvertencia, ')
          ..write('medicionesCriticas: $medicionesCriticas, ')
          ..write('horaEntradaTexto: $horaEntradaTexto, ')
          ..write('horaSalidaTexto: $horaSalidaTexto, ')
          ..write('razonFalla: $razonFalla, ')
          ..write('isDirty: $isDirty, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hashAll([
    idLocal,
    idBackend,
    numeroOrden,
    version,
    idEstado,
    idCliente,
    idEquipo,
    idTipoServicio,
    prioridad,
    fechaProgramada,
    fechaInicio,
    fechaFin,
    descripcionInicial,
    trabajoRealizado,
    observacionesTecnico,
    urlPdf,
    totalActividades,
    totalMediciones,
    totalEvidencias,
    totalFirmas,
    actividadesBuenas,
    actividadesMalas,
    actividadesCorregidas,
    actividadesNA,
    medicionesNormales,
    medicionesAdvertencia,
    medicionesCriticas,
    horaEntradaTexto,
    horaSalidaTexto,
    razonFalla,
    isDirty,
    lastSyncedAt,
    createdAt,
    updatedAt,
  ]);
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Ordene &&
          other.idLocal == this.idLocal &&
          other.idBackend == this.idBackend &&
          other.numeroOrden == this.numeroOrden &&
          other.version == this.version &&
          other.idEstado == this.idEstado &&
          other.idCliente == this.idCliente &&
          other.idEquipo == this.idEquipo &&
          other.idTipoServicio == this.idTipoServicio &&
          other.prioridad == this.prioridad &&
          other.fechaProgramada == this.fechaProgramada &&
          other.fechaInicio == this.fechaInicio &&
          other.fechaFin == this.fechaFin &&
          other.descripcionInicial == this.descripcionInicial &&
          other.trabajoRealizado == this.trabajoRealizado &&
          other.observacionesTecnico == this.observacionesTecnico &&
          other.urlPdf == this.urlPdf &&
          other.totalActividades == this.totalActividades &&
          other.totalMediciones == this.totalMediciones &&
          other.totalEvidencias == this.totalEvidencias &&
          other.totalFirmas == this.totalFirmas &&
          other.actividadesBuenas == this.actividadesBuenas &&
          other.actividadesMalas == this.actividadesMalas &&
          other.actividadesCorregidas == this.actividadesCorregidas &&
          other.actividadesNA == this.actividadesNA &&
          other.medicionesNormales == this.medicionesNormales &&
          other.medicionesAdvertencia == this.medicionesAdvertencia &&
          other.medicionesCriticas == this.medicionesCriticas &&
          other.horaEntradaTexto == this.horaEntradaTexto &&
          other.horaSalidaTexto == this.horaSalidaTexto &&
          other.razonFalla == this.razonFalla &&
          other.isDirty == this.isDirty &&
          other.lastSyncedAt == this.lastSyncedAt &&
          other.createdAt == this.createdAt &&
          other.updatedAt == this.updatedAt);
}

class OrdenesCompanion extends UpdateCompanion<Ordene> {
  final Value<int> idLocal;
  final Value<int?> idBackend;
  final Value<String> numeroOrden;
  final Value<int> version;
  final Value<int> idEstado;
  final Value<int> idCliente;
  final Value<int> idEquipo;
  final Value<int> idTipoServicio;
  final Value<String> prioridad;
  final Value<DateTime?> fechaProgramada;
  final Value<DateTime?> fechaInicio;
  final Value<DateTime?> fechaFin;
  final Value<String?> descripcionInicial;
  final Value<String?> trabajoRealizado;
  final Value<String?> observacionesTecnico;
  final Value<String?> urlPdf;
  final Value<int> totalActividades;
  final Value<int> totalMediciones;
  final Value<int> totalEvidencias;
  final Value<int> totalFirmas;
  final Value<int> actividadesBuenas;
  final Value<int> actividadesMalas;
  final Value<int> actividadesCorregidas;
  final Value<int> actividadesNA;
  final Value<int> medicionesNormales;
  final Value<int> medicionesAdvertencia;
  final Value<int> medicionesCriticas;
  final Value<String?> horaEntradaTexto;
  final Value<String?> horaSalidaTexto;
  final Value<String?> razonFalla;
  final Value<bool> isDirty;
  final Value<DateTime?> lastSyncedAt;
  final Value<DateTime> createdAt;
  final Value<DateTime> updatedAt;
  const OrdenesCompanion({
    this.idLocal = const Value.absent(),
    this.idBackend = const Value.absent(),
    this.numeroOrden = const Value.absent(),
    this.version = const Value.absent(),
    this.idEstado = const Value.absent(),
    this.idCliente = const Value.absent(),
    this.idEquipo = const Value.absent(),
    this.idTipoServicio = const Value.absent(),
    this.prioridad = const Value.absent(),
    this.fechaProgramada = const Value.absent(),
    this.fechaInicio = const Value.absent(),
    this.fechaFin = const Value.absent(),
    this.descripcionInicial = const Value.absent(),
    this.trabajoRealizado = const Value.absent(),
    this.observacionesTecnico = const Value.absent(),
    this.urlPdf = const Value.absent(),
    this.totalActividades = const Value.absent(),
    this.totalMediciones = const Value.absent(),
    this.totalEvidencias = const Value.absent(),
    this.totalFirmas = const Value.absent(),
    this.actividadesBuenas = const Value.absent(),
    this.actividadesMalas = const Value.absent(),
    this.actividadesCorregidas = const Value.absent(),
    this.actividadesNA = const Value.absent(),
    this.medicionesNormales = const Value.absent(),
    this.medicionesAdvertencia = const Value.absent(),
    this.medicionesCriticas = const Value.absent(),
    this.horaEntradaTexto = const Value.absent(),
    this.horaSalidaTexto = const Value.absent(),
    this.razonFalla = const Value.absent(),
    this.isDirty = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  });
  OrdenesCompanion.insert({
    this.idLocal = const Value.absent(),
    this.idBackend = const Value.absent(),
    required String numeroOrden,
    this.version = const Value.absent(),
    required int idEstado,
    required int idCliente,
    required int idEquipo,
    required int idTipoServicio,
    this.prioridad = const Value.absent(),
    this.fechaProgramada = const Value.absent(),
    this.fechaInicio = const Value.absent(),
    this.fechaFin = const Value.absent(),
    this.descripcionInicial = const Value.absent(),
    this.trabajoRealizado = const Value.absent(),
    this.observacionesTecnico = const Value.absent(),
    this.urlPdf = const Value.absent(),
    this.totalActividades = const Value.absent(),
    this.totalMediciones = const Value.absent(),
    this.totalEvidencias = const Value.absent(),
    this.totalFirmas = const Value.absent(),
    this.actividadesBuenas = const Value.absent(),
    this.actividadesMalas = const Value.absent(),
    this.actividadesCorregidas = const Value.absent(),
    this.actividadesNA = const Value.absent(),
    this.medicionesNormales = const Value.absent(),
    this.medicionesAdvertencia = const Value.absent(),
    this.medicionesCriticas = const Value.absent(),
    this.horaEntradaTexto = const Value.absent(),
    this.horaSalidaTexto = const Value.absent(),
    this.razonFalla = const Value.absent(),
    this.isDirty = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
    this.updatedAt = const Value.absent(),
  }) : numeroOrden = Value(numeroOrden),
       idEstado = Value(idEstado),
       idCliente = Value(idCliente),
       idEquipo = Value(idEquipo),
       idTipoServicio = Value(idTipoServicio);
  static Insertable<Ordene> custom({
    Expression<int>? idLocal,
    Expression<int>? idBackend,
    Expression<String>? numeroOrden,
    Expression<int>? version,
    Expression<int>? idEstado,
    Expression<int>? idCliente,
    Expression<int>? idEquipo,
    Expression<int>? idTipoServicio,
    Expression<String>? prioridad,
    Expression<DateTime>? fechaProgramada,
    Expression<DateTime>? fechaInicio,
    Expression<DateTime>? fechaFin,
    Expression<String>? descripcionInicial,
    Expression<String>? trabajoRealizado,
    Expression<String>? observacionesTecnico,
    Expression<String>? urlPdf,
    Expression<int>? totalActividades,
    Expression<int>? totalMediciones,
    Expression<int>? totalEvidencias,
    Expression<int>? totalFirmas,
    Expression<int>? actividadesBuenas,
    Expression<int>? actividadesMalas,
    Expression<int>? actividadesCorregidas,
    Expression<int>? actividadesNA,
    Expression<int>? medicionesNormales,
    Expression<int>? medicionesAdvertencia,
    Expression<int>? medicionesCriticas,
    Expression<String>? horaEntradaTexto,
    Expression<String>? horaSalidaTexto,
    Expression<String>? razonFalla,
    Expression<bool>? isDirty,
    Expression<DateTime>? lastSyncedAt,
    Expression<DateTime>? createdAt,
    Expression<DateTime>? updatedAt,
  }) {
    return RawValuesInsertable({
      if (idLocal != null) 'id_local': idLocal,
      if (idBackend != null) 'id_backend': idBackend,
      if (numeroOrden != null) 'numero_orden': numeroOrden,
      if (version != null) 'version': version,
      if (idEstado != null) 'id_estado': idEstado,
      if (idCliente != null) 'id_cliente': idCliente,
      if (idEquipo != null) 'id_equipo': idEquipo,
      if (idTipoServicio != null) 'id_tipo_servicio': idTipoServicio,
      if (prioridad != null) 'prioridad': prioridad,
      if (fechaProgramada != null) 'fecha_programada': fechaProgramada,
      if (fechaInicio != null) 'fecha_inicio': fechaInicio,
      if (fechaFin != null) 'fecha_fin': fechaFin,
      if (descripcionInicial != null) 'descripcion_inicial': descripcionInicial,
      if (trabajoRealizado != null) 'trabajo_realizado': trabajoRealizado,
      if (observacionesTecnico != null)
        'observaciones_tecnico': observacionesTecnico,
      if (urlPdf != null) 'url_pdf': urlPdf,
      if (totalActividades != null) 'total_actividades': totalActividades,
      if (totalMediciones != null) 'total_mediciones': totalMediciones,
      if (totalEvidencias != null) 'total_evidencias': totalEvidencias,
      if (totalFirmas != null) 'total_firmas': totalFirmas,
      if (actividadesBuenas != null) 'actividades_buenas': actividadesBuenas,
      if (actividadesMalas != null) 'actividades_malas': actividadesMalas,
      if (actividadesCorregidas != null)
        'actividades_corregidas': actividadesCorregidas,
      if (actividadesNA != null) 'actividades_n_a': actividadesNA,
      if (medicionesNormales != null) 'mediciones_normales': medicionesNormales,
      if (medicionesAdvertencia != null)
        'mediciones_advertencia': medicionesAdvertencia,
      if (medicionesCriticas != null) 'mediciones_criticas': medicionesCriticas,
      if (horaEntradaTexto != null) 'hora_entrada_texto': horaEntradaTexto,
      if (horaSalidaTexto != null) 'hora_salida_texto': horaSalidaTexto,
      if (razonFalla != null) 'razon_falla': razonFalla,
      if (isDirty != null) 'is_dirty': isDirty,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
      if (createdAt != null) 'created_at': createdAt,
      if (updatedAt != null) 'updated_at': updatedAt,
    });
  }

  OrdenesCompanion copyWith({
    Value<int>? idLocal,
    Value<int?>? idBackend,
    Value<String>? numeroOrden,
    Value<int>? version,
    Value<int>? idEstado,
    Value<int>? idCliente,
    Value<int>? idEquipo,
    Value<int>? idTipoServicio,
    Value<String>? prioridad,
    Value<DateTime?>? fechaProgramada,
    Value<DateTime?>? fechaInicio,
    Value<DateTime?>? fechaFin,
    Value<String?>? descripcionInicial,
    Value<String?>? trabajoRealizado,
    Value<String?>? observacionesTecnico,
    Value<String?>? urlPdf,
    Value<int>? totalActividades,
    Value<int>? totalMediciones,
    Value<int>? totalEvidencias,
    Value<int>? totalFirmas,
    Value<int>? actividadesBuenas,
    Value<int>? actividadesMalas,
    Value<int>? actividadesCorregidas,
    Value<int>? actividadesNA,
    Value<int>? medicionesNormales,
    Value<int>? medicionesAdvertencia,
    Value<int>? medicionesCriticas,
    Value<String?>? horaEntradaTexto,
    Value<String?>? horaSalidaTexto,
    Value<String?>? razonFalla,
    Value<bool>? isDirty,
    Value<DateTime?>? lastSyncedAt,
    Value<DateTime>? createdAt,
    Value<DateTime>? updatedAt,
  }) {
    return OrdenesCompanion(
      idLocal: idLocal ?? this.idLocal,
      idBackend: idBackend ?? this.idBackend,
      numeroOrden: numeroOrden ?? this.numeroOrden,
      version: version ?? this.version,
      idEstado: idEstado ?? this.idEstado,
      idCliente: idCliente ?? this.idCliente,
      idEquipo: idEquipo ?? this.idEquipo,
      idTipoServicio: idTipoServicio ?? this.idTipoServicio,
      prioridad: prioridad ?? this.prioridad,
      fechaProgramada: fechaProgramada ?? this.fechaProgramada,
      fechaInicio: fechaInicio ?? this.fechaInicio,
      fechaFin: fechaFin ?? this.fechaFin,
      descripcionInicial: descripcionInicial ?? this.descripcionInicial,
      trabajoRealizado: trabajoRealizado ?? this.trabajoRealizado,
      observacionesTecnico: observacionesTecnico ?? this.observacionesTecnico,
      urlPdf: urlPdf ?? this.urlPdf,
      totalActividades: totalActividades ?? this.totalActividades,
      totalMediciones: totalMediciones ?? this.totalMediciones,
      totalEvidencias: totalEvidencias ?? this.totalEvidencias,
      totalFirmas: totalFirmas ?? this.totalFirmas,
      actividadesBuenas: actividadesBuenas ?? this.actividadesBuenas,
      actividadesMalas: actividadesMalas ?? this.actividadesMalas,
      actividadesCorregidas:
          actividadesCorregidas ?? this.actividadesCorregidas,
      actividadesNA: actividadesNA ?? this.actividadesNA,
      medicionesNormales: medicionesNormales ?? this.medicionesNormales,
      medicionesAdvertencia:
          medicionesAdvertencia ?? this.medicionesAdvertencia,
      medicionesCriticas: medicionesCriticas ?? this.medicionesCriticas,
      horaEntradaTexto: horaEntradaTexto ?? this.horaEntradaTexto,
      horaSalidaTexto: horaSalidaTexto ?? this.horaSalidaTexto,
      razonFalla: razonFalla ?? this.razonFalla,
      isDirty: isDirty ?? this.isDirty,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (idLocal.present) {
      map['id_local'] = Variable<int>(idLocal.value);
    }
    if (idBackend.present) {
      map['id_backend'] = Variable<int>(idBackend.value);
    }
    if (numeroOrden.present) {
      map['numero_orden'] = Variable<String>(numeroOrden.value);
    }
    if (version.present) {
      map['version'] = Variable<int>(version.value);
    }
    if (idEstado.present) {
      map['id_estado'] = Variable<int>(idEstado.value);
    }
    if (idCliente.present) {
      map['id_cliente'] = Variable<int>(idCliente.value);
    }
    if (idEquipo.present) {
      map['id_equipo'] = Variable<int>(idEquipo.value);
    }
    if (idTipoServicio.present) {
      map['id_tipo_servicio'] = Variable<int>(idTipoServicio.value);
    }
    if (prioridad.present) {
      map['prioridad'] = Variable<String>(prioridad.value);
    }
    if (fechaProgramada.present) {
      map['fecha_programada'] = Variable<DateTime>(fechaProgramada.value);
    }
    if (fechaInicio.present) {
      map['fecha_inicio'] = Variable<DateTime>(fechaInicio.value);
    }
    if (fechaFin.present) {
      map['fecha_fin'] = Variable<DateTime>(fechaFin.value);
    }
    if (descripcionInicial.present) {
      map['descripcion_inicial'] = Variable<String>(descripcionInicial.value);
    }
    if (trabajoRealizado.present) {
      map['trabajo_realizado'] = Variable<String>(trabajoRealizado.value);
    }
    if (observacionesTecnico.present) {
      map['observaciones_tecnico'] = Variable<String>(
        observacionesTecnico.value,
      );
    }
    if (urlPdf.present) {
      map['url_pdf'] = Variable<String>(urlPdf.value);
    }
    if (totalActividades.present) {
      map['total_actividades'] = Variable<int>(totalActividades.value);
    }
    if (totalMediciones.present) {
      map['total_mediciones'] = Variable<int>(totalMediciones.value);
    }
    if (totalEvidencias.present) {
      map['total_evidencias'] = Variable<int>(totalEvidencias.value);
    }
    if (totalFirmas.present) {
      map['total_firmas'] = Variable<int>(totalFirmas.value);
    }
    if (actividadesBuenas.present) {
      map['actividades_buenas'] = Variable<int>(actividadesBuenas.value);
    }
    if (actividadesMalas.present) {
      map['actividades_malas'] = Variable<int>(actividadesMalas.value);
    }
    if (actividadesCorregidas.present) {
      map['actividades_corregidas'] = Variable<int>(
        actividadesCorregidas.value,
      );
    }
    if (actividadesNA.present) {
      map['actividades_n_a'] = Variable<int>(actividadesNA.value);
    }
    if (medicionesNormales.present) {
      map['mediciones_normales'] = Variable<int>(medicionesNormales.value);
    }
    if (medicionesAdvertencia.present) {
      map['mediciones_advertencia'] = Variable<int>(
        medicionesAdvertencia.value,
      );
    }
    if (medicionesCriticas.present) {
      map['mediciones_criticas'] = Variable<int>(medicionesCriticas.value);
    }
    if (horaEntradaTexto.present) {
      map['hora_entrada_texto'] = Variable<String>(horaEntradaTexto.value);
    }
    if (horaSalidaTexto.present) {
      map['hora_salida_texto'] = Variable<String>(horaSalidaTexto.value);
    }
    if (razonFalla.present) {
      map['razon_falla'] = Variable<String>(razonFalla.value);
    }
    if (isDirty.present) {
      map['is_dirty'] = Variable<bool>(isDirty.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    if (updatedAt.present) {
      map['updated_at'] = Variable<DateTime>(updatedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OrdenesCompanion(')
          ..write('idLocal: $idLocal, ')
          ..write('idBackend: $idBackend, ')
          ..write('numeroOrden: $numeroOrden, ')
          ..write('version: $version, ')
          ..write('idEstado: $idEstado, ')
          ..write('idCliente: $idCliente, ')
          ..write('idEquipo: $idEquipo, ')
          ..write('idTipoServicio: $idTipoServicio, ')
          ..write('prioridad: $prioridad, ')
          ..write('fechaProgramada: $fechaProgramada, ')
          ..write('fechaInicio: $fechaInicio, ')
          ..write('fechaFin: $fechaFin, ')
          ..write('descripcionInicial: $descripcionInicial, ')
          ..write('trabajoRealizado: $trabajoRealizado, ')
          ..write('observacionesTecnico: $observacionesTecnico, ')
          ..write('urlPdf: $urlPdf, ')
          ..write('totalActividades: $totalActividades, ')
          ..write('totalMediciones: $totalMediciones, ')
          ..write('totalEvidencias: $totalEvidencias, ')
          ..write('totalFirmas: $totalFirmas, ')
          ..write('actividadesBuenas: $actividadesBuenas, ')
          ..write('actividadesMalas: $actividadesMalas, ')
          ..write('actividadesCorregidas: $actividadesCorregidas, ')
          ..write('actividadesNA: $actividadesNA, ')
          ..write('medicionesNormales: $medicionesNormales, ')
          ..write('medicionesAdvertencia: $medicionesAdvertencia, ')
          ..write('medicionesCriticas: $medicionesCriticas, ')
          ..write('horaEntradaTexto: $horaEntradaTexto, ')
          ..write('horaSalidaTexto: $horaSalidaTexto, ')
          ..write('razonFalla: $razonFalla, ')
          ..write('isDirty: $isDirty, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('createdAt: $createdAt, ')
          ..write('updatedAt: $updatedAt')
          ..write(')'))
        .toString();
  }
}

class $ActividadesPlanTable extends ActividadesPlan
    with TableInfo<$ActividadesPlanTable, ActividadesPlanData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ActividadesPlanTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idLocalMeta = const VerificationMeta(
    'idLocal',
  );
  @override
  late final GeneratedColumn<int> idLocal = GeneratedColumn<int>(
    'id_local',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _idOrdenMeta = const VerificationMeta(
    'idOrden',
  );
  @override
  late final GeneratedColumn<int> idOrden = GeneratedColumn<int>(
    'id_orden',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES ordenes (id_local)',
    ),
  );
  static const VerificationMeta _idActividadCatalogoMeta =
      const VerificationMeta('idActividadCatalogo');
  @override
  late final GeneratedColumn<int> idActividadCatalogo = GeneratedColumn<int>(
    'id_actividad_catalogo',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES actividades_catalogo (id)',
    ),
  );
  static const VerificationMeta _ordenSecuenciaMeta = const VerificationMeta(
    'ordenSecuencia',
  );
  @override
  late final GeneratedColumn<int> ordenSecuencia = GeneratedColumn<int>(
    'orden_secuencia',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(1),
  );
  static const VerificationMeta _origenMeta = const VerificationMeta('origen');
  @override
  late final GeneratedColumn<String> origen = GeneratedColumn<String>(
    'origen',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 10),
    type: DriftSqlType.string,
    requiredDuringInsert: false,
    defaultValue: const Constant('ADMIN'),
  );
  static const VerificationMeta _esObligatoriaMeta = const VerificationMeta(
    'esObligatoria',
  );
  @override
  late final GeneratedColumn<bool> esObligatoria = GeneratedColumn<bool>(
    'es_obligatoria',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("es_obligatoria" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    idLocal,
    idOrden,
    idActividadCatalogo,
    ordenSecuencia,
    origen,
    esObligatoria,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'actividades_plan';
  @override
  VerificationContext validateIntegrity(
    Insertable<ActividadesPlanData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id_local')) {
      context.handle(
        _idLocalMeta,
        idLocal.isAcceptableOrUnknown(data['id_local']!, _idLocalMeta),
      );
    }
    if (data.containsKey('id_orden')) {
      context.handle(
        _idOrdenMeta,
        idOrden.isAcceptableOrUnknown(data['id_orden']!, _idOrdenMeta),
      );
    } else if (isInserting) {
      context.missing(_idOrdenMeta);
    }
    if (data.containsKey('id_actividad_catalogo')) {
      context.handle(
        _idActividadCatalogoMeta,
        idActividadCatalogo.isAcceptableOrUnknown(
          data['id_actividad_catalogo']!,
          _idActividadCatalogoMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_idActividadCatalogoMeta);
    }
    if (data.containsKey('orden_secuencia')) {
      context.handle(
        _ordenSecuenciaMeta,
        ordenSecuencia.isAcceptableOrUnknown(
          data['orden_secuencia']!,
          _ordenSecuenciaMeta,
        ),
      );
    }
    if (data.containsKey('origen')) {
      context.handle(
        _origenMeta,
        origen.isAcceptableOrUnknown(data['origen']!, _origenMeta),
      );
    }
    if (data.containsKey('es_obligatoria')) {
      context.handle(
        _esObligatoriaMeta,
        esObligatoria.isAcceptableOrUnknown(
          data['es_obligatoria']!,
          _esObligatoriaMeta,
        ),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {idLocal};
  @override
  ActividadesPlanData map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ActividadesPlanData(
      idLocal: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_local'],
      )!,
      idOrden: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden'],
      )!,
      idActividadCatalogo: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_actividad_catalogo'],
      )!,
      ordenSecuencia: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}orden_secuencia'],
      )!,
      origen: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}origen'],
      )!,
      esObligatoria: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}es_obligatoria'],
      )!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $ActividadesPlanTable createAlias(String alias) {
    return $ActividadesPlanTable(attachedDatabase, alias);
  }
}

class ActividadesPlanData extends DataClass
    implements Insertable<ActividadesPlanData> {
  final int idLocal;
  final int idOrden;
  final int idActividadCatalogo;
  final int ordenSecuencia;
  final String origen;
  final bool esObligatoria;
  final DateTime? lastSyncedAt;
  const ActividadesPlanData({
    required this.idLocal,
    required this.idOrden,
    required this.idActividadCatalogo,
    required this.ordenSecuencia,
    required this.origen,
    required this.esObligatoria,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id_local'] = Variable<int>(idLocal);
    map['id_orden'] = Variable<int>(idOrden);
    map['id_actividad_catalogo'] = Variable<int>(idActividadCatalogo);
    map['orden_secuencia'] = Variable<int>(ordenSecuencia);
    map['origen'] = Variable<String>(origen);
    map['es_obligatoria'] = Variable<bool>(esObligatoria);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  ActividadesPlanCompanion toCompanion(bool nullToAbsent) {
    return ActividadesPlanCompanion(
      idLocal: Value(idLocal),
      idOrden: Value(idOrden),
      idActividadCatalogo: Value(idActividadCatalogo),
      ordenSecuencia: Value(ordenSecuencia),
      origen: Value(origen),
      esObligatoria: Value(esObligatoria),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory ActividadesPlanData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ActividadesPlanData(
      idLocal: serializer.fromJson<int>(json['idLocal']),
      idOrden: serializer.fromJson<int>(json['idOrden']),
      idActividadCatalogo: serializer.fromJson<int>(
        json['idActividadCatalogo'],
      ),
      ordenSecuencia: serializer.fromJson<int>(json['ordenSecuencia']),
      origen: serializer.fromJson<String>(json['origen']),
      esObligatoria: serializer.fromJson<bool>(json['esObligatoria']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'idLocal': serializer.toJson<int>(idLocal),
      'idOrden': serializer.toJson<int>(idOrden),
      'idActividadCatalogo': serializer.toJson<int>(idActividadCatalogo),
      'ordenSecuencia': serializer.toJson<int>(ordenSecuencia),
      'origen': serializer.toJson<String>(origen),
      'esObligatoria': serializer.toJson<bool>(esObligatoria),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  ActividadesPlanData copyWith({
    int? idLocal,
    int? idOrden,
    int? idActividadCatalogo,
    int? ordenSecuencia,
    String? origen,
    bool? esObligatoria,
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => ActividadesPlanData(
    idLocal: idLocal ?? this.idLocal,
    idOrden: idOrden ?? this.idOrden,
    idActividadCatalogo: idActividadCatalogo ?? this.idActividadCatalogo,
    ordenSecuencia: ordenSecuencia ?? this.ordenSecuencia,
    origen: origen ?? this.origen,
    esObligatoria: esObligatoria ?? this.esObligatoria,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  ActividadesPlanData copyWithCompanion(ActividadesPlanCompanion data) {
    return ActividadesPlanData(
      idLocal: data.idLocal.present ? data.idLocal.value : this.idLocal,
      idOrden: data.idOrden.present ? data.idOrden.value : this.idOrden,
      idActividadCatalogo: data.idActividadCatalogo.present
          ? data.idActividadCatalogo.value
          : this.idActividadCatalogo,
      ordenSecuencia: data.ordenSecuencia.present
          ? data.ordenSecuencia.value
          : this.ordenSecuencia,
      origen: data.origen.present ? data.origen.value : this.origen,
      esObligatoria: data.esObligatoria.present
          ? data.esObligatoria.value
          : this.esObligatoria,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ActividadesPlanData(')
          ..write('idLocal: $idLocal, ')
          ..write('idOrden: $idOrden, ')
          ..write('idActividadCatalogo: $idActividadCatalogo, ')
          ..write('ordenSecuencia: $ordenSecuencia, ')
          ..write('origen: $origen, ')
          ..write('esObligatoria: $esObligatoria, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    idLocal,
    idOrden,
    idActividadCatalogo,
    ordenSecuencia,
    origen,
    esObligatoria,
    lastSyncedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ActividadesPlanData &&
          other.idLocal == this.idLocal &&
          other.idOrden == this.idOrden &&
          other.idActividadCatalogo == this.idActividadCatalogo &&
          other.ordenSecuencia == this.ordenSecuencia &&
          other.origen == this.origen &&
          other.esObligatoria == this.esObligatoria &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class ActividadesPlanCompanion extends UpdateCompanion<ActividadesPlanData> {
  final Value<int> idLocal;
  final Value<int> idOrden;
  final Value<int> idActividadCatalogo;
  final Value<int> ordenSecuencia;
  final Value<String> origen;
  final Value<bool> esObligatoria;
  final Value<DateTime?> lastSyncedAt;
  const ActividadesPlanCompanion({
    this.idLocal = const Value.absent(),
    this.idOrden = const Value.absent(),
    this.idActividadCatalogo = const Value.absent(),
    this.ordenSecuencia = const Value.absent(),
    this.origen = const Value.absent(),
    this.esObligatoria = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  ActividadesPlanCompanion.insert({
    this.idLocal = const Value.absent(),
    required int idOrden,
    required int idActividadCatalogo,
    this.ordenSecuencia = const Value.absent(),
    this.origen = const Value.absent(),
    this.esObligatoria = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : idOrden = Value(idOrden),
       idActividadCatalogo = Value(idActividadCatalogo);
  static Insertable<ActividadesPlanData> custom({
    Expression<int>? idLocal,
    Expression<int>? idOrden,
    Expression<int>? idActividadCatalogo,
    Expression<int>? ordenSecuencia,
    Expression<String>? origen,
    Expression<bool>? esObligatoria,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (idLocal != null) 'id_local': idLocal,
      if (idOrden != null) 'id_orden': idOrden,
      if (idActividadCatalogo != null)
        'id_actividad_catalogo': idActividadCatalogo,
      if (ordenSecuencia != null) 'orden_secuencia': ordenSecuencia,
      if (origen != null) 'origen': origen,
      if (esObligatoria != null) 'es_obligatoria': esObligatoria,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  ActividadesPlanCompanion copyWith({
    Value<int>? idLocal,
    Value<int>? idOrden,
    Value<int>? idActividadCatalogo,
    Value<int>? ordenSecuencia,
    Value<String>? origen,
    Value<bool>? esObligatoria,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return ActividadesPlanCompanion(
      idLocal: idLocal ?? this.idLocal,
      idOrden: idOrden ?? this.idOrden,
      idActividadCatalogo: idActividadCatalogo ?? this.idActividadCatalogo,
      ordenSecuencia: ordenSecuencia ?? this.ordenSecuencia,
      origen: origen ?? this.origen,
      esObligatoria: esObligatoria ?? this.esObligatoria,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (idLocal.present) {
      map['id_local'] = Variable<int>(idLocal.value);
    }
    if (idOrden.present) {
      map['id_orden'] = Variable<int>(idOrden.value);
    }
    if (idActividadCatalogo.present) {
      map['id_actividad_catalogo'] = Variable<int>(idActividadCatalogo.value);
    }
    if (ordenSecuencia.present) {
      map['orden_secuencia'] = Variable<int>(ordenSecuencia.value);
    }
    if (origen.present) {
      map['origen'] = Variable<String>(origen.value);
    }
    if (esObligatoria.present) {
      map['es_obligatoria'] = Variable<bool>(esObligatoria.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ActividadesPlanCompanion(')
          ..write('idLocal: $idLocal, ')
          ..write('idOrden: $idOrden, ')
          ..write('idActividadCatalogo: $idActividadCatalogo, ')
          ..write('ordenSecuencia: $ordenSecuencia, ')
          ..write('origen: $origen, ')
          ..write('esObligatoria: $esObligatoria, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $ActividadesEjecutadasTable extends ActividadesEjecutadas
    with TableInfo<$ActividadesEjecutadasTable, ActividadesEjecutada> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $ActividadesEjecutadasTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idLocalMeta = const VerificationMeta(
    'idLocal',
  );
  @override
  late final GeneratedColumn<int> idLocal = GeneratedColumn<int>(
    'id_local',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _idBackendMeta = const VerificationMeta(
    'idBackend',
  );
  @override
  late final GeneratedColumn<int> idBackend = GeneratedColumn<int>(
    'id_backend',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _idOrdenMeta = const VerificationMeta(
    'idOrden',
  );
  @override
  late final GeneratedColumn<int> idOrden = GeneratedColumn<int>(
    'id_orden',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES ordenes (id_local)',
    ),
  );
  static const VerificationMeta _idActividadCatalogoMeta =
      const VerificationMeta('idActividadCatalogo');
  @override
  late final GeneratedColumn<int> idActividadCatalogo = GeneratedColumn<int>(
    'id_actividad_catalogo',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES actividades_catalogo (id)',
    ),
  );
  static const VerificationMeta _idOrdenEquipoMeta = const VerificationMeta(
    'idOrdenEquipo',
  );
  @override
  late final GeneratedColumn<int> idOrdenEquipo = GeneratedColumn<int>(
    'id_orden_equipo',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES ordenes_equipos (id_orden_equipo)',
    ),
  );
  static const VerificationMeta _descripcionMeta = const VerificationMeta(
    'descripcion',
  );
  @override
  late final GeneratedColumn<String> descripcion = GeneratedColumn<String>(
    'descripcion',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _sistemaMeta = const VerificationMeta(
    'sistema',
  );
  @override
  late final GeneratedColumn<String> sistema = GeneratedColumn<String>(
    'sistema',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _tipoActividadMeta = const VerificationMeta(
    'tipoActividad',
  );
  @override
  late final GeneratedColumn<String> tipoActividad = GeneratedColumn<String>(
    'tipo_actividad',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 30),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _idParametroMedicionMeta =
      const VerificationMeta('idParametroMedicion');
  @override
  late final GeneratedColumn<int> idParametroMedicion = GeneratedColumn<int>(
    'id_parametro_medicion',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _ordenEjecucionMeta = const VerificationMeta(
    'ordenEjecucion',
  );
  @override
  late final GeneratedColumn<int> ordenEjecucion = GeneratedColumn<int>(
    'orden_ejecucion',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _simbologiaMeta = const VerificationMeta(
    'simbologia',
  );
  @override
  late final GeneratedColumn<String> simbologia = GeneratedColumn<String>(
    'simbologia',
    aliasedName,
    true,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 10),
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _completadaMeta = const VerificationMeta(
    'completada',
  );
  @override
  late final GeneratedColumn<bool> completada = GeneratedColumn<bool>(
    'completada',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("completada" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _observacionMeta = const VerificationMeta(
    'observacion',
  );
  @override
  late final GeneratedColumn<String> observacion = GeneratedColumn<String>(
    'observacion',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _observacionTecnicoMeta =
      const VerificationMeta('observacionTecnico');
  @override
  late final GeneratedColumn<String> observacionTecnico =
      GeneratedColumn<String>(
        'observacion_tecnico',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _fechaEjecucionMeta = const VerificationMeta(
    'fechaEjecucion',
  );
  @override
  late final GeneratedColumn<DateTime> fechaEjecucion =
      GeneratedColumn<DateTime>(
        'fecha_ejecucion',
        aliasedName,
        true,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _isDirtyMeta = const VerificationMeta(
    'isDirty',
  );
  @override
  late final GeneratedColumn<bool> isDirty = GeneratedColumn<bool>(
    'is_dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("is_dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _createdAtMeta = const VerificationMeta(
    'createdAt',
  );
  @override
  late final GeneratedColumn<DateTime> createdAt = GeneratedColumn<DateTime>(
    'created_at',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  @override
  List<GeneratedColumn> get $columns => [
    idLocal,
    idBackend,
    idOrden,
    idActividadCatalogo,
    idOrdenEquipo,
    descripcion,
    sistema,
    tipoActividad,
    idParametroMedicion,
    ordenEjecucion,
    simbologia,
    completada,
    observacion,
    observacionTecnico,
    fechaEjecucion,
    isDirty,
    lastSyncedAt,
    createdAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'actividades_ejecutadas';
  @override
  VerificationContext validateIntegrity(
    Insertable<ActividadesEjecutada> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id_local')) {
      context.handle(
        _idLocalMeta,
        idLocal.isAcceptableOrUnknown(data['id_local']!, _idLocalMeta),
      );
    }
    if (data.containsKey('id_backend')) {
      context.handle(
        _idBackendMeta,
        idBackend.isAcceptableOrUnknown(data['id_backend']!, _idBackendMeta),
      );
    }
    if (data.containsKey('id_orden')) {
      context.handle(
        _idOrdenMeta,
        idOrden.isAcceptableOrUnknown(data['id_orden']!, _idOrdenMeta),
      );
    } else if (isInserting) {
      context.missing(_idOrdenMeta);
    }
    if (data.containsKey('id_actividad_catalogo')) {
      context.handle(
        _idActividadCatalogoMeta,
        idActividadCatalogo.isAcceptableOrUnknown(
          data['id_actividad_catalogo']!,
          _idActividadCatalogoMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_idActividadCatalogoMeta);
    }
    if (data.containsKey('id_orden_equipo')) {
      context.handle(
        _idOrdenEquipoMeta,
        idOrdenEquipo.isAcceptableOrUnknown(
          data['id_orden_equipo']!,
          _idOrdenEquipoMeta,
        ),
      );
    }
    if (data.containsKey('descripcion')) {
      context.handle(
        _descripcionMeta,
        descripcion.isAcceptableOrUnknown(
          data['descripcion']!,
          _descripcionMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_descripcionMeta);
    }
    if (data.containsKey('sistema')) {
      context.handle(
        _sistemaMeta,
        sistema.isAcceptableOrUnknown(data['sistema']!, _sistemaMeta),
      );
    }
    if (data.containsKey('tipo_actividad')) {
      context.handle(
        _tipoActividadMeta,
        tipoActividad.isAcceptableOrUnknown(
          data['tipo_actividad']!,
          _tipoActividadMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_tipoActividadMeta);
    }
    if (data.containsKey('id_parametro_medicion')) {
      context.handle(
        _idParametroMedicionMeta,
        idParametroMedicion.isAcceptableOrUnknown(
          data['id_parametro_medicion']!,
          _idParametroMedicionMeta,
        ),
      );
    }
    if (data.containsKey('orden_ejecucion')) {
      context.handle(
        _ordenEjecucionMeta,
        ordenEjecucion.isAcceptableOrUnknown(
          data['orden_ejecucion']!,
          _ordenEjecucionMeta,
        ),
      );
    }
    if (data.containsKey('simbologia')) {
      context.handle(
        _simbologiaMeta,
        simbologia.isAcceptableOrUnknown(data['simbologia']!, _simbologiaMeta),
      );
    }
    if (data.containsKey('completada')) {
      context.handle(
        _completadaMeta,
        completada.isAcceptableOrUnknown(data['completada']!, _completadaMeta),
      );
    }
    if (data.containsKey('observacion')) {
      context.handle(
        _observacionMeta,
        observacion.isAcceptableOrUnknown(
          data['observacion']!,
          _observacionMeta,
        ),
      );
    }
    if (data.containsKey('observacion_tecnico')) {
      context.handle(
        _observacionTecnicoMeta,
        observacionTecnico.isAcceptableOrUnknown(
          data['observacion_tecnico']!,
          _observacionTecnicoMeta,
        ),
      );
    }
    if (data.containsKey('fecha_ejecucion')) {
      context.handle(
        _fechaEjecucionMeta,
        fechaEjecucion.isAcceptableOrUnknown(
          data['fecha_ejecucion']!,
          _fechaEjecucionMeta,
        ),
      );
    }
    if (data.containsKey('is_dirty')) {
      context.handle(
        _isDirtyMeta,
        isDirty.isAcceptableOrUnknown(data['is_dirty']!, _isDirtyMeta),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    if (data.containsKey('created_at')) {
      context.handle(
        _createdAtMeta,
        createdAt.isAcceptableOrUnknown(data['created_at']!, _createdAtMeta),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {idLocal};
  @override
  ActividadesEjecutada map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return ActividadesEjecutada(
      idLocal: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_local'],
      )!,
      idBackend: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_backend'],
      ),
      idOrden: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden'],
      )!,
      idActividadCatalogo: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_actividad_catalogo'],
      )!,
      idOrdenEquipo: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden_equipo'],
      ),
      descripcion: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}descripcion'],
      )!,
      sistema: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}sistema'],
      ),
      tipoActividad: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tipo_actividad'],
      )!,
      idParametroMedicion: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_parametro_medicion'],
      ),
      ordenEjecucion: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}orden_ejecucion'],
      )!,
      simbologia: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}simbologia'],
      ),
      completada: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}completada'],
      )!,
      observacion: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}observacion'],
      ),
      observacionTecnico: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}observacion_tecnico'],
      ),
      fechaEjecucion: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_ejecucion'],
      ),
      isDirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}is_dirty'],
      )!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
      createdAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}created_at'],
      )!,
    );
  }

  @override
  $ActividadesEjecutadasTable createAlias(String alias) {
    return $ActividadesEjecutadasTable(attachedDatabase, alias);
  }
}

class ActividadesEjecutada extends DataClass
    implements Insertable<ActividadesEjecutada> {
  final int idLocal;
  final int? idBackend;
  final int idOrden;
  final int idActividadCatalogo;
  final int? idOrdenEquipo;
  final String descripcion;
  final String? sistema;
  final String tipoActividad;
  final int? idParametroMedicion;
  final int ordenEjecucion;
  final String? simbologia;
  final bool completada;
  final String? observacion;
  final String? observacionTecnico;
  final DateTime? fechaEjecucion;
  final bool isDirty;
  final DateTime? lastSyncedAt;
  final DateTime createdAt;
  const ActividadesEjecutada({
    required this.idLocal,
    this.idBackend,
    required this.idOrden,
    required this.idActividadCatalogo,
    this.idOrdenEquipo,
    required this.descripcion,
    this.sistema,
    required this.tipoActividad,
    this.idParametroMedicion,
    required this.ordenEjecucion,
    this.simbologia,
    required this.completada,
    this.observacion,
    this.observacionTecnico,
    this.fechaEjecucion,
    required this.isDirty,
    this.lastSyncedAt,
    required this.createdAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id_local'] = Variable<int>(idLocal);
    if (!nullToAbsent || idBackend != null) {
      map['id_backend'] = Variable<int>(idBackend);
    }
    map['id_orden'] = Variable<int>(idOrden);
    map['id_actividad_catalogo'] = Variable<int>(idActividadCatalogo);
    if (!nullToAbsent || idOrdenEquipo != null) {
      map['id_orden_equipo'] = Variable<int>(idOrdenEquipo);
    }
    map['descripcion'] = Variable<String>(descripcion);
    if (!nullToAbsent || sistema != null) {
      map['sistema'] = Variable<String>(sistema);
    }
    map['tipo_actividad'] = Variable<String>(tipoActividad);
    if (!nullToAbsent || idParametroMedicion != null) {
      map['id_parametro_medicion'] = Variable<int>(idParametroMedicion);
    }
    map['orden_ejecucion'] = Variable<int>(ordenEjecucion);
    if (!nullToAbsent || simbologia != null) {
      map['simbologia'] = Variable<String>(simbologia);
    }
    map['completada'] = Variable<bool>(completada);
    if (!nullToAbsent || observacion != null) {
      map['observacion'] = Variable<String>(observacion);
    }
    if (!nullToAbsent || observacionTecnico != null) {
      map['observacion_tecnico'] = Variable<String>(observacionTecnico);
    }
    if (!nullToAbsent || fechaEjecucion != null) {
      map['fecha_ejecucion'] = Variable<DateTime>(fechaEjecucion);
    }
    map['is_dirty'] = Variable<bool>(isDirty);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    map['created_at'] = Variable<DateTime>(createdAt);
    return map;
  }

  ActividadesEjecutadasCompanion toCompanion(bool nullToAbsent) {
    return ActividadesEjecutadasCompanion(
      idLocal: Value(idLocal),
      idBackend: idBackend == null && nullToAbsent
          ? const Value.absent()
          : Value(idBackend),
      idOrden: Value(idOrden),
      idActividadCatalogo: Value(idActividadCatalogo),
      idOrdenEquipo: idOrdenEquipo == null && nullToAbsent
          ? const Value.absent()
          : Value(idOrdenEquipo),
      descripcion: Value(descripcion),
      sistema: sistema == null && nullToAbsent
          ? const Value.absent()
          : Value(sistema),
      tipoActividad: Value(tipoActividad),
      idParametroMedicion: idParametroMedicion == null && nullToAbsent
          ? const Value.absent()
          : Value(idParametroMedicion),
      ordenEjecucion: Value(ordenEjecucion),
      simbologia: simbologia == null && nullToAbsent
          ? const Value.absent()
          : Value(simbologia),
      completada: Value(completada),
      observacion: observacion == null && nullToAbsent
          ? const Value.absent()
          : Value(observacion),
      observacionTecnico: observacionTecnico == null && nullToAbsent
          ? const Value.absent()
          : Value(observacionTecnico),
      fechaEjecucion: fechaEjecucion == null && nullToAbsent
          ? const Value.absent()
          : Value(fechaEjecucion),
      isDirty: Value(isDirty),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
      createdAt: Value(createdAt),
    );
  }

  factory ActividadesEjecutada.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return ActividadesEjecutada(
      idLocal: serializer.fromJson<int>(json['idLocal']),
      idBackend: serializer.fromJson<int?>(json['idBackend']),
      idOrden: serializer.fromJson<int>(json['idOrden']),
      idActividadCatalogo: serializer.fromJson<int>(
        json['idActividadCatalogo'],
      ),
      idOrdenEquipo: serializer.fromJson<int?>(json['idOrdenEquipo']),
      descripcion: serializer.fromJson<String>(json['descripcion']),
      sistema: serializer.fromJson<String?>(json['sistema']),
      tipoActividad: serializer.fromJson<String>(json['tipoActividad']),
      idParametroMedicion: serializer.fromJson<int?>(
        json['idParametroMedicion'],
      ),
      ordenEjecucion: serializer.fromJson<int>(json['ordenEjecucion']),
      simbologia: serializer.fromJson<String?>(json['simbologia']),
      completada: serializer.fromJson<bool>(json['completada']),
      observacion: serializer.fromJson<String?>(json['observacion']),
      observacionTecnico: serializer.fromJson<String?>(
        json['observacionTecnico'],
      ),
      fechaEjecucion: serializer.fromJson<DateTime?>(json['fechaEjecucion']),
      isDirty: serializer.fromJson<bool>(json['isDirty']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
      createdAt: serializer.fromJson<DateTime>(json['createdAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'idLocal': serializer.toJson<int>(idLocal),
      'idBackend': serializer.toJson<int?>(idBackend),
      'idOrden': serializer.toJson<int>(idOrden),
      'idActividadCatalogo': serializer.toJson<int>(idActividadCatalogo),
      'idOrdenEquipo': serializer.toJson<int?>(idOrdenEquipo),
      'descripcion': serializer.toJson<String>(descripcion),
      'sistema': serializer.toJson<String?>(sistema),
      'tipoActividad': serializer.toJson<String>(tipoActividad),
      'idParametroMedicion': serializer.toJson<int?>(idParametroMedicion),
      'ordenEjecucion': serializer.toJson<int>(ordenEjecucion),
      'simbologia': serializer.toJson<String?>(simbologia),
      'completada': serializer.toJson<bool>(completada),
      'observacion': serializer.toJson<String?>(observacion),
      'observacionTecnico': serializer.toJson<String?>(observacionTecnico),
      'fechaEjecucion': serializer.toJson<DateTime?>(fechaEjecucion),
      'isDirty': serializer.toJson<bool>(isDirty),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
      'createdAt': serializer.toJson<DateTime>(createdAt),
    };
  }

  ActividadesEjecutada copyWith({
    int? idLocal,
    Value<int?> idBackend = const Value.absent(),
    int? idOrden,
    int? idActividadCatalogo,
    Value<int?> idOrdenEquipo = const Value.absent(),
    String? descripcion,
    Value<String?> sistema = const Value.absent(),
    String? tipoActividad,
    Value<int?> idParametroMedicion = const Value.absent(),
    int? ordenEjecucion,
    Value<String?> simbologia = const Value.absent(),
    bool? completada,
    Value<String?> observacion = const Value.absent(),
    Value<String?> observacionTecnico = const Value.absent(),
    Value<DateTime?> fechaEjecucion = const Value.absent(),
    bool? isDirty,
    Value<DateTime?> lastSyncedAt = const Value.absent(),
    DateTime? createdAt,
  }) => ActividadesEjecutada(
    idLocal: idLocal ?? this.idLocal,
    idBackend: idBackend.present ? idBackend.value : this.idBackend,
    idOrden: idOrden ?? this.idOrden,
    idActividadCatalogo: idActividadCatalogo ?? this.idActividadCatalogo,
    idOrdenEquipo: idOrdenEquipo.present
        ? idOrdenEquipo.value
        : this.idOrdenEquipo,
    descripcion: descripcion ?? this.descripcion,
    sistema: sistema.present ? sistema.value : this.sistema,
    tipoActividad: tipoActividad ?? this.tipoActividad,
    idParametroMedicion: idParametroMedicion.present
        ? idParametroMedicion.value
        : this.idParametroMedicion,
    ordenEjecucion: ordenEjecucion ?? this.ordenEjecucion,
    simbologia: simbologia.present ? simbologia.value : this.simbologia,
    completada: completada ?? this.completada,
    observacion: observacion.present ? observacion.value : this.observacion,
    observacionTecnico: observacionTecnico.present
        ? observacionTecnico.value
        : this.observacionTecnico,
    fechaEjecucion: fechaEjecucion.present
        ? fechaEjecucion.value
        : this.fechaEjecucion,
    isDirty: isDirty ?? this.isDirty,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
    createdAt: createdAt ?? this.createdAt,
  );
  ActividadesEjecutada copyWithCompanion(ActividadesEjecutadasCompanion data) {
    return ActividadesEjecutada(
      idLocal: data.idLocal.present ? data.idLocal.value : this.idLocal,
      idBackend: data.idBackend.present ? data.idBackend.value : this.idBackend,
      idOrden: data.idOrden.present ? data.idOrden.value : this.idOrden,
      idActividadCatalogo: data.idActividadCatalogo.present
          ? data.idActividadCatalogo.value
          : this.idActividadCatalogo,
      idOrdenEquipo: data.idOrdenEquipo.present
          ? data.idOrdenEquipo.value
          : this.idOrdenEquipo,
      descripcion: data.descripcion.present
          ? data.descripcion.value
          : this.descripcion,
      sistema: data.sistema.present ? data.sistema.value : this.sistema,
      tipoActividad: data.tipoActividad.present
          ? data.tipoActividad.value
          : this.tipoActividad,
      idParametroMedicion: data.idParametroMedicion.present
          ? data.idParametroMedicion.value
          : this.idParametroMedicion,
      ordenEjecucion: data.ordenEjecucion.present
          ? data.ordenEjecucion.value
          : this.ordenEjecucion,
      simbologia: data.simbologia.present
          ? data.simbologia.value
          : this.simbologia,
      completada: data.completada.present
          ? data.completada.value
          : this.completada,
      observacion: data.observacion.present
          ? data.observacion.value
          : this.observacion,
      observacionTecnico: data.observacionTecnico.present
          ? data.observacionTecnico.value
          : this.observacionTecnico,
      fechaEjecucion: data.fechaEjecucion.present
          ? data.fechaEjecucion.value
          : this.fechaEjecucion,
      isDirty: data.isDirty.present ? data.isDirty.value : this.isDirty,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
      createdAt: data.createdAt.present ? data.createdAt.value : this.createdAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('ActividadesEjecutada(')
          ..write('idLocal: $idLocal, ')
          ..write('idBackend: $idBackend, ')
          ..write('idOrden: $idOrden, ')
          ..write('idActividadCatalogo: $idActividadCatalogo, ')
          ..write('idOrdenEquipo: $idOrdenEquipo, ')
          ..write('descripcion: $descripcion, ')
          ..write('sistema: $sistema, ')
          ..write('tipoActividad: $tipoActividad, ')
          ..write('idParametroMedicion: $idParametroMedicion, ')
          ..write('ordenEjecucion: $ordenEjecucion, ')
          ..write('simbologia: $simbologia, ')
          ..write('completada: $completada, ')
          ..write('observacion: $observacion, ')
          ..write('observacionTecnico: $observacionTecnico, ')
          ..write('fechaEjecucion: $fechaEjecucion, ')
          ..write('isDirty: $isDirty, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    idLocal,
    idBackend,
    idOrden,
    idActividadCatalogo,
    idOrdenEquipo,
    descripcion,
    sistema,
    tipoActividad,
    idParametroMedicion,
    ordenEjecucion,
    simbologia,
    completada,
    observacion,
    observacionTecnico,
    fechaEjecucion,
    isDirty,
    lastSyncedAt,
    createdAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is ActividadesEjecutada &&
          other.idLocal == this.idLocal &&
          other.idBackend == this.idBackend &&
          other.idOrden == this.idOrden &&
          other.idActividadCatalogo == this.idActividadCatalogo &&
          other.idOrdenEquipo == this.idOrdenEquipo &&
          other.descripcion == this.descripcion &&
          other.sistema == this.sistema &&
          other.tipoActividad == this.tipoActividad &&
          other.idParametroMedicion == this.idParametroMedicion &&
          other.ordenEjecucion == this.ordenEjecucion &&
          other.simbologia == this.simbologia &&
          other.completada == this.completada &&
          other.observacion == this.observacion &&
          other.observacionTecnico == this.observacionTecnico &&
          other.fechaEjecucion == this.fechaEjecucion &&
          other.isDirty == this.isDirty &&
          other.lastSyncedAt == this.lastSyncedAt &&
          other.createdAt == this.createdAt);
}

class ActividadesEjecutadasCompanion
    extends UpdateCompanion<ActividadesEjecutada> {
  final Value<int> idLocal;
  final Value<int?> idBackend;
  final Value<int> idOrden;
  final Value<int> idActividadCatalogo;
  final Value<int?> idOrdenEquipo;
  final Value<String> descripcion;
  final Value<String?> sistema;
  final Value<String> tipoActividad;
  final Value<int?> idParametroMedicion;
  final Value<int> ordenEjecucion;
  final Value<String?> simbologia;
  final Value<bool> completada;
  final Value<String?> observacion;
  final Value<String?> observacionTecnico;
  final Value<DateTime?> fechaEjecucion;
  final Value<bool> isDirty;
  final Value<DateTime?> lastSyncedAt;
  final Value<DateTime> createdAt;
  const ActividadesEjecutadasCompanion({
    this.idLocal = const Value.absent(),
    this.idBackend = const Value.absent(),
    this.idOrden = const Value.absent(),
    this.idActividadCatalogo = const Value.absent(),
    this.idOrdenEquipo = const Value.absent(),
    this.descripcion = const Value.absent(),
    this.sistema = const Value.absent(),
    this.tipoActividad = const Value.absent(),
    this.idParametroMedicion = const Value.absent(),
    this.ordenEjecucion = const Value.absent(),
    this.simbologia = const Value.absent(),
    this.completada = const Value.absent(),
    this.observacion = const Value.absent(),
    this.observacionTecnico = const Value.absent(),
    this.fechaEjecucion = const Value.absent(),
    this.isDirty = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
  });
  ActividadesEjecutadasCompanion.insert({
    this.idLocal = const Value.absent(),
    this.idBackend = const Value.absent(),
    required int idOrden,
    required int idActividadCatalogo,
    this.idOrdenEquipo = const Value.absent(),
    required String descripcion,
    this.sistema = const Value.absent(),
    required String tipoActividad,
    this.idParametroMedicion = const Value.absent(),
    this.ordenEjecucion = const Value.absent(),
    this.simbologia = const Value.absent(),
    this.completada = const Value.absent(),
    this.observacion = const Value.absent(),
    this.observacionTecnico = const Value.absent(),
    this.fechaEjecucion = const Value.absent(),
    this.isDirty = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
    this.createdAt = const Value.absent(),
  }) : idOrden = Value(idOrden),
       idActividadCatalogo = Value(idActividadCatalogo),
       descripcion = Value(descripcion),
       tipoActividad = Value(tipoActividad);
  static Insertable<ActividadesEjecutada> custom({
    Expression<int>? idLocal,
    Expression<int>? idBackend,
    Expression<int>? idOrden,
    Expression<int>? idActividadCatalogo,
    Expression<int>? idOrdenEquipo,
    Expression<String>? descripcion,
    Expression<String>? sistema,
    Expression<String>? tipoActividad,
    Expression<int>? idParametroMedicion,
    Expression<int>? ordenEjecucion,
    Expression<String>? simbologia,
    Expression<bool>? completada,
    Expression<String>? observacion,
    Expression<String>? observacionTecnico,
    Expression<DateTime>? fechaEjecucion,
    Expression<bool>? isDirty,
    Expression<DateTime>? lastSyncedAt,
    Expression<DateTime>? createdAt,
  }) {
    return RawValuesInsertable({
      if (idLocal != null) 'id_local': idLocal,
      if (idBackend != null) 'id_backend': idBackend,
      if (idOrden != null) 'id_orden': idOrden,
      if (idActividadCatalogo != null)
        'id_actividad_catalogo': idActividadCatalogo,
      if (idOrdenEquipo != null) 'id_orden_equipo': idOrdenEquipo,
      if (descripcion != null) 'descripcion': descripcion,
      if (sistema != null) 'sistema': sistema,
      if (tipoActividad != null) 'tipo_actividad': tipoActividad,
      if (idParametroMedicion != null)
        'id_parametro_medicion': idParametroMedicion,
      if (ordenEjecucion != null) 'orden_ejecucion': ordenEjecucion,
      if (simbologia != null) 'simbologia': simbologia,
      if (completada != null) 'completada': completada,
      if (observacion != null) 'observacion': observacion,
      if (observacionTecnico != null) 'observacion_tecnico': observacionTecnico,
      if (fechaEjecucion != null) 'fecha_ejecucion': fechaEjecucion,
      if (isDirty != null) 'is_dirty': isDirty,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
      if (createdAt != null) 'created_at': createdAt,
    });
  }

  ActividadesEjecutadasCompanion copyWith({
    Value<int>? idLocal,
    Value<int?>? idBackend,
    Value<int>? idOrden,
    Value<int>? idActividadCatalogo,
    Value<int?>? idOrdenEquipo,
    Value<String>? descripcion,
    Value<String?>? sistema,
    Value<String>? tipoActividad,
    Value<int?>? idParametroMedicion,
    Value<int>? ordenEjecucion,
    Value<String?>? simbologia,
    Value<bool>? completada,
    Value<String?>? observacion,
    Value<String?>? observacionTecnico,
    Value<DateTime?>? fechaEjecucion,
    Value<bool>? isDirty,
    Value<DateTime?>? lastSyncedAt,
    Value<DateTime>? createdAt,
  }) {
    return ActividadesEjecutadasCompanion(
      idLocal: idLocal ?? this.idLocal,
      idBackend: idBackend ?? this.idBackend,
      idOrden: idOrden ?? this.idOrden,
      idActividadCatalogo: idActividadCatalogo ?? this.idActividadCatalogo,
      idOrdenEquipo: idOrdenEquipo ?? this.idOrdenEquipo,
      descripcion: descripcion ?? this.descripcion,
      sistema: sistema ?? this.sistema,
      tipoActividad: tipoActividad ?? this.tipoActividad,
      idParametroMedicion: idParametroMedicion ?? this.idParametroMedicion,
      ordenEjecucion: ordenEjecucion ?? this.ordenEjecucion,
      simbologia: simbologia ?? this.simbologia,
      completada: completada ?? this.completada,
      observacion: observacion ?? this.observacion,
      observacionTecnico: observacionTecnico ?? this.observacionTecnico,
      fechaEjecucion: fechaEjecucion ?? this.fechaEjecucion,
      isDirty: isDirty ?? this.isDirty,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
      createdAt: createdAt ?? this.createdAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (idLocal.present) {
      map['id_local'] = Variable<int>(idLocal.value);
    }
    if (idBackend.present) {
      map['id_backend'] = Variable<int>(idBackend.value);
    }
    if (idOrden.present) {
      map['id_orden'] = Variable<int>(idOrden.value);
    }
    if (idActividadCatalogo.present) {
      map['id_actividad_catalogo'] = Variable<int>(idActividadCatalogo.value);
    }
    if (idOrdenEquipo.present) {
      map['id_orden_equipo'] = Variable<int>(idOrdenEquipo.value);
    }
    if (descripcion.present) {
      map['descripcion'] = Variable<String>(descripcion.value);
    }
    if (sistema.present) {
      map['sistema'] = Variable<String>(sistema.value);
    }
    if (tipoActividad.present) {
      map['tipo_actividad'] = Variable<String>(tipoActividad.value);
    }
    if (idParametroMedicion.present) {
      map['id_parametro_medicion'] = Variable<int>(idParametroMedicion.value);
    }
    if (ordenEjecucion.present) {
      map['orden_ejecucion'] = Variable<int>(ordenEjecucion.value);
    }
    if (simbologia.present) {
      map['simbologia'] = Variable<String>(simbologia.value);
    }
    if (completada.present) {
      map['completada'] = Variable<bool>(completada.value);
    }
    if (observacion.present) {
      map['observacion'] = Variable<String>(observacion.value);
    }
    if (observacionTecnico.present) {
      map['observacion_tecnico'] = Variable<String>(observacionTecnico.value);
    }
    if (fechaEjecucion.present) {
      map['fecha_ejecucion'] = Variable<DateTime>(fechaEjecucion.value);
    }
    if (isDirty.present) {
      map['is_dirty'] = Variable<bool>(isDirty.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    if (createdAt.present) {
      map['created_at'] = Variable<DateTime>(createdAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('ActividadesEjecutadasCompanion(')
          ..write('idLocal: $idLocal, ')
          ..write('idBackend: $idBackend, ')
          ..write('idOrden: $idOrden, ')
          ..write('idActividadCatalogo: $idActividadCatalogo, ')
          ..write('idOrdenEquipo: $idOrdenEquipo, ')
          ..write('descripcion: $descripcion, ')
          ..write('sistema: $sistema, ')
          ..write('tipoActividad: $tipoActividad, ')
          ..write('idParametroMedicion: $idParametroMedicion, ')
          ..write('ordenEjecucion: $ordenEjecucion, ')
          ..write('simbologia: $simbologia, ')
          ..write('completada: $completada, ')
          ..write('observacion: $observacion, ')
          ..write('observacionTecnico: $observacionTecnico, ')
          ..write('fechaEjecucion: $fechaEjecucion, ')
          ..write('isDirty: $isDirty, ')
          ..write('lastSyncedAt: $lastSyncedAt, ')
          ..write('createdAt: $createdAt')
          ..write(')'))
        .toString();
  }
}

class $MedicionesTable extends Mediciones
    with TableInfo<$MedicionesTable, Medicione> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $MedicionesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idLocalMeta = const VerificationMeta(
    'idLocal',
  );
  @override
  late final GeneratedColumn<int> idLocal = GeneratedColumn<int>(
    'id_local',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _idBackendMeta = const VerificationMeta(
    'idBackend',
  );
  @override
  late final GeneratedColumn<int> idBackend = GeneratedColumn<int>(
    'id_backend',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _idOrdenMeta = const VerificationMeta(
    'idOrden',
  );
  @override
  late final GeneratedColumn<int> idOrden = GeneratedColumn<int>(
    'id_orden',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES ordenes (id_local)',
    ),
  );
  static const VerificationMeta _idActividadEjecutadaMeta =
      const VerificationMeta('idActividadEjecutada');
  @override
  late final GeneratedColumn<int> idActividadEjecutada = GeneratedColumn<int>(
    'id_actividad_ejecutada',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES actividades_ejecutadas (id_local)',
    ),
  );
  static const VerificationMeta _idParametroMeta = const VerificationMeta(
    'idParametro',
  );
  @override
  late final GeneratedColumn<int> idParametro = GeneratedColumn<int>(
    'id_parametro',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES parametros_catalogo (id)',
    ),
  );
  static const VerificationMeta _idOrdenEquipoMeta = const VerificationMeta(
    'idOrdenEquipo',
  );
  @override
  late final GeneratedColumn<int> idOrdenEquipo = GeneratedColumn<int>(
    'id_orden_equipo',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES ordenes_equipos (id_orden_equipo)',
    ),
  );
  static const VerificationMeta _nombreParametroMeta = const VerificationMeta(
    'nombreParametro',
  );
  @override
  late final GeneratedColumn<String> nombreParametro = GeneratedColumn<String>(
    'nombre_parametro',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 200),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _unidadMedidaMeta = const VerificationMeta(
    'unidadMedida',
  );
  @override
  late final GeneratedColumn<String> unidadMedida = GeneratedColumn<String>(
    'unidad_medida',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 30),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _rangoMinimoNormalMeta = const VerificationMeta(
    'rangoMinimoNormal',
  );
  @override
  late final GeneratedColumn<double> rangoMinimoNormal =
      GeneratedColumn<double>(
        'rango_minimo_normal',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _rangoMaximoNormalMeta = const VerificationMeta(
    'rangoMaximoNormal',
  );
  @override
  late final GeneratedColumn<double> rangoMaximoNormal =
      GeneratedColumn<double>(
        'rango_maximo_normal',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _rangoMinimoCriticoMeta =
      const VerificationMeta('rangoMinimoCritico');
  @override
  late final GeneratedColumn<double> rangoMinimoCritico =
      GeneratedColumn<double>(
        'rango_minimo_critico',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _rangoMaximoCriticoMeta =
      const VerificationMeta('rangoMaximoCritico');
  @override
  late final GeneratedColumn<double> rangoMaximoCritico =
      GeneratedColumn<double>(
        'rango_maximo_critico',
        aliasedName,
        true,
        type: DriftSqlType.double,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _valorMeta = const VerificationMeta('valor');
  @override
  late final GeneratedColumn<double> valor = GeneratedColumn<double>(
    'valor',
    aliasedName,
    true,
    type: DriftSqlType.double,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _estadoValorMeta = const VerificationMeta(
    'estadoValor',
  );
  @override
  late final GeneratedColumn<String> estadoValor = GeneratedColumn<String>(
    'estado_valor',
    aliasedName,
    true,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 20),
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _observacionMeta = const VerificationMeta(
    'observacion',
  );
  @override
  late final GeneratedColumn<String> observacion = GeneratedColumn<String>(
    'observacion',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fechaMedicionMeta = const VerificationMeta(
    'fechaMedicion',
  );
  @override
  late final GeneratedColumn<DateTime> fechaMedicion =
      GeneratedColumn<DateTime>(
        'fecha_medicion',
        aliasedName,
        true,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _isDirtyMeta = const VerificationMeta(
    'isDirty',
  );
  @override
  late final GeneratedColumn<bool> isDirty = GeneratedColumn<bool>(
    'is_dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("is_dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    idLocal,
    idBackend,
    idOrden,
    idActividadEjecutada,
    idParametro,
    idOrdenEquipo,
    nombreParametro,
    unidadMedida,
    rangoMinimoNormal,
    rangoMaximoNormal,
    rangoMinimoCritico,
    rangoMaximoCritico,
    valor,
    estadoValor,
    observacion,
    fechaMedicion,
    isDirty,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'mediciones';
  @override
  VerificationContext validateIntegrity(
    Insertable<Medicione> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id_local')) {
      context.handle(
        _idLocalMeta,
        idLocal.isAcceptableOrUnknown(data['id_local']!, _idLocalMeta),
      );
    }
    if (data.containsKey('id_backend')) {
      context.handle(
        _idBackendMeta,
        idBackend.isAcceptableOrUnknown(data['id_backend']!, _idBackendMeta),
      );
    }
    if (data.containsKey('id_orden')) {
      context.handle(
        _idOrdenMeta,
        idOrden.isAcceptableOrUnknown(data['id_orden']!, _idOrdenMeta),
      );
    } else if (isInserting) {
      context.missing(_idOrdenMeta);
    }
    if (data.containsKey('id_actividad_ejecutada')) {
      context.handle(
        _idActividadEjecutadaMeta,
        idActividadEjecutada.isAcceptableOrUnknown(
          data['id_actividad_ejecutada']!,
          _idActividadEjecutadaMeta,
        ),
      );
    }
    if (data.containsKey('id_parametro')) {
      context.handle(
        _idParametroMeta,
        idParametro.isAcceptableOrUnknown(
          data['id_parametro']!,
          _idParametroMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_idParametroMeta);
    }
    if (data.containsKey('id_orden_equipo')) {
      context.handle(
        _idOrdenEquipoMeta,
        idOrdenEquipo.isAcceptableOrUnknown(
          data['id_orden_equipo']!,
          _idOrdenEquipoMeta,
        ),
      );
    }
    if (data.containsKey('nombre_parametro')) {
      context.handle(
        _nombreParametroMeta,
        nombreParametro.isAcceptableOrUnknown(
          data['nombre_parametro']!,
          _nombreParametroMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_nombreParametroMeta);
    }
    if (data.containsKey('unidad_medida')) {
      context.handle(
        _unidadMedidaMeta,
        unidadMedida.isAcceptableOrUnknown(
          data['unidad_medida']!,
          _unidadMedidaMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_unidadMedidaMeta);
    }
    if (data.containsKey('rango_minimo_normal')) {
      context.handle(
        _rangoMinimoNormalMeta,
        rangoMinimoNormal.isAcceptableOrUnknown(
          data['rango_minimo_normal']!,
          _rangoMinimoNormalMeta,
        ),
      );
    }
    if (data.containsKey('rango_maximo_normal')) {
      context.handle(
        _rangoMaximoNormalMeta,
        rangoMaximoNormal.isAcceptableOrUnknown(
          data['rango_maximo_normal']!,
          _rangoMaximoNormalMeta,
        ),
      );
    }
    if (data.containsKey('rango_minimo_critico')) {
      context.handle(
        _rangoMinimoCriticoMeta,
        rangoMinimoCritico.isAcceptableOrUnknown(
          data['rango_minimo_critico']!,
          _rangoMinimoCriticoMeta,
        ),
      );
    }
    if (data.containsKey('rango_maximo_critico')) {
      context.handle(
        _rangoMaximoCriticoMeta,
        rangoMaximoCritico.isAcceptableOrUnknown(
          data['rango_maximo_critico']!,
          _rangoMaximoCriticoMeta,
        ),
      );
    }
    if (data.containsKey('valor')) {
      context.handle(
        _valorMeta,
        valor.isAcceptableOrUnknown(data['valor']!, _valorMeta),
      );
    }
    if (data.containsKey('estado_valor')) {
      context.handle(
        _estadoValorMeta,
        estadoValor.isAcceptableOrUnknown(
          data['estado_valor']!,
          _estadoValorMeta,
        ),
      );
    }
    if (data.containsKey('observacion')) {
      context.handle(
        _observacionMeta,
        observacion.isAcceptableOrUnknown(
          data['observacion']!,
          _observacionMeta,
        ),
      );
    }
    if (data.containsKey('fecha_medicion')) {
      context.handle(
        _fechaMedicionMeta,
        fechaMedicion.isAcceptableOrUnknown(
          data['fecha_medicion']!,
          _fechaMedicionMeta,
        ),
      );
    }
    if (data.containsKey('is_dirty')) {
      context.handle(
        _isDirtyMeta,
        isDirty.isAcceptableOrUnknown(data['is_dirty']!, _isDirtyMeta),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {idLocal};
  @override
  Medicione map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Medicione(
      idLocal: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_local'],
      )!,
      idBackend: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_backend'],
      ),
      idOrden: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden'],
      )!,
      idActividadEjecutada: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_actividad_ejecutada'],
      ),
      idParametro: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_parametro'],
      )!,
      idOrdenEquipo: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden_equipo'],
      ),
      nombreParametro: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nombre_parametro'],
      )!,
      unidadMedida: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}unidad_medida'],
      )!,
      rangoMinimoNormal: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}rango_minimo_normal'],
      ),
      rangoMaximoNormal: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}rango_maximo_normal'],
      ),
      rangoMinimoCritico: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}rango_minimo_critico'],
      ),
      rangoMaximoCritico: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}rango_maximo_critico'],
      ),
      valor: attachedDatabase.typeMapping.read(
        DriftSqlType.double,
        data['${effectivePrefix}valor'],
      ),
      estadoValor: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}estado_valor'],
      ),
      observacion: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}observacion'],
      ),
      fechaMedicion: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_medicion'],
      ),
      isDirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}is_dirty'],
      )!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $MedicionesTable createAlias(String alias) {
    return $MedicionesTable(attachedDatabase, alias);
  }
}

class Medicione extends DataClass implements Insertable<Medicione> {
  final int idLocal;
  final int? idBackend;
  final int idOrden;
  final int? idActividadEjecutada;
  final int idParametro;
  final int? idOrdenEquipo;
  final String nombreParametro;
  final String unidadMedida;
  final double? rangoMinimoNormal;
  final double? rangoMaximoNormal;
  final double? rangoMinimoCritico;
  final double? rangoMaximoCritico;
  final double? valor;
  final String? estadoValor;
  final String? observacion;
  final DateTime? fechaMedicion;
  final bool isDirty;
  final DateTime? lastSyncedAt;
  const Medicione({
    required this.idLocal,
    this.idBackend,
    required this.idOrden,
    this.idActividadEjecutada,
    required this.idParametro,
    this.idOrdenEquipo,
    required this.nombreParametro,
    required this.unidadMedida,
    this.rangoMinimoNormal,
    this.rangoMaximoNormal,
    this.rangoMinimoCritico,
    this.rangoMaximoCritico,
    this.valor,
    this.estadoValor,
    this.observacion,
    this.fechaMedicion,
    required this.isDirty,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id_local'] = Variable<int>(idLocal);
    if (!nullToAbsent || idBackend != null) {
      map['id_backend'] = Variable<int>(idBackend);
    }
    map['id_orden'] = Variable<int>(idOrden);
    if (!nullToAbsent || idActividadEjecutada != null) {
      map['id_actividad_ejecutada'] = Variable<int>(idActividadEjecutada);
    }
    map['id_parametro'] = Variable<int>(idParametro);
    if (!nullToAbsent || idOrdenEquipo != null) {
      map['id_orden_equipo'] = Variable<int>(idOrdenEquipo);
    }
    map['nombre_parametro'] = Variable<String>(nombreParametro);
    map['unidad_medida'] = Variable<String>(unidadMedida);
    if (!nullToAbsent || rangoMinimoNormal != null) {
      map['rango_minimo_normal'] = Variable<double>(rangoMinimoNormal);
    }
    if (!nullToAbsent || rangoMaximoNormal != null) {
      map['rango_maximo_normal'] = Variable<double>(rangoMaximoNormal);
    }
    if (!nullToAbsent || rangoMinimoCritico != null) {
      map['rango_minimo_critico'] = Variable<double>(rangoMinimoCritico);
    }
    if (!nullToAbsent || rangoMaximoCritico != null) {
      map['rango_maximo_critico'] = Variable<double>(rangoMaximoCritico);
    }
    if (!nullToAbsent || valor != null) {
      map['valor'] = Variable<double>(valor);
    }
    if (!nullToAbsent || estadoValor != null) {
      map['estado_valor'] = Variable<String>(estadoValor);
    }
    if (!nullToAbsent || observacion != null) {
      map['observacion'] = Variable<String>(observacion);
    }
    if (!nullToAbsent || fechaMedicion != null) {
      map['fecha_medicion'] = Variable<DateTime>(fechaMedicion);
    }
    map['is_dirty'] = Variable<bool>(isDirty);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  MedicionesCompanion toCompanion(bool nullToAbsent) {
    return MedicionesCompanion(
      idLocal: Value(idLocal),
      idBackend: idBackend == null && nullToAbsent
          ? const Value.absent()
          : Value(idBackend),
      idOrden: Value(idOrden),
      idActividadEjecutada: idActividadEjecutada == null && nullToAbsent
          ? const Value.absent()
          : Value(idActividadEjecutada),
      idParametro: Value(idParametro),
      idOrdenEquipo: idOrdenEquipo == null && nullToAbsent
          ? const Value.absent()
          : Value(idOrdenEquipo),
      nombreParametro: Value(nombreParametro),
      unidadMedida: Value(unidadMedida),
      rangoMinimoNormal: rangoMinimoNormal == null && nullToAbsent
          ? const Value.absent()
          : Value(rangoMinimoNormal),
      rangoMaximoNormal: rangoMaximoNormal == null && nullToAbsent
          ? const Value.absent()
          : Value(rangoMaximoNormal),
      rangoMinimoCritico: rangoMinimoCritico == null && nullToAbsent
          ? const Value.absent()
          : Value(rangoMinimoCritico),
      rangoMaximoCritico: rangoMaximoCritico == null && nullToAbsent
          ? const Value.absent()
          : Value(rangoMaximoCritico),
      valor: valor == null && nullToAbsent
          ? const Value.absent()
          : Value(valor),
      estadoValor: estadoValor == null && nullToAbsent
          ? const Value.absent()
          : Value(estadoValor),
      observacion: observacion == null && nullToAbsent
          ? const Value.absent()
          : Value(observacion),
      fechaMedicion: fechaMedicion == null && nullToAbsent
          ? const Value.absent()
          : Value(fechaMedicion),
      isDirty: Value(isDirty),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory Medicione.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Medicione(
      idLocal: serializer.fromJson<int>(json['idLocal']),
      idBackend: serializer.fromJson<int?>(json['idBackend']),
      idOrden: serializer.fromJson<int>(json['idOrden']),
      idActividadEjecutada: serializer.fromJson<int?>(
        json['idActividadEjecutada'],
      ),
      idParametro: serializer.fromJson<int>(json['idParametro']),
      idOrdenEquipo: serializer.fromJson<int?>(json['idOrdenEquipo']),
      nombreParametro: serializer.fromJson<String>(json['nombreParametro']),
      unidadMedida: serializer.fromJson<String>(json['unidadMedida']),
      rangoMinimoNormal: serializer.fromJson<double?>(
        json['rangoMinimoNormal'],
      ),
      rangoMaximoNormal: serializer.fromJson<double?>(
        json['rangoMaximoNormal'],
      ),
      rangoMinimoCritico: serializer.fromJson<double?>(
        json['rangoMinimoCritico'],
      ),
      rangoMaximoCritico: serializer.fromJson<double?>(
        json['rangoMaximoCritico'],
      ),
      valor: serializer.fromJson<double?>(json['valor']),
      estadoValor: serializer.fromJson<String?>(json['estadoValor']),
      observacion: serializer.fromJson<String?>(json['observacion']),
      fechaMedicion: serializer.fromJson<DateTime?>(json['fechaMedicion']),
      isDirty: serializer.fromJson<bool>(json['isDirty']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'idLocal': serializer.toJson<int>(idLocal),
      'idBackend': serializer.toJson<int?>(idBackend),
      'idOrden': serializer.toJson<int>(idOrden),
      'idActividadEjecutada': serializer.toJson<int?>(idActividadEjecutada),
      'idParametro': serializer.toJson<int>(idParametro),
      'idOrdenEquipo': serializer.toJson<int?>(idOrdenEquipo),
      'nombreParametro': serializer.toJson<String>(nombreParametro),
      'unidadMedida': serializer.toJson<String>(unidadMedida),
      'rangoMinimoNormal': serializer.toJson<double?>(rangoMinimoNormal),
      'rangoMaximoNormal': serializer.toJson<double?>(rangoMaximoNormal),
      'rangoMinimoCritico': serializer.toJson<double?>(rangoMinimoCritico),
      'rangoMaximoCritico': serializer.toJson<double?>(rangoMaximoCritico),
      'valor': serializer.toJson<double?>(valor),
      'estadoValor': serializer.toJson<String?>(estadoValor),
      'observacion': serializer.toJson<String?>(observacion),
      'fechaMedicion': serializer.toJson<DateTime?>(fechaMedicion),
      'isDirty': serializer.toJson<bool>(isDirty),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  Medicione copyWith({
    int? idLocal,
    Value<int?> idBackend = const Value.absent(),
    int? idOrden,
    Value<int?> idActividadEjecutada = const Value.absent(),
    int? idParametro,
    Value<int?> idOrdenEquipo = const Value.absent(),
    String? nombreParametro,
    String? unidadMedida,
    Value<double?> rangoMinimoNormal = const Value.absent(),
    Value<double?> rangoMaximoNormal = const Value.absent(),
    Value<double?> rangoMinimoCritico = const Value.absent(),
    Value<double?> rangoMaximoCritico = const Value.absent(),
    Value<double?> valor = const Value.absent(),
    Value<String?> estadoValor = const Value.absent(),
    Value<String?> observacion = const Value.absent(),
    Value<DateTime?> fechaMedicion = const Value.absent(),
    bool? isDirty,
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => Medicione(
    idLocal: idLocal ?? this.idLocal,
    idBackend: idBackend.present ? idBackend.value : this.idBackend,
    idOrden: idOrden ?? this.idOrden,
    idActividadEjecutada: idActividadEjecutada.present
        ? idActividadEjecutada.value
        : this.idActividadEjecutada,
    idParametro: idParametro ?? this.idParametro,
    idOrdenEquipo: idOrdenEquipo.present
        ? idOrdenEquipo.value
        : this.idOrdenEquipo,
    nombreParametro: nombreParametro ?? this.nombreParametro,
    unidadMedida: unidadMedida ?? this.unidadMedida,
    rangoMinimoNormal: rangoMinimoNormal.present
        ? rangoMinimoNormal.value
        : this.rangoMinimoNormal,
    rangoMaximoNormal: rangoMaximoNormal.present
        ? rangoMaximoNormal.value
        : this.rangoMaximoNormal,
    rangoMinimoCritico: rangoMinimoCritico.present
        ? rangoMinimoCritico.value
        : this.rangoMinimoCritico,
    rangoMaximoCritico: rangoMaximoCritico.present
        ? rangoMaximoCritico.value
        : this.rangoMaximoCritico,
    valor: valor.present ? valor.value : this.valor,
    estadoValor: estadoValor.present ? estadoValor.value : this.estadoValor,
    observacion: observacion.present ? observacion.value : this.observacion,
    fechaMedicion: fechaMedicion.present
        ? fechaMedicion.value
        : this.fechaMedicion,
    isDirty: isDirty ?? this.isDirty,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  Medicione copyWithCompanion(MedicionesCompanion data) {
    return Medicione(
      idLocal: data.idLocal.present ? data.idLocal.value : this.idLocal,
      idBackend: data.idBackend.present ? data.idBackend.value : this.idBackend,
      idOrden: data.idOrden.present ? data.idOrden.value : this.idOrden,
      idActividadEjecutada: data.idActividadEjecutada.present
          ? data.idActividadEjecutada.value
          : this.idActividadEjecutada,
      idParametro: data.idParametro.present
          ? data.idParametro.value
          : this.idParametro,
      idOrdenEquipo: data.idOrdenEquipo.present
          ? data.idOrdenEquipo.value
          : this.idOrdenEquipo,
      nombreParametro: data.nombreParametro.present
          ? data.nombreParametro.value
          : this.nombreParametro,
      unidadMedida: data.unidadMedida.present
          ? data.unidadMedida.value
          : this.unidadMedida,
      rangoMinimoNormal: data.rangoMinimoNormal.present
          ? data.rangoMinimoNormal.value
          : this.rangoMinimoNormal,
      rangoMaximoNormal: data.rangoMaximoNormal.present
          ? data.rangoMaximoNormal.value
          : this.rangoMaximoNormal,
      rangoMinimoCritico: data.rangoMinimoCritico.present
          ? data.rangoMinimoCritico.value
          : this.rangoMinimoCritico,
      rangoMaximoCritico: data.rangoMaximoCritico.present
          ? data.rangoMaximoCritico.value
          : this.rangoMaximoCritico,
      valor: data.valor.present ? data.valor.value : this.valor,
      estadoValor: data.estadoValor.present
          ? data.estadoValor.value
          : this.estadoValor,
      observacion: data.observacion.present
          ? data.observacion.value
          : this.observacion,
      fechaMedicion: data.fechaMedicion.present
          ? data.fechaMedicion.value
          : this.fechaMedicion,
      isDirty: data.isDirty.present ? data.isDirty.value : this.isDirty,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Medicione(')
          ..write('idLocal: $idLocal, ')
          ..write('idBackend: $idBackend, ')
          ..write('idOrden: $idOrden, ')
          ..write('idActividadEjecutada: $idActividadEjecutada, ')
          ..write('idParametro: $idParametro, ')
          ..write('idOrdenEquipo: $idOrdenEquipo, ')
          ..write('nombreParametro: $nombreParametro, ')
          ..write('unidadMedida: $unidadMedida, ')
          ..write('rangoMinimoNormal: $rangoMinimoNormal, ')
          ..write('rangoMaximoNormal: $rangoMaximoNormal, ')
          ..write('rangoMinimoCritico: $rangoMinimoCritico, ')
          ..write('rangoMaximoCritico: $rangoMaximoCritico, ')
          ..write('valor: $valor, ')
          ..write('estadoValor: $estadoValor, ')
          ..write('observacion: $observacion, ')
          ..write('fechaMedicion: $fechaMedicion, ')
          ..write('isDirty: $isDirty, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    idLocal,
    idBackend,
    idOrden,
    idActividadEjecutada,
    idParametro,
    idOrdenEquipo,
    nombreParametro,
    unidadMedida,
    rangoMinimoNormal,
    rangoMaximoNormal,
    rangoMinimoCritico,
    rangoMaximoCritico,
    valor,
    estadoValor,
    observacion,
    fechaMedicion,
    isDirty,
    lastSyncedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Medicione &&
          other.idLocal == this.idLocal &&
          other.idBackend == this.idBackend &&
          other.idOrden == this.idOrden &&
          other.idActividadEjecutada == this.idActividadEjecutada &&
          other.idParametro == this.idParametro &&
          other.idOrdenEquipo == this.idOrdenEquipo &&
          other.nombreParametro == this.nombreParametro &&
          other.unidadMedida == this.unidadMedida &&
          other.rangoMinimoNormal == this.rangoMinimoNormal &&
          other.rangoMaximoNormal == this.rangoMaximoNormal &&
          other.rangoMinimoCritico == this.rangoMinimoCritico &&
          other.rangoMaximoCritico == this.rangoMaximoCritico &&
          other.valor == this.valor &&
          other.estadoValor == this.estadoValor &&
          other.observacion == this.observacion &&
          other.fechaMedicion == this.fechaMedicion &&
          other.isDirty == this.isDirty &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class MedicionesCompanion extends UpdateCompanion<Medicione> {
  final Value<int> idLocal;
  final Value<int?> idBackend;
  final Value<int> idOrden;
  final Value<int?> idActividadEjecutada;
  final Value<int> idParametro;
  final Value<int?> idOrdenEquipo;
  final Value<String> nombreParametro;
  final Value<String> unidadMedida;
  final Value<double?> rangoMinimoNormal;
  final Value<double?> rangoMaximoNormal;
  final Value<double?> rangoMinimoCritico;
  final Value<double?> rangoMaximoCritico;
  final Value<double?> valor;
  final Value<String?> estadoValor;
  final Value<String?> observacion;
  final Value<DateTime?> fechaMedicion;
  final Value<bool> isDirty;
  final Value<DateTime?> lastSyncedAt;
  const MedicionesCompanion({
    this.idLocal = const Value.absent(),
    this.idBackend = const Value.absent(),
    this.idOrden = const Value.absent(),
    this.idActividadEjecutada = const Value.absent(),
    this.idParametro = const Value.absent(),
    this.idOrdenEquipo = const Value.absent(),
    this.nombreParametro = const Value.absent(),
    this.unidadMedida = const Value.absent(),
    this.rangoMinimoNormal = const Value.absent(),
    this.rangoMaximoNormal = const Value.absent(),
    this.rangoMinimoCritico = const Value.absent(),
    this.rangoMaximoCritico = const Value.absent(),
    this.valor = const Value.absent(),
    this.estadoValor = const Value.absent(),
    this.observacion = const Value.absent(),
    this.fechaMedicion = const Value.absent(),
    this.isDirty = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  MedicionesCompanion.insert({
    this.idLocal = const Value.absent(),
    this.idBackend = const Value.absent(),
    required int idOrden,
    this.idActividadEjecutada = const Value.absent(),
    required int idParametro,
    this.idOrdenEquipo = const Value.absent(),
    required String nombreParametro,
    required String unidadMedida,
    this.rangoMinimoNormal = const Value.absent(),
    this.rangoMaximoNormal = const Value.absent(),
    this.rangoMinimoCritico = const Value.absent(),
    this.rangoMaximoCritico = const Value.absent(),
    this.valor = const Value.absent(),
    this.estadoValor = const Value.absent(),
    this.observacion = const Value.absent(),
    this.fechaMedicion = const Value.absent(),
    this.isDirty = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : idOrden = Value(idOrden),
       idParametro = Value(idParametro),
       nombreParametro = Value(nombreParametro),
       unidadMedida = Value(unidadMedida);
  static Insertable<Medicione> custom({
    Expression<int>? idLocal,
    Expression<int>? idBackend,
    Expression<int>? idOrden,
    Expression<int>? idActividadEjecutada,
    Expression<int>? idParametro,
    Expression<int>? idOrdenEquipo,
    Expression<String>? nombreParametro,
    Expression<String>? unidadMedida,
    Expression<double>? rangoMinimoNormal,
    Expression<double>? rangoMaximoNormal,
    Expression<double>? rangoMinimoCritico,
    Expression<double>? rangoMaximoCritico,
    Expression<double>? valor,
    Expression<String>? estadoValor,
    Expression<String>? observacion,
    Expression<DateTime>? fechaMedicion,
    Expression<bool>? isDirty,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (idLocal != null) 'id_local': idLocal,
      if (idBackend != null) 'id_backend': idBackend,
      if (idOrden != null) 'id_orden': idOrden,
      if (idActividadEjecutada != null)
        'id_actividad_ejecutada': idActividadEjecutada,
      if (idParametro != null) 'id_parametro': idParametro,
      if (idOrdenEquipo != null) 'id_orden_equipo': idOrdenEquipo,
      if (nombreParametro != null) 'nombre_parametro': nombreParametro,
      if (unidadMedida != null) 'unidad_medida': unidadMedida,
      if (rangoMinimoNormal != null) 'rango_minimo_normal': rangoMinimoNormal,
      if (rangoMaximoNormal != null) 'rango_maximo_normal': rangoMaximoNormal,
      if (rangoMinimoCritico != null)
        'rango_minimo_critico': rangoMinimoCritico,
      if (rangoMaximoCritico != null)
        'rango_maximo_critico': rangoMaximoCritico,
      if (valor != null) 'valor': valor,
      if (estadoValor != null) 'estado_valor': estadoValor,
      if (observacion != null) 'observacion': observacion,
      if (fechaMedicion != null) 'fecha_medicion': fechaMedicion,
      if (isDirty != null) 'is_dirty': isDirty,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  MedicionesCompanion copyWith({
    Value<int>? idLocal,
    Value<int?>? idBackend,
    Value<int>? idOrden,
    Value<int?>? idActividadEjecutada,
    Value<int>? idParametro,
    Value<int?>? idOrdenEquipo,
    Value<String>? nombreParametro,
    Value<String>? unidadMedida,
    Value<double?>? rangoMinimoNormal,
    Value<double?>? rangoMaximoNormal,
    Value<double?>? rangoMinimoCritico,
    Value<double?>? rangoMaximoCritico,
    Value<double?>? valor,
    Value<String?>? estadoValor,
    Value<String?>? observacion,
    Value<DateTime?>? fechaMedicion,
    Value<bool>? isDirty,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return MedicionesCompanion(
      idLocal: idLocal ?? this.idLocal,
      idBackend: idBackend ?? this.idBackend,
      idOrden: idOrden ?? this.idOrden,
      idActividadEjecutada: idActividadEjecutada ?? this.idActividadEjecutada,
      idParametro: idParametro ?? this.idParametro,
      idOrdenEquipo: idOrdenEquipo ?? this.idOrdenEquipo,
      nombreParametro: nombreParametro ?? this.nombreParametro,
      unidadMedida: unidadMedida ?? this.unidadMedida,
      rangoMinimoNormal: rangoMinimoNormal ?? this.rangoMinimoNormal,
      rangoMaximoNormal: rangoMaximoNormal ?? this.rangoMaximoNormal,
      rangoMinimoCritico: rangoMinimoCritico ?? this.rangoMinimoCritico,
      rangoMaximoCritico: rangoMaximoCritico ?? this.rangoMaximoCritico,
      valor: valor ?? this.valor,
      estadoValor: estadoValor ?? this.estadoValor,
      observacion: observacion ?? this.observacion,
      fechaMedicion: fechaMedicion ?? this.fechaMedicion,
      isDirty: isDirty ?? this.isDirty,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (idLocal.present) {
      map['id_local'] = Variable<int>(idLocal.value);
    }
    if (idBackend.present) {
      map['id_backend'] = Variable<int>(idBackend.value);
    }
    if (idOrden.present) {
      map['id_orden'] = Variable<int>(idOrden.value);
    }
    if (idActividadEjecutada.present) {
      map['id_actividad_ejecutada'] = Variable<int>(idActividadEjecutada.value);
    }
    if (idParametro.present) {
      map['id_parametro'] = Variable<int>(idParametro.value);
    }
    if (idOrdenEquipo.present) {
      map['id_orden_equipo'] = Variable<int>(idOrdenEquipo.value);
    }
    if (nombreParametro.present) {
      map['nombre_parametro'] = Variable<String>(nombreParametro.value);
    }
    if (unidadMedida.present) {
      map['unidad_medida'] = Variable<String>(unidadMedida.value);
    }
    if (rangoMinimoNormal.present) {
      map['rango_minimo_normal'] = Variable<double>(rangoMinimoNormal.value);
    }
    if (rangoMaximoNormal.present) {
      map['rango_maximo_normal'] = Variable<double>(rangoMaximoNormal.value);
    }
    if (rangoMinimoCritico.present) {
      map['rango_minimo_critico'] = Variable<double>(rangoMinimoCritico.value);
    }
    if (rangoMaximoCritico.present) {
      map['rango_maximo_critico'] = Variable<double>(rangoMaximoCritico.value);
    }
    if (valor.present) {
      map['valor'] = Variable<double>(valor.value);
    }
    if (estadoValor.present) {
      map['estado_valor'] = Variable<String>(estadoValor.value);
    }
    if (observacion.present) {
      map['observacion'] = Variable<String>(observacion.value);
    }
    if (fechaMedicion.present) {
      map['fecha_medicion'] = Variable<DateTime>(fechaMedicion.value);
    }
    if (isDirty.present) {
      map['is_dirty'] = Variable<bool>(isDirty.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('MedicionesCompanion(')
          ..write('idLocal: $idLocal, ')
          ..write('idBackend: $idBackend, ')
          ..write('idOrden: $idOrden, ')
          ..write('idActividadEjecutada: $idActividadEjecutada, ')
          ..write('idParametro: $idParametro, ')
          ..write('idOrdenEquipo: $idOrdenEquipo, ')
          ..write('nombreParametro: $nombreParametro, ')
          ..write('unidadMedida: $unidadMedida, ')
          ..write('rangoMinimoNormal: $rangoMinimoNormal, ')
          ..write('rangoMaximoNormal: $rangoMaximoNormal, ')
          ..write('rangoMinimoCritico: $rangoMinimoCritico, ')
          ..write('rangoMaximoCritico: $rangoMaximoCritico, ')
          ..write('valor: $valor, ')
          ..write('estadoValor: $estadoValor, ')
          ..write('observacion: $observacion, ')
          ..write('fechaMedicion: $fechaMedicion, ')
          ..write('isDirty: $isDirty, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $EvidenciasTable extends Evidencias
    with TableInfo<$EvidenciasTable, Evidencia> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $EvidenciasTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idLocalMeta = const VerificationMeta(
    'idLocal',
  );
  @override
  late final GeneratedColumn<int> idLocal = GeneratedColumn<int>(
    'id_local',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _idBackendMeta = const VerificationMeta(
    'idBackend',
  );
  @override
  late final GeneratedColumn<int> idBackend = GeneratedColumn<int>(
    'id_backend',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _idOrdenMeta = const VerificationMeta(
    'idOrden',
  );
  @override
  late final GeneratedColumn<int> idOrden = GeneratedColumn<int>(
    'id_orden',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES ordenes (id_local)',
    ),
  );
  static const VerificationMeta _idActividadEjecutadaMeta =
      const VerificationMeta('idActividadEjecutada');
  @override
  late final GeneratedColumn<int> idActividadEjecutada = GeneratedColumn<int>(
    'id_actividad_ejecutada',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES actividades_ejecutadas (id_local)',
    ),
  );
  static const VerificationMeta _idOrdenEquipoMeta = const VerificationMeta(
    'idOrdenEquipo',
  );
  @override
  late final GeneratedColumn<int> idOrdenEquipo = GeneratedColumn<int>(
    'id_orden_equipo',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES ordenes_equipos (id_orden_equipo)',
    ),
  );
  static const VerificationMeta _rutaLocalMeta = const VerificationMeta(
    'rutaLocal',
  );
  @override
  late final GeneratedColumn<String> rutaLocal = GeneratedColumn<String>(
    'ruta_local',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _urlRemotaMeta = const VerificationMeta(
    'urlRemota',
  );
  @override
  late final GeneratedColumn<String> urlRemota = GeneratedColumn<String>(
    'url_remota',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _tipoEvidenciaMeta = const VerificationMeta(
    'tipoEvidencia',
  );
  @override
  late final GeneratedColumn<String> tipoEvidencia = GeneratedColumn<String>(
    'tipo_evidencia',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 20),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _descripcionMeta = const VerificationMeta(
    'descripcion',
  );
  @override
  late final GeneratedColumn<String> descripcion = GeneratedColumn<String>(
    'descripcion',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fechaCapturaMeta = const VerificationMeta(
    'fechaCaptura',
  );
  @override
  late final GeneratedColumn<DateTime> fechaCaptura = GeneratedColumn<DateTime>(
    'fecha_captura',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  static const VerificationMeta _isDirtyMeta = const VerificationMeta(
    'isDirty',
  );
  @override
  late final GeneratedColumn<bool> isDirty = GeneratedColumn<bool>(
    'is_dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("is_dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _subidaMeta = const VerificationMeta('subida');
  @override
  late final GeneratedColumn<bool> subida = GeneratedColumn<bool>(
    'subida',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("subida" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    idLocal,
    idBackend,
    idOrden,
    idActividadEjecutada,
    idOrdenEquipo,
    rutaLocal,
    urlRemota,
    tipoEvidencia,
    descripcion,
    fechaCaptura,
    isDirty,
    subida,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'evidencias';
  @override
  VerificationContext validateIntegrity(
    Insertable<Evidencia> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id_local')) {
      context.handle(
        _idLocalMeta,
        idLocal.isAcceptableOrUnknown(data['id_local']!, _idLocalMeta),
      );
    }
    if (data.containsKey('id_backend')) {
      context.handle(
        _idBackendMeta,
        idBackend.isAcceptableOrUnknown(data['id_backend']!, _idBackendMeta),
      );
    }
    if (data.containsKey('id_orden')) {
      context.handle(
        _idOrdenMeta,
        idOrden.isAcceptableOrUnknown(data['id_orden']!, _idOrdenMeta),
      );
    } else if (isInserting) {
      context.missing(_idOrdenMeta);
    }
    if (data.containsKey('id_actividad_ejecutada')) {
      context.handle(
        _idActividadEjecutadaMeta,
        idActividadEjecutada.isAcceptableOrUnknown(
          data['id_actividad_ejecutada']!,
          _idActividadEjecutadaMeta,
        ),
      );
    }
    if (data.containsKey('id_orden_equipo')) {
      context.handle(
        _idOrdenEquipoMeta,
        idOrdenEquipo.isAcceptableOrUnknown(
          data['id_orden_equipo']!,
          _idOrdenEquipoMeta,
        ),
      );
    }
    if (data.containsKey('ruta_local')) {
      context.handle(
        _rutaLocalMeta,
        rutaLocal.isAcceptableOrUnknown(data['ruta_local']!, _rutaLocalMeta),
      );
    } else if (isInserting) {
      context.missing(_rutaLocalMeta);
    }
    if (data.containsKey('url_remota')) {
      context.handle(
        _urlRemotaMeta,
        urlRemota.isAcceptableOrUnknown(data['url_remota']!, _urlRemotaMeta),
      );
    }
    if (data.containsKey('tipo_evidencia')) {
      context.handle(
        _tipoEvidenciaMeta,
        tipoEvidencia.isAcceptableOrUnknown(
          data['tipo_evidencia']!,
          _tipoEvidenciaMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_tipoEvidenciaMeta);
    }
    if (data.containsKey('descripcion')) {
      context.handle(
        _descripcionMeta,
        descripcion.isAcceptableOrUnknown(
          data['descripcion']!,
          _descripcionMeta,
        ),
      );
    }
    if (data.containsKey('fecha_captura')) {
      context.handle(
        _fechaCapturaMeta,
        fechaCaptura.isAcceptableOrUnknown(
          data['fecha_captura']!,
          _fechaCapturaMeta,
        ),
      );
    }
    if (data.containsKey('is_dirty')) {
      context.handle(
        _isDirtyMeta,
        isDirty.isAcceptableOrUnknown(data['is_dirty']!, _isDirtyMeta),
      );
    }
    if (data.containsKey('subida')) {
      context.handle(
        _subidaMeta,
        subida.isAcceptableOrUnknown(data['subida']!, _subidaMeta),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {idLocal};
  @override
  Evidencia map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Evidencia(
      idLocal: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_local'],
      )!,
      idBackend: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_backend'],
      ),
      idOrden: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden'],
      )!,
      idActividadEjecutada: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_actividad_ejecutada'],
      ),
      idOrdenEquipo: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden_equipo'],
      ),
      rutaLocal: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}ruta_local'],
      )!,
      urlRemota: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}url_remota'],
      ),
      tipoEvidencia: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tipo_evidencia'],
      )!,
      descripcion: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}descripcion'],
      ),
      fechaCaptura: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_captura'],
      )!,
      isDirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}is_dirty'],
      )!,
      subida: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}subida'],
      )!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $EvidenciasTable createAlias(String alias) {
    return $EvidenciasTable(attachedDatabase, alias);
  }
}

class Evidencia extends DataClass implements Insertable<Evidencia> {
  final int idLocal;
  final int? idBackend;
  final int idOrden;
  final int? idActividadEjecutada;
  final int? idOrdenEquipo;
  final String rutaLocal;
  final String? urlRemota;
  final String tipoEvidencia;
  final String? descripcion;
  final DateTime fechaCaptura;
  final bool isDirty;
  final bool subida;
  final DateTime? lastSyncedAt;
  const Evidencia({
    required this.idLocal,
    this.idBackend,
    required this.idOrden,
    this.idActividadEjecutada,
    this.idOrdenEquipo,
    required this.rutaLocal,
    this.urlRemota,
    required this.tipoEvidencia,
    this.descripcion,
    required this.fechaCaptura,
    required this.isDirty,
    required this.subida,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id_local'] = Variable<int>(idLocal);
    if (!nullToAbsent || idBackend != null) {
      map['id_backend'] = Variable<int>(idBackend);
    }
    map['id_orden'] = Variable<int>(idOrden);
    if (!nullToAbsent || idActividadEjecutada != null) {
      map['id_actividad_ejecutada'] = Variable<int>(idActividadEjecutada);
    }
    if (!nullToAbsent || idOrdenEquipo != null) {
      map['id_orden_equipo'] = Variable<int>(idOrdenEquipo);
    }
    map['ruta_local'] = Variable<String>(rutaLocal);
    if (!nullToAbsent || urlRemota != null) {
      map['url_remota'] = Variable<String>(urlRemota);
    }
    map['tipo_evidencia'] = Variable<String>(tipoEvidencia);
    if (!nullToAbsent || descripcion != null) {
      map['descripcion'] = Variable<String>(descripcion);
    }
    map['fecha_captura'] = Variable<DateTime>(fechaCaptura);
    map['is_dirty'] = Variable<bool>(isDirty);
    map['subida'] = Variable<bool>(subida);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  EvidenciasCompanion toCompanion(bool nullToAbsent) {
    return EvidenciasCompanion(
      idLocal: Value(idLocal),
      idBackend: idBackend == null && nullToAbsent
          ? const Value.absent()
          : Value(idBackend),
      idOrden: Value(idOrden),
      idActividadEjecutada: idActividadEjecutada == null && nullToAbsent
          ? const Value.absent()
          : Value(idActividadEjecutada),
      idOrdenEquipo: idOrdenEquipo == null && nullToAbsent
          ? const Value.absent()
          : Value(idOrdenEquipo),
      rutaLocal: Value(rutaLocal),
      urlRemota: urlRemota == null && nullToAbsent
          ? const Value.absent()
          : Value(urlRemota),
      tipoEvidencia: Value(tipoEvidencia),
      descripcion: descripcion == null && nullToAbsent
          ? const Value.absent()
          : Value(descripcion),
      fechaCaptura: Value(fechaCaptura),
      isDirty: Value(isDirty),
      subida: Value(subida),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory Evidencia.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Evidencia(
      idLocal: serializer.fromJson<int>(json['idLocal']),
      idBackend: serializer.fromJson<int?>(json['idBackend']),
      idOrden: serializer.fromJson<int>(json['idOrden']),
      idActividadEjecutada: serializer.fromJson<int?>(
        json['idActividadEjecutada'],
      ),
      idOrdenEquipo: serializer.fromJson<int?>(json['idOrdenEquipo']),
      rutaLocal: serializer.fromJson<String>(json['rutaLocal']),
      urlRemota: serializer.fromJson<String?>(json['urlRemota']),
      tipoEvidencia: serializer.fromJson<String>(json['tipoEvidencia']),
      descripcion: serializer.fromJson<String?>(json['descripcion']),
      fechaCaptura: serializer.fromJson<DateTime>(json['fechaCaptura']),
      isDirty: serializer.fromJson<bool>(json['isDirty']),
      subida: serializer.fromJson<bool>(json['subida']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'idLocal': serializer.toJson<int>(idLocal),
      'idBackend': serializer.toJson<int?>(idBackend),
      'idOrden': serializer.toJson<int>(idOrden),
      'idActividadEjecutada': serializer.toJson<int?>(idActividadEjecutada),
      'idOrdenEquipo': serializer.toJson<int?>(idOrdenEquipo),
      'rutaLocal': serializer.toJson<String>(rutaLocal),
      'urlRemota': serializer.toJson<String?>(urlRemota),
      'tipoEvidencia': serializer.toJson<String>(tipoEvidencia),
      'descripcion': serializer.toJson<String?>(descripcion),
      'fechaCaptura': serializer.toJson<DateTime>(fechaCaptura),
      'isDirty': serializer.toJson<bool>(isDirty),
      'subida': serializer.toJson<bool>(subida),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  Evidencia copyWith({
    int? idLocal,
    Value<int?> idBackend = const Value.absent(),
    int? idOrden,
    Value<int?> idActividadEjecutada = const Value.absent(),
    Value<int?> idOrdenEquipo = const Value.absent(),
    String? rutaLocal,
    Value<String?> urlRemota = const Value.absent(),
    String? tipoEvidencia,
    Value<String?> descripcion = const Value.absent(),
    DateTime? fechaCaptura,
    bool? isDirty,
    bool? subida,
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => Evidencia(
    idLocal: idLocal ?? this.idLocal,
    idBackend: idBackend.present ? idBackend.value : this.idBackend,
    idOrden: idOrden ?? this.idOrden,
    idActividadEjecutada: idActividadEjecutada.present
        ? idActividadEjecutada.value
        : this.idActividadEjecutada,
    idOrdenEquipo: idOrdenEquipo.present
        ? idOrdenEquipo.value
        : this.idOrdenEquipo,
    rutaLocal: rutaLocal ?? this.rutaLocal,
    urlRemota: urlRemota.present ? urlRemota.value : this.urlRemota,
    tipoEvidencia: tipoEvidencia ?? this.tipoEvidencia,
    descripcion: descripcion.present ? descripcion.value : this.descripcion,
    fechaCaptura: fechaCaptura ?? this.fechaCaptura,
    isDirty: isDirty ?? this.isDirty,
    subida: subida ?? this.subida,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  Evidencia copyWithCompanion(EvidenciasCompanion data) {
    return Evidencia(
      idLocal: data.idLocal.present ? data.idLocal.value : this.idLocal,
      idBackend: data.idBackend.present ? data.idBackend.value : this.idBackend,
      idOrden: data.idOrden.present ? data.idOrden.value : this.idOrden,
      idActividadEjecutada: data.idActividadEjecutada.present
          ? data.idActividadEjecutada.value
          : this.idActividadEjecutada,
      idOrdenEquipo: data.idOrdenEquipo.present
          ? data.idOrdenEquipo.value
          : this.idOrdenEquipo,
      rutaLocal: data.rutaLocal.present ? data.rutaLocal.value : this.rutaLocal,
      urlRemota: data.urlRemota.present ? data.urlRemota.value : this.urlRemota,
      tipoEvidencia: data.tipoEvidencia.present
          ? data.tipoEvidencia.value
          : this.tipoEvidencia,
      descripcion: data.descripcion.present
          ? data.descripcion.value
          : this.descripcion,
      fechaCaptura: data.fechaCaptura.present
          ? data.fechaCaptura.value
          : this.fechaCaptura,
      isDirty: data.isDirty.present ? data.isDirty.value : this.isDirty,
      subida: data.subida.present ? data.subida.value : this.subida,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Evidencia(')
          ..write('idLocal: $idLocal, ')
          ..write('idBackend: $idBackend, ')
          ..write('idOrden: $idOrden, ')
          ..write('idActividadEjecutada: $idActividadEjecutada, ')
          ..write('idOrdenEquipo: $idOrdenEquipo, ')
          ..write('rutaLocal: $rutaLocal, ')
          ..write('urlRemota: $urlRemota, ')
          ..write('tipoEvidencia: $tipoEvidencia, ')
          ..write('descripcion: $descripcion, ')
          ..write('fechaCaptura: $fechaCaptura, ')
          ..write('isDirty: $isDirty, ')
          ..write('subida: $subida, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    idLocal,
    idBackend,
    idOrden,
    idActividadEjecutada,
    idOrdenEquipo,
    rutaLocal,
    urlRemota,
    tipoEvidencia,
    descripcion,
    fechaCaptura,
    isDirty,
    subida,
    lastSyncedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Evidencia &&
          other.idLocal == this.idLocal &&
          other.idBackend == this.idBackend &&
          other.idOrden == this.idOrden &&
          other.idActividadEjecutada == this.idActividadEjecutada &&
          other.idOrdenEquipo == this.idOrdenEquipo &&
          other.rutaLocal == this.rutaLocal &&
          other.urlRemota == this.urlRemota &&
          other.tipoEvidencia == this.tipoEvidencia &&
          other.descripcion == this.descripcion &&
          other.fechaCaptura == this.fechaCaptura &&
          other.isDirty == this.isDirty &&
          other.subida == this.subida &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class EvidenciasCompanion extends UpdateCompanion<Evidencia> {
  final Value<int> idLocal;
  final Value<int?> idBackend;
  final Value<int> idOrden;
  final Value<int?> idActividadEjecutada;
  final Value<int?> idOrdenEquipo;
  final Value<String> rutaLocal;
  final Value<String?> urlRemota;
  final Value<String> tipoEvidencia;
  final Value<String?> descripcion;
  final Value<DateTime> fechaCaptura;
  final Value<bool> isDirty;
  final Value<bool> subida;
  final Value<DateTime?> lastSyncedAt;
  const EvidenciasCompanion({
    this.idLocal = const Value.absent(),
    this.idBackend = const Value.absent(),
    this.idOrden = const Value.absent(),
    this.idActividadEjecutada = const Value.absent(),
    this.idOrdenEquipo = const Value.absent(),
    this.rutaLocal = const Value.absent(),
    this.urlRemota = const Value.absent(),
    this.tipoEvidencia = const Value.absent(),
    this.descripcion = const Value.absent(),
    this.fechaCaptura = const Value.absent(),
    this.isDirty = const Value.absent(),
    this.subida = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  EvidenciasCompanion.insert({
    this.idLocal = const Value.absent(),
    this.idBackend = const Value.absent(),
    required int idOrden,
    this.idActividadEjecutada = const Value.absent(),
    this.idOrdenEquipo = const Value.absent(),
    required String rutaLocal,
    this.urlRemota = const Value.absent(),
    required String tipoEvidencia,
    this.descripcion = const Value.absent(),
    this.fechaCaptura = const Value.absent(),
    this.isDirty = const Value.absent(),
    this.subida = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : idOrden = Value(idOrden),
       rutaLocal = Value(rutaLocal),
       tipoEvidencia = Value(tipoEvidencia);
  static Insertable<Evidencia> custom({
    Expression<int>? idLocal,
    Expression<int>? idBackend,
    Expression<int>? idOrden,
    Expression<int>? idActividadEjecutada,
    Expression<int>? idOrdenEquipo,
    Expression<String>? rutaLocal,
    Expression<String>? urlRemota,
    Expression<String>? tipoEvidencia,
    Expression<String>? descripcion,
    Expression<DateTime>? fechaCaptura,
    Expression<bool>? isDirty,
    Expression<bool>? subida,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (idLocal != null) 'id_local': idLocal,
      if (idBackend != null) 'id_backend': idBackend,
      if (idOrden != null) 'id_orden': idOrden,
      if (idActividadEjecutada != null)
        'id_actividad_ejecutada': idActividadEjecutada,
      if (idOrdenEquipo != null) 'id_orden_equipo': idOrdenEquipo,
      if (rutaLocal != null) 'ruta_local': rutaLocal,
      if (urlRemota != null) 'url_remota': urlRemota,
      if (tipoEvidencia != null) 'tipo_evidencia': tipoEvidencia,
      if (descripcion != null) 'descripcion': descripcion,
      if (fechaCaptura != null) 'fecha_captura': fechaCaptura,
      if (isDirty != null) 'is_dirty': isDirty,
      if (subida != null) 'subida': subida,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  EvidenciasCompanion copyWith({
    Value<int>? idLocal,
    Value<int?>? idBackend,
    Value<int>? idOrden,
    Value<int?>? idActividadEjecutada,
    Value<int?>? idOrdenEquipo,
    Value<String>? rutaLocal,
    Value<String?>? urlRemota,
    Value<String>? tipoEvidencia,
    Value<String?>? descripcion,
    Value<DateTime>? fechaCaptura,
    Value<bool>? isDirty,
    Value<bool>? subida,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return EvidenciasCompanion(
      idLocal: idLocal ?? this.idLocal,
      idBackend: idBackend ?? this.idBackend,
      idOrden: idOrden ?? this.idOrden,
      idActividadEjecutada: idActividadEjecutada ?? this.idActividadEjecutada,
      idOrdenEquipo: idOrdenEquipo ?? this.idOrdenEquipo,
      rutaLocal: rutaLocal ?? this.rutaLocal,
      urlRemota: urlRemota ?? this.urlRemota,
      tipoEvidencia: tipoEvidencia ?? this.tipoEvidencia,
      descripcion: descripcion ?? this.descripcion,
      fechaCaptura: fechaCaptura ?? this.fechaCaptura,
      isDirty: isDirty ?? this.isDirty,
      subida: subida ?? this.subida,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (idLocal.present) {
      map['id_local'] = Variable<int>(idLocal.value);
    }
    if (idBackend.present) {
      map['id_backend'] = Variable<int>(idBackend.value);
    }
    if (idOrden.present) {
      map['id_orden'] = Variable<int>(idOrden.value);
    }
    if (idActividadEjecutada.present) {
      map['id_actividad_ejecutada'] = Variable<int>(idActividadEjecutada.value);
    }
    if (idOrdenEquipo.present) {
      map['id_orden_equipo'] = Variable<int>(idOrdenEquipo.value);
    }
    if (rutaLocal.present) {
      map['ruta_local'] = Variable<String>(rutaLocal.value);
    }
    if (urlRemota.present) {
      map['url_remota'] = Variable<String>(urlRemota.value);
    }
    if (tipoEvidencia.present) {
      map['tipo_evidencia'] = Variable<String>(tipoEvidencia.value);
    }
    if (descripcion.present) {
      map['descripcion'] = Variable<String>(descripcion.value);
    }
    if (fechaCaptura.present) {
      map['fecha_captura'] = Variable<DateTime>(fechaCaptura.value);
    }
    if (isDirty.present) {
      map['is_dirty'] = Variable<bool>(isDirty.value);
    }
    if (subida.present) {
      map['subida'] = Variable<bool>(subida.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('EvidenciasCompanion(')
          ..write('idLocal: $idLocal, ')
          ..write('idBackend: $idBackend, ')
          ..write('idOrden: $idOrden, ')
          ..write('idActividadEjecutada: $idActividadEjecutada, ')
          ..write('idOrdenEquipo: $idOrdenEquipo, ')
          ..write('rutaLocal: $rutaLocal, ')
          ..write('urlRemota: $urlRemota, ')
          ..write('tipoEvidencia: $tipoEvidencia, ')
          ..write('descripcion: $descripcion, ')
          ..write('fechaCaptura: $fechaCaptura, ')
          ..write('isDirty: $isDirty, ')
          ..write('subida: $subida, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $FirmasTable extends Firmas with TableInfo<$FirmasTable, Firma> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $FirmasTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idLocalMeta = const VerificationMeta(
    'idLocal',
  );
  @override
  late final GeneratedColumn<int> idLocal = GeneratedColumn<int>(
    'id_local',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _idBackendMeta = const VerificationMeta(
    'idBackend',
  );
  @override
  late final GeneratedColumn<int> idBackend = GeneratedColumn<int>(
    'id_backend',
    aliasedName,
    true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _idOrdenMeta = const VerificationMeta(
    'idOrden',
  );
  @override
  late final GeneratedColumn<int> idOrden = GeneratedColumn<int>(
    'id_orden',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'REFERENCES ordenes (id_local)',
    ),
  );
  static const VerificationMeta _rutaLocalMeta = const VerificationMeta(
    'rutaLocal',
  );
  @override
  late final GeneratedColumn<String> rutaLocal = GeneratedColumn<String>(
    'ruta_local',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _urlRemotaMeta = const VerificationMeta(
    'urlRemota',
  );
  @override
  late final GeneratedColumn<String> urlRemota = GeneratedColumn<String>(
    'url_remota',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _tipoFirmaMeta = const VerificationMeta(
    'tipoFirma',
  );
  @override
  late final GeneratedColumn<String> tipoFirma = GeneratedColumn<String>(
    'tipo_firma',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 20),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _nombreFirmanteMeta = const VerificationMeta(
    'nombreFirmante',
  );
  @override
  late final GeneratedColumn<String> nombreFirmante = GeneratedColumn<String>(
    'nombre_firmante',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _cargoFirmanteMeta = const VerificationMeta(
    'cargoFirmante',
  );
  @override
  late final GeneratedColumn<String> cargoFirmante = GeneratedColumn<String>(
    'cargo_firmante',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _documentoFirmanteMeta = const VerificationMeta(
    'documentoFirmante',
  );
  @override
  late final GeneratedColumn<String> documentoFirmante =
      GeneratedColumn<String>(
        'documento_firmante',
        aliasedName,
        true,
        type: DriftSqlType.string,
        requiredDuringInsert: false,
      );
  static const VerificationMeta _fechaFirmaMeta = const VerificationMeta(
    'fechaFirma',
  );
  @override
  late final GeneratedColumn<DateTime> fechaFirma = GeneratedColumn<DateTime>(
    'fecha_firma',
    aliasedName,
    false,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
    defaultValue: currentDateAndTime,
  );
  static const VerificationMeta _isDirtyMeta = const VerificationMeta(
    'isDirty',
  );
  @override
  late final GeneratedColumn<bool> isDirty = GeneratedColumn<bool>(
    'is_dirty',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("is_dirty" IN (0, 1))',
    ),
    defaultValue: const Constant(true),
  );
  static const VerificationMeta _subidaMeta = const VerificationMeta('subida');
  @override
  late final GeneratedColumn<bool> subida = GeneratedColumn<bool>(
    'subida',
    aliasedName,
    false,
    type: DriftSqlType.bool,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'CHECK ("subida" IN (0, 1))',
    ),
    defaultValue: const Constant(false),
  );
  static const VerificationMeta _lastSyncedAtMeta = const VerificationMeta(
    'lastSyncedAt',
  );
  @override
  late final GeneratedColumn<DateTime> lastSyncedAt = GeneratedColumn<DateTime>(
    'last_synced_at',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    idLocal,
    idBackend,
    idOrden,
    rutaLocal,
    urlRemota,
    tipoFirma,
    nombreFirmante,
    cargoFirmante,
    documentoFirmante,
    fechaFirma,
    isDirty,
    subida,
    lastSyncedAt,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'firmas';
  @override
  VerificationContext validateIntegrity(
    Insertable<Firma> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id_local')) {
      context.handle(
        _idLocalMeta,
        idLocal.isAcceptableOrUnknown(data['id_local']!, _idLocalMeta),
      );
    }
    if (data.containsKey('id_backend')) {
      context.handle(
        _idBackendMeta,
        idBackend.isAcceptableOrUnknown(data['id_backend']!, _idBackendMeta),
      );
    }
    if (data.containsKey('id_orden')) {
      context.handle(
        _idOrdenMeta,
        idOrden.isAcceptableOrUnknown(data['id_orden']!, _idOrdenMeta),
      );
    } else if (isInserting) {
      context.missing(_idOrdenMeta);
    }
    if (data.containsKey('ruta_local')) {
      context.handle(
        _rutaLocalMeta,
        rutaLocal.isAcceptableOrUnknown(data['ruta_local']!, _rutaLocalMeta),
      );
    } else if (isInserting) {
      context.missing(_rutaLocalMeta);
    }
    if (data.containsKey('url_remota')) {
      context.handle(
        _urlRemotaMeta,
        urlRemota.isAcceptableOrUnknown(data['url_remota']!, _urlRemotaMeta),
      );
    }
    if (data.containsKey('tipo_firma')) {
      context.handle(
        _tipoFirmaMeta,
        tipoFirma.isAcceptableOrUnknown(data['tipo_firma']!, _tipoFirmaMeta),
      );
    } else if (isInserting) {
      context.missing(_tipoFirmaMeta);
    }
    if (data.containsKey('nombre_firmante')) {
      context.handle(
        _nombreFirmanteMeta,
        nombreFirmante.isAcceptableOrUnknown(
          data['nombre_firmante']!,
          _nombreFirmanteMeta,
        ),
      );
    }
    if (data.containsKey('cargo_firmante')) {
      context.handle(
        _cargoFirmanteMeta,
        cargoFirmante.isAcceptableOrUnknown(
          data['cargo_firmante']!,
          _cargoFirmanteMeta,
        ),
      );
    }
    if (data.containsKey('documento_firmante')) {
      context.handle(
        _documentoFirmanteMeta,
        documentoFirmante.isAcceptableOrUnknown(
          data['documento_firmante']!,
          _documentoFirmanteMeta,
        ),
      );
    }
    if (data.containsKey('fecha_firma')) {
      context.handle(
        _fechaFirmaMeta,
        fechaFirma.isAcceptableOrUnknown(data['fecha_firma']!, _fechaFirmaMeta),
      );
    }
    if (data.containsKey('is_dirty')) {
      context.handle(
        _isDirtyMeta,
        isDirty.isAcceptableOrUnknown(data['is_dirty']!, _isDirtyMeta),
      );
    }
    if (data.containsKey('subida')) {
      context.handle(
        _subidaMeta,
        subida.isAcceptableOrUnknown(data['subida']!, _subidaMeta),
      );
    }
    if (data.containsKey('last_synced_at')) {
      context.handle(
        _lastSyncedAtMeta,
        lastSyncedAt.isAcceptableOrUnknown(
          data['last_synced_at']!,
          _lastSyncedAtMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {idLocal};
  @override
  Firma map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return Firma(
      idLocal: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_local'],
      )!,
      idBackend: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_backend'],
      ),
      idOrden: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden'],
      )!,
      rutaLocal: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}ruta_local'],
      )!,
      urlRemota: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}url_remota'],
      ),
      tipoFirma: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}tipo_firma'],
      )!,
      nombreFirmante: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}nombre_firmante'],
      ),
      cargoFirmante: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}cargo_firmante'],
      ),
      documentoFirmante: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}documento_firmante'],
      ),
      fechaFirma: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_firma'],
      )!,
      isDirty: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}is_dirty'],
      )!,
      subida: attachedDatabase.typeMapping.read(
        DriftSqlType.bool,
        data['${effectivePrefix}subida'],
      )!,
      lastSyncedAt: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}last_synced_at'],
      ),
    );
  }

  @override
  $FirmasTable createAlias(String alias) {
    return $FirmasTable(attachedDatabase, alias);
  }
}

class Firma extends DataClass implements Insertable<Firma> {
  final int idLocal;
  final int? idBackend;
  final int idOrden;
  final String rutaLocal;
  final String? urlRemota;
  final String tipoFirma;
  final String? nombreFirmante;
  final String? cargoFirmante;
  final String? documentoFirmante;
  final DateTime fechaFirma;
  final bool isDirty;
  final bool subida;
  final DateTime? lastSyncedAt;
  const Firma({
    required this.idLocal,
    this.idBackend,
    required this.idOrden,
    required this.rutaLocal,
    this.urlRemota,
    required this.tipoFirma,
    this.nombreFirmante,
    this.cargoFirmante,
    this.documentoFirmante,
    required this.fechaFirma,
    required this.isDirty,
    required this.subida,
    this.lastSyncedAt,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id_local'] = Variable<int>(idLocal);
    if (!nullToAbsent || idBackend != null) {
      map['id_backend'] = Variable<int>(idBackend);
    }
    map['id_orden'] = Variable<int>(idOrden);
    map['ruta_local'] = Variable<String>(rutaLocal);
    if (!nullToAbsent || urlRemota != null) {
      map['url_remota'] = Variable<String>(urlRemota);
    }
    map['tipo_firma'] = Variable<String>(tipoFirma);
    if (!nullToAbsent || nombreFirmante != null) {
      map['nombre_firmante'] = Variable<String>(nombreFirmante);
    }
    if (!nullToAbsent || cargoFirmante != null) {
      map['cargo_firmante'] = Variable<String>(cargoFirmante);
    }
    if (!nullToAbsent || documentoFirmante != null) {
      map['documento_firmante'] = Variable<String>(documentoFirmante);
    }
    map['fecha_firma'] = Variable<DateTime>(fechaFirma);
    map['is_dirty'] = Variable<bool>(isDirty);
    map['subida'] = Variable<bool>(subida);
    if (!nullToAbsent || lastSyncedAt != null) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt);
    }
    return map;
  }

  FirmasCompanion toCompanion(bool nullToAbsent) {
    return FirmasCompanion(
      idLocal: Value(idLocal),
      idBackend: idBackend == null && nullToAbsent
          ? const Value.absent()
          : Value(idBackend),
      idOrden: Value(idOrden),
      rutaLocal: Value(rutaLocal),
      urlRemota: urlRemota == null && nullToAbsent
          ? const Value.absent()
          : Value(urlRemota),
      tipoFirma: Value(tipoFirma),
      nombreFirmante: nombreFirmante == null && nullToAbsent
          ? const Value.absent()
          : Value(nombreFirmante),
      cargoFirmante: cargoFirmante == null && nullToAbsent
          ? const Value.absent()
          : Value(cargoFirmante),
      documentoFirmante: documentoFirmante == null && nullToAbsent
          ? const Value.absent()
          : Value(documentoFirmante),
      fechaFirma: Value(fechaFirma),
      isDirty: Value(isDirty),
      subida: Value(subida),
      lastSyncedAt: lastSyncedAt == null && nullToAbsent
          ? const Value.absent()
          : Value(lastSyncedAt),
    );
  }

  factory Firma.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return Firma(
      idLocal: serializer.fromJson<int>(json['idLocal']),
      idBackend: serializer.fromJson<int?>(json['idBackend']),
      idOrden: serializer.fromJson<int>(json['idOrden']),
      rutaLocal: serializer.fromJson<String>(json['rutaLocal']),
      urlRemota: serializer.fromJson<String?>(json['urlRemota']),
      tipoFirma: serializer.fromJson<String>(json['tipoFirma']),
      nombreFirmante: serializer.fromJson<String?>(json['nombreFirmante']),
      cargoFirmante: serializer.fromJson<String?>(json['cargoFirmante']),
      documentoFirmante: serializer.fromJson<String?>(
        json['documentoFirmante'],
      ),
      fechaFirma: serializer.fromJson<DateTime>(json['fechaFirma']),
      isDirty: serializer.fromJson<bool>(json['isDirty']),
      subida: serializer.fromJson<bool>(json['subida']),
      lastSyncedAt: serializer.fromJson<DateTime?>(json['lastSyncedAt']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'idLocal': serializer.toJson<int>(idLocal),
      'idBackend': serializer.toJson<int?>(idBackend),
      'idOrden': serializer.toJson<int>(idOrden),
      'rutaLocal': serializer.toJson<String>(rutaLocal),
      'urlRemota': serializer.toJson<String?>(urlRemota),
      'tipoFirma': serializer.toJson<String>(tipoFirma),
      'nombreFirmante': serializer.toJson<String?>(nombreFirmante),
      'cargoFirmante': serializer.toJson<String?>(cargoFirmante),
      'documentoFirmante': serializer.toJson<String?>(documentoFirmante),
      'fechaFirma': serializer.toJson<DateTime>(fechaFirma),
      'isDirty': serializer.toJson<bool>(isDirty),
      'subida': serializer.toJson<bool>(subida),
      'lastSyncedAt': serializer.toJson<DateTime?>(lastSyncedAt),
    };
  }

  Firma copyWith({
    int? idLocal,
    Value<int?> idBackend = const Value.absent(),
    int? idOrden,
    String? rutaLocal,
    Value<String?> urlRemota = const Value.absent(),
    String? tipoFirma,
    Value<String?> nombreFirmante = const Value.absent(),
    Value<String?> cargoFirmante = const Value.absent(),
    Value<String?> documentoFirmante = const Value.absent(),
    DateTime? fechaFirma,
    bool? isDirty,
    bool? subida,
    Value<DateTime?> lastSyncedAt = const Value.absent(),
  }) => Firma(
    idLocal: idLocal ?? this.idLocal,
    idBackend: idBackend.present ? idBackend.value : this.idBackend,
    idOrden: idOrden ?? this.idOrden,
    rutaLocal: rutaLocal ?? this.rutaLocal,
    urlRemota: urlRemota.present ? urlRemota.value : this.urlRemota,
    tipoFirma: tipoFirma ?? this.tipoFirma,
    nombreFirmante: nombreFirmante.present
        ? nombreFirmante.value
        : this.nombreFirmante,
    cargoFirmante: cargoFirmante.present
        ? cargoFirmante.value
        : this.cargoFirmante,
    documentoFirmante: documentoFirmante.present
        ? documentoFirmante.value
        : this.documentoFirmante,
    fechaFirma: fechaFirma ?? this.fechaFirma,
    isDirty: isDirty ?? this.isDirty,
    subida: subida ?? this.subida,
    lastSyncedAt: lastSyncedAt.present ? lastSyncedAt.value : this.lastSyncedAt,
  );
  Firma copyWithCompanion(FirmasCompanion data) {
    return Firma(
      idLocal: data.idLocal.present ? data.idLocal.value : this.idLocal,
      idBackend: data.idBackend.present ? data.idBackend.value : this.idBackend,
      idOrden: data.idOrden.present ? data.idOrden.value : this.idOrden,
      rutaLocal: data.rutaLocal.present ? data.rutaLocal.value : this.rutaLocal,
      urlRemota: data.urlRemota.present ? data.urlRemota.value : this.urlRemota,
      tipoFirma: data.tipoFirma.present ? data.tipoFirma.value : this.tipoFirma,
      nombreFirmante: data.nombreFirmante.present
          ? data.nombreFirmante.value
          : this.nombreFirmante,
      cargoFirmante: data.cargoFirmante.present
          ? data.cargoFirmante.value
          : this.cargoFirmante,
      documentoFirmante: data.documentoFirmante.present
          ? data.documentoFirmante.value
          : this.documentoFirmante,
      fechaFirma: data.fechaFirma.present
          ? data.fechaFirma.value
          : this.fechaFirma,
      isDirty: data.isDirty.present ? data.isDirty.value : this.isDirty,
      subida: data.subida.present ? data.subida.value : this.subida,
      lastSyncedAt: data.lastSyncedAt.present
          ? data.lastSyncedAt.value
          : this.lastSyncedAt,
    );
  }

  @override
  String toString() {
    return (StringBuffer('Firma(')
          ..write('idLocal: $idLocal, ')
          ..write('idBackend: $idBackend, ')
          ..write('idOrden: $idOrden, ')
          ..write('rutaLocal: $rutaLocal, ')
          ..write('urlRemota: $urlRemota, ')
          ..write('tipoFirma: $tipoFirma, ')
          ..write('nombreFirmante: $nombreFirmante, ')
          ..write('cargoFirmante: $cargoFirmante, ')
          ..write('documentoFirmante: $documentoFirmante, ')
          ..write('fechaFirma: $fechaFirma, ')
          ..write('isDirty: $isDirty, ')
          ..write('subida: $subida, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    idLocal,
    idBackend,
    idOrden,
    rutaLocal,
    urlRemota,
    tipoFirma,
    nombreFirmante,
    cargoFirmante,
    documentoFirmante,
    fechaFirma,
    isDirty,
    subida,
    lastSyncedAt,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is Firma &&
          other.idLocal == this.idLocal &&
          other.idBackend == this.idBackend &&
          other.idOrden == this.idOrden &&
          other.rutaLocal == this.rutaLocal &&
          other.urlRemota == this.urlRemota &&
          other.tipoFirma == this.tipoFirma &&
          other.nombreFirmante == this.nombreFirmante &&
          other.cargoFirmante == this.cargoFirmante &&
          other.documentoFirmante == this.documentoFirmante &&
          other.fechaFirma == this.fechaFirma &&
          other.isDirty == this.isDirty &&
          other.subida == this.subida &&
          other.lastSyncedAt == this.lastSyncedAt);
}

class FirmasCompanion extends UpdateCompanion<Firma> {
  final Value<int> idLocal;
  final Value<int?> idBackend;
  final Value<int> idOrden;
  final Value<String> rutaLocal;
  final Value<String?> urlRemota;
  final Value<String> tipoFirma;
  final Value<String?> nombreFirmante;
  final Value<String?> cargoFirmante;
  final Value<String?> documentoFirmante;
  final Value<DateTime> fechaFirma;
  final Value<bool> isDirty;
  final Value<bool> subida;
  final Value<DateTime?> lastSyncedAt;
  const FirmasCompanion({
    this.idLocal = const Value.absent(),
    this.idBackend = const Value.absent(),
    this.idOrden = const Value.absent(),
    this.rutaLocal = const Value.absent(),
    this.urlRemota = const Value.absent(),
    this.tipoFirma = const Value.absent(),
    this.nombreFirmante = const Value.absent(),
    this.cargoFirmante = const Value.absent(),
    this.documentoFirmante = const Value.absent(),
    this.fechaFirma = const Value.absent(),
    this.isDirty = const Value.absent(),
    this.subida = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  });
  FirmasCompanion.insert({
    this.idLocal = const Value.absent(),
    this.idBackend = const Value.absent(),
    required int idOrden,
    required String rutaLocal,
    this.urlRemota = const Value.absent(),
    required String tipoFirma,
    this.nombreFirmante = const Value.absent(),
    this.cargoFirmante = const Value.absent(),
    this.documentoFirmante = const Value.absent(),
    this.fechaFirma = const Value.absent(),
    this.isDirty = const Value.absent(),
    this.subida = const Value.absent(),
    this.lastSyncedAt = const Value.absent(),
  }) : idOrden = Value(idOrden),
       rutaLocal = Value(rutaLocal),
       tipoFirma = Value(tipoFirma);
  static Insertable<Firma> custom({
    Expression<int>? idLocal,
    Expression<int>? idBackend,
    Expression<int>? idOrden,
    Expression<String>? rutaLocal,
    Expression<String>? urlRemota,
    Expression<String>? tipoFirma,
    Expression<String>? nombreFirmante,
    Expression<String>? cargoFirmante,
    Expression<String>? documentoFirmante,
    Expression<DateTime>? fechaFirma,
    Expression<bool>? isDirty,
    Expression<bool>? subida,
    Expression<DateTime>? lastSyncedAt,
  }) {
    return RawValuesInsertable({
      if (idLocal != null) 'id_local': idLocal,
      if (idBackend != null) 'id_backend': idBackend,
      if (idOrden != null) 'id_orden': idOrden,
      if (rutaLocal != null) 'ruta_local': rutaLocal,
      if (urlRemota != null) 'url_remota': urlRemota,
      if (tipoFirma != null) 'tipo_firma': tipoFirma,
      if (nombreFirmante != null) 'nombre_firmante': nombreFirmante,
      if (cargoFirmante != null) 'cargo_firmante': cargoFirmante,
      if (documentoFirmante != null) 'documento_firmante': documentoFirmante,
      if (fechaFirma != null) 'fecha_firma': fechaFirma,
      if (isDirty != null) 'is_dirty': isDirty,
      if (subida != null) 'subida': subida,
      if (lastSyncedAt != null) 'last_synced_at': lastSyncedAt,
    });
  }

  FirmasCompanion copyWith({
    Value<int>? idLocal,
    Value<int?>? idBackend,
    Value<int>? idOrden,
    Value<String>? rutaLocal,
    Value<String?>? urlRemota,
    Value<String>? tipoFirma,
    Value<String?>? nombreFirmante,
    Value<String?>? cargoFirmante,
    Value<String?>? documentoFirmante,
    Value<DateTime>? fechaFirma,
    Value<bool>? isDirty,
    Value<bool>? subida,
    Value<DateTime?>? lastSyncedAt,
  }) {
    return FirmasCompanion(
      idLocal: idLocal ?? this.idLocal,
      idBackend: idBackend ?? this.idBackend,
      idOrden: idOrden ?? this.idOrden,
      rutaLocal: rutaLocal ?? this.rutaLocal,
      urlRemota: urlRemota ?? this.urlRemota,
      tipoFirma: tipoFirma ?? this.tipoFirma,
      nombreFirmante: nombreFirmante ?? this.nombreFirmante,
      cargoFirmante: cargoFirmante ?? this.cargoFirmante,
      documentoFirmante: documentoFirmante ?? this.documentoFirmante,
      fechaFirma: fechaFirma ?? this.fechaFirma,
      isDirty: isDirty ?? this.isDirty,
      subida: subida ?? this.subida,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (idLocal.present) {
      map['id_local'] = Variable<int>(idLocal.value);
    }
    if (idBackend.present) {
      map['id_backend'] = Variable<int>(idBackend.value);
    }
    if (idOrden.present) {
      map['id_orden'] = Variable<int>(idOrden.value);
    }
    if (rutaLocal.present) {
      map['ruta_local'] = Variable<String>(rutaLocal.value);
    }
    if (urlRemota.present) {
      map['url_remota'] = Variable<String>(urlRemota.value);
    }
    if (tipoFirma.present) {
      map['tipo_firma'] = Variable<String>(tipoFirma.value);
    }
    if (nombreFirmante.present) {
      map['nombre_firmante'] = Variable<String>(nombreFirmante.value);
    }
    if (cargoFirmante.present) {
      map['cargo_firmante'] = Variable<String>(cargoFirmante.value);
    }
    if (documentoFirmante.present) {
      map['documento_firmante'] = Variable<String>(documentoFirmante.value);
    }
    if (fechaFirma.present) {
      map['fecha_firma'] = Variable<DateTime>(fechaFirma.value);
    }
    if (isDirty.present) {
      map['is_dirty'] = Variable<bool>(isDirty.value);
    }
    if (subida.present) {
      map['subida'] = Variable<bool>(subida.value);
    }
    if (lastSyncedAt.present) {
      map['last_synced_at'] = Variable<DateTime>(lastSyncedAt.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('FirmasCompanion(')
          ..write('idLocal: $idLocal, ')
          ..write('idBackend: $idBackend, ')
          ..write('idOrden: $idOrden, ')
          ..write('rutaLocal: $rutaLocal, ')
          ..write('urlRemota: $urlRemota, ')
          ..write('tipoFirma: $tipoFirma, ')
          ..write('nombreFirmante: $nombreFirmante, ')
          ..write('cargoFirmante: $cargoFirmante, ')
          ..write('documentoFirmante: $documentoFirmante, ')
          ..write('fechaFirma: $fechaFirma, ')
          ..write('isDirty: $isDirty, ')
          ..write('subida: $subida, ')
          ..write('lastSyncedAt: $lastSyncedAt')
          ..write(')'))
        .toString();
  }
}

class $SyncStatusEntriesTable extends SyncStatusEntries
    with TableInfo<$SyncStatusEntriesTable, SyncStatusEntry> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $SyncStatusEntriesTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _entidadMeta = const VerificationMeta(
    'entidad',
  );
  @override
  late final GeneratedColumn<String> entidad = GeneratedColumn<String>(
    'entidad',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 50),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _ultimaSyncMeta = const VerificationMeta(
    'ultimaSync',
  );
  @override
  late final GeneratedColumn<DateTime> ultimaSync = GeneratedColumn<DateTime>(
    'ultima_sync',
    aliasedName,
    true,
    type: DriftSqlType.dateTime,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _pendientesSubirMeta = const VerificationMeta(
    'pendientesSubir',
  );
  @override
  late final GeneratedColumn<int> pendientesSubir = GeneratedColumn<int>(
    'pendientes_subir',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _pendientesBajarMeta = const VerificationMeta(
    'pendientesBajar',
  );
  @override
  late final GeneratedColumn<int> pendientesBajar = GeneratedColumn<int>(
    'pendientes_bajar',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _ultimoErrorMeta = const VerificationMeta(
    'ultimoError',
  );
  @override
  late final GeneratedColumn<String> ultimoError = GeneratedColumn<String>(
    'ultimo_error',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    entidad,
    ultimaSync,
    pendientesSubir,
    pendientesBajar,
    ultimoError,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'sync_status_entries';
  @override
  VerificationContext validateIntegrity(
    Insertable<SyncStatusEntry> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('entidad')) {
      context.handle(
        _entidadMeta,
        entidad.isAcceptableOrUnknown(data['entidad']!, _entidadMeta),
      );
    } else if (isInserting) {
      context.missing(_entidadMeta);
    }
    if (data.containsKey('ultima_sync')) {
      context.handle(
        _ultimaSyncMeta,
        ultimaSync.isAcceptableOrUnknown(data['ultima_sync']!, _ultimaSyncMeta),
      );
    }
    if (data.containsKey('pendientes_subir')) {
      context.handle(
        _pendientesSubirMeta,
        pendientesSubir.isAcceptableOrUnknown(
          data['pendientes_subir']!,
          _pendientesSubirMeta,
        ),
      );
    }
    if (data.containsKey('pendientes_bajar')) {
      context.handle(
        _pendientesBajarMeta,
        pendientesBajar.isAcceptableOrUnknown(
          data['pendientes_bajar']!,
          _pendientesBajarMeta,
        ),
      );
    }
    if (data.containsKey('ultimo_error')) {
      context.handle(
        _ultimoErrorMeta,
        ultimoError.isAcceptableOrUnknown(
          data['ultimo_error']!,
          _ultimoErrorMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  List<Set<GeneratedColumn>> get uniqueKeys => [
    {entidad},
  ];
  @override
  SyncStatusEntry map(Map<String, dynamic> data, {String? tablePrefix}) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return SyncStatusEntry(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      entidad: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}entidad'],
      )!,
      ultimaSync: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}ultima_sync'],
      ),
      pendientesSubir: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}pendientes_subir'],
      )!,
      pendientesBajar: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}pendientes_bajar'],
      )!,
      ultimoError: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}ultimo_error'],
      ),
    );
  }

  @override
  $SyncStatusEntriesTable createAlias(String alias) {
    return $SyncStatusEntriesTable(attachedDatabase, alias);
  }
}

class SyncStatusEntry extends DataClass implements Insertable<SyncStatusEntry> {
  final int id;
  final String entidad;
  final DateTime? ultimaSync;
  final int pendientesSubir;
  final int pendientesBajar;
  final String? ultimoError;
  const SyncStatusEntry({
    required this.id,
    required this.entidad,
    this.ultimaSync,
    required this.pendientesSubir,
    required this.pendientesBajar,
    this.ultimoError,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['entidad'] = Variable<String>(entidad);
    if (!nullToAbsent || ultimaSync != null) {
      map['ultima_sync'] = Variable<DateTime>(ultimaSync);
    }
    map['pendientes_subir'] = Variable<int>(pendientesSubir);
    map['pendientes_bajar'] = Variable<int>(pendientesBajar);
    if (!nullToAbsent || ultimoError != null) {
      map['ultimo_error'] = Variable<String>(ultimoError);
    }
    return map;
  }

  SyncStatusEntriesCompanion toCompanion(bool nullToAbsent) {
    return SyncStatusEntriesCompanion(
      id: Value(id),
      entidad: Value(entidad),
      ultimaSync: ultimaSync == null && nullToAbsent
          ? const Value.absent()
          : Value(ultimaSync),
      pendientesSubir: Value(pendientesSubir),
      pendientesBajar: Value(pendientesBajar),
      ultimoError: ultimoError == null && nullToAbsent
          ? const Value.absent()
          : Value(ultimoError),
    );
  }

  factory SyncStatusEntry.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return SyncStatusEntry(
      id: serializer.fromJson<int>(json['id']),
      entidad: serializer.fromJson<String>(json['entidad']),
      ultimaSync: serializer.fromJson<DateTime?>(json['ultimaSync']),
      pendientesSubir: serializer.fromJson<int>(json['pendientesSubir']),
      pendientesBajar: serializer.fromJson<int>(json['pendientesBajar']),
      ultimoError: serializer.fromJson<String?>(json['ultimoError']),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'entidad': serializer.toJson<String>(entidad),
      'ultimaSync': serializer.toJson<DateTime?>(ultimaSync),
      'pendientesSubir': serializer.toJson<int>(pendientesSubir),
      'pendientesBajar': serializer.toJson<int>(pendientesBajar),
      'ultimoError': serializer.toJson<String?>(ultimoError),
    };
  }

  SyncStatusEntry copyWith({
    int? id,
    String? entidad,
    Value<DateTime?> ultimaSync = const Value.absent(),
    int? pendientesSubir,
    int? pendientesBajar,
    Value<String?> ultimoError = const Value.absent(),
  }) => SyncStatusEntry(
    id: id ?? this.id,
    entidad: entidad ?? this.entidad,
    ultimaSync: ultimaSync.present ? ultimaSync.value : this.ultimaSync,
    pendientesSubir: pendientesSubir ?? this.pendientesSubir,
    pendientesBajar: pendientesBajar ?? this.pendientesBajar,
    ultimoError: ultimoError.present ? ultimoError.value : this.ultimoError,
  );
  SyncStatusEntry copyWithCompanion(SyncStatusEntriesCompanion data) {
    return SyncStatusEntry(
      id: data.id.present ? data.id.value : this.id,
      entidad: data.entidad.present ? data.entidad.value : this.entidad,
      ultimaSync: data.ultimaSync.present
          ? data.ultimaSync.value
          : this.ultimaSync,
      pendientesSubir: data.pendientesSubir.present
          ? data.pendientesSubir.value
          : this.pendientesSubir,
      pendientesBajar: data.pendientesBajar.present
          ? data.pendientesBajar.value
          : this.pendientesBajar,
      ultimoError: data.ultimoError.present
          ? data.ultimoError.value
          : this.ultimoError,
    );
  }

  @override
  String toString() {
    return (StringBuffer('SyncStatusEntry(')
          ..write('id: $id, ')
          ..write('entidad: $entidad, ')
          ..write('ultimaSync: $ultimaSync, ')
          ..write('pendientesSubir: $pendientesSubir, ')
          ..write('pendientesBajar: $pendientesBajar, ')
          ..write('ultimoError: $ultimoError')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    entidad,
    ultimaSync,
    pendientesSubir,
    pendientesBajar,
    ultimoError,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is SyncStatusEntry &&
          other.id == this.id &&
          other.entidad == this.entidad &&
          other.ultimaSync == this.ultimaSync &&
          other.pendientesSubir == this.pendientesSubir &&
          other.pendientesBajar == this.pendientesBajar &&
          other.ultimoError == this.ultimoError);
}

class SyncStatusEntriesCompanion extends UpdateCompanion<SyncStatusEntry> {
  final Value<int> id;
  final Value<String> entidad;
  final Value<DateTime?> ultimaSync;
  final Value<int> pendientesSubir;
  final Value<int> pendientesBajar;
  final Value<String?> ultimoError;
  const SyncStatusEntriesCompanion({
    this.id = const Value.absent(),
    this.entidad = const Value.absent(),
    this.ultimaSync = const Value.absent(),
    this.pendientesSubir = const Value.absent(),
    this.pendientesBajar = const Value.absent(),
    this.ultimoError = const Value.absent(),
  });
  SyncStatusEntriesCompanion.insert({
    this.id = const Value.absent(),
    required String entidad,
    this.ultimaSync = const Value.absent(),
    this.pendientesSubir = const Value.absent(),
    this.pendientesBajar = const Value.absent(),
    this.ultimoError = const Value.absent(),
  }) : entidad = Value(entidad);
  static Insertable<SyncStatusEntry> custom({
    Expression<int>? id,
    Expression<String>? entidad,
    Expression<DateTime>? ultimaSync,
    Expression<int>? pendientesSubir,
    Expression<int>? pendientesBajar,
    Expression<String>? ultimoError,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (entidad != null) 'entidad': entidad,
      if (ultimaSync != null) 'ultima_sync': ultimaSync,
      if (pendientesSubir != null) 'pendientes_subir': pendientesSubir,
      if (pendientesBajar != null) 'pendientes_bajar': pendientesBajar,
      if (ultimoError != null) 'ultimo_error': ultimoError,
    });
  }

  SyncStatusEntriesCompanion copyWith({
    Value<int>? id,
    Value<String>? entidad,
    Value<DateTime?>? ultimaSync,
    Value<int>? pendientesSubir,
    Value<int>? pendientesBajar,
    Value<String?>? ultimoError,
  }) {
    return SyncStatusEntriesCompanion(
      id: id ?? this.id,
      entidad: entidad ?? this.entidad,
      ultimaSync: ultimaSync ?? this.ultimaSync,
      pendientesSubir: pendientesSubir ?? this.pendientesSubir,
      pendientesBajar: pendientesBajar ?? this.pendientesBajar,
      ultimoError: ultimoError ?? this.ultimoError,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (entidad.present) {
      map['entidad'] = Variable<String>(entidad.value);
    }
    if (ultimaSync.present) {
      map['ultima_sync'] = Variable<DateTime>(ultimaSync.value);
    }
    if (pendientesSubir.present) {
      map['pendientes_subir'] = Variable<int>(pendientesSubir.value);
    }
    if (pendientesBajar.present) {
      map['pendientes_bajar'] = Variable<int>(pendientesBajar.value);
    }
    if (ultimoError.present) {
      map['ultimo_error'] = Variable<String>(ultimoError.value);
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('SyncStatusEntriesCompanion(')
          ..write('id: $id, ')
          ..write('entidad: $entidad, ')
          ..write('ultimaSync: $ultimaSync, ')
          ..write('pendientesSubir: $pendientesSubir, ')
          ..write('pendientesBajar: $pendientesBajar, ')
          ..write('ultimoError: $ultimoError')
          ..write(')'))
        .toString();
  }
}

class $OrdenesPendientesSyncTable extends OrdenesPendientesSync
    with TableInfo<$OrdenesPendientesSyncTable, OrdenesPendientesSyncData> {
  @override
  final GeneratedDatabase attachedDatabase;
  final String? _alias;
  $OrdenesPendientesSyncTable(this.attachedDatabase, [this._alias]);
  static const VerificationMeta _idMeta = const VerificationMeta('id');
  @override
  late final GeneratedColumn<int> id = GeneratedColumn<int>(
    'id',
    aliasedName,
    false,
    hasAutoIncrement: true,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultConstraints: GeneratedColumn.constraintIsAlways(
      'PRIMARY KEY AUTOINCREMENT',
    ),
  );
  static const VerificationMeta _idOrdenLocalMeta = const VerificationMeta(
    'idOrdenLocal',
  );
  @override
  late final GeneratedColumn<int> idOrdenLocal = GeneratedColumn<int>(
    'id_orden_local',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _idOrdenBackendMeta = const VerificationMeta(
    'idOrdenBackend',
  );
  @override
  late final GeneratedColumn<int> idOrdenBackend = GeneratedColumn<int>(
    'id_orden_backend',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _payloadJsonMeta = const VerificationMeta(
    'payloadJson',
  );
  @override
  late final GeneratedColumn<String> payloadJson = GeneratedColumn<String>(
    'payload_json',
    aliasedName,
    false,
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _estadoSyncMeta = const VerificationMeta(
    'estadoSync',
  );
  @override
  late final GeneratedColumn<String> estadoSync = GeneratedColumn<String>(
    'estado_sync',
    aliasedName,
    false,
    additionalChecks: GeneratedColumn.checkTextLength(maxTextLength: 20),
    type: DriftSqlType.string,
    requiredDuringInsert: true,
  );
  static const VerificationMeta _intentosMeta = const VerificationMeta(
    'intentos',
  );
  @override
  late final GeneratedColumn<int> intentos = GeneratedColumn<int>(
    'intentos',
    aliasedName,
    false,
    type: DriftSqlType.int,
    requiredDuringInsert: false,
    defaultValue: const Constant(0),
  );
  static const VerificationMeta _ultimoErrorMeta = const VerificationMeta(
    'ultimoError',
  );
  @override
  late final GeneratedColumn<String> ultimoError = GeneratedColumn<String>(
    'ultimo_error',
    aliasedName,
    true,
    type: DriftSqlType.string,
    requiredDuringInsert: false,
  );
  static const VerificationMeta _fechaCreacionMeta = const VerificationMeta(
    'fechaCreacion',
  );
  @override
  late final GeneratedColumn<DateTime> fechaCreacion =
      GeneratedColumn<DateTime>(
        'fecha_creacion',
        aliasedName,
        false,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: false,
        defaultValue: currentDateAndTime,
      );
  static const VerificationMeta _fechaUltimoIntentoMeta =
      const VerificationMeta('fechaUltimoIntento');
  @override
  late final GeneratedColumn<DateTime> fechaUltimoIntento =
      GeneratedColumn<DateTime>(
        'fecha_ultimo_intento',
        aliasedName,
        true,
        type: DriftSqlType.dateTime,
        requiredDuringInsert: false,
      );
  @override
  List<GeneratedColumn> get $columns => [
    id,
    idOrdenLocal,
    idOrdenBackend,
    payloadJson,
    estadoSync,
    intentos,
    ultimoError,
    fechaCreacion,
    fechaUltimoIntento,
  ];
  @override
  String get aliasedName => _alias ?? actualTableName;
  @override
  String get actualTableName => $name;
  static const String $name = 'ordenes_pendientes_sync';
  @override
  VerificationContext validateIntegrity(
    Insertable<OrdenesPendientesSyncData> instance, {
    bool isInserting = false,
  }) {
    final context = VerificationContext();
    final data = instance.toColumns(true);
    if (data.containsKey('id')) {
      context.handle(_idMeta, id.isAcceptableOrUnknown(data['id']!, _idMeta));
    }
    if (data.containsKey('id_orden_local')) {
      context.handle(
        _idOrdenLocalMeta,
        idOrdenLocal.isAcceptableOrUnknown(
          data['id_orden_local']!,
          _idOrdenLocalMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_idOrdenLocalMeta);
    }
    if (data.containsKey('id_orden_backend')) {
      context.handle(
        _idOrdenBackendMeta,
        idOrdenBackend.isAcceptableOrUnknown(
          data['id_orden_backend']!,
          _idOrdenBackendMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_idOrdenBackendMeta);
    }
    if (data.containsKey('payload_json')) {
      context.handle(
        _payloadJsonMeta,
        payloadJson.isAcceptableOrUnknown(
          data['payload_json']!,
          _payloadJsonMeta,
        ),
      );
    } else if (isInserting) {
      context.missing(_payloadJsonMeta);
    }
    if (data.containsKey('estado_sync')) {
      context.handle(
        _estadoSyncMeta,
        estadoSync.isAcceptableOrUnknown(data['estado_sync']!, _estadoSyncMeta),
      );
    } else if (isInserting) {
      context.missing(_estadoSyncMeta);
    }
    if (data.containsKey('intentos')) {
      context.handle(
        _intentosMeta,
        intentos.isAcceptableOrUnknown(data['intentos']!, _intentosMeta),
      );
    }
    if (data.containsKey('ultimo_error')) {
      context.handle(
        _ultimoErrorMeta,
        ultimoError.isAcceptableOrUnknown(
          data['ultimo_error']!,
          _ultimoErrorMeta,
        ),
      );
    }
    if (data.containsKey('fecha_creacion')) {
      context.handle(
        _fechaCreacionMeta,
        fechaCreacion.isAcceptableOrUnknown(
          data['fecha_creacion']!,
          _fechaCreacionMeta,
        ),
      );
    }
    if (data.containsKey('fecha_ultimo_intento')) {
      context.handle(
        _fechaUltimoIntentoMeta,
        fechaUltimoIntento.isAcceptableOrUnknown(
          data['fecha_ultimo_intento']!,
          _fechaUltimoIntentoMeta,
        ),
      );
    }
    return context;
  }

  @override
  Set<GeneratedColumn> get $primaryKey => {id};
  @override
  List<Set<GeneratedColumn>> get uniqueKeys => [
    {idOrdenLocal},
  ];
  @override
  OrdenesPendientesSyncData map(
    Map<String, dynamic> data, {
    String? tablePrefix,
  }) {
    final effectivePrefix = tablePrefix != null ? '$tablePrefix.' : '';
    return OrdenesPendientesSyncData(
      id: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id'],
      )!,
      idOrdenLocal: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden_local'],
      )!,
      idOrdenBackend: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}id_orden_backend'],
      )!,
      payloadJson: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}payload_json'],
      )!,
      estadoSync: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}estado_sync'],
      )!,
      intentos: attachedDatabase.typeMapping.read(
        DriftSqlType.int,
        data['${effectivePrefix}intentos'],
      )!,
      ultimoError: attachedDatabase.typeMapping.read(
        DriftSqlType.string,
        data['${effectivePrefix}ultimo_error'],
      ),
      fechaCreacion: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_creacion'],
      )!,
      fechaUltimoIntento: attachedDatabase.typeMapping.read(
        DriftSqlType.dateTime,
        data['${effectivePrefix}fecha_ultimo_intento'],
      ),
    );
  }

  @override
  $OrdenesPendientesSyncTable createAlias(String alias) {
    return $OrdenesPendientesSyncTable(attachedDatabase, alias);
  }
}

class OrdenesPendientesSyncData extends DataClass
    implements Insertable<OrdenesPendientesSyncData> {
  final int id;
  final int idOrdenLocal;
  final int idOrdenBackend;
  final String payloadJson;
  final String estadoSync;
  final int intentos;
  final String? ultimoError;
  final DateTime fechaCreacion;
  final DateTime? fechaUltimoIntento;
  const OrdenesPendientesSyncData({
    required this.id,
    required this.idOrdenLocal,
    required this.idOrdenBackend,
    required this.payloadJson,
    required this.estadoSync,
    required this.intentos,
    this.ultimoError,
    required this.fechaCreacion,
    this.fechaUltimoIntento,
  });
  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    map['id'] = Variable<int>(id);
    map['id_orden_local'] = Variable<int>(idOrdenLocal);
    map['id_orden_backend'] = Variable<int>(idOrdenBackend);
    map['payload_json'] = Variable<String>(payloadJson);
    map['estado_sync'] = Variable<String>(estadoSync);
    map['intentos'] = Variable<int>(intentos);
    if (!nullToAbsent || ultimoError != null) {
      map['ultimo_error'] = Variable<String>(ultimoError);
    }
    map['fecha_creacion'] = Variable<DateTime>(fechaCreacion);
    if (!nullToAbsent || fechaUltimoIntento != null) {
      map['fecha_ultimo_intento'] = Variable<DateTime>(fechaUltimoIntento);
    }
    return map;
  }

  OrdenesPendientesSyncCompanion toCompanion(bool nullToAbsent) {
    return OrdenesPendientesSyncCompanion(
      id: Value(id),
      idOrdenLocal: Value(idOrdenLocal),
      idOrdenBackend: Value(idOrdenBackend),
      payloadJson: Value(payloadJson),
      estadoSync: Value(estadoSync),
      intentos: Value(intentos),
      ultimoError: ultimoError == null && nullToAbsent
          ? const Value.absent()
          : Value(ultimoError),
      fechaCreacion: Value(fechaCreacion),
      fechaUltimoIntento: fechaUltimoIntento == null && nullToAbsent
          ? const Value.absent()
          : Value(fechaUltimoIntento),
    );
  }

  factory OrdenesPendientesSyncData.fromJson(
    Map<String, dynamic> json, {
    ValueSerializer? serializer,
  }) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return OrdenesPendientesSyncData(
      id: serializer.fromJson<int>(json['id']),
      idOrdenLocal: serializer.fromJson<int>(json['idOrdenLocal']),
      idOrdenBackend: serializer.fromJson<int>(json['idOrdenBackend']),
      payloadJson: serializer.fromJson<String>(json['payloadJson']),
      estadoSync: serializer.fromJson<String>(json['estadoSync']),
      intentos: serializer.fromJson<int>(json['intentos']),
      ultimoError: serializer.fromJson<String?>(json['ultimoError']),
      fechaCreacion: serializer.fromJson<DateTime>(json['fechaCreacion']),
      fechaUltimoIntento: serializer.fromJson<DateTime?>(
        json['fechaUltimoIntento'],
      ),
    );
  }
  @override
  Map<String, dynamic> toJson({ValueSerializer? serializer}) {
    serializer ??= driftRuntimeOptions.defaultSerializer;
    return <String, dynamic>{
      'id': serializer.toJson<int>(id),
      'idOrdenLocal': serializer.toJson<int>(idOrdenLocal),
      'idOrdenBackend': serializer.toJson<int>(idOrdenBackend),
      'payloadJson': serializer.toJson<String>(payloadJson),
      'estadoSync': serializer.toJson<String>(estadoSync),
      'intentos': serializer.toJson<int>(intentos),
      'ultimoError': serializer.toJson<String?>(ultimoError),
      'fechaCreacion': serializer.toJson<DateTime>(fechaCreacion),
      'fechaUltimoIntento': serializer.toJson<DateTime?>(fechaUltimoIntento),
    };
  }

  OrdenesPendientesSyncData copyWith({
    int? id,
    int? idOrdenLocal,
    int? idOrdenBackend,
    String? payloadJson,
    String? estadoSync,
    int? intentos,
    Value<String?> ultimoError = const Value.absent(),
    DateTime? fechaCreacion,
    Value<DateTime?> fechaUltimoIntento = const Value.absent(),
  }) => OrdenesPendientesSyncData(
    id: id ?? this.id,
    idOrdenLocal: idOrdenLocal ?? this.idOrdenLocal,
    idOrdenBackend: idOrdenBackend ?? this.idOrdenBackend,
    payloadJson: payloadJson ?? this.payloadJson,
    estadoSync: estadoSync ?? this.estadoSync,
    intentos: intentos ?? this.intentos,
    ultimoError: ultimoError.present ? ultimoError.value : this.ultimoError,
    fechaCreacion: fechaCreacion ?? this.fechaCreacion,
    fechaUltimoIntento: fechaUltimoIntento.present
        ? fechaUltimoIntento.value
        : this.fechaUltimoIntento,
  );
  OrdenesPendientesSyncData copyWithCompanion(
    OrdenesPendientesSyncCompanion data,
  ) {
    return OrdenesPendientesSyncData(
      id: data.id.present ? data.id.value : this.id,
      idOrdenLocal: data.idOrdenLocal.present
          ? data.idOrdenLocal.value
          : this.idOrdenLocal,
      idOrdenBackend: data.idOrdenBackend.present
          ? data.idOrdenBackend.value
          : this.idOrdenBackend,
      payloadJson: data.payloadJson.present
          ? data.payloadJson.value
          : this.payloadJson,
      estadoSync: data.estadoSync.present
          ? data.estadoSync.value
          : this.estadoSync,
      intentos: data.intentos.present ? data.intentos.value : this.intentos,
      ultimoError: data.ultimoError.present
          ? data.ultimoError.value
          : this.ultimoError,
      fechaCreacion: data.fechaCreacion.present
          ? data.fechaCreacion.value
          : this.fechaCreacion,
      fechaUltimoIntento: data.fechaUltimoIntento.present
          ? data.fechaUltimoIntento.value
          : this.fechaUltimoIntento,
    );
  }

  @override
  String toString() {
    return (StringBuffer('OrdenesPendientesSyncData(')
          ..write('id: $id, ')
          ..write('idOrdenLocal: $idOrdenLocal, ')
          ..write('idOrdenBackend: $idOrdenBackend, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('estadoSync: $estadoSync, ')
          ..write('intentos: $intentos, ')
          ..write('ultimoError: $ultimoError, ')
          ..write('fechaCreacion: $fechaCreacion, ')
          ..write('fechaUltimoIntento: $fechaUltimoIntento')
          ..write(')'))
        .toString();
  }

  @override
  int get hashCode => Object.hash(
    id,
    idOrdenLocal,
    idOrdenBackend,
    payloadJson,
    estadoSync,
    intentos,
    ultimoError,
    fechaCreacion,
    fechaUltimoIntento,
  );
  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      (other is OrdenesPendientesSyncData &&
          other.id == this.id &&
          other.idOrdenLocal == this.idOrdenLocal &&
          other.idOrdenBackend == this.idOrdenBackend &&
          other.payloadJson == this.payloadJson &&
          other.estadoSync == this.estadoSync &&
          other.intentos == this.intentos &&
          other.ultimoError == this.ultimoError &&
          other.fechaCreacion == this.fechaCreacion &&
          other.fechaUltimoIntento == this.fechaUltimoIntento);
}

class OrdenesPendientesSyncCompanion
    extends UpdateCompanion<OrdenesPendientesSyncData> {
  final Value<int> id;
  final Value<int> idOrdenLocal;
  final Value<int> idOrdenBackend;
  final Value<String> payloadJson;
  final Value<String> estadoSync;
  final Value<int> intentos;
  final Value<String?> ultimoError;
  final Value<DateTime> fechaCreacion;
  final Value<DateTime?> fechaUltimoIntento;
  const OrdenesPendientesSyncCompanion({
    this.id = const Value.absent(),
    this.idOrdenLocal = const Value.absent(),
    this.idOrdenBackend = const Value.absent(),
    this.payloadJson = const Value.absent(),
    this.estadoSync = const Value.absent(),
    this.intentos = const Value.absent(),
    this.ultimoError = const Value.absent(),
    this.fechaCreacion = const Value.absent(),
    this.fechaUltimoIntento = const Value.absent(),
  });
  OrdenesPendientesSyncCompanion.insert({
    this.id = const Value.absent(),
    required int idOrdenLocal,
    required int idOrdenBackend,
    required String payloadJson,
    required String estadoSync,
    this.intentos = const Value.absent(),
    this.ultimoError = const Value.absent(),
    this.fechaCreacion = const Value.absent(),
    this.fechaUltimoIntento = const Value.absent(),
  }) : idOrdenLocal = Value(idOrdenLocal),
       idOrdenBackend = Value(idOrdenBackend),
       payloadJson = Value(payloadJson),
       estadoSync = Value(estadoSync);
  static Insertable<OrdenesPendientesSyncData> custom({
    Expression<int>? id,
    Expression<int>? idOrdenLocal,
    Expression<int>? idOrdenBackend,
    Expression<String>? payloadJson,
    Expression<String>? estadoSync,
    Expression<int>? intentos,
    Expression<String>? ultimoError,
    Expression<DateTime>? fechaCreacion,
    Expression<DateTime>? fechaUltimoIntento,
  }) {
    return RawValuesInsertable({
      if (id != null) 'id': id,
      if (idOrdenLocal != null) 'id_orden_local': idOrdenLocal,
      if (idOrdenBackend != null) 'id_orden_backend': idOrdenBackend,
      if (payloadJson != null) 'payload_json': payloadJson,
      if (estadoSync != null) 'estado_sync': estadoSync,
      if (intentos != null) 'intentos': intentos,
      if (ultimoError != null) 'ultimo_error': ultimoError,
      if (fechaCreacion != null) 'fecha_creacion': fechaCreacion,
      if (fechaUltimoIntento != null)
        'fecha_ultimo_intento': fechaUltimoIntento,
    });
  }

  OrdenesPendientesSyncCompanion copyWith({
    Value<int>? id,
    Value<int>? idOrdenLocal,
    Value<int>? idOrdenBackend,
    Value<String>? payloadJson,
    Value<String>? estadoSync,
    Value<int>? intentos,
    Value<String?>? ultimoError,
    Value<DateTime>? fechaCreacion,
    Value<DateTime?>? fechaUltimoIntento,
  }) {
    return OrdenesPendientesSyncCompanion(
      id: id ?? this.id,
      idOrdenLocal: idOrdenLocal ?? this.idOrdenLocal,
      idOrdenBackend: idOrdenBackend ?? this.idOrdenBackend,
      payloadJson: payloadJson ?? this.payloadJson,
      estadoSync: estadoSync ?? this.estadoSync,
      intentos: intentos ?? this.intentos,
      ultimoError: ultimoError ?? this.ultimoError,
      fechaCreacion: fechaCreacion ?? this.fechaCreacion,
      fechaUltimoIntento: fechaUltimoIntento ?? this.fechaUltimoIntento,
    );
  }

  @override
  Map<String, Expression> toColumns(bool nullToAbsent) {
    final map = <String, Expression>{};
    if (id.present) {
      map['id'] = Variable<int>(id.value);
    }
    if (idOrdenLocal.present) {
      map['id_orden_local'] = Variable<int>(idOrdenLocal.value);
    }
    if (idOrdenBackend.present) {
      map['id_orden_backend'] = Variable<int>(idOrdenBackend.value);
    }
    if (payloadJson.present) {
      map['payload_json'] = Variable<String>(payloadJson.value);
    }
    if (estadoSync.present) {
      map['estado_sync'] = Variable<String>(estadoSync.value);
    }
    if (intentos.present) {
      map['intentos'] = Variable<int>(intentos.value);
    }
    if (ultimoError.present) {
      map['ultimo_error'] = Variable<String>(ultimoError.value);
    }
    if (fechaCreacion.present) {
      map['fecha_creacion'] = Variable<DateTime>(fechaCreacion.value);
    }
    if (fechaUltimoIntento.present) {
      map['fecha_ultimo_intento'] = Variable<DateTime>(
        fechaUltimoIntento.value,
      );
    }
    return map;
  }

  @override
  String toString() {
    return (StringBuffer('OrdenesPendientesSyncCompanion(')
          ..write('id: $id, ')
          ..write('idOrdenLocal: $idOrdenLocal, ')
          ..write('idOrdenBackend: $idOrdenBackend, ')
          ..write('payloadJson: $payloadJson, ')
          ..write('estadoSync: $estadoSync, ')
          ..write('intentos: $intentos, ')
          ..write('ultimoError: $ultimoError, ')
          ..write('fechaCreacion: $fechaCreacion, ')
          ..write('fechaUltimoIntento: $fechaUltimoIntento')
          ..write(')'))
        .toString();
  }
}

abstract class _$AppDatabase extends GeneratedDatabase {
  _$AppDatabase(QueryExecutor e) : super(e);
  $AppDatabaseManager get managers => $AppDatabaseManager(this);
  late final $EstadosOrdenTable estadosOrden = $EstadosOrdenTable(this);
  late final $TiposServicioTable tiposServicio = $TiposServicioTable(this);
  late final $ParametrosCatalogoTable parametrosCatalogo =
      $ParametrosCatalogoTable(this);
  late final $ActividadesCatalogoTable actividadesCatalogo =
      $ActividadesCatalogoTable(this);
  late final $ClientesTable clientes = $ClientesTable(this);
  late final $EquiposTable equipos = $EquiposTable(this);
  late final $OrdenesEquiposTable ordenesEquipos = $OrdenesEquiposTable(this);
  late final $OrdenesTable ordenes = $OrdenesTable(this);
  late final $ActividadesPlanTable actividadesPlan = $ActividadesPlanTable(
    this,
  );
  late final $ActividadesEjecutadasTable actividadesEjecutadas =
      $ActividadesEjecutadasTable(this);
  late final $MedicionesTable mediciones = $MedicionesTable(this);
  late final $EvidenciasTable evidencias = $EvidenciasTable(this);
  late final $FirmasTable firmas = $FirmasTable(this);
  late final $SyncStatusEntriesTable syncStatusEntries =
      $SyncStatusEntriesTable(this);
  late final $OrdenesPendientesSyncTable ordenesPendientesSync =
      $OrdenesPendientesSyncTable(this);
  @override
  Iterable<TableInfo<Table, Object?>> get allTables =>
      allSchemaEntities.whereType<TableInfo<Table, Object?>>();
  @override
  List<DatabaseSchemaEntity> get allSchemaEntities => [
    estadosOrden,
    tiposServicio,
    parametrosCatalogo,
    actividadesCatalogo,
    clientes,
    equipos,
    ordenesEquipos,
    ordenes,
    actividadesPlan,
    actividadesEjecutadas,
    mediciones,
    evidencias,
    firmas,
    syncStatusEntries,
    ordenesPendientesSync,
  ];
}

typedef $$EstadosOrdenTableCreateCompanionBuilder =
    EstadosOrdenCompanion Function({
      Value<int> id,
      required String codigo,
      required String nombre,
      Value<bool> esEstadoFinal,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$EstadosOrdenTableUpdateCompanionBuilder =
    EstadosOrdenCompanion Function({
      Value<int> id,
      Value<String> codigo,
      Value<String> nombre,
      Value<bool> esEstadoFinal,
      Value<DateTime?> lastSyncedAt,
    });

final class $$EstadosOrdenTableReferences
    extends
        BaseReferences<_$AppDatabase, $EstadosOrdenTable, EstadosOrdenData> {
  $$EstadosOrdenTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$OrdenesTable, List<Ordene>> _ordenesRefsTable(
    _$AppDatabase db,
  ) => MultiTypedResultKey.fromTable(
    db.ordenes,
    aliasName: $_aliasNameGenerator(db.estadosOrden.id, db.ordenes.idEstado),
  );

  $$OrdenesTableProcessedTableManager get ordenesRefs {
    final manager = $$OrdenesTableTableManager(
      $_db,
      $_db.ordenes,
    ).filter((f) => f.idEstado.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_ordenesRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$EstadosOrdenTableFilterComposer
    extends Composer<_$AppDatabase, $EstadosOrdenTable> {
  $$EstadosOrdenTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nombre => $composableBuilder(
    column: $table.nombre,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get esEstadoFinal => $composableBuilder(
    column: $table.esEstadoFinal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> ordenesRefs(
    Expression<bool> Function($$OrdenesTableFilterComposer f) f,
  ) {
    final $$OrdenesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idEstado,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableFilterComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$EstadosOrdenTableOrderingComposer
    extends Composer<_$AppDatabase, $EstadosOrdenTable> {
  $$EstadosOrdenTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nombre => $composableBuilder(
    column: $table.nombre,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get esEstadoFinal => $composableBuilder(
    column: $table.esEstadoFinal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$EstadosOrdenTableAnnotationComposer
    extends Composer<_$AppDatabase, $EstadosOrdenTable> {
  $$EstadosOrdenTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get codigo =>
      $composableBuilder(column: $table.codigo, builder: (column) => column);

  GeneratedColumn<String> get nombre =>
      $composableBuilder(column: $table.nombre, builder: (column) => column);

  GeneratedColumn<bool> get esEstadoFinal => $composableBuilder(
    column: $table.esEstadoFinal,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  Expression<T> ordenesRefs<T extends Object>(
    Expression<T> Function($$OrdenesTableAnnotationComposer a) f,
  ) {
    final $$OrdenesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idEstado,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$EstadosOrdenTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $EstadosOrdenTable,
          EstadosOrdenData,
          $$EstadosOrdenTableFilterComposer,
          $$EstadosOrdenTableOrderingComposer,
          $$EstadosOrdenTableAnnotationComposer,
          $$EstadosOrdenTableCreateCompanionBuilder,
          $$EstadosOrdenTableUpdateCompanionBuilder,
          (EstadosOrdenData, $$EstadosOrdenTableReferences),
          EstadosOrdenData,
          PrefetchHooks Function({bool ordenesRefs})
        > {
  $$EstadosOrdenTableTableManager(_$AppDatabase db, $EstadosOrdenTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$EstadosOrdenTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$EstadosOrdenTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$EstadosOrdenTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> codigo = const Value.absent(),
                Value<String> nombre = const Value.absent(),
                Value<bool> esEstadoFinal = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => EstadosOrdenCompanion(
                id: id,
                codigo: codigo,
                nombre: nombre,
                esEstadoFinal: esEstadoFinal,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String codigo,
                required String nombre,
                Value<bool> esEstadoFinal = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => EstadosOrdenCompanion.insert(
                id: id,
                codigo: codigo,
                nombre: nombre,
                esEstadoFinal: esEstadoFinal,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$EstadosOrdenTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({ordenesRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (ordenesRefs) db.ordenes],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (ordenesRefs)
                    await $_getPrefetchedData<
                      EstadosOrdenData,
                      $EstadosOrdenTable,
                      Ordene
                    >(
                      currentTable: table,
                      referencedTable: $$EstadosOrdenTableReferences
                          ._ordenesRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$EstadosOrdenTableReferences(
                            db,
                            table,
                            p0,
                          ).ordenesRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where((e) => e.idEstado == item.id),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$EstadosOrdenTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $EstadosOrdenTable,
      EstadosOrdenData,
      $$EstadosOrdenTableFilterComposer,
      $$EstadosOrdenTableOrderingComposer,
      $$EstadosOrdenTableAnnotationComposer,
      $$EstadosOrdenTableCreateCompanionBuilder,
      $$EstadosOrdenTableUpdateCompanionBuilder,
      (EstadosOrdenData, $$EstadosOrdenTableReferences),
      EstadosOrdenData,
      PrefetchHooks Function({bool ordenesRefs})
    >;
typedef $$TiposServicioTableCreateCompanionBuilder =
    TiposServicioCompanion Function({
      Value<int> id,
      required String codigo,
      required String nombre,
      Value<String?> descripcion,
      Value<bool> activo,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$TiposServicioTableUpdateCompanionBuilder =
    TiposServicioCompanion Function({
      Value<int> id,
      Value<String> codigo,
      Value<String> nombre,
      Value<String?> descripcion,
      Value<bool> activo,
      Value<DateTime?> lastSyncedAt,
    });

final class $$TiposServicioTableReferences
    extends
        BaseReferences<_$AppDatabase, $TiposServicioTable, TiposServicioData> {
  $$TiposServicioTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static MultiTypedResultKey<
    $ActividadesCatalogoTable,
    List<ActividadesCatalogoData>
  >
  _actividadesCatalogoRefsTable(_$AppDatabase db) =>
      MultiTypedResultKey.fromTable(
        db.actividadesCatalogo,
        aliasName: $_aliasNameGenerator(
          db.tiposServicio.id,
          db.actividadesCatalogo.idTipoServicio,
        ),
      );

  $$ActividadesCatalogoTableProcessedTableManager get actividadesCatalogoRefs {
    final manager = $$ActividadesCatalogoTableTableManager(
      $_db,
      $_db.actividadesCatalogo,
    ).filter((f) => f.idTipoServicio.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(
      _actividadesCatalogoRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$OrdenesTable, List<Ordene>> _ordenesRefsTable(
    _$AppDatabase db,
  ) => MultiTypedResultKey.fromTable(
    db.ordenes,
    aliasName: $_aliasNameGenerator(
      db.tiposServicio.id,
      db.ordenes.idTipoServicio,
    ),
  );

  $$OrdenesTableProcessedTableManager get ordenesRefs {
    final manager = $$OrdenesTableTableManager(
      $_db,
      $_db.ordenes,
    ).filter((f) => f.idTipoServicio.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_ordenesRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$TiposServicioTableFilterComposer
    extends Composer<_$AppDatabase, $TiposServicioTable> {
  $$TiposServicioTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nombre => $composableBuilder(
    column: $table.nombre,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get activo => $composableBuilder(
    column: $table.activo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> actividadesCatalogoRefs(
    Expression<bool> Function($$ActividadesCatalogoTableFilterComposer f) f,
  ) {
    final $$ActividadesCatalogoTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.actividadesCatalogo,
      getReferencedColumn: (t) => t.idTipoServicio,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ActividadesCatalogoTableFilterComposer(
            $db: $db,
            $table: $db.actividadesCatalogo,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> ordenesRefs(
    Expression<bool> Function($$OrdenesTableFilterComposer f) f,
  ) {
    final $$OrdenesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idTipoServicio,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableFilterComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$TiposServicioTableOrderingComposer
    extends Composer<_$AppDatabase, $TiposServicioTable> {
  $$TiposServicioTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nombre => $composableBuilder(
    column: $table.nombre,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get activo => $composableBuilder(
    column: $table.activo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$TiposServicioTableAnnotationComposer
    extends Composer<_$AppDatabase, $TiposServicioTable> {
  $$TiposServicioTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get codigo =>
      $composableBuilder(column: $table.codigo, builder: (column) => column);

  GeneratedColumn<String> get nombre =>
      $composableBuilder(column: $table.nombre, builder: (column) => column);

  GeneratedColumn<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get activo =>
      $composableBuilder(column: $table.activo, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  Expression<T> actividadesCatalogoRefs<T extends Object>(
    Expression<T> Function($$ActividadesCatalogoTableAnnotationComposer a) f,
  ) {
    final $$ActividadesCatalogoTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.id,
          referencedTable: $db.actividadesCatalogo,
          getReferencedColumn: (t) => t.idTipoServicio,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesCatalogoTableAnnotationComposer(
                $db: $db,
                $table: $db.actividadesCatalogo,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }

  Expression<T> ordenesRefs<T extends Object>(
    Expression<T> Function($$OrdenesTableAnnotationComposer a) f,
  ) {
    final $$OrdenesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idTipoServicio,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$TiposServicioTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $TiposServicioTable,
          TiposServicioData,
          $$TiposServicioTableFilterComposer,
          $$TiposServicioTableOrderingComposer,
          $$TiposServicioTableAnnotationComposer,
          $$TiposServicioTableCreateCompanionBuilder,
          $$TiposServicioTableUpdateCompanionBuilder,
          (TiposServicioData, $$TiposServicioTableReferences),
          TiposServicioData,
          PrefetchHooks Function({
            bool actividadesCatalogoRefs,
            bool ordenesRefs,
          })
        > {
  $$TiposServicioTableTableManager(_$AppDatabase db, $TiposServicioTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$TiposServicioTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$TiposServicioTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$TiposServicioTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> codigo = const Value.absent(),
                Value<String> nombre = const Value.absent(),
                Value<String?> descripcion = const Value.absent(),
                Value<bool> activo = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => TiposServicioCompanion(
                id: id,
                codigo: codigo,
                nombre: nombre,
                descripcion: descripcion,
                activo: activo,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String codigo,
                required String nombre,
                Value<String?> descripcion = const Value.absent(),
                Value<bool> activo = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => TiposServicioCompanion.insert(
                id: id,
                codigo: codigo,
                nombre: nombre,
                descripcion: descripcion,
                activo: activo,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$TiposServicioTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback:
              ({actividadesCatalogoRefs = false, ordenesRefs = false}) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [
                    if (actividadesCatalogoRefs) db.actividadesCatalogo,
                    if (ordenesRefs) db.ordenes,
                  ],
                  addJoins: null,
                  getPrefetchedDataCallback: (items) async {
                    return [
                      if (actividadesCatalogoRefs)
                        await $_getPrefetchedData<
                          TiposServicioData,
                          $TiposServicioTable,
                          ActividadesCatalogoData
                        >(
                          currentTable: table,
                          referencedTable: $$TiposServicioTableReferences
                              ._actividadesCatalogoRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$TiposServicioTableReferences(
                                db,
                                table,
                                p0,
                              ).actividadesCatalogoRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idTipoServicio == item.id,
                              ),
                          typedResults: items,
                        ),
                      if (ordenesRefs)
                        await $_getPrefetchedData<
                          TiposServicioData,
                          $TiposServicioTable,
                          Ordene
                        >(
                          currentTable: table,
                          referencedTable: $$TiposServicioTableReferences
                              ._ordenesRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$TiposServicioTableReferences(
                                db,
                                table,
                                p0,
                              ).ordenesRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idTipoServicio == item.id,
                              ),
                          typedResults: items,
                        ),
                    ];
                  },
                );
              },
        ),
      );
}

typedef $$TiposServicioTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $TiposServicioTable,
      TiposServicioData,
      $$TiposServicioTableFilterComposer,
      $$TiposServicioTableOrderingComposer,
      $$TiposServicioTableAnnotationComposer,
      $$TiposServicioTableCreateCompanionBuilder,
      $$TiposServicioTableUpdateCompanionBuilder,
      (TiposServicioData, $$TiposServicioTableReferences),
      TiposServicioData,
      PrefetchHooks Function({bool actividadesCatalogoRefs, bool ordenesRefs})
    >;
typedef $$ParametrosCatalogoTableCreateCompanionBuilder =
    ParametrosCatalogoCompanion Function({
      Value<int> id,
      required String codigo,
      required String nombre,
      Value<String?> unidad,
      Value<double?> valorMinimoNormal,
      Value<double?> valorMaximoNormal,
      Value<double?> valorMinimoAdvertencia,
      Value<double?> valorMaximoAdvertencia,
      Value<double?> valorMinimoCritico,
      Value<double?> valorMaximoCritico,
      Value<String?> tipoEquipoAplica,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$ParametrosCatalogoTableUpdateCompanionBuilder =
    ParametrosCatalogoCompanion Function({
      Value<int> id,
      Value<String> codigo,
      Value<String> nombre,
      Value<String?> unidad,
      Value<double?> valorMinimoNormal,
      Value<double?> valorMaximoNormal,
      Value<double?> valorMinimoAdvertencia,
      Value<double?> valorMaximoAdvertencia,
      Value<double?> valorMinimoCritico,
      Value<double?> valorMaximoCritico,
      Value<String?> tipoEquipoAplica,
      Value<DateTime?> lastSyncedAt,
    });

final class $$ParametrosCatalogoTableReferences
    extends
        BaseReferences<
          _$AppDatabase,
          $ParametrosCatalogoTable,
          ParametrosCatalogoData
        > {
  $$ParametrosCatalogoTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static MultiTypedResultKey<
    $ActividadesCatalogoTable,
    List<ActividadesCatalogoData>
  >
  _actividadesCatalogoRefsTable(_$AppDatabase db) =>
      MultiTypedResultKey.fromTable(
        db.actividadesCatalogo,
        aliasName: $_aliasNameGenerator(
          db.parametrosCatalogo.id,
          db.actividadesCatalogo.idParametroMedicion,
        ),
      );

  $$ActividadesCatalogoTableProcessedTableManager get actividadesCatalogoRefs {
    final manager =
        $$ActividadesCatalogoTableTableManager(
          $_db,
          $_db.actividadesCatalogo,
        ).filter(
          (f) => f.idParametroMedicion.id.sqlEquals($_itemColumn<int>('id')!),
        );

    final cache = $_typedResult.readTableOrNull(
      _actividadesCatalogoRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$MedicionesTable, List<Medicione>>
  _medicionesRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.mediciones,
    aliasName: $_aliasNameGenerator(
      db.parametrosCatalogo.id,
      db.mediciones.idParametro,
    ),
  );

  $$MedicionesTableProcessedTableManager get medicionesRefs {
    final manager = $$MedicionesTableTableManager(
      $_db,
      $_db.mediciones,
    ).filter((f) => f.idParametro.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_medicionesRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$ParametrosCatalogoTableFilterComposer
    extends Composer<_$AppDatabase, $ParametrosCatalogoTable> {
  $$ParametrosCatalogoTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nombre => $composableBuilder(
    column: $table.nombre,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get unidad => $composableBuilder(
    column: $table.unidad,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get valorMinimoNormal => $composableBuilder(
    column: $table.valorMinimoNormal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get valorMaximoNormal => $composableBuilder(
    column: $table.valorMaximoNormal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get valorMinimoAdvertencia => $composableBuilder(
    column: $table.valorMinimoAdvertencia,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get valorMaximoAdvertencia => $composableBuilder(
    column: $table.valorMaximoAdvertencia,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get valorMinimoCritico => $composableBuilder(
    column: $table.valorMinimoCritico,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get valorMaximoCritico => $composableBuilder(
    column: $table.valorMaximoCritico,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tipoEquipoAplica => $composableBuilder(
    column: $table.tipoEquipoAplica,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> actividadesCatalogoRefs(
    Expression<bool> Function($$ActividadesCatalogoTableFilterComposer f) f,
  ) {
    final $$ActividadesCatalogoTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.actividadesCatalogo,
      getReferencedColumn: (t) => t.idParametroMedicion,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ActividadesCatalogoTableFilterComposer(
            $db: $db,
            $table: $db.actividadesCatalogo,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> medicionesRefs(
    Expression<bool> Function($$MedicionesTableFilterComposer f) f,
  ) {
    final $$MedicionesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.mediciones,
      getReferencedColumn: (t) => t.idParametro,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$MedicionesTableFilterComposer(
            $db: $db,
            $table: $db.mediciones,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$ParametrosCatalogoTableOrderingComposer
    extends Composer<_$AppDatabase, $ParametrosCatalogoTable> {
  $$ParametrosCatalogoTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nombre => $composableBuilder(
    column: $table.nombre,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get unidad => $composableBuilder(
    column: $table.unidad,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get valorMinimoNormal => $composableBuilder(
    column: $table.valorMinimoNormal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get valorMaximoNormal => $composableBuilder(
    column: $table.valorMaximoNormal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get valorMinimoAdvertencia => $composableBuilder(
    column: $table.valorMinimoAdvertencia,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get valorMaximoAdvertencia => $composableBuilder(
    column: $table.valorMaximoAdvertencia,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get valorMinimoCritico => $composableBuilder(
    column: $table.valorMinimoCritico,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get valorMaximoCritico => $composableBuilder(
    column: $table.valorMaximoCritico,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tipoEquipoAplica => $composableBuilder(
    column: $table.tipoEquipoAplica,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ParametrosCatalogoTableAnnotationComposer
    extends Composer<_$AppDatabase, $ParametrosCatalogoTable> {
  $$ParametrosCatalogoTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get codigo =>
      $composableBuilder(column: $table.codigo, builder: (column) => column);

  GeneratedColumn<String> get nombre =>
      $composableBuilder(column: $table.nombre, builder: (column) => column);

  GeneratedColumn<String> get unidad =>
      $composableBuilder(column: $table.unidad, builder: (column) => column);

  GeneratedColumn<double> get valorMinimoNormal => $composableBuilder(
    column: $table.valorMinimoNormal,
    builder: (column) => column,
  );

  GeneratedColumn<double> get valorMaximoNormal => $composableBuilder(
    column: $table.valorMaximoNormal,
    builder: (column) => column,
  );

  GeneratedColumn<double> get valorMinimoAdvertencia => $composableBuilder(
    column: $table.valorMinimoAdvertencia,
    builder: (column) => column,
  );

  GeneratedColumn<double> get valorMaximoAdvertencia => $composableBuilder(
    column: $table.valorMaximoAdvertencia,
    builder: (column) => column,
  );

  GeneratedColumn<double> get valorMinimoCritico => $composableBuilder(
    column: $table.valorMinimoCritico,
    builder: (column) => column,
  );

  GeneratedColumn<double> get valorMaximoCritico => $composableBuilder(
    column: $table.valorMaximoCritico,
    builder: (column) => column,
  );

  GeneratedColumn<String> get tipoEquipoAplica => $composableBuilder(
    column: $table.tipoEquipoAplica,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  Expression<T> actividadesCatalogoRefs<T extends Object>(
    Expression<T> Function($$ActividadesCatalogoTableAnnotationComposer a) f,
  ) {
    final $$ActividadesCatalogoTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.id,
          referencedTable: $db.actividadesCatalogo,
          getReferencedColumn: (t) => t.idParametroMedicion,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesCatalogoTableAnnotationComposer(
                $db: $db,
                $table: $db.actividadesCatalogo,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }

  Expression<T> medicionesRefs<T extends Object>(
    Expression<T> Function($$MedicionesTableAnnotationComposer a) f,
  ) {
    final $$MedicionesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.mediciones,
      getReferencedColumn: (t) => t.idParametro,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$MedicionesTableAnnotationComposer(
            $db: $db,
            $table: $db.mediciones,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$ParametrosCatalogoTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ParametrosCatalogoTable,
          ParametrosCatalogoData,
          $$ParametrosCatalogoTableFilterComposer,
          $$ParametrosCatalogoTableOrderingComposer,
          $$ParametrosCatalogoTableAnnotationComposer,
          $$ParametrosCatalogoTableCreateCompanionBuilder,
          $$ParametrosCatalogoTableUpdateCompanionBuilder,
          (ParametrosCatalogoData, $$ParametrosCatalogoTableReferences),
          ParametrosCatalogoData,
          PrefetchHooks Function({
            bool actividadesCatalogoRefs,
            bool medicionesRefs,
          })
        > {
  $$ParametrosCatalogoTableTableManager(
    _$AppDatabase db,
    $ParametrosCatalogoTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ParametrosCatalogoTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ParametrosCatalogoTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ParametrosCatalogoTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> codigo = const Value.absent(),
                Value<String> nombre = const Value.absent(),
                Value<String?> unidad = const Value.absent(),
                Value<double?> valorMinimoNormal = const Value.absent(),
                Value<double?> valorMaximoNormal = const Value.absent(),
                Value<double?> valorMinimoAdvertencia = const Value.absent(),
                Value<double?> valorMaximoAdvertencia = const Value.absent(),
                Value<double?> valorMinimoCritico = const Value.absent(),
                Value<double?> valorMaximoCritico = const Value.absent(),
                Value<String?> tipoEquipoAplica = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => ParametrosCatalogoCompanion(
                id: id,
                codigo: codigo,
                nombre: nombre,
                unidad: unidad,
                valorMinimoNormal: valorMinimoNormal,
                valorMaximoNormal: valorMaximoNormal,
                valorMinimoAdvertencia: valorMinimoAdvertencia,
                valorMaximoAdvertencia: valorMaximoAdvertencia,
                valorMinimoCritico: valorMinimoCritico,
                valorMaximoCritico: valorMaximoCritico,
                tipoEquipoAplica: tipoEquipoAplica,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String codigo,
                required String nombre,
                Value<String?> unidad = const Value.absent(),
                Value<double?> valorMinimoNormal = const Value.absent(),
                Value<double?> valorMaximoNormal = const Value.absent(),
                Value<double?> valorMinimoAdvertencia = const Value.absent(),
                Value<double?> valorMaximoAdvertencia = const Value.absent(),
                Value<double?> valorMinimoCritico = const Value.absent(),
                Value<double?> valorMaximoCritico = const Value.absent(),
                Value<String?> tipoEquipoAplica = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => ParametrosCatalogoCompanion.insert(
                id: id,
                codigo: codigo,
                nombre: nombre,
                unidad: unidad,
                valorMinimoNormal: valorMinimoNormal,
                valorMaximoNormal: valorMaximoNormal,
                valorMinimoAdvertencia: valorMinimoAdvertencia,
                valorMaximoAdvertencia: valorMaximoAdvertencia,
                valorMinimoCritico: valorMinimoCritico,
                valorMaximoCritico: valorMaximoCritico,
                tipoEquipoAplica: tipoEquipoAplica,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$ParametrosCatalogoTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback:
              ({actividadesCatalogoRefs = false, medicionesRefs = false}) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [
                    if (actividadesCatalogoRefs) db.actividadesCatalogo,
                    if (medicionesRefs) db.mediciones,
                  ],
                  addJoins: null,
                  getPrefetchedDataCallback: (items) async {
                    return [
                      if (actividadesCatalogoRefs)
                        await $_getPrefetchedData<
                          ParametrosCatalogoData,
                          $ParametrosCatalogoTable,
                          ActividadesCatalogoData
                        >(
                          currentTable: table,
                          referencedTable: $$ParametrosCatalogoTableReferences
                              ._actividadesCatalogoRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$ParametrosCatalogoTableReferences(
                                db,
                                table,
                                p0,
                              ).actividadesCatalogoRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idParametroMedicion == item.id,
                              ),
                          typedResults: items,
                        ),
                      if (medicionesRefs)
                        await $_getPrefetchedData<
                          ParametrosCatalogoData,
                          $ParametrosCatalogoTable,
                          Medicione
                        >(
                          currentTable: table,
                          referencedTable: $$ParametrosCatalogoTableReferences
                              ._medicionesRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$ParametrosCatalogoTableReferences(
                                db,
                                table,
                                p0,
                              ).medicionesRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idParametro == item.id,
                              ),
                          typedResults: items,
                        ),
                    ];
                  },
                );
              },
        ),
      );
}

typedef $$ParametrosCatalogoTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ParametrosCatalogoTable,
      ParametrosCatalogoData,
      $$ParametrosCatalogoTableFilterComposer,
      $$ParametrosCatalogoTableOrderingComposer,
      $$ParametrosCatalogoTableAnnotationComposer,
      $$ParametrosCatalogoTableCreateCompanionBuilder,
      $$ParametrosCatalogoTableUpdateCompanionBuilder,
      (ParametrosCatalogoData, $$ParametrosCatalogoTableReferences),
      ParametrosCatalogoData,
      PrefetchHooks Function({
        bool actividadesCatalogoRefs,
        bool medicionesRefs,
      })
    >;
typedef $$ActividadesCatalogoTableCreateCompanionBuilder =
    ActividadesCatalogoCompanion Function({
      Value<int> id,
      required String codigo,
      required String descripcion,
      required String tipoActividad,
      Value<int> ordenEjecucion,
      Value<bool> esObligatoria,
      Value<int?> tiempoEstimadoMinutos,
      Value<String?> instrucciones,
      Value<String?> precauciones,
      Value<int?> idParametroMedicion,
      Value<String?> sistema,
      Value<int?> idTipoServicio,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$ActividadesCatalogoTableUpdateCompanionBuilder =
    ActividadesCatalogoCompanion Function({
      Value<int> id,
      Value<String> codigo,
      Value<String> descripcion,
      Value<String> tipoActividad,
      Value<int> ordenEjecucion,
      Value<bool> esObligatoria,
      Value<int?> tiempoEstimadoMinutos,
      Value<String?> instrucciones,
      Value<String?> precauciones,
      Value<int?> idParametroMedicion,
      Value<String?> sistema,
      Value<int?> idTipoServicio,
      Value<DateTime?> lastSyncedAt,
    });

final class $$ActividadesCatalogoTableReferences
    extends
        BaseReferences<
          _$AppDatabase,
          $ActividadesCatalogoTable,
          ActividadesCatalogoData
        > {
  $$ActividadesCatalogoTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $ParametrosCatalogoTable _idParametroMedicionTable(_$AppDatabase db) =>
      db.parametrosCatalogo.createAlias(
        $_aliasNameGenerator(
          db.actividadesCatalogo.idParametroMedicion,
          db.parametrosCatalogo.id,
        ),
      );

  $$ParametrosCatalogoTableProcessedTableManager? get idParametroMedicion {
    final $_column = $_itemColumn<int>('id_parametro_medicion');
    if ($_column == null) return null;
    final manager = $$ParametrosCatalogoTableTableManager(
      $_db,
      $_db.parametrosCatalogo,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idParametroMedicionTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $TiposServicioTable _idTipoServicioTable(_$AppDatabase db) =>
      db.tiposServicio.createAlias(
        $_aliasNameGenerator(
          db.actividadesCatalogo.idTipoServicio,
          db.tiposServicio.id,
        ),
      );

  $$TiposServicioTableProcessedTableManager? get idTipoServicio {
    final $_column = $_itemColumn<int>('id_tipo_servicio');
    if ($_column == null) return null;
    final manager = $$TiposServicioTableTableManager(
      $_db,
      $_db.tiposServicio,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idTipoServicioTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static MultiTypedResultKey<$ActividadesPlanTable, List<ActividadesPlanData>>
  _actividadesPlanRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.actividadesPlan,
    aliasName: $_aliasNameGenerator(
      db.actividadesCatalogo.id,
      db.actividadesPlan.idActividadCatalogo,
    ),
  );

  $$ActividadesPlanTableProcessedTableManager get actividadesPlanRefs {
    final manager =
        $$ActividadesPlanTableTableManager($_db, $_db.actividadesPlan).filter(
          (f) => f.idActividadCatalogo.id.sqlEquals($_itemColumn<int>('id')!),
        );

    final cache = $_typedResult.readTableOrNull(
      _actividadesPlanRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<
    $ActividadesEjecutadasTable,
    List<ActividadesEjecutada>
  >
  _actividadesEjecutadasRefsTable(_$AppDatabase db) =>
      MultiTypedResultKey.fromTable(
        db.actividadesEjecutadas,
        aliasName: $_aliasNameGenerator(
          db.actividadesCatalogo.id,
          db.actividadesEjecutadas.idActividadCatalogo,
        ),
      );

  $$ActividadesEjecutadasTableProcessedTableManager
  get actividadesEjecutadasRefs {
    final manager =
        $$ActividadesEjecutadasTableTableManager(
          $_db,
          $_db.actividadesEjecutadas,
        ).filter(
          (f) => f.idActividadCatalogo.id.sqlEquals($_itemColumn<int>('id')!),
        );

    final cache = $_typedResult.readTableOrNull(
      _actividadesEjecutadasRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$ActividadesCatalogoTableFilterComposer
    extends Composer<_$AppDatabase, $ActividadesCatalogoTable> {
  $$ActividadesCatalogoTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tipoActividad => $composableBuilder(
    column: $table.tipoActividad,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get ordenEjecucion => $composableBuilder(
    column: $table.ordenEjecucion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get esObligatoria => $composableBuilder(
    column: $table.esObligatoria,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get tiempoEstimadoMinutos => $composableBuilder(
    column: $table.tiempoEstimadoMinutos,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get instrucciones => $composableBuilder(
    column: $table.instrucciones,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get precauciones => $composableBuilder(
    column: $table.precauciones,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get sistema => $composableBuilder(
    column: $table.sistema,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  $$ParametrosCatalogoTableFilterComposer get idParametroMedicion {
    final $$ParametrosCatalogoTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idParametroMedicion,
      referencedTable: $db.parametrosCatalogo,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ParametrosCatalogoTableFilterComposer(
            $db: $db,
            $table: $db.parametrosCatalogo,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$TiposServicioTableFilterComposer get idTipoServicio {
    final $$TiposServicioTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idTipoServicio,
      referencedTable: $db.tiposServicio,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$TiposServicioTableFilterComposer(
            $db: $db,
            $table: $db.tiposServicio,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  Expression<bool> actividadesPlanRefs(
    Expression<bool> Function($$ActividadesPlanTableFilterComposer f) f,
  ) {
    final $$ActividadesPlanTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.actividadesPlan,
      getReferencedColumn: (t) => t.idActividadCatalogo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ActividadesPlanTableFilterComposer(
            $db: $db,
            $table: $db.actividadesPlan,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> actividadesEjecutadasRefs(
    Expression<bool> Function($$ActividadesEjecutadasTableFilterComposer f) f,
  ) {
    final $$ActividadesEjecutadasTableFilterComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.id,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idActividadCatalogo,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableFilterComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }
}

class $$ActividadesCatalogoTableOrderingComposer
    extends Composer<_$AppDatabase, $ActividadesCatalogoTable> {
  $$ActividadesCatalogoTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tipoActividad => $composableBuilder(
    column: $table.tipoActividad,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get ordenEjecucion => $composableBuilder(
    column: $table.ordenEjecucion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get esObligatoria => $composableBuilder(
    column: $table.esObligatoria,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get tiempoEstimadoMinutos => $composableBuilder(
    column: $table.tiempoEstimadoMinutos,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get instrucciones => $composableBuilder(
    column: $table.instrucciones,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get precauciones => $composableBuilder(
    column: $table.precauciones,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get sistema => $composableBuilder(
    column: $table.sistema,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );

  $$ParametrosCatalogoTableOrderingComposer get idParametroMedicion {
    final $$ParametrosCatalogoTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idParametroMedicion,
      referencedTable: $db.parametrosCatalogo,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ParametrosCatalogoTableOrderingComposer(
            $db: $db,
            $table: $db.parametrosCatalogo,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$TiposServicioTableOrderingComposer get idTipoServicio {
    final $$TiposServicioTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idTipoServicio,
      referencedTable: $db.tiposServicio,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$TiposServicioTableOrderingComposer(
            $db: $db,
            $table: $db.tiposServicio,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$ActividadesCatalogoTableAnnotationComposer
    extends Composer<_$AppDatabase, $ActividadesCatalogoTable> {
  $$ActividadesCatalogoTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get codigo =>
      $composableBuilder(column: $table.codigo, builder: (column) => column);

  GeneratedColumn<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => column,
  );

  GeneratedColumn<String> get tipoActividad => $composableBuilder(
    column: $table.tipoActividad,
    builder: (column) => column,
  );

  GeneratedColumn<int> get ordenEjecucion => $composableBuilder(
    column: $table.ordenEjecucion,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get esObligatoria => $composableBuilder(
    column: $table.esObligatoria,
    builder: (column) => column,
  );

  GeneratedColumn<int> get tiempoEstimadoMinutos => $composableBuilder(
    column: $table.tiempoEstimadoMinutos,
    builder: (column) => column,
  );

  GeneratedColumn<String> get instrucciones => $composableBuilder(
    column: $table.instrucciones,
    builder: (column) => column,
  );

  GeneratedColumn<String> get precauciones => $composableBuilder(
    column: $table.precauciones,
    builder: (column) => column,
  );

  GeneratedColumn<String> get sistema =>
      $composableBuilder(column: $table.sistema, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  $$ParametrosCatalogoTableAnnotationComposer get idParametroMedicion {
    final $$ParametrosCatalogoTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idParametroMedicion,
          referencedTable: $db.parametrosCatalogo,
          getReferencedColumn: (t) => t.id,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ParametrosCatalogoTableAnnotationComposer(
                $db: $db,
                $table: $db.parametrosCatalogo,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }

  $$TiposServicioTableAnnotationComposer get idTipoServicio {
    final $$TiposServicioTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idTipoServicio,
      referencedTable: $db.tiposServicio,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$TiposServicioTableAnnotationComposer(
            $db: $db,
            $table: $db.tiposServicio,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  Expression<T> actividadesPlanRefs<T extends Object>(
    Expression<T> Function($$ActividadesPlanTableAnnotationComposer a) f,
  ) {
    final $$ActividadesPlanTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.actividadesPlan,
      getReferencedColumn: (t) => t.idActividadCatalogo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ActividadesPlanTableAnnotationComposer(
            $db: $db,
            $table: $db.actividadesPlan,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<T> actividadesEjecutadasRefs<T extends Object>(
    Expression<T> Function($$ActividadesEjecutadasTableAnnotationComposer a) f,
  ) {
    final $$ActividadesEjecutadasTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.id,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idActividadCatalogo,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableAnnotationComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }
}

class $$ActividadesCatalogoTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ActividadesCatalogoTable,
          ActividadesCatalogoData,
          $$ActividadesCatalogoTableFilterComposer,
          $$ActividadesCatalogoTableOrderingComposer,
          $$ActividadesCatalogoTableAnnotationComposer,
          $$ActividadesCatalogoTableCreateCompanionBuilder,
          $$ActividadesCatalogoTableUpdateCompanionBuilder,
          (ActividadesCatalogoData, $$ActividadesCatalogoTableReferences),
          ActividadesCatalogoData,
          PrefetchHooks Function({
            bool idParametroMedicion,
            bool idTipoServicio,
            bool actividadesPlanRefs,
            bool actividadesEjecutadasRefs,
          })
        > {
  $$ActividadesCatalogoTableTableManager(
    _$AppDatabase db,
    $ActividadesCatalogoTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ActividadesCatalogoTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ActividadesCatalogoTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer: () =>
              $$ActividadesCatalogoTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> codigo = const Value.absent(),
                Value<String> descripcion = const Value.absent(),
                Value<String> tipoActividad = const Value.absent(),
                Value<int> ordenEjecucion = const Value.absent(),
                Value<bool> esObligatoria = const Value.absent(),
                Value<int?> tiempoEstimadoMinutos = const Value.absent(),
                Value<String?> instrucciones = const Value.absent(),
                Value<String?> precauciones = const Value.absent(),
                Value<int?> idParametroMedicion = const Value.absent(),
                Value<String?> sistema = const Value.absent(),
                Value<int?> idTipoServicio = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => ActividadesCatalogoCompanion(
                id: id,
                codigo: codigo,
                descripcion: descripcion,
                tipoActividad: tipoActividad,
                ordenEjecucion: ordenEjecucion,
                esObligatoria: esObligatoria,
                tiempoEstimadoMinutos: tiempoEstimadoMinutos,
                instrucciones: instrucciones,
                precauciones: precauciones,
                idParametroMedicion: idParametroMedicion,
                sistema: sistema,
                idTipoServicio: idTipoServicio,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String codigo,
                required String descripcion,
                required String tipoActividad,
                Value<int> ordenEjecucion = const Value.absent(),
                Value<bool> esObligatoria = const Value.absent(),
                Value<int?> tiempoEstimadoMinutos = const Value.absent(),
                Value<String?> instrucciones = const Value.absent(),
                Value<String?> precauciones = const Value.absent(),
                Value<int?> idParametroMedicion = const Value.absent(),
                Value<String?> sistema = const Value.absent(),
                Value<int?> idTipoServicio = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => ActividadesCatalogoCompanion.insert(
                id: id,
                codigo: codigo,
                descripcion: descripcion,
                tipoActividad: tipoActividad,
                ordenEjecucion: ordenEjecucion,
                esObligatoria: esObligatoria,
                tiempoEstimadoMinutos: tiempoEstimadoMinutos,
                instrucciones: instrucciones,
                precauciones: precauciones,
                idParametroMedicion: idParametroMedicion,
                sistema: sistema,
                idTipoServicio: idTipoServicio,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$ActividadesCatalogoTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback:
              ({
                idParametroMedicion = false,
                idTipoServicio = false,
                actividadesPlanRefs = false,
                actividadesEjecutadasRefs = false,
              }) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [
                    if (actividadesPlanRefs) db.actividadesPlan,
                    if (actividadesEjecutadasRefs) db.actividadesEjecutadas,
                  ],
                  addJoins:
                      <
                        T extends TableManagerState<
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic
                        >
                      >(state) {
                        if (idParametroMedicion) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idParametroMedicion,
                                    referencedTable:
                                        $$ActividadesCatalogoTableReferences
                                            ._idParametroMedicionTable(db),
                                    referencedColumn:
                                        $$ActividadesCatalogoTableReferences
                                            ._idParametroMedicionTable(db)
                                            .id,
                                  )
                                  as T;
                        }
                        if (idTipoServicio) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idTipoServicio,
                                    referencedTable:
                                        $$ActividadesCatalogoTableReferences
                                            ._idTipoServicioTable(db),
                                    referencedColumn:
                                        $$ActividadesCatalogoTableReferences
                                            ._idTipoServicioTable(db)
                                            .id,
                                  )
                                  as T;
                        }

                        return state;
                      },
                  getPrefetchedDataCallback: (items) async {
                    return [
                      if (actividadesPlanRefs)
                        await $_getPrefetchedData<
                          ActividadesCatalogoData,
                          $ActividadesCatalogoTable,
                          ActividadesPlanData
                        >(
                          currentTable: table,
                          referencedTable: $$ActividadesCatalogoTableReferences
                              ._actividadesPlanRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$ActividadesCatalogoTableReferences(
                                db,
                                table,
                                p0,
                              ).actividadesPlanRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idActividadCatalogo == item.id,
                              ),
                          typedResults: items,
                        ),
                      if (actividadesEjecutadasRefs)
                        await $_getPrefetchedData<
                          ActividadesCatalogoData,
                          $ActividadesCatalogoTable,
                          ActividadesEjecutada
                        >(
                          currentTable: table,
                          referencedTable: $$ActividadesCatalogoTableReferences
                              ._actividadesEjecutadasRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$ActividadesCatalogoTableReferences(
                                db,
                                table,
                                p0,
                              ).actividadesEjecutadasRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idActividadCatalogo == item.id,
                              ),
                          typedResults: items,
                        ),
                    ];
                  },
                );
              },
        ),
      );
}

typedef $$ActividadesCatalogoTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ActividadesCatalogoTable,
      ActividadesCatalogoData,
      $$ActividadesCatalogoTableFilterComposer,
      $$ActividadesCatalogoTableOrderingComposer,
      $$ActividadesCatalogoTableAnnotationComposer,
      $$ActividadesCatalogoTableCreateCompanionBuilder,
      $$ActividadesCatalogoTableUpdateCompanionBuilder,
      (ActividadesCatalogoData, $$ActividadesCatalogoTableReferences),
      ActividadesCatalogoData,
      PrefetchHooks Function({
        bool idParametroMedicion,
        bool idTipoServicio,
        bool actividadesPlanRefs,
        bool actividadesEjecutadasRefs,
      })
    >;
typedef $$ClientesTableCreateCompanionBuilder =
    ClientesCompanion Function({
      Value<int> id,
      required String nombre,
      Value<String?> direccion,
      Value<String?> telefono,
      Value<String?> email,
      Value<String?> nit,
      Value<bool> activo,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$ClientesTableUpdateCompanionBuilder =
    ClientesCompanion Function({
      Value<int> id,
      Value<String> nombre,
      Value<String?> direccion,
      Value<String?> telefono,
      Value<String?> email,
      Value<String?> nit,
      Value<bool> activo,
      Value<DateTime?> lastSyncedAt,
    });

final class $$ClientesTableReferences
    extends BaseReferences<_$AppDatabase, $ClientesTable, Cliente> {
  $$ClientesTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static MultiTypedResultKey<$EquiposTable, List<Equipo>> _equiposRefsTable(
    _$AppDatabase db,
  ) => MultiTypedResultKey.fromTable(
    db.equipos,
    aliasName: $_aliasNameGenerator(db.clientes.id, db.equipos.idCliente),
  );

  $$EquiposTableProcessedTableManager get equiposRefs {
    final manager = $$EquiposTableTableManager(
      $_db,
      $_db.equipos,
    ).filter((f) => f.idCliente.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_equiposRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$OrdenesTable, List<Ordene>> _ordenesRefsTable(
    _$AppDatabase db,
  ) => MultiTypedResultKey.fromTable(
    db.ordenes,
    aliasName: $_aliasNameGenerator(db.clientes.id, db.ordenes.idCliente),
  );

  $$OrdenesTableProcessedTableManager get ordenesRefs {
    final manager = $$OrdenesTableTableManager(
      $_db,
      $_db.ordenes,
    ).filter((f) => f.idCliente.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_ordenesRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$ClientesTableFilterComposer
    extends Composer<_$AppDatabase, $ClientesTable> {
  $$ClientesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nombre => $composableBuilder(
    column: $table.nombre,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get direccion => $composableBuilder(
    column: $table.direccion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get telefono => $composableBuilder(
    column: $table.telefono,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get email => $composableBuilder(
    column: $table.email,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nit => $composableBuilder(
    column: $table.nit,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get activo => $composableBuilder(
    column: $table.activo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> equiposRefs(
    Expression<bool> Function($$EquiposTableFilterComposer f) f,
  ) {
    final $$EquiposTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.equipos,
      getReferencedColumn: (t) => t.idCliente,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EquiposTableFilterComposer(
            $db: $db,
            $table: $db.equipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> ordenesRefs(
    Expression<bool> Function($$OrdenesTableFilterComposer f) f,
  ) {
    final $$OrdenesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idCliente,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableFilterComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$ClientesTableOrderingComposer
    extends Composer<_$AppDatabase, $ClientesTable> {
  $$ClientesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nombre => $composableBuilder(
    column: $table.nombre,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get direccion => $composableBuilder(
    column: $table.direccion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get telefono => $composableBuilder(
    column: $table.telefono,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get email => $composableBuilder(
    column: $table.email,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nit => $composableBuilder(
    column: $table.nit,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get activo => $composableBuilder(
    column: $table.activo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$ClientesTableAnnotationComposer
    extends Composer<_$AppDatabase, $ClientesTable> {
  $$ClientesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get nombre =>
      $composableBuilder(column: $table.nombre, builder: (column) => column);

  GeneratedColumn<String> get direccion =>
      $composableBuilder(column: $table.direccion, builder: (column) => column);

  GeneratedColumn<String> get telefono =>
      $composableBuilder(column: $table.telefono, builder: (column) => column);

  GeneratedColumn<String> get email =>
      $composableBuilder(column: $table.email, builder: (column) => column);

  GeneratedColumn<String> get nit =>
      $composableBuilder(column: $table.nit, builder: (column) => column);

  GeneratedColumn<bool> get activo =>
      $composableBuilder(column: $table.activo, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  Expression<T> equiposRefs<T extends Object>(
    Expression<T> Function($$EquiposTableAnnotationComposer a) f,
  ) {
    final $$EquiposTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.equipos,
      getReferencedColumn: (t) => t.idCliente,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EquiposTableAnnotationComposer(
            $db: $db,
            $table: $db.equipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<T> ordenesRefs<T extends Object>(
    Expression<T> Function($$OrdenesTableAnnotationComposer a) f,
  ) {
    final $$OrdenesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idCliente,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$ClientesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ClientesTable,
          Cliente,
          $$ClientesTableFilterComposer,
          $$ClientesTableOrderingComposer,
          $$ClientesTableAnnotationComposer,
          $$ClientesTableCreateCompanionBuilder,
          $$ClientesTableUpdateCompanionBuilder,
          (Cliente, $$ClientesTableReferences),
          Cliente,
          PrefetchHooks Function({bool equiposRefs, bool ordenesRefs})
        > {
  $$ClientesTableTableManager(_$AppDatabase db, $ClientesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ClientesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ClientesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ClientesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> nombre = const Value.absent(),
                Value<String?> direccion = const Value.absent(),
                Value<String?> telefono = const Value.absent(),
                Value<String?> email = const Value.absent(),
                Value<String?> nit = const Value.absent(),
                Value<bool> activo = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => ClientesCompanion(
                id: id,
                nombre: nombre,
                direccion: direccion,
                telefono: telefono,
                email: email,
                nit: nit,
                activo: activo,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String nombre,
                Value<String?> direccion = const Value.absent(),
                Value<String?> telefono = const Value.absent(),
                Value<String?> email = const Value.absent(),
                Value<String?> nit = const Value.absent(),
                Value<bool> activo = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => ClientesCompanion.insert(
                id: id,
                nombre: nombre,
                direccion: direccion,
                telefono: telefono,
                email: email,
                nit: nit,
                activo: activo,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$ClientesTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({equiposRefs = false, ordenesRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [
                if (equiposRefs) db.equipos,
                if (ordenesRefs) db.ordenes,
              ],
              addJoins: null,
              getPrefetchedDataCallback: (items) async {
                return [
                  if (equiposRefs)
                    await $_getPrefetchedData<Cliente, $ClientesTable, Equipo>(
                      currentTable: table,
                      referencedTable: $$ClientesTableReferences
                          ._equiposRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$ClientesTableReferences(db, table, p0).equiposRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where((e) => e.idCliente == item.id),
                      typedResults: items,
                    ),
                  if (ordenesRefs)
                    await $_getPrefetchedData<Cliente, $ClientesTable, Ordene>(
                      currentTable: table,
                      referencedTable: $$ClientesTableReferences
                          ._ordenesRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$ClientesTableReferences(db, table, p0).ordenesRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where((e) => e.idCliente == item.id),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$ClientesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ClientesTable,
      Cliente,
      $$ClientesTableFilterComposer,
      $$ClientesTableOrderingComposer,
      $$ClientesTableAnnotationComposer,
      $$ClientesTableCreateCompanionBuilder,
      $$ClientesTableUpdateCompanionBuilder,
      (Cliente, $$ClientesTableReferences),
      Cliente,
      PrefetchHooks Function({bool equiposRefs, bool ordenesRefs})
    >;
typedef $$EquiposTableCreateCompanionBuilder =
    EquiposCompanion Function({
      Value<int> id,
      required String codigo,
      required String nombre,
      Value<String?> marca,
      Value<String?> modelo,
      Value<String?> serie,
      Value<String?> ubicacion,
      Value<String?> tipoEquipo,
      Value<int?> idCliente,
      Value<bool> activo,
      Value<String?> configParametros,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$EquiposTableUpdateCompanionBuilder =
    EquiposCompanion Function({
      Value<int> id,
      Value<String> codigo,
      Value<String> nombre,
      Value<String?> marca,
      Value<String?> modelo,
      Value<String?> serie,
      Value<String?> ubicacion,
      Value<String?> tipoEquipo,
      Value<int?> idCliente,
      Value<bool> activo,
      Value<String?> configParametros,
      Value<DateTime?> lastSyncedAt,
    });

final class $$EquiposTableReferences
    extends BaseReferences<_$AppDatabase, $EquiposTable, Equipo> {
  $$EquiposTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $ClientesTable _idClienteTable(_$AppDatabase db) => db.clientes
      .createAlias($_aliasNameGenerator(db.equipos.idCliente, db.clientes.id));

  $$ClientesTableProcessedTableManager? get idCliente {
    final $_column = $_itemColumn<int>('id_cliente');
    if ($_column == null) return null;
    final manager = $$ClientesTableTableManager(
      $_db,
      $_db.clientes,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idClienteTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static MultiTypedResultKey<$OrdenesTable, List<Ordene>> _ordenesRefsTable(
    _$AppDatabase db,
  ) => MultiTypedResultKey.fromTable(
    db.ordenes,
    aliasName: $_aliasNameGenerator(db.equipos.id, db.ordenes.idEquipo),
  );

  $$OrdenesTableProcessedTableManager get ordenesRefs {
    final manager = $$OrdenesTableTableManager(
      $_db,
      $_db.ordenes,
    ).filter((f) => f.idEquipo.id.sqlEquals($_itemColumn<int>('id')!));

    final cache = $_typedResult.readTableOrNull(_ordenesRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$EquiposTableFilterComposer
    extends Composer<_$AppDatabase, $EquiposTable> {
  $$EquiposTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nombre => $composableBuilder(
    column: $table.nombre,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get marca => $composableBuilder(
    column: $table.marca,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get modelo => $composableBuilder(
    column: $table.modelo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get serie => $composableBuilder(
    column: $table.serie,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get ubicacion => $composableBuilder(
    column: $table.ubicacion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tipoEquipo => $composableBuilder(
    column: $table.tipoEquipo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get activo => $composableBuilder(
    column: $table.activo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get configParametros => $composableBuilder(
    column: $table.configParametros,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  $$ClientesTableFilterComposer get idCliente {
    final $$ClientesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idCliente,
      referencedTable: $db.clientes,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ClientesTableFilterComposer(
            $db: $db,
            $table: $db.clientes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  Expression<bool> ordenesRefs(
    Expression<bool> Function($$OrdenesTableFilterComposer f) f,
  ) {
    final $$OrdenesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableFilterComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$EquiposTableOrderingComposer
    extends Composer<_$AppDatabase, $EquiposTable> {
  $$EquiposTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get codigo => $composableBuilder(
    column: $table.codigo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nombre => $composableBuilder(
    column: $table.nombre,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get marca => $composableBuilder(
    column: $table.marca,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get modelo => $composableBuilder(
    column: $table.modelo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get serie => $composableBuilder(
    column: $table.serie,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get ubicacion => $composableBuilder(
    column: $table.ubicacion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tipoEquipo => $composableBuilder(
    column: $table.tipoEquipo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get activo => $composableBuilder(
    column: $table.activo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get configParametros => $composableBuilder(
    column: $table.configParametros,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );

  $$ClientesTableOrderingComposer get idCliente {
    final $$ClientesTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idCliente,
      referencedTable: $db.clientes,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ClientesTableOrderingComposer(
            $db: $db,
            $table: $db.clientes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$EquiposTableAnnotationComposer
    extends Composer<_$AppDatabase, $EquiposTable> {
  $$EquiposTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get codigo =>
      $composableBuilder(column: $table.codigo, builder: (column) => column);

  GeneratedColumn<String> get nombre =>
      $composableBuilder(column: $table.nombre, builder: (column) => column);

  GeneratedColumn<String> get marca =>
      $composableBuilder(column: $table.marca, builder: (column) => column);

  GeneratedColumn<String> get modelo =>
      $composableBuilder(column: $table.modelo, builder: (column) => column);

  GeneratedColumn<String> get serie =>
      $composableBuilder(column: $table.serie, builder: (column) => column);

  GeneratedColumn<String> get ubicacion =>
      $composableBuilder(column: $table.ubicacion, builder: (column) => column);

  GeneratedColumn<String> get tipoEquipo => $composableBuilder(
    column: $table.tipoEquipo,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get activo =>
      $composableBuilder(column: $table.activo, builder: (column) => column);

  GeneratedColumn<String> get configParametros => $composableBuilder(
    column: $table.configParametros,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  $$ClientesTableAnnotationComposer get idCliente {
    final $$ClientesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idCliente,
      referencedTable: $db.clientes,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ClientesTableAnnotationComposer(
            $db: $db,
            $table: $db.clientes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  Expression<T> ordenesRefs<T extends Object>(
    Expression<T> Function($$OrdenesTableAnnotationComposer a) f,
  ) {
    final $$OrdenesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.id,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$EquiposTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $EquiposTable,
          Equipo,
          $$EquiposTableFilterComposer,
          $$EquiposTableOrderingComposer,
          $$EquiposTableAnnotationComposer,
          $$EquiposTableCreateCompanionBuilder,
          $$EquiposTableUpdateCompanionBuilder,
          (Equipo, $$EquiposTableReferences),
          Equipo,
          PrefetchHooks Function({bool idCliente, bool ordenesRefs})
        > {
  $$EquiposTableTableManager(_$AppDatabase db, $EquiposTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$EquiposTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$EquiposTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$EquiposTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> codigo = const Value.absent(),
                Value<String> nombre = const Value.absent(),
                Value<String?> marca = const Value.absent(),
                Value<String?> modelo = const Value.absent(),
                Value<String?> serie = const Value.absent(),
                Value<String?> ubicacion = const Value.absent(),
                Value<String?> tipoEquipo = const Value.absent(),
                Value<int?> idCliente = const Value.absent(),
                Value<bool> activo = const Value.absent(),
                Value<String?> configParametros = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => EquiposCompanion(
                id: id,
                codigo: codigo,
                nombre: nombre,
                marca: marca,
                modelo: modelo,
                serie: serie,
                ubicacion: ubicacion,
                tipoEquipo: tipoEquipo,
                idCliente: idCliente,
                activo: activo,
                configParametros: configParametros,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String codigo,
                required String nombre,
                Value<String?> marca = const Value.absent(),
                Value<String?> modelo = const Value.absent(),
                Value<String?> serie = const Value.absent(),
                Value<String?> ubicacion = const Value.absent(),
                Value<String?> tipoEquipo = const Value.absent(),
                Value<int?> idCliente = const Value.absent(),
                Value<bool> activo = const Value.absent(),
                Value<String?> configParametros = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => EquiposCompanion.insert(
                id: id,
                codigo: codigo,
                nombre: nombre,
                marca: marca,
                modelo: modelo,
                serie: serie,
                ubicacion: ubicacion,
                tipoEquipo: tipoEquipo,
                idCliente: idCliente,
                activo: activo,
                configParametros: configParametros,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$EquiposTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback: ({idCliente = false, ordenesRefs = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [if (ordenesRefs) db.ordenes],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (idCliente) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.idCliente,
                                referencedTable: $$EquiposTableReferences
                                    ._idClienteTable(db),
                                referencedColumn: $$EquiposTableReferences
                                    ._idClienteTable(db)
                                    .id,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [
                  if (ordenesRefs)
                    await $_getPrefetchedData<Equipo, $EquiposTable, Ordene>(
                      currentTable: table,
                      referencedTable: $$EquiposTableReferences
                          ._ordenesRefsTable(db),
                      managerFromTypedResult: (p0) =>
                          $$EquiposTableReferences(db, table, p0).ordenesRefs,
                      referencedItemsForCurrentItem: (item, referencedItems) =>
                          referencedItems.where((e) => e.idEquipo == item.id),
                      typedResults: items,
                    ),
                ];
              },
            );
          },
        ),
      );
}

typedef $$EquiposTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $EquiposTable,
      Equipo,
      $$EquiposTableFilterComposer,
      $$EquiposTableOrderingComposer,
      $$EquiposTableAnnotationComposer,
      $$EquiposTableCreateCompanionBuilder,
      $$EquiposTableUpdateCompanionBuilder,
      (Equipo, $$EquiposTableReferences),
      Equipo,
      PrefetchHooks Function({bool idCliente, bool ordenesRefs})
    >;
typedef $$OrdenesEquiposTableCreateCompanionBuilder =
    OrdenesEquiposCompanion Function({
      Value<int> idOrdenEquipo,
      required int idOrdenServicio,
      required int idEquipo,
      Value<int> ordenSecuencia,
      Value<String?> nombreSistema,
      Value<String?> codigoEquipo,
      Value<String?> nombreEquipo,
      Value<String> estado,
      Value<DateTime?> fechaInicio,
      Value<DateTime?> fechaFin,
      Value<String?> observaciones,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$OrdenesEquiposTableUpdateCompanionBuilder =
    OrdenesEquiposCompanion Function({
      Value<int> idOrdenEquipo,
      Value<int> idOrdenServicio,
      Value<int> idEquipo,
      Value<int> ordenSecuencia,
      Value<String?> nombreSistema,
      Value<String?> codigoEquipo,
      Value<String?> nombreEquipo,
      Value<String> estado,
      Value<DateTime?> fechaInicio,
      Value<DateTime?> fechaFin,
      Value<String?> observaciones,
      Value<DateTime?> lastSyncedAt,
    });

final class $$OrdenesEquiposTableReferences
    extends BaseReferences<_$AppDatabase, $OrdenesEquiposTable, OrdenesEquipo> {
  $$OrdenesEquiposTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static MultiTypedResultKey<
    $ActividadesEjecutadasTable,
    List<ActividadesEjecutada>
  >
  _actividadesEjecutadasRefsTable(_$AppDatabase db) =>
      MultiTypedResultKey.fromTable(
        db.actividadesEjecutadas,
        aliasName: $_aliasNameGenerator(
          db.ordenesEquipos.idOrdenEquipo,
          db.actividadesEjecutadas.idOrdenEquipo,
        ),
      );

  $$ActividadesEjecutadasTableProcessedTableManager
  get actividadesEjecutadasRefs {
    final manager =
        $$ActividadesEjecutadasTableTableManager(
          $_db,
          $_db.actividadesEjecutadas,
        ).filter(
          (f) => f.idOrdenEquipo.idOrdenEquipo.sqlEquals(
            $_itemColumn<int>('id_orden_equipo')!,
          ),
        );

    final cache = $_typedResult.readTableOrNull(
      _actividadesEjecutadasRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$MedicionesTable, List<Medicione>>
  _medicionesRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.mediciones,
    aliasName: $_aliasNameGenerator(
      db.ordenesEquipos.idOrdenEquipo,
      db.mediciones.idOrdenEquipo,
    ),
  );

  $$MedicionesTableProcessedTableManager get medicionesRefs {
    final manager = $$MedicionesTableTableManager($_db, $_db.mediciones).filter(
      (f) => f.idOrdenEquipo.idOrdenEquipo.sqlEquals(
        $_itemColumn<int>('id_orden_equipo')!,
      ),
    );

    final cache = $_typedResult.readTableOrNull(_medicionesRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$EvidenciasTable, List<Evidencia>>
  _evidenciasRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.evidencias,
    aliasName: $_aliasNameGenerator(
      db.ordenesEquipos.idOrdenEquipo,
      db.evidencias.idOrdenEquipo,
    ),
  );

  $$EvidenciasTableProcessedTableManager get evidenciasRefs {
    final manager = $$EvidenciasTableTableManager($_db, $_db.evidencias).filter(
      (f) => f.idOrdenEquipo.idOrdenEquipo.sqlEquals(
        $_itemColumn<int>('id_orden_equipo')!,
      ),
    );

    final cache = $_typedResult.readTableOrNull(_evidenciasRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$OrdenesEquiposTableFilterComposer
    extends Composer<_$AppDatabase, $OrdenesEquiposTable> {
  $$OrdenesEquiposTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get idOrdenEquipo => $composableBuilder(
    column: $table.idOrdenEquipo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get idOrdenServicio => $composableBuilder(
    column: $table.idOrdenServicio,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get idEquipo => $composableBuilder(
    column: $table.idEquipo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get ordenSecuencia => $composableBuilder(
    column: $table.ordenSecuencia,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nombreSistema => $composableBuilder(
    column: $table.nombreSistema,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get codigoEquipo => $composableBuilder(
    column: $table.codigoEquipo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nombreEquipo => $composableBuilder(
    column: $table.nombreEquipo,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get estado => $composableBuilder(
    column: $table.estado,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaInicio => $composableBuilder(
    column: $table.fechaInicio,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaFin => $composableBuilder(
    column: $table.fechaFin,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get observaciones => $composableBuilder(
    column: $table.observaciones,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  Expression<bool> actividadesEjecutadasRefs(
    Expression<bool> Function($$ActividadesEjecutadasTableFilterComposer f) f,
  ) {
    final $$ActividadesEjecutadasTableFilterComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idOrdenEquipo,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idOrdenEquipo,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableFilterComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }

  Expression<bool> medicionesRefs(
    Expression<bool> Function($$MedicionesTableFilterComposer f) f,
  ) {
    final $$MedicionesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.mediciones,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$MedicionesTableFilterComposer(
            $db: $db,
            $table: $db.mediciones,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> evidenciasRefs(
    Expression<bool> Function($$EvidenciasTableFilterComposer f) f,
  ) {
    final $$EvidenciasTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.evidencias,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EvidenciasTableFilterComposer(
            $db: $db,
            $table: $db.evidencias,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$OrdenesEquiposTableOrderingComposer
    extends Composer<_$AppDatabase, $OrdenesEquiposTable> {
  $$OrdenesEquiposTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get idOrdenEquipo => $composableBuilder(
    column: $table.idOrdenEquipo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get idOrdenServicio => $composableBuilder(
    column: $table.idOrdenServicio,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get idEquipo => $composableBuilder(
    column: $table.idEquipo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get ordenSecuencia => $composableBuilder(
    column: $table.ordenSecuencia,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nombreSistema => $composableBuilder(
    column: $table.nombreSistema,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get codigoEquipo => $composableBuilder(
    column: $table.codigoEquipo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nombreEquipo => $composableBuilder(
    column: $table.nombreEquipo,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get estado => $composableBuilder(
    column: $table.estado,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaInicio => $composableBuilder(
    column: $table.fechaInicio,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaFin => $composableBuilder(
    column: $table.fechaFin,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get observaciones => $composableBuilder(
    column: $table.observaciones,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$OrdenesEquiposTableAnnotationComposer
    extends Composer<_$AppDatabase, $OrdenesEquiposTable> {
  $$OrdenesEquiposTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get idOrdenEquipo => $composableBuilder(
    column: $table.idOrdenEquipo,
    builder: (column) => column,
  );

  GeneratedColumn<int> get idOrdenServicio => $composableBuilder(
    column: $table.idOrdenServicio,
    builder: (column) => column,
  );

  GeneratedColumn<int> get idEquipo =>
      $composableBuilder(column: $table.idEquipo, builder: (column) => column);

  GeneratedColumn<int> get ordenSecuencia => $composableBuilder(
    column: $table.ordenSecuencia,
    builder: (column) => column,
  );

  GeneratedColumn<String> get nombreSistema => $composableBuilder(
    column: $table.nombreSistema,
    builder: (column) => column,
  );

  GeneratedColumn<String> get codigoEquipo => $composableBuilder(
    column: $table.codigoEquipo,
    builder: (column) => column,
  );

  GeneratedColumn<String> get nombreEquipo => $composableBuilder(
    column: $table.nombreEquipo,
    builder: (column) => column,
  );

  GeneratedColumn<String> get estado =>
      $composableBuilder(column: $table.estado, builder: (column) => column);

  GeneratedColumn<DateTime> get fechaInicio => $composableBuilder(
    column: $table.fechaInicio,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get fechaFin =>
      $composableBuilder(column: $table.fechaFin, builder: (column) => column);

  GeneratedColumn<String> get observaciones => $composableBuilder(
    column: $table.observaciones,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  Expression<T> actividadesEjecutadasRefs<T extends Object>(
    Expression<T> Function($$ActividadesEjecutadasTableAnnotationComposer a) f,
  ) {
    final $$ActividadesEjecutadasTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idOrdenEquipo,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idOrdenEquipo,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableAnnotationComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }

  Expression<T> medicionesRefs<T extends Object>(
    Expression<T> Function($$MedicionesTableAnnotationComposer a) f,
  ) {
    final $$MedicionesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.mediciones,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$MedicionesTableAnnotationComposer(
            $db: $db,
            $table: $db.mediciones,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<T> evidenciasRefs<T extends Object>(
    Expression<T> Function($$EvidenciasTableAnnotationComposer a) f,
  ) {
    final $$EvidenciasTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.evidencias,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EvidenciasTableAnnotationComposer(
            $db: $db,
            $table: $db.evidencias,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$OrdenesEquiposTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OrdenesEquiposTable,
          OrdenesEquipo,
          $$OrdenesEquiposTableFilterComposer,
          $$OrdenesEquiposTableOrderingComposer,
          $$OrdenesEquiposTableAnnotationComposer,
          $$OrdenesEquiposTableCreateCompanionBuilder,
          $$OrdenesEquiposTableUpdateCompanionBuilder,
          (OrdenesEquipo, $$OrdenesEquiposTableReferences),
          OrdenesEquipo,
          PrefetchHooks Function({
            bool actividadesEjecutadasRefs,
            bool medicionesRefs,
            bool evidenciasRefs,
          })
        > {
  $$OrdenesEquiposTableTableManager(
    _$AppDatabase db,
    $OrdenesEquiposTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OrdenesEquiposTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OrdenesEquiposTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OrdenesEquiposTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> idOrdenEquipo = const Value.absent(),
                Value<int> idOrdenServicio = const Value.absent(),
                Value<int> idEquipo = const Value.absent(),
                Value<int> ordenSecuencia = const Value.absent(),
                Value<String?> nombreSistema = const Value.absent(),
                Value<String?> codigoEquipo = const Value.absent(),
                Value<String?> nombreEquipo = const Value.absent(),
                Value<String> estado = const Value.absent(),
                Value<DateTime?> fechaInicio = const Value.absent(),
                Value<DateTime?> fechaFin = const Value.absent(),
                Value<String?> observaciones = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => OrdenesEquiposCompanion(
                idOrdenEquipo: idOrdenEquipo,
                idOrdenServicio: idOrdenServicio,
                idEquipo: idEquipo,
                ordenSecuencia: ordenSecuencia,
                nombreSistema: nombreSistema,
                codigoEquipo: codigoEquipo,
                nombreEquipo: nombreEquipo,
                estado: estado,
                fechaInicio: fechaInicio,
                fechaFin: fechaFin,
                observaciones: observaciones,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> idOrdenEquipo = const Value.absent(),
                required int idOrdenServicio,
                required int idEquipo,
                Value<int> ordenSecuencia = const Value.absent(),
                Value<String?> nombreSistema = const Value.absent(),
                Value<String?> codigoEquipo = const Value.absent(),
                Value<String?> nombreEquipo = const Value.absent(),
                Value<String> estado = const Value.absent(),
                Value<DateTime?> fechaInicio = const Value.absent(),
                Value<DateTime?> fechaFin = const Value.absent(),
                Value<String?> observaciones = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => OrdenesEquiposCompanion.insert(
                idOrdenEquipo: idOrdenEquipo,
                idOrdenServicio: idOrdenServicio,
                idEquipo: idEquipo,
                ordenSecuencia: ordenSecuencia,
                nombreSistema: nombreSistema,
                codigoEquipo: codigoEquipo,
                nombreEquipo: nombreEquipo,
                estado: estado,
                fechaInicio: fechaInicio,
                fechaFin: fechaFin,
                observaciones: observaciones,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$OrdenesEquiposTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback:
              ({
                actividadesEjecutadasRefs = false,
                medicionesRefs = false,
                evidenciasRefs = false,
              }) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [
                    if (actividadesEjecutadasRefs) db.actividadesEjecutadas,
                    if (medicionesRefs) db.mediciones,
                    if (evidenciasRefs) db.evidencias,
                  ],
                  addJoins: null,
                  getPrefetchedDataCallback: (items) async {
                    return [
                      if (actividadesEjecutadasRefs)
                        await $_getPrefetchedData<
                          OrdenesEquipo,
                          $OrdenesEquiposTable,
                          ActividadesEjecutada
                        >(
                          currentTable: table,
                          referencedTable: $$OrdenesEquiposTableReferences
                              ._actividadesEjecutadasRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$OrdenesEquiposTableReferences(
                                db,
                                table,
                                p0,
                              ).actividadesEjecutadasRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idOrdenEquipo == item.idOrdenEquipo,
                              ),
                          typedResults: items,
                        ),
                      if (medicionesRefs)
                        await $_getPrefetchedData<
                          OrdenesEquipo,
                          $OrdenesEquiposTable,
                          Medicione
                        >(
                          currentTable: table,
                          referencedTable: $$OrdenesEquiposTableReferences
                              ._medicionesRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$OrdenesEquiposTableReferences(
                                db,
                                table,
                                p0,
                              ).medicionesRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idOrdenEquipo == item.idOrdenEquipo,
                              ),
                          typedResults: items,
                        ),
                      if (evidenciasRefs)
                        await $_getPrefetchedData<
                          OrdenesEquipo,
                          $OrdenesEquiposTable,
                          Evidencia
                        >(
                          currentTable: table,
                          referencedTable: $$OrdenesEquiposTableReferences
                              ._evidenciasRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$OrdenesEquiposTableReferences(
                                db,
                                table,
                                p0,
                              ).evidenciasRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idOrdenEquipo == item.idOrdenEquipo,
                              ),
                          typedResults: items,
                        ),
                    ];
                  },
                );
              },
        ),
      );
}

typedef $$OrdenesEquiposTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OrdenesEquiposTable,
      OrdenesEquipo,
      $$OrdenesEquiposTableFilterComposer,
      $$OrdenesEquiposTableOrderingComposer,
      $$OrdenesEquiposTableAnnotationComposer,
      $$OrdenesEquiposTableCreateCompanionBuilder,
      $$OrdenesEquiposTableUpdateCompanionBuilder,
      (OrdenesEquipo, $$OrdenesEquiposTableReferences),
      OrdenesEquipo,
      PrefetchHooks Function({
        bool actividadesEjecutadasRefs,
        bool medicionesRefs,
        bool evidenciasRefs,
      })
    >;
typedef $$OrdenesTableCreateCompanionBuilder =
    OrdenesCompanion Function({
      Value<int> idLocal,
      Value<int?> idBackend,
      required String numeroOrden,
      Value<int> version,
      required int idEstado,
      required int idCliente,
      required int idEquipo,
      required int idTipoServicio,
      Value<String> prioridad,
      Value<DateTime?> fechaProgramada,
      Value<DateTime?> fechaInicio,
      Value<DateTime?> fechaFin,
      Value<String?> descripcionInicial,
      Value<String?> trabajoRealizado,
      Value<String?> observacionesTecnico,
      Value<String?> urlPdf,
      Value<int> totalActividades,
      Value<int> totalMediciones,
      Value<int> totalEvidencias,
      Value<int> totalFirmas,
      Value<int> actividadesBuenas,
      Value<int> actividadesMalas,
      Value<int> actividadesCorregidas,
      Value<int> actividadesNA,
      Value<int> medicionesNormales,
      Value<int> medicionesAdvertencia,
      Value<int> medicionesCriticas,
      Value<String?> horaEntradaTexto,
      Value<String?> horaSalidaTexto,
      Value<String?> razonFalla,
      Value<bool> isDirty,
      Value<DateTime?> lastSyncedAt,
      Value<DateTime> createdAt,
      Value<DateTime> updatedAt,
    });
typedef $$OrdenesTableUpdateCompanionBuilder =
    OrdenesCompanion Function({
      Value<int> idLocal,
      Value<int?> idBackend,
      Value<String> numeroOrden,
      Value<int> version,
      Value<int> idEstado,
      Value<int> idCliente,
      Value<int> idEquipo,
      Value<int> idTipoServicio,
      Value<String> prioridad,
      Value<DateTime?> fechaProgramada,
      Value<DateTime?> fechaInicio,
      Value<DateTime?> fechaFin,
      Value<String?> descripcionInicial,
      Value<String?> trabajoRealizado,
      Value<String?> observacionesTecnico,
      Value<String?> urlPdf,
      Value<int> totalActividades,
      Value<int> totalMediciones,
      Value<int> totalEvidencias,
      Value<int> totalFirmas,
      Value<int> actividadesBuenas,
      Value<int> actividadesMalas,
      Value<int> actividadesCorregidas,
      Value<int> actividadesNA,
      Value<int> medicionesNormales,
      Value<int> medicionesAdvertencia,
      Value<int> medicionesCriticas,
      Value<String?> horaEntradaTexto,
      Value<String?> horaSalidaTexto,
      Value<String?> razonFalla,
      Value<bool> isDirty,
      Value<DateTime?> lastSyncedAt,
      Value<DateTime> createdAt,
      Value<DateTime> updatedAt,
    });

final class $$OrdenesTableReferences
    extends BaseReferences<_$AppDatabase, $OrdenesTable, Ordene> {
  $$OrdenesTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $EstadosOrdenTable _idEstadoTable(_$AppDatabase db) =>
      db.estadosOrden.createAlias(
        $_aliasNameGenerator(db.ordenes.idEstado, db.estadosOrden.id),
      );

  $$EstadosOrdenTableProcessedTableManager get idEstado {
    final $_column = $_itemColumn<int>('id_estado')!;

    final manager = $$EstadosOrdenTableTableManager(
      $_db,
      $_db.estadosOrden,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idEstadoTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $ClientesTable _idClienteTable(_$AppDatabase db) => db.clientes
      .createAlias($_aliasNameGenerator(db.ordenes.idCliente, db.clientes.id));

  $$ClientesTableProcessedTableManager get idCliente {
    final $_column = $_itemColumn<int>('id_cliente')!;

    final manager = $$ClientesTableTableManager(
      $_db,
      $_db.clientes,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idClienteTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $EquiposTable _idEquipoTable(_$AppDatabase db) => db.equipos
      .createAlias($_aliasNameGenerator(db.ordenes.idEquipo, db.equipos.id));

  $$EquiposTableProcessedTableManager get idEquipo {
    final $_column = $_itemColumn<int>('id_equipo')!;

    final manager = $$EquiposTableTableManager(
      $_db,
      $_db.equipos,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idEquipoTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $TiposServicioTable _idTipoServicioTable(_$AppDatabase db) =>
      db.tiposServicio.createAlias(
        $_aliasNameGenerator(db.ordenes.idTipoServicio, db.tiposServicio.id),
      );

  $$TiposServicioTableProcessedTableManager get idTipoServicio {
    final $_column = $_itemColumn<int>('id_tipo_servicio')!;

    final manager = $$TiposServicioTableTableManager(
      $_db,
      $_db.tiposServicio,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idTipoServicioTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static MultiTypedResultKey<$ActividadesPlanTable, List<ActividadesPlanData>>
  _actividadesPlanRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.actividadesPlan,
    aliasName: $_aliasNameGenerator(
      db.ordenes.idLocal,
      db.actividadesPlan.idOrden,
    ),
  );

  $$ActividadesPlanTableProcessedTableManager get actividadesPlanRefs {
    final manager =
        $$ActividadesPlanTableTableManager($_db, $_db.actividadesPlan).filter(
          (f) => f.idOrden.idLocal.sqlEquals($_itemColumn<int>('id_local')!),
        );

    final cache = $_typedResult.readTableOrNull(
      _actividadesPlanRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<
    $ActividadesEjecutadasTable,
    List<ActividadesEjecutada>
  >
  _actividadesEjecutadasRefsTable(_$AppDatabase db) =>
      MultiTypedResultKey.fromTable(
        db.actividadesEjecutadas,
        aliasName: $_aliasNameGenerator(
          db.ordenes.idLocal,
          db.actividadesEjecutadas.idOrden,
        ),
      );

  $$ActividadesEjecutadasTableProcessedTableManager
  get actividadesEjecutadasRefs {
    final manager =
        $$ActividadesEjecutadasTableTableManager(
          $_db,
          $_db.actividadesEjecutadas,
        ).filter(
          (f) => f.idOrden.idLocal.sqlEquals($_itemColumn<int>('id_local')!),
        );

    final cache = $_typedResult.readTableOrNull(
      _actividadesEjecutadasRefsTable($_db),
    );
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$MedicionesTable, List<Medicione>>
  _medicionesRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.mediciones,
    aliasName: $_aliasNameGenerator(db.ordenes.idLocal, db.mediciones.idOrden),
  );

  $$MedicionesTableProcessedTableManager get medicionesRefs {
    final manager = $$MedicionesTableTableManager($_db, $_db.mediciones).filter(
      (f) => f.idOrden.idLocal.sqlEquals($_itemColumn<int>('id_local')!),
    );

    final cache = $_typedResult.readTableOrNull(_medicionesRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$EvidenciasTable, List<Evidencia>>
  _evidenciasRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.evidencias,
    aliasName: $_aliasNameGenerator(db.ordenes.idLocal, db.evidencias.idOrden),
  );

  $$EvidenciasTableProcessedTableManager get evidenciasRefs {
    final manager = $$EvidenciasTableTableManager($_db, $_db.evidencias).filter(
      (f) => f.idOrden.idLocal.sqlEquals($_itemColumn<int>('id_local')!),
    );

    final cache = $_typedResult.readTableOrNull(_evidenciasRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$FirmasTable, List<Firma>> _firmasRefsTable(
    _$AppDatabase db,
  ) => MultiTypedResultKey.fromTable(
    db.firmas,
    aliasName: $_aliasNameGenerator(db.ordenes.idLocal, db.firmas.idOrden),
  );

  $$FirmasTableProcessedTableManager get firmasRefs {
    final manager = $$FirmasTableTableManager($_db, $_db.firmas).filter(
      (f) => f.idOrden.idLocal.sqlEquals($_itemColumn<int>('id_local')!),
    );

    final cache = $_typedResult.readTableOrNull(_firmasRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$OrdenesTableFilterComposer
    extends Composer<_$AppDatabase, $OrdenesTable> {
  $$OrdenesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get idBackend => $composableBuilder(
    column: $table.idBackend,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get numeroOrden => $composableBuilder(
    column: $table.numeroOrden,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get version => $composableBuilder(
    column: $table.version,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get prioridad => $composableBuilder(
    column: $table.prioridad,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaProgramada => $composableBuilder(
    column: $table.fechaProgramada,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaInicio => $composableBuilder(
    column: $table.fechaInicio,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaFin => $composableBuilder(
    column: $table.fechaFin,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get descripcionInicial => $composableBuilder(
    column: $table.descripcionInicial,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get trabajoRealizado => $composableBuilder(
    column: $table.trabajoRealizado,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get observacionesTecnico => $composableBuilder(
    column: $table.observacionesTecnico,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get urlPdf => $composableBuilder(
    column: $table.urlPdf,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get totalActividades => $composableBuilder(
    column: $table.totalActividades,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get totalMediciones => $composableBuilder(
    column: $table.totalMediciones,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get totalEvidencias => $composableBuilder(
    column: $table.totalEvidencias,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get totalFirmas => $composableBuilder(
    column: $table.totalFirmas,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get actividadesBuenas => $composableBuilder(
    column: $table.actividadesBuenas,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get actividadesMalas => $composableBuilder(
    column: $table.actividadesMalas,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get actividadesCorregidas => $composableBuilder(
    column: $table.actividadesCorregidas,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get actividadesNA => $composableBuilder(
    column: $table.actividadesNA,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get medicionesNormales => $composableBuilder(
    column: $table.medicionesNormales,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get medicionesAdvertencia => $composableBuilder(
    column: $table.medicionesAdvertencia,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get medicionesCriticas => $composableBuilder(
    column: $table.medicionesCriticas,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get horaEntradaTexto => $composableBuilder(
    column: $table.horaEntradaTexto,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get horaSalidaTexto => $composableBuilder(
    column: $table.horaSalidaTexto,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get razonFalla => $composableBuilder(
    column: $table.razonFalla,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get isDirty => $composableBuilder(
    column: $table.isDirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnFilters(column),
  );

  $$EstadosOrdenTableFilterComposer get idEstado {
    final $$EstadosOrdenTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idEstado,
      referencedTable: $db.estadosOrden,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EstadosOrdenTableFilterComposer(
            $db: $db,
            $table: $db.estadosOrden,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ClientesTableFilterComposer get idCliente {
    final $$ClientesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idCliente,
      referencedTable: $db.clientes,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ClientesTableFilterComposer(
            $db: $db,
            $table: $db.clientes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$EquiposTableFilterComposer get idEquipo {
    final $$EquiposTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idEquipo,
      referencedTable: $db.equipos,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EquiposTableFilterComposer(
            $db: $db,
            $table: $db.equipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$TiposServicioTableFilterComposer get idTipoServicio {
    final $$TiposServicioTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idTipoServicio,
      referencedTable: $db.tiposServicio,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$TiposServicioTableFilterComposer(
            $db: $db,
            $table: $db.tiposServicio,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  Expression<bool> actividadesPlanRefs(
    Expression<bool> Function($$ActividadesPlanTableFilterComposer f) f,
  ) {
    final $$ActividadesPlanTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.actividadesPlan,
      getReferencedColumn: (t) => t.idOrden,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ActividadesPlanTableFilterComposer(
            $db: $db,
            $table: $db.actividadesPlan,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> actividadesEjecutadasRefs(
    Expression<bool> Function($$ActividadesEjecutadasTableFilterComposer f) f,
  ) {
    final $$ActividadesEjecutadasTableFilterComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idLocal,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idOrden,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableFilterComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }

  Expression<bool> medicionesRefs(
    Expression<bool> Function($$MedicionesTableFilterComposer f) f,
  ) {
    final $$MedicionesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.mediciones,
      getReferencedColumn: (t) => t.idOrden,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$MedicionesTableFilterComposer(
            $db: $db,
            $table: $db.mediciones,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> evidenciasRefs(
    Expression<bool> Function($$EvidenciasTableFilterComposer f) f,
  ) {
    final $$EvidenciasTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.evidencias,
      getReferencedColumn: (t) => t.idOrden,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EvidenciasTableFilterComposer(
            $db: $db,
            $table: $db.evidencias,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> firmasRefs(
    Expression<bool> Function($$FirmasTableFilterComposer f) f,
  ) {
    final $$FirmasTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.firmas,
      getReferencedColumn: (t) => t.idOrden,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$FirmasTableFilterComposer(
            $db: $db,
            $table: $db.firmas,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$OrdenesTableOrderingComposer
    extends Composer<_$AppDatabase, $OrdenesTable> {
  $$OrdenesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get idBackend => $composableBuilder(
    column: $table.idBackend,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get numeroOrden => $composableBuilder(
    column: $table.numeroOrden,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get version => $composableBuilder(
    column: $table.version,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get prioridad => $composableBuilder(
    column: $table.prioridad,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaProgramada => $composableBuilder(
    column: $table.fechaProgramada,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaInicio => $composableBuilder(
    column: $table.fechaInicio,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaFin => $composableBuilder(
    column: $table.fechaFin,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get descripcionInicial => $composableBuilder(
    column: $table.descripcionInicial,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get trabajoRealizado => $composableBuilder(
    column: $table.trabajoRealizado,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get observacionesTecnico => $composableBuilder(
    column: $table.observacionesTecnico,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get urlPdf => $composableBuilder(
    column: $table.urlPdf,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get totalActividades => $composableBuilder(
    column: $table.totalActividades,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get totalMediciones => $composableBuilder(
    column: $table.totalMediciones,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get totalEvidencias => $composableBuilder(
    column: $table.totalEvidencias,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get totalFirmas => $composableBuilder(
    column: $table.totalFirmas,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get actividadesBuenas => $composableBuilder(
    column: $table.actividadesBuenas,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get actividadesMalas => $composableBuilder(
    column: $table.actividadesMalas,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get actividadesCorregidas => $composableBuilder(
    column: $table.actividadesCorregidas,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get actividadesNA => $composableBuilder(
    column: $table.actividadesNA,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get medicionesNormales => $composableBuilder(
    column: $table.medicionesNormales,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get medicionesAdvertencia => $composableBuilder(
    column: $table.medicionesAdvertencia,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get medicionesCriticas => $composableBuilder(
    column: $table.medicionesCriticas,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get horaEntradaTexto => $composableBuilder(
    column: $table.horaEntradaTexto,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get horaSalidaTexto => $composableBuilder(
    column: $table.horaSalidaTexto,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get razonFalla => $composableBuilder(
    column: $table.razonFalla,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get isDirty => $composableBuilder(
    column: $table.isDirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get updatedAt => $composableBuilder(
    column: $table.updatedAt,
    builder: (column) => ColumnOrderings(column),
  );

  $$EstadosOrdenTableOrderingComposer get idEstado {
    final $$EstadosOrdenTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idEstado,
      referencedTable: $db.estadosOrden,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EstadosOrdenTableOrderingComposer(
            $db: $db,
            $table: $db.estadosOrden,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ClientesTableOrderingComposer get idCliente {
    final $$ClientesTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idCliente,
      referencedTable: $db.clientes,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ClientesTableOrderingComposer(
            $db: $db,
            $table: $db.clientes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$EquiposTableOrderingComposer get idEquipo {
    final $$EquiposTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idEquipo,
      referencedTable: $db.equipos,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EquiposTableOrderingComposer(
            $db: $db,
            $table: $db.equipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$TiposServicioTableOrderingComposer get idTipoServicio {
    final $$TiposServicioTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idTipoServicio,
      referencedTable: $db.tiposServicio,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$TiposServicioTableOrderingComposer(
            $db: $db,
            $table: $db.tiposServicio,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$OrdenesTableAnnotationComposer
    extends Composer<_$AppDatabase, $OrdenesTable> {
  $$OrdenesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get idLocal =>
      $composableBuilder(column: $table.idLocal, builder: (column) => column);

  GeneratedColumn<int> get idBackend =>
      $composableBuilder(column: $table.idBackend, builder: (column) => column);

  GeneratedColumn<String> get numeroOrden => $composableBuilder(
    column: $table.numeroOrden,
    builder: (column) => column,
  );

  GeneratedColumn<int> get version =>
      $composableBuilder(column: $table.version, builder: (column) => column);

  GeneratedColumn<String> get prioridad =>
      $composableBuilder(column: $table.prioridad, builder: (column) => column);

  GeneratedColumn<DateTime> get fechaProgramada => $composableBuilder(
    column: $table.fechaProgramada,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get fechaInicio => $composableBuilder(
    column: $table.fechaInicio,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get fechaFin =>
      $composableBuilder(column: $table.fechaFin, builder: (column) => column);

  GeneratedColumn<String> get descripcionInicial => $composableBuilder(
    column: $table.descripcionInicial,
    builder: (column) => column,
  );

  GeneratedColumn<String> get trabajoRealizado => $composableBuilder(
    column: $table.trabajoRealizado,
    builder: (column) => column,
  );

  GeneratedColumn<String> get observacionesTecnico => $composableBuilder(
    column: $table.observacionesTecnico,
    builder: (column) => column,
  );

  GeneratedColumn<String> get urlPdf =>
      $composableBuilder(column: $table.urlPdf, builder: (column) => column);

  GeneratedColumn<int> get totalActividades => $composableBuilder(
    column: $table.totalActividades,
    builder: (column) => column,
  );

  GeneratedColumn<int> get totalMediciones => $composableBuilder(
    column: $table.totalMediciones,
    builder: (column) => column,
  );

  GeneratedColumn<int> get totalEvidencias => $composableBuilder(
    column: $table.totalEvidencias,
    builder: (column) => column,
  );

  GeneratedColumn<int> get totalFirmas => $composableBuilder(
    column: $table.totalFirmas,
    builder: (column) => column,
  );

  GeneratedColumn<int> get actividadesBuenas => $composableBuilder(
    column: $table.actividadesBuenas,
    builder: (column) => column,
  );

  GeneratedColumn<int> get actividadesMalas => $composableBuilder(
    column: $table.actividadesMalas,
    builder: (column) => column,
  );

  GeneratedColumn<int> get actividadesCorregidas => $composableBuilder(
    column: $table.actividadesCorregidas,
    builder: (column) => column,
  );

  GeneratedColumn<int> get actividadesNA => $composableBuilder(
    column: $table.actividadesNA,
    builder: (column) => column,
  );

  GeneratedColumn<int> get medicionesNormales => $composableBuilder(
    column: $table.medicionesNormales,
    builder: (column) => column,
  );

  GeneratedColumn<int> get medicionesAdvertencia => $composableBuilder(
    column: $table.medicionesAdvertencia,
    builder: (column) => column,
  );

  GeneratedColumn<int> get medicionesCriticas => $composableBuilder(
    column: $table.medicionesCriticas,
    builder: (column) => column,
  );

  GeneratedColumn<String> get horaEntradaTexto => $composableBuilder(
    column: $table.horaEntradaTexto,
    builder: (column) => column,
  );

  GeneratedColumn<String> get horaSalidaTexto => $composableBuilder(
    column: $table.horaSalidaTexto,
    builder: (column) => column,
  );

  GeneratedColumn<String> get razonFalla => $composableBuilder(
    column: $table.razonFalla,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get isDirty =>
      $composableBuilder(column: $table.isDirty, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  GeneratedColumn<DateTime> get updatedAt =>
      $composableBuilder(column: $table.updatedAt, builder: (column) => column);

  $$EstadosOrdenTableAnnotationComposer get idEstado {
    final $$EstadosOrdenTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idEstado,
      referencedTable: $db.estadosOrden,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EstadosOrdenTableAnnotationComposer(
            $db: $db,
            $table: $db.estadosOrden,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ClientesTableAnnotationComposer get idCliente {
    final $$ClientesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idCliente,
      referencedTable: $db.clientes,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ClientesTableAnnotationComposer(
            $db: $db,
            $table: $db.clientes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$EquiposTableAnnotationComposer get idEquipo {
    final $$EquiposTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idEquipo,
      referencedTable: $db.equipos,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EquiposTableAnnotationComposer(
            $db: $db,
            $table: $db.equipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$TiposServicioTableAnnotationComposer get idTipoServicio {
    final $$TiposServicioTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idTipoServicio,
      referencedTable: $db.tiposServicio,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$TiposServicioTableAnnotationComposer(
            $db: $db,
            $table: $db.tiposServicio,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  Expression<T> actividadesPlanRefs<T extends Object>(
    Expression<T> Function($$ActividadesPlanTableAnnotationComposer a) f,
  ) {
    final $$ActividadesPlanTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.actividadesPlan,
      getReferencedColumn: (t) => t.idOrden,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ActividadesPlanTableAnnotationComposer(
            $db: $db,
            $table: $db.actividadesPlan,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<T> actividadesEjecutadasRefs<T extends Object>(
    Expression<T> Function($$ActividadesEjecutadasTableAnnotationComposer a) f,
  ) {
    final $$ActividadesEjecutadasTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idLocal,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idOrden,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableAnnotationComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return f(composer);
  }

  Expression<T> medicionesRefs<T extends Object>(
    Expression<T> Function($$MedicionesTableAnnotationComposer a) f,
  ) {
    final $$MedicionesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.mediciones,
      getReferencedColumn: (t) => t.idOrden,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$MedicionesTableAnnotationComposer(
            $db: $db,
            $table: $db.mediciones,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<T> evidenciasRefs<T extends Object>(
    Expression<T> Function($$EvidenciasTableAnnotationComposer a) f,
  ) {
    final $$EvidenciasTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.evidencias,
      getReferencedColumn: (t) => t.idOrden,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EvidenciasTableAnnotationComposer(
            $db: $db,
            $table: $db.evidencias,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<T> firmasRefs<T extends Object>(
    Expression<T> Function($$FirmasTableAnnotationComposer a) f,
  ) {
    final $$FirmasTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.firmas,
      getReferencedColumn: (t) => t.idOrden,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$FirmasTableAnnotationComposer(
            $db: $db,
            $table: $db.firmas,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$OrdenesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OrdenesTable,
          Ordene,
          $$OrdenesTableFilterComposer,
          $$OrdenesTableOrderingComposer,
          $$OrdenesTableAnnotationComposer,
          $$OrdenesTableCreateCompanionBuilder,
          $$OrdenesTableUpdateCompanionBuilder,
          (Ordene, $$OrdenesTableReferences),
          Ordene,
          PrefetchHooks Function({
            bool idEstado,
            bool idCliente,
            bool idEquipo,
            bool idTipoServicio,
            bool actividadesPlanRefs,
            bool actividadesEjecutadasRefs,
            bool medicionesRefs,
            bool evidenciasRefs,
            bool firmasRefs,
          })
        > {
  $$OrdenesTableTableManager(_$AppDatabase db, $OrdenesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OrdenesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$OrdenesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$OrdenesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int?> idBackend = const Value.absent(),
                Value<String> numeroOrden = const Value.absent(),
                Value<int> version = const Value.absent(),
                Value<int> idEstado = const Value.absent(),
                Value<int> idCliente = const Value.absent(),
                Value<int> idEquipo = const Value.absent(),
                Value<int> idTipoServicio = const Value.absent(),
                Value<String> prioridad = const Value.absent(),
                Value<DateTime?> fechaProgramada = const Value.absent(),
                Value<DateTime?> fechaInicio = const Value.absent(),
                Value<DateTime?> fechaFin = const Value.absent(),
                Value<String?> descripcionInicial = const Value.absent(),
                Value<String?> trabajoRealizado = const Value.absent(),
                Value<String?> observacionesTecnico = const Value.absent(),
                Value<String?> urlPdf = const Value.absent(),
                Value<int> totalActividades = const Value.absent(),
                Value<int> totalMediciones = const Value.absent(),
                Value<int> totalEvidencias = const Value.absent(),
                Value<int> totalFirmas = const Value.absent(),
                Value<int> actividadesBuenas = const Value.absent(),
                Value<int> actividadesMalas = const Value.absent(),
                Value<int> actividadesCorregidas = const Value.absent(),
                Value<int> actividadesNA = const Value.absent(),
                Value<int> medicionesNormales = const Value.absent(),
                Value<int> medicionesAdvertencia = const Value.absent(),
                Value<int> medicionesCriticas = const Value.absent(),
                Value<String?> horaEntradaTexto = const Value.absent(),
                Value<String?> horaSalidaTexto = const Value.absent(),
                Value<String?> razonFalla = const Value.absent(),
                Value<bool> isDirty = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
              }) => OrdenesCompanion(
                idLocal: idLocal,
                idBackend: idBackend,
                numeroOrden: numeroOrden,
                version: version,
                idEstado: idEstado,
                idCliente: idCliente,
                idEquipo: idEquipo,
                idTipoServicio: idTipoServicio,
                prioridad: prioridad,
                fechaProgramada: fechaProgramada,
                fechaInicio: fechaInicio,
                fechaFin: fechaFin,
                descripcionInicial: descripcionInicial,
                trabajoRealizado: trabajoRealizado,
                observacionesTecnico: observacionesTecnico,
                urlPdf: urlPdf,
                totalActividades: totalActividades,
                totalMediciones: totalMediciones,
                totalEvidencias: totalEvidencias,
                totalFirmas: totalFirmas,
                actividadesBuenas: actividadesBuenas,
                actividadesMalas: actividadesMalas,
                actividadesCorregidas: actividadesCorregidas,
                actividadesNA: actividadesNA,
                medicionesNormales: medicionesNormales,
                medicionesAdvertencia: medicionesAdvertencia,
                medicionesCriticas: medicionesCriticas,
                horaEntradaTexto: horaEntradaTexto,
                horaSalidaTexto: horaSalidaTexto,
                razonFalla: razonFalla,
                isDirty: isDirty,
                lastSyncedAt: lastSyncedAt,
                createdAt: createdAt,
                updatedAt: updatedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int?> idBackend = const Value.absent(),
                required String numeroOrden,
                Value<int> version = const Value.absent(),
                required int idEstado,
                required int idCliente,
                required int idEquipo,
                required int idTipoServicio,
                Value<String> prioridad = const Value.absent(),
                Value<DateTime?> fechaProgramada = const Value.absent(),
                Value<DateTime?> fechaInicio = const Value.absent(),
                Value<DateTime?> fechaFin = const Value.absent(),
                Value<String?> descripcionInicial = const Value.absent(),
                Value<String?> trabajoRealizado = const Value.absent(),
                Value<String?> observacionesTecnico = const Value.absent(),
                Value<String?> urlPdf = const Value.absent(),
                Value<int> totalActividades = const Value.absent(),
                Value<int> totalMediciones = const Value.absent(),
                Value<int> totalEvidencias = const Value.absent(),
                Value<int> totalFirmas = const Value.absent(),
                Value<int> actividadesBuenas = const Value.absent(),
                Value<int> actividadesMalas = const Value.absent(),
                Value<int> actividadesCorregidas = const Value.absent(),
                Value<int> actividadesNA = const Value.absent(),
                Value<int> medicionesNormales = const Value.absent(),
                Value<int> medicionesAdvertencia = const Value.absent(),
                Value<int> medicionesCriticas = const Value.absent(),
                Value<String?> horaEntradaTexto = const Value.absent(),
                Value<String?> horaSalidaTexto = const Value.absent(),
                Value<String?> razonFalla = const Value.absent(),
                Value<bool> isDirty = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
                Value<DateTime> updatedAt = const Value.absent(),
              }) => OrdenesCompanion.insert(
                idLocal: idLocal,
                idBackend: idBackend,
                numeroOrden: numeroOrden,
                version: version,
                idEstado: idEstado,
                idCliente: idCliente,
                idEquipo: idEquipo,
                idTipoServicio: idTipoServicio,
                prioridad: prioridad,
                fechaProgramada: fechaProgramada,
                fechaInicio: fechaInicio,
                fechaFin: fechaFin,
                descripcionInicial: descripcionInicial,
                trabajoRealizado: trabajoRealizado,
                observacionesTecnico: observacionesTecnico,
                urlPdf: urlPdf,
                totalActividades: totalActividades,
                totalMediciones: totalMediciones,
                totalEvidencias: totalEvidencias,
                totalFirmas: totalFirmas,
                actividadesBuenas: actividadesBuenas,
                actividadesMalas: actividadesMalas,
                actividadesCorregidas: actividadesCorregidas,
                actividadesNA: actividadesNA,
                medicionesNormales: medicionesNormales,
                medicionesAdvertencia: medicionesAdvertencia,
                medicionesCriticas: medicionesCriticas,
                horaEntradaTexto: horaEntradaTexto,
                horaSalidaTexto: horaSalidaTexto,
                razonFalla: razonFalla,
                isDirty: isDirty,
                lastSyncedAt: lastSyncedAt,
                createdAt: createdAt,
                updatedAt: updatedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$OrdenesTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback:
              ({
                idEstado = false,
                idCliente = false,
                idEquipo = false,
                idTipoServicio = false,
                actividadesPlanRefs = false,
                actividadesEjecutadasRefs = false,
                medicionesRefs = false,
                evidenciasRefs = false,
                firmasRefs = false,
              }) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [
                    if (actividadesPlanRefs) db.actividadesPlan,
                    if (actividadesEjecutadasRefs) db.actividadesEjecutadas,
                    if (medicionesRefs) db.mediciones,
                    if (evidenciasRefs) db.evidencias,
                    if (firmasRefs) db.firmas,
                  ],
                  addJoins:
                      <
                        T extends TableManagerState<
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic
                        >
                      >(state) {
                        if (idEstado) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idEstado,
                                    referencedTable: $$OrdenesTableReferences
                                        ._idEstadoTable(db),
                                    referencedColumn: $$OrdenesTableReferences
                                        ._idEstadoTable(db)
                                        .id,
                                  )
                                  as T;
                        }
                        if (idCliente) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idCliente,
                                    referencedTable: $$OrdenesTableReferences
                                        ._idClienteTable(db),
                                    referencedColumn: $$OrdenesTableReferences
                                        ._idClienteTable(db)
                                        .id,
                                  )
                                  as T;
                        }
                        if (idEquipo) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idEquipo,
                                    referencedTable: $$OrdenesTableReferences
                                        ._idEquipoTable(db),
                                    referencedColumn: $$OrdenesTableReferences
                                        ._idEquipoTable(db)
                                        .id,
                                  )
                                  as T;
                        }
                        if (idTipoServicio) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idTipoServicio,
                                    referencedTable: $$OrdenesTableReferences
                                        ._idTipoServicioTable(db),
                                    referencedColumn: $$OrdenesTableReferences
                                        ._idTipoServicioTable(db)
                                        .id,
                                  )
                                  as T;
                        }

                        return state;
                      },
                  getPrefetchedDataCallback: (items) async {
                    return [
                      if (actividadesPlanRefs)
                        await $_getPrefetchedData<
                          Ordene,
                          $OrdenesTable,
                          ActividadesPlanData
                        >(
                          currentTable: table,
                          referencedTable: $$OrdenesTableReferences
                              ._actividadesPlanRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$OrdenesTableReferences(
                                db,
                                table,
                                p0,
                              ).actividadesPlanRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idOrden == item.idLocal,
                              ),
                          typedResults: items,
                        ),
                      if (actividadesEjecutadasRefs)
                        await $_getPrefetchedData<
                          Ordene,
                          $OrdenesTable,
                          ActividadesEjecutada
                        >(
                          currentTable: table,
                          referencedTable: $$OrdenesTableReferences
                              ._actividadesEjecutadasRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$OrdenesTableReferences(
                                db,
                                table,
                                p0,
                              ).actividadesEjecutadasRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idOrden == item.idLocal,
                              ),
                          typedResults: items,
                        ),
                      if (medicionesRefs)
                        await $_getPrefetchedData<
                          Ordene,
                          $OrdenesTable,
                          Medicione
                        >(
                          currentTable: table,
                          referencedTable: $$OrdenesTableReferences
                              ._medicionesRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$OrdenesTableReferences(
                                db,
                                table,
                                p0,
                              ).medicionesRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idOrden == item.idLocal,
                              ),
                          typedResults: items,
                        ),
                      if (evidenciasRefs)
                        await $_getPrefetchedData<
                          Ordene,
                          $OrdenesTable,
                          Evidencia
                        >(
                          currentTable: table,
                          referencedTable: $$OrdenesTableReferences
                              ._evidenciasRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$OrdenesTableReferences(
                                db,
                                table,
                                p0,
                              ).evidenciasRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idOrden == item.idLocal,
                              ),
                          typedResults: items,
                        ),
                      if (firmasRefs)
                        await $_getPrefetchedData<Ordene, $OrdenesTable, Firma>(
                          currentTable: table,
                          referencedTable: $$OrdenesTableReferences
                              ._firmasRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$OrdenesTableReferences(
                                db,
                                table,
                                p0,
                              ).firmasRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idOrden == item.idLocal,
                              ),
                          typedResults: items,
                        ),
                    ];
                  },
                );
              },
        ),
      );
}

typedef $$OrdenesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OrdenesTable,
      Ordene,
      $$OrdenesTableFilterComposer,
      $$OrdenesTableOrderingComposer,
      $$OrdenesTableAnnotationComposer,
      $$OrdenesTableCreateCompanionBuilder,
      $$OrdenesTableUpdateCompanionBuilder,
      (Ordene, $$OrdenesTableReferences),
      Ordene,
      PrefetchHooks Function({
        bool idEstado,
        bool idCliente,
        bool idEquipo,
        bool idTipoServicio,
        bool actividadesPlanRefs,
        bool actividadesEjecutadasRefs,
        bool medicionesRefs,
        bool evidenciasRefs,
        bool firmasRefs,
      })
    >;
typedef $$ActividadesPlanTableCreateCompanionBuilder =
    ActividadesPlanCompanion Function({
      Value<int> idLocal,
      required int idOrden,
      required int idActividadCatalogo,
      Value<int> ordenSecuencia,
      Value<String> origen,
      Value<bool> esObligatoria,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$ActividadesPlanTableUpdateCompanionBuilder =
    ActividadesPlanCompanion Function({
      Value<int> idLocal,
      Value<int> idOrden,
      Value<int> idActividadCatalogo,
      Value<int> ordenSecuencia,
      Value<String> origen,
      Value<bool> esObligatoria,
      Value<DateTime?> lastSyncedAt,
    });

final class $$ActividadesPlanTableReferences
    extends
        BaseReferences<
          _$AppDatabase,
          $ActividadesPlanTable,
          ActividadesPlanData
        > {
  $$ActividadesPlanTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $OrdenesTable _idOrdenTable(_$AppDatabase db) =>
      db.ordenes.createAlias(
        $_aliasNameGenerator(db.actividadesPlan.idOrden, db.ordenes.idLocal),
      );

  $$OrdenesTableProcessedTableManager get idOrden {
    final $_column = $_itemColumn<int>('id_orden')!;

    final manager = $$OrdenesTableTableManager(
      $_db,
      $_db.ordenes,
    ).filter((f) => f.idLocal.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idOrdenTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $ActividadesCatalogoTable _idActividadCatalogoTable(
    _$AppDatabase db,
  ) => db.actividadesCatalogo.createAlias(
    $_aliasNameGenerator(
      db.actividadesPlan.idActividadCatalogo,
      db.actividadesCatalogo.id,
    ),
  );

  $$ActividadesCatalogoTableProcessedTableManager get idActividadCatalogo {
    final $_column = $_itemColumn<int>('id_actividad_catalogo')!;

    final manager = $$ActividadesCatalogoTableTableManager(
      $_db,
      $_db.actividadesCatalogo,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idActividadCatalogoTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$ActividadesPlanTableFilterComposer
    extends Composer<_$AppDatabase, $ActividadesPlanTable> {
  $$ActividadesPlanTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get ordenSecuencia => $composableBuilder(
    column: $table.ordenSecuencia,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get origen => $composableBuilder(
    column: $table.origen,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get esObligatoria => $composableBuilder(
    column: $table.esObligatoria,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  $$OrdenesTableFilterComposer get idOrden {
    final $$OrdenesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableFilterComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesCatalogoTableFilterComposer get idActividadCatalogo {
    final $$ActividadesCatalogoTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idActividadCatalogo,
      referencedTable: $db.actividadesCatalogo,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ActividadesCatalogoTableFilterComposer(
            $db: $db,
            $table: $db.actividadesCatalogo,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$ActividadesPlanTableOrderingComposer
    extends Composer<_$AppDatabase, $ActividadesPlanTable> {
  $$ActividadesPlanTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get ordenSecuencia => $composableBuilder(
    column: $table.ordenSecuencia,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get origen => $composableBuilder(
    column: $table.origen,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get esObligatoria => $composableBuilder(
    column: $table.esObligatoria,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );

  $$OrdenesTableOrderingComposer get idOrden {
    final $$OrdenesTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableOrderingComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesCatalogoTableOrderingComposer get idActividadCatalogo {
    final $$ActividadesCatalogoTableOrderingComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idActividadCatalogo,
          referencedTable: $db.actividadesCatalogo,
          getReferencedColumn: (t) => t.id,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesCatalogoTableOrderingComposer(
                $db: $db,
                $table: $db.actividadesCatalogo,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }
}

class $$ActividadesPlanTableAnnotationComposer
    extends Composer<_$AppDatabase, $ActividadesPlanTable> {
  $$ActividadesPlanTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get idLocal =>
      $composableBuilder(column: $table.idLocal, builder: (column) => column);

  GeneratedColumn<int> get ordenSecuencia => $composableBuilder(
    column: $table.ordenSecuencia,
    builder: (column) => column,
  );

  GeneratedColumn<String> get origen =>
      $composableBuilder(column: $table.origen, builder: (column) => column);

  GeneratedColumn<bool> get esObligatoria => $composableBuilder(
    column: $table.esObligatoria,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  $$OrdenesTableAnnotationComposer get idOrden {
    final $$OrdenesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesCatalogoTableAnnotationComposer get idActividadCatalogo {
    final $$ActividadesCatalogoTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idActividadCatalogo,
          referencedTable: $db.actividadesCatalogo,
          getReferencedColumn: (t) => t.id,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesCatalogoTableAnnotationComposer(
                $db: $db,
                $table: $db.actividadesCatalogo,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }
}

class $$ActividadesPlanTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ActividadesPlanTable,
          ActividadesPlanData,
          $$ActividadesPlanTableFilterComposer,
          $$ActividadesPlanTableOrderingComposer,
          $$ActividadesPlanTableAnnotationComposer,
          $$ActividadesPlanTableCreateCompanionBuilder,
          $$ActividadesPlanTableUpdateCompanionBuilder,
          (ActividadesPlanData, $$ActividadesPlanTableReferences),
          ActividadesPlanData,
          PrefetchHooks Function({bool idOrden, bool idActividadCatalogo})
        > {
  $$ActividadesPlanTableTableManager(
    _$AppDatabase db,
    $ActividadesPlanTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ActividadesPlanTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$ActividadesPlanTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$ActividadesPlanTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int> idOrden = const Value.absent(),
                Value<int> idActividadCatalogo = const Value.absent(),
                Value<int> ordenSecuencia = const Value.absent(),
                Value<String> origen = const Value.absent(),
                Value<bool> esObligatoria = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => ActividadesPlanCompanion(
                idLocal: idLocal,
                idOrden: idOrden,
                idActividadCatalogo: idActividadCatalogo,
                ordenSecuencia: ordenSecuencia,
                origen: origen,
                esObligatoria: esObligatoria,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                required int idOrden,
                required int idActividadCatalogo,
                Value<int> ordenSecuencia = const Value.absent(),
                Value<String> origen = const Value.absent(),
                Value<bool> esObligatoria = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => ActividadesPlanCompanion.insert(
                idLocal: idLocal,
                idOrden: idOrden,
                idActividadCatalogo: idActividadCatalogo,
                ordenSecuencia: ordenSecuencia,
                origen: origen,
                esObligatoria: esObligatoria,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$ActividadesPlanTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback:
              ({idOrden = false, idActividadCatalogo = false}) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [],
                  addJoins:
                      <
                        T extends TableManagerState<
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic
                        >
                      >(state) {
                        if (idOrden) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idOrden,
                                    referencedTable:
                                        $$ActividadesPlanTableReferences
                                            ._idOrdenTable(db),
                                    referencedColumn:
                                        $$ActividadesPlanTableReferences
                                            ._idOrdenTable(db)
                                            .idLocal,
                                  )
                                  as T;
                        }
                        if (idActividadCatalogo) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idActividadCatalogo,
                                    referencedTable:
                                        $$ActividadesPlanTableReferences
                                            ._idActividadCatalogoTable(db),
                                    referencedColumn:
                                        $$ActividadesPlanTableReferences
                                            ._idActividadCatalogoTable(db)
                                            .id,
                                  )
                                  as T;
                        }

                        return state;
                      },
                  getPrefetchedDataCallback: (items) async {
                    return [];
                  },
                );
              },
        ),
      );
}

typedef $$ActividadesPlanTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ActividadesPlanTable,
      ActividadesPlanData,
      $$ActividadesPlanTableFilterComposer,
      $$ActividadesPlanTableOrderingComposer,
      $$ActividadesPlanTableAnnotationComposer,
      $$ActividadesPlanTableCreateCompanionBuilder,
      $$ActividadesPlanTableUpdateCompanionBuilder,
      (ActividadesPlanData, $$ActividadesPlanTableReferences),
      ActividadesPlanData,
      PrefetchHooks Function({bool idOrden, bool idActividadCatalogo})
    >;
typedef $$ActividadesEjecutadasTableCreateCompanionBuilder =
    ActividadesEjecutadasCompanion Function({
      Value<int> idLocal,
      Value<int?> idBackend,
      required int idOrden,
      required int idActividadCatalogo,
      Value<int?> idOrdenEquipo,
      required String descripcion,
      Value<String?> sistema,
      required String tipoActividad,
      Value<int?> idParametroMedicion,
      Value<int> ordenEjecucion,
      Value<String?> simbologia,
      Value<bool> completada,
      Value<String?> observacion,
      Value<String?> observacionTecnico,
      Value<DateTime?> fechaEjecucion,
      Value<bool> isDirty,
      Value<DateTime?> lastSyncedAt,
      Value<DateTime> createdAt,
    });
typedef $$ActividadesEjecutadasTableUpdateCompanionBuilder =
    ActividadesEjecutadasCompanion Function({
      Value<int> idLocal,
      Value<int?> idBackend,
      Value<int> idOrden,
      Value<int> idActividadCatalogo,
      Value<int?> idOrdenEquipo,
      Value<String> descripcion,
      Value<String?> sistema,
      Value<String> tipoActividad,
      Value<int?> idParametroMedicion,
      Value<int> ordenEjecucion,
      Value<String?> simbologia,
      Value<bool> completada,
      Value<String?> observacion,
      Value<String?> observacionTecnico,
      Value<DateTime?> fechaEjecucion,
      Value<bool> isDirty,
      Value<DateTime?> lastSyncedAt,
      Value<DateTime> createdAt,
    });

final class $$ActividadesEjecutadasTableReferences
    extends
        BaseReferences<
          _$AppDatabase,
          $ActividadesEjecutadasTable,
          ActividadesEjecutada
        > {
  $$ActividadesEjecutadasTableReferences(
    super.$_db,
    super.$_table,
    super.$_typedResult,
  );

  static $OrdenesTable _idOrdenTable(_$AppDatabase db) =>
      db.ordenes.createAlias(
        $_aliasNameGenerator(
          db.actividadesEjecutadas.idOrden,
          db.ordenes.idLocal,
        ),
      );

  $$OrdenesTableProcessedTableManager get idOrden {
    final $_column = $_itemColumn<int>('id_orden')!;

    final manager = $$OrdenesTableTableManager(
      $_db,
      $_db.ordenes,
    ).filter((f) => f.idLocal.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idOrdenTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $ActividadesCatalogoTable _idActividadCatalogoTable(
    _$AppDatabase db,
  ) => db.actividadesCatalogo.createAlias(
    $_aliasNameGenerator(
      db.actividadesEjecutadas.idActividadCatalogo,
      db.actividadesCatalogo.id,
    ),
  );

  $$ActividadesCatalogoTableProcessedTableManager get idActividadCatalogo {
    final $_column = $_itemColumn<int>('id_actividad_catalogo')!;

    final manager = $$ActividadesCatalogoTableTableManager(
      $_db,
      $_db.actividadesCatalogo,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idActividadCatalogoTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $OrdenesEquiposTable _idOrdenEquipoTable(_$AppDatabase db) =>
      db.ordenesEquipos.createAlias(
        $_aliasNameGenerator(
          db.actividadesEjecutadas.idOrdenEquipo,
          db.ordenesEquipos.idOrdenEquipo,
        ),
      );

  $$OrdenesEquiposTableProcessedTableManager? get idOrdenEquipo {
    final $_column = $_itemColumn<int>('id_orden_equipo');
    if ($_column == null) return null;
    final manager = $$OrdenesEquiposTableTableManager(
      $_db,
      $_db.ordenesEquipos,
    ).filter((f) => f.idOrdenEquipo.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idOrdenEquipoTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static MultiTypedResultKey<$MedicionesTable, List<Medicione>>
  _medicionesRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.mediciones,
    aliasName: $_aliasNameGenerator(
      db.actividadesEjecutadas.idLocal,
      db.mediciones.idActividadEjecutada,
    ),
  );

  $$MedicionesTableProcessedTableManager get medicionesRefs {
    final manager = $$MedicionesTableTableManager($_db, $_db.mediciones).filter(
      (f) => f.idActividadEjecutada.idLocal.sqlEquals(
        $_itemColumn<int>('id_local')!,
      ),
    );

    final cache = $_typedResult.readTableOrNull(_medicionesRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }

  static MultiTypedResultKey<$EvidenciasTable, List<Evidencia>>
  _evidenciasRefsTable(_$AppDatabase db) => MultiTypedResultKey.fromTable(
    db.evidencias,
    aliasName: $_aliasNameGenerator(
      db.actividadesEjecutadas.idLocal,
      db.evidencias.idActividadEjecutada,
    ),
  );

  $$EvidenciasTableProcessedTableManager get evidenciasRefs {
    final manager = $$EvidenciasTableTableManager($_db, $_db.evidencias).filter(
      (f) => f.idActividadEjecutada.idLocal.sqlEquals(
        $_itemColumn<int>('id_local')!,
      ),
    );

    final cache = $_typedResult.readTableOrNull(_evidenciasRefsTable($_db));
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: cache),
    );
  }
}

class $$ActividadesEjecutadasTableFilterComposer
    extends Composer<_$AppDatabase, $ActividadesEjecutadasTable> {
  $$ActividadesEjecutadasTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get idBackend => $composableBuilder(
    column: $table.idBackend,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get sistema => $composableBuilder(
    column: $table.sistema,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tipoActividad => $composableBuilder(
    column: $table.tipoActividad,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get idParametroMedicion => $composableBuilder(
    column: $table.idParametroMedicion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get ordenEjecucion => $composableBuilder(
    column: $table.ordenEjecucion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get simbologia => $composableBuilder(
    column: $table.simbologia,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get completada => $composableBuilder(
    column: $table.completada,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get observacion => $composableBuilder(
    column: $table.observacion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get observacionTecnico => $composableBuilder(
    column: $table.observacionTecnico,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaEjecucion => $composableBuilder(
    column: $table.fechaEjecucion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get isDirty => $composableBuilder(
    column: $table.isDirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnFilters(column),
  );

  $$OrdenesTableFilterComposer get idOrden {
    final $$OrdenesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableFilterComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesCatalogoTableFilterComposer get idActividadCatalogo {
    final $$ActividadesCatalogoTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idActividadCatalogo,
      referencedTable: $db.actividadesCatalogo,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ActividadesCatalogoTableFilterComposer(
            $db: $db,
            $table: $db.actividadesCatalogo,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$OrdenesEquiposTableFilterComposer get idOrdenEquipo {
    final $$OrdenesEquiposTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.ordenesEquipos,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesEquiposTableFilterComposer(
            $db: $db,
            $table: $db.ordenesEquipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  Expression<bool> medicionesRefs(
    Expression<bool> Function($$MedicionesTableFilterComposer f) f,
  ) {
    final $$MedicionesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.mediciones,
      getReferencedColumn: (t) => t.idActividadEjecutada,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$MedicionesTableFilterComposer(
            $db: $db,
            $table: $db.mediciones,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<bool> evidenciasRefs(
    Expression<bool> Function($$EvidenciasTableFilterComposer f) f,
  ) {
    final $$EvidenciasTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.evidencias,
      getReferencedColumn: (t) => t.idActividadEjecutada,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EvidenciasTableFilterComposer(
            $db: $db,
            $table: $db.evidencias,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$ActividadesEjecutadasTableOrderingComposer
    extends Composer<_$AppDatabase, $ActividadesEjecutadasTable> {
  $$ActividadesEjecutadasTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get idBackend => $composableBuilder(
    column: $table.idBackend,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get sistema => $composableBuilder(
    column: $table.sistema,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tipoActividad => $composableBuilder(
    column: $table.tipoActividad,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get idParametroMedicion => $composableBuilder(
    column: $table.idParametroMedicion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get ordenEjecucion => $composableBuilder(
    column: $table.ordenEjecucion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get simbologia => $composableBuilder(
    column: $table.simbologia,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get completada => $composableBuilder(
    column: $table.completada,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get observacion => $composableBuilder(
    column: $table.observacion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get observacionTecnico => $composableBuilder(
    column: $table.observacionTecnico,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaEjecucion => $composableBuilder(
    column: $table.fechaEjecucion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get isDirty => $composableBuilder(
    column: $table.isDirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get createdAt => $composableBuilder(
    column: $table.createdAt,
    builder: (column) => ColumnOrderings(column),
  );

  $$OrdenesTableOrderingComposer get idOrden {
    final $$OrdenesTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableOrderingComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesCatalogoTableOrderingComposer get idActividadCatalogo {
    final $$ActividadesCatalogoTableOrderingComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idActividadCatalogo,
          referencedTable: $db.actividadesCatalogo,
          getReferencedColumn: (t) => t.id,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesCatalogoTableOrderingComposer(
                $db: $db,
                $table: $db.actividadesCatalogo,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }

  $$OrdenesEquiposTableOrderingComposer get idOrdenEquipo {
    final $$OrdenesEquiposTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.ordenesEquipos,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesEquiposTableOrderingComposer(
            $db: $db,
            $table: $db.ordenesEquipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$ActividadesEjecutadasTableAnnotationComposer
    extends Composer<_$AppDatabase, $ActividadesEjecutadasTable> {
  $$ActividadesEjecutadasTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get idLocal =>
      $composableBuilder(column: $table.idLocal, builder: (column) => column);

  GeneratedColumn<int> get idBackend =>
      $composableBuilder(column: $table.idBackend, builder: (column) => column);

  GeneratedColumn<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => column,
  );

  GeneratedColumn<String> get sistema =>
      $composableBuilder(column: $table.sistema, builder: (column) => column);

  GeneratedColumn<String> get tipoActividad => $composableBuilder(
    column: $table.tipoActividad,
    builder: (column) => column,
  );

  GeneratedColumn<int> get idParametroMedicion => $composableBuilder(
    column: $table.idParametroMedicion,
    builder: (column) => column,
  );

  GeneratedColumn<int> get ordenEjecucion => $composableBuilder(
    column: $table.ordenEjecucion,
    builder: (column) => column,
  );

  GeneratedColumn<String> get simbologia => $composableBuilder(
    column: $table.simbologia,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get completada => $composableBuilder(
    column: $table.completada,
    builder: (column) => column,
  );

  GeneratedColumn<String> get observacion => $composableBuilder(
    column: $table.observacion,
    builder: (column) => column,
  );

  GeneratedColumn<String> get observacionTecnico => $composableBuilder(
    column: $table.observacionTecnico,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get fechaEjecucion => $composableBuilder(
    column: $table.fechaEjecucion,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get isDirty =>
      $composableBuilder(column: $table.isDirty, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get createdAt =>
      $composableBuilder(column: $table.createdAt, builder: (column) => column);

  $$OrdenesTableAnnotationComposer get idOrden {
    final $$OrdenesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesCatalogoTableAnnotationComposer get idActividadCatalogo {
    final $$ActividadesCatalogoTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idActividadCatalogo,
          referencedTable: $db.actividadesCatalogo,
          getReferencedColumn: (t) => t.id,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesCatalogoTableAnnotationComposer(
                $db: $db,
                $table: $db.actividadesCatalogo,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }

  $$OrdenesEquiposTableAnnotationComposer get idOrdenEquipo {
    final $$OrdenesEquiposTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.ordenesEquipos,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesEquiposTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenesEquipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  Expression<T> medicionesRefs<T extends Object>(
    Expression<T> Function($$MedicionesTableAnnotationComposer a) f,
  ) {
    final $$MedicionesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.mediciones,
      getReferencedColumn: (t) => t.idActividadEjecutada,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$MedicionesTableAnnotationComposer(
            $db: $db,
            $table: $db.mediciones,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }

  Expression<T> evidenciasRefs<T extends Object>(
    Expression<T> Function($$EvidenciasTableAnnotationComposer a) f,
  ) {
    final $$EvidenciasTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idLocal,
      referencedTable: $db.evidencias,
      getReferencedColumn: (t) => t.idActividadEjecutada,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$EvidenciasTableAnnotationComposer(
            $db: $db,
            $table: $db.evidencias,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return f(composer);
  }
}

class $$ActividadesEjecutadasTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $ActividadesEjecutadasTable,
          ActividadesEjecutada,
          $$ActividadesEjecutadasTableFilterComposer,
          $$ActividadesEjecutadasTableOrderingComposer,
          $$ActividadesEjecutadasTableAnnotationComposer,
          $$ActividadesEjecutadasTableCreateCompanionBuilder,
          $$ActividadesEjecutadasTableUpdateCompanionBuilder,
          (ActividadesEjecutada, $$ActividadesEjecutadasTableReferences),
          ActividadesEjecutada,
          PrefetchHooks Function({
            bool idOrden,
            bool idActividadCatalogo,
            bool idOrdenEquipo,
            bool medicionesRefs,
            bool evidenciasRefs,
          })
        > {
  $$ActividadesEjecutadasTableTableManager(
    _$AppDatabase db,
    $ActividadesEjecutadasTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$ActividadesEjecutadasTableFilterComposer(
                $db: db,
                $table: table,
              ),
          createOrderingComposer: () =>
              $$ActividadesEjecutadasTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer: () =>
              $$ActividadesEjecutadasTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int?> idBackend = const Value.absent(),
                Value<int> idOrden = const Value.absent(),
                Value<int> idActividadCatalogo = const Value.absent(),
                Value<int?> idOrdenEquipo = const Value.absent(),
                Value<String> descripcion = const Value.absent(),
                Value<String?> sistema = const Value.absent(),
                Value<String> tipoActividad = const Value.absent(),
                Value<int?> idParametroMedicion = const Value.absent(),
                Value<int> ordenEjecucion = const Value.absent(),
                Value<String?> simbologia = const Value.absent(),
                Value<bool> completada = const Value.absent(),
                Value<String?> observacion = const Value.absent(),
                Value<String?> observacionTecnico = const Value.absent(),
                Value<DateTime?> fechaEjecucion = const Value.absent(),
                Value<bool> isDirty = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
              }) => ActividadesEjecutadasCompanion(
                idLocal: idLocal,
                idBackend: idBackend,
                idOrden: idOrden,
                idActividadCatalogo: idActividadCatalogo,
                idOrdenEquipo: idOrdenEquipo,
                descripcion: descripcion,
                sistema: sistema,
                tipoActividad: tipoActividad,
                idParametroMedicion: idParametroMedicion,
                ordenEjecucion: ordenEjecucion,
                simbologia: simbologia,
                completada: completada,
                observacion: observacion,
                observacionTecnico: observacionTecnico,
                fechaEjecucion: fechaEjecucion,
                isDirty: isDirty,
                lastSyncedAt: lastSyncedAt,
                createdAt: createdAt,
              ),
          createCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int?> idBackend = const Value.absent(),
                required int idOrden,
                required int idActividadCatalogo,
                Value<int?> idOrdenEquipo = const Value.absent(),
                required String descripcion,
                Value<String?> sistema = const Value.absent(),
                required String tipoActividad,
                Value<int?> idParametroMedicion = const Value.absent(),
                Value<int> ordenEjecucion = const Value.absent(),
                Value<String?> simbologia = const Value.absent(),
                Value<bool> completada = const Value.absent(),
                Value<String?> observacion = const Value.absent(),
                Value<String?> observacionTecnico = const Value.absent(),
                Value<DateTime?> fechaEjecucion = const Value.absent(),
                Value<bool> isDirty = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
                Value<DateTime> createdAt = const Value.absent(),
              }) => ActividadesEjecutadasCompanion.insert(
                idLocal: idLocal,
                idBackend: idBackend,
                idOrden: idOrden,
                idActividadCatalogo: idActividadCatalogo,
                idOrdenEquipo: idOrdenEquipo,
                descripcion: descripcion,
                sistema: sistema,
                tipoActividad: tipoActividad,
                idParametroMedicion: idParametroMedicion,
                ordenEjecucion: ordenEjecucion,
                simbologia: simbologia,
                completada: completada,
                observacion: observacion,
                observacionTecnico: observacionTecnico,
                fechaEjecucion: fechaEjecucion,
                isDirty: isDirty,
                lastSyncedAt: lastSyncedAt,
                createdAt: createdAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$ActividadesEjecutadasTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback:
              ({
                idOrden = false,
                idActividadCatalogo = false,
                idOrdenEquipo = false,
                medicionesRefs = false,
                evidenciasRefs = false,
              }) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [
                    if (medicionesRefs) db.mediciones,
                    if (evidenciasRefs) db.evidencias,
                  ],
                  addJoins:
                      <
                        T extends TableManagerState<
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic
                        >
                      >(state) {
                        if (idOrden) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idOrden,
                                    referencedTable:
                                        $$ActividadesEjecutadasTableReferences
                                            ._idOrdenTable(db),
                                    referencedColumn:
                                        $$ActividadesEjecutadasTableReferences
                                            ._idOrdenTable(db)
                                            .idLocal,
                                  )
                                  as T;
                        }
                        if (idActividadCatalogo) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idActividadCatalogo,
                                    referencedTable:
                                        $$ActividadesEjecutadasTableReferences
                                            ._idActividadCatalogoTable(db),
                                    referencedColumn:
                                        $$ActividadesEjecutadasTableReferences
                                            ._idActividadCatalogoTable(db)
                                            .id,
                                  )
                                  as T;
                        }
                        if (idOrdenEquipo) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idOrdenEquipo,
                                    referencedTable:
                                        $$ActividadesEjecutadasTableReferences
                                            ._idOrdenEquipoTable(db),
                                    referencedColumn:
                                        $$ActividadesEjecutadasTableReferences
                                            ._idOrdenEquipoTable(db)
                                            .idOrdenEquipo,
                                  )
                                  as T;
                        }

                        return state;
                      },
                  getPrefetchedDataCallback: (items) async {
                    return [
                      if (medicionesRefs)
                        await $_getPrefetchedData<
                          ActividadesEjecutada,
                          $ActividadesEjecutadasTable,
                          Medicione
                        >(
                          currentTable: table,
                          referencedTable:
                              $$ActividadesEjecutadasTableReferences
                                  ._medicionesRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$ActividadesEjecutadasTableReferences(
                                db,
                                table,
                                p0,
                              ).medicionesRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idActividadEjecutada == item.idLocal,
                              ),
                          typedResults: items,
                        ),
                      if (evidenciasRefs)
                        await $_getPrefetchedData<
                          ActividadesEjecutada,
                          $ActividadesEjecutadasTable,
                          Evidencia
                        >(
                          currentTable: table,
                          referencedTable:
                              $$ActividadesEjecutadasTableReferences
                                  ._evidenciasRefsTable(db),
                          managerFromTypedResult: (p0) =>
                              $$ActividadesEjecutadasTableReferences(
                                db,
                                table,
                                p0,
                              ).evidenciasRefs,
                          referencedItemsForCurrentItem:
                              (item, referencedItems) => referencedItems.where(
                                (e) => e.idActividadEjecutada == item.idLocal,
                              ),
                          typedResults: items,
                        ),
                    ];
                  },
                );
              },
        ),
      );
}

typedef $$ActividadesEjecutadasTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $ActividadesEjecutadasTable,
      ActividadesEjecutada,
      $$ActividadesEjecutadasTableFilterComposer,
      $$ActividadesEjecutadasTableOrderingComposer,
      $$ActividadesEjecutadasTableAnnotationComposer,
      $$ActividadesEjecutadasTableCreateCompanionBuilder,
      $$ActividadesEjecutadasTableUpdateCompanionBuilder,
      (ActividadesEjecutada, $$ActividadesEjecutadasTableReferences),
      ActividadesEjecutada,
      PrefetchHooks Function({
        bool idOrden,
        bool idActividadCatalogo,
        bool idOrdenEquipo,
        bool medicionesRefs,
        bool evidenciasRefs,
      })
    >;
typedef $$MedicionesTableCreateCompanionBuilder =
    MedicionesCompanion Function({
      Value<int> idLocal,
      Value<int?> idBackend,
      required int idOrden,
      Value<int?> idActividadEjecutada,
      required int idParametro,
      Value<int?> idOrdenEquipo,
      required String nombreParametro,
      required String unidadMedida,
      Value<double?> rangoMinimoNormal,
      Value<double?> rangoMaximoNormal,
      Value<double?> rangoMinimoCritico,
      Value<double?> rangoMaximoCritico,
      Value<double?> valor,
      Value<String?> estadoValor,
      Value<String?> observacion,
      Value<DateTime?> fechaMedicion,
      Value<bool> isDirty,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$MedicionesTableUpdateCompanionBuilder =
    MedicionesCompanion Function({
      Value<int> idLocal,
      Value<int?> idBackend,
      Value<int> idOrden,
      Value<int?> idActividadEjecutada,
      Value<int> idParametro,
      Value<int?> idOrdenEquipo,
      Value<String> nombreParametro,
      Value<String> unidadMedida,
      Value<double?> rangoMinimoNormal,
      Value<double?> rangoMaximoNormal,
      Value<double?> rangoMinimoCritico,
      Value<double?> rangoMaximoCritico,
      Value<double?> valor,
      Value<String?> estadoValor,
      Value<String?> observacion,
      Value<DateTime?> fechaMedicion,
      Value<bool> isDirty,
      Value<DateTime?> lastSyncedAt,
    });

final class $$MedicionesTableReferences
    extends BaseReferences<_$AppDatabase, $MedicionesTable, Medicione> {
  $$MedicionesTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $OrdenesTable _idOrdenTable(_$AppDatabase db) =>
      db.ordenes.createAlias(
        $_aliasNameGenerator(db.mediciones.idOrden, db.ordenes.idLocal),
      );

  $$OrdenesTableProcessedTableManager get idOrden {
    final $_column = $_itemColumn<int>('id_orden')!;

    final manager = $$OrdenesTableTableManager(
      $_db,
      $_db.ordenes,
    ).filter((f) => f.idLocal.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idOrdenTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $ActividadesEjecutadasTable _idActividadEjecutadaTable(
    _$AppDatabase db,
  ) => db.actividadesEjecutadas.createAlias(
    $_aliasNameGenerator(
      db.mediciones.idActividadEjecutada,
      db.actividadesEjecutadas.idLocal,
    ),
  );

  $$ActividadesEjecutadasTableProcessedTableManager? get idActividadEjecutada {
    final $_column = $_itemColumn<int>('id_actividad_ejecutada');
    if ($_column == null) return null;
    final manager = $$ActividadesEjecutadasTableTableManager(
      $_db,
      $_db.actividadesEjecutadas,
    ).filter((f) => f.idLocal.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(
      _idActividadEjecutadaTable($_db),
    );
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $ParametrosCatalogoTable _idParametroTable(_$AppDatabase db) =>
      db.parametrosCatalogo.createAlias(
        $_aliasNameGenerator(
          db.mediciones.idParametro,
          db.parametrosCatalogo.id,
        ),
      );

  $$ParametrosCatalogoTableProcessedTableManager get idParametro {
    final $_column = $_itemColumn<int>('id_parametro')!;

    final manager = $$ParametrosCatalogoTableTableManager(
      $_db,
      $_db.parametrosCatalogo,
    ).filter((f) => f.id.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idParametroTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $OrdenesEquiposTable _idOrdenEquipoTable(_$AppDatabase db) =>
      db.ordenesEquipos.createAlias(
        $_aliasNameGenerator(
          db.mediciones.idOrdenEquipo,
          db.ordenesEquipos.idOrdenEquipo,
        ),
      );

  $$OrdenesEquiposTableProcessedTableManager? get idOrdenEquipo {
    final $_column = $_itemColumn<int>('id_orden_equipo');
    if ($_column == null) return null;
    final manager = $$OrdenesEquiposTableTableManager(
      $_db,
      $_db.ordenesEquipos,
    ).filter((f) => f.idOrdenEquipo.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idOrdenEquipoTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$MedicionesTableFilterComposer
    extends Composer<_$AppDatabase, $MedicionesTable> {
  $$MedicionesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get idBackend => $composableBuilder(
    column: $table.idBackend,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nombreParametro => $composableBuilder(
    column: $table.nombreParametro,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get unidadMedida => $composableBuilder(
    column: $table.unidadMedida,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get rangoMinimoNormal => $composableBuilder(
    column: $table.rangoMinimoNormal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get rangoMaximoNormal => $composableBuilder(
    column: $table.rangoMaximoNormal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get rangoMinimoCritico => $composableBuilder(
    column: $table.rangoMinimoCritico,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get rangoMaximoCritico => $composableBuilder(
    column: $table.rangoMaximoCritico,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<double> get valor => $composableBuilder(
    column: $table.valor,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get estadoValor => $composableBuilder(
    column: $table.estadoValor,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get observacion => $composableBuilder(
    column: $table.observacion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaMedicion => $composableBuilder(
    column: $table.fechaMedicion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get isDirty => $composableBuilder(
    column: $table.isDirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  $$OrdenesTableFilterComposer get idOrden {
    final $$OrdenesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableFilterComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesEjecutadasTableFilterComposer get idActividadEjecutada {
    final $$ActividadesEjecutadasTableFilterComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idActividadEjecutada,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idLocal,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableFilterComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }

  $$ParametrosCatalogoTableFilterComposer get idParametro {
    final $$ParametrosCatalogoTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idParametro,
      referencedTable: $db.parametrosCatalogo,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ParametrosCatalogoTableFilterComposer(
            $db: $db,
            $table: $db.parametrosCatalogo,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$OrdenesEquiposTableFilterComposer get idOrdenEquipo {
    final $$OrdenesEquiposTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.ordenesEquipos,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesEquiposTableFilterComposer(
            $db: $db,
            $table: $db.ordenesEquipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$MedicionesTableOrderingComposer
    extends Composer<_$AppDatabase, $MedicionesTable> {
  $$MedicionesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get idBackend => $composableBuilder(
    column: $table.idBackend,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nombreParametro => $composableBuilder(
    column: $table.nombreParametro,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get unidadMedida => $composableBuilder(
    column: $table.unidadMedida,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get rangoMinimoNormal => $composableBuilder(
    column: $table.rangoMinimoNormal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get rangoMaximoNormal => $composableBuilder(
    column: $table.rangoMaximoNormal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get rangoMinimoCritico => $composableBuilder(
    column: $table.rangoMinimoCritico,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get rangoMaximoCritico => $composableBuilder(
    column: $table.rangoMaximoCritico,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<double> get valor => $composableBuilder(
    column: $table.valor,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get estadoValor => $composableBuilder(
    column: $table.estadoValor,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get observacion => $composableBuilder(
    column: $table.observacion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaMedicion => $composableBuilder(
    column: $table.fechaMedicion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get isDirty => $composableBuilder(
    column: $table.isDirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );

  $$OrdenesTableOrderingComposer get idOrden {
    final $$OrdenesTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableOrderingComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesEjecutadasTableOrderingComposer get idActividadEjecutada {
    final $$ActividadesEjecutadasTableOrderingComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idActividadEjecutada,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idLocal,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableOrderingComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }

  $$ParametrosCatalogoTableOrderingComposer get idParametro {
    final $$ParametrosCatalogoTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idParametro,
      referencedTable: $db.parametrosCatalogo,
      getReferencedColumn: (t) => t.id,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$ParametrosCatalogoTableOrderingComposer(
            $db: $db,
            $table: $db.parametrosCatalogo,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$OrdenesEquiposTableOrderingComposer get idOrdenEquipo {
    final $$OrdenesEquiposTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.ordenesEquipos,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesEquiposTableOrderingComposer(
            $db: $db,
            $table: $db.ordenesEquipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$MedicionesTableAnnotationComposer
    extends Composer<_$AppDatabase, $MedicionesTable> {
  $$MedicionesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get idLocal =>
      $composableBuilder(column: $table.idLocal, builder: (column) => column);

  GeneratedColumn<int> get idBackend =>
      $composableBuilder(column: $table.idBackend, builder: (column) => column);

  GeneratedColumn<String> get nombreParametro => $composableBuilder(
    column: $table.nombreParametro,
    builder: (column) => column,
  );

  GeneratedColumn<String> get unidadMedida => $composableBuilder(
    column: $table.unidadMedida,
    builder: (column) => column,
  );

  GeneratedColumn<double> get rangoMinimoNormal => $composableBuilder(
    column: $table.rangoMinimoNormal,
    builder: (column) => column,
  );

  GeneratedColumn<double> get rangoMaximoNormal => $composableBuilder(
    column: $table.rangoMaximoNormal,
    builder: (column) => column,
  );

  GeneratedColumn<double> get rangoMinimoCritico => $composableBuilder(
    column: $table.rangoMinimoCritico,
    builder: (column) => column,
  );

  GeneratedColumn<double> get rangoMaximoCritico => $composableBuilder(
    column: $table.rangoMaximoCritico,
    builder: (column) => column,
  );

  GeneratedColumn<double> get valor =>
      $composableBuilder(column: $table.valor, builder: (column) => column);

  GeneratedColumn<String> get estadoValor => $composableBuilder(
    column: $table.estadoValor,
    builder: (column) => column,
  );

  GeneratedColumn<String> get observacion => $composableBuilder(
    column: $table.observacion,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get fechaMedicion => $composableBuilder(
    column: $table.fechaMedicion,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get isDirty =>
      $composableBuilder(column: $table.isDirty, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  $$OrdenesTableAnnotationComposer get idOrden {
    final $$OrdenesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesEjecutadasTableAnnotationComposer get idActividadEjecutada {
    final $$ActividadesEjecutadasTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idActividadEjecutada,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idLocal,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableAnnotationComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }

  $$ParametrosCatalogoTableAnnotationComposer get idParametro {
    final $$ParametrosCatalogoTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idParametro,
          referencedTable: $db.parametrosCatalogo,
          getReferencedColumn: (t) => t.id,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ParametrosCatalogoTableAnnotationComposer(
                $db: $db,
                $table: $db.parametrosCatalogo,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }

  $$OrdenesEquiposTableAnnotationComposer get idOrdenEquipo {
    final $$OrdenesEquiposTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.ordenesEquipos,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesEquiposTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenesEquipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$MedicionesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $MedicionesTable,
          Medicione,
          $$MedicionesTableFilterComposer,
          $$MedicionesTableOrderingComposer,
          $$MedicionesTableAnnotationComposer,
          $$MedicionesTableCreateCompanionBuilder,
          $$MedicionesTableUpdateCompanionBuilder,
          (Medicione, $$MedicionesTableReferences),
          Medicione,
          PrefetchHooks Function({
            bool idOrden,
            bool idActividadEjecutada,
            bool idParametro,
            bool idOrdenEquipo,
          })
        > {
  $$MedicionesTableTableManager(_$AppDatabase db, $MedicionesTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$MedicionesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$MedicionesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$MedicionesTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int?> idBackend = const Value.absent(),
                Value<int> idOrden = const Value.absent(),
                Value<int?> idActividadEjecutada = const Value.absent(),
                Value<int> idParametro = const Value.absent(),
                Value<int?> idOrdenEquipo = const Value.absent(),
                Value<String> nombreParametro = const Value.absent(),
                Value<String> unidadMedida = const Value.absent(),
                Value<double?> rangoMinimoNormal = const Value.absent(),
                Value<double?> rangoMaximoNormal = const Value.absent(),
                Value<double?> rangoMinimoCritico = const Value.absent(),
                Value<double?> rangoMaximoCritico = const Value.absent(),
                Value<double?> valor = const Value.absent(),
                Value<String?> estadoValor = const Value.absent(),
                Value<String?> observacion = const Value.absent(),
                Value<DateTime?> fechaMedicion = const Value.absent(),
                Value<bool> isDirty = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => MedicionesCompanion(
                idLocal: idLocal,
                idBackend: idBackend,
                idOrden: idOrden,
                idActividadEjecutada: idActividadEjecutada,
                idParametro: idParametro,
                idOrdenEquipo: idOrdenEquipo,
                nombreParametro: nombreParametro,
                unidadMedida: unidadMedida,
                rangoMinimoNormal: rangoMinimoNormal,
                rangoMaximoNormal: rangoMaximoNormal,
                rangoMinimoCritico: rangoMinimoCritico,
                rangoMaximoCritico: rangoMaximoCritico,
                valor: valor,
                estadoValor: estadoValor,
                observacion: observacion,
                fechaMedicion: fechaMedicion,
                isDirty: isDirty,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int?> idBackend = const Value.absent(),
                required int idOrden,
                Value<int?> idActividadEjecutada = const Value.absent(),
                required int idParametro,
                Value<int?> idOrdenEquipo = const Value.absent(),
                required String nombreParametro,
                required String unidadMedida,
                Value<double?> rangoMinimoNormal = const Value.absent(),
                Value<double?> rangoMaximoNormal = const Value.absent(),
                Value<double?> rangoMinimoCritico = const Value.absent(),
                Value<double?> rangoMaximoCritico = const Value.absent(),
                Value<double?> valor = const Value.absent(),
                Value<String?> estadoValor = const Value.absent(),
                Value<String?> observacion = const Value.absent(),
                Value<DateTime?> fechaMedicion = const Value.absent(),
                Value<bool> isDirty = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => MedicionesCompanion.insert(
                idLocal: idLocal,
                idBackend: idBackend,
                idOrden: idOrden,
                idActividadEjecutada: idActividadEjecutada,
                idParametro: idParametro,
                idOrdenEquipo: idOrdenEquipo,
                nombreParametro: nombreParametro,
                unidadMedida: unidadMedida,
                rangoMinimoNormal: rangoMinimoNormal,
                rangoMaximoNormal: rangoMaximoNormal,
                rangoMinimoCritico: rangoMinimoCritico,
                rangoMaximoCritico: rangoMaximoCritico,
                valor: valor,
                estadoValor: estadoValor,
                observacion: observacion,
                fechaMedicion: fechaMedicion,
                isDirty: isDirty,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$MedicionesTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback:
              ({
                idOrden = false,
                idActividadEjecutada = false,
                idParametro = false,
                idOrdenEquipo = false,
              }) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [],
                  addJoins:
                      <
                        T extends TableManagerState<
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic
                        >
                      >(state) {
                        if (idOrden) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idOrden,
                                    referencedTable: $$MedicionesTableReferences
                                        ._idOrdenTable(db),
                                    referencedColumn:
                                        $$MedicionesTableReferences
                                            ._idOrdenTable(db)
                                            .idLocal,
                                  )
                                  as T;
                        }
                        if (idActividadEjecutada) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idActividadEjecutada,
                                    referencedTable: $$MedicionesTableReferences
                                        ._idActividadEjecutadaTable(db),
                                    referencedColumn:
                                        $$MedicionesTableReferences
                                            ._idActividadEjecutadaTable(db)
                                            .idLocal,
                                  )
                                  as T;
                        }
                        if (idParametro) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idParametro,
                                    referencedTable: $$MedicionesTableReferences
                                        ._idParametroTable(db),
                                    referencedColumn:
                                        $$MedicionesTableReferences
                                            ._idParametroTable(db)
                                            .id,
                                  )
                                  as T;
                        }
                        if (idOrdenEquipo) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idOrdenEquipo,
                                    referencedTable: $$MedicionesTableReferences
                                        ._idOrdenEquipoTable(db),
                                    referencedColumn:
                                        $$MedicionesTableReferences
                                            ._idOrdenEquipoTable(db)
                                            .idOrdenEquipo,
                                  )
                                  as T;
                        }

                        return state;
                      },
                  getPrefetchedDataCallback: (items) async {
                    return [];
                  },
                );
              },
        ),
      );
}

typedef $$MedicionesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $MedicionesTable,
      Medicione,
      $$MedicionesTableFilterComposer,
      $$MedicionesTableOrderingComposer,
      $$MedicionesTableAnnotationComposer,
      $$MedicionesTableCreateCompanionBuilder,
      $$MedicionesTableUpdateCompanionBuilder,
      (Medicione, $$MedicionesTableReferences),
      Medicione,
      PrefetchHooks Function({
        bool idOrden,
        bool idActividadEjecutada,
        bool idParametro,
        bool idOrdenEquipo,
      })
    >;
typedef $$EvidenciasTableCreateCompanionBuilder =
    EvidenciasCompanion Function({
      Value<int> idLocal,
      Value<int?> idBackend,
      required int idOrden,
      Value<int?> idActividadEjecutada,
      Value<int?> idOrdenEquipo,
      required String rutaLocal,
      Value<String?> urlRemota,
      required String tipoEvidencia,
      Value<String?> descripcion,
      Value<DateTime> fechaCaptura,
      Value<bool> isDirty,
      Value<bool> subida,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$EvidenciasTableUpdateCompanionBuilder =
    EvidenciasCompanion Function({
      Value<int> idLocal,
      Value<int?> idBackend,
      Value<int> idOrden,
      Value<int?> idActividadEjecutada,
      Value<int?> idOrdenEquipo,
      Value<String> rutaLocal,
      Value<String?> urlRemota,
      Value<String> tipoEvidencia,
      Value<String?> descripcion,
      Value<DateTime> fechaCaptura,
      Value<bool> isDirty,
      Value<bool> subida,
      Value<DateTime?> lastSyncedAt,
    });

final class $$EvidenciasTableReferences
    extends BaseReferences<_$AppDatabase, $EvidenciasTable, Evidencia> {
  $$EvidenciasTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $OrdenesTable _idOrdenTable(_$AppDatabase db) =>
      db.ordenes.createAlias(
        $_aliasNameGenerator(db.evidencias.idOrden, db.ordenes.idLocal),
      );

  $$OrdenesTableProcessedTableManager get idOrden {
    final $_column = $_itemColumn<int>('id_orden')!;

    final manager = $$OrdenesTableTableManager(
      $_db,
      $_db.ordenes,
    ).filter((f) => f.idLocal.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idOrdenTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $ActividadesEjecutadasTable _idActividadEjecutadaTable(
    _$AppDatabase db,
  ) => db.actividadesEjecutadas.createAlias(
    $_aliasNameGenerator(
      db.evidencias.idActividadEjecutada,
      db.actividadesEjecutadas.idLocal,
    ),
  );

  $$ActividadesEjecutadasTableProcessedTableManager? get idActividadEjecutada {
    final $_column = $_itemColumn<int>('id_actividad_ejecutada');
    if ($_column == null) return null;
    final manager = $$ActividadesEjecutadasTableTableManager(
      $_db,
      $_db.actividadesEjecutadas,
    ).filter((f) => f.idLocal.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(
      _idActividadEjecutadaTable($_db),
    );
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }

  static $OrdenesEquiposTable _idOrdenEquipoTable(_$AppDatabase db) =>
      db.ordenesEquipos.createAlias(
        $_aliasNameGenerator(
          db.evidencias.idOrdenEquipo,
          db.ordenesEquipos.idOrdenEquipo,
        ),
      );

  $$OrdenesEquiposTableProcessedTableManager? get idOrdenEquipo {
    final $_column = $_itemColumn<int>('id_orden_equipo');
    if ($_column == null) return null;
    final manager = $$OrdenesEquiposTableTableManager(
      $_db,
      $_db.ordenesEquipos,
    ).filter((f) => f.idOrdenEquipo.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idOrdenEquipoTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$EvidenciasTableFilterComposer
    extends Composer<_$AppDatabase, $EvidenciasTable> {
  $$EvidenciasTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get idBackend => $composableBuilder(
    column: $table.idBackend,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get rutaLocal => $composableBuilder(
    column: $table.rutaLocal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get urlRemota => $composableBuilder(
    column: $table.urlRemota,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tipoEvidencia => $composableBuilder(
    column: $table.tipoEvidencia,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaCaptura => $composableBuilder(
    column: $table.fechaCaptura,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get isDirty => $composableBuilder(
    column: $table.isDirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get subida => $composableBuilder(
    column: $table.subida,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  $$OrdenesTableFilterComposer get idOrden {
    final $$OrdenesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableFilterComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesEjecutadasTableFilterComposer get idActividadEjecutada {
    final $$ActividadesEjecutadasTableFilterComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idActividadEjecutada,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idLocal,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableFilterComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }

  $$OrdenesEquiposTableFilterComposer get idOrdenEquipo {
    final $$OrdenesEquiposTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.ordenesEquipos,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesEquiposTableFilterComposer(
            $db: $db,
            $table: $db.ordenesEquipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$EvidenciasTableOrderingComposer
    extends Composer<_$AppDatabase, $EvidenciasTable> {
  $$EvidenciasTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get idBackend => $composableBuilder(
    column: $table.idBackend,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get rutaLocal => $composableBuilder(
    column: $table.rutaLocal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get urlRemota => $composableBuilder(
    column: $table.urlRemota,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tipoEvidencia => $composableBuilder(
    column: $table.tipoEvidencia,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaCaptura => $composableBuilder(
    column: $table.fechaCaptura,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get isDirty => $composableBuilder(
    column: $table.isDirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get subida => $composableBuilder(
    column: $table.subida,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );

  $$OrdenesTableOrderingComposer get idOrden {
    final $$OrdenesTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableOrderingComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesEjecutadasTableOrderingComposer get idActividadEjecutada {
    final $$ActividadesEjecutadasTableOrderingComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idActividadEjecutada,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idLocal,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableOrderingComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }

  $$OrdenesEquiposTableOrderingComposer get idOrdenEquipo {
    final $$OrdenesEquiposTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.ordenesEquipos,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesEquiposTableOrderingComposer(
            $db: $db,
            $table: $db.ordenesEquipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$EvidenciasTableAnnotationComposer
    extends Composer<_$AppDatabase, $EvidenciasTable> {
  $$EvidenciasTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get idLocal =>
      $composableBuilder(column: $table.idLocal, builder: (column) => column);

  GeneratedColumn<int> get idBackend =>
      $composableBuilder(column: $table.idBackend, builder: (column) => column);

  GeneratedColumn<String> get rutaLocal =>
      $composableBuilder(column: $table.rutaLocal, builder: (column) => column);

  GeneratedColumn<String> get urlRemota =>
      $composableBuilder(column: $table.urlRemota, builder: (column) => column);

  GeneratedColumn<String> get tipoEvidencia => $composableBuilder(
    column: $table.tipoEvidencia,
    builder: (column) => column,
  );

  GeneratedColumn<String> get descripcion => $composableBuilder(
    column: $table.descripcion,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get fechaCaptura => $composableBuilder(
    column: $table.fechaCaptura,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get isDirty =>
      $composableBuilder(column: $table.isDirty, builder: (column) => column);

  GeneratedColumn<bool> get subida =>
      $composableBuilder(column: $table.subida, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  $$OrdenesTableAnnotationComposer get idOrden {
    final $$OrdenesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }

  $$ActividadesEjecutadasTableAnnotationComposer get idActividadEjecutada {
    final $$ActividadesEjecutadasTableAnnotationComposer composer =
        $composerBuilder(
          composer: this,
          getCurrentColumn: (t) => t.idActividadEjecutada,
          referencedTable: $db.actividadesEjecutadas,
          getReferencedColumn: (t) => t.idLocal,
          builder:
              (
                joinBuilder, {
                $addJoinBuilderToRootComposer,
                $removeJoinBuilderFromRootComposer,
              }) => $$ActividadesEjecutadasTableAnnotationComposer(
                $db: $db,
                $table: $db.actividadesEjecutadas,
                $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
                joinBuilder: joinBuilder,
                $removeJoinBuilderFromRootComposer:
                    $removeJoinBuilderFromRootComposer,
              ),
        );
    return composer;
  }

  $$OrdenesEquiposTableAnnotationComposer get idOrdenEquipo {
    final $$OrdenesEquiposTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrdenEquipo,
      referencedTable: $db.ordenesEquipos,
      getReferencedColumn: (t) => t.idOrdenEquipo,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesEquiposTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenesEquipos,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$EvidenciasTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $EvidenciasTable,
          Evidencia,
          $$EvidenciasTableFilterComposer,
          $$EvidenciasTableOrderingComposer,
          $$EvidenciasTableAnnotationComposer,
          $$EvidenciasTableCreateCompanionBuilder,
          $$EvidenciasTableUpdateCompanionBuilder,
          (Evidencia, $$EvidenciasTableReferences),
          Evidencia,
          PrefetchHooks Function({
            bool idOrden,
            bool idActividadEjecutada,
            bool idOrdenEquipo,
          })
        > {
  $$EvidenciasTableTableManager(_$AppDatabase db, $EvidenciasTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$EvidenciasTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$EvidenciasTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$EvidenciasTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int?> idBackend = const Value.absent(),
                Value<int> idOrden = const Value.absent(),
                Value<int?> idActividadEjecutada = const Value.absent(),
                Value<int?> idOrdenEquipo = const Value.absent(),
                Value<String> rutaLocal = const Value.absent(),
                Value<String?> urlRemota = const Value.absent(),
                Value<String> tipoEvidencia = const Value.absent(),
                Value<String?> descripcion = const Value.absent(),
                Value<DateTime> fechaCaptura = const Value.absent(),
                Value<bool> isDirty = const Value.absent(),
                Value<bool> subida = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => EvidenciasCompanion(
                idLocal: idLocal,
                idBackend: idBackend,
                idOrden: idOrden,
                idActividadEjecutada: idActividadEjecutada,
                idOrdenEquipo: idOrdenEquipo,
                rutaLocal: rutaLocal,
                urlRemota: urlRemota,
                tipoEvidencia: tipoEvidencia,
                descripcion: descripcion,
                fechaCaptura: fechaCaptura,
                isDirty: isDirty,
                subida: subida,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int?> idBackend = const Value.absent(),
                required int idOrden,
                Value<int?> idActividadEjecutada = const Value.absent(),
                Value<int?> idOrdenEquipo = const Value.absent(),
                required String rutaLocal,
                Value<String?> urlRemota = const Value.absent(),
                required String tipoEvidencia,
                Value<String?> descripcion = const Value.absent(),
                Value<DateTime> fechaCaptura = const Value.absent(),
                Value<bool> isDirty = const Value.absent(),
                Value<bool> subida = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => EvidenciasCompanion.insert(
                idLocal: idLocal,
                idBackend: idBackend,
                idOrden: idOrden,
                idActividadEjecutada: idActividadEjecutada,
                idOrdenEquipo: idOrdenEquipo,
                rutaLocal: rutaLocal,
                urlRemota: urlRemota,
                tipoEvidencia: tipoEvidencia,
                descripcion: descripcion,
                fechaCaptura: fechaCaptura,
                isDirty: isDirty,
                subida: subida,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) => (
                  e.readTable(table),
                  $$EvidenciasTableReferences(db, table, e),
                ),
              )
              .toList(),
          prefetchHooksCallback:
              ({
                idOrden = false,
                idActividadEjecutada = false,
                idOrdenEquipo = false,
              }) {
                return PrefetchHooks(
                  db: db,
                  explicitlyWatchedTables: [],
                  addJoins:
                      <
                        T extends TableManagerState<
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic,
                          dynamic
                        >
                      >(state) {
                        if (idOrden) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idOrden,
                                    referencedTable: $$EvidenciasTableReferences
                                        ._idOrdenTable(db),
                                    referencedColumn:
                                        $$EvidenciasTableReferences
                                            ._idOrdenTable(db)
                                            .idLocal,
                                  )
                                  as T;
                        }
                        if (idActividadEjecutada) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idActividadEjecutada,
                                    referencedTable: $$EvidenciasTableReferences
                                        ._idActividadEjecutadaTable(db),
                                    referencedColumn:
                                        $$EvidenciasTableReferences
                                            ._idActividadEjecutadaTable(db)
                                            .idLocal,
                                  )
                                  as T;
                        }
                        if (idOrdenEquipo) {
                          state =
                              state.withJoin(
                                    currentTable: table,
                                    currentColumn: table.idOrdenEquipo,
                                    referencedTable: $$EvidenciasTableReferences
                                        ._idOrdenEquipoTable(db),
                                    referencedColumn:
                                        $$EvidenciasTableReferences
                                            ._idOrdenEquipoTable(db)
                                            .idOrdenEquipo,
                                  )
                                  as T;
                        }

                        return state;
                      },
                  getPrefetchedDataCallback: (items) async {
                    return [];
                  },
                );
              },
        ),
      );
}

typedef $$EvidenciasTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $EvidenciasTable,
      Evidencia,
      $$EvidenciasTableFilterComposer,
      $$EvidenciasTableOrderingComposer,
      $$EvidenciasTableAnnotationComposer,
      $$EvidenciasTableCreateCompanionBuilder,
      $$EvidenciasTableUpdateCompanionBuilder,
      (Evidencia, $$EvidenciasTableReferences),
      Evidencia,
      PrefetchHooks Function({
        bool idOrden,
        bool idActividadEjecutada,
        bool idOrdenEquipo,
      })
    >;
typedef $$FirmasTableCreateCompanionBuilder =
    FirmasCompanion Function({
      Value<int> idLocal,
      Value<int?> idBackend,
      required int idOrden,
      required String rutaLocal,
      Value<String?> urlRemota,
      required String tipoFirma,
      Value<String?> nombreFirmante,
      Value<String?> cargoFirmante,
      Value<String?> documentoFirmante,
      Value<DateTime> fechaFirma,
      Value<bool> isDirty,
      Value<bool> subida,
      Value<DateTime?> lastSyncedAt,
    });
typedef $$FirmasTableUpdateCompanionBuilder =
    FirmasCompanion Function({
      Value<int> idLocal,
      Value<int?> idBackend,
      Value<int> idOrden,
      Value<String> rutaLocal,
      Value<String?> urlRemota,
      Value<String> tipoFirma,
      Value<String?> nombreFirmante,
      Value<String?> cargoFirmante,
      Value<String?> documentoFirmante,
      Value<DateTime> fechaFirma,
      Value<bool> isDirty,
      Value<bool> subida,
      Value<DateTime?> lastSyncedAt,
    });

final class $$FirmasTableReferences
    extends BaseReferences<_$AppDatabase, $FirmasTable, Firma> {
  $$FirmasTableReferences(super.$_db, super.$_table, super.$_typedResult);

  static $OrdenesTable _idOrdenTable(_$AppDatabase db) => db.ordenes
      .createAlias($_aliasNameGenerator(db.firmas.idOrden, db.ordenes.idLocal));

  $$OrdenesTableProcessedTableManager get idOrden {
    final $_column = $_itemColumn<int>('id_orden')!;

    final manager = $$OrdenesTableTableManager(
      $_db,
      $_db.ordenes,
    ).filter((f) => f.idLocal.sqlEquals($_column));
    final item = $_typedResult.readTableOrNull(_idOrdenTable($_db));
    if (item == null) return manager;
    return ProcessedTableManager(
      manager.$state.copyWith(prefetchedData: [item]),
    );
  }
}

class $$FirmasTableFilterComposer
    extends Composer<_$AppDatabase, $FirmasTable> {
  $$FirmasTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get idBackend => $composableBuilder(
    column: $table.idBackend,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get rutaLocal => $composableBuilder(
    column: $table.rutaLocal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get urlRemota => $composableBuilder(
    column: $table.urlRemota,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get tipoFirma => $composableBuilder(
    column: $table.tipoFirma,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get nombreFirmante => $composableBuilder(
    column: $table.nombreFirmante,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get cargoFirmante => $composableBuilder(
    column: $table.cargoFirmante,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get documentoFirmante => $composableBuilder(
    column: $table.documentoFirmante,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaFirma => $composableBuilder(
    column: $table.fechaFirma,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get isDirty => $composableBuilder(
    column: $table.isDirty,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<bool> get subida => $composableBuilder(
    column: $table.subida,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnFilters(column),
  );

  $$OrdenesTableFilterComposer get idOrden {
    final $$OrdenesTableFilterComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableFilterComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$FirmasTableOrderingComposer
    extends Composer<_$AppDatabase, $FirmasTable> {
  $$FirmasTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get idLocal => $composableBuilder(
    column: $table.idLocal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get idBackend => $composableBuilder(
    column: $table.idBackend,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get rutaLocal => $composableBuilder(
    column: $table.rutaLocal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get urlRemota => $composableBuilder(
    column: $table.urlRemota,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get tipoFirma => $composableBuilder(
    column: $table.tipoFirma,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get nombreFirmante => $composableBuilder(
    column: $table.nombreFirmante,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get cargoFirmante => $composableBuilder(
    column: $table.cargoFirmante,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get documentoFirmante => $composableBuilder(
    column: $table.documentoFirmante,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaFirma => $composableBuilder(
    column: $table.fechaFirma,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get isDirty => $composableBuilder(
    column: $table.isDirty,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<bool> get subida => $composableBuilder(
    column: $table.subida,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => ColumnOrderings(column),
  );

  $$OrdenesTableOrderingComposer get idOrden {
    final $$OrdenesTableOrderingComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableOrderingComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$FirmasTableAnnotationComposer
    extends Composer<_$AppDatabase, $FirmasTable> {
  $$FirmasTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get idLocal =>
      $composableBuilder(column: $table.idLocal, builder: (column) => column);

  GeneratedColumn<int> get idBackend =>
      $composableBuilder(column: $table.idBackend, builder: (column) => column);

  GeneratedColumn<String> get rutaLocal =>
      $composableBuilder(column: $table.rutaLocal, builder: (column) => column);

  GeneratedColumn<String> get urlRemota =>
      $composableBuilder(column: $table.urlRemota, builder: (column) => column);

  GeneratedColumn<String> get tipoFirma =>
      $composableBuilder(column: $table.tipoFirma, builder: (column) => column);

  GeneratedColumn<String> get nombreFirmante => $composableBuilder(
    column: $table.nombreFirmante,
    builder: (column) => column,
  );

  GeneratedColumn<String> get cargoFirmante => $composableBuilder(
    column: $table.cargoFirmante,
    builder: (column) => column,
  );

  GeneratedColumn<String> get documentoFirmante => $composableBuilder(
    column: $table.documentoFirmante,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get fechaFirma => $composableBuilder(
    column: $table.fechaFirma,
    builder: (column) => column,
  );

  GeneratedColumn<bool> get isDirty =>
      $composableBuilder(column: $table.isDirty, builder: (column) => column);

  GeneratedColumn<bool> get subida =>
      $composableBuilder(column: $table.subida, builder: (column) => column);

  GeneratedColumn<DateTime> get lastSyncedAt => $composableBuilder(
    column: $table.lastSyncedAt,
    builder: (column) => column,
  );

  $$OrdenesTableAnnotationComposer get idOrden {
    final $$OrdenesTableAnnotationComposer composer = $composerBuilder(
      composer: this,
      getCurrentColumn: (t) => t.idOrden,
      referencedTable: $db.ordenes,
      getReferencedColumn: (t) => t.idLocal,
      builder:
          (
            joinBuilder, {
            $addJoinBuilderToRootComposer,
            $removeJoinBuilderFromRootComposer,
          }) => $$OrdenesTableAnnotationComposer(
            $db: $db,
            $table: $db.ordenes,
            $addJoinBuilderToRootComposer: $addJoinBuilderToRootComposer,
            joinBuilder: joinBuilder,
            $removeJoinBuilderFromRootComposer:
                $removeJoinBuilderFromRootComposer,
          ),
    );
    return composer;
  }
}

class $$FirmasTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $FirmasTable,
          Firma,
          $$FirmasTableFilterComposer,
          $$FirmasTableOrderingComposer,
          $$FirmasTableAnnotationComposer,
          $$FirmasTableCreateCompanionBuilder,
          $$FirmasTableUpdateCompanionBuilder,
          (Firma, $$FirmasTableReferences),
          Firma,
          PrefetchHooks Function({bool idOrden})
        > {
  $$FirmasTableTableManager(_$AppDatabase db, $FirmasTable table)
    : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$FirmasTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$FirmasTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$FirmasTableAnnotationComposer($db: db, $table: table),
          updateCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int?> idBackend = const Value.absent(),
                Value<int> idOrden = const Value.absent(),
                Value<String> rutaLocal = const Value.absent(),
                Value<String?> urlRemota = const Value.absent(),
                Value<String> tipoFirma = const Value.absent(),
                Value<String?> nombreFirmante = const Value.absent(),
                Value<String?> cargoFirmante = const Value.absent(),
                Value<String?> documentoFirmante = const Value.absent(),
                Value<DateTime> fechaFirma = const Value.absent(),
                Value<bool> isDirty = const Value.absent(),
                Value<bool> subida = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => FirmasCompanion(
                idLocal: idLocal,
                idBackend: idBackend,
                idOrden: idOrden,
                rutaLocal: rutaLocal,
                urlRemota: urlRemota,
                tipoFirma: tipoFirma,
                nombreFirmante: nombreFirmante,
                cargoFirmante: cargoFirmante,
                documentoFirmante: documentoFirmante,
                fechaFirma: fechaFirma,
                isDirty: isDirty,
                subida: subida,
                lastSyncedAt: lastSyncedAt,
              ),
          createCompanionCallback:
              ({
                Value<int> idLocal = const Value.absent(),
                Value<int?> idBackend = const Value.absent(),
                required int idOrden,
                required String rutaLocal,
                Value<String?> urlRemota = const Value.absent(),
                required String tipoFirma,
                Value<String?> nombreFirmante = const Value.absent(),
                Value<String?> cargoFirmante = const Value.absent(),
                Value<String?> documentoFirmante = const Value.absent(),
                Value<DateTime> fechaFirma = const Value.absent(),
                Value<bool> isDirty = const Value.absent(),
                Value<bool> subida = const Value.absent(),
                Value<DateTime?> lastSyncedAt = const Value.absent(),
              }) => FirmasCompanion.insert(
                idLocal: idLocal,
                idBackend: idBackend,
                idOrden: idOrden,
                rutaLocal: rutaLocal,
                urlRemota: urlRemota,
                tipoFirma: tipoFirma,
                nombreFirmante: nombreFirmante,
                cargoFirmante: cargoFirmante,
                documentoFirmante: documentoFirmante,
                fechaFirma: fechaFirma,
                isDirty: isDirty,
                subida: subida,
                lastSyncedAt: lastSyncedAt,
              ),
          withReferenceMapper: (p0) => p0
              .map(
                (e) =>
                    (e.readTable(table), $$FirmasTableReferences(db, table, e)),
              )
              .toList(),
          prefetchHooksCallback: ({idOrden = false}) {
            return PrefetchHooks(
              db: db,
              explicitlyWatchedTables: [],
              addJoins:
                  <
                    T extends TableManagerState<
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic,
                      dynamic
                    >
                  >(state) {
                    if (idOrden) {
                      state =
                          state.withJoin(
                                currentTable: table,
                                currentColumn: table.idOrden,
                                referencedTable: $$FirmasTableReferences
                                    ._idOrdenTable(db),
                                referencedColumn: $$FirmasTableReferences
                                    ._idOrdenTable(db)
                                    .idLocal,
                              )
                              as T;
                    }

                    return state;
                  },
              getPrefetchedDataCallback: (items) async {
                return [];
              },
            );
          },
        ),
      );
}

typedef $$FirmasTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $FirmasTable,
      Firma,
      $$FirmasTableFilterComposer,
      $$FirmasTableOrderingComposer,
      $$FirmasTableAnnotationComposer,
      $$FirmasTableCreateCompanionBuilder,
      $$FirmasTableUpdateCompanionBuilder,
      (Firma, $$FirmasTableReferences),
      Firma,
      PrefetchHooks Function({bool idOrden})
    >;
typedef $$SyncStatusEntriesTableCreateCompanionBuilder =
    SyncStatusEntriesCompanion Function({
      Value<int> id,
      required String entidad,
      Value<DateTime?> ultimaSync,
      Value<int> pendientesSubir,
      Value<int> pendientesBajar,
      Value<String?> ultimoError,
    });
typedef $$SyncStatusEntriesTableUpdateCompanionBuilder =
    SyncStatusEntriesCompanion Function({
      Value<int> id,
      Value<String> entidad,
      Value<DateTime?> ultimaSync,
      Value<int> pendientesSubir,
      Value<int> pendientesBajar,
      Value<String?> ultimoError,
    });

class $$SyncStatusEntriesTableFilterComposer
    extends Composer<_$AppDatabase, $SyncStatusEntriesTable> {
  $$SyncStatusEntriesTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get entidad => $composableBuilder(
    column: $table.entidad,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get ultimaSync => $composableBuilder(
    column: $table.ultimaSync,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get pendientesSubir => $composableBuilder(
    column: $table.pendientesSubir,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get pendientesBajar => $composableBuilder(
    column: $table.pendientesBajar,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get ultimoError => $composableBuilder(
    column: $table.ultimoError,
    builder: (column) => ColumnFilters(column),
  );
}

class $$SyncStatusEntriesTableOrderingComposer
    extends Composer<_$AppDatabase, $SyncStatusEntriesTable> {
  $$SyncStatusEntriesTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get entidad => $composableBuilder(
    column: $table.entidad,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get ultimaSync => $composableBuilder(
    column: $table.ultimaSync,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get pendientesSubir => $composableBuilder(
    column: $table.pendientesSubir,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get pendientesBajar => $composableBuilder(
    column: $table.pendientesBajar,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get ultimoError => $composableBuilder(
    column: $table.ultimoError,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$SyncStatusEntriesTableAnnotationComposer
    extends Composer<_$AppDatabase, $SyncStatusEntriesTable> {
  $$SyncStatusEntriesTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<String> get entidad =>
      $composableBuilder(column: $table.entidad, builder: (column) => column);

  GeneratedColumn<DateTime> get ultimaSync => $composableBuilder(
    column: $table.ultimaSync,
    builder: (column) => column,
  );

  GeneratedColumn<int> get pendientesSubir => $composableBuilder(
    column: $table.pendientesSubir,
    builder: (column) => column,
  );

  GeneratedColumn<int> get pendientesBajar => $composableBuilder(
    column: $table.pendientesBajar,
    builder: (column) => column,
  );

  GeneratedColumn<String> get ultimoError => $composableBuilder(
    column: $table.ultimoError,
    builder: (column) => column,
  );
}

class $$SyncStatusEntriesTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $SyncStatusEntriesTable,
          SyncStatusEntry,
          $$SyncStatusEntriesTableFilterComposer,
          $$SyncStatusEntriesTableOrderingComposer,
          $$SyncStatusEntriesTableAnnotationComposer,
          $$SyncStatusEntriesTableCreateCompanionBuilder,
          $$SyncStatusEntriesTableUpdateCompanionBuilder,
          (
            SyncStatusEntry,
            BaseReferences<
              _$AppDatabase,
              $SyncStatusEntriesTable,
              SyncStatusEntry
            >,
          ),
          SyncStatusEntry,
          PrefetchHooks Function()
        > {
  $$SyncStatusEntriesTableTableManager(
    _$AppDatabase db,
    $SyncStatusEntriesTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$SyncStatusEntriesTableFilterComposer($db: db, $table: table),
          createOrderingComposer: () =>
              $$SyncStatusEntriesTableOrderingComposer($db: db, $table: table),
          createComputedFieldComposer: () =>
              $$SyncStatusEntriesTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<String> entidad = const Value.absent(),
                Value<DateTime?> ultimaSync = const Value.absent(),
                Value<int> pendientesSubir = const Value.absent(),
                Value<int> pendientesBajar = const Value.absent(),
                Value<String?> ultimoError = const Value.absent(),
              }) => SyncStatusEntriesCompanion(
                id: id,
                entidad: entidad,
                ultimaSync: ultimaSync,
                pendientesSubir: pendientesSubir,
                pendientesBajar: pendientesBajar,
                ultimoError: ultimoError,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required String entidad,
                Value<DateTime?> ultimaSync = const Value.absent(),
                Value<int> pendientesSubir = const Value.absent(),
                Value<int> pendientesBajar = const Value.absent(),
                Value<String?> ultimoError = const Value.absent(),
              }) => SyncStatusEntriesCompanion.insert(
                id: id,
                entidad: entidad,
                ultimaSync: ultimaSync,
                pendientesSubir: pendientesSubir,
                pendientesBajar: pendientesBajar,
                ultimoError: ultimoError,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$SyncStatusEntriesTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $SyncStatusEntriesTable,
      SyncStatusEntry,
      $$SyncStatusEntriesTableFilterComposer,
      $$SyncStatusEntriesTableOrderingComposer,
      $$SyncStatusEntriesTableAnnotationComposer,
      $$SyncStatusEntriesTableCreateCompanionBuilder,
      $$SyncStatusEntriesTableUpdateCompanionBuilder,
      (
        SyncStatusEntry,
        BaseReferences<_$AppDatabase, $SyncStatusEntriesTable, SyncStatusEntry>,
      ),
      SyncStatusEntry,
      PrefetchHooks Function()
    >;
typedef $$OrdenesPendientesSyncTableCreateCompanionBuilder =
    OrdenesPendientesSyncCompanion Function({
      Value<int> id,
      required int idOrdenLocal,
      required int idOrdenBackend,
      required String payloadJson,
      required String estadoSync,
      Value<int> intentos,
      Value<String?> ultimoError,
      Value<DateTime> fechaCreacion,
      Value<DateTime?> fechaUltimoIntento,
    });
typedef $$OrdenesPendientesSyncTableUpdateCompanionBuilder =
    OrdenesPendientesSyncCompanion Function({
      Value<int> id,
      Value<int> idOrdenLocal,
      Value<int> idOrdenBackend,
      Value<String> payloadJson,
      Value<String> estadoSync,
      Value<int> intentos,
      Value<String?> ultimoError,
      Value<DateTime> fechaCreacion,
      Value<DateTime?> fechaUltimoIntento,
    });

class $$OrdenesPendientesSyncTableFilterComposer
    extends Composer<_$AppDatabase, $OrdenesPendientesSyncTable> {
  $$OrdenesPendientesSyncTableFilterComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnFilters<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get idOrdenLocal => $composableBuilder(
    column: $table.idOrdenLocal,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get idOrdenBackend => $composableBuilder(
    column: $table.idOrdenBackend,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get payloadJson => $composableBuilder(
    column: $table.payloadJson,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get estadoSync => $composableBuilder(
    column: $table.estadoSync,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<int> get intentos => $composableBuilder(
    column: $table.intentos,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<String> get ultimoError => $composableBuilder(
    column: $table.ultimoError,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaCreacion => $composableBuilder(
    column: $table.fechaCreacion,
    builder: (column) => ColumnFilters(column),
  );

  ColumnFilters<DateTime> get fechaUltimoIntento => $composableBuilder(
    column: $table.fechaUltimoIntento,
    builder: (column) => ColumnFilters(column),
  );
}

class $$OrdenesPendientesSyncTableOrderingComposer
    extends Composer<_$AppDatabase, $OrdenesPendientesSyncTable> {
  $$OrdenesPendientesSyncTableOrderingComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  ColumnOrderings<int> get id => $composableBuilder(
    column: $table.id,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get idOrdenLocal => $composableBuilder(
    column: $table.idOrdenLocal,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get idOrdenBackend => $composableBuilder(
    column: $table.idOrdenBackend,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get payloadJson => $composableBuilder(
    column: $table.payloadJson,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get estadoSync => $composableBuilder(
    column: $table.estadoSync,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<int> get intentos => $composableBuilder(
    column: $table.intentos,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<String> get ultimoError => $composableBuilder(
    column: $table.ultimoError,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaCreacion => $composableBuilder(
    column: $table.fechaCreacion,
    builder: (column) => ColumnOrderings(column),
  );

  ColumnOrderings<DateTime> get fechaUltimoIntento => $composableBuilder(
    column: $table.fechaUltimoIntento,
    builder: (column) => ColumnOrderings(column),
  );
}

class $$OrdenesPendientesSyncTableAnnotationComposer
    extends Composer<_$AppDatabase, $OrdenesPendientesSyncTable> {
  $$OrdenesPendientesSyncTableAnnotationComposer({
    required super.$db,
    required super.$table,
    super.joinBuilder,
    super.$addJoinBuilderToRootComposer,
    super.$removeJoinBuilderFromRootComposer,
  });
  GeneratedColumn<int> get id =>
      $composableBuilder(column: $table.id, builder: (column) => column);

  GeneratedColumn<int> get idOrdenLocal => $composableBuilder(
    column: $table.idOrdenLocal,
    builder: (column) => column,
  );

  GeneratedColumn<int> get idOrdenBackend => $composableBuilder(
    column: $table.idOrdenBackend,
    builder: (column) => column,
  );

  GeneratedColumn<String> get payloadJson => $composableBuilder(
    column: $table.payloadJson,
    builder: (column) => column,
  );

  GeneratedColumn<String> get estadoSync => $composableBuilder(
    column: $table.estadoSync,
    builder: (column) => column,
  );

  GeneratedColumn<int> get intentos =>
      $composableBuilder(column: $table.intentos, builder: (column) => column);

  GeneratedColumn<String> get ultimoError => $composableBuilder(
    column: $table.ultimoError,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get fechaCreacion => $composableBuilder(
    column: $table.fechaCreacion,
    builder: (column) => column,
  );

  GeneratedColumn<DateTime> get fechaUltimoIntento => $composableBuilder(
    column: $table.fechaUltimoIntento,
    builder: (column) => column,
  );
}

class $$OrdenesPendientesSyncTableTableManager
    extends
        RootTableManager<
          _$AppDatabase,
          $OrdenesPendientesSyncTable,
          OrdenesPendientesSyncData,
          $$OrdenesPendientesSyncTableFilterComposer,
          $$OrdenesPendientesSyncTableOrderingComposer,
          $$OrdenesPendientesSyncTableAnnotationComposer,
          $$OrdenesPendientesSyncTableCreateCompanionBuilder,
          $$OrdenesPendientesSyncTableUpdateCompanionBuilder,
          (
            OrdenesPendientesSyncData,
            BaseReferences<
              _$AppDatabase,
              $OrdenesPendientesSyncTable,
              OrdenesPendientesSyncData
            >,
          ),
          OrdenesPendientesSyncData,
          PrefetchHooks Function()
        > {
  $$OrdenesPendientesSyncTableTableManager(
    _$AppDatabase db,
    $OrdenesPendientesSyncTable table,
  ) : super(
        TableManagerState(
          db: db,
          table: table,
          createFilteringComposer: () =>
              $$OrdenesPendientesSyncTableFilterComposer(
                $db: db,
                $table: table,
              ),
          createOrderingComposer: () =>
              $$OrdenesPendientesSyncTableOrderingComposer(
                $db: db,
                $table: table,
              ),
          createComputedFieldComposer: () =>
              $$OrdenesPendientesSyncTableAnnotationComposer(
                $db: db,
                $table: table,
              ),
          updateCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                Value<int> idOrdenLocal = const Value.absent(),
                Value<int> idOrdenBackend = const Value.absent(),
                Value<String> payloadJson = const Value.absent(),
                Value<String> estadoSync = const Value.absent(),
                Value<int> intentos = const Value.absent(),
                Value<String?> ultimoError = const Value.absent(),
                Value<DateTime> fechaCreacion = const Value.absent(),
                Value<DateTime?> fechaUltimoIntento = const Value.absent(),
              }) => OrdenesPendientesSyncCompanion(
                id: id,
                idOrdenLocal: idOrdenLocal,
                idOrdenBackend: idOrdenBackend,
                payloadJson: payloadJson,
                estadoSync: estadoSync,
                intentos: intentos,
                ultimoError: ultimoError,
                fechaCreacion: fechaCreacion,
                fechaUltimoIntento: fechaUltimoIntento,
              ),
          createCompanionCallback:
              ({
                Value<int> id = const Value.absent(),
                required int idOrdenLocal,
                required int idOrdenBackend,
                required String payloadJson,
                required String estadoSync,
                Value<int> intentos = const Value.absent(),
                Value<String?> ultimoError = const Value.absent(),
                Value<DateTime> fechaCreacion = const Value.absent(),
                Value<DateTime?> fechaUltimoIntento = const Value.absent(),
              }) => OrdenesPendientesSyncCompanion.insert(
                id: id,
                idOrdenLocal: idOrdenLocal,
                idOrdenBackend: idOrdenBackend,
                payloadJson: payloadJson,
                estadoSync: estadoSync,
                intentos: intentos,
                ultimoError: ultimoError,
                fechaCreacion: fechaCreacion,
                fechaUltimoIntento: fechaUltimoIntento,
              ),
          withReferenceMapper: (p0) => p0
              .map((e) => (e.readTable(table), BaseReferences(db, table, e)))
              .toList(),
          prefetchHooksCallback: null,
        ),
      );
}

typedef $$OrdenesPendientesSyncTableProcessedTableManager =
    ProcessedTableManager<
      _$AppDatabase,
      $OrdenesPendientesSyncTable,
      OrdenesPendientesSyncData,
      $$OrdenesPendientesSyncTableFilterComposer,
      $$OrdenesPendientesSyncTableOrderingComposer,
      $$OrdenesPendientesSyncTableAnnotationComposer,
      $$OrdenesPendientesSyncTableCreateCompanionBuilder,
      $$OrdenesPendientesSyncTableUpdateCompanionBuilder,
      (
        OrdenesPendientesSyncData,
        BaseReferences<
          _$AppDatabase,
          $OrdenesPendientesSyncTable,
          OrdenesPendientesSyncData
        >,
      ),
      OrdenesPendientesSyncData,
      PrefetchHooks Function()
    >;

class $AppDatabaseManager {
  final _$AppDatabase _db;
  $AppDatabaseManager(this._db);
  $$EstadosOrdenTableTableManager get estadosOrden =>
      $$EstadosOrdenTableTableManager(_db, _db.estadosOrden);
  $$TiposServicioTableTableManager get tiposServicio =>
      $$TiposServicioTableTableManager(_db, _db.tiposServicio);
  $$ParametrosCatalogoTableTableManager get parametrosCatalogo =>
      $$ParametrosCatalogoTableTableManager(_db, _db.parametrosCatalogo);
  $$ActividadesCatalogoTableTableManager get actividadesCatalogo =>
      $$ActividadesCatalogoTableTableManager(_db, _db.actividadesCatalogo);
  $$ClientesTableTableManager get clientes =>
      $$ClientesTableTableManager(_db, _db.clientes);
  $$EquiposTableTableManager get equipos =>
      $$EquiposTableTableManager(_db, _db.equipos);
  $$OrdenesEquiposTableTableManager get ordenesEquipos =>
      $$OrdenesEquiposTableTableManager(_db, _db.ordenesEquipos);
  $$OrdenesTableTableManager get ordenes =>
      $$OrdenesTableTableManager(_db, _db.ordenes);
  $$ActividadesPlanTableTableManager get actividadesPlan =>
      $$ActividadesPlanTableTableManager(_db, _db.actividadesPlan);
  $$ActividadesEjecutadasTableTableManager get actividadesEjecutadas =>
      $$ActividadesEjecutadasTableTableManager(_db, _db.actividadesEjecutadas);
  $$MedicionesTableTableManager get mediciones =>
      $$MedicionesTableTableManager(_db, _db.mediciones);
  $$EvidenciasTableTableManager get evidencias =>
      $$EvidenciasTableTableManager(_db, _db.evidencias);
  $$FirmasTableTableManager get firmas =>
      $$FirmasTableTableManager(_db, _db.firmas);
  $$SyncStatusEntriesTableTableManager get syncStatusEntries =>
      $$SyncStatusEntriesTableTableManager(_db, _db.syncStatusEntries);
  $$OrdenesPendientesSyncTableTableManager get ordenesPendientesSync =>
      $$OrdenesPendientesSyncTableTableManager(_db, _db.ordenesPendientesSync);
}
