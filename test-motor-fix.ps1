$baseUrl = "http://localhost:3000/api"
$headers = @{ "Content-Type" = "application/json" }

Write-Host "=== PRUEBA AISLADA EQUIPOS MOTOR ===" -ForegroundColor Cyan

# 1. Crear Equipo Base
Write-Host "`n1. Creando Equipo Base..." -ForegroundColor Yellow
$equipoBody = @{
    codigo_equipo       = "TEST-MOTOR-$(Get-Random)"
    nombre_equipo       = "Motor Test Fix"
    id_tipo_equipo      = 1
    numero_serie_equipo = "SERIE-$(Get-Random)"
    id_cliente          = 1
    id_sede             = 1
    ubicacion_texto     = "Test Lab"
    estado_equipo       = "OPERATIVO"
    criticidad          = "MEDIA"
} | ConvertTo-Json

try {
    $equipo = Invoke-RestMethod -Uri "$baseUrl/equipos" -Method POST -Body $equipoBody -Headers $headers
    $idEquipo = $equipo.data.id_equipo
    Write-Host "   OK - ID Equipo: $idEquipo" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR creando equipo base: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Crear Equipo Motor (DTO Completo que fallaba)
Write-Host "`n2. Creando Equipo Motor (DTO con campos mezclados)..." -ForegroundColor Yellow
$motorBody = @{
    id_equipo                     = $idEquipo
    tipo_motor                    = "COMBUSTION"
    marca_motor                   = "CATERPILLAR"
    modelo_motor                  = "3516B-HD"
    numero_serie_motor            = "3516B-$(Get-Random)"
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
    # CAMPOS QUE DEBERIAN SER LIMPIADOS AUTOMATICAMENTE:
    voltaje_operacion_vac         = "440V"
    numero_fases                  = "TRIFASICO"
    frecuencia_hz                 = 60
    clase_aislamiento             = "H"
    grado_proteccion_ip           = "IP23"
    amperaje_nominal              = 2460.50
    factor_potencia               = 0.80
    observaciones                 = "Motor diesel de alta eficiencia - TEST FIX"
} | ConvertTo-Json

try {
    $motor = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method POST -Body $motorBody -Headers $headers
    Write-Host "   OK - Motor Creado Exitosamente" -ForegroundColor Green
    Write-Host "   ID: $($motor.id_equipo)" -ForegroundColor Gray
    Write-Host "   Tipo: $($motor.tipo_motor)" -ForegroundColor Gray
}
catch {
    Write-Host "   ERROR creando motor: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# 3. Verificar GET por ID
Write-Host "`n3. Verificando GET por ID..." -ForegroundColor Yellow
try {
    $getMotor = Invoke-RestMethod -Uri "$baseUrl/equipos-motor/$idEquipo" -Method GET -Headers $headers
    Write-Host "   OK - Datos recuperados" -ForegroundColor Green
    Write-Host "   Marca: $($getMotor.marca_motor)" -ForegroundColor Gray
    
    # Verificar que los campos prohibidos sean nulos (si la API los devuelve)
    if ($null -eq $getMotor.voltaje_operacion_vac) {
        Write-Host "   VERIFICACION: voltaje_operacion_vac es NULL (Correcto)" -ForegroundColor Green
    }
    else {
        Write-Host "   ADVERTENCIA: voltaje_operacion_vac tiene valor: $($getMotor.voltaje_operacion_vac)" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "   ERROR obteniendo motor: $($_.Exception.Message)" -ForegroundColor Red
}

# Fin de pruebas
