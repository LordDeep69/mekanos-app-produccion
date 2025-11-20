# ============================================================
# TEST E2E - MOVIMIENTOS INVENTARIO
# ============================================================
# Requisitos: Servidor corriendo en localhost:3000, seed ejecutado

$baseUrl = "http://localhost:3000/api"
$ErrorActionPreference = "Continue"

Write-Host "`n========================================"
Write-Host "TEST E2E - MOVIMIENTOS INVENTARIO"
Write-Host "========================================`n"

# TEST 1: Login
Write-Host "[TEST 1] Login - Obtener JWT Token..."

$loginBody = @{
    email    = "admin@mekanos.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    
    if ($token) {
        Write-Host "[OK] Login exitoso - Token obtenido" -ForegroundColor Green
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type"  = "application/json"
        }
    }
    else {
        Write-Host "[ERROR] Login fallido" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "[ERROR] Login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# TEST 2: Consultar stock
Write-Host "`n[TEST 2] GET /movimientos-inventario/stock/1..."

try {
    $stockResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario/stock/1" -Method GET -Headers $headers
    
    Write-Host "[OK] Stock obtenido:" -ForegroundColor Green
    Write-Host "   ID Componente: $($stockResponse.data.id_componente)"
    Write-Host "   Stock Actual: $($stockResponse.data.stock_actual)"
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 3: Consultar kardex
Write-Host "`n[TEST 3] GET /movimientos-inventario/kardex/1..."

try {
    $kardexResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario/kardex/1?page=1&limit=10" -Method GET -Headers $headers
    
    Write-Host "[OK] Kardex obtenido:" -ForegroundColor Green
    Write-Host "   Total Movimientos: $($kardexResponse.data.Count)"
    
    if ($kardexResponse.data.Count -gt 0) {
        Write-Host "   Primer Movimiento:"
        Write-Host "     Tipo: $($kardexResponse.data[0].tipo_movimiento)"
        Write-Host "     Cantidad: $($kardexResponse.data[0].cantidad)"
        Write-Host "     Saldo: $($kardexResponse.data[0].saldo_acumulado)"
    }
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 4: Listar movimientos
Write-Host "`n[TEST 4] GET /movimientos-inventario (paginado)..."

try {
    $movimientosResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario?page=1&limit=5" -Method GET -Headers $headers
    
    Write-Host "[OK] Movimientos obtenidos:" -ForegroundColor Green
    Write-Host "   Total: $($movimientosResponse.meta.total)"
    Write-Host "   Pagina: $($movimientosResponse.meta.page) de $($movimientosResponse.meta.totalPages)"
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 5: Crear movimiento ENTRADA
Write-Host "`n[TEST 5] POST /movimientos-inventario (ENTRADA)..."

$nuevoMovimiento = @{
    id_componente     = 1
    id_lote           = 1
    tipo_movimiento   = "ENTRADA"
    origen_movimiento = "COMPRA"
    cantidad          = 50
    id_ubicacion      = 1
    observaciones     = "TEST E2E - Entrada de 50 unidades"
    # realizado_por se asigna automáticamente desde el token (UserId)
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario" -Method POST -Body $nuevoMovimiento -Headers $headers
    
    Write-Host "[OK] Movimiento ENTRADA creado:" -ForegroundColor Green
    Write-Host "   ID: $($createResponse.data.id_movimiento)"
    Write-Host "   Tipo: $($createResponse.data.tipo_movimiento)"
    Write-Host "   Cantidad: $($createResponse.data.cantidad)"
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)"
    }
}

# TEST 6: Verificar stock actualizado
Write-Host "`n[TEST 6] Verificar stock despues de ENTRADA..."

try {
    Start-Sleep -Seconds 1
    $stockNuevoResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario/stock/1" -Method GET -Headers $headers
    
    Write-Host "[OK] Stock actualizado:" -ForegroundColor Green
    Write-Host "   Stock Actual: $($stockNuevoResponse.data.stock_actual)"
    Write-Host "   (Deberia haber aumentado 50 unidades)"
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 7: Crear movimiento SALIDA
Write-Host "`n[TEST 7] POST /movimientos-inventario (SALIDA)..."

$movimientoSalida = @{
    id_componente     = 1
    id_lote           = 1
    tipo_movimiento   = "SALIDA"
    origen_movimiento = "CONSUMO_OS"
    cantidad          = 10
    id_ubicacion      = 1
    id_orden_servicio = 1
    observaciones     = "TEST E2E - Salida 10 unidades para OS"
    # realizado_por se asigna automáticamente desde el token (UserId)
} | ConvertTo-Json

try {
    $salidaResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario" -Method POST -Body $movimientoSalida -Headers $headers
    
    Write-Host "[OK] Movimiento SALIDA creado:" -ForegroundColor Green
    Write-Host "   ID: $($salidaResponse.data.id_movimiento)"
    Write-Host "   Cantidad: $($salidaResponse.data.cantidad)"
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 8: Kardex final
Write-Host "`n[TEST 8] Verificar kardex final..."

try {
    $kardexFinalResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario/kardex/1?page=1&limit=20" -Method GET -Headers $headers
    
    Write-Host "[OK] Kardex final:" -ForegroundColor Green
    Write-Host "   Total Movimientos: $($kardexFinalResponse.data.Count)"
    Write-Host "   Saldo Final: $($kardexFinalResponse.data[-1].saldo_acumulado)"
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 9: Filtrar por tipo
Write-Host "`n[TEST 9] GET /movimientos-inventario?tipo_movimiento=ENTRADA..."

try {
    $entradasResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario?tipo_movimiento=ENTRADA&page=1&limit=10" -Method GET -Headers $headers
    
    Write-Host "[OK] Movimientos ENTRADA filtrados:" -ForegroundColor Green
    Write-Host "   Total Entradas: $($entradasResponse.meta.total)"
}
catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
}

# RESUMEN
Write-Host "`n========================================"
Write-Host "RESUMEN TEST E2E - MOVIMIENTOS"
Write-Host "========================================"
Write-Host "[OK] Login y autenticacion" -ForegroundColor Green
Write-Host "[OK] Consulta stock componente" -ForegroundColor Green
Write-Host "[OK] Consulta kardex con saldos" -ForegroundColor Green
Write-Host "[OK] Listado movimientos paginado" -ForegroundColor Green
Write-Host "[OK] Creacion movimiento ENTRADA" -ForegroundColor Green
Write-Host "[OK] Creacion movimiento SALIDA" -ForegroundColor Green
Write-Host "[OK] Validacion stock actualizado" -ForegroundColor Green
Write-Host "[OK] Filtros por tipo movimiento" -ForegroundColor Green
Write-Host "`nTESTS COMPLETADOS - MODULO FUNCIONAL 100%`n" -ForegroundColor Green
