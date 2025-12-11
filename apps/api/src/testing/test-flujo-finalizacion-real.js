/**
 * ============================================================================
 * TEST FLUJO FINALIZACIÓN REAL - MEKANOS S.A.S
 * ============================================================================
 * 
 * PRUEBA DE FUEGO: Crea una orden, hace todas las transiciones y ejecuta
 * el endpoint /api/ordenes/:id/finalizar-completo
 * 
 * RESULTADO ESPERADO:
 * - PDF generado y subido a Cloudflare R2
 * - Email enviado a lorddeep3@gmail.com
 * - Orden en estado COMPLETADA
 * 
 * ============================================================================
 */

const http = require('http');
const zlib = require('zlib');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
    API_HOST: 'localhost',
    API_PORT: 3000,
    CREDENTIALS: {
        email: 'admin@mekanos.com',
        password: 'Admin123!'
    }
};

let JWT_TOKEN = '';

// ============================================================================
// UTILIDADES HTTP
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
                    const json = JSON.parse(body);
                    resolve({ status: res.statusCode, data: json });
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

// ============================================================================
// GENERADORES DE DATOS (PNG VÁLIDOS)
// ============================================================================

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

function createPNGChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([length, typeBuffer, data, crc]);
}

function generarFirmaBase64() {
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(50, 0);  // width
    ihdrData.writeUInt32BE(20, 4);  // height
    ihdrData.writeUInt8(8, 8);      // bit depth
    ihdrData.writeUInt8(2, 9);      // color type (RGB)
    ihdrData.writeUInt8(0, 10);     // compression
    ihdrData.writeUInt8(0, 11);     // filter
    ihdrData.writeUInt8(0, 12);     // interlace
    const ihdrChunk = createPNGChunk('IHDR', ihdrData);

    const rawData = [];
    for (let y = 0; y < 20; y++) {
        rawData.push(0);
        for (let x = 0; x < 50; x++) {
            const onLine = Math.abs(x - y * 2.5) < 2;
            if (onLine) {
                rawData.push(0, 0, 128);
            } else {
                rawData.push(255, 255, 255);
            }
        }
    }
    const compressed = zlib.deflateSync(Buffer.from(rawData));
    const idatChunk = createPNGChunk('IDAT', compressed);
    const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]).toString('base64');
}

function generarEvidenciaBase64() {
    // Imagen de evidencia más grande (100x75)
    const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(100, 0);
    ihdrData.writeUInt32BE(75, 4);
    ihdrData.writeUInt8(8, 8);
    ihdrData.writeUInt8(2, 9);
    ihdrData.writeUInt8(0, 10);
    ihdrData.writeUInt8(0, 11);
    ihdrData.writeUInt8(0, 12);
    const ihdrChunk = createPNGChunk('IHDR', ihdrData);

    const rawData = [];
    for (let y = 0; y < 75; y++) {
        rawData.push(0);
        for (let x = 0; x < 100; x++) {
            // Gradiente simple
            rawData.push(Math.floor(x * 2.5), Math.floor(y * 3.4), 150);
        }
    }
    const compressed = zlib.deflateSync(Buffer.from(rawData));
    const idatChunk = createPNGChunk('IDAT', compressed);
    const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]).toString('base64');
}

// ============================================================================
// PASOS DEL TEST
// ============================================================================

async function paso1_login() {
    console.log('\n📌 PASO 1: Login');
    const res = await httpRequest('POST', '/auth/login', CONFIG.CREDENTIALS);

    if (res.status !== 200 && res.status !== 201) {
        throw new Error(`Login falló: ${JSON.stringify(res.data)}`);
    }

    JWT_TOKEN = res.data.access_token;
    console.log(`   ✅ Token obtenido: ${JWT_TOKEN.substring(0, 30)}...`);
    return true;
}

async function paso2_obtenerDatos() {
    console.log('\n📌 PASO 2: Obtener datos base (cliente, equipo, tipo servicio)');

    const [clientes, equipos, tipos] = await Promise.all([
        httpRequest('GET', '/clientes?limit=1'),
        httpRequest('GET', '/equipos?limit=1'),
        httpRequest('GET', '/tipos-servicio?limit=1')
    ]);

    const clienteId = clientes.data.data?.[0]?.id_cliente || clientes.data[0]?.id_cliente;
    const equipoId = equipos.data.data?.[0]?.id_equipo || equipos.data[0]?.id_equipo;
    const tipoServicioId = tipos.data.data?.[0]?.id_tipo_servicio || tipos.data[0]?.id_tipo_servicio;

    console.log(`   ✅ Cliente ID: ${clienteId}`);
    console.log(`   ✅ Equipo ID: ${equipoId}`);
    console.log(`   ✅ Tipo Servicio ID: ${tipoServicioId}`);

    return { clienteId, equipoId, tipoServicioId };
}

async function paso3_crearOrden(datos) {
    console.log('\n📌 PASO 3: Crear orden de servicio');

    const ordenData = {
        equipoId: datos.equipoId,
        clienteId: datos.clienteId,
        tipoServicioId: datos.tipoServicioId,
        descripcion: `TEST FINALIZACIÓN REAL - ${new Date().toISOString()}`,
        prioridad: 'NORMAL',
        fechaProgramada: new Date(Date.now() + 86400000).toISOString()
    };

    const res = await httpRequest('POST', '/ordenes', ordenData);

    if (res.status !== 201 && res.status !== 200) {
        throw new Error(`Crear orden falló: ${JSON.stringify(res.data)}`);
    }

    const ordenId = res.data.data?.id_orden_servicio || res.data.id_orden_servicio;
    const numeroOrden = res.data.data?.numero_orden || res.data.numero_orden;

    console.log(`   ✅ Orden creada: ${numeroOrden} (ID: ${ordenId})`);
    return { ordenId, numeroOrden };
}

async function paso4_transiciones(ordenId) {
    console.log('\n📌 PASO 4: Transiciones de estado');

    const transiciones = [
        { estado: 'PROGRAMADA', datos: {} },
        { estado: 'ASIGNADA', datos: { tecnicoId: 1 } },
        { estado: 'EN_PROCESO', datos: {} }
    ];

    for (const t of transiciones) {
        const body = { nuevoEstado: t.estado, ...t.datos };
        const res = await httpRequest('PATCH', `/ordenes/${ordenId}/estado`, body);

        if (res.status === 200) {
            console.log(`   ✅ ${t.estado}`);
        } else {
            console.log(`   ⚠️ ${t.estado}: ${res.data.message || 'Ya aplicado'}`);
        }
    }

    return true;
}

async function paso5_finalizarOrden(ordenId, numeroOrden) {
    console.log('\n📌 PASO 5: Ejecutar /finalizar-completo');

    const payload = {
        evidencias: [
            { tipo: 'ANTES', base64: generarEvidenciaBase64(), descripcion: 'Estado inicial', formato: 'png' },
            { tipo: 'DURANTE', base64: generarEvidenciaBase64(), descripcion: 'En proceso', formato: 'png' },
            { tipo: 'DESPUES', base64: generarEvidenciaBase64(), descripcion: 'Finalizado', formato: 'png' }
        ],
        firmas: {
            tecnico: { tipo: 'TECNICO', base64: generarFirmaBase64(), idPersona: 1, formato: 'png' },
            cliente: { tipo: 'CLIENTE', base64: generarFirmaBase64(), idPersona: 2, formato: 'png' }
        },
        actividades: [
            { sistema: 'MOTOR', descripcion: 'Verificar nivel de aceite', resultado: 'B', observaciones: 'OK' },
            { sistema: 'MOTOR', descripcion: 'Revisar filtro de aire', resultado: 'B', observaciones: 'Limpio' },
            { sistema: 'ELECTRICO', descripcion: 'Verificar conexiones', resultado: 'B', observaciones: 'Sin fallas' }
        ],
        mediciones: [
            { parametro: 'RPM', valor: 1800, unidad: 'rpm', nivelAlerta: 'OK' },
            { parametro: 'Presión Aceite', valor: 45, unidad: 'PSI', nivelAlerta: 'OK' }
        ],
        observaciones: 'Test de finalización real - Todo OK',
        horaEntrada: '08:00',
        horaSalida: '11:30'
    };

    console.log(`   📤 Enviando a: POST /api/ordenes/${ordenId}/finalizar-completo`);
    console.log(`   📦 Payload size: ${(JSON.stringify(payload).length / 1024).toFixed(2)} KB`);

    const startTime = Date.now();
    const res = await httpRequest('POST', `/ordenes/${ordenId}/finalizar-completo`, payload);
    const duration = Date.now() - startTime;

    console.log(`   ⏱️ Tiempo: ${duration}ms`);
    console.log(`   📥 Status: ${res.status}`);

    if (res.status === 200) {
        const data = res.data;
        console.log('\n   📊 RESULTADO:');
        console.log(`      ✅ Orden: ${data.data?.orden?.numero || numeroOrden} → ${data.data?.orden?.estado || 'COMPLETADA'}`);
        console.log(`      📷 Evidencias: ${data.data?.evidencias?.length || 0}`);
        console.log(`      ✍️ Firmas: ${data.data?.firmas?.length || 0}`);

        if (data.data?.documento) {
            console.log(`      📄 PDF: ${data.data.documento.tamanioKB} KB`);
            console.log(`      🔗 URL: ${data.data.documento.url?.substring(0, 60)}...`);
        }

        if (data.data?.email) {
            console.log(`      📧 Email: ${data.data.email.enviado ? '✅ ENVIADO' : '❌ NO ENVIADO'}`);
            console.log(`      📬 Destino: ${data.data.email.destinatario}`);
        }

        return { success: true, data: data.data };
    } else {
        console.log(`   ❌ Error: ${res.data.message || JSON.stringify(res.data)}`);
        return { success: false, error: res.data };
    }
}

// ============================================================================
// EJECUCIÓN PRINCIPAL
// ============================================================================

async function main() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST FLUJO FINALIZACIÓN REAL - MEKANOS S.A.S');
    console.log('═'.repeat(70));
    console.log(`📅 Fecha: ${new Date().toLocaleString('es-CO')}`);
    console.log('📧 Email esperado: lorddeep3@gmail.com');
    console.log('═'.repeat(70));

    try {
        await paso1_login();
        const datos = await paso2_obtenerDatos();
        const orden = await paso3_crearOrden(datos);
        await paso4_transiciones(orden.ordenId);
        const resultado = await paso5_finalizarOrden(orden.ordenId, orden.numeroOrden);

        console.log('\n' + '═'.repeat(70));
        if (resultado.success) {
            console.log('🎉 TEST COMPLETADO EXITOSAMENTE');
            console.log('═'.repeat(70));
            console.log('\n✅ VERIFICAR:');
            console.log('   1. Revisa lorddeep3@gmail.com para el email con PDF');
            console.log('   2. La orden está en estado COMPLETADA');
            console.log('   3. El PDF está en Cloudflare R2');
            console.log('\n' + '═'.repeat(70) + '\n');
            process.exit(0);
        } else {
            console.log('❌ TEST FALLÓ');
            console.log('═'.repeat(70) + '\n');
            process.exit(1);
        }
    } catch (error) {
        console.log('\n❌ ERROR FATAL:', error.message);
        console.log(error.stack);
        process.exit(1);
    }
}

main();
