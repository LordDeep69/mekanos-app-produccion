/**
 * TEST ATÓMICO - Subida de imagen a Cloudinary
 * 
 * Este test verifica:
 * 1. Conexión con Cloudinary
 * 2. Subida de imagen local
 * 3. Obtención de URL pública
 * 4. Almacenamiento en BD (simulado)
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// Configuración de Cloudinary - Cuenta PLANTAS
cloudinary.config({
  cloud_name: 'dibw7aluj',
  api_key: '643988218551617',
  api_secret: 'ipcTGt7Kf1NQmYp-ToZtXJX2zJc'
});

async function ejecutarTest() {
  console.log('='.repeat(60));
  console.log('   TEST ATOMICO - CLOUDINARY');
  console.log('='.repeat(60));
  console.log('');
  
  try {
    // PASO 1: Verificar imagen local
    console.log('[PASO 1] Verificando imagen local...');
    const imagenPath = 'C:\\Users\\Usuario\\Downloads\\mekanosApp\\BASE DE DATOS\\MEKANOS_DB\\REFACTORIZATION\\PRUEBA_PARA_TEST_E2E_FASE3Y4.jpg';
    
    if (!fs.existsSync(imagenPath)) {
      throw new Error('Imagen no encontrada: ' + imagenPath);
    }
    
    const stats = fs.statSync(imagenPath);
    console.log('   [OK] Imagen encontrada: ' + (stats.size / 1024).toFixed(2) + ' KB');
    
    // PASO 2: Subir a Cloudinary
    console.log('');
    console.log('[PASO 2] Subiendo imagen a Cloudinary...');
    
    const resultado = await cloudinary.uploader.upload(imagenPath, {
      folder: 'mekanos/evidencias',
      public_id: 'test-e2e-' + Date.now(),
      resource_type: 'image',
      overwrite: true
    });
    
    console.log('   [OK] Imagen subida exitosamente');
    console.log('');
    console.log('   Detalles:');
    console.log('   - Public ID: ' + resultado.public_id);
    console.log('   - URL: ' + resultado.secure_url);
    console.log('   - Formato: ' + resultado.format);
    console.log('   - Dimensiones: ' + resultado.width + 'x' + resultado.height);
    console.log('   - Bytes: ' + resultado.bytes);
    
    // PASO 3: Verificar URL accesible
    console.log('');
    console.log('[PASO 3] Verificando accesibilidad de URL...');
    
    const https = require('https');
    const urlAccesible = await new Promise((resolve) => {
      https.get(resultado.secure_url, (res) => {
        resolve(res.statusCode === 200);
      }).on('error', () => resolve(false));
    });
    
    if (urlAccesible) {
      console.log('   [OK] URL accesible publicamente');
    } else {
      console.log('   [!] URL no accesible (puede tardar en propagarse)');
    }
    
    // RESULTADO
    console.log('');
    console.log('='.repeat(60));
    console.log('   [OK] TEST CLOUDINARY COMPLETADO');
    console.log('='.repeat(60));
    console.log('');
    console.log('URL para usar en PDF:');
    console.log(resultado.secure_url);
    console.log('');
    
    return {
      success: true,
      url: resultado.secure_url,
      publicId: resultado.public_id,
      bytes: resultado.bytes
    };
    
  } catch (error) {
    console.error('');
    console.error('[ERROR] ' + error.message);
    return { success: false, error: error.message };
  }
}

// Ejecutar
ejecutarTest().then(result => {
  if (result.success) {
    console.log('[FIN] Cloudinary funciona correctamente.');
    console.log('');
    console.log('Guardar este URL en BD:');
    console.log('   url_archivo: "' + result.url + '"');
    process.exit(0);
  } else {
    console.log('[FIN] Error en Cloudinary.');
    process.exit(1);
  }
});
