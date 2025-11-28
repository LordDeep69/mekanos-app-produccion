/**
 * ============================================================================
 * TEST E2E SIMPLIFICADO - MEKANOS S.A.S
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const crypto = require('crypto');

const prisma = new PrismaClient();

const SMTP_CONFIG = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'mekanossas4@gmail.com',
    pass: 'jvsd znpw hsfv jgmy'
  }
};

const TEST_EMAIL = 'lorddeep3@gmail.com';

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST E2E COMPLETO - MEKANOS S.A.S');
  console.log('='.repeat(60));
  
  try {
    // ========== PASO 1: Obtener datos base ==========
    console.log('\n📌 PASO 1: Obteniendo datos base...');
    
    const cliente = await prisma.clientes.findFirst({
      where: { cliente_activo: true },
      include: { persona: true }
    });
    console.log(`   ✅ Cliente: ${cliente?.persona?.razon_social || cliente?.persona?.nombre_completo}`);
    
    const tecnico = await prisma.empleados.findFirst({
      where: { es_tecnico: true, empleado_activo: true },
      include: { persona: true }
    });
    console.log(`   ✅ Técnico: ${tecnico?.persona?.nombre_completo} (${tecnico?.codigo_empleado})`);
    
    const equipo = await prisma.equipos.findFirst({
      where: { activo: true },
      include: { tipo_equipo: true }
    });
    console.log(`   ✅ Equipo: ${equipo?.nombre_equipo}`);
    
    const tipoServicio = await prisma.tipos_servicio.findFirst();
    console.log(`   ✅ Tipo servicio: ${tipoServicio?.nombre_tipo}`);
    
    const estadoProgramada = await prisma.estados_orden.findFirst({
      where: { nombre_estado: 'Programada' }
    });
    console.log(`   ✅ Estado: ${estadoProgramada?.nombre_estado}`);
    
    const usuario = await prisma.usuarios.findFirst({
      where: { estado: 'ACTIVO' }
    });
    console.log(`   ✅ Usuario: ${usuario?.username}`);
    
    if (!cliente || !tecnico || !equipo || !estadoProgramada || !usuario) {
      throw new Error('Faltan datos base necesarios');
    }
    
    // ========== PASO 2: Crear orden de servicio ==========
    console.log('\n📌 PASO 2: Creando orden de servicio...');
    
    const ultimaOrden = await prisma.ordenes_servicio.findFirst({
      orderBy: { id_orden_servicio: 'desc' }
    });
    const secuencial = ultimaOrden ? 
      parseInt((ultimaOrden.numero_orden.match(/\d+$/) || ['0'])[0]) + 1 : 1;
    const numeroOrden = `OS-2025-${String(secuencial).padStart(4, '0')}`;
    
    const orden = await prisma.ordenes_servicio.create({
      data: {
        numero_orden: numeroOrden,
        id_cliente: cliente.id_cliente,
        id_equipo: equipo.id_equipo,
        id_tipo_servicio: tipoServicio?.id_tipo_servicio || null,
        fecha_programada: new Date(),
        prioridad: 'NORMAL',
        origen_solicitud: 'PROGRAMADO',
        id_tecnico_asignado: tecnico.id_empleado,
        fecha_asignacion: new Date(),
        id_estado_actual: estadoProgramada.id_estado,
        descripcion_inicial: 'Mantenimiento preventivo TIPO A - Generador de emergencia 500kVA. Incluye cambio de aceite, filtros, revisión de sistemas.',
        requiere_firma_cliente: true,
        creado_por: usuario.id_usuario,
        trabajo_realizado: `
MANTENIMIENTO PREVENTIVO TIPO A - GENERADOR 500KVA

1. INSPECCIÓN VISUAL
   - Conexiones eléctricas: OK
   - Fugas de aceite/combustible: Sin fugas
   - Mangueras y correas: Buen estado

2. SISTEMA DE LUBRICACIÓN
   - Cambio aceite motor: 15W-40 (18L)
   - Cambio filtro aceite: CAT 1R-0716

3. SISTEMA DE COMBUSTIBLE
   - Filtro combustible primario: Reemplazado
   - Filtro combustible secundario: Reemplazado

4. SISTEMA ELÉCTRICO
   - Voltaje baterías: 24.5V DC
   - Alternador: 28V DC

5. PRUEBAS
   - Arranque: OK (3 seg)
   - Prueba carga 75%: 1 hora
   - Frecuencia: 60 Hz
   - Voltaje: 440V trifásico
        `.trim(),
        observaciones_tecnico: 'Equipo en excelente estado. Próximo mantenimiento en 250 horas.',
        fecha_inicio_real: new Date(),
        fecha_fin_real: new Date()
      }
    });
    
    console.log(`   ✅ Orden creada: ${orden.numero_orden}`);
    
    // ========== PASO 3: Registrar firma digital ==========
    console.log('\n📌 PASO 3: Registrando firma digital...');
    
    // Firma simulada (base64 de una imagen simple)
    const firmaBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const hashFirma = crypto.createHash('sha256').update(firmaBase64).digest('hex');
    
    const firma = await prisma.firmas_digitales.create({
      data: {
        id_persona: cliente.id_persona,
        tipo_firma: 'CLIENTE',
        firma_base64: firmaBase64,
        formato_firma: 'PNG',
        hash_firma: hashFirma,
        fecha_captura: new Date(),
        es_firma_principal: false,
        activa: true,
        observaciones: `Firma para orden ${numeroOrden}`,
        registrada_por: usuario.id_usuario
      }
    });
    
    console.log(`   ✅ Firma registrada: ID ${firma.id_firma_digital}`);
    
    // Actualizar orden con firma
    await prisma.ordenes_servicio.update({
      where: { id_orden_servicio: orden.id_orden_servicio },
      data: {
        id_firma_cliente: firma.id_firma_digital,
        nombre_quien_recibe: 'Juan Pérez Martínez',
        cargo_quien_recibe: 'Jefe de Mantenimiento',
        cliente_conforme: true,
        calificacion_cliente: 5
      }
    });
    
    console.log(`   ✅ Orden actualizada con firma del cliente`);
    
    // ========== PASO 4: Registrar evidencia fotográfica ==========
    console.log('\n📌 PASO 4: Registrando evidencia fotográfica...');
    
    const evidencia = await prisma.evidencias_fotograficas.create({
      data: {
        id_orden_servicio: orden.id_orden_servicio,
        tipo_evidencia: 'DURANTE',
        descripcion: 'Cambio de filtros de aceite y combustible',
        nombre_archivo: `evidencia_${numeroOrden}_001.jpg`,
        ruta_archivo: `https://res.cloudinary.com/mekanos/image/upload/evidencias/${numeroOrden}/img_001.jpg`,
        hash_sha256: crypto.createHash('sha256').update(`evidencia_${Date.now()}`).digest('hex'),
        tama_o_bytes: 245760,
        mime_type: 'image/jpeg',
        ancho_pixels: 1920,
        alto_pixels: 1080,
        orden_visualizacion: 1,
        es_principal: true,
        fecha_captura: new Date(),
        capturada_por: tecnico.id_empleado
      }
    });
    
    console.log(`   ✅ Evidencia registrada: ${evidencia.nombre_archivo}`);
    
    // ========== PASO 5: Generar PDF del informe ==========
    console.log('\n📌 PASO 5: Generando PDF del informe...');
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const htmlInforme = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #333; }
        .page { padding: 30px; }
        .header { background: #244673; color: white; padding: 20px; margin: -30px -30px 20px; display: flex; justify-content: space-between; }
        .logo { font-size: 24px; font-weight: bold; }
        .doc-info { text-align: right; }
        .doc-num { font-size: 16px; color: #56A672; }
        .section { margin-bottom: 15px; }
        .section-title { font-size: 12px; font-weight: bold; color: #244673; border-bottom: 2px solid #3290A6; padding-bottom: 5px; margin-bottom: 10px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .field { background: #f5f5f5; padding: 8px; border-left: 3px solid #3290A6; }
        .field-label { font-size: 9px; color: #666; text-transform: uppercase; }
        .field-value { font-size: 11px; font-weight: 500; }
        .work-content { background: #f9f9f9; padding: 15px; border-radius: 5px; white-space: pre-line; font-size: 10px; line-height: 1.4; }
        .signature-box { border: 1px solid #ccc; padding: 15px; text-align: center; margin-top: 20px; }
        .signature-line { border-top: 1px solid #333; width: 200px; margin: 40px auto 5px; }
        .footer { background: #3290A6; color: white; padding: 10px; text-align: center; font-size: 9px; position: fixed; bottom: 0; left: 0; right: 0; }
        .rating { color: #f39c12; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div>
            <div class="logo">MEKANOS S.A.S</div>
            <div style="font-size: 10px; opacity: 0.9;">Soluciones en Mantenimiento Industrial</div>
          </div>
          <div class="doc-info">
            <div class="doc-num">${numeroOrden}</div>
            <div>Fecha: ${new Date().toLocaleDateString('es-CO')}</div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">📋 INFORMACIÓN DEL SERVICIO</div>
          <div class="grid">
            <div class="field">
              <div class="field-label">Cliente</div>
              <div class="field-value">${cliente.persona?.razon_social || cliente.persona?.nombre_completo}</div>
            </div>
            <div class="field">
              <div class="field-label">Equipo</div>
              <div class="field-value">${equipo.nombre_equipo}</div>
            </div>
            <div class="field">
              <div class="field-label">Tipo de Servicio</div>
              <div class="field-value">${tipoServicio?.nombre_tipo || 'Mantenimiento Preventivo'}</div>
            </div>
            <div class="field">
              <div class="field-label">Técnico</div>
              <div class="field-value">${tecnico.persona?.nombre_completo} (${tecnico.codigo_empleado})</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">🔧 TRABAJO REALIZADO</div>
          <div class="work-content">${orden.trabajo_realizado}</div>
        </div>
        
        <div class="section">
          <div class="section-title">📝 OBSERVACIONES</div>
          <p style="padding: 10px; background: #fff3cd; border-left: 3px solid #ffc107;">
            ${orden.observaciones_tecnico}
          </p>
        </div>
        
        <div class="section">
          <div class="section-title">✅ CONFORMIDAD DEL CLIENTE</div>
          <div class="grid">
            <div class="signature-box">
              <p><strong>Recibido por:</strong></p>
              <div class="signature-line"></div>
              <p>Juan Pérez Martínez</p>
              <p style="color: #666; font-size: 9px;">Jefe de Mantenimiento</p>
            </div>
            <div class="signature-box">
              <p><strong>Técnico:</strong></p>
              <div class="signature-line"></div>
              <p>${tecnico.persona?.nombre_completo}</p>
              <p style="color: #666; font-size: 9px;">${tecnico.codigo_empleado}</p>
            </div>
          </div>
          <p style="text-align: center; margin-top: 15px;">
            <strong>Calificación del servicio:</strong> 
            <span class="rating">★★★★★</span> (5/5)
          </p>
        </div>
        
        <div class="footer">
          MEKANOS S.A.S | NIT: 900.XXX.XXX-X | Cartagena, Colombia | www.mekanos.com.co
        </div>
      </div>
    </body>
    </html>
    `;
    
    await page.setContent(htmlInforme, { waitUntil: 'load' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '40px', left: '0' }
    });
    
    await browser.close();
    
    console.log(`   ✅ PDF generado: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    
    // ========== PASO 6: Registrar documento generado ==========
    console.log('\n📌 PASO 6: Registrando documento en BD...');
    
    const hashPdf = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
    const rutaPdf = `https://mekanos-documentos.r2.cloudflarestorage.com/informes/${numeroOrden}.pdf`;
    
    const documento = await prisma.documentos_generados.create({
      data: {
        tipo_documento: 'INFORME_SERVICIO',
        id_referencia: orden.id_orden_servicio,
        numero_documento: numeroOrden,
        ruta_archivo: rutaPdf,
        hash_sha256: hashPdf,
        tama_o_bytes: pdfBuffer.length,
        mime_type: 'application/pdf',
        numero_paginas: 1,
        generado_por: usuario.id_usuario,
        herramienta_generacion: 'Puppeteer'
      }
    });
    
    console.log(`   ✅ Documento registrado: ID ${documento.id_documento}`);
    
    // ========== PASO 7: Crear informe ==========
    console.log('\n📌 PASO 7: Creando registro de informe...');
    
    const informe = await prisma.informes.create({
      data: {
        numero_informe: `INF-${numeroOrden}`,
        id_orden_servicio: orden.id_orden_servicio,
        generado_por: usuario.id_usuario,
        estado_informe: 'APROBADO',
        id_documento_pdf: documento.id_documento,
        aprobado_por: usuario.id_usuario,
        fecha_aprobacion: new Date()
      }
    });
    
    console.log(`   ✅ Informe creado: ${informe.numero_informe}`);
    
    // ========== PASO 8: Enviar email ==========
    console.log('\n📌 PASO 8: Enviando email al cliente...');
    
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    
    const mailOptions = {
      from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
      to: TEST_EMAIL,
      subject: `📋 Informe de Servicio ${numeroOrden} - MEKANOS S.A.S`,
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
          <div style="background: #244673; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">MEKANOS S.A.S</h1>
            <p style="margin: 5px 0;">Soluciones en Mantenimiento Industrial</p>
          </div>
          
          <div style="padding: 25px; background: #f5f5f5;">
            <h2 style="color: #244673;">✅ Servicio Completado</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Orden:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${numeroOrden}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Equipo:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${equipo.nombre_equipo}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Servicio:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${tipoServicio?.nombre_tipo || 'Mantenimiento Preventivo'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Técnico:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${tecnico.persona?.nombre_completo}</td></tr>
                <tr><td style="padding: 8px;"><strong>Fecha:</strong></td><td style="padding: 8px;">${new Date().toLocaleDateString('es-CO')}</td></tr>
              </table>
            </div>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
              <p style="margin: 0;"><strong>📎 Archivo adjunto:</strong> ${numeroOrden}.pdf</p>
            </div>
            
            <p style="color: #666; margin-top: 20px;">
              Adjunto encontrará el informe completo del servicio realizado.
              Para cualquier consulta, no dude en contactarnos.
            </p>
          </div>
          
          <div style="background: #3290A6; color: white; padding: 15px; text-align: center;">
            <p style="margin: 0;">© 2025 MEKANOS S.A.S - TEST E2E COMPLETADO ✅</p>
          </div>
        </div>
      `,
      attachments: [{
        filename: `${numeroOrden}.pdf`,
        content: Buffer.from(pdfBuffer),
        contentType: 'application/pdf'
      }]
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log(`   ✅ Email enviado: ${info.messageId}`);
    console.log(`   📧 Destino: ${TEST_EMAIL}`);
    
    // ========== PASO 9: Finalizar orden ==========
    console.log('\n📌 PASO 9: Finalizando orden...');
    
    const estadoCompletada = await prisma.estados_orden.findFirst({
      where: { nombre_estado: 'Completada' }
    });
    
    await prisma.ordenes_servicio.update({
      where: { id_orden_servicio: orden.id_orden_servicio },
      data: {
        id_estado_actual: estadoCompletada?.id_estado || orden.id_estado_actual,
        fecha_cambio_estado: new Date(),
        observaciones_cierre: 'Servicio completado satisfactoriamente. Cliente conforme.'
      }
    });
    
    console.log(`   ✅ Orden finalizada: ${numeroOrden}`);
    
    // ========== RESUMEN ==========
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST E2E COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log(`   📋 Orden: ${numeroOrden}`);
    console.log(`   👤 Cliente: ${cliente.persona?.razon_social || cliente.persona?.nombre_completo}`);
    console.log(`   ⚙️ Equipo: ${equipo.nombre_equipo}`);
    console.log(`   🔧 Técnico: ${tecnico.persona?.nombre_completo}`);
    console.log(`   📄 PDF: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`   📧 Email: ${TEST_EMAIL}`);
    console.log(`   ✍️ Firma: ID ${firma.id_firma_digital}`);
    console.log(`   📷 Evidencia: ${evidencia.nombre_archivo}`);
    console.log(`   📝 Informe: ${informe.numero_informe}`);
    console.log('='.repeat(60));
    console.log('📧 Revisa tu bandeja de entrada: ' + TEST_EMAIL);
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
