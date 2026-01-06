import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const tecnicoId = 12;

    // Fecha límite: 1 día atrás
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 1);

    console.log('='.repeat(60));
    console.log('DIAGNÓSTICO DE FILTRO - Técnico', tecnicoId);
    console.log('Fecha límite (1 día atrás):', fechaLimite.toISOString());
    console.log('='.repeat(60));

    // 1. Todas las órdenes del técnico
    const todas = await prisma.ordenes_servicio.findMany({
        where: { id_tecnico_asignado: tecnicoId },
        select: {
            numero_orden: true,
            id_estado_actual: true,
            fecha_fin_real: true,
            estados_orden: { select: { es_estado_final: true, codigo_estado: true } }
        }
    });

    console.log('\n📋 TODAS las órdenes del técnico:', todas.length);

    // 2. Clasificar
    const activas = todas.filter(o => !o.estados_orden.es_estado_final);
    const finalesRecientes = todas.filter(o =>
        o.estados_orden.es_estado_final &&
        o.fecha_fin_real &&
        o.fecha_fin_real >= fechaLimite
    );
    const finalesAntiguas = todas.filter(o =>
        o.estados_orden.es_estado_final &&
        o.fecha_fin_real &&
        o.fecha_fin_real < fechaLimite
    );
    const finalesSinFecha = todas.filter(o =>
        o.estados_orden.es_estado_final &&
        !o.fecha_fin_real
    );

    console.log('\n✅ Órdenes ACTIVAS (es_estado_final=false):', activas.length);
    activas.forEach(o => console.log(`   - ${o.numero_orden} (${o.estados_orden.codigo_estado})`));

    console.log('\n✅ Órdenes FINALES recientes (fecha_fin >= límite):', finalesRecientes.length);
    finalesRecientes.forEach(o => console.log(`   - ${o.numero_orden} (${o.estados_orden.codigo_estado}) - ${o.fecha_fin_real?.toISOString().split('T')[0]}`));

    console.log('\n❌ Órdenes FINALES antiguas (fecha_fin < límite):', finalesAntiguas.length);
    finalesAntiguas.forEach(o => console.log(`   - ${o.numero_orden} (${o.estados_orden.codigo_estado}) - ${o.fecha_fin_real?.toISOString().split('T')[0]}`));

    console.log('\n⚠️ Órdenes FINALES sin fecha_fin_real:', finalesSinFecha.length);
    finalesSinFecha.forEach(o => console.log(`   - ${o.numero_orden} (${o.estados_orden.codigo_estado})`));

    console.log('\n' + '='.repeat(60));
    console.log('RESULTADO ESPERADO DEL FILTRO:', activas.length + finalesRecientes.length);
    console.log('='.repeat(60));

    // 3. Probar la NUEVA POLÍTICA: CERO completadas (solo activas)
    const filtradas = await prisma.ordenes_servicio.findMany({
        where: {
            id_tecnico_asignado: tecnicoId,
            estados_orden: { es_estado_final: false },
        },
        select: { numero_orden: true }
    });

    console.log('\n🚨 NUEVA POLÍTICA - Solo ACTIVAS (cero completadas):');
    console.log(`   Resultado: ${filtradas.length} órdenes`);
    filtradas.forEach(o => console.log(`   - ${o.numero_orden}`));

    await prisma.$disconnect();
}

main().catch(console.error);
