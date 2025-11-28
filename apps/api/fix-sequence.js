const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixSequence() {
  try {
    // 1. TABLA: tipos_servicio
    const result1 = await prisma.$queryRaw`
      SELECT MAX(id_tipo_servicio) as max_id 
      FROM tipos_servicio
    `;
    const maxId1 = result1[0]?.max_id || 0;
    console.log(`\n📊 [tipos_servicio] MAX ID: ${maxId1}`);

    const seqResult1 = await prisma.$queryRaw`
      SELECT last_value FROM tipos_servicio_id_tipo_servicio_seq
    `;
    const seqValue1 = seqResult1[0]?.last_value || 0;
    console.log(`🔢 [tipos_servicio] Secuencia actual: ${seqValue1}`);

    if (seqValue1 <= maxId1) {
      const newValue1 = maxId1 + 1;
      await prisma.$executeRaw`
        SELECT setval('tipos_servicio_id_tipo_servicio_seq', ${newValue1}, false)
      `;
      console.log(`✅ [tipos_servicio] Corregida a: ${newValue1}`);
    } else {
      console.log(`✅ [tipos_servicio] Correcta`);
    }

    // 2. TABLA: catalogo_servicios
    const result2 = await prisma.$queryRaw`
      SELECT MAX(id_servicio) as max_id 
      FROM catalogo_servicios
    `;
    const maxId2 = result2[0]?.max_id || 0;
    console.log(`\n📊 [catalogo_servicios] MAX ID: ${maxId2}`);

    const seqResult2 = await prisma.$queryRaw`
      SELECT last_value FROM catalogo_servicios_id_servicio_seq
    `;
    const seqValue2 = seqResult2[0]?.last_value || 0;
    console.log(`🔢 [catalogo_servicios] Secuencia actual: ${seqValue2}`);

    if (seqValue2 <= maxId2) {
      const newValue2 = maxId2 + 1;
      await prisma.$executeRaw`
        SELECT setval('catalogo_servicios_id_servicio_seq', ${newValue2}, false)
      `;
      console.log(`✅ [catalogo_servicios] Corregida a: ${newValue2}`);
    } else {
      console.log(`✅ [catalogo_servicios] Correcta`);
    }

    // 3. TABLA: estados_orden
    const result3 = await prisma.$queryRaw`
      SELECT MAX(id_estado) as max_id 
      FROM estados_orden
    `;
    const maxId3 = result3[0]?.max_id || 0;
    console.log(`\n📊 [estados_orden] MAX ID: ${maxId3}`);

    const seqResult3 = await prisma.$queryRaw`
      SELECT last_value FROM estados_orden_id_estado_seq
    `;
    const seqValue3 = seqResult3[0]?.last_value || 0;
    console.log(`🔢 [estados_orden] Secuencia actual: ${seqValue3}`);

    if (seqValue3 <= maxId3) {
      const newValue3 = maxId3 + 1;
      await prisma.$executeRaw`
        SELECT setval('estados_orden_id_estado_seq', ${newValue3}, false)
      `;
      console.log(`✅ [estados_orden] Corregida a: ${newValue3}`);
    } else {
      console.log(`✅ [estados_orden] Correcta`);
    }

    // 4. TABLA: parametros_medicion
    const result4 = await prisma.$queryRaw`
      SELECT MAX(id_parametro_medicion) as max_id 
      FROM parametros_medicion
    `;
    const maxId4 = result4[0]?.max_id || 0;
    console.log(`\n📊 [parametros_medicion] MAX ID: ${maxId4}`);

    const seqResult4 = await prisma.$queryRaw`
      SELECT last_value FROM parametros_medicion_id_parametro_medicion_seq
    `;
    const seqValue4 = seqResult4[0]?.last_value || 0;
    console.log(`🔢 [parametros_medicion] Secuencia actual: ${seqValue4}`);

    if (seqValue4 <= maxId4) {
      const newValue4 = maxId4 + 1;
      await prisma.$executeRaw`
        SELECT setval('parametros_medicion_id_parametro_medicion_seq', ${newValue4}, false)
      `;
      console.log(`✅ [parametros_medicion] Corregida a: ${newValue4}`);
    } else {
      console.log(`✅ [parametros_medicion] Correcta`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixSequence();
