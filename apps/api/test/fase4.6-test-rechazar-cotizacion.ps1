# ============================================================
# TEST FASE 4.6 - RECHAZAR COTIZACION
# Estado: ENVIADA (4) → RECHAZADA (6 - ESTADO FINAL)
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: Rechazar Cotizacion" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api"

# 0. Listar motivos rechazo disponibles
Write-Host "[0/5] Listando motivos rechazo disponibles..." -ForegroundColor Yellow
try {
  $motivos = Invoke-RestMethod -Uri "$baseUrl/motivos-rechazo" -Method GET
  Write-Host "✅ Motivos rechazo:" -ForegroundColor Green
  $motivos | ForEach-Object {
    Write-Host "   [$($_.id_motivo_rechazo)] $($_.nombre_motivo)" -ForegroundColor Cyan
  }
  Write-Host ""
} catch {
  Write-Host "⚠️  Endpoint motivos-rechazo no disponible (usar ID 1: PRECIO_ALTO)`n" -ForegroundColor Yellow
}

# 1. Crear cotización BORRADOR
Write-Host "[1/5] Creando cotización BORRADOR..." -ForegroundColor Yellow
$cotizacion = Invoke-RestMethod -Uri "$baseUrl/cotizaciones" -Method POST -ContentType "application/json" -Body (@{
  id_cliente = 1
  fecha_cotizacion = "2025-01-15"
  fecha_vencimiento = "2025-02-15"
  asunto = "Overhaul bomba centrífuga"
  elaborada_por = 1
  id_sede = 1
  id_equipo = 3
  descripcion_general = "Cotización overhaul bomba centrífuga FLOWSERVE 6x4"
  alcance_trabajo = "Desmontaje, inspección, cambio repuestos, montaje, pruebas"
  descuento_porcentaje = 0.0
  iva_porcentaje = 19.0
  tiempo_estimado_dias = 10
  forma_pago = "30 días fecha factura"
  meses_garantia = 6
} | ConvertTo-Json)

$idCotizacion = $cotizacion.id_cotizacion
Write-Host "✅ Cotización creada ID: $idCotizacion`n" -ForegroundColor Green

# 2. Cambiar a APROBADA_INTERNA
Write-Host "[2/5] Cambiando a APROBADA_INTERNA..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion" -Method PUT -ContentType "application/json" -Body (@{
  id_estado = 3
  modificado_por = 1
} | ConvertTo-Json) | Out-Null
Write-Host "✅ Estado: APROBADA_INTERNA`n" -ForegroundColor Green

# 3. Enviar cotización
Write-Host "[3/5] Enviando cotización a cliente..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion/enviar" -Method PUT -ContentType "application/json" -Body (@{
  destinatario_email = "mantenimiento@termopichincha.com"
  destinatario_nombre = "Termoelectrica Pichincha"
} | ConvertTo-Json) | Out-Null
Write-Host "✅ Cotización ENVIADA`n" -ForegroundColor Green

# 4. RECHAZAR COTIZACION
Write-Host "[4/5] RECHAZANDO cotización..." -ForegroundColor Magenta
$rechazada = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion/rechazar" -Method PUT -ContentType "application/json" -Body (@{
  id_motivo_rechazo = 1
  observaciones_rechazo = "Cliente considera precio 20% superior al presupuesto aprobado. Solicita requotizar eliminando servicios no críticos."
} | ConvertTo-Json)

Write-Host "✅ COTIZACIÓN RECHAZADA" -ForegroundColor Green
Write-Host "   Estado: $($rechazada.cotizacion.estado.nombre_estado)" -ForegroundColor Green
Write-Host "   Estado Final: $($rechazada.cotizacion.estado.es_estado_final)" -ForegroundColor Green
Write-Host "   Motivo: $($rechazada.motivo_rechazo.nombre_motivo)" -ForegroundColor Green
Write-Host "   Observaciones: $($rechazada.cotizacion.observaciones_rechazo)`n" -ForegroundColor Green

# 5. Intentar rechazar sin observaciones (debe fallar)
Write-Host "[5/5] Intentando rechazar sin observaciones (debe fallar)..." -ForegroundColor Yellow

$cotizacion2 = Invoke-RestMethod -Uri "$baseUrl/cotizaciones" -Method POST -ContentType "application/json" -Body (@{
  id_cliente = 1
  fecha_cotizacion = "2025-01-15"
  fecha_vencimiento = "2025-02-15"
  asunto = "Test validación"
  elaborada_por = 1
  id_sede = 1
  id_equipo = 1
  descripcion_general = "Test"
  alcance_trabajo = "Test"
  iva_porcentaje = 19.0
  tiempo_estimado_dias = 1
  forma_pago = "Contado"
  meses_garantia = 3
} | ConvertTo-Json)

Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$($cotizacion2.id_cotizacion)" -Method PUT -ContentType "application/json" -Body (@{
  id_estado = 3
  modificado_por = 1
} | ConvertTo-Json) | Out-Null

Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$($cotizacion2.id_cotizacion)/enviar" -Method PUT -ContentType "application/json" -Body (@{
  destinatario_email = "test@test.com"
  destinatario_nombre = "Test"
} | ConvertTo-Json) | Out-Null

try {
  Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$($cotizacion2.id_cotizacion)/rechazar" -Method PUT -ContentType "application/json" -Body (@{
    id_motivo_rechazo = 1
    observaciones_rechazo = "Corto"
  } | ConvertTo-Json) -ErrorAction Stop
  Write-Host "❌ ERROR: Permitió rechazar con observaciones < 10 caracteres`n" -ForegroundColor Red
} catch {
  Write-Host "✅ Validación correcta: Observaciones rechazo mínimo 10 caracteres`n" -ForegroundColor Green
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
