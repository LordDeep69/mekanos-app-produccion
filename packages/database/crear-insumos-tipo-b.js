/**
 * Crear actividad INSUMOS para Tipo B
 */
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
    console.log('\n=== CREAR ACTIVIDAD INSUMOS TIPO B ===\n');

    // Verificar si ya existe
    const existe = await p.catalogo_actividades.findFirst({
        where: {
            id_tipo_servicio: 4,
            codigo_actividad: { contains: 'INSUM' }
        }
    });

    if (existe) {
        console.log('✅ Actividad INSUMOS ya existe:', existe.codigo_actividad);
        await p.$disconnect();
        return;
    }

    // Crear actividad de insumos como primera actividad (orden 0)
    const insumos = await p.catalogo_actividades.create({
        data: {
            codigo_actividad: 'GPB_INSUMOS_01',
            descripcion_actividad: 'Verificación y registro fotográfico de insumos a utilizar (filtros, aceites, etc.)',
            id_tipo_servicio: 4, // GEN_PREV_B
            tipo_actividad: 'VERIFICACION',
            orden_ejecucion: 1, // Primera actividad
            es_obligatoria: true,
            tiempo_estimado_minutos: 10,
            instrucciones: 'Tomar foto de todos los insumos antes de iniciar el mantenimiento. Verificar cantidades y referencias.',
            activo: true,
            creado_por: 1
        }
    });

    console.log('✅ Actividad INSUMOS creada:');
    console.log(`   ID: ${insumos.id_actividad_catalogo}`);
    console.log(`   Código: ${insumos.codigo_actividad}`);
    console.log(`   Tipo: ${insumos.tipo_actividad}`);
    console.log(`   Orden: ${insumos.orden_ejecucion}`);

    // Verificar total
    const total = await p.catalogo_actividades.count({
        where: { id_tipo_servicio: 4 }
    });
    console.log(`\n📊 Total actividades Tipo B ahora: ${total}`);

    await p.$disconnect();
}

main().catch(console.error);
