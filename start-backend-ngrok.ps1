# ============================================================
# MEKANOS S.A.S - Script: Iniciar Backend API + Ngrok
# ============================================================
# Uso: Click derecho > "Ejecutar con PowerShell"
#      O desde terminal: powershell -ExecutionPolicy Bypass -File start-backend-ngrok.ps1
#
# Que hace:
#   1. Mata procesos previos de node y ngrok (limpieza)
#   2. Compila el backend NestJS (pnpm run build)
#   3. Inicia el backend en una ventana PowerShell separada (node dist/main.js)
#   4. Espera a que el backend responda en http://localhost:3000/api/health
#   5. Inicia Ngrok con dominio estatico reservado
#   6. Verifica que la URL publica responda HTTP 200
#
# Credenciales Ngrok:
#   Cuenta: lorddeep3@gmail.com (cuenta gratuita)
#   Dominio estatico: hereditarily-unmutualized-joey.ngrok-free.dev
#   Dashboard: https://dashboard.ngrok.com
#   El authtoken ya esta configurado en la maquina local (ngrok config)
#
# URLs resultantes:
#   Local:   http://localhost:3000/api
#   Publico: https://hereditarily-unmutualized-joey.ngrok-free.dev/api
#   Swagger: http://localhost:3000/api/docs
#   Health:  http://localhost:3000/api/health
#
# Backend:
#   Framework: NestJS + Prisma + PostgreSQL (Supabase)
#   Puerto: 3000
#   Directorio: monorepo/apps/api
#   Build: pnpm run build (webpack)
#   Start: node dist/main.js
#
# Requisitos:
#   - Node.js 18+ instalado
#   - pnpm instalado globalmente
#   - ngrok instalado y autenticado (ngrok config add-authtoken <token>)
#   - Puerto 3000 libre
# ============================================================

$ErrorActionPreference = "Continue"
$MONOREPO = "C:\Users\Usuario\Downloads\mekanosApp\BASE DE DATOS\MEKANOS_DB\REFACTORIZATION\monorepo"
$API_DIR = "$MONOREPO\apps\api"
$NGROK_DOMAIN = "hereditarily-unmutualized-joey.ngrok-free.dev"
$BACKEND_PORT = 3000

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MEKANOS - Backend + Ngrok Launcher" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- PASO 1: Limpieza de procesos previos ---
Write-Host "[1/5] Limpiando procesos previos..." -ForegroundColor Yellow
Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$nodeProcs = Get-Process -Name node -ErrorAction SilentlyContinue
foreach ($proc in $nodeProcs) {
    try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
}
Start-Sleep -Seconds 2
Write-Host "      Procesos limpiados OK" -ForegroundColor Green

# --- PASO 2: Build del backend ---
Write-Host "[2/5] Compilando backend NestJS (pnpm run build)..." -ForegroundColor Yellow
Push-Location $API_DIR
$buildResult = & pnpm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "      ERROR: Build fallo. Revisa errores arriba." -ForegroundColor Red
    Pop-Location
    Read-Host "Presiona Enter para cerrar"
    exit 1
}
Pop-Location
Write-Host "      Build completado OK" -ForegroundColor Green

# --- PASO 3: Iniciar backend en ventana separada ---
Write-Host "[3/5] Iniciando backend (node dist/main.js)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$API_DIR'; node dist/main.js"
Write-Host "      Backend iniciandose en ventana separada..." -ForegroundColor Green

# --- PASO 4: Esperar a que el backend responda ---
Write-Host "[4/5] Esperando que el backend responda en puerto $BACKEND_PORT..." -ForegroundColor Yellow
$maxIntentos = 30
$intento = 0
$backendListo = $false

while ($intento -lt $maxIntentos) {
    $intento++
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$BACKEND_PORT/api/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
            $backendListo = $true
            break
        }
    } catch {
        Write-Host "      Intento $intento/$maxIntentos - Backend aun no responde..." -ForegroundColor DarkGray
    }
}

if (-not $backendListo) {
    Write-Host "      ERROR: Backend no respondio despues de $maxIntentos intentos." -ForegroundColor Red
    Read-Host "Presiona Enter para cerrar"
    exit 1
}
Write-Host "      Backend respondiendo OK (HTTP 200)" -ForegroundColor Green

# --- PASO 5: Iniciar Ngrok ---
Write-Host "[5/5] Iniciando Ngrok con dominio estatico..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http --url=$NGROK_DOMAIN $BACKEND_PORT"
Start-Sleep -Seconds 5

# Verificar Ngrok
try {
    $ngrokResp = Invoke-WebRequest -Uri "https://$NGROK_DOMAIN/api/health" -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    if ($ngrokResp.StatusCode -eq 200) {
        Write-Host "      Ngrok respondiendo OK (HTTP 200)" -ForegroundColor Green
    }
} catch {
    Write-Host "      AVISO: Ngrok puede tardar unos segundos mas en estar listo." -ForegroundColor Yellow
    Write-Host "      Prueba manualmente: https://$NGROK_DOMAIN/api/health" -ForegroundColor Yellow
}

# --- RESUMEN ---
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  LISTO - Todo funcionando" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URLs:" -ForegroundColor White
Write-Host "    Local:   http://localhost:$BACKEND_PORT/api" -ForegroundColor White
Write-Host "    Publico: https://$NGROK_DOMAIN/api" -ForegroundColor White
Write-Host "    Swagger: http://localhost:$BACKEND_PORT/api/docs" -ForegroundColor White
Write-Host "    Health:  http://localhost:$BACKEND_PORT/api/health" -ForegroundColor White
Write-Host ""
Write-Host "  IMPORTANTE: No cierres las 2 ventanas de PowerShell" -ForegroundColor Red
Write-Host "  que se abrieron (backend y ngrok)." -ForegroundColor Red
Write-Host ""
Read-Host "Presiona Enter para cerrar esta ventana"
