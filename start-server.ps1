# Script para iniciar el servidor NestJS en una ventana separada
# El servidor se mantendrá ejecutándose hasta que se cierre la ventana

$apiPath = Join-Path $PSScriptRoot "apps\api"

Write-Host "=== INICIANDO SERVIDOR MEKANOS ===" -ForegroundColor Green
Write-Host "Ruta: $apiPath" -ForegroundColor Cyan
Write-Host ""

# Iniciar servidor en nueva ventana PowerShell
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$apiPath'; Write-Host '🚀 Iniciando servidor NestJS...' -ForegroundColor Green; node dist/main.js"
) -WorkingDirectory $apiPath

Write-Host "✅ Servidor iniciado en ventana separada" -ForegroundColor Green
Write-Host "   El servidor estará disponible en: http://localhost:3000" -ForegroundColor Yellow
Write-Host "   Para detenerlo, cierra la ventana del servidor" -ForegroundColor Yellow
Write-Host ""
Write-Host "Esperando 5 segundos para que el servidor inicie..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# Verificar que el servidor esté escuchando
$port3000 = netstat -ano | Select-String ":3000"
if ($port3000) {
    Write-Host "✅ SERVIDOR ACTIVO en puerto 3000" -ForegroundColor Green
    Write-Host $port3000 -ForegroundColor Gray
}
else {
    Write-Host "⚠️  Aún no se detecta el puerto 3000, espera unos segundos más..." -ForegroundColor Yellow
}
