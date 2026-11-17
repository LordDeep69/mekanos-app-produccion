/**
 * FASE 1: CREAR 15 ÓRDENES DE SERVICIO + NOTIFICACIONES
 * 
 * - 5 Órdenes Tipo B Generador (id_tipo_servicio: 4)
 * - 5 Órdenes Tipo A Bomba (id_tipo_servicio: 5)
 * - 5 Órdenes Correctivo (id_tipo_servicio: 6)
 * 
 * Cada orden incluye notificación automática
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const log = {
    info: (msg) => console.log(`\x1b[36mℹ️  ${msg}\x1b[0m`),
    success: (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`),
    error: (msg) => console.log(`\x1b[31m❌ ${msg}\x1b[0m`),
    warning: (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`),
    step: (msg) => console.log(`\n\x1b[35m🔷 ${msg}\x1b[0m`)
};

// ID del estado EN_PROCESO (no es estado final, aparecerá en sync)
const ID_ESTADO_EN_PROCESO = 5;
const ID_TECNICO = 1; // admin
const ID_CLIENTE = 13; // MEKANOS DEMO

async function crearOrdenConNotificacion(data) {
    // Generar número de orden único
    const timestamp = Date.now().toString().slice(-6);
    const numeroOrden = `${data.prefijo}-${timestamp}`;

    // Crear orden usando Prisma ORM
    const ordenCreada = await prisma.ordenes_servicio.create({
        data: {
            numero_orden: numeroOrden,
            id_tipo_servicio: data.id_tipo_servicio,
            id_equipo: data.id_equipo,
            id_cliente: ID_CLIENTE,
            id_tecnico_asignado: ID_TECNICO,
            id_estado_actual: ID_ESTADO_EN_PROCESO,
            prioridad: data.prioridad, // Prisma maneja el enum
            descripcion_inicial: data.descripcion,
            creado_por: 1
        },
        select: { id_orden_servicio: true, numero_orden: true }
    });

    // Crear notificación
    await prisma.notificaciones.create({
        data: {
            id_usuario: ID_TECNICO,
            tipo_notificacion: 'ORDEN_ASIGNADA',
            titulo: `📋 ${data.titulo} - ${numeroOrden}`,
            mensaje: data.descripcion,
            prioridad: data.prioridad === 'URGENTE' ? 'URGENTE' : data.prioridad === 'ALTA' ? 'ALTA' : 'NORMAL',
            leida: false,
            id_entidad_relacionada: ordenCreada.id_orden_servicio,
            tipo_entidad_relacionada: 'ORDEN_SERVICIO',
            fecha_creacion: new Date()
        }
    });

    return ordenCreada;
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 FASE 1: CREAR 15 ÓRDENES DE SERVICIO');
    console.log('='.repeat(60) + '\n');

    try {
        // ============================================================
        // PASO 1: 5 ÓRDENES TIPO B GENERADOR
        // ============================================================
        log.step('PASO 1: Crear 5 Órdenes Tipo B - Generador');

        const ordenesTipoB = [
            {
                prefijo: 'PREVB',
                id_tipo_servicio: 4, // GEN_PREV_B
                id_equipo: 108, // GEN-DEMO-001 Caterpillar
                prioridad: 'ALTA',
                titulo: 'Mantenimiento Preventivo Tipo B',
                descripcion: 'Mantenimiento Tipo B completo: cambio filtros aire/aceite/combustible, cambio aceite motor, revisión sistema refrigeración, mediciones módulo control.'
            },
            {
                prefijo: 'PREVB',
                id_tipo_servicio: 4,
                id_equipo: 109, // GEN-DEMO-002 Cummins
                prioridad: 'NORMAL',
                titulo: 'Mantenimiento Preventivo Tipo B',
                descripcion: 'Mantenimiento Tipo B programado: cambio de fluidos y filtros, verificación sistemas, prueba de carga.'
            },
            {
                prefijo: 'PREVB',
                id_tipo_servicio: 4,
                id_equipo: 110, // GEN-DEMO-003 Volvo
                prioridad: 'ALTA',
                titulo: 'Mantenimiento Preventivo Tipo B',
                descripcion: 'Mantenimiento Tipo B urgente: equipo con alto horómetro, requiere cambio completo de filtros y aceites.'
            },
            {
                prefijo: 'PREVB',
                id_tipo_servicio: 4,
                id_equipo: 108, // Caterpillar (2da orden)
                prioridad: 'URGENTE',
                titulo: 'Mantenimiento Preventivo Tipo B URGENTE',
                descripcion: 'Mantenimiento Tipo B URGENTE: cliente reporta próxima auditoría, requiere certificación de equipo.'
            },
            {
                prefijo: 'PREVB',
                id_tipo_servicio: 4,
                id_equipo: 109, // Cummins (2da orden)
                prioridad: 'NORMAL',
                titulo: 'Mantenimiento Preventivo Tipo B',
                descripcion: 'Mantenimiento Tipo B de rutina: revisión completa de sistemas y cambio de consumibles.'
            }
        ];

        const ordenesCreadas = { tipoB: [], tipoA: [], correctivo: [] };

        for (const data of ordenesTipoB) {
            const orden = await crearOrdenConNotificacion(data);
            ordenesCreadas.tipoB.push(orden);
            log.success(`${orden.numero_orden} creada (Equipo: ${data.id_equipo}, Prioridad: ${data.prioridad})`);
        }

        // ============================================================
        // PASO 2: 5 ÓRDENES TIPO A BOMBA
        // ============================================================
        log.step('PASO 2: Crear 5 Órdenes Tipo A - Bomba');

        const ordenesTipoA = [
            {
                prefijo: 'BOMBA',
                id_tipo_servicio: 5, // BOM_PREV_A
                id_equipo: 111, // BOM-DEMO-001 Grundfos
                prioridad: 'NORMAL',
                titulo: 'Mantenimiento Preventivo Bomba',
                descripcion: 'Mantenimiento Tipo A bomba: limpieza, análisis vibración, mediciones eléctricas, revisión presostatos.'
            },
            {
                prefijo: 'BOMBA',
                id_tipo_servicio: 5,
                id_equipo: 112, // BOM-DEMO-002 Flygt
                prioridad: 'ALTA',
                titulo: 'Mantenimiento Preventivo Bomba',
                descripcion: 'Mantenimiento bomba sumergible: inspección sello mecánico, verificación fugas, prueba de arranque.'
            },
            {
                prefijo: 'BOMBA',
                id_tipo_servicio: 5,
                id_equipo: 113, // BOM-DEMO-003 Pedrollo
                prioridad: 'NORMAL',
                titulo: 'Mantenimiento Preventivo Bomba',
                descripcion: 'Mantenimiento Tipo A: revisión general sistema de bombeo, ajuste presostatos, verificación tanques.'
            },
            {
                prefijo: 'BOMBA',
                id_tipo_servicio: 5,
                id_equipo: 111, // Grundfos (2da orden)
                prioridad: 'ALTA',
                titulo: 'Mantenimiento Preventivo Bomba',
                descripcion: 'Revisión programada: cliente reporta variación en presión de trabajo.'
            },
            {
                prefijo: 'BOMBA',
                id_tipo_servicio: 5,
                id_equipo: 112, // Flygt (2da orden)
                prioridad: 'URGENTE',
                titulo: 'Mantenimiento Bomba URGENTE',
                descripcion: 'URGENTE: Sistema crítico de bombeo, requiere verificación inmediata por variación de caudal.'
            }
        ];

        for (const data of ordenesTipoA) {
            const orden = await crearOrdenConNotificacion(data);
            ordenesCreadas.tipoA.push(orden);
            log.success(`${orden.numero_orden} creada (Equipo: ${data.id_equipo}, Prioridad: ${data.prioridad})`);
        }

        // ============================================================
        // PASO 3: 5 ÓRDENES CORRECTIVO
        // ============================================================
        log.step('PASO 3: Crear 5 Órdenes Correctivo');

        const ordenesCorrectivo = [
            {
                prefijo: 'CORR',
                id_tipo_servicio: 6, // CORRECTIVO
                id_equipo: 108, // GEN-DEMO-001 Caterpillar
                prioridad: 'URGENTE',
                titulo: 'Correctivo - Fuga de Aceite',
                descripcion: 'CORRECTIVO URGENTE: Cliente reporta fuga de aceite visible en base del generador. Requiere diagnóstico inmediato.'
            },
            {
                prefijo: 'CORR',
                id_tipo_servicio: 6,
                id_equipo: 109, // GEN-DEMO-002 Cummins
                prioridad: 'ALTA',
                titulo: 'Correctivo - Falla de Arranque',
                descripcion: 'CORRECTIVO: Generador no arranca en modo automático. Sistema de control muestra error E45.'
            },
            {
                prefijo: 'CORR',
                id_tipo_servicio: 6,
                id_equipo: 111, // BOM-DEMO-001 Grundfos
                prioridad: 'ALTA',
                titulo: 'Correctivo - Vibración Excesiva',
                descripcion: 'CORRECTIVO: Bomba presenta vibración anormal. Cliente reporta ruido inusual durante operación.'
            },
            {
                prefijo: 'CORR',
                id_tipo_servicio: 6,
                id_equipo: 112, // BOM-DEMO-002 Flygt
                prioridad: 'NORMAL',
                titulo: 'Correctivo - Bajo Caudal',
                descripcion: 'CORRECTIVO: Sistema de bombeo con caudal reducido al 60% de capacidad nominal.'
            },
            {
                prefijo: 'CORR',
                id_tipo_servicio: 6,
                id_equipo: 110, // GEN-DEMO-003 Volvo
                prioridad: 'URGENTE',
                titulo: 'Correctivo - Sobrecalentamiento',
                descripcion: 'CORRECTIVO URGENTE: Generador se apaga por sobrecalentamiento. Posible falla en sistema de refrigeración.'
            }
        ];

        for (const data of ordenesCorrectivo) {
            const orden = await crearOrdenConNotificacion(data);
            ordenesCreadas.correctivo.push(orden);
            log.success(`${orden.numero_orden} creada (Equipo: ${data.id_equipo}, Prioridad: ${data.prioridad})`);
        }

        // ============================================================
        // RESUMEN FINAL
        // ============================================================
        console.log('\n' + '='.repeat(60));
        log.success('FASE 1 COMPLETADA');
        console.log('='.repeat(60));

        console.log('\n📊 ÓRDENES CREADAS:');
        console.log(`  - Tipo B Generador: ${ordenesCreadas.tipoB.length}`);
        console.log(`  - Tipo A Bomba: ${ordenesCreadas.tipoA.length}`);
        console.log(`  - Correctivo: ${ordenesCreadas.correctivo.length}`);
        console.log(`  - TOTAL: ${ordenesCreadas.tipoB.length + ordenesCreadas.tipoA.length + ordenesCreadas.correctivo.length}`);

        console.log('\n📱 NOTIFICACIONES CREADAS: 15');
        console.log('\n📋 LISTA DE ÓRDENES:');

        console.log('\n  TIPO B:');
        ordenesCreadas.tipoB.forEach(o => console.log(`    - ${o.numero_orden} (ID: ${o.id_orden_servicio})`));

        console.log('\n  TIPO A BOMBA:');
        ordenesCreadas.tipoA.forEach(o => console.log(`    - ${o.numero_orden} (ID: ${o.id_orden_servicio})`));

        console.log('\n  CORRECTIVO:');
        ordenesCreadas.correctivo.forEach(o => console.log(`    - ${o.numero_orden} (ID: ${o.id_orden_servicio})`));

        console.log('\n✅ Todas las órdenes tienen estado EN_PROCESO (id=5)');
        console.log('   → Aparecerán en sincronización móvil');
        console.log('   → Notificaciones creadas para técnico admin');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        log.error(`Error: ${error.message}`);
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
