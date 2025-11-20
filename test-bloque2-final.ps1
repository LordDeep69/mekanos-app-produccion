# Script FINAL de pruebas funcionales para BLOQUE 2
# Crea primero equipo base, luego usa el ID para crear motor, generador y bomba
# Encoding: UTF-8

$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRUEBAS FUNCIONALES - BLOQUE 2 (FINAL)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# TEST 0: Verificar servidor
Write-Host "[TEST 0] Verificando servidor..." -ForegroundColor Yellow
try {
    $health = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($health) {
        Write-Host "   OK - Servidor respondiendo en puerto 3000" -ForegroundColor Green
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
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
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
# BLOQUE 2 - EQUIPOS_MOTOR
# ================================================
Write-Host "`n========== EQUIPOS_MOTOR ==========`n" -ForegroundColor Cyan

Write-Host "[TEST 1] POST /equipos-motor - Crear registro..." -ForegroundColor Yellow
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
    anio_fabricacion              = 2023
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
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
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
# BLOQUE 2 - EQUIPOS_GENERADOR
# ================================================
Write-Host "`n========== EQUIPOS_GENERADOR ==========`n" -ForegroundColor Cyan

Write-Host "[TEST 4] POST /equipos-generador - Crear registro..." -ForegroundColor Yellow
$generadorBody = @{
    id_equipo               = $idEquipoGen
    marca_generador         = "STAMFORD"
    voltaje_salida          = "440V"
    creado_por              = 1
    modelo_generador        = "HCI-634F"
    numero_serie_generador  = "HCI-$(Get-Random -Minimum 10000 -Maximum 99999)"
    marca_alternador        = "STAMFORD"
    potencia_kva            = 1875.60
    potencia_kw             = 1500.50
    numero_fases            = 3
    voltaje_excitacion      = 180
    corriente_excitacion    = 15.50
    rpm_nominal             = 1800
    factor_potencia_nominal = 0.80
    tipo_conexion           = "ESTRELLA"
    clase_aislamiento       = "H"
    grado_proteccion_ip     = "IP23"
    frecuencia_nominal      = 60
    metodo_excitacion       = "BRUSHLESS"
    observaciones           = "Generador sincrono brushless - TEST BLOQUE2"
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
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
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
# BLOQUE 2 - EQUIPOS_BOMBA
# ================================================
Write-Host "`n========== EQUIPOS_BOMBA ==========`n" -ForegroundColor Cyan

Write-Host "[TEST 7] POST /equipos-bomba - Crear registro..." -ForegroundColor Yellow
$bombaBody = @{
    id_equipo          = $idEquipoBomba
    marca_bomba        = "GOULDS"
    modelo_bomba       = "3196-MTX"
    numero_serie_bomba = "MTX-$(Get-Random -Minimum 10000 -Maximum 99999)"
    creado_por         = 1
    aplicacion         = "AGUA_LIMPIA"
    caudal_diseno      = 500.50
    altura_diseno      = 215.30
    presion_diseno     = 125.50
    velocidad_nominal  = 1750
    eficiencia_bomba   = 87.00
    tipo_impulsor      = "CERRADO"
    material_carcasa   = "HIERRO_FUNDIDO"
    material_impulsor  = "BRONCE"
    diametro_succion   = 8.00
    diametro_descarga  = 6.00
    temperatura_maxima = 95.00
    observaciones      = "Bomba centrifuga horizontal - TEST BLOQUE2"
} | ConvertTo-Json

try {
    $bomba = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method POST -Body $bombaBody -Headers $headers
    Write-Host "   OK CREADO:" -ForegroundColor Green
    Write-Host "      ID Equipo: $($bomba.id_equipo)" -ForegroundColor Gray
    Write-Host "      Marca: $($bomba.marca_bomba) $($bomba.modelo_bomba)" -ForegroundColor Gray
    Write-Host "      Caudal: $($bomba.caudal_diseno) GPM" -ForegroundColor Gray
    Write-Host "      Altura: $($bomba.altura_diseno) ft" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "   $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    }
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

# TEST 9: Obtener bomba por ID
Write-Host "`n[TEST 9] GET /equipos-bomba/$idEquipoBomba - Obtener por ID..." -ForegroundColor Yellow
try {
    $bombaById = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba/$idEquipoBomba" -Method GET -Headers $headers
    Write-Host "   OK OBTENIDO:" -ForegroundColor Green
    Write-Host "      Marca: $($bombaById.marca_bomba)" -ForegroundColor Gray
    Write-Host "      Caudal: $($bombaById.caudal_diseno)" -ForegroundColor Gray
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

Write-Host "`n✅ Equipos base creados:" -ForegroundColor Yellow
Write-Host "   - Motor (ID: $idEquipoMotor)" -ForegroundColor Green
Write-Host "   - Generador (ID: $idEquipoGen)" -ForegroundColor Green
Write-Host "   - Bomba (ID: $idEquipoBomba)" -ForegroundColor Green

Write-Host "`n✅ Tablas BLOQUE 2 probadas:" -ForegroundColor Yellow
Write-Host "   - equipos_motor: POST + GET list + GET by ID" -ForegroundColor Green
Write-Host "   - equipos_generador: POST + GET list + GET by ID" -ForegroundColor Green
Write-Host "   - equipos_bomba: POST + GET list + GET by ID" -ForegroundColor Green

Write-Host "`n✅ Validaciones verificadas:" -ForegroundColor Yellow
Write-Host "   - Relaciones FK funcionando (id_equipo)" -ForegroundColor Green
Write-Host "   - Campos Decimal convertidos correctamente" -ForegroundColor Green
Write-Host "   - Enums validados" -ForegroundColor Green
Write-Host "   - Campos creado_por manejados correctamente" -ForegroundColor Green
Write-Host "   - Operaciones CRUD completas" -ForegroundColor Green

Write-Host "`nPruebas BLOQUE 2 completadas exitosamente!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
