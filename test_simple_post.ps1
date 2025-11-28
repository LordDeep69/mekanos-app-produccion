# Test simple POST crear catalogo_actividades
# Ejecutar línea por línea en PowerShell

# 1. Login
$authBody = @{
    email = "admin@mekanos.com"
    password = "Admin123!"
} | ConvertTo-Json

$auth = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $authBody -ContentType "application/json"
$h = @{ Authorization = "Bearer $($auth.access_token)" }
Write-Host "JWT OK" -ForegroundColor Green

# 2. POST crear (test crítico)
$body = @{
    codigoActividad = "TEST_FIX_500"
    descripcionActividad = "Test  validación mapper fix"
    idTipoServicio = 1
    tipoActividad = "INSPECCION"
    ordenEjecucion = 999
    esObligatoria = $true
    tiempoEstimadoMinutos = 45
    activo = $true
    creadoPor = 1
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades" -Method POST -Headers $h -Body $body -ContentType "application/json"

Write-Host "`nRESULTADO:" -ForegroundColor Cyan
Write-Host "ID: $($result.idActividadCatalogo)"
Write-Host "Código: $($result.codigoActividad)"
Write-Host "Descripción: $($result.descripcionActividad)"

if ($result.tipoServicio) {
    Write-Host "`nRELACIÓN CARGADA:" -ForegroundColor Green
    Write-Host "Tipo Servicio: $($result.tipoServicio.nombreTipoServicio)"
    Write-Host "Código Tipo: $($result.tipoServicio.codigoTipoServicio)"
    Write-Host "`n✅ MAPPER FIX VALIDADO!" -ForegroundColor Green -BackgroundColor Black
}
