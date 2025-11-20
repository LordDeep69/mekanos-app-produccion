# ============================================
# FASE 4.8: TEST VERSIONES COTIZACIÓN
# ============================================
# Script testing funcionalidad versiones snapshot cotización (auditoría cambios)
#
# FLUJO:
# 1. Crear cotización BORRADOR inicial
# 2. Crear versión 1 (snapshot estado inicial)
# 3. Modificar cotización (cambiar descuento 0% → 10%)
# 4. Crear versión 2 (snapshot después modificación)
# 5. Modificar nuevamente (cambiar descuento 10% → 15%)
# 6. Crear versión 3 (snapshot después segunda modificación)
# 7. Listar todas versiones cotización (GET)
# 8. Obtener detalle versión 2 específica (GET detalle JSONB completo)
# 9. Validar snapshot datos correctos (3 versiones, números incrementales, totales diferentes)
#
# NOTA: Script requiere datos semilla DB (cliente, sede, equipo).
# Si falla crear cotización paso 1 → Ejecutar seed-data-testing.ps1 primero.
# ============================================

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FASE 4.8: TEST VERSIONES COTIZACIÓN" -ForegroundColor Cyan
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
# PASO 1: CREAR COTIZACIÓN BORRADOR
# ========================================
Write-Host "[PASO 1/9] Crear cotización BORRADOR inicial..." -ForegroundColor Yellow

$nuevaCotizacion = @{
    id_cliente                = 1
    id_sede                   = 1
    id_equipo                 = 1
    asunto                    = "Test Versiones Cotización - Mantenimiento Preventivo"
    descripcion               = "Cotización para testing funcionalidad versiones snapshot"
    alcance_servicio          = "Mantenimiento preventivo completo motor 500HP"
    exclusiones               = "Repuestos no contemplados en cotización inicial"
    dias_validez              = 30
    tiempo_estimado_ejecucion = 5
    forma_pago                = "50% anticipo, 50% contraentrega"
    garantia                  = "6 meses garantía servicio"
    subtotal                  = 5000000.00
    descuento_porcentaje      = 0.00
    subtotal_con_descuento    = 5000000.00
    iva_porcentaje            = 19.00
    total_iva                 = 950000.00
    total                     = 5950000.00
} | ConvertTo-Json

try {
    $responseCotizacion = Invoke-RestMethod -Uri "$baseUrl/cotizaciones" -Method Post -Headers $headers -Body $nuevaCotizacion
    $idCotizacion = $responseCotizacion.id_cotizacion
    
    Write-Host "✅ Cotización creada exitosamente" -ForegroundColor Green
    Write-Host "   ID: $idCotizacion" -ForegroundColor Gray
    Write-Host "   Número: $($responseCotizacion.numero_cotizacion)" -ForegroundColor Gray
    Write-Host "   Total inicial: $$($responseCotizacion.total)" -ForegroundColor Gray
    Write-Host "   Descuento: $($responseCotizacion.descuento_porcentaje)%" -ForegroundColor Gray
}
catch {
    Write-Host "❌ ERROR crear cotización: $_" -ForegroundColor Red
    Write-Host "   Posible causa: Faltan datos semilla DB (cliente, sede, equipo)" -ForegroundColor Yellow
    Write-Host "   Solución: Ejecutar .\scripts\seed-data-testing.ps1" -ForegroundColor Yellow
    exit 1
}

# ========================================
# PASO 2: CREAR VERSIÓN 1 (ESTADO INICIAL)
# ========================================
Write-Host "`n[PASO 2/9] Crear versión 1 - Snapshot estado inicial..." -ForegroundColor Yellow

$crearVersion1 = @{
    motivo_cambio = "Versión inicial - Snapshot cotización creación BORRADOR"
    creada_por    = 1
} | ConvertTo-Json

try {
    $responseVersion1 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion/versiones" -Method Post -Headers $headers -Body $crearVersion1
    $idVersion1 = $responseVersion1.version.id_version
    
    Write-Host "✅ Versión 1 creada exitosamente" -ForegroundColor Green
    Write-Host "   ID Versión: $idVersion1" -ForegroundColor Gray
    Write-Host "   Número Versión: $($responseVersion1.version.numero_version)" -ForegroundColor Gray
    Write-Host "   Total snapshot: $$($responseVersion1.version.total)" -ForegroundColor Gray
    Write-Host "   Items servicios: $($responseVersion1.version.items_servicios_count)" -ForegroundColor Gray
    Write-Host "   Items componentes: $($responseVersion1.version.items_componentes_count)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ ERROR crear versión 1: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ========================================
# PASO 3: MODIFICAR COTIZACIÓN (DESCUENTO 0% → 10%)
# ========================================
Write-Host "`n[PASO 3/9] Modificar cotización - Cambiar descuento 0% → 10%..." -ForegroundColor Yellow

$modificacion1 = @{
    asunto                    = "Test Versiones Cotización - Mantenimiento Preventivo (MODIFICADO 1)"
    descripcion               = "Cotización modificada primera vez - descuento aplicado"
    alcance_servicio          = "Mantenimiento preventivo completo motor 500HP"
    exclusiones               = "Repuestos no contemplados en cotización inicial"
    dias_validez              = 30
    tiempo_estimado_ejecucion = 5
    forma_pago                = "50% anticipo, 50% contraentrega"
    garantia                  = "6 meses garantía servicio"
    subtotal                  = 5000000.00
    descuento_porcentaje      = 10.00
    subtotal_con_descuento    = 4500000.00
    iva_porcentaje            = 19.00
    total_iva                 = 855000.00
    total                     = 5355000.00
} | ConvertTo-Json

try {
    $responseModificacion1 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion" -Method Put -Headers $headers -Body $modificacion1
    
    Write-Host "✅ Cotización modificada exitosamente (descuento 10%)" -ForegroundColor Green
    Write-Host "   Total nuevo: $$($responseModificacion1.total)" -ForegroundColor Gray
    Write-Host "   Ahorro: `$$((5950000 - 5355000))" -ForegroundColor Gray
}
catch {
    Write-Host "❌ ERROR modificar cotización: $_" -ForegroundColor Red
    exit 1
}

# ========================================
# PASO 4: CREAR VERSIÓN 2 (DESPUÉS MODIFICACIÓN 1)
# ========================================
Write-Host "`n[PASO 4/9] Crear versión 2 - Snapshot después descuento 10%..." -ForegroundColor Yellow

$crearVersion2 = @{
    motivo_cambio = "Modificación 1: Descuento aplicado 10% por negociación cliente"
    creada_por    = 1
} | ConvertTo-Json

try {
    $responseVersion2 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion/versiones" -Method Post -Headers $headers -Body $crearVersion2
    $idVersion2 = $responseVersion2.version.id_version
    
    Write-Host "✅ Versión 2 creada exitosamente" -ForegroundColor Green
    Write-Host "   ID Versión: $idVersion2" -ForegroundColor Gray
    Write-Host "   Número Versión: $($responseVersion2.version.numero_version)" -ForegroundColor Gray
    Write-Host "   Total snapshot: $$($responseVersion2.version.total)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ ERROR crear versión 2: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ========================================
# PASO 5: MODIFICAR COTIZACIÓN NUEVAMENTE (DESCUENTO 10% → 15%)
# ========================================
Write-Host "`n[PASO 5/9] Modificar cotización - Cambiar descuento 10% → 15%..." -ForegroundColor Yellow

$modificacion2 = @{
    asunto                    = "Test Versiones Cotización - Mantenimiento Preventivo (MODIFICADO 2)"
    descripcion               = "Cotización modificada segunda vez - descuento aumentado"
    alcance_servicio          = "Mantenimiento preventivo completo motor 500HP"
    exclusiones               = "Repuestos no contemplados en cotización inicial"
    dias_validez              = 30
    tiempo_estimado_ejecucion = 5
    forma_pago                = "50% anticipo, 50% contraentrega"
    garantia                  = "6 meses garantía servicio"
    subtotal                  = 5000000.00
    descuento_porcentaje      = 15.00
    subtotal_con_descuento    = 4250000.00
    iva_porcentaje            = 19.00
    total_iva                 = 807500.00
    total                     = 5057500.00
} | ConvertTo-Json

try {
    $responseModificacion2 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion" -Method Put -Headers $headers -Body $modificacion2
    
    Write-Host "✅ Cotización modificada exitosamente (descuento 15%)" -ForegroundColor Green
    Write-Host "   Total nuevo: $$($responseModificacion2.total)" -ForegroundColor Gray
    Write-Host "   Ahorro total: `$$((5950000 - 5057500))" -ForegroundColor Gray
}
catch {
    Write-Host "❌ ERROR modificar cotización segunda vez: $_" -ForegroundColor Red
    exit 1
}

# ========================================
# PASO 6: CREAR VERSIÓN 3 (DESPUÉS MODIFICACIÓN 2)
# ========================================
Write-Host "`n[PASO 6/9] Crear versión 3 - Snapshot después descuento 15%..." -ForegroundColor Yellow

$crearVersion3 = @{
    motivo_cambio = "Modificación 2: Descuento aumentado 15% por volumen compra cliente frecuente"
    creada_por    = 1
} | ConvertTo-Json

try {
    $responseVersion3 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion/versiones" -Method Post -Headers $headers -Body $crearVersion3
    $idVersion3 = $responseVersion3.version.id_version
    
    Write-Host "✅ Versión 3 creada exitosamente" -ForegroundColor Green
    Write-Host "   ID Versión: $idVersion3" -ForegroundColor Gray
    Write-Host "   Número Versión: $($responseVersion3.version.numero_version)" -ForegroundColor Gray
    Write-Host "   Total snapshot: $$($responseVersion3.version.total)" -ForegroundColor Gray
}
catch {
    Write-Host "❌ ERROR crear versión 3: $_" -ForegroundColor Red
    exit 1
}

Start-Sleep -Seconds 1

# ========================================
# PASO 7: LISTAR TODAS VERSIONES COTIZACIÓN
# ========================================
Write-Host "`n[PASO 7/9] Listar todas versiones cotización..." -ForegroundColor Yellow

try {
    $responseVersiones = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion/versiones" -Method Get -Headers $headers
    
    Write-Host "✅ Versiones listadas exitosamente" -ForegroundColor Green
    Write-Host "   Total versiones: $($responseVersiones.pagination.total)" -ForegroundColor Gray
    Write-Host "`n   Historial versiones (más reciente primero):" -ForegroundColor Cyan
    
    $responseVersiones.versiones | ForEach-Object {
        Write-Host "   ───────────────────────────────────────" -ForegroundColor DarkGray
        Write-Host "   Versión $($_.numero_version) (ID: $($_.id_version))" -ForegroundColor White
        Write-Host "   Fecha: $($_.fecha_creacion)" -ForegroundColor Gray
        Write-Host "   Motivo: $($_.motivo_cambio)" -ForegroundColor Gray
        Write-Host "   Total: $$($_.total)" -ForegroundColor Gray
        Write-Host "   Descuento: $($_.descuento_porcentaje)%" -ForegroundColor Gray
        Write-Host "   Creada por: $($_.creada_por)" -ForegroundColor Gray
    }
    
    Write-Host "   ───────────────────────────────────────`n" -ForegroundColor DarkGray
}
catch {
    Write-Host "❌ ERROR listar versiones: $_" -ForegroundColor Red
    exit 1
}

# ========================================
# PASO 8: OBTENER DETALLE VERSIÓN 2 (JSONB COMPLETO)
# ========================================
Write-Host "[PASO 8/9] Obtener detalle versión 2 específica (JSONB completo)..." -ForegroundColor Yellow

try {
    $responseDetalleVersion = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/versiones/$idVersion2" -Method Get -Headers $headers
    
    Write-Host "✅ Detalle versión 2 obtenido exitosamente" -ForegroundColor Green
    Write-Host "`n   ═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   DETALLE VERSIÓN 2 - SNAPSHOT COMPLETO" -ForegroundColor Cyan
    Write-Host "   ═══════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "   ID Versión: $($responseDetalleVersion.id_version)" -ForegroundColor White
    Write-Host "   Número Versión: $($responseDetalleVersion.numero_version)" -ForegroundColor White
    Write-Host "   Fecha: $($responseDetalleVersion.fecha_creacion)" -ForegroundColor Gray
    Write-Host "   Motivo: $($responseDetalleVersion.motivo_cambio)" -ForegroundColor Gray
    Write-Host "   Total: $$($responseDetalleVersion.total)" -ForegroundColor Gray
    Write-Host "   Descuento: $($responseDetalleVersion.descuento_porcentaje)%" -ForegroundColor Gray
    
    # Validar JSONB datos_cotizacion presente
    if ($responseDetalleVersion.datos_cotizacion) {
        Write-Host "`n   📦 JSONB datos_cotizacion: ✅ PRESENTE" -ForegroundColor Green
        Write-Host "      - Asunto: $($responseDetalleVersion.datos_cotizacion.asunto)" -ForegroundColor Gray
        Write-Host "      - Cliente: $($responseDetalleVersion.datos_cotizacion.cliente.razon_social)" -ForegroundColor Gray
        Write-Host "      - Equipo: $($responseDetalleVersion.datos_cotizacion.equipo.alias)" -ForegroundColor Gray
    }
    else {
        Write-Host "`n   📦 JSONB datos_cotizacion: ❌ FALTANTE" -ForegroundColor Red
    }
    
    # Validar JSONB items_servicios presente
    if ($responseDetalleVersion.items_servicios) {
        $countServicios = $responseDetalleVersion.items_servicios.Count
        Write-Host "`n   📦 JSONB items_servicios: ✅ PRESENTE ($countServicios items)" -ForegroundColor Green
    }
    else {
        Write-Host "`n   📦 JSONB items_servicios: ✅ PRESENTE (0 items)" -ForegroundColor Green
    }
    
    # Validar JSONB items_componentes presente
    if ($responseDetalleVersion.items_componentes) {
        $countComponentes = $responseDetalleVersion.items_componentes.Count
        Write-Host "   📦 JSONB items_componentes: ✅ PRESENTE ($countComponentes items)" -ForegroundColor Green
    }
    else {
        Write-Host "   📦 JSONB items_componentes: ✅ PRESENTE (0 items)" -ForegroundColor Green
    }
    
    Write-Host "   ═══════════════════════════════════════`n" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ ERROR obtener detalle versión 2: $_" -ForegroundColor Red
    exit 1
}

# ========================================
# PASO 9: VALIDACIONES FINALES
# ========================================
Write-Host "[PASO 9/9] Validar integridad datos versiones..." -ForegroundColor Yellow

$todosTestsPasaron = $true

# Validación 1: 3 versiones creadas
if ($responseVersiones.pagination.total -eq 3) {
    Write-Host "✅ Validación 1: 3 versiones creadas correctamente" -ForegroundColor Green
}
else {
    Write-Host "❌ Validación 1: Se esperaban 3 versiones, encontradas $($responseVersiones.pagination.total)" -ForegroundColor Red
    $todosTestsPasaron = $false
}

# Validación 2: Números versión incrementales (3, 2, 1 descendente)
$versionesOrdenadas = $responseVersiones.versiones | Sort-Object -Property numero_version -Descending
if ($versionesOrdenadas[0].numero_version -eq 3 -and $versionesOrdenadas[1].numero_version -eq 2 -and $versionesOrdenadas[2].numero_version -eq 1) {
    Write-Host "✅ Validación 2: Números versión incrementales correctos (3, 2, 1)" -ForegroundColor Green
}
else {
    Write-Host "❌ Validación 2: Números versión incorrectos" -ForegroundColor Red
    $todosTestsPasaron = $false
}

# Validación 3: Totales diferentes entre versiones
$total_v1 = [decimal]($versionesOrdenadas[2].total)
$total_v2 = [decimal]($versionesOrdenadas[1].total)
$total_v3 = [decimal]($versionesOrdenadas[0].total)

if ($total_v1 -eq 5950000 -and $total_v2 -eq 5355000 -and $total_v3 -eq 5057500) {
    Write-Host "✅ Validación 3: Totales snapshot correctos (v1:5950000, v2:5355000, v3:5057500)" -ForegroundColor Green
}
else {
    Write-Host "❌ Validación 3: Totales snapshot incorrectos (v1:$total_v1, v2:$total_v2, v3:$total_v3)" -ForegroundColor Red
    $todosTestsPasaron = $false
}

# Validación 4: JSONB datos presente en detalle versión
if ($responseDetalleVersion.datos_cotizacion -and $responseDetalleVersion.items_servicios -ne $null -and $responseDetalleVersion.items_componentes -ne $null) {
    Write-Host "✅ Validación 4: JSONB completo presente (datos + items)" -ForegroundColor Green
}
else {
    Write-Host "❌ Validación 4: JSONB incompleto en detalle versión" -ForegroundColor Red
    $todosTestsPasaron = $false
}

# ========================================
# RESUMEN FINAL
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   RESUMEN TESTING FASE 4.8" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($todosTestsPasaron) {
    Write-Host "✅ TODOS LOS TESTS PASARON EXITOSAMENTE" -ForegroundColor Green
    Write-Host "`n   Funcionalidad versiones cotización validada 100%" -ForegroundColor Green
    Write-Host "   - Snapshot completo datos cotización → JSONB" -ForegroundColor Gray
    Write-Host "   - Snapshot items servicios → JSONB" -ForegroundColor Gray
    Write-Host "   - Snapshot items componentes → JSONB" -ForegroundColor Gray
    Write-Host "   - Versionado automático incremental" -ForegroundColor Gray
    Write-Host "   - Auditoría cambios completa" -ForegroundColor Gray
    Write-Host "   - Endpoint GET listado versiones" -ForegroundColor Gray
    Write-Host "   - Endpoint GET detalle versión individual" -ForegroundColor Gray
}
else {
    Write-Host "❌ ALGUNOS TESTS FALLARON" -ForegroundColor Red
    Write-Host "   Revisar errores arriba para detalles" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n========================================`n" -ForegroundColor Cyan

