/**
 * TEST ATÓMICO - Subida de PDF a Cloudflare R2
 * 
 * Este test verifica:
 * 1. Conexión con Cloudflare R2
 * 2. Subida de PDF
 * 3. Obtención de URL pública
 */

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configuración de R2 - Cuenta PLANTAS
const r2Client = new S3Client({
  region: 'auto',
  endpoint: 'https://df62bcb5510c62b7ba5dedf3e065c566.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: '0e6cbcc0d1350f4de86c5c8489adad32',
    secretAccessKey: '4a637e26da1ad7f0028f6e81c1a45993f598d1b485c3b0ba47acef27c6c4462f'
  }
});

const BUCKET_NAME = 'mekanos-plantas-produccion';

async function ejecutarTest() {
  console.log('='.repeat(60));
  console.log('   TEST ATOMICO - CLOUDFLARE R2');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // PASO 1: Verificar PDF local
    console.log('[PASO 1] Verificando PDF local...');
    const pdfPath = path.join(__dirname, 'test-pdf-enterprise.pdf');
    
    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF no encontrado. Ejecuta primero test-pdf-enterprise.js');
    }
    
    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log('   [OK] PDF encontrado: ' + (pdfBuffer.length / 1024).toFixed(2) + ' KB');
    
    // PASO 2: Subir a R2
    console.log('');
    console.log('[PASO 2] Subiendo PDF a Cloudflare R2...');
    
    const fileName = 'informes/test-e2e-' + Date.now() + '.pdf';
    
    const comando = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: pdfBuffer,
      ContentType: 'application/pdf'
    });
    
    await r2Client.send(comando);
    console.log('   [OK] PDF subido exitosamente');
    
    // PASO 3: Generar URL
    console.log('');
    console.log('[PASO 3] Generando URL...');
    
    // URL pública del archivo (asumiendo que el bucket tiene acceso público)
    const publicUrl = `https://mekanos-plantas-produccion.df62bcb5510c62b7ba5dedf3e065c566.r2.cloudflarestorage.com/${fileName}`;
    
    // También la ruta para guardar en BD (sin dominio completo)
    const rutaArchivo = fileName;
    
    console.log('   [OK] URLs generadas');
    console.log('');
    console.log('   Detalles:');
    console.log('   - Bucket: ' + BUCKET_NAME);
    console.log('   - Key: ' + fileName);
    console.log('   - Ruta para BD: ' + rutaArchivo);
    
    // RESULTADO
    console.log('');
    console.log('='.repeat(60));
    console.log('   [OK] TEST R2 COMPLETADO');
    console.log('='.repeat(60));
    console.log('');
    console.log('Guardar en BD:');
    console.log('   ruta_archivo: "' + rutaArchivo + '"');
    console.log('');
    
    return {
      success: true,
      key: fileName,
      rutaArchivo: rutaArchivo
    };
    
  } catch (error) {
    console.error('');
    console.error('[ERROR] ' + error.message);
    if (error.Code) console.error('   Codigo: ' + error.Code);
    return { success: false, error: error.message };
  }
}

// Ejecutar
ejecutarTest().then(result => {
  if (result.success) {
    console.log('[FIN] Cloudflare R2 funciona correctamente.');
    process.exit(0);
  } else {
    console.log('[FIN] Error en R2.');
    process.exit(1);
  }
});
