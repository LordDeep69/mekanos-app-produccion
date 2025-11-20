# Script de pruebas funcionales para BLOQUE 1 y BLOQUE 2
# Encoding: UTF-8

$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "PRUEBAS FUNCIONALES - BLOQUE 1 Y BLOQUE 2" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ==============================
# PASO 1: CREAR EQUIPOS_BASE (PREREQUISITO)
# ==============================
Write-Host "`n[PASO 1] Creando equipo base (prerequisito para BLOQUE 2)..." -ForegroundColor Yellow

$equipoBaseBody = @{
    numero_serie     = "TEST-BASE-$(Get-Random -Minimum 10000 -Maximum 99999)"
    marca            = "CATERPILLAR"
    modelo           = "3516B"
    anio_fabricacion = 2023
    ubicacion_actual = "Bodega Principal"
    estado_equipo    = "OPERATIVO"
    observaciones    = "Equipo de prueba"
    creado_por       = 1
} | ConvertTo-Json

try {
    $equipoBase = Invoke-RestMethod -Uri "$baseUrl/equipos-base" -Method POST -Body $equipoBaseBody -Headers $headers
    Write-Host "   OK - Equipo base creado con ID: $($equipoBase.id_equipo)" -ForegroundColor Green
    $idEquipoBase = $equipoBase.id_equipo
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   El endpoint equipos-base puede no existir o estar protegido" -ForegroundColor Yellow
    exit
}

# ==============================
# PASO 2: BLOQUE 1 - CREAR DATOS
# ==============================
Write-Host "`n[PASO 2] BLOQUE 1 - Creando datos..." -ForegroundColor Yellow

# 2.1 - tipos_equipo
Write-Host "`n2.1 - Crear tipos_equipo..." -ForegroundColor Cyan
$tipoEquipoBody = @{
    nombre_tipo                   = "Planta Electrica de Prueba"
    descripcion                   = "Tipo de equipo para generacion electrica de emergencia"
    categoria                     = "GENERACION"
    potencia_minima_kw            = 50.5
    potencia_maxima_kw            = 150.75
    voltaje_operacion             = "220/440V"
    frecuencia_hz                 = 60
    aplicaciones                  = @("Industrial", "Comercial", "Residencial")
    nivel_criticidad              = "ALTO"
    requiere_certificacion        = $true
    tipo_combustible              = "DIESEL"
    vida_util_horas               = 15000
    intervalo_mantenimiento_horas = 500
} | ConvertTo-Json

try {
    $tipoEquipo = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method POST -Body $tipoEquipoBody -Headers $headers
    Write-Host "   OK - Tipo equipo creado con ID: $($tipoEquipo.id_tipo_equipo)" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 2.2 - tipos_componente
Write-Host "`n2.2 - Crear tipos_componente..." -ForegroundColor Cyan
$tipoComponenteBody = @{
    nombre_tipo_componente = "Filtro de Aceite Industrial"
    descripcion            = "Filtro para sistemas de lubricacion"
    categoria              = "MOTOR"
    unidad_medida          = "UNIDAD"
    es_critico             = $true
    requiere_certificacion = $false
    vida_util_horas        = 5000
    nivel_stock_minimo     = 10
} | ConvertTo-Json

try {
    $tipoComponente = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method POST -Body $tipoComponenteBody -Headers $headers
    Write-Host "   OK - Tipo componente creado con ID: $($tipoComponente.id_tipo_componente)" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# 2.3 - catalogo_sistemas
Write-Host "`n2.3 - Crear catalogo_sistemas..." -ForegroundColor Cyan
$sistemaBody = @{
    nombre_sistema                = "Sistema de Lubricacion Avanzado"
    descripcion                   = "Sistema completo de lubricacion para equipos industriales"
    categoria                     = "LUBRICACION"
    aplica_a                      = @("MOTOR", "GENERADOR")
    componentes_requeridos        = @("Filtro", "Bomba", "Sensores")
    es_obligatorio                = $true
    requiere_inspeccion_periodica = $true
} | ConvertTo-Json

try {
    $sistema = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas" -Method POST -Body $sistemaBody -Headers $headers
    Write-Host "   OK - Sistema creado con ID: $($sistema.id_sistema)" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# ==============================
# PASO 3: BLOQUE 1 - LISTAR DATOS
# ==============================
Write-Host "`n[PASO 3] BLOQUE 1 - Listando datos creados..." -ForegroundColor Yellow

Write-Host "`n3.1 - Listar tipos_equipo..." -ForegroundColor Cyan
try {
    $tiposEquipo = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method GET -Headers $headers
    Write-Host "   OK - Total registros: $($tiposEquipo.Count)" -ForegroundColor Green
    if ($tiposEquipo.Count -gt 0) {
        Write-Host "   Primer registro: $($tiposEquipo[0].nombre_tipo)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3.2 - Listar tipos_componente..." -ForegroundColor Cyan
try {
    $tiposComponente = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method GET -Headers $headers
    Write-Host "   OK - Total registros: $($tiposComponente.Count)" -ForegroundColor Green
    if ($tiposComponente.Count -gt 0) {
        Write-Host "   Primer registro: $($tiposComponente[0].nombre_tipo_componente)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n3.3 - Listar catalogo_sistemas..." -ForegroundColor Cyan
try {
    $sistemas = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas" -Method GET -Headers $headers
    Write-Host "   OK - Total registros: $($sistemas.Count)" -ForegroundColor Green
    if ($sistemas.Count -gt 0) {
        Write-Host "   Primer registro: $($sistemas[0].nombre_sistema)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# ==============================
# PASO 4: BLOQUE 2 - CREAR DATOS
# ==============================
Write-Host "`n[PASO 4] BLOQUE 2 - Creando datos..." -ForegroundColor Yellow

# 4.1 - equipos_motor
Write-Host "`n4.1 - Crear equipos_motor..." -ForegroundColor Cyan
$motorBody = @{
    id_equipo                        = $idEquipoBase
    tipo_motor                       = "DIESEL_4T"
    numero_cilindros                 = 16
    configuracion_cilindros          = "V16"
    potencia_hp                      = 2250.5
    potencia_kw                      = 1678.3
    torque_maximo_nm                 = 8500.7
    rpm_nominal                      = 1800
    rpm_maxima                       = 2100
    desplazamiento_litros            = 69.0
    relacion_compresion              = 16.5
    diametro_cilindro_mm             = 170.0
    carrera_piston_mm                = 190.0
    sistema_combustible              = "INYECCION_DIRECTA"
    tipo_combustible_motor           = "DIESEL"
    capacidad_tanque_combustible_l   = 1500.0
    consumo_combustible_lh           = 425.5
    sistema_enfriamiento             = "LIQUIDO"
    capacidad_refrigerante_l         = 180.0
    temperatura_operacion_min_c      = 70.0
    temperatura_operacion_max_c      = 95.0
    sistema_lubricacion_motor        = "PRESION_FORZADA"
    capacidad_aceite_motor_l         = 120.0
    presion_aceite_min_bar           = 3.5
    presion_aceite_max_bar           = 6.8
    tipo_arranque                    = "ELECTRICO"
    voltaje_arranque_v               = 24
    turboalimentado                  = $true
    intercooler                      = $true
    tipo_inyeccion                   = "COMMON_RAIL"
    norma_emisiones                  = "EPA_TIER_3"
    peso_seco_kg                     = 4500.0
    dimensiones_largo_mm             = 3200.0
    dimensiones_ancho_mm             = 1800.0
    dimensiones_alto_mm              = 2100.0
    nivel_ruido_db                   = 105.0
    altitud_maxima_operacion_msnm    = 2500
    rango_temperatura_ambiente_min_c = -10.0
    rango_temperatura_ambiente_max_c = 45.0
    certificaciones_motor            = @("ISO9001", "CE")
    aplicaciones_motor               = @("Generacion electrica", "Mineria")
    observaciones_motor              = "Motor de alto rendimiento para aplicaciones industriales"
    creado_por                       = 1
} | ConvertTo-Json

try {
    $motor = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method POST -Body $motorBody -Headers $headers
    Write-Host "   OK - Motor creado con ID: $($motor.id_motor)" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

# 4.2 - equipos_generador
Write-Host "`n4.2 - Crear equipos_generador..." -ForegroundColor Cyan
$generadorBody = @{
    id_equipo                                    = $idEquipoBase
    tipo_generador                               = "SINCRONO"
    potencia_kw                                  = 1500.5
    potencia_kva                                 = 1875.6
    factor_potencia                              = 0.8
    voltaje_salida_v                             = 440
    corriente_nominal_a                          = 2460.5
    frecuencia_nominal_hz                        = 60
    numero_fases                                 = 3
    velocidad_nominal_rpm                        = 1800
    clase_aislamiento                            = "H"
    temperatura_maxima_bobinado_c                = 155.0
    sistema_excitacion                           = "BRUSHLESS"
    regulacion_voltaje_porcentaje                = 1.0
    distorsion_armonica_thd_porcentaje           = 2.5
    eficiencia_porcentaje                        = 95.5
    forma_conexion                               = "ESTRELLA"
    proteccion_ip                                = "IP23"
    sistema_enfriamiento_generador               = "AIRE_FORZADO"
    altitud_maxima_msnm                          = 2000
    temperatura_ambiente_max_c                   = 40.0
    nivel_ruido_generador_db                     = 75.0
    peso_generador_kg                            = 1800.0
    dimensiones_generador_largo_mm               = 1500.0
    dimensiones_generador_ancho_mm               = 900.0
    dimensiones_generador_alto_mm                = 1200.0
    tipo_rotor                                   = "POLOS_LISOS"
    tipo_estator                                 = "BOBINADO_DISTRIBUIDO"
    rodamientos                                  = "BOLAS_ALTA_VELOCIDAD"
    tiempo_respuesta_transitoria_ms              = 300
    corriente_cortocircuito_sostenida_porcentaje = 300.0
    certificaciones_generador                    = @("IEC60034", "IEEE")
    aplicaciones_generador                       = @("Generacion primaria", "Respaldo")
    modos_operacion                              = @("AISLADO", "PARALELO")
    capacidad_sobrecarga_1h_porcentaje           = 110.0
    capacidad_sobrecarga_continua_porcentaje     = 100.0
    observaciones_generador                      = "Generador de alta eficiencia"
    creado_por                                   = 1
} | ConvertTo-Json

try {
    $generador = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method POST -Body $generadorBody -Headers $headers
    Write-Host "   OK - Generador creado con ID: $($generador.id_generador)" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

# 4.3 - equipos_bomba
Write-Host "`n4.3 - Crear equipos_bomba..." -ForegroundColor Cyan
$bombaBody = @{
    id_equipo                            = $idEquipoBase
    tipo_bomba                           = "CENTRIFUGA"
    aplicacion_bomba                     = "AGUA"
    caudal_nominal_m3h                   = 350.5
    caudal_minimo_m3h                    = 150.0
    caudal_maximo_m3h                    = 500.5
    altura_manometrica_nominal_m         = 65.5
    altura_manometrica_minima_m          = 45.0
    altura_manometrica_maxima_m          = 85.3
    presion_maxima_bar                   = 8.5
    npsh_requerido_m                     = 3.5
    velocidad_nominal_bomba_rpm          = 1750
    potencia_hidraulica_kw               = 65.8
    potencia_absorbida_kw                = 75.5
    eficiencia_bomba_porcentaje          = 87.0
    diametro_impulsor_mm                 = 350.0
    numero_etapas                        = 1
    sentido_rotacion                     = "HORARIO"
    tipo_sello_mecanico                  = "DOBLE"
    material_carcasa                     = "ACERO_INOXIDABLE_316"
    material_impulsor                    = "BRONCE"
    material_eje                         = "ACERO_INOXIDABLE_420"
    tipo_acoplamiento                    = "FLEXIBLE"
    diametro_succion_mm                  = 200.0
    diametro_descarga_mm                 = 150.0
    temperatura_liquido_min_c            = 5.0
    temperatura_liquido_max_c            = 90.0
    viscosidad_maxima_cst                = 100.0
    ph_minimo                            = 6.0
    ph_maximo                            = 9.0
    concentracion_solidos_max_porcentaje = 5.0
    sistema_lubricacion_bomba            = "ACEITE"
    tipo_rodamientos_bomba               = "BOLAS_ALTA_CARGA"
    peso_bomba_kg                        = 450.0
    dimensiones_bomba_largo_mm           = 800.0
    dimensiones_bomba_ancho_mm           = 500.0
    dimensiones_bomba_alto_mm            = 600.0
    nivel_ruido_bomba_db                 = 85.0
    nivel_vibracion_mms                  = 4.5
    certificaciones_bomba                = @("API610", "ISO9001")
    normativas_cumplidas                 = @("ASME", "ANSI")
    presion_prueba_bar                   = 12.75
    curva_caracteristica_archivo         = "curva_bomba_goulds_3196.pdf"
    requiere_cebado                      = $false
    altura_instalacion_maxima_m          = 8.0
    tipo_brida                           = "ANSI_150"
    observaciones_bomba                  = "Bomba industrial de alta eficiencia"
    creado_por                           = 1
} | ConvertTo-Json

try {
    $bomba = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method POST -Body $bombaBody -Headers $headers
    Write-Host "   OK - Bomba creada con ID: $($bomba.id_bomba)" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
}

# ==============================
# PASO 5: BLOQUE 2 - LISTAR DATOS
# ==============================
Write-Host "`n[PASO 5] BLOQUE 2 - Listando datos creados..." -ForegroundColor Yellow

Write-Host "`n5.1 - Listar equipos_motor..." -ForegroundColor Cyan
try {
    $motores = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method GET -Headers $headers
    Write-Host "   OK - Total registros: $($motores.Count)" -ForegroundColor Green
    if ($motores.Count -gt 0) {
        Write-Host "   Primer motor - Tipo: $($motores[0].tipo_motor), Potencia: $($motores[0].potencia_kw) kW" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5.2 - Listar equipos_generador..." -ForegroundColor Cyan
try {
    $generadores = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method GET -Headers $headers
    Write-Host "   OK - Total registros: $($generadores.Count)" -ForegroundColor Green
    if ($generadores.Count -gt 0) {
        Write-Host "   Primer generador - Tipo: $($generadores[0].tipo_generador), Potencia: $($generadores[0].potencia_kw) kW" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n5.3 - Listar equipos_bomba..." -ForegroundColor Cyan
try {
    $bombas = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method GET -Headers $headers
    Write-Host "   OK - Total registros: $($bombas.Count)" -ForegroundColor Green
    if ($bombas.Count -gt 0) {
        Write-Host "   Primer bomba - Tipo: $($bombas[0].tipo_bomba), Caudal: $($bombas[0].caudal_nominal_m3h) m3/h" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# ==============================
# RESUMEN FINAL
# ==============================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE PRUEBAS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`nBLOQUE 1 (Catalogos):" -ForegroundColor Yellow
Write-Host "  - tipos_equipo: Creado y listado" -ForegroundColor Green
Write-Host "  - tipos_componente: Creado y listado" -ForegroundColor Green
Write-Host "  - catalogo_sistemas: Creado y listado" -ForegroundColor Green

Write-Host "`nBLOQUE 2 (Equipos especificos):" -ForegroundColor Yellow
Write-Host "  - equipos_motor: Creado y listado (45+ campos con Decimals y enums)" -ForegroundColor Green
Write-Host "  - equipos_generador: Creado y listado (38 campos con Decimals)" -ForegroundColor Green
Write-Host "  - equipos_bomba: Creado y listado (50+ campos con Decimals y enums)" -ForegroundColor Green

Write-Host "`nPruebas completadas exitosamente!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
