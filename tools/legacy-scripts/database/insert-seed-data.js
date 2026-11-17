/**
 * Script para insertar datos seed faltantes en Supabase
 * Ejecuta: node insert-seed-data.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  console.log('\n🔧 INSERTANDO DATOS SEED FALTANTES EN SUPABASE\n');

  try {
    // 1. Insertar tipos_servicio ID 1
    console.log('📌 Insertando tipos_servicio (ID 1)...');
    const tipoServicio = await prisma.$executeRaw`
      INSERT INTO tipos_servicio (
        id_tipo_servicio,
        codigo_tipo,
        nombre_tipo,
        descripcion,
        categoria,
        tiene_checklist,
        tiene_plantilla_informe,
        requiere_mediciones,
        duracion_estimada_horas,
        activo,
        creado_por,
        fecha_creacion
      ) VALUES (
        1,
        'PREV-A',
        'Mantenimiento Preventivo Tipo A',
        'Mantenimiento preventivo básico según fabricante',
        'PREVENTIVO',
        true,
        true,
        true,
        4.0,
        true,
        1,
        NOW()
      )
      ON CONFLICT (id_tipo_servicio) DO NOTHING
    `;
    console.log('   ✅ tipos_servicio insertado (o ya existía)');

    // 2. Verificar que existe
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM tipos_servicio WHERE id_tipo_servicio = 1
    `;
    console.log(`   ✅ Verificación: ${count[0].count} registro(s) encontrado(s)\n`);

    console.log('🎉 SEED DATA COMPLETADO EXITOSAMENTE\n');
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
