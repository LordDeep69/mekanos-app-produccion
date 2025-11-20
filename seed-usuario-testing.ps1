# Script URGENTE: Seed usuario ID=1 via API
# Este usuario es requerido por FK creado_por

$baseUrl = "http://localhost:3000/api"
$headers = @{"Content-Type" = "application/json" }

Write-Host "`n=== CREANDO USUARIO ID=1 PARA TESTING ===" -ForegroundColor Cyan

# 1. Crear persona ID=1
Write-Host "`n[1] Creando persona ID=1..." -ForegroundColor Yellow
$personaBody = @{
    id_persona            = 1
    tipo_persona          = "NATURAL"
    tipo_identificacion   = "CC"
    numero_identificacion = "1000000000"
    primer_nombre         = "Sistema"
    primer_apellido       = "Testing"
    email_principal       = "sistema@mekanos.test"
    telefono_principal    = "3000000000"
    activo                = $true
} | ConvertTo-Json

try {
    $persona = Invoke-RestMethod -Uri "$baseUrl/personas" -Method POST -Body $personaBody -Headers $headers -ErrorAction Stop
    Write-Host "   ✅ Persona creada" -ForegroundColor Green
}
catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "   ⚠️  Persona ya existe" -ForegroundColor Yellow
    }
    else {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 2. Crear usuario ID=1
Write-Host "`n[2] Creando usuario ID=1..." -ForegroundColor Yellow
$usuarioBody = @{
    id_usuario             = 1
    id_persona             = 1
    username               = "admin"
    email                  = "sistema@mekanos.test"
    password_hash          = "`$2b`$10`$dummyhashfortesting123456789"
    estado                 = "ACTIVO"
    debe_cambiar_password  = $false
    intentos_fallidos      = 0
    bloqueado_por_intentos = $false
} | ConvertTo-Json

try {
    $usuario = Invoke-RestMethod -Uri "$baseUrl/usuarios" -Method POST -Body $usuarioBody -Headers $headers -ErrorAction Stop
    Write-Host "   ✅ Usuario ID=1 creado exitosamente" -ForegroundColor Green
    Write-Host "`n🎉 LISTO - Ahora se pueden crear registros con creado_por=1" -ForegroundColor Green
}
catch {
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "   ⚠️  Usuario ya existe - OK para testing" -ForegroundColor Yellow
        Write-Host "`n✅ Usuario ID=1 disponible" -ForegroundColor Green
    }
    else {
        Write-Host "   ❌ Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            Write-Host "   Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Yellow
        }
    }
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
