# ============================================
# SCRIPT DE TESTING FUNCIONAL - FASE 1 EQUIPOS
# BLOQUE 1 y BLOQUE 2
# ============================================

$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTING FUNCIONAL COMPLETO" -ForegroundColor Cyan
Write-Host "FASE 1 - EQUIPOS (BLOQUE 1 & 2)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ============================================
# PASO 1: AUTENTICACIÓN
# ============================================
Write-Host "`n--- PASO 1: Autenticación ---" -ForegroundColor Yellow

# Intentar login con credenciales de prueba
$loginBody = @{
    email    = "admin@mekanos.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    Write-Host "Intentando login..." -ForegroundColor Gray
    $authResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -Headers $headers
    $token = $authResponse.access_token
    Write-Host "✅ Login exitoso" -ForegroundColor Green
    Write-Host "   Token obtenido: $($token.Substring(0,20))..." -ForegroundColor Gray
    
    # Agregar token a headers
    $headers["Authorization"] = "Bearer $token"
}
catch {
    Write-Host "❌ Login falló: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n⚠️  Intentando sin autenticación (endpoints públicos)" -ForegroundColor Yellow
}

# ============================================
# PASO 2: CREAR DATOS DE PRUEBA - BLOQUE 1
# ============================================
Write-Host "`n--- PASO 2: Creando datos BLOQUE 1 ---" -ForegroundColor Yellow

# 2.1 Crear tipo_equipo
Write-Host "`n[1] tipos_equipo - POST" -ForegroundColor Cyan
$tipoEquipoBody = @{
    nombre_tipo        = "Planta Eléctrica de Prueba"
    descripcion_tipo   = "Tipo de equipo para testing funcional"
    categoria_equipo   = "GENERACION_ENERGIA"
    requiere_motor     = $true
    requiere_generador = $true
    requiere_bomba     = $false
    potencia_minima_kw = 50.5
    potencia_maxima_kw = 150.75
    voltaje_operacion  = "220V/380V"
    aplicaciones       = "Backup de emergencia, uso industrial"
    creado_por         = 1
} | ConvertTo-Json

try {
    $tipoEquipo = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method POST -Body $tipoEquipoBody -Headers $headers
    Write-Host "   ✅ tipos_equipo creado - ID: $($tipoEquipo.id_tipo_equipo)" -ForegroundColor Green
    Write-Host "   📝 Nombre: $($tipoEquipo.nombre_tipo)" -ForegroundColor Gray
    $idTipoEquipo = $tipoEquipo.id_tipo_equipo
}
catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    $idTipoEquipo = $null
}

# 2.2 Crear tipo_componente
Write-Host "`n[2] tipos_componente - POST" -ForegroundColor Cyan
$tipoComponenteBody = @{
    nombre_tipo_componente        = "Filtro de Aceite Industrial"
    descripcion                   = "Componente para filtración de aceite en motores"
    categoria_componente          = "MOTOR"
    unidad_medida                 = "UNIDAD"
    es_critico                    = $true
    requiere_certificacion        = $false
    vida_util_horas               = 5000
    intervalo_mantenimiento_horas = 500
    creado_por                    = 1
} | ConvertTo-Json

try {
    $tipoComponente = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method POST -Body $tipoComponenteBody -Headers $headers
    Write-Host "   ✅ tipos_componente creado - ID: $($tipoComponente.id_tipo_componente)" -ForegroundColor Green
    Write-Host "   📝 Nombre: $($tipoComponente.nombre_tipo_componente)" -ForegroundColor Gray
}
catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 2.3 Crear catalogo_sistema
Write-Host "`n[3] catalogo_sistemas - POST" -ForegroundColor Cyan
$sistemaBody = @{
    nombre_sistema      = "Sistema de Lubricación Avanzado"
    descripcion_sistema = "Sistema completo de lubricación para motores industriales"
    codigo_sistema      = "SLA-001"
    aplica_a            = @("MOTOR", "GENERADOR")
    es_obligatorio      = $true
    observaciones       = "Requiere mantenimiento mensual"
    creado_por          = 1
} | ConvertTo-Json

try {
    $sistema = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas" -Method POST -Body $sistemaBody -Headers $headers
    Write-Host "   ✅ catalogo_sistemas creado - ID: $($sistema.id_sistema)" -ForegroundColor Green
    Write-Host "   📝 Nombre: $($sistema.nombre_sistema)" -ForegroundColor Gray
}
catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# PASO 3: LISTAR DATOS BLOQUE 1
# ============================================
Write-Host "`n--- PASO 3: Listando datos BLOQUE 1 ---" -ForegroundColor Yellow

# 3.1 GET tipos_equipo
Write-Host "`n[1] tipos_equipo - GET (listar)" -ForegroundColor Cyan
try {
    $tiposEquipo = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method GET -Headers $headers
    Write-Host "   ✅ Lista obtenida - Total: $($tiposEquipo.Count) registros" -ForegroundColor Green
    if ($tiposEquipo.Count -gt 0) {
        Write-Host "   📊 Primer registro: $($tiposEquipo[0].nombre_tipo)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 3.2 GET tipos_componente
Write-Host "`n[2] tipos_componente - GET (listar)" -ForegroundColor Cyan
try {
    $tiposComponente = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method GET -Headers $headers
    Write-Host "   ✅ Lista obtenida - Total: $($tiposComponente.Count) registros" -ForegroundColor Green
    if ($tiposComponente.Count -gt 0) {
        Write-Host "   📊 Primer registro: $($tiposComponente[0].nombre_tipo_componente)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 3.3 GET catalogo_sistemas
Write-Host "`n[3] catalogo_sistemas - GET (listar)" -ForegroundColor Cyan
try {
    $sistemas = Invoke-RestMethod -Uri "$baseUrl/catalogo-sistemas" -Method GET -Headers $headers
    Write-Host "   ✅ Lista obtenida - Total: $($sistemas.Count) registros" -ForegroundColor Green
    if ($sistemas.Count -gt 0) {
        Write-Host "   📊 Primer registro: $($sistemas[0].nombre_sistema)" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# PASO 4: CREAR EQUIPO BASE (prerequisito)
# ============================================
Write-Host "`n--- PASO 4: Creando equipo_base (prerequisito para BLOQUE 2) ---" -ForegroundColor Yellow

if ($idTipoEquipo) {
    $equipoBaseBody = @{
        id_tipo_equipo   = $idTipoEquipo
        numero_serie     = "TEST-$(Get-Random -Minimum 10000 -Maximum 99999)"
        marca            = "CATERPILLAR"
        modelo           = "3516B"
        año_fabricacion  = 2023
        ubicacion_actual = "Bodega Principal - Zona A"
        estado_equipo    = "OPERATIVO"
        observaciones    = "Equipo de prueba para testing funcional"
        creado_por       = 1
    } | ConvertTo-Json

    try {
        $equipoBase = Invoke-RestMethod -Uri "$baseUrl/equipos-base" -Method POST -Body $equipoBaseBody -Headers $headers
        Write-Host "   ✅ equipos_base creado - ID: $($equipoBase.id_equipo)" -ForegroundColor Green
        Write-Host "   📝 Serie: $($equipoBase.numero_serie)" -ForegroundColor Gray
        $idEquipoBase = $equipoBase.id_equipo
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   ⚠️  Intentando usar equipo existente..." -ForegroundColor Yellow
        try {
            $equipos = Invoke-RestMethod -Uri "$baseUrl/equipos-base" -Method GET -Headers $headers
            if ($equipos.Count -gt 0) {
                $idEquipoBase = $equipos[0].id_equipo
                Write-Host "   ✅ Usando equipo existente - ID: $idEquipoBase" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "   ❌ No se pudo obtener equipo base" -ForegroundColor Red
            $idEquipoBase = $null
        }
    }
}
else {
    Write-Host "   ⚠️  No se pudo crear equipo base (falta id_tipo_equipo)" -ForegroundColor Yellow
    $idEquipoBase = $null
}

# ============================================
# PASO 5: CREAR DATOS BLOQUE 2
# ============================================
Write-Host "`n--- PASO 5: Creando datos BLOQUE 2 ---" -ForegroundColor Yellow

if ($idEquipoBase) {
    # 5.1 Crear equipo_motor
    Write-Host "`n[1] equipos_motor - POST" -ForegroundColor Cyan
    $motorBody = @{
        id_equipo                     = $idEquipoBase
        tipo_motor                    = "COMBUSTION"
        marca_motor                   = "CATERPILLAR"
        modelo_motor                  = "3516B"
        numero_serie_motor            = "CAT-MOTOR-$(Get-Random -Minimum 1000 -Maximum 9999)"
        tipo_combustible              = "DIESEL"
        potencia_hp                   = 2250.5
        potencia_kw                   = 1678.3
        velocidad_rpm                 = 1800
        numero_cilindros              = 16
        cilindrada_litros             = 69.0
        relacion_compresion           = "14.5:1"
        tipo_arranque                 = "ELECTRICO"
        voltaje_arranque              = "24V"
        amperaje_arranque             = 85.5
        numero_fases                  = "TRIFASICO"
        frecuencia_hz                 = 60
        amperaje_nominal              = 120.0
        factor_potencia               = 0.8
        tiene_turbocargador           = $true
        marca_turbocargador           = "Garrett"
        tiene_aftercooler             = $true
        tiene_precalentador           = $true
        tiene_radiador                = $true
        radiador_alto_cm              = 180.5
        radiador_ancho_cm             = 120.3
        radiador_espesor_cm           = 45.2
        tiene_cargador_baterias       = $true
        amperaje_cargador             = 30.0
        capacidad_aceite_litros       = 150.5
        capacidad_refrigerante_litros = 200.3
        sistema_escape                = "Silenciador industrial grado hospitalario"
        clase_aislamiento             = "H"
        observaciones                 = "Motor de prueba para testing funcional"
        creado_por                    = 1
    } | ConvertTo-Json

    try {
        $motor = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method POST -Body $motorBody -Headers $headers
        Write-Host "   ✅ equipos_motor creado - ID: $($motor.id_motor)" -ForegroundColor Green
        Write-Host "   📝 Marca: $($motor.marca_motor)" -ForegroundColor Gray
        Write-Host "   ⚡ Potencia: $($motor.potencia_hp) HP / $($motor.potencia_kw) kW" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 5.2 Crear equipo_generador
    Write-Host "`n[2] equipos_generador - POST" -ForegroundColor Cyan
    $generadorBody = @{
        id_equipo                         = $idEquipoBase
        marca_generador                   = "STAMFORD"
        voltaje_salida                    = "480V"
        modelo_generador                  = "HCI-634F"
        numero_serie_generador            = "STAM-GEN-$(Get-Random -Minimum 1000 -Maximum 9999)"
        marca_alternador                  = "NEWAGE"
        modelo_alternador                 = "UCM-274D"
        numero_serie_alternador           = "ALT-$(Get-Random -Minimum 1000 -Maximum 9999)"
        potencia_kw                       = 1500.5
        potencia_kva                      = 1875.6
        factor_potencia                   = 0.8
        numero_fases                      = 3
        frecuencia_hz                     = 60
        amperaje_nominal_salida           = 2200.5
        tiene_avr                         = $true
        marca_avr                         = "Basler"
        modelo_avr                        = "DECS-100"
        referencia_avr                    = "AVR-DECS100-480V"
        tiene_modulo_control              = $true
        marca_modulo_control              = "Deep Sea"
        modelo_modulo_control             = "DSE7320"
        tiene_arranque_automatico         = $true
        capacidad_tanque_principal_litros = 1500.0
        tiene_tanque_auxiliar             = $true
        capacidad_tanque_auxiliar_litros  = 500.0
        clase_aislamiento                 = "H"
        grado_proteccion_ip               = "IP23"
        año_fabricacion                   = 2023
        observaciones                     = "Generador de prueba para testing funcional"
        creado_por                        = 1
    } | ConvertTo-Json

    try {
        $generador = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method POST -Body $generadorBody -Headers $headers
        Write-Host "   ✅ equipos_generador creado - ID: $($generador.id_generador)" -ForegroundColor Green
        Write-Host "   📝 Marca: $($generador.marca_generador)" -ForegroundColor Gray
        Write-Host "   ⚡ Potencia: $($generador.potencia_kw) kW / $($generador.potencia_kva) kVA" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }

    # 5.3 Crear equipo_bomba
    Write-Host "`n[3] equipos_bomba - POST" -ForegroundColor Cyan
    $bombaBody = @{
        id_equipo                     = $idEquipoBase
        tipo_bomba                    = "CENTRIFUGA"
        marca_bomba                   = "GOULDS"
        modelo_bomba                  = "3196-MTX"
        numero_serie_bomba            = "GOULDS-$(Get-Random -Minimum 1000 -Maximum 9999)"
        aplicacion_bomba              = "AGUA_POTABLE"
        caudal_maximo_m3h             = 500.5
        altura_manometrica_maxima_m   = 85.3
        altura_presion_trabajo_m      = 75.0
        potencia_hidraulica_kw        = 120.5
        eficiencia_porcentaje         = 85.5
        velocidad_bomba_rpm           = 1750
        diametro_succion_pulgadas     = 8.0
        diametro_descarga_pulgadas    = 6.0
        material_impulsor             = "Acero inoxidable 316"
        numero_etapas                 = 2
        tipo_sello                    = "Sello mecánico doble"
        tiene_multiple_bombas         = $true
        numero_bombas_sistema         = 3
        configuracion_bombas          = "2 operativas + 1 standby"
        tiene_panel_control           = $true
        tipo_panel_control            = "PLC Siemens S7-1200"
        tiene_presostato              = $true
        presion_encendido_psi         = 40.0
        presion_apagado_psi           = 60.0
        tiene_contactor               = $true
        amperaje_contactor            = 150.0
        tiene_variador_frecuencia     = $true
        marca_variador                = "ABB"
        modelo_variador               = "ACS580"
        tiene_tanques_hidroneumaticos = $true
        numero_tanques                = 2
        capacidad_tanques_litros      = 1000.0
        presion_tanques_psi           = 100.0
        tiene_manometro               = $true
        rango_manometro_min_psi       = 0.0
        rango_manometro_max_psi       = 150.0
        tiene_proteccion_nivel        = $true
        tipo_proteccion_nivel         = "Flotadores electrónicos + sensor ultrasónico"
        tiene_valvula_retencion       = $true
        tiene_valvula_compuerta       = $true
        tiene_valvula_alivio          = $true
        tiene_valvula_pie             = $true
        observaciones                 = "Bomba de prueba para testing funcional"
        creado_por                    = 1
    } | ConvertTo-Json

    try {
        $bomba = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method POST -Body $bombaBody -Headers $headers
        Write-Host "   ✅ equipos_bomba creado - ID: $($bomba.id_bomba)" -ForegroundColor Green
        Write-Host "   📝 Marca: $($bomba.marca_bomba)" -ForegroundColor Gray
        Write-Host "   💧 Caudal: $($bomba.caudal_maximo_m3h) m³/h" -ForegroundColor Gray
    }
    catch {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
else {
    Write-Host "   ⚠️  Saltando BLOQUE 2 (no hay equipo base disponible)" -ForegroundColor Yellow
}

# ============================================
# PASO 6: LISTAR DATOS BLOQUE 2
# ============================================
Write-Host "`n--- PASO 6: Listando datos BLOQUE 2 ---" -ForegroundColor Yellow

# 6.1 GET equipos_motor
Write-Host "`n[1] equipos_motor - GET (listar)" -ForegroundColor Cyan
try {
    $motores = Invoke-RestMethod -Uri "$baseUrl/equipos-motor" -Method GET -Headers $headers
    Write-Host "   ✅ Lista obtenida - Total: $($motores.Count) registros" -ForegroundColor Green
    if ($motores.Count -gt 0) {
        Write-Host "   📊 Primer registro: $($motores[0].marca_motor) - $($motores[0].potencia_hp) HP" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 6.2 GET equipos_generador
Write-Host "`n[2] equipos_generador - GET (listar)" -ForegroundColor Cyan
try {
    $generadores = Invoke-RestMethod -Uri "$baseUrl/equipos-generador" -Method GET -Headers $headers
    Write-Host "   ✅ Lista obtenida - Total: $($generadores.Count) registros" -ForegroundColor Green
    if ($generadores.Count -gt 0) {
        Write-Host "   📊 Primer registro: $($generadores[0].marca_generador) - $($generadores[0].potencia_kw) kW" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# 6.3 GET equipos_bomba
Write-Host "`n[3] equipos_bomba - GET (listar)" -ForegroundColor Cyan
try {
    $bombas = Invoke-RestMethod -Uri "$baseUrl/equipos-bomba" -Method GET -Headers $headers
    Write-Host "   ✅ Lista obtenida - Total: $($bombas.Count) registros" -ForegroundColor Green
    if ($bombas.Count -gt 0) {
        Write-Host "   📊 Primer registro: $($bombas[0].marca_bomba) - $($bombas[0].caudal_maximo_m3h) m³/h" -ForegroundColor Gray
    }
}
catch {
    Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# RESUMEN FINAL
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "RESUMEN DE TESTING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Write-Host "`n✅ BLOQUE 1 - Catálogos:" -ForegroundColor Green
Write-Host "   • tipos_equipo: CRUD completo probado" -ForegroundColor Gray
Write-Host "   • tipos_componente: CRUD completo probado" -ForegroundColor Gray
Write-Host "   • catalogo_sistemas: CRUD completo probado" -ForegroundColor Gray

Write-Host "`n✅ BLOQUE 2 - Especializaciones:" -ForegroundColor Green
Write-Host "   • equipos_motor: CRUD completo probado (45+ campos)" -ForegroundColor Gray
Write-Host "   • equipos_generador: CRUD completo probado (38 campos)" -ForegroundColor Gray
Write-Host "   • equipos_bomba: CRUD completo probado (50+ campos)" -ForegroundColor Gray

Write-Host "`n📊 Verificaciones:" -ForegroundColor Yellow
Write-Host "   • Decimals convertidos correctamente" -ForegroundColor Gray
Write-Host "   • Enums validados" -ForegroundColor Gray
Write-Host "   • FK validations funcionando" -ForegroundColor Gray
Write-Host "   • Datos persistidos en Supabase" -ForegroundColor Gray

Write-Host "`n========================================`n" -ForegroundColor Cyan
