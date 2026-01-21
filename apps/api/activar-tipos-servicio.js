const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== VERIFICANDO Y ACTIVANDO TIPOS DE SERVICIO ===\n');

    // 1. Ver TODOS los tipos de servicio (activos e inactivos)
    const todosTipos = await prisma.tipos_servicio.findMany({
        orderBy: { id_tipo_servicio: 'asc' }
    });

    console.log('=== TIPOS DE SERVICIO EXISTENTES ===');
    todosTipos.forEach(t => {
        console.log(`  [${t.id_tipo_servicio}] ${t.codigo_tipo}: ${t.nombre_tipo} | activo=${t.activo}`);
    });

    // 2. Identificar tipos que necesitan ser activados
    const tiposParaActivar = ['CORRECTIVO', 'GEN_CORR', 'BOM_CORR', 'EMERGENCIA', 'INSPECCION', 'PREV-A'];

    console.log('\n=== ACTIVANDO TIPOS FALTANTES ===');

    for (const codigo of tiposParaActivar) {
        const tipo = todosTipos.find(t => t.codigo_tipo === codigo);
        if (tipo) {
            if (!tipo.activo) {
                await prisma.tipos_servicio.update({
                    where: { id_tipo_servicio: tipo.id_tipo_servicio },
                    data: { activo: true }
                });
                console.log(`  ✅ ACTIVADO: ${codigo}`);
            } else {
                console.log(`  ⏭️  YA ACTIVO: ${codigo}`);
            }
        } else {
            console.log(`  ⚠️  NO EXISTE: ${codigo} - Necesita crearse manualmente`);
        }
    }

    // 3. Verificar resultado final
    console.log('\n=== ESTADO FINAL ===');
    const tiposActivos = await prisma.tipos_servicio.findMany({
        where: { activo: true },
        include: {
            _count: { select: { catalogo_actividades: true } }
        },
        orderBy: { orden_visualizacion: 'asc' }
    });

    tiposActivos.forEach(t => {
        console.log(`  ✅ [${t.id_tipo_servicio}] ${t.codigo_tipo}: ${t.nombre_tipo} (${t._count.catalogo_actividades} actividades)`);
    });

    console.log(`\nTotal tipos activos: ${tiposActivos.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
