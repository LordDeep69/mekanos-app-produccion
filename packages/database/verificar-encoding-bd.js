const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n🔍 INVESTIGACIÓN DE ENCODING EN BD\n');

    // 1. Buscar personas con apellido Rodríguez
    const personas = await p.personas.findMany({
        where: { primer_apellido: { contains: 'Rodr' } },
        select: {
            id_persona: true,
            primer_nombre: true,
            primer_apellido: true,
            nombre_completo: true
        },
        take: 5
    });

    console.log('📋 Personas con apellido que contiene "Rodr":');
    for (const per of personas) {
        console.log(`  ID ${per.id_persona}: ${per.nombre_completo}`);
        console.log(`    - primer_apellido: "${per.primer_apellido}"`);

        if (per.primer_apellido) {
            const bytes = Buffer.from(per.primer_apellido, 'utf8');
            console.log(`    - Bytes (hex): ${bytes.toString('hex')}`);
            console.log(`    - Longitud: ${per.primer_apellido.length} chars, ${bytes.length} bytes`);

            // Verificar si tiene el caracter de reemplazo UTF-8 (efbfbd = �)
            const hexStr = bytes.toString('hex');
            if (hexStr.includes('efbfbd')) {
                console.log('    ⚠️  CONTIENE CARACTER DE REEMPLAZO (�) - DATO CORRUPTO');
            } else if (hexStr.includes('c3ad')) {
                console.log('    ✅ Contiene "í" correctamente codificado (c3ad)');
            }
        }
        console.log('');
    }

    // 2. Buscar empleados (técnicos)
    const empleados = await p.empleados.findMany({
        where: {
            persona: {
                primer_apellido: { contains: 'Rodr' }
            }
        },
        include: { persona: true },
        take: 3
    });

    console.log('📌 Empleados con apellido Rodr*:');
    for (const emp of empleados) {
        console.log(`  - ID Empleado: ${emp.id_empleado}`);
        console.log(`  - nombre_completo: "${emp.persona?.nombre_completo}"`);
        const apellido = emp.persona?.primer_apellido || '';
        const bytes = Buffer.from(apellido, 'utf8');
        console.log(`  - Bytes apellido: ${bytes.toString('hex')}`);
    }
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect());
