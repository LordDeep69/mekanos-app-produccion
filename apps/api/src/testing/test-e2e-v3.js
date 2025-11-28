/**
 * ============================================================================
 * TEST E2E V3 - MEKANOS S.A.S
 * ============================================================================
 * Versión simplificada con PDF sin esperar imágenes externas
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
const https = require('https');

const prisma = new PrismaClient();

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

// Helper para descargar imagen y convertir a base64
async function imageToBase64(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        const mimeType = res.headers['content-type'] || 'image/jpeg';
        resolve(`data:${mimeType};base64,${base64}`);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function log(step, msg) {
  console.log(`[${step}] ✅ ${msg}`);
}

async function main() {
  console.log('\n🚀 TEST E2E V3 - MEKANOS S.A.S');
  console.log('='.repeat(50));
  
  const ts = Date.now();
  let resultados = { success: false, pasos: {} };

  try {
    // PASO 1: SUBIR IMAGEN A CLOUDINARY
    console.log('\n📷 PASO 1: Cloudinary...');
    if (!fs.existsSync(IMAGEN_PRUEBA)) throw new Error('Imagen no encontrada');
    
    const cloudRes = await cloudinary.uploader.upload(IMAGEN_PRUEBA, {
      folder: 'mekanos/evidencias/e2e', public_id: `ev_${ts}`, resource_type: 'image'
    });
    log(1, `URL: ${cloudRes.secure_url.substring(0, 60)}...`);
    resultados.pasos[1] = { ok: true, url: cloudRes.secure_url };

    // PASO 2: OBTENER DATOS DE BD
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
    
    if (!cliente || !tecnico || !equipo || !estadoP || !usuario) throw new Error('Datos faltantes');
    log(2, `Cliente: ${cliente.persona?.razon_social || cliente.persona?.nombre_completo}`);
    resultados.pasos[2] = { ok: true };

    // PASO 3: CREAR ORDEN
    console.log('\n📋 PASO 3: Crear orden...');
    // Usar timestamp para garantizar unicidad
    const numOrden = `OS-E2E-${ts}`;
    
    const trabajo = `MANTENIMIENTO PREVENTIVO TIPO A - GENERADOR 500KVA

1. INSPECCIÓN VISUAL - Conexiones OK, Sin fugas
2. LUBRICACIÓN - Cambio aceite 15W-40 (18L)
3. COMBUSTIBLE - Filtros reemplazados
4. ELÉCTRICO - Baterías 24.5V, Alternador 28V
5. PRUEBAS - Arranque OK, Carga 75% 1h, 60Hz, 440V`;

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
        descripcion_inicial: 'Mantenimiento preventivo TIPO A',
        requiere_firma_cliente: true,
        creado_por: usuario.id_usuario,
        trabajo_realizado: trabajo,
        observaciones_tecnico: 'Equipo en excelente estado. Próximo mantenimiento en 250 horas.',
        fecha_inicio_real: new Date(),
        nombre_quien_recibe: 'Juan Pérez Martínez',
        cargo_quien_recibe: 'Jefe de Mantenimiento',
        cliente_conforme: true,
        calificacion_cliente: 5
      }
    });
    log(3, `Orden: ${numOrden} (ID: ${orden.id_orden_servicio})`);
    resultados.pasos[3] = { ok: true, orden: numOrden, id: orden.id_orden_servicio };

    // PASO 4: EVIDENCIA
    console.log('\n📸 PASO 4: Evidencia...');
    const evidencia = await prisma.evidencias_fotograficas.create({
      data: {
        id_orden_servicio: orden.id_orden_servicio,
        tipo_evidencia: 'DURANTE',
        descripcion: 'Estado del equipo durante mantenimiento',
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
    log(4, `Evidencia ID: ${evidencia.id_evidencia}`);
    resultados.pasos[4] = { ok: true, id: evidencia.id_evidencia };

    // PASO 5: FIRMA
    console.log('\n✍️ PASO 5: Firma...');
    const firma = await prisma.firmas_digitales.create({
      data: {
        id_persona: cliente.id_persona,
        tipo_firma: 'CLIENTE',
        firma_base64: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
        formato_firma: 'SVG',
        hash_firma: crypto.createHash('sha256').update('firma_' + ts).digest('hex'),
        fecha_captura: new Date(),
        es_firma_principal: false,
        activa: true,
        observaciones: `Firma para ${numOrden}`,
        registrada_por: usuario.id_usuario
      }
    });
    await prisma.ordenes_servicio.update({
      where: { id_orden_servicio: orden.id_orden_servicio },
      data: { id_firma_cliente: firma.id_firma_digital }
    });
    log(5, `Firma ID: ${firma.id_firma_digital}`);
    resultados.pasos[5] = { ok: true, id: firma.id_firma_digital };

    // PASO 6: PDF (con imagen embebida como base64)
    console.log('\n📄 PASO 6: Generando PDF...');
    console.log('   - Descargando imagen para embed...');
    const imgBase64 = await imageToBase64(cloudRes.secure_url);
    console.log('   - Imagen convertida a base64');
    
    const clienteNombre = cliente.persona?.razon_social || cliente.persona?.nombre_completo || 'Cliente';
    const tecnicoNombre = tecnico.persona?.nombre_completo || 'Técnico';
    const fechaHoy = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;font-size:11px;color:#333}
      .page{width:210mm;min-height:297mm;position:relative}
      .header{background:linear-gradient(135deg,${M.azul},${M.azulClaro});color:white;padding:20px 30px;display:flex;justify-content:space-between}
      .logo{font-size:32px;font-weight:800}.doc-num{font-size:22px;font-weight:700;color:${M.verdeClaro}}
      .content{padding:25px 30px}.section{margin-bottom:20px}
      .section-title{font-size:14px;font-weight:600;color:${M.azul};border-bottom:2px solid ${M.azulClaro};padding-bottom:8px;margin-bottom:12px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .card{background:${M.blanco};padding:12px 15px;border-left:4px solid ${M.azulClaro}}
      .label{font-size:9px;color:#666;text-transform:uppercase}.value{font-size:13px;font-weight:600;color:${M.azul}}
      .work{background:#fafafa;border:1px solid #e0e0e0;padding:18px;white-space:pre-line;font-size:11px}
      .obs{background:linear-gradient(to right,rgba(86,166,114,0.1),rgba(158,194,61,0.1));border-left:4px solid ${M.verde};padding:15px}
      .photo{border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;max-width:400px}
      .photo img{width:100%;height:200px;object-fit:cover}
      .photo-caption{padding:12px;background:${M.blanco};text-align:center;font-size:10px}
      .signatures{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:20px}
      .sig{border:1px solid #ddd;border-radius:12px;padding:20px;text-align:center;background:${M.blanco}}
      .sig-line{border-top:2px solid #333;width:80%;margin:30px auto 10px}
      .sig-name{font-size:13px;font-weight:600;color:${M.azul}}.sig-role{font-size:10px;color:#666}
      .rating{text-align:center;margin-top:20px;padding:20px;border:2px solid ${M.verdeClaro};border-radius:12px}
      .stars{font-size:28px;color:${M.verdeClaro}}
      .footer{position:absolute;bottom:0;left:0;right:0;background:${M.azul};color:white;padding:12px 30px;text-align:center;font-size:9px}
    </style></head><body><div class="page">
      <div class="header">
        <div><div class="logo">MEKANOS</div><div style="font-size:10px;opacity:0.9">Soluciones en Mantenimiento Industrial</div></div>
        <div style="text-align:right"><div class="doc-num">${numOrden}</div><div>${fechaHoy}</div></div>
      </div>
      <div class="content">
        <div class="section"><div class="section-title">📋 INFORMACIÓN DEL SERVICIO</div>
          <div class="grid">
            <div class="card"><div class="label">Cliente</div><div class="value">${clienteNombre}</div></div>
            <div class="card"><div class="label">Equipo</div><div class="value">${equipo.nombre_equipo || 'Generador'}</div></div>
            <div class="card"><div class="label">Tipo</div><div class="value">${tipoServ?.nombre_tipo || 'Mtto Preventivo A'}</div></div>
            <div class="card"><div class="label">Técnico</div><div class="value">${tecnicoNombre}</div></div>
          </div>
        </div>
        <div class="section"><div class="section-title">🔧 TRABAJO REALIZADO</div><div class="work">${trabajo}</div></div>
        <div class="section"><div class="section-title">📝 OBSERVACIONES</div><div class="obs">Equipo en excelente estado. Próximo mantenimiento en 250 horas.</div></div>
        <div class="section"><div class="section-title">📷 EVIDENCIA FOTOGRÁFICA</div>
          <div class="photo"><img src="${imgBase64}" alt="Evidencia"/><div class="photo-caption">Estado del generador durante mantenimiento</div></div>
        </div>
        <div class="section"><div class="section-title">✅ CONFORMIDAD</div>
          <div class="signatures">
            <div class="sig"><div style="font-size:9px;color:#888">RECIBIDO POR:</div><div class="sig-line"></div><div class="sig-name">Juan Pérez Martínez</div><div class="sig-role">Jefe de Mantenimiento</div></div>
            <div class="sig"><div style="font-size:9px;color:#888">TÉCNICO:</div><div class="sig-line"></div><div class="sig-name">${tecnicoNombre}</div><div class="sig-role">${tecnico.codigo_empleado}</div></div>
          </div>
          <div class="rating"><div style="font-size:11px;color:#666">Calificación del servicio:</div><div class="stars">★★★★★</div><div style="font-size:14px;color:${M.verde};font-weight:700">(5/5)</div></div>
        </div>
      </div>
      <div class="footer">MEKANOS S.A.S | NIT: 900.XXX.XXX-X | Cartagena, Colombia | www.mekanos.com.co</div>
    </div></body></html>`;

    console.log('   - Generando PDF...');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    await browser.close();
    
    const pdfKB = (pdfBuffer.length / 1024).toFixed(2);
    log(6, `PDF: ${pdfKB} KB`);
    resultados.pasos[6] = { ok: true, size: pdfKB + ' KB' };

    // PASO 7: SUBIR A R2
    console.log('\n☁️ PASO 7: R2...');
    const pdfKey = `informes/ordenes/${numOrden}/informe_${ts}.pdf`;
    await s3Client.send(new PutObjectCommand({ Bucket: R2.bucketName, Key: pdfKey, Body: pdfBuffer, ContentType: 'application/pdf' }));
    const r2Url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: R2.bucketName, Key: pdfKey }), { expiresIn: 604800 });
    log(7, `Key: ${pdfKey}`);
    resultados.pasos[7] = { ok: true, key: pdfKey };

    // PASO 8: DOCUMENTO E INFORME EN BD
    console.log('\n💾 PASO 8: BD...');
    const r2PublicUrl = `https://${R2.bucketName}.${R2.accountId}.r2.cloudflarestorage.com/${pdfKey}`;
    
    const doc = await prisma.documentos_generados.create({
      data: {
        id_referencia: orden.id_orden_servicio,
        tipo_documento: 'INFORME_SERVICIO',
        numero_documento: numOrden,
        ruta_archivo: r2PublicUrl.substring(0, 490),
        tama_o_bytes: pdfBuffer.length,
        mime_type: 'application/pdf',
        hash_sha256: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
        generado_por: usuario.id_usuario
      }
    });
    
    const informe = await prisma.informes.create({
      data: {
        numero_informe: `INF-${numOrden}`,
        id_orden_servicio: orden.id_orden_servicio,
        generado_por: usuario.id_usuario,
        estado_informe: 'APROBADO',
        id_documento_pdf: doc.id_documento,
        aprobado_por: usuario.id_usuario,
        fecha_aprobacion: new Date()
      }
    });
    log(8, `Doc: ${doc.id_documento}, Informe: ${informe.id_informe}`);
    resultados.pasos[8] = { ok: true, docId: doc.id_documento, informeId: informe.id_informe };

    // PASO 9: EMAIL Y COMPLETAR
    console.log('\n📧 PASO 9: Email...');
    const transporter = nodemailer.createTransport(SMTP);
    await transporter.sendMail({
      from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
      to: TEST_EMAIL,
      subject: `✅ Orden ${numOrden} - Completada`,
      html: `<h2>Orden ${numOrden}</h2><p>Adjunto informe. <a href="${r2Url}">Ver PDF</a></p>`,
      attachments: [{ filename: `Informe_${numOrden}.pdf`, content: pdfBuffer }]
    });
    
    await prisma.ordenes_servicio.update({
      where: { id_orden_servicio: orden.id_orden_servicio },
      data: { id_estado_actual: estadoC?.id_estado || estadoP.id_estado, fecha_fin_real: new Date() }
    });
    log(9, `Email: ${TEST_EMAIL}, Estado: COMPLETADA`);
    resultados.pasos[9] = { ok: true, email: TEST_EMAIL };

    // RESULTADO
    resultados.success = true;
    resultados.orden = numOrden;
    resultados.cloudinaryUrl = cloudRes.secure_url;
    resultados.r2Key = pdfKey;

    console.log('\n' + '═'.repeat(60));
    console.log('🎉 TEST E2E V3 COMPLETADO EXITOSAMENTE');
    console.log('═'.repeat(60));
    console.log(`📋 Orden:      ${numOrden}`);
    console.log(`📷 Cloudinary: ${cloudRes.secure_url.substring(0, 50)}...`);
    console.log(`☁️  R2:         ${pdfKey}`);
    console.log(`📄 PDF:        ${pdfKB} KB`);
    console.log(`📧 Email:      ${TEST_EMAIL}`);
    console.log('═'.repeat(60));

    fs.writeFileSync(path.join(__dirname, 'e2e-v3-result.json'), JSON.stringify(resultados, null, 2));

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    resultados.error = err.message;
    fs.writeFileSync(path.join(__dirname, 'e2e-v3-error.json'), JSON.stringify(resultados, null, 2));
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));
