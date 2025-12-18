const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== DOCUMENTOS GENERADOS - DETALLE ===\n');

    const docs = await p.documentos_generados.findMany({
        orderBy: { fecha_generacion: 'desc' },
        take: 3
    });

    docs.forEach((d, i) => {
        console.log(`\n=== DOCUMENTO ${i + 1} ===`);
        for (const [k, v] of Object.entries(d)) {
            console.log(`  ${k}: ${v}`);
        }
    });

    await p.$disconnect();
}

main();
