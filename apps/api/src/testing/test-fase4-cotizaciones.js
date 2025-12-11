/**
 * ============================================================================
 * TEST E2E REAL - MEKANOS S.A.S - FASE 4 COTIZACIONES
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');

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

async function testDatabase() {
  console.log('\n🗄️ TEST 1: Verificando datos de cotizaciones...');
  
  try {
    // Estados de cotización
    const estados = await prisma.estados_cotizacion.findMany();
    console.log(`   ✅ ${estados.length} estados de cotización encontrados:`);
    estados.forEach(e => console.log(`      - ${e.nombre_estado}`));
    
    // Cotizaciones existentes
    const cotizaciones = await prisma.cotizaciones.findMany({ 
      take: 5,
      include: {
        cliente: { include: { persona: true } },
        estado: true
      }
    });
    console.log(`\n   ✅ ${cotizaciones.length} cotizaciones encontradas:`);
    cotizaciones.forEach(c => {
      console.log(`      - ${c.numero_cotizacion}: ${c.asunto || 'Sin asunto'} [${c.estado?.nombre_estado || 'Sin estado'}]`);
    });
    
    // Items de cotización
    const itemsServicios = await prisma.items_cotizacion_servicios.count();
    const itemsComponentes = await prisma.items_cotizacion_componentes.count();
    console.log(`\n   ✅ Items: ${itemsServicios} servicios, ${itemsComponentes} componentes`);
    
    return { estados, cotizaciones, itemsServicios, itemsComponentes };
  } catch (error) {
    console.error('   ❌ Error DB:', error.message);
    return null;
  }
}

async function testGenerarPDFCotizacion(cotizacion) {
  console.log('\n📄 TEST 2: Generando PDF de cotización...');
  
  if (!cotizacion) {
    console.log('   ⚠️ No hay cotizaciones para generar PDF');
    return null;
  }
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Obtener items de la cotización
    const itemsServicios = await prisma.items_cotizacion_servicios.findMany({
      where: { id_cotizacion: cotizacion.id_cotizacion },
      include: { servicio: true }
    });
    
    const itemsComponentes = await prisma.items_cotizacion_componentes.findMany({
      where: { id_cotizacion: cotizacion.id_cotizacion },
      include: { catalogo_componentes: true }
    });
    
    const formatCurrency = (value) => {
      if (!value) return '$0';
      return new Intl.NumberFormat('es-CO', { 
        style: 'currency', 
        currency: 'COP',
        minimumFractionDigits: 0 
      }).format(value);
    };

    // HTML profesional para cotización
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { margin: 0; size: A4; }
        * { box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          margin: 0; 
          padding: 0; 
          color: #333;
          line-height: 1.4;
        }
        .page { padding: 40px; min-height: 100vh; position: relative; }
        .header { 
          background: linear-gradient(135deg, #244673 0%, #1a3456 100%);
          color: white; 
          padding: 30px; 
          margin: -40px -40px 30px -40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .logo-section { }
        .logo-text { font-size: 32px; font-weight: bold; letter-spacing: 2px; }
        .logo-subtitle { font-size: 12px; opacity: 0.9; margin-top: 5px; }
        .doc-info { text-align: right; }
        .doc-number { font-size: 24px; font-weight: bold; color: #56A672; }
        .doc-date { font-size: 14px; opacity: 0.9; margin-top: 5px; }
        
        .section { margin-bottom: 25px; }
        .section-title { 
          font-size: 16px; 
          font-weight: bold; 
          color: #244673; 
          border-bottom: 2px solid #3290A6;
          padding-bottom: 8px;
          margin-bottom: 15px;
        }
        
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .info-box { 
          background: #f8f9fa; 
          padding: 15px; 
          border-radius: 8px;
          border-left: 4px solid #3290A6;
        }
        .info-label { font-size: 11px; color: #666; text-transform: uppercase; }
        .info-value { font-size: 14px; font-weight: 500; margin-top: 4px; }
        
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th { 
          background: #244673; 
          color: white; 
          padding: 12px 10px; 
          text-align: left;
          font-size: 12px;
          text-transform: uppercase;
        }
        td { 
          padding: 10px; 
          border-bottom: 1px solid #e0e0e0;
          font-size: 13px;
        }
        tr:nth-child(even) { background: #f8f9fa; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        .totals-box {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }
        .total-row { 
          display: flex; 
          justify-content: space-between; 
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .total-row:last-child { border-bottom: none; }
        .total-row.final { 
          font-size: 18px; 
          font-weight: bold; 
          color: #244673;
          padding-top: 15px;
          border-top: 2px solid #244673;
        }
        
        .terms-section {
          background: #fff3cd;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #ffc107;
          font-size: 12px;
          margin-top: 20px;
        }
        
        .footer {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: #3290A6;
          color: white;
          padding: 15px 40px;
          text-align: center;
          font-size: 11px;
        }
        
        .badge { 
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: bold;
        }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
        .badge-info { background: #d1ecf1; color: #0c5460; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="logo-section">
            <div class="logo-text">MEKANOS S.A.S</div>
            <div class="logo-subtitle">Soluciones en Mantenimiento Industrial</div>
          </div>
          <div class="doc-info">
            <div class="doc-number">${cotizacion.numero_cotizacion}</div>
            <div class="doc-date">Fecha: ${new Date(cotizacion.fecha_cotizacion).toLocaleDateString('es-CO')}</div>
            <div class="doc-date">Vence: ${cotizacion.fecha_vencimiento ? new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-CO') : 'N/A'}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">📋 Información General</div>
          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Cliente</div>
              <div class="info-value">${cotizacion.cliente?.persona?.nombres || 'Cliente no especificado'} ${cotizacion.cliente?.persona?.apellidos || ''}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Estado</div>
              <div class="info-value">
                <span class="badge badge-info">${cotizacion.estado?.nombre_estado || 'BORRADOR'}</span>
              </div>
            </div>
            <div class="info-box">
              <div class="info-label">Asunto</div>
              <div class="info-value">${cotizacion.asunto || 'Cotización de servicios'}</div>
            </div>
            <div class="info-box">
              <div class="info-label">Tiempo Estimado</div>
              <div class="info-value">${cotizacion.tiempo_estimado_dias || 'Por definir'} días</div>
            </div>
          </div>
        </div>

        ${cotizacion.alcance_trabajo ? `
        <div class="section">
          <div class="section-title">🎯 Alcance del Trabajo</div>
          <p style="font-size: 13px; color: #555;">${cotizacion.alcance_trabajo}</p>
        </div>
        ` : ''}

        ${itemsServicios.length > 0 ? `
        <div class="section">
          <div class="section-title">🔧 Servicios</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Descripción</th>
                <th class="text-center">Cantidad</th>
                <th class="text-right">Precio Unit.</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsServicios.map(item => `
                <tr>
                  <td>${item.descripcion || item.servicio?.nombre_servicio || 'Servicio'}</td>
                  <td class="text-center">${item.cantidad || 1}</td>
                  <td class="text-right">${formatCurrency(item.precio_unitario)}</td>
                  <td class="text-right">${formatCurrency(item.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${itemsComponentes.length > 0 ? `
        <div class="section">
          <div class="section-title">🔩 Componentes / Repuestos</div>
          <table>
            <thead>
              <tr>
                <th style="width: 40%;">Descripción</th>
                <th class="text-center">Cantidad</th>
                <th class="text-right">Precio Unit.</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsComponentes.map(item => `
                <tr>
                  <td>${item.descripcion || item.catalogo_componentes?.nombre_componente || 'Componente'}</td>
                  <td class="text-center">${item.cantidad || 1}</td>
                  <td class="text-right">${formatCurrency(item.precio_unitario)}</td>
                  <td class="text-right">${formatCurrency(item.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="totals-box">
          <div class="total-row">
            <span>Subtotal Servicios</span>
            <span>${formatCurrency(cotizacion.subtotal_servicios || 0)}</span>
          </div>
          <div class="total-row">
            <span>Subtotal Componentes</span>
            <span>${formatCurrency(cotizacion.subtotal_componentes || 0)}</span>
          </div>
          <div class="total-row">
            <span>Descuento (${cotizacion.descuento_porcentaje || 0}%)</span>
            <span>-${formatCurrency(cotizacion.descuento_valor || 0)}</span>
          </div>
          <div class="total-row">
            <span>IVA (${cotizacion.iva_porcentaje || 19}%)</span>
            <span>${formatCurrency(cotizacion.iva_valor || 0)}</span>
          </div>
          <div class="total-row final">
            <span>TOTAL COTIZACIÓN</span>
            <span>${formatCurrency(cotizacion.total_cotizacion || 0)}</span>
          </div>
        </div>

        ${cotizacion.terminos_condiciones ? `
        <div class="terms-section">
          <strong>📋 Términos y Condiciones:</strong>
          <p style="margin: 10px 0 0 0;">${cotizacion.terminos_condiciones}</p>
        </div>
        ` : ''}

        <div class="footer">
          <p style="margin: 0;">
            MEKANOS S.A.S | NIT: XXX.XXX.XXX-X | Tel: +57 XXX XXX XXXX<br>
            Bogotá, Colombia | www.mekanos.com.co | info@mekanos.com.co
          </p>
        </div>
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
    
    console.log(`   ✅ PDF generado: ${cotizacion.numero_cotizacion} (${(pdfBuffer.length / 1024).toFixed(2)} KB)`);
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('   ❌ Error generando PDF:', error.message);
    return null;
  }
}

async function testEnviarEmailCotizacion(cotizacion, pdfBuffer) {
  console.log('\n📨 TEST 3: Enviando email de cotización...');
  
  if (!pdfBuffer) {
    console.log('   ⚠️ No hay PDF para enviar');
    return false;
  }
  
  try {
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    
    const mailOptions = {
      from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
      to: TEST_EMAIL_DESTINO,
      subject: `📋 [COTIZACIÓN] ${cotizacion.numero_cotizacion} - ${cotizacion.asunto || 'MEKANOS S.A.S'}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #244673 0%, #1a3456 100%); color: white; padding: 30px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">MEKANOS S.A.S</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Soluciones en Mantenimiento Industrial</p>
          </div>
          
          <div style="padding: 30px; background: #f5f5f5;">
            <h2 style="color: #244673; margin-top: 0;">📋 Cotización ${cotizacion.numero_cotizacion}</h2>
            
            <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Asunto:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${cotizacion.asunto || 'Cotización de servicios'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Fecha:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${new Date(cotizacion.fecha_cotizacion).toLocaleDateString('es-CO')}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Válida hasta:</strong></td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${cotizacion.fecha_vencimiento ? new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-CO') : 'No especificada'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0;"><strong>Total:</strong></td>
                  <td style="padding: 10px 0; font-size: 20px; color: #244673; font-weight: bold;">
                    ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(cotizacion.total_cotizacion || 0)}
                  </td>
                </tr>
              </table>
            </div>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
              <p style="margin: 0; color: #155724;">
                📎 <strong>Archivo adjunto:</strong> ${cotizacion.numero_cotizacion}.pdf
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Estimado cliente, adjunto encontrará la cotización solicitada con el detalle completo de servicios y componentes.
              <br><br>
              Para cualquier consulta, no dude en contactarnos.
            </p>
          </div>
          
          <div style="background: #3290A6; color: white; padding: 20px; text-align: center;">
            <p style="margin: 0;">
              © 2025 MEKANOS S.A.S - Todos los derechos reservados<br>
              <small>Este es un email generado automáticamente - TEST E2E FASE 4</small>
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `${cotizacion.numero_cotizacion}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`   ✅ Email enviado exitosamente`);
    console.log(`   📬 Message ID: ${info.messageId}`);
    console.log(`   📧 Destino: ${TEST_EMAIL_DESTINO}`);
    return true;
  } catch (error) {
    console.error('   ❌ Error enviando email:', error.message);
    return false;
  }
}

async function testCrearCotizacionDemo() {
  console.log('\n🆕 TEST 4: Verificando creación de cotización demo...');
  
  try {
    // Obtener datos necesarios
    const cliente = await prisma.clientes.findFirst();
    const estadoBorrador = await prisma.estados_cotizacion.findFirst({
      where: { nombre_estado: 'BORRADOR' }
    });
    
    if (!cliente || !estadoBorrador) {
      console.log('   ⚠️ Faltan datos para crear cotización demo');
      return null;
    }
    
    // Verificar si ya existe una cotización de prueba reciente
    const cotizacionExistente = await prisma.cotizaciones.findFirst({
      where: {
        asunto: { contains: 'TEST E2E' }
      },
      orderBy: { fecha_creacion: 'desc' }
    });
    
    if (cotizacionExistente) {
      console.log(`   ✅ Cotización de prueba existente: ${cotizacionExistente.numero_cotizacion}`);
      return cotizacionExistente;
    }
    
    // Generar número de cotización
    const ultimaCotizacion = await prisma.cotizaciones.findFirst({
      orderBy: { id_cotizacion: 'desc' }
    });
    
    const year = new Date().getFullYear();
    const secuencial = ultimaCotizacion ? 
      parseInt(ultimaCotizacion.numero_cotizacion.split('-')[2]) + 1 : 1;
    const numeroCotizacion = `COT-${year}-${String(secuencial).padStart(4, '0')}`;
    
    console.log(`   📝 Creando cotización demo: ${numeroCotizacion}`);
    
    const nuevaCotizacion = await prisma.cotizaciones.create({
      data: {
        numero_cotizacion: numeroCotizacion,
        id_cliente: cliente.id_cliente,
        id_estado: estadoBorrador.id_estado_cotizacion,
        fecha_cotizacion: new Date(),
        fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
        asunto: '[TEST E2E] Mantenimiento Preventivo Generador',
        alcance_trabajo: 'Servicio completo de mantenimiento preventivo incluyendo cambio de aceite, filtros y revisión general del equipo.',
        subtotal_servicios: 1500000,
        subtotal_componentes: 500000,
        subtotal_general: 2000000,
        descuento_porcentaje: 5,
        descuento_valor: 100000,
        subtotal_con_descuento: 1900000,
        iva_porcentaje: 19,
        iva_valor: 361000,
        total_cotizacion: 2261000,
        tiempo_estimado_dias: 5,
        forma_pago: 'CREDITO_30',
        terminos_condiciones: 'Precios válidos por 30 días. El trabajo se realizará en horario laboral. Garantía de 6 meses sobre mano de obra.',
        meses_garantia: 6,
        elaborada_por: 'Sistema TEST E2E'
      },
      include: {
        cliente: { include: { persona: true } },
        estado: true
      }
    });
    
    console.log(`   ✅ Cotización creada: ${nuevaCotizacion.numero_cotizacion}`);
    console.log(`   💰 Total: ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(nuevaCotizacion.total_cotizacion)}`);
    
    return nuevaCotizacion;
  } catch (error) {
    console.error('   ❌ Error creando cotización:', error.message);
    return null;
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('='.repeat(70));
  console.log('🧪 MEKANOS S.A.S - TEST E2E FASE 4 (COTIZACIONES)');
  console.log('='.repeat(70));
  console.log(`📅 Fecha: ${new Date().toLocaleString('es-CO')}`);
  console.log(`📧 Email destino: ${TEST_EMAIL_DESTINO}`);
  console.log('='.repeat(70));
  
  const results = {
    database: false,
    crearCotizacion: false,
    pdfGeneration: false,
    emailEnvio: false,
  };
  
  // Test 1: Database
  const dbData = await testDatabase();
  results.database = dbData !== null;
  
  // Test 2: Crear o usar cotización existente
  let cotizacion = null;
  if (dbData && dbData.cotizaciones.length > 0) {
    cotizacion = dbData.cotizaciones[0];
    console.log(`\n   📌 Usando cotización existente: ${cotizacion.numero_cotizacion}`);
    results.crearCotizacion = true;
  } else {
    cotizacion = await testCrearCotizacionDemo();
    results.crearCotizacion = cotizacion !== null;
  }
  
  // Test 3: Generar PDF
  let pdfBuffer = null;
  if (cotizacion) {
    // Recargar con todas las relaciones
    const cotizacionCompleta = await prisma.cotizaciones.findUnique({
      where: { id_cotizacion: cotizacion.id_cotizacion },
      include: {
        cliente: { include: { persona: true } },
        estado: true
      }
    });
    pdfBuffer = await testGenerarPDFCotizacion(cotizacionCompleta);
    results.pdfGeneration = pdfBuffer !== null;
  }
  
  // Test 4: Enviar Email
  if (cotizacion && pdfBuffer) {
    results.emailEnvio = await testEnviarEmailCotizacion(cotizacion, pdfBuffer);
  }
  
  // Resumen
  console.log('\n');
  console.log('='.repeat(70));
  console.log('📋 RESUMEN DE PRUEBAS FASE 4');
  console.log('='.repeat(70));
  console.log(`   Base de datos:       ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Crear Cotización:    ${results.crearCotizacion ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Generar PDF:         ${results.pdfGeneration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Enviar Email:        ${results.emailEnvio ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(70));
  
  const allPassed = Object.values(results).every(r => r);
  if (allPassed) {
    console.log('🎉 ¡TODOS LOS TESTS DE FASE 4 PASARON EXITOSAMENTE!');
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
