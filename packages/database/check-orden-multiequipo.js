const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  // Ver actividades para el tipo de servicio 5 (BOM_PREV_A)
  console.log('=== ACTIVIDADES PARA TIPO SERVICIO 5 (BOM_PREV_A) ===');
  const actsBomba = await p.catalogo_actividades.findMany({
    where: { id_tipo_servicio: 5, activo: true },
    orderBy: { orden_ejecucion: 'asc' }
  });
  console.log('Total actividades:', actsBomba.length);
  actsBomba.slice(0, 10).forEach((a, i) => {
    console.log(`  ${i+1}. [${a.codigo_actividad}] ${a.descripcion_actividad}`);
  });
  if (actsBomba.length > 10) console.log(`  ... y ${actsBomba.length - 10} más`);
  
  // Ver actividades para el tipo de servicio 1 (PREV-A genérico)
  console.log('\n=== ACTIVIDADES PARA TIPO SERVICIO 1 (PREV-A genérico) ===');
  const actsGenerico = await p.catalogo_actividades.findMany({
    where: { id_tipo_servicio: 1, activo: true },
    orderBy: { orden_ejecucion: 'asc' }
  });
  console.log('Total actividades:', actsGenerico.length);
  actsGenerico.forEach((a, i) => {
    console.log(`  ${i+1}. [${a.codigo_actividad}] ${a.descripcion_actividad}`);
  });

  await p.$disconnect();
}

check();
