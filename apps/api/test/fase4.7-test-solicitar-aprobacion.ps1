# ============================================================
# TEST FASE 4.7 - SOLICITAR APROBACION INTERNA
# Flujo: BORRADOR → EN_REVISION → APROBADA_INTERNA
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: Solicitar Aprobación Interna" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api"

# TEST 1: Cotización dentro umbrales (NO requiere aprobación)
Write-Host "══════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "TEST 1: Cotización $3M, 10% desc (AUTO-APROBADA)" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════`n" -ForegroundColor Yellow

$cot1 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones" -Method POST -ContentType "application/json" -Body (@{
  id_cliente = 1
  fecha_cotizacion = "2025-01-15"
  fecha_vencimiento = "2025-02-15"
  asunto = "Mantenimiento preventivo (bajo monto)"
  elaborada_por = 1
  id_sede = 1
  id_equipo = 1
  descripcion_general = "Cotización $3M - dentro umbrales"
  alcance_trabajo = "Mantenimiento básico"
  descuento_porcentaje = 10.0
  iva_porcentaje = 19.0
  tiempo_estimado_dias = 2
  forma_pago = "Contado"
  meses_garantia = 6
} | ConvertTo-Json)

Write-Host "[1/3] Cotización creada ID: $($cot1.id_cotizacion)" -ForegroundColor Green
Write-Host "       Total: $($cot1.total_cotizacion) COP" -ForegroundColor Green
Write-Host "       Descuento: $($cot1.descuento_porcentaje)%`n" -ForegroundColor Green

# Solicitar aprobación
$resp1 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$($cot1.id_cotizacion)/solicitar-aprobacion" -Method POST -ContentType "application/json" -Body (@{
  observaciones_solicitante = "Cliente nuevo, solicito aprobación cotización"
} | ConvertTo-Json)

if ($resp1.requiere_aprobacion -eq $false) {
  Write-Host "✅ AUTO-APROBADA (dentro umbrales)" -ForegroundColor Green
  Write-Host "   Razón: $($resp1.razon)" -ForegroundColor Green
  Write-Host "   Estado: $($resp1.cotizacion.estado.nombre_estado)`n" -ForegroundColor Green
} else {
  Write-Host "❌ ERROR: No debería requerir aprobación`n" -ForegroundColor Red
}

# TEST 2: Cotización $6M, 12% desc (requiere SUPERVISOR)
Write-Host "══════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "TEST 2: Cotización $6M, 12% desc (SUPERVISOR)" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════`n" -ForegroundColor Yellow

$cot2 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones" -Method POST -ContentType "application/json" -Body (@{
  id_cliente = 1
  fecha_cotizacion = "2025-01-15"
  fecha_vencimiento = "2025-02-15"
  asunto = "Overhaul motor diésel (monto medio)"
  elaborada_por = 1
  id_sede = 1
  id_equipo = 1
  descripcion_general = "Cotización $6M - requiere aprobación SUPERVISOR"
  alcance_trabajo = "Overhaul completo motor"
  descuento_porcentaje = 12.0
  iva_porcentaje = 19.0
  tiempo_estimado_dias = 7
  forma_pago = "60 días fecha factura"
  meses_garantia = 12
} | ConvertTo-Json)

Write-Host "[2/3] Cotización creada ID: $($cot2.id_cotizacion)" -ForegroundColor Green

# Solicitar aprobación
$resp2 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$($cot2.id_cotizacion)/solicitar-aprobacion" -Method POST -ContentType "application/json" -Body (@{
  observaciones_solicitante = "Cliente corporativo. Total $6M supera umbral $5M. Solicito aprobación SUPERVISOR."
} | ConvertTo-Json)

if ($resp2.requiere_aprobacion -eq $true) {
  Write-Host "✅ REQUIERE APROBACIÓN SUPERVISOR" -ForegroundColor Green
  Write-Host "   ID Aprobación: $($resp2.aprobacion.id_aprobacion)" -ForegroundColor Green
  Write-Host "   Nivel: $($resp2.aprobacion.nivel_aprobacion)" -ForegroundColor Green
  Write-Host "   Razón: $($resp2.aprobacion.razon_nivel)" -ForegroundColor Green
  Write-Host "   Estado: $($resp2.cotizacion.estado.nombre_estado)`n" -ForegroundColor Green
  
  # Guardar ID para TEST 4
  $idAprobacion2 = $resp2.aprobacion.id_aprobacion
} else {
  Write-Host "❌ ERROR: Debería requerir aprobación SUPERVISOR`n" -ForegroundColor Red
}

# TEST 3: Cotización $18M, 30% desc (requiere GERENTE)
Write-Host "══════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "TEST 3: Cotización $18M, 30% desc (GERENTE)" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════`n" -ForegroundColor Yellow

$cot3 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones" -Method POST -ContentType "application/json" -Body (@{
  id_cliente = 1
  fecha_cotizacion = "2025-01-15"
  fecha_vencimiento = "2025-02-15"
  asunto = "Reparación generador 500KVA (alto monto)"
  elaborada_por = 1
  id_sede = 1
  id_equipo = 2
  descripcion_general = "Cotización $18M - requiere aprobación GERENTE"
  alcance_trabajo = "Reparación completa generador industrial"
  descuento_porcentaje = 30.0
  iva_porcentaje = 19.0
  tiempo_estimado_dias = 15
  forma_pago = "50% anticipo, 50% contraentrega"
  meses_garantia = 24
} | ConvertTo-Json)

Write-Host "[3/3] Cotización creada ID: $($cot3.id_cotizacion)" -ForegroundColor Green

# Solicitar aprobación
$resp3 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$($cot3.id_cotizacion)/solicitar-aprobacion" -Method POST -ContentType "application/json" -Body (@{
  observaciones_solicitante = "Cliente VIP. Total $18M + descuento 30% supera límites GERENTE. Urgente aprobación gerencia."
} | ConvertTo-Json)

if ($resp3.requiere_aprobacion -eq $true -and $resp3.aprobacion.nivel_aprobacion -eq 'GERENTE') {
  Write-Host "✅ REQUIERE APROBACIÓN GERENTE" -ForegroundColor Green
  Write-Host "   ID Aprobación: $($resp3.aprobacion.id_aprobacion)" -ForegroundColor Green
  Write-Host "   Nivel: $($resp3.aprobacion.nivel_aprobacion)" -ForegroundColor Green
  Write-Host "   Razón: $($resp3.aprobacion.razon_nivel)" -ForegroundColor Green
  Write-Host "   Estado: $($resp3.cotizacion.estado.nombre_estado)`n" -ForegroundColor Green
  
  # Guardar ID para TEST 5
  $idAprobacion3 = $resp3.aprobacion.id_aprobacion
} else {
  Write-Host "❌ ERROR: Debería requerir aprobación GERENTE`n" -ForegroundColor Red
}

# TEST 4: Listar aprobaciones pendientes
Write-Host "══════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "TEST 4: Listar Aprobaciones Pendientes" -ForegroundColor Yellow
Write-Host "══════════════════════════════════════════`n" -ForegroundColor Yellow

$pendientes = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/aprobaciones/pendientes" -Method GET
Write-Host "✅ Aprobaciones pendientes: $($pendientes.total)" -ForegroundColor Green
$pendientes.data | ForEach-Object {
  Write-Host "   [$($_.id_aprobacion)] Nivel: $($_.nivel_aprobacion) - Estado: $($_.estado_aprobacion)" -ForegroundColor Cyan
  Write-Host "      Cotización: $($_.cotizacion.numero_cotizacion) - Total: $($_.cotizacion.total_cotizacion) COP" -ForegroundColor Cyan
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETADO - SOLICITAR APROBACION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
