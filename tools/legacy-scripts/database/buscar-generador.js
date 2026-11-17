// Buscar generador para crear orden
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Buscar equipos tipo GENERADOR
    const generador = await prisma.equipos.findFirst({
        where: { id_tipo_equipo: 1 },  // GENERADOR
        select: { id_equipo: true, codigo_equipo: true, nombre_equipo: true }
    });

    if (generador) {
        console.log('✅ Generador encontrado:', JSON.stringify(generador));
    } else {
        console.log('❌ No hay generadores, creando uno...');

        const nuevoGen = await prisma.equipos.create({
            data: {
                codigo_equipo: 'GEN-PRUEBA-001',
                id_cliente: 1,
                id_tipo_equipo: 1,
                nombre_equipo: 'Generador de Prueba',
                ubicacion_texto: 'Sala de Máquinas',
                estado_equipo: 'OPERATIVO',
                criticidad: 'ALTA',
                activo: true
            }
        });
        console.log('✅ Generador creado:', JSON.stringify(nuevoGen));
    }
}

main()
    .catch(e => console.error('ERR:', e.message))
    .finally(() => prisma.$disconnect());
