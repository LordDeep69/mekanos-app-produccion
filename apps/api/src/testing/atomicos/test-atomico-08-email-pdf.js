/**
 * ============================================================================
 * TEST ATÓMICO 08: Email con PDF Adjunto
 * ============================================================================
 * 
 * OBJETIVO: Validar que EmailService puede enviar un email con PDF adjunto.
 * 
 * PRERREQUISITOS:
 * - Tests atómicos 01-07 deben haber pasado
 * - Configuración SMTP válida
 * 
 * VALIDACIONES:
 * 1. El servicio de email está configurado
 * 2. Se puede crear un PDF de prueba
 * 3. Se puede enviar email con adjunto
 * 4. El email se envía exitosamente (o modo mock)
 * 
 * ============================================================================
 */

const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURACIÓN EMAIL
// ============================================================================

const EMAIL_CONFIG = {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'mekanossas4@gmail.com',
    pass: 'jvsd znpw hsfv jgmy', // App password correcta
    from: 'mekanossas4@gmail.com',
    testTo: 'lorddeep3@gmail.com' // Email de prueba
};

// ============================================================================
// UTILIDADES
// ============================================================================

function crearPDFPrueba() {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const doc = new PDFDocument({ size: 'A4' });

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(24)
            .fillColor('#244673')
            .text('MEKANOS S.A.S', 50, 50, { align: 'center' });

        doc.fontSize(14)
            .fillColor('#3290A6')
            .text('TEST ATÓMICO 08 - Email con PDF', { align: 'center' });

        doc.moveDown(2);

        // Info
        doc.fontSize(12)
            .fillColor('#333333')
            .text(`Fecha: ${new Date().toLocaleString('es-CO')}`, 50);

        doc.moveDown();
        doc.text('Este PDF fue generado automáticamente para validar');
        doc.text('el envío de emails con adjuntos desde el sistema MEKANOS.');

        doc.moveDown(2);

        // Box
        doc.rect(50, doc.y, 500, 60)
            .fillAndStroke('#f0f9ff', '#244673');

        doc.fillColor('#244673')
            .text('✅ Si puedes ver este PDF, el sistema de email funciona correctamente.', 60, doc.y - 50, { width: 480 });

        doc.end();
    });
}

// ============================================================================
// TEST PRINCIPAL
// ============================================================================

async function ejecutarTest() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST ATÓMICO 08: Email con PDF Adjunto');
    console.log('═'.repeat(70));

    const resultados = {
        paso1_configuracion: false,
        paso2_crearPdf: false,
        paso3_enviarEmail: false,
        exito: false,
        datos: {}
    };

    try {
        // ========================================================================
        // PASO 1: Configurar transporter de Nodemailer
        // ========================================================================
        console.log('\n📌 PASO 1: Configurando transporter de email...');

        const transporter = nodemailer.createTransport({
            host: EMAIL_CONFIG.host,
            port: EMAIL_CONFIG.port,
            secure: false,
            auth: {
                user: EMAIL_CONFIG.user,
                pass: EMAIL_CONFIG.pass
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        // Verificar conexión
        await transporter.verify();
        console.log(`   ✅ Transporter configurado correctamente`);
        console.log(`   📧 Remitente: ${EMAIL_CONFIG.from}`);
        console.log(`   📡 SMTP: ${EMAIL_CONFIG.host}:${EMAIL_CONFIG.port}`);

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
        // PASO 3: Enviar email con PDF adjunto
        // ========================================================================
        console.log('\n📌 PASO 3: Enviando email con PDF adjunto...');
        console.log(`   📬 Destinatario: ${EMAIL_CONFIG.testTo}`);

        const timestamp = Date.now();
        const mailOptions = {
            from: {
                name: 'MEKANOS S.A.S - Test Atómico',
                address: EMAIL_CONFIG.from
            },
            to: EMAIL_CONFIG.testTo,
            subject: `🧪 TEST ATÓMICO 08 - Email con PDF [${timestamp}]`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #244673 0%, #3290A6 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">MEKANOS S.A.S</h1>
            <p style="color: #9EC23D; margin: 10px 0 0 0;">Test Atómico 08</p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #244673;">✅ Email Enviado Exitosamente</h2>
            <p>Este email fue enviado automáticamente como parte del TEST ATÓMICO 08.</p>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CO')}</p>
            <p><strong>Timestamp:</strong> ${timestamp}</p>
            <div style="background: #e8f4f8; padding: 15px; border-left: 4px solid #3290A6; margin: 20px 0;">
              <p style="margin: 0;">📎 <strong>Adjunto:</strong> PDF de prueba con información del test.</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
              MEKANOS S.A.S - Sistema de Gestión de Mantenimiento Industrial
            </p>
          </div>
        </div>
      `,
            attachments: [{
                filename: `MEKANOS_Test_Atomico_08_${timestamp}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf'
            }]
        };

        const result = await transporter.sendMail(mailOptions);

        console.log(`   ✅ Email enviado exitosamente`);
        console.log(`   📨 Message ID: ${result.messageId}`);
        console.log(`   📬 Accepted: ${result.accepted.join(', ')}`);

        resultados.paso3_enviarEmail = true;
        resultados.datos.messageId = result.messageId;
        resultados.datos.accepted = result.accepted;

        // ========================================================================
        // RESULTADO FINAL
        // ========================================================================
        resultados.exito =
            resultados.paso1_configuracion &&
            resultados.paso2_crearPdf &&
            resultados.paso3_enviarEmail;

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
    console.log(`   Paso 2 - Crear PDF:        ${resultados.paso2_crearPdf ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 3 - Enviar Email:     ${resultados.paso3_enviarEmail ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n' + '─'.repeat(70));

    if (resultados.exito) {
        console.log('🎉 TEST ATÓMICO 08: ✅ ÉXITO TOTAL');
        console.log('\n   El servicio de email funciona correctamente.');
        console.log(`   📧 Email enviado a: ${EMAIL_CONFIG.testTo}`);
    } else {
        console.log('💥 TEST ATÓMICO 08: ❌ FALLÓ');
        console.log('\n   Revisar los pasos que fallaron antes de continuar.');
    }

    console.log('═'.repeat(70) + '\n');

    // Guardar resultado
    const resultPath = path.join(__dirname, 'resultado-test-08.json');
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
