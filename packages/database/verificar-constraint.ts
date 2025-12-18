import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Ver estructura de una actividad existente
    const actividad = await prisma.actividades_ejecutadas.findFirst({
        orderBy: { id_actividad_ejecutada: 'desc' },
    });

    console.log('Última actividad ejecutada:');
    console.log(JSON.stringify(actividad, null, 2));

    // Ver el constraint
    const result = await prisma.$queryRaw`
    SELECT pg_get_constraintdef(oid) as constraint_def 
    FROM pg_constraint 
    WHERE conname = 'chk_ae_modo_dual'
  `;
    console.log('\nConstraint chk_ae_modo_dual:');
    console.log(result);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
