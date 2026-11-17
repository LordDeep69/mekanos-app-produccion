# 09 — Arquitectura Objetivo: EAM/CMMS Comercial Single-Tenant White-Label Instalable

> **Modelo Comercial Aprobado:** **Single-Tenant White-Label Instalable** (un único código fuente unificado; cada empresa compradora o cliente comercial despliega su propia instancia aislada de PostgreSQL + API NestJS + Portal Admin Next.js + Almacenamiento + Email + App Móvil parametrizada sin editar código fuente).  
> **Principio Rector (Ente Universal de Lógica EAM):** Todo comportamiento de negocio, visual, regional, fiscal y documental nace de **metadatos declarativos y configuración en base de datos**, eliminando heurísticas de texto, IDs numéricos fijos, secretos fallback y acoplamientos a una sola empresa o vertical.  
> **Relación con Diagnóstico:** Este documento diseña la arquitectura objetivo que resuelve íntegramente los hallazgos `P0-01..P0-10`, `P1-01..P1-07`, `P2-01..P2-05` y `P3-01` inventariados en [08-DIAGNOSTICO-CONSOLIDADO-FINAL.md](./08-DIAGNOSTICO-CONSOLIDADO-FINAL.md).

---

## 1. Principios Arquitectónicos Rectores (Modelo A — White-Label Instalable)

1. **Single Codebase, Zero Per-Customer Forks:** Nunca se edita código fuente para vender el software a una nueva empresa de mantenimiento (de ascensores, HVAC, subestaciones, motobombas, generadores, puertas eléctricas, tuberías o multiservicio). Toda identidad, regla fiscal, moneda, zona horaria y nomenclatura documental vive en base de datos y variables de entorno de despliegue.
2. **Zona 2 como Única Autoridad:** Ninguna pantalla Admin, móvil o motor PDF puede contradecir o puentear los catálogos declarativos de BD (`tipos_equipo`, `modulos_tecnicos`, `atributos_tecnicos`, `catalogo_actividades.tipo_control_input`, `rol_semantico`, `unidades_medida`).
3. **Fail-Closed por Defecto en Seguridad:** Todo endpoint es privado por defecto (`APP_GUARD` JWT global) salvo decoración explícita `@Public()`; todo arranque en producción falla inmediatamente si faltan secretos criptográficos; todo acceso por técnico/cliente verifica propiedad del recurso (cero IDOR).
4. **Aislamiento Físico por Cuenta en Dispositivos Compartidos (Mobile):** Una app instalable en campo debe permitir cerrar sesión e ingresar con otra cuenta en la misma tablet o teléfono sin cruzar órdenes, cachés, colas de subida ni preferencias de sincronización.
5. **Compatibilidad Limpia de Migración + Cero Regresión:** La instancia existente debe poder migrar sus datos históricos hacia el modelo unificado mediante scripts idempotentes de transición antes de retirar columnas/tablas satélite legacy, mientras que una instancia nueva debe levantarse desde cero con `prisma migrate deploy` + `seed-core`.

---

## 2. Pilar 1 — Identidad Corporativa, Regionalización y Configuración Runtime

Para eliminar la dependencia de los 574 rastros de marca `mekanos`, de `COP`, `IVA 19%`, `UTC-5`, `America/Bogota` y `Cartagena` observados en la radiografía, se introduce el núcleo **`configuracion_organizacion`** como entidad singleton de la instancia:

### 2.1 Modelo de Datos `configuracion_organizacion` (PostgreSQL / Prisma)

| Bloque | Campos Clave | Propósito en el Ecosistema |
| :--- | :--- | :--- |
| **Identidad Fiscal y Legal** | `nombre_comercial`, `razon_social`, `tipo_id_fiscal`, `numero_id_fiscal` (NIT/RUC/RFC/Tax ID), `eslogan`, `sitio_web`, `email_contacto`, `telefono_principal`, `telefono_soporte`, `direccion_linea1`, `ciudad_defecto`, `departamento_defecto`, `pais_defecto`, `codigo_pais_iso` | Sustituye textos hardcoded `"MEKANOS S.A.S"`, `"CARTAGENA"`, `"BOLÍVAR"`, `"COLOMBIA"`, NIT `900.542.123-1` en Personas, Sedes, PDFs, Emails y Swagger. |
| **Identidad Visual (Branding)** | `logo_principal_url`, `logo_claro_url`, `isotipo_url`, `favicon_url`, `color_primario`, `color_secundario`, `color_acento`, `color_exito`, `color_alerta`, `color_peligro` | Hidrata CSS variables en Admin (`--brand-primary`, etc.), header de Login/Sidebar, tema Mobile post-login, emails HTML y cabecera/paleta PDF (reemplazando `MEKANOS_COLORS` y `logo-mekanos.png` en disco). |
| **Regionalización y Fiscalidad** | `zona_horaria` (ej. `America/Bogota`, `America/Mexico_City`, `Europe/Madrid`), `locale` (ej. `es-CO`, `es-MX`, `en-US`), `codigo_moneda` (`COP`, `USD`, `MXN`, `EUR`), `simbolo_moneda`, `decimales_moneda`, `etiqueta_impuesto` (`IVA`, `IGV`, `VAT`), `tasa_impuesto_defecto` (`Decimal`) | Elimina `horaCol = h - 5` en `SyncService`, `timeZone: 'America/Bogota'` en `@Cron`, `* 1.19` en KPIs OC y `formatCOP`/`es-CO` en Admin/PDF. |
| **Operación Documental y Legal** | `prefijo_orden`, `prefijo_cotizacion`, `prefijo_informe`, `prefijo_remision`, `prefijo_oc`, `prefijo_contrato`, `prefijo_propuesta`, `texto_pie_pdf`, `texto_disclaimer_repuestos_cliente`, `garantia_meses_defecto`, `validez_cotizacion_dias_defecto`, `requiere_firma_cliente_defecto` | Gobierna `NumeracionService`, textos legales de `mekanos-base.template.ts:2424`, footers de PDF y defaults de Cotizaciones/Órdenes sin hardcodes. |
| **Infraestructura y Canales** | `storage_prefijo_raiz` (reemplaza `'mekanos/evidencias'`), `politica_retencion_mobile_dias`, `modulo_comercial_activo`, `modulo_inventario_activo` | Desacopla rutas de R2/Cloudinary de la marca y permite activar/ocultar suites funcionales por cliente comprador. |

### 2.2 Contrato de Consumo Transversal
1. **Endpoint Público Bootstrap (`GET /api/configuracion/publica`, `@Public()`):** Expone únicamente identidad visual/regional no sensible (`nombre_comercial`, `logos`, `colores`, `locale`, `codigo_moneda`, `zona_horaria`, `etiqueta_impuesto`). Consumido en **Login Web (SSR/Client)**, **Header/ThemeProvider Admin** y **App Móvil** al conectar o iniciar sesión.
2. **Endpoint Administrativo (`GET/PUT /api/configuracion/empresa`, `@Roles('ADMIN')` + `@Permisos('CONFIG_SISTEMA')`):** Gestiona todos los campos fiscales, legales, prefijos y subida de logotipos al storage activo desde `/configuracion/empresa` en Portal Admin.
3. **Canales Email Agnósticos (`cuentas_email` ampliado):**
   - Evolucionar `cuentas_email` (`schema.prisma:2327`) haciendo opcionales `gmail_client_id`, `gmail_client_secret`, `gmail_refresh_token` y agregando `tipo_proveedor ('GMAIL_OAUTH2' | 'SMTP' | 'RESEND')`, `smtp_host`, `smtp_port`, `smtp_secure`, `smtp_user`, `smtp_password_cifrada`, `nombre_remitente`. Cifrado simétrico AES-256-GCM en BD usando clave de entorno; cero correos fallback `'mekanossas4@gmail.com'`.

---

## 3. Pilar 2 — Blindaje Zero-Trust de Autenticación, JWT y RBAC

Resuelve íntegramente `P0-01`, `P0-02`, `P0-03`, `P0-04` y `P0-10`:

1. **Emisión Real de Roles y Permisos en Auth (`auth.service.ts`):**
   - Eliminar `rol: 'USER'` hardcoded (`líneas 104, 250`) y el backdoor `usuario.email === 'admin@mekanos.com'` (`línea 192`).
   - Consultar `usuarios_roles -> roles -> roles_permisos -> permisos` al autenticar y emitir JWT con `{ sub, email, rolPrincipal, roles[], permisos[], idEmpleado }`. En `validateUser()`, invalidar el cache en memoria ante cambios de rol/estado/password del usuario.
2. **Fail-Fast Criptográfico y Limpieza de Credenciales:**
   - Eliminar todo secret fallback (`'fallback-secret'` en `jwt.strategy.ts:24`, `'mekanos-jwt-secret-ultra-secure...'` en `apps/admin/src/auth.ts:89`): en arranque (`onModuleInit` / `env.validation`), la API y Admin abortan el inicio si `JWT_SECRET` o `AUTH_SECRET` no están definidos o tienen longitud < 32 caracteres.
   - Eliminar columna `usuarios.password_plain` mediante migración (tras verificar migración total a `password_hash`) y agregar proyección `select` explícita obligatoria en `UsuariosService` para no exponer jamás hashes ni secretos 2FA.
3. **Inversión de Política de Guards HTTP (`APP_GUARD` Global):**
   - Registrar `JwtAuthGuard` y `RolesPermisosGuard` globalmente en `AppModule`.
   - Toda ruta nueva o existente queda **protegida por defecto**; únicamente endpoints de salud (`/health`), login (`/auth/login`, `/auth/refresh`) y `/configuracion/publica` llevan el decorador explícito `@Public()`.
   - Implementar `@Permisos(...)` + `PermisosGuard` sobre los 46 permisos existentes en `seed-rbac.ts` y aplicar `@Roles` / `@Permisos` en todos los controladores de negocio (`PdfController`, `EmailController`, `OrdenesController`, `CatalogoServiciosController`, `ItemsComponentesController`, `ItemsServiciosController`, `CuentasEmailController`, `CatalogosEamController`, etc.).
   - Activar `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` global en `main.ts` y reemplazar cualquier `dto as any` por DTOs validados con `class-validator`.
4. **Cierre de IDOR en `SyncController` y `DashboardService`:**
   - En `POST /sync/ordenes`, `GET /sync/download/:tecnicoId`, `GET /sync/compare/:tecnicoId` y `GET /sync/orden/:ordenId`: exigir que `user.idEmpleado === tecnicoId` (y pertenencia de la orden al técnico) salvo que `user` posea rol/permiso administrativo (`SUPERVISOR` / `ADMIN`).
   - En `DashboardService`: filtrar `notificaciones` estrictamente por `id_usuario: req.user.id` e indexar/invalidar caches por scope de usuario/permiso cuando aplique.
5. **Next.js Admin Route Guard por Rol/Permiso (`middleware.ts`):** Validar rol y permisos desde sesión NextAuth antes de renderizar `/configuracion/*`, `/usuarios/*`, `/empleados/*` y `/compras/*`.

---

## 4. Pilar 3 — Capa de Datos Pura (PostgreSQL/Prisma) y Gobierno de Migraciones

Resuelve `P0-08`, `P1-02`, `P1-03` y `P2-02`:

1. **Consolidación del Metamodelo de Activos (Fin de Tablas Satélite como Fuente Primaria):**
   - Todas las propiedades específicas de motores, generadores, bombas, ascensores, puertas, HVAC, subestaciones o tuberías viven unificadamente en `equipos.especificaciones` (JSONB validado contra `tipo_equipo_modulos -> modulo_atributos -> atributos_tecnicos`) + proyección B-Tree indexada en `equipos_atributos_filtro` (corrigiendo `unidad_base_codigo` y `parametros_medicion.unidad_codigo` a **`VarChar(20)`** para empatar con `unidades_medida.codigo`).
   - Retirar progresivamente columnas intrusivas en `equipos` (`fecha_inicio_servicio_mekanos`, `estado_pintura`, `requiere_pintura`, `intervalo_tipo_a/b_*` redundantes frente a `tipo_equipo_planes`) y generalizar `horas_actuales` / `fecha_ultima_lectura_horas` hacia `lectura_uso_actual` + `fecha_ultima_lectura_uso` (acompañado por `tipos_equipo.unidad_uso` ya existente).
   - **Desbloqueo de `tipos_equipo.categoria` y `tipos_componente`:**
     - Sustituir la restricción de `categoria_equipo_enum` (5 valores cerrados) por un catálogo configurable en BD (`categorias_activo`, sembrado inicialmente con Energía, Hidráulica, Climatización, Compresión, Transporte Vertical, Accesos Automáticos, Subestaciones/Media Tensión, Infraestructura/Tuberías, Otro — extensible desde Admin).
     - Reemplazar `aplicabilidad_enum` (`GENERADOR | BOMBA | AMBOS`) en `tipos_componente` por `aplica_todos_tipos: Boolean` + tabla puente `tipos_componente_tipo_equipo (id_tipo_componente, id_tipo_equipo)` para que **cualquier repuesto o consumible aplique a 1, N o todos los arquetipos**.
     - Evolucionar `criterio_intervalo_enum` en contratos/equipos hacia criterios agnósticos (`CALENDARIO | METRICA_USO | MIXTO_PRIMER_UMBRAL`).
2. **Saneamiento de Integridad DDL y Concurrencia:**
   - Convertir las **25 tablas con `@id` manual** sin `autoincrement()` a secuencias PostgreSQL nativas (`GENERATED BY DEFAULT AS IDENTITY` / `autoincrement()`), eliminando `getNextTableId()` (`MAX + 1`).
   - Unificar la generación de consecutivos (`ORD`, `LOT`, `REM`, `COT`, `CONT`, `OC`, etc.) mediante bloqueo transaccional parametrizado en `sequence_counter` (eliminando `$queryRawUnsafe` en `InventarioService` y `Date.now()` en `Remisiones`, y el `findFirst` sin lock en `Ordenes`).
   - Auditar y corregir las **85 relaciones con `onDelete: SetNull` sobre FKs `NOT NULL`** en `schema.prisma` a `onDelete: Restrict` / `NoAction` o `Cascade` coherente con el dominio.
3. **Estrategia Limpia de Migraciones y Seeds en 2 Niveles:**
   - Reconstruir una línea base oficial única en `packages/database/prisma/migrations/` (eliminando `.sql` sueltos y `manual/`) compatible 100% con `prisma migrate deploy` desde una BD vacía, más script de migración segura para la BD histórica existente.
   - Separar seeds en:
     - **`seed-core` (Obligatorio en toda instalación nueva):** Estados de orden/cotización, roles y 46 permisos base, usuario administrador inicial configurable vía ENV, magnitudes SI/imperiales con factores físicos exactos (eliminando el `KVA factor_a: 0.8` fijo como si fuera verdad física global), escalas/modos de respuesta neutros y arquetipos base vacíos listos para activar.
     - **`seed-catalog-presets` (Packs opcionales instalables desde EAM Studio):** Plantillas de referencia de alta calidad para Plantas Eléctricas, Motobombas, Ascensores, Escaleras Eléctricas, Puertas Automáticas, Subestaciones, HVAC y Tuberías (sin datos de Cartagena ni nombres de personas/clientes demo).
   - Retirar los >85 scripts ad-hoc de `packages/database/` fuera del paquete productivo (moverlos a `tools/legacy-scripts` o eliminarlos) y suprimir el `taskkill` sobre el puerto 3000 de `pregenerate.js`.

---

## 5. Pilar 4 — Backend Consolidado, Transaccional y Sin Duplicidad

Resuelve `P0-06`, `P0-07`, `P0-08`, `P1-02..P1-05`, `P2-01` y `P2-03`:

1. **Extirpación de Reglas Legacy por ID/Texto en Servicios EAM:**
   - Eliminar `PARES_CANONICOS`, `ALIAS_SECUNDARIOS_OCULTOS` y `LEGACY_PROTECTED_CODES` de `CatalogosEamService`; toda referencia entre equipos, módulos, sistemas y planes ocurre por clave natural (`codigo_tipo`) o FK directa real sin ocultar filas.
   - Hacer que `UomConversionService` refresque su cache desde `CatalogosEamService` en cada `createUnidad`/`updateUnidad` (o lea desde cache invalidable con evento de dominio).
   - Retirar el dual-write con valores inventados (`1800 rpm`, `'15W40'`) de `EquiposGestionService`, consolidar `POST /equipos` en una sola ruta coherente (eliminando la bifurcación hueca `CreateEquipoHandler` vs `/gestion-completa`), y reescribir `obtenerFacetasDinamicas()` para consultar exclusivamente `equipos_atributos_filtro` (B-Tree dinámico) + `marcas`, habilitando facetas reales para ascensores, HVAC, subestaciones, etc.
   - Sustituir el caché `tiene_plantas`/`tiene_bombas` de `ClientesService` por un agregador dinámico `resumen_tipos_equipo: Array<{ id_tipo_equipo, codigo_tipo, nombre_tipo, cantidad }>`.
2. **Transaccionalidad Atómica en `FinalizacionOrdenService`:**
   - Subir primero archivos binarios validados (con rollback compensatorio de objetos subidos si aborta después) y ejecutar toda la sustitución en BD (`actividades`, `mediciones`, `evidencias`, `firmas`, `pendientes`, actualización de estado y contador de uso del equipo) dentro de **una única `prisma.$transaction()`**. En caso de re-subida autorizada, nunca ejecutar `deleteMany` destructivo fuera de transacción antes de asegurar la persistencia completa.
   - Leer `cliente.persona.numero_identificacion` y `orden.sedes_cliente.ciudad_sede`.
   - Exigir política explícita de reasignación en lugar de reasignación silenciosa al finalizar órdenes de otro técnico.
   - Sincronizar el contador de desgaste del activo leyendo exclusivamente `rol_semantico = 'LECTURA_CONTADOR_ACTIVO'` / `tipo_control_input = 'LECTURA_CONTADOR'` (cero `esParametroHorometro()` por regex).
3. **Reparación de Módulos Periféricos, Crons y Consolidación de Duplicados:**
   - **Consolidar 1 sola implementación por dominio:** Eliminar código muerto confirmado (`CotizacionesFacadeService`, `GeneradorDocumentosFacadeService`, `apps/api/src/propuestas-correctivo/`, controladores raíz muertos en `catalogo-actividades`/`catalogo-sistemas`/`catalogo-servicios`). Unificar `ContratosMantenimiento` + `CronogramasServicio` con `ProgramacionFacadeService` bajo un módulo inyectado formalmente en DI.
   - **Reparar `TareasProgramadasService`:** Inyectar `ProgramacionFacadeService` correctamente vía NestJS DI (con `NumeracionService` real, eliminando `new ProgramacionFacadeService(this.prisma, null as any)`), resolver `id_asesor_responsable -> empleado -> persona -> usuario.id_usuario` antes de notificar en Job 3, y gobernar los cortes horarios desde `configuracion_organizacion.zona_horaria`.
   - **Parametrizar Fiscalidad, SQL y Moneda:** `OrdenesCompraRepository.getResumenKpis()` calcula impuestos desde líneas reales / `tasa_impuesto_defecto` (nunca `* 1.19`); `BitacorasService` reemplaza `$queryRawUnsafe` con strings interpolados por Prisma tipado o `$queryRaw` parametrizado usando `codigo_tipo` (sin `::categoria_equipo_enum`).
   - **Storage Neutro y Agnóstico (`StorageService`):** Unificar `R2StorageService` y `CloudinaryService` detrás de una interfaz única con **1 bucket/cuenta configurado por instancia** y prefijo jerárquico limpio `<storage_prefijo_raiz>/<año>/<mes>/ordenes/<id>/...` (adiós división `PLANTAS | BOMBAS` y carpeta `mekanos/evidencias`).

---

## 6. Pilar 5 — Portal Admin White-Label 100% Dinámico y Operativo

Resuelve `P1-01..P1-06`, `P2-01` y `P3-01`:

1. **Theme & Brand Hydration Layer:**
   - Root layout de `apps/admin` carga `configuracion/publica` y aplica variables CSS dinámicas (`--brand-primary`, `--brand-secondary`, etc.), logo dinámico en Sidebar y Login, `<title>` y metadata dinámicos (eliminando `--mekanos-*`, `<Zap/>` hardcoded y `"MEKANOS"`).
   - Nueva pantalla **`/configuracion/empresa`** con pestañas: Identidad & Marca (subida de logo/favicon y color picker con vista previa), Regionalización & Impuestos (moneda, tasa, timezone, locale), Documentos & Legales (prefijos, textos PDF, garantías), Storage & Email SMTP/OAuth2.
2. **Eliminación Completa de Heurísticas, IDs Físicos y Verticales Cerradas en Operación:**
   - Eliminar `FAMILIA_POR_ID_TIPO_EQUIPO` (`familia-equipo.ts`); todo componente visual lee `tipo_equipo.icono_ui`, `tipo_equipo.color_hex`, `tipo_equipo.codigo_tipo`, `tipo_equipo.nombre_tipo` directo desde el API.
   - `/equipos/page.tsx`: sustituir las tarjetas fijas *"Plantas Eléctricas / Sistemas de Bombeo"* por tarjetas dinámicas generadas del resumen por arquetipo activo en el tenant; `EquipoForm.tsx` arranca sin default `'GENERADOR'` ni `id_tipo_equipo: 1`, cargando siempre arquetipos reales de BD.
   - `/clientes`: reemplazar filtro `'PLANTAS' | 'BOMBAS' | 'AMBOS'` por selector múltiple dinámico de los tipos de equipo configurados en la organización.
   - `/ordenes/nueva`: reemplazar tabs fijos `GEN` / `BOM` por tabs/filtros dinámicos de los tipos de equipo reales del cliente/catálogo.
   - `actividad-card-advanced.tsx`: eliminar `descripcionEsInputEstructurado()` y renderizar estrictamente desde `tipo_control_input` + `config_input_json` + `rol_semantico`.
   - `Formatters` centralizados (`useOrgFormatters()`): reemplazan `formatCOP`, `valorPendienteCOP`, `es-CO` en Compras, Dashboard y Reportes por `Intl.NumberFormat(org.locale, { currency: org.codigo_moneda })` y `org.zona_horaria`.
   - Eliminar los 5 archivos `.tmp/.tmp2/.FINAL/.RECOVERY/.RESTORED` en `apps/admin/src/features/ordenes/api/` y limpiar los contadores hardcoded (`464 equipos`, `145 campos`, `"MEKANOS"`) en `configuracion/page.tsx`, `catalogos-eam/page.tsx` y `ModoRespuestaSelector.tsx`.
3. **Completitud Comercial en Portal Admin (Cierre de Brecha UI):**
   - Incorporar rutas bajo `(dashboard)/` conectadas a los módulos ya existentes en API:
     - `/comercial/cotizaciones` y `/comercial/propuestas` (con conversión a Orden de Servicio y vista PDF).
     - `/contratos` y `/cronogramas` (gestión de contratos preventivos, equipos cubiertos por criterio flexible y vista de programación).
     - `/inventario/remisiones` (despacho a técnicos, sedes u obras conectado a `Remisiones` + WMS).

---

## 7. Pilar 6 — App Móvil Offline-First Aislada, Multi-Cuenta y Declarativa

Resuelve `P0-05`, `P0-09`, `P1-04`, `P1-07`, `P2-05` y `P3-01`:

1. **Arquitectura Multi-Cuenta Real en Dispositivo (`logout` ↔ `login`):**
   - **Aislamiento físico por perfil (`usuario_${userId}_env_${hostHash}`):**
     - `AppDatabase` deja de abrir el archivo único `mekanos_local.db`. Se parametriza por clave de sesión: `db_${userId}.sqlite`, además de un directorio de evidencias/firmas por usuario (`media/user_${userId}/`) y claves en `SharedPreferences` prefijadas por `user_${userId}_*` (`last_sync_at`, `initial_sync_done`, `last_catalogs_sync_at`).
     - Al hacer `login()` con una cuenta distinta en el mismo dispositivo, Riverpod reinicializa un `ProviderScope` o `sessionContainer` ligado al `userId` autenticado (`ref.invalidate` limpio + `syncLifecycleManagerProvider.autoDispose` que cancela timers y observers inmediatamente al `logout()`), cargando únicamente el archivo SQLite propio de esa cuenta.
   - **Protocolo Zero-Trust de `logout()` ante colas `POR_SUBIR`:**
     - Antes de cerrar sesión, la UI consulta `countPendingSync()` / `OrdenesPendientesSync`. Si existen órdenes locales sin sincronizar, advierte explícitamente al técnico (*"Tienes N órdenes pendientes por subir; quedarán resguardadas en tu perfil hasta que vuelvas a iniciar sesión"*), detiene workers/timers de subida y cierra ordenadamente la conexión Drift de esa cuenta sin borrar su trabajo pendiente ni exponerlo al siguiente usuario.
2. **White-Label y Descubrimiento Agnóstico:**
   - Parametrización en build mediante flavor / `--dart-define` (`APP_NAME`, `APP_ID`, `DEFAULT_API_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, permitiendo además ocultar Realtime si no se usa Supabase) + hidratación post-conexión de colores/logo desde `GET /api/configuracion/publica`.
   - `LocalApiDiscovery`: identificar servidores compatibles mediante contrato genérico de `/api/health` (`compatibility: 'eam-platform-v1'`), sin exigir literal `'Mekanos API'`, y mover cualquier acceso QA a flags de compilación debug/staging (sin password hash fijo en APK de producción).
3. **Motor de Ejecución Modular y 100% Declarativo:**
   - Descomponer el monolito `ejecucion_screen.dart` (6,182 líneas) en widgets especializados (`ActividadChecklistTile`, `InputControlDispatcher`, `MetricaUsoDialog`, `SistemasAfectadosSelector`, `MedicionesTab`, `ResumenFinalizacionTab`).
   - **Eliminar la trampa de `ESCALA_ESTADO`:** si `tipo_control_input` es un primitivo válido (`ESCALA_ESTADO`, `BINARIO`, `CONFORMIDAD`, `NIVEL`, `ESTADO_OPERATIVO`, `LECTURA_CONTADOR`, `PERSONALIZADO`), **se renderiza exactamente ese control**; las heurísticas por texto desaparecen del flujo estándar (solo eventual migración única de datos antiguos en BD, nunca en UI runtime).
   - Eliminar `bool _esBomba` y diccionarios `GEN_`/`BOM_` en `ParametroOverrideResolver`; el selector de sistemas afectados consume exclusivamente `sistemas` dinámicos sincronizados del equipo/arquetipo en `SyncService` (descargando también esquema técnico resumido para consulta en campo offline).
4. **Resiliencia de Sincronización:**
   - **Protección de trabajo `isDirty` en Paso 4B de `SmartSyncService`:** Si el backend responde `404` sobre una orden que tiene `isDirty = true` o entrada en `OrdenesPendientesSync`, **NO purgarla silenciosamente**; moverla a estado `CONFLICTO_ELIMINADA` para inspección o recuperación en la pantalla de sincronización pendiente.
   - **Desacople de subida multimedia vs JSON:** Subir evidencias fotográficas y firmas como archivos binarios individuales con reanudación/reintento unitario (almacenando `rutaLocal` en SQLite en vez de duplicar megabytes Base64 dentro de `payloadJson`) y luego enviar el payload ligero transaccional a `/finalizar-completo` referenciando los IDs/URLs ya subidos.

---

## 8. Pilar 7 — Motor Documental PDF Unificado y White-Label

Resuelve `P0-02`, `P1-01`, `P1-05` y `P2-04`:

1. **Unificación del Pipeline Documental:**
   - Extraer toda la carga y ensamblado de datos de `PdfController` (hoy 3,221 líneas) hacia `PdfAssemblerService` para que `GET /ordenes/:id/pdf` y `regenerarPdfOrden` compartan **una única fuente de verdad** (sin lógica duplicada ni el parche `if (orden.numero_orden === 'OS-202607-0134')`).
   - Proteger `PdfController` con `JwtAuthGuard` y `@Permisos` granulares.
2. **Convergencia de Templates y Ruteo Declarativo:**
   - Corregir `dto/pdf.dto.ts` y el `switch` de `obtenerHTML()` en `PdfService` para que todos los tipos declarados (`UNIVERSAL_EAM`, `CORRECTIVO`, `COTIZACION`, `PROPUESTA_CORRECTIVO`, `REMISION`, `ORDEN_COMPRA`, `TRAZABILIDAD`) enruten correctamente a su template real sin caer en `default`.
   - Gobernar la selección de plantilla desde una propiedad explícita de `tipos_servicio` / `tipos_equipo` (`formato_documento: 'CHECKLIST_EAM' | 'NARRATIVO_CORRECTIVO'`) haciendo que **todos los equipos** (incluidos Generadores y Bombas nuevos o migrados) usen el motor polimórfico `UNIVERSAL_EAM` o `CORRECTIVO` (conservando eventualmente modo lectura legado solo si una empresa explícitamente lo configura para históricos).
   - Eliminar `esActividadMedicion()` y `deducirUnidadParametro()` por regex en `tipo-universal-eam.template.ts`, usando exclusivamente los metadatos reales del catálogo (`idParametroMedicion`, `tipoActividad`, `unidad`).
   - Migrar las capturas narrativas de Mobile a `respuesta_json` estructurado para retirar la limpieza de 14 prefijos de texto en `adaptarDatosParaCorrectivo()`.
   - Parametrizar `pdf-naming.helper.ts` y `apps/admin/src/lib/pdf-naming.ts` leyendo el nombre real del `tipo_equipo` y `tipo_servicio` desde BD en lugar de traducir `'GENERADOR'/'MOTOR' -> 'PLANTA'`.
3. **White-Label Documental y Salud de Chromium:**
   - Todos los templates HTML/PDF y `EmailTemplatesService` reciben un objeto `OrgBrandingContext` proveniente de `configuracion_organizacion` (logos desde URL/cache en memoria sin leer `logo-mekanos.png` en disco, paleta CSS dinámica sin `MEKANOS_COLORS`, NIT/dirección/contacto dinámicos en `generarFooterCorporativo`, disclaimer de repuestos sin `"Mekanos S.A.S."`, cotizaciones sin `<svg>MEKANOS</svg>`).
   - Retirar `execSync('npx puppeteer browsers install chrome')` del flujo de petición HTTP (el binario de Chromium se instala en imagen Docker / build step del servidor) y garantizar cierre simétrico/pool controlado de instancias browser también en `generarPDFCotizacion()`.
