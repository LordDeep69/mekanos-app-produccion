# Test Auth Endpoints

Write-Host "`n🧪 TESTING AUTH ENDPOINTS`n" -ForegroundColor Cyan

# Test 1: Login with Admin
Write-Host "1️⃣  Testing LOGIN with admin@mekanos.com..." -ForegroundColor Yellow
try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"email":"admin@mekanos.com","password":"Admin123!"}' `
        -ErrorAction Stop

    Write-Host "✅ Login exitoso!" -ForegroundColor Green
    Write-Host ($loginResponse | ConvertTo-Json -Depth 5)
    
    $accessToken = $loginResponse.access_token
    Write-Host "`n📝 Access Token: $($accessToken.Substring(0,50))..." -ForegroundColor Gray

    # Test 2: Get Profile with Token
    Write-Host "`n2️⃣  Testing GET /auth/me con token..." -ForegroundColor Yellow
    try {
        $profileResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/me" `
            -Method GET `
            -Headers @{
                "Authorization" = "Bearer $accessToken"
            } `
            -ErrorAction Stop

        Write-Host "✅ Perfil obtenido!" -ForegroundColor Green
        Write-Host ($profileResponse | ConvertTo-Json -Depth 5)
    } catch {
        Write-Host "❌ Error obteniendo perfil: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 3: Get Mock Users (Admin only)
    Write-Host "`n3️⃣  Testing GET /auth/mock-users (admin only)..." -ForegroundColor Yellow
    try {
        $mockUsersResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/mock-users" `
            -Method GET `
            -Headers @{
                "Authorization" = "Bearer $accessToken"
            } `
            -ErrorAction Stop

        Write-Host "✅ Lista de usuarios mock obtenida!" -ForegroundColor Green
        Write-Host ($mockUsersResponse | ConvertTo-Json -Depth 5)
    } catch {
        Write-Host "❌ Error obteniendo mock users: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 4: Admin Test Endpoint
    Write-Host "`n4️⃣  Testing GET /auth/admin-test..." -ForegroundColor Yellow
    try {
        $adminTestResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/admin-test" `
            -Method GET `
            -Headers @{
                "Authorization" = "Bearer $accessToken"
            } `
            -ErrorAction Stop

        Write-Host "✅ Admin test exitoso!" -ForegroundColor Green
        Write-Host ($adminTestResponse | ConvertTo-Json -Depth 5)
    } catch {
        Write-Host "❌ Error en admin test: $($_.Exception.Message)" -ForegroundColor Red
    }

} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
}

# Test 5: Login with Tecnico
Write-Host "`n5️⃣  Testing LOGIN with tecnico@mekanos.com..." -ForegroundColor Yellow
try {
    $tecnicoResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"email":"tecnico@mekanos.com","password":"Tecnico123!"}' `
        -ErrorAction Stop

    Write-Host "✅ Login técnico exitoso!" -ForegroundColor Green
    Write-Host ($tecnicoResponse | ConvertTo-Json -Depth 5)

    $tecnicoToken = $tecnicoResponse.access_token

    # Test 6: Tech Test Endpoint
    Write-Host "`n6️⃣  Testing GET /auth/tech-test con técnico..." -ForegroundColor Yellow
    try {
        $techTestResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/tech-test" `
            -Method GET `
            -Headers @{
                "Authorization" = "Bearer $tecnicoToken"
            } `
            -ErrorAction Stop

        Write-Host "✅ Tech test exitoso!" -ForegroundColor Green
        Write-Host ($techTestResponse | ConvertTo-Json -Depth 5)
    } catch {
        Write-Host "❌ Error en tech test: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test 7: Try to access admin endpoint (should fail)
    Write-Host "`n7️⃣  Testing GET /auth/admin-test con técnico (debe fallar)..." -ForegroundColor Yellow
    try {
        $failedResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/admin-test" `
            -Method GET `
            -Headers @{
                "Authorization" = "Bearer $tecnicoToken"
            } `
            -ErrorAction Stop

        Write-Host "⚠️  No debería haber tenido acceso!" -ForegroundColor Red
    } catch {
        Write-Host "✅ Acceso denegado correctamente! (403 Forbidden esperado)" -ForegroundColor Green
        if ($_.ErrorDetails) {
            Write-Host "   Mensaje: $($_.ErrorDetails.Message)" -ForegroundColor Gray
        }
    }

} catch {
    Write-Host "❌ Error en login técnico: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 8: Login with invalid credentials
Write-Host "`n8️⃣  Testing LOGIN con credenciales inválidas..." -ForegroundColor Yellow
try {
    $invalidResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" `
        -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body '{"email":"admin@mekanos.com","password":"WrongPassword"}' `
        -ErrorAction Stop

    Write-Host "⚠️  Login no debería haber funcionado!" -ForegroundColor Red
} catch {
    Write-Host "✅ Login falló correctamente! (401 Unauthorized esperado)" -ForegroundColor Green
    if ($_.ErrorDetails) {
        Write-Host "   Mensaje: $($_.ErrorDetails.Message)" -ForegroundColor Gray
    }
}

Write-Host "`n✅ TESTS COMPLETADOS`n" -ForegroundColor Cyan
