const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== VERIFICAR ÓRDENES FINALIZADAS ===\n');

    // Buscar órdenes específicas
    const ordenes = await p.ordenes_servicio.findMany({
        where: {
            OR: [
                { numero_orden: { contains: 'CORR-375007' } },
                { numero_orden: { contains: 'PREVB-359657' } }
            ]
        },
        include: {
            cliente: {
                include: { persona: true }
            },
            estado: true
        }
    });

    for (const o of ordenes) {
        console.log(`\n📋 ORDEN: ${o.numero_orden}`);
        console.log(`   Estado: ${o.estado?.nombre_estado}`);
        console.log(`   Cliente ID: ${o.id_cliente}`);
        console.log(`   Cliente Nombre: ${o.cliente?.persona?.razon_social || o.cliente?.persona?.nombre_completo}`);
        console.log(`   Email Cliente: ${o.cliente?.persona?.email_principal || 'NULL'}`);
        console.log(`   Fecha Fin: ${o.fecha_fin}`);
    }

    // Verificar documentos generados
    console.log('\n=== DOCUMENTOS GENERADOS ===\n');

    const docs = await p.documentos_generados.findMany({
        orderBy: { fecha_generacion: 'desc' },
        take: 5
    });

    for (const d of docs) {
        console.log(`📄 ${d.nombre_documento}`);
        console.log(`   Generado: ${d.fecha_generacion}`);
        console.log(`   URL: ${d.url_documento?.substring(0, 50)}...`);
    }

    await p.$disconnect();
}

main();
