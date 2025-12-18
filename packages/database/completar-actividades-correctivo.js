/**
 * Completar actividades restantes para CORRECTIVO
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('\n=== COMPLETAR ACTIVIDADES CORRECTIVO ===\n');

    const actividades = [
        {
            codigo_actividad: 'CORR_REP01',
            descripcion_actividad: 'Trabajo de reparación 1 - Desmontaje',
            tipo_actividad: 'AJUSTE',
            orden_ejecucion: 4,
            es_obligatoria: false,
            tiempo_estimado_minutos: 60
        },
        {
            codigo_actividad: 'CORR_REP02',
            descripcion_actividad: 'Trabajo de reparación 2 - Reemplazo/Cambio',
            tipo_actividad: 'CAMBIO',
            orden_ejecucion: 5,
            es_obligatoria: false,
            tiempo_estimado_minutos: 60
        },
        {
            codigo_actividad: 'CORR_REP03',
            descripcion_actividad: 'Trabajo de reparación 3 - Montaje/Ajuste',
            tipo_actividad: 'AJUSTE',
            orden_ejecucion: 6,
            es_obligatoria: false,
            tiempo_estimado_minutos: 45
        },
        {
            codigo_actividad: 'CORR_PRUEBA',
            descripcion_actividad: 'Prueba de funcionamiento post-reparación',
            tipo_actividad: 'PRUEBA',
            orden_ejecucion: 7,
            es_obligatoria: true,
            tiempo_estimado_minutos: 30
        },
        {
            codigo_actividad: 'CORR_MEDIC',
            descripcion_actividad: 'Mediciones finales de verificación',
            tipo_actividad: 'MEDICION',
            orden_ejecucion: 8,
            es_obligatoria: false,
            tiempo_estimado_minutos: 20
        },
        {
            codigo_actividad: 'CORR_LIMPIEZA',
            descripcion_actividad: 'Limpieza del área de trabajo',
            tipo_actividad: 'LIMPIEZA',
            orden_ejecucion: 9,
            es_obligatoria: true,
            tiempo_estimado_minutos: 15
        },
        {
            codigo_actividad: 'CORR_ENTREGA',
            descripcion_actividad: 'Entrega del equipo y explicación al cliente',
            tipo_actividad: 'VERIFICACION',
            orden_ejecucion: 10,
            es_obligatoria: true,
            tiempo_estimado_minutos: 15
        }
    ];

    for (const act of actividades) {
        // Verificar si ya existe
        const existe = await prisma.catalogo_actividades.findFirst({
            where: { codigo_actividad: act.codigo_actividad }
        });

        if (existe) {
            console.log(`⚠️  ${act.codigo_actividad} ya existe`);
        } else {
            await prisma.catalogo_actividades.create({
                data: {
                    ...act,
                    id_tipo_servicio: 6,
                    activo: true,
                    creado_por: 1
                }
            });
            console.log(`✅ ${act.codigo_actividad} creada`);
        }
    }

    // Verificar total
    const total = await prisma.catalogo_actividades.count({
        where: { id_tipo_servicio: 6 }
    });
    console.log(`\n📊 Total actividades CORRECTIVO: ${total}`);

    await prisma.$disconnect();
}

main().catch(console.error);
