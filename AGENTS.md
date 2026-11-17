# Reglas del Repositorio (Mekanos App Producción)

## Ejecución Obligatoria en Windows (Prevención de Procesos Colgados / Sin EOF)

Estas directrices son de cumplimiento estricto y obligatorio para todo comando ejecutado en terminal dentro de este repositorio:

1. **Entorno operativo:** Windows.
2. **Prefijo obligatorio `cmd /c`:** Ejecutar **SIEMPRE** todos los comandos de consola usando el prefijo `cmd /c` para forzar el cierre inmediato del proceso y garantizar el envío de la señal `EOF` al finalizar.
   - Ejemplos:
     - `cmd /c pnpm run build`
     - `cmd /c pnpm --filter admin build`
     - `cmd /c git status`
3. **Prohibición de comandos interactivos o bloqueantes:** Está terminantemente prohibido abrir shells interactivos, modos watch (`--watch`) o prompts que esperen entrada manual (`stdin`). Usar siempre flags no interactivos (`--yes`, `-y`, `--no-pager`, etc.).
4. **Pruebas con Jest:** Al ejecutar pruebas con Jest, añadir **SIEMPRE** `--runInBand --forceExit --ci` (en bloques cortos por módulo cuando haga falta) para cerrar workers o handles abiertos de Node.js al finalizar la suite.
5. **Compilaciones Next.js / Webpack (`pnpm run build`):** Establecer **SIEMPRE** `CI=true` antes de ejecutar el build y verificar que ningún proceso `node.exe` hijo quede retenido.
6. **Ejecución síncrona sin bloqueos (`IsDaemon: false`):** Usar `WaitMsBeforeAsync` al máximo necesario dentro del rango permitido para evitar procesos colgados o turnos en espera indefinida.
