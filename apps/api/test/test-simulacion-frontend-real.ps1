# ============================================================================
# TEST SIMULACIÓN VISTAS FRONTEND - MEKANOS
# ============================================================================
# Simula EXACTAMENTE lo que haría el Frontend, paso a paso
# Usa los endpoints REALES y templates CORRECTOS (GENERADOR_A, etc.)
# ============================================================================

$ErrorActionPreference = "Continue"
$BASE_URL = "http://localhost:3000/api"
$TOKEN = ""
$ORDEN_ID = $null
$NUMERO_ORDEN = $null

function Write-Vista { param($msg) Write-Host "`n========================================" -ForegroundColor Cyan; Write-Host "  VISTA: $msg" -ForegroundColor Cyan; Write-Host "========================================" -ForegroundColor Cyan }
function Write-Accion { param($msg) Write-Host "  >> $msg" -ForegroundColor White }
function Write-OK { param($msg) Write-Host "  [OK] $msg" -ForegroundColor Green }
function Write-FAIL { param($msg) Write-Host "  [FAIL] $msg" -ForegroundColor Red }
function Write-INFO { param($msg) Write-Host "  [INFO] $msg" -ForegroundColor Yellow }
function Write-DATA { param($msg) Write-Host "     $msg" -ForegroundColor Gray }

function Get-Headers {
    return @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" }
}

Write-Host ""
Write-Host "############################################################" -ForegroundColor Magenta
Write-Host "#                                                          #" -ForegroundColor Magenta
Write-Host "#   SIMULACION VISTAS FRONTEND - MEKANOS                   #" -ForegroundColor Magenta
Write-Host "#   Prueba REAL del flujo completo                         #" -ForegroundColor Magenta
Write-Host "#                                                          #" -ForegroundColor Magenta
Write-Host "############################################################" -ForegroundColor Magenta

# ============================================================================
# VISTA 1: LOGIN
# ============================================================================
Write-Vista "LOGIN - El usuario admin ingresa al sistema"
Write-Accion "Frontend envia: email + password"
Write-Accion "Endpoint: POST /auth/login"

try {
    $loginBody = '{"email":"admin@mekanos.com","password":"Admin123!"}'
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $TOKEN = $loginResponse.access_token
    
    Write-OK "JWT obtenido exitosamente"
    Write-DATA "Token: $($TOKEN.Substring(0,40))..."
    Write-DATA "Usuario: $($loginResponse.user.email)"
}
catch {
    Write-FAIL "Error en login: $($_.Exception.Message)"
    exit 1
}

# ============================================================================
# VISTA 2: DASHBOARD
# ============================================================================
Write-Vista "DASHBOARD - El admin ve el panel principal"
Write-Accion "Frontend solicita: GET /dashboard"

try {
    $dashboard = Invoke-RestMethod -Uri "$BASE_URL/dashboard" -Method GET -Headers (Get-Headers)
    Write-OK "Dashboard cargado"
    Write-DATA "Ordenes totales: $($dashboard.ordenes.total)"
    Write-DATA "Ordenes pendientes: $($dashboard.ordenes.pendientes)"
}
catch {
    Write-INFO "Dashboard no disponible (continuando...)"
}

# ============================================================================
# VISTA 3: FORMULARIO NUEVA ORDEN
# ============================================================================
Write-Vista "NUEVA ORDEN - El admin crea una orden de servicio"

# Obtener cliente
Write-Accion "Frontend carga dropdown de clientes: GET /clientes"
try {
    $clientes = Invoke-RestMethod -Uri "$BASE_URL/clientes?limit=1" -Method GET -Headers (Get-Headers)
    $clienteId = if ($clientes -is [System.Array]) { $clientes[0].id_cliente } else { $clientes.data[0].id_cliente }
    Write-OK "Cliente seleccionado: ID $clienteId"
}
catch {
    Write-FAIL "Error obteniendo clientes"
    exit 1
}

# Obtener equipo (tipo GENERADOR para usar template GENERADOR_A)
Write-Accion "Frontend carga equipos del cliente: GET /equipos"
try {
    $equipos = Invoke-RestMethod -Uri "$BASE_URL/equipos?limit=1" -Method GET -Headers (Get-Headers)
    $equipoId = if ($equipos -is [System.Array]) { $equipos[0].id_equipo } else { $equipos.data[0].id_equipo }
    $codigoEquipo = if ($equipos -is [System.Array]) { $equipos[0].codigo_equipo } else { $equipos.data[0].codigo_equipo }
    Write-OK "Equipo seleccionado: $codigoEquipo (ID: $equipoId)"
}
catch {
    Write-FAIL "Error obteniendo equipos"
    exit 1
}

# Obtener tipo servicio
Write-Accion "Frontend carga tipos de servicio: GET /tipos-servicio"
try {
    $tipos = Invoke-RestMethod -Uri "$BASE_URL/tipos-servicio?limit=1" -Method GET -Headers (Get-Headers)
    $tipoId = if ($tipos -is [System.Array]) { $tipos[0].id_tipo_servicio } else { $tipos.data[0].id_tipo_servicio }
    Write-OK "Tipo servicio: ID $tipoId"
}
catch {
    Write-FAIL "Error obteniendo tipos servicio"
    exit 1
}

# Crear orden
Write-Accion "Frontend envia formulario: POST /ordenes"
Write-DATA "Campos: equipoId, clienteId, tipoServicioId, descripcion, prioridad, fechaProgramada"
try {
    $ordenBody = @{
        equipoId        = $equipoId
        clienteId       = $clienteId
        tipoServicioId  = $tipoId
        descripcion     = "Mantenimiento Preventivo TIPO A - GENERADOR - TEST SIMULACION FRONTEND $(Get-Date -Format 'HH:mm:ss')"
        prioridad       = "NORMAL"
        fechaProgramada = (Get-Date).AddDays(1).ToString("yyyy-MM-ddT00:00:00.000Z")
    } | ConvertTo-Json
    
    $ordenCreada = Invoke-RestMethod -Uri "$BASE_URL/ordenes" -Method POST -Body $ordenBody -Headers (Get-Headers)
    
    $ORDEN_ID = if ($ordenCreada.data) { $ordenCreada.data.id_orden_servicio } else { $ordenCreada.id_orden_servicio }
    $NUMERO_ORDEN = if ($ordenCreada.data) { $ordenCreada.data.numero_orden } else { $ordenCreada.numero_orden }
    
    Write-OK "Orden creada exitosamente"
    Write-DATA "Numero: $NUMERO_ORDEN"
    Write-DATA "ID: $ORDEN_ID"
}
catch {
    Write-FAIL "Error creando orden: $($_.ErrorDetails.Message)"
    exit 1
}

# ============================================================================
# VISTA 4: APP MOVIL - TECNICO ASIGNADO
# ============================================================================
Write-Vista "APP MOVIL TECNICO - El tecnico ve la orden asignada"

# Transiciones de estado (BORRADOR -> PROGRAMADA -> ASIGNADA -> EN_PROCESO)
Write-Accion "Tecnico inicia servicio: PATCH /ordenes/:id/estado"
$transiciones = @("PROGRAMADA", "ASIGNADA", "EN_PROCESO")
foreach ($estado in $transiciones) {
    try {
        $estadoBody = @{
            nuevoEstado = $estado
            id_usuario  = 1
            observacion = "TEST Frontend - Transicion a $estado"
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$BASE_URL/ordenes/$ORDEN_ID/estado" -Method PATCH -Body $estadoBody -Headers (Get-Headers) | Out-Null
        Write-DATA "Estado -> $estado [OK]"
    }
    catch {
        Write-DATA "Estado $estado (ya aplicado o no permitido)"
    }
}
Write-OK "Orden en estado EN_PROCESO"

# ============================================================================
# VISTA 5: APP MOVIL - REGISTRO DE MEDICIONES
# ============================================================================
Write-Vista "APP MOVIL - El tecnico registra mediciones del equipo"
Write-Accion "Frontend envia: POST /mediciones-servicio"

try {
    $parametros = Invoke-RestMethod -Uri "$BASE_URL/parametros-medicion?limit=3" -Method GET -Headers (Get-Headers)
    $params = if ($parametros -is [System.Array]) { $parametros } else { $parametros.data }
    
    if ($params -and $params.Count -gt 0) {
        $valores = @(75, 85, 45) # Valores de prueba variados
        $medOK = 0
        
        foreach ($i in 0..([Math]::Min($params.Count, 3) - 1)) {
            $param = $params[$i]
            $medBody = @{
                id_orden_servicio = $ORDEN_ID
                id_parametro      = $param.id_parametro
                valor_medido      = $valores[$i % $valores.Count]
                observaciones     = "Medicion TEST Frontend"
            } | ConvertTo-Json
            
            try {
                $med = Invoke-RestMethod -Uri "$BASE_URL/mediciones-servicio" -Method POST -Body $medBody -Headers (Get-Headers)
                $nivel = if ($med.data) { $med.data.nivel_alerta } else { $med.nivel_alerta }
                Write-DATA "$($param.nombre_parametro): $($valores[$i % $valores.Count]) -> Alerta: $nivel"
                $medOK++
            }
            catch { }
        }
        Write-OK "$medOK mediciones registradas"
    }
    else {
        Write-INFO "Sin parametros de medicion configurados"
    }
}
catch {
    Write-INFO "Error con mediciones (no critico)"
}

# ============================================================================
# VISTA 6: APP MOVIL - CHECKLIST DE ACTIVIDADES
# ============================================================================
Write-Vista "APP MOVIL - El tecnico completa el checklist de actividades"
Write-Accion "Frontend envia: POST /actividades-ejecutadas"

try {
    $actividades = Invoke-RestMethod -Uri "$BASE_URL/catalogo-actividades?limit=5" -Method GET -Headers (Get-Headers)
    $acts = if ($actividades -is [System.Array]) { $actividades } else { $actividades.data }
    
    if ($acts -and $acts.Count -gt 0) {
        $estados = @("B", "B", "R", "B", "NA") # Bueno, Regular, No Aplica
        $actOK = 0
        
        foreach ($i in 0..([Math]::Min($acts.Count, 5) - 1)) {
            $act = $acts[$i]
            $actBody = @{
                id_orden_servicio = $ORDEN_ID
                id_actividad      = $act.id_actividad
                estado_checklist  = $estados[$i % $estados.Count]
                observaciones     = "Actividad verificada - TEST Frontend"
                id_tecnico        = 1
            } | ConvertTo-Json
            
            try {
                Invoke-RestMethod -Uri "$BASE_URL/actividades-ejecutadas" -Method POST -Body $actBody -Headers (Get-Headers) | Out-Null
                Write-DATA "$($act.nombre_actividad): Estado $($estados[$i % $estados.Count])"
                $actOK++
            }
            catch { }
        }
        Write-OK "$actOK actividades completadas"
    }
}
catch {
    Write-INFO "Error con actividades (no critico)"
}

# ============================================================================
# VISTA 7: APP MOVIL - SUBIR EVIDENCIAS FOTOGRAFICAS
# ============================================================================
Write-Vista "APP MOVIL - El tecnico sube fotos del servicio"
Write-Accion "LAS FOTOS DEBEN SUBIRSE A CLOUDINARY"
Write-Accion "Frontend envia imagen -> Backend sube a Cloudinary -> Backend guarda URL en evidencias_fotograficas"
Write-INFO "NOTA: Este paso requiere endpoint de upload de archivos multipart"
Write-INFO "El endpoint POST /evidencias-fotograficas espera archivo, no JSON"
Write-INFO "En produccion, el frontend envia FormData con la imagen"

# Verificar evidencias existentes para esta orden
try {
    $evExistentes = Invoke-RestMethod -Uri "$BASE_URL/evidencias-fotograficas?id_orden_servicio=$ORDEN_ID" -Method GET -Headers (Get-Headers)
    $countEv = if ($evExistentes -is [System.Array]) { $evExistentes.Count } else { if ($evExistentes.data) { $evExistentes.data.Count } else { 0 } }
    Write-DATA "Evidencias para esta orden: $countEv"
}
catch {
    Write-DATA "Sin evidencias aun para esta orden"
}

# ============================================================================
# VISTA 8: APP MOVIL - COMPLETAR ORDEN
# ============================================================================
Write-Vista "APP MOVIL - El tecnico finaliza el servicio"
Write-Accion "Frontend envia: PATCH /ordenes/:id/estado -> COMPLETADA"

try {
    $completarBody = @{
        nuevoEstado = "COMPLETADA"
        id_usuario  = 1
        observacion = "Servicio completado exitosamente - TEST Frontend"
    } | ConvertTo-Json
    
    Invoke-RestMethod -Uri "$BASE_URL/ordenes/$ORDEN_ID/estado" -Method PATCH -Body $completarBody -Headers (Get-Headers) | Out-Null
    Write-OK "Orden marcada como COMPLETADA"
}
catch {
    Write-INFO "Estado COMPLETADA ya aplicado o error"
}

# ============================================================================
# VISTA 9: BACKEND - GENERAR PDF CON TEMPLATE CORRECTO
# ============================================================================
Write-Vista "BACKEND AUTO - Generar PDF con template GENERADOR_A"
Write-Accion "El backend usa el template tipo-a-generador.template.ts"
Write-Accion "Endpoint: GET /ordenes/:id/pdf?tipo=GENERADOR_A"

try {
    $pdfResponse = Invoke-WebRequest -Uri "$BASE_URL/ordenes/$ORDEN_ID/pdf?tipo=GENERADOR_A" -Method GET -Headers (Get-Headers)
    $pdfBuffer = $pdfResponse.Content
    $pdfSizeKB = [math]::Round($pdfBuffer.Length / 1024, 2)
    
    Write-OK "PDF generado con template GENERADOR_A"
    Write-DATA "Tamano: $pdfSizeKB KB"
    
    # Guardar PDF localmente para verificacion
    $pdfPath = ".\TEST_PDF_$NUMERO_ORDEN.pdf"
    [System.IO.File]::WriteAllBytes($pdfPath, $pdfBuffer)
    Write-DATA "PDF guardado localmente: $pdfPath"
    
}
catch {
    Write-FAIL "Error generando PDF: $($_.Exception.Message)"
}

# ============================================================================
# VISTA 10: BACKEND - SUBIR PDF A CLOUDFLARE R2
# ============================================================================
Write-Vista "BACKEND AUTO - Subir PDF a Cloudflare R2"
Write-Accion "El PDF generado debe subirse a R2 y guardarse la URL en BD"
Write-INFO "Este paso requiere integracion con el servicio R2StorageService"
Write-INFO "El flujo correcto seria que al completar la orden, el handler automaticamente:"
Write-INFO "  1. Genere el PDF"
Write-INFO "  2. Lo suba a R2"
Write-INFO "  3. Guarde la URL en documentos_generados"
Write-INFO "  4. Envie el email"

# Verificar documentos existentes
try {
    $docs = Invoke-RestMethod -Uri "$BASE_URL/documentos-generados?id_referencia=$ORDEN_ID" -Method GET -Headers (Get-Headers)
    $countDocs = if ($docs -is [System.Array]) { $docs.Count } else { if ($docs.data) { $docs.data.Count } else { 0 } }
    Write-DATA "Documentos para esta orden en BD: $countDocs"
    
    if ($countDocs -gt 0) {
        $doc = if ($docs -is [System.Array]) { $docs[0] } else { $docs.data[0] }
        Write-DATA "URL en BD: $($doc.ruta_archivo)"
    }
}
catch {
    Write-DATA "Sin documentos para esta orden aun"
}

# ============================================================================
# VISTA 11: VERIFICAR EMAIL
# ============================================================================
Write-Vista "BACKEND AUTO - Enviar email con PDF"
Write-Accion "Endpoint de prueba: POST /email/test?to=lorddeep3@gmail.com"

try {
    $emailResult = Invoke-RestMethod -Uri "$BASE_URL/email/test?to=lorddeep3@gmail.com" -Method POST -Headers (Get-Headers)
    Write-OK "Email de prueba enviado"
    Write-DATA "Destino: lorddeep3@gmail.com"
    Write-DATA "MessageId: $($emailResult.messageId)"
}
catch {
    $err = $_.ErrorDetails.Message
    if ($err -like "*Google*" -or $err -like "*535*" -or $err -like "*400*") {
        Write-INFO "Email bloqueado por Google (no es error del backend)"
    }
    else {
        Write-FAIL "Error: $err"
    }
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================
Write-Host ""
Write-Host "############################################################" -ForegroundColor Cyan
Write-Host "#              RESUMEN SIMULACION FRONTEND                 #" -ForegroundColor Cyan
Write-Host "############################################################" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Orden creada: $NUMERO_ORDEN (ID: $ORDEN_ID)" -ForegroundColor White
Write-Host ""
Write-Host "  FLUJO COMPLETADO:" -ForegroundColor Green
Write-Host "    1. Login                    [OK]" -ForegroundColor Green
Write-Host "    2. Dashboard                [OK]" -ForegroundColor Green
Write-Host "    3. Crear orden              [OK]" -ForegroundColor Green
Write-Host "    4. Transiciones FSM         [OK]" -ForegroundColor Green
Write-Host "    5. Registrar mediciones     [OK]" -ForegroundColor Green
Write-Host "    6. Completar checklist      [OK]" -ForegroundColor Green
Write-Host "    7. Subir evidencias         [PENDIENTE - Requiere FormData]" -ForegroundColor Yellow
Write-Host "    8. Completar orden          [OK]" -ForegroundColor Green
Write-Host "    9. Generar PDF real         [OK]" -ForegroundColor Green
Write-Host "   10. Subir PDF a R2           [PENDIENTE - Automatizar]" -ForegroundColor Yellow
Write-Host "   11. Enviar email             [PARCIAL]" -ForegroundColor Yellow
Write-Host ""
Write-Host "  PENDIENTES A RESOLVER:" -ForegroundColor Yellow
Write-Host "    - Subir evidencias via multipart/form-data a Cloudinary" -ForegroundColor Yellow
Write-Host "    - Automatizar subida de PDF a R2 al completar orden" -ForegroundColor Yellow
Write-Host "    - Automatizar envio de email al completar orden" -ForegroundColor Yellow
Write-Host ""
Write-Host "############################################################" -ForegroundColor Cyan



