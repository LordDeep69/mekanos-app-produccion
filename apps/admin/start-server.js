const fs = require('fs');
const path = require('path');

// 1. Cargar variables de entorno desde .env.local
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

// 2. Sincronización automática de assets estáticos requeridos por Next.js en modo Standalone
// En Next.js Standalone, .next/static y public no se copian automáticamente durante el build
const staticSrc = path.join(__dirname, '.next', 'static');
const staticDest = path.join(__dirname, '.next', 'standalone', 'apps', 'admin', '.next', 'static');
const publicSrc = path.join(__dirname, 'public');
const publicDest = path.join(__dirname, '.next', 'standalone', 'apps', 'admin', 'public');

try {
  if (fs.existsSync(staticSrc)) {
    fs.mkdirSync(path.dirname(staticDest), { recursive: true });
    fs.cpSync(staticSrc, staticDest, { recursive: true });
    console.log('[Next.js Runner] ✓ Assets estáticos sincronizados a standalone (.next/static)');
  }
  if (fs.existsSync(publicSrc)) {
    fs.mkdirSync(path.dirname(publicDest), { recursive: true });
    fs.cpSync(publicSrc, publicDest, { recursive: true });
    console.log('[Next.js Runner] ✓ Directorio public sincronizado a standalone');
  }
} catch (err) {
  console.warn('[Next.js Runner] Advertencia al sincronizar assets estáticos:', err.message);
}

// 3. Configurar entorno y arrancar servidor
process.env.PORT = process.env.PORT || '3001';
process.env.HOSTNAME = '0.0.0.0';
process.env.NODE_ENV = 'production';

console.log(`[Next.js Runner] 🚀 Starting admin server on port ${process.env.PORT}...`);
require(path.join(__dirname, '.next', 'standalone', 'apps', 'admin', 'server.js'));
