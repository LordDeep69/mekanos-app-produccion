# Script de Seed Mínimo para Test Bloque 2
# Crea los datos mínimos necesarios para ejecutar tests de Equipos

$baseUrl = "http://localhost:3000/api"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SEED MÍNIMO - BLOQUE 2" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# 1. Verificar Usuario ID=1 existe
Write-Host "[1] Verificando Usuario ID=1..." -ForegroundColor Yellow
try {
    $usuario = Invoke-RestMethod -Uri "$baseUrl/usuarios/1" -Method GET -ErrorAction Stop
    Write-Host "   OK - Usuario ID=1 existe: $($usuario.email)" -ForegroundColor Green
}
catch {
    Write-Host "   ERROR - Usuario ID=1 no existe. Ejecuta seed-usuario-testing.ps1 primero" -ForegroundColor Red
    exit
}

# 2. Crear Persona para Cliente
Write-Host "[2] Creando Persona para Cliente..." -ForegroundColor Yellow
$nit = "900$(Get-Random -Minimum 100000 -Maximum 999999)-1"
$personaBody = @{
    tipo_identificacion   = "NIT"
    numero_identificacion = $nit
    tipo_persona          = "JURIDICA"
    razon_social          = "Empresa Test S.A.S."
    nombre_comercial      = "Empresa Test"
    email_principal       = "contacto@empresatest.com"
    telefono_principal    = "3001234567"
} | ConvertTo-Json

try {
    $persona = Invoke-RestMethod -Uri "$baseUrl/personas" -Method POST -Body $personaBody -ContentType "application/json"
    Write-Host "   OK - Persona creada: ID=$($persona.id_persona)" -ForegroundColor Green
    $idPersona = $persona.id_persona
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 3. Crear Cliente
Write-Host "[3] Creando Cliente..." -ForegroundColor Yellow
$clienteBody = @{
    id_persona       = $idPersona
    razon_social     = "Empresa Test S.A.S."
    nombre_comercial = "Empresa Test"
    sector_economico = "INDUSTRIAL"
    creado_por       = 1
} | ConvertTo-Json

try {
    $cliente = Invoke-RestMethod -Uri "$baseUrl/clientes" -Method POST -Body $clienteBody -ContentType "application/json"
    Write-Host "   OK - Cliente creado: ID=$($cliente.id_cliente)" -ForegroundColor Green
    $idCliente = $cliente.id_cliente
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 4. Crear Sede del Cliente
Write-Host "[4] Creando Sede..." -ForegroundColor Yellow
$sedeBody = @{
    id_cliente        = $idCliente
    nombre_sede       = "Sede Principal"
    direccion         = "Calle 123 #45-67"
    ciudad            = "Cartagena"
    departamento      = "Bolivar"
    pais              = "Colombia"
    es_sede_principal = $true
    activo            = $true
    creado_por        = 1
} | ConvertTo-Json

try {
    $sede = Invoke-RestMethod -Uri "$baseUrl/sedes-cliente" -Method POST -Body $sedeBody -ContentType "application/json"
    Write-Host "   OK - Sede creada: ID=$($sede.id_sede)" -ForegroundColor Green
    $idSede = $sede.id_sede
}
catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 5. Crear Tipos de Equipo
Write-Host "[5] Creando Tipos de Equipo..." -ForegroundColor Yellow
$tiposEquipo = @(
    @{ nombre_tipo = "MOTOR"; descripcion = "Motores de combustión y eléctricos"; activo = $true; creado_por = 1 },
    @{ nombre_tipo = "GENERADOR"; descripcion = "Plantas eléctricas y generadores"; activo = $true; creado_por = 1 },
    @{ nombre_tipo = "BOMBA"; descripcion = "Bombas hidráulicas y motobombas"; activo = $true; creado_por = 1 }
)

$idsTipos = @()
foreach ($tipo in $tiposEquipo) {
    $tipoBody = $tipo | ConvertTo-Json
    try {
        $tipoCreado = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method POST -Body $tipoBody -ContentType "application/json"
        Write-Host "   OK - Tipo '$($tipo.nombre_tipo)' creado: ID=$($tipoCreado.id_tipo_equipo)" -ForegroundColor Green
        $idsTipos += $tipoCreado.id_tipo_equipo
    }
    catch {
        Write-Host "   ERROR creando tipo $($tipo.nombre_tipo): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# RESUMEN
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SEED COMPLETADO" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Datos creados:" -ForegroundColor White
Write-Host "  - Usuario ID: 1" -ForegroundColor Green
Write-Host "  - Persona ID: $idPersona" -ForegroundColor Green
Write-Host "  - Cliente ID: $idCliente" -ForegroundColor Green
Write-Host "  - Sede ID: $idSede" -ForegroundColor Green
Write-Host "  - Tipos de Equipo: $($idsTipos -join ', ')" -ForegroundColor Green
Write-Host "`nAhora puedes ejecutar: .\test-bloque2-CORRECTO.ps1`n" -ForegroundColor Cyan
