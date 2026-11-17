const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n CORRIGIENDO ENCODING EN BD\n');

    // Corregir persona ID 19 - Carlos Rodríguez
    // nombre_completo es columna generada, solo actualizamos campos base
    const resultado = await p.personas.update({
        where: { id_persona: 19 },
        data: {
            primer_nombre: 'Carlos',
            segundo_nombre: 'Andrés',
            primer_apellido: 'Rodríguez',
            segundo_apellido: 'Sánchez'
        }
    });

    console.log(' Persona actualizada:');
    console.log(`   - ID: ${resultado.id_persona}`);
    console.log(`   - Nombre: ${resultado.nombre_completo}`);

    // Verificar bytes
    const bytes = Buffer.from(resultado.primer_apellido || '', 'utf8');
    console.log(`   - Bytes apellido: ${bytes.toString('hex')}`);

    if (bytes.toString('hex').includes('c3ad')) {
        console.log('   ✅ "í" correctamente codificada (c3ad)');
    }
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect());
