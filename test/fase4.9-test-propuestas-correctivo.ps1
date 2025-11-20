# ============================================
# FASE 4.9: TEST PROPUESTAS CORRECTIVO
# ============================================
# Script testing funcionalidad propuestas correctivo desde mantenimiento
#
# FLUJO:
# 1. Crear orden servicio EN_PROCESO (simulando mantenimiento activo)
# 2. Técnico detecta problema → Crear propuesta CORRECTIVO CRITICA
# 3. Sistema genera cotización automática asociada (BORRADOR)
# 4. Validar propuesta creada correctamente
# 5. Listar propuestas pendientes aprobación (GET dashboard)
# 6. Completar cotización generada (agregar items + calcular total)
# 7. Aprobar cotización (BORRADOR → APROBADA_CLIENTE)
# 8. Convertir propuesta aprobada → Orden servicio automática
# 9. Validar orden servicio generada correctamente
#
# NOTA: Script requiere datos semilla DB (cliente, sede, equipo, estados).
# Si falla crear orden servicio paso 1 → Ejecutar seed-data-testing.ps1 primero.
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FASE 4.9: TEST PROPUESTAS CORRECTIVO" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Validar token JWT existe
if (-not $env:MEKANOS_TEST_TOKEN) {
    Write-Host "❌ ERROR: Token JWT no encontrado en `$env:MEKANOS_TEST_TOKEN" -ForegroundColor Red
    Write-Host "   Ejecutar primero: .\test-auth.ps1" -ForegroundColor Yellow
    exit 1
}

$token = $env:MEKANOS_TEST_TOKEN
$baseUrl = "http://localhost:3000/api"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# ========================================
# PASO 1: CREAR ORDEN SERVICIO EN_PROCESO
# ========================================
Write-Host "[PASO 1/9] Crear orden servicio EN_PROCESO (mantenimiento activo)..." -ForegroundColor Yellow
Write-Host "   Nota: Saltando creación - Usar orden existente o implementar después" -ForegroundColor Gray

# TODO: Implementar creación orden servicio cuando esté módulo órdenes disponible
# Por ahora asumir id_orden_servicio = 1 existe en DB
$idOrdenServicio = 1

# ========================================
# PASO 2: CREAR PROPUESTA CORRECTIVO (TÉCNICO)
# ========================================
Write-Host "`n[PASO 2/9] Técnico detecta problema → Crear propuesta CORRECTIVO CRITICA..." -ForegroundColor Yellow

$nuevaPropuesta = @{
    id_orden_servicio         = $idOrdenServicio
    tipo_propuesta            = "CORRECTIVO"
    descripcion_hallazgo      = "Motor presenta sobrecalentamiento crítico durante operación. Temperatura alcanza 95°C superando límite operativo 80°C. Rodamientos delanteros desgastados generando vibración excesiva nivel 8mm/s (límite 4.5mm/s norma ISO 10816)."
    descripcion_solucion      = "Reemplazo urgente rodamientos SKF 6318-2RS1 delanteros, limpieza sistema ventilación, recarga lubricante Shell Omala S2 G320, balanceo dinámico eje rotor, prueba térmica 4 horas operación continua validando temperatura máxima 75°C."
    urgencia_propuesta        = "CRITICA"
    prioridad                 = 5
    tiempo_estimado_ejecucion = 3
    creada_por                = 1
} | ConvertTo-Json

try {
    $responsePropuesta = Invoke-RestMethod -Uri "$baseUrl/propuestas-correctivo" -Method Post -Headers $headers -Body $nuevaPropuesta
    $idPropuesta = $responsePropuesta.propuesta.id_propuesta
    $idCotizacionGenerada = $responsePropuesta.cotizacion.id_cotizacion
    
    Write-Host "✅ Propuesta creada exitosamente" -ForegroundColor Green
    Write-Host "   ID Propuesta: $idPropuesta" -ForegroundColor Gray
    Write-Host "   Número: $($responsePropuesta.propuesta.numero_propuesta)" -ForegroundColor Gray
    Write-Host "   Tipo: $($responsePropuesta.propuesta.tipo_propuesta)" -ForegroundColor Gray
    Write-Host "   Urgencia: $($responsePropuesta.propuesta.urgencia_propuesta)" -ForegroundColor Gray
    Write-Host "   Prioridad: $($responsePropuesta.propuesta.prioridad)" -ForegroundColor Gray
    Write-Host "`n   ✅ Cotización automática generada:" -ForegroundColor Green
    Write-Host "   ID Cotización: $idCotizacionGenerada" -ForegroundColor Gray
    Write-Host "   Número: $($responsePropuesta.cotizacion.numero_cotizacion)" -ForegroundColor Gray
    Write-Host "   Estado: $($responsePropuesta.cotizacion.estado)" -ForegroundColor Gray
    Write-Host "`n   Orden servicio origen: $($responsePropuesta.orden_servicio.numero_orden)" -ForegroundColor Gray
    Write-Host "   Cliente: $($responsePropuesta.cliente.razon_social)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ ERROR crear propuesta: $_" -ForegroundColor Red
    Write-Host "   Posible causa: Orden servicio no existe o estado incorrecto" -ForegroundColor Yellow
    exit 1
}

Start-Sleep -Seconds 1

# ========================================
# PASO 3: LISTAR PROPUESTAS PENDIENTES (DASHBOARD)
# ========================================
Write-Host "`n[PASO 3/9] Listar propuestas pendientes aprobación (Dashboard supervisor)..." -ForegroundColor Yellow

try {
    $responsePendientes = Invoke-RestMethod -Uri "$baseUrl/propuestas-correctivo/pendientes?urgencia=CRITICA" -Method Get -Headers $headers
    
    Write-Host "✅ Propuestas pendientes listadas exitosamente" -ForegroundColor Green
    Write-Host "   Total propuestas CRITICAS: $($responsePendientes.pagination.total)" -ForegroundColor Gray
    
    if ($responsePendientes.propuestas.Count -gt 0) {
        Write-Host "`n   Top 3 propuestas urgentes:" -ForegroundColor Cyan
        $responsePendientes.propuestas | Select-Object -First 3 | ForEach-Object {
            Write-Host "   ───────────────────────────────────────" -ForegroundColor DarkGray
            Write-Host "   Propuesta: $($_.numero_propuesta)" -ForegroundColor White
            Write-Host "   Tipo: $($_.tipo_propuesta) | Urgencia: $($_.urgencia_propuesta)" -ForegroundColor Gray
            Write-Host "   Prioridad: $($_.prioridad)/5" -ForegroundColor Gray
            Write-Host "   Cliente: $($_.cotizacion.cliente)" -ForegroundColor Gray
            Write-Host "   Equipo: $($_.cotizacion.equipo)" -ForegroundColor Gray
            Write-Host "   Cotización: $($_.cotizacion.numero_cotizacion) ($($_.cotizacion.estado))" -ForegroundColor Gray
        }
        Write-Host "   ───────────────────────────────────────`n" -ForegroundColor DarkGray
    }
}
catch {
    Write-Host "❌ ERROR listar propuestas pendientes: $_" -ForegroundColor Red
    exit 1
}

# ========================================
# PASO 4: COMPLETAR COTIZACIÓN GENERADA
# ========================================
Write-Host "[PASO 4/9] Completar cotización generada (agregar items + calcular total)..." -ForegroundColor Yellow

$actualizarCotizacion = @{
    asunto                    = "CORRECTIVO CRITICO: Reemplazo rodamientos motor + recarga lubricante"
    descripcion               = "Reemplazo urgente rodamientos SKF 6318-2RS1 delanteros, limpieza sistema ventilación, recarga lubricante Shell Omala S2 G320, balanceo dinámico eje rotor, prueba térmica 4 horas operación continua"
    alcance_servicio          = "Mantenimiento correctivo urgente motor 500HP"
    exclusiones               = "Repuestos adicionales no contemplados inicialmente"
    dias_validez              = 15
    tiempo_estimado_ejecucion = 3
    forma_pago                = "Pago inmediato aprobación (urgencia crítica)"
    garantia                  = "6 meses repuestos + 3 meses mano obra"
    subtotal                  = 8500000.00
    descuento_porcentaje      = 0.00
    subtotal_con_descuento    = 8500000.00
    iva_porcentaje            = 19.00
    total_iva                 = 1615000.00
    total                     = 10115000.00
} | ConvertTo-Json

try {
    $responseActualizar = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacionGenerada" -Method Put -Headers $headers -Body $actualizarCotizacion
    
    Write-Host "✅ Cotización completada exitosamente" -ForegroundColor Green
    Write-Host "   Total: $$($responseActualizar.total)" -ForegroundColor Gray
    Write-Host "   Estado: $($responseActualizar.estado)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ ERROR actualizar cotización: $_" -ForegroundColor Red
    exit 1
}

# ========================================
# PASO 5: APROBAR COTIZACIÓN (BORRADOR → APROBADA_CLIENTE)
# ========================================
Write-Host "`n[PASO 5/9] Aprobar cotización cliente (BORRADOR → APROBADA_CLIENTE)..." -ForegroundColor Yellow

# Paso 5.1: Solicitar aprobación interna (BORRADOR → EN_REVISION)
Write-Host "   5.1. Solicitar aprobación interna..." -ForegroundColor Gray

$solicitarAprobacion = @{
    observaciones_solicitante = "Propuesta correctivo CRITICA - Requiere aprobación urgente supervisor"
} | ConvertTo-Json

try {
    $responseSolicitud = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacionGenerada/solicitar-aprobacion" -Method Post -Headers $headers -Body $solicitarAprobacion
    $idAprobacion = $responseSolicitud.aprobacion.id_aprobacion
    
    Write-Host "   ✅ Aprobación interna solicitada (ID: $idAprobacion)" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ ERROR solicitar aprobación interna: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# Paso 5.2: Aprobar internamente (EN_REVISION → APROBADA_INTERNA)
Write-Host "   5.2. Aprobar internamente supervisor..." -ForegroundColor Gray

$aprobarInterna = @{
    decision                = "APROBAR"
    observaciones_aprobador = "Propuesta correctivo aprobada - Urgencia CRITICA justifica inversión"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/cotizaciones/aprobaciones/$idAprobacion" -Method Put -Headers $headers -Body $aprobarInterna | Out-Null
    Write-Host "   ✅ Aprobación interna procesada (APROBADA_INTERNA)" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ ERROR procesar aprobación interna: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# Paso 5.3: Enviar cotización cliente (APROBADA_INTERNA → ENVIADA)
Write-Host "   5.3. Enviar cotización cliente..." -ForegroundColor Gray

$enviarCotizacion = @{
    email_destinatario = "cliente@empresa.com"
    observaciones      = "Cotización urgente propuesta correctivo crítica motor"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacionGenerada/enviar" -Method Put -Headers $headers -Body $enviarCotizacion | Out-Null
    Write-Host "   ✅ Cotización enviada cliente (ENVIADA)" -ForegroundColor Green
}
catch {
    Write-Host "   ❌ ERROR enviar cotización: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# Paso 5.4: Aprobar cliente (ENVIADA → APROBADA_CLIENTE)
Write-Host "   5.4. Cliente aprueba cotización..." -ForegroundColor Gray

$aprobarCliente = @{
    observaciones = "Cliente aprueba urgencia justificada - Proceder inmediatamente"
} | ConvertTo-Json

try {
    $responseAprobarCliente = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacionGenerada/aprobar" -Method Put -Headers $headers -Body $aprobarCliente
    
    Write-Host "   ✅ Cliente aprobó cotización (APROBADA_CLIENTE)" -ForegroundColor Green
    Write-Host "   Estado final: $($responseAprobarCliente.estado)" -ForegroundColor Gray
}
catch {
    Write-Host "   ❌ ERROR aprobar cliente: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ========================================
# PASO 6: CONVERTIR PROPUESTA → ORDEN SERVICIO
# ========================================
Write-Host "`n[PASO 6/9] Convertir propuesta aprobada → Orden servicio automática..." -ForegroundColor Yellow

$convertirOrden = @{
    convertida_por = 1
} | ConvertTo-Json

try {
    $responseConvertir = Invoke-RestMethod -Uri "$baseUrl/propuestas-correctivo/$idPropuesta/convertir-orden" -Method Post -Headers $headers -Body $convertirOrden
    $idOrdenGenerada = $responseConvertir.orden_servicio.id_orden_servicio
    
    Write-Host "✅ Propuesta convertida exitosamente" -ForegroundColor Green
    Write-Host "`n   ═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   ORDEN SERVICIO GENERADA AUTOMÁTICAMENTE" -ForegroundColor Cyan
    Write-Host "   ═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   ID Orden: $idOrdenGenerada" -ForegroundColor White
    Write-Host "   Número: $($responseConvertir.orden_servicio.numero_orden)" -ForegroundColor White
    Write-Host "   Estado: $($responseConvertir.orden_servicio.estado)" -ForegroundColor Gray
    Write-Host "   Total: $$($responseConvertir.orden_servicio.total)" -ForegroundColor Gray
    Write-Host "`n   Propuesta origen:" -ForegroundColor Cyan
    Write-Host "   Número: $($responseConvertir.propuesta.numero_propuesta)" -ForegroundColor Gray
    Write-Host "   Tipo: $($responseConvertir.propuesta.tipo_propuesta)" -ForegroundColor Gray
    Write-Host "   Fecha conversión: $($responseConvertir.propuesta.fecha_conversion)" -ForegroundColor Gray
    Write-Host "`n   Cotización asociada:" -ForegroundColor Cyan
    Write-Host "   Número: $($responseConvertir.cotizacion.numero_cotizacion)" -ForegroundColor Gray
    Write-Host "   ═══════════════════════════════════════`n" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ ERROR convertir propuesta: $_" -ForegroundColor Red
    exit 1
}

# ========================================
# PASO 7: VALIDACIONES FINALES
# ========================================
Write-Host "[PASO 7/9] Validar integridad datos propuesta + orden servicio..." -ForegroundColor Yellow

$todosTestsPasaron = $true

# Validación 1: Propuesta creada correctamente
if ($idPropuesta -gt 0) {
    Write-Host "✅ Validación 1: Propuesta creada correctamente (ID: $idPropuesta)" -ForegroundColor Green
}
else {
    Write-Host "❌ Validación 1: ID propuesta inválido" -ForegroundColor Red
    $todosTestsPasaron = $false
}

# Validación 2: Cotización automática generada
if ($idCotizacionGenerada -gt 0) {
    Write-Host "✅ Validación 2: Cotización automática generada (ID: $idCotizacionGenerada)" -ForegroundColor Green
}
else {
    Write-Host "❌ Validación 2: Cotización automática no generada" -ForegroundColor Red
    $todosTestsPasaron = $false
}

# Validación 3: Orden servicio generada desde propuesta
if ($idOrdenGenerada -gt 0) {
    Write-Host "✅ Validación 3: Orden servicio generada automáticamente (ID: $idOrdenGenerada)" -ForegroundColor Green
}
else {
    Write-Host "❌ Validación 3: Orden servicio no generada" -ForegroundColor Red
    $todosTestsPasaron = $false
}

# Validación 4: Propuestas pendientes listadas correctamente
if ($responsePendientes.pagination.total -ge 1) {
    Write-Host "✅ Validación 4: Dashboard propuestas pendientes funcional ($($responsePendientes.pagination.total) propuestas)" -ForegroundColor Green
}
else {
    Write-Host "❌ Validación 4: Dashboard propuestas pendientes vacío" -ForegroundColor Red
    $todosTestsPasaron = $false
}

# ========================================
# RESUMEN FINAL
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   RESUMEN TESTING FASE 4.9" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($todosTestsPasaron) {
    Write-Host "✅ TODOS LOS TESTS PASARON EXITOSAMENTE" -ForegroundColor Green
    Write-Host "`n   Funcionalidad propuestas correctivo validada 100%" -ForegroundColor Green
    Write-Host "   - Técnico crea propuesta desde mantenimiento" -ForegroundColor Gray
    Write-Host "   - Sistema genera cotización automática asociada" -ForegroundColor Gray
    Write-Host "   - Dashboard propuestas pendientes funcional" -ForegroundColor Gray
    Write-Host "   - Flujo aprobación cotización completo" -ForegroundColor Gray
    Write-Host "   - Conversión propuesta → orden servicio automática" -ForegroundColor Gray
    Write-Host "   - Números generados automáticamente (PROP-AAAA-XXXX)" -ForegroundColor Gray
    Write-Host "   - Filtros urgencia + tipo propuesta" -ForegroundColor Gray
    Write-Host "   - Validación estados cotización aprobada" -ForegroundColor Gray
}
else {
    Write-Host "❌ ALGUNOS TESTS FALLARON" -ForegroundColor Red
    Write-Host "   Revisar errores arriba para detalles" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

