/**
 * ============================================================================
 * TEST AISLADO CLOUDINARY - MEKANOS S.A.S
 * ============================================================================
 * Propósito: Verificar que podemos subir imágenes a Cloudinary y obtener URL
 */

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configuración Cloudinary - Cuenta PLANTAS
cloudinary.config({
  cloud_name: 'dibw7aluj',
  api_key: '643988218551617',
  api_secret: 'ipcTGt7Kf1NQmYp-ToZtXJX2zJc'
});

const IMAGEN_PRUEBA = 'C:\\Users\\Usuario\\Downloads\\mekanosApp\\BASE DE DATOS\\MEKANOS_DB\\REFACTORIZATION\\PRUEBA_PARA_TEST_E2E_FASE3Y4.jpg';

async function testCloudinary() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST AISLADO - CLOUDINARY UPLOAD');
  console.log('='.repeat(60));

  try {
    // Verificar que la imagen existe
    console.log('\n📁 Verificando imagen de prueba...');
    if (!fs.existsSync(IMAGEN_PRUEBA)) {
      throw new Error(`Imagen no encontrada: ${IMAGEN_PRUEBA}`);
    }
    const stats = fs.statSync(IMAGEN_PRUEBA);
    console.log(`   ✅ Imagen existe: ${(stats.size / 1024).toFixed(2)} KB`);

    // Subir a Cloudinary
    console.log('\n☁️ Subiendo imagen a Cloudinary...');
    const timestamp = Date.now();
    
    const result = await cloudinary.uploader.upload(IMAGEN_PRUEBA, {
      folder: 'mekanos/evidencias/test_e2e',
      public_id: `evidencia_test_${timestamp}`,
      resource_type: 'image',
      overwrite: true,
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' }
      ]
    });

    console.log('\n✅ ¡UPLOAD EXITOSO!');
    console.log('=' .repeat(60));
    console.log(`📌 Public ID: ${result.public_id}`);
    console.log(`🔗 URL Segura: ${result.secure_url}`);
    console.log(`📏 Dimensiones: ${result.width}x${result.height}`);
    console.log(`📦 Tamaño: ${(result.bytes / 1024).toFixed(2)} KB`);
    console.log(`📄 Formato: ${result.format}`);
    console.log('='.repeat(60));

    // Guardar resultado para verificación
    const resultPath = path.join(__dirname, 'cloudinary-test-result.json');
    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
    console.log(`\n📝 Resultado guardado en: ${resultPath}`);

    return result;

  } catch (error) {
    console.error('\n❌ ERROR EN UPLOAD CLOUDINARY:');
    console.error(error.message);
    throw error;
  }
}

// Ejecutar
testCloudinary()
  .then(result => {
    console.log('\n🎉 TEST CLOUDINARY COMPLETADO EXITOSAMENTE');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 TEST CLOUDINARY FALLÓ');
    process.exit(1);
  });
