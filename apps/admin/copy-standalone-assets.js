const fs = require('fs');
const path = require('path');

const staticSrc = path.join(__dirname, '.next', 'static');
const staticDest = path.join(__dirname, '.next', 'standalone', 'apps', 'admin', '.next', 'static');
const publicSrc = path.join(__dirname, 'public');
const publicDest = path.join(__dirname, '.next', 'standalone', 'apps', 'admin', 'public');

try {
  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true });
    console.log('[Build] ✓ Assets estáticos copiados a standalone (.next/static)');
  }
  if (fs.existsSync(publicSrc)) {
    fs.mkdirSync(path.dirname(publicDest), { recursive: true });
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log('[Build] ✓ Directorio public copiado a standalone');
  }
} catch (err) {
  console.warn('[Build] Advertencia al sincronizar assets para standalone:', err.message);
}
