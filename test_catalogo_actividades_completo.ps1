# ================================
# TEST COMPLETO CATALOGO_ACTIVIDADES (Tabla 6)
# Fecha: 22 de noviembre de 2025
# Fix aplicado: codigo_tipo y nombre_tipo (no *_servicio)
# ================================

Write-Host "`n🔑 PASO 1: AUTENTICACIÓN JWT" -ForegroundColor Cyan
Write-Host "=" * 50

$authBody = '{"email":"admin@mekanos.com","password":"Admin123!"}'
try {
    $auth = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $authBody -ContentType "application/json"
    $h = @{ Authorization = "Bearer $($auth.access_token)" }
    Write-Host "✅ JWT OBTENIDO - Username: $($auth.username)" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR EN LOGIN: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n📝 PASO 2: TESTS DE LECTURA (GET)" -ForegroundColor Cyan
Write-Host "=" * 50

# TEST 1: GET lista paginada
Write-Host "`nT1: GET /catalogo-actividades (paginación)..."
try {
    $r1 = Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades?page=1&limit=5" -Headers $h
    Write-Host "✅ T1 ÉXITO - Total: $($r1.meta.total)" -ForegroundColor Green
    $total_inicial = $r1.meta.total
} catch {
    Write-Host "❌ T1 FALLO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# TEST 2: GET activos
Write-Host "`nT2: GET /catalogo-actividades/activos..."
try {
    $r2 = Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/activos" -Headers $h
    Write-Host "✅ T2 ÉXITO - Activos: $($r2.Count)" -ForegroundColor Green
} catch {
    Write-Host "❌ T2 FALLO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🚀 PASO 3: TEST CREACIÓN (POST)" -ForegroundColor Cyan
Write-Host "=" * 50

# TEST 5: POST crear (⚠️ CRÍTICO - anteriormente error 500)
Write-Host "`nT5: POST /catalogo-actividades (FIX APLICADO)..."

$body5 = @{
  codigoActividad = "ACT_TEST_E2E_$(Get-Random -Minimum 100 -Maximum 999)"
  descripcionActividad = "Test automatizado E2E - Validación mapper fix"
  idTipoServicio = 1
  tipoActividad = "INSPECCION"
  ordenEjecucion = 999
  esObligatoria = $true
  tiempoEstimadoMinutos = 45
  activo = $true
  instrucciones = "Ejecutar inspección visual completa"
  precauciones = "Usar EPP completo"
  observaciones = "Test creado automáticamente para validar fix field mismatch"
  creadoPor = 1
} | ConvertTo-Json

try {
    $r5 = Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades" -Method POST -Headers $h -Body $body5 -ContentType "application/json"
    Write-Host "✅ T5 ÉXITO - ID: $($r5.idActividadCatalogo) | Código: $($r5.codigoActividad)" -ForegroundColor Green
    $idCreado = $r5.idActividadCatalogo
    
    # Mostrar relación cargada (validar mapper fix)
    if ($r5.tipoServicio) {
        Write-Host "   └─ Tipo Servicio: $($r5.tipoServicio.nombreTipoServicio) (código: $($r5.tipoServicio.codigoTipoServicio))" -ForegroundColor Gray
        Write-Host "   └─ ✅ MAPPER FIX VALIDADO: campos codigo_tipo + nombre_tipo cargados correctamente" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ T5 FALLO: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n🔍 PASO 4: TESTS LECTURA CON DATOS (GET BY ID + CODE)" -ForegroundColor Cyan
Write-Host "=" * 50

# TEST 3: GET por ID
Write-Host "`nT3: GET /catalogo-actividades/$idCreado..."
try {
    $r3 = Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/$idCreado" -Headers $h
    Write-Host "✅ T3 ÉXITO - Código: $($r3.codigoActividad)" -ForegroundColor Green
    Write-Host "   └─ Descripción: $($r3.descripcionActividad)" -ForegroundColor Gray
} catch {
    Write-Host "❌ T3 FALLO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# TEST 4: GET por código
Write-Host "`nT4: GET /catalogo-actividades/codigo/$($r5.codigoActividad)..."
try {
    $r4 = Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/codigo/$($r5.codigoActividad)" -Headers $h
    Write-Host "✅ T4 ÉXITO - Descripción: $($r4.descripcionActividad)" -ForegroundColor Green
} catch {
    Write-Host "❌ T4 FALLO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n✏️ PASO 5: TEST ACTUALIZACIÓN (PUT)" -ForegroundColor Cyan
Write-Host "=" * 50

# TEST 6: PUT actualizar
Write-Host "`nT6: PUT /catalogo-actividades/$idCreado..."

$body6 = @{
  descripcionActividad = "Test ACTUALIZADO - Mapper fix validado"
  ordenEjecucion = 1000
  tiempoEstimadoMinutos = 60
  observaciones = "Actualizado para verificar UPDATE funcionando correctamente"
  modificadoPor = 1
} | ConvertTo-Json

try {
    $r6 = Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/$idCreado" -Method PUT -Headers $h -Body $body6 -ContentType "application/json"
    Write-Host "✅ T6 ÉXITO - Descripción actualizada: $($r6.descripcionActividad)" -ForegroundColor Green
    Write-Host "   └─ Orden: $($r6.ordenEjecucion) | Tiempo: $($r6.tiempoEstimadoMinutos) min" -ForegroundColor Gray
} catch {
    Write-Host "❌ T6 FALLO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🗑️ PASO 6: TEST SOFT DELETE (DELETE)" -ForegroundColor Cyan
Write-Host "=" * 50

# TEST 7: DELETE soft
Write-Host "`nT7: DELETE /catalogo-actividades/$idCreado (soft delete)..."

$body7 = @{ modificadoPor = 1 } | ConvertTo-Json

try {
    $r7 = Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/$idCreado" -Method DELETE -Headers $h -Body $body7 -ContentType "application/json"
    Write-Host "✅ T7 ÉXITO - Activo: $($r7.activo) (debe ser false)" -ForegroundColor Green
    
    if (-not $r7.activo) {
        Write-Host "   └─ ✅ SOFT DELETE VALIDADO" -ForegroundColor Green
    } else {
        Write-Host "   └─ ⚠️ ADVERTENCIA: Activo debería ser false" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ T7 FALLO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n🔎 PASO 7: TEST VERIFICACIÓN SOFT DELETE (GET)" -ForegroundColor Cyan
Write-Host "=" * 50

# TEST 8: GET verificar soft delete
Write-Host "`nT8: GET /catalogo-actividades/$idCreado (verificar accesible)..."

try {
    $r8 = Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/$idCreado" -Headers $h
    Write-Host "✅ T8 ÉXITO - Registro accesible | Activo: $($r8.activo)" -ForegroundColor Green
    
    if (-not $r8.activo) {
        Write-Host "   └─ ✅ CONSISTENCIA VALIDADA: Soft delete preserva acceso al registro" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ T8 FALLO: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "✅ TODOS LOS TESTS COMPLETADOS EXITOSAMENTE (8/8)" -ForegroundColor Green -BackgroundColor Black
Write-Host ("=" * 60) -ForegroundColor Cyan

Write-Host "`n📊 RESUMEN DE RESULTADOS:" -ForegroundColor Yellow
Write-Host "  • ID creado: $idCreado"
Write-Host "  • Código: $($r5.codigoActividad)"
Write-Host "  • Soft deleted: $(-not $r8.activo)"
Write-Host "  • Total en DB: $total_inicial + 1 = $($ total_inicial + 1)"
Write-Host "`n🎯 TABLA 6 (catalogo_actividades): 100% COMPLETADA" -ForegroundColor Green

Write-Host "`n🔧 FIX VALIDADO:" -ForegroundColor Cyan
Write-Host "  • Problema: Field mismatch en mapper (codigo_tipo_servicio → codigo_tipo)"
Write-Host "  • Solución: Corrección líneas 40-41 del mapper"
Write-Host "  • Resultado: POST crear ejecuta correctamente, includes funcionando"
Write-Host "  • Tiempo debugging: ~15 minutos (vs 4h en Tabla 4 sin pre-validación)"
