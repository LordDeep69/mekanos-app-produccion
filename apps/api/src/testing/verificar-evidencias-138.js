const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function verificar() {
    const evs = await p.evidencias_fotograficas.findMany({
        where: { id_orden_servicio: 138 },
        select: {
            id_evidencia: true,
            tipo_evidencia: true,
            descripcion: true,
            ruta_archivo: true,
            fecha_captura: true
        },
        orderBy: { id_evidencia: 'asc' }
    });

    console.log('═══════════════════════════════════════════════════════');
    console.log('EVIDENCIAS EN BD PARA ORDEN 138');
    console.log('═══════════════════════════════════════════════════════');
    console.log('Total evidencias:', evs.length);
    console.log('');

    // Agrupar por tipo
    const porTipo = {};
    evs.forEach(e => {
        if (!porTipo[e.tipo_evidencia]) porTipo[e.tipo_evidencia] = [];
        porTipo[e.tipo_evidencia].push(e);
    });

    console.log('Por tipo:');
    for (const [tipo, lista] of Object.entries(porTipo)) {
        console.log(`  ${tipo}: ${lista.length}`);
    }

    console.log('');
    console.log('Detalle:');
    evs.forEach((e, i) => {
        console.log(`[${i}] tipo=${e.tipo_evidencia}, desc="${(e.descripcion || '').substring(0, 50)}"`);
    });

    await p.$disconnect();
}

verificar().catch(console.error);
