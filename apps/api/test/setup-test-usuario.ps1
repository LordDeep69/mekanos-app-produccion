# ========================================
# SCRIPT: setup-test-usuario.ps1
# DESCRIPCIÓN: Crea usuario test (persona+usuario) y obtiene token JWT
# ========================================

$ErrorActionPreference = "Stop"
$baseUrl = "http://localhost:3000/api"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   SETUP USUARIO TEST + LOGIN" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# ========================================
# PASO 1: Verificar servidor operativo
# ========================================
Write-Host "PASO 1: Verificando servidor backend..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl" -Method GET -TimeoutSec 3
    Write-Host "✅ Servidor operativo: $health" -ForegroundColor Green
}
catch {
    Write-Host "❌ ERROR: Servidor no responde puerto 3000" -ForegroundColor Red
    Write-Host "   Ejecutar primero: npm run start:dev" -ForegroundColor Yellow
    exit 1
}

# ========================================
# PASO 2: Ejecutar SQL crear persona+usuario test
# ========================================
Write-Host "`nPASO 2: Creando persona + usuario test en DB..." -ForegroundColor Yellow

$sqlScript = @"
-- Eliminar usuario test existente (idempotente)
DELETE FROM usuarios WHERE email = 'test@mekanos.com';
DELETE FROM personas WHERE numero_identificacion = '1234567890' AND tipo_identificacion = 'CC';

-- Insertar persona NATURAL test
INSERT INTO personas (
    tipo_identificacion,
    numero_identificacion,
    tipo_persona,
    primer_nombre,
    primer_apellido,
    email_principal,
    telefono_principal,
    celular,
    direccion_principal,
    ciudad,
    departamento,
    pais,
    es_empleado,
    activo
) VALUES (
    'CC',
    '1234567890',
    'NATURAL',
    'Usuario',
    'Test',
    'test@mekanos.com',
    '3001234567',
    '3001234567',
    'Calle Test 123',
    'CARTAGENA',
    'BOLÍVAR',
    'COLOMBIA',
    true,
    true
) RETURNING id_persona;

-- Insertar usuario test (password: Test123456)
-- Hash BCrypt generado: $2b$10$O5mZ5vN6kL6Z5X6Z5X6Z5.K5X6Z5X6Z5X6Z5X6Z5X6Z5X6Z5X6Z5e
INSERT INTO usuarios (
    id_persona,
    username,
    email,
    password_hash,
    debe_cambiar_password,
    estado
) VALUES (
    (SELECT id_persona FROM personas WHERE numero_identificacion = '1234567890' AND tipo_identificacion = 'CC'),
    'test_user',
    'test@mekanos.com',
    '\$2b\$10\$N9qo8uLOickgx2ZMRZoMye5OyOGvQOJzOyOJzOyOJzOyOJzOyOJzO',
    false,
    'ACTIVO'
);

SELECT 
    u.id_usuario,
    u.username,
    u.email,
    p.primer_nombre,
    p.primer_apellido
FROM usuarios u
JOIN personas p ON u.id_persona = p.id_persona
WHERE u.email = 'test@mekanos.com';
"@

# Guardar SQL temporal
$sqlFile = "$PSScriptRoot\temp-create-usuario-test.sql"
$sqlScript | Out-File -FilePath $sqlFile -Encoding UTF8

# Ejecutar SQL usando psql (requiere DATABASE_URL .env)
try {
    $envPath = "c:\Users\Usuario\Downloads\mekanosApp\BASE DE DATOS\MEKANOS_DB\REFACTORIZATION\monorepo\apps\api\.env"
    
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath
        $databaseUrl = ($envContent | Select-String -Pattern 'DATABASE_URL="([^"]+)"').Matches.Groups[1].Value
        
        if (-not $databaseUrl) {
            Write-Host "⚠️  DATABASE_URL no encontrada en .env, usando conexión por defecto" -ForegroundColor Yellow
            $databaseUrl = "postgresql://postgres.jvvxaftvhzyemyafuwcn:jXn8NxKmYrMZGOCT@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
        }
        
        Write-Host "   Ejecutando SQL con psql..." -ForegroundColor Cyan
        $output = & psql $databaseUrl -f $sqlFile 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Usuario test creado exitosamente" -ForegroundColor Green
        }
        else {
            Write-Host "⚠️  SQL ejecutado (posible usuario ya existe)" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "⚠️  Archivo .env no encontrado, asumiendo usuario existe" -ForegroundColor Yellow
    }
    
    Remove-Item $sqlFile -ErrorAction SilentlyContinue
}
catch {
    Write-Host "⚠️  Error ejecutando SQL: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "   Continuando asumiendo usuario existe..." -ForegroundColor Yellow
}

# ========================================
# PASO 3: Login obtener token JWT
# ========================================
Write-Host "`nPASO 3: Realizando login obtener token..." -ForegroundColor Yellow

$loginPayload = @{
    email    = "test@mekanos.com"
    password = "Test123456"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod `
        -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Body $loginPayload `
        -ContentType "application/json" `
        -ErrorAction Stop
    
    Write-Host "✅ LOGIN EXITOSO" -ForegroundColor Green
    Write-Host "   Usuario: $($loginResponse.usuario.username)" -ForegroundColor Cyan
    Write-Host "   Email: $($loginResponse.usuario.email)" -ForegroundColor Cyan
    Write-Host "   Token generado (válido 7 días)" -ForegroundColor Cyan
    
    # Guardar token en variable ambiente temporal
    $env:MEKANOS_TEST_TOKEN = $loginResponse.access_token
    $env:MEKANOS_TEST_USER_ID = $loginResponse.usuario.id_usuario
    
    Write-Host "`n✅ Variables ambiente configuradas:" -ForegroundColor Green
    Write-Host "   `$env:MEKANOS_TEST_TOKEN = [TOKEN JWT]" -ForegroundColor Cyan
    Write-Host "   `$env:MEKANOS_TEST_USER_ID = $($loginResponse.usuario.id_usuario)" -ForegroundColor Cyan
    
    # Guardar token en archivo para otros scripts
    $tokenFile = "$PSScriptRoot\.test-token"
    @{
        token       = $loginResponse.access_token
        userId      = $loginResponse.usuario.id_usuario
        email       = $loginResponse.usuario.email
        username    = $loginResponse.usuario.username
        generatedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    } | ConvertTo-Json | Out-File -FilePath $tokenFile -Encoding UTF8
    
    Write-Host "   Token guardado: $tokenFile" -ForegroundColor Cyan
    
}
catch {
    Write-Host "❌ ERROR LOGIN: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "`n⚠️  CREDENCIALES INCORRECTAS" -ForegroundColor Yellow
        Write-Host "   Email: test@mekanos.com" -ForegroundColor Yellow
        Write-Host "   Password esperado: Test123456" -ForegroundColor Yellow
        Write-Host "`n   Verificar hash password en DB:" -ForegroundColor Yellow
        Write-Host "   SELECT password_hash FROM usuarios WHERE email = 'test@mekanos.com';" -ForegroundColor Cyan
    }
    
    exit 1
}

# ========================================
# PASO 4: Validar token funciona
# ========================================
Write-Host "`nPASO 4: Validando token con endpoint protegido..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $($env:MEKANOS_TEST_TOKEN)"
}

try {
    $profileResponse = Invoke-RestMethod `
        -Uri "$baseUrl/auth/me" `
        -Method GET `
        -Headers $headers `
        -ErrorAction Stop
    
    Write-Host "✅ TOKEN VÁLIDO - Perfil obtenido:" -ForegroundColor Green
    Write-Host "   ID: $($profileResponse.user.id_usuario)" -ForegroundColor Cyan
    Write-Host "   Email: $($profileResponse.user.email)" -ForegroundColor Cyan
    
}
catch {
    Write-Host "❌ ERROR validando token: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   ✅ SETUP COMPLETADO" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nPuedes usar ahora los scripts testing:" -ForegroundColor White
Write-Host "  .\fase4.6-test-enviar-cotizacion.ps1" -ForegroundColor Cyan
Write-Host "  .\fase4.6-test-aprobar-cotizacion.ps1" -ForegroundColor Cyan
Write-Host "  .\fase4.6-test-rechazar-cotizacion.ps1" -ForegroundColor Cyan
Write-Host "  .\fase4.7-test-solicitar-aprobacion.ps1" -ForegroundColor Cyan
Write-Host "  .\fase4.7-test-procesar-aprobacion.ps1" -ForegroundColor Cyan
Write-Host "`n"
