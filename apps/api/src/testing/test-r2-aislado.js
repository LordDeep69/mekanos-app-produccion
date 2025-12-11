/**
 * ============================================================================
 * TEST AISLADO CLOUDFLARE R2 - MEKANOS S.A.S
 * ============================================================================
 * Propósito: Verificar que podemos subir PDFs a R2 y obtener URL pública
 */

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

// Configuración R2 - Cuenta PLANTAS (documentos de generadores/motores)
const R2_CONFIG = {
  accountId: 'df62bcb5510c62b7ba5dedf3e065c566',
  bucketName: 'mekanos-plantas-produccion',
  accessKeyId: '0e6cbcc0d1350f4de86c5c8489adad32',
  secretAccessKey: '4a637e26da1ad7f0028f6e81c1a45993f598d1b485c3b0ba47acef27c6c4462f'
};

// Cliente S3 para R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey
  }
});

async function testR2Upload() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST AISLADO - CLOUDFLARE R2 UPLOAD');
  console.log('='.repeat(60));

  try {
    // Crear un PDF de prueba simple
    console.log('\n📄 Creando PDF de prueba...');
    const PDFDocument = require('pdfkit');
    
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4' });
      const buffers = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);
      
      // Contenido de prueba
      doc.fontSize(24).text('MEKANOS S.A.S', { align: 'center' });
      doc.moveDown();
      doc.fontSize(16).text('Test de Upload a Cloudflare R2', { align: 'center' });
      doc.moveDown(2);
      doc.fontSize(12).text(`Fecha: ${new Date().toLocaleString('es-CO')}`);
      doc.text(`Timestamp: ${Date.now()}`);
      doc.moveDown();
      doc.text('Este es un PDF de prueba para validar la integración con Cloudflare R2.');
      
      doc.end();
    });

    console.log(`   ✅ PDF creado: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // Subir a R2
    console.log('\n☁️ Subiendo PDF a Cloudflare R2...');
    const timestamp = Date.now();
    const fileName = `informes/test_e2e/informe_test_${timestamp}.pdf`;
    
    const uploadCommand = new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        'x-mekanos-tipo': 'test-e2e',
        'x-mekanos-fecha': new Date().toISOString()
      }
    });

    await s3Client.send(uploadCommand);
    console.log(`   ✅ PDF subido exitosamente: ${fileName}`);

    // Generar URL firmada (válida por 7 días)
    console.log('\n🔗 Generando URL firmada...');
    const getCommand = new GetObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: fileName
    });
    
    const signedUrl = await getSignedUrl(s3Client, getCommand, { 
      expiresIn: 60 * 60 * 24 * 7 // 7 días
    });

    console.log('\n✅ ¡UPLOAD EXITOSO!');
    console.log('='.repeat(60));
    console.log(`📌 Archivo: ${fileName}`);
    console.log(`📦 Tamaño: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`🔗 URL Firmada (7 días):`);
    console.log(`   ${signedUrl.substring(0, 100)}...`);
    console.log('='.repeat(60));

    // Guardar resultado
    const result = {
      fileName,
      size: pdfBuffer.length,
      signedUrl,
      uploadedAt: new Date().toISOString(),
      expiresIn: '7 days'
    };
    
    const resultPath = path.join(__dirname, 'r2-test-result.json');
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`\n📝 Resultado guardado en: ${resultPath}`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN UPLOAD R2:');
    console.error(error.message);
    if (error.Code) console.error(`   Código: ${error.Code}`);
    throw error;
  }
}

// Ejecutar
testR2Upload()
  .then(result => {
    console.log('\n🎉 TEST R2 COMPLETADO EXITOSAMENTE');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 TEST R2 FALLÓ');
    process.exit(1);
  });
