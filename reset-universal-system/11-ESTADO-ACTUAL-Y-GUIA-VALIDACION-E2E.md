# 11 — Estado Actual, Compatibilidad con Producción (`main`) y Guía de Validación E2E

**Fecha de corte:** 17 de Noviembre de 2026  
**Rama activa:** `feat/eam-universal-activos-maestros`  
**Rama de producción dedicada (Plantas & Bombas):** `main` (`origin/main`)  
**Modelo objetivo:** Single-Tenant White-Label Instalable (`reset-universal-system/00`–`10`)

---

## 1. Estado Global del Proyecto (`reset-universal-system/`)

Las **Fases 0 a 6** definidas en [10-PLAN-MAESTRO-TRANSFORMACION-POR-FASES.md](./10-PLAN-MAESTRO-TRANSFORMACION-POR-FASES.md) están implementadas en código y cubiertas con pruebas unitarias/compilación y verificación en vivo:

| Fase | Alcance | Estado en Código y Tests | Pendiente de Certificación Humana / Entorno |
| --- | --- | --- | --- |
| **Fase 0** | Seguridad P0 (`JwtAuthGuard` global `@Public()` opt-in, eliminación de secretos fallback y backdoor admin, cierre 4 IDOR en `SyncController`, proyección segura `usuarios`, limpieza monorepo) | Implementada + Jest (`auth.service.spec`, `phase0-security.spec`) | — |
| **Fase 1** | Tabla singleton `configuracion_organizacion`, RBAC real (`PermisosGuard` + 46 permisos), `ValidationPipe` estricto (`whitelist`, `forbidNonWhitelisted`), DDL N:M repuestos, `categorias_activo`, SMTP cifrado AES-256-GCM, `VarChar(20)`, 23 `autoincrement()`, `upgrade-existing-db-fase1.sql`, `seed-core.ts` / `seed-catalog-presets.ts` | Implementada + Jest (`phase1-foundation.spec`, `phase6-certification.spec`) + `tsc --noEmit` en seeds | Ensayar despliegue desde BD vacía con Docker (`INSTALL_GUIDE.md`) cuando se retome staging limpio |
| **Fase 2** | EAM puro sin `Plantas vs Bombas`, UoM dinámico, facetas B-Tree, finalización transaccional desacoplada de binarios, `SyncService` con zona horaria configurable y `sequence_counter FOR UPDATE`, limpieza de código muerto/crons/$queryRawUnsafe | Implementada + Jest (`sync.service.spec`, `tareas-programadas.service.spec`, etc.) | — |
| **Fase 3** | Motor Documental PDF/Email White-Label (`OrgBrandingContext`, `PdfAssemblerService`, `UNIVERSAL_EAM` + `CORRECTIVO`, escape HTML XSS + sanitización `..` en nombres, pool Chromium sin `execSync`) | Implementada + PDF real Chromium verificado (`664.310 bytes`, `%PDF-`) | Revisión visual del PDF y prueba de envío SMTP/Gmail real en UI |
| **Fase 4** | Portal Admin White-Label (`BrandingProvider` + `/configuracion/empresa`, `useOrgFormatters`, RBAC en sidebar/middleware, cobertura `/comercial/*`, `/contratos`, `/cronogramas`, `/inventario/remisiones`, eliminación de `FAMILIA_POR_ID_TIPO_EQUIPO` y `formatCOP`) | Implementada + `tsc --noEmit` + `next build` (`46/46` rutas) + verificación UI automatizada | Recorrido visual humano (Bloques 1–5 abajo) |
| **Fase 5** | App Móvil Flutter offline-first multi-cuenta (`db_user_${userId}.sqlite`, guarda de `logout`, aislamiento prefs/timers/media, `--dart-define`, `ESCALA_ESTADO` sin secuestro heurístico, upload desacoplado) | Implementada + `flutter analyze` (`0` issues) + `flutter test` (`47/47`) | Prueba real en emulador/dispositivo (Bloque 6 / Fase D) |
| **Fase 6** | Empaquetado Dockerfiles, `docker-compose.yml`, `.env.example`, `render-build.sh`, `INSTALL_GUIDE.md`, scripts `provision-whitelabel.{ps1,sh}`, suite E2E programática en vivo contra API + Chromium PDF | Implementada + E2E API/Chromium PDF en verde (con limpieza total de temporales) | Certificación E2E guiada completa (`reset-universal-system/` + `SUBEST`) |

### Fixes en vivo aplicados en la última sesión
- **RBAC en BD activa + login cache:** Asignación real del rol `ADMIN` (`id_rol: 5`) a `admin@mekanos.com` (`id_usuario: 1`) en `usuarios_roles` (y respaldo idempotente en [upgrade-existing-db-fase1.sql](../tools/migrations/upgrade-existing-db-fase1.sql)), más `invalidateUserCache()` al inicio de `login()` en [auth.service.ts](../apps/api/src/auth/auth.service.ts).
- **Hidratación inicial de Branding (`COP`):** Reemplazo de `initialData` por `placeholderData` en [branding-provider.tsx](../apps/admin/src/providers/branding-provider.tsx) para que `GET /api/configuracion/publica` se ejecute siempre al montar la app.
- **Responsive de Dashboard KPI:** Ajuste de grilla exterior en [dashboard/page.tsx](../apps/admin/src/app/(dashboard)/dashboard/page.tsx) (`grid-cols-1 xl:grid-cols-2`) y paneles [orders-stats-panel.tsx](../apps/admin/src/features/dashboard/components/orders-stats-panel.tsx) / [commercial-panel.tsx](../apps/admin/src/features/dashboard/components/commercial-panel.tsx) (`grid-cols-1 sm:grid-cols-2`) + `tabular-nums` en [kpi-card.tsx](../apps/admin/src/features/dashboard/components/kpi-card.tsx) para evitar truncamiento de cifras en ventanas medianas.
- **Reglas de ejecución Windows (`AGENTS.md`):** Manteniendo `cmd /c`, `--runInBand --forceExit --ci` y `CI=true`, sin restricciones que bloqueen el desarrollo autónomo.

---

## 2. Aislamiento Físico Permanente de Ramas y Bases de Datos (`main` vs `feat/eam-universal-activos-maestros`)

### Separación estricta de entornos (Cero Conflictos)
- **Producción (`origin/main` — Plantas y Bombas):**
  - Rama dedicada exclusivamente a la operación estable actual de Mekanos Plantas & Bombas; **no** recibe merges desde `feat/eam-universal-activos-maestros`.
  - Conectada físicamente a **`mekanos-produccion-v2`** (`ref: trpkyzpgbwniztitqrab`, región `us-east-1`, PostgreSQL `17.11`, `94` tablas), protegida con respaldo diario cifrado automatizado en GitHub Actions + Cloudflare R2 (`mekanos-db-backups`).
- **Desarrollo EAM Universal & White-Label (`feat/eam-universal-activos-maestros`):**
  - Rama donde evoluciona todo el ecosistema comercial instalable, EAM agnóstico y certificación de nuevas verticales (`SUBEST`, `ASCENSOR`, etc.).
  - Conectada físicamente de forma aislada a **`mekanos-app-base-de-datos`** (`ref: kmwfsvocmlusoxnsgyrx`, región `us-east-2`, PostgreSQL `17.6`, `98` tablas), la cual contiene `upgrade-existing-db-fase1.sql`, `configuracion_organizacion`, `252` permisos RBAC, rol `ADMIN` para `admin@mekanos.com` y `Fase A + B.1` de Subestación Eléctrica (`modulos 19` y `20`).
  - Los archivos `.env` / `.env.local` están ignorados en `.gitignore`, por lo que cada entorno conserva sus credenciales sin conflictos de Git.

### Compatibilidad Binaria de Esquema (Para un Eventual Upgrade Futuro)
Al auditar `git diff origin/main -- packages/database/prisma/schema.prisma` frente al DDL de `upgrade-existing-db-fase1.sql`, quedaron blindados los puntos críticos por si en un futuro se decide migrar una instancia de `main`:
1. **`usuarios.password_plain`:** `origin/main` declara `password_plain String? @db.VarChar(255)` en `model usuarios`, por lo que `tools/migrations/upgrade-existing-db-fase1.sql` conserva físicamente la columna nullable `VARCHAR(255) DEFAULT NULL` con `0` valores en texto plano (esta rama la omite en `schema.prisma` y mantiene seguridad sin romper clientes legacy).
2. **`tipos_equipo.categoria` y `tipos_componente.aplica_a`:** Mantienen `DEFAULT 'OTRO'` y `DEFAULT 'AMBOS'` respectivamente en PostgreSQL.
3. **`cuentas_email.gmail_*` y `catalogo_actividades.id_tipo_servicio`:** Soportan evolución a `SMTP` / Banco Universal en la BD de desarrollo sin afectar la BD de producción `trpkyzpgbwniztitqrab`, al estar físicamente separadas.

---

## 3. Cómo Retomar en Cualquier PC de Desarrollo (`feat/eam-universal-activos-maestros`)

1. Cambiar de rama y traer los últimos commits:
   - `git fetch origin`
   - `git checkout feat/eam-universal-activos-maestros`
   - `git pull origin feat/eam-universal-activos-maestros`
2. Instalar dependencias, regenerar cliente Prisma y compilar base/API (`AGENTS.md` Windows `cmd /c`):
   - `pnpm install`
   - `pnpm --filter @mekanos/database exec prisma generate && pnpm --filter @mekanos/database build`
3. Verificar `.env` locales de desarrollo (apuntando a **`kmwfsvocmlusoxnsgyrx` en `us-east-2`**, nunca a la BD de producción `trpkyzpgbwniztitqrab`):
   - `packages/database/.env`: `DATABASE_URL` (`:6543?pgbouncer=true`) y `DIRECT_URL` (`:5432`) hacia `aws-1-us-east-2.pooler.supabase.com`.
   - `apps/api/.env`: `DATABASE_URL`, `DIRECT_URL` hacia `kmwfsvocmlusoxnsgyrx`, `JWT_SECRET` (mín. 32 chars), **`CONFIG_ENCRYPTION_KEY`** (hex de 64 chars para cifrado SMTP) y **`PUPPETEER_EXECUTABLE_PATH`** (ej. `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe` en Windows para generación local de PDFs).
   - `apps/admin/.env.local`: `AUTH_SECRET`, `NEXTAUTH_SECRET`, `NEXT_PUBLIC_API_URL=http://localhost:3000/api`, `INTERNAL_API_URL=http://localhost:3000/api`.
4. Levantar servidores con `pnpm --filter @mekanos/api build` + `node dist/main` (`:3000`) y `pnpm --filter @mekanos/admin dev` (`:3001`).

---

## 4. Guía Definitiva de Validación en Interfaz (Fase Intermedia `reset-universal-system/`)

Ejecutar en orden antes de reanudar el E2E de Subestación:

### Bloque 1 · Sesión Real RBAC, Login White-Label y Dashboard (`/login` → `/dashboard`)
1. Cerrar sesión e iniciar nuevamente en `http://localhost:3001/login` con `admin@mekanos.com` (renueva la cookie JWT con rol `ADMIN`).
2. **🔍 Verificar:** tarjeta de login muestra `Mi Organización` (`MO`), sin menciones fijas a `"Mekanos"`.
3. En `/dashboard`:
   - Header superior muestra píldora `COP · America/Bogota` y rol `ADMIN` (no `SIN_ROL` ni `USD`).
   - Sidebar izquierdo muestra todas las secciones RBAC (incluyendo `Empresa y Marca White-Label` y `Catálogo Equipos Maestros EAM`).
   - Tarjetas KPI (`1.865`, `53`, `1.865`, `16`, `$ 0`) sin truncamientos en pantalla completa ni mediana, y tabla `Órdenes Recientes` con datos reales.

### Bloque 2 · Estudio de Marca Blanca en Vivo (`/configuracion/empresa`)
1. Ir a **Configuración → Empresa y Marca (`White-Label`)**.
2. Cambiar temporalmente Nombre Comercial, Razón Social, Número Fiscal, Eslogan, Color Primario (`#0F766E`), Moneda (`USD`), Tasa (`16%`), texto pie de PDF y probar apagar/encender `Módulo Comercial Activo`. Guardar cambios.
3. **🔍 Verificar sin recargar:** actualización inmediata del Sidebar, Header, título de pestaña, botones, moneda en cabecera y ocultamiento dinámico de la sección *Comercial* al apagar el switch. *(Dejar activo el módulo comercial tras probarlo).*

### Bloque 3 · Operación Desacoplada "Zero Plantas/Bombas"
1. `/equipos`: KPIs agrupados por clases reales sin hardcodes de `"Plantas"` o `"Horómetro"`.
2. `/clientes`: Filtros por tipo de equipo reales de BD.
3. `/ordenes/nueva`: Selector agnóstico de equipos y servicios (sin pestañas fijas `GEN`/`BOM`).
4. `/compras/catalogo`: Aplicabilidad de repuestos multi-tipo (`aplica_todos_tipos` / selección múltiple N:M `tipos_componente_tipo_equipo`).

### Bloque 4 · Nuevos Módulos Comerciales, Contratos, Cronogramas y Remisiones
Validar carga limpia y formato de moneda activo en:
1. `/comercial/cotizaciones`
2. `/comercial/propuestas`
3. `/contratos`
4. `/cronogramas`
5. `/inventario/remisiones`

### Bloque 5 · Motor Documental PDF & Email White-Label
1. Descargar PDF de una orden completada (`/ordenes/[id]`) y de una cotización (`/comercial/cotizaciones`).
2. **🔍 Verificar:** encabezado, colores, nombre comercial, NIT, ciudad, pie de página y nombre de archivo descargado reflejan exactamente `/configuracion/empresa`, con **cero apariciones** de `"Mekanos"` o `"Cartagena"`.
3. Restaurar en `/configuracion/empresa` tu nombre comercial deseado, color `#1E40AF` y `COP` si eran temporales.

### Bloque 6 · App Móvil Multi-Cuenta (Opcional aquí o dentro de Fase D de Subestación)
1. Verificar aislamiento de sesiones (`Técnico A offline -> logout guard con POR_SUBIR -> Técnico B -> retorno Técnico A -> sync`).

---

## 5. Punto Exacto de Reanudación del Flujo E2E Original: **Subestación Eléctrica (`SUBEST` — `ABB RESIBLOC-1000-13.2`)**

Una vez validados los **Bloques 1–5** anteriores, retomar exactamente aquí:

- **✅ Ya creado y verificado en tu BD actual:**
  - **FASE A (5 campos técnicos):** `Potencia Aparente Nominal` (`kVA`), `Tensión Primaria Nominal MT` (`kV`), `Tensión Secundaria Nominal BT`, `Tipo de Refrigeración y Aislamiento`, `Grupo de Conexión Vectorial`.
  - **FASE B — Punto 1 (`3. Partes y Subsistemas`):**
    - `Núcleo y Devanados del Transformador` (`id_modulo: 19`) con sus 5 campos y flags KPI/PDF/Obligatorio.
    - `Celda de Media Tensión y Seccionamiento` (`id_modulo: 20`) con sus 2 campos de tensión y flags.
- **⏸️ Punto exacto para reanudar:**
  1. **FASE B — Punto 2 (`/configuracion/catalogos-eam` → `1. Tipos de Equipo` → `+ Nuevo Tipo de Equipo`):**
     - Nombre: `Subestación Eléctrica / Transformador MT` | Código: `SUBEST`
     - Categoría: `Transformación Eléctrica y Subestaciones` *(o categoría personalizada)*
     - Trampa #1 (`Métrica Personalizada`): izquierda **`Maniobras de Conmutación MT`**, derecha **`MANIOBRAS`** (autogenerado único)
     - Vincularle las 2 partes (`Núcleo y Devanados del Transformador` y `Celda de Media Tensión y Seccionamiento`).
  2. **FASE B — Punto 3 (`2. Modelos de Fábrica y Kits BOM`):** `ABB` | `RESIBLOC-1000-13.2` + valores nominales + Kit BOM WMS.
  3. **FASE C (`SUBEST_PREV_A` + `FastProtocolBuilder`):** Plan cada `180 días / 500 maniobras`, verificación de auto-sync de subsistemas en Zona A, 4 actividades trampa (termografía `<` / `>`, LOTO, Súper Trampa `ESCALA_ESTADO`, lectura `MANIOBRAS`) + 3 mediciones (`500–5000 MΩ`, `25–65 °C`, `40–65 dBA`) + Vista Previa PDF.
  4. **FASE D (`/equipos` → App Móvil → `/ordenes/[id]` → PDF):** Alta de equipo con `420 maniobras`, prueba de conversión `13.2 kV ↔ 13200 V`, override de rango térmico `[25 — 115] °C`, orden + ejecución móvil (incluyendo guardia anti-retroceso `50 -> 435`, `92 °C` en normal, `180 MΩ` en alerta `< Mín`, 3 hallazgos a 1 toque) y auditoría final del PDF.
