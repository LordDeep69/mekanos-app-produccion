/**
 * VERIFICACIÓN FORENSE - ORDEN 138
 * Confirma que todos los datos se guardaron correctamente
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarOrden138() {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('🔬 VERIFICACIÓN FORENSE - ORDEN 138 (OS-REAL-TEST-001)');
    console.log('═══════════════════════════════════════════════════════════════════════');

    try {
        // 1. Orden
        const orden = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: 138 },
            include: { estado: true }
        });
        console.log('\n📋 ORDEN:');
        console.log(`   Número: ${orden?.numero_orden}`);
        console.log(`   Estado: ${orden?.estado?.nombre_estado || orden?.estado?.codigo_estado}`);
        console.log(`   Fecha fin: ${orden?.fecha_fin_real || 'NULL'}`);

        // 2. Evidencias
        const evidencias = await prisma.evidencias_fotograficas.findMany({
            where: { id_orden_servicio: 138 }
        });
        console.log('\n📸 EVIDENCIAS:');
        console.log(`   Total: ${evidencias.length}`);
        evidencias.slice(0, 3).forEach((ev, i) => {
            console.log(`   [${i}] tipo=${ev.tipo_evidencia}, url=${ev.url_imagen?.substring(0, 50)}...`);
        });
        if (evidencias.length > 3) console.log(`   ... y ${evidencias.length - 3} más`);

        // 3. Firmas
        const firmas = await prisma.firmas_digitales.findMany({
            orderBy: { fecha_registro: 'desc' },
            take: 5
        });
        console.log('\n✍️ FIRMAS RECIENTES:');
        console.log(`   Total recientes: ${firmas.length}`);
        firmas.forEach((f, i) => {
            console.log(`   [${i}] tipo=${f.tipo_firma}, persona=${f.id_persona}, fecha=${f.fecha_registro}`);
        });

        // 4. Documentos/Informes
        const documentos = await prisma.informes.findMany({
            where: { id_orden_servicio: 138 }
        });
        console.log('\n📄 DOCUMENTOS/INFORMES:');
        console.log(`   Total: ${documentos.length}`);
        documentos.forEach((d, i) => {
            console.log(`   [${i}] tipo=${d.tipo_informe}, url=${d.url_documento?.substring(0, 60)}...`);
        });

        // 5. Historial de estados
        const historial = await prisma.historial_estados_orden.findMany({
            where: { id_orden_servicio: 138 },
            orderBy: { fecha_cambio: 'desc' },
            include: {
                estado_nuevo: true,
                estado_anterior: true
            },
            take: 3
        });
        console.log('\n📜 HISTORIAL DE ESTADOS:');
        historial.forEach((h, i) => {
            console.log(`   [${i}] ${h.estado_anterior?.codigo_estado || 'INICIO'} → ${h.estado_nuevo?.codigo_estado} (${h.fecha_cambio})`);
        });

        console.log('\n═══════════════════════════════════════════════════════════════════════');
        console.log('✅ VERIFICACIÓN COMPLETADA');
        console.log('═══════════════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

verificarOrden138();
