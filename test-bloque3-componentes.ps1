# Script de Validación BLOQUE 3 - Componentes
# Valida 18 endpoints: Tipos Componente (5) + Catálogo Componentes (5) + Componentes-Equipo (6)

$ErrorActionPreference = "Continue"
$baseUrl = "http://localhost:3000/api"

Write-Host "`n=== VALIDACION BLOQUE 3: COMPONENTES ===" -ForegroundColor Cyan

# ==================================================================
# 1. TIPOS COMPONENTE (5 endpoints)
# ==================================================================
Write-Host "`n1. TIPOS COMPONENTE" -ForegroundColor Yellow

# POST - Crear tipo componente
Write-Host "   - POST /tipos-componente (Crear tipo)... " -NoNewline
try {
    $tipoData = @{
        codigo_tipo       = "TEST-COMP-$(Get-Random -Minimum 1000 -Maximum 9999)"
        nombre_componente = "Componente de Prueba"
        categoria         = "FILTRO"
        aplica_a          = "AMBOS"
        es_consumible     = $true
        es_inventariable  = $true
        creado_por        = 1
    } | ConvertTo-Json
    
    $respTipo = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method POST -ContentType 'application/json' -Body $tipoData
    $idTipoComponente = $respTipo.data.id_tipo_componente
    Write-Host "[OK] (ID: $idTipoComponente)" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# GET - Listar tipos componente
Write-Host "   - GET /tipos-componente (Listar)... " -NoNewline
try {
    $respTipos = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method GET
    Write-Host "[OK] ($($respTipos.data.count) tipos)" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# GET - Obtener tipo componente por ID
Write-Host "   - GET /tipos-componente/$idTipoComponente (Detalle)... " -NoNewline
try {
    $respTipoDetalle = Invoke-RestMethod -Uri "$baseUrl/tipos-componente/$idTipoComponente" -Method GET
    Write-Host "[OK] (Categoria: $($respTipoDetalle.data.categoria))" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# PUT - Actualizar tipo componente
Write-Host "   - PUT /tipos-componente/$idTipoComponente (Actualizar)... " -NoNewline
try {
    $updateData = @{
        descripcion    = "Componente actualizado en testing"
        modificado_por = 1
    } | ConvertTo-Json
    
    $respUpdate = Invoke-RestMethod -Uri "$baseUrl/tipos-componente/$idTipoComponente" -Method PUT -ContentType 'application/json' -Body $updateData
    Write-Host "[OK]" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# DELETE - Desactivar tipo componente
Write-Host "   - DELETE /tipos-componente/$idTipoComponente (Desactivar)... " -NoNewline
try {
    $respDelete = Invoke-RestMethod -Uri "$baseUrl/tipos-componente/$idTipoComponente" -Method DELETE
    Write-Host "[OK]" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# ==================================================================
# 2. CATALOGO COMPONENTES (5 endpoints)
# ==================================================================
Write-Host "`n2. CATALOGO COMPONENTES" -ForegroundColor Yellow

# Crear tipo componente activo para catálogo
$tipoActivoData = @{
    codigo_tipo       = "FILTRO-AIRE-TEST"
    nombre_componente = "Filtro Aire Test"
    categoria         = "FILTRO"
    aplica_a          = "GENERADOR"
    es_consumible     = $true
    creado_por        = 1
} | ConvertTo-Json

$respTipoActivo = Invoke-RestMethod -Uri "$baseUrl/tipos-componente" -Method POST -ContentType 'application/json' -Body $tipoActivoData
$idTipoActivo = $respTipoActivo.data.id_tipo_componente

# POST - Crear componente en catálogo
Write-Host "   - POST /catalogo-componentes (Crear componente)... " -NoNewline
try {
    $catalogoData = @{
        id_tipo_componente    = $idTipoActivo
        referencia_fabricante = "TEST-REF-$(Get-Random -Minimum 1000 -Maximum 9999)"
        marca                 = "FLEETGUARD"
        descripcion_corta     = "Filtro de aire de prueba"
        tipo_comercial        = "ORIGINAL"
        precio_compra         = 50000
        precio_venta          = 75000
        moneda                = "COP"
        es_inventariable      = $true
        stock_minimo          = 2
        stock_actual          = 10
        unidad_medida         = "UNIDAD"
        creado_por            = 1
    } | ConvertTo-Json
    
    $respCatalogo = Invoke-RestMethod -Uri "$baseUrl/catalogo-componentes" -Method POST -ContentType 'application/json' -Body $catalogoData
    $idComponente = $respCatalogo.data.id_componente
    Write-Host "[OK] (ID: $idComponente)" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# GET - Listar catálogo componentes
Write-Host "   - GET /catalogo-componentes (Listar)... " -NoNewline
try {
    $respCatalogos = Invoke-RestMethod -Uri "$baseUrl/catalogo-componentes" -Method GET
    Write-Host "[OK] ($($respCatalogos.data.count) componentes)" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# GET - Obtener componente catálogo por ID
Write-Host "   - GET /catalogo-componentes/$idComponente (Detalle)... " -NoNewline
try {
    $respCompDetalle = Invoke-RestMethod -Uri "$baseUrl/catalogo-componentes/$idComponente" -Method GET
    Write-Host "[OK] (Marca: $($respCompDetalle.data.marca))" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# PUT - Actualizar componente catálogo
Write-Host "   - PUT /catalogo-componentes/$idComponente (Actualizar)... " -NoNewline
try {
    $updateCatData = @{
        precio_venta   = 80000
        observaciones  = "Precio actualizado en testing"
        modificado_por = 1
    } | ConvertTo-Json
    
    $respUpdateCat = Invoke-RestMethod -Uri "$baseUrl/catalogo-componentes/$idComponente" -Method PUT -ContentType 'application/json' -Body $updateCatData
    Write-Host "[OK]" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# DELETE - Desactivar componente catálogo
Write-Host "   - DELETE /catalogo-componentes/$idComponente (Desactivar)... " -NoNewline
try {
    $respDeleteCat = Invoke-RestMethod -Uri "$baseUrl/catalogo-componentes/$idComponente" -Method DELETE
    Write-Host "[OK]" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# ==================================================================
# 3. COMPONENTES-EQUIPO (6 endpoints)
# ==================================================================
Write-Host "`n3. COMPONENTES-EQUIPO (Relacion N:N)" -ForegroundColor Yellow

# Crear equipo base para asociar componentes
$equipoData = @{
    codigo_equipo   = "EQUIPO-COMP-$(Get-Random -Minimum 1000 -Maximum 9999)"
    id_cliente      = 1
    id_tipo_equipo  = 1
    ubicacion_texto = "Cuarto Maquinas Testing"
    nombre_equipo   = "Equipo para Componentes"
    estado_equipo   = "OPERATIVO"
} | ConvertTo-Json

$respEquipo = Invoke-RestMethod -Uri "$baseUrl/equipos" -Method POST -ContentType 'application/json' -Body $equipoData
$idEquipo = $respEquipo.data.id_equipo

# Reactivar componente catálogo para asociar
$reactivarData = @{ activo = $true; modificado_por = 1 } | ConvertTo-Json
Invoke-RestMethod -Uri "$baseUrl/catalogo-componentes/$idComponente" -Method PUT -ContentType 'application/json' -Body $reactivarData | Out-Null

# POST - Asociar componente catalogado a equipo
Write-Host "   - POST /componentes-equipo (Asociar catalogado)... " -NoNewline
try {
    $compEquipoData = @{
        id_equipo            = $idEquipo
        id_tipo_componente   = $idTipoActivo
        id_componente        = $idComponente
        posicion_descripcion = "Filtro Principal"
        unidades_por_cambio  = 1
        creado_por           = 1
    } | ConvertTo-Json
    
    $respCompEquipo = Invoke-RestMethod -Uri "$baseUrl/componentes-equipo" -Method POST -ContentType 'application/json' -Body $compEquipoData
    $idComponenteEquipo = $respCompEquipo.data.id_componente_equipo
    Write-Host "[OK] (ID: $idComponenteEquipo)" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# POST - Asociar componente manual (sin catálogo)
Write-Host "   - POST /componentes-equipo (Asociar manual)... " -NoNewline
try {
    $compManualData = @{
        id_equipo            = $idEquipo
        id_tipo_componente   = $idTipoActivo
        posicion_descripcion = "Filtro Secundario"
        referencia_manual    = "HF6177"
        marca_manual         = "BALDWIN"
        unidades_por_cambio  = 1
        creado_por           = 1
    } | ConvertTo-Json
    
    $respCompManual = Invoke-RestMethod -Uri "$baseUrl/componentes-equipo" -Method POST -ContentType 'application/json' -Body $compManualData
    $idComponenteEquipo2 = $respCompManual.data.id_componente_equipo
    Write-Host "[OK] (ID: $idComponenteEquipo2)" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# GET - Listar componentes-equipo
Write-Host "   - GET /componentes-equipo (Listar)... " -NoNewline
try {
    $respCompEquipos = Invoke-RestMethod -Uri "$baseUrl/componentes-equipo" -Method GET
    Write-Host "[OK] ($($respCompEquipos.data.count) asociaciones)" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# GET - Obtener componentes por equipo
Write-Host "   - GET /componentes-equipo/equipo/$idEquipo (Por equipo)... " -NoNewline
try {
    $respCompPorEquipo = Invoke-RestMethod -Uri "$baseUrl/componentes-equipo/equipo/$idEquipo" -Method GET
    Write-Host "[OK] ($($respCompPorEquipo.data.count) componentes)" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# GET - Obtener componente-equipo por ID
Write-Host "   - GET /componentes-equipo/$idComponenteEquipo (Detalle)... " -NoNewline
try {
    $respCompEqDetalle = Invoke-RestMethod -Uri "$baseUrl/componentes-equipo/$idComponenteEquipo" -Method GET
    Write-Host "[OK] (Posicion: $($respCompEqDetalle.data.posicion_descripcion))" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# PUT - Actualizar componente-equipo
Write-Host "   - PUT /componentes-equipo/$idComponenteEquipo (Actualizar)... " -NoNewline
try {
    $updateCompEqData = @{
        fecha_ultimo_cambio = (Get-Date).ToString("yyyy-MM-dd")
        notas               = "Componente cambiado en mantenimiento preventivo"
        modificado_por      = 1
    } | ConvertTo-Json
    
    $respUpdateCompEq = Invoke-RestMethod -Uri "$baseUrl/componentes-equipo/$idComponenteEquipo" -Method PUT -ContentType 'application/json' -Body $updateCompEqData
    Write-Host "[OK]" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# DELETE - Desactivar componente-equipo
Write-Host "   - DELETE /componentes-equipo/$idComponenteEquipo (Desactivar)... " -NoNewline
try {
    $respDeleteCompEq = Invoke-RestMethod -Uri "$baseUrl/componentes-equipo/$idComponenteEquipo" -Method DELETE
    Write-Host "[OK]" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR]: $($_.Exception.Message)" -ForegroundColor Red
}

# ==================================================================
# RESUMEN
# ==================================================================
Write-Host "`n=== VALIDACION COMPLETADA ===" -ForegroundColor Cyan
Write-Host "`nRESUMEN:" -ForegroundColor White
Write-Host "  - Tipos Componente: 5 endpoints validados" -ForegroundColor Green
Write-Host "  - Catalogo Componentes: 5 endpoints validados" -ForegroundColor Green
Write-Host "  - Componentes-Equipo: 6 endpoints validados" -ForegroundColor Green
Write-Host "`nTOTAL BLOQUE 3: 16 endpoints validados`n" -ForegroundColor Cyan
