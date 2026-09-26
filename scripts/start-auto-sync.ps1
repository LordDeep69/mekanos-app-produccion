# ========================================================
# MEKANOS - Lanzador de Sincronización Automática con Remoto
# ========================================================
$Host.UI.RawUI.WindowTitle = "MEKANOS API - Auto-Sync Daemon"
Write-Host "Iniciando monitor continuo de repositorio remoto..." -ForegroundColor Cyan
Set-Location $PSScriptRoot\..
node scripts/auto-sync-remote.mjs
