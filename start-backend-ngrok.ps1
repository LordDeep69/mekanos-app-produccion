# Script para iniciar Backend + Ngrok con dominio estático
# MEKANOS S.A.S - Desarrollo Local

Write-Host "🚀 Iniciando Backend + Ngrok para MEKANOS..." -ForegroundColor Green

# 1. Iniciar el backend en segundo plano
Write-Host "📦 Iniciando servidor backend NestJS..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\Usuario\Downloads\mekanosApp\BASE DE DATOS\MEKANOS_DB\REFACTORIZATION\monorepo'; pnpm --filter @mekanos/api start:dev"

# 2. Esperar 10 segundos para que el backend inicie
Write-Host "⏳ Esperando 10 segundos para que el backend inicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 3. Iniciar Ngrok con dominio estático
Write-Host "🌐 Iniciando Ngrok con dominio estático..." -ForegroundColor Cyan
Write-Host "📍 URL: https://hereditarily-unmutualized-joey.ngrok-free.dev" -ForegroundColor Green

# Iniciar ngrok con el dominio reservado (usando --url en vez de --domain)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "ngrok http --url=hereditarily-unmutualized-joey.ngrok-free.dev 3000"

Write-Host ""
Write-Host "✅ Backend y Ngrok iniciados correctamente" -ForegroundColor Green
Write-Host ""
Write-Host "📋 URLs importantes:" -ForegroundColor Yellow
Write-Host "   Backend local: http://localhost:3000" -ForegroundColor White
Write-Host "   Ngrok público: https://hereditarily-unmutualized-joey.ngrok-free.dev" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANTE: No cierres las ventanas de PowerShell que se abrieron" -ForegroundColor Red
Write-Host ""
