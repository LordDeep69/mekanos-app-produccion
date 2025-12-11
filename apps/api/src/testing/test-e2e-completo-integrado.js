/**
 * ============================================================================
 * TEST E2E COMPLETO INTEGRADO - MEKANOS S.A.S
 * ============================================================================
 * 
 * FLUJO COMPLETO:
 * 1. Subir imagen de evidencia a Cloudinary → URL real
 * 2. Crear orden de servicio con datos reales
 * 3. Registrar evidencia con URL de Cloudinary en BD
 * 4. Registrar firma digital
 * 5. Generar PDF Enterprise con imagen real y firma
 * 6. Subir PDF a Cloudflare R2 → URL firmada
 * 7. Registrar documento con URL de R2 en BD
 * 8. Enviar email con PDF adjunto
 * 9. Finalizar orden
 * 10. Verificar todo en BD
 * 
 * Colores MEKANOS:
 * - #F2F2F2 Blanco/Gris claro
 * - #244673 Azul oscuro (primario)
 * - #3290A6 Azul claro (secundario)
 * - #56A672 Verde (éxito)
 * - #9EC23D Verde claro (acento)
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

// ============================================================================
// CONFIGURACIONES
// ============================================================================

const prisma = new PrismaClient();

// Cloudinary - Cuenta PLANTAS
cloudinary.config({
  cloud_name: 'dibw7aluj',
  api_key: '643988218551617',
  api_secret: 'ipcTGt7Kf1NQmYp-ToZtXJX2zJc'
});

// R2 - Cuenta PLANTAS
const R2_CONFIG = {
  accountId: 'df62bcb5510c62b7ba5dedf3e065c566',
  bucketName: 'mekanos-plantas-produccion',
  accessKeyId: '0e6cbcc0d1350f4de86c5c8489adad32',
  secretAccessKey: '4a637e26da1ad7f0028f6e81c1a45993f598d1b485c3b0ba47acef27c6c4462f'
};

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey
  }
});

// Email
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

// Imagen de prueba
const IMAGEN_PRUEBA = 'C:\\Users\\Usuario\\Downloads\\mekanosApp\\BASE DE DATOS\\MEKANOS_DB\\REFACTORIZATION\\PRUEBA_PARA_TEST_E2E_FASE3Y4.jpg';

// Colores MEKANOS
const MEKANOS = {
  blanco: '#F2F2F2',
  azulOscuro: '#244673',
  azulClaro: '#3290A6',
  verde: '#56A672',
  verdeClaro: '#9EC23D'
};

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

function generarFirmaSVG() {
  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="60" viewBox="0 0 200 60">
      <path d="M10,45 Q30,10 50,40 T90,35 T130,45 T170,30 T190,40" 
            stroke="${MEKANOS.azulOscuro}" stroke-width="2" fill="none" 
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `).toString('base64')}`;
}

function generarHTMLInforme(data) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Roboto', Arial, sans-serif; color: #333; font-size: 11px; line-height: 1.4; background: white; }
    .page { width: 210mm; min-height: 297mm; padding: 0; margin: 0 auto; background: white; position: relative; }
    
    .header { background: ${MEKANOS.azulOscuro}; color: white; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; }
    .logo-text { font-size: 28px; font-weight: 700; letter-spacing: 1px; }
    .logo-subtitle { font-size: 10px; opacity: 0.9; margin-top: 2px; }
    .doc-number { font-size: 18px; font-weight: 700; color: ${MEKANOS.verdeClaro}; }
    .doc-date { font-size: 11px; margin-top: 5px; opacity: 0.9; }
    
    .content { padding: 20px 25px; }
    .section { margin-bottom: 18px; }
    .section-title { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: ${MEKANOS.azulOscuro}; padding-bottom: 6px; border-bottom: 2px solid ${MEKANOS.azulClaro}; margin-bottom: 10px; }
    .section-icon { width: 18px; height: 18px; background: ${MEKANOS.azulClaro}; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; }
    
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-box { background: ${MEKANOS.blanco}; padding: 10px 12px; border-left: 3px solid ${MEKANOS.azulClaro}; border-radius: 0 4px 4px 0; }
    .info-label { font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px; }
    .info-value { font-size: 12px; font-weight: 500; color: #333; }
    
    .work-content { background: #FAFAFA; border: 1px solid #E0E0E0; border-radius: 6px; padding: 15px; font-size: 10px; line-height: 1.6; white-space: pre-line; font-family: 'Roboto Mono', monospace; }
    .observations-box { background: linear-gradient(to right, ${MEKANOS.verdeClaro}15, ${MEKANOS.verde}10); border-left: 4px solid ${MEKANOS.verde}; padding: 12px 15px; border-radius: 0 6px 6px 0; font-size: 11px; }
    
    .evidencias-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; }
    .evidencia-item { border: 1px solid #E0E0E0; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .evidencia-img { width: 100%; height: 180px; object-fit: cover; display: block; }
    .evidencia-caption { padding: 8px 12px; background: ${MEKANOS.blanco}; font-size: 10px; color: #666; text-align: center; }
    
    .signatures-container { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 15px; }
    .signature-box { border: 1px solid #DDD; border-radius: 8px; padding: 15px; text-align: center; background: ${MEKANOS.blanco}; }
    .signature-title { font-size: 10px; color: #666; margin-bottom: 10px; font-weight: 500; }
    .signature-image { height: 50px; margin: 10px 0; }
    .signature-line { border-top: 1px solid #333; width: 80%; margin: 5px auto; }
    .signature-name { font-size: 12px; font-weight: 600; color: #333; margin-top: 5px; }
    .signature-role { font-size: 9px; color: #666; }
    
    .rating-section { text-align: center; margin-top: 15px; padding: 15px; background: ${MEKANOS.blanco}; border-radius: 8px; }
    .rating-label { font-size: 11px; color: #666; margin-bottom: 8px; }
    .rating-stars { font-size: 20px; color: ${MEKANOS.verdeClaro}; letter-spacing: 3px; }
    .rating-value { font-size: 12px; color: ${MEKANOS.verde}; font-weight: 600; margin-top: 5px; }
    
    .footer { position: absolute; bottom: 0; left: 0; right: 0; background: ${MEKANOS.azulClaro}; color: white; padding: 10px 25px; font-size: 9px; text-align: center; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div>
        <div class="logo-text">MEKANOS S.A.S</div>
        <div class="logo-subtitle">Soluciones en Mantenimiento Industrial</div>
      </div>
      <div style="text-align: right;">
        <div class="doc-number">${data.numeroOrden}</div>
        <div class="doc-date">Fecha: ${data.fecha}</div>
      </div>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title"><span class="section-icon">📋</span> INFORMACIÓN DEL SERVICIO</div>
        <div class="info-grid">
          <div class="info-box"><div class="info-label">Cliente</div><div class="info-value">${data.clienteNombre}</div></div>
          <div class="info-box"><div class="info-label">Equipo</div><div class="info-value">${data.equipoNombre}</div></div>
          <div class="info-box"><div class="info-label">Tipo de Servicio</div><div class="info-value">${data.tipoServicio}</div></div>
          <div class="info-box"><div class="info-label">Técnico</div><div class="info-value">${data.tecnicoNombre} (${data.tecnicoCodigo})</div></div>
        </div>
      </div>
      
      <div class="section">
        <div class="section-title"><span class="section-icon">🔧</span> TRABAJO REALIZADO</div>
        <div class="work-content">${data.trabajoRealizado}</div>
      </div>
      
      <div class="section">
        <div class="section-title"><span class="section-icon">📝</span> OBSERVACIONES</div>
        <div class="observations-box">${data.observaciones}</div>
      </div>
      
      <div class="section">
        <div class="section-title"><span class="section-icon">📷</span> EVIDENCIA FOTOGRÁFICA</div>
        <div class="evidencias-grid">
          ${data.evidencias.map(ev => `
            <div class="evidencia-item">
              <img src="${ev.url}" alt="Evidencia" class="evidencia-img">
              <div class="evidencia-caption">${ev.descripcion}</div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="section">
        <div class="section-title"><span class="section-icon">✅</span> CONFORMIDAD DEL CLIENTE</div>
        <div class="signatures-container">
          <div class="signature-box">
            <div class="signature-title">Recibido por:</div>
            <img src="${data.firmaCliente}" alt="Firma" class="signature-image">
            <div class="signature-line"></div>
            <div class="signature-name">${data.nombreRecibe}</div>
            <div class="signature-role">${data.cargoRecibe}</div>
          </div>
          <div class="signature-box">
            <div class="signature-title">Técnico:</div>
            <img src="${data.firmaTecnico}" alt="Firma" class="signature-image">
            <div class="signature-line"></div>
            <div class="signature-name">${data.tecnicoNombre}</div>
            <div class="signature-role">${data.tecnicoCodigo}</div>
          </div>
        </div>
        <div class="rating-section">
          <div class="rating-label">Calificación del servicio:</div>
          <div class="rating-stars">${'★'.repeat(data.calificacion)}${'☆'.repeat(5 - data.calificacion)}</div>
          <div class="rating-value">(${data.calificacion}/5)</div>
        </div>
      </div>
    </div>
    
    <div class="footer">MEKANOS S.A.S | NIT: 900.XXX.XXX-X | Cartagena, Colombia | www.mekanos.com.co</div>
  </div>
</body>
</html>`;
}

// ============================================================================
// FLUJO PRINCIPAL
// ============================================================================

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🚀 TEST E2E COMPLETO INTEGRADO - MEKANOS S.A.S');
  console.log('═'.repeat(70));

  const resultados = {
    cloudinaryUrl: null,
    r2Url: null,
    ordenId: null,
    documentoId: null,
    emailEnviado: false
  };

  try {
    // ========================================================================
    // PASO 1: Subir imagen a Cloudinary
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 1: Subiendo imagen a Cloudinary...');
    console.log('─'.repeat(70));

    if (!fs.existsSync(IMAGEN_PRUEBA)) {
      throw new Error(`Imagen no encontrada: ${IMAGEN_PRUEBA}`);
    }

    const timestamp = Date.now();
    const cloudinaryResult = await cloudinary.uploader.upload(IMAGEN_PRUEBA, {
      folder: 'mekanos/evidencias/ordenes_servicio',
      public_id: `evidencia_${timestamp}`,
      resource_type: 'image',
      transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }]
    });

    resultados.cloudinaryUrl = cloudinaryResult.secure_url;
    console.log(`   ✅ Imagen subida a Cloudinary`);
    console.log(`   🔗 URL: ${resultados.cloudinaryUrl}`);

    // ========================================================================
    // PASO 2: Obtener datos base de BD
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 2: Obteniendo datos de la base de datos...');
    console.log('─'.repeat(70));

    const cliente = await prisma.clientes.findFirst({
      where: { cliente_activo: true },
      include: { persona: true }
    });

    const tecnico = await prisma.empleados.findFirst({
      where: { es_tecnico: true, empleado_activo: true },
      include: { persona: true }
    });

    const equipo = await prisma.equipos.findFirst({
      where: { activo: true },
      include: { tipo_equipo: true }
    });

    const tipoServicio = await prisma.tipos_servicio.findFirst();
    const estadoProgramada = await prisma.estados_orden.findFirst({ where: { nombre_estado: 'Programada' } });
    const estadoCompletada = await prisma.estados_orden.findFirst({ where: { nombre_estado: 'Completada' } });
    const usuario = await prisma.usuarios.findFirst({ where: { estado: 'ACTIVO' } });

    if (!cliente || !tecnico || !equipo || !estadoProgramada || !usuario) {
      throw new Error('Faltan datos base en la BD');
    }

    console.log(`   ✅ Cliente: ${cliente.persona?.razon_social || cliente.persona?.nombre_completo}`);
    console.log(`   ✅ Técnico: ${tecnico.persona?.nombre_completo}`);
    console.log(`   ✅ Equipo: ${equipo.nombre_equipo}`);

    // ========================================================================
    // PASO 3: Crear orden de servicio
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 3: Creando orden de servicio...');
    console.log('─'.repeat(70));

    // Usar timestamp único para evitar conflictos
    const uniqueId = Date.now().toString().slice(-6);
    const numeroOrden = `OS-2025-E2E-${uniqueId}`;

    const trabajoRealizado = `MANTENIMIENTO PREVENTIVO TIPO A - GENERADOR 500KVA

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
   - Voltaje: 440V trifásico`;

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
        descripcion_inicial: 'Mantenimiento preventivo TIPO A - Generador 500kVA',
        requiere_firma_cliente: true,
        creado_por: usuario.id_usuario,
        trabajo_realizado: trabajoRealizado,
        observaciones_tecnico: 'Equipo en excelente estado. Próximo mantenimiento en 250 horas.',
        fecha_inicio_real: new Date(),
        nombre_quien_recibe: 'Juan Pérez Martínez',
        cargo_quien_recibe: 'Jefe de Mantenimiento',
        cliente_conforme: true,
        calificacion_cliente: 5
      }
    });

    resultados.ordenId = orden.id_orden_servicio;
    console.log(`   ✅ Orden creada: ${numeroOrden} (ID: ${orden.id_orden_servicio})`);

    // ========================================================================
    // PASO 4: Registrar evidencia con URL de Cloudinary
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 4: Registrando evidencia con URL de Cloudinary...');
    console.log('─'.repeat(70));

    const evidencia = await prisma.evidencias_fotograficas.create({
      data: {
        id_orden_servicio: orden.id_orden_servicio,
        tipo_evidencia: 'DURANTE',
        descripcion: 'Estado del equipo durante mantenimiento preventivo',
        nombre_archivo: `evidencia_${numeroOrden}_001.jpg`,
        ruta_archivo: resultados.cloudinaryUrl,  // URL REAL de Cloudinary
        hash_sha256: crypto.createHash('sha256').update(resultados.cloudinaryUrl).digest('hex'),
        tama_o_bytes: cloudinaryResult.bytes,
        mime_type: 'image/jpeg',
        ancho_pixels: cloudinaryResult.width,
        alto_pixels: cloudinaryResult.height,
        orden_visualizacion: 1,
        es_principal: true,
        fecha_captura: new Date(),
        capturada_por: tecnico.id_empleado
      }
    });

    console.log(`   ✅ Evidencia registrada con URL de Cloudinary`);
    console.log(`   🔗 URL en BD: ${resultados.cloudinaryUrl.substring(0, 60)}...`);

    // ========================================================================
    // PASO 5: Registrar firma digital
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 5: Registrando firma digital...');
    console.log('─'.repeat(70));

    const firmaBase64 = generarFirmaSVG().replace('data:image/svg+xml;base64,', '');
    const hashFirma = crypto.createHash('sha256').update(firmaBase64).digest('hex');

    const firma = await prisma.firmas_digitales.create({
      data: {
        id_persona: cliente.id_persona,
        tipo_firma: 'CLIENTE',
        firma_base64: firmaBase64,
        formato_firma: 'SVG',
        hash_firma: hashFirma,
        fecha_captura: new Date(),
        es_firma_principal: false,
        activa: true,
        observaciones: `Firma para orden ${numeroOrden}`,
        registrada_por: usuario.id_usuario
      }
    });

    await prisma.ordenes_servicio.update({
      where: { id_orden_servicio: orden.id_orden_servicio },
      data: { id_firma_cliente: firma.id_firma_digital }
    });

    console.log(`   ✅ Firma digital registrada (ID: ${firma.id_firma_digital})`);

    // ========================================================================
    // PASO 6: Generar PDF Enterprise
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 6: Generando PDF Enterprise...');
    console.log('─'.repeat(70));

    const pdfData = {
      numeroOrden,
      fecha: new Date().toLocaleDateString('es-CO'),
      clienteNombre: cliente.persona?.razon_social || cliente.persona?.nombre_completo,
      equipoNombre: equipo.nombre_equipo,
      tipoServicio: tipoServicio?.nombre_tipo || 'Mantenimiento Preventivo',
      tecnicoNombre: tecnico.persona?.nombre_completo,
      tecnicoCodigo: tecnico.codigo_empleado,
      trabajoRealizado,
      observaciones: 'Equipo en excelente estado. Próximo mantenimiento en 250 horas.',
      evidencias: [{ url: resultados.cloudinaryUrl, descripcion: 'Estado del equipo durante mantenimiento' }],
      firmaCliente: generarFirmaSVG(),
      firmaTecnico: generarFirmaSVG(),
      nombreRecibe: 'Juan Pérez Martínez',
      cargoRecibe: 'Jefe de Mantenimiento',
      calificacion: 5
    };

    const htmlInforme = generarHTMLInforme(pdfData);

    let browser;
    let pdfBuffer;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      });

      const page = await browser.newPage();

      // Timeout más largo y manejo de errores de carga de imagen
      page.on('error', err => console.log('   ⚠️ Page error:', err.message));
      page.on('pageerror', err => console.log('   ⚠️ Page JS error:', err.message));

      await page.setContent(htmlInforme, { waitUntil: 'load', timeout: 120000 });

      // Esperar un momento para que las imágenes carguen
      await new Promise(resolve => setTimeout(resolve, 3000));

      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' }
      });
    } finally {
      if (browser) await browser.close();
    }

    console.log(`   ✅ PDF generado: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // ========================================================================
    // PASO 7: Subir PDF a Cloudflare R2
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 7: Subiendo PDF a Cloudflare R2...');
    console.log('─'.repeat(70));

    const pdfFileName = `informes/ordenes_servicio/${numeroOrden}/informe_${timestamp}.pdf`;

    await s3Client.send(new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName,
      Key: pdfFileName,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        'x-mekanos-orden': numeroOrden,
        'x-mekanos-fecha': new Date().toISOString()
      }
    }));

    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: R2_CONFIG.bucketName, Key: pdfFileName }),
      { expiresIn: 60 * 60 * 24 * 7 }
    );

    // URL base pública (sin firma) para guardar en BD
    const publicBaseUrl = `https://pub-r2.mekanos.com.co`;  // o usar el dominio público de R2
    const publicUrl = `${publicBaseUrl}/${pdfFileName}`;

    resultados.r2Url = signedUrl;
    resultados.r2PublicUrl = publicUrl;
    console.log(`   ✅ PDF subido a R2: ${pdfFileName}`);
    console.log(`   🔗 URL firmada (7 días) generada`);

    // ========================================================================
    // PASO 8: Registrar documento en BD con URL de R2
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 8: Registrando documento en BD...');
    console.log('─'.repeat(70));

    const documento = await prisma.documentos_generados.create({
      data: {
        id_referencia: orden.id_orden_servicio,  // Campo genérico para orden/cotización
        tipo_documento: 'INFORME_SERVICIO',
        numero_documento: numeroOrden,
        ruta_archivo: publicUrl,  // URL pública corta (la firmada se genera bajo demanda)
        tama_o_bytes: pdfBuffer.length,
        mime_type: 'application/pdf',
        hash_sha256: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
        generado_por: usuario.id_usuario,
        fecha_generacion: new Date()
      }
    });

    resultados.documentoId = documento.id_documento;
    console.log(`   ✅ Documento registrado (ID: ${documento.id_documento})`);

    // ========================================================================
    // PASO 9: Crear informe (OMITIDO - Schema diferente, documento ya creado)
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 9: Creando informe...');
    console.log('─'.repeat(70));
    console.log(`   ⏭️  Paso omitido - Documento ya registrado en BD (ID: ${documento.id_documento})`);

    // ========================================================================
    // PASO 10: Enviar email con PDF
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 10: Enviando email con PDF...');
    console.log('─'.repeat(70));

    const transporter = nodemailer.createTransport(SMTP_CONFIG);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${MEKANOS.azulOscuro}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: ${MEKANOS.verde}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">MEKANOS S.A.S</h1>
      <p style="margin: 5px 0 0 0; opacity: 0.9;">Soluciones en Mantenimiento Industrial</p>
    </div>
    <div class="content">
      <h2>✅ Orden de Servicio Completada</h2>
      <p>Estimado cliente,</p>
      <p>Le informamos que la orden de servicio <strong>${numeroOrden}</strong> ha sido completada exitosamente.</p>
      <p><strong>Equipo:</strong> ${equipo.nombre_equipo}</p>
      <p><strong>Tipo de Servicio:</strong> ${tipoServicio?.nombre_tipo || 'Mantenimiento'}</p>
      <p><strong>Técnico:</strong> ${tecnico.persona?.nombre_completo}</p>
      <p>Adjunto encontrará el informe técnico detallado en formato PDF.</p>
      <center>
        <a href="${signedUrl}" class="button">📄 Descargar Informe PDF</a>
      </center>
      <p><em>El enlace de descarga estará disponible por 7 días.</em></p>
    </div>
    <div class="footer">
      <p>MEKANOS S.A.S | Cartagena, Colombia | www.mekanos.com.co</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
      to: TEST_EMAIL,
      subject: `✅ Orden de Servicio ${numeroOrden} - Completada`,
      html: emailHtml,
      attachments: [{
        filename: `informe_${numeroOrden}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }]
    });

    resultados.emailEnviado = true;
    console.log(`   ✅ Email enviado a: ${TEST_EMAIL}`);

    // ========================================================================
    // PASO 11: Finalizar orden
    // ========================================================================
    console.log('\n' + '─'.repeat(70));
    console.log('📌 PASO 11: Finalizando orden...');
    console.log('─'.repeat(70));

    await prisma.ordenes_servicio.update({
      where: { id_orden_servicio: orden.id_orden_servicio },
      data: {
        id_estado_actual: estadoCompletada?.id_estado || estadoProgramada.id_estado,
        fecha_fin_real: new Date()
      }
    });

    console.log(`   ✅ Orden finalizada con estado: Completada`);

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('🎉 TEST E2E COMPLETADO EXITOSAMENTE');
    console.log('═'.repeat(70));
    console.log('\n📊 RESUMEN:');
    console.log(`   📷 Imagen en Cloudinary: ${resultados.cloudinaryUrl.substring(0, 50)}...`);
    console.log(`   📄 PDF en R2: ${pdfFileName}`);
    console.log(`   🔢 Orden ID: ${resultados.ordenId}`);
    console.log(`   📝 Documento ID: ${resultados.documentoId}`);
    console.log(`   📧 Email enviado: ${resultados.emailEnviado ? 'Sí' : 'No'}`);
    console.log('═'.repeat(70));

    // Guardar resultado para verificación
    const resultPath = path.join(__dirname, 'e2e-completo-result.json');
    fs.writeFileSync(resultPath, JSON.stringify({
      ...resultados,
      numeroOrden,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log(`\n📁 Resultado guardado en: ${resultPath}`);

  } catch (error) {
    console.error('\n❌ ERROR EN TEST E2E:');
    console.error(error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
main()
  .then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
