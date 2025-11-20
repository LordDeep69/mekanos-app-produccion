# ======================================================================
# SCRIPT DE VALIDACIÓN COMPLETA - FASE 1
# Prueba todos los endpoints CRUD de las 8 tablas
# ======================================================================

$baseUrl = "http://localhost:3000/api"
$results = @()

# Colores para output
function Write-Success { param($msg) Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "[FAIL] $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Test { param($msg) Write-Host "[TEST] $msg" -ForegroundColor Yellow }

Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "VALIDACIÓN COMPLETA FASE 1 - MEKANOS API" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

# ======================================================================
# PASO 1: OBTENER TOKEN JWT
# ======================================================================
Write-Test "PASO 1: Autenticación"
try {
    $loginBody = @{
        email    = "admin@mekanos.com"
        password = "Admin123!"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Body $loginBody `
        -ContentType "application/json" `
        -ErrorAction Stop

    $token = $loginResponse.access_token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type"  = "application/json"
    }
    
    Write-Success "Token JWT obtenido: $($token.Substring(0,20))..."
}
catch {
    Write-Error "No se pudo obtener token JWT"
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# ======================================================================
# PASO 2: VALIDAR POST /api/tipos-equipo (BUG CORREGIDO)
# ======================================================================
Write-Test "`nPASO 2: POST /api/tipos-equipo (ENUM CORREGIDO)"

$tipoEquipoBody = @{
    codigo_tipo                  = "TEST-ENUM-$(Get-Random -Maximum 9999)"
    nombre_tipo                  = "GENERADOR TEST ENUM"
    categoria                    = "ENERGIA"
    formato_ficha_tecnica        = "FORMATO_TEST"
    tiene_motor                  = $true
    tiene_generador              = $true
    tiene_bomba                  = $false
    requiere_horometro           = $true
    permite_mantenimiento_tipo_a = $true
    permite_mantenimiento_tipo_b = $true
    intervalo_tipo_a_dias        = 30
    intervalo_tipo_a_horas       = 250
    intervalo_tipo_b_dias        = 180
    intervalo_tipo_b_horas       = 1500
    criterio_intervalo           = "LO_QUE_OCURRA_PRIMERO"
    formato_mantenimiento_tipo_a = "FORMATO_A"
    formato_mantenimiento_tipo_b = "FORMATO_B"
    orden                        = 99
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" `
        -Method POST `
        -Headers $headers `
        -Body $tipoEquipoBody `
        -ErrorAction Stop
    
    $createdId = $response.data.id_tipo_equipo
    $createdBy = $response.data.creado_por
    
    Write-Success "POST /api/tipos-equipo → ID: $createdId, creado_por: $createdBy"
    $results += @{
        Endpoint = "POST /api/tipos-equipo"
        Status   = "✅ SUCCESS"
        Details  = "ID: $createdId, creado_por: $createdBy"
    }
}
catch {
    Write-Error "POST /api/tipos-equipo → FALLO"
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errorBody = $reader.ReadToEnd()
        Write-Host "Response Body: $errorBody" -ForegroundColor Red
    }
    $results += @{
        Endpoint = "POST /api/tipos-equipo"
        Status   = "❌ FAIL"
        Details  = $_.Exception.Message
    }
}

# ======================================================================
# PASO 3: VALIDAR PUT Y DELETE DE LAS 8 TABLAS
# ======================================================================
Write-Test "`nPASO 3: Validar PUT y DELETE de FASE 1"

# ----------------------------------------------------------------------
# 3.1 PUT /api/tipos-equipo/:id
# ----------------------------------------------------------------------
if ($createdId) {
    Write-Info "3.1 PUT /api/tipos-equipo/$createdId"
    
    $updateBody = @{
        nombre_tipo           = "GENERADOR TEST ENUM ACTUALIZADO"
        categoria             = "ENERGIA"
        formato_ficha_tecnica = "FORMATO_TEST"
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo/$createdId" `
            -Method PUT `
            -Headers $headers `
            -Body $updateBody `
            -ErrorAction Stop
        
        $modifiedBy = $response.data.modificado_por
        Write-Success "PUT /api/tipos-equipo/$createdId → modificado_por: $modifiedBy"
        $results += @{
            Endpoint = "PUT /api/tipos-equipo/:id"
            Status   = "✅ SUCCESS"
            Details  = "modificado_por: $modifiedBy"
        }
    }
    catch {
        Write-Error "PUT /api/tipos-equipo/$createdId → FALLO"
        $results += @{
            Endpoint = "PUT /api/tipos-equipo/:id"
            Status   = "❌ FAIL"
            Details  = $_.Exception.Message
        }
    }
}

# ----------------------------------------------------------------------
# 3.2 PUT /api/tipos-componente/:id (si existe alguno)
# ----------------------------------------------------------------------
Write-Info "3.2 PUT /api/tipos-componente (crear registro de prueba)"

$tipoComponenteBody = @{
    codigo_tipo = "TEST-PUT-$(Get-Random -Maximum 9999)"
    nombre_tipo = "Filtro Test PUT"
    descripcion = "Para probar PUT"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" `
        -Method POST `
        -Headers $headers `
        -Body $tipoComponenteBody `
        -ErrorAction Stop
    
    $tipoCompId = $createResponse.data.id_tipo_componente
    
    # Ahora hacer PUT
    $updateCompBody = @{
        nombre_tipo = "Filtro Test PUT ACTUALIZADO"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$baseUrl/tipos-componente/$tipoCompId" `
        -Method PUT `
        -Headers $headers `
        -Body $updateCompBody `
        -ErrorAction Stop
    
    Write-Success "PUT /api/tipos-componente/$tipoCompId → OK"
    $results += @{
        Endpoint = "PUT /api/tipos-componente/:id"
        Status   = "✅ SUCCESS"
        Details  = "ID: $tipoCompId actualizado"
    }
}
catch {
    Write-Error "PUT /api/tipos-componente → FALLO"
    $results += @{
        Endpoint = "PUT /api/tipos-componente/:id"
        Status   = "❌ FAIL"
        Details  = $_.Exception.Message
    }
}

# ----------------------------------------------------------------------
# 3.3 PUT /api/equipos/:id (usar equipo existente)
# ----------------------------------------------------------------------
Write-Info "3.3 PUT /api/equipos/:id"

try {
    # Obtener lista de equipos
    $equiposList = Invoke-RestMethod -Uri "$baseUrl/equipos?limit=1" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    if ($equiposList.data -and $equiposList.data.Count -gt 0) {
        $equipoId = $equiposList.data[0].id_equipo
        
        $updateEquipoBody = @{
            nombre_equipo = "Equipo Test PUT - $(Get-Date -Format 'HH:mm:ss')"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$baseUrl/equipos/$equipoId" `
            -Method PUT `
            -Headers $headers `
            -Body $updateEquipoBody `
            -ErrorAction Stop
        
        Write-Success "PUT /api/equipos/$equipoId → OK"
        $results += @{
            Endpoint = "PUT /api/equipos/:id"
            Status   = "✅ SUCCESS"
            Details  = "ID: $equipoId actualizado"
        }
    }
}
catch {
    Write-Error "PUT /api/equipos → FALLO"
    $results += @{
        Endpoint = "PUT /api/equipos/:id"
        Status   = "❌ FAIL"
        Details  = $_.Exception.Message
    }
}

# ----------------------------------------------------------------------
# 3.4 DELETE /api/tipos-equipo/:id
# ----------------------------------------------------------------------
if ($createdId) {
    Write-Info "3.4 DELETE /api/tipos-equipo/$createdId"
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo/$createdId" `
            -Method DELETE `
            -Headers $headers `
            -ErrorAction Stop
        
        Write-Success "DELETE /api/tipos-equipo/$createdId → OK"
        $results += @{
            Endpoint = "DELETE /api/tipos-equipo/:id"
            Status   = "✅ SUCCESS"
            Details  = "ID: $createdId eliminado"
        }
    }
    catch {
        Write-Error "DELETE /api/tipos-equipo/$createdId → FALLO"
        $results += @{
            Endpoint = "DELETE /api/tipos-equipo/:id"
            Status   = "❌ FAIL"
            Details  = $_.Exception.Message
        }
    }
}

# ----------------------------------------------------------------------
# 3.5 DELETE /api/tipos-componente/:id
# ----------------------------------------------------------------------
if ($tipoCompId) {
    Write-Info "3.5 DELETE /api/tipos-componente/$tipoCompId"
    
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/tipos-componente/$tipoCompId" `
            -Method DELETE `
            -Headers $headers `
            -ErrorAction Stop
        
        Write-Success "DELETE /api/tipos-componente/$tipoCompId → OK"
        $results += @{
            Endpoint = "DELETE /api/tipos-componente/:id"
            Status   = "✅ SUCCESS"
            Details  = "ID: $tipoCompId eliminado"
        }
    }
    catch {
        Write-Error "DELETE /api/tipos-componente/$tipoCompId → FALLO"
        $results += @{
            Endpoint = "DELETE /api/tipos-componente/:id"
            Status   = "❌ FAIL"
            Details  = $_.Exception.Message
        }
    }
}

# ======================================================================
# PASO 4: VALIDAR GET DE TODAS LAS TABLAS
# ======================================================================
Write-Test "`nPASO 4: Validar GET de las 8 tablas FASE 1"

$getTables = @(
    "equipos",
    "tipos-equipo",
    "equipos-motor",
    "equipos-generador",
    "equipos-bomba",
    "tipos-componente",
    "catalogo-componentes",
    "componentes-equipo"
)

foreach ($table in $getTables) {
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/$table" `
            -Method GET `
            -Headers $headers `
            -ErrorAction Stop
        
        $count = if ($response.data) { $response.data.Count } else { 0 }
        Write-Success "GET /api/$table → $count registros"
        $results += @{
            Endpoint = "GET /api/$table"
            Status   = "✅ SUCCESS"
            Details  = "$count registros"
        }
    }
    catch {
        Write-Error "GET /api/$table → FALLO"
        $results += @{
            Endpoint = "GET /api/$table"
            Status   = "❌ FAIL"
            Details  = $_.Exception.Message
        }
    }
}

# ======================================================================
# RESUMEN FINAL
# ======================================================================
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "RESUMEN DE VALIDACIÓN" -ForegroundColor Magenta
Write-Host "========================================`n" -ForegroundColor Magenta

$successCount = ($results | Where-Object { $_.Status -like "*SUCCESS*" }).Count
$failCount = ($results | Where-Object { $_.Status -like "*FAIL*" }).Count

Write-Host "Total Endpoints Probados: $($results.Count)" -ForegroundColor White
Write-Success "Exitosos: $successCount"
Write-Error "Fallidos: $failCount"

Write-Host "`nDetalle de Resultados:`n" -ForegroundColor Yellow
$results | ForEach-Object {
    Write-Host "$($_.Status) $($_.Endpoint)" -NoNewline
    Write-Host " -> $($_.Details)" -ForegroundColor Gray
}

# Guardar resultados en archivo
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$reportFile = "test-results-$timestamp.json"
$results | ConvertTo-Json | Out-File $reportFile
Write-Host "`n[REPORT] Reporte guardado en: $reportFile" -ForegroundColor Cyan

Write-Host "`n========================================`n" -ForegroundColor Magenta
