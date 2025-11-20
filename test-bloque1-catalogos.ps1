# ============================================================
# TEST E2E - BLOQUE 1 CATÁLOGOS (FASE 1)
# Testing: tipos_equipo, tipos_componente, catalogo_sistemas
# ============================================================

$baseUrl = "http://localhost:3000/api"
$headers = @{"Content-Type" = "application/json" }
$testResults = @()

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🧪 INICIANDO TESTING E2E BLOQUE 1" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null
    )
    
    try {
        Write-Host "🔹 Testing: $Name" -ForegroundColor Yellow
        
        $params = @{
            Uri             = "$baseUrl/$Url"
            Method          = $Method
            Headers         = $headers
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-RestMethod @params
        
        Write-Host "   ✅ SUCCESS: $Method $Url" -ForegroundColor Green
        Write-Host "   Response: $($response | ConvertTo-Json -Compress -Depth 2)`n" -ForegroundColor Gray
        
        return @{
            Name     = $Name
            Method   = $Method
            Url      = $Url
            Status   = "✅ PASS"
            Response = $response
        }
    }
    catch {
        Write-Host "   ❌ FAILED: $Method $Url" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)`n" -ForegroundColor Red
        
        return @{
            Name   = $Name
            Method = $Method
            Url    = $Url
            Status = "❌ FAIL"
            Error  = $_.Exception.Message
        }
    }
}

# ============================================================
# TEST 1: TIPOS_EQUIPO (5 endpoints)
# ============================================================

Write-Host "`n📦 TESTING: TIPOS_EQUIPO" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# 1.1 POST - Crear tipo equipo
$tipoEquipoBody = @{
    codigo_tipo            = "TE-GEN-001"
    nombre_tipo            = "Generador Eléctrico Industrial"
    descripcion            = "Generador trifásico para uso industrial"
    categoria              = "GENERADOR"
    tiene_motor            = $true
    tiene_generador        = $true
    tiene_bomba            = $false
    requiere_horometro     = $true
    criterio_intervalo     = "HOROMETRO"
    intervalo_tipo_a_horas = 250
    intervalo_tipo_b_horas = 500
    activo                 = $true
}
$result1 = Test-Endpoint -Name "Crear Tipo Equipo" -Method "POST" -Url "tipos-equipo" -Body $tipoEquipoBody
$testResults += $result1
$tipoEquipoId = $result1.Response.id_tipo_equipo

# 1.2 GET - Listar tipos equipo
$result2 = Test-Endpoint -Name "Listar Tipos Equipo" -Method "GET" -Url "tipos-equipo?activo=true`&page=1`&limit=10"
$testResults += $result2

# 1.3 GET/:id - Obtener tipo equipo por ID
if ($tipoEquipoId) {
    $result3 = Test-Endpoint -Name "Obtener Tipo Equipo por ID" -Method "GET" -Url "tipos-equipo/$tipoEquipoId"
    $testResults += $result3
}

# 1.4 PUT/:id - Actualizar tipo equipo
if ($tipoEquipoId) {
    $updateBody = @{
        descripcion            = "Generador trifásico industrial - ACTUALIZADO"
        intervalo_tipo_a_horas = 300
    }
    $result4 = Test-Endpoint -Name "Actualizar Tipo Equipo" -Method "PUT" -Url "tipos-equipo/$tipoEquipoId" -Body $updateBody
    $testResults += $result4
}

# 1.5 DELETE/:id - Desactivar tipo equipo
if ($tipoEquipoId) {
    $result5 = Test-Endpoint -Name "Desactivar Tipo Equipo" -Method "DELETE" -Url "tipos-equipo/$tipoEquipoId"
    $testResults += $result5
}

# ============================================================
# TEST 2: TIPOS_COMPONENTE (5 endpoints)
# ============================================================

Write-Host "`n📦 TESTING: TIPOS_COMPONENTE" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# 2.1 POST - Crear tipo componente
$tipoComponenteBody = @{
    codigo_tipo       = "TC-FILTRO-001"
    nombre_componente = "Filtro de Aceite Industrial"
    categoria         = "FILTRO"
    aplica_a          = "AMBOS"
    es_consumible     = $true
    es_inventariable  = $true
    descripcion       = "Filtro de aceite para motores diésel"
}
$result6 = Test-Endpoint -Name "Crear Tipo Componente" -Method "POST" -Url "tipos-componente" -Body $tipoComponenteBody
$testResults += $result6
$tipoComponenteId = $result6.Response.id_tipo_componente

# 2.2 GET - Listar tipos componente
$result7 = Test-Endpoint -Name "Listar Tipos Componente" -Method "GET" -Url "tipos-componente?activo=true`&categoria=FILTRO"
$testResults += $result7

# 2.3 GET/:id - Obtener tipo componente por ID
if ($tipoComponenteId) {
    $result8 = Test-Endpoint -Name "Obtener Tipo Componente por ID" -Method "GET" -Url "tipos-componente/$tipoComponenteId"
    $testResults += $result8
}

# 2.4 PUT/:id - Actualizar tipo componente
if ($tipoComponenteId) {
    $updateBody = @{
        descripcion  = "Filtro de aceite para motores diésel - ACTUALIZADO"
        subcategoria = "Filtro de aceite premium"
    }
    $result9 = Test-Endpoint -Name "Actualizar Tipo Componente" -Method "PUT" -Url "tipos-componente/$tipoComponenteId" -Body $updateBody
    $testResults += $result9
}

# 2.5 DELETE/:id - Desactivar tipo componente
if ($tipoComponenteId) {
    $result10 = Test-Endpoint -Name "Desactivar Tipo Componente" -Method "DELETE" -Url "tipos-componente/$tipoComponenteId"
    $testResults += $result10
}

# ============================================================
# TEST 3: CATALOGO_SISTEMAS (5 endpoints)
# ============================================================

Write-Host "`n📦 TESTING: CATALOGO_SISTEMAS" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# 3.1 POST - Crear catálogo sistema
$catalogoSistemaBody = @{
    codigo_sistema      = "SYS-ELE-001"
    nombre_sistema      = "Sistema Eléctrico"
    descripcion         = "Sistema eléctrico completo del equipo"
    aplica_a            = @("MOTOR", "GENERADOR", "BOMBA")
    orden_visualizacion = 1
    icono               = "electric_bolt"
    color_hex           = "#FFD700"
}
$result11 = Test-Endpoint -Name "Crear Catálogo Sistema" -Method "POST" -Url "catalogo-sistemas" -Body $catalogoSistemaBody
$testResults += $result11
$catalogoSistemaId = $result11.Response.id_sistema

# 3.2 GET - Listar catalogo sistemas
$result12 = Test-Endpoint -Name "Listar Catalogo Sistemas" -Method "GET" -Url "catalogo-sistemas?activo=true`&aplica_a=MOTOR"
$testResults += $result12

# 3.3 GET/:id - Obtener catálogo sistema por ID
if ($catalogoSistemaId) {
    $result13 = Test-Endpoint -Name "Obtener Catálogo Sistema por ID" -Method "GET" -Url "catalogo-sistemas/$catalogoSistemaId"
    $testResults += $result13
}

# 3.4 PUT/:id - Actualizar catálogo sistema
if ($catalogoSistemaId) {
    $updateBody = @{
        descripcion         = "Sistema eléctrico completo del equipo - ACTUALIZADO"
        orden_visualizacion = 2
    }
    $result14 = Test-Endpoint -Name "Actualizar Catálogo Sistema" -Method "PUT" -Url "catalogo-sistemas/$catalogoSistemaId" -Body $updateBody
    $testResults += $result14
}

# 3.5 DELETE/:id - Desactivar catálogo sistema
if ($catalogoSistemaId) {
    $result15 = Test-Endpoint -Name "Desactivar Catálogo Sistema" -Method "DELETE" -Url "catalogo-sistemas/$catalogoSistemaId"
    $testResults += $result15
}

# ============================================================
# RESUMEN DE RESULTADOS
# ============================================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "📊 RESUMEN DE TESTING E2E" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object { $_.Status -eq "✅ PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "❌ FAIL" }).Count
$totalTests = $testResults.Count

Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "Success Rate: $([math]::Round(($passCount/$totalTests)*100, 2))%`n" -ForegroundColor Cyan

# Mostrar tests fallidos
if ($failCount -gt 0) {
    Write-Host "`n❌ TESTS FALLIDOS:" -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Red
    
    $testResults | Where-Object { $_.Status -eq "❌ FAIL" } | ForEach-Object {
        Write-Host "  • $($_.Name)" -ForegroundColor Red
        Write-Host "    $($_.Method) $($_.Url)" -ForegroundColor Gray
        Write-Host "    Error: $($_.Error)`n" -ForegroundColor Red
    }
}

# Resultado final
if ($failCount -eq 0) {
    Write-Host "`n✅ TODOS LOS TESTS PASARON - BLOQUE 1 CATÁLOGOS 100% FUNCIONAL" -ForegroundColor Green
    exit 0
}
else {
    Write-Host "`nALGUNOS TESTS FALLARON - REVISAR ERRORES" -ForegroundColor Yellow
    exit 1
}
