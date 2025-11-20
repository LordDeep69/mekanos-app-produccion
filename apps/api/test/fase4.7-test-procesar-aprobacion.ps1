# ============================================================
# TEST FASE 4.7 - PROCESAR APROBACION (APROBAR/RECHAZAR)
# Flujo: EN_REVISION → APROBADA_INTERNA / BORRADOR
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: Procesar Aprobación Interna" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api"

# Crear cotización requiere aprobación SUPERVISOR
Write-Host "[1/4] Creando cotización $6M..." -ForegroundColor Yellow
$cot = Invoke-RestMethod -Uri "$baseUrl/cotizaciones" -Method POST -ContentType "application/json" -Body (@{
  id_cliente = 1
  fecha_cotizacion = "2025-01-15"
  fecha_vencimiento = "2025-02-15"
  asunto = "Test procesar aprobación"
  elaborada_por = 1
  id_sede = 1
  id_equipo = 1
  descripcion_general = "Cotización test aprobación"
  alcance_trabajo = "Test"
  descuento_porcentaje = 12.0
  iva_porcentaje = 19.0
  tiempo_estimado_dias = 5
  forma_pago = "Contado"
  meses_garantia = 6
} | ConvertTo-Json)

Write-Host "✅ Cotización creada ID: $($cot.id_cotizacion)`n" -ForegroundColor Green

# Solicitar aprobación
Write-Host "[2/4] Solicitando aprobación..." -ForegroundColor Yellow
$aprobacion = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$($cot.id_cotizacion)/solicitar-aprobacion" -Method POST -ContentType "application/json" -Body (@{
  observaciones_solicitante = "Solicito aprobación para test procesar aprobación"
} | ConvertTo-Json)

$idAprobacion = $aprobacion.aprobacion.id_aprobacion
Write-Host "✅ Aprobación creada ID: $idAprobacion" -ForegroundColor Green
Write-Host "   Nivel: $($aprobacion.aprobacion.nivel_aprobacion)" -ForegroundColor Green
Write-Host "   Estado: $($aprobacion.aprobacion.estado_aprobacion)`n" -ForegroundColor Green

# TEST A: APROBAR
Write-Host "══════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "TEST A: APROBAR Aprobación" -ForegroundColor Magenta
Write-Host "══════════════════════════════════════════`n" -ForegroundColor Magenta

$aprobada = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/aprobaciones/$idAprobacion" -Method PUT -ContentType "application/json" -Body (@{
  decision = "APROBADA"
  observaciones_aprobador = "Aprobado. Cliente corporativo con historial pagos 100% cumplido. Descuento 12% justificado por volumen."
} | ConvertTo-Json)

Write-Host "✅ APROBACIÓN PROCESADA: APROBADA" -ForegroundColor Green
Write-Host "   Nuevo Estado Cotización: $($aprobada.nuevo_estado)" -ForegroundColor Green
Write-Host "   Observaciones Aprobador: $($aprobada.aprobacion.observaciones_aprobador)`n" -ForegroundColor Green

# Verificar cotización cambió a APROBADA_INTERNA
$cotVerificada = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$($cot.id_cotizacion)" -Method GET
if ($cotVerificada.estado.codigo_estado -eq 'APROBADA_INTERNA') {
  Write-Host "✅ Cotización estado: APROBADA_INTERNA (id_estado = 3)`n" -ForegroundColor Green
} else {
  Write-Host "❌ ERROR: Cotización NO cambió a APROBADA_INTERNA`n" -ForegroundColor Red
}

# TEST B: RECHAZAR
Write-Host "══════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "TEST B: RECHAZAR Aprobación" -ForegroundColor Magenta
Write-Host "══════════════════════════════════════════`n" -ForegroundColor Magenta

# Crear segunda cotización
$cot2 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones" -Method POST -ContentType "application/json" -Body (@{
  id_cliente = 1
  fecha_cotizacion = "2025-01-15"
  fecha_vencimiento = "2025-02-15"
  asunto = "Test rechazar aprobación"
  elaborada_por = 1
  id_sede = 1
  id_equipo = 1
  descripcion_general = "Cotización test rechazo"
  alcance_trabajo = "Test"
  descuento_porcentaje = 18.0
  iva_porcentaje = 19.0
  tiempo_estimado_dias = 3
  forma_pago = "Contado"
  meses_garantia = 6
} | ConvertTo-Json)

$aprobacion2 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$($cot2.id_cotizacion)/solicitar-aprobacion" -Method POST -ContentType "application/json" -Body (@{
  observaciones_solicitante = "Solicito aprobación para test rechazo"
} | ConvertTo-Json)

$idAprobacion2 = $aprobacion2.aprobacion.id_aprobacion
Write-Host "[3/4] Aprobación 2 creada ID: $idAprobacion2`n" -ForegroundColor Yellow

# Rechazar aprobación
$rechazada = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/aprobaciones/$idAprobacion2" -Method PUT -ContentType "application/json" -Body (@{
  decision = "RECHAZADA"
  observaciones_aprobador = "Rechazado. Descuento 18% excesivo para cliente sin historial. Reducir descuento máximo 10%."
} | ConvertTo-Json)

Write-Host "✅ APROBACIÓN PROCESADA: RECHAZADA" -ForegroundColor Green
Write-Host "   Nuevo Estado Cotización: $($rechazada.nuevo_estado)" -ForegroundColor Green
Write-Host "   Observaciones Rechazo: $($rechazada.observaciones_rechazo)`n" -ForegroundColor Green

# Verificar cotización volvió a BORRADOR
$cotVerificada2 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$($cot2.id_cotizacion)" -Method GET
if ($cotVerificada2.estado.codigo_estado -eq 'BORRADOR') {
  Write-Host "✅ Cotización volvió a BORRADOR (permite correcciones)`n" -ForegroundColor Green
} else {
  Write-Host "❌ ERROR: Cotización NO volvió a BORRADOR`n" -ForegroundColor Red
}

# TEST C: Intentar procesar aprobación ya procesada (debe fallar)
Write-Host "══════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "TEST C: Intentar reprocesar aprobación" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════`n" -ForegroundColor Yellow

try {
  Invoke-RestMethod -Uri "$baseUrl/cotizaciones/aprobaciones/$idAprobacion" -Method PUT -ContentType "application/json" -Body (@{
    decision = "APROBADA"
    observaciones_aprobador = "Intento reprocesar"
  } | ConvertTo-Json) -ErrorAction Stop
  Write-Host "❌ ERROR: Permitió reprocesar aprobación`n" -ForegroundColor Red
} catch {
  Write-Host "✅ Validación correcta: No permite reprocesar aprobación ya APROBADA`n" -ForegroundColor Green
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETADO - PROCESAR APROBACION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
