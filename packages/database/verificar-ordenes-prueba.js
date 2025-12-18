const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n📋 VERIFICACIÓN DE ÓRDENES DE PRUEBA E2E\n');

    const ordenesAVerificar = [
        'BOMA-036866-026', // Bomba Tipo A
        'GENA-036866-009', // Generador Tipo A
        'GENB-036866-011', // Generador Tipo B
    ];

    for (const numOrden of ordenesAVerificar) {
        const orden = await p.ordenes.findFirst({
            where: { numero_orden: numOrden },
            include: {
                cliente: { include: { persona: true } },
                equipo: true,
                tecnico: { include: { persona: true } },
                tipo_servicio: true,
            }
        });

        if (!orden) {
            console.log(`❌ Orden ${numOrden}: NO ENCONTRADA`);
            continue;
        }

        // Contar evidencias
        const evidencias = await p.evidencias.count({
            where: { id_orden: orden.id_orden }
        });

        // Contar firmas
        const firmas = await p.firmas_ordenes.count({
            where: { id_orden: orden.id_orden }
        });

        // Verificar documentos
        const documentos = await p.documentos.count({
            where: { id_orden: orden.id_orden }
        });

        console.log(`✅ Orden ${numOrden}:`);
        console.log(`   - Estado: ${orden.estado_actual}`);
        console.log(`   - Cliente: ${orden.cliente?.persona?.razon_social || orden.cliente?.persona?.nombre_completo}`);
        console.log(`   - Equipo: ${orden.equipo?.nombre_equipo}`);
        console.log(`   - Técnico: ${orden.tecnico?.persona?.nombre_completo}`);
        console.log(`   - Tipo Servicio: ${orden.tipo_servicio?.nombre || orden.tipo_servicio?.codigo_tipo}`);
        console.log(`   - Evidencias: ${evidencias}`);
        console.log(`   - Firmas: ${firmas}`);
        console.log(`   - Documentos (PDF): ${documentos}`);
        console.log('');
    }
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect());
