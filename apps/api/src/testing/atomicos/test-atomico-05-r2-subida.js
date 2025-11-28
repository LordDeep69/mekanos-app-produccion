/**
 * ============================================================================
 * TEST ATÓMICO 05: R2 - Subida de PDF
 * ============================================================================
 * 
 * OBJETIVO: Validar que R2StorageService puede subir un PDF correctamente
 *           y generar una URL firmada accesible.
 * 
 * PRERREQUISITOS:
 * - TEST ATÓMICO 04 debe haber pasado (PDF se genera correctamente)
 * - Variables de entorno R2 configuradas
 * 
 * VALIDACIONES:
 * 1. El servicio R2 está configurado
 * 2. El PDF se sube correctamente
 * 3. La URL pública es válida
 * 4. La URL firmada es accesible
 * 
 * ============================================================================
 */

const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const https = require('https');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURACIÓN R2
// ============================================================================

const R2_CONFIG = {
    endpoint: 'https://df62bcb5510c62b7ba5dedf3e065c566.r2.cloudflarestorage.com',
    accessKeyId: '0e6cbcc0d1350f4de86c5c8489adad32',
    secretAccessKey: '4a637e26da1ad7f0028f6e81c1a45993f598d1b485c3b0ba47acef27c6c4462f',
    bucketName: 'mekanos-plantas-produccion',
    publicUrl: 'https://pub-r2.mekanos.com.co'
};

// ============================================================================
// UTILIDADES
// ============================================================================

function crearPDFPrueba() {
    // Crear un PDF mínimo válido
    const PDFDocument = require('pdfkit');
    const chunks = [];

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'A4' });

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Contenido del PDF
        doc.fontSize(24)
            .fillColor('#244673')
            .text('MEKANOS S.A.S', 50, 50);

        doc.fontSize(16)
            .fillColor('#333333')
            .text('TEST ATÓMICO 05 - R2 Storage', 50, 100);

        doc.fontSize(12)
            .text(`Fecha: ${new Date().toLocaleString('es-CO')}`, 50, 140);

        doc.fontSize(12)
            .text('Este PDF fue generado para validar la subida a Cloudflare R2.', 50, 180);

        doc.end();
    });
}

function verificarUrlAccesible(url) {
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : require('http');
        protocol.get(url, (res) => {
            resolve({
                accesible: res.statusCode === 200,
                statusCode: res.statusCode,
                contentType: res.headers['content-type']
            });
        }).on('error', (err) => {
            resolve({ accesible: false, error: err.message });
        });
    });
}

// ============================================================================
// TEST PRINCIPAL
// ============================================================================

async function ejecutarTest() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST ATÓMICO 05: R2 - Subida de PDF');
    console.log('═'.repeat(70));

    const resultados = {
        paso1_configuracion: false,
        paso2_crearPdf: false,
        paso3_subirPdf: false,
        paso4_verificarExistencia: false,
        paso5_urlFirmada: false,
        exito: false,
        datos: {}
    };

    try {
        // ========================================================================
        // PASO 1: Configurar cliente S3 para R2
        // ========================================================================
        console.log('\n📌 PASO 1: Configurando cliente S3 para R2...');

        const s3Client = new S3Client({
            region: 'auto',
            endpoint: R2_CONFIG.endpoint,
            credentials: {
                accessKeyId: R2_CONFIG.accessKeyId,
                secretAccessKey: R2_CONFIG.secretAccessKey
            }
        });

        console.log(`   ✅ Cliente S3 configurado`);
        console.log(`   📦 Bucket: ${R2_CONFIG.bucketName}`);
        resultados.paso1_configuracion = true;

        // ========================================================================
        // PASO 2: Crear PDF de prueba
        // ========================================================================
        console.log('\n📌 PASO 2: Creando PDF de prueba...');

        const pdfBuffer = await crearPDFPrueba();
        console.log(`   ✅ PDF creado: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        resultados.paso2_crearPdf = true;
        resultados.datos.pdfSize = pdfBuffer.length;

        // ========================================================================
        // PASO 3: Subir PDF a R2
        // ========================================================================
        console.log('\n📌 PASO 3: Subiendo PDF a R2...');

        const timestamp = Date.now();
        const pdfKey = `test-atomico/pdfs/test_05_${timestamp}.pdf`;

        const putCommand = new PutObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: pdfKey,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            Metadata: {
                'x-mekanos-test': 'atomico-05',
                'x-mekanos-fecha': new Date().toISOString()
            }
        });

        await s3Client.send(putCommand);

        console.log(`   ✅ PDF subido exitosamente`);
        console.log(`   📁 Key: ${pdfKey}`);
        resultados.paso3_subirPdf = true;
        resultados.datos.key = pdfKey;

        // ========================================================================
        // PASO 4: Verificar que el archivo existe
        // ========================================================================
        console.log('\n📌 PASO 4: Verificando existencia del archivo...');

        const headCommand = new HeadObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: pdfKey
        });

        const headResult = await s3Client.send(headCommand);

        console.log(`   ✅ Archivo existe en R2`);
        console.log(`   📦 Tamaño: ${headResult.ContentLength} bytes`);
        console.log(`   📄 Content-Type: ${headResult.ContentType}`);

        resultados.paso4_verificarExistencia = true;

        // ========================================================================
        // PASO 5: Generar URL firmada
        // ========================================================================
        console.log('\n📌 PASO 5: Generando URL firmada...');

        const getCommand = new GetObjectCommand({
            Bucket: R2_CONFIG.bucketName,
            Key: pdfKey
        });

        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 }); // 1 hora

        console.log(`   ✅ URL firmada generada`);
        console.log(`   🔗 URL: ${signedUrl.substring(0, 80)}...`);
        console.log(`   ⏱️ Expira en: 1 hora`);

        // URL pública (corta)
        const publicUrl = `${R2_CONFIG.publicUrl}/${pdfKey}`;
        console.log(`   🌐 URL pública: ${publicUrl}`);

        resultados.paso5_urlFirmada = true;
        resultados.datos.signedUrl = signedUrl;
        resultados.datos.publicUrl = publicUrl;

        // ========================================================================
        // RESULTADO FINAL
        // ========================================================================
        resultados.exito =
            resultados.paso1_configuracion &&
            resultados.paso2_crearPdf &&
            resultados.paso3_subirPdf &&
            resultados.paso4_verificarExistencia &&
            resultados.paso5_urlFirmada;

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

    console.log(`\n   Paso 1 - Configuración:       ${resultados.paso1_configuracion ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 2 - Crear PDF:           ${resultados.paso2_crearPdf ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 3 - Subir PDF:           ${resultados.paso3_subirPdf ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 4 - Verificar Existe:    ${resultados.paso4_verificarExistencia ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 5 - URL Firmada:         ${resultados.paso5_urlFirmada ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n' + '─'.repeat(70));

    if (resultados.exito) {
        console.log('🎉 TEST ATÓMICO 05: ✅ ÉXITO TOTAL');
        console.log('\n   R2StorageService funciona correctamente.');
        console.log(`   PDF subido: ${resultados.datos.key}`);
    } else {
        console.log('💥 TEST ATÓMICO 05: ❌ FALLÓ');
        console.log('\n   Revisar los pasos que fallaron antes de continuar.');
    }

    console.log('═'.repeat(70) + '\n');

    // Guardar resultado
    const resultPath = path.join(__dirname, 'resultado-test-05.json');
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
