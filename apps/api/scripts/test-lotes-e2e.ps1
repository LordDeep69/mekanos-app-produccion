#!/usr/bin/env pwsh
# ============================================================
# TEST E2E - LOTES COMPONENTES
# ============================================================
# Requisitos: Servidor corriendo en localhost:3000, seed ejecutado

$baseUrl = "http://localhost:3000/api"
$ErrorActionPreference = "Continue"

Write-Host "`n========================================"
Write-Host "TEST E2E - LOTES COMPONENTES"
Write-Host "========================================`n"

# Login
$loginBody = @{
    email    = "admin@mekanos.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    $headers = @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" }
    Write-Host "[OK] Login - Token obtenido"
}
catch {
    Write-Host "[ERROR] Login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test GET list
Write-Host "`n[TEST] GET /lotes-componentes (list)"
try {
    $list = Invoke-RestMethod -Uri "$baseUrl/lotes-componentes?page=1&limit=5" -Method GET -Headers $headers
    Write-Host "[OK] Lotes list returned: $($list.total) total, page $($list.page)" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] List: $($_.Exception.Message)" -ForegroundColor Red
}

# Test GET proximos a vencer
Write-Host "`n[TEST] GET /lotes-componentes/proximos-a-vencer?dias=30"
try {
    $pv = Invoke-RestMethod -Uri "$baseUrl/lotes-componentes/proximos-a-vencer?dias=30" -Method GET -Headers $headers
    if ($pv) {
        if ($pv.data) { Write-Host "[OK] Proximos a vencer count: $($pv.data.Count)" -ForegroundColor Green }
        elseif ($pv.Total) { Write-Host "[OK] Proximos a vencer count: $($pv.Total)" -ForegroundColor Green }
        else { Write-Host "[OK] Proximos a vencer: vacio" -ForegroundColor Yellow }
    }
    else { Write-Host "[OK] Proximos a vencer: vacio" -ForegroundColor Yellow }
}
catch {
    Write-Host "[ERROR] Proximos: $($_.Exception.Message)" -ForegroundColor Red
}

# Test POST create lote
Write-Host "`n[TEST] POST /lotes-componentes (crear lote)"
$d = @{
    codigo_lote              = "LOT-TEST-NEW-001"
    id_componente            = 1
    cantidad_inicial         = 10
    fecha_fabricacion        = (Get-Date -Format o)
    fecha_vencimiento        = (Get-Date).AddDays(365).ToString("o")
    id_proveedor             = 1
    numero_factura_proveedor = "FACT-TEST-001"
    observaciones            = "TEST E2E - Crear lote"
} | ConvertTo-Json
try {
    $created = Invoke-RestMethod -Uri "$baseUrl/lotes-componentes" -Method POST -Body $d -Headers $headers
    Write-Host "[OK] Lote creado ID: $($created.data.id_lote)" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Create lote: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "TEST LOTES E2E COMPLETADOS" -ForegroundColor Green
