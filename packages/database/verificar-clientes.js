const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== CLIENTES EN BD ===\n');

    const clientes = await p.clientes.findMany();

    clientes.forEach(c => {
        console.log(`ID: ${c.id_cliente}`);
        console.log(`  Nombre: ${c.nombre_cliente}`);
        console.log(`  Email: ${c.correo_contacto || 'NULL'}`);
        console.log('');
    });

    console.log(`Total: ${clientes.length} clientes`);

    await p.$disconnect();
}

main();
