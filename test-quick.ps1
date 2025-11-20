# Test Simple - Login y POST tipos-equipo
$baseUrl = "http://127.0.0.1:3000/api"

Write-Host "=== TEST RAPIDO FASE 1 ===" -ForegroundColor Cyan

# 1. LOGIN
Write-Host "`n1. Obteniendo token JWT..." -ForegroundColor Yellow
$loginBody = '{"email":"admin@mekanos.com","password":"Admin123!"}'
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
$token = $loginResponse.access_token
Write-Host "   Token obtenido OK" -ForegroundColor Green

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type"  = "application/json"
}

# 2. POST tipos-equipo
Write-Host "`n2. POST /api/tipos-equipo..." -ForegroundColor Yellow
$tipoBody = @{
    codigo_tipo           = "TEST-$(Get-Random)"
    nombre_tipo           = "TEST ENUM CORREGIDO"
    categoria             = "ENERGIA"
    formato_ficha_tecnica = "FORMATO_TEST"
} | ConvertTo-Json

try {
    $createResp = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo" -Method POST -Headers $headers -Body $tipoBody
    $newId = $createResp.data.id_tipo_equipo
    $createdBy = $createResp.data.creado_por
    Write-Host "   POST OK - ID: $newId, creado_por: $createdBy" -ForegroundColor Green
    
    # 3. PUT tipos-equipo
    Write-Host "`n3. PUT /api/tipos-equipo/$newId..." -ForegroundColor Yellow
    $updateBody = @{
        nombre_tipo           = "TEST ENUM ACTUALIZADO"
        categoria             = "ENERGIA"
        formato_ficha_tecnica = "FORMATO_TEST"
    } | ConvertTo-Json
    
    $updateResp = Invoke-RestMethod -Uri "$baseUrl/tipos-equipo/$newId" -Method PUT -Headers $headers -Body $updateBody
    $modifiedBy = $updateResp.data.modificado_por
    Write-Host "   PUT OK - modificado_por: $modifiedBy" -ForegroundColor Green
    
    # 4. DELETE tipos-equipo
    Write-Host "`n4. DELETE /api/tipos-equipo/$newId..." -ForegroundColor Yellow
    Invoke-RestMethod -Uri "$baseUrl/tipos-equipo/$newId" -Method DELETE -Headers $headers | Out-Null
    Write-Host "   DELETE OK" -ForegroundColor Green
    
    Write-Host "`n=== TODOS LOS TESTS PASARON ===" -ForegroundColor Green
    Write-Host "Bug #5 (Enums) RESUELTO!" -ForegroundColor Green
    
}
catch {
    Write-Host "   ERROR:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}
