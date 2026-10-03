const { execSync } = require('child_process');

// On Windows, release file locks on query_engine-windows.dll.node by stopping any API process on port 3000
if (process.platform === 'win32') {
  try {
    execSync(
      'powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { if ($_ -and $_ -ne 0 -and $_ -ne $PID) { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue } }"',
      { stdio: 'ignore' }
    );
  } catch (e) {
    // Non-fatal if no process was running
  }
}
