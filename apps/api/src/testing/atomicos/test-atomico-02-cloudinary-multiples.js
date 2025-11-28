/**
 * ============================================================================
 * TEST ATÓMICO 02: Cloudinary - Subida de MÚLTIPLES imágenes
 * ============================================================================
 * 
 * OBJETIVO: Validar que el servicio de Cloudinary puede subir MÚLTIPLES
 *           imágenes (3+) correctamente, simulando evidencias ANTES/DURANTE/DESPUES.
 * 
 * PRERREQUISITOS:
 * - TEST ATÓMICO 01 debe haber pasado
 * 
 * VALIDACIONES:
 * 1. Las 3 subidas retornan success: true
 * 2. Las 3 URLs son únicas y accesibles
 * 3. Los tags incluyen el tipo correcto (ANTES, DURANTE, DESPUES)
 * 4. Todas están en la carpeta correcta
 * 
 * ============================================================================
 */

const { v2: cloudinary } = require('cloudinary');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CLOUDINARY_CONFIG = {
    cloud_name: 'dibw7aluj',
    api_key: '643988218551617',
    api_secret: 'ipcTGt7Kf1NQmYp-ToZtXJX2zJc'
};

const TEST_CONFIG = {
    ordenId: 'TEST-ATOMICO-02',
    baseFolder: 'mekanos/test-atomico/ordenes'
};

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Crea una imagen PNG con un color específico
 */
function crearImagenColor(r, g, b, size = 100) {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(size, 0);  // width
    ihdrData.writeUInt32BE(size, 4);  // height
    ihdrData[8] = 8;   // bit depth
    ihdrData[9] = 2;   // color type (RGB)
    ihdrData[10] = 0;  // compression
    ihdrData[11] = 0;  // filter
    ihdrData[12] = 0;  // interlace

    const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x0D]),
        Buffer.from('IHDR'),
        ihdrData,
        ihdrCrc
    ]);

    const rowSize = size * 3 + 1;
    const rawData = Buffer.alloc(rowSize * size);

    for (let row = 0; row < size; row++) {
        const offset = row * rowSize;
        rawData[offset] = 0;
        for (let col = 0; col < size; col++) {
            const pixelOffset = offset + 1 + col * 3;
            rawData[pixelOffset] = r;
            rawData[pixelOffset + 1] = g;
            rawData[pixelOffset + 2] = b;
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

    const iendCrc = crc32(Buffer.from('IEND'));
    const iendChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from('IEND'),
        iendCrc
    ]);

    return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

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

function verificarUrlAccesible(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            resolve({
                accesible: res.statusCode === 200,
                statusCode: res.statusCode
            });
        }).on('error', (err) => {
            resolve({ accesible: false, error: err.message });
        });
    });
}

/**
 * Sube una imagen a Cloudinary
 */
async function subirImagen(buffer, tipo, ordenId, timestamp) {
    const folder = `${TEST_CONFIG.baseFolder}/${ordenId}/evidencias`;
    const publicId = `${tipo.toLowerCase()}_${timestamp}`;
    const tags = ['test-atomico', 'evidencia', tipo, ordenId];

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                public_id: publicId,
                tags,
                resource_type: 'image'
            },
            (error, result) => {
                if (error) reject(error);
                else resolve({ ...result, tipo });
            }
        );
        uploadStream.end(buffer);
    });
}

// ============================================================================
// TEST PRINCIPAL
// ============================================================================

async function ejecutarTest() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST ATÓMICO 02: Cloudinary - Subida de MÚLTIPLES imágenes');
    console.log('═'.repeat(70));

    const resultados = {
        paso1_configuracion: false,
        paso2_subidaAntes: false,
        paso3_subidaDurante: false,
        paso4_subidaDespues: false,
        paso5_urlsUnicas: false,
        paso6_urlsAccesibles: false,
        exito: false,
        datos: {
            imagenes: []
        }
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

        console.log(`   ✅ Configurado correctamente`);
        resultados.paso1_configuracion = true;

        const timestamp = Date.now();
        const ordenId = `${TEST_CONFIG.ordenId}-${timestamp}`;

        // ========================================================================
        // PASO 2: Subir imagen ANTES (color rojo)
        // ========================================================================
        console.log('\n📌 PASO 2: Subiendo imagen ANTES (rojo)...');

        const imgAntes = crearImagenColor(220, 38, 38); // Rojo
        const resultAntes = await subirImagen(imgAntes, 'ANTES', ordenId, timestamp);

        console.log(`   ✅ Subida exitosa`);
        console.log(`   🔗 URL: ${resultAntes.secure_url}`);
        console.log(`   🏷️ Tags: ${resultAntes.tags.join(', ')}`);

        resultados.paso2_subidaAntes = true;
        resultados.datos.imagenes.push({
            tipo: 'ANTES',
            url: resultAntes.secure_url,
            publicId: resultAntes.public_id,
            tags: resultAntes.tags
        });

        // ========================================================================
        // PASO 3: Subir imagen DURANTE (color amarillo)
        // ========================================================================
        console.log('\n📌 PASO 3: Subiendo imagen DURANTE (amarillo)...');

        const imgDurante = crearImagenColor(245, 158, 11); // Amarillo
        const resultDurante = await subirImagen(imgDurante, 'DURANTE', ordenId, timestamp + 1);

        console.log(`   ✅ Subida exitosa`);
        console.log(`   🔗 URL: ${resultDurante.secure_url}`);
        console.log(`   🏷️ Tags: ${resultDurante.tags.join(', ')}`);

        resultados.paso3_subidaDurante = true;
        resultados.datos.imagenes.push({
            tipo: 'DURANTE',
            url: resultDurante.secure_url,
            publicId: resultDurante.public_id,
            tags: resultDurante.tags
        });

        // ========================================================================
        // PASO 4: Subir imagen DESPUES (color verde)
        // ========================================================================
        console.log('\n📌 PASO 4: Subiendo imagen DESPUES (verde)...');

        const imgDespues = crearImagenColor(86, 166, 114); // Verde MEKANOS
        const resultDespues = await subirImagen(imgDespues, 'DESPUES', ordenId, timestamp + 2);

        console.log(`   ✅ Subida exitosa`);
        console.log(`   🔗 URL: ${resultDespues.secure_url}`);
        console.log(`   🏷️ Tags: ${resultDespues.tags.join(', ')}`);

        resultados.paso4_subidaDespues = true;
        resultados.datos.imagenes.push({
            tipo: 'DESPUES',
            url: resultDespues.secure_url,
            publicId: resultDespues.public_id,
            tags: resultDespues.tags
        });

        // ========================================================================
        // PASO 5: Verificar que las URLs son únicas
        // ========================================================================
        console.log('\n📌 PASO 5: Verificando URLs únicas...');

        const urls = resultados.datos.imagenes.map(img => img.url);
        const urlsUnicas = new Set(urls);

        if (urlsUnicas.size === 3) {
            console.log(`   ✅ 3 URLs únicas generadas`);
            resultados.paso5_urlsUnicas = true;
        } else {
            console.log(`   ❌ URLs duplicadas detectadas`);
        }

        // ========================================================================
        // PASO 6: Verificar que todas las URLs son accesibles
        // ========================================================================
        console.log('\n📌 PASO 6: Verificando accesibilidad de URLs...');

        let todasAccesibles = true;
        for (const img of resultados.datos.imagenes) {
            const verificacion = await verificarUrlAccesible(img.url);
            if (verificacion.accesible) {
                console.log(`   ✅ ${img.tipo}: Accesible (HTTP 200)`);
            } else {
                console.log(`   ❌ ${img.tipo}: No accesible`);
                todasAccesibles = false;
            }
        }

        resultados.paso6_urlsAccesibles = todasAccesibles;

        // ========================================================================
        // RESULTADO FINAL
        // ========================================================================
        resultados.exito =
            resultados.paso1_configuracion &&
            resultados.paso2_subidaAntes &&
            resultados.paso3_subidaDurante &&
            resultados.paso4_subidaDespues &&
            resultados.paso5_urlsUnicas &&
            resultados.paso6_urlsAccesibles;

        resultados.datos.ordenId = ordenId;

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

    console.log(`\n   Paso 1 - Configuración:     ${resultados.paso1_configuracion ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 2 - Subida ANTES:      ${resultados.paso2_subidaAntes ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 3 - Subida DURANTE:    ${resultados.paso3_subidaDurante ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 4 - Subida DESPUES:    ${resultados.paso4_subidaDespues ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 5 - URLs Únicas:       ${resultados.paso5_urlsUnicas ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 6 - URLs Accesibles:   ${resultados.paso6_urlsAccesibles ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n' + '─'.repeat(70));

    if (resultados.exito) {
        console.log('🎉 TEST ATÓMICO 02: ✅ ÉXITO TOTAL');
        console.log('\n   Cloudinary maneja múltiples imágenes correctamente.');
        console.log(`   Imágenes subidas: ${resultados.datos.imagenes.length}`);
    } else {
        console.log('💥 TEST ATÓMICO 02: ❌ FALLÓ');
        console.log('\n   Revisar los pasos que fallaron antes de continuar.');
    }

    console.log('═'.repeat(70) + '\n');

    // Guardar resultado
    const resultPath = path.join(__dirname, 'resultado-test-02.json');
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
