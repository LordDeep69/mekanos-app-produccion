const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Ver todos los estados
    const estados = await prisma.estados_orden.findMany({ orderBy: { id_estado: 'asc' } });

    console.log('=== ESTADOS DE ORDEN ===\n');
    estados.forEach(e => {
        console.log(`${e.id_estado}: ${e.codigo_estado} - ${e.nombre_estado} | es_estado_final: ${e.es_estado_final}`);
    });

    // Corregir estado 2 (ASIGNADA) - NO debe ser final
    console.log('\n--- Corrigiendo estado 2 (ASIGNADA) a es_estado_final = false ---');
    await prisma.estados_orden.update({
        where: { id_estado: 2 },
        data: { es_estado_final: false }
    });
    console.log('✅ Estado 2 corregido');

    // Verificar corrección
    const estado2 = await prisma.estados_orden.findUnique({ where: { id_estado: 2 } });
    console.log(`\nEstado 2 ahora: es_estado_final = ${estado2.es_estado_final}`);

    await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
