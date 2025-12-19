import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const actividades = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id_actividad_catalogo, codigo_actividad, activo
    FROM catalogo_actividades 
    WHERE id_actividad_catalogo IN (1, 3, 4, 5, 6)
  `);
  console.log('Actividades del plan:');
  console.log(actividades);
  await prisma.$disconnect();
}

main();
