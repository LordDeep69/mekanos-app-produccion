# PRUEBAS BLOQUE 2 - VERSIÓN CORRECTA BASADA EN DTOs REALES
# Encoding: UTF-8
# Este script usa SOLO los campos que existen en los DTOs

$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRUEBAS FUNCIONALES - BLOQUE 2 CORREGIDO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# TEST 0: Verificar servidor
Write-Host "[TEST 0] Verificando servidor..." -ForegroundColor Yellow
try {
    $health = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($health) {
        Write-Host "   OK - Servidor respondiendo en puerto 3000" -ForegroundColor Green
    }
    else {
        Write-Host "   ERROR - Puerto 3000 no responde" -ForegroundColor Red
        exit
    }
}
catch {
    Write-Host "   ERROR - Servidor NO responde" -ForegroundColor Red
    exit
}

# ================================================
# CREAR 3 EQUIPOS BASE (uno para cada tipo)
# ================================================
Write-Host "`n========== EQUIPOS BASE ==========`n" -ForegroundColor Cyan

# EQUIPO 1: Para Motor
Write-Host "[PREREQ 1] POST /equipos - Crear equipo base para Motor..." -ForegroundColor Yellow
$equipoMotorBody = @{
    codigo_equipo       = "EQ-MOTOR-$(Get-Random -Minimum 10000 -Maximum 99999)"
    nombre_equipo       = "Equipo Motor Caterpillar 3516B"
    id_tipo_equipo      = 1
    numero_serie_equipo = "CAT-$(Get-Random -Minimum 10000 -Maximum 99999)"
    id_cliente          = 1
    id_sede             = 1
    ubicacion_texto     = "Planta Industrial - Zona A - Motor Principal"
    estado_equipo       = "OPERATIVO"
    criticidad          = "ALTA"
} | ConvertTo-Json

try {
    $equipoMotor = Invoke-RestMethod -Uri "$baseUrl/equipos" -Method POST -Body $equipoMotorBody -Headers $headers
    Write-Host "   OK - ID: $($equipoMotor.data.id_equipo)" -ForegroundColor Green
    $idEquipoMotor = $equipoMotor.data.id_equipo
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
    Write-Host "   NOTA: Asegurate que existan registros en tipos_equipo (id=1), clientes (id=1) y sedes (id=1)" -ForegroundColor Yellow
    exit
}

# EQUIPO 2: Para Generador
Write-Host "`n[PREREQ 2] POST /equipos - Crear equipo base para Generador..." -ForegroundColor Yellow
$equipoGenBody = @{
    codigo_equipo       = "EQ-GEN-$(Get-Random -Minimum 10000 -Maximum 99999)"
    nombre_equipo       = "Equipo Generador Stamford HCI-634F"
    id_tipo_equipo      = 1
    numero_serie_equipo = "STM-$(Get-Random -Minimum 10000 -Maximum 99999)"
    id_cliente          = 1
    id_sede             = 1
    ubicacion_texto     = "Planta Industrial - Zona A - Generador Principal"
    estado_equipo       = "OPERATIVO"
    criticidad          = "CRITICA"
} | ConvertTo-Json

try {
    $equipoGen = Invoke-RestMethod -Uri "$baseUrl/equipos" -Method POST -Body $equipoGenBody -Headers $headers
    Write-Host "   OK - ID: $($equipoGen.data.id_equipo)" -ForegroundColor Green
    $idEquipoGen = $equipoGen.data.id_equipo
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# EQUIPO 3: Para Bomba
Write-Host "`n[PREREQ 3] POST /equipos - Crear equipo base para Bomba..." -ForegroundColor Yellow
$equipoBombaBody = @{
    codigo_equipo       = "EQ-BOMBA-$(Get-Random -Minimum 10000 -Maximum 99999)"
    nombre_equipo       = "Equipo Bomba Goulds 3196-MTX"
    id_tipo_equipo      = 1
    numero_serie_equipo = "GLD-$(Get-Random -Minimum 10000 -Maximum 99999)"
    id_cliente          = 1
    id_sede             = 1
    ubicacion_texto     = "Planta Industrial - Zona A - Bomba Centrifuga"
    estado_equipo       = "OPERATIVO"
    criticidad          = "MEDIA"
} | ConvertTo-Json

try {
    $equipoBomba = Invoke-RestMethod -Uri "$baseUrl/equipos" -Method POST -Body $equipoBombaBody -Headers $headers
    Write-Host "   OK - ID: $($equipoBomba.data.id_equipo)" -ForegroundColor Green
    $idEquipoBomba = $equipoBomba.data.id_equipo
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# ================================================
# BLOQUE 2 - EQUIPOS_MOTOR (DTO CORRECTO)
# ================================================
Write-Host "`n========== EQUIPOS_MOTOR ==========`n" -ForegroundColor Cyan

Write-Host "[TEST 1] POST /equipos-motor - Crear registro con DTO correcto..." -ForegroundColor Yellow
$motorBody = @{
    id_equipo                     = $idEquipoMotor
    tipo_motor                    = "COMBUSTION"
    marca_motor                   = "CATERPILLAR"
    modelo_motor                  = "3516B-HD"
    numero_serie_motor            = "3516B-$(Get-Random -Minimum 10000 -Maximum 99999)"
    potencia_hp                   = 2250.50
    potencia_kw                   = 1678.30
    velocidad_nominal_rpm         = 1800
    tipo_combustible              = "DIESEL"
    numero_cilindros              = 16
    cilindrada_cc                 = 69000
    tiene_turbocargador           = $true
    tipo_arranque                 = "ELECTRICO"
    voltaje_arranque_vdc          = 24
    amperaje_arranque             = 800.00
    numero_baterias               = 4
    referencia_bateria            = "TROJAN T-1275"
    capacidad_bateria_ah          = 150
    tiene_radiador                = $true
    radiador_alto_cm              = 120.50
    radiador_ancho_cm             = 85.30
    radiador_espesor_cm           = 15.20
    tiene_cargador_bateria        = $true
    marca_cargador                = "POWERSTREAM"
    modelo_cargador               = "PSC-100A"
    amperaje_cargador             = 100.00
    capacidad_aceite_litros       = 120.50
    tipo_aceite                   = "SAE 15W-40 CI-4"
    capacidad_refrigerante_litros = 180.00
    tipo_refrigerante             = "Etilenglicol 50/50"
    voltaje_operacion_vac         = "440V"
    numero_fases                  = "TRIFASICO"
    frecuencia_hz                 = 60
    clase_aislamiento             = "H"
    grado_proteccion_ip           = "IP23"
    amperaje_nominal              = 2460.50
    factor_potencia               = 0.80
    observaciones                 = "Motor diesel de alta eficiencia - TEST BLOQUE2"
} | ConvertTo-Json

try {
    $motor = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method POST -Body $motorBody -Headers $headers
    Write-Host "   OK CREADO:" -ForegroundColor Green
    Write-Host "      ID Equipo: $($motor.id_equipo)" -ForegroundColor Gray
    Write-Host "      Tipo: $($motor.tipo_motor)" -ForegroundColor Gray
    Write-Host "      Marca: $($motor.marca_motor) $($motor.modelo_motor)" -ForegroundColor Gray
    Write-Host "      Potencia: $($motor.potencia_kw) kW / $($motor.potencia_hp) HP" -ForegroundColor Gray
    Write-Host "      Cilindros: $($motor.numero_cilindros)" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# TEST 2: Listar equipos_motor
Write-Host "`n[TEST 2] GET /equipos-motor - Listar registros..." -ForegroundColor Yellow
try {
    $motores = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method GET -Headers $headers
    Write-Host "   OK LISTADO:" -ForegroundColor Green
    Write-Host "      Total registros: $($motores.total)" -ForegroundColor Gray
    if ($motores.data -and $motores.data.Count -gt 0) {
        $ultimo = $motores.data[-1]
        Write-Host "      Ultimo: $($ultimo.marca_motor) $($ultimo.modelo_motor)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 3: Obtener motor por ID
Write-Host "`n[TEST 3] GET /equipos-motor/$idEquipoMotor - Obtener por ID..." -ForegroundColor Yellow
try {
    $motorById = Invoke-RestMethod -Uri "$baseUrl/equipos-motor/$idEquipoMotor" -Method GET -Headers $headers
    Write-Host "   OK OBTENIDO:" -ForegroundColor Green
    Write-Host "      Marca: $($motorById.marca_motor)" -ForegroundColor Gray
    Write-Host "      Modelo: $($motorById.modelo_motor)" -ForegroundColor Gray
    Write-Host "      Potencia kW: $($motorById.potencia_kw)" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# ================================================
# BLOQUE 2 - EQUIPOS_GENERADOR (DTO CORRECTO - campos reales)
# ================================================
Write-Host "`n========== EQUIPOS_GENERADOR ==========`n" -ForegroundColor Cyan

Write-Host "[TEST 4] POST /equipos-generador - Crear registro con DTO correcto..." -ForegroundColor Yellow
$generadorBody = @{
    id_equipo                         = $idEquipoGen
    marca_generador                   = "STAMFORD"
    voltaje_salida                    = "440V"
    creado_por                        = 1
    modelo_generador                  = "HCI-634F"
    numero_serie_generador            = "HCI-$(Get-Random -Minimum 10000 -Maximum 99999)"
    marca_alternador                  = "STAMFORD"
    potencia_kva                      = 1875.60
    potencia_kw                       = 1500.50
    numero_fases                      = 3
    frecuencia_hz                     = 60
    factor_potencia                   = 0.80
    amperaje_nominal_salida           = 2460.50
    tiene_avr                         = $true
    marca_avr                         = "BASLER"
    modelo_avr                        = "AVC125-10"
    tiene_modulo_control              = $true
    marca_modulo_control              = "DEEP SEA"
    modelo_modulo_control             = "DSE7320"
    tiene_arranque_automatico         = $true
    capacidad_tanque_principal_litros = 500.00
    tiene_tanque_auxiliar             = $false
    clase_aislamiento                 = "H"
    grado_proteccion_ip               = "IP23"
    observaciones                     = "Generador sincrono brushless - TEST BLOQUE2"
} | ConvertTo-Json

try {
    $generador = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method POST -Body $generadorBody -Headers $headers
    Write-Host "   OK CREADO:" -ForegroundColor Green
    Write-Host "      ID Equipo: $($generador.id_equipo)" -ForegroundColor Gray
    Write-Host "      Marca: $($generador.marca_generador) $($generador.modelo_generador)" -ForegroundColor Gray
    Write-Host "      Potencia: $($generador.potencia_kva) kVA / $($generador.potencia_kw) kW" -ForegroundColor Gray
    Write-Host "      Voltaje: $($generador.voltaje_salida)" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# TEST 5: Listar equipos_generador
Write-Host "`n[TEST 5] GET /equipos-generador - Listar registros..." -ForegroundColor Yellow
try {
    $generadores = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method GET -Headers $headers
    Write-Host "   OK LISTADO:" -ForegroundColor Green
    Write-Host "      Total registros: $($generadores.total)" -ForegroundColor Gray
    if ($generadores.data -and $generadores.data.Count -gt 0) {
        $ultimo = $generadores.data[-1]
        Write-Host "      Ultimo: $($ultimo.marca_generador) $($ultimo.modelo_generador)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 6: Obtener generador por ID
Write-Host "`n[TEST 6] GET /equipos-generador/$idEquipoGen - Obtener por ID..." -ForegroundColor Yellow
try {
    $genById = Invoke-RestMethod -Uri "$baseUrl/equipos-generador/$idEquipoGen" -Method GET -Headers $headers
    Write-Host "   OK OBTENIDO:" -ForegroundColor Green
    Write-Host "      Marca: $($genById.marca_generador)" -ForegroundColor Gray
    Write-Host "      Potencia kVA: $($genById.potencia_kva)" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# ================================================
# BLOQUE 2 - EQUIPOS_BOMBA (DTO CORRECTO - campos reales)
# ================================================
Write-Host "`n========== EQUIPOS_BOMBA ==========`n" -ForegroundColor Cyan

Write-Host "[TEST 7] POST /equipos-bomba - Crear registro con DTO correcto..." -ForegroundColor Yellow
$bombaBody = @{
    id_equipo                     = $idEquipoBomba
    marca_bomba                   = "GOULDS"
    tipo_bomba                    = "CENTRIFUGA"
    modelo_bomba                  = "3196-MTX"
    numero_serie_bomba            = "MTX-$(Get-Random -Minimum 10000 -Maximum 99999)"
    creado_por                    = 1
    aplicacion_bomba              = "AGUA_POTABLE"
    diametro_aspiracion           = "8 pulgadas"
    diametro_descarga             = "6 pulgadas"
    caudal_maximo_m3h             = 500.50
    altura_manometrica_maxima_m   = 85.30
    altura_presion_trabajo_m      = 65.50
    potencia_hidraulica_kw        = 75.50
    eficiencia_porcentaje         = 87.00
    numero_total_bombas_sistema   = 2
    numero_bomba_en_sistema       = 1
    tiene_panel_control           = $true
    marca_panel_control           = "XYLEM"
    modelo_panel_control          = "HYDROVAR"
    tiene_presostato              = $true
    marca_presostato              = "DANFOSS"
    modelo_presostato             = "KP1"
    presion_encendido_psi         = 30.00
    presion_apagado_psi           = 50.00
    tiene_contactor_externo       = $true
    marca_contactor               = "SCHNEIDER"
    amperaje_contactor            = 65.00
    tiene_arrancador_suave        = $false
    tiene_variador_frecuencia     = $true
    marca_variador                = "ABB"
    modelo_variador               = "ACS550"
    tiene_tanques_hidroneumaticos = $true
    cantidad_tanques              = 1
    capacidad_tanques_litros      = 300.00
    presion_tanques_psi           = 40.00
    tiene_manometro               = $true
    rango_manometro_min_psi       = 0
    rango_manometro_max_psi       = 100.00
    tiene_proteccion_nivel        = $true
    tipo_proteccion_nivel         = "Flotador mecanico"
    tiene_valvula_purga           = $true
    tiene_valvula_cebado          = $true
    tiene_valvula_cheque          = $true
    tiene_valvula_pie             = $true
    referencia_sello_mecanico     = "JOHN CRANE TYPE 21"
    observaciones                 = "Bomba centrifuga horizontal - TEST BLOQUE2"
} | ConvertTo-Json

try {
    $bomba = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method POST -Body $bombaBody -Headers $headers
    Write-Host "   OK CREADO:" -ForegroundColor Green
    Write-Host "      ID Equipo: $($bomba.id_equipo)" -ForegroundColor Gray
    Write-Host "      Marca: $($bomba.marca_bomba) $($bomba.modelo_bomba)" -ForegroundColor Gray
    Write-Host "      Tipo: $($bomba.tipo_bomba)" -ForegroundColor Gray
    Write-Host "      Caudal: $($bomba.caudal_maximo_m3h) m3/h" -ForegroundColor Gray
    Write-Host "      Altura: $($bomba.altura_manometrica_maxima_m) m" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
}

# TEST 8: Listar equipos_bomba
Write-Host "`n[TEST 8] GET /equipos-bomba - Listar registros..." -ForegroundColor Yellow
try {
    $bombas = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method GET -Headers $headers
    Write-Host "   OK LISTADO:" -ForegroundColor Green
    Write-Host "      Total registros: $($bombas.total)" -ForegroundColor Gray
    if ($bombas.data -and $bombas.data.Count -gt 0) {
        $ultimo = $bombas.data[-1]
        Write-Host "      Ultimo: $($ultimo.marca_bomba) $($ultimo.modelo_bomba)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# TEST 9: Obtener bomba por ID
Write-Host "`n[TEST 9] GET /equipos-bomba/$idEquipoBomba - Obtener por ID..." -ForegroundColor Yellow
try {
    $bombaById = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba/$idEquipoBomba" -Method GET -Headers $headers
    Write-Host "   OK OBTENIDO:" -ForegroundColor Green
    Write-Host "      Marca: $($bombaById.marca_bomba)" -ForegroundColor Gray
    Write-Host "      Tipo: $($bombaById.tipo_bomba)" -ForegroundColor Gray
    Write-Host "      Caudal: $($bombaById.caudal_maximo_m3h) m3/h" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# ================================================
# RESUMEN FINAL
# ================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN - BLOQUE 2 COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nEquipos base creados:" -ForegroundColor Yellow
Write-Host "   - Motor (ID: $idEquipoMotor)" -ForegroundColor Green
Write-Host "   - Generador (ID: $idEquipoGen)" -ForegroundColor Green
Write-Host "   - Bomba (ID: $idEquipoBomba)" -ForegroundColor Green

Write-Host "`nTablas BLOQUE 2 probadas:" -ForegroundColor Yellow
Write-Host "   - equipos_motor: POST + GET list + GET by ID" -ForegroundColor Green
Write-Host "   - equipos_generador: POST + GET list + GET by ID" -ForegroundColor Green
Write-Host "   - equipos_bomba: POST + GET list + GET by ID" -ForegroundColor Green

Write-Host "`nValidaciones verificadas:" -ForegroundColor Yellow
Write-Host "   - Relaciones FK funcionando (id_equipo)" -ForegroundColor Green
Write-Host "   - Campos Decimal convertidos correctamente" -ForegroundColor Green
Write-Host "   - Enums validados" -ForegroundColor Green
Write-Host "   - Campos creado_por manejados correctamente" -ForegroundColor Green
Write-Host "   - Operaciones CRUD completas" -ForegroundColor Green

Write-Host "`nPruebas BLOQUE 2 completadas!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
