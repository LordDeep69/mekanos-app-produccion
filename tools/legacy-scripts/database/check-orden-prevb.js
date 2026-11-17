const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Buscar actividades con "insumo" en descripción
    const actividadesInsumo = await prisma.actividades_mantenimiento.findMany({
        where: { descripcion_actividad: { contains: 'insumo', mode: 'insensitive' } },
        select: { id_actividad: true, descripcion_actividad: true, id_tipo_servicio: true }
    });

    console.log('=== ACTIVIDADES CON "INSUMO" ===');
    actividadesInsumo.forEach(a => console.log(`ID: ${a.id_actividad}, Tipo Servicio: ${a.id_tipo_servicio}, Desc: ${a.descripcion_actividad}`));

    // Ver tipos de servicio
    const tiposServicio = await prisma.tipos_servicio.findMany({
        select: { id_tipo_servicio: true, codigo_tipo: true, nombre_tipo: true }
    });
    console.log('\n=== TIPOS DE SERVICIO ===');
    tiposServicio.forEach(t => console.log(`${t.id_tipo_servicio}: ${t.codigo_tipo} - ${t.nombre_tipo}`));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
