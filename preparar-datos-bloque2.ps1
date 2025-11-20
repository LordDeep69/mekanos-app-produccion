# Script para preparar datos de prueba necesarios para BLOQUE 2
# Encoding: UTF-8

$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PREPARANDO DATOS PARA BLOQUE 2" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Crear tipos_componente
Write-Host "[PREP 1] Creando tipos_componente..." -ForegroundColor Yellow
$tipoCompBody = @{
    codigo_tipo       = "FLT-PREP-$(Get-Random -Minimum 1000 -Maximum 9999)"
    nombre_componente = "Filtro de Preparacion"
    categoria         = "FILTRO"
    aplica_a          = "AMBOS"
} | ConvertTo-Json

try {
    $tipoComp = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method POST -Body $tipoCompBody -Headers $headers
    Write-Host "   OK - ID: $($tipoComp.id_tipo_componente)" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Crear catalogo_sistemas
Write-Host "[PREP 2] Creando catalogo_sistemas..." -ForegroundColor Yellow
$sistemaBody = @{
    codigo_sistema = "SYS-PREP-$(Get-Random -Minimum 1000 -Maximum 9999)"
    nombre_sistema = "Sistema de Preparacion"
    descripcion    = "Sistema para pruebas de BLOQUE 2"
    aplica_a       = "AMBOS"
} | ConvertTo-Json

try {
    $sistema = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas" -Method POST -Body $sistemaBody -Headers $headers
    Write-Host "   OK - ID: $($sistema.id_sistema)" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DATOS DE PREPARACION CREADOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "`nAhora puedes ejecutar test-bloque2-simple.ps1" -ForegroundColor Yellow
Write-Host "que usa datos simplificados sin dependencias externas`n" -ForegroundColor Yellow
