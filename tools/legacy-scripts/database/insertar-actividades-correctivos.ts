import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Insertando actividades para CORRECTIVO, EMERGENCIA e INSPECCIÓN...\n');

    // Obtener los tipos de servicio
    const tipoCorrectivo = await prisma.tipos_servicio.findUnique({ where: { codigo_tipo: 'CORRECTIVO' } });
    const tipoEmergencia = await prisma.tipos_servicio.findUnique({ where: { codigo_tipo: 'EMERGENCIA' } });
    const tipoInspeccion = await prisma.tipos_servicio.findUnique({ where: { codigo_tipo: 'INSPECCION' } });

    if (!tipoCorrectivo) {
        console.log('❌ No se encontró tipo CORRECTIVO');
        return;
    }
    if (!tipoEmergencia) {
        console.log('❌ No se encontró tipo EMERGENCIA');
        return;
    }
    if (!tipoInspeccion) {
        console.log('❌ No se encontró tipo INSPECCION');
        return;
    }

    console.log(`✅ Tipos encontrados: CORRECTIVO(${tipoCorrectivo.id_tipo_servicio}), EMERGENCIA(${tipoEmergencia.id_tipo_servicio}), INSPECCION(${tipoInspeccion.id_tipo_servicio})`);

    // Actividades genéricas para CORRECTIVO (campo es descripcion_actividad según schema)
    const actividadesCorrectivo = [
        { codigo: 'COR_DIAG', descripcion: 'Diagnóstico de Falla - Identificar causa raíz del problema', orden: 1 },
        { codigo: 'COR_REPARACION', descripcion: 'Reparación/Corrección - Ejecutar la reparación necesaria', orden: 2 },
        { codigo: 'COR_PRUEBA', descripcion: 'Prueba de Funcionamiento - Verificar correcto funcionamiento', orden: 3 },
        { codigo: 'COR_LIMPIEZA', descripcion: 'Limpieza del Área de Trabajo', orden: 4 },
    ];

    // Actividades genéricas para EMERGENCIA
    const actividadesEmergencia = [
        { codigo: 'EME_EVALUACION', descripcion: 'Evaluación de Emergencia - Evaluar situación', orden: 1 },
        { codigo: 'EME_INTERVENCION', descripcion: 'Intervención Inmediata - Acción correctiva de emergencia', orden: 2 },
        { codigo: 'EME_VERIFICACION', descripcion: 'Verificación de Seguridad - Equipo seguro para operar', orden: 3 },
    ];

    // Actividades genéricas para INSPECCIÓN
    const actividadesInspeccion = [
        { codigo: 'INS_VISUAL', descripcion: 'Inspección Visual del equipo', orden: 1 },
        { codigo: 'INS_REPORTE', descripcion: 'Generación de Reporte - Documentar hallazgos', orden: 2 },
    ];

    // Insertar actividades para CORRECTIVO
    console.log('\n📋 Insertando actividades CORRECTIVO:');
    for (const act of actividadesCorrectivo) {
        await prisma.catalogo_actividades.upsert({
            where: { codigo_actividad: act.codigo },
            update: { descripcion_actividad: act.descripcion, activo: true },
            create: {
                codigo_actividad: act.codigo,
                descripcion_actividad: act.descripcion,
                tipo_actividad: 'VERIFICACION',
                id_tipo_servicio: tipoCorrectivo.id_tipo_servicio,
                orden_ejecucion: act.orden,
                es_obligatoria: true,
                activo: true,
            },
        });
        console.log(`   ✅ ${act.codigo}: ${act.descripcion.substring(0, 40)}...`);
    }

    // Insertar actividades para EMERGENCIA
    console.log('\n🚨 Insertando actividades EMERGENCIA:');
    for (const act of actividadesEmergencia) {
        await prisma.catalogo_actividades.upsert({
            where: { codigo_actividad: act.codigo },
            update: { descripcion_actividad: act.descripcion, activo: true },
            create: {
                codigo_actividad: act.codigo,
                descripcion_actividad: act.descripcion,
                tipo_actividad: 'VERIFICACION',
                id_tipo_servicio: tipoEmergencia.id_tipo_servicio,
                orden_ejecucion: act.orden,
                es_obligatoria: true,
                activo: true,
            },
        });
        console.log(`   ✅ ${act.codigo}: ${act.descripcion.substring(0, 40)}...`);
    }

    // Insertar actividades para INSPECCIÓN
    console.log('\n🔍 Insertando actividades INSPECCIÓN:');
    for (const act of actividadesInspeccion) {
        await prisma.catalogo_actividades.upsert({
            where: { codigo_actividad: act.codigo },
            update: { descripcion_actividad: act.descripcion, activo: true },
            create: {
                codigo_actividad: act.codigo,
                descripcion_actividad: act.descripcion,
                tipo_actividad: 'VERIFICACION',
                id_tipo_servicio: tipoInspeccion.id_tipo_servicio,
                orden_ejecucion: act.orden,
                es_obligatoria: true,
                activo: true,
            },
        });
        console.log(`   ✅ ${act.codigo}: ${act.descripcion}`);
    }

    // Verificar conteos finales
    const countCorrectivo = await prisma.catalogo_actividades.count({
        where: { id_tipo_servicio: tipoCorrectivo.id_tipo_servicio, activo: true }
    });
    const countEmergencia = await prisma.catalogo_actividades.count({
        where: { id_tipo_servicio: tipoEmergencia.id_tipo_servicio, activo: true }
    });
    const countInspeccion = await prisma.catalogo_actividades.count({
        where: { id_tipo_servicio: tipoInspeccion.id_tipo_servicio, activo: true }
    });

    console.log('\n📊 RESUMEN:');
    console.log(`   CORRECTIVO: ${countCorrectivo} actividades`);
    console.log(`   EMERGENCIA: ${countEmergencia} actividades`);
    console.log(`   INSPECCIÓN: ${countInspeccion} actividades`);
    console.log('\n✅ Proceso completado');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
