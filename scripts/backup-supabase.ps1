<#
.SYNOPSIS
  Respaldo logico verificado (PostgreSQL 17 custom format) de Supabase produccion.
.DESCRIPTION
  Conecta al Session Pooler IPv4 (puerto 5432), genera un dump comprimido (.dump),
  verifica integridad via pg_restore --list, calcula SHA-256 y opcionalmente cifra con AES-256-CBC.
#>
[CmdletBinding()]
param(
  [string]$ConnectionUrl = $env:SUPABASE_DIRECT_URL,
  [string]$OutputDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")).Path "backups"),
  [string]$PgBinDir = $env:PG_BIN_DIR,
  [switch]$Encrypt,
  [int]$RetentionCount = 14
)

$ErrorActionPreference = "Stop"

function Resolve-PgBinary([string]$Name, [string]$PreferredDir) {
  $candidates = @()
  if ($PreferredDir) { $candidates += (Join-Path $PreferredDir $Name) }
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { $candidates += $cmd.Source }
  foreach ($ver in @("18", "17")) {
    $candidates += "C:\Program Files\PostgreSQL\$ver\bin\$Name"
  }
  foreach ($c in $candidates) {
    if ($c -and (Test-Path $c)) { return $c }
  }
  throw "No se encontro '$Name' (PostgreSQL >= 17). Instala PostgreSQL 17 client o define -PgBinDir / \$env:PG_BIN_DIR."
}

function Resolve-DirectUrl([string]$ExplicitUrl) {
  if ($ExplicitUrl) { return $ExplicitUrl }
  $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  $envPath = Join-Path $repoRoot "packages\database\.env"
  if (Test-Path $envPath) {
    foreach ($line in Get-Content $envPath) {
      if ($line -match '^\s*DIRECT_URL\s*=\s*"?([^"\r\n]+)"?\s*$') {
        return $Matches[1]
      }
    }
  }
  throw "Define -ConnectionUrl, \$env:SUPABASE_DIRECT_URL o DIRECT_URL en packages/database/.env."
}

$pgDump = Resolve-PgBinary "pg_dump.exe" $PgBinDir
$pgRestore = Resolve-PgBinary "pg_restore.exe" $PgBinDir
$url = Resolve-DirectUrl $ConnectionUrl

if ($url -match ":6543") {
  throw "La URL de backup debe usar Session Pooler puerto 5432, nunca PgBouncer 6543."
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$ts = (Get-Date).ToUniversalTime().ToString("yyyyMMdd_HHmmss")
$dumpPath = Join-Path $OutputDir "mekanos_prod_${ts}.dump"

Write-Host "[1/4] Ejecutando pg_dump contra Session Pooler..." -ForegroundColor Cyan
& $pgDump $url --format=custom --compress=9 --no-owner --no-privileges --schema=public --file="$dumpPath"
if ($LASTEXITCODE -ne 0) { throw "pg_dump fallo con exit code $LASTEXITCODE." }

Write-Host "[2/4] Verificando integridad del archivo (.dump)..." -ForegroundColor Cyan
$tocLines = & $pgRestore --list $dumpPath
if ($LASTEXITCODE -ne 0) { throw "pg_restore --list fallo con exit code $LASTEXITCODE." }
$tableCount = ($tocLines | Where-Object { $_ -match "TABLE DATA public" }).Count
$rawSizeMb = [math]::Round((Get-Item $dumpPath).Length / 1MB, 2)
if ($tableCount -lt 1) { throw "Verificacion fallida: 0 tablas en TABLE DATA public." }
Write-Host "    OK: $tableCount tablas verificadas ($rawSizeMb MB)" -ForegroundColor Green

$finalArtifact = $dumpPath
if ($Encrypt) {
  if (-not $env:BACKUP_ENCRYPTION_KEY) {
    throw "Define \$env:BACKUP_ENCRYPTION_KEY para usar -Encrypt."
  }
  $openssl = @("openssl.exe", "C:\Program Files\Git\usr\bin\openssl.exe") |
    ForEach-Object { $c = Get-Command $_ -ErrorAction SilentlyContinue; if ($c) { $c.Source } elseif (Test-Path $_) { $_ } } |
    Select-Object -First 1
  if (-not $openssl) { throw "No se encontro openssl.exe para cifrar." }

  Write-Host "[3/4] Cifrando respaldo con AES-256-CBC (PBKDF2 200k)..." -ForegroundColor Cyan
  $encPath = "${dumpPath}.enc"
  & $openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -in "$dumpPath" -out "$encPath" -pass "env:BACKUP_ENCRYPTION_KEY"
  if ($LASTEXITCODE -ne 0) { throw "OpenSSL encryption fallo." }
  Remove-Item $dumpPath -Force
  $finalArtifact = $encPath
}

Write-Host "[4/4] Generando SHA-256 y aplicando retencion ($RetentionCount archivos)..." -ForegroundColor Cyan
$hash = (Get-FileHash -Path $finalArtifact -Algorithm SHA256).Hash.ToLower()
$shaLine = "$hash  $(Split-Path $finalArtifact -Leaf)"
[System.IO.File]::WriteAllText("${finalArtifact}.sha256", "$shaLine`n", [System.Text.UTF8Encoding]::new($false))

Get-ChildItem -Path $OutputDir -Filter "mekanos_prod_*.dump*" |
  Where-Object { $_.Name -notlike "*.sha256" } |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -Skip $RetentionCount |
  ForEach-Object {
    Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
    Remove-Item "$($_.FullName).sha256" -Force -ErrorAction SilentlyContinue
  }

Write-Host "RESPALDO COMPLETADO: $finalArtifact (SHA-256: $hash)" -ForegroundColor Green
