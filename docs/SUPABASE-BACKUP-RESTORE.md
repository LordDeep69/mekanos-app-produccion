# Supabase Backup & Disaster Recovery Runbook (Mekanos)

## 1. Arquitectura Activa (Produccion v2)
- **Organizacion Supabase:** `Anyerson` (`lorddeep3@gmail.com` / GitHub `LordDeep69`)
- **Proyecto:** `mekanos-produccion-v2`
- **Project Ref:** `trpkyzpgbwniztitqrab`
- **Region:** `us-east-1` (East US - North Virginia, co-ubicada con Vercel `iad1`)
- **Motor:** PostgreSQL `17.11`
- **Data API (PostgREST):** Deshabilitada; RLS habilitado por defecto en `public`. Prisma conecta con rol `postgres` (`BYPASSRLS`).
- **Session Pooler IPv4 (Migraciones / `DIRECT_URL` / Backups `pg_dump`):**
  `postgresql://postgres.trpkyzpgbwniztitqrab:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
- **Transaction Pooler IPv4 (Runtime NestJS `DATABASE_URL`):**
  `postgresql://postgres.trpkyzpgbwniztitqrab:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

> [!IMPORTANT]
> El host directo `db.<ref>.supabase.co:5432` resuelve unicamente por IPv6 en Supabase Free Tier. Tanto Windows IPv4 como GitHub Actions (`ubuntu-latest`) DEBEN usar `aws-1-us-east-1.pooler.supabase.com:5432` para `pg_dump`, `pg_restore` y `DIRECT_URL`.

---

## 2. Sistema de Backup Automatico (Tier Free Estándar Senior)
Debido a que Supabase Free Tier **no incluye backups descargables ni PITR** y pausa proyectos tras **7 dias de inactividad**, el workflow [supabase-daily-backup.yml](../.github/workflows/supabase-daily-backup.yml) ejecuta diariamente (`03:17 UTC` / `22:17 COT`):

1. **Keep-Alive + Validacion PG 17:** Conecta por IPv4 Session Pooler (`:5432`) usando `postgresql-client-17`.
2. **Dump Logico Custom:** `pg_dump --format=custom --compress=9 --no-owner --no-privileges --schema=public`.
3. **Prueba de Integridad:** Ejecuta `pg_restore --list` y valida que existan las tablas (`TABLE DATA public`) antes de cifrar.
4. **Cifrado Zero-Knowledge:** Cifra localmente con `openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt`, calcula `.sha256` y destruye el `.dump` sin cifrar antes de subir.
5. **Almacenamiento Redundante:**
   - **GitHub Actions Artifacts (14 dias):** Mantiene los ultimos 14 respaldos cifrados.
   - **Cloudflare R2 Privado (90+ dias, Esquema GFS):** Si los secrets `R2_BACKUP_*` estan configurados, sube a `daily/YYYY/MM/`, copia dominical a `weekly/` y copia dia 1 a `monthly/`.

---

## 3. Configuracion de Secrets en GitHub Actions
En GitHub (`Settings -> Secrets and variables -> Actions -> New repository secret`):

| Secret | Obligatorio | Descripcion |
|---|---|---|
| `SUPABASE_DIRECT_URL` | Si | Connection string **Session Pooler puerto 5432** (con `?sslmode=require`). Nunca usar `:6543`. |
| `BACKUP_ENCRYPTION_KEY` | Si | Frase secreta fuerte (>= 32 chars aleatorios). **Guardala en tu gestor de contrasenas**; sin ella el `.dump.enc` es irrecuperable. |
| `R2_BACKUP_ENDPOINT` | Recomendado | Endpoint S3 de Cloudflare R2 (`https://<account_id>.r2.cloudflarestorage.com`). |
| `R2_BACKUP_BUCKET` | Recomendado | Bucket **PRIVADO** dedicado (ej. `mekanos-db-backups`) con **r2.dev Public Access DESHABILITADO** y Lifecycle rule de expiracion (ej. 90 dias en `daily/`). |
| `R2_BACKUP_ACCESS_KEY_ID` | Recomendado | Token S3 R2 con permisos solo `Object Read & Write` sobre `mekanos-db-backups`. |
| `R2_BACKUP_SECRET_ACCESS_KEY` | Recomendado | Secret del token S3 R2. |

> [!WARNING]
> **Nunca** uses el bucket publico de evidencias (`mekanos-plantas-produccion`) con URL `r2.dev` activa para guardar respaldos de base de datos, ni subas archivos `.dump` al repositorio Git (el repo es publico).

---

## 4. Respaldo Manual Local y Restauracion (DRP)
### Respaldo manual en Windows
```powershell
.\scripts\backup-supabase.ps1
```
Con cifrado (recomendado):
```powershell
$env:BACKUP_ENCRYPTION_KEY = "tu-clave-segura"
.\scripts\backup-supabase.ps1 -Encrypt
```

### Restauracion ante desastre (RTO < 10 min)
```powershell
$env:BACKUP_ENCRYPTION_KEY = "tu-clave-segura"
.\scripts\restore-supabase.ps1 -BackupFile ".\backups\mekanos_prod_YYYYMMDD_HHMMSS.dump.enc" -TargetDirectUrl "postgresql://postgres.<ref>:<pass>@aws-1-us-east-1.pooler.supabase.com:5432/postgres"
```
El script descifra el archivo, filtra automaticamente `SCHEMA - public` / `COMMENT - SCHEMA public` (evitando errores de permisos en Supabase), restaura en una transaccion atomica (`--single-transaction --exit-on-error`) y ejecuta `VACUUM ANALYZE;`.
