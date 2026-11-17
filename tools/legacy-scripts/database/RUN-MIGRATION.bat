@echo off
echo ============================================================
echo EJECUTANDO MIGRACION MULTIEQUIPOS EN SUPABASE
echo ============================================================
cd /d "%~dp0"
node migrate-multiequipos.js
echo.
echo ============================================================
echo PRESIONE CUALQUIER TECLA PARA CONTINUAR...
pause >nul
