# Despliegue y Alojamiento — MEKANOS App

> Documento de arquitectura de despliegue actualizado tras la consolidación de infraestructura del **2026-11-14** (línea base inicial del 2026-08-20 conservada en el Anexo A).
> Los valores secretos (contraseñas, tokens, claves API) **no** se documentan aquí.

---

## 1. Resumen ejecutivo

| Componente | Tecnología | ¿Dónde vive HOY? | ¿Cómo se expone? | Estado |
|---|---|---|---|---|
| API / Backend | NestJS (Node) | **PC servidor del desarrollador** (Windows, `auto-sync-remote.mjs` / `INICIAR-AUTO-SYNC-API.bat`) | Cloudflare Tunnel → `https://api.mekanosapp.dpdns.org/api` | ✅ Activo en operación (verificado) |
| Admin Web | Next.js 16 | **Vercel** (`prj_xm8liDn0pmIjxZjJ6AQ7DOIlA5kQ`, región `iad1`) + dev local `3001` | `https://mekanos-admin-portal.vercel.app` (solo usa `NEXT_PUBLIC_API_URL` + `AUTH_SECRET`) | ✅ Activo (verificado) |
| Base de datos | Supabase (Postgres 17.11) | Nube Supabase Org `Anyerson` (`lorddeep3@gmail.com` / GitHub `LordDeep69`), proyecto **`mekanos-produccion-v2`** (`trpkyzpgbwniztitqrab`, región `us-east-1`) | Transaction Pooler `:6543?pgbouncer=true` + Session Pooler IPv4 `:5432` (`aws-1-us-east-1.pooler.supabase.com`) | ✅ Activo y optimizado (2026-11-14) |
| Backups BD (DRP) | GitHub Actions + OpenSSL AES-256 + R2 | Workflow diario `03:17 UTC` + bucket privado R2 **`mekanos-db-backups`** | Cifrado `.dump.enc` (14d GitHub Artifacts + GFS `90d/180d/365d` en R2 privado) | ✅ Activo y verificado (Run `43619473071`) |
| Imágenes / evidencias | Cloudinary + Cloudflare R2 | Nube Cloudinary (2 clouds) + R2 (`mekanos-plantas-produccion`) | API REST + CDN público `pub-0252b7824c754d46a15fe3acf8d52450.r2.dev` | ✅ Activo |
| Email (PDFs) | SMTP Gmail | Nube Google | `smtp.gmail.com:587` (cuenta `mekanossas4@gmail.com`) | ✅ Activo |
| DNS / TLS | Cloudflare (proxy) + dpdns.org | Nube Cloudflare | DNS proxied + certificado TLS de Cloudflare | ✅ Activo |

**Conclusión central**: el backend **NO está en un servidor remoto**. "Producción" = el PC servidor encendido con el proceso `node dist/main` en el puerto 3000 (administrado por `scripts/auto-sync-remote.mjs` / `INICIAR-AUTO-SYNC-API.bat`) y el servicio Windows `Cloudflared` que lo publica en `https://api.mekanosapp.dpdns.org/api`. Si ese PC se apaga, entra en suspensión o el servicio muere, el API público responde `530 / 1033`.

---

## 2. Arquitectura actual (diagrama)

```
                     INTERNET
                        │
                        ▼
        ┌─────────────────────────────────┐
        │  Cloudflare (proxy + TLS)       │
        │  api.mekanosapp.dpdns.org       │  ← A/AAAA: 104.21.8.199 / 172.67.130.157
        │  (Server: cloudflare, CF-RAY)   │     (IPs de Cloudflare, origen oculto)
        └──────────────┬──────────────────┘
                       │  Cloudflare Tunnel (salida 443, sin abrir puertos)
                       ▼
        ┌──────────────────────────────────────────────┐
        │  PC DESARROLLADOR (Windows 11)                │
        │                                              │
        │  node dist/main  → 0.0.0.0:3000  (API NestJS) │
        │  next dev -p 3001              (Admin Next.js)│
        │  servicio "Cloudflared" (Automatic, LocalSystem)│
        └──────────────────────────────────────────────┘
              │                     │                │
              ▼                     ▼                ▼
        ┌──────────┐        ┌──────────────┐   ┌────────────┐
        │ Supabase │        │ Cloudinary   │   │ R2 (CDN)   │
        │ Postgres │        │ 2 clouds     │   │ público    │
        │ pooler   │        │ PLANTAS/BOMBAS│  │            │
        └──────────┘        └──────────────┘   └────────────┘
```

---

## 3. Componentes en detalle

### 3.1 API / Backend (NestJS) — el corazón del sistema

**Ubicación real (verificado):**
- Proceso: `node --enable-source-maps "...\monorepo\apps\api\dist\main"` (PID 59012 al momento de la verificación)
- Escucha en `0.0.0.0:3000` (expuesto a la red, no solo localhost)
- Ejecutado con `NODE_ENV=development` → **el API "de producción" corre en modo development** (el health endpoint lo reporta)

**Exposición pública:**
- URL pública: `https://api.mekanosapp.dpdns.org/api` (prefijo `/api` es la raíz del controlador NestJS)
- Vía **Cloudflare Tunnel** gestionado remotamente:
  - Servicio Windows: `Cloudflared` — `Running`, arranque `Automatic`, cuenta `LocalSystem`
  - Comando real: `cloudflared.exe tunnel run --token eyJ...` (token-managed → configurado en el panel de Cloudflare Zero Trust, sin archivo local)
  - Binario: `C:\Program Files (x86)\cloudflared\cloudflared.exe`
- El túnel conecta por salida HTTPS (443) a Cloudflare: **no requiere puertos abiertos en el router ni IP pública fija**

**Verificación en vivo (2026-08-20):**
- `GET https://api.mekanosapp.dpdns.org/api/health` → `200` con `{"status":"ok","database":"connected","environment":"development"}`
- Headers: `Server: cloudflare`, `CF-RAY: a2e1c6560f2033e0-MIA`, `cf-cache-status: DYNAMIC`
- La respuesta es idéntica a `http://localhost:3000/api/health` → confirma que el túnel publica exactamente esta máquina

**Health check:** `GET /api/health` devuelve estado de la BD (`database: connected`).

### 3.2 Admin Web (Next.js)

**Despliegue en Vercel — ACTIVO (verificado el 2026-08-20):**
- URL de producción: **`https://mekanos-admin-portal.vercel.app`**
- El proyecto está **conectado al repositorio GitHub** (los push generan deployments preview automáticos con el patrón `mekanos-admin-portal-{hash}-lorddeep69s-projects.vercel.app`)
- Evidencia HTTP: `Server: Vercel`, `X-Vercel-Id: iad1::…` (región `iad1`, coincide con `vercel.json`); `GET /` → 307 a `/login?callbackUrl=%2F` (middleware NextAuth); `GET /login` renderiza la app real: título **"MEKANOS Admin | Portal de Gestión"**, "MEKANOS S.A.S — Portal de Administración", formulario de login y enlaces a `/ordenes`, `/clientes`, `/empleados`, `/equipos`, `/configuracion`, `/dashboard`
- Headers de seguridad en vivo: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block` (coinciden con `vercel.json`)
- Cookies NextAuth confirmadas: `__Host-authjs.csrf-token`, `__Secure-authjs.callback-url=https://mekanos-admin-portal.vercel.app`
- El URL `mekanos-admin-portal-mc2vlnbsa-lorddeep69s-projects.vercel.app` es un **deployment preview protegido con SSO** de Vercel (302 → `vercel.com/sso-api`): solo accesible iniciando sesión en Vercel; no es la URL pública de producción

**Copia local (solo pruebas):**
- Proceso: `next dev --webpack -p 3001` (PID 61832) + servidor interno (PID 56604) — **modo desarrollo**
- Escucha en `0.0.0.0:3001`; acceso en `http://localhost:3001` (responde 307, redirect de NextAuth)
- `NEXTAUTH_URL=http://localhost:3001` (entorno de desarrollo local)

**Config de despliegue:**
- `apps/admin/vercel.json`: framework Next.js, región `iad1`, headers de seguridad, rewrites `/health` → `/api/health`
- El deployment preview existente confirma la **integración Git (GitHub) activa** en el proyecto de Vercel

### 3.3 Base de datos (Supabase / Postgres) — Consolidado 2026-11-14

- **Organización Supabase:** `Anyerson` (`lorddeep3@gmail.com`, alineada con GitHub `LordDeep69`).
- **Proyecto activo:** **`mekanos-produccion-v2`** (`ref: trpkyzpgbwniztitqrab`, PostgreSQL `17.11`).
- **Región:** **`us-east-1`** (East US - North Virginia, co-ubicada con Vercel `iad1` para mínima latencia).
- **Cadenas de conexión IPv4 (obligatorio usar pooler en IPv4, ya que `db.<ref>.supabase.co` resuelve solo por IPv6):**
  - `DATABASE_URL` (Transaction Pooler PgBouncer): `postgresql://postgres.trpkyzpgbwniztitqrab:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
  - `DIRECT_URL` (Session Pooler para migraciones/backups): `postgresql://postgres.trpkyzpgbwniztitqrab:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
- **Seguridad e índices:** Data API (PostgREST) deshabilitada; RLS automático habilitado en `public` (Prisma opera como rol `postgres` con `BYPASSRLS`); función `public.propagar_empleado_firma_a_clientes()` endurecida con `search_path = public`; 44 índices en llaves foráneas agregados (`477` índices totales).
- **Proyectos históricos retirados:**
  - `kmwfsvocmlusoxnsgyrx` (`mekanos-app-base-de-datos`, `us-east-2`): base origen migrada 1:1 el 2026-11-14 (`94` tablas, `116,398` filas). Conservar apagada/sin escrituras como respaldo en frío temporal antes de pausar.
  - `nemrrkaobdlwehfnetxs` (`mekanos-produccion`, `sa-east-1`): proyecto antiguo en pausa (no usado por el API).
- **Health endpoint dinámico:** `GET /api/health/detailed` parsea dinámicamente `process.env.DATABASE_URL` y reporta el host/puerto real conectado.
- **Respaldo automático 3-2-1:** ver [SUPABASE-BACKUP-RESTORE.md](./SUPABASE-BACKUP-RESTORE.md).

### 3.4 Almacenamiento de evidencias e imágenes

| Servicio | Recurso | Detalle |
|---|---|---|
| Cloudinary | Cloud `dibw7aluj` | Plantas (CLOUDINARY_CLOUD_NAME_PLANTAS) |
| Cloudinary | Cloud `dahu8uycb` | Bombas (CLOUDINARY_CLOUD_NAME_BOMBAS) |
| Cloudflare R2 | Bucket `pub-0252b7824c754d46a15fe3acf8d52450.r2.dev` | URLs públicas de archivos (URL pública CDN) |

### 3.5 Email (envío de PDFs)

- SMTP: `smtp.gmail.com:587` (STARTTLS)
- Cuenta remitente: `mekanossas4@gmail.com` — `MEKANOS SAS`
- Uso: envío del PDF de la orden al cliente tras el cierre

### 3.6 Dominios, DNS y TLS

- Dominio: `*.mekanosapp.dpdns.org` (dpdns.org = proveedor de DNS dinámico)
- La zona está **detrás de Cloudflare** (registros proxied "naranja"):
  - `api.mekanosapp.dpdns.org` → `104.21.8.199` / `172.67.130.157` (ambos Cloudflare) + AAAA `2606:4700::...` (Cloudflare)
  - TLS emitido/terminado en el borde de Cloudflare (la IP de origen queda oculta)
- El registro de `mekanosapp.dpdns.org` (apex) solo expone SOA → no hay admin web en el apex

---

## 4. Blueprints de despliegue existentes (sin evidencia de uso real)

| Archivo | Plataforma | Contenido | Estado real |
|---|---|---|---|
| `apps/api/render.yaml` | Render.com | Blueprint del servicio `mekanos-api` (plan free, región Oregon, rama `fix/admin-order-creation-and-detail-sync`, health `/api/health`, build `render-build.sh`, start `render-start.sh`, `NODE_ENV=production`, PUPPETEER, Cloudinary, R2, SMTP) | **Sin evidencia de uso**: `https://mekanos-api.onrender.com/api/health` → timeout (60 s, 0 bytes); el API vivo reporta `environment: development` (no `production`); no hay CI que lo despliegue |
| `apps/admin/vercel.json` | Vercel | Config Next.js monorepo (pnpm), región `iad1`, headers de seguridad, rewrite `/health` | **EN USO**: desplegado en `https://mekanos-admin-portal.vercel.app` (`prj_xm8liDn0pmIjxZjJ6AQ7DOIlA5kQ`); solo usa `NEXT_PUBLIC_API_URL` y `AUTH_SECRET` |
| `apps/api/render-build.sh` / `render-start.sh` | Render | Scripts de build/start del blueprint | Referenciados solo por `render.yaml` |
| `.github/workflows/ci.yml` | GitHub Actions | Lint básico en push/PR a `main` | **EN USO** |
| `.github/workflows/supabase-daily-backup.yml` | GitHub Actions | Backup diario cifrado `pg_dump` 17 → GitHub Artifacts (14d) + R2 privado GFS (`90d/180d/365d`) | **EN USO** (cron `17 3 * * *` + `workflow_dispatch`, verificado Run `43619473071`) |

---

## 5. ¿Cómo se publica un cambio hoy?

1. **Build local** del API en el PC servidor: `pnpm --filter @mekanos/api build` (genera `apps/api/dist/`).
2. **Reinicio del proceso**: `INICIAR-AUTO-SYNC-API.bat` / `node scripts/auto-sync-remote.mjs` mantiene `node --enable-source-maps apps/api/dist/main` escuchando en `:3000` (o reiniciar manualmente desde Explorador si se cierra el IDE).
3. El servicio Windows `Cloudflared` (`Automatic`, `LocalSystem`) sigue publicando `localhost:3000` en `https://api.mekanosapp.dpdns.org/api`.
4. Para el portal admin: hacer push/merge a `main` dispara automáticamente el despliegue en Vercel (`https://mekanos-admin-portal.vercel.app`).
5. **Verificación obligatoria post-cambio:** consultar `https://api.mekanosapp.dpdns.org/api/health/detailed` y confirmar `"status": "healthy"`, `"database": "connected"` y `"supabase.host": "aws-1-us-east-1.pooler.supabase.com"`.

---

## 6. Riesgos y dependencias críticas

1. **El PC servidor sigue siendo el host del API** — apagado, suspensión, corte de luz o cierre de `INICIAR-AUTO-SYNC-API.bat` / `Cloudflared` provocan HTTP `530` / Cloudflare `1033` en `api.mekanosapp.dpdns.org`. *(Si se lanza el backend desde dentro de Antigravity IDE, cerrar el IDE detiene los procesos hijos).*
2. **Modo desarrollo en el proceso actual**: `NODE_ENV=development` (más logs/verbosidad, sin optimizaciones de producción).
3. **Túnel dependiente del panel Cloudflare**: la hostname del túnel está gestionada por token (sin `cert.pem` local); cambios requieren acceso a Cloudflare Zero Trust.
4. **El admin en Vercel y el API en el PC están desacoplados**: Vercel solo habla con `api.mekanosapp.dpdns.org`; si el API local cae, el portal web carga la UI pero no hay datos.
5. **Supabase Free Tier (mitigado):** el respaldo diario a las `03:17 UTC` mantiene actividad cada 24 h (evita pausa de 7 días) y almacena copias cifradas fuera de Supabase (GitHub Artifacts + R2 privado `mekanos-db-backups`).
6. **Dependencia crítica de `BACKUP_ENCRYPTION_KEY`:** todos los `.dump.enc` están cifrados con AES-256-CBC PBKDF2; conservar la clave en el gestor de contraseñas es obligatorio para poder restaurar.

---

## 7. Recomendaciones (opcional)

- Migrar el API NestJS + `cloudflared` a un VPS con PM2/systemd en `NODE_ENV=production` para eliminar la dependencia de tener un PC encendido.
- Rotar periódicamente credenciales sensibles (`SUPABASE_DIRECT_URL`, `BACKUP_ENCRYPTION_KEY`) en Supabase, `.env` de ambos PCs y GitHub Actions Secrets.
- Ejecutar un simulacro semestral de restauración usando `scripts/restore-supabase.ps1` contra un proyecto temporal para validar RTO.

---

## Anexo A — Línea base histórica recopilada (2026-08-20)

> Conservado únicamente como registro histórico del estado previo a la migración del 2026-11-14 (`aws-1-us-east-2`, sin backups ni CI).

| # | Verificación | Resultado |
|---|---|---|
| 1 | DNS `api.mekanosapp.dpdns.org` | A: 104.21.8.199, 172.67.130.157; AAAA: 2606:4700::… (Cloudflare) |
| 2 | `curl https://api.mekanosapp.dpdns.org/api/health` | HTTP 200, body `{"status":"ok","timestamp":"…","database":"connected","environment":"development"}`, headers `Server: cloudflare`, `CF-RAY …-MIA` |
| 3 | `curl https://mekanos-api.onrender.com/api/health` | Timeout (60 s, 0 bytes) ×2 |
| 4 | Proceso en el puerto 3000 | `node --enable-source-maps "...\monorepo\apps\api\dist\main"` (PID 59012), escuchando `0.0.0.0:3000` |
| 5 | `curl http://localhost:3000/api/health` | Mismo body y estructura que el remoto (env=development, db=connected) |
| 6 | Proceso en el puerto 3001 | `next dev --webpack -p 3001` (PID 61832) + `next start-server` (PID 56604); `localhost:3001` → 307 |
| 7 | Servicio `Cloudflared` | Windows service, Running, Automatic, LocalSystem, `tunnel run --token …` (token-managed) |
| 8 | `cloudflared tunnel list` | Error esperado: sin cert.pem local (el túnel se gestiona por token en el panel) |
| 9 | DNS `admin/portal/app/www.mekanosapp.dpdns.org` y apex | Sin registros A/AAAA/CNAME (solo SOA en apex) |
| 10 | `.github/workflows` | No existe → sin CI |
| 11 | `apps/admin/.vercel` | No existe (normal: la integración Git de Vercel no requiere carpeta local) |
| 12 | `.env` del API | DATABASE_URL → `aws-1-us-east-2.pooler.supabase.com:6543`; Cloudinary `dibw7aluj`/`dahu8uycb`; R2 `pub-0252b7824c754d46a15fe3acf8d52450.r2.dev`; SMTP `smtp.gmail.com:587` / `mekanossas4@gmail.com` |
| 13 | DNS `mekanos-admin-portal-mc2vlnbsa-lorddeep69s-projects.vercel.app` | A: 216.198.79.131, 64.29.17.131 (Vercel) — deployment **preview** con protección SSO (302 → `vercel.com/sso-api`) |
| 14 | `curl https://mekanos-admin-portal.vercel.app/` | HTTP 307 → `/login?callbackUrl=%2F`; `Server: Vercel`, `X-Vercel-Id: iad1::…`; cookies NextAuth con callback-url = producción |
| 15 | `curl https://mekanos-admin-portal.vercel.app/login` | Página real: `<title>MEKANOS Admin | Portal de Gestión</title>`, "MEKANOS S.A.S — Portal de Administración", LoginForm, enlaces /ordenes /clientes /empleados /equipos /configuracion /dashboard; headers de seguridad coinciden con `vercel.json` |

---

## Anexo B — Consolidación de infraestructura, migración Supabase y backups (2026-11-14)

| # | Verificación | Resultado observado |
|---|---|---|
| 1 | Proyecto Supabase activo | `mekanos-produccion-v2` (`trpkyzpgbwniztitqrab`), Org `Anyerson`, `us-east-1`, PostgreSQL `17.11` |
| 2 | Migración `kmwfsvocmlusoxnsgyrx` → `trpkyzpgbwniztitqrab` | `pg_dump` / `pg_restore` 17.9 atómico (`--single-transaction`): `94/94` tablas, `116,398/116,398` filas (`0` diferencias), `90/90` secuencias, `78/78` enums, `306/306` constraints, trigger `trigger_propagar_empleado_firma` y función `propagar_empleado_firma_a_clientes` |
| 3 | Optimización y seguridad BD | `propagar_empleado_firma_a_clientes()` con `search_path = public`; 44 índices FK nuevos (`477` índices totales); `VACUUM ANALYZE` (`121 MB`); Advisors: `0` FKs sin índice, `0` warnings de funciones |
| 4 | Backup automático cifrado (`supabase-daily-backup.yml`) | Run `43619473071` en `main` (`✓ 24s`): artefacto GitHub 14d + copia cifrada en bucket privado R2 `mekanos-db-backups` (`daily/2026/11/...dump.enc`, `48,235,984` bytes) con lifecycle `90d/180d/365d` |
| 5 | Cutover PC servidor (`api.mekanosapp.dpdns.org`) | Paridad previa `0` diferencias en `94/94` tablas (`116,398` filas), build `@mekanos/api` en `main` (`9d37bdd`), `/api/health/detailed` respondió `healthy` con `supabase.host: "aws-1-us-east-1.pooler.supabase.com"`, `port: 6543` |
| 6 | Auditoría Vercel (`mekanos-admin-portal`) | Env vars: solo `NEXT_PUBLIC_API_URL` y `AUTH_SECRET`; último deployment en `main` (`dpl_3oTZjNLZYhdM95Y2nPihnckgoGgy`) en estado `READY` |