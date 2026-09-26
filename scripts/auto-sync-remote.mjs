/**
 * MEKANOS - Daemon de Sincronización Automática con Repositorio Remoto
 * 
 * Monitorea continuamente el repositorio remoto en GitHub.
 * Cuando detecta que se hizo push desde otra máquina:
 * 1. Hace git pull automático (Fast-Forward).
 * 2. Si detecta cambios en packages/database/prisma/schema.prisma -> ejecuta prisma:generate.
 * 3. Si detecta cambios en package.json / pnpm-lock.yaml -> ejecuta pnpm install.
 * 4. Si detecta cambios en apps/api -> NestJS en watch mode recarga automáticamente.
 * 5. Monitorea la salud de la API (http://localhost:3000/api/health).
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

let isSyncing = false;

async function syncLoop() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    // 1. Obtener rama actual
    const currentBranch = runCmd('git rev-parse --abbrev-ref HEAD');
    if (!currentBranch || currentBranch === 'HEAD') {
      log('⚠️ No se encuentra en una rama válida de Git.', colors.yellow);
      isSyncing = false;
      return;
    }

    // 2. Fetch silencioso al remoto origin
    try {
      runCmd(`git fetch origin ${currentBranch} --quiet`);
    } catch (fetchErr) {
      log(`⚠️ No se pudo conectar al remoto (verifique conexión a Internet): ${fetchErr.message}`, colors.yellow);
      isSyncing = false;
      return;
    }

    // 3. Comparar HEAD local vs remoto
    const localCommit = runCmd('git rev-parse HEAD');
    let remoteCommit = '';
    try {
      remoteCommit = runCmd(`git rev-parse origin/${currentBranch}`);
    } catch {
      // Rama remota no existe aún
      isSyncing = false;
      return;
    }

    if (localCommit === remoteCommit) {
      // Todo al día
      isSyncing = false;
      return;
    }

    // 4. Verificar si es fast-forward (el local es ancestro del remoto)
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
      log(`⚠️ Hay archivos modificados sin guardar localmente en esta PC. Se pospone pull para evitar conflictos:`, colors.yellow);
      console.log(localDirty);
      isSyncing = false;
      return;
    }

    // 6. ¡Nuevos commits detectados!
    const newCommits = runCmd(`git log HEAD..origin/${currentBranch} --oneline`);
    const changedFiles = runCmd(`git diff --name-only HEAD origin/${currentBranch}`).split('\n').filter(Boolean);

    log(`\n🚀 ${colors.bright}Nuevos commits detectados desde otra máquina en 'origin/${currentBranch}':${colors.reset}`, colors.cyan);
    console.log(colors.magenta + newCommits + colors.reset);

    log(`📥 Aplicando 'git pull origin ${currentBranch}'...`, colors.cyan);
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
      log('⚡ Se detectaron cambios en el código de la API (apps/api).', colors.cyan);
      log('   El compilador de NestJS (watch mode) está recompilando en caliente...', colors.gray);
    }

    // 8. Verificar salud de la API después de recompilar
    log('⏳ Verificando disponibilidad de la API...', colors.gray);
    await sleep(6000);
    const healthy = await checkApiHealth();
    if (healthy) {
      log(`🎉 [AUTO-SYNC] API 100% OPERATIVA Y ACTUALIZADA en http://localhost:3000`, colors.green + colors.bright);
    } else {
      log(`⚠️ [AUTO-SYNC] La API aún no responde en ${HEALTH_URL}. Puede estar terminando de compilar.`, colors.yellow);
    }

  } catch (error) {
    log(`❌ Error inesperado en ciclo de sincronización: ${error.message}`, colors.red);
  } finally {
    isSyncing = false;
  }
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🤖 MEKANOS REMOTE AUTO-SYNC DAEMON`);
  console.log(`======================================================`);
  log(`Iniciando monitor de Git Remote...`, colors.cyan);
  log(`Directorio raíz: ${ROOT_DIR}`, colors.gray);
  log(`Intervalo de chequeo: cada ${INTERVAL_MS / 1000} segundos`, colors.gray);
  log(`Endpoint de salud: ${HEALTH_URL}`, colors.gray);
  console.log(`------------------------------------------------------\n`);

  // Chequeo inicial de salud
  const initHealth = await checkApiHealth();
  if (initHealth) {
    log(`✅ API detectada y respondiendo en ${HEALTH_URL}`, colors.green);
  } else {
    log(`ℹ️ La API no parece estar escuchando en ${HEALTH_URL}. Asegúrate de tener corriendo 'pnpm dev:api'`, colors.yellow);
  }

  // Primer ciclo
  await syncLoop();

  // Ciclo periódico
  setInterval(syncLoop, INTERVAL_MS);
}

main().catch(err => {
  console.error('Fatal error in auto-sync daemon:', err);
  process.exit(1);
});
