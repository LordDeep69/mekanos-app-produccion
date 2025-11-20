# ============================================================
# TEST FASE 4.6 - ENVIAR COTIZACION
# Estado: APROBADA_INTERNA (3) -> ENVIADA (4)
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: Enviar Cotizacion a Cliente" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api"

# Obtener token de variable ambiente
if (-not $env:MEKANOS_TEST_TOKEN) {
  Write-Host "ERROR: Token no encontrado" -ForegroundColor Red
  Write-Host "   Ejecutar primero: .\setup-test-usuario.ps1" -ForegroundColor Yellow
  exit 1
}

$headers = @{
  "Authorization" = "Bearer $env:MEKANOS_TEST_TOKEN"
  "Content-Type"  = "application/json"
}

# 1. Crear cotizacion BORRADOR
Write-Host "[1/5] Creando cotizacion BORRADOR..." -ForegroundColor Yellow
$cotizacion = Invoke-RestMethod -Uri "$baseUrl/cotizaciones" -Method POST -Headers $headers -Body (@{
    id_cliente           = 2
    fecha_cotizacion     = "2025-01-15"
    fecha_vencimiento    = "2025-02-15"
    asunto               = "Mantenimiento preventivo motor CUMMINS"
    elaborada_por        = 1
    id_sede              = 1
    id_equipo            = 1
    descripcion_general  = "Cotizacion para mantenimiento preventivo motor CUMMINS 6BT5.9"
    alcance_trabajo      = "Cambio aceite, filtros, inspeccion general"
    exclusiones          = "No incluye repuestos adicionales"
    descuento_porcentaje = 5.0
    iva_porcentaje       = 19.0
    tiempo_estimado_dias = 3
    forma_pago           = "60 dias fecha factura"
    terminos_condiciones = "Aplican T&C Mekanos S.A.S"
    meses_garantia       = 6
  } | ConvertTo-Json)

$idCotizacion = $cotizacion.id_cotizacion
Write-Host "OK Cotizacion creada ID: $idCotizacion - Estado: BORRADOR`n" -ForegroundColor Green

# 2. Cambiar estado a APROBADA_INTERNA (simular aprobacion interna)
Write-Host "[2/5] Cambiando estado a APROBADA_INTERNA..." -ForegroundColor Yellow
$updated = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion" -Method PUT -Headers $headers -Body (@{
    id_estado      = 3
    modificado_por = 1
  } | ConvertTo-Json)
Write-Host "OK Estado cambiado: $($updated.estado.nombre_estado)`n" -ForegroundColor Green

# 3. ENVIAR COTIZACION
Write-Host "[3/5] ENVIANDO cotizacion a cliente..." -ForegroundColor Magenta
$enviada = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion/enviar" -Method PUT -Headers $headers -Body (@{
    destinatario_email  = "gerencia@hotelcaribe.com"
    destinatario_nombre = "Hotel Caribe Plaza"
    emails_copia        = @("mantenimiento@hotelcaribe.com", "compras@hotelcaribe.com")
  } | ConvertTo-Json)

Write-Host "OK COTIZACION ENVIADA EXITOSAMENTE" -ForegroundColor Green
Write-Host "   Estado: $($enviada.cotizacion.estado.nombre_estado)" -ForegroundColor Green
Write-Host "   Destinatario: $($enviada.historial_envio.destinatario_nombre)" -ForegroundColor Green
Write-Host "   Email: $($enviada.historial_envio.destinatario_email)" -ForegroundColor Green
Write-Host "   Asunto: $($enviada.historial_envio.asunto_email)`n" -ForegroundColor Green

# 4. Validar historial_envios registrado
Write-Host "[4/5] Validando registro historial_envios..." -ForegroundColor Yellow
$historial = Invoke-RestMethod -Uri "$baseUrl/historial-envios" -Method GET -Headers $headers
$envioRegistrado = $historial | Where-Object { $_.id_cotizacion -eq $idCotizacion }
if ($envioRegistrado) {
  Write-Host "OK Historial envio registrado correctamente" -ForegroundColor Green
  Write-Host "   ID Envio: $($envioRegistrado.id_envio)" -ForegroundColor Green
  Write-Host "   Estado Envio: $($envioRegistrado.estado_envio)`n" -ForegroundColor Green
}
else {
  Write-Host "ERROR: Historial envio NO registrado`n" -ForegroundColor Red
}

# 5. Intentar enviar nuevamente (debe fallar)
Write-Host "[5/5] Intentando enviar nuevamente (debe fallar)..." -ForegroundColor Yellow
try {
  Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion/enviar" -Method PUT -Headers $headers -Body (@{
      destinatario_email  = "otro@cliente.com"
      destinatario_nombre = "Otro Cliente"
    } | ConvertTo-Json) -ErrorAction Stop
  Write-Host "ERROR: Permitio enviar cotizacion ya ENVIADA`n" -ForegroundColor Red
}
catch {
  Write-Host "OK Validacion correcta: No permite enviar cotizacion ya ENVIADA`n" -ForegroundColor Green
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan