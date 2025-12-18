const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n📋 VERIFICACIÓN DE ENCODING EN BD\n');

    // Verificar orden específica
    const orden = await p.ordenes.findFirst({
        where: { numero_orden: 'GENA-036866-009' },
        include: {
            tecnico: { include: { persona: true } }
        }
    });

    if (orden) {
        const tecPersona = orden.tecnico?.persona;
        console.log('📝 Orden GENA-036866-009:');
        console.log(`  - nombre_completo: "${tecPersona?.nombre_completo}"`);
        console.log(`  - primer_nombre: "${tecPersona?.primer_nombre}"`);
        console.log(`  - primer_apellido: "${tecPersona?.primer_apellido}"`);

        // Verificar bytes del apellido
        const apellido = tecPersona?.primer_apellido || '';
        console.log(`  - Apellido bytes: ${Buffer.from(apellido, 'utf-8').toString('hex')}`);
        console.log(`  - Apellido length: ${apellido.length}`);
    } else {
        console.log('❌ Orden no encontrada');
    }
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect());
