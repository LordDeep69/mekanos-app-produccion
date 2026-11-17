/**
 * Verificar actividades instanciadas para orden 161 (PREVB-353833)
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== VERIFICAR ORDEN 161 (PREVB-353833) ===\n');

    // Info de la orden
    const orden = await p.ordenes_servicio.findUnique({
        where: { id_orden_servicio: 161 },
        include: { tipo_servicio: true }
    });

    if (!orden) {
        console.log('❌ Orden 161 no encontrada');
        await p.$disconnect();
        return;
    }

    console.log('📋 ORDEN:');
    console.log(`   Número: ${orden.numero_orden}`);
    console.log(`   Tipo: ${orden.tipo_servicio?.nombre_tipo} (id: ${orden.id_tipo_servicio})`);
    console.log(`   Estado: ${orden.id_estado_actual}`);

    // Actividades ejecutadas instanciadas
    const actividades = await p.actividades_ejecutadas.findMany({
        where: { id_orden_servicio: 161 },
        include: { catalogo_actividades: true }
    });

    console.log(`\n📊 ACTIVIDADES INSTANCIADAS: ${actividades.length}`);

    // Agrupar por estado
    const completadas = actividades.filter(a => a.completada);
    const pendientes = actividades.filter(a => !a.completada);

    console.log(`   Completadas: ${completadas.length}`);
    console.log(`   Pendientes: ${pendientes.length}`);

    // Mostrar lista
    console.log('\n📋 Lista de actividades:');
    actividades.forEach((a, i) => {
        const estado = a.completada ? '✅' : '⬜';
        const codigo = a.catalogo_actividades?.codigo_actividad || 'N/A';
        const tipo = a.catalogo_actividades?.tipo_actividad || 'N/A';
        console.log(`   ${i + 1}. ${estado} [${a.id_actividad_catalogo}] ${codigo} - ${tipo}`);
    });

    // Mediciones instanciadas
    const mediciones = await p.mediciones_ejecutadas.findMany({
        where: { id_orden_servicio: 161 }
    });

    console.log(`\n📊 MEDICIONES INSTANCIADAS: ${mediciones.length}`);
    const medCompletadas = mediciones.filter(m => m.valor_medido !== null);
    console.log(`   Con valor: ${medCompletadas.length}`);
    console.log(`   Sin valor: ${mediciones.length - medCompletadas.length}`);

    await p.$disconnect();
}

main().catch(console.error);
