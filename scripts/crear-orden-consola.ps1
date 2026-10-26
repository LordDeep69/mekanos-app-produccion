<#
  crear-orden-consola.ps1  (Mekanos - creación de orden de servicio desde consola)
  ------------------------------------------------------------------------------
  Equivalente programático del wizard del Portal Admin:
      cliente -> sede -> equipo -> servicio -> fecha/prioridad -> técnico

  Reproduce los mismos endpoints que usa la UI (apps/admin/src/features/ordenes):
    GET  /clientes/selector            (cliente)
    GET  /sedes-cliente?id_cliente=     (sede)
    GET  /equipos/selector?clienteId=  (equipo)
    GET  /tipos-servicio?activo=true   (tipo de servicio)
    GET  /catalogo-servicios           (servicios específicos de correctivo)
    GET  /empleados?esTecnico=true     (técnico)
    POST /ordenes                      (crea la orden; con id_tecnico_asignado => ASIGNADA)
    PUT  /ordenes/:id/asignar          (asigna técnico después, si se creó sin técnico)
    GET  /ordenes/:id                  (verificación)

  MODO POR DEFECTO: SIMULACIÓN (no escribe nada). Para crear de verdad: -Ejecutar.
  Compatible con Windows PowerShell 5.1.

  EJEMPLO (compresor 214, para hoy, prioridad NORMAL):
    $env:MEKANOS_USER = 'admin@mekanos.com'
    $env:MEKANOS_PASS = '***'
    .\scripts\crear-orden-consola.ps1 -ClienteId 80 -EquipoId 214 -TipoServicioId 17 `
        -TecnicoId 18 -Fecha (Get-Date -Format 'yyyy-MM-dd') -Prioridad NORMAL
#>
[CmdletBinding()]
param(
  [string]$ApiUrl = $(if ($env:MEKANOS_API_URL) { $env:MEKANOS_API_URL } else { "http://localhost:3000/api" }),
  [string]$Email    = $env:MEKANOS_USER,
  [string]$Password = $env:MEKANOS_PASS,

  [Parameter(Mandatory = $true)][int]$ClienteId,
  [int]$SedeId = 0,
  [Parameter(Mandatory = $true)][int]$EquipoId,
  [Parameter(Mandatory = $true)][int]$TipoServicioId,
  [int]$TecnicoId = 0,
  [string]$TecnicoBusqueda = "",
  [int[]]$ServiciosIds = @(),
  [string]$Fecha = (Get-Date -Format "yyyy-MM-dd"),
  [ValidateSet("BAJA", "NORMAL", "ALTA", "URGENTE", "EMERGENCIA")][string]$Prioridad = "NORMAL",
  [string]$RazonFalla = "",
  [string]$Descripcion = "",

  [switch]$Ejecutar
)

$ErrorActionPreference = "Stop"
function Info($m) { Write-Host $m -ForegroundColor Cyan }
function OK($m)   { Write-Host $m -ForegroundColor Green }
function Warn($m)  { Write-Host $m -ForegroundColor Yellow }
function Err($m)  { Write-Host $m -ForegroundColor Red }

# Lectura segura de propiedades anidadas (compatible con PS 5.1)
function Get-Prop($obj, [string]$path, $default = $null) {
  if ($null -eq $obj) { return $default }
  $cur = $obj
  foreach ($p in $path.Split('.')) {
    if ($null -eq $cur) { return $default }
    if ($cur -is [System.Collections.IDictionary]) {
      if (-not $cur.Contains($p)) { return $default }
      $cur = $cur[$p]
    } else {
      $prop = $cur.PSObject.Properties[$p]
      if ($null -eq $prop) { return $default }
      $cur = $prop.Value
    }
  }
  if ($null -eq $cur) { return $default }
  return $cur
}

# ── Utilidades HTTP ───────────────────────────────────────────────────────────
$script:Token = $null
function Invoke-Api {
  param([string]$Method, [string]$Path, $Body = $null)
  $headers = @{ "Accept" = "application/json" }
  if ($script:Token) { $headers["Authorization"] = "Bearer $script:Token" }
  $params = @{
    Uri         = "$ApiUrl$Path"
    Method      = $Method
    Headers     = $headers
    TimeoutSec  = 60
    ContentType = "application/json; charset=utf-8"
    ErrorAction = "Stop"
  }
  if ($null -ne $Body) { $params["Body"] = ($Body | ConvertTo-Json -Depth 8) }
  try {
    Invoke-RestMethod @params
  } catch {
    $detalle = ""
    try {
      if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $detalle = $reader.ReadToEnd()
      }
    } catch {}
    throw "HTTP $Method $Path -> $($_.Exception.Message) $detalle"
  }
}

function Get-Array($resp) {
  if ($null -eq $resp) { return @() }
  if ($resp -is [array]) { return $resp }
  if ($resp.data -is [array]) { return $resp.data }
  if ((Get-Prop $resp 'data.data') -is [array]) { return $resp.data.data }
  return @()
}

# ── 0) Autenticación ─────────────────────────────────────────────────────────
if (-not $Email -or -not $Password) {
  Err "Faltan credenciales. Usa MEKANOS_USER y MEKANOS_PASS (variables de entorno)."
  exit 1
}
Info "API destino: $ApiUrl"
$login = Invoke-Api -Method POST -Path "/auth/login" -Body @{ email = $Email; password = $Password }
$script:Token = $login.access_token
if (-not $script:Token) { Err "El login no devolvió access_token."; exit 1 }
OK ("Autenticado: " + (Get-Prop $login 'usuario.email' $Email))

# ── 1) Cliente ───────────────────────────────────────────────────────────────
$clientes = Get-Array (Invoke-Api -Method GET -Path "/clientes/selector?limit=500")
$cliente = $clientes | Where-Object { $_.id_cliente -eq $ClienteId } | Select-Object -First 1
if (-not $cliente) { Err "Cliente $ClienteId no encontrado."; exit 2 }
OK "Cliente: $($cliente.nombre) (id=$ClienteId, NIT $($cliente.nit))"

# ── 2) Sede ──────────────────────────────────────────────────────────────────
$sedes = Get-Array (Invoke-Api -Method GET -Path "/sedes-cliente?id_cliente=$ClienteId")
$sede = $null
if ($sedes.Count -gt 0) {
  if ($SedeId -gt 0) {
    $sede = $sedes | Where-Object { $_.id_sede -eq $SedeId } | Select-Object -First 1
    if (-not $sede) { Err "La sede $SedeId no pertenece al cliente $ClienteId."; exit 3 }
  } else {
    $sede = $sedes | Select-Object -First 1
    Warn "El cliente tiene $($sedes.Count) sede(s); se toma '$($sede.nombre_sede)' (id=$($sede.id_sede)). Usa -SedeId para fijarla."
  }
  OK "Sede: $($sede.nombre_sede) (id=$($sede.id_sede))"
} else {
  Info "El cliente no tiene sedes registradas: la orden se creará sin id_sede."
}

# ── 3) Equipo (debe pertenecer al cliente) ───────────────────────────────────
$qsEquipos = "/equipos/selector?clienteId=$ClienteId&limit=500"
if ($sede -and $sede.id_sede) { $qsEquipos += "&sedeId=$($sede.id_sede)" }
$equipos = Get-Array (Invoke-Api -Method GET -Path $qsEquipos)
$equipo = $equipos | Where-Object { $_.id_equipo -eq $EquipoId } | Select-Object -First 1
if (-not $equipo) {
  Err "El equipo $EquipoId no aparece para el cliente $ClienteId (misma validación que hace la UI)."
  Err "Disponibles: $(($equipos | ForEach-Object { "$($_.id_equipo):$($_.codigo_equipo)" }) -join ', ')"
  exit 4
}
$eqTipo = Get-Prop $equipo 'tipos_equipo.codigo_tipo' (Get-Prop $equipo 'tipo')
OK "Equipo: $($equipo.codigo_equipo) - $($equipo.nombre) [tipo $eqTipo]"

# ── 4) Tipo de servicio (y compatibilidad de familia) ────────────────────────
$tipos = Get-Array (Invoke-Api -Method GET -Path "/tipos-servicio?activo=true&limit=500")
$tipo = $tipos | Where-Object { $_.id_tipo_servicio -eq $TipoServicioId } | Select-Object -First 1
if (-not $tipo) { Err "Tipo de servicio $TipoServicioId no encontrado o inactivo."; exit 5 }
OK "Tipo de servicio: $($tipo.codigo_tipo) - $($tipo.nombre_tipo)"

# Misma jerarquía de familia que usa la UI (apps/admin/.../familia-equipo.ts):
# el tipo declarado manda; los compresores admiten servicios COMP y BOMBA.
$famEquipo = switch -Regex ($eqTipo) {
  "^GEN"  { "GENERADOR" }
  "^BOM"  { "BOMBA" }
  "^COMP" { "COMPRESOR" }
  "^MOT"  { "MOTOR" }
  default { "GLOBAL" }
}
$famServicio = switch -Regex ($tipo.codigo_tipo) {
  "^GEN"  { "GENERADOR" }
  "^BOM"  { "BOMBA" }
  "^COMP" { "COMPRESOR" }
  "^MOT"  { "MOTOR" }
  default { "GLOBAL" }
}
if ($famEquipo -ne "GLOBAL" -and $famServicio -ne "GLOBAL" -and $famEquipo -ne $famServicio) {
  if (-not ($famEquipo -eq "COMPRESOR" -and $famServicio -eq "BOMBA")) {
    Warn "Familia del equipo ($famEquipo) != familia del servicio ($famServicio). La UI lo filtraría; el API NO lo bloquea."
  }
}

# ── 5) Servicios específicos (correctivos) ───────────────────────────────────
$servicios = @()
if ($ServiciosIds -and $ServiciosIds.Count -gt 0) {
  $catalogo = Get-Array (Invoke-Api -Method GET -Path "/catalogo-servicios?activo=true&limit=500&idTipoServicio=$TipoServicioId")
  foreach ($sid in $ServiciosIds) {
    $s = $catalogo | Where-Object { $_.id_servicio -eq $sid } | Select-Object -First 1
    if (-not $s) { Warn "Servicio $sid no está en el catálogo activo del tipo $TipoServicioId; se enviará igual." }
    else { $servicios += $s.id_servicio }
  }
  OK "Servicios específicos: $($servicios -join ', ')"
}

# ── 6) Técnico ───────────────────────────────────────────────────────────────
$tecnico = $null
$qsTec = "/empleados?activo=true&esTecnico=true&limit=200"
if ($TecnicoBusqueda) { $qsTec += "&search=$([uri]::EscapeDataString($TecnicoBusqueda))" }
$tecnicos = Get-Array (Invoke-Api -Method GET -Path $qsTec)
if ($TecnicoId -gt 0) {
  $tecnico = $tecnicos | Where-Object { $_.id_empleado -eq $TecnicoId } | Select-Object -First 1
  if (-not $tecnico) {
    Err "Técnico $TecnicoId no está en el listado de técnicos activos."
    Err "Disponibles: $(($tecnicos | ForEach-Object { "$($_.id_empleado):$((Get-Prop $_ 'persona.primer_nombre'), (Get-Prop $_ 'persona.primer_apellido') -join ' ')" }) -join ', ')"
    exit 6
  }
} elseif ($TecnicoBusqueda) {
  $tecnico = $tecnicos | Select-Object -First 1
  if (-not $tecnico) { Err "Sin resultados para técnico '$TecnicoBusqueda'."; exit 6 }
  $TecnicoId = $tecnico.id_empleado
}
if ($tecnico) {
  $nombreTec = (((Get-Prop $tecnico 'persona.primer_nombre'), (Get-Prop $tecnico 'persona.primer_apellido')) -join " ").Trim()
  OK "Técnico: $nombreTec (id_empleado=$TecnicoId)"
} else {
  Warn "Sin técnico: la orden quedará PROGRAMADA (se puede asignar luego con PUT /ordenes/:id/asignar)."
}

# ── 7) Payload ───────────────────────────────────────────────────────────────
$payload = [ordered]@{
  id_cliente          = $ClienteId
  id_equipo           = $EquipoId
  equipos_ids         = @($EquipoId)
  id_tipo_servicio    = $TipoServicioId
  servicios_ids       = $servicios
  id_sede_cliente     = $(if ($sede) { $sede.id_sede } else { $null })
  prioridad           = $Prioridad
  fecha_programada    = $Fecha
  descripcion_inicial = $Descripcion
  razon_falla         = $RazonFalla
  id_tecnico_asignado = $(if ($TecnicoId -gt 0) { $TecnicoId } else { $null })
}
$json = $payload | ConvertTo-Json -Depth 6
Info "--- Payload POST /ordenes ---"
Write-Host $json -ForegroundColor White

if (-not $Ejecutar) {
  Warn "SIMULACIÓN: no se creó nada. Agrega -Ejecutar para crear la orden."
  exit 0
}

# ── 8) Crear ─────────────────────────────────────────────────────────────────
$res = Invoke-Api -Method POST -Path "/ordenes" -Body $payload
$orden = $res.data
OK "Orden creada: $($orden.numero_orden) (id_orden_servicio=$($orden.id_orden_servicio))"
Info ("Estado inicial: " + (Get-Prop $orden 'estados_orden.codigo_estado' (Get-Prop $orden 'id_estado_actual')) +
      " | Técnico: " + $(if (Get-Prop $orden 'id_tecnico_asignado') { Get-Prop $orden 'id_tecnico_asignado' } else { 'pendiente' }))

# ── 9) Verificación (y asignación diferida si se creó sin técnico) ───────────
if ($TecnicoId -gt 0 -and -not (Get-Prop $orden 'id_tecnico_asignado')) {
  Warn "Asignando técnico $TecnicoId a la orden $($orden.numero_orden)..."
  $asig = Invoke-Api -Method PUT -Path "/ordenes/$($orden.id_orden_servicio)/asignar" -Body @{ tecnicoId = $TecnicoId }
  OK "Asignación: $($asig.message)"
}

$verif = Invoke-Api -Method GET -Path "/ordenes/$($orden.id_orden_servicio)"
$v = $verif.data
$tecFinal = ((Get-Prop $v 'empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.primer_nombre'),
             (Get-Prop $v 'empleados_ordenes_servicio_id_tecnico_asignadoToempleados.persona.primer_apellido')) -join " "
OK ("VERIFICACIÓN: " + (Get-Prop $v 'numero_orden') +
    " | estado=" + (Get-Prop $v 'estados_orden.codigo_estado' (Get-Prop $v 'id_estado_actual')) +
    " | cliente=" + (Get-Prop $v 'clientes.razon_social') +
    " | equipo=" + (Get-Prop $v 'equipos.codigo_equipo') +
    " | técnico=" + $tecFinal.Trim() +
    " | fecha=" + (Get-Prop $v 'fecha_programada'))
