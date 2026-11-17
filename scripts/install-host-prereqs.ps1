<#
.SYNOPSIS
  Instalador completo de prerequisitos del sistema anfitrión (Windows 10/11 Pro/Enterprise).
.DESCRIPTION
  Instala de forma oficial e idempotente mediante winget/WSL:
    1. WSL2 / Virtual Machine Platform (wsl --install --no-distribution + Microsoft.WSL)
    2. Git for Windows (incluye Git Bash: bash.exe / sh.exe)
    3. Docker Desktop (incluye docker + docker compose v2)
    4. PostgreSQL 16 (opcional con -WithPostgresClient; Docker ya provee PostgreSQL en contenedor)
    5. Navegador Chrome para Puppeteer local sin Docker (opcional con -WithLocalChrome)
  Debe ejecutarse en una consola PowerShell "Ejecutar como administrador".
.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\install-host-prereqs.ps1
#>
param(
  [switch]$WithPostgresLocal,
  [switch]$WithLocalChrome
)

$ErrorActionPreference = "Stop"
$RootDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LogPath = Join-Path $RootDir "install-host.log"

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Este instalador requiere PowerShell 'Ejecutar como administrador' (elevación UAC) para habilitar WSL2 e instalar Docker Desktop."
  exit 1
}

Start-Transcript -Path $LogPath -Append | Out-Null
try {
  Write-Host "=== [1/5] Validando virtualización por hardware y winget ===" -ForegroundColor Cyan
  $virt = (Get-CimInstance Win32_Processor).VirtualizationFirmwareEnabled
  if (-not $virt) {
    throw "La virtualización por hardware (SVM/VT-x) está deshabilitada en BIOS/UEFI."
  }
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw "winget no está disponible. Instale 'App Installer' desde Microsoft Store."
  }

  function Install-WingetPkg {
    param([string]$Id, [string]$Label, [string]$Override = "")
    $installed = winget list --id $Id -e --accept-source-agreements 2>$null
    if ($LASTEXITCODE -eq 0 -and ($installed -match [regex]::Escape($Id))) {
      Write-Host "OK: $Label ($Id) ya está instalado." -ForegroundColor Green
      return $false
    }
    Write-Host "Instalando $Label ($Id)..." -ForegroundColor Cyan
    $argsList = @("install", "--id", $Id, "-e", "--silent", "--accept-package-agreements", "--accept-source-agreements")
    if ($Override) {
      $argsList += @("--override", $Override)
    }
    & winget @argsList
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
      throw "Fallo instalando $Label ($Id) (ExitCode=$LASTEXITCODE). Revise $LogPath"
    }
    return $true
  }

  Write-Host "=== [2/5] Configurando WSL2 (Subsistema de Windows para Linux) ===" -ForegroundColor Cyan
  $rebootNeeded = $false
  $null = wsl --status 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Habilitando características de WSL2 y VirtualMachinePlatform..." -ForegroundColor Yellow
    dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart | Out-Null
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
      throw "Fallo habilitando Microsoft-Windows-Subsystem-Linux (ExitCode=$LASTEXITCODE)."
    }
    dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart | Out-Null
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 3010) {
      throw "Fallo habilitando VirtualMachinePlatform (ExitCode=$LASTEXITCODE)."
    }
    if (Install-WingetPkg -Id "Microsoft.WSL" -Label "Windows Subsystem for Linux") {
      $rebootNeeded = $true
    }
    $rebootNeeded = $true
  } else {
    Write-Host "OK: WSL ya está habilitado." -ForegroundColor Green
    wsl --set-default-version 2 2>$null | Out-Null
  }

  Write-Host "=== [3/5] Instalando Git for Windows (incluye bash.exe) ===" -ForegroundColor Cyan
  Install-WingetPkg -Id "Git.Git" -Label "Git for Windows" | Out-Null

  Write-Host "=== [4/5] Instalando Docker Desktop ===" -ForegroundColor Cyan
  $dockerInstalledNow = Install-WingetPkg -Id "Docker.DockerDesktop" -Label "Docker Desktop"
  if ($dockerInstalledNow) {
    $rebootNeeded = $true
  }

  $currentUser = $env:USERNAME
  if ($currentUser) {
    try {
      net localgroup docker-users $currentUser /add 2>$null | Out-Null
    } catch { }
  }

  if ($WithPostgresLocal) {
    Write-Host "=== [Opcional] Instalando PostgreSQL 16 (cliente psql y servicio local) ===" -ForegroundColor Cyan
    Install-WingetPkg -Id "PostgreSQL.PostgreSQL.16" -Label "PostgreSQL 16" | Out-Null
  }

  if ($WithLocalChrome) {
    Write-Host "=== [Opcional] Instalando Chromium para Puppeteer local ===" -ForegroundColor Cyan
    Push-Location (Join-Path $RootDir "apps\api")
    try {
      cmd /c "pnpm exec puppeteer browsers install chrome"
    } finally {
      Pop-Location
    }
  }

  Write-Host "=== [5/5] Resumen final ===" -ForegroundColor Green
  if ($rebootNeeded) {
    Write-Warning "Se requiere REINICIAR Windows una vez para activar WSL2/Docker Desktop. Luego abra Docker Desktop, espere a que indique 'Engine running', y ejecute: docker compose config && docker compose up -d --build"
  } else {
    Write-Host "Todos los prerequisitos quedaron instalados. Verifique con: wsl --status && docker --version && bash --version" -ForegroundColor Green
  }
} finally {
  Stop-Transcript | Out-Null
}
