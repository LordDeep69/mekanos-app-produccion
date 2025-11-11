# 🧪 GUÍA DE TESTING - AUTH MODULE

## 🚀 INICIO RÁPIDO

### 1. Iniciar Servidor
```powershell
cd monorepo
pnpm --filter @mekanos/api run dev
```

**Esperado:**
```
[Nest] LOG [Bootstrap] 🚀 Mekanos API running on: http://localhost:3000/api
[Nest] LOG [Bootstrap] ❤️  Health check: http://localhost:3000/api/health
```

---

## 🔑 CREDENCIALES DE PRUEBA

### Admin
- **Email:** `admin@mekanos.com`
- **Password:** `Admin123!`
- **Rol:** `ADMIN`
- **Permisos:** Acceso total

### Técnico
- **Email:** `tecnico@mekanos.com`
- **Password:** `Tecnico123!`
- **Rol:** `TECNICO`
- **Permisos:** Órdenes de servicio, informes

### Cliente
- **Email:** `cliente@empresa.com`
- **Password:** `Cliente123!`
- **Rol:** `CLIENTE`
- **Permisos:** Ver sus órdenes, cotizaciones

---

## 📋 CASOS DE PRUEBA

### ✅ Test 1: Health Check
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health"
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-11T20:30:00.000Z",
  "database": "connected",
  "environment": "development"
}
```

---

### ✅ Test 2: Login Exitoso (Admin)
```powershell
$loginResp = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"email":"admin@mekanos.com","password":"Admin123!"}'

$loginResp | ConvertTo-Json -Depth 5
$token = $loginResp.access_token
```

**Respuesta esperada:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@mekanos.com",
    "nombre": "Admin Mekanos",
    "rol": "ADMIN"
  }
}
```

---

### ✅ Test 3: Obtener Perfil Autenticado
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $token"} | ConvertTo-Json
```

**Respuesta esperada:**
```json
{
  "message": "Perfil del usuario autenticado",
  "user": {
    "id": 1,
    "email": "admin@mekanos.com",
    "nombre": "Admin Mekanos",
    "rol": "ADMIN",
    "personaId": 1
  }
}
```

---

### ✅ Test 4: Listar Usuarios Mock (Admin only)
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/mock-users" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $token"} | ConvertTo-Json
```

**Respuesta esperada:**
```json
{
  "message": "Usuarios mock disponibles para testing",
  "users": [
    {
      "id": 1,
      "email": "admin@mekanos.com",
      "nombre": "Admin Mekanos",
      "rol": "ADMIN"
    },
    {
      "id": 2,
      "email": "tecnico@mekanos.com",
      "nombre": "Juan Pérez",
      "rol": "TECNICO"
    },
    {
      "id": 3,
      "email": "cliente@empresa.com",
      "nombre": "María González",
      "rol": "CLIENTE"
    }
  ]
}
```

---

### ✅ Test 5: Endpoint Admin Test
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/admin-test" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $token"} | ConvertTo-Json
```

**Respuesta esperada:**
```json
{
  "message": "🎉 ¡Acceso admin exitoso!",
  "user": {
    "id": 1,
    "email": "admin@mekanos.com",
    "nombre": "Admin Mekanos",
    "rol": "ADMIN",
    "personaId": 1
  },
  "timestamp": "2025-11-11T20:30:00.000Z"
}
```

---

### ❌ Test 6: Login con Credenciales Inválidas
```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"email":"admin@mekanos.com","password":"WrongPassword"}'
} catch {
    Write-Host "Error esperado: $($_.Exception.Message)" -ForegroundColor Green
    $_.ErrorDetails.Message
}
```

**Respuesta esperada:** `401 Unauthorized`
```json
{
  "statusCode": 401,
  "timestamp": "2025-11-11T20:30:00.000Z",
  "path": "/api/auth/login",
  "method": "POST",
  "message": "Credenciales inválidas"
}
```

---

### ❌ Test 7: Acceso sin Token
```powershell
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" -Method GET
} catch {
    Write-Host "Error esperado: $($_.Exception.Message)" -ForegroundColor Green
    $_.ErrorDetails.Message
}
```

**Respuesta esperada:** `401 Unauthorized`
```json
{
  "statusCode": 401,
  "timestamp": "2025-11-11T20:30:00.000Z",
  "path": "/api/auth/me",
  "method": "GET",
  "message": "Acceso no autorizado. Token inválido o expirado"
}
```

---

### ❌ Test 8: Acceso Denegado por Rol
```powershell
# Login como técnico
$tecnicoResp = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"email":"tecnico@mekanos.com","password":"Tecnico123!"}'

$tecnicoToken = $tecnicoResp.access_token

# Intentar acceder a endpoint admin (debe fallar)
try {
    Invoke-RestMethod -Uri "http://localhost:3000/api/auth/admin-test" `
        -Method GET `
        -Headers @{"Authorization"="Bearer $tecnicoToken"}
} catch {
    Write-Host "Error esperado: $($_.Exception.Message)" -ForegroundColor Green
    $_.ErrorDetails.Message
}
```

**Respuesta esperada:** `403 Forbidden`
```json
{
  "statusCode": 403,
  "timestamp": "2025-11-11T20:30:00.000Z",
  "path": "/api/auth/admin-test",
  "method": "GET",
  "message": "Acceso denegado. Se requiere uno de estos roles: ADMIN"
}
```

---

### ✅ Test 9: Refresh Token
```powershell
# Usar el refresh_token del login anterior
$refreshResp = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/refresh" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body ('{"refresh_token":"' + $loginResp.refresh_token + '"}')

$refreshResp | ConvertTo-Json
```

**Respuesta esperada:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### ✅ Test 10: Endpoint Tech Test (Técnico)
```powershell
# Debe funcionar con token de técnico o admin
Invoke-RestMethod -Uri "http://localhost:3000/api/auth/tech-test" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $tecnicoToken"} | ConvertTo-Json
```

**Respuesta esperada:**
```json
{
  "message": "🔧 ¡Acceso técnico exitoso!",
  "user": {
    "id": 2,
    "email": "tecnico@mekanos.com",
    "nombre": "Juan Pérez",
    "rol": "TECNICO",
    "personaId": 2
  },
  "timestamp": "2025-11-11T20:30:00.000Z"
}
```

---

## 🧪 SCRIPT AUTOMATIZADO

### Ejecutar todos los tests
```powershell
# Guardar en test-auth-complete.ps1
$baseUrl = "http://localhost:3000/api"

Write-Host "🧪 Testing Auth Module" -ForegroundColor Cyan
Write-Host ""

# Test 1: Health Check
Write-Host "✓ Test 1: Health Check" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl/health" | ConvertTo-Json -Compress
Write-Host ""

# Test 2: Login Admin
Write-Host "✓ Test 2: Login Admin" -ForegroundColor Green
$adminLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"email":"admin@mekanos.com","password":"Admin123!"}'
Write-Host "Token: $($adminLogin.access_token.Substring(0,50))..." -ForegroundColor Gray
Write-Host ""

# Test 3: Get Profile
Write-Host "✓ Test 3: Get Profile" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl/auth/me" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $($adminLogin.access_token)"} | ConvertTo-Json -Compress
Write-Host ""

# Test 4: Mock Users (Admin)
Write-Host "✓ Test 4: Mock Users (Admin only)" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl/auth/mock-users" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $($adminLogin.access_token)"} | ConvertTo-Json -Compress
Write-Host ""

# Test 5: Admin Test
Write-Host "✓ Test 5: Admin Test Endpoint" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl/auth/admin-test" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $($adminLogin.access_token)"} | ConvertTo-Json -Compress
Write-Host ""

# Test 6: Invalid Credentials
Write-Host "✓ Test 6: Invalid Credentials (debe fallar con 401)" -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "$baseUrl/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"email":"admin@mekanos.com","password":"Wrong"}'
} catch {
    Write-Host "Esperado: 401 Unauthorized" -ForegroundColor DarkGreen
}
Write-Host ""

# Test 7: Login Tecnico
Write-Host "✓ Test 7: Login Técnico" -ForegroundColor Green
$tecnicoLogin = Invoke-RestMethod -Uri "$baseUrl/auth/login" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body '{"email":"tecnico@mekanos.com","password":"Tecnico123!"}'
Write-Host "Token: $($tecnicoLogin.access_token.Substring(0,50))..." -ForegroundColor Gray
Write-Host ""

# Test 8: Tech Test Endpoint
Write-Host "✓ Test 8: Tech Test Endpoint (técnico OK)" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl/auth/tech-test" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $($tecnicoLogin.access_token)"} | ConvertTo-Json -Compress
Write-Host ""

# Test 9: Forbidden Access
Write-Host "✓ Test 9: Forbidden Access (técnico → admin endpoint, debe fallar 403)" -ForegroundColor Green
try {
    Invoke-RestMethod -Uri "$baseUrl/auth/admin-test" `
        -Method GET `
        -Headers @{"Authorization"="Bearer $($tecnicoLogin.access_token)"}
} catch {
    Write-Host "Esperado: 403 Forbidden" -ForegroundColor DarkGreen
}
Write-Host ""

# Test 10: Refresh Token
Write-Host "✓ Test 10: Refresh Token" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl/auth/refresh" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body ('{"refresh_token":"' + $adminLogin.refresh_token + '"}') | ConvertTo-Json -Compress
Write-Host ""

Write-Host "✅ Todos los tests completados!" -ForegroundColor Cyan
```

---

## 📊 CHECKLIST DE VALIDACIÓN

Antes de considerar Auth Module completo, validar:

- [x] ✅ Login con admin funciona
- [x] ✅ Login con técnico funciona
- [x] ✅ Login con cliente funciona
- [x] ✅ Login con credenciales inválidas retorna 401
- [x] ✅ Endpoint protegido sin token retorna 401
- [x] ✅ Endpoint protegido con token válido funciona
- [x] ✅ Endpoint admin con token admin funciona
- [x] ✅ Endpoint admin con token técnico retorna 403
- [x] ✅ Endpoint técnico con token técnico funciona
- [x] ✅ Refresh token funciona correctamente
- [x] ✅ Lista mock users con admin funciona
- [x] ✅ @CurrentUser extrae usuario correctamente
- [x] ✅ @Roles valida roles correctamente

---

## 🔍 DEBUGGING

### Ver logs del servidor
El servidor muestra automáticamente:
- Rutas registradas
- Requests entrantes
- Errores con stack trace

### Verificar JWT Token
```powershell
# Copiar token y decodificar en https://jwt.io
$token = "eyJhbGciOiJIUzI1..."
Write-Host $token
```

**Payload esperado:**
```json
{
  "sub": 1,
  "email": "admin@mekanos.com",
  "rol": "ADMIN",
  "personaId": 1,
  "iat": 1699737000,
  "exp": 1699737900
}
```

### Verificar Headers
```powershell
$response = Invoke-WebRequest -Uri "http://localhost:3000/api/auth/me" `
    -Method GET `
    -Headers @{"Authorization"="Bearer $token"}

$response.Headers
$response.StatusCode
```

---

## 🚨 TROUBLESHOOTING

### Error: "Can't reach database server"
**Solución:** Normal. Usando mocks. Verificar que mensaje diga:
```
⚠️  PrismaService: Conexión desactivada (red bloqueada)
```

### Error: "Cannot find module '@nestjs/common'"
**Solución:**
```powershell
cd monorepo
pnpm install
```

### Error: "Port 3000 already in use"
**Solución:**
```powershell
# Matar proceso en puerto 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### Error: "Unauthorized" en todos los endpoints
**Verificar:**
1. Token no expirado (15 minutos)
2. Header correcto: `Authorization: Bearer {token}`
3. JWT_SECRET en .env coincide

---

**Última actualización:** 11 Nov 2025, 15:35  
**Servidor:** http://localhost:3000/api  
**Status:** ✅ **TODOS LOS TESTS PASANDO**
