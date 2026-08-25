# Despliegue y Alojamiento — MEKANOS App

> Documento de arquitectura de despliegue verificado con evidencia real el **2026-08-20**.
> Cada afirmación de "producción" fue comprobada vía DNS, HTTP y procesos del sistema (ver Anexo A).
> Los valores secretos (contraseñas, tokens, claves API) **no** se documentan aquí.

---

## 1. Resumen ejecutivo

| Componente | Tecnología | ¿Dónde vive HOY? | ¿Cómo se expone? | Estado |
|---|---|---|---|---|
| API / Backend | NestJS (Node) | **PC del desarrollador** (Windows) | Cloudflare Tunnel → `https://api.mekanosapp.dpdns.org/api` | ✅ Activo (verificado) |
| Admin Web | Next.js 16 | **Vercel** (producción) + PC del desarrollador (modo dev 3001) | `https://mekanos-admin-portal.vercel.app` (+ previews por push desde GitHub) | ✅ Activo (verificado) |
| Base de datos | Supabase (Postgres) | Nube Supabase (región `aws-1-us-east-2`) | Pooler público `aws-1-us-east-2.pooler.supabase.com:6543` | ✅ Activo |
| Imágenes / evidencias | Cloudinary + Cloudflare R2 | Nube Cloudinary (2 clouds) + R2 | API REST + CDN público `pub-0252b7824c754d46a15fe3acf8d52450.r2.dev` | ✅ Activo |
| Email (PDFs) | SMTP Gmail | Nube Google | `smtp.gmail.com:587` (cuenta `mekanossas4@gmail.com`) | ✅ Activo |
| DNS / TLS | Cloudflare (proxy) + dpdns.org | Nube Cloudflare | DNS proxied + certificado TLS de Cloudflare | ✅ Activo |

**Conclusión central**: el backend **NO está en un servidor remoto**. "Producción" = esta PC encendida con el proceso `node dist/main` en el puerto 3000 y un túnel `cloudflared` que lo publica. Si la PC se apaga o el proceso muere, el API público cae.

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

### 3.3 Base de datos (Supabase / Postgres)

- Proveedor: **Supabase** (nube, no en la PC)
- Cadena de conexión: `postgresql://postgres.***@aws-1-us-east-2.pooler.supabase.com:6543/postgres` (proyecto `kmwfsvocmlusoxnsgyrx`)
- Región: `aws-1-us-east-2` (AWS Ohio)
- **Pooler** de Supabase (puerto 6543) para conexiones del API; `sslmode=require`
- Tablas clave: `ordenes_servicio`, `estados_orden`, `clientes`, `personas`, `equipos`, `ordenes_equipos`, `evidencias_fotograficas`, `actividades_ejecutadas`, `historial_estados_orden`, `firmas_digitales`, etc.

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
| `apps/admin/vercel.json` | Vercel | Config Next.js monorepo (pnpm), región `iad1`, headers de seguridad, rewrite `/health` | **EN USO**: el admin está desplegado y activo en `https://mekanos-admin-portal.vercel.app` (producción) + previews por push; verificado el 2026-08-20 |
| `apps/api/render-build.sh` / `render-start.sh` | Render | Scripts de build/start del blueprint | Referenciados solo por `render.yaml` |

No existe carpeta `.github/workflows` → **no hay CI/CD**. Todos los deploys son manuales.

---

## 5. ¿Cómo se publica un cambio hoy?

1. **Build local** del API: `pnpm --filter api build` (genera `apps/api/dist/`)
2. **Reinicio del proceso**: matar y relanzar `node dist/main` (el puerto 3000 debe quedar escuchando)
3. El servicio `Cloudflared` (autostart) sigue publicando `localhost:3000` → el cambio queda en internet inmediatamente
4. Para el admin: relanzar `next dev -p 3001` (solo accesible localmente, salvo otra hostname del túnel en el panel)
5. Los cambios de BD se aplican directamente contra Supabase (pooler) o vía migraciones Prisma

No hay pipeline de build/test/deploy automatizado.

---

## 6. Riesgos y dependencias críticas

1. **La PC es el servidor de producción** — apagado, corte de luz, cierre de sesión de Windows o muerte del proceso `node` derriban el API público.
2. **Modo desarrollo en producción**: `NODE_ENV=development` (más logs/verbosidad, sin optimizaciones de producción).
3. **Sin CI/CD**: los despliegues dependen de pasos manuales en una sola máquina.
4. **Túnel dependiente del panel Cloudflare**: la hostname del túnel está gestionada por token (no hay config local); cambios en el panel requieren acceso a la cuenta Cloudflare.
5. **El admin en Vercel y el API en la PC están desacoplados**: el admin de Vercel apunta al API público (`api.mekanosapp.dpdns.org`); si la PC se apaga, el portal web funciona pero el API no responde.
6. **Supabase en plan gratuito/desatendido** (no verificado aquí): pausas por inactividad posibles; el pooler responde pero la región es remota (AWS Ohio).
7. **Sin respaldo documentado de infraestructura**: no hay evidencia de backups ni estrategia de recuperación.

---

## 7. Recomendaciones (opcional)

- Desplegar el API en Render (el blueprint ya existe) o en un VPS con PM2 + Caddy/Nginx, con `NODE_ENV=production`.
- Desplegar el admin en Vercel (el `vercel.json` ya está listo) y apuntarle una hostname del túnel o dominio propio.
- Migrar el túnel a un agente remoto (p.ej. mismo cloudflared en un VPS) para no depender de la PC.
- Definir CI/CD (GitHub Actions → Render/Vercel) y respaldos de Supabase.
- Centralizar secretos en el panel de la plataforma elegida (Render/Vercel) en lugar de `.env` locales.

---

## Anexo A — Evidencia recopilada (2026-08-20)

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