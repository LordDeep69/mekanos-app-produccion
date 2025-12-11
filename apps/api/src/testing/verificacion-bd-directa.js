/**
 * ============================================================================
 * VERIFICACIÓN DIRECTA DE BASE DE DATOS - ZERO TRUST
 * ============================================================================
 * 
 * Consulta directamente las tablas de Supabase para verificar que los datos
 * se guardaron correctamente después de la finalización.
 * 
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const https = require('https');

const ORDEN_ID = 148; // ID de la última orden creada

const prisma = new PrismaClient({
    log: ['error'],
});

function checkUrlAccessible(url) {
    return new Promise((resolve) => {
        if (!url) {
            resolve({ accessible: false, error: 'URL vacía' });
            return;
        }

        const req = https.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
            resolve({
                accessible: res.statusCode >= 200 && res.statusCode < 400,
                statusCode: res.statusCode,
                contentType: res.headers['content-type'],
                contentLength: res.headers['content-length']
            });
        });

        req.on('error', (err) => resolve({ accessible: false, error: err.message }));
        req.on('timeout', () => { req.destroy(); resolve({ accessible: false, error: 'Timeout' }); });
        req.end();
    });
}

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('🔬 VERIFICACIÓN DIRECTA BD - ZERO TRUST');
    console.log('═'.repeat(70));
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-CO')}`);
    console.log(`🎯 Orden ID: ${ORDEN_ID}`);
    console.log('═'.repeat(70));

    try {
        // ========================================
        // 1. VERIFICAR ORDEN
        // ========================================
        console.log('\n' + '─'.repeat(70));
        console.log('📋 1. ORDEN DE SERVICIO');
        console.log('─'.repeat(70));

        const orden = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: ORDEN_ID },
            include: {
                estado: true,
                cliente: { include: { persona: true } },
                equipo: true,
                tecnico: { include: { persona: true } },
            },
        });

        if (!orden) {
            console.log('   ❌ ORDEN NO ENCONTRADA');
            return;
        }

        console.log(`   ✅ Número: ${orden.numero_orden}`);
        console.log(`   📌 Estado ID: ${orden.id_estado_actual}`);
        console.log(`   📌 Estado Nombre: ${orden.estado?.nombre_estado || 'N/A'}`);
        console.log(`   📌 Estado Código: ${orden.estado?.codigo_estado || 'N/A'}`);
        console.log(`   📌 Fecha Fin Real: ${orden.fecha_fin_real || 'NO REGISTRADA'}`);
        console.log(`   📌 Observaciones Cierre: ${orden.observaciones_cierre ? 'SÍ' : 'NO'}`);
        console.log(`   📌 ID Firma Cliente: ${orden.id_firma_cliente || 'NO VINCULADA'}`);

        const esCompletada = orden.estado?.codigo_estado === 'COMPLETADA';
        console.log(`\n   ${esCompletada ? '✅' : '❌'} ESTADO COMPLETADA: ${esCompletada}`);

        // ========================================
        // 2. VERIFICAR EVIDENCIAS FOTOGRÁFICAS
        // ========================================
        console.log('\n' + '─'.repeat(70));
        console.log('📋 2. EVIDENCIAS FOTOGRÁFICAS');
        console.log('─'.repeat(70));

        const evidencias = await prisma.evidencias_fotograficas.findMany({
            where: { id_orden_servicio: ORDEN_ID },
            orderBy: { fecha_captura: 'asc' },
        });

        console.log(`   📷 Total evidencias: ${evidencias.length}`);

        if (evidencias.length === 0) {
            console.log('   ❌ NO HAY EVIDENCIAS REGISTRADAS PARA ESTA ORDEN');
        } else {
            for (const ev of evidencias) {
                console.log(`\n   📷 Evidencia ID: ${ev.id_evidencia}`);
                console.log(`      Tipo: ${ev.tipo_evidencia}`);
                console.log(`      Descripción: ${ev.descripcion || 'N/A'}`);
                console.log(`      URL (ruta_archivo): ${ev.ruta_archivo ? ev.ruta_archivo.substring(0, 70) + '...' : '❌ SIN URL'}`);
                console.log(`      Hash SHA256: ${ev.hash_sha256 ? ev.hash_sha256.substring(0, 20) + '...' : '❌ SIN HASH'}`);
                console.log(`      Tamaño: ${ev.tamaño_bytes ? (Number(ev.tamaño_bytes) / 1024).toFixed(2) + ' KB' : 'N/A'}`);
                console.log(`      Fecha captura: ${ev.fecha_captura}`);

                if (ev.ruta_archivo) {
                    const check = await checkUrlAccessible(ev.ruta_archivo);
                    console.log(`      Accesible: ${check.accessible ? '✅ SÍ' : '❌ NO'} ${check.statusCode ? `(HTTP ${check.statusCode})` : check.error || ''}`);
                }
            }
        }

        // ========================================
        // 3. VERIFICAR FIRMAS DIGITALES
        // ========================================
        console.log('\n' + '─'.repeat(70));
        console.log('📋 3. FIRMAS DIGITALES');
        console.log('─'.repeat(70));

        // Obtener las firmas más recientes (las del último test)
        const firmasRecientes = await prisma.firmas_digitales.findMany({
            where: {
                fecha_captura: {
                    gte: new Date(Date.now() - 3600000) // última hora
                }
            },
            orderBy: { fecha_captura: 'desc' },
        });

        console.log(`   ✍️ Firmas en última hora: ${firmasRecientes.length}`);

        for (const f of firmasRecientes) {
            console.log(`\n   ✍️ Firma ID: ${f.id_firma_digital}`);
            console.log(`      Tipo: ${f.tipo_firma}`);
            console.log(`      Persona ID: ${f.id_persona}`);
            console.log(`      Hash: ${f.hash_firma ? f.hash_firma.substring(0, 20) + '...' : '❌ SIN HASH'}`);
            console.log(`      Formato: ${f.formato_firma}`);
            console.log(`      Base64 presente: ${f.firma_base64 ? '✅ SÍ (' + f.firma_base64.length + ' chars)' : '❌ NO'}`);
            console.log(`      Fecha captura: ${f.fecha_captura}`);
        }

        // ========================================
        // 4. VERIFICAR DOCUMENTO PDF
        // ========================================
        console.log('\n' + '─'.repeat(70));
        console.log('📋 4. DOCUMENTOS GENERADOS (PDF)');
        console.log('─'.repeat(70));

        const documentos = await prisma.documentos_generados.findMany({
            where: { id_referencia: ORDEN_ID },
            orderBy: { fecha_generacion: 'desc' },
        });

        console.log(`   📄 Total documentos: ${documentos.length}`);

        if (documentos.length === 0) {
            console.log('   ❌ NO HAY DOCUMENTOS REGISTRADOS PARA ESTA ORDEN');
        } else {
            for (const doc of documentos) {
                console.log(`\n   📄 Documento ID: ${doc.id_documento}`);
                console.log(`      Tipo: ${doc.tipo_documento}`);
                console.log(`      Número: ${doc.numero_documento}`);
                console.log(`      URL R2 (ruta_archivo): ${doc.ruta_archivo ? doc.ruta_archivo.substring(0, 70) + '...' : '❌ SIN URL'}`);
                console.log(`      Hash SHA256: ${doc.hash_sha256 ? doc.hash_sha256.substring(0, 20) + '...' : '❌ SIN HASH'}`);
                console.log(`      Tamaño: ${doc.tama_o_bytes ? (Number(doc.tama_o_bytes) / 1024).toFixed(2) + ' KB' : 'N/A'}`);
                console.log(`      MIME: ${doc.mime_type}`);
                console.log(`      Fecha generación: ${doc.fecha_generacion}`);

                if (doc.ruta_archivo) {
                    const check = await checkUrlAccessible(doc.ruta_archivo);
                    console.log(`      Accesible: ${check.accessible ? '✅ SÍ' : '❌ NO'} ${check.statusCode ? `(HTTP ${check.statusCode})` : check.error || ''}`);
                }
            }
        }

        // ========================================
        // 5. VERIFICAR HISTORIAL DE ESTADOS
        // ========================================
        console.log('\n' + '─'.repeat(70));
        console.log('📋 5. HISTORIAL DE ESTADOS');
        console.log('─'.repeat(70));

        const historial = await prisma.historial_estados_orden.findMany({
            where: { id_orden_servicio: ORDEN_ID },
            include: {
                estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden: true
            },
            orderBy: { fecha_cambio: 'asc' },
        });

        console.log(`   📜 Total transiciones: ${historial.length}`);

        for (const h of historial) {
            const estadoNuevo = h.estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden;
            console.log(`      ${h.fecha_cambio.toISOString()} → ${estadoNuevo?.nombre_estado || h.id_estado_nuevo}`);
        }

        // ========================================
        // 6. RESUMEN FINAL
        // ========================================
        console.log('\n' + '═'.repeat(70));
        console.log('📊 RESUMEN VERIFICACIÓN FORENSE');
        console.log('═'.repeat(70));

        const checks = [
            { nombre: 'Orden existe', ok: !!orden },
            { nombre: 'Estado = COMPLETADA', ok: esCompletada },
            { nombre: 'Fecha fin registrada', ok: !!orden?.fecha_fin_real },
            { nombre: 'Evidencias registradas (≥3)', ok: evidencias.length >= 3 },
            { nombre: 'Evidencias con URL', ok: evidencias.every(e => e.ruta_archivo) },
            { nombre: 'Firmas registradas (≥2)', ok: firmasRecientes.length >= 2 },
            { nombre: 'Documento PDF registrado', ok: documentos.length >= 1 },
            { nombre: 'Documento con URL R2', ok: documentos[0]?.ruta_archivo ? true : false },
            { nombre: 'Historial contiene COMPLETADA', ok: historial.some(h => h.estados_orden_historial_estados_orden_id_estado_nuevoToestados_orden?.codigo_estado === 'COMPLETADA') },
        ];

        let passed = 0;
        let failed = 0;

        for (const c of checks) {
            console.log(`   ${c.ok ? '✅' : '❌'} ${c.nombre}`);
            if (c.ok) passed++; else failed++;
        }

        console.log('\n' + '─'.repeat(70));
        console.log(`   RESULTADO: ${passed}/${checks.length} verificaciones pasadas`);

        if (failed > 0) {
            console.log(`   ⚠️ ${failed} VERIFICACIONES FALLIDAS`);
            process.exit(1);
        } else {
            console.log('   🎉 TODAS LAS VERIFICACIONES PASADAS - DATOS ÍNTEGROS');
            process.exit(0);
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
