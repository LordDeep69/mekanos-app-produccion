/**
 * Verificar diferencias entre órdenes que funcionan y las nuevas que fallan
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificar() {
    console.log('\n=== ANÁLISIS FORENSE: ÓRDENES 157-158 vs ANTIGUAS ===\n');

    // 1. Verificar orden nueva (157)
    console.log('📋 ORDEN 157 (NUEVA - FALLA):');
    const orden157 = await prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: 157 },
        include: {
            tipo_servicio: true,
            estado: true,
            equipo: { include: { tipo_equipo: true } },
            cliente: { include: { persona: true } },
            tecnico: { include: { persona: true } }
        }
    });

    if (orden157) {
        console.log(`   Número: ${orden157.numero_orden}`);
        console.log(`   Tipo Servicio: ${orden157.tipo_servicio?.codigo_tipo || 'NULL'} (ID: ${orden157.id_tipo_servicio})`);
        console.log(`   Estado: ${orden157.estado?.codigo_estado || 'NULL'} (ID: ${orden157.id_estado_actual})`);
        console.log(`   Técnico: ID ${orden157.id_tecnico_asignado}`);
        console.log(`   Equipo: ID ${orden157.id_equipo}`);
        console.log(`   Cliente: ID ${orden157.id_cliente}`);
        console.log(`   Fecha Programada: ${orden157.fecha_programada}`);
    } else {
        console.log('   ❌ NO ENCONTRADA');
    }

    // 2. Verificar historial de estados de orden 157
    console.log('\n📜 HISTORIAL DE ESTADOS ORDEN 157:');
    const historial157 = await prisma.historial_estados_orden.findMany({
        where: { id_orden_servicio: 157 },
        include: { estado: true }
    });
    console.log(`   Registros: ${historial157.length}`);
    for (const h of historial157) {
        console.log(`   - ${h.estado?.codigo_estado} (${h.fecha_cambio})`);
    }

    // 3. Buscar una orden antigua que funcione
    console.log('\n📋 ORDEN ANTIGUA (FUNCIONA) - Buscando una completada:');
    const ordenAntigua = await prisma.ordenes_servicio.findFirst({
        where: {
            id_orden_servicio: { lt: 150 },
            estado: { codigo_estado: 'COMPLETADA' }
        },
        include: {
            tipo_servicio: true,
            estado: true,
            equipo: { include: { tipo_equipo: true } },
            cliente: { include: { persona: true } },
            tecnico: { include: { persona: true } }
        }
    });

    if (ordenAntigua) {
        console.log(`   ID: ${ordenAntigua.id_orden_servicio}`);
        console.log(`   Número: ${ordenAntigua.numero_orden}`);
        console.log(`   Tipo Servicio: ${ordenAntigua.tipo_servicio?.codigo_tipo || 'NULL'} (ID: ${ordenAntigua.id_tipo_servicio})`);
        console.log(`   Estado: ${ordenAntigua.estado?.codigo_estado || 'NULL'}`);
        console.log(`   Técnico: ID ${ordenAntigua.id_tecnico_asignado}`);
        console.log(`   Equipo: ID ${ordenAntigua.id_equipo}`);

        // Historial de la orden antigua
        console.log('\n📜 HISTORIAL DE ESTADOS ORDEN ANTIGUA:');
        const historialAntigua = await prisma.historial_estados_orden.findMany({
            where: { id_orden_servicio: ordenAntigua.id_orden_servicio },
            include: { estado: true }
        });
        console.log(`   Registros: ${historialAntigua.length}`);
        for (const h of historialAntigua) {
            console.log(`   - ${h.estado?.codigo_estado} (${h.fecha_cambio})`);
        }
    }

    // 4. Verificar si el equipo ID 36 existe y tiene datos completos
    console.log('\n🔧 EQUIPO ID 36 (usado en órdenes nuevas):');
    const equipo36 = await prisma.equipos.findUnique({
        where: { id_equipo: 36 },
        include: { tipo_equipo: true }
    });
    if (equipo36) {
        console.log(`   Código: ${equipo36.codigo_equipo}`);
        console.log(`   Nombre: ${equipo36.nombre_equipo}`);
        console.log(`   Tipo Equipo: ${equipo36.tipo_equipo?.nombre_tipo || 'NULL'}`);
        console.log(`   Marca: ${equipo36.marca}`);
        console.log(`   Serie: ${equipo36.numero_serie_equipo}`);
    } else {
        console.log('   ❌ NO ENCONTRADO');
    }

    await prisma.$disconnect();
}

verificar().catch(console.error);
