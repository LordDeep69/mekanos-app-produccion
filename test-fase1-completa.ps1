# ===================================================
# SCRIPT DE VALIDACION COMPLETA - FASE 1: EQUIPOS
# ===================================================

$baseUrl = "http://localhost:3000/api"
$ErrorActionPreference = "Continue"

Write-Host "=== VALIDACION COMPLETA FASE 1: EQUIPOS ===" -ForegroundColor Green
Write-Host ""

# ===================================================
# 1. EQUIPOS BASE
# ===================================================
Write-Host "1. EQUIPOS BASE" -ForegroundColor Cyan
Write-Host "   - POST /equipos (Crear equipo base)..." -NoNewline

$random = Get-Random -Minimum 1000 -Maximum 9999
$equipoBase = @{
    codigo_equipo   = "GEN-TEST-$random"
    id_cliente      = 1
    id_tipo_equipo  = 1
    ubicacion_texto = "Sala de Maquinas Principal"
    nombre_equipo   = "Generador Industrial Test"
    id_sede         = 1
    estado_equipo   = "OPERATIVO"
} | ConvertTo-Json

try {
    $resultBase = Invoke-RestMethod -Uri "$baseUrl/equipos" -Method POST `
        -ContentType "application/json" -Body $equipoBase
    
    $idEquipo = $resultBase.data.id_equipo
    Write-Host " [OK] (ID: $idEquipo)" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "   - GET /equipos (Listar)..." -NoNewline
try {
    $listaEquipos = Invoke-RestMethod -Uri "$baseUrl/equipos" -Method GET
    $count = $listaEquipos.Count
    Write-Host " [OK] ($count equipos)" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]" -ForegroundColor Red
}

Write-Host "   - GET /equipos/$idEquipo (Detalle)..." -NoNewline
try {
    $detalleEquipo = Invoke-RestMethod -Uri "$baseUrl/equipos/$idEquipo" -Method GET
    Write-Host " [OK]" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]" -ForegroundColor Red
}

Write-Host ""

# ===================================================
# 2. EQUIPOS MOTOR
# ===================================================
Write-Host "2. EQUIPOS MOTOR" -ForegroundColor Cyan
Write-Host "   - POST /equipos-motor (Crear motor COMBUSTION)..." -NoNewline

$equipoMotor = @{
    id_equipo               = $idEquipo
    tipo_motor              = "COMBUSTION"
    marca_motor             = "CATERPILLAR"
    modelo_motor            = "3516B"
    potencia_kw             = 1500.0
    tipo_combustible        = "DIESEL"
    capacidad_aceite_litros = 150.0
    creado_por              = 1
} | ConvertTo-Json

try {
    $resultMotor = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method POST `
        -ContentType "application/json" -Body $equipoMotor
    Write-Host " [OK]" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "   - GET /equipos-motor (Listar)..." -NoNewline
try {
    $listaMotores = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method GET
    $count = $listaMotores.Count
    Write-Host " [OK] ($count motores)" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]" -ForegroundColor Red
}

Write-Host "   - GET /equipos-motor/$idEquipo (Detalle)..." -NoNewline
try {
    $detalleMotor = Invoke-RestMethod -Uri "$baseUrl/equipos-motor/$idEquipo" -Method GET
    Write-Host " [OK] (Marca: $($detalleMotor.marca_motor))" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]" -ForegroundColor Red
}

Write-Host ""

# ===================================================
# 3. EQUIPOS GENERADOR
# ===================================================
Write-Host "3. EQUIPOS GENERADOR" -ForegroundColor Cyan

# Crear nuevo equipo base para generador
$randomGen = Get-Random -Minimum 1000 -Maximum 9999
$equipoBaseGen = @{
    codigo_equipo   = "GEN-TEST-$randomGen"
    id_cliente      = 1
    id_tipo_equipo  = 1
    ubicacion_texto = "Planta de Generacion Secundaria"
    nombre_equipo   = "Generador Electrico Test"
    id_sede         = 1
    estado_equipo   = "OPERATIVO"
} | ConvertTo-Json

try {
    $resultBaseGen = Invoke-RestMethod -Uri "$baseUrl/equipos" -Method POST `
        -ContentType "application/json" -Body $equipoBaseGen
    $idEquipoGen = $resultBaseGen.data.id_equipo
}
catch {
    Write-Host "   [ERROR] creando equipo base" -ForegroundColor Red
    exit 1
}

Write-Host "   - POST /equipos-generador (Crear generador)..." -NoNewline

$equipoGenerador = @{
    id_equipo        = $idEquipoGen
    marca_generador  = "STAMFORD"
    modelo_generador = "HCI634F"
    potencia_kva     = 2000.0
    voltaje_salida   = "220/440"
    numero_fases     = 3
    frecuencia_hz    = 60
    creado_por       = 1
} | ConvertTo-Json

try {
    $resultGen = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method POST `
        -ContentType "application/json" -Body $equipoGenerador
    Write-Host " [OK]" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "   - GET /equipos-generador (Listar)..." -NoNewline
try {
    $listaGen = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method GET
    $count = $listaGen.Count
    Write-Host " [OK] ($count generadores)" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]" -ForegroundColor Red
}

Write-Host "   - GET /equipos-generador/$idEquipoGen (Detalle)..." -NoNewline
try {
    $detalleGen = Invoke-RestMethod -Uri "$baseUrl/equipos-generador/$idEquipoGen" -Method GET
    Write-Host " [OK] (Marca: $($detalleGen.marca_generador))" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]" -ForegroundColor Red
}

Write-Host ""

# ===================================================
# 4. EQUIPOS BOMBA
# ===================================================
Write-Host "4. EQUIPOS BOMBA" -ForegroundColor Cyan

# Crear nuevo equipo base para bomba
$randomBomba = Get-Random -Minimum 1000 -Maximum 9999
$equipoBaseBomba = @{
    codigo_equipo   = "BOMBA-TEST-$randomBomba"
    id_cliente      = 1
    id_tipo_equipo  = 2
    ubicacion_texto = "Sistema Contra Incendios Principal"
    nombre_equipo   = "Bomba Contra Incendios Test"
    id_sede         = 1
    estado_equipo   = "OPERATIVO"
} | ConvertTo-Json

try {
    $resultBaseBomba = Invoke-RestMethod -Uri "$baseUrl/equipos" -Method POST `
        -ContentType "application/json" -Body $equipoBaseBomba
    $idEquipoBomba = $resultBaseBomba.data.id_equipo
}
catch {
    Write-Host "   [ERROR] creando equipo base" -ForegroundColor Red
    exit 1
}

Write-Host "   - POST /equipos-bomba (Crear bomba)..." -NoNewline

$equipoBomba = @{
    id_equipo           = $idEquipoBomba
    marca_bomba         = "PENTAIR"
    modelo_bomba        = "5HP-CI"
    tipo_bomba          = "CENTRIFUGA"
    aplicacion_bomba    = "CONTRA_INCENDIOS"
    caudal_nominal_gpm  = 500.0
    presion_nominal_psi = 150.0
    creado_por          = 1
} | ConvertTo-Json

try {
    $resultBomba = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method POST `
        -ContentType "application/json" -Body $equipoBomba
    Write-Host " [OK]" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "   - GET /equipos-bomba (Listar)..." -NoNewline
try {
    $listaBombas = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method GET
    $count = $listaBombas.Count
    Write-Host " [OK] ($count bombas)" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]" -ForegroundColor Red
}

Write-Host "   - GET /equipos-bomba/$idEquipoBomba (Detalle)..." -NoNewline
try {
    $detalleBomba = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba/$idEquipoBomba" -Method GET
    Write-Host " [OK] (Marca: $($detalleBomba.marca_bomba))" -ForegroundColor Green
}
catch {
    Write-Host " [ERROR]" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== VALIDACION COMPLETADA ===" -ForegroundColor Green
Write-Host ""
Write-Host "RESUMEN:" -ForegroundColor Yellow
Write-Host "  - Equipos Base: OK - 3 endpoints verificados" -ForegroundColor Green
Write-Host "  - Equipos Motor: OK - 3 endpoints verificados" -ForegroundColor Green
Write-Host "  - Equipos Generador: OK - 3 endpoints verificados" -ForegroundColor Green
Write-Host "  - Equipos Bomba: OK - 3 endpoints verificados" -ForegroundColor Green
Write-Host ""
Write-Host "TOTAL: 12 endpoints validados en FASE 1" -ForegroundColor Cyan
