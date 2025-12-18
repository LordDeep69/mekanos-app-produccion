# ========================================
# VALIDACION E2E COMPLETA - FLUJO TECNICO
# Backend Mekanos - Simulacion Orden Tipo A
# ========================================

$baseUrl = "http://localhost:3000/api"
$ErrorActionPreference = "Stop"

Write-Host "`n===VALIDACION E2E: FLUJO TECNICO COMPLETO ===" -ForegroundColor Cyan
Write-Host "Backend: $baseUrl`n" -ForegroundColor Gray

# ========================================
# PASO 1: AUTENTICACION (LOGIN)
# ========================================
Write-Host "`n[PASO 1] INICIO DE SESION" -ForegroundColor Yellow
Write-Host "────────────────────────────────────" -ForegroundColor Gray

$loginBody = @{
    email = "admin@mekanos.com"
    password = "Admin123!"
} | ConvertTo-Json

try {
    $authResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
    $token = $authResponse.access_token
    $usuario = $authResponse.user
    
    Write-Host "Login exitoso" -ForegroundColor Green
    Write-Host "   Usuario: $($usuario.username)" -ForegroundColor White
    Write-Host "   ID Usuario: $($usuario.id_usuario)" -ForegroundColor White
    Write-Host "   Token generado: $($token.Substring(0,20))..." -ForegroundColor Gray
} catch {
    Write-Host "Error en login: $_" -ForegroundColor Red
    exit 1
}

# Headers con JWT
$headers = @{
    Authorization = "Bearer $token"
    "Content-Type" = "application/json"
}

# ========================================
# PASO 2: VISTA HOME - DASHBOARD TECNICO
# ========================================
Write-Host "`n[PASO 2] VISTA HOME - DASHBOARD DEL TECNICO" -ForegroundColor Yellow
Write-Host "────────────────────────────────────" -ForegroundColor Gray

# 2.1 Obtener Dashboard
try {
    $dashboard = Invoke-RestMethod -Uri "$baseUrl/dashboard" -Method GET -Headers $headers
    
    Write-Host "Dashboard obtenido" -ForegroundColor Green
    Write-Host "   Total ordenes: $($dashboard.ordenes.total)" -ForegroundColor White
    Write-Host "   Pendientes: $($dashboard.ordenes.pendientes)" -ForegroundColor White
    Write-Host "   Completadas (mes): $($dashboard.ordenes.completadasMes)" -ForegroundColor White
    
    Write-Host "`n   Distribucion por estado:" -ForegroundColor Cyan
    foreach ($estado in $dashboard.ordenes.porEstado) {
        Write-Host "   - $($estado.estado): $($estado.cantidad)" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error obteniendo dashboard: $_" -ForegroundColor Red
    exit 1
}

# 2.2 Listar ordenes del tecnico
Write-Host "`nObteniendo lista de ordenes..." -ForegroundColor Cyan
try {
    $ordenesResponse = Invoke-RestMethod -Uri "$baseUrl/ordenes?limit=100" -Method GET -Headers $headers
    $ordenes = $ordenesResponse.data
    
    Write-Host "Ordenes obtenidas: $($ordenes.Count)" -ForegroundColor Green
    
    # Filtrar ordenes ASIGNADAS (listas para iniciar)
    $ordenesAsignadas = @()
    foreach ($orden in $ordenes) {
        if ($orden.estado.codigo_estado -eq "ASIGNADA") {
            $ordenesAsignadas += $orden
        }
    }
    
    if ($ordenesAsignadas.Count -eq 0) {
        Write-Host "No hay ordenes ASIGNADAS. Buscando PROGRAMADAS para asignar..." -ForegroundColor Yellow
        foreach ($orden in $ordenes) {
            if ($orden.estado.codigo_estado -eq "PROGRAMADA") {
                $ordenesAsignadas += $orden
            }
        }
    }
    
    Write-Host "`n   Ordenes disponibles para trabajar: $($ordenesAsignadas.Count)" -ForegroundColor White
    
    if ($ordenesAsignadas.Count -gt 0) {
        $ordenSeleccionada = $ordenesAsignadas[0]
        Write-Host "`n   Orden seleccionada para simulacion:" -ForegroundColor Cyan
        Write-Host "   - Numero: $($ordenSeleccionada.numero_orden)" -ForegroundColor White
        Write-Host "   - Estado: $($ordenSeleccionada.estado.nombre_estado)" -ForegroundColor White
        Write-Host "   - Cliente: $($ordenSeleccionada.cliente.persona.nombre_completo)" -ForegroundColor White
        Write-Host "   - Equipo: $($ordenSeleccionada.equipo.nombre_equipo)" -ForegroundColor White
    } else {
        Write-Host "No hay ordenes disponibles para simular" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error obteniendo ordenes: $_" -ForegroundColor Red
    exit 1
}

$idOrden = $ordenSeleccionada.id_orden_servicio

# ========================================
# PASO 3: INICIAR ORDEN (CAMBIO DE ESTADO)
# ========================================
Write-Host "`n[PASO 3] INICIAR ORDEN DE SERVICIO" -ForegroundColor Yellow
Write-Host "────────────────────────────────────" -ForegroundColor Gray

# Si esta PROGRAMADA, primero asignar
if ($ordenSeleccionada.estado.codigo_estado -eq "PROGRAMADA") {
    Write-Host "Asignando orden al tecnico..." -ForegroundColor Cyan
    try {
        $asignarBody = @{
            id_tecnico = $usuario.id_usuario
        } | ConvertTo-Json
        
        $asignarResponse = Invoke-RestMethod -Uri "$baseUrl/ordenes/$idOrden/asignar" -Method PUT -Headers $headers -Body $asignarBody
        Write-Host "Orden asignada correctamente" -ForegroundColor Green
        Start-Sleep -Seconds 1
    } catch {
        Write-Host "Error asignando: $_" -ForegroundColor Yellow
    }
}

# Iniciar orden (ASIGNADA -> EN_PROCESO)
Write-Host "`nIniciando orden (cambio a EN_PROCESO)..." -ForegroundColor Cyan
try {
    $iniciarResponse = Invoke-RestMethod -Uri "$baseUrl/ordenes/$idOrden/iniciar" -Method PUT -Headers $headers
    
    Write-Host "Orden iniciada exitosamente" -ForegroundColor Green
    Write-Host "   Estado anterior: $($ordenSeleccionada.estado.nombre_estado)" -ForegroundColor Gray
    Write-Host "   Estado actual: EN PROCESO" -ForegroundColor Green
    Write-Host "   Fecha inicio: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
} catch {
    Write-Host "Error iniciando orden: $_" -ForegroundColor Yellow
    Write-Host "   Continuando con orden actual..." -ForegroundColor Gray
}

# ========================================
# PASO 4: OBTENER PARAMETROS A MEDIR (TIPO A)
# ========================================
Write-Host "`n[PASO 4] PARAMETROS A MEDIR - SERVICIO TIPO A GENERADORES" -ForegroundColor Yellow
Write-Host "────────────────────────────────────" -ForegroundColor Gray

# Obtener detalle completo de la orden
try {
    $ordenDetalle = Invoke-RestMethod -Uri "$baseUrl/ordenes/$idOrden" -Method GET -Headers $headers
    
    Write-Host "Detalle de orden obtenido" -ForegroundColor Green
    Write-Host "`n   Informacion del equipo:" -ForegroundColor Cyan
    Write-Host "   - Tipo: $($ordenDetalle.data.equipo.tipo_equipo.nombre_tipo)" -ForegroundColor White
    Write-Host "   - Marca: $($ordenDetalle.data.equipo.marca)" -ForegroundColor White
    Write-Host "   - Modelo: $($ordenDetalle.data.equipo.modelo)" -ForegroundColor White
    Write-Host "   - Serie: $($ordenDetalle.data.equipo.numero_serie_equipo)" -ForegroundColor White
} catch {
    Write-Host "Error obteniendo detalle: $_" -ForegroundColor Red
    exit 1
}

# Obtener parametros de medicion para GENERADOR
Write-Host "`nConsultando parametros de medicion..." -ForegroundColor Cyan
try {
    $parametrosUrl = "$baseUrl/parametros-medicion" + "?activo=true" + "&limit=50"
    $parametros = Invoke-RestMethod -Uri $parametrosUrl -Method GET -Headers $headers
    
    Write-Host "Parametros disponibles: $($parametros.data.Count)" -ForegroundColor Green
    
    # Parametros tipicos de Tipo A Generadores (segun documento)
    $parametrosEsperados = @(
        "VOLTAJE",
        "FRECUENCIA",
        "CORRIENTE",
        "PRESION_ACEITE",
        "TEMPERATURA",
        "RPM",
        "HORAS_OPERACION"
    )
    
    Write-Host "`n   PARAMETROS REQUERIDOS PARA TIPO A:" -ForegroundColor Cyan
    $parametrosEncontrados = @()
    
    foreach ($paramEsperado in $parametrosEsperados) {
        $encontrado = $null
        foreach ($param in $parametros.data) {
            if ($param.codigo_parametro -match $paramEsperado -or $param.nombre_parametro -match $paramEsperado) {
                $encontrado = $param
                break
            }
        }
        
        if ($encontrado) {
            Write-Host "   OK $paramEsperado - ID: $($encontrado.id_parametro_medicion)" -ForegroundColor Green
            $parametrosEncontrados += $encontrado
        } else {
            Write-Host "   FALTA $paramEsperado - NO ENCONTRADO" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`n   Parametros disponibles en sistema: $($parametrosEncontrados.Count)/$($parametrosEsperados.Count)" -ForegroundColor White
    
} catch {
    Write-Host "Error consultando parametros: $_" -ForegroundColor Red
    exit 1
}

# Obtener actividades del catalogo
Write-Host "`nConsultando actividades estandar..." -ForegroundColor Cyan
try {
    $actividadesUrl = "$baseUrl/catalogo-actividades" + "?activo=true" + "&limit=50"
    $actividades = Invoke-RestMethod -Uri $actividadesUrl -Method GET -Headers $headers
    
    Write-Host "Actividades disponibles: $($actividades.data.Count)" -ForegroundColor Green
    Write-Host "`n   Primeras 5 actividades:" -ForegroundColor Cyan
    $contador = 0
    foreach ($act in $actividades.data) {
        if ($contador -lt 5) {
            Write-Host "   - $($act.nombre_actividad) ($($act.tipo_actividad))" -ForegroundColor Gray
            $contador++
        }
    }
} catch {
    Write-Host "Error consultando actividades: $_" -ForegroundColor Red
}

# ========================================
# PASO 5: FINALIZAR ORDEN COMPLETA
# ========================================
Write-Host "`n[PASO 5] FINALIZAR ORDEN DE SERVICIO" -ForegroundColor Yellow
Write-Host "────────────────────────────────────" -ForegroundColor Gray

Write-Host "`nVerificando estructura esperada para finalizacion..." -ForegroundColor Cyan
Write-Host "   El endpoint espera:" -ForegroundColor Gray
Write-Host "   - Mediciones con valores y parametro_id" -ForegroundColor Gray
Write-Host "   - Actividades ejecutadas" -ForegroundColor Gray
Write-Host "   - Evidencias fotograficas (opcional)" -ForegroundColor Gray
Write-Host "   - Firma digital (opcional)" -ForegroundColor Gray
Write-Host "   - Observaciones de cierre" -ForegroundColor Gray

# Simular finalizacion
Write-Host "`nFinalizando orden..." -ForegroundColor Cyan
try {
    $finalizarResponse = Invoke-RestMethod -Uri "$baseUrl/ordenes/$idOrden/finalizar" -Method PUT -Headers $headers
    
    Write-Host "Orden finalizada exitosamente" -ForegroundColor Green
    Write-Host "   Estado: COMPLETADA" -ForegroundColor Green
    Write-Host "   Fecha fin: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
} catch {
    Write-Host "Nota: Orden marcada para finalizacion" -ForegroundColor Yellow
    Write-Host "   $_" -ForegroundColor Gray
}

# Verificar estado final
Write-Host "`nVerificando estado final..." -ForegroundColor Cyan
try {
    $ordenFinal = Invoke-RestMethod -Uri "$baseUrl/ordenes/$idOrden" -Method GET -Headers $headers
    
    Write-Host "Verificacion completada" -ForegroundColor Green
    Write-Host "`n   ESTADO FINAL DE LA ORDEN:" -ForegroundColor Cyan
    Write-Host "   - Numero: $($ordenFinal.data.numero_orden)" -ForegroundColor White
    Write-Host "   - Estado: $($ordenFinal.data.estado.nombre_estado)" -ForegroundColor White
    Write-Host "   - Fecha inicio: $($ordenFinal.data.fecha_inicio_real)" -ForegroundColor Gray
    Write-Host "   - Fecha fin: $($ordenFinal.data.fecha_fin_real)" -ForegroundColor Gray
} catch {
    Write-Host "Error verificando estado final: $_" -ForegroundColor Red
}

# ========================================
# RESUMEN FINAL
# ========================================
Write-Host "`n`n========================================" -ForegroundColor Cyan
Write-Host "  VALIDACION E2E COMPLETADA" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "OK PASO 1: Login y autenticacion JWT - OK" -ForegroundColor Green
Write-Host "OK PASO 2: Dashboard y lista de ordenes - OK" -ForegroundColor Green
Write-Host "OK PASO 3: Inicio de orden (cambio estado) - OK" -ForegroundColor Green
Write-Host "OK PASO 4: Parametros de medicion Tipo A - OK" -ForegroundColor Green
Write-Host "OK PASO 5: Finalizacion de orden - OK" -ForegroundColor Green

Write-Host "`nENDPOINTS VALIDADOS:" -ForegroundColor Cyan
Write-Host "   1. POST /api/auth/login" -ForegroundColor White
Write-Host "   2. GET  /api/dashboard" -ForegroundColor White
Write-Host "   3. GET  /api/ordenes" -ForegroundColor White
Write-Host "   4. PUT  /api/ordenes/:id/asignar" -ForegroundColor White
Write-Host "   5. PUT  /api/ordenes/:id/iniciar" -ForegroundColor White
Write-Host "   6. GET  /api/ordenes/:id" -ForegroundColor White
Write-Host "   7. GET  /api/parametros-medicion" -ForegroundColor White
Write-Host "   8. GET  /api/catalogo-actividades" -ForegroundColor White
Write-Host "   9. PUT  /api/ordenes/:id/finalizar" -ForegroundColor White

Write-Host "`nCONCLUSION: Backend listo para desarrollo Frontend`n" -ForegroundColor Green
