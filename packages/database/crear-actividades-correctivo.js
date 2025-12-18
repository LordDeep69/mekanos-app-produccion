/**
 * Crear actividades genéricas para servicios CORRECTIVO
 * Permite documentar diagnóstico, reparación y pruebas
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const log = {
    info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
    success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
    error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
    step: (msg) => console.log(`\n\x1b[35m🔷 ${msg}\x1b[0m`)
};

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🔧 CREAR ACTIVIDADES PARA SERVICIO CORRECTIVO');
    console.log('='.repeat(60) + '\n');

    try {
        // Verificar si ya existen
        const existentes = await prisma.catalogo_actividades.count({
            where: { id_tipo_servicio: 6 }
        });

        if (existentes > 0) {
            log.info(`Ya existen ${existentes} actividades para CORRECTIVO`);
            return;
        }

        // Actividades genéricas para correctivo
        const actividades = [
            {
                codigo_actividad: 'CORR_RECEP',
                descripcion_actividad: 'Recepción del equipo y verificación de reporte del cliente',
                tipo_actividad: 'INSPECCION',
                orden_ejecucion: 1,
                es_obligatoria: true,
                tiempo_estimado_minutos: 15
            },
            {
                codigo_actividad: 'CORR_DIAG',
                descripcion_actividad: 'Diagnóstico inicial - Identificación de falla',
                tipo_actividad: 'INSPECCION',
                orden_ejecucion: 2,
                es_obligatoria: true,
                tiempo_estimado_minutos: 30
            },
            {
                codigo_actividad: 'CORR_CAUSA',
                descripcion_actividad: 'Análisis de causa raíz del problema',
                tipo_actividad: 'INSPECCION',
                orden_ejecucion: 3,
                es_obligatoria: true,
                tiempo_estimado_minutos: 20
            },
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

        log.step(`Creando ${actividades.length} actividades para CORRECTIVO...`);

        for (const act of actividades) {
            await prisma.catalogo_actividades.create({
                data: {
                    ...act,
                    id_tipo_servicio: 6, // CORRECTIVO
                    activo: true,
                    creado_por: 1
                }
            });
            log.success(`${act.codigo_actividad}: ${act.descripcion_actividad}`);
        }

        // Verificar
        const total = await prisma.catalogo_actividades.count({
            where: { id_tipo_servicio: 6 }
        });

        console.log('\n' + '='.repeat(60));
        log.success(`CORRECTIVO ahora tiene ${total} actividades`);
        console.log('='.repeat(60) + '\n');

        console.log('⚠️  NOTA: Las órdenes correctivas existentes NO tendrán estas actividades.');
        console.log('   Debes crear nuevas órdenes o sincronizar de nuevo para que aparezcan.\n');

    } catch (error) {
        log.error(`Error: ${error.message}`);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
