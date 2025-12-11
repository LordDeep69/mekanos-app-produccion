/**
 * ============================================================================
 * TEST E2E FINAL - MEKANOS S.A.S
 * ============================================================================
 * Test completo con manejo robusto de errores y timeout
 */

const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Timeout global
const TIMEOUT = 120000;
let timeoutId;

// Cloudinary
cloudinary.config({
  cloud_name: 'dibw7aluj',
  api_key: '643988218551617',
  api_secret: 'ipcTGt7Kf1NQmYp-ToZtXJX2zJc'
});

// R2
const R2 = {
  accountId: 'df62bcb5510c62b7ba5dedf3e065c566',
  bucketName: 'mekanos-plantas-produccion',
  accessKeyId: '0e6cbcc0d1350f4de86c5c8489adad32',
  secretAccessKey: '4a637e26da1ad7f0028f6e81c1a45993f598d1b485c3b0ba47acef27c6c4462f'
};

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2.accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2.accessKeyId, secretAccessKey: R2.secretAccessKey }
});

// Email
const SMTP = {
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: 'mekanossas4@gmail.com', pass: 'jvsd znpw hsfv jgmy' }
};
const TEST_EMAIL = 'lorddeep3@gmail.com';
const IMAGEN_PRUEBA = 'C:\\Users\\Usuario\\Downloads\\mekanosApp\\BASE DE DATOS\\MEKANOS_DB\\REFACTORIZATION\\PRUEBA_PARA_TEST_E2E_FASE3Y4.jpg';

// Colores MEKANOS
const M = { azul: '#244673', azulClaro: '#3290A6', verde: '#56A672', verdeClaro: '#9EC23D', blanco: '#F2F2F2' };

function log(step, msg, ok = true) {
  const icon = ok ? '✅' : '⏳';
  console.log(`[${step}] ${icon} ${msg}`);
}

async function main() {
  console.log('\n🚀 TEST E2E FINAL - MEKANOS S.A.S');
  console.log('='.repeat(50));
  
  const ts = Date.now();
  let resultados = { success: false, pasos: [] };
  
  // Timeout de seguridad
  timeoutId = setTimeout(() => {
    console.error('\n⏰ TIMEOUT: El test excedió 2 minutos');
    fs.writeFileSync(path.join(__dirname, 'e2e-final-timeout.json'), JSON.stringify(resultados, null, 2));
    process.exit(1);
  }, TIMEOUT);

  try {
    // ===============================================
    // PASO 1: SUBIR IMAGEN A CLOUDINARY
    // ===============================================
    console.log('\n📷 PASO 1: Cloudinary...');
    if (!fs.existsSync(IMAGEN_PRUEBA)) throw new Error('Imagen no encontrada: ' + IMAGEN_PRUEBA);
    
    const cloudRes = await cloudinary.uploader.upload(IMAGEN_PRUEBA, {
      folder: 'mekanos/evidencias/e2e', public_id: `ev_${ts}`, resource_type: 'image'
    });
    log(1, `URL: ${cloudRes.secure_url.substring(0, 70)}...`);
    resultados.pasos.push({ paso: 1, ok: true, cloudinaryUrl: cloudRes.secure_url });

    // ===============================================
    // PASO 2: OBTENER DATOS DE BD
    // ===============================================
    console.log('\n📊 PASO 2: Datos BD...');
    const [cliente, tecnico, equipo, estadoP, estadoC, usuario, tipoServ] = await Promise.all([
      prisma.clientes.findFirst({ where: { cliente_activo: true }, include: { persona: true } }),
      prisma.empleados.findFirst({ where: { es_tecnico: true, empleado_activo: true }, include: { persona: true } }),
      prisma.equipos.findFirst({ where: { activo: true } }),
      prisma.estados_orden.findFirst({ where: { nombre_estado: 'Programada' } }),
      prisma.estados_orden.findFirst({ where: { nombre_estado: 'Completada' } }),
      prisma.usuarios.findFirst({ where: { estado: 'ACTIVO' } }),
      prisma.tipos_servicio.findFirst()
    ]);
    
    if (!cliente || !tecnico || !equipo || !estadoP || !usuario) {
      throw new Error('Datos faltantes en BD: ' + JSON.stringify({cliente: !!cliente, tecnico: !!tecnico, equipo: !!equipo, estadoP: !!estadoP, usuario: !!usuario}));
    }
    log(2, `Cliente: ${cliente.persona?.razon_social || cliente.persona?.nombre_completo}, Técnico: ${tecnico.persona?.nombre_completo}`);
    resultados.pasos.push({ paso: 2, ok: true });

    // ===============================================
    // PASO 3: CREAR ORDEN DE SERVICIO
    // ===============================================
    console.log('\n📋 PASO 3: Crear orden...');
    const ultima = await prisma.ordenes_servicio.findFirst({ orderBy: { id_orden_servicio: 'desc' } });
    const sec = ultima ? parseInt((ultima.numero_orden.match(/\d+$/) || ['0'])[0]) + 1 : 1;
    const numOrden = `OS-2025-${String(sec).padStart(4, '0')}`;
    
    const trabajo = `MANTENIMIENTO PREVENTIVO TIPO A - GENERADOR 500KVA

1. INSPECCIÓN VISUAL
   - Conexiones eléctricas: OK
   - Sin fugas de aceite ni combustible

2. LUBRICACIÓN
   - Cambio de aceite 15W-40 (18 litros)
   - Filtro de aceite reemplazado

3. SISTEMA DE COMBUSTIBLE
   - Filtro primario reemplazado
   - Filtro secundario reemplazado

4. SISTEMA ELÉCTRICO
   - Baterías: 24.5V (OK)
   - Alternador: 28V (OK)

5. PRUEBAS DE FUNCIONAMIENTO
   - Arranque en frío: OK
   - Operación bajo carga 75% por 1 hora
   - Frecuencia: 60Hz estable
   - Voltaje: 440V estable`;

    const orden = await prisma.ordenes_servicio.create({
      data: {
        numero_orden: numOrden,
        id_cliente: cliente.id_cliente,
        id_equipo: equipo.id_equipo,
        id_tipo_servicio: tipoServ?.id_tipo_servicio,
        fecha_programada: new Date(),
        prioridad: 'NORMAL',
        origen_solicitud: 'PROGRAMADO',
        id_tecnico_asignado: tecnico.id_empleado,
        fecha_asignacion: new Date(),
        id_estado_actual: estadoP.id_estado,
        descripcion_inicial: 'Mantenimiento preventivo TIPO A programado',
        requiere_firma_cliente: true,
        creado_por: usuario.id_usuario,
        trabajo_realizado: trabajo,
        observaciones_tecnico: 'Equipo en excelente estado operativo. Próximo mantenimiento recomendado en 250 horas de operación.',
        fecha_inicio_real: new Date(),
        nombre_quien_recibe: 'Juan Carlos Pérez Martínez',
        cargo_quien_recibe: 'Jefe de Mantenimiento',
        cliente_conforme: true,
        calificacion_cliente: 5
      }
    });
    log(3, `Orden: ${numOrden} (ID: ${orden.id_orden_servicio})`);
    resultados.pasos.push({ paso: 3, ok: true, orden: numOrden, id: orden.id_orden_servicio });

    // ===============================================
    // PASO 4: REGISTRAR EVIDENCIA FOTOGRÁFICA
    // ===============================================
    console.log('\n📸 PASO 4: Evidencia fotográfica...');
    const evidencia = await prisma.evidencias_fotograficas.create({
      data: {
        id_orden_servicio: orden.id_orden_servicio,
        tipo_evidencia: 'DURANTE',
        descripcion: 'Estado del generador durante mantenimiento preventivo',
        nombre_archivo: `evidencia_${numOrden}_001.jpg`,
        ruta_archivo: cloudRes.secure_url,
        hash_sha256: crypto.createHash('sha256').update(cloudRes.secure_url).digest('hex'),
        tama_o_bytes: cloudRes.bytes,
        mime_type: 'image/jpeg',
        ancho_pixels: cloudRes.width,
        alto_pixels: cloudRes.height,
        orden_visualizacion: 1,
        es_principal: true,
        fecha_captura: new Date(),
        capturada_por: tecnico.id_empleado
      }
    });
    log(4, `Evidencia ID: ${evidencia.id_evidencia}, URL Cloudinary guardada`);
    resultados.pasos.push({ paso: 4, ok: true, evidenciaId: evidencia.id_evidencia });

    // ===============================================
    // PASO 5: FIRMA DIGITAL (simplificada)
    // ===============================================
    console.log('\n✍️ PASO 5: Firma digital...');
    const firma = await prisma.firmas_digitales.create({
      data: {
        id_persona: cliente.id_persona,
        tipo_firma: 'CLIENTE',
        firma_base64: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iODAiPjxwYXRoIGQ9Ik0xMCA0MHEyMC0zMCA0MC0xMHQyMCAzMCAyMC0xMCAyMCAwIDQwIDEwIiBzdHJva2U9IiMyMjIiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
        formato_firma: 'SVG',
        hash_firma: crypto.createHash('sha256').update('firma_cliente_' + ts).digest('hex'),
        fecha_captura: new Date(),
        es_firma_principal: false,
        activa: true,
        observaciones: `Firma de conformidad para orden ${numOrden}`,
        registrada_por: usuario.id_usuario
      }
    });
    
    await prisma.ordenes_servicio.update({
      where: { id_orden_servicio: orden.id_orden_servicio },
      data: { id_firma_cliente: firma.id_firma_digital }
    });
    log(5, `Firma ID: ${firma.id_firma_digital}, vinculada a orden`);
    resultados.pasos.push({ paso: 5, ok: true, firmaId: firma.id_firma_digital });

    // ===============================================
    // PASO 6: GENERAR PDF ENTERPRISE
    // ===============================================
    console.log('\n📄 PASO 6: Generando PDF...');
    const clienteNombre = cliente.persona?.razon_social || cliente.persona?.nombre_completo || 'Cliente';
    const tecnicoNombre = tecnico.persona?.nombre_completo || 'Técnico';
    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Informe ${numOrden}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #333; background: white; }
    .page { width: 210mm; min-height: 297mm; position: relative; }
    
    /* Header */
    .header { background: linear-gradient(135deg, ${M.azul} 0%, ${M.azulClaro} 100%); color: white; padding: 20px 30px; display: flex; justify-content: space-between; align-items: center; }
    .logo-section { }
    .logo { font-size: 32px; font-weight: 800; letter-spacing: 2px; }
    .tagline { font-size: 10px; opacity: 0.9; margin-top: 4px; }
    .doc-info { text-align: right; }
    .doc-number { font-size: 22px; font-weight: 700; color: ${M.verdeClaro}; }
    .doc-date { font-size: 11px; opacity: 0.9; margin-top: 4px; }
    .doc-badge { display: inline-block; background: ${M.verde}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 600; margin-top: 8px; }
    
    /* Content */
    .content { padding: 25px 30px; }
    .section { margin-bottom: 20px; }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid ${M.azulClaro}; }
    .section-icon { width: 24px; height: 24px; background: ${M.azul}; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
    .section-title { font-size: 14px; font-weight: 600; color: ${M.azul}; text-transform: uppercase; letter-spacing: 1px; }
    
    /* Info Grid */
    .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .info-card { background: linear-gradient(to right, ${M.blanco}, white); padding: 12px 15px; border-left: 4px solid ${M.azulClaro}; border-radius: 0 8px 8px 0; }
    .info-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .info-value { font-size: 13px; font-weight: 600; color: ${M.azul}; }
    
    /* Work Box */
    .work-box { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 18px; }
    .work-content { font-size: 11px; line-height: 1.7; white-space: pre-line; }
    
    /* Observations */
    .obs-box { background: linear-gradient(to right, rgba(86,166,114,0.1), rgba(158,194,61,0.1)); border-left: 4px solid ${M.verde}; border-radius: 0 8px 8px 0; padding: 15px 20px; }
    .obs-text { font-size: 12px; color: #444; line-height: 1.6; }
    
    /* Photo Section */
    .photo-container { display: flex; gap: 20px; }
    .photo-card { flex: 1; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .photo-image { width: 100%; height: 180px; object-fit: cover; }
    .photo-caption { padding: 12px; background: ${M.blanco}; text-align: center; }
    .photo-caption-text { font-size: 10px; color: #555; }
    .photo-badge { display: inline-block; background: ${M.azulClaro}; color: white; font-size: 9px; padding: 3px 8px; border-radius: 10px; margin-top: 5px; }
    
    /* Signatures */
    .signatures-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; margin-top: 20px; }
    .sig-card { border: 1px solid #ddd; border-radius: 12px; padding: 20px; text-align: center; background: ${M.blanco}; }
    .sig-label { font-size: 9px; color: #888; text-transform: uppercase; margin-bottom: 30px; }
    .sig-line { border-top: 2px solid #333; width: 80%; margin: 0 auto 10px; }
    .sig-name { font-size: 13px; font-weight: 600; color: ${M.azul}; }
    .sig-role { font-size: 10px; color: #666; margin-top: 4px; }
    
    /* Rating */
    .rating-section { text-align: center; margin-top: 20px; padding: 20px; background: white; border: 2px solid ${M.verdeClaro}; border-radius: 12px; }
    .rating-label { font-size: 11px; color: #666; margin-bottom: 8px; }
    .rating-stars { font-size: 28px; color: ${M.verdeClaro}; letter-spacing: 4px; }
    .rating-text { font-size: 14px; color: ${M.verde}; font-weight: 700; margin-top: 8px; }
    
    /* Footer */
    .footer { position: absolute; bottom: 0; left: 0; right: 0; background: ${M.azul}; color: white; padding: 12px 30px; display: flex; justify-content: space-between; font-size: 9px; }
    .footer-left { }
    .footer-right { opacity: 0.8; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="logo-section">
        <div class="logo">MEKANOS</div>
        <div class="tagline">Soluciones Integrales en Mantenimiento Industrial</div>
      </div>
      <div class="doc-info">
        <div class="doc-number">${numOrden}</div>
        <div class="doc-date">${fechaHoy}</div>
        <div class="doc-badge">INFORME DE SERVICIO</div>
      </div>
    </div>

    <div class="content">
      <!-- Información General -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">📋</div>
          <div class="section-title">Información del Servicio</div>
        </div>
        <div class="info-grid">
          <div class="info-card">
            <div class="info-label">Cliente</div>
            <div class="info-value">${clienteNombre}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Equipo</div>
            <div class="info-value">${equipo.nombre_equipo || 'Generador 500KVA'}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Tipo de Servicio</div>
            <div class="info-value">${tipoServ?.nombre_tipo || 'Mantenimiento Preventivo Tipo A'}</div>
          </div>
          <div class="info-card">
            <div class="info-label">Técnico Responsable</div>
            <div class="info-value">${tecnicoNombre} (${tecnico.codigo_empleado})</div>
          </div>
        </div>
      </div>

      <!-- Trabajo Realizado -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">🔧</div>
          <div class="section-title">Trabajo Realizado</div>
        </div>
        <div class="work-box">
          <div class="work-content">${trabajo}</div>
        </div>
      </div>

      <!-- Observaciones -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">📝</div>
          <div class="section-title">Observaciones del Técnico</div>
        </div>
        <div class="obs-box">
          <div class="obs-text">Equipo en excelente estado operativo. Se recomienda realizar el próximo mantenimiento preventivo en 250 horas de operación o en un máximo de 3 meses, lo que ocurra primero. Se verificó el correcto funcionamiento de todos los sistemas.</div>
        </div>
      </div>

      <!-- Evidencia Fotográfica -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">📷</div>
          <div class="section-title">Evidencia Fotográfica</div>
        </div>
        <div class="photo-container">
          <div class="photo-card">
            <img src="${cloudRes.secure_url}" alt="Evidencia del servicio" class="photo-image"/>
            <div class="photo-caption">
              <div class="photo-caption-text">Estado del generador durante mantenimiento preventivo</div>
              <div class="photo-badge">DURANTE SERVICIO</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Firmas y Conformidad -->
      <div class="section">
        <div class="section-header">
          <div class="section-icon">✅</div>
          <div class="section-title">Conformidad y Aceptación</div>
        </div>
        <div class="signatures-grid">
          <div class="sig-card">
            <div class="sig-label">Recibido por Cliente</div>
            <div class="sig-line"></div>
            <div class="sig-name">Juan Carlos Pérez Martínez</div>
            <div class="sig-role">Jefe de Mantenimiento</div>
          </div>
          <div class="sig-card">
            <div class="sig-label">Técnico Responsable</div>
            <div class="sig-line"></div>
            <div class="sig-name">${tecnicoNombre}</div>
            <div class="sig-role">${tecnico.codigo_empleado}</div>
          </div>
        </div>
        <div class="rating-section">
          <div class="rating-label">Calificación del Servicio por el Cliente</div>
          <div class="rating-stars">★★★★★</div>
          <div class="rating-text">EXCELENTE (5/5)</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-left">
        <strong>MEKANOS S.A.S</strong> | NIT: 900.XXX.XXX-X | Cartagena de Indias, Colombia
      </div>
      <div class="footer-right">
        www.mekanos.com.co | contacto@mekanos.com.co | +57 (605) XXX-XXXX
      </div>
    </div>
  </div>
</body>
</html>`;

    const browser = await puppeteer.launch({ 
      headless: 'new', 
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      timeout: 60000
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 30000 });
    // Dar tiempo para que cargue la imagen
    await new Promise(r => setTimeout(r, 3000));
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true, 
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      timeout: 30000
    });
    await browser.close();
    
    const pdfKB = (pdfBuffer.length / 1024).toFixed(2);
    log(6, `PDF generado: ${pdfKB} KB`);
    resultados.pasos.push({ paso: 6, ok: true, pdfSize: pdfKB + ' KB' });

    // ===============================================
    // PASO 7: SUBIR PDF A CLOUDFLARE R2
    // ===============================================
    console.log('\n☁️ PASO 7: Subiendo a R2...');
    const pdfKey = `informes/ordenes/${numOrden}/informe_${ts}.pdf`;
    
    await s3Client.send(new PutObjectCommand({
      Bucket: R2.bucketName,
      Key: pdfKey,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: { orden: numOrden, generado: new Date().toISOString() }
    }));
    
    const r2SignedUrl = await getSignedUrl(
      s3Client, 
      new GetObjectCommand({ Bucket: R2.bucketName, Key: pdfKey }), 
      { expiresIn: 604800 } // 7 días
    );
    log(7, `R2 Key: ${pdfKey}`);
    resultados.pasos.push({ paso: 7, ok: true, r2Key: pdfKey });

    // ===============================================
    // PASO 8: REGISTRAR DOCUMENTO E INFORME EN BD
    // ===============================================
    console.log('\n💾 PASO 8: Registrando en BD...');
    
    // Usar el R2 public URL base (sin firma, ya que es persistente)
    const r2PublicUrl = `https://${R2.bucketName}.${R2.accountId}.r2.cloudflarestorage.com/${pdfKey}`;
    
    // Primero crear el documento (sin id_orden_servicio)
    const doc = await prisma.documentos_generados.create({
      data: {
        id_referencia: orden.id_orden_servicio,
        tipo_documento: 'INFORME_SERVICIO',
        numero_documento: numOrden,
        ruta_archivo: r2PublicUrl.substring(0, 490), // Limitar a 490 chars
        tama_o_bytes: pdfBuffer.length,
        mime_type: 'application/pdf',
        hash_sha256: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
        generado_por: usuario.id_usuario,
        fecha_generacion: new Date()
      }
    });
    
    // Luego crear el informe que SÍ tiene id_orden_servicio y referencia al documento
    const informe = await prisma.informes.create({
      data: {
        numero_informe: `INF-${numOrden}`,
        id_orden_servicio: orden.id_orden_servicio,
        generado_por: usuario.id_usuario,
        estado_informe: 'APROBADO',
        id_documento_pdf: doc.id_documento,
        aprobado_por: usuario.id_usuario,
        fecha_aprobacion: new Date(),
        observaciones: `Informe de servicio ${numOrden} generado automáticamente`
      }
    });
    log(8, `Documento ID: ${doc.id_documento}, Informe ID: ${informe.id_informe}`);
    resultados.pasos.push({ paso: 8, ok: true, docId: doc.id_documento, informeId: informe.id_informe });

    // ===============================================
    // PASO 9: ENVIAR EMAIL Y COMPLETAR ORDEN
    // ===============================================
    console.log('\n📧 PASO 9: Enviando email...');
    const transporter = nodemailer.createTransport(SMTP);
    
    await transporter.sendMail({
      from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
      to: TEST_EMAIL,
      subject: `✅ Orden de Servicio ${numOrden} - Completada Exitosamente`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, ${M.azul}, ${M.azulClaro}); padding: 20px; color: white; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">MEKANOS S.A.S</h1>
            <p style="margin: 5px 0 0; opacity: 0.9;">Soluciones en Mantenimiento Industrial</p>
          </div>
          <div style="padding: 30px; background: #f9f9f9;">
            <h2 style="color: ${M.azul}; margin-top: 0;">✅ Orden Completada</h2>
            <p>Se ha completado exitosamente la orden de servicio:</p>
            <div style="background: white; padding: 20px; border-left: 4px solid ${M.verde}; margin: 20px 0;">
              <p style="margin: 0;"><strong>Número de Orden:</strong> ${numOrden}</p>
              <p style="margin: 10px 0 0;"><strong>Cliente:</strong> ${clienteNombre}</p>
              <p style="margin: 10px 0 0;"><strong>Técnico:</strong> ${tecnicoNombre}</p>
              <p style="margin: 10px 0 0;"><strong>Calificación:</strong> ★★★★★ (5/5)</p>
            </div>
            <p>Adjunto encontrará el informe técnico completo del servicio realizado.</p>
            <a href="${r2SignedUrl}" style="display: inline-block; background: ${M.verde}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 15px;">📄 Ver Informe en Línea</a>
          </div>
          <div style="background: ${M.azul}; padding: 15px; color: white; text-align: center; font-size: 12px;">
            MEKANOS S.A.S | Cartagena, Colombia | www.mekanos.com.co
          </div>
        </div>
      `,
      attachments: [{
        filename: `Informe_${numOrden}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });
    
    // Actualizar estado de la orden a COMPLETADA
    await prisma.ordenes_servicio.update({
      where: { id_orden_servicio: orden.id_orden_servicio },
      data: { 
        id_estado_actual: estadoC?.id_estado || estadoP.id_estado,
        fecha_fin_real: new Date()
      }
    });
    
    log(9, `Email enviado a ${TEST_EMAIL}, Orden actualizada a COMPLETADA`);
    resultados.pasos.push({ paso: 9, ok: true, email: TEST_EMAIL });

    // ===============================================
    // RESUMEN FINAL
    // ===============================================
    clearTimeout(timeoutId);
    resultados.success = true;
    resultados.orden = numOrden;
    resultados.cloudinaryUrl = cloudRes.secure_url;
    resultados.r2Key = pdfKey;
    resultados.email = TEST_EMAIL;

    console.log('\n' + '═'.repeat(60));
    console.log('🎉 TEST E2E COMPLETADO EXITOSAMENTE');
    console.log('═'.repeat(60));
    console.log(`📋 Orden:      ${numOrden}`);
    console.log(`📷 Cloudinary: ${cloudRes.secure_url.substring(0, 55)}...`);
    console.log(`☁️  R2:         ${pdfKey}`);
    console.log(`📧 Email:      ${TEST_EMAIL}`);
    console.log(`📄 PDF:        ${pdfKB} KB`);
    console.log('═'.repeat(60));

    // Guardar resultado
    fs.writeFileSync(
      path.join(__dirname, 'e2e-final-result.json'), 
      JSON.stringify(resultados, null, 2)
    );
    console.log('\n✅ Resultado guardado en e2e-final-result.json\n');

  } catch (err) {
    clearTimeout(timeoutId);
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    resultados.error = err.message;
    fs.writeFileSync(
      path.join(__dirname, 'e2e-final-error.json'), 
      JSON.stringify(resultados, null, 2)
    );
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
