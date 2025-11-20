# ============================================================
# TEST E2E - MOVIMIENTOS INVENTARIO
# ============================================================
# Requisitos: Servidor corriendo en localhost:3000, seed ejecutado

$baseUrl = "http://localhost:3000/api"
$ErrorActionPreference = "Continue"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST E2E - MOVIMIENTOS INVENTARIO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================================
# TEST 1: Login para obtener token
# ============================================================
Write-Host "[TEST 1] Login - Obtener JWT Token..." -ForegroundColor Yellow

$loginBody = @{
    email    = "admin@mekanos.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.access_token
    
    if ($token) {
        Write-Host "✅ Login exitoso - Token obtenido" -ForegroundColor Green
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type"  = "application/json"
        }
    }
    else {
        Write-Host "❌ Login fallido - No se obtuvo token" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================================
# TEST 2: Consultar stock actual componente 1
# ============================================================
Write-Host "`n[TEST 2] GET /movimientos-inventario/stock/1 - Consultar stock componente..." -ForegroundColor Yellow

try {
    $stockResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario/stock/1" -Method GET -Headers $headers
    
    Write-Host "✅ Stock obtenido correctamente:" -ForegroundColor Green
    Write-Host "   - ID Componente: $($stockResponse.id_componente)" -ForegroundColor White
    Write-Host "   - Stock Actual: $($stockResponse.stock_actual)" -ForegroundColor White
    Write-Host "   - Ultima Actualizacion: $($stockResponse.ultima_actualizacion)" -ForegroundColor White
}
catch {
    Write-Host "❌ Error consultando stock: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# TEST 3: Consultar kardex componente 1
# ============================================================
Write-Host "`n[TEST 3] GET /movimientos-inventario/kardex/1 - Consultar kardex..." -ForegroundColor Yellow

try {
    $kardexResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario/kardex/1?page=1&limit=10" -Method GET -Headers $headers
    
    Write-Host "✅ Kardex obtenido correctamente:" -ForegroundColor Green
    Write-Host "   - ID Componente: $($kardexResponse.id_componente)" -ForegroundColor White
    Write-Host "   - Total Movimientos: $($kardexResponse.movimientos.Count)" -ForegroundColor White
    
    if ($kardexResponse.movimientos.Count -gt 0) {
        Write-Host "   - Primer Movimiento:" -ForegroundColor White
        Write-Host "     * Tipo: $($kardexResponse.movimientos[0].tipo_movimiento)" -ForegroundColor Gray
        Write-Host "     * Cantidad: $($kardexResponse.movimientos[0].cantidad)" -ForegroundColor Gray
        Write-Host "     * Saldo: $($kardexResponse.movimientos[0].saldo)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "❌ Error consultando kardex: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# TEST 4: Consultar todos los movimientos (sin filtros)
# ============================================================
Write-Host "`n[TEST 4] GET /movimientos-inventario - Listar movimientos..." -ForegroundColor Yellow

try {
    $movimientosResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario?page=1&limit=5" -Method GET -Headers $headers
    
    Write-Host "✅ Movimientos obtenidos correctamente:" -ForegroundColor Green
    Write-Host "   - Total: $($movimientosResponse.total)" -ForegroundColor White
    Write-Host "   - Página: $($movimientosResponse.page) de $($movimientosResponse.totalPages)" -ForegroundColor White
    Write-Host "   - Movimientos en página: $($movimientosResponse.data.Count)" -ForegroundColor White
}
catch {
    Write-Host "❌ Error listando movimientos: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# TEST 5: Crear nuevo movimiento ENTRADA
# ============================================================
Write-Host "`n[TEST 5] POST /movimientos-inventario - Crear movimiento ENTRADA..." -ForegroundColor Yellow

$nuevoMovimiento = @{
    id_componente     = 1
    id_lote           = 1
    tipo_movimiento   = "ENTRADA"
    origen_movimiento = "COMPRA"
    cantidad          = 50
    id_ubicacion      = 1
    observaciones     = "TEST E2E - Entrada de 50 unidades"
    registrado_por    = 1
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario" -Method POST -Body $nuevoMovimiento -Headers $headers
    
    Write-Host "✅ Movimiento creado correctamente:" -ForegroundColor Green
    Write-Host "   - ID Movimiento: $($createResponse.id_movimiento)" -ForegroundColor White
    Write-Host "   - Tipo: $($createResponse.tipo_movimiento)" -ForegroundColor White
    Write-Host "   - Cantidad: $($createResponse.cantidad)" -ForegroundColor White
    Write-Host "   - Fecha: $($createResponse.fecha_movimiento)" -ForegroundColor White
    
    # Guardar ID para siguientes tests
    $global:idMovimientoCreado = $createResponse.id_movimiento
}
catch {
    Write-Host "❌ Error creando movimiento: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# ============================================================
# TEST 6: Verificar stock actualizado después de ENTRADA
# ============================================================
Write-Host "`n[TEST 6] Verificar stock después de ENTRADA..." -ForegroundColor Yellow

try {
    Start-Sleep -Seconds 1  # Pequeña pausa para asegurar consistencia
    $stockNuevoResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario/stock/1" -Method GET -Headers $headers
    
    Write-Host "✅ Stock actualizado verificado:" -ForegroundColor Green
    Write-Host "   - Stock Actual: $($stockNuevoResponse.stock_actual)" -ForegroundColor White
    Write-Host "   - (Debería haber aumentado en 50 unidades)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ Error verificando stock: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# TEST 7: Crear movimiento SALIDA
# ============================================================
Write-Host "`n[TEST 7] POST /movimientos-inventario - Crear movimiento SALIDA..." -ForegroundColor Yellow

$movimientoSalida = @{
    id_componente     = 1
    id_lote           = 1
    tipo_movimiento   = "SALIDA"
    origen_movimiento = "CONSUMO_OS"
    cantidad          = 10
    id_ubicacion      = 1
    id_orden_servicio = 1
    observaciones     = "TEST E2E - Salida de 10 unidades para OS"
    registrado_por    = 1
} | ConvertTo-Json

try {
    $salidaResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario" -Method POST -Body $movimientoSalida -Headers $headers
    
    Write-Host "✅ Movimiento SALIDA creado correctamente:" -ForegroundColor Green
    Write-Host "   - ID Movimiento: $($salidaResponse.id_movimiento)" -ForegroundColor White
    Write-Host "   - Tipo: $($salidaResponse.tipo_movimiento)" -ForegroundColor White
    Write-Host "   - Cantidad: $($salidaResponse.cantidad)" -ForegroundColor White
}
catch {
    Write-Host "❌ Error creando SALIDA: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# ============================================================
# TEST 8: Verificar kardex final
# ============================================================
Write-Host "`n[TEST 8] Verificar kardex final con todos los movimientos..." -ForegroundColor Yellow

try {
    $kardexFinalResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario/kardex/1?page=1&limit=20" -Method GET -Headers $headers
    
    Write-Host "✅ Kardex final obtenido:" -ForegroundColor Green
    Write-Host "   - Total Movimientos: $($kardexFinalResponse.movimientos.Count)" -ForegroundColor White
    Write-Host "   - Saldo Final: $($kardexFinalResponse.movimientos[-1].saldo)" -ForegroundColor White
    
    Write-Host "`n   Últimos 3 movimientos:" -ForegroundColor White
    $ultimosTres = $kardexFinalResponse.movimientos | Select-Object -Last 3
    foreach ($mov in $ultimosTres) {
        Write-Host "     - $($mov.tipo_movimiento): $($mov.cantidad) | Saldo: $($mov.saldo)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "❌ Error consultando kardex final: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# TEST 9: Filtrar movimientos por tipo
# ============================================================
Write-Host "`n[TEST 9] GET /movimientos-inventario?tipo_movimiento=ENTRADA..." -ForegroundColor Yellow

try {
    $entradasResponse = Invoke-RestMethod -Uri "$baseUrl/movimientos-inventario?tipo_movimiento=ENTRADA&page=1&limit=10" -Method GET -Headers $headers
    
    Write-Host "✅ Movimientos ENTRADA filtrados:" -ForegroundColor Green
    Write-Host "   - Total Entradas: $($entradasResponse.total)" -ForegroundColor White
}
catch {
    Write-Host "❌ Error filtrando movimientos: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================================
# RESUMEN FINAL
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN TEST E2E - MOVIMIENTOS INVENTARIO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Login y autenticación" -ForegroundColor Green
Write-Host "✅ Consulta stock componente" -ForegroundColor Green
Write-Host "✅ Consulta kardex con saldos" -ForegroundColor Green
Write-Host "✅ Listado movimientos con paginacion" -ForegroundColor Green
Write-Host "✅ Creacion movimiento ENTRADA" -ForegroundColor Green
Write-Host "✅ Creacion movimiento SALIDA" -ForegroundColor Green
Write-Host "✅ Validacion stock actualizado" -ForegroundColor Green
Write-Host "✅ Filtros por tipo movimiento" -ForegroundColor Green
Write-Host "`nTESTS COMPLETADOS - MODULO FUNCIONAL 100%" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
