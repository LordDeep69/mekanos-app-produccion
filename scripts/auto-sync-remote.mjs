/**
 * MEKANOS - Daemon de Sincronización Automática con Repositorio Remoto y Auto-Reload API
 * 
 * Monitorea continuamente el repositorio remoto en GitHub.
 * Cuando detecta que se hizo push desde otra máquina:
 * 1. Hace git pull automático (Fast-Forward).
 * 2. Si detecta cambios en packages/database/prisma/schema.prisma -> ejecuta prisma:generate.
 * 3. Si detecta cambios en package.json / pnpm-lock.yaml -> ejecuta pnpm install.
 * 4. Si detecta cambios en apps/api -> compila y reinicia el servicio limpiamente.
 * 5. Monitorea la salud de la API (http://localhost:3000/api/health) y la revive si cae.
 */

import { execSync, spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '10000', 10);
const HEALTH_URL = 'http://localhost:3000/api/health';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
};

function log(msg, color = colors.reset) {
  const ts = new Date().toLocaleTimeString('es-CO', { hour12: false });
  console.log(`${colors.gray}[${ts}]${colors.reset} ${color}${msg}${colors.reset}`);
}

function runCmd(command, cwd = ROOT_DIR) {
  return execSync(command, { cwd, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
}

function checkApiHealth() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 300);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(4000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let apiProcess = null;

function killProcessOnPort(port) {
  try {
    const out = runCmd(`powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique"`);
    const pids = out.split('\n').map(p => p.trim()).filter(Boolean);
    for (const pid of pids) {
      if (pid && pid !== '0' && pid !== `${process.pid}`) {
        log(`Deteniendo proceso previo en puerto ${port} (PID: ${pid})...`, colors.gray);
        runCmd(`powershell -NoProfile -Command "Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue"`);
      }
    }
  } catch (err) {
    // Silencioso si no hay nadie escuchando
  }
}

function startApiServer() {
  log('🚀 Iniciando API NestJS (apps/api/dist/main)...', colors.cyan);
  killProcessOnPort(3000);

  const mainPath = path.join(ROOT_DIR, 'apps', 'api', 'dist', 'main.js');
  apiProcess = spawn('node', ['--enable-source-maps', mainPath], {
    cwd: ROOT_DIR,
    stdio: 'inherit',
    env: process.env,
    detached: false,
  });

  apiProcess.on('error', (err) => {
    log(`❌ Error al ejecutar API: ${err.message}`, colors.red);
  });

  apiProcess.on('exit', (code, signal) => {
    log(`ℹ️ Proceso API finalizó (code: ${code}, signal: ${signal})`, colors.yellow);
    apiProcess = null;
  });
}

let isSyncing = false;

async function syncLoop() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    // 1. Obtener rama actual
    const currentBranch = runCmd('git rev-parse --abbrev-ref HEAD');
    if (!currentBranch || currentBranch === 'HEAD') {
      isSyncing = false;
      return;
    }

    // 2. Fetch silencioso al remoto origin
    try {
      runCmd(`git fetch origin ${currentBranch} --quiet`);
    } catch {
      // Problema de red temporal
      isSyncing = false;
      return;
    }

    // 3. Comparar HEAD local vs remoto
    const localCommit = runCmd('git rev-parse HEAD');
    let remoteCommit = '';
    try {
      remoteCommit = runCmd(`git rev-parse origin/${currentBranch}`);
    } catch {
      isSyncing = false;
      return;
    }

    if (localCommit === remoteCommit) {
      // Todo al día en Git. Verificar salud de la API.
      const isAlive = await checkApiHealth();
      if (!isAlive && !apiProcess) {
        log('⚠️ API caída o no iniciada. Auto-recuperando...', colors.yellow);
        startApiServer();
      }
      isSyncing = false;
      return;
    }

    // 4. Verificar si es fast-forward
    let isAncestor = false;
    try {
      runCmd(`git merge-base --is-ancestor HEAD origin/${currentBranch}`);
      isAncestor = true;
    } catch {
      isAncestor = false;
    }

    if (!isAncestor) {
      log(`⚠️ Atención: La rama local '${currentBranch}' ha divergido de 'origin/${currentBranch}'. No se puede hacer Fast-Forward automático.`, colors.red);
      isSyncing = false;
      return;
    }

    // 5. Verificar si hay cambios locales sin commit
    const localDirty = runCmd('git status --porcelain');
    if (localDirty.length > 0) {
      log(`⚠️ Hay archivos modificados sin guardar en esta PC. Se pospone pull para evitar conflictos:`, colors.yellow);
      console.log(localDirty);
      isSyncing = false;
      return;
    }

    // 6. ¡Nuevos commits detectados desde otra máquina!
    const newCommits = runCmd(`git log HEAD..origin/${currentBranch} --oneline`);
    const changedFiles = runCmd(`git diff --name-only HEAD origin/${currentBranch}`).split('\n').map(s => s.trim()).filter(Boolean);

    log(`\n======================================================`, colors.cyan);
    log(`🚀 NUEVOS COMMITS DETECTADOS DESDE OTRA MÁQUINA EN origin/${currentBranch}:`, colors.bright + colors.cyan);
    console.log(colors.magenta + newCommits + colors.reset);
    log(`------------------------------------------------------`, colors.cyan);

    log(`📥 Aplicando git pull origin ${currentBranch}...`, colors.cyan);
    const pullOutput = runCmd(`git pull origin ${currentBranch}`);
    log(`✅ Git Pull completado: ${pullOutput.split('\n')[0]}`, colors.green);

    // 7. Evaluar dependencias y Prisma
    const prismaChanged = changedFiles.some(f => f.includes('schema.prisma'));
    const packageChanged = changedFiles.some(f => f.includes('package.json') || f.includes('pnpm-lock.yaml'));
    const apiChanged = changedFiles.some(f => f.startsWith('apps/api/'));

    if (packageChanged) {
      log('📦 Cambio detectado en dependencias. Ejecutando pnpm install...', colors.yellow);
      try {
        runCmd('pnpm install');
        log('✅ Dependencias actualizadas.', colors.green);
      } catch (err) {
        log(`❌ Error al instalar dependencias: ${err.message}`, colors.red);
      }
    }

    if (prismaChanged) {
      log('🗄️ Cambio detectado en schema.prisma. Regenerando cliente Prisma...', colors.yellow);
      try {
        runCmd('pnpm --filter @mekanos/database prisma:generate');
        log('✅ Cliente Prisma regenerado.', colors.green);
      } catch (err) {
        log(`❌ Error al regenerar Prisma: ${err.message}`, colors.red);
      }
    }

    if (apiChanged) {
      log('🔨 Compilando nueva versión de la API con NestJS...', colors.cyan);
      try {
        runCmd('pnpm --filter @mekanos/api build');
        log('✅ Compilación exitosa.', colors.green);
        log('🔄 Reiniciando servidor API con el código actualizado...', colors.cyan);
        startApiServer();
      } catch (err) {
        log(`❌ Error en compilación de la API: ${err.message}`, colors.red);
      }
    }

    // 8. Verificar salud de la API después de actualizar
    log('⏳ Verificando disponibilidad de la API...', colors.gray);
    let attempts = 0;
    let healthy = false;
    while (attempts < 10 && !healthy) {
      await sleep(2000);
      healthy = await checkApiHealth();
      attempts++;
    }

    if (healthy) {
      log(`🎉 [AUTO-SYNC] API 100% OPERATIVA Y ACTUALIZADA en http://localhost:3000`, colors.bright + colors.green);
    } else {
      log(`⚠️ [AUTO-SYNC] La API aún no responde en ${HEALTH_URL}.`, colors.yellow);
    }

  } catch (error) {
    log(`❌ Error inesperado en ciclo de sincronización: ${error.message}`, colors.red);
  } finally {
    isSyncing = false;
  }
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🤖 MEKANOS REMOTE AUTO-SYNC & AUTO-RELOAD DAEMON`);
  console.log(`======================================================`);
  log(`Directorio raíz: ${ROOT_DIR}`, colors.gray);
  log(`Intervalo de chequeo: cada ${INTERVAL_MS / 1000} segundos`, colors.gray);
  log(`Endpoint de salud: ${HEALTH_URL}`, colors.gray);
  console.log(`------------------------------------------------------\n`);

  // Chequeo inicial
  const initHealth = await checkApiHealth();
  if (initHealth) {
    log(`✅ API detectada y respondiendo activamente en ${HEALTH_URL}`, colors.green);
  } else {
    log(`ℹ️ Iniciando API por primera vez...`, colors.yellow);
    startApiServer();
  }

  // Ciclo periódico
  setInterval(syncLoop, INTERVAL_MS);
}

main().catch(err => {
  console.error('Fatal error in auto-sync daemon:', err);
  process.exit(1);
});
