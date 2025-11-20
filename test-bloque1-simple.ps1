# Script simplificado - Solo prueba BLOQUE 1 (sin prerequisitos)
# Encoding: UTF-8

$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRUEBAS BLOQUE 1 - SIMPLIFICADAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Probar si el servidor responde
Write-Host "[TEST 0] Probando conexion al servidor..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
    Write-Host "   OK - Servidor respondiendo" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR - Servidor NO responde: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Asegurate de que el servidor este corriendo en el puerto 3000" -ForegroundColor Yellow
    exit
}

# TEST 1: Crear tipos_equipo
Write-Host "`n[TEST 1] Crear tipos_equipo..." -ForegroundColor Yellow
$tipoEquipoBody = @{
    nombre_tipo                   = "Planta Electrica Test $(Get-Random)"
    descripcion                   = "Tipo de equipo para testing"
    categoria                     = "GENERACION"
    potencia_minima_kw            = 50.5
    potencia_maxima_kw            = 150.75
    voltaje_operacion             = "220/440V"
    frecuencia_hz                 = 60
    aplicaciones                  = @("Industrial", "Comercial")
    nivel_criticidad              = "ALTO"
    requiere_certificacion        = $true
    tipo_combustible              = "DIESEL"
    vida_util_horas               = 15000
    intervalo_mantenimiento_horas = 500
} | ConvertTo-Json

try {
    $tipoEquipo = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method POST -Body $tipoEquipoBody -Headers $headers
    Write-Host "   OK - Creado con ID: $($tipoEquipo.id_tipo_equipo)" -ForegroundColor Green
    Write-Host "   Nombre: $($tipoEquipo.nombre_tipo)" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalle: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# TEST 2: Listar tipos_equipo
Write-Host "`n[TEST 2] Listar tipos_equipo..." -ForegroundColor Yellow
try {
    $tipos = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method GET -Headers $headers
    Write-Host "   OK - Total: $($tipos.Count) registros" -ForegroundColor Green
    if ($tipos.Count -gt 0) {
        Write-Host "   Ultimo: $($tipos[-1].nombre_tipo)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 3: Crear tipos_componente
Write-Host "`n[TEST 3] Crear tipos_componente..." -ForegroundColor Yellow
$tipoComponenteBody = @{
    nombre_tipo_componente = "Filtro Test $(Get-Random)"
    descripcion            = "Filtro para testing"
    categoria              = "MOTOR"
    unidad_medida          = "UNIDAD"
    es_critico             = $true
    requiere_certificacion = $false
    vida_util_horas        = 5000
    nivel_stock_minimo     = 10
} | ConvertTo-Json

try {
    $tipoComp = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method POST -Body $tipoComponenteBody -Headers $headers
    Write-Host "   OK - Creado con ID: $($tipoComp.id_tipo_componente)" -ForegroundColor Green
    Write-Host "   Nombre: $($tipoComp.nombre_tipo_componente)" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalle: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# TEST 4: Listar tipos_componente
Write-Host "`n[TEST 4] Listar tipos_componente..." -ForegroundColor Yellow
try {
    $comps = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method GET -Headers $headers
    Write-Host "   OK - Total: $($comps.Count) registros" -ForegroundColor Green
    if ($comps.Count -gt 0) {
        Write-Host "   Ultimo: $($comps[-1].nombre_tipo_componente)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 5: Crear catalogo_sistemas
Write-Host "`n[TEST 5] Crear catalogo_sistemas..." -ForegroundColor Yellow
$sistemaBody = @{
    nombre_sistema                = "Sistema Test $(Get-Random)"
    descripcion                   = "Sistema para testing"
    categoria                     = "LUBRICACION"
    aplica_a                      = @("MOTOR", "GENERADOR")
    componentes_requeridos        = @("Filtro", "Bomba")
    es_obligatorio                = $true
    requiere_inspeccion_periodica = $true
} | ConvertTo-Json

try {
    $sistema = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas" -Method POST -Body $sistemaBody -Headers $headers
    Write-Host "   OK - Creado con ID: $($sistema.id_sistema)" -ForegroundColor Green
    Write-Host "   Nombre: $($sistema.nombre_sistema)" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalle: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# TEST 6: Listar catalogo_sistemas
Write-Host "`n[TEST 6] Listar catalogo_sistemas..." -ForegroundColor Yellow
try {
    $sistemas = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas" -Method GET -Headers $headers
    Write-Host "   OK - Total: $($sistemas.Count) registros" -ForegroundColor Green
    if ($sistemas.Count -gt 0) {
        Write-Host "   Ultimo: $($sistemas[-1].nombre_sistema)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRUEBAS COMPLETADAS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
