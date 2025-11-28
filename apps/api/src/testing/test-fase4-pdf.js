/**
 * TEST PDF COTIZACIÓN - MEKANOS S.A.S
 */

const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

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

async function main() {
  console.log('\n🔧 Iniciando generación de PDF...');
  
  // Obtener cotización
  const cotizacion = await prisma.cotizaciones.findFirst({
    include: {
      cliente: { include: { persona: true } },
      estado: true
    }
  });
  
  if (!cotizacion) {
    console.log('❌ No hay cotizaciones');
    return;
  }
  
  console.log(`📋 Cotización: ${cotizacion.numero_cotizacion}`);
  
  // Obtener items
  const items = await prisma.items_cotizacion_servicios.findMany({
    where: { id_cotizacion: cotizacion.id_cotizacion },
    include: { servicio: true }
  });
  
  const formatCurrency = (value) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0 
    }).format(value);
  };
  
  // HTML para PDF
  const itemsHtml = items.map(item => `
    <tr>
      <td>${item.descripcion || item.servicio?.nombre_servicio || 'Servicio'}</td>
      <td class="text-center">${item.cantidad || 1}</td>
      <td class="text-right">${formatCurrency(item.precio_unitario)}</td>
      <td class="text-right">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('');
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; color: #333; font-size: 12px; }
      .page { padding: 40px; }
      .header { background: #244673; color: white; padding: 20px; margin: -40px -40px 30px -40px; display: flex; justify-content: space-between; }
      .logo-text { font-size: 24px; font-weight: bold; }
      .doc-number { font-size: 18px; color: #56A672; font-weight: bold; }
      .section { margin-bottom: 20px; }
      .section-title { font-size: 14px; font-weight: bold; color: #244673; border-bottom: 2px solid #3290A6; padding-bottom: 5px; margin-bottom: 10px; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
      .info-box { background: #f8f9fa; padding: 10px; border-left: 3px solid #3290A6; }
      .info-label { font-size: 10px; color: #666; text-transform: uppercase; }
      .info-value { font-size: 12px; font-weight: 500; margin-top: 3px; }
      table { width: 100%; border-collapse: collapse; margin: 10px 0; }
      th { background: #244673; color: white; padding: 8px; text-align: left; font-size: 11px; }
      td { padding: 8px; border-bottom: 1px solid #e0e0e0; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .totals { background: #f8f9fa; padding: 15px; border-radius: 5px; }
      .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
      .total-final { font-size: 16px; font-weight: bold; color: #244673; padding-top: 10px; border-top: 2px solid #244673; }
      .footer { position: fixed; bottom: 0; left: 0; right: 0; background: #3290A6; color: white; padding: 10px; text-align: center; font-size: 10px; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <div>
          <div class="logo-text">MEKANOS S.A.S</div>
          <div style="font-size: 10px; opacity: 0.9;">Soluciones en Mantenimiento Industrial</div>
        </div>
        <div style="text-align: right;">
          <div class="doc-number">${cotizacion.numero_cotizacion}</div>
          <div style="font-size: 11px; margin-top: 5px;">
            Fecha: ${new Date(cotizacion.fecha_cotizacion).toLocaleDateString('es-CO')}<br>
            Vence: ${cotizacion.fecha_vencimiento ? new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-CO') : 'N/A'}
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">📋 Información General</div>
        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">Cliente</div>
            <div class="info-value">${cotizacion.cliente?.persona?.nombres || 'N/A'} ${cotizacion.cliente?.persona?.apellidos || ''}</div>
          </div>
          <div class="info-box">
            <div class="info-label">Estado</div>
            <div class="info-value">${cotizacion.estado?.nombre_estado || 'BORRADOR'}</div>
          </div>
          <div class="info-box" style="grid-column: span 2;">
            <div class="info-label">Asunto</div>
            <div class="info-value">${cotizacion.asunto || 'Cotización de servicios'}</div>
          </div>
        </div>
      </div>

      ${items.length > 0 ? `
      <div class="section">
        <div class="section-title">🔧 Servicios</div>
        <table>
          <thead>
            <tr>
              <th style="width: 40%;">Descripción</th>
              <th class="text-center">Cant.</th>
              <th class="text-right">P. Unitario</th>
              <th class="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">💰 Resumen de Costos</div>
        <div class="totals">
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
          <div class="total-row total-final">
            <span>TOTAL COTIZACIÓN</span>
            <span>${formatCurrency(cotizacion.total_cotizacion || 0)}</span>
          </div>
        </div>
      </div>

      ${cotizacion.alcance_trabajo ? `
      <div class="section">
        <div class="section-title">🎯 Alcance del Trabajo</div>
        <p style="font-size: 11px; color: #555; line-height: 1.5;">${cotizacion.alcance_trabajo}</p>
      </div>
      ` : ''}

      <div class="footer">
        MEKANOS S.A.S | Bogotá, Colombia | www.mekanos.com.co | Generado: ${new Date().toLocaleString('es-CO')}
      </div>
    </div>
  </body>
  </html>
  `;
  
  console.log('📄 Generando PDF con Puppeteer...');
  
  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '40px', left: '0' },
    });
    
    await browser.close();
    
    console.log(`✅ PDF generado: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    // Enviar email con PDF
    console.log('📧 Enviando email con PDF adjunto...');
    
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    
    const mailOptions = {
      from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
      to: TEST_EMAIL_DESTINO,
      subject: `📄 [PDF] ${cotizacion.numero_cotizacion} - ${cotizacion.asunto || 'MEKANOS S.A.S'}`,
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
          <div style="background: #244673; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">MEKANOS S.A.S</h1>
          </div>
          <div style="padding: 30px; background: #f5f5f5;">
            <h2 style="color: #244673;">📄 Cotización ${cotizacion.numero_cotizacion}</h2>
            <p>Adjunto encontrará la cotización en formato PDF.</p>
            <div style="background: #d4edda; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <strong>📎 Archivo adjunto:</strong> ${cotizacion.numero_cotizacion}.pdf
            </div>
            <p style="color: #666;">
              <strong>Total:</strong> ${formatCurrency(cotizacion.total_cotizacion || 0)}<br>
              <strong>Válida hasta:</strong> ${cotizacion.fecha_vencimiento ? new Date(cotizacion.fecha_vencimiento).toLocaleDateString('es-CO') : 'No especificada'}
            </p>
          </div>
          <div style="background: #3290A6; color: white; padding: 15px; text-align: center;">
            © 2025 MEKANOS S.A.S - TEST E2E FASE 4
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `${cotizacion.numero_cotizacion}.pdf`,
          content: Buffer.from(pdfBuffer),
          contentType: 'application/pdf',
        },
      ],
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email con PDF enviado exitosamente`);
    console.log(`   📬 Message ID: ${info.messageId}`);
    console.log(`   📧 Destino: ${TEST_EMAIL_DESTINO}`);
    console.log('\n🎉 ¡PDF + EMAIL FASE 4 COMPLETADO!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
