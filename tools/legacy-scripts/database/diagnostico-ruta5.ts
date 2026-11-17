/**
 * DIAGNÓSTICO RUTA 5: ANÁLISIS DE DATOS PARA ESCENARIO REAL
 * Ejecutar: npx ts-node diagnostico-ruta5.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('  🔬 DIAGNÓSTICO RUTA 5 - ALTA FIDELIDAD');
    console.log('='.repeat(70));

    // 1. TIPOS DE SERVICIO Y ACTIVIDADES
    console.log('\n📋 TIPOS DE SERVICIO Y CANTIDAD DE ACTIVIDADES:');
    console.log('-'.repeat(60));

    const tiposServicio = await prisma.tipos_servicio.findMany({
        where: { activo: true },
        orderBy: { id_tipo_servicio: 'asc' }
    });

    for (const tipo of tiposServicio) {
        const actividadesCount = await prisma.catalogo_actividades.count({
            where: {
                id_tipo_servicio: tipo.id_tipo_servicio,
                activo: true
            }
        });
        console.log(`ID: ${tipo.id_tipo_servicio.toString().padStart(2)} | ${tipo.codigo_tipo.padEnd(12)} | ${tipo.nombre_tipo.substring(0, 35).padEnd(35)} | Actividades: ${actividadesCount}`);
    }

    // 2. SISTEMAS EXISTENTES
    console.log('\n📦 SISTEMAS (para agrupar actividades):');
    console.log('-'.repeat(60));

    const sistemas = await prisma.catalogo_sistemas.findMany({
        where: { activo: true },
        orderBy: { orden_visualizacion: 'asc' }
    });

    for (const sistema of sistemas) {
        const actCount = await prisma.catalogo_actividades.count({
            where: { id_sistema: sistema.id_sistema, activo: true }
        });
        console.log(`ID: ${sistema.id_sistema.toString().padStart(2)} | ${sistema.codigo_sistema.padEnd(15)} | ${sistema.nombre_sistema.substring(0, 30).padEnd(30)} | Actividades: ${actCount}`);
    }

    // 3. ACTIVIDADES DEL TIPO CON MÁS REGISTROS
    console.log('\n🎯 TIPO DE SERVICIO CON MÁS ACTIVIDADES:');
    console.log('-'.repeat(60));

    const tipoConMasActividades = await prisma.tipos_servicio.findFirst({
        where: { activo: true },
        include: {
            catalogo_actividades: {
                where: { activo: true }
            }
        },
        orderBy: {
            catalogo_actividades: { _count: 'desc' }
        }
    });

    if (tipoConMasActividades) {
        console.log(`✅ ID: ${tipoConMasActividades.id_tipo_servicio} | ${tipoConMasActividades.codigo_tipo} | ${tipoConMasActividades.nombre_tipo}`);
        console.log(`   Total Actividades: ${tipoConMasActividades.catalogo_actividades.length}`);

        // Agrupar por sistema
        const porSistema = new Map<number | null, number>();
        for (const act of tipoConMasActividades.catalogo_actividades) {
            const key = act.id_sistema;
            porSistema.set(key, (porSistema.get(key) || 0) + 1);
        }

        console.log('\n   Distribución por Sistema:');
        for (const [sistemaId, count] of porSistema) {
            if (sistemaId) {
                const sistema = sistemas.find(s => s.id_sistema === sistemaId);
                console.log(`   - ${sistema?.nombre_sistema || 'Desconocido'}: ${count} actividades`);
            } else {
                console.log(`   - Sin sistema asignado: ${count} actividades`);
            }
        }
    }

    // 4. CLIENTES Y EQUIPOS DISPONIBLES
    console.log('\n👤 CLIENTES DISPONIBLES:');
    console.log('-'.repeat(60));

    const clientes = await prisma.clientes.findMany({
        take: 5,
        include: { persona: true }
    });

    for (const cliente of clientes) {
        console.log(`ID: ${cliente.id_cliente} | ${cliente.persona?.nombre_completo || 'Sin nombre'} | ${cliente.persona?.numero_identificacion || 'Sin NIT'}`);
    }

    // 5. EQUIPOS DISPONIBLES
    console.log('\n⚙️ EQUIPOS DISPONIBLES:');
    console.log('-'.repeat(60));

    const equipos = await prisma.equipos.findMany({
        where: { activo: true },
        take: 5,
        include: {
            cliente: { include: { persona: true } },
            tipo_equipo: true
        }
    });

    for (const equipo of equipos) {
        console.log(`ID: ${equipo.id_equipo} | ${equipo.codigo_equipo} | ${equipo.nombre_equipo?.substring(0, 30) || 'Sin nombre'}`);
        console.log(`   Cliente: ${equipo.cliente?.persona?.nombre_completo || 'N/A'} | Tipo: ${equipo.tipo_equipo?.nombre_tipo || 'N/A'}`);
    }

    // 6. ESTADOS DE ORDEN
    console.log('\n📊 ESTADOS DE ORDEN:');
    console.log('-'.repeat(60));

    const estados = await prisma.estados_orden.findMany({
        where: { activo: true }
    });

    for (const estado of estados) {
        console.log(`ID: ${estado.id_estado} | ${estado.codigo_estado} | ${estado.nombre_estado}`);
    }

    // 7. USUARIOS (que pueden ser técnicos) - Raw query para evitar tipos complejos
    console.log('\n👷 USUARIOS DISPONIBLES:');
    console.log('-'.repeat(60));

    const usuariosRaw = await prisma.$queryRaw<any[]>`
        SELECT u.id_usuario, u.id_persona, u.username, p.nombre_completo 
        FROM usuarios u 
        JOIN personas p ON u.id_persona = p.id_persona 
        LIMIT 5
    `;

    for (const usuario of usuariosRaw) {
        console.log(`ID Usuario: ${usuario.id_usuario} | ID Persona: ${usuario.id_persona} | ${usuario.nombre_completo || 'N/A'} | Username: ${usuario.username}`);
    }

    // 8. RECOMENDACIÓN PARA ORDEN REAL
    console.log('\n' + '='.repeat(70));
    console.log('  📌 RECOMENDACIÓN PARA ORDEN OS-REAL-TEST-001');
    console.log('='.repeat(70));

    if (tipoConMasActividades && clientes.length > 0 && equipos.length > 0 && usuariosRaw.length > 0) {
        const estadoAsignada = estados.find(e => e.codigo_estado === 'ASIGNADA');

        console.log(`
  Usar los siguientes IDs:
  - id_tipo_servicio: ${tipoConMasActividades.id_tipo_servicio} (${tipoConMasActividades.codigo_tipo} con ${tipoConMasActividades.catalogo_actividades.length} actividades)
  - id_cliente: ${clientes[0].id_cliente} (${clientes[0].persona?.nombre_completo})
  - id_equipo: ${equipos[0].id_equipo} (${equipos[0].codigo_equipo})
  - id_estado: ${estadoAsignada?.id_estado || 'Buscar ASIGNADA'} (${estadoAsignada?.codigo_estado || 'ASIGNADA'})
  - id_tecnico_asignado (id_persona): ${usuariosRaw[0].id_persona} (${usuariosRaw[0].nombre_completo})
    `);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
