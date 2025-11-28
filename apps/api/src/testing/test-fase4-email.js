/**
 * ============================================================================
 * TEST RÁPIDO EMAIL - MEKANOS S.A.S - FASE 4 COTIZACIONES
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');

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
  console.log('\n======================================');
  console.log('🧪 TEST RÁPIDO FASE 4 - EMAIL COTIZACIÓN');
  console.log('======================================\n');
  
  // 1. Obtener cotización
  console.log('📋 Obteniendo cotización...');
  const cotizacion = await prisma.cotizaciones.findFirst({
    include: {
      cliente: { include: { persona: true } },
      estado: true
    }
  });
  
  if (!cotizacion) {
    console.log('❌ No hay cotizaciones en la base de datos');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`✅ Cotización: ${cotizacion.numero_cotizacion}`);
  console.log(`   Asunto: ${cotizacion.asunto}`);
  console.log(`   Total: ${cotizacion.total_cotizacion}`);
  
  // 2. Obtener items
  console.log('\n📦 Obteniendo items...');
  const items = await prisma.items_cotizacion_servicios.findMany({
    where: { id_cotizacion: cotizacion.id_cotizacion },
    include: { servicio: true }
  });
  console.log(`✅ ${items.length} items de servicio encontrados`);
  
  // 3. Enviar email
  console.log('\n📧 Enviando email...');
  const transporter = nodemailer.createTransport(SMTP_CONFIG);
  
  const formatCurrency = (value) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0 
    }).format(value);
  };
  
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.descripcion || item.servicio?.nombre_servicio || 'Servicio'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.cantidad || 1}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.precio_unitario)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.subtotal)}</td>
    </tr>
  `).join('');
  
  const mailOptions = {
    from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
    to: TEST_EMAIL_DESTINO,
    subject: `📋 [COTIZACIÓN] ${cotizacion.numero_cotizacion} - ${cotizacion.asunto || 'MEKANOS S.A.S'}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #244673 0%, #1a3456 100%); color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">MEKANOS S.A.S</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Soluciones en Mantenimiento Industrial</p>
        </div>
        
        <div style="padding: 30px; background: #f5f5f5;">
          <h2 style="color: #244673; margin-top: 0;">📋 Cotización ${cotizacion.numero_cotizacion}</h2>
          
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #3290A6; margin-top: 0;">Información General</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; width: 40%;"><strong>Asunto:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${cotizacion.asunto || 'Cotización de servicios'}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Cliente:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${cotizacion.cliente?.persona?.nombres || 'N/A'} ${cotizacion.cliente?.persona?.apellidos || ''}</td>
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
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Estado:</strong></td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
                  <span style="background: #d1ecf1; color: #0c5460; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">
                    ${cotizacion.estado?.nombre_estado || 'BORRADOR'}
                  </span>
                </td>
              </tr>
            </table>
          </div>
          
          ${items.length > 0 ? `
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #3290A6; margin-top: 0;">🔧 Servicios</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #244673; color: white;">
                  <th style="padding: 12px 10px; text-align: left;">Descripción</th>
                  <th style="padding: 12px 10px; text-align: center;">Cantidad</th>
                  <th style="padding: 12px 10px; text-align: right;">Precio Unit.</th>
                  <th style="padding: 12px 10px; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          <div style="background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h3 style="color: #3290A6; margin-top: 0;">💰 Resumen de Costos</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">Subtotal Servicios</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(cotizacion.subtotal_servicios || 0)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">Subtotal Componentes</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(cotizacion.subtotal_componentes || 0)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">Descuento (${cotizacion.descuento_porcentaje || 0}%)</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: #dc3545;">-${formatCurrency(cotizacion.descuento_valor || 0)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee;">IVA (${cotizacion.iva_porcentaje || 19}%)</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(cotizacion.iva_valor || 0)}</td>
              </tr>
              <tr style="font-size: 18px; font-weight: bold; color: #244673;">
                <td style="padding: 15px 0; border-top: 2px solid #244673;">TOTAL COTIZACIÓN</td>
                <td style="padding: 15px 0; border-top: 2px solid #244673; text-align: right;">${formatCurrency(cotizacion.total_cotizacion || 0)}</td>
              </tr>
            </table>
          </div>
          
          ${cotizacion.alcance_trabajo ? `
          <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
            <strong>📋 Alcance del trabajo:</strong>
            <p style="margin: 10px 0 0 0;">${cotizacion.alcance_trabajo}</p>
          </div>
          ` : ''}
          
          <div style="background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
            <p style="margin: 0; color: #155724;">
              ✅ <strong>TEST E2E FASE 4 - COTIZACIONES COMPLETADO</strong><br>
              <small>Este email confirma que el sistema de cotizaciones está funcionando correctamente.</small>
            </p>
          </div>
        </div>
        
        <div style="background: #3290A6; color: white; padding: 20px; text-align: center;">
          <p style="margin: 0;">
            © 2025 MEKANOS S.A.S - Todos los derechos reservados<br>
            <small>Fecha del test: ${new Date().toLocaleString('es-CO')}</small>
          </p>
        </div>
      </div>
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email enviado exitosamente`);
    console.log(`   📬 Message ID: ${info.messageId}`);
    console.log(`   📧 Destino: ${TEST_EMAIL_DESTINO}`);
    console.log('\n🎉 ¡TEST FASE 4 COMPLETADO EXITOSAMENTE!');
    console.log(`📧 Revisa tu bandeja de entrada: ${TEST_EMAIL_DESTINO}`);
  } catch (error) {
    console.error('❌ Error enviando email:', error.message);
  }
  
  await prisma.$disconnect();
  console.log('\n======================================\n');
}

main().catch(console.error);
