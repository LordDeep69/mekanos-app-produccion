const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDetalleCompleto() {
    const id = 3; // GEN_PREV_A

    const tipoServicio = await prisma.tipos_servicio.findUnique({
        where: { id_tipo_servicio: id },
        include: {
            tipos_equipo: true,
            catalogo_actividades: {
                where: { activo: true },
                include: {
                    catalogo_sistemas: true,
                    parametros_medicion: true,
                },
                orderBy: [
                    { catalogo_sistemas: { orden_visualizacion: 'asc' } },
                    { orden_ejecucion: 'asc' },
                ],
            },
            _count: {
                select: {
                    catalogo_actividades: { where: { activo: true } },
                    ordenes_servicio: true,
                },
            },
        },
    });

    if (!tipoServicio) {
        console.log('No encontrado');
        return;
    }

    // Agrupar actividades por sistema
    const actividadesPorSistema = new Map();

    for (const actividad of tipoServicio.catalogo_actividades) {
        const sistemaId = actividad.id_sistema;
        if (!actividadesPorSistema.has(sistemaId)) {
            actividadesPorSistema.set(sistemaId, []);
        }
        actividadesPorSistema.get(sistemaId).push(actividad);
    }

    console.log('\n=== DETALLE COMPLETO ===');
    console.log(`Tipo: ${tipoServicio.nombre_tipo} (${tipoServicio.codigo_tipo})`);
    console.log(`Categoría: ${tipoServicio.categoria}`);
    console.log(`Total actividades: ${tipoServicio._count.catalogo_actividades}`);
    console.log(`Total órdenes: ${tipoServicio._count.ordenes_servicio}`);
    console.log(`Sistemas: ${actividadesPorSistema.size}`);

    console.log('\n=== ACTIVIDADES POR SISTEMA ===');
    for (const [sistemaId, actividades] of actividadesPorSistema) {
        const sistema = actividades[0]?.catalogo_sistemas;
        console.log(`\n📦 ${sistema?.nombre_sistema || 'Sin Sistema'} (${actividades.length} actividades)`);
        actividades.forEach((a, i) => {
            const tipo = a.tipo_actividad === 'MEDICION' ? '📏' : '✓';
            console.log(`   ${i + 1}. ${tipo} ${a.descripcion_actividad}`);
        });
    }
}

testDetalleCompleto().catch(console.error).finally(() => prisma.$disconnect());
