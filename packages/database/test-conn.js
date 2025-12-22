// Script simple de verificación de conexión
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.nemrrkaobdlwehfnetxs:Mekanos2025%23sas@aws-1-sa-east-1.pooler.supabase.com:5432/postgres'
});

client.connect()
  .then(() => {
    console.log('CONEXION OK');
    return client.query('SELECT current_database()');
  })
  .then(res => {
    console.log('DB:', res.rows[0].current_database);
    return client.end();
  })
  .catch(err => {
    console.error('ERROR:', err.message);
    process.exit(1);
  });
