const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });
process.env.PORT = process.env.PORT || '3001';
process.env.HOSTNAME = '0.0.0.0';
process.env.NODE_ENV = 'production';
console.log(`[Next.js Runner] Starting admin server on port ${process.env.PORT}...`);
require(path.join(__dirname, '.next', 'standalone', 'apps', 'admin', 'server.js'));
