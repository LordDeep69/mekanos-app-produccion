<#
.SYNOPSIS
  Restauracion atomica verificada de respaldo Mekanos (.dump o .dump.enc) en Supabase.
.DESCRIPTION
  Valida checksum SHA-256 si existe, descifra .dump.enc con BACKUP_ENCRYPTION_KEY,
  filtra objetos de sistema (SCHEMA public) sin BOM UTF-8, restaura con --single-transaction
  y ejecuta VACUUM ANALYZE.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [Parameter(Mandatory = $true)]
  [string]$TargetDirectUrl,
  [string]$PgBinDir = $env:PG_BIN_DIR
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
  throw "No se encontro '$Name' (PostgreSQL >= 17). Define -PgBinDir o instala PostgreSQL 17 client."
}

if (-not (Test-Path $BackupFile)) { throw "Archivo no encontrado: $BackupFile" }
if ($TargetDirectUrl -match ":6543") {
  throw "La restauracion debe apuntar al Session Pooler puerto 5432, nunca PgBouncer 6543."
}

$pgRestore = Resolve-PgBinary "pg_restore.exe" $PgBinDir
$psql = Resolve-PgBinary "psql.exe" $PgBinDir

$shaFile = "${BackupFile}.sha256"
if (Test-Path $shaFile) {
  Write-Host "[1/5] Verificando checksum SHA-256..." -ForegroundColor Cyan
  $expected = ((Get-Content $shaFile -Raw).Trim() -split '\s+')[0].ToLower()
  $actual = (Get-FileHash -Path $BackupFile -Algorithm SHA256).Hash.ToLower()
  if ($expected -ne $actual) {
    throw "Checksum invalido. Esperado=$expected Actual=$actual"
  }
  Write-Host "    OK: SHA-256 verificado." -ForegroundColor Green
}

$dumpToRestore = $BackupFile
$tempDecrypted = $null
if ($BackupFile -like "*.enc") {
  if (-not $env:BACKUP_ENCRYPTION_KEY) {
    throw "Define \$env:BACKUP_ENCRYPTION_KEY para descifrar $BackupFile."
  }
  $openssl = @("openssl.exe", "C:\Program Files\Git\usr\bin\openssl.exe") |
    ForEach-Object { $c = Get-Command $_ -ErrorAction SilentlyContinue; if ($c) { $c.Source } elseif (Test-Path $_) { $_ } } |
    Select-Object -First 1
  if (-not $openssl) { throw "No se encontro openssl.exe para descifrar." }

  Write-Host "[2/5] Descifrando respaldo..." -ForegroundColor Cyan
  $tempDecrypted = [System.IO.Path]::ChangeExtension($BackupFile, $null)
  if (Test-Path $tempDecrypted) { $tempDecrypted = "$tempDecrypted.tmp.dump" }
  & $openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in "$BackupFile" -out "$tempDecrypted" -pass "env:BACKUP_ENCRYPTION_KEY"
  if ($LASTEXITCODE -ne 0) { throw "Error descifrando respaldo (clave incorrecta o archivo corrupto)." }
  $dumpToRestore = $tempDecrypted
}

$tocFile = [System.IO.Path]::GetTempFileName()
try {
  Write-Host "[3/5] Generando lista de objetos segura (sin SCHEMA public / BOM)..." -ForegroundColor Cyan
  $filteredToc = & $pgRestore --list $dumpToRestore |
    Where-Object { $_ -notmatch "^\d+; \d+ \d+ (SCHEMA - public|COMMENT - SCHEMA public)" }
  if ($LASTEXITCODE -ne 0) { throw "pg_restore --list fallo." }
  [System.IO.File]::WriteAllLines($tocFile, $filteredToc, [System.Text.UTF8Encoding]::new($false))

  Write-Host "[4/5] Restaurando atomicamente (--single-transaction --exit-on-error)..." -ForegroundColor Cyan
  & $pgRestore --dbname=$TargetDirectUrl --use-list=$tocFile --no-owner --no-privileges --exit-on-error --single-transaction $dumpToRestore
  if ($LASTEXITCODE -ne 0) { throw "pg_restore fallo con exit code $LASTEXITCODE." }

  Write-Host "[5/5] Ejecutando VACUUM ANALYZE..." -ForegroundColor Cyan
  & $psql $TargetDirectUrl -c "VACUUM ANALYZE;"
  if ($LASTEXITCODE -ne 0) { throw "VACUUM ANALYZE fallo." }

  Write-Host "RESTAURACION COMPLETADA EXITOSAMENTE." -ForegroundColor Green
}
finally {
  Remove-Item $tocFile -Force -ErrorAction SilentlyContinue
  if ($tempDecrypted -and (Test-Path $tempDecrypted)) {
    Remove-Item $tempDecrypted -Force -ErrorAction SilentlyContinue
  }
}
