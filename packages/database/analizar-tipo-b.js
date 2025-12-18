/**
 * Analizar actividades Tipo B para encontrar duplicados/legacy
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== ANÁLISIS TIPO B (id_tipo_servicio: 4) ===\n');

    // Todas las actividades Tipo B
    const actividades = await p.catalogo_actividades.findMany({
        where: { id_tipo_servicio: 4 },
        orderBy: { orden_ejecucion: 'asc' },
        select: {
            id_actividad_catalogo: true,
            codigo_actividad: true,
            descripcion_actividad: true,
            tipo_actividad: true,
            activo: true,
            orden_ejecucion: true
        }
    });

    console.log(`Total actividades en catálogo: ${actividades.length}\n`);

    // Agrupar por tipo
    const porTipo = {};
    actividades.forEach(a => {
        if (!porTipo[a.tipo_actividad]) porTipo[a.tipo_actividad] = [];
        porTipo[a.tipo_actividad].push(a);
    });

    console.log('📊 Por tipo de actividad:');
    Object.entries(porTipo).forEach(([tipo, lista]) => {
        console.log(`  ${tipo}: ${lista.length}`);
    });

    console.log('\n📋 Lista completa:');
    actividades.forEach((a, i) => {
        const estado = a.activo ? '✅' : '❌';
        console.log(`  ${i + 1}. [${a.id_actividad_catalogo}] ${a.codigo_actividad} - ${a.tipo_actividad} ${estado}`);
    });

    // Buscar actividad de insumos
    console.log('\n🔍 Buscando actividad INSUMOS:');
    const insumos = actividades.filter(a =>
        a.codigo_actividad.toLowerCase().includes('insum') ||
        a.descripcion_actividad?.toLowerCase().includes('insum')
    );

    if (insumos.length > 0) {
        console.log('  ✅ Encontrada:');
        insumos.forEach(a => console.log(`     ${a.codigo_actividad}: ${a.descripcion_actividad}`));
    } else {
        console.log('  ❌ NO EXISTE actividad de insumos');
    }

    // Verificar mediciones duplicadas
    console.log('\n🔍 Actividades tipo MEDICION:');
    const mediciones = porTipo['MEDICION'] || [];
    mediciones.forEach(m => {
        console.log(`  [${m.id_actividad_catalogo}] ${m.codigo_actividad}`);
    });

    await p.$disconnect();
}

main().catch(console.error);
