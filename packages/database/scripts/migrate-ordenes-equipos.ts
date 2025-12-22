import { PrismaClient } from '@prisma/client';

/**
 * Script para ejecutar la migración de multi-equipos en Supabase
 * Ejecuta: npx ts-node scripts/migrate-ordenes-equipos.ts
 */

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('════════════════════════════════════════════════════════════════');
  console.log('🚀 INICIANDO MIGRACIÓN: MULTIEQUIPOS POR ORDEN');
  console.log('════════════════════════════════════════════════════════════════');

  try {
    // ══════════════════════════════════════════════════════════════════════════
    // PASO 1: Verificar si la tabla ya existe
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 PASO 1: Verificando si tabla ordenes_equipos existe...');
    
    const tablaExiste = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ordenes_equipos'
      ) as exists
    `;
    
    if (tablaExiste[0].exists) {
      console.log('⚠️  La tabla ordenes_equipos YA EXISTE. Verificando columnas FK...');
    } else {
      // ══════════════════════════════════════════════════════════════════════════
      // PASO 2: Crear tabla ordenes_equipos
      // ══════════════════════════════════════════════════════════════════════════
      console.log('\n📋 PASO 2: Creando tabla ordenes_equipos...');
      
      await prisma.$executeRawUnsafe(`
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

      // ══════════════════════════════════════════════════════════════════════════
      // PASO 3: Crear índices
      // ══════════════════════════════════════════════════════════════════════════
      console.log('\n📋 PASO 3: Creando índices...');
      
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_oe_orden ON ordenes_equipos(id_orden_servicio)`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_oe_equipo ON ordenes_equipos(id_equipo)`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_oe_orden_estado ON ordenes_equipos(id_orden_servicio, estado) WHERE estado != 'COMPLETADO'`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_oe_orden_secuencia ON ordenes_equipos(id_orden_servicio, orden_secuencia)`);
      console.log('✅ 4 índices creados');

      // ══════════════════════════════════════════════════════════════════════════
      // PASO 4: Comentarios
      // ══════════════════════════════════════════════════════════════════════════
      console.log('\n📋 PASO 4: Agregando comentarios...');
      
      await prisma.$executeRawUnsafe(`
        COMMENT ON TABLE ordenes_equipos IS 
        'Tabla intermedia para soportar multiples equipos por orden de servicio.
        REGLA: Si vacio = orden tradicional. Si tiene registros = orden multi-equipo.'
      `);
      console.log('✅ Comentarios agregados');

      // ══════════════════════════════════════════════════════════════════════════
      // PASO 5: Trigger timestamp
      // ══════════════════════════════════════════════════════════════════════════
      console.log('\n📋 PASO 5: Creando trigger timestamp...');
      
      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION trg_timestamp_ordenes_equipos()
        RETURNS TRIGGER AS \$\$
        BEGIN
            IF TG_OP = 'UPDATE' THEN
                NEW.fecha_modificacion := CURRENT_TIMESTAMP;
            END IF;
            RETURN NEW;
        END;
        \$\$ LANGUAGE plpgsql
      `);
      
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS trg_ordenes_equipos_timestamp ON ordenes_equipos`);
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER trg_ordenes_equipos_timestamp
            BEFORE UPDATE ON ordenes_equipos
            FOR EACH ROW EXECUTE FUNCTION trg_timestamp_ordenes_equipos()
      `);
      console.log('✅ Trigger timestamp creado');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PASO 6: Verificar/Agregar columna en actividades_ejecutadas
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 PASO 6: Verificando columna id_orden_equipo en actividades_ejecutadas...');
    
    const colAE = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'actividades_ejecutadas' 
        AND column_name = 'id_orden_equipo'
      ) as exists
    `;
    
    if (!colAE[0].exists) {
      await prisma.$executeRaw`
        ALTER TABLE actividades_ejecutadas 
        ADD COLUMN id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo) ON DELETE SET NULL
      `;
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_ae_orden_equipo ON actividades_ejecutadas(id_orden_equipo) 
        WHERE id_orden_equipo IS NOT NULL
      `;
      console.log('✅ Columna agregada a actividades_ejecutadas');
    } else {
      console.log('⚠️  Columna ya existe en actividades_ejecutadas');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PASO 7: Verificar/Agregar columna en mediciones_servicio
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 PASO 7: Verificando columna id_orden_equipo en mediciones_servicio...');
    
    const colMS = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'mediciones_servicio' 
        AND column_name = 'id_orden_equipo'
      ) as exists
    `;
    
    if (!colMS[0].exists) {
      await prisma.$executeRaw`
        ALTER TABLE mediciones_servicio 
        ADD COLUMN id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo) ON DELETE SET NULL
      `;
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_ms_orden_equipo ON mediciones_servicio(id_orden_equipo) 
        WHERE id_orden_equipo IS NOT NULL
      `;
      console.log('✅ Columna agregada a mediciones_servicio');
    } else {
      console.log('⚠️  Columna ya existe en mediciones_servicio');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PASO 8: Verificar/Agregar columna en evidencias_fotograficas
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n📋 PASO 8: Verificando columna id_orden_equipo en evidencias_fotograficas...');
    
    const colEF = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'evidencias_fotograficas' 
        AND column_name = 'id_orden_equipo'
      ) as exists
    `;
    
    if (!colEF[0].exists) {
      await prisma.$executeRaw`
        ALTER TABLE evidencias_fotograficas 
        ADD COLUMN id_orden_equipo INTEGER REFERENCES ordenes_equipos(id_orden_equipo) ON DELETE SET NULL
      `;
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_ef_orden_equipo ON evidencias_fotograficas(id_orden_equipo) 
        WHERE id_orden_equipo IS NOT NULL
      `;
      console.log('✅ Columna agregada a evidencias_fotograficas');
    } else {
      console.log('⚠️  Columna ya existe en evidencias_fotograficas');
    }

    // ══════════════════════════════════════════════════════════════════════════
    // VALIDACIÓN FINAL
    // ══════════════════════════════════════════════════════════════════════════
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📊 VALIDACIÓN FINAL');
    console.log('════════════════════════════════════════════════════════════════');
    
    const validacion = await prisma.$queryRaw<Array<{
      tabla_ordenes_equipos: boolean;
      col_ae: boolean;
      col_ms: boolean;
      col_ef: boolean;
    }>>`
      SELECT 
        EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ordenes_equipos') as tabla_ordenes_equipos,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'actividades_ejecutadas' AND column_name = 'id_orden_equipo') as col_ae,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mediciones_servicio' AND column_name = 'id_orden_equipo') as col_ms,
        EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'evidencias_fotograficas' AND column_name = 'id_orden_equipo') as col_ef
    `;
    
    const v = validacion[0];
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
      console.log('  3. Reiniciar backend');
    } else {
      console.log('⚠️  MIGRACIÓN INCOMPLETA - Revise los errores anteriores');
    }
    console.log('════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('\n❌ ERROR EN MIGRACIÓN:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
