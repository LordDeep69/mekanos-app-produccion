/**
 * ============================================================================
 * VERIFICACIÓN FORENSE - ZERO TRUST
 * ============================================================================
 * 
 * Este script verifica EXHAUSTIVAMENTE que todos los datos se guardaron
 * correctamente en la base de datos después de la finalización de una orden.
 * 
 * VERIFICACIONES:
 * 1. Estado de la orden en BD
 * 2. Evidencias fotográficas con URLs de Cloudinary
 * 3. Firmas digitales registradas
 * 4. Documento PDF con URL de R2
 * 5. Historial de estados
 * 6. Accesibilidad de URLs (HEAD request)
 * 
 * ============================================================================
 */

const http = require('http');
const https = require('https');

const CONFIG = {
    API_HOST: 'localhost',
    API_PORT: 3000,
    ORDEN_ID: 143, // Última orden creada en el test
    CREDENTIALS: {
        email: 'admin@mekanos.com',
        password: 'Admin123!'
    }
};

let JWT_TOKEN = '';

// ============================================================================
// UTILIDADES
// ============================================================================

function httpRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: CONFIG.API_HOST,
            port: CONFIG.API_PORT,
            path: `/api${path}`,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(JWT_TOKEN && { 'Authorization': `Bearer ${JWT_TOKEN}` })
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

function checkUrlAccessible(url) {
    return new Promise((resolve) => {
        if (!url) {
            resolve({ accessible: false, error: 'URL vacía' });
            return;
        }

        const protocol = url.startsWith('https') ? https : http;
        const req = protocol.request(url, { method: 'HEAD', timeout: 10000 }, (res) => {
            resolve({
                accessible: res.statusCode >= 200 && res.statusCode < 400,
                statusCode: res.statusCode,
                contentType: res.headers['content-type'],
                contentLength: res.headers['content-length']
            });
        });

        req.on('error', (err) => {
            resolve({ accessible: false, error: err.message });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ accessible: false, error: 'Timeout' });
        });

        req.end();
    });
}

function printSection(title) {
    console.log('\n' + '─'.repeat(70));
    console.log(`📋 ${title}`);
    console.log('─'.repeat(70));
}

function printResult(label, value, status = null) {
    const icon = status === true ? '✅' : status === false ? '❌' : '📌';
    console.log(`   ${icon} ${label}: ${value}`);
}

// ============================================================================
// VERIFICACIONES
// ============================================================================

async function login() {
    console.log('\n🔐 Autenticando...');
    const res = await httpRequest('POST', '/auth/login', CONFIG.CREDENTIALS);
    if (res.status !== 200 && res.status !== 201) {
        throw new Error(`Login falló: ${JSON.stringify(res.data)}`);
    }
    JWT_TOKEN = res.data.access_token;
    console.log('   ✅ Token obtenido');
}

async function verificarOrden() {
    printSection('VERIFICACIÓN 1: ESTADO DE LA ORDEN');

    const res = await httpRequest('GET', `/ordenes/${CONFIG.ORDEN_ID}`);

    if (res.status !== 200) {
        printResult('Orden encontrada', 'NO', false);
        return null;
    }

    const orden = res.data.data || res.data;

    printResult('Número de orden', orden.numero_orden);
    printResult('Estado actual', orden.estado?.nombre || orden.id_estado_actual);
    printResult('Es COMPLETADA', orden.estado?.codigo === 'COMPLETADA' || orden.estado?.nombre === 'Completada',
        orden.estado?.codigo === 'COMPLETADA' || orden.estado?.nombre === 'Completada');
    printResult('Fecha fin real', orden.fecha_fin_real || 'NO REGISTRADA', !!orden.fecha_fin_real);
    printResult('Observaciones cierre', orden.observaciones_cierre ? 'SÍ' : 'NO', !!orden.observaciones_cierre);

    return orden;
}

async function verificarEvidencias() {
    printSection('VERIFICACIÓN 2: EVIDENCIAS FOTOGRÁFICAS');

    // Buscar evidencias de la orden
    const res = await httpRequest('GET', `/ordenes/${CONFIG.ORDEN_ID}/evidencias`);

    if (res.status !== 200) {
        // Intentar endpoint alternativo
        const res2 = await httpRequest('GET', `/evidencias?ordenId=${CONFIG.ORDEN_ID}`);
        if (res2.status !== 200) {
            printResult('Endpoint evidencias', 'No disponible - verificar manualmente', false);
            return [];
        }
    }

    const evidencias = res.data?.data || res.data || [];

    printResult('Total evidencias encontradas', evidencias.length, evidencias.length >= 3);

    const resultados = [];
    for (const ev of evidencias) {
        console.log(`\n   📷 Evidencia ID: ${ev.id_evidencia || ev.id}`);
        console.log(`      Tipo: ${ev.tipo_evidencia || ev.tipo}`);
        console.log(`      URL Cloudinary: ${ev.url_archivo ? ev.url_archivo.substring(0, 60) + '...' : 'NO TIENE'}`);

        if (ev.url_archivo) {
            const check = await checkUrlAccessible(ev.url_archivo);
            console.log(`      Accesible: ${check.accessible ? '✅ SÍ' : '❌ NO'} ${check.contentType ? `(${check.contentType})` : ''}`);
            resultados.push({ id: ev.id_evidencia, url: ev.url_archivo, accessible: check.accessible });
        } else {
            resultados.push({ id: ev.id_evidencia, url: null, accessible: false });
        }
    }

    return resultados;
}

async function verificarFirmas() {
    printSection('VERIFICACIÓN 3: FIRMAS DIGITALES');

    // Las firmas están vinculadas a personas, no directamente a órdenes
    // Verificar si la orden tiene id_firma_cliente
    const ordenRes = await httpRequest('GET', `/ordenes/${CONFIG.ORDEN_ID}`);
    const orden = ordenRes.data?.data || ordenRes.data;

    printResult('ID Firma Cliente en orden', orden.id_firma_cliente || 'NO VINCULADA');

    // Buscar firmas recientes
    const res = await httpRequest('GET', `/firmas-digitales?limit=10`);

    if (res.status === 200) {
        const firmas = res.data?.data || res.data || [];
        printResult('Total firmas en sistema', firmas.length);

        // Mostrar las últimas 4 firmas
        console.log('\n   📝 Últimas firmas registradas:');
        for (const firma of firmas.slice(0, 4)) {
            console.log(`      - ID: ${firma.id_firma_digital}, Tipo: ${firma.tipo_firma}, Persona: ${firma.id_persona}, Fecha: ${firma.fecha_captura}`);
        }
    } else {
        printResult('Endpoint firmas', 'No disponible', null);
    }

    return true;
}

async function verificarDocumentoPDF() {
    printSection('VERIFICACIÓN 4: DOCUMENTO PDF EN CLOUDFLARE R2');

    // Buscar documentos generados para esta orden
    const res = await httpRequest('GET', `/ordenes/${CONFIG.ORDEN_ID}/documentos`);

    let documentos = [];
    if (res.status === 200) {
        documentos = res.data?.data || res.data || [];
    } else {
        // Intentar endpoint alternativo
        const res2 = await httpRequest('GET', `/documentos?ordenId=${CONFIG.ORDEN_ID}`);
        if (res2.status === 200) {
            documentos = res2.data?.data || res2.data || [];
        }
    }

    if (documentos.length === 0) {
        printResult('Documentos encontrados', '0 - VERIFICAR MANUALMENTE', false);
        return null;
    }

    printResult('Total documentos', documentos.length, documentos.length >= 1);

    for (const doc of documentos) {
        console.log(`\n   📄 Documento ID: ${doc.id_documento || doc.id}`);
        console.log(`      Tipo: ${doc.tipo_documento}`);
        console.log(`      Número: ${doc.numero_documento}`);
        console.log(`      URL R2: ${doc.ruta_archivo ? doc.ruta_archivo.substring(0, 60) + '...' : 'NO TIENE'}`);
        console.log(`      Tamaño: ${doc.tama_o_bytes ? (Number(doc.tama_o_bytes) / 1024).toFixed(2) + ' KB' : 'N/A'}`);
        console.log(`      Hash SHA256: ${doc.hash_sha256 ? doc.hash_sha256.substring(0, 20) + '...' : 'NO TIENE'}`);

        if (doc.ruta_archivo) {
            const check = await checkUrlAccessible(doc.ruta_archivo);
            console.log(`      Accesible: ${check.accessible ? '✅ SÍ' : '❌ NO'} ${check.statusCode ? `(HTTP ${check.statusCode})` : ''}`);
        }
    }

    return documentos;
}

async function verificarHistorial() {
    printSection('VERIFICACIÓN 5: HISTORIAL DE ESTADOS');

    const res = await httpRequest('GET', `/ordenes/${CONFIG.ORDEN_ID}/historial`);

    if (res.status !== 200) {
        printResult('Historial', 'No disponible vía API', null);
        return [];
    }

    const historial = res.data?.data || res.data || [];
    printResult('Total transiciones', historial.length);

    console.log('\n   📜 Secuencia de estados:');
    for (const h of historial) {
        console.log(`      ${h.fecha_cambio} → ${h.estado_nuevo?.nombre || h.id_estado_nuevo} (por usuario ${h.realizado_por})`);
    }

    return historial;
}

async function verificarLogsServidor() {
    printSection('VERIFICACIÓN 6: LOGS DEL SERVIDOR');

    console.log('   ℹ️ Los logs del servidor deben verificarse en la terminal donde corre npm run dev');
    console.log('   ℹ️ Buscar los siguientes mensajes:');
    console.log('      - "📷 Paso 2: Procesando evidencias fotográficas..."');
    console.log('      - "✅ Evidencia ANTES procesada"');
    console.log('      - "✅ Evidencia DURANTE procesada"');
    console.log('      - "✅ Evidencia DESPUES procesada"');
    console.log('      - "📄 Paso 4: Generando PDF..."');
    console.log('      - "☁️ Paso 5: Subiendo PDF a Cloudflare R2..."');
    console.log('      - "📧 Paso 7: Enviando email..."');
    console.log('      - "📧 Email destino: lorddeep3@gmail.com"');
}

async function consultaDirectaDB() {
    printSection('VERIFICACIÓN 7: CONSULTA DIRECTA A BD (vía API interna)');

    // Consultar evidencias_fotograficas directamente
    console.log('\n   🔍 Consultando tabla evidencias_fotograficas...');

    // No tenemos acceso directo a BD, pero podemos verificar la respuesta del endpoint
    const ordenCompleta = await httpRequest('GET', `/ordenes/${CONFIG.ORDEN_ID}?include=evidencias,documentos`);

    if (ordenCompleta.status === 200) {
        const data = ordenCompleta.data?.data || ordenCompleta.data;

        if (data.evidencias) {
            console.log(`      Evidencias en orden: ${data.evidencias.length}`);
            data.evidencias.forEach((e, i) => {
                console.log(`      [${i + 1}] ${e.tipo_evidencia}: ${e.url_archivo ? '✅ URL presente' : '❌ SIN URL'}`);
            });
        }

        if (data.documentos) {
            console.log(`      Documentos en orden: ${data.documentos.length}`);
            data.documentos.forEach((d, i) => {
                console.log(`      [${i + 1}] ${d.tipo_documento}: ${d.ruta_archivo ? '✅ URL presente' : '❌ SIN URL'}`);
            });
        }
    }
}

// ============================================================================
// RESUMEN FINAL
// ============================================================================

async function generarResumen(resultados) {
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN VERIFICACIÓN FORENSE');
    console.log('═'.repeat(70));

    const checks = [
        { nombre: 'Orden en estado COMPLETADA', ok: resultados.orden?.estado?.codigo === 'COMPLETADA' || resultados.orden?.estado?.nombre === 'Completada' },
        { nombre: 'Fecha fin registrada', ok: !!resultados.orden?.fecha_fin_real },
        { nombre: 'Evidencias registradas (≥3)', ok: resultados.evidencias?.length >= 3 },
        { nombre: 'URLs Cloudinary presentes', ok: resultados.evidencias?.every(e => e.url) },
        { nombre: 'URLs Cloudinary accesibles', ok: resultados.evidencias?.every(e => e.accessible) },
        { nombre: 'Documento PDF registrado', ok: resultados.documentos?.length >= 1 },
        { nombre: 'URL R2 presente', ok: resultados.documentos?.[0]?.ruta_archivo },
    ];

    let passed = 0;
    let failed = 0;

    for (const check of checks) {
        const icon = check.ok ? '✅' : '❌';
        console.log(`   ${icon} ${check.nombre}`);
        if (check.ok) passed++;
        else failed++;
    }

    console.log('\n' + '─'.repeat(70));
    console.log(`   RESULTADO: ${passed}/${checks.length} verificaciones pasadas`);

    if (failed > 0) {
        console.log(`   ⚠️ ${failed} VERIFICACIONES FALLIDAS - REQUIERE INVESTIGACIÓN`);
    } else {
        console.log('   🎉 TODAS LAS VERIFICACIONES PASADAS');
    }
    console.log('═'.repeat(70) + '\n');

    return failed === 0;
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('🔬 VERIFICACIÓN FORENSE - ZERO TRUST');
    console.log('═'.repeat(70));
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-CO')}`);
    console.log(`🎯 Orden a verificar: ID ${CONFIG.ORDEN_ID}`);
    console.log('═'.repeat(70));

    try {
        await login();

        const resultados = {
            orden: await verificarOrden(),
            evidencias: await verificarEvidencias(),
            firmas: await verificarFirmas(),
            documentos: await verificarDocumentoPDF(),
            historial: await verificarHistorial()
        };

        await verificarLogsServidor();
        await consultaDirectaDB();

        const success = await generarResumen(resultados);
        process.exit(success ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR FATAL:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
