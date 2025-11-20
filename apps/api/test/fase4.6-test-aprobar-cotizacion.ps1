# ============================================================
# TEST FASE 4.6 - APROBAR COTIZACION CLIENTE
# Estado: ENVIADA (4) → APROBADA_CLIENTE (5 - ESTADO FINAL)
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST: Aprobar Cotizacion Cliente" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$baseUrl = "http://localhost:3000/api"

# 1. Crear cotización BORRADOR
Write-Host "[1/4] Creando cotización BORRADOR..." -ForegroundColor Yellow
$cotizacion = Invoke-RestMethod -Uri "$baseUrl/cotizaciones" -Method POST -ContentType "application/json" -Body (@{
  id_cliente = 1
  fecha_cotizacion = "2025-01-15"
  fecha_vencimiento = "2025-02-15"
  asunto = "Reparación generador CATERPILLAR"
  elaborada_por = 1
  id_sede = 1
  id_equipo = 2
  descripcion_general = "Cotización para reparación generador CATERPILLAR 3412"
  alcance_trabajo = "Reparación bobinado estator, cambio rodamientos"
  descuento_porcentaje = 0.0
  iva_porcentaje = 19.0
  tiempo_estimado_dias = 7
  forma_pago = "50% anticipo, 50% contraentrega"
  meses_garantia = 12
} | ConvertTo-Json)

$idCotizacion = $cotizacion.id_cotizacion
Write-Host "✅ Cotización creada ID: $idCotizacion`n" -ForegroundColor Green

# 2. Cambiar a APROBADA_INTERNA y enviar
Write-Host "[2/4] Cambiando a APROBADA_INTERNA..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion" -Method PUT -ContentType "application/json" -Body (@{
  id_estado = 3
  modificado_por = 1
} | ConvertTo-Json) | Out-Null

Write-Host "✅ Enviando cotización..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion/enviar" -Method PUT -ContentType "application/json" -Body (@{
  destinatario_email = "compras@industriaspetro.com"
  destinatario_nombre = "Industrias Petroamazonas"
} | ConvertTo-Json) | Out-Null
Write-Host "✅ Cotización en estado ENVIADA`n" -ForegroundColor Green

# 3. APROBAR COTIZACION
Write-Host "[3/4] APROBANDO cotización por cliente..." -ForegroundColor Magenta
$aprobada = Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion/aprobar" -Method PUT -ContentType "application/json" -Body (@{
  observaciones = "Cliente aprobó condiciones. Anticipo 50% programado semana 3"
} | ConvertTo-Json)

Write-Host "✅ COTIZACIÓN APROBADA POR CLIENTE" -ForegroundColor Green
Write-Host "   Estado: $($aprobada.cotizacion.estado.nombre_estado)" -ForegroundColor Green
Write-Host "   Estado Final: $($aprobada.cotizacion.estado.es_estado_final)" -ForegroundColor Green
Write-Host "   Observaciones: $($aprobada.cotizacion.observaciones_rechazo)`n" -ForegroundColor Green

# 4. Intentar modificar cotización aprobada (debe fallar)
Write-Host "[4/4] Intentando modificar cotización aprobada (debe fallar)..." -ForegroundColor Yellow
try {
  Invoke-RestMethod -Uri "$baseUrl/cotizaciones/$idCotizacion" -Method PUT -ContentType "application/json" -Body (@{
    asunto = "Modificación no permitida"
    modificado_por = 1
  } | ConvertTo-Json) -ErrorAction Stop
  Write-Host "❌ ERROR: Permitió modificar cotización APROBADA_CLIENTE`n" -ForegroundColor Red
} catch {
  Write-Host "✅ Validación correcta: No permite modificar estado FINAL`n" -ForegroundColor Green
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETADO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
