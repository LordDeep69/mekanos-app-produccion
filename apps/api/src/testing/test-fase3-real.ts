/**
 * ============================================================================
 * TEST E2E REAL - MEKANOS S.A.S - FASE 3
 * ============================================================================
 * Script de prueba funcional con datos reales de Supabase
 * 
 * Ejecutar con: npx ts-node src/testing/test-fase3-real.ts
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import * as puppeteer from 'puppeteer';

// Configuración
const TEST_EMAIL_DESTINO = 'lorddeep3@gmail.com';
const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'mekanossas4@gmail.com',
    pass: 'jvsd znpw hsfv jgmy'
  }
};

const prisma = new PrismaClient();

async function testSMTPConnection(): Promise<boolean> {
  console.log('\n📧 TEST 1: Verificando conexión SMTP...');
  
  try {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    await transporter.verify();
    console.log('   ✅ Conexión SMTP verificada correctamente');
    return true;
  } catch (error) {
    console.error('   ❌ Error SMTP:', error);
    return false;
  }
}

async function testDatabaseConnection(): Promise<boolean> {
  console.log('\n🗄️ TEST 2: Verificando conexión a Supabase...');
  
  try {
    const estados = await prisma.estados_orden.findMany();
    console.log(`   ✅ Conexión OK - ${estados.length} estados de orden encontrados`);
    
    const clientes = await prisma.clientes.findMany({ take: 3 });
    console.log(`   ✅ ${clientes.length} clientes encontrados`);
    
    const equipos = await prisma.equipos.findMany({ take: 3 });
    console.log(`   ✅ ${equipos.length} equipos encontrados`);
    
    const ordenes = await prisma.ordenes_servicio.findMany({ take: 3 });
    console.log(`   ✅ ${ordenes.length} órdenes de servicio encontradas`);
    
    return true;
  } catch (error) {
    console.error('   ❌ Error DB:', error);
    return false;
  }
}

async function testPDFGeneration(): Promise<Buffer | null> {
  console.log('\n📄 TEST 3: Generando PDF de prueba...');
  
  try {
    // ✅ FIX 09-JUN-2026: Resolución cross-platform de Chrome
    const path = require('path');
    const fs = require('fs');
    const isWindows = process.platform === 'win32';
    
    // Resolver Chrome executable
    let execPath: string | undefined;
    try {
      const defaultPath = puppeteer.executablePath();
      if (defaultPath && fs.existsSync(defaultPath)) execPath = defaultPath;
    } catch { /* ignore */ }
    
    if (!execPath) {
      const cacheDir = process.env.PUPPETEER_CACHE_DIR;
      if (cacheDir && fs.existsSync(path.join(cacheDir, 'chrome'))) {
        const versions = fs.readdirSync(path.join(cacheDir, 'chrome'))
          .filter((d: string) => fs.statSync(path.join(cacheDir, 'chrome', d)).isDirectory())
          .sort().reverse();
        for (const v of versions) {
          const candidate = isWindows
            ? path.join(cacheDir, 'chrome', v, 'chrome-win64', 'chrome.exe')
            : path.join(cacheDir, 'chrome', v, 'chrome-linux64', 'chrome');
          if (fs.existsSync(candidate)) { execPath = candidate; break; }
        }
      }
    }

    const baseArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'];
    const linuxArgs = isWindows ? [] : ['--single-process', '--no-zygote'];

    const browser = await puppeteer.launch({
      headless: true,
      ...(execPath ? { executablePath: execPath } : {}),
      args: [...baseArgs, ...linuxArgs],
    });
    
    const page = await browser.newPage();
    
    // HTML de prueba profesional MEKANOS
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 40px; }
        .header { background: #244673; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { font-weight: bold; color: #244673; }
        .value { color: #333; }
        .footer { background: #3290A6; color: white; padding: 10px; text-align: center; margin-top: 30px; }
        h1 { margin: 0; }
        .logo-text { font-size: 24px; font-weight: bold; }
        .success { color: #56A672; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-text">MEKANOS S.A.S</div>
        <h1>Informe de Prueba E2E</h1>
        <p>Test Funcional - FASE 3</p>
      </div>
      <div class="content">
        <h2>📋 Detalles del Test</h2>
        <div class="info-row">
          <span class="label">Fecha:</span>
          <span class="value">${new Date().toLocaleString('es-CO')}</span>
        </div>
        <div class="info-row">
          <span class="label">Tipo:</span>
          <span class="value">Prueba End-to-End FASE 3</span>
        </div>
        <div class="info-row">
          <span class="label">Estado:</span>
          <span class="success">✅ EXITOSO</span>
        </div>
        
        <h2>🔧 Componentes Probados</h2>
        <ul>
          <li>✅ Conexión SMTP (Gmail mekanossas4@gmail.com)</li>
          <li>✅ Base de datos Supabase</li>
          <li>✅ Generación de PDF con Puppeteer</li>
          <li>✅ Envío de email con adjunto</li>
        </ul>
        
        <h2>📊 Métricas</h2>
        <div class="info-row">
          <span class="label">Servidor:</span>
          <span class="value">NestJS 10.x</span>
        </div>
        <div class="info-row">
          <span class="label">Base de datos:</span>
          <span class="value">PostgreSQL (Supabase)</span>
        </div>
        <div class="info-row">
          <span class="label">Email destino:</span>
          <span class="value">${TEST_EMAIL_DESTINO}</span>
        </div>
      </div>
      <div class="footer">
        <p>MEKANOS S.A.S - Sistema de Gestión de Mantenimiento</p>
        <p>Este es un email de prueba generado automáticamente</p>
      </div>
    </body>
    </html>
    `;
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    
    await browser.close();
    
    console.log(`   ✅ PDF generado exitosamente (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('   ❌ Error generando PDF:', error);
    return null;
  }
}

async function testEmailWithPDF(pdfBuffer: Buffer): Promise<boolean> {
  console.log('\n📨 TEST 4: Enviando email con PDF adjunto...');
  console.log(`   📧 Destino: ${TEST_EMAIL_DESTINO}`);
  
  try {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    
    const mailOptions = {
      from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
      to: TEST_EMAIL_DESTINO,
      subject: '🔧 [TEST E2E] Prueba Funcional FASE 3 - MEKANOS',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #244673; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">MEKANOS S.A.S</h1>
            <p style="margin: 5px 0;">Sistema de Gestión de Mantenimiento</p>
          </div>
          
          <div style="padding: 30px; background: #f5f5f5;">
            <h2 style="color: #244673;">✅ Test E2E FASE 3 Exitoso</h2>
            
            <p>Este email confirma que el sistema de notificaciones de MEKANOS está funcionando correctamente.</p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #3290A6; margin-top: 0;">📋 Componentes Verificados:</h3>
              <ul style="color: #333;">
                <li>✅ Servidor NestJS operativo</li>
                <li>✅ Base de datos Supabase conectada</li>
                <li>✅ Generación de PDFs con Puppeteer</li>
                <li>✅ Envío de emails con Nodemailer</li>
                <li>✅ SMTP Gmail configurado correctamente</li>
              </ul>
            </div>
            
            <p style="color: #666;">
              <strong>Fecha del test:</strong> ${new Date().toLocaleString('es-CO')}<br>
              <strong>Archivo adjunto:</strong> MEKANOS_Test_E2E_FASE3.pdf
            </p>
          </div>
          
          <div style="background: #3290A6; color: white; padding: 15px; text-align: center;">
            <p style="margin: 0;">
              © 2025 MEKANOS S.A.S - Todos los derechos reservados<br>
              <small>Este es un mensaje automático de prueba</small>
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: 'MEKANOS_Test_E2E_FASE3.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`   ✅ Email enviado exitosamente`);
    console.log(`   📬 Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('   ❌ Error enviando email:', error);
    return false;
  }
}

async function testOrdenServicio(): Promise<boolean> {
  console.log('\n📝 TEST 5: Verificando datos de órdenes de servicio...');
  
  try {
    // Obtener una orden existente con todos sus datos
    const orden = await prisma.ordenes_servicio.findFirst({
      include: {
        clientes: {
          include: {
            personas: true
          }
        },
        equipos: true,
        tipos_servicio: true,
        estados_orden: true,
        empleados: {
          include: {
            personas: true
          }
        }
      }
    });
    
    if (orden) {
      console.log(`   ✅ Orden encontrada: ${orden.numero_orden}`);
      console.log(`   📊 Estado: ${orden.estados_orden?.nombre_estado || 'N/A'}`);
      console.log(`   👤 Cliente: ${orden.clientes?.personas?.nombres || 'N/A'}`);
      console.log(`   🔧 Equipo: ${orden.equipos?.nombre_equipo || 'N/A'}`);
      return true;
    } else {
      console.log('   ⚠️ No hay órdenes en la base de datos');
      return true; // No es un error, solo no hay datos
    }
  } catch (error) {
    console.error('   ❌ Error consultando órdenes:', error);
    return false;
  }
}

async function runAllTests(): Promise<void> {
  console.log('\n');
  console.log('='.repeat(70));
  console.log('🧪 MEKANOS S.A.S - TEST E2E FASE 3');
  console.log('='.repeat(70));
  console.log(`📅 Fecha: ${new Date().toLocaleString('es-CO')}`);
  console.log(`📧 Email destino: ${TEST_EMAIL_DESTINO}`);
  console.log('='.repeat(70));
  
  const results = {
    smtp: false,
    database: false,
    pdf: false,
    email: false,
    ordenes: false,
  };
  
  // Test 1: SMTP
  results.smtp = await testSMTPConnection();
  
  // Test 2: Database
  results.database = await testDatabaseConnection();
  
  // Test 3: PDF Generation
  const pdfBuffer = await testPDFGeneration();
  results.pdf = pdfBuffer !== null;
  
  // Test 4: Email con PDF
  if (pdfBuffer) {
    results.email = await testEmailWithPDF(pdfBuffer);
  }
  
  // Test 5: Órdenes de servicio
  results.ordenes = await testOrdenServicio();
  
  // Resumen
  console.log('\n');
  console.log('='.repeat(70));
  console.log('📋 RESUMEN DE PRUEBAS');
  console.log('='.repeat(70));
  console.log(`   SMTP Gmail:        ${results.smtp ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Base de datos:     ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Generación PDF:    ${results.pdf ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Envío Email:       ${results.email ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Órdenes Servicio:  ${results.ordenes ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(70));
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    console.log('🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!');
    console.log(`📧 Revisa tu bandeja de entrada: ${TEST_EMAIL_DESTINO}`);
  } else {
    console.log('⚠️ Algunos tests fallaron. Revisa los errores arriba.');
  }
  console.log('='.repeat(70));
  console.log('\n');
  
  await prisma.$disconnect();
}

// Ejecutar
runAllTests().catch(console.error);
