const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== ANÁLISIS PROFUNDO DE CATÁLOGOS ===\n');

    // 1. TIPOS DE SERVICIO
    const tiposServicio = await prisma.tipos_servicio.findMany({
        where: { activo: true },
        include: {
            _count: {
                select: { catalogo_actividades: true }
            }
        },
        orderBy: { orden_visualizacion: 'asc' }
    });

    console.log('=== 1. TIPOS DE SERVICIO ===');
    console.log(`Total: ${tiposServicio.length}`);
    tiposServicio.forEach(ts => {
        console.log(`  - [${ts.id_tipo_servicio}] ${ts.codigo_tipo}: ${ts.nombre_tipo} (${ts._count.catalogo_actividades} actividades)`);
    });

    // 2. SISTEMAS
    const sistemas = await prisma.catalogo_sistemas.findMany({
        where: { activo: true },
        include: {
            _count: {
                select: { catalogo_actividades: true }
            }
        },
        orderBy: { orden_visualizacion: 'asc' }
    });

    console.log('\n=== 2. SISTEMAS ===');
    console.log(`Total: ${sistemas.length}`);
    sistemas.forEach(s => {
        console.log(`  - [${s.id_sistema}] ${s.codigo_sistema}: ${s.nombre_sistema} (${s._count.catalogo_actividades} actividades) | Aplica: ${s.aplica_a}`);
    });

    // 3. ACTIVIDADES
    const actividades = await prisma.catalogo_actividades.findMany({
        where: { activo: true },
        include: {
            tipos_servicio: true,
            catalogo_sistemas: true,
            parametros_medicion: true
        }
    });

    console.log('\n=== 3. ACTIVIDADES ===');
    console.log(`Total: ${actividades.length}`);

    // Agrupar por tipo de servicio
    const porServicio = {};
    const huerfanas = [];

    actividades.forEach(a => {
        if (a.id_tipo_servicio) {
            const key = a.tipos_servicio?.codigo_tipo || `id_${a.id_tipo_servicio}`;
            if (!porServicio[key]) porServicio[key] = { nombre: a.tipos_servicio?.nombre_tipo, actividades: [], porSistema: {} };
            porServicio[key].actividades.push(a);

            const sistemaKey = a.catalogo_sistemas?.nombre_sistema || 'Sin Sistema';
            if (!porServicio[key].porSistema[sistemaKey]) porServicio[key].porSistema[sistemaKey] = [];
            porServicio[key].porSistema[sistemaKey].push(a);
        } else {
            huerfanas.push(a);
        }
    });

    console.log('\nActividades por Tipo de Servicio:');
    Object.entries(porServicio).forEach(([codigo, data]) => {
        console.log(`  ${codigo} (${data.nombre}): ${data.actividades.length} actividades`);
        Object.entries(data.porSistema).forEach(([sistema, acts]) => {
            console.log(`    └─ ${sistema}: ${acts.length} actividades`);
        });
    });

    console.log(`\n⚠️  Actividades HUÉRFANAS (sin tipo de servicio): ${huerfanas.length}`);
    huerfanas.slice(0, 10).forEach(a => {
        console.log(`  - [${a.id_actividad_catalogo}] ${a.codigo_actividad}: ${a.descripcion_actividad}`);
    });

    // 4. PARÁMETROS DE MEDICIÓN
    const parametros = await prisma.parametros_medicion.findMany({
        where: { activo: true },
        include: {
            _count: {
                select: { catalogo_actividades: true }
            }
        }
    });

    console.log('\n=== 4. PARÁMETROS DE MEDICIÓN ===');
    console.log(`Total: ${parametros.length}`);
    parametros.forEach(p => {
        console.log(`  - [${p.id_parametro_medicion}] ${p.codigo_parametro}: ${p.nombre_parametro} (${p.unidad_medida}) | Usado en ${p._count.catalogo_actividades} actividades | Rangos: ${p.valor_minimo_normal}-${p.valor_maximo_normal}`);
    });

    // 5. Actividades tipo MEDICION sin parámetro asignado
    const medicionesSinParametro = actividades.filter(a =>
        a.tipo_actividad === 'MEDICION' && !a.id_parametro_medicion
    );

    console.log(`\n⚠️  Actividades MEDICION sin parámetro: ${medicionesSinParametro.length}`);
    medicionesSinParametro.slice(0, 5).forEach(a => {
        console.log(`  - [${a.id_actividad_catalogo}] ${a.codigo_actividad}: ${a.descripcion_actividad}`);
    });

    // 6. Resumen de problemas
    console.log('\n=== RESUMEN DE PROBLEMAS IDENTIFICADOS ===');
    console.log(`1. Actividades huérfanas (sin servicio): ${huerfanas.length}`);
    console.log(`2. Actividades MEDICION sin parámetro: ${medicionesSinParametro.length}`);

    // Verificar sistemas sin actividades
    const sistemasVacios = sistemas.filter(s => s._count.catalogo_actividades === 0);
    console.log(`3. Sistemas sin actividades: ${sistemasVacios.length}`);
    sistemasVacios.forEach(s => console.log(`   - ${s.nombre_sistema}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
