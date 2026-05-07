const { Client } = require('pg');

async function main() {
  const c = new Client({
    connectionString: 'postgresql://postgres.kmwfsvocmlusoxnsgyrx:Mekanos%232026@aws-1-us-east-2.pooler.supabase.com:5432/postgres',
    ssl: { rejectUnauthorized: false },
  });
  
  await c.connect();
  console.log('Connected');
  
  await c.query(`
    ALTER TABLE mediciones_servicio ADD COLUMN IF NOT EXISTS excluido_pdf BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE actividades_ejecutadas ADD COLUMN IF NOT EXISTS excluido_pdf BOOLEAN NOT NULL DEFAULT false;
  `);
  console.log('Migration OK: excluido_pdf added to mediciones_servicio and actividades_ejecutadas');
  
  await c.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
