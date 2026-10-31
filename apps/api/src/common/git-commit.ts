import { execFileSync } from 'child_process';

/**
 * Resuelve el commit de git UNA sola vez, al cargar el módulo (arranque del proceso).
 *
 * Motivo: antes se ejecutaba `execSync('git rev-parse ...')` en CADA request de
 * /api/health. En Windows, levantar un proceso `git` cuesta ~0.3-0.5 s, por lo que
 * el health check (usado por monitores y por el arranque del admin) era ~10x más
 * lento que el resto de endpoints.
 */
function resolveGitCommit(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf-8',
      timeout: 3000,
      windowsHide: true,
    }).trim();
  } catch {
    return 'unknown';
  }
}

export const GIT_COMMIT = resolveGitCommit();
