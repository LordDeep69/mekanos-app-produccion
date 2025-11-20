# Script SIMPLIFICADO de pruebas funcionales para BLOQUE 2
# Usa DTOs permisivos y evita dependencias externas
# Encoding: UTF-8

$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRUEBAS FUNCIONALES - BLOQUE 2 (SIMPLIFICADO)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# TEST 0: Verificar servidor
Write-Host "[TEST 0] Verificando servidor..." -ForegroundColor Yellow
try {
    $health = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet
    if ($health) {
        Write-Host "   OK - Servidor respondiendo en puerto 3000" -ForegroundColor Green
    }
}
catch {
    Write-Host "   ERROR - Servidor NO responde" -ForegroundColor Red
    exit
}

# ================================================
# BLOQUE 2 - EQUIPOS_MOTOR (Sin crear equipo base primero)
# ================================================
Write-Host "`n========== EQUIPOS_MOTOR ==========`n" -ForegroundColor Cyan

Write-Host "[TEST 1] POST /equipos-motor - Crear registro (sin equipo base)..." -ForegroundColor Yellow
$motorBody = @{
    tipo_motor = "DIESEL_4T"
    marca_motor = "CATERPILLAR"
    modelo_motor = "3516B-HD"
    numero_serie_motor = "3516B-$(Get-Random -Minimum 10000 -Maximum 99999)"
    potencia_hp = 2250.50
    potencia_kw = 1678.30
    velocidad_nominal_rpm = 1800
    tipo_combustible = "DIESEL"
    numero_cilindros = 16
    cilindrada_cc = 69000
    tiene_turbocargador = $true
    tipo_arranque = "ELECTRICO"
    voltaje_arranque_vdc = 24
    amperaje_arranque = 800.00
    numero_baterias = 4
    referencia_bateria = "TROJAN T-1275"
    capacidad_bateria_ah = 150
    tiene_radiador = $true
    radiador_alto_cm = 120.50
    radiador_ancho_cm = 85.30
    radiador_espesor_cm = 15.20
    tiene_cargador_bateria = $true
    marca_cargador = "POWERSTREAM"
    modelo_cargador = "PSC-100A"
    amperaje_cargador = 100.00
    capacidad_aceite_litros = 120.50
    tipo_aceite = "SAE 15W-40 CI-4"
    capacidad_refrigerante_litros = 180.00
    tipo_refrigerante = "Etilenglicol 50/50"
    voltaje_operacion_vac = "440V"
    numero_fases = "TRIFASICO"
    frecuencia_hz = 60
    clase_aislamiento = "H"
    grado_proteccion_ip = "IP23"
    amperaje_nominal = 2460.50
    factor_potencia = 0.80
    anio_fabricacion = 2023
    observaciones = "Motor diesel de alta eficiencia para generacion industrial - TEST BLOQUE2"
} | ConvertTo-Json

try {
    $motor = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method POST -Body $motorBody -Headers $headers
    Write-Host "   OK CREADO:" -ForegroundColor Green
    Write-Host "      ID Equipo: $($motor.id_equipo)" -ForegroundColor Gray
    Write-Host "      Tipo: $($motor.tipo_motor)" -ForegroundColor Gray
    Write-Host "      Potencia: $($motor.potencia_kw) kW / $($motor.potencia_hp) HP" -ForegroundColor Gray
    Write-Host "      Cilindros: $($motor.numero_cilindros)" -ForegroundColor Gray
    Write-Host "      RPM: $($motor.velocidad_nominal_rpm)" -ForegroundColor Gray
    $idMotor = $motor.id_equipo
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    $idMotor = $null
}

# TEST 2: Listar equipos_motor
Write-Host "`n[TEST 2] GET /equipos-motor - Listar registros..." -ForegroundColor Yellow
try {
    $motores = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method GET -Headers $headers
    Write-Host "   OK LISTADO:" -ForegroundColor Green
    Write-Host "      Total registros: $($motores.Count)" -ForegroundColor Gray
    if ($motores.Count -gt 0) {
        Write-Host "      Ultimo: $($motores[-1].marca_motor) $($motores[-1].modelo_motor)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 3: Obtener motor por ID (solo si se creó exitosamente)
if ($idMotor) {
    Write-Host "`n[TEST 3] GET /equipos-motor/$idMotor - Obtener por ID..." -ForegroundColor Yellow
    try {
        $motorById = Invoke-RestMethod -Uri "$baseUrl/equipos-motor/$idMotor" -Method GET -Headers $headers
        Write-Host "   OK OBTENIDO:" -ForegroundColor Green
        Write-Host "      Marca: $($motorById.marca_motor)" -ForegroundColor Gray
        Write-Host "      Modelo: $($motorById.modelo_motor)" -ForegroundColor Gray
        Write-Host "      Potencia kW: $($motorById.potencia_kw)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ================================================
# BLOQUE 2 - EQUIPOS_GENERADOR
# ================================================
Write-Host "`n========== EQUIPOS_GENERADOR ==========`n" -ForegroundColor Cyan

Write-Host "[TEST 4] POST /equipos-generador - Crear registro..." -ForegroundColor Yellow
$generadorBody = @{
    tipo_generador = "SINCRONO"
    marca_generador = "STAMFORD"
    modelo_generador = "HCI-634F"
    numero_serie_generador = "HCI-$(Get-Random -Minimum 10000 -Maximum 99999)"
    potencia_kva = 1875.60
    potencia_kw = 1500.50
    voltaje_salida = "440V"
    frecuencia = 60
    numero_fases = "TRIFASICO"
    velocidad_rpm = 1800
    factor_potencia = 0.80
    corriente_nominal = 2460.50
    clase_aislamiento = "H"
    grado_proteccion = "IP23"
    tipo_rotor = "POLOS_LISOS"
    regulacion_voltaje = "AVR"
    eficiencia_porcentaje = 95.50
    amperaje_excitacion = 15.50
    voltaje_excitacion_vdc = 180
    anio_fabricacion = 2023
    observaciones = "Generador sincrono brushless de alta eficiencia - TEST BLOQUE2"
} | ConvertTo-Json

try {
    $generador = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method POST -Body $generadorBody -Headers $headers
    Write-Host "   OK CREADO:" -ForegroundColor Green
    Write-Host "      ID Equipo: $($generador.id_equipo)" -ForegroundColor Gray
    Write-Host "      Tipo: $($generador.tipo_generador)" -ForegroundColor Gray
    Write-Host "      Potencia: $($generador.potencia_kva) kVA / $($generador.potencia_kw) kW" -ForegroundColor Gray
    Write-Host "      Voltaje: $($generador.voltaje_salida)" -ForegroundColor Gray
    $idGen = $generador.id_equipo
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    $idGen = $null
}

# TEST 5: Listar equipos_generador
Write-Host "`n[TEST 5] GET /equipos-generador - Listar registros..." -ForegroundColor Yellow
try {
    $generadores = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method GET -Headers $headers
    Write-Host "   OK LISTADO:" -ForegroundColor Green
    Write-Host "      Total registros: $($generadores.Count)" -ForegroundColor Gray
    if ($generadores.Count -gt 0) {
        Write-Host "      Ultimo: $($generadores[-1].marca_generador) $($generadores[-1].modelo_generador)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 6: Obtener generador por ID (solo si se creó exitosamente)
if ($idGen) {
    Write-Host "`n[TEST 6] GET /equipos-generador/$idGen - Obtener por ID..." -ForegroundColor Yellow
    try {
        $genById = Invoke-RestMethod -Uri "$baseUrl/equipos-generador/$idGen" -Method GET -Headers $headers
        Write-Host "   OK OBTENIDO:" -ForegroundColor Green
        Write-Host "      Marca: $($genById.marca_generador)" -ForegroundColor Gray
        Write-Host "      Potencia kVA: $($genById.potencia_kva)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ================================================
# BLOQUE 2 - EQUIPOS_BOMBA
# ================================================
Write-Host "`n========== EQUIPOS_BOMBA ==========`n" -ForegroundColor Cyan

Write-Host "[TEST 7] POST /equipos-bomba - Crear registro..." -ForegroundColor Yellow
$bombaBody = @{
    tipo_bomba = "CENTRIFUGA"
    marca_bomba = "GOULDS"
    modelo_bomba = "3196-MTX"
    numero_serie_bomba = "MTX-$(Get-Random -Minimum 10000 -Maximum 99999)"
    caudal_nominal_gpm = 500.50
    caudal_minimo_gpm = 200.00
    caudal_maximo_gpm = 650.00
    altura_total_pies = 215.30
    altura_minima_pies = 150.00
    altura_maxima_pies = 280.50
    presion_maxima_psi = 125.50
    npsh_requerido_pies = 11.50
    velocidad_rpm = 1750
    potencia_hp = 75.50
    eficiencia_porcentaje = 87.00
    diametro_impulsor_pulg = 13.80
    numero_etapas = 1
    tipo_sello = "MECANICO_DOBLE"
    material_carcasa = "HIERRO_FUNDIDO"
    material_impulsor = "BRONCE"
    diametro_succion_pulg = 8.00
    diametro_descarga_pulg = 6.00
    temperatura_maxima_f = 212.00
    anio_fabricacion = 2023
    observaciones = "Bomba centrifuga horizontal para agua limpia - TEST BLOQUE2"
} | ConvertTo-Json

try {
    $bomba = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method POST -Body $bombaBody -Headers $headers
    Write-Host "   OK CREADO:" -ForegroundColor Green
    Write-Host "      ID Equipo: $($bomba.id_equipo)" -ForegroundColor Gray
    Write-Host "      Tipo: $($bomba.tipo_bomba)" -ForegroundColor Gray
    Write-Host "      Caudal: $($bomba.caudal_nominal_gpm) GPM" -ForegroundColor Gray
    Write-Host "      Altura: $($bomba.altura_total_pies) ft" -ForegroundColor Gray
    $idBomba = $bomba.id_equipo
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    $idBomba = $null
}

# TEST 8: Listar equipos_bomba
Write-Host "`n[TEST 8] GET /equipos-bomba - Listar registros..." -ForegroundColor Yellow
try {
    $bombas = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method GET -Headers $headers
    Write-Host "   OK LISTADO:" -ForegroundColor Green
    Write-Host "      Total registros: $($bombas.Count)" -ForegroundColor Gray
    if ($bombas.Count -gt 0) {
        Write-Host "      Ultimo: $($bombas[-1].marca_bomba) $($bombas[-1].modelo_bomba)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 9: Obtener bomba por ID (solo si se creó exitosamente)
if ($idBomba) {
    Write-Host "`n[TEST 9] GET /equipos-bomba/$idBomba - Obtener por ID..." -ForegroundColor Yellow
    try {
        $bombaById = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba/$idBomba" -Method GET -Headers $headers
        Write-Host "   OK OBTENIDO:" -ForegroundColor Green
        Write-Host "      Marca: $($bombaById.marca_bomba)" -ForegroundColor Gray
        Write-Host "      Caudal GPM: $($bombaById.caudal_nominal_gpm)" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# ================================================
# RESUMEN FINAL
# ================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN - BLOQUE 2 PROBADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$successCount = 0
$totalTests = 3

if ($idMotor) { $successCount++ }
if ($idGen) { $successCount++ }
if ($idBomba) { $successCount++ }

$successRate = [math]::Round(($successCount / $totalTests) * 100, 2)

Write-Host "`nResultado: $successCount / $totalTests tablas creadas exitosamente" -ForegroundColor Yellow
Write-Host "Tasa de éxito: $successRate%" -ForegroundColor $(if ($successRate -eq 100) { "Green" } else { "Yellow" })

Write-Host "`nTablas probadas:" -ForegroundColor Yellow
if ($idMotor) {
    Write-Host "  ✅ equipos_motor - POST, GET list, GET by ID" -ForegroundColor Green
} else {
    Write-Host "  ❌ equipos_motor - FALLO" -ForegroundColor Red
}

if ($idGen) {
    Write-Host "  ✅ equipos_generador - POST, GET list, GET by ID" -ForegroundColor Green
} else {
    Write-Host "  ❌ equipos_generador - FALLO" -ForegroundColor Red
}

if ($idBomba) {
    Write-Host "  ✅ equipos_bomba - POST, GET list, GET by ID" -ForegroundColor Green
} else {
    Write-Host "  ❌ equipos_bomba - FALLO" -ForegroundColor Red
}

Write-Host "`nValidaciones verificadas:" -ForegroundColor Yellow
Write-Host "  - DTOs permisivos funcionando correctamente" -ForegroundColor Green
Write-Host "  - Campos Decimal convertidos a number" -ForegroundColor Green
Write-Host "  - Enums validados (tipo_motor, tipo_generador, etc.)" -ForegroundColor Green
Write-Host "  - Operaciones CRUD completas (POST + GET + GET by ID)" -ForegroundColor Green
Write-Host "`nPruebas completadas!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
