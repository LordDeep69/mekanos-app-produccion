#!/usr/bin/env bash
# ==============================================================================
# PROVISIONAMIENTO WHITE-LABEL SINGLE-TENANT (Linux / macOS)
# ==============================================================================
# Uso:
#   ./scripts/provision-whitelabel.sh \
#     --org-name "Elevadores del Sur S.A." \
#     --org-currency "USD" \
#     --admin-email "admin@elevadores.com" \
#     --admin-pass "ClaveFuerte2026!" \
#     --presets "ALL" \
#     [--upgrade-existing] \
#     [--build-apps] \
#     [--build-apk --api-url "https://api.elevadores.com/api" --app-id "com.elevadores.eam"]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ORG_NAME="${SEED_ORG_NAME:-Mi Organización EAM}"
ORG_RAZON="${SEED_ORG_RAZON_SOCIAL:-}"
ORG_CURRENCY="${SEED_ORG_CURRENCY:-USD}"
ORG_SYMBOL="${SEED_ORG_CURRENCY_SYMBOL:-\$}"
ORG_LOCALE="${SEED_ORG_LOCALE:-es-CO}"
ORG_TZ="${SEED_ORG_TIMEZONE:-America/Bogota}"
ORG_TAX_LABEL="${SEED_ORG_TAX_LABEL:-IVA}"
ORG_TAX_RATE="${SEED_ORG_TAX_RATE:-19}"
ADMIN_EMAIL="${SEED_ADMIN_EMAIL:-}"
ADMIN_PASS="${SEED_ADMIN_PASSWORD:-}"
PRESETS="${SEED_PRESETS:-ALL}"
API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:3000/api}"
APP_ID="${APP_APPLICATION_ID:-com.eam.field_app}"
UPGRADE_EXISTING=false
BUILD_APPS=false
BUILD_APK=false
SKIP_DB=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --org-name) ORG_NAME="$2"; shift 2 ;;
    --org-razon) ORG_RAZON="$2"; shift 2 ;;
    --org-currency) ORG_CURRENCY="$2"; shift 2 ;;
    --org-symbol) ORG_SYMBOL="$2"; shift 2 ;;
    --org-locale) ORG_LOCALE="$2"; shift 2 ;;
    --org-tz) ORG_TZ="$2"; shift 2 ;;
    --org-tax-label) ORG_TAX_LABEL="$2"; shift 2 ;;
    --org-tax-rate) ORG_TAX_RATE="$2"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="$2"; shift 2 ;;
    --admin-pass) ADMIN_PASS="$2"; shift 2 ;;
    --presets) PRESETS="$2"; shift 2 ;;
    --api-url) API_URL="$2"; shift 2 ;;
    --app-id) APP_ID="$2"; shift 2 ;;
    --upgrade-existing) UPGRADE_EXISTING=true; shift ;;
    --build-apps) BUILD_APPS=true; shift ;;
    --build-apk) BUILD_APK=true; shift ;;
    --skip-db) SKIP_DB=true; shift ;;
    *) echo "Opción desconocida: $1" >&2; exit 1 ;;
  esac
done

ORG_RAZON="${ORG_RAZON:-$ORG_NAME}"

rand_hex() {
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
}

echo "🔧 [1/5] Validando herramientas requeridas..."
command -v node >/dev/null || { echo "❌ Node.js 20+ es obligatorio"; exit 1; }
command -v pnpm >/dev/null || { echo "❌ pnpm 8+ es obligatorio"; exit 1; }

if [[ ! -f "$ROOT_DIR/.env" ]]; then
  echo "📝 [2/5] Generando .env desde .env.example con secretos criptográficos aleatorios..."
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  PG_PASS="$(rand_hex | cut -c1-24)"
  JWT_SEC="$(rand_hex)"
  JWT_REF="$(rand_hex)"
  AUTH_SEC="$(rand_hex)"
  CFG_KEY="$(rand_hex)"

  node -e '
    const fs = require("fs");
    let c = fs.readFileSync(process.argv[1], "utf8");
    const pairs = {
      "CHANGE_ME_STRONG_POSTGRES_PASSWORD": process.argv[2],
      "CHANGE_ME_RANDOM_HEX_SECRET_AT_LEAST_32_CHARS": process.argv[3],
      "CHANGE_ME_RANDOM_HEX_REFRESH_SECRET_AT_LEAST_32_CHARS": process.argv[4],
      "CHANGE_ME_RANDOM_HEX_NEXTAUTH_SECRET_AT_LEAST_32_CHARS": process.argv[5],
      "CHANGE_ME_RANDOM_HEX_AES_KEY_AT_LEAST_32_CHARS": process.argv[6],
      "Mi Organización EAM": process.argv[7],
      "Mi Organización S.A.S.": process.argv[8],
      "Mi Plataforma EAM": process.argv[7],
      "SEED_ORG_CURRENCY=USD": "SEED_ORG_CURRENCY=" + process.argv[9],
      "SEED_ORG_CURRENCY_SYMBOL=$": "SEED_ORG_CURRENCY_SYMBOL=" + process.argv[10],
      "SEED_ORG_LOCALE=es-CO": "SEED_ORG_LOCALE=" + process.argv[11],
      "SEED_ORG_TIMEZONE=America/Bogota": "SEED_ORG_TIMEZONE=" + process.argv[12],
      "SEED_ORG_TAX_LABEL=IVA": "SEED_ORG_TAX_LABEL=" + process.argv[13],
      "SEED_ORG_TAX_RATE=19": "SEED_ORG_TAX_RATE=" + process.argv[14],
      "SEED_PRESETS=ALL": "SEED_PRESETS=" + process.argv[15],
      "http://localhost:3000/api": process.argv[16]
    };
    for (const [k, v] of Object.entries(pairs)) c = c.split(k).join(v);
    if (process.argv[17]) c = c.replace(/^SEED_ADMIN_EMAIL=.*/m, "SEED_ADMIN_EMAIL=" + process.argv[17]);
    if (process.argv[18]) c = c.replace(/^SEED_ADMIN_PASSWORD=.*/m, "SEED_ADMIN_PASSWORD=" + process.argv[18]);
    fs.writeFileSync(process.argv[1], c);
  ' "$ROOT_DIR/.env" "$PG_PASS" "$JWT_SEC" "$JWT_REF" "$AUTH_SEC" "$CFG_KEY" \
    "$ORG_NAME" "$ORG_RAZON" "$ORG_CURRENCY" "$ORG_SYMBOL" "$ORG_LOCALE" "$ORG_TZ" \
    "$ORG_TAX_LABEL" "$ORG_TAX_RATE" "$PRESETS" "$API_URL" "$ADMIN_EMAIL" "$ADMIN_PASS"
else
  echo "ℹ️  [2/5] .env ya existe en raíz; se preservan secretos existentes."
fi

echo "📦 [3/5] Generando Prisma Client..."
pnpm --filter @mekanos/database exec prisma generate

if [[ "$SKIP_DB" != "true" ]]; then
  echo "🗄️  [4/5] Aplicando migraciones y sembrado modular..."
  if [[ "$UPGRADE_EXISTING" == "true" ]]; then
    if command -v psql >/dev/null && [[ -n "${DIRECT_URL:-${DATABASE_URL:-}}" ]]; then
      psql "${DIRECT_URL:-$DATABASE_URL}" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/tools/migrations/upgrade-existing-db-fase1.sql"
    else
      echo "⚠️  psql o DATABASE_URL no presente en entorno shell; ejecute upgrade-existing-db-fase1.sql manualmente sobre la BD legacy antes de prisma migrate resolve."
    fi
  fi
  pnpm --filter @mekanos/database exec prisma migrate deploy
  SEED_ORG_NAME="$ORG_NAME" SEED_ORG_RAZON_SOCIAL="$ORG_RAZON" SEED_PRESETS="$PRESETS" \
    pnpm --filter @mekanos/database exec tsx prisma/seed.ts
else
  echo "⏭️  [4/5] Paso de BD omitido (--skip-db)."
fi

if [[ "$BUILD_APPS" == "true" ]]; then
  echo "🏗️  [5/5] Compilando paquetes workspace, API y Admin..."
  pnpm --filter @mekanos/shared build
  pnpm --filter @mekanos/core build
  pnpm --filter @mekanos/database build
  pnpm --filter @mekanos/api build
  CI=true pnpm --filter admin build
fi

if [[ "$BUILD_APK" == "true" ]]; then
  echo "📱 Compilando APK White-Label ($ORG_NAME | $APP_ID)..."
  (
    cd "$ROOT_DIR/apps/mobile"
    flutter build apk --release \
      --no-pub \
      --dart-define="APP_NAME=$ORG_NAME" \
      --dart-define="API_BASE_URL=$API_URL" \
      --dart-define="ENABLE_QA_SERVER_SWITCHER=false" \
      --android-project-arg="APP_APPLICATION_ID=$APP_ID" \
      --android-project-arg="APP_NAME=$ORG_NAME"
  )
fi

echo "✅ Provisionamiento White-Label finalizado."
