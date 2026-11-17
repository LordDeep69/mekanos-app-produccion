const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== VERIFICAR Y ACTUALIZAR EMAILS DE CLIENTES ===\n');

    // Obtener clientes con sus personas
    const clientes = await p.clientes.findMany({
        include: { persona: true }
    });

    console.log('ESTADO ACTUAL:\n');

    for (const c of clientes) {
        console.log(`Cliente ID: ${c.id_cliente}`);
        console.log(`  Nombre: ${c.persona?.nombre_completo || c.persona?.razon_social || 'SIN NOMBRE'}`);
        console.log(`  Email actual: ${c.persona?.email_principal || 'NULL'}`);
        console.log('');
    }

    console.log('\n=== ACTUALIZANDO EMAILS (usando alias +cliente<id>@gmail.com) ===\n');

    // Gmail permite alias con + (ej: lorddeep3+cliente1@gmail.com)
    // Todos llegan al mismo correo lorddeep3@gmail.com
    for (const c of clientes) {
        if (c.persona) {
            const email = `lorddeep3+cliente${c.id_cliente}@gmail.com`;
            await p.personas.update({
                where: { id_persona: c.persona.id_persona },
                data: { email_principal: email }
            });
            console.log(`✅ Cliente ${c.id_cliente} (${c.persona.nombre_completo || c.persona.razon_social}) - Email: ${email}`);
        }
    }

    console.log('\n=== VERIFICACIÓN POST-UPDATE ===\n');

    const clientesActualizados = await p.clientes.findMany({
        include: { persona: true }
    });

    for (const c of clientesActualizados) {
        console.log(`Cliente ${c.id_cliente}: ${c.persona?.email_principal}`);
    }

    await p.$disconnect();
}

main();
