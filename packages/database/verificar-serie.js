const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    // Verificar equipos usados en órdenes recientes
    const equipo107 = await p.equipos.findFirst({
        where: { id_equipo: 107 }
    });

    const equipo114 = await p.equipos.findFirst({
        where: { id_equipo: 114 }
    });

    console.log('\n📋 VERIFICACIÓN DE EQUIPOS\n');
    console.log('Equipo ID 107 (Generador):');
    console.log('  - Código:', equipo107?.codigo_equipo);
    console.log('  - Nombre:', equipo107?.nombre_equipo);
    console.log('  - N° Serie:', equipo107?.numero_serie_equipo || '⚠️ VACÍO');

    console.log('\nEquipo ID 114 (Bomba):');
    console.log('  - Código:', equipo114?.codigo_equipo);
    console.log('  - Nombre:', equipo114?.nombre_equipo);
    console.log('  - N° Serie:', equipo114?.numero_serie_equipo || '⚠️ VACÍO');
}

main()
    .catch(console.error)
    .finally(() => p.$disconnect());
