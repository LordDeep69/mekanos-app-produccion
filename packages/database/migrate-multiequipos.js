/**
 * Script de migración MULTIEQUIPOS - Conexión directa con pg
 * Ejecutar: node migrate-multiequipos.js
 */

const { Client } = require('pg');

// Conexión directa (puerto 5432 para DDL)
const connectionString = 'postgresql://postgres.nemrrkaobdlwehfnetxs:Mekanos2025%23sas@aws-1-sa-east-1.pooler.supabase.com:5432/postgres';

async function migrate() {
  const client = new Client({ connectionString });
  
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 INICIANDO MIGRACIÓN: MULTIEQUIPOS POR ORDEN');
  console.log('════════════════════════════════════════════════════════════════');

  try {
    await client.connect();
    console.log('✅ Conectado a Supabase');

    // PASO 1: Verificar si tabla existe
    console.log('\n📋 PASO 1: Verificando si tabla ordenes_equipos existe...');
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ordenes_equipos'
      ) as exists
    `);

    if (checkTable.rows[0].exists) {
      console.log('⚠️  La tabla ordenes_equipos YA EXISTE');
    } else {
      // PASO 2: Crear tabla
      console.log('\n📋 PASO 2: Creando tabla ordenes_equipos...');
      await client.query(`
        CREATE TABLE ordenes_equipos (
          id_orden_equipo       SERIAL PRIMARY KEY,
          id_orden_servicio     INTEGER NOT NULL REFERENCES ordenes_servicio(id_orden_servicio) ON DELETE CASCADE,
          id_equipo             INTEGER NOT NULL REFERENCES equipos(id_equipo) ON DELETE RESTRICT,
          orden_secuencia       INTEGER NOT NULL DEFAULT 1,
          nombre_sistema        VARCHAR(200),
          estado                estado_detalle_servicio_enum DEFAULT 'PENDIENTE',
          fecha_inicio          TIMESTAMP,
          fecha_fin             TIMESTAMP,
          observaciones         TEXT,
          metadata              JSONB DEFAULT '{}',
          creado_por            INTEGER REFERENCES usuarios(id_usuario),
          fecha_creacion        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          modificado_por        INTEGER REFERENCES usuarios(id_usuario),
          fecha_modificacion    TIMESTAMP,
          CONSTRAINT uk_orden_equipo UNIQUE (id_orden_servicio, id_equipo),
          CONSTRAINT chk_oe_fecha_fin_posterior
              CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
        )
      `);
      console.log('✅ Tabla ordenes_equipos creada');

      // PASO 3: Indices
      console.log('\n📋 PASO 3: Creando índices...');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_oe_orden ON ordenes_equipos(id_orden_servicio)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_oe_equipo ON ordenes_equipos(id_equipo)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_oe_orden_estado ON ordenes_equipos(id_orden_servicio, estado) WHERE estado != 'COMPLETADO'`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_oe_orden_secuencia ON ordenes_equipos(id_orden_servicio, orden_secuencia)`);
      console.log('✅ 4 índices creados');

      // PASO 4: Comentario
      console.log('\n📋 PASO 4: Agregando comentario...');
      await client.query(`
        COMMENT ON TABLE ordenes_equipos IS 
        'Tabla intermedia para soportar multiples equipos por orden de servicio.
        REGLA: Si vacio = orden tradicional. Si tiene registros = orden multi-equipo.'
      `);
      console.log('✅ Comentario agregado');

      // PASO 5: Trigger
      console.log('\n📋 PASO 5: Creando trigger timestamp...');
      await client.query(`
        CREATE OR REPLACE FUNCTION trg_timestamp_ordenes_equipos()
        RETURNS TRIGGER AS $$
        BEGIN
            IF TG_OP = 'UPDATE' THEN
                NEW.fecha_modificacion := CURRENT_TIMESTAMP;
            END IF;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `);
      await client.query(`DROP TRIGGER IF EXISTS trg_ordenes_equipos_timestamp ON ordenes_equipos`);
      await client.query(`
        CREATE TRIGGER trg_ordenes_equipos_timestamp
            BEFORE UPDATE ON ordenes_equipos
            FOR EACH ROW EXECUTE FUNCTION trg_timestamp_ordenes_equipos()
      `);
      console.log('✅ Trigger creado');
    }

    // PASO 6: Columna en actividades_ejecutadas
    console.log('\n📋 PASO 6: Verificando columna id_orden_equipo en actividades_ejecutadas...');
    const colAE = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'actividades_ejecutadas' 
        AND column_name = 'id_orden_equipo'
      ) as exists
    `);
    if (!colAE.rows[0].exists) {
      await client.query(`
        ALTER TABLE actividades_ejecutadas 
        ADD COLUMN id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo) ON DELETE SET NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ae_orden_equipo ON actividades_ejecutadas(id_orden_equipo) 
        WHERE id_orden_equipo IS NOT NULL
      `);
      console.log('✅ Columna agregada a actividades_ejecutadas');
    } else {
      console.log('⚠️  Columna ya existe en actividades_ejecutadas');
    }

    // PASO 7: Columna en mediciones_servicio
    console.log('\n📋 PASO 7: Verificando columna id_orden_equipo en mediciones_servicio...');
    const colMS = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mediciones_servicio' 
        AND column_name = 'id_orden_equipo'
      ) as exists
    `);
    if (!colMS.rows[0].exists) {
      await client.query(`
        ALTER TABLE mediciones_servicio 
        ADD COLUMN id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo) ON DELETE SET NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ms_orden_equipo ON mediciones_servicio(id_orden_equipo) 
        WHERE id_orden_equipo IS NOT NULL
      `);
      console.log('✅ Columna agregada a mediciones_servicio');
    } else {
      console.log('⚠️  Columna ya existe en mediciones_servicio');
    }

    // PASO 8: Columna en evidencias_fotograficas
    console.log('\n📋 PASO 8: Verificando columna id_orden_equipo en evidencias_fotograficas...');
    const colEF = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evidencias_fotograficas' 
        AND column_name = 'id_orden_equipo'
      ) as exists
    `);
    if (!colEF.rows[0].exists) {
      await client.query(`
        ALTER TABLE evidencias_fotograficas 
        ADD COLUMN id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo) ON DELETE SET NULL
      `);
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_ef_orden_equipo ON evidencias_fotograficas(id_orden_equipo) 
        WHERE id_orden_equipo IS NOT NULL
      `);
      console.log('✅ Columna agregada a evidencias_fotograficas');
    } else {
      console.log('⚠️  Columna ya existe en evidencias_fotograficas');
    }

    // VALIDACIÓN FINAL
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📊 VALIDACIÓN FINAL');
    console.log('════════════════════════════════════════════════════════════════');
    
    const validacion = await client.query(`
      SELECT 
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordenes_equipos') as tabla_ordenes_equipos,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'actividades_ejecutadas' AND column_name = 'id_orden_equipo') as col_ae,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mediciones_servicio' AND column_name = 'id_orden_equipo') as col_ms,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidencias_fotograficas' AND column_name = 'id_orden_equipo') as col_ef
    `);

    const v = validacion.rows[0];
    console.log(`\n   Tabla ordenes_equipos:                    ${v.tabla_ordenes_equipos ? '✅' : '❌'}`);
    console.log(`   actividades_ejecutadas.id_orden_equipo:   ${v.col_ae ? '✅' : '❌'}`);
    console.log(`   mediciones_servicio.id_orden_equipo:      ${v.col_ms ? '✅' : '❌'}`);
    console.log(`   evidencias_fotograficas.id_orden_equipo:  ${v.col_ef ? '✅' : '❌'}`);

    const todoOK = v.tabla_ordenes_equipos && v.col_ae && v.col_ms && v.col_ef;

    console.log('\n════════════════════════════════════════════════════════════════');
    if (todoOK) {
      console.log('✅✅✅ MIGRACIÓN COMPLETADA EXITOSAMENTE ✅✅✅');
      console.log('\nSIGUIENTE PASO:');
      console.log('  1. Ejecutar: npx prisma db pull');
      console.log('  2. Ejecutar: npx prisma generate');
    } else {
      console.log('⚠️  MIGRACIÓN INCOMPLETA');
    }
    console.log('════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ ERROR EN MIGRACIÓN:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

migrate().catch(console.error);
