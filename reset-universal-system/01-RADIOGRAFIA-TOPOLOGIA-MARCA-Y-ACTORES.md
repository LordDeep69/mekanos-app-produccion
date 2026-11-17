# 01 · Radiografía de Topología, Marca White-Label, Seguridad y Actores

> **Capa Auditada:** Arquitectura del Monorepo, Identidad Corporativa / White-Label, Aislamiento Tenant, Autenticación, Autorización (RBAC) y Grafo de Actores.  
> **Estado:** Diagnóstico Forense **AS-IS** — Evidencia 100% verificada sobre archivos fuente reales.

---

## 1. Topología Exacta del Monorepo y Acoplamiento de Compilación

### 1.1 Mapa Físico del Workspace (`pnpm` + `Turborepo`)

Definido en `package.json:1-51`, `pnpm-workspace.yaml:1-3` y `turbo.json:1-16`:

| Capa / Paquete | Nombre de Paquete | Stack Técnico Observado | Rol en el Ecosistema | Observación Estructural |
| :--- | :--- | :--- | :--- | :--- |
| **Root** | `mekanos-monorepo` | `pnpm@8.11.0`, Turborepo | Orquestación (`build`, `lint`, `typecheck`, `dev`, `test`) | Nombre e identidad corporativa en `package.json:2,4`. |
| `apps/api` | `@mekanos/api` | NestJS `^10.2.10`, CQRS `^11.0.3`, GraphQL/Apollo `^12.0.11`, Puppeteer `^24.31.0`, PDFKit `^0.17.2`, Prisma `^5.20.0`, AWS S3 SDK, Cloudinary, Googleapis, Nodemailer, Resend | Backend REST + Swagger (`/api/docs`) + GraphQL | **91 subdirectorios** en `apps/api/src` (**85 módulos** funcionales/infraestructura + `common`, `config`, `database`, `migrations`, `scripts`, `testing`). |
| `apps/admin` | `admin` | Next.js `16.1.1`, React `19.2.3`, NextAuth `5.0.0-beta.30`, React Query `^5.90.12`, Zustand `^5.0.9`, Tailwind CSS v4, Radix UI | Portal Web Administrativo | **14 carpetas** en `apps/admin/src/features` (`agenda`, `auth`, `catalogos`, `catalogos-eam`, `clientes`, `cuentas-email`, `dashboard`, `empleados`, `equipos`, `firmas-administrativas`, `inventario`, `ordenes`, `reportes`, `usuarios`). |
| `apps/mobile` | `mekanos_mobile` | Flutter / Dart, Riverpod, Drift (SQLite), Dio, Supabase, Syncfusion SignaturePad (`version: 1.1.2+6`) | App móvil de campo Offline-First | **10 carpetas** en `apps/mobile/lib/features` (`auth`, `dashboard`, `ejecucion`, `evidencias`, `firmas`, `historial`, `notificaciones`, `orders`, `settings`, `sync`). |
| `packages/database` | `@mekanos/database` | Prisma Client `^5.20.0`, `pg ^8.16.3` | Esquema central PostgreSQL + `PrismaService` | Contiene **93 modelos Prisma** en `packages/database/prisma/schema.prisma`, mezclados en su raíz con **>85 scripts ad-hoc** `.js/.ts/.sql/.bat` históricos. |
| `packages/core` | `@mekanos/core` | TypeScript DDD | Entidades y Value Objects de dominio | **Cobertura mínima:** `packages/core/src/index.ts:1-22` únicamente exporta agregados para `Equipo` y `OrdenServicio`; el resto de los 80+ módulos vive directamente acoplado a Prisma en `apps/api`. |
| `packages/shared` | `@mekanos/shared` | TypeScript | Constantes y validadores compartidos | Expone `APP_NAME = 'Mekanos S.A.S'` (`packages/shared/src/constants/index.ts:5`) y validadores de rangos/mediciones. |
| `packages/config` | `@mekanos/config` | ESLint / TSConfig base | Configuración de compilación compartida | Base configs compartidas entre paquetes Node/TS. |

### 1.2 Hallazgos de Acoplamiento Topológico

1. **Acoplamiento de Proxy en Desarrollo (`apps/admin/next.config.ts:81-88`):** Next.js reescribe `/api/:path((?!auth).*)` directamente a `http://localhost:3000/api/:path*`. El frontend mezcla rutas relativas `/api/...` proxied con llamadas de servidor (`BACKEND_URL` en `apps/admin/src/auth.ts`).
2. **Acoplamiento de Entorno en Mobile (`apps/mobile/lib/core/config/environment.dart` y `local_api_discovery.dart`):**
   - `environment.dart` fija `_productionApiUrl = 'https://api.mekanosapp.dpdns.org/api'`, `localPort = 3000` y `requestTimeout = 320`.
   - `local_api_discovery.dart:21-29` incorpora un mecanismo de desbloqueo QA cuyo digest SHA-256 por defecto (`_defaultQaUnlockSha256`) corresponde al secreto literal documentado en código (`mekanos#qa`, configurable vía `MEKANOS_QA_PASS_SHA256`).
3. **Residuos Operativos en Raíz de `@mekanos/database` y `apps/api/src/testing`:** Coexisten decenas de scripts puntuales (`crear-orden-anyerson.js`, `fase0-datos-maestros.js`, `diagnostico-bruce.js`, etc.) dentro del paquete compartido de base de datos, sin separación entre librería productiva y herramientas de mantenimiento.
4. **Inconsistencia Arquitectónica de Capas (`packages/core` subutilizado):** La intención original de Clean/DDD (`packages/core`) quedó congelada en 2 entidades (`Equipo`, `OrdenServicio`); mientras tanto, en `apps/api` conviven módulos CQRS (`@nestjs/cqrs`), servicios monolíticos Prisma y una fachada heredada (`MekanosFacadeService` en `apps/api/src/common/services/mekanos-facade.service.ts`).

---

## 2. Radiografía de Marca y Deuda White-Label (`"mekanos"`)

### 2.1 Huella Cuantitativa en el Repositorio

Una búsqueda exacta por la cadena `mekanos` (insensible a mayúsculas/minúsculas) en todo el repositorio activo arroja **574 archivos afectados**:

| Ubicación en el Monorepo | Archivos con coincidencia `"mekanos"` | Naturaleza predominante |
| :--- | :---: | :--- |
| `apps/admin` | **209 archivos** | UI visible al usuario, tokens CSS (`--mekanos-*`), metadatos, favicon, copy comercial, cabeceras, comentarios. |
| `apps/api` | **276 archivos** | Swagger, CORS por defecto, plantillas HTML/PDF, correos, carpetas Cloudinary/buckets R2, scripts de prueba, servicios core. |
| `apps/mobile` | **39 archivos** | Bundle ID Android/iOS, etiqueta de aplicación, URL de producción, tema raíz, nombre de clase `MekanosApp`. |
| `packages` (`core`, `database`, `shared`, `config`) | **50 archivos** | Nombres de paquetes NPM `@mekanos/*`, constante `APP_NAME`, migraciones y seeds. |
| **TOTAL WORKSPACE** | **574 archivos** | **Acoplamiento de marca transversal en todas las capas.** |

### 2.2 Inventario de Exposición Crítica al Comprador / Cliente Final (Zona 3)

A diferencia de los nombres internos de paquetes (`@mekanos/*`), los siguientes puntos exponen **directamente la marca, datos fiscales, colores o dominios de Mekanos S.A.S.** a cualquier empresa cliente que intentara comprar o alquilar el software:

| Capa | Archivo y Líneas Verificadas | Evidencia Literal Hardcodeada | Impacto White-Label |
| :--- | :--- | :--- | :--- |
| **Shared Const** | `packages/shared/src/constants/index.ts:5` | `export const APP_NAME = 'Mekanos S.A.S';` | Contamina cualquier consumidor de constantes compartidas. |
| **Admin Next Config** | `apps/admin/next.config.ts:75` | `NEXT_PUBLIC_APP_NAME: 'MEKANOS Admin'` | Inyectado en tiempo de build, no configurable en runtime. |
| **Admin Metadata** | `apps/admin/src/app/layout.tsx:17-23` | `title: "MEKANOS Admin \| Portal de Gestión"`, `description: "... MEKANOS S.A.S ..."`, icons `/ISOTIPO - MEKANOS LOGO.png` | Pestaña del navegador e íconos fijos de una sola empresa. |
| **Admin Login** | `apps/admin/src/app/login/page.tsx:30-49` | Inicial `"M"`, `<h1>MEKANOS S.A.S</h1>`, `© 2025 MEKANOS S.A.S. Todos los derechos reservados.`, gradiente `from-mekanos-primary to-mekanos-accent` | Primera pantalla del comprador totalmente hardcodeada. |
| **Admin Sidebar & Header** | `apps/admin/src/components/layout/sidebar.tsx:191-217`<br>`apps/admin/src/components/layout/header.tsx:36,85,95` | Logo `<Zap/>` + `"MEKANOS"` / `"Portal Admin"`; detección literal `nombre.toLowerCase().includes('admin mekanos')`; badge de notificaciones fijo en `'3'` (`header.tsx:85`) | Identidad fija y lógica condicional ligada al texto `"admin mekanos"`. |
| **Admin Design Tokens** | `apps/admin/src/app/globals.css:9-85` | `--mekanos-white: #F2F2F2`, `--mekanos-blue: #244673`, `--mekanos-blue-light: #3290A6`, `--mekanos-green: #56A672`, `--color-mekanos-*` | Paleta cromática compilada en CSS estático, imposible de cambiar por empresa desde BD. |
| **Admin Config Copy** | `apps/admin/src/app/(dashboard)/configuracion/page.tsx:108-112` | Texto descriptivo fijo: `"(464 activos operativos)"` y `"Catálogo de 145 Campos Técnicos"` | Promete métricas estáticas de una base de datos demo específica en lugar de reflejar el catálogo real del tenant. |
| **API Bootstrap & CORS** | `apps/api/src/main.ts:124,155,169-171,248` | Swagger `MEKANOS API`, contacto `https://mekanos.com` / `info@mekanos.com`, CORS `defaultOrigins` con `https://mekanos-admin-portal.vercel.app` | Documentación API y orígenes permitidos atados a un único despliegue. |
| **Storage Cloudinary & R2** | `apps/api/src/cloudinary/cloudinary.service.ts:24,147,235,260`<br>`apps/api/src/storage/r2-storage.service.ts:26,30,38,57` | Carpetas `'mekanos/evidencias'`, `'mekanos/ordenes/...'`; buckets fallback `'mekanos-plantas-produccion'`, `'mekanos-bombas-produccion'` | Nombres de carpetas y buckets acoplados tanto a la marca como a **2 tipos de equipo heredados** (`plantas`, `bombas`). |
| **Email Service & Templates** | `apps/api/src/email/email.service.ts:40,84,293,379,455,518,544,605-689`<br>`apps/api/src/email/email-templates.service.ts:67,228-249`<br>`apps/api/src/common/services/mekanos-facade.service.ts:573-602` | Remitente `MEKANOS S.A.S`, fallback `'mekanossas4@gmail.com'` y `'mekanossas2@gmail.com'`, teléfono `'315-7083350'`, asuntos con `\| MEKANOS S.A.S`, colores `MEKANOS_COLORS` | Los correos al cliente final salen firmados por Mekanos S.A.S incluso usando otra cuenta SMTP/OAuth2. |
| **Motor Documental PDF** | `apps/api/src/pdf/templates/mekanos-base.template.ts:14,39-46,77,2357-2424`<br>`tipo-universal-eam.template.ts:1057,1132-1133`<br>`tipo-correctivo.template.ts:1493-1495`<br>`trazabilidad-cliente.template.ts:404,567-569` | `logo-mekanos.png`, `NIT: 900.542.123-1`, dirección `"CRA 49C # 31-35 DIAG. AL SENA, CARTAGENA DE INDIAS"`, `PBX: (605) 635-9384`, `WhatsApp 315-708-3350`, `info@mekanos.com.co`, texto legal `"SUMINISTRO MEKANOS S.A.S. — ALMACÉN CENTRAL"` | Imposible entregar informes PDF con membrete de otra empresa compradora sin editar HTML/TS. |
| **Mobile App** | `apps/mobile/android/app/build.gradle.kts:23,38`<br>`apps/mobile/android/app/src/main/AndroidManifest.xml:16`<br>`apps/mobile/ios/Runner/Info.plist:8,16`<br>`apps/mobile/lib/main.dart:115,150,165`<br>`apps/mobile/lib/core/config/environment.dart` | `applicationId = "com.mekanos.mekanos_mobile"`, `android:label="Mekanos"`, `title: 'Mekanos Técnicos'`, URL `https://api.mekanosapp.dpdns.org/api`, locale fijo `Locale('es', 'CO')` | Identidad binaria, tienda/paquete, dominio API y región compilados de forma estática. |

### 2.3 Diagnóstico de Ausencia: Módulo de Configuración Corporativa

Tras auditar los **93 modelos** de `packages/database/prisma/schema.prisma`, los **91 subdirectorios** de `apps/api/src` y `apps/admin/src/app/(dashboard)/configuracion/page.tsx`, se confirma la **ausencia total** de cualquier tabla o módulo equivalente a `configuracion_sistema`, `empresa`, `organizacion` o `tenant`:

- El centro de configuración (`configuracion/page.tsx:18-71`) únicamente enlaza a catálogos operativos (`tipos-servicio`, `actividades`, `servicios`, `estados`, `pendientes`), `firmas-administrativas`, `cuentas-email` y `catalogos-eam`.
- No existe ningún lugar en BD o UI para guardar: razón social de la empresa dueña de la plataforma, NIT/identificación tributaria, logo principal/isotipo/favicon, colores de marca (`primary`, `accent`), dirección/teléfonos de pie de página, textos legales de garantía/PDF, prefijos globales de numeración, moneda o zona horaria por defecto.

---

## 3. Evaluación de Preparación Comercial (Tenancy Readiness)

Veredicto categórico **AS-IS:** El sistema es **100% Single-Tenant Hardcodeado** para una sola empresa específica (*Mekanos S.A.S.* en Cartagena, Colombia).

| Eje Arquitectónico | Estado AS-IS Observado | Compatibilidad con **Modelo A (Single-Tenant White-Label Instalable)** | Compatibilidad con **Modelo B (SaaS Multi-Tenant en 1 BD compartida)** |
| :--- | :--- | :--- | :--- |
| **Base de Datos (`schema.prisma`)** | Cero columna `tenant_id` / `id_organizacion` en los 93 modelos; unicidades globales (`codigo_equipo`, `numero_orden`, `email`, `username`, `nit`). | **Media-Baja:** No requiere `tenant_id`, pero exige crear `configuracion_organizacion` y eliminar defaults de Cartagena/Colombia y branding de seeds/esquema. | **Nula (0%):** Requiere `id_organizacion` en ~93 tablas (o RLS Postgres), redefinición de índices `@@unique` compuestos por tenant y migración masiva. |
| **Autenticación y JWT (`auth.service.ts`)** | `userValidationCache` es un `Map` en memoria indexado solo por `userId`; el payload JWT lleva `{ sub, email, rol }` sin contexto de organización; `AUTH_SECRET` y `JWT_SECRET` únicos globales. | **Media (con riesgos críticos de seguridad descritos en §4):** Un despliegue aislado requiere secretos únicos por cliente y reparar roles reales. | **Nula:** No hay `tenantId` en JWT ni resolución de organización al hacer login (un mismo email no podría existir en dos empresas compradoras si `email`/`username` es único global). |
| **Storage (`R2StorageService` & `CloudinaryService`)** | Buckets fijos (`mekanos-plantas-produccion`, `mekanos-bombas-produccion`) y rutas `mekanos/evidencias` sin partición por empresa. | **Media-Baja:** Necesita neutralizar nombres de buckets/carpetas (y desacoplar de "plantas/bombas"). | **Nula:** Mezclaría evidencias y PDFs de distintas empresas compradoras si comparten bucket/cloud. |
| **Portal Admin (`apps/admin`)** | Variables CSS estáticas en `globals.css`, metadata estática en `layout.tsx`, rewrites a `localhost:3000`, React Query keys sin prefijo de tenant. | **Baja:** Requiere tema dinámico inyectado desde API/BD (colores, logo, nombre) y limpieza total de strings `MEKANOS`. | **Nula:** Exige resolución de tenant por subdominio/sesión, hidratación dinámica de branding pre-login (por host) y limpieza de caché entre tenants. |
| **App Mobile (`apps/mobile`)** | URL fija `api.mekanosapp.dpdns.org`, BD local **Drift (SQLite)** sin columna `tenant_id`, descubrimiento local por puerto `3000`. | **Baja:** Requiere configuración blanca (build flavors o bootstrap remoto de marca + endpoint configurable). | **Nula:** Si un técnico cambia de empresa o usa la app SaaS pública, Drift mezclaría catálogos/órdenes locales si no limpia o particiona por `tenant_id`, además de necesitar descubrimiento de tenant en login. |

---

## 4. Radiografía de Autenticación, Sesiones, JWT y RBAC

### 4.1 Flujo Actual Verificado (Admin + API)

```text
[LoginForm (admin)]
   └─ signIn('credentials') ──▶ NextAuth auth.ts:44 ──▶ POST /api/auth/login (auth.controller.ts:35)
                                                              │
                                                              ▼
                                                      AuthService.login() (auth.service.ts:66-127)
                                                        ├─ bcrypt.compare() vs usuarios.password_hash
                                                        ├─ generateTokens() -> JWT { sub, email, rol: 'USER' }  <-- ¡HARDCODEADO!
                                                        └─ responde user.rol = 'USER'                           <-- ¡HARDCODEADO!
   ◀── cookie JWE NextAuth (maxAge 7d, accessToken exp 3h) ───┘
   │
   ▼ Requests posteriores a API: Authorization: Bearer <JWT>
   └─ JwtStrategy.validate() (jwt.strategy.ts:27) -> AuthService.validateUser() (auth.service.ts:169-216)
        ├─ Cache en memoria 5 min (userValidationCache Map)
        ├─ Consulta usuarios_roles -> roles -> esSuperadminPorEmail || ['ADMIN','GERENTE','SUPERVISOR']
        └─ Adjunta req.user = { id, email, rol (primer rol o 'USER'), roles[], esAdmin, esAsesor, idEmpleado }
```

### 4.2 Hallazgos Críticos de Seguridad y Autorización (Verificados en Código)

Esta auditoría identificó **7 fallos estructurales graves** en la capa de identidad y control de acceso:

1. **Bug de Rol Hardcodeado `'USER'` en Login y JWT (`auth.service.ts:104` y `:250`):**
   - En `AuthService.login()` (`line 104`): `rol: 'USER', // TODO: Implementar sistema de roles desde usuarios_roles`.
   - En `AuthService.generateTokens()` (`line 250`): `rol: 'USER', // TODO: Implementar roles`.
   - **Consecuencia en Cadena:** El JWT firmado y el objeto `session.user.rol` recibido por NextAuth (`apps/admin/src/auth.ts:193`) **siempre reciben `'USER'`**, incluso cuando el usuario es `ADMIN`. Por eso `header.tsx:36,104` recurrió a parches como detectar el texto `'admin mekanos'` en el nombre del usuario para mostrar `'Administrador del Sistema'`.

2. **Backdoor / Privilegio por Email Literal (`auth.service.ts:192`):**
   - En `validateUser()`: `const esSuperadminPorEmail = usuario.email === 'admin@mekanos.com';` y luego `const esAdmin = esSuperadminPorEmail || roles.some(...)`.
   - Esto otorga privilegios de administrador por coincidencia de string de correo de una cuenta demo de Mekanos en cualquier entorno donde se ejecute el código.

3. **Secretos Criptográficos de Fallback Débiles y Públicos:**
   - `apps/api/src/auth/strategies/jwt.strategy.ts:24`: `secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret'`.
   - `apps/admin/src/auth.ts:89`: `secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'mekanos-jwt-secret-ultra-secure-2025-production-change-this-in-deployment'`.
   - Si falta la variable de entorno en un despliegue de un cliente comprador, cualquier atacante puede forjar tokens JWT/NextAuth válidos usando los strings del repositorio.

4. **Columna `password_plain` en BD + Exposición de Campos Sensibles en CRUD Usuarios:**
   - `packages/database/prisma/schema.prisma:2235` define `password_plain String? @db.VarChar(255)` en el modelo `usuarios` (aunque `UsuariosService.create` y `resetPassword` hoy escriben `password_hash`, la columna persiste en esquema).
   - En `apps/api/src/usuarios/usuarios.service.ts:66-70` (`findAll`) y `92-94` (`findOne`), Prisma retorna el modelo `usuarios` completo **sin cláusula `select`**, exponiendo `password_hash`, `password_plain`, `token_reset_password`, `secret_2fa`, etc. en las respuestas HTTP `GET /api/usuarios` y `GET /api/usuarios/:id` (a diferencia de `UsuariosGestionService.listarUsuariosCompletos()` en `usuarios-gestion.service.ts:648-708`, que sí proyecta campos seguros).

5. **RBAC Granular Simulado (`PermisosGuard` Inexistente + `RolesGuard` Casi Inoperante):**
   - `apps/api/src/database/seeds/seed-rbac.ts:84-525` siembra **46 permisos granulares** (`EQUIPOS`, `ORDENES`, `CLIENTES`, `COTIZACIONES`, `INVENTARIO`, `INFORMES`, `CONFIGURACIÓN`) en `permisos` y `roles_permisos`.
   - **Realidad en código:** No existe ningún `PermisosGuard` ni decorador `@Permisos(...)` en todo `apps/api/src`. Esos 46 permisos no se validan en ningún endpoint.
   - Peor aún: aunque más de 30 controladores importan `@UseGuards(JwtAuthGuard, RolesGuard)`, una búsqueda en todo `apps/api/src` por `@Roles(` demuestra que **únicamente `UsuariosController` (`usuarios.controller.ts:28`, `@Roles('ADMIN')`) y 2 rutas de prueba en `AuthController` (`auth.controller.ts:69,84`) usan `@Roles(...)`**. Como `RolesGuard.canActivate()` (`roles.guard.ts:26-28`) hace `if (!requiredRoles || requiredRoles.length === 0) return true;`, **el `RolesGuard` actúa como un no-op en todos los demás controladores del negocio** (`ordenes`, `clientes`, `equipos`, `catalogos-eam`, `cuentas-email`, `firmas-administrativas`, `inventario`, `cotizaciones`). Cualquier usuario autenticado (incluso rol `CLIENTE` o `TECNICO`) puede invocar mutaciones administrativas en la API si conoce la URL.

6. **Controladores y Endpoints Completamente Expuestos sin `JwtAuthGuard`:**
   - `apps/api/src/app.module.ts:217` registra `APP_GUARD = ThrottlerGuard` (120 req/min/IP), **no `JwtAuthGuard`**. La autenticación depende de añadir `@UseGuards(JwtAuthGuard)` manualmente en cada controlador.
   - Verificado por inspección directa de los controladores:
     - **`PdfController` (`apps/api/src/pdf/pdf.controller.ts:141-143`):** Declara `@ApiBearerAuth()` para Swagger, **pero NO tiene `@UseGuards(JwtAuthGuard)`** en la clase ni en sus rutas -> generación/regeneración/envío de PDFs accesible sin JWT.
     - **`EmailController` (`apps/api/src/email/email.controller.ts:29-31`):** Sin `JwtAuthGuard` -> endpoints `/email/status`, `/email/test`, `/email/orden`, `/email/informe` sin autenticación HTTP.
     - **`CatalogoServiciosController` (`apps/api/src/catalogo-servicios/presentation/catalogo-servicios.controller.ts:23-24`):** Sin `JwtAuthGuard`.
     - **`ItemsComponentesController` (`apps/api/src/cotizaciones/items-componentes/items-componentes.controller.ts:23-25`) y `ItemsServiciosController` (`apps/api/src/cotizaciones/items-servicios/items-servicios.controller.ts:23`):** Sin `JwtAuthGuard`.
     - **`OrdenesController` (`apps/api/src/ordenes/ordenes.controller.ts:98,117,159,175`):** No tiene `@UseGuards(JwtAuthGuard)` a nivel de clase; lo aplica método a método, dejando rutas expuestas sin guard como `GET /ordenes/:id/emails/historial` (`:117`), `GET /ordenes/:id/progreso-registro` (`:159`) y `POST /ordenes/:id/heartbeat` (`:175`).
   - En Frontend (`apps/admin/src/middleware.ts:47-92`), el middleware únicamente valida `isLoggedIn` (sesión NextAuth existente), sin verificación alguna de roles o permisos para rutas `/configuracion/*` o `/usuarios`.

7. **`ValidationPipe` Permisivo Global (`apps/api/src/main.ts:202-206`):**
   - `whitelist: false` y `forbidNonWhitelisted: false` (`// ← TEMPORAL: Permitir campos no decorados para MVP/Bootstrapping`), permitiendo envío de propiedades arbitrarias en los cuerpos JSON hacia controladores y servicios que propagan DTOs (`...updateDto` en `usuarios.service.ts:115` o `firmas-administrativas.service.ts:87`), abriendo riesgo de *mass assignment* (por ejemplo, alterar campos internos si el DTO/servicio no los filtra manualmente).

---

## 5. Grafo de Actores, Identidad y Regionalización

### 5.1 Anatomía Relacional en `packages/database/prisma/schema.prisma`

```text
                                 ┌─────────────────────────┐
                                 │        personas         │ (line 1775)
                                 │  (NATURAL o JURIDICA)   │
                                 │  default: CARTAGENA /   │
                                 │  BOLÍVAR / COLOMBIA     │
                                 └─┬──────┬────────┬──────┬┘
                                   │      │        │      └──────────────────┐
                1:N                │      │ 1:1    │ 1:N                     │ 1:N
       ┌───────────────────────────┘      │        └────────────┐            ▼
       ▼                                  ▼                     ▼        ┌──────────────────────┐
┌──────────────┐                  ┌───────────────┐    ┌────────────────┐│ contactos_adicionales│
│   usuarios   │ (line 2209)      │   empleados   │    │  proveedores   ││ (line 475)           │
│ username/mail│                  │ (line 700)    │    │ (line 1888)    └──────────────────────┘
│ password_hash│                  │ cargo enum    │    └────────────────┘
│ password_plain◄──¡COLUMNA!      │ es_tecnico    │
└──────┬───────┘                  │ es_asesor     │    ┌────────────────────────┐
       │ N:N                      │ puede_conducir│    │ firmas_administrativas │ (line 1103)
       ▼                          └───────────────┘    │ representante_legal    │
┌──────────────┐   ┌──────────┐   ┌────────────────┐   └───────────┬────────────┘
│usuarios_roles│──▶│  roles   │──▶│ roles_permisos │               │ 1:N
└──────────────┘   └──────────┘   └───────┬────────┘               ▼
                                          ▼               ┌────────────────┐    1:N    ┌───────────────┐
                                   ┌──────────────┐       │    clientes    │──────────▶│ sedes_cliente │
                                   │   permisos   │       │ (line 354)     │           │ (line 2037)   │
                                   │ (46 seeded,  │       │ self-relación: │           │ CARTAGENA /   │
                                   │ sin guard)   │       │ es_principal + │           │ BOLÍVAR /     │
                                   └──────────────┘       │ id_principal ◄─┼──DUALIDAD │ COLOMBIA      │
                                                          └────────┬───────┘           └───────────────┘
                                                                   │ N:1
                                                          ┌────────▼───────┐
                                                          │ cuentas_email  │ (line 2327)
                                                          │ Gmail OAuth2   │
                                                          └────────────────┘
```

### 5.2 Anomalías Estructurales en la Capa de Actores

1. **Dualidad de Modelado en Sucursales/Sedes del Cliente:**
   - El modelo `clientes` (`schema.prisma:379-394`) implementa una jerarquía autoreferencial (`es_cliente_principal`, `id_cliente_principal`, `clientes_relacionados`).
   - Simultáneamente existe la tabla independiente `sedes_cliente` (`schema.prisma:2037`) vinculada a `id_cliente`.
   - Esta doble vía divide dónde quedan amarrados equipos, contratos y órdenes cuando una empresa cliente tiene múltiples sucursales.

2. **Hardcoding Geográfico y Regional (Colombia / Cartagena):**
   - `personas` (`schema.prisma:1796-1798`): `ciudad @default("CARTAGENA")`, `departamento @default("BOLÍVAR")`, `pais @default("COLOMBIA")`.
   - `sedes_cliente` (`schema.prisma:2043-2044`): `ciudad @default("CARTAGENA")`, `departamento @default("BOLÍVAR")`.
   - `UsuariosGestionService.construirDatosPersona()` (`usuarios-gestion.service.ts:582-584`): vuelve a forzar `dto.ciudad || 'CARTAGENA'`, `dto.departamento || 'BOLÍVAR'`, `dto.pais || 'COLOMBIA'`.
   - `apps/mobile/lib/main.dart:165`: `locale: const Locale('es', 'CO')`.
   - Para vender el software en otro país o ciudad sin ser Cartagena, los valores por defecto del motor crean geografía falsa silenciosamente.

3. **Fragmentación de Autoridad Operativa en `empleados` vs `roles`:**
   - Un empleado tiene `cargo` gobernado por `cargo_empleado_enum` (`schema.prisma:704`) más banderas booleanas rígidas (`es_tecnico`, `es_asesor`, `puede_conducir`), **en paralelo** con la relación N:N `usuarios -> usuarios_roles -> roles`.
   - Esto duplica la fuente de verdad para saber "quién puede ser asignado a una orden" vs "qué puede hacer en la plataforma".

4. **Acoplamiento de `cuentas_email` a Gmail OAuth2 exclusivamente:**
   - `cuentas_email` (`schema.prisma:2327-2347`) exige `gmail_client_id`, `gmail_client_secret` y `gmail_refresh_token` obligatorios (`String` no nulos), acoplando el envío corporativo por cuenta a credenciales de Google OAuth2 en lugar de soportar abstracción SMTP genérica / proveedor corporativo de cada empresa compradora (aunque `email.service.ts` coexiste con Nodemailer/Resend en otras dependencias). Adicionalmente, `CuentasEmailController` (`cuentas-email.controller.ts:20`) solo exige `JwtAuthGuard` sin `@Roles('ADMIN')`.

---

## 6. Síntesis de Gate 1

- **Topología:** Monorepo moderno bien estructurado tecnológicamente (`pnpm` + NestJS + Next 16 + Flutter), pero con DDD incompleto en `packages/core` y decenas de scripts sueltos dentro de `packages/database`.
- **White-Label / Tenancy:** **0% listo comercialmente.** **574 archivos** contienen referencias a `mekanos`, no existe entidad de configuración corporativa/tenant, y tanto UI Admin como PDFs, Emails, Buckets R2/Cloudinary y App Móvil imprimen razón social, NIT, dirección y paleta estática de Mekanos S.A.S.
- **Seguridad / RBAC:** **Críticamente comprometida.** `rol: 'USER'` hardcodeado en emisión de JWT y login, email admin hardcodeado, secretos JWT/NextAuth con fallbacks literales, `password_plain` en esquema y expuesto por `usuarios.service.ts`, 46 permisos en BD sin `PermisosGuard`, `RolesGuard` sin `@Roles()` en casi todos los módulos de negocio, **5 controladores + rutas de `OrdenesController` completamente sin `JwtAuthGuard`** (incluyendo `PdfController` y `EmailController`), y `ValidationPipe` con `whitelist: false`.
- **Actores:** Base relacional sólida alrededor de `personas`, pero contaminada por defaults de Cartagena/Colombia, doble estructura de sedes (`clientes` recursivo vs `sedes_cliente`) y roles divididos entre `cargo_empleado_enum` y `usuarios_roles`.

> **Fin del Gate 1.** Pendiente revisión y validación con el líder antes de avanzar al **Gate 2** (`02-RADIOGRAFIA-CAPA-DATOS-PRISMA.md` y `03-RADIOGRAFIA-BACKEND-NUCLEO-EAM-Y-ORDENES.md`).
