# Script de testing para endpoints BLOQUE 1 y BLOQUE 2
$baseUrl = "http://localhost:3000/api"
$headers = @{"Content-Type" = "application/json" }

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTING FASE 1 - EQUIPOS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================
# BLOQUE 1: CATÁLOGOS
# ============================================

Write-Host "`n--- BLOQUE 1: tipos_equipo ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method GET -Headers $headers
    Write-Host "✅ GET /tipos-equipo: $($response.Count) items" -ForegroundColor Green
}
catch {
    Write-Host "❌ GET /tipos-equipo Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n--- BLOQUE 1: tipos_componente ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method GET -Headers $headers
    Write-Host "✅ GET /tipos-componente: $($response.Count) items" -ForegroundColor Green
}
catch {
    Write-Host "❌ GET /tipos-componente Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n--- BLOQUE 1: catalogo_sistemas ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas" -Method GET -Headers $headers
    Write-Host "✅ GET /catalogo-sistemas: $($response.Count) items" -ForegroundColor Green
}
catch {
    Write-Host "❌ GET /catalogo-sistemas Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# BLOQUE 2: ESPECIALIZACIONES
# ============================================

Write-Host "`n--- BLOQUE 2: equipos_motor ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method GET -Headers $headers
    Write-Host "✅ GET /equipos-motor: $($response.Count) items" -ForegroundColor Green
}
catch {
    Write-Host "❌ GET /equipos-motor Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n--- BLOQUE 2: equipos_generador ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method GET -Headers $headers
    Write-Host "✅ GET /equipos-generador: $($response.Count) items" -ForegroundColor Green
}
catch {
    Write-Host "❌ GET /equipos-generador Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n--- BLOQUE 2: equipos_bomba ---" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method GET -Headers $headers
    Write-Host "✅ GET /equipos-bomba: $($response.Count) items" -ForegroundColor Green
}
catch {
    Write-Host "❌ GET /equipos-bomba Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTING COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
