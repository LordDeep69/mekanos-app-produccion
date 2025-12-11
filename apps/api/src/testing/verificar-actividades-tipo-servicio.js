/**
 * Script para diagnosticar por qué solo hay 1 actividad en la orden
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function diagnosticar() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔍 DIAGNÓSTICO: ACTIVIDADES POR TIPO DE SERVICIO');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. Verificar orden 150 (OS-REAL-TEST-002)
    const orden150 = await p.ordenes_servicio.findUnique({
        where: { id_orden_servicio: 150 },
        select: {
            numero_orden: true,
            id_tipo_servicio: true,
            tipo_servicio: { select: { codigo_tipo: true, nombre_tipo: true } }
        }
    });
    console.log('📋 ORDEN 150 (OS-REAL-TEST-002):');
    console.log(`   id_tipo_servicio: ${orden150?.id_tipo_servicio}`);
    console.log(`   tipo_servicio: ${orden150?.tipo_servicio?.nombre_tipo || 'N/A'}`);

    // 2. Verificar orden 151 (OS-REAL-TEST-003)
    const orden151 = await p.ordenes_servicio.findUnique({
        where: { id_orden_servicio: 151 },
        select: {
            numero_orden: true,
            id_tipo_servicio: true,
            tipo_servicio: { select: { codigo_tipo: true, nombre_tipo: true } }
        }
    });
    console.log('\n📋 ORDEN 151 (OS-REAL-TEST-003):');
    console.log(`   id_tipo_servicio: ${orden151?.id_tipo_servicio}`);
    console.log(`   tipo_servicio: ${orden151?.tipo_servicio?.nombre_tipo || 'N/A'}`);

    // 3. Contar actividades por tipo de servicio
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📊 ACTIVIDADES EN CATÁLOGO POR TIPO DE SERVICIO:');
    console.log('═══════════════════════════════════════════════════════');

    const actividadesPorTipo = await p.catalogo_actividades.groupBy({
        by: ['id_tipo_servicio'],
        _count: { id_actividad_catalogo: true },
        where: { activo: true }
    });

    for (const grupo of actividadesPorTipo) {
        const tipo = await p.tipos_servicio.findUnique({
            where: { id_tipo_servicio: grupo.id_tipo_servicio },
            select: { codigo_tipo: true, nombre_tipo: true }
        });
        console.log(`   id_tipo_servicio=${grupo.id_tipo_servicio} (${tipo?.codigo_tipo || 'N/A'} - ${tipo?.nombre_tipo || 'N/A'}): ${grupo._count.id_actividad_catalogo} actividades`);
    }

    // 4. Listar tipos de servicio disponibles
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 TIPOS DE SERVICIO DISPONIBLES:');
    console.log('═══════════════════════════════════════════════════════');

    const tipos = await p.tipos_servicio.findMany({
        where: { activo: true },
        select: { id_tipo_servicio: true, codigo_tipo: true, nombre_tipo: true }
    });

    for (const t of tipos) {
        console.log(`   ID=${t.id_tipo_servicio}: ${t.codigo_tipo} - ${t.nombre_tipo}`);
    }

    // 5. Verificar si id_tipo_servicio=1 tiene las 42 actividades
    const actividadesTipo1 = await p.catalogo_actividades.count({
        where: { id_tipo_servicio: 1, activo: true }
    });
    console.log(`\n✅ Actividades para id_tipo_servicio=1: ${actividadesTipo1}`);

    await p.$disconnect();
}

diagnosticar().catch(console.error);
