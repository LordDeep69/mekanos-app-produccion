// Test mínimo para diagnosticar app.listen() crash
const http = require('http');

console.log('1. Creando servidor HTTP básico...');

const server = http.createServer((req, res) => {
  console.log(`2. REQUEST: ${req.method} ${req.url}`);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'OK', timestamp: new Date().toISOString() }));
});

server.on('error', (error) => {
  console.error('❌ SERVER ERROR:', error.message);
  console.error('Code:', error.code);
  console.error('Port:', error.port);
  process.exit(1);
});

console.log('3. Intentando listen en puerto 3000...');
server.listen(3000, '0.0.0.0', () => {
  console.log('✅ Servidor HTTP básico escuchando en http://localhost:3000');
  console.log('4. Puerto bind exitoso - servidor estable');
  console.log('Presiona Ctrl+C para detener');
});

// Keep alive
setInterval(() => {
  console.log(`[${new Date().toISOString()}] Servidor activo...`);
}, 5000);

process.on('SIGINT', () => {
  console.log('\n5. Recibido SIGINT - Cerrando servidor...');
  server.close(() => {
    console.log('6. Servidor cerrado correctamente');
    process.exit(0);
  });
});
