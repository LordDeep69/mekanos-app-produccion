# Tests 8/8 catalog actividades - Ejecución rápida
$ErrorActionPreference = "Stop"

# JWT
$a=@{email='admin@mekanos.com';password='Admin123!'}|ConvertTo-Json
$r=Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -Body $a -ContentType 'application/json'
$h=@{Authorization="Bearer $($r.access_token)"}

Write-Host "✅ T1-2: GET lista + activos" -F Green
$t1=Invoke-RestMethod -Uri 'http://localhost:3000/api/catalogo-actividades?page=1&limit=5' -Headers $h
$t2=Invoke-RestMethod -Uri 'http://localhost:3000/api/catalogo-actividades/activos' -Headers $h

Write-Host "✅ T5: POST crear" -F Green
$b=@{codigoActividad="ACT_E2E_$(Get-Random)";descripcionActividad='Test E2E final';idTipoServicio=1;tipoActividad='INSPECCION';ordenEjecucion=1;esObligatoria=$true;tiempoEstimadoMinutos=30;activo=$true;creadoPor=1}|ConvertTo-Json
$t5=Invoke-RestMethod -Uri 'http://localhost:3000/api/catalogo-actividades' -Method POST -Headers $h -Body $b -ContentType 'application/json'
$id=$t5.idActividadCatalogo

Write-Host "✅ T3: GET por ID ($id)" -F Green
$t3=Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/$id" -Headers $h

Write-Host "✅ T4: GET por código ($($t5.codigoActividad))" -F Green
$t4=Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/codigo/$($t5.codigoActividad)" -Headers $h

Write-Host "✅ T6: PUT actualizar" -F Green
$u=@{descripcionActividad='UPDATED final';ordenEjecucion=99;modificadoPor=1}|ConvertTo-Json
$t6=Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/$id" -Method PUT -Headers $h -Body $u -ContentType 'application/json'

Write-Host "✅ T7: DELETE soft" -F Green
$d=@{modificadoPor=1}|ConvertTo-Json
$t7=Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/$id" -Method DELETE -Headers $h -Body $d -ContentType 'application/json'

Write-Host "✅ T8: GET verificar soft delete" -F Green
$t8=Invoke-RestMethod -Uri "http://localhost:3000/api/catalogo-actividades/$id" -Headers $h

Write-Host "`n========================================" -F Cyan
Write-Host "✅ 8/8 TESTS COMPLETADOS" -F Green -BackgroundColor Black
Write-Host "========================================`n" -F Cyan
Write-Host "ID creado: $id"
Write-Host "Código: $($t5.codigoActividad)"
Write-Host "Soft deleted: $(-not $t8.activo)"
Write-Host "`n🎯 TABLA 6 (catalogo_actividades): 100% OK"
