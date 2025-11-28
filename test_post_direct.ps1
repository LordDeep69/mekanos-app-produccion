# Guardar token en variable global
$global:token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AbWVrYW5vcy5jb20iLCJyb2wiOiJVU0VSIiwicGVyc29uYUl..."

# Headers
$global:h = @{
    Authorization = "Bearer $global:token"
    'Content-Type' = 'application/json'
}

# Body POST
$bodyPost = @{
    codigoActividad = "TEST_FIX_MAPPER"
    descripcionActividad = "Validar fix campo tipos_servicio"
    idTipoServicio = 1
    tipoActividad = "INSPECCION"
    ordenEjecucion = 999
    esObligatoria = $true
    tiempoEstimadoMinutos = 30
    activo = $true
    creadoPor = 1
} | ConvertTo-Json

# Ejecutar POST
Write-Host "POST crear actividad..." -ForegroundColor Yellow
$result = Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades" -Method POST -Headers $global:h -Body $bodyPost

#Mostrar resultado
Write-Host "`nSUCCESS!" -ForegroundColor Green
$result | Format-List

if ($result.tipoServicio) {
    Write-Host "MAPPER FIX VALIDADO - codigo_tipo y nombre_tipo cargados OK" -ForegroundColor Cyan
}
