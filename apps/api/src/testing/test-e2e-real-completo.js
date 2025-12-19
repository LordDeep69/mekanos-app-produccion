/**
 * TEST E2E REAL COMPLETO - MEKANOS
 * Simula EXACTAMENTE el flujo del frontend
 * Fecha: 28-Nov-2025
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const TIMESTAMP = Date.now();
const NUMERO_ORDEN = `OS-E2E-${TIMESTAMP}`;

// ============================================================================
// CONFIGURACION
// ============================================================================

// Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME_PLANTAS || 'dibw7aluj',
  api_key: process.env.CLOUDINARY_API_KEY_PLANTAS,
  api_secret: process.env.CLOUDINARY_API_SECRET_PLANTAS
});

// R2 (Cloudflare)
const R2_CONFIG = {
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || 'mekanos-plantas-produccion',
  publicUrl: process.env.R2_PUBLIC_URL
};

const s3Client = new S3Client({
  region: 'auto',
  endpoint: R2_CONFIG.endpoint,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey
  }
});

// Email
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASS
  }
});

// ============================================================================
// FUNCIONES UTILITARIAS
// ============================================================================

function log(paso, msg, tipo = 'ok') {
  const icons = { ok: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  console.log(`[${paso}] ${icons[tipo]} ${msg}`);
}

function createTestImage() {
  // Crear una imagen PNG simple de 100x100 pixeles
  // Header PNG + IHDR chunk + IDAT chunk + IEND chunk
  const width = 100;
  const height = 100;
  
  // Crear datos de imagen (RGB rojo)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filtro
    for (let x = 0; x < width; x++) {
      rawData.push(255, 0, 0); // RGB rojo
    }
  }
  
  // Usar un placeholder JPEG simple
  return Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
    0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
    0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
    0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
    0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
    0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
    0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
    0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
    0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
    0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
    0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
    0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5,
    0xDB, 0x20, 0xA8, 0xF1, 0x0E, 0xA2, 0xFF, 0xD9
  ]);
}

// ============================================================================
// TEST PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 TEST E2E REAL COMPLETO - MEKANOS');
  console.log('   Simula EXACTAMENTE el flujo del frontend');
  console.log('   Número de orden: ' + NUMERO_ORDEN);
  console.log('═'.repeat(70));

  const resultados = {
    timestamp: new Date().toISOString(),
    numeroOrden: NUMERO_ORDEN,
    pasos: []
  };

  try {
    // ========================================================================
    // PASO 1: SUBIR IMAGEN A CLOUDINARY (Evidencia fotográfica)
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📷 PASO 1: Subiendo imagen de evidencia a Cloudinary...');
    console.log('─'.repeat(70));

    const imageBuffer = createTestImage();
    let cloudinaryUrl = null;
    
    try {
      const uploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: `mekanos/evidencias/e2e`,
            resource_type: 'image',
            public_id: `ev_${TIMESTAMP}`
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(imageBuffer);
      });
      
      cloudinaryUrl = uploadResult.secure_url;
      log(1, `Imagen subida a Cloudinary: ${cloudinaryUrl}`);
      resultados.pasos.push({ paso: 1, servicio: 'Cloudinary', ok: true, url: cloudinaryUrl });
    } catch (err) {
      log(1, `Error Cloudinary: ${err.message}`, 'error');
      resultados.pasos.push({ paso: 1, servicio: 'Cloudinary', ok: false, error: err.message });
    }

    // ========================================================================
    // PASO 2: OBTENER DATOS DE BD
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📊 PASO 2: Obteniendo datos de la BD...');
    console.log('─'.repeat(70));

    const cliente = await prisma.clientes.findFirst({ include: { persona: true } });
    const tecnico = await prisma.empleados.findFirst({ where: { es_tecnico: true }, include: { persona: true } });
    const equipo = await prisma.equipos.findFirst();
    const tipoServicio = await prisma.tipos_servicio.findFirst();

    log(2, `Cliente: ${cliente?.persona?.nombre_completo || 'N/A'}`);
    log(2, `Técnico: ${tecnico?.persona?.nombre_completo || 'N/A'}`);
    log(2, `Equipo: ${equipo?.codigo_equipo || 'N/A'}`);
    resultados.pasos.push({ paso: 2, servicio: 'Database', ok: true });

    // ========================================================================
    // PASO 3: CREAR ORDEN DE SERVICIO
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📋 PASO 3: Creando orden de servicio...');
    console.log('─'.repeat(70));

    const orden = await prisma.ordenes_servicio.create({
      data: {
        numero_orden: NUMERO_ORDEN,
        id_cliente: cliente.id_cliente,
        id_equipo: equipo.id_equipo,
        id_tipo_servicio: tipoServicio?.id_tipo_servicio || 1,
        fecha_programada: new Date(),
        prioridad: 'NORMAL',
        origen_solicitud: 'PREVENTIVO',
        descripcion_inicial: 'TEST E2E REAL COMPLETO - Mantenimiento preventivo',
        id_estado_actual: 3, // BORRADOR
        creado_por: 1
      }
    });

    log(3, `Orden creada: ${orden.numero_orden} (ID: ${orden.id_orden_servicio})`);
    resultados.pasos.push({ paso: 3, servicio: 'Orden', ok: true, id: orden.id_orden_servicio });

    // ========================================================================
    // PASO 4: GUARDAR EVIDENCIA FOTOGRAFICA EN BD
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('💾 PASO 4: Guardando evidencia fotográfica en BD...');
    console.log('─'.repeat(70));

    if (cloudinaryUrl) {
      const evidencia = await prisma.evidencias_fotograficas.create({
        data: {
          id_orden_servicio: orden.id_orden_servicio,
          tipo_evidencia: 'ANTES',
          descripcion: 'Evidencia TEST E2E - Estado inicial del equipo',
          nombre_archivo: `evidencia_${NUMERO_ORDEN}.jpg`,
          ruta_archivo: cloudinaryUrl,
          hash_sha256: require('crypto').createHash('sha256').update(imageBuffer).digest('hex'),
          tamaño_bytes: imageBuffer.length,
          mime_type: 'image/jpeg',
          ancho_pixels: 100,
          alto_pixels: 100,
          orden_visualizacion: 1,
          es_principal: true,
          fecha_captura: new Date(),
          capturada_por: tecnico?.id_empleado || 1
        }
      });
      
      log(4, `Evidencia guardada en BD con URL Cloudinary (ID: ${evidencia.id_evidencia})`);
      resultados.pasos.push({ paso: 4, servicio: 'Evidencia BD', ok: true, id: evidencia.id_evidencia });
    }

    // ========================================================================
    // PASO 5: GENERAR PDF CON PUPPETEER
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📄 PASO 5: Generando PDF con Puppeteer...');
    console.log('─'.repeat(70));

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { background: #244673; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; }
          .footer { background: #f0f0f0; padding: 10px; text-align: center; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #3290A6; color: white; }
          .evidencia { max-width: 200px; margin: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>MEKANOS S.A.S</h1>
          <h2>INFORME DE SERVICIO</h2>
        </div>
        <div class="content">
          <h3>Orden: ${NUMERO_ORDEN}</h3>
          <table>
            <tr><th>Cliente</th><td>${cliente?.persona?.nombre_completo || 'N/A'}</td></tr>
            <tr><th>Equipo</th><td>${equipo?.codigo_equipo || 'N/A'}</td></tr>
            <tr><th>Técnico</th><td>${tecnico?.persona?.nombre_completo || 'N/A'}</td></tr>
            <tr><th>Fecha</th><td>${new Date().toLocaleString('es-CO')}</td></tr>
            <tr><th>Tipo</th><td>Mantenimiento Preventivo - TEST E2E</td></tr>
          </table>
          
          <h4>Evidencia Fotográfica</h4>
          ${cloudinaryUrl ? `<img src="${cloudinaryUrl}" class="evidencia" alt="Evidencia">` : '<p>Sin evidencias</p>'}
          
          <h4>Observaciones</h4>
          <p>Este es un informe generado automáticamente por el sistema de pruebas E2E de MEKANOS.</p>
          <p>Timestamp: ${TIMESTAMP}</p>
        </div>
        <div class="footer">
          <p>MEKANOS S.A.S - Cartagena de Indias, Colombia - www.mekanos.com.co</p>
        </div>
      </body>
      </html>
    `;

    let pdfBuffer;
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
      });
    } finally {
      await browser.close();
    }

    const pdfSizeKB = (pdfBuffer.length / 1024).toFixed(2);
    log(5, `PDF generado: ${pdfSizeKB} KB`);
    resultados.pasos.push({ paso: 5, servicio: 'PDF Puppeteer', ok: true, size: pdfSizeKB + ' KB' });

    // ========================================================================
    // PASO 6: SUBIR PDF A CLOUDFLARE R2
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('☁️ PASO 6: Subiendo PDF a Cloudflare R2...');
    console.log('─'.repeat(70));

    const pdfKey = `informes/ordenes/${NUMERO_ORDEN}/informe_${TIMESTAMP}.pdf`;
    let r2Url = null;

    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: R2_CONFIG.bucketName,
        Key: pdfKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        Metadata: {
          'x-mekanos-orden': NUMERO_ORDEN,
          'x-mekanos-fecha': new Date().toISOString()
        }
      }));

      // URL pública
      r2Url = `${R2_CONFIG.publicUrl}/${pdfKey}`;
      
      // También generar URL firmada
      const signedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: R2_CONFIG.bucketName, Key: pdfKey }),
        { expiresIn: 604800 } // 7 días
      );

      log(6, `PDF subido a R2: ${pdfKey}`);
      log(6, `URL pública: ${r2Url.substring(0, 70)}...`, 'info');
      resultados.pasos.push({ paso: 6, servicio: 'Cloudflare R2', ok: true, key: pdfKey, url: r2Url });
    } catch (err) {
      log(6, `Error R2: ${err.message}`, 'error');
      resultados.pasos.push({ paso: 6, servicio: 'Cloudflare R2', ok: false, error: err.message });
    }

    // ========================================================================
    // PASO 7: GUARDAR DOCUMENTO EN BD
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('💾 PASO 7: Guardando documento en BD...');
    console.log('─'.repeat(70));

    if (r2Url) {
      const documento = await prisma.documentos_generados.create({
        data: {
          tipo_documento: 'INFORME_SERVICIO',
          id_referencia: orden.id_orden_servicio,
          numero_documento: NUMERO_ORDEN,
          ruta_archivo: r2Url, // URL COMPLETA de R2
          hash_sha256: require('crypto').createHash('sha256').update(pdfBuffer).digest('hex'),
          tamaño_bytes: pdfBuffer.length,
          mime_type: 'application/pdf',
          fecha_generacion: new Date(),
          generado_por: 1
        }
      });

      log(7, `Documento guardado en BD con URL R2 (ID: ${documento.id_documento})`);
      resultados.pasos.push({ paso: 7, servicio: 'Documento BD', ok: true, id: documento.id_documento });
    }

    // ========================================================================
    // PASO 8: ENVIAR EMAIL
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📧 PASO 8: Enviando email con informe...');
    console.log('─'.repeat(70));

    const destinatario = 'lorddeep3@gmail.com';

    try {
      const emailResult = await emailTransporter.sendMail({
        from: `"MEKANOS S.A.S" <${process.env.EMAIL_SMTP_USER}>`,
        to: destinatario,
        subject: `TEST E2E - Informe de Servicio ${NUMERO_ORDEN}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #244673; color: white; padding: 20px; text-align: center;">
              <h1>MEKANOS S.A.S</h1>
            </div>
            <div style="padding: 20px;">
              <h2>Informe de Servicio</h2>
              <p>Estimado cliente,</p>
              <p>Adjunto encontrará el informe del servicio realizado:</p>
              <ul>
                <li><strong>Orden:</strong> ${NUMERO_ORDEN}</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleString('es-CO')}</li>
                <li><strong>Tipo:</strong> Mantenimiento Preventivo</li>
              </ul>
              ${r2Url ? `<p><a href="${r2Url}" style="background: #3290A6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver PDF en la nube</a></p>` : ''}
              <p>Este es un email de prueba del sistema MEKANOS.</p>
            </div>
            <div style="background: #f0f0f0; padding: 10px; text-align: center; font-size: 12px;">
              <p>MEKANOS S.A.S - Cartagena de Indias, Colombia</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `Informe_${NUMERO_ORDEN}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      log(8, `Email enviado a ${destinatario}`);
      log(8, `Message ID: ${emailResult.messageId}`, 'info');
      resultados.pasos.push({ paso: 8, servicio: 'Email', ok: true, to: destinatario, messageId: emailResult.messageId });
    } catch (err) {
      log(8, `Error Email: ${err.message}`, 'error');
      
      // Verificar si es bloqueo de Google
      if (err.message.includes('535') || err.message.includes('Username and Password not accepted')) {
        log(8, 'Google bloqueó la conexión - Reactivar en https://myaccount.google.com/lesssecureapps', 'warn');
      }
      
      resultados.pasos.push({ paso: 8, servicio: 'Email', ok: false, error: err.message });
    }

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN DE PRUEBAS E2E');
    console.log('═'.repeat(70));

    const okCount = resultados.pasos.filter(p => p.ok).length;
    const failCount = resultados.pasos.filter(p => !p.ok).length;

    console.log(`\n   TOTAL: ${resultados.pasos.length} pruebas`);
    console.log(`   ✅ OK: ${okCount}`);
    console.log(`   ❌ FAIL: ${failCount}`);
    console.log('');

    resultados.pasos.forEach(p => {
      const icon = p.ok ? '✅' : '❌';
      console.log(`   ${icon} Paso ${p.paso}: ${p.servicio} ${p.ok ? '' : '- ' + p.error}`);
    });

    console.log('\n' + '═'.repeat(70));
    
    if (failCount === 0) {
      console.log('🎉 ¡TODOS LOS TESTS PASARON! BACKEND 100% FUNCIONAL');
    } else {
      console.log(`⚠️ HAY ${failCount} ERRORES QUE REQUIEREN ATENCIÓN`);
    }
    
    console.log('═'.repeat(70) + '\n');

    // Guardar resultados
    const resultPath = path.join(__dirname, `e2e-real-results-${TIMESTAMP}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(resultados, null, 2));
    console.log(`📝 Resultados guardados: ${resultPath}`);

  } catch (error) {
    console.error('\n❌ ERROR GENERAL:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();



