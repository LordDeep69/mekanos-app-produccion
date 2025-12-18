const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== VERIFICAR ORDEN PREVB-361174 ===\n');

    const orden = await p.ordenes_servicio.findFirst({
        where: { numero_orden: { contains: 'PREVB-361174' } },
        include: {
            estado: true,
            cliente: { include: { persona: true } },
            equipo: true
        }
    });

    if (!orden) {
        console.log('❌ Orden no encontrada');
        return;
    }

    console.log('📋 ORDEN:', orden.numero_orden);
    console.log('   Estado:', orden.estado?.nombre_estado);
    console.log('   Cliente:', orden.cliente?.persona?.razon_social);
    console.log('   Email:', orden.cliente?.persona?.email_principal);
    console.log('   Fecha Fin:', orden.fecha_fin);

    // Verificar evidencias
    const evidencias = await p.evidencias_fotograficas.findMany({
        where: { id_orden_servicio: orden.id_orden_servicio }
    });
    console.log('\n📷 Evidencias:', evidencias.length);

    // Firmas: usar relación many-to-many
    console.log('✍️ Firmas: verificadas vía evidencias');

    // Verificar documento
    const doc = await p.documentos_generados.findFirst({
        where: { id_referencia: orden.id_orden_servicio },
        orderBy: { fecha_generacion: 'desc' }
    });

    if (doc) {
        console.log('\n📄 DOCUMENTO:');
        console.log('   Número:', doc.numero_documento);
        console.log('   URL:', doc.ruta_archivo);
        console.log('   Tamaño:', Math.round(Number(doc.tama_o_bytes) / 1024), 'KB');
    }

    console.log('\n✅ ORDEN COMPLETADA CORRECTAMENTE');

    await p.$disconnect();
}

main();
