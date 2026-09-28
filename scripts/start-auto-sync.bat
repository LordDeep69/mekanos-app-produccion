@echo off
title MEKANOS API - Auto-Sync Daemon
cd /d "%~dp0\.."
echo ========================================================
echo  MEKANOS API - Auto-Sync Daemon (Monitor de Cambios)
echo ========================================================
echo Iniciando monitor continuo de repositorio remoto...
node scripts/auto-sync-remote.mjs
pause
