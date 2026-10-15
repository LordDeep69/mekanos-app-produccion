const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DIRECT_URL || 'postgresql://postgres.kmwfsvocmlusoxnsgyrx:Mekanos%232026@aws-1-us-east-2.pooler.supabase.com:5432/postgres';
  const c = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  await c.connect();
  console.log('Connected to PostgreSQL');

  await c.query(`SELECT setval('lotes_componentes_id_lote_seq', COALESCE((SELECT MAX(id_lote) FROM lotes_componentes), 1));`);
  await c.query(`SELECT setval('motivos_ajuste_id_motivo_ajuste_seq', COALESCE((SELECT MAX(id_motivo_ajuste) FROM motivos_ajuste), 1));`);
  await c.query(`SELECT setval('ubicaciones_bodega_id_ubicacion_seq', COALESCE((SELECT MAX(id_ubicacion) FROM ubicaciones_bodega), 1));`);
  console.log('✅ PostgreSQL Sequences aligned successfully');

  // Verify sequence counter for LOT and ART
  const year = new Date().getFullYear();
  const lotCounter = await c.query(`SELECT * FROM sequence_counter WHERE type = 'LOT' AND year = $1`, [year]);
  if (lotCounter.rows.length === 0) {
    const maxLot = await c.query(`SELECT COALESCE(MAX(id_lote), 0) as m FROM lotes_componentes`);
    const val = Number(maxLot.rows[0].m) || 8;
    await c.query(`INSERT INTO sequence_counter (id, type, year, current_value, created_at, updated_at) VALUES ((SELECT COALESCE(MAX(id), 0) + 1 FROM sequence_counter), 'LOT', $1, $2, NOW(), NOW())`, [year, val]);
    console.log(`✅ LOT counter initialized with value ${val}`);
  } else {
    console.log(`✅ LOT counter is at ${lotCounter.rows[0].current_value}`);
  }

  // Ensure active motives
  const motivos = [
    { codigo: 'CONTEO_FISICO', nombre: 'Ajuste por Conteo Físico Cíclico', categoria: 'DIFERENCIA_CONTEO', detalle: true, gerencia: false },
    { codigo: 'MERMA_ALMACEN', nombre: 'Merma Operativa de Almacén', categoria: 'MERMA', detalle: true, gerencia: false },
    { codigo: 'DANO_MANIPULACION', nombre: 'Daño o Avería en Manipulación', categoria: 'DAÑO', detalle: true, gerencia: true },
    { codigo: 'ERROR_REGISTRO', nombre: 'Corrección de Error de Registro', categoria: 'ERROR_REGISTRO', detalle: true, gerencia: false },
    { codigo: 'ROBO_PERDIDA', nombre: 'Pérdida no Justificada o Hurto', categoria: 'ROBO', detalle: true, gerencia: true },
  ];

  for (const m of motivos) {
    const exists = await c.query(`SELECT id_motivo_ajuste FROM motivos_ajuste WHERE codigo_motivo = $1`, [m.codigo]);
    if (exists.rows.length === 0) {
      await c.query(
        `INSERT INTO motivos_ajuste (codigo_motivo, nombre_motivo, categoria, requiere_justificacion_detallada, requiere_aprobacion_gerencia, activo) VALUES ($1, $2, $3, $4, $5, true)`,
        [m.codigo, m.nombre, m.categoria, m.detalle, m.gerencia]
      );
      console.log(`Inserted motivo: ${m.codigo}`);
    }
  }

  console.log('--- MOTIVOS ACTIVOS ACTUALES ---');
  const resMotivos = await c.query(`SELECT id_motivo_ajuste, codigo_motivo, nombre_motivo, categoria, activo FROM motivos_ajuste WHERE activo = true`);
  console.table(resMotivos.rows);

  await c.end();
  console.log('Script finished cleanly.');
}

main().catch(err => {
  console.error('Error running script:', err);
  process.exit(1);
});
