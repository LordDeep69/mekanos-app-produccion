<#
.SYNOPSIS
  Provisionamiento Single-Tenant White-Label para Windows (PowerShell).
.DESCRIPTION
  Genera .env raíz con secretos aleatorios, valida Prisma, ejecuta migraciones +
  seeds modulares V1..V8 / S1..S5 y opcionalmente compila API, Admin y APK móvil.
.EXAMPLE
  .\scripts\provision-whitelabel.ps1 -OrgName "Elevadores del Sur S.A." -Presets "ALL" -SkipDb
#>
param(
  [string]$OrgName = "Mi Organización EAM",
  [string]$OrgRazonSocial = "",
  [string]$OrgCurrency = "USD",
  [string]$OrgCurrencySymbol = "$",
  [string]$OrgLocale = "es-CO",
  [string]$OrgTimezone = "America/Bogota",
  [string]$OrgTaxLabel = "IVA",
  [string]$OrgTaxRate = "19",
  [string]$AdminEmail = "",
  [string]$AdminPassword = "",
  [string]$Presets = "ALL",
  [string]$ApiUrl = "http://localhost:3000/api",
  [string]$AppId = "com.eam.field_app",
  [switch]$UpgradeExisting,
  [switch]$BuildApps,
  [switch]$BuildApk,
  [switch]$SkipDb
)

$ErrorActionPreference = "Stop"
$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($OrgRazonSocial)) {
  $OrgRazonSocial = $OrgName
}

function New-RandomHex {
  param([int]$Bytes = 32)
  $buf = New-Object byte[] $Bytes
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buf)
  return -join ($buf | ForEach-Object { $_.ToString("x2") })
}

Push-Location $RootDir
try {
  Write-Host "[1/5] Verificando Node.js y pnpm..." -ForegroundColor Cyan
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js 20+ es obligatorio." }
  if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) { throw "pnpm 8+ es obligatorio." }

  $EnvPath = Join-Path $RootDir ".env"
  if (-not (Test-Path $EnvPath)) {
    Write-Host "[2/5] Creando .env desde .env.example con secretos aleatorios..." -ForegroundColor Cyan
    $content = Get-Content (Join-Path $RootDir ".env.example") -Raw -Encoding UTF8
    $replacements = [ordered]@{
      "CHANGE_ME_STRONG_POSTGRES_PASSWORD"                   = (New-RandomHex -Bytes 12)
      "CHANGE_ME_RANDOM_HEX_SECRET_AT_LEAST_32_CHARS"        = (New-RandomHex -Bytes 32)
      "CHANGE_ME_RANDOM_HEX_REFRESH_SECRET_AT_LEAST_32_CHARS"= (New-RandomHex -Bytes 32)
      "CHANGE_ME_RANDOM_HEX_NEXTAUTH_SECRET_AT_LEAST_32_CHARS"= (New-RandomHex -Bytes 32)
      "CHANGE_ME_RANDOM_HEX_AES_KEY_AT_LEAST_32_CHARS"       = (New-RandomHex -Bytes 32)
      "Mi Organización EAM"                                  = $OrgName
      "Mi Organización S.A.S."                               = $OrgRazonSocial
      "Mi Plataforma EAM"                                    = $OrgName
      "SEED_ORG_CURRENCY=USD"                                = "SEED_ORG_CURRENCY=$OrgCurrency"
      "SEED_ORG_CURRENCY_SYMBOL=$"                           = "SEED_ORG_CURRENCY_SYMBOL=$OrgCurrencySymbol"
      "SEED_ORG_LOCALE=es-CO"                                = "SEED_ORG_LOCALE=$OrgLocale"
      "SEED_ORG_TIMEZONE=America/Bogota"                     = "SEED_ORG_TIMEZONE=$OrgTimezone"
      "SEED_ORG_TAX_LABEL=IVA"                               = "SEED_ORG_TAX_LABEL=$OrgTaxLabel"
      "SEED_ORG_TAX_RATE=19"                                 = "SEED_ORG_TAX_RATE=$OrgTaxRate"
      "SEED_PRESETS=ALL"                                     = "SEED_PRESETS=$Presets"
      "http://localhost:3000/api"                            = $ApiUrl
    }
    foreach ($entry in $replacements.GetEnumerator()) {
      $content = $content.Replace($entry.Key, $entry.Value)
    }
    if (-not [string]::IsNullOrWhiteSpace($AdminEmail)) {
      $content = [regex]::Replace($content, "(?m)^SEED_ADMIN_EMAIL=.*$", "SEED_ADMIN_EMAIL=$AdminEmail")
    }
    if (-not [string]::IsNullOrWhiteSpace($AdminPassword)) {
      $content = [regex]::Replace($content, "(?m)^SEED_ADMIN_PASSWORD=.*$", "SEED_ADMIN_PASSWORD=$AdminPassword")
    }
    [System.IO.File]::WriteAllText($EnvPath, $content, (New-Object System.Text.UTF8Encoding($false)))
  } else {
    Write-Host "[2/5] .env ya existe en raíz; se preservan secretos existentes." -ForegroundColor Yellow
  }

  Write-Host "[3/5] Generando Prisma Client..." -ForegroundColor Cyan
  cmd /c "pnpm --filter @mekanos/database exec prisma generate"
  if ($LASTEXITCODE -ne 0) { throw "Fallo prisma generate." }

  if (-not $SkipDb) {
    Write-Host "[4/5] Ejecutando migraciones y sembrado modular..." -ForegroundColor Cyan
    if ($UpgradeExisting) {
      $dbConn = if ($env:DIRECT_URL) { $env:DIRECT_URL } else { $env:DATABASE_URL }
      if ((Get-Command psql -ErrorAction SilentlyContinue) -and $dbConn) {
        cmd /c "psql `"$dbConn`" -v ON_ERROR_STOP=1 -f tools\migrations\upgrade-existing-db-fase1.sql"
        if ($LASTEXITCODE -ne 0) { throw "Fallo upgrade-existing-db-fase1.sql." }
      } else {
        Write-Warning "psql o DATABASE_URL no disponible; ejecute tools/migrations/upgrade-existing-db-fase1.sql antes de prisma migrate deploy."
      }
    }
    cmd /c "pnpm --filter @mekanos/database exec prisma migrate deploy"
    if ($LASTEXITCODE -ne 0) { throw "Fallo prisma migrate deploy." }

    $env:SEED_ORG_NAME = $OrgName
    $env:SEED_ORG_RAZON_SOCIAL = $OrgRazonSocial
    $env:SEED_PRESETS = $Presets
    cmd /c "pnpm --filter @mekanos/database exec tsx prisma/seed.ts"
    if ($LASTEXITCODE -ne 0) { throw "Fallo seed modular." }
  } else {
    Write-Host "[4/5] Paso de BD omitido (-SkipDb)." -ForegroundColor Yellow
  }

  if ($BuildApps) {
    Write-Host "[5/5] Compilando paquetes workspace, API y Admin..." -ForegroundColor Cyan
    cmd /c "pnpm --filter @mekanos/shared build && pnpm --filter @mekanos/core build && pnpm --filter @mekanos/database build && pnpm --filter @mekanos/api build"
    if ($LASTEXITCODE -ne 0) { throw "Fallo compilación backend." }
    cmd /c "set `"CI=true`" && pnpm --filter admin build"
    if ($LASTEXITCODE -ne 0) { throw "Fallo compilación Admin." }
  }

  if ($BuildApk) {
    Write-Host "Compilando APK White-Label ($OrgName | $AppId)..." -ForegroundColor Cyan
    Push-Location (Join-Path $RootDir "apps\mobile")
    try {
      cmd /c "flutter build apk --release --no-pub --dart-define=`"APP_NAME=$OrgName`" --dart-define=`"API_BASE_URL=$ApiUrl`" --dart-define=`"ENABLE_QA_SERVER_SWITCHER=false`" --android-project-arg=`"APP_APPLICATION_ID=$AppId`" --android-project-arg=`"APP_NAME=$OrgName`""
      if ($LASTEXITCODE -ne 0) { throw "Fallo flutter build apk." }
    } finally {
      Pop-Location
    }
  }

  Write-Host "Provisionamiento White-Label finalizado." -ForegroundColor Green
} finally {
  Pop-Location
}
