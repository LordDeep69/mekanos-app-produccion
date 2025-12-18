const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Actualizar N° Serie del equipo Generador
    const equipo = await p.equipos.update({
        where: { id_equipo: 107 },
        data: { numero_serie_equipo: 'SN-GEN-2025-107' }
    });

    console.log('✅ Equipo actualizado:');
    console.log('  - ID:', equipo.id_equipo);
    console.log('  - N° Serie:', equipo.numero_serie_equipo);
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect());
