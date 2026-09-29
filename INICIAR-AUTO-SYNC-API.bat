@echo off
title MEKANOS API - Auto-Sync ^& Auto-Reload Daemon
color 0A
cd /d "%~dp0"

echo ======================================================================
echo    MEKANOS S.A.S - DAEMON AUTONOMO DE API Y AUTO-SINCRONIZACION
echo ======================================================================
echo.
echo  Este proceso se ejecuta de manera 100%% independiente del editor.
echo  Puedes cerrar Antigravity IDE y el servidor seguira vivo y expuesto.
echo.
echo  - Monitorea GitHub cada 10 segundos
echo  - Aplica git pull al detectar tus commits desde la otra PC
echo  - Recompila y recarga la API automaticamente en puerto 3000
echo.
echo ======================================================================
echo.

node scripts\auto-sync-remote.mjs

echo.
echo El proceso ha terminado. Presiona cualquier tecla para salir...
pause >nul
