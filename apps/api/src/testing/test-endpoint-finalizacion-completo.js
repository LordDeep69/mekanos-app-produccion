/**
 * ============================================================================
 * TEST E2E: ENDPOINT /api/ordenes/:id/finalizar-completo
 * ============================================================================
 * 
 * MEKANOS S.A.S - Test de Integración E2E
 * 
 * Este test simula una petición COMPLETA desde el frontend (App Móvil Técnico)
 * hacia el endpoint de finalización de orden.
 * 
 * PREREQUISITOS:
 * 1. Servidor API corriendo en localhost:3000
 * 2. Base de datos con orden de prueba en estado EN_PROCESO
 * 3. Credenciales configuradas (.env)
 * 
 * EJECUTAR:
 * node src/testing/test-endpoint-finalizacion-completo.js
 * 
 * ============================================================================
 */

const http = require('http');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
    API_HOST: 'localhost',
    API_PORT: 3000,
    // ID de orden para testing (debe existir en BD con estado EN_PROCESO)
    ORDEN_ID: 41, // OS-202511-0033 en estado EN_PROCESO
    // Token JWT REAL obtenido de login (admin@mekanos.com)
    JWT_TOKEN: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AbWVrYW5vcy5jb20iLCJyb2wiOiJVU0VSIiwicGVyc29uYUlkIjoxLCJpYXQiOjE3NjQ4NTYzMTUsImV4cCI6MTc2NDg1NzIxNX0._rSSRvXF4M-ZoxRknbDdfp7wFXKAmG_GVgwhVzda-mU',
};

// ============================================================================
// UTILIDADES PARA GENERAR DATOS DE PRUEBA
// ============================================================================

/**
 * Genera una firma PNG válida en Base64
 * Crea un PNG mínimo válido de 50x20 píxeles con línea diagonal
 */
function generarFirmaBase64() {
    // PNG Header
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR chunk (50x20 8-bit RGB)
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(50, 0);  // width
    ihdrData.writeUInt32BE(20, 4);  // height
    ihdrData.writeUInt8(8, 8);      // bit depth
    ihdrData.writeUInt8(2, 9);      // color type (RGB)
    ihdrData.writeUInt8(0, 10);     // compression
    ihdrData.writeUInt8(0, 11);     // filter
    ihdrData.writeUInt8(0, 12);     // interlace

    const ihdrChunk = createPNGChunk('IHDR', ihdrData);

    // IDAT chunk (imagen simple)
    const rawData = [];
    for (let y = 0; y < 20; y++) {
        rawData.push(0); // filter byte
        for (let x = 0; x < 50; x++) {
            // Crear línea diagonal como "firma"
            const onLine = Math.abs(x - y * 2.5) < 2;
            if (onLine) {
                rawData.push(0, 0, 128); // Azul oscuro (firma)
            } else {
                rawData.push(255, 255, 255); // Blanco (fondo)
            }
        }
    }

    const zlib = require('zlib');
    const compressed = zlib.deflateSync(Buffer.from(rawData));
    const idatChunk = createPNGChunk('IDAT', compressed);

    // IEND chunk
    const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));

    // Combinar todo
    const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
    return png.toString('base64');
}

/**
 * Crea un chunk PNG con CRC
 */
function createPNGChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);

    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);

    return Buffer.concat([length, typeBuffer, data, crc]);
}

/**
 * Calcula CRC32 para PNG
 */
function crc32(buffer) {
    let crc = 0xFFFFFFFF;
    const table = [];

    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c;
    }

    for (let i = 0; i < buffer.length; i++) {
        crc = table[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Genera una imagen de evidencia PNG en Base64
 */
function generarEvidenciaBase64(tipo) {
    // Genera un PNG simple con color según tipo
    const colors = {
        'ANTES': [200, 200, 200],    // Gris
        'DURANTE': [100, 150, 200],  // Azul claro
        'DESPUES': [100, 200, 100],  // Verde claro
    };

    const color = colors[tipo] || [255, 255, 255];

    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(100, 0);  // width
    ihdrData.writeUInt32BE(100, 4);  // height
    ihdrData.writeUInt8(8, 8);
    ihdrData.writeUInt8(2, 9);
    ihdrData.writeUInt8(0, 10);
    ihdrData.writeUInt8(0, 11);
    ihdrData.writeUInt8(0, 12);

    const ihdrChunk = createPNGChunk('IHDR', ihdrData);

    const rawData = [];
    for (let y = 0; y < 100; y++) {
        rawData.push(0);
        for (let x = 0; x < 100; x++) {
            rawData.push(...color);
        }
    }

    const zlib = require('zlib');
    const compressed = zlib.deflateSync(Buffer.from(rawData));
    const idatChunk = createPNGChunk('IDAT', compressed);
    const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));

    const png = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
    return png.toString('base64');
}

// ============================================================================
// PAYLOAD DE PRUEBA (SIMULA FRONTEND)
// ============================================================================

/**
 * Genera el payload completo que enviaría el frontend
 */
function generarPayloadFinalizacion() {
    const firmaTecnicoBase64 = generarFirmaBase64();
    const firmaClienteBase64 = generarFirmaBase64();

    return {
        // Evidencias fotográficas (mínimo 1, máximo 10)
        evidencias: [
            {
                tipo: 'ANTES',
                base64: generarEvidenciaBase64('ANTES'),
                descripcion: 'Estado inicial del generador antes del mantenimiento',
                formato: 'png',
            },
            {
                tipo: 'DURANTE',
                base64: generarEvidenciaBase64('DURANTE'),
                descripcion: 'Proceso de cambio de filtros y revisión de componentes',
                formato: 'png',
            },
            {
                tipo: 'DESPUES',
                base64: generarEvidenciaBase64('DESPUES'),
                descripcion: 'Generador funcionando correctamente después del servicio',
                formato: 'png',
            },
        ],

        // Firmas digitales
        firmas: {
            tecnico: {
                tipo: 'TECNICO',
                base64: firmaTecnicoBase64,
                idPersona: 1, // ID de la persona del técnico
                formato: 'png',
            },
            cliente: {
                tipo: 'CLIENTE',
                base64: firmaClienteBase64,
                idPersona: 2, // ID de la persona del cliente
                formato: 'png',
            },
        },

        // Actividades ejecutadas (checklist de mantenimiento)
        actividades: [
            // SISTEMA DE ENFRIAMIENTO
            { sistema: 'SISTEMA DE ENFRIAMIENTO', descripcion: 'Revisar tapa de radiador', resultado: 'B', observaciones: 'Tapa en buen estado' },
            { sistema: 'SISTEMA DE ENFRIAMIENTO', descripcion: 'Revisar nivel de refrigerante', resultado: 'B', observaciones: 'Nivel correcto' },
            { sistema: 'SISTEMA DE ENFRIAMIENTO', descripcion: 'Revisar fugas en mangueras', resultado: 'B', observaciones: 'Sin fugas' },
            { sistema: 'SISTEMA DE ENFRIAMIENTO', descripcion: 'Inspeccionar aspas del ventilador', resultado: 'B', observaciones: null },
            { sistema: 'SISTEMA DE ENFRIAMIENTO', descripcion: 'Revisar estado de correas', resultado: 'C', observaciones: 'Correa ajustada' },

            // SISTEMA DE ASPIRACIÓN
            { sistema: 'SISTEMA DE ASPIRACIÓN', descripcion: 'Revisar estado de filtros de aire', resultado: 'B', observaciones: 'Filtros limpios' },
            { sistema: 'SISTEMA DE ASPIRACIÓN', descripcion: 'Apretar abrazaderas del sistema', resultado: 'B', observaciones: null },
            { sistema: 'SISTEMA DE ASPIRACIÓN', descripcion: 'Inspección de turbocargador', resultado: 'B', observaciones: 'Rotación libre' },

            // SISTEMA DE COMBUSTIBLE
            { sistema: 'SISTEMA DE COMBUSTIBLE', descripcion: 'Revisar mangueras de alimentación', resultado: 'B', observaciones: null },
            { sistema: 'SISTEMA DE COMBUSTIBLE', descripcion: 'Inspeccionar bomba de transferencia', resultado: 'B', observaciones: 'Funcionando' },
            { sistema: 'SISTEMA DE COMBUSTIBLE', descripcion: 'Revisar nivel de combustible', resultado: 'B', observaciones: '3/4 de tanque' },

            // SISTEMA DE LUBRICACIÓN
            { sistema: 'SISTEMA DE LUBRICACIÓN', descripcion: 'Revisar nivel de aceite', resultado: 'B', observaciones: 'Nivel óptimo' },
            { sistema: 'SISTEMA DE LUBRICACIÓN', descripcion: 'Inspección por fugas', resultado: 'B', observaciones: 'Sin fugas' },

            // SISTEMA ELÉCTRICO
            { sistema: 'SISTEMA ELÉCTRICO', descripcion: 'Revisar estado del cableado', resultado: 'B', observaciones: null },
            { sistema: 'SISTEMA ELÉCTRICO', descripcion: 'Revisar cargador de batería', resultado: 'B', observaciones: 'Cargando correctamente' },
            { sistema: 'SISTEMA ELÉCTRICO', descripcion: 'Revisar electrolitos de batería', resultado: 'B', observaciones: 'Nivel correcto' },
            { sistema: 'SISTEMA ELÉCTRICO', descripcion: 'Limpieza y ajuste de bornes', resultado: 'C', observaciones: 'Bornes limpiados' },
        ],

        // Mediciones del módulo de control
        mediciones: [
            { parametro: 'Velocidad motor (RPM)', valor: 1800, unidad: 'RPM', nivelAlerta: 'OK' },
            { parametro: 'Presión de aceite', valor: 45, unidad: 'PSI', nivelAlerta: 'OK' },
            { parametro: 'Temperatura refrigerante', valor: 82, unidad: '°C', nivelAlerta: 'OK' },
            { parametro: 'Carga de batería', valor: 13.8, unidad: 'V', nivelAlerta: 'OK' },
            { parametro: 'Horas de trabajo', valor: 1250, unidad: 'Hrs', nivelAlerta: 'OK' },
            { parametro: 'Voltaje generador', valor: 220, unidad: 'V', nivelAlerta: 'OK' },
            { parametro: 'Frecuencia', valor: 60, unidad: 'Hz', nivelAlerta: 'OK' },
            { parametro: 'Corriente', valor: 45, unidad: 'A', nivelAlerta: 'OK' },
        ],

        // Observaciones generales
        observaciones: 'Mantenimiento preventivo Tipo A completado satisfactoriamente. ' +
            'El generador se encuentra en óptimas condiciones de funcionamiento. ' +
            'Se recomienda programar mantenimiento Tipo B en 3 meses para cambio de filtros y aceite. ' +
            'Cliente conforme con el servicio realizado.',

        // Datos del módulo de control (para generadores)
        datosModulo: {
            rpm: 1800,
            presionAceite: 45,
            temperaturaRefrigerante: 82,
            cargaBateria: 13.8,
            horasTrabajo: 1250,
            voltaje: 220,
            frecuencia: 60,
            corriente: 45,
        },

        // Horas de servicio
        horaEntrada: '08:00',
        horaSalida: '11:30',

        // Email adicional (opcional)
        emailAdicional: 'supervisor@mekanos.com',
    };
}

// ============================================================================
// FUNCIONES DE TEST
// ============================================================================

/**
 * Realiza la petición HTTP al endpoint
 */
function ejecutarPeticion(ordenId, payload) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);

        const options = {
            hostname: CONFIG.API_HOST,
            port: CONFIG.API_PORT,
            path: `/api/ordenes/${ordenId}/finalizar-completo`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Authorization': `Bearer ${CONFIG.JWT_TOKEN}`,
            },
        };

        console.log('\n📤 Enviando petición...');
        console.log(`   URL: POST http://${CONFIG.API_HOST}:${CONFIG.API_PORT}${options.path}`);
        console.log(`   Payload size: ${(Buffer.byteLength(data) / 1024).toFixed(2)} KB`);

        const startTime = Date.now();

        const req = http.request(options, (res) => {
            let body = '';

            res.on('data', (chunk) => {
                body += chunk;
            });

            res.on('end', () => {
                const elapsed = Date.now() - startTime;

                try {
                    const response = JSON.parse(body);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: response,
                        elapsed,
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body,
                        elapsed,
                        parseError: e.message,
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

/**
 * Valida la respuesta del endpoint
 */
function validarRespuesta(response) {
    const validaciones = [];

    // Validación 1: Status code
    if (response.statusCode === 200) {
        validaciones.push({ test: 'Status Code 200', passed: true });
    } else {
        validaciones.push({ test: 'Status Code 200', passed: false, actual: response.statusCode });
    }

    // Validación 2: Success flag
    if (response.body?.success === true) {
        validaciones.push({ test: 'success: true', passed: true });
    } else {
        validaciones.push({ test: 'success: true', passed: false, actual: response.body?.success });
    }

    // Validación 3: Orden data
    if (response.body?.data?.orden?.id) {
        validaciones.push({ test: 'orden.id presente', passed: true, value: response.body.data.orden.id });
    } else {
        validaciones.push({ test: 'orden.id presente', passed: false });
    }

    // Validación 4: Evidencias procesadas
    if (Array.isArray(response.body?.data?.evidencias) && response.body.data.evidencias.length > 0) {
        validaciones.push({
            test: 'evidencias procesadas',
            passed: true,
            value: `${response.body.data.evidencias.length} evidencias`
        });
    } else {
        validaciones.push({ test: 'evidencias procesadas', passed: false });
    }

    // Validación 5: Firmas registradas
    if (Array.isArray(response.body?.data?.firmas) && response.body.data.firmas.length > 0) {
        validaciones.push({
            test: 'firmas registradas',
            passed: true,
            value: `${response.body.data.firmas.length} firmas`
        });
    } else {
        validaciones.push({ test: 'firmas registradas', passed: false });
    }

    // Validación 6: Documento generado
    if (response.body?.data?.documento?.id && response.body?.data?.documento?.url) {
        validaciones.push({
            test: 'documento PDF generado',
            passed: true,
            value: `ID: ${response.body.data.documento.id}`
        });
    } else {
        validaciones.push({ test: 'documento PDF generado', passed: false });
    }

    // Validación 7: Email enviado
    if (response.body?.data?.email) {
        validaciones.push({
            test: 'email procesado',
            passed: true,
            value: `enviado: ${response.body.data.email.enviado}`
        });
    } else {
        validaciones.push({ test: 'email procesado', passed: false });
    }

    // Validación 8: Tiempo de respuesta
    if (response.elapsed < 30000) { // Menos de 30 segundos
        validaciones.push({
            test: 'tiempo respuesta < 30s',
            passed: true,
            value: `${response.elapsed}ms`
        });
    } else {
        validaciones.push({
            test: 'tiempo respuesta < 30s',
            passed: false,
            value: `${response.elapsed}ms`
        });
    }

    return validaciones;
}

/**
 * Imprime el reporte de resultados
 */
function imprimirReporte(response, validaciones) {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTADO DEL TEST E2E - ENDPOINT FINALIZACIÓN COMPLETA');
    console.log('='.repeat(80));

    // Resumen de respuesta
    console.log('\n📥 RESPUESTA DEL SERVIDOR:');
    console.log(`   Status: ${response.statusCode}`);
    console.log(`   Tiempo: ${response.elapsed}ms`);

    if (response.body?.message) {
        console.log(`   Mensaje: ${response.body.message}`);
    }

    // Datos de la orden
    if (response.body?.data?.orden) {
        console.log('\n📋 ORDEN:');
        console.log(`   ID: ${response.body.data.orden.id}`);
        console.log(`   Número: ${response.body.data.orden.numero}`);
        console.log(`   Estado: ${response.body.data.orden.estado}`);
    }

    // Evidencias
    if (response.body?.data?.evidencias) {
        console.log('\n📷 EVIDENCIAS:');
        response.body.data.evidencias.forEach((ev, i) => {
            console.log(`   ${i + 1}. ${ev.tipo} - ID: ${ev.id}`);
        });
    }

    // Documento
    if (response.body?.data?.documento) {
        console.log('\n📄 DOCUMENTO PDF:');
        console.log(`   ID: ${response.body.data.documento.id}`);
        console.log(`   Tamaño: ${response.body.data.documento.tamanioKB} KB`);
        console.log(`   URL: ${response.body.data.documento.url?.substring(0, 60)}...`);
    }

    // Email
    if (response.body?.data?.email) {
        console.log('\n📧 EMAIL:');
        console.log(`   Enviado: ${response.body.data.email.enviado ? '✅ Sí' : '❌ No'}`);
        console.log(`   Destinatario: ${response.body.data.email.destinatario}`);
    }

    // Validaciones
    console.log('\n✅ VALIDACIONES:');
    let passed = 0;
    let failed = 0;

    validaciones.forEach((v) => {
        const icon = v.passed ? '✅' : '❌';
        const value = v.value ? ` (${v.value})` : '';
        const actual = v.actual !== undefined ? ` [actual: ${v.actual}]` : '';
        console.log(`   ${icon} ${v.test}${value}${actual}`);

        if (v.passed) passed++;
        else failed++;
    });

    // Resumen final
    console.log('\n' + '='.repeat(80));
    const allPassed = failed === 0;
    const emoji = allPassed ? '🎉' : '⚠️';
    const status = allPassed ? 'TODOS LOS TESTS PASARON' : `${failed} TEST(S) FALLARON`;
    console.log(`${emoji} RESULTADO FINAL: ${status} (${passed}/${validaciones.length})`);
    console.log('='.repeat(80));

    return allPassed;
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST E2E: ENDPOINT /api/ordenes/:id/finalizar-completo                    ║');
    console.log('║  MEKANOS S.A.S - Sistema de Mantenimiento Industrial                       ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    console.log('\n📋 Generando payload de prueba (simulando frontend)...');
    const payload = generarPayloadFinalizacion();

    console.log(`   ✅ Evidencias: ${payload.evidencias.length}`);
    console.log(`   ✅ Actividades: ${payload.actividades.length}`);
    console.log(`   ✅ Mediciones: ${payload.mediciones.length}`);
    console.log(`   ✅ Firmas: 2 (técnico + cliente)`);

    try {
        console.log(`\n🔌 Conectando a servidor: http://${CONFIG.API_HOST}:${CONFIG.API_PORT}`);

        const response = await ejecutarPeticion(CONFIG.ORDEN_ID, payload);
        const validaciones = validarRespuesta(response);
        const success = imprimirReporte(response, validaciones);

        // Si hubo error, mostrar detalles
        if (!success && response.body?.message) {
            console.log('\n⚠️ DETALLE DEL ERROR:');
            console.log(JSON.stringify(response.body, null, 2));
        }

        process.exit(success ? 0 : 1);

    } catch (error) {
        console.error('\n❌ ERROR DE CONEXIÓN:');
        console.error(`   ${error.message}`);
        console.error('\n💡 Asegúrate de que:');
        console.error('   1. El servidor API está corriendo (npm run dev:api)');
        console.error('   2. La base de datos está accesible');
        console.error('   3. Existe una orden con ID ' + CONFIG.ORDEN_ID + ' en estado EN_PROCESO');
        process.exit(1);
    }
}

// Ejecutar
main();
