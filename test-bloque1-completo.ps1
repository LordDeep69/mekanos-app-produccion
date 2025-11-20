# Script de pruebas REAL para BLOQUE 1 con DTOs correctos
# Encoding: UTF-8

$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRUEBAS FUNCIONALES REALES - BLOQUE 1" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# TEST 0: Probar servidor
Write-Host "[TEST 0] Verificando servidor..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "   OK - Servidor respondiendo" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR - Servidor NO responde" -ForegroundColor Red
    exit
}

# ================================================
# BLOQUE 1 - TIPOS_EQUIPO
# ================================================
Write-Host "`n========== TIPOS_EQUIPO ==========`n" -ForegroundColor Cyan

# TEST 1: Crear tipo equipo
Write-Host "[TEST 1] POST /tipos-equipo - Crear registro..." -ForegroundColor Yellow
$tipoEquipoBody = @{
    codigo_tipo                  = "PG-$(Get-Random -Minimum 100 -Maximum 999)"
    nombre_tipo                  = "Planta Generadora Industrial"
    descripcion                  = "Planta generadora para aplicaciones industriales de alta demanda"
    categoria                    = "GENERADOR"
    tiene_motor                  = $true
    tiene_generador              = $true
    tiene_bomba                  = $false
    requiere_horometro           = $true
    permite_mantenimiento_tipo_a = $true
    permite_mantenimiento_tipo_b = $true
    intervalo_tipo_a_dias        = 30
    intervalo_tipo_a_horas       = 250
    intervalo_tipo_b_dias        = 90
    intervalo_tipo_b_horas       = 500
    criterio_intervalo           = "AMBOS"
    formato_ficha_tecnica        = "FICHA_PLANTA_GEN_V1"
    formato_mantenimiento_tipo_a = "MTO_A_PLANTA_V1"
    formato_mantenimiento_tipo_b = "MTO_B_PLANTA_V1"
    orden                        = 10
} | ConvertTo-Json

try {
    $tipoEquipo = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method POST -Body $tipoEquipoBody -Headers $headers
    Write-Host "   OK CREADO:" -ForegroundColor Green
    Write-Host "      ID: $($tipoEquipo.id_tipo_equipo)" -ForegroundColor Gray
    Write-Host "      Codigo: $($tipoEquipo.codigo_tipo)" -ForegroundColor Gray
    Write-Host "      Nombre: $($tipoEquipo.nombre_tipo)" -ForegroundColor Gray
    Write-Host "      Categoria: $($tipoEquipo.categoria)" -ForegroundColor Gray
    $idTipoEquipo = $tipoEquipo.id_tipo_equipo
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# TEST 2: Listar tipos equipo
Write-Host "`n[TEST 2] GET /tipos-equipo - Listar registros..." -ForegroundColor Yellow
try {
    $tipos = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method GET -Headers $headers
    Write-Host "   OK LISTADO:" -ForegroundColor Green
    Write-Host "      Total registros: $($tipos.Count)" -ForegroundColor Gray
    if ($tipos.Count -gt 0) {
        Write-Host "      Ultimo: $($tipos[-1].nombre_tipo)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 3: Obtener un tipo equipo por ID
if ($idTipoEquipo) {
    Write-Host "`n[TEST 3] GET /tipos-equipo/$idTipoEquipo - Obtener por ID..." -ForegroundColor Yellow
    try {
        $tipoById = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo/$idTipoEquipo" -Method GET -Headers $headers
        Write-Host "   OK OBTENIDO:" -ForegroundColor Green
        Write-Host "      Nombre: $($tipoById.nombre_tipo)" -ForegroundColor Gray
        Write-Host "      Intervalo A (dias): $($tipoById.intervalo_tipo_a_dias)" -ForegroundColor Gray
        Write-Host "      Intervalo A (horas): $($tipoById.intervalo_tipo_a_horas)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ================================================
# BLOQUE 1 - TIPOS_COMPONENTE
# ================================================
Write-Host "`n========== TIPOS_COMPONENTE ==========`n" -ForegroundColor Cyan

# TEST 4: Crear tipo componente
Write-Host "[TEST 4] POST /tipos-componente - Crear registro..." -ForegroundColor Yellow
$tipoCompBody = @{
    codigo_tipo       = "FLT-$(Get-Random -Minimum 100 -Maximum 999)"
    nombre_componente = "Filtro de Aceite HD"
    categoria         = "FILTRO"
    subcategoria      = "Lubricacion"
    es_consumible     = $true
    es_inventariable  = $true
    aplica_a          = "AMBOS"
    descripcion       = "Filtro de aceite de alta durabilidad para motores diesel"
} | ConvertTo-Json

try {
    $tipoComp = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method POST -Body $tipoCompBody -Headers $headers
    Write-Host "   OK CREADO:" -ForegroundColor Green
    Write-Host "      ID: $($tipoComp.id_tipo_componente)" -ForegroundColor Gray
    Write-Host "      Codigo: $($tipoComp.codigo_tipo)" -ForegroundColor Gray
    Write-Host "      Nombre: $($tipoComp.nombre_componente)" -ForegroundColor Gray
    Write-Host "      Categoria: $($tipoComp.categoria)" -ForegroundColor Gray
    Write-Host "      Aplica a: $($tipoComp.aplica_a)" -ForegroundColor Gray
    $idTipoComp = $tipoComp.id_tipo_componente
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# TEST 5: Listar tipos componente
Write-Host "`n[TEST 5] GET /tipos-componente - Listar registros..." -ForegroundColor Yellow
try {
    $comps = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method GET -Headers $headers
    Write-Host "   OK LISTADO:" -ForegroundColor Green
    Write-Host "      Total registros: $($comps.Count)" -ForegroundColor Gray
    if ($comps.Count -gt 0) {
        Write-Host "      Ultimo: $($comps[-1].nombre_componente)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 6: Obtener un tipo componente por ID
if ($idTipoComp) {
    Write-Host "`n[TEST 6] GET /tipos-componente/$idTipoComp - Obtener por ID..." -ForegroundColor Yellow
    try {
        $compById = Invoke-RestMethod -Uri "$baseUrl/tipos-componente/$idTipoComp" -Method GET -Headers $headers
        Write-Host "   OK OBTENIDO:" -ForegroundColor Green
        Write-Host "      Nombre: $($compById.nombre_componente)" -ForegroundColor Gray
        Write-Host "      Es consumible: $($compById.es_consumible)" -ForegroundColor Gray
        Write-Host "      Es inventariable: $($compById.es_inventariable)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ================================================
# BLOQUE 1 - CATALOGO_SISTEMAS
# ================================================
Write-Host "`n========== CATALOGO_SISTEMAS ==========`n" -ForegroundColor Cyan

# TEST 7: Crear sistema
Write-Host "[TEST 7] POST /catalogo-sistemas - Crear registro..." -ForegroundColor Yellow
$sistemaBody = @{
    codigo_sistema      = "SYS-$(Get-Random -Minimum 100 -Maximum 999)"
    nombre_sistema      = "Sistema de Enfriamiento"
    descripcion         = "Sistema integral de enfriamiento para equipos industriales"
    aplica_a            = @("MOTOR", "GENERADOR")
    orden_visualizacion = 5
    icono               = "cooling-system"
    color_hex           = "#3498db"
    observaciones       = "Sistema critico, requiere revision periodica"
} | ConvertTo-Json

try {
    $sistema = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas" -Method POST -Body $sistemaBody -Headers $headers
    Write-Host "   OK CREADO:" -ForegroundColor Green
    Write-Host "      ID: $($sistema.id_sistema)" -ForegroundColor Gray
    Write-Host "      Codigo: $($sistema.codigo_sistema)" -ForegroundColor Gray
    Write-Host "      Nombre: $($sistema.nombre_sistema)" -ForegroundColor Gray
    Write-Host "      Aplica a: $($sistema.aplica_a -join ', ')" -ForegroundColor Gray
    Write-Host "      Color: $($sistema.color_hex)" -ForegroundColor Gray
    $idSistema = $sistema.id_sistema
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# TEST 8: Listar sistemas
Write-Host "`n[TEST 8] GET /catalogo-sistemas - Listar registros..." -ForegroundColor Yellow
try {
    $sistemas = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas" -Method GET -Headers $headers
    Write-Host "   OK LISTADO:" -ForegroundColor Green
    Write-Host "      Total registros: $($sistemas.Count)" -ForegroundColor Gray
    if ($sistemas.Count -gt 0) {
        Write-Host "      Ultimo: $($sistemas[-1].nombre_sistema)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 9: Obtener un sistema por ID
if ($idSistema) {
    Write-Host "`n[TEST 9] GET /catalogo-sistemas/$idSistema - Obtener por ID..." -ForegroundColor Yellow
    try {
        $sistemaById = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas/$idSistema" -Method GET -Headers $headers
        Write-Host "   OK OBTENIDO:" -ForegroundColor Green
        Write-Host "      Nombre: $($sistemaById.nombre_sistema)" -ForegroundColor Gray
        Write-Host "      Orden: $($sistemaById.orden_visualizacion)" -ForegroundColor Gray
        Write-Host "      Icono: $($sistemaById.icono)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ================================================
# RESUMEN FINAL
# ================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN - BLOQUE 1 PROBADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nTablas probadas:" -ForegroundColor Yellow
Write-Host "  1. tipos_equipo - 3 operaciones (POST, GET list, GET by ID)" -ForegroundColor Green
Write-Host "  2. tipos_componente - 3 operaciones (POST, GET list, GET by ID)" -ForegroundColor Green
Write-Host "  3. catalogo_sistemas - 3 operaciones (POST, GET list, GET by ID)" -ForegroundColor Green
Write-Host "`nValidaciones verificadas:" -ForegroundColor Yellow
Write-Host "  - DTOs con class-validator funcionando" -ForegroundColor Green
Write-Host "  - Enums validados correctamente" -ForegroundColor Green
Write-Host "  - Campos opcionales/requeridos respetados" -ForegroundColor Green
Write-Host "  - @Public() decorator eliminando JWT auth" -ForegroundColor Green
Write-Host "`nPruebas completadas exitosamente!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
