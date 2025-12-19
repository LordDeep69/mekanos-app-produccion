const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function check() {
  try {
    const ordenes = await p.ordenes_servicio.findMany({
      where: { numero_orden: { startsWith: 'OS-ME-' } },
      select: { id_orden_servicio: true, numero_orden: true }
    });
    console.log('Ordenes OS-ME-:', ordenes.length);
    ordenes.forEach(o => console.log(' ', o.id_orden_servicio + ':', o.numero_orden));

    const equipos = await p.ordenes_equipos.count();
    console.log('ordenes_equipos total:', equipos);

    // Ver equipos por orden
    for (const o of ordenes.slice(0, 3)) {
      const eqs = await p.ordenes_equipos.findMany({
        where: { id_orden_servicio: o.id_orden_servicio },
        select: { id_orden_equipo: true, orden_secuencia: true, nombre_sistema: true }
      });
      console.log(`  Orden ${o.id_orden_servicio} tiene ${eqs.length} equipos`);
    }
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await p.$disconnect();
  }
}

check();
