import { PrismaClient } from '@prisma/client';

/**
 * ✅ FIX 03-FEB-2026: Actualizar labels de actividades de correctivo
 * PROBLEMA 2: Cambiar "SÍNTOMAS OBSERVADOS" → "FALLAS OBSERVADAS"
 *             Cambiar "DIAGNÓSTICO Y CAUSA RAÍZ" → "DIAGNÓSTICO"
 */
async function fixCorrectivoLabels() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Iniciando actualización de labels de correctivo...');

    // 1. Cambiar "SÍNTOMAS OBSERVADOS" por "FALLAS OBSERVADAS"
    const updateSintomas = await prisma.$executeRaw`
      UPDATE catalogo_actividades ca
      SET descripcion_actividad = 'FALLAS OBSERVADAS'
      FROM tipos_servicio ts
      WHERE ca.id_tipo_servicio = ts.id_tipo_servicio
        AND ts.codigo_tipo = 'GEN_CORR'
        AND (ca.descripcion_actividad = 'SÍNTOMAS OBSERVADOS' 
             OR ca.descripcion_actividad = 'SINTOMAS OBSERVADOS')
    `;

    console.log(`✅ Actualizadas ${updateSintomas} actividades: SÍNTOMAS → FALLAS`);

    // 2. Cambiar "DIAGNÓSTICO Y CAUSA RAÍZ" por "DIAGNÓSTICO"
    const updateDiagnostico = await prisma.$executeRaw`
      UPDATE catalogo_actividades ca
      SET descripcion_actividad = 'DIAGNÓSTICO'
      FROM tipos_servicio ts
      WHERE ca.id_tipo_servicio = ts.id_tipo_servicio
        AND ts.codigo_tipo = 'GEN_CORR'
        AND (ca.descripcion_actividad = 'DIAGNÓSTICO Y CAUSA RAÍZ' 
             OR ca.descripcion_actividad = 'DIAGNOSTICO Y CAUSA RAIZ')
    `;

    console.log(`✅ Actualizadas ${updateDiagnostico} actividades: DIAGNÓSTICO Y CAUSA RAÍZ → DIAGNÓSTICO`);

    // 3. Verificar cambios
    const actividadesCorr = await prisma.$queryRaw<Array<{
      codigo_actividad: string;
      descripcion_actividad: string;
      tipo_actividad: string;
    }>>`
      SELECT ca.codigo_actividad, ca.descripcion_actividad, ca.tipo_actividad
      FROM catalogo_actividades ca
      JOIN tipos_servicio ts ON ca.id_tipo_servicio = ts.id_tipo_servicio
      WHERE ts.codigo_tipo = 'GEN_CORR'
        AND (ca.descripcion_actividad LIKE '%FALLAS%' 
             OR ca.descripcion_actividad LIKE '%DIAGNÓSTICO%'
             OR ca.descripcion_actividad LIKE '%DIAGNOSTICO%')
      ORDER BY ca.descripcion_actividad ASC
    `;

    console.log('\n📋 Actividades actualizadas:');
    actividadesCorr.forEach((act) => {
      console.log(`  - [${act.codigo_actividad}] ${act.descripcion_actividad} (${act.tipo_actividad})`);
    });

    console.log('\n✅ Actualización completada exitosamente');
  } catch (error) {
    console.error('❌ Error actualizando labels:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  fixCorrectivoLabels()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { fixCorrectivoLabels };

