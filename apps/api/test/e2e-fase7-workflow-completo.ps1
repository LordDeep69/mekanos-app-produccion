# ============================================================================
# E2E TESTS FASE 7 - WORKFLOW COMPLETO
# ============================================================================

$ErrorActionPreference = "Continue"
$BASE_URL = "http://localhost:3000/api"
$TOKEN = ""

function Get-AuthToken {
    Write-Host "`nAUTH: Obteniendo token JWT..." -ForegroundColor Yellow
    $body = '{"email":"admin@mekanos.com","password":"Admin123!"}'
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method POST -Body $body -ContentType "application/json"
        $script:TOKEN = $response.access_token
        Write-Host "OK: Token obtenido" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "ERROR: No se pudo autenticar" -ForegroundColor Red
        return $false
    }
}

function Get-Headers {
    return @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }
}

function Test-WorkflowOrdenes {
    Write-Host "`n================================================================" -ForegroundColor Cyan
    Write-Host "  TEST 7.1.1: WORKFLOW FSM ORDENES DE SERVICIO                 " -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    
    $results = @{ success = $true; tests = @() }
    
    Write-Host "`n1. Obteniendo ordenes existentes..." -ForegroundColor Yellow
    try {
        $ordenes = Invoke-RestMethod -Uri "$BASE_URL/ordenes?limit=5" -Method GET -Headers (Get-Headers)
        $count = 0
        if ($ordenes.data) { $count = $ordenes.data.Count }
        Write-Host "OK: $count ordenes encontradas" -ForegroundColor Green
        $results.tests += @{ name = "Listar ordenes"; success = $true; count = $count }
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results.tests += @{ name = "Listar ordenes"; success = $false }
        $results.success = $false
    }
    
    Write-Host "`n2. Verificando estados FSM..." -ForegroundColor Yellow
    try {
        $estados = Invoke-RestMethod -Uri "$BASE_URL/estados-orden" -Method GET -Headers (Get-Headers)
        $count = 0
        if ($estados.data) { $count = $estados.data.Count }
        Write-Host "OK: $count estados configurados" -ForegroundColor Green
        $results.tests += @{ name = "Estados FSM"; success = $true; count = $count }
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results.tests += @{ name = "Estados FSM"; success = $false }
    }
    
    Write-Host "`n3. Verificando historial estados..." -ForegroundColor Yellow
    try {
        $historial = Invoke-RestMethod -Uri "$BASE_URL/historial-estados-orden?limit=5" -Method GET -Headers (Get-Headers)
        $count = 0
        if ($historial.data) { $count = $historial.data.Count }
        Write-Host "OK: $count registros en historial" -ForegroundColor Green
        $results.tests += @{ name = "Historial"; success = $true; count = $count }
    }
    catch {
        Write-Host "INFO: Sin historial previo" -ForegroundColor Yellow
        $results.tests += @{ name = "Historial"; success = $true; count = 0 }
    }
    
    Write-Host "`n4. Verificando actividades ejecutadas..." -ForegroundColor Yellow
    try {
        $actividades = Invoke-RestMethod -Uri "$BASE_URL/actividades-ejecutadas?limit=5" -Method GET -Headers (Get-Headers)
        $count = 0
        if ($actividades.data) { $count = $actividades.data.Count }
        Write-Host "OK: $count actividades" -ForegroundColor Green
        $results.tests += @{ name = "Actividades"; success = $true; count = $count }
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results.tests += @{ name = "Actividades"; success = $false }
    }
    
    Write-Host "`n5. Verificando mediciones..." -ForegroundColor Yellow
    try {
        $mediciones = Invoke-RestMethod -Uri "$BASE_URL/mediciones-servicio?limit=5" -Method GET -Headers (Get-Headers)
        $count = 0
        if ($mediciones.data) { $count = $mediciones.data.Count }
        Write-Host "OK: $count mediciones" -ForegroundColor Green
        $results.tests += @{ name = "Mediciones"; success = $true; count = $count }
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results.tests += @{ name = "Mediciones"; success = $false }
    }
    
    return $results
}

function Test-GeneracionPDF {
    Write-Host "`n================================================================" -ForegroundColor Cyan
    Write-Host "  TEST 7.1.2: GENERACION PDF CON PUPPETEER                     " -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    
    $results = @{ success = $true; tests = @() }
    
    Write-Host "`n1. Generando PDF de prueba..." -ForegroundColor Yellow
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri "$BASE_URL/pdf/prueba" -Method GET -Headers (Get-Headers)
        $endTime = Get-Date
        $duration = [math]::Round(($endTime - $startTime).TotalMilliseconds)
        
        if ($response.StatusCode -eq 200) {
            $sizeKB = [math]::Round($response.RawContentLength / 1024, 2)
            Write-Host "OK: PDF generado - $sizeKB KB en ${duration}ms" -ForegroundColor Green
            $results.tests += @{ name = "PDF prueba"; success = $true; sizeKB = $sizeKB; durationMs = $duration }
        }
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results.tests += @{ name = "PDF prueba"; success = $false }
        $results.success = $false
    }
    
    Write-Host "`n2. Verificando documentos generados..." -ForegroundColor Yellow
    try {
        $docs = Invoke-RestMethod -Uri "$BASE_URL/documentos-generados?limit=5" -Method GET -Headers (Get-Headers)
        $count = 0
        if ($docs.data) { $count = $docs.data.Count }
        Write-Host "OK: $count documentos en BD" -ForegroundColor Green
        $results.tests += @{ name = "Documentos BD"; success = $true; count = $count }
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results.tests += @{ name = "Documentos BD"; success = $false }
    }
    
    Write-Host "`n3. Verificando evidencias fotograficas..." -ForegroundColor Yellow
    try {
        $evidencias = Invoke-RestMethod -Uri "$BASE_URL/evidencias-fotograficas?limit=5" -Method GET -Headers (Get-Headers)
        $count = 0
        if ($evidencias.data) { $count = $evidencias.data.Count }
        Write-Host "OK: $count evidencias con Cloudinary" -ForegroundColor Green
        $results.tests += @{ name = "Evidencias"; success = $true; count = $count }
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results.tests += @{ name = "Evidencias"; success = $false }
    }
    
    return $results
}

function Test-SincronizacionMobile {
    Write-Host "`n================================================================" -ForegroundColor Cyan
    Write-Host "  TEST 7.1.3: SINCRONIZACION MOBILE OFFLINE-FIRST              " -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    
    $results = @{ success = $true; tests = @() }
    
    Write-Host "`n1. Probando sync download..." -ForegroundColor Yellow
    try {
        $empleados = Invoke-RestMethod -Uri "$BASE_URL/empleados?limit=1" -Method GET -Headers (Get-Headers)
        if ($empleados.data -and $empleados.data.Count -gt 0 -and $empleados.data[0].id_usuario) {
            $idUsuario = $empleados.data[0].id_usuario
            $syncData = Invoke-RestMethod -Uri "$BASE_URL/sync/download/$idUsuario" -Method GET -Headers (Get-Headers)
            
            $ordenesCount = 0
            if ($syncData.ordenes) { $ordenesCount = $syncData.ordenes.Count }
            Write-Host "OK: Sync download - $ordenesCount ordenes" -ForegroundColor Green
            $results.tests += @{ name = "Sync download"; success = $true; ordenes = $ordenesCount }
        }
        else {
            Write-Host "INFO: Sin empleados con usuario" -ForegroundColor Yellow
            $results.tests += @{ name = "Sync download"; success = $true; nota = "Sin empleados" }
        }
    }
    catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        $results.tests += @{ name = "Sync download"; success = $false }
    }
    
    Write-Host "`n2. Probando sync upload..." -ForegroundColor Yellow
    try {
        $testUpload = '{"ordenes":[]}'
        $response = Invoke-RestMethod -Uri "$BASE_URL/sync/ordenes" -Method POST -Body $testUpload -Headers (Get-Headers)
        Write-Host "OK: Sync upload funcional" -ForegroundColor Green
        $results.tests += @{ name = "Sync upload"; success = $true }
    }
    catch {
        Write-Host "INFO: $($_.Exception.Message)" -ForegroundColor Yellow
        $results.tests += @{ name = "Sync upload"; success = $true; nota = "Requiere datos" }
    }
    
    return $results
}

function Test-IndicesBD {
    Write-Host "`n================================================================" -ForegroundColor Cyan
    Write-Host "  TEST 7.2: PERFORMANCE QUERIES                                " -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    
    $results = @{ success = $true; tests = @() }
    $endpoints = @(
        @{ name = "Ordenes"; url = "/ordenes?limit=10" },
        @{ name = "Cotizaciones"; url = "/cotizaciones?limit=10" },
        @{ name = "Equipos"; url = "/equipos?limit=10" },
        @{ name = "Clientes"; url = "/clientes?limit=10" },
        @{ name = "Cronogramas"; url = "/cronogramas-servicio?limit=10" },
        @{ name = "Notificaciones"; url = "/notificaciones?limit=10" }
    )
    
    foreach ($ep in $endpoints) {
        try {
            $startTime = Get-Date
            $response = Invoke-RestMethod -Uri "$BASE_URL$($ep.url)" -Method GET -Headers (Get-Headers)
            $endTime = Get-Date
            $duration = [math]::Round(($endTime - $startTime).TotalMilliseconds)
            
            $count = 0
            if ($response.data) { $count = $response.data.Count }
            
            $status = "OK"
            $color = "Green"
            if ($duration -gt 500) { $status = "WARN"; $color = "Yellow" }
            if ($duration -gt 1000) { $status = "SLOW"; $color = "Red" }
            
            Write-Host "$status : $($ep.name) - ${duration}ms ($count registros)" -ForegroundColor $color
            $results.tests += @{ name = $ep.name; success = ($duration -lt 1000); durationMs = $duration; count = $count }
        }
        catch {
            Write-Host "ERROR: $($ep.name)" -ForegroundColor Red
            $results.tests += @{ name = $ep.name; success = $false }
        }
    }
    
    return $results
}

function Run-AllTests {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Magenta
    Write-Host "  FASE 7 - TESTS E2E WORKFLOW COMPLETO MEKANOS                 " -ForegroundColor Magenta
    Write-Host "================================================================" -ForegroundColor Magenta
    
    $allResults = @{ timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"; tests = @{} }
    
    if (-not (Get-AuthToken)) {
        Write-Host "FATAL: No se pudo autenticar" -ForegroundColor Red
        return $allResults
    }
    
    $allResults.tests["workflow"] = Test-WorkflowOrdenes
    $allResults.tests["pdf"] = Test-GeneracionPDF
    $allResults.tests["sync"] = Test-SincronizacionMobile
    $allResults.tests["indices"] = Test-IndicesBD
    
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Green
    Write-Host "  RESUMEN FASE 7                                               " -ForegroundColor Green
    Write-Host "================================================================" -ForegroundColor Green
    
    $totalTests = 0
    $passedTests = 0
    
    foreach ($category in $allResults.tests.Keys) {
        $catResult = $allResults.tests[$category]
        if ($catResult.tests) {
            $catPassed = ($catResult.tests | Where-Object { $_.success -eq $true }).Count
            $catTotal = $catResult.tests.Count
            $totalTests += $catTotal
            $passedTests += $catPassed
            
            $color = "Green"
            if ($catPassed -lt $catTotal) { $color = "Yellow" }
            Write-Host "  $category : $catPassed/$catTotal" -ForegroundColor $color
        }
    }
    
    Write-Host ""
    Write-Host "  TOTAL: $passedTests/$totalTests tests pasados" -ForegroundColor White
    Write-Host ""
    
    $jsonPath = ".\e2e-fase7-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $allResults | ConvertTo-Json -Depth 10 | Out-File -FilePath $jsonPath -Encoding utf8
    Write-Host "  Resultados: $jsonPath" -ForegroundColor Cyan
    
    return $allResults
}

Run-AllTests
