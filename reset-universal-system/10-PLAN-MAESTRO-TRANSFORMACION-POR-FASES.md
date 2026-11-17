# 10 — Plan Maestro de Transformación por Fases (De Mekanos Single-Codebase a EAM Comercial White-Label)

> **Propósito:** Secuencia operativa ejecutable, ordenada por dependencias estrictas y verificable por Gates, para transformar el ecosistema diagnosticado en `00`–`08` hacia la Arquitectura Objetivo definida en [09-ARQUITECTURA-OBJETIVO-WHITE-LABEL.md](./09-ARQUITECTURA-OBJETIVO-WHITE-LABEL.md) bajo el modelo **Single-Tenant White-Label Instalable**.  
> **Principio de Ejecución Segura:** Ninguna fase posterior inicia hasta que todos los criterios de verificación (tests automatizados, compilación estricta y validación funcional) de la fase previa hayan pasado.

---

## 1. Mapa de Fases y Grafo de Dependencias

```text
[FASE 0: Higiene, Env-Secrets & Contención P0 de Seguridad]
        │
        ▼
[FASE 1: Cimientos de BD, Config White-Label, Migraciones & RBAC Real]
        │
        ├──────────────────────────────┐
        ▼                              ▼
[FASE 2: Desacople API Núcleo]   [FASE 3: Motor Documental PDF/Email White-Label]
  (EAM puro, Equipos, Finalización,    (OrgBrandingContext, Switch reparado,
   Sync sin IDOR, Crons, Storage)       UNIVERSAL_EAM unificado, Pool Chromium)
        │                              │
        └──────────────┬───────────────┘
                       ▼
[FASE 4: Portal Admin White-Label, Tema Dinámico & Cobertura Comercial]
  (/configuracion/empresa, Cero IDs fijos/Plantas-Bombas, Cotizaciones/Contratos/Remisiones)
                       │
                       ▼
[FASE 5: Mobile Offline-First Multi-Cuenta, Declarativo y Agnóstico]
  (Aislamiento SQLite/Prefs/Timers por cuenta, Cero _esBomba/ESCALA_ESTADO trap, Upload desacoplado)
                       │
                       ▼
[FASE 6: Empaquetado Instalable, Seeds Limpios & Certificación E2E V1–V8]
```

---

## 2. Desglose Atómico por Fase

### Fase 0 · Contención Crítica de Seguridad y Limpieza del Monorepo
**Objetivo:** Cerrar brechas `P0` inmediatas y limpiar ruido técnico sin alterar aún el modelo relacional profundo.
- **Acciones principales:**
  1. Eliminar secretos fallback en `apps/api/src/auth/strategies/jwt.strategy.ts:24` y `apps/admin/src/auth.ts:89`; exigir validación obligatoria de env vars al arrancar.
  2. Corregir emisión real de `rol` y `roles[]` en `AuthService.login()` y `generateTokens()` (`apps/api/src/auth/auth.service.ts:104, 250`), y eliminar el backdoor `'admin@mekanos.com'` (`línea 192`).
  3. Activar `APP_GUARD` con `JwtAuthGuard` global + decorador `@Public()` opt-in en endpoints públicos (`/health`, `/auth/login`, `/auth/refresh`), cerrando de inmediato `PdfController`, `EmailController`, `CatalogoServiciosController`, `ItemsComponentesController`, `ItemsServiciosController` y rutas abiertas de `OrdenesController`.
  4. Cerrar los **4 IDOR en `SyncController`** verificando `user.idEmpleado === tecnicoId` (o permiso supervisor/admin) y filtrar `notificaciones` por `id_usuario` en `DashboardService`.
  5. Añadir proyección `select` segura en `UsuariosService.findAll/findOne` (evitando devolver `password_hash`/`password_plain`/`secret_2fa`).
  6. Limpiar los 5 archivos basura (`catalogos.service.ts.FINAL/.RECOVERY/.RESTORED/.tmp/.tmp2`) en Admin, retirar `packages/database/scripts/pregenerate.js` (mata puerto `3000`) y mover los >85 scripts ad-hoc fuera de `packages/database`.
- **Gate de Verificación F0:** Requests sin token a PDF/Email/Órdenes devuelven `401`; técnico A no puede descargar órdenes del técnico B (`403`); JWT firmado contiene el rol real de BD; `GET /usuarios` no filtra hashes; build completo verde.

---

### Fase 1 · Cimientos White-Label, Seguridad RBAC, Integridad DDL y Migraciones
**Objetivo:** Crear la columna vertebral configurable y sanear Postgres para soportar despliegues limpios a cualquier comprador.
- **Acciones principales:**
  1. **Nueva tabla `configuracion_organizacion`** + API (`GET /api/configuracion/publica` `@Public()`, `GET/PUT /api/configuracion/empresa` `@Roles('ADMIN')`) cubriendo identidad fiscal, branding visual, regionalización (moneda, tasa impuesto, locale, zona horaria), prefijos documentales, textos legales PDF y prefijo de storage.
  2. **RBAC real y `ValidationPipe` estricto:** Implementar `PermisosGuard` + `@Permisos(...)` conectado a los 46 permisos existentes; activar `whitelist: true, forbidNonWhitelisted: true` en `main.ts`; reemplazar los `createDto as any` / `updateDto as any` en contratos, cronogramas y servicios planos por DTOs explícitos; retirar `password_plain` del esquema.
  3. **Saneamiento DDL e Integridad EAM:**
     - Crear tabla `categorias_activo` extensible y relación N:M `tipos_componente_tipo_equipo` (+ `aplica_todos_tipos`) para jubilar `aplicabilidad_enum (GENERADOR | BOMBA | AMBOS)` y permitir repuestos en `V1–V8`.
     - Evolucionar `cuentas_email` para soportar tanto `SMTP` estándar como `GMAIL_OAUTH2` opcional (haciendo nulables las credenciales Gmail y cifrando contraseñas SMTP en BD).
     - Ampliar `parametros_medicion.unidad_codigo` y `equipos_atributos_filtro.unidad_base_codigo` de `VarChar(10)` a **`VarChar(20)`**.
     - Migrar las **25 PKs manuales** a `IDENTITY / autoincrement()` eliminando `getNextTableId()` (`MAX + 1`), y corregir las **85 relaciones `onDelete: SetNull` sobre FKs `NOT NULL`**.
     - Agregar en `equipos` campos agnósticos (`lectura_uso_actual`, `fecha_ultima_lectura_uso`) migrando valores desde `horas_actuales`.
  4. **Reconstrucción de Migraciones y Seeds en 2 niveles:**
     - Consolidar `packages/database/prisma/migrations/` en cadena reproducible para `prisma migrate deploy` desde BD vacía + ruta de actualización segura para instancia existente.
     - Implementar `seed-core` (neutro, sin Mekanos/Cartagena/KVA=0.8) y `seed-catalog-presets` opcional por vertical (`V1`–`V8`).
- **Gate de Verificación F1:** Levantar una BD PostgreSQL vacía desde cero ejecutando únicamente `prisma migrate deploy` + `seed-core`; crear una organización ficticia vía API con moneda USD, IVA 16%, `Europe/Madrid`; crear tipo de componente aplicable a Ascensores con unidad de 15 caracteres; test de concurrencia sobre inserción simultánea sin `P2002`.

---

### Fase 2 · Refactorización y Consolidación del Backend (`apps/api`)
**Objetivo:** Unificar motores duplicados, eliminar la lógica `Plantas vs Bombas`, reparar bugs críticos y hacer la API 100% paramétrica.
- **Acciones principales:**
  1. **EAM Puro en `catalogos-eam` & `equipos`:**
     - Eliminar `PARES_CANONICOS`, `ALIAS_SECUNDARIOS_OCULTOS`, `LEGACY_PROTECTED_CODES`, dual-write inventado (`1800 rpm`, `'15W40'`) y consolidar `POST /equipos` en un único flujo polimórfico EAM + B-Tree.
     - Sincronizar caché de `UomConversionService` tras mutaciones de unidades en EAM Studio.
     - Reescribir `obtenerFacetasDinamicas()` usando exclusivamente `equipos_atributos_filtro` + `marcas`, y `ClientesService` agregando conteo dinámico por `tipos_equipo` (sin `tiene_plantas`/`tiene_bombas`).
  2. **Finalización Atómica y Sync Agnóstico:**
     - Refactorizar `FinalizacionOrdenService`: desacoplar subida de binarios de la transacción BD y envolver la mutación de orden/actividades/mediciones/evidencias/firmas/pendientes/lectura de uso en una sola `$transaction()` (fin del Paso 1.5 destructivo irreversible).
     - Leer `numero_identificacion` y `ciudad_sede`; actualizar contador de uso exclusivamente por `rol_semantico` / `tipo_control_input`; retirar reasignación silenciosa de técnico.
     - En `SyncService`: convertir horas según `configuracion_organizacion.zona_horaria` (sin `h - 5`), igualar query `catalogo_actividades` entre full y delta sync, incluir lista de `sistemas` dinámicos del equipo/arquetipo para ejecución offline, y usar bloqueo `sequence_counter FOR UPDATE` en correlativos.
  3. **Limpieza de Periféricos, Crons y Storage:**
     - Eliminar código muerto (`CotizacionesFacadeService`, `GeneradorDocumentosFacadeService`, `apps/api/src/propuestas-correctivo/`, controladores raíz huérfanos en `catalogo-*`).
     - Reparar `TareasProgramadasService` inyectando `ProgramacionFacadeService` con `NumeracionService` por DI, resolviendo `empleado -> persona -> id_usuario` en Job 3 y leyendo `zona_horaria` de BD en los crons.
     - Eliminar `* 1.19` de `OrdenesCompraRepository`, reemplazar `$queryRawUnsafe` en `BitacorasService` e `InventarioService`, y unificar `StorageService` con bucket/prefijo neutro (eliminando `'PLANTAS' | 'BOMBAS'` y `'mekanos/evidencias'`).
- **Gate de Verificación F2:** Suites unitarias/integración de `FinalizacionOrdenService` ante fallo simulado de PDF/Storage (datos previos intactos), prueba de ejecución manual de Job 3 y Job 4 sin excepciones, prueba de facetas sobre un activo Ascensor recién creado.

---

### Fase 3 · Motor Documental PDF & Email Transaccional White-Label
**Objetivo:** Entregar PDFs y correos corporativos 100% controlados por `configuracion_organizacion` y unificados en el motor universal.
- **Acciones principales:**
  1. Refactorizar `PdfController` delegando la recopilación en `PdfAssemblerService` (eliminando duplicación y retirando el hardcode `OS-202607-0134`).
  2. Reparar `dto/pdf.dto.ts` y `PdfService.obtenerHTML()` para soportar correctamente todos los documentos (`UNIVERSAL_EAM`, `CORRECTIVO`, `COTIZACION`, `PROPUESTA_CORRECTIVO`, `REMISION`, `ORDEN_COMPRA`, `TRAZABILIDAD`).
  3. Gobernar el template por propiedad declarativa de `tipos_servicio` / `tipos_equipo` (convergiendo hacia `UNIVERSAL_EAM` y `CORRECTIVO`, retirando heurísticas `esActividadMedicion` / `deducirUnidadParametro` y leyendo datos de `respuesta_json` en correctivos).
  4. Inyectar `OrgBrandingContext` en todos los templates PDF, en `EmailTemplatesService` y en `pdf-naming.helper.ts` (adiós `MEKANOS_COLORS`, `logo-mekanos.png`, NIT/Cartagena/teléfonos fijos, `<svg>MEKANOS</svg>`, `mekanossas4@gmail.com`, y traducciones `'PLANTA'`/`'BOMBA'`).
  5. Eliminar `execSync` de instalación de Chrome durante peticiones HTTP y garantizar gestión simétrica/reutilizable del browser (también en `generarPDFCotizacion()`).
- **Gate de Verificación F3:** Generar PDFs de orden preventiva (Ascensor y Generador), orden correctiva, cotización, remisión y OC con branding de dos empresas de prueba distintas ("Ascensores del Sur" en USD vs "ClimaTotal" en EUR) verificando cero apariciones de "Mekanos", "Cartagena" o "COP".

---

### Fase 4 · Portal Admin White-Label 100% Paramétrico y Cobertura Comercial
**Objetivo:** Hacer del Portal Admin (`apps/admin`) una interfaz fluida, multi-activo, con tema vivo y con pantallas completas para todo el negocio.
- **Acciones principales:**
  1. Crear `BrandingProvider` hidratado desde `/api/configuracion/publica`, reemplazando `--mekanos-*`, sidebar `<Zap/> / MEKANOS`, título/favicon de pestaña y construyendo la pantalla **`/configuracion/empresa`**.
  2. Aplicar protección RBAC en `apps/admin/src/middleware.ts` y en menús según rol/permisos reales de sesión.
  3. **Limpieza Zona 3 en operación diaria:**
     - Retirar `FAMILIA_POR_ID_TIPO_EQUIPO` (`familia-equipo.ts`) y renderizar iconos/colores desde BD.
     - Actualizar `/equipos` (KPIs agrupados dinámicamente por tipos de equipo reales), `EquipoForm` (sin default `GENERADOR` / `id: 1`), `/clientes` (filtro dinámico multi-tipo en lugar de `PLANTAS | BOMBAS`), `/ordenes/nueva` (sin tabs `GEN`/`BOM`) y `actividad-card-advanced.tsx` (sin `descripcionEsInputEstructurado()`).
     - Unificar `useOrgFormatters()` (moneda, fecha, locale, timezone) eliminando `formatCOP`, `valorPendienteCOP` y `es-CO` hardcoded, así como los contadores falsos (`464`, `145`) y el texto `'Escala estándar MEKANOS'`.
  4. **Construir las pantallas faltantes:** `/comercial/cotizaciones`, `/comercial/propuestas`, `/contratos`, `/cronogramas`, y `/inventario/remisiones`.
- **Gate de Verificación F4:** `tsc --noEmit` + `next build` sin errores; crear desde cero en UI una organización "Puertas Automáticas" con logo propio, crear arquetipo + repuesto + cliente + contrato + orden + cotización + remisión sin ver mención alguna de "Mekanos", "Plantas" o "COP".

---

### Fase 5 · App Móvil Offline-First Multi-Cuenta, Declarativa y White-Label
**Objetivo:** Blindar el cliente móvil (`apps/mobile`) para trabajo real en dispositivos compartidos, 100% guiado por el catálogo del servidor y sin fugas de marca.
- **Acciones principales:**
  1. **Aislamiento Multi-Cuenta Completo (`logout` ↔ `login`):**
     - Parametrizar `AppDatabase` por cuenta (`db_user_${userId}.sqlite`) y carpeta de archivos locales por usuario (`media/user_${userId}/`).
     - Prefijar `SharedPreferences` (`user_${userId}_last_sync_at`, etc.).
     - Convertir `syncLifecycleManagerProvider` a `autoDispose` ligado a la sesión autenticada e invalidar providers de dominio (`quickStatsProvider`, listas, notificaciones) al cerrar sesión.
     - Implementar guarda segura en `logout()` cuando haya órdenes locales `isDirty` / `POR_SUBIR` (resguardando la cola en el SQLite privado del Usuario A y bloqueando cualquier ejecución de cola ajena bajo el JWT del Usuario B).
  2. **White-Label & Entornos Configurables:**
     - Parametrizar identidad de compilación (`--dart-define` / flavors para `APP_NAME`, `applicationId`, `API_BASE_URL`, `SUPABASE_*`) e hidratar branding visual desde `/api/configuracion/publica`.
     - Generalizar `LocalApiDiscovery` (`/api/health` compatible) y retirar secretos de QA en builds de producción.
  3. **Descomposición y Motor Declarativo Puro en `EjecucionScreen`:**
     - Refactorizar el archivo de 6,182 líneas en módulos limpios.
     - Suprimir la trampa de heurísticas sobre `ESCALA_ESTADO` (`_getTipoActividadEspecial` ya no secuestra ítems configurados como `ESCALA_ESTADO`).
     - Retirar `bool _esBomba` usando exclusivamente los subsistemas dinámicos sincronizados del servidor y limpiar diccionarios legacy de `ParametroOverrideResolver`.
  4. **Sync Resiliente:**
     - Proteger órdenes `isDirty` / en cola ante `404` en Paso 4B de `SmartSyncService` (estado `CONFLICTO_ELIMINADA` en lugar de purga silenciosa).
     - Desacoplar subida binaria unitaria de evidencias/firmas del payload JSON en `OfflineSyncService` (eliminando blobs Base64 pesados de SQLite).
- **Gate de Verificación F5:** Prueba real en emulador/dispositivo: Técnico A inicia sesión → ejecuta orden offline con fotos y la deja `POR_SUBIR` → hace `logout()` → Técnico B inicia sesión → verifica 0 órdenes del Técnico A visibles, `forceFull` ejecutado para B y cola de A intacta → Técnico B cierra sesión → Técnico A vuelve a entrar y sube su orden con éxito bajo su propio JWT. Verificar además actividad `ESCALA_ESTADO` titulada *"Verificar Temperatura de Tablero"* renderizando `B/R/M/C/NA` sin ser secuestrada.

---

### Fase 6 · Empaquetado Comercial Instalable y Certificación Integral Multi-Vertical
**Objetivo:** Validar que un tercero pueda instalar una instancia virgen y operar las 8 verticales físicas sin soporte de desarrollo.
- **Acciones principales:**
  1. Scripts/Dockerfiles y guía de aprovisionamiento reproducible para desplegar una nueva instancia (`docker-compose` / Railway / Render + `prisma migrate deploy` + `seed-core` + build flavor Mobile).
  2. Verificación integral de compatibilidad/migración sobre un respaldo de los datos reales existentes de la empresa actual para validar transición sin pérdida histórica.
  3. Ejecución de matriz E2E de certificación sobre **V1..V8** (Plantas, Bombas, Ascensores, Escaleras, Puertas Eléctricas, Subestaciones, HVAC, Tuberías) y **S1..S5** (Preventivo, Correctivo, Predictivo, Emergencia, Diagnóstico) de extremo a extremo (Admin → Mobile Offline → Sync → PDF → Email).
- **Gate de Verificación F6:** Despliegue limpio en entorno staging virgen en < 15 minutos, 0 errores en `V1–V8`, `S1–S5`, seguridad OWASP básica y cambio de marca completo desde Portal Admin.

---

## 3. Criterio de Arranque para Ejecución

Este Plan Maestro concluye el diseño de Arquitectura Objetivo (`09`) y la Hoja de Ruta por Fases (`10`) en `reset-universal-system/`.  
El siguiente paso natural —cuando usted autorice salir del modo solo-diagnóstico y levantar el congelamiento de código— es iniciar por la **Fase 0 (Contención P0 de Seguridad e Higiene)** antes de tocar el esquema de datos en la **Fase 1**.
