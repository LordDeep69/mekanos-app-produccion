# Guía de Instalación Comercial Single-Tenant White-Label (EAM / CMMS)

Esta guía permite desplegar una instancia completa e independiente (PostgreSQL + API NestJS + Portal Web Admin + App Móvil Android compilada) para una empresa cliente en **menos de 15 minutos**.

---

## 1. Arquitectura de Despliegue

```text
+--------------------+      HTTP/HTTPS      +-------------------------+
| Navegador Web      | -------------------> | Portal Admin (Next.js)  |
| Gerencia/Asesores  |                      | Puerto 3001             |
+--------------------+                      +------------+------------+
                                                         |
+--------------------+      HTTPS REST/JSON              v
| App Móvil Flutter  | -------------------> +-------------------------+
| Técnicos Offline   |                      | API EAM (NestJS + PDF)  |
+--------------------+                      | Puerto 3000 + Chromium  |
                                            +------------+------------+
                                                         |
                                                         v
                                            +-------------------------+
                                            | PostgreSQL 16           |
                                            | Prisma Schema + Seeds   |
                                            +-------------------------+
```

- **Modelo comercial:** Single-Tenant White-Label Instalable (1 base de datos, 1 API y 1 Portal por cliente comprador).
- **Motor PDF:** Chromium headless preinstalado en contenedor Linux (`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`) sin descargas en runtime.
- **Almacenamiento / Email:** Local (`/uploads`) + SMTP configurable desde UI (`/configuracion/cuentas-email` cifrado con AES-256-GCM), con soporte opcional para Cloudflare R2, Cloudinary y Supabase Realtime.

---

## 2. Instalación Rápida con Docker Compose (< 15 minutos)

### Requisitos previos
- Docker Engine `24+` y Docker Compose v2 (`docker compose version`).
- Puertos libres `3000` (API), `3001` (Admin) y `5432` (PostgreSQL, editable en `.env`).

### Paso 1 · Preparar configuración y secretos
Copie la plantilla maestra y complete al menos las contraseñas, llaves aleatorias (`>= 32` chars) y datos de organización inicial:

```bash
cp .env.example .env
```

O use el script de aprovisionamiento para generar `.env` con secretos aleatorios seguros:
- **Linux / macOS:**
  ```bash
  ./scripts/provision-whitelabel.sh \
    --org-name "Ascensores del Sur S.A." \
    --org-currency "USD" \
    --admin-email "admin@ascensores.example.com" \
    --admin-pass "ClaveSegura2026!" \
    --presets "ALL" \
    --skip-db
  ```
- **Windows (PowerShell):**
  ```powershell
  .\scripts\provision-whitelabel.ps1 `
    -OrgName "Ascensores del Sur S.A." `
    -OrgCurrency "USD" `
    -AdminEmail "admin@ascensores.example.com" `
    -AdminPassword "ClaveSegura2026!" `
    -Presets "ALL" `
    -SkipDb
  ```

### Paso 2 · Levantar el stack completo
```bash
docker compose up -d --build
```

El servicio `db-bootstrap` ejecutará automáticamente:
1. `prisma migrate deploy` (crea el esquema base limpio).
2. `tsx prisma/seed.ts` (si `RUN_SEED=true`): inicializa `configuracion_organizacion`, 9 categorías de activos, estados operativos, 11 roles, 46 permisos RBAC, 12 magnitudes SI, usuario administrador (`SEED_ADMIN_EMAIL`) y los presets seleccionados en `SEED_PRESETS` (`V1..V8` + modalidades `S1..S5`).

### Paso 3 · Verificar salud
- API Health: `GET http://localhost:3000/api/health`
- Swagger OpenAPI: `http://localhost:3000/api/docs`
- Branding público: `GET http://localhost:3000/api/configuracion/publica`
- Portal Admin: `http://localhost:3001`

---

## 3. Presets Modulares Disponibles (`SEED_PRESETS`)

| Código | Vertical de Activo | Métrica / Unidad |
| :--- | :--- | :--- |
| `V1` | `GENERADOR` · Plantas Eléctricas / Grupos Electrógenos | `HORAS` |
| `V2` | `BOMBA` · Motobombas / Sistemas Hidroneumáticos | `HORAS` |
| `V3` | `ASCENSOR` · Ascensores y Montacargas | `CICLOS` |
| `V4` | `ESCALERA_ELEC` · Escaleras Eléctricas / Andenes Móviles | `HORAS` |
| `V5` | `PUERTA_AUTO` · Puertas Eléctricas / Portones / Talanqueras | `CICLOS` |
| `V6` | `SUBESTACION` · Subestaciones / Transformadores MT-BT | `MANIOBRAS` |
| `V7` | `HVAC` · Aires Acondicionados / Chillers | `HORAS` |
| `V8` | `TUBERIA` · Tuberías / Redes Hidrosanitarias / Infraestructura | `CAL` |
| `ALL` | Todos los presets anteriores + `MOTOR` (`V9`) y `COMPRESOR` (`V10`) + servicios `S1..S5` | — |

Si se deja `SEED_PRESETS` vacío, solo se siembra el núcleo mínimo (`seed-core.ts`) para que el administrador defina sus propios tipos de equipo desde **EAM Studio** en el Portal Web.

---

## 4. Ruta de Actualización de Bases de Datos Existentes (Sin Pérdida de Datos)

Si ya existe una instalación previa operativa con datos históricos:
1. Respalde la base de datos con `pg_dump`.
2. Ejecute el script idempotente de evolución de esquema y backfill RBAC/White-Label:
   ```bash
   psql "$DIRECT_URL" -v ON_ERROR_STOP=1 -f tools/migrations/upgrade-existing-db-fase1.sql
   ```
3. Marque la línea base como aplicada si la BD nació antes de Prisma Migrate:
   ```bash
   pnpm --filter @mekanos/database exec prisma migrate resolve --applied 00000000000000_baseline_universal
   ```
4. Verifique integridad con `pnpm --filter @mekanos/database exec prisma validate`.

---

## 5. Compilación White-Label de la App Móvil (Android APK / AAB)

La aplicación móvil en `apps/mobile` recibe la marca, paquete Android y servidor destino en tiempo de compilación sin tocar código fuente, y descarga colores/logo/moneda en caliente desde `GET /api/configuracion/publica`:

```bash
cd apps/mobile
flutter build apk --release \
  --no-pub \
  --dart-define=APP_NAME="Ascensores del Sur" \
  --dart-define=API_BASE_URL="https://api.ascensores.example.com/api" \
  --dart-define=ENABLE_QA_SERVER_SWITCHER=false \
  --android-project-arg=APP_APPLICATION_ID=com.ascensores.eam \
  --android-project-arg="APP_NAME=Ascensores del Sur"
```

---

## 6. Personalización de Marca y Verificación Post-Despliegue

1. Inicie sesión en el Portal Admin (`http://localhost:3001`) con el usuario configurado en `SEED_ADMIN_EMAIL`.
2. Vaya a **Configuración → Empresa** (`/configuracion/empresa`).
3. Ajuste: nombre comercial, razón social, NIT/RUT/Tax ID, logo, paleta hexadecimal (`color_primario`, `color_secundario`, `color_acento`), moneda, zona horaria, prefijos documentales y pie de página PDF.
4. Al guardar:
   - La UI Web actualiza el tema CSS (`--org-*`) inmediatamente.
   - Los PDFs generados y correos salientes usan el nuevo membrete y moneda sin reiniciar servicios.
   - La App Móvil actualiza nombre, logo y paleta al abrir o refrescar sincronización.
