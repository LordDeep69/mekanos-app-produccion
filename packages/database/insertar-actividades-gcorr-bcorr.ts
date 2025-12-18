/**
 * Insertar actividades genéricas para GEN_CORR y BOM_CORR
 * 
 * PROBLEMA IDENTIFICADO: Las órdenes GCORR-* y BCORR-* no tienen actividades
 * porque no existen registros en catalogo_actividades para los tipos:
 * - GEN_CORR (código del tipo de servicio para correctivo de generador)
 * - BOM_CORR (código del tipo de servicio para correctivo de bomba)
 * 
 * SOLUCIÓN: Insertar actividades genéricas para ambos tipos.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('='.repeat(70));
    console.log('🔧 INSERTAR ACTIVIDADES PARA GEN_CORR Y BOM_CORR');
    console.log('='.repeat(70) + '\n');

    // 1. Buscar los tipos de servicio correctivos específicos
    const tipoGenCorr = await prisma.tipos_servicio.findFirst({
        where: { codigo_tipo: { contains: 'GEN_CORR', mode: 'insensitive' } }
    });
    const tipoBomCorr = await prisma.tipos_servicio.findFirst({
        where: { codigo_tipo: { contains: 'BOM_CORR', mode: 'insensitive' } }
    });

    console.log('📊 Tipos de servicio encontrados:');
    console.log(`   GEN_CORR: ${tipoGenCorr ? `ID ${tipoGenCorr.id_tipo_servicio}` : '❌ NO ENCONTRADO'}`);
    console.log(`   BOM_CORR: ${tipoBomCorr ? `ID ${tipoBomCorr.id_tipo_servicio}` : '❌ NO ENCONTRADO'}`);

    if (!tipoGenCorr && !tipoBomCorr) {
        console.log('\n❌ No se encontraron los tipos GEN_CORR ni BOM_CORR. Abortando.');
        return;
    }

    // 2. Definir actividades genéricas para correctivos (aplicables a ambos tipos)
    const actividadesCorrectivo = [
        {
            codigo_suffix: 'RECEPCION',
            descripcion: 'Recepción del equipo y verificación del reporte del cliente',
            tipo_actividad: 'INSPECCION',
            orden: 1,
            obligatoria: true,
            tiempo: 15
        },
        {
            codigo_suffix: 'DIAGNOSTICO',
            descripcion: 'Diagnóstico inicial - Identificación de la falla',
            tipo_actividad: 'INSPECCION',
            orden: 2,
            obligatoria: true,
            tiempo: 30
        },
        {
            codigo_suffix: 'CAUSA_RAIZ',
            descripcion: 'Análisis de causa raíz del problema',
            tipo_actividad: 'INSPECCION',
            orden: 3,
            obligatoria: true,
            tiempo: 20
        },
        {
            codigo_suffix: 'REPARACION_1',
            descripcion: 'Trabajo de reparación - Desmontaje de componentes afectados',
            tipo_actividad: 'AJUSTE',
            orden: 4,
            obligatoria: false,
            tiempo: 60
        },
        {
            codigo_suffix: 'REPARACION_2',
            descripcion: 'Trabajo de reparación - Reemplazo/Cambio de piezas',
            tipo_actividad: 'CAMBIO',
            orden: 5,
            obligatoria: false,
            tiempo: 60
        },
        {
            codigo_suffix: 'REPARACION_3',
            descripcion: 'Trabajo de reparación - Montaje y ajuste final',
            tipo_actividad: 'AJUSTE',
            orden: 6,
            obligatoria: false,
            tiempo: 45
        },
        {
            codigo_suffix: 'PRUEBA_FUNC',
            descripcion: 'Prueba de funcionamiento post-reparación',
            tipo_actividad: 'PRUEBA',
            orden: 7,
            obligatoria: true,
            tiempo: 30
        },
        {
            codigo_suffix: 'MEDICIONES',
            descripcion: 'Mediciones finales de verificación',
            tipo_actividad: 'MEDICION',
            orden: 8,
            obligatoria: false,
            tiempo: 20
        },
        {
            codigo_suffix: 'LIMPIEZA',
            descripcion: 'Limpieza del área de trabajo y del equipo',
            tipo_actividad: 'LIMPIEZA',
            orden: 9,
            obligatoria: true,
            tiempo: 15
        },
        {
            codigo_suffix: 'ENTREGA',
            descripcion: 'Entrega del equipo y explicación al cliente',
            tipo_actividad: 'VERIFICACION',
            orden: 10,
            obligatoria: true,
            tiempo: 15
        }
    ];

    // 3. Insertar actividades para GEN_CORR
    if (tipoGenCorr) {
        console.log(`\n📋 Insertando actividades para GEN_CORR (ID ${tipoGenCorr.id_tipo_servicio})...`);

        for (const act of actividadesCorrectivo) {
            const codigoActividad = `GCORR_${act.codigo_suffix}`;

            await prisma.catalogo_actividades.upsert({
                where: { codigo_actividad: codigoActividad },
                update: {
                    descripcion_actividad: act.descripcion,
                    activo: true
                },
                create: {
                    codigo_actividad: codigoActividad,
                    descripcion_actividad: act.descripcion,
                    tipo_actividad: act.tipo_actividad as any,
                    id_tipo_servicio: tipoGenCorr.id_tipo_servicio,
                    orden_ejecucion: act.orden,
                    es_obligatoria: act.obligatoria,
                    tiempo_estimado_minutos: act.tiempo,
                    activo: true,
                    creado_por: 1
                }
            });
            console.log(`   ✅ ${codigoActividad}`);
        }
    }

    // 4. Insertar actividades para BOM_CORR
    if (tipoBomCorr) {
        console.log(`\n📋 Insertando actividades para BOM_CORR (ID ${tipoBomCorr.id_tipo_servicio})...`);

        for (const act of actividadesCorrectivo) {
            const codigoActividad = `BCORR_${act.codigo_suffix}`;

            await prisma.catalogo_actividades.upsert({
                where: { codigo_actividad: codigoActividad },
                update: {
                    descripcion_actividad: act.descripcion,
                    activo: true
                },
                create: {
                    codigo_actividad: codigoActividad,
                    descripcion_actividad: act.descripcion,
                    tipo_actividad: act.tipo_actividad as any,
                    id_tipo_servicio: tipoBomCorr.id_tipo_servicio,
                    orden_ejecucion: act.orden,
                    es_obligatoria: act.obligatoria,
                    tiempo_estimado_minutos: act.tiempo,
                    activo: true,
                    creado_por: 1
                }
            });
            console.log(`   ✅ ${codigoActividad}`);
        }
    }

    // 5. Verificar conteos
    const countGenCorr = tipoGenCorr ? await prisma.catalogo_actividades.count({
        where: { id_tipo_servicio: tipoGenCorr.id_tipo_servicio, activo: true }
    }) : 0;

    const countBomCorr = tipoBomCorr ? await prisma.catalogo_actividades.count({
        where: { id_tipo_servicio: tipoBomCorr.id_tipo_servicio, activo: true }
    }) : 0;

    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN:');
    console.log(`   GEN_CORR: ${countGenCorr} actividades en catálogo`);
    console.log(`   BOM_CORR: ${countBomCorr} actividades en catálogo`);
    console.log('='.repeat(70));

    // 6. Ahora asignar actividades a órdenes existentes GCORR-*/BCORR-* que no tengan
    console.log('\n🔧 Asignando actividades a órdenes GCORR/BCORR existentes...\n');

    // SIN transacción para evitar timeout
    const ordenesTarget = await prisma.ordenes_servicio.findMany({
        where: {
            OR: [
                { numero_orden: { startsWith: 'GCORR-', mode: 'insensitive' } },
                { numero_orden: { startsWith: 'BCORR-', mode: 'insensitive' } },
            ],
        },
        select: {
            id_orden_servicio: true,
            numero_orden: true,
            id_tipo_servicio: true,
            _count: { select: { actividades_ejecutadas: true } },
        },
        orderBy: { numero_orden: 'asc' },
    });

    console.log(`📦 Órdenes GCORR/BCORR encontradas: ${ordenesTarget.length}`);

    const ordenesSinActividades = ordenesTarget.filter((o) => o._count.actividades_ejecutadas === 0);
    console.log(`⚠️  Órdenes SIN actividades: ${ordenesSinActividades.length}`);

    if (ordenesSinActividades.length === 0) {
        console.log('✅ Todas las órdenes ya tienen actividades asignadas.');
    } else {
        let asignadas = 0;

        for (const orden of ordenesSinActividades) {
            const tipoId = orden.id_tipo_servicio;
            if (!tipoId) continue;

            // Obtener TODAS las actividades del catálogo para este tipo
            const actividadesCatalogo = await prisma.catalogo_actividades.findMany({
                where: {
                    id_tipo_servicio: tipoId,
                    activo: true,
                },
                orderBy: { orden_ejecucion: 'asc' },
            });

            if (actividadesCatalogo.length === 0) {
                console.log(`   ⚠️  ${orden.numero_orden}: No hay actividades en catálogo para tipo ${tipoId}`);
                continue;
            }

            // Asignar TODAS las actividades del catálogo a la orden usando createMany
            await prisma.actividades_ejecutadas.createMany({
                data: actividadesCatalogo.map(act => ({
                    id_orden_servicio: orden.id_orden_servicio,
                    id_actividad_catalogo: act.id_actividad_catalogo,
                    sistema: 'CORRECTIVO',
                    ejecutada: false,
                    fecha_registro: new Date(),
                })),
            });

            console.log(`   ✅ ${orden.numero_orden}: ${actividadesCatalogo.length} actividades asignadas`);
            asignadas++;
        }

        console.log(`\n📊 Órdenes procesadas: ${asignadas}`);
    }

    console.log('\n✅ Proceso completado exitosamente');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
