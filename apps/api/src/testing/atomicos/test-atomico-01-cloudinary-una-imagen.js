/**
 * ============================================================================
 * TEST ATÓMICO 01: Cloudinary - Subida de UNA imagen
 * ============================================================================
 * 
 * OBJETIVO: Validar que el servicio de Cloudinary puede subir una imagen
 *           correctamente y retornar una URL accesible.
 * 
 * PRERREQUISITOS:
 * - Variables de entorno configuradas:
 *   - CLOUDINARY_CLOUD_NAME_PLANTAS
 *   - CLOUDINARY_API_KEY_PLANTAS
 *   - CLOUDINARY_API_SECRET_PLANTAS
 * 
 * VALIDACIONES:
 * 1. La subida retorna success: true
 * 2. La URL retornada es accesible (HTTP 200)
 * 3. Los metadatos son correctos (width, height, format)
 * 
 * ============================================================================
 */

const { v2: cloudinary } = require('cloudinary');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CLOUDINARY_CONFIG = {
    cloud_name: 'dibw7aluj',
    api_key: '643988218551617',
    api_secret: 'ipcTGt7Kf1NQmYp-ToZtXJX2zJc'
};

const TEST_CONFIG = {
    folder: 'mekanos/test-atomico/evidencias',
    publicId: `test_atomico_01_${Date.now()}`,
    tags: ['test-atomico', 'validacion', 'single-image']
};

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Crea una imagen de prueba real (PNG simple)
 */
function crearImagenPrueba() {
    // Crear un PNG mínimo válido (1x1 pixel rojo)
    // PNG header + IHDR + IDAT + IEND
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR chunk (width=100, height=100, bit_depth=8, color_type=2 RGB)
    const ihdrData = Buffer.from([
        0x00, 0x00, 0x00, 0x64, // width: 100
        0x00, 0x00, 0x00, 0x64, // height: 100
        0x08,                   // bit depth: 8
        0x02,                   // color type: RGB
        0x00,                   // compression
        0x00,                   // filter
        0x00                    // interlace
    ]);

    const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x0D]), // length: 13
        Buffer.from('IHDR'),
        ihdrData,
        ihdrCrc
    ]);

    // IDAT chunk (datos de imagen comprimidos - simplificado)
    // Usamos zlib para comprimir datos de imagen roja
    const zlib = require('zlib');
    const rowSize = 100 * 3 + 1; // 100 pixels * 3 bytes (RGB) + 1 filter byte
    const rawData = Buffer.alloc(rowSize * 100);

    for (let row = 0; row < 100; row++) {
        const offset = row * rowSize;
        rawData[offset] = 0; // filter: none
        for (let col = 0; col < 100; col++) {
            const pixelOffset = offset + 1 + col * 3;
            // Color: Azul MEKANOS (#244673)
            rawData[pixelOffset] = 0x24;     // R
            rawData[pixelOffset + 1] = 0x46; // G
            rawData[pixelOffset + 2] = 0x73; // B
        }
    }

    const compressedData = zlib.deflateSync(rawData);
    const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressedData]));
    const idatLength = Buffer.alloc(4);
    idatLength.writeUInt32BE(compressedData.length);
    const idatChunk = Buffer.concat([
        idatLength,
        Buffer.from('IDAT'),
        compressedData,
        idatCrc
    ]);

    // IEND chunk
    const iendCrc = crc32(Buffer.from('IEND'));
    const iendChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from('IEND'),
        iendCrc
    ]);

    return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * CRC32 para chunks PNG
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

    const result = Buffer.alloc(4);
    result.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0);
    return result;
}

/**
 * Verifica que una URL es accesible
 */
function verificarUrlAccesible(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            resolve({
                accesible: res.statusCode === 200,
                statusCode: res.statusCode,
                contentType: res.headers['content-type'],
                contentLength: res.headers['content-length']
            });
        }).on('error', (err) => {
            resolve({
                accesible: false,
                error: err.message
            });
        });
    });
}

// ============================================================================
// TEST PRINCIPAL
// ============================================================================

async function ejecutarTest() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST ATÓMICO 01: Cloudinary - Subida de UNA imagen');
    console.log('═'.repeat(70));

    const resultados = {
        paso1_configuracion: false,
        paso2_subida: false,
        paso3_urlAccesible: false,
        paso4_metadatos: false,
        exito: false,
        datos: {}
    };

    try {
        // ========================================================================
        // PASO 1: Configurar Cloudinary
        // ========================================================================
        console.log('\n📌 PASO 1: Configurando Cloudinary...');

        cloudinary.config({
            cloud_name: CLOUDINARY_CONFIG.cloud_name,
            api_key: CLOUDINARY_CONFIG.api_key,
            api_secret: CLOUDINARY_CONFIG.api_secret,
            secure: true
        });

        console.log(`   ✅ Cloud Name: ${CLOUDINARY_CONFIG.cloud_name}`);
        console.log(`   ✅ API Key: ${CLOUDINARY_CONFIG.api_key.substring(0, 6)}...`);
        resultados.paso1_configuracion = true;

        // ========================================================================
        // PASO 2: Crear y subir imagen
        // ========================================================================
        console.log('\n📌 PASO 2: Creando y subiendo imagen...');

        const imagenBuffer = crearImagenPrueba();
        console.log(`   📷 Imagen creada: ${imagenBuffer.length} bytes`);

        // Subir usando upload_stream
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: TEST_CONFIG.folder,
                    public_id: TEST_CONFIG.publicId,
                    tags: TEST_CONFIG.tags,
                    resource_type: 'image'
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(imagenBuffer);
        });

        console.log(`   ✅ Subida exitosa`);
        console.log(`   🔗 URL: ${uploadResult.secure_url}`);
        console.log(`   📁 Public ID: ${uploadResult.public_id}`);
        console.log(`   📐 Dimensiones: ${uploadResult.width}x${uploadResult.height}`);
        console.log(`   📦 Tamaño: ${uploadResult.bytes} bytes`);
        console.log(`   📄 Formato: ${uploadResult.format}`);

        resultados.paso2_subida = true;
        resultados.datos.url = uploadResult.secure_url;
        resultados.datos.publicId = uploadResult.public_id;
        resultados.datos.width = uploadResult.width;
        resultados.datos.height = uploadResult.height;
        resultados.datos.bytes = uploadResult.bytes;
        resultados.datos.format = uploadResult.format;

        // ========================================================================
        // PASO 3: Verificar que la URL es accesible
        // ========================================================================
        console.log('\n📌 PASO 3: Verificando accesibilidad de la URL...');

        const verificacion = await verificarUrlAccesible(uploadResult.secure_url);

        if (verificacion.accesible) {
            console.log(`   ✅ URL accesible (HTTP ${verificacion.statusCode})`);
            console.log(`   📄 Content-Type: ${verificacion.contentType}`);
            console.log(`   📦 Content-Length: ${verificacion.contentLength}`);
            resultados.paso3_urlAccesible = true;
        } else {
            console.log(`   ❌ URL no accesible: ${verificacion.error || `HTTP ${verificacion.statusCode}`}`);
        }

        // ========================================================================
        // PASO 4: Validar metadatos
        // ========================================================================
        console.log('\n📌 PASO 4: Validando metadatos...');

        const metadatosValidos =
            uploadResult.width === 100 &&
            uploadResult.height === 100 &&
            uploadResult.format === 'png' &&
            uploadResult.bytes > 0;

        if (metadatosValidos) {
            console.log(`   ✅ Width: ${uploadResult.width} (esperado: 100)`);
            console.log(`   ✅ Height: ${uploadResult.height} (esperado: 100)`);
            console.log(`   ✅ Format: ${uploadResult.format} (esperado: png)`);
            console.log(`   ✅ Bytes: ${uploadResult.bytes} > 0`);
            resultados.paso4_metadatos = true;
        } else {
            console.log(`   ❌ Metadatos incorrectos`);
            console.log(`   Width: ${uploadResult.width} (esperado: 100)`);
            console.log(`   Height: ${uploadResult.height} (esperado: 100)`);
        }

        // ========================================================================
        // RESULTADO FINAL
        // ========================================================================
        resultados.exito =
            resultados.paso1_configuracion &&
            resultados.paso2_subida &&
            resultados.paso3_urlAccesible &&
            resultados.paso4_metadatos;

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        resultados.error = error.message;
    }

    // ========================================================================
    // RESUMEN
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN DEL TEST');
    console.log('═'.repeat(70));

    console.log(`\n   Paso 1 - Configuración:    ${resultados.paso1_configuracion ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 2 - Subida:           ${resultados.paso2_subida ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 3 - URL Accesible:    ${resultados.paso3_urlAccesible ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 4 - Metadatos:        ${resultados.paso4_metadatos ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n' + '─'.repeat(70));

    if (resultados.exito) {
        console.log('🎉 TEST ATÓMICO 01: ✅ ÉXITO TOTAL');
        console.log('\n   Cloudinary está funcionando correctamente.');
        console.log(`   URL de imagen: ${resultados.datos.url}`);
    } else {
        console.log('💥 TEST ATÓMICO 01: ❌ FALLÓ');
        console.log('\n   Revisar los pasos que fallaron antes de continuar.');
    }

    console.log('═'.repeat(70) + '\n');

    // Guardar resultado
    const resultPath = path.join(__dirname, 'resultado-test-01.json');
    fs.writeFileSync(resultPath, JSON.stringify(resultados, null, 2));
    console.log(`📁 Resultado guardado en: ${resultPath}\n`);

    return resultados;
}

// Ejecutar
ejecutarTest().then(result => {
    process.exit(result.exito ? 0 : 1);
}).catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
});
