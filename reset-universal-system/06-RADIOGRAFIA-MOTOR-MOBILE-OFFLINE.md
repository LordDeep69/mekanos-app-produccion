# 06 — Radiografía del Motor Mobile Offline (Flutter + Drift SQLite + Sync Bidireccional)

> **Alcance:** Diagnóstico forense **AS-IS** de `apps/mobile/`: dependencias (`pubspec.yaml`), configuración de red y Supabase (`environment.dart`, `local_api_discovery.dart`, `supabase_config.dart`), base de datos local Drift (`app_database.dart`), autenticación y aislamiento multi-usuario (`auth_service.dart`, `auth_provider.dart`), sincronización (`smart_sync_service.dart`, `offline_sync_service.dart`, `sync_upload_service.dart`, `sync_service.dart`, `data_lifecycle_manager.dart`) y ejecución en campo (`ejecucion_screen.dart`, `parametro_override_resolver.dart`).  
> **Regla de rigor:** Todas las rutas, clases, líneas y hallazgos aquí reportados han sido verificados directamente en código fuente. **Cero código productivo modificado y cero prescripciones de solución.**

---

## 1. Arquitectura General del Cliente Móvil (`apps/mobile`)

La app móvil está construida en **Flutter (`sdk ^3.10.1`)** con **Riverpod (`flutter_riverpod`)**, **Dio**, **Drift (`sqlite3_flutter_libs`)**, **Flutter Secure Storage**, **Syncfusion SignaturePad**, compresión local de imagen con paquete **`image`** en isolate y **Supabase Flutter** para notificaciones Realtime (`pubspec.yaml:1-70`).

Su ingeniería offline-first es notablemente madura en **captura resiliente de órdenes multi-equipo**, pero arrastra **acoplamientos críticos de identidad mono-tenant, fuga de datos entre sesiones en SQLite y un controlador de ejecución monolítico de 6,182 líneas**.

| Capa / Subsistemas | Madurez Real AS-IS | Riesgo / Defecto Crítico Observado | Impacto en Producto Comercial EAM White-Label |
| :--- | :--- | :--- | :--- |
| **Identidad, Red y Entornos** | Conmutador de memoria QA/Local/Prod con verificación `/health` | Marca, dominio, hash QA y llaves de Supabase grabadas en código fuente | Impide compilar o parametrizar por tenant; expone proyecto Supabase único en binario. |
| **Seguridad y Sesión Offline** | Refresh proactivo resiliente offline (`_RefreshResult.offline`) + `SecureStorageService` | `logout()` limpia solo tokens; **`clearAllData()` en Drift no tiene ningún llamador activo** | Fuga local de órdenes/clientes/evidencias entre técnicos o empresas distintas en dispositivos compartidos. |
| **Motor SQLite (`AppDatabase`, v19)** | Esquema rico de 18 tablas (catálogos, multi-equipos, snapshots de mediciones, evidencias, firmas, pendientes, cola) | `mekanos_local.db` sin `tenant_id`; `payloadJson` guarda Base64 masivo en la cola | Crecimiento desproporcionado de SQLite con órdenes offline pesadas; sin partición multi-empresa. |
| **Sync Descarga (`SmartSyncService`)** | Compare `/sync/compare/:tecnicoId` + descarga acotada paralela (3 en vuelo) + timeout global 120s | Paso 4B (`404` del servidor) purga orden local **sin respetar `isDirty` ni cola pendiente** | Pérdida de trabajo de campo no subido si alguien elimina o desvincula la orden en Admin mientras el técnico está offline. |
| **Sync Subida (`OfflineSyncService` + `SyncUploadService`)** | Idempotencia pre-envío (`_verificarOrdenYaCompletada`), auto-`/iniciar`, recompresión JPEG 1600px q75 en isolate | Encola JSON + todas las fotos/firmas en **Base64 dentro de un único `POST /finalizar-completo`** (timeout 5 min) | Alta fragilidad en redes móviles lentas (subida monolítica todo-o-nada) y duplicación de bytes en SQLite. |
| **Ciclo de Vida (`DataLifecycleManager`)** | Retención inteligente configurable (7 días órdenes finales, 3 días archivos post-sync) con guardas `isDirty` | Dependiente de políticas globales sin concepto de empresa ni separación de caché por usuario | Funcional en mono-técnico; insuficiente sin limpieza al cambiar de sesión. |
| **Ejecución en Campo (`EjecucionScreen`)** | Soporta multi-equipo, `tipoControlInput` / `rolSemantico`, y `_MetricaUsoMobile` (CAL, CICLOS, KM, UPM, HORAS) | Archivo monolítico de **6,182 líneas**; fallback `_esBomba`; heurísticas secuestran `ESCALA_ESTADO`; prefijos mágicos | Mantenibilidad extrema comprometida; si un ítem es `ESCALA_ESTADO`, palabras clave en descripción rompen la intención del catálogo. |

---

## 2. Identidad, Red y Credenciales Embebidas

Todo el arranque de red e identidad visual asume exclusivamente a **MEKANOS S.A.S** y un único backend/Supabase:

1. **Identidad de paquete y UI:**
   - `pubspec.yaml:1-2`: `name: mekanos_mobile`, `description: "App móvil para técnicos Mekanos S.A.S..."`.
   - `main.dart:89, 115, 150`: `MekanosApp` con título `'Mekanos Técnicos'`.
   - `login_screen.dart:72, 209`: Título `'MEKANOS'` y label literal `'Conectando a: Servidor Mekanos (Producción)'`.
2. **Backend y descubrimiento local acoplados (`environment.dart:44-45`, `local_api_discovery.dart:21-27, 165`):**
   - URL permanente de producción hardcoded: `'https://api.mekanosapp.dpdns.org/api'`.
   - `LocalApiDiscovery` exige que `/api/health` devuelva `service == 'Mekanos API'` o `app == 'mekanos-api'`; cualquier API white-label con otro nombre de servicio sería rechazada como inválida.
   - Define constante de verificación QA `MEKANOS_QA_PASS_SHA256` (basado en `'mekanos#qa'`).
3. **Supabase Realtime hardcoded (`core/config/supabase_config.dart:10-16`):**
   - Contiene literalmente en código fuente `supabaseUrl = 'https://nemrrkaobdlwehfnetxs.supabase.co'` y su `supabaseAnonKey`.
   - No existe obtención dinámica de configuración de tenant/branding tras el login.

---

## 3. Base de Datos Local Drift (`v19`) y Brecha de Aislamiento Multi-Usuario

### 3.1 Estructura del Esquema Local (`apps/mobile/lib/core/database/app_database.dart`)
Con **1,679 líneas** y **`schemaVersion = 19`**, `AppDatabase` modela 18 tablas en un único archivo SQLite (`mekanos_local.db`):
- **Catálogos:** `EstadosOrden`, `TiposServicio`, `ParametrosCatalogo`, `ActividadesCatalogo` (incluye columnas v19 `naturalezaPersonalizada`, `tipoControlInput`, `configInputJson`, `rolSemantico`), `PendientesCatalogo`, `Clientes`, `Equipos` (con `configParametros` JSON).
- **Operación y Multi-Equipo:** `OrdenesEquipos`, `Ordenes` (con `horaEntradaTexto`/`horaSalidaTexto` planas para evadir bugs de timezone y `permiteEdicionTecnico`), `ActividadesPlan`, `ActividadesEjecutadas` (`observacion`, `observacionTecnico`, `respuestaJson`), `Mediciones` (con arquitectura *snapshot* de rangos/unidades para funcionar sin JOINs offline), `Evidencias`, `Firmas`, `OrdenesPendientes`.
- **Control Sync:** `SyncStatusEntries`, `OrdenesPendientesSync` (`payloadJson`, `estadoSync`, `intentos`).

### 3.2 Falla Arquitectónica Multi-Cuenta: Cerrar Sesión e Ingresar con Otra Cuenta (`logout` → `login`)

La app móvil **no soporta separación de información ni aislamiento operativo entre cuentas distintas** en un mismo dispositivo. La inspección de extremo a extremo confirma que el fallo ocurre en **5 capas simultáneas**:

1. **Capa Auth (`auth_service.dart:371-374` & `auth_provider.dart:47-75`):**
   - `AuthService.logout()` únicamente llama `await _storage.clearAll()` sobre `SecureStorageService` (tokens JWT y metadatos del usuario en `secure_storage.dart:110-112`).
   - `AuthNotifier.logout()` se limita a emitir `AuthState(status: AuthStatus.unauthenticated)` sin limpiar estado de sync ni cerrar o aislar la base de datos local. Tampoco `AuthService.login()` (`líneas 43-98`) detecta cambio de `user.id` o `idEmpleado`.
2. **Capa Base de Datos Singleton Única (`app_database.dart:1641, 1673-1678` & `database_service.dart:5-33`):**
   - `databaseProvider` abre una única instancia global sobre el archivo físico fijo **`mekanos_local.db`** durante toda la vida de `ProviderScope`.
   - Ninguna tabla local (`Ordenes`, `Clientes`, `Equipos`, `Evidencias`, `Firmas`, `OrdenesPendientes`, `OrdenesPendientesSync`) contiene `idUsuario`, `idTecnico` ni `idEmpresa`.
   - Aunque `app_database.dart:1641` declara `clearAllData()`, **una búsqueda en todo `apps/mobile/lib/` confirma cero invocaciones productivas** (solo un comentario en `app_lifecycle_observer.dart:191`).
3. **Capa Consultas UI sin Filtro de Propietario (`home_production_screen.dart:28-30` & `orden_repository.dart:53`):**
   - `quickStatsProvider` y `OrdenRepository` consultan `db.getAllOrdenes()` **sin cláusula `WHERE` por técnico o usuario**. Al entrar el Usuario B tras cerrar la sesión del Usuario A, ve inmediatamente en Home y listados todas las órdenes, clientes, fotos y firmas del Usuario A.
4. **Capa Preferencias de Sync Compartidas Globalmente (`sync_state.dart:100-206` & `sync_lifecycle_manager.dart:72, 255-265`):**
   - `SyncStateNotifier` persiste `last_sync_at`, `initial_sync_done` y `last_catalogs_sync_at` en `SharedPreferences` **sin prefijo de `userId`/`tecnicoId`**. Si el Usuario A ya sincronizó, al loguearse el Usuario B `isFirstSync` evalúa `false` y el cliente omite la descarga completa inicial (`forceFull`).
   - Además, `syncLifecycleManagerProvider` (`Provider.family` sin `autoDispose`) mantiene vivos el `Timer.periodic(5 min)` y el `WidgetsBindingObserver` del `tecnicoId` anterior tras el `logout()`.
5. **Capa Riesgo Cruzado de Subida Offline (`OrdenesPendientesSync` + `FinalizacionOrdenService`):**
   - Si el Usuario A cerró sesión con órdenes `isDirty` / `POR_SUBIR` en la cola local y el Usuario B inicia sesión, cualquier subida pendiente enviaría el trabajo del Usuario A **autenticado con el JWT del Usuario B** (y dado el comportamiento de reasignación silenciosa en backend y la ausencia de validación de identidad en `SyncController`, terminaría alterando autoría en el servidor). Inversamente, un borrado ciego de `mekanos_local.db` al hacer `logout()` destruiría trabajo offline aún no sincronizado del Usuario A.

---

## 4. Arquitectura de Sincronización Bidireccional y Conflictos

El móvil combina múltiples servicios de sincronización (`SyncService` para catálogos/delta inicial, `SmartSyncService` para comparación de órdenes, `OfflineSyncService` + `SyncUploadService` para cola y subida, `BackgroundSyncWorker` cada 30s al volver conectividad).

### 4.1 Descarga e Inconsistencia de Protección (`smart_sync_service.dart`)
- **Flujo (`líneas 226-655`):** Llama a `GET /sync/compare/:tecnicoId?limit=500` (timeout 20s), compara contra las órdenes locales por `idBackend` y descarga órdenes nuevas en lotes paralelos de `_descargasParalelas = 3` (cota total de sync `_plazoTotalSync = 120s`).
- **Actualización ligera vs completa:** Órdenes existentes solo actualizan `estado`, `urlPdf` y `permiteEdicionTecnico` (no re-descargan detalle); órdenes marcadas `esEstadoFinal` sin fila local se omiten deliberadamente porque `DataLifecycleManager` las purga tras 7 días.
- **Riesgo crítico de pérdida de trabajo (Paso 4B, `líneas 403-418`):**
  - El comentario en el código declara explícitamente: *"CRÍTICO: No usar isDirty ni enCola como guardas pre-verificación. El servidor es la fuente de verdad. Si dice 404, se purga todo incluyendo la cola de sync pendiente."*
  - Si un administrador elimina o archiva por error una orden mientras el técnico estuvo sin señal ejecutándola offline, el siguiente `SmartSync` borra localmente la orden y toda su evidencia en cola sin respaldo.

### 4.2 Subida Monolítica y Cola JSON Base64 (`offline_sync_service.dart` & `sync_upload_service.dart`)
- **Cola offline (`offline_sync_service.dart:48, 62-268`):** Guarda el payload completo serializado en `OrdenesPendientesSync.payloadJson` (`maxIntentos = 5`). Antes de reenviar, consulta `_verificarOrdenYaCompletada()` (evitando doble envío si la orden cerró en servidor pero cayó la respuesta HTTP), asegura `PUT /ordenes/:id/iniciar` si hace falta, y dispara `POST /ordenes/:id/finalizar-completo` (timeout 5 minutos).
- **Cuello de botella de payload único:** Aunque `sync_upload_service.dart:20-55` comprime fotos JPEG en isolate (`_maxUploadDimension = 1600`, calidad `75`), **todas las fotos y firmas viajan incrustadas en Base64 dentro de un solo cuerpo JSON** junto con actividades, mediciones y pendientes. No existe subida chunked/multiparte independiente por evidencia ni reanudación parcial si falla una foto en redes 3G/campo.
- **Dualidad de serialización (`sync_upload_service.dart:57-72`):** Aunque ya soporta `respuestaJson`, si no existe `respuestaJson` combina el valor estructurado y la nota del técnico usando el separador mágico `'|||'`.

---

## 5. Motor de Ejecución en Campo (`ejecucion_screen.dart` & `parametro_override_resolver.dart`)

### 5.1 Monolito UI de 6,182 líneas
`EjecucionScreen` concentra en un solo `ConsumerStatefulWidget` la gestión de tabs, carga Drift, cronómetro/telemetría, renderizado de todas las actividades especiales, diálogos de horómetro/batería/temperatura, subsistemas, pendientes y validación de cierre.

### 5.2 Convivencia conflictiva: Motor Declarativo EAM vs Heurísticas y `_esBomba`
En `_buildActividadInputWidget()` (`ejecucion_screen.dart:1492-1583`) se observa la transición incompleta hacia `UNIVERSAL_EAM`:

1. **Precedencia 1 (`rolSemantico`, líneas 1498–1524):** Mapea roles semánticos (`LECTURA_CONTADOR_ACTIVO`, `CORR_ESTADO_INICIAL`, `CORR_PROBLEMA`, `CORR_PENDIENTES`, etc.) hacia widgets dedicados.
2. **Precedencia 2 (`tipoControlInput`, líneas 1527–1535):** Si `tipoControlInput` es `LECTURA_CONTADOR`, `SUBSISTEMAS_EQUIPO` o **cualquier valor distinto de `'ESCALA_ESTADO'`**, delega en `_buildDeclarativoSelector()`.
3. **Trampa de Precedencia 3 (Heurística sobre default `'ESCALA_ESTADO'`, líneas 1440–1488 y 1537–1582):**
   - Porque `ESCALA_ESTADO` es el valor por defecto en BD (`withDefault('ESCALA_ESTADO')`), **todo ítem configurado como `ESCALA_ESTADO` cae al paso 3**: `_getTipoActividadEspecial(actividad.descripcion)`.
   - Allí busca subcadenas (`HOROMETRO`, `CARGA DE BATERIA`, `ELECTROLITOS DE BATERIA`, `TEMPERATURA`, `NIVEL DE COMBUSTIBLE`, `NIVEL DE ACEITE`), **secuestrando el control visual** definido en el catálogo Admin.
4. **Sistemas acoplados por texto legado (`ejecucion_screen.dart:3133-3176`):**
   - Aunque prioriza `_sistemasDinamicosEquipo`, si está vacío usa `bool _esBomba` (`detectado en línea 227 por nombreTipo.contains('BOMBA')`) para elegir entre dos arrays fijos en Dart: 10 sistemas de `'BOMBA'` o 11 sistemas de `'GENERADOR'`.
5. **Prefijos mágicos en texto (`ejecucion_screen.dart:2582-2804` y `observaciones`):**
   - Los selectores legacy escriben strings prefijados en el campo `observacion` (`BATERIA: 100%`, `SISTEMAS: MOTOR,CONTROL`, `HORAS: ...`) que luego el backend PDF tiene que parsear y limpiar con regex.

### 5.3 Avances EAM Valiosos ya Presentes en Mobile
- **`_MetricaUsoMobile` (`ejecucion_screen.dart:6030-6182`):** Lee `equipos.configParametros['_metrologia']` y adapta etiquetas, prefijos, íconos y diálogos para `CAL` (calendario), `CICLOS`, `KM_ODO`, `UPM`, unidades personalizadas y `HORAS` por defecto.
- **`ParametroOverrideResolver` (`parametro_override_resolver.dart:1-95`):** Replica exactamente la prioridad de overrides del backend (`por_parametro` → `parametros_adicionales` → `rangos` directo), aunque conserva en las líneas `34-71` dos diccionarios legacy exclusivos para `GEN_*` y `BOM_*`.
