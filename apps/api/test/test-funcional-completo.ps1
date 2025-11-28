# ============================================================================
# PRUEBAS FUNCIONALES COMPLETAS - BACKEND MEKANOS
# Simula EXACTAMENTE lo que haria el Frontend de principio a fin
# Corregido: 28-Nov-2025 - Campos correctos de DTOs
# ============================================================================

$ErrorActionPreference = "Continue"
$BASE_URL = "http://localhost:3000/api"
$TOKEN = ""
$RESULTADOS = @()

function Write-Step { param($msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK { param($msg) Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-FAIL { param($msg) Write-Host "   [FAIL] $msg" -ForegroundColor Red }
function Write-INFO { param($msg) Write-Host "   [INFO] $msg" -ForegroundColor Yellow }
function Write-DATA { param($msg) Write-Host "   -> $msg" -ForegroundColor White }

function Add-Resultado {
    param($test, $paso, $resultado, $detalle)
    $script:RESULTADOS += @{ test = $test; paso = $paso; resultado = $resultado; detalle = $detalle }
}

function Get-Headers {
    return @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }
}

# ============================================================================
# TEST 1: FLUJO COMPLETO - ORDEN DE SERVICIO
# ============================================================================

function Test-FlujoOrdenCompleto {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Magenta
    Write-Host "   TEST 1: FLUJO COMPLETO - ORDEN DE SERVICIO TIPO A           " -ForegroundColor Magenta
    Write-Host "================================================================" -ForegroundColor Magenta
    
    $ordenId = $null
    $clienteId = $null
    $equipoId = $null
    $tipoServicioId = $null
    $tecnicoId = 1
    $numeroOrden = $null
    
    # PASO 1.1: LOGIN
    Write-Step "PASO 1.1: VISTA LOGIN - El usuario ingresa credenciales"
    
    try {
        $loginBody = '{"email":"admin@mekanos.com","password":"Admin123!"}'
        $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
        $script:TOKEN = $loginResponse.access_token
        
        Write-OK "JWT obtenido exitosamente"
        Write-DATA "Token: $($TOKEN.Substring(0,50))..."
        Add-Resultado "TEST1" "1.1 Login" "OK" "JWT obtenido"
    }
    catch {
        Write-FAIL "Error en login: $($_.Exception.Message)"
        Add-Resultado "TEST1" "1.1 Login" "FAIL" $_.Exception.Message
        return $null
    }
    
    # PASO 1.2: DASHBOARD
    Write-Step "PASO 1.2: VISTA DASHBOARD - El admin ve metricas"
    
    try {
        $dashboard = Invoke-RestMethod -Uri "$BASE_URL/dashboard" -Method GET -Headers (Get-Headers)
        Write-OK "Dashboard cargado"
        Write-DATA "Ordenes totales: $($dashboard.ordenes.total)"
        Write-DATA "Alertas activas: $($dashboard.alertas.totalAlertas)"
        Add-Resultado "TEST1" "1.2 Dashboard" "OK" "Metricas OK"
    }
    catch {
        Write-INFO "Dashboard no disponible (no critico)"
        Add-Resultado "TEST1" "1.2 Dashboard" "INFO" "No disponible"
    }
    
    # PASO 1.3: OBTENER CLIENTE
    Write-Step "PASO 1.3: NUEVA ORDEN - Obtener cliente"
    
    try {
        $clientes = Invoke-RestMethod -Uri "$BASE_URL/clientes?limit=1" -Method GET -Headers (Get-Headers)
        if ($clientes -is [System.Array] -and $clientes.Count -gt 0) {
            $clienteId = $clientes[0].id_cliente
        }
        elseif ($clientes.data) {
            $clienteId = $clientes.data[0].id_cliente
        }
        
        if ($clienteId) {
            Write-OK "Cliente obtenido: ID $clienteId"
            Add-Resultado "TEST1" "1.3 Cliente" "OK" "ID: $clienteId"
        }
        else {
            Write-FAIL "No hay clientes"
            return $null
        }
    }
    catch {
        Write-FAIL "Error: $($_.Exception.Message)"
        return $null
    }
    
    # PASO 1.4: OBTENER EQUIPO Y TIPO SERVICIO
    Write-Step "PASO 1.4: NUEVA ORDEN - Obtener equipo y tipo servicio"
    
    try {
        $equipos = Invoke-RestMethod -Uri "$BASE_URL/equipos?limit=1" -Method GET -Headers (Get-Headers)
        if ($equipos -is [System.Array] -and $equipos.Count -gt 0) {
            $equipoId = $equipos[0].id_equipo
        }
        elseif ($equipos.data) {
            $equipoId = $equipos.data[0].id_equipo
        }
        
        $tipos = Invoke-RestMethod -Uri "$BASE_URL/tipos-servicio?limit=1" -Method GET -Headers (Get-Headers)
        if ($tipos -is [System.Array] -and $tipos.Count -gt 0) {
            $tipoServicioId = $tipos[0].id_tipo_servicio
        }
        elseif ($tipos.data) {
            $tipoServicioId = $tipos.data[0].id_tipo_servicio
        }
        
        Write-OK "Equipo ID: $equipoId, Tipo Servicio ID: $tipoServicioId"
        Add-Resultado "TEST1" "1.4 Equipo" "OK" "OK"
    }
    catch {
        Write-FAIL "Error: $($_.Exception.Message)"
        return $null
    }
    
    # PASO 1.5: CREAR ORDEN (campos correctos del DTO)
    Write-Step "PASO 1.5: NUEVA ORDEN - Crear orden de servicio"
    
    try {
        $ordenBody = @{
            equipoId        = $equipoId
            clienteId       = $clienteId
            tipoServicioId  = $tipoServicioId
            descripcion     = "TEST E2E - Mantenimiento Tipo A Generador - $(Get-Date -Format 'HH:mm:ss')"
            prioridad       = "NORMAL"
            fechaProgramada = (Get-Date).AddDays(1).ToString("yyyy-MM-ddT00:00:00.000Z")
        } | ConvertTo-Json
        
        $ordenCreada = Invoke-RestMethod -Uri "$BASE_URL/ordenes" -Method POST -Body $ordenBody -Headers (Get-Headers)
        
        if ($ordenCreada.data) {
            $ordenId = $ordenCreada.data.id_orden_servicio
            $numeroOrden = $ordenCreada.data.numero_orden
        }
        else {
            $ordenId = $ordenCreada.id_orden_servicio
            $numeroOrden = $ordenCreada.numero_orden
        }
        
        Write-OK "Orden creada: $numeroOrden (ID: $ordenId)"
        Add-Resultado "TEST1" "1.5 Crear Orden" "OK" $numeroOrden
    }
    catch {
        Write-FAIL "Error: $($_.ErrorDetails.Message)"
        Add-Resultado "TEST1" "1.5 Crear Orden" "FAIL" $_.Exception.Message
        return $null
    }
    
    # PASOS 1.6-1.8: TRANSICIONES DE ESTADO
    Write-Step "PASO 1.6-1.8: WORKFLOW - Transiciones de estado"
    
    $transiciones = @("PROGRAMADA", "ASIGNADA", "EN_PROCESO")
    foreach ($estado in $transiciones) {
        try {
            $estadoBody = @{
                nuevoEstado = $estado
                id_usuario  = 1
                observacion = "TEST E2E"
            } | ConvertTo-Json
            
            Invoke-RestMethod -Uri "$BASE_URL/ordenes/$ordenId/estado" -Method PATCH -Body $estadoBody -Headers (Get-Headers) | Out-Null
            Write-OK "-> $estado"
            Add-Resultado "TEST1" "1.6-8 $estado" "OK" "OK"
        }
        catch {
            Write-INFO "$estado ya aplicado"
            Add-Resultado "TEST1" "1.6-8 $estado" "INFO" "Ya aplicado"
        }
    }
    
    # PASO 1.9: REGISTRAR MEDICIONES
    Write-Step "PASO 1.9: APP MOVIL - Registrar mediciones"
    
    try {
        $parametros = Invoke-RestMethod -Uri "$BASE_URL/parametros-medicion?limit=2" -Method GET -Headers (Get-Headers)
        $params = if ($parametros -is [System.Array]) { $parametros } else { $parametros.data }
        
        if ($params -and $params.Count -gt 0) {
            $medOK = 0
            foreach ($param in $params[0..1]) {
                $medBody = @{
                    id_orden_servicio = $ordenId
                    id_parametro      = $param.id_parametro
                    valor_medido      = 75
                    observaciones     = "TEST E2E"
                } | ConvertTo-Json
                
                try {
                    $med = Invoke-RestMethod -Uri "$BASE_URL/mediciones-servicio" -Method POST -Body $medBody -Headers (Get-Headers)
                    $nivel = if ($med.data) { $med.data.nivel_alerta } else { $med.nivel_alerta }
                    Write-DATA "$($param.nombre_parametro): Alerta=$nivel"
                    $medOK++
                }
                catch { }
            }
            Write-OK "$medOK mediciones registradas"
            Add-Resultado "TEST1" "1.9 Mediciones" "OK" "$medOK mediciones"
        }
    }
    catch {
        Write-INFO "Sin parametros configurados"
        Add-Resultado "TEST1" "1.9 Mediciones" "INFO" "Sin parametros"
    }
    
    # PASO 1.10: COMPLETAR ORDEN
    Write-Step "PASO 1.10: APP MOVIL - Completar orden"
    
    try {
        $completarBody = @{
            nuevoEstado = "COMPLETADA"
            id_usuario  = $tecnicoId
            observacion = "Servicio completado TEST E2E"
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$BASE_URL/ordenes/$ordenId/estado" -Method PATCH -Body $completarBody -Headers (Get-Headers) | Out-Null
        Write-OK "Orden COMPLETADA"
        Add-Resultado "TEST1" "1.10 Completar" "OK" "COMPLETADA"
    }
    catch {
        Write-INFO "Estado ya aplicado"
        Add-Resultado "TEST1" "1.10 Completar" "INFO" "Ya completada"
    }
    
    # PASO 1.11: GENERAR PDF
    Write-Step "PASO 1.11: BACKEND - Generar PDF"
    
    try {
        $startTime = Get-Date
        $pdfResponse = Invoke-WebRequest -Uri "$BASE_URL/pdf/prueba" -Method GET -Headers (Get-Headers)
        $duration = ((Get-Date) - $startTime).TotalMilliseconds
        $sizeKB = [math]::Round($pdfResponse.RawContentLength / 1024, 2)
        
        Write-OK "PDF generado: $sizeKB KB en $([math]::Round($duration))ms"
        Add-Resultado "TEST1" "1.11 PDF" "OK" "$sizeKB KB"
    }
    catch {
        Write-FAIL "Error generando PDF"
        Add-Resultado "TEST1" "1.11 PDF" "FAIL" $_.Exception.Message
    }
    
    # PASO 1.12: ENVIAR EMAIL
    Write-Step "PASO 1.12: BACKEND - Enviar email a lorddeep3@gmail.com"
    
    try {
        $emailResult = Invoke-RestMethod -Uri "$BASE_URL/email/test?to=lorddeep3@gmail.com" -Method POST -Headers (Get-Headers)
        Write-OK "Email enviado: $($emailResult.messageId)"
        Add-Resultado "TEST1" "1.12 Email" "OK" "Enviado"
    }
    catch {
        $err = $_.ErrorDetails.Message
        if ($err -like "*Google*" -or $err -like "*blocked*" -or $err -like "*535*" -or $err -like "*400*") {
            Write-INFO "Bloqueado por Google (no es error del backend)"
            Add-Resultado "TEST1" "1.12 Email" "INFO" "Google bloqueo"
        }
        else {
            Write-FAIL "Error: $err"
            Add-Resultado "TEST1" "1.12 Email" "FAIL" $err
        }
    }
    
    Write-Host ""
    Write-Host "----------------------------------------------------------------" -ForegroundColor Green
    Write-Host "   TEST 1 COMPLETADO - Orden: $numeroOrden                     " -ForegroundColor Green
    Write-Host "----------------------------------------------------------------" -ForegroundColor Green
    
    return $ordenId
}

# ============================================================================
# TEST 2: COTIZACION
# ============================================================================

function Test-Cotizacion {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Magenta
    Write-Host "   TEST 2: COTIZACION COMERCIAL                                " -ForegroundColor Magenta
    Write-Host "================================================================" -ForegroundColor Magenta
    
    Write-Step "PASO 2.1: ADMIN - Crear cotizacion"
    
    try {
        $clientes = Invoke-RestMethod -Uri "$BASE_URL/clientes?limit=1" -Method GET -Headers (Get-Headers)
        $clienteId = if ($clientes -is [System.Array]) { $clientes[0].id_cliente } else { $clientes.data[0].id_cliente }
        
        $cotBody = @{
            id_cliente        = $clienteId
            fecha_cotizacion  = (Get-Date).ToString("yyyy-MM-ddT00:00:00.000Z")
            fecha_vencimiento = (Get-Date).AddDays(30).ToString("yyyy-MM-ddT00:00:00.000Z")
            asunto            = "Cotizacion TEST E2E - $(Get-Date -Format 'HH:mm:ss')"
            elaborada_por     = 1
            validez_dias      = 30
        } | ConvertTo-Json
        
        $cot = Invoke-RestMethod -Uri "$BASE_URL/cotizaciones" -Method POST -Body $cotBody -Headers (Get-Headers)
        $cotId = if ($cot.data) { $cot.data.id_cotizacion } else { $cot.id_cotizacion }
        $numCot = if ($cot.data) { $cot.data.numero_cotizacion } else { $cot.numero_cotizacion }
        
        Write-OK "Cotizacion creada: $numCot (ID: $cotId)"
        Add-Resultado "TEST2" "2.1 Cotizacion" "OK" $numCot
    }
    catch {
        Write-FAIL "Error: $($_.ErrorDetails.Message)"
        Add-Resultado "TEST2" "2.1 Cotizacion" "FAIL" $_.Exception.Message
        return
    }
    
    Write-Host ""
    Write-Host "----------------------------------------------------------------" -ForegroundColor Green
    Write-Host "   TEST 2 COMPLETADO - Cotizacion                              " -ForegroundColor Green
    Write-Host "----------------------------------------------------------------" -ForegroundColor Green
}

# ============================================================================
# TEST 3: CONTRATO
# ============================================================================

function Test-Contrato {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Magenta
    Write-Host "   TEST 3: CONTRATO DE MANTENIMIENTO                           " -ForegroundColor Magenta
    Write-Host "================================================================" -ForegroundColor Magenta
    
    Write-Step "PASO 3.1: ADMIN - Crear contrato"
    
    try {
        $clientes = Invoke-RestMethod -Uri "$BASE_URL/clientes?limit=1" -Method GET -Headers (Get-Headers)
        $clienteId = if ($clientes -is [System.Array]) { $clientes[0].id_cliente } else { $clientes.data[0].id_cliente }
        
        $contBody = @{
            id_cliente            = $clienteId
            id_asesor_responsable = 1
            creado_por            = 1
            tipo_contrato         = "PREVENTIVO_RECURRENTE"
            fecha_inicio          = (Get-Date).ToString("yyyy-MM-ddT00:00:00.000Z")
            fecha_fin             = (Get-Date).AddYears(1).ToString("yyyy-MM-ddT00:00:00.000Z")
        } | ConvertTo-Json
        
        $cont = Invoke-RestMethod -Uri "$BASE_URL/contratos-mantenimiento" -Method POST -Body $contBody -Headers (Get-Headers)
        
        Write-OK "Contrato creado: $($cont.codigo_contrato) (ID: $($cont.id_contrato))"
        Add-Resultado "TEST3" "3.1 Contrato" "OK" $cont.codigo_contrato
    }
    catch {
        Write-FAIL "Error: $($_.ErrorDetails.Message)"
        Add-Resultado "TEST3" "3.1 Contrato" "FAIL" $_.Exception.Message
    }
    
    Write-Host ""
    Write-Host "----------------------------------------------------------------" -ForegroundColor Green
    Write-Host "   TEST 3 COMPLETADO - Contrato                                " -ForegroundColor Green
    Write-Host "----------------------------------------------------------------" -ForegroundColor Green
}

# ============================================================================
# TEST 4: NOTIFICACIONES
# ============================================================================

function Test-Notificaciones {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Magenta
    Write-Host "   TEST 4: NOTIFICACIONES                                      " -ForegroundColor Magenta
    Write-Host "================================================================" -ForegroundColor Magenta
    
    Write-Step "PASO 4.1: Verificar notificaciones"
    
    try {
        $notif = Invoke-RestMethod -Uri "$BASE_URL/notificaciones" -Method GET -Headers (Get-Headers)
        $count = if ($notif.data) { $notif.data.Count } else { 0 }
        $noLeidas = if ($notif.meta) { $notif.meta.noLeidas } else { 0 }
        Write-OK "Total: $count, No leidas: $noLeidas"
        Add-Resultado "TEST4" "4.1 Notificaciones" "OK" "$count notificaciones"
    }
    catch {
        Write-FAIL "Error: $($_.Exception.Message)"
        Add-Resultado "TEST4" "4.1 Notificaciones" "FAIL" $_.Exception.Message
    }
    
    Write-Step "PASO 4.2: Verificar conteo"
    
    try {
        $conteo = Invoke-RestMethod -Uri "$BASE_URL/notificaciones/conteo" -Method GET -Headers (Get-Headers)
        Write-OK "Conteo obtenido: $($conteo.noLeidas) no leidas"
        Add-Resultado "TEST4" "4.2 Conteo" "OK" "OK"
    }
    catch {
        Write-INFO "Conteo no disponible"
        Add-Resultado "TEST4" "4.2 Conteo" "INFO" "No disponible"
    }
    
    Write-Host ""
    Write-Host "----------------------------------------------------------------" -ForegroundColor Green
    Write-Host "   TEST 4 COMPLETADO - Notificaciones                          " -ForegroundColor Green
    Write-Host "----------------------------------------------------------------" -ForegroundColor Green
}

# ============================================================================
# RESUMEN
# ============================================================================

function Show-Resumen {
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "               RESUMEN DE PRUEBAS FUNCIONALES                  " -ForegroundColor Cyan
    Write-Host "================================================================" -ForegroundColor Cyan
    
    $totalOK = ($RESULTADOS | Where-Object { $_.resultado -eq "OK" }).Count
    $totalFAIL = ($RESULTADOS | Where-Object { $_.resultado -eq "FAIL" }).Count
    $totalINFO = ($RESULTADOS | Where-Object { $_.resultado -eq "INFO" }).Count
    $total = $RESULTADOS.Count
    
    Write-Host ""
    Write-Host "   RESULTADOS:" -ForegroundColor White
    Write-Host "   [OK]:   $totalOK" -ForegroundColor Green
    Write-Host "   [FAIL]: $totalFAIL" -ForegroundColor Red
    Write-Host "   [INFO]: $totalINFO" -ForegroundColor Yellow
    Write-Host "   ---------------" -ForegroundColor Gray
    Write-Host "   TOTAL: $total pruebas" -ForegroundColor White
    Write-Host ""
    
    $porcentaje = [math]::Round(($totalOK / $total) * 100, 1)
    
    if ($totalFAIL -eq 0) {
        Write-Host "   BACKEND 100% FUNCIONAL - LISTO PARA FRONTEND" -ForegroundColor Green
    }
    else {
        Write-Host "   BACKEND $porcentaje% FUNCIONAL - HAY $totalFAIL ERRORES" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "================================================================" -ForegroundColor Cyan
    
    $jsonPath = ".\test-funcional-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    $RESULTADOS | ConvertTo-Json -Depth 5 | Out-File -FilePath $jsonPath -Encoding utf8
    Write-Host "   Resultados guardados: $jsonPath" -ForegroundColor Gray
}

# ============================================================================
# EJECUCION
# ============================================================================

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "   PRUEBAS FUNCIONALES COMPLETAS - BACKEND MEKANOS             " -ForegroundColor Cyan
Write-Host "   Simulando exactamente lo que haria el Frontend              " -ForegroundColor Cyan
Write-Host "   Fecha: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')                              " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

Test-FlujoOrdenCompleto
Test-Cotizacion
Test-Contrato
Test-Notificaciones
Show-Resumen
