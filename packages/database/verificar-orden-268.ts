/* eslint-disable */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verificar() {
  const o = await prisma.ordenes_servicio.findUnique({
    where: { id_orden_servicio: 268 },
    include: { actividades_plan: { orderBy: { orden_secuencia: 'asc' } } },
  });
  console.log('Orden:', o?.numero_orden);
  console.log('Plan items:', o?.actividades_plan?.length);
  for (const x of o?.actividades_plan || []) {
    const a = await prisma.catalogo_actividades.findUnique({
      where: { id_actividad_catalogo: x.id_actividad_catalogo },
    });
    console.log(' -', x.orden_secuencia, a?.codigo_actividad, a?.nombre_actividad);
  }
  await prisma.$disconnect();
}
verificar().catch(console.error);
