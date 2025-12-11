/**
 * ============================================================================
 * TEST E2E SIMPLIFICADO V2 - MEKANOS S.A.S
 * ============================================================================
 * Version simplificada que carga imágenes desde URL directamente
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

const prisma = new PrismaClient();

// Cloudinary
cloudinary.config({
  cloud_name: 'dibw7aluj',
  api_key: '643988218551617',
  api_secret: 'ipcTGt7Kf1NQmYp-ToZtXJX2zJc'
});

// R2
const R2_CONFIG = {
  accountId: 'df62bcb5510c62b7ba5dedf3e065c566',
  bucketName: 'mekanos-plantas-produccion',
  accessKeyId: '0e6cbcc0d1350f4de86c5c8489adad32',
  secretAccessKey: '4a637e26da1ad7f0028f6e81c1a45993f598d1b485c3b0ba47acef27c6c4462f'
};

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_CONFIG.accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_CONFIG.accessKeyId, secretAccessKey: R2_CONFIG.secretAccessKey }
});

// Email
const SMTP_CONFIG = {
  host: 'smtp.gmail.com', port: 587, secure: false,
  auth: { user: 'mekanossas4@gmail.com', pass: 'jvsd znpw hsfv jgmy' }
};
const TEST_EMAIL = 'lorddeep3@gmail.com';
const IMAGEN_PRUEBA = 'C:\\Users\\Usuario\\Downloads\\mekanosApp\\BASE DE DATOS\\MEKANOS_DB\\REFACTORIZATION\\PRUEBA_PARA_TEST_E2E_FASE3Y4.jpg';

// Colores MEKANOS
const M = { azulOscuro: '#244673', azulClaro: '#3290A6', verde: '#56A672', verdeClaro: '#9EC23D', blanco: '#F2F2F2' };

async function main() {
  console.log('\n🚀 TEST E2E SIMPLIFICADO V2\n' + '='.repeat(50));
  
  const timestamp = Date.now();
  
  try {
    // PASO 1: Subir imagen a Cloudinary
    console.log('\n[1/9] Subiendo a Cloudinary...');
    const cloudRes = await cloudinary.uploader.upload(IMAGEN_PRUEBA, {
      folder: 'mekanos/evidencias/e2e',
      public_id: `ev_${timestamp}`,
      resource_type: 'image'
    });
    console.log('   ✅ URL:', cloudRes.secure_url.substring(0, 60) + '...');

    // PASO 2: Obtener datos base
    console.log('\n[2/9] Obteniendo datos BD...');
    const cliente = await prisma.clientes.findFirst({ where: { cliente_activo: true }, include: { persona: true } });
    const tecnico = await prisma.empleados.findFirst({ where: { es_tecnico: true, empleado_activo: true }, include: { persona: true } });
    const equipo = await prisma.equipos.findFirst({ where: { activo: true } });
    const estadoP = await prisma.estados_orden.findFirst({ where: { nombre_estado: 'Programada' } });
    const estadoC = await prisma.estados_orden.findFirst({ where: { nombre_estado: 'Completada' } });
    const usuario = await prisma.usuarios.findFirst({ where: { estado: 'ACTIVO' } });
    const tipoServ = await prisma.tipos_servicio.findFirst();
    console.log('   ✅ Datos obtenidos');

    // PASO 3: Crear orden
    console.log('\n[3/9] Creando orden...');
    const ultima = await prisma.ordenes_servicio.findFirst({ orderBy: { id_orden_servicio: 'desc' } });
    const sec = ultima ? parseInt((ultima.numero_orden.match(/\d+$/) || ['0'])[0]) + 1 : 1;
    const numOrden = `OS-2025-${String(sec).padStart(4, '0')}`;
    
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
    console.log('   ✅ Orden:', numOrden);

    // PASO 4: Registrar evidencia con URL de Cloudinary
    console.log('\n[4/9] Registrando evidencia...');
    await prisma.evidencias_fotograficas.create({
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
    console.log('   ✅ Evidencia guardada con URL Cloudinary');

    // PASO 5: Registrar firma
    console.log('\n[5/9] Registrando firma...');
    const firma = await prisma.firmas_digitales.create({
      data: {
        id_persona: cliente.id_persona,
        tipo_firma: 'CLIENTE',
        firma_base64: 'SVG_PLACEHOLDER',
        formato_firma: 'SVG',
        hash_firma: crypto.createHash('sha256').update('firma_' + timestamp).digest('hex'),
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
    console.log('   ✅ Firma registrada');

    // PASO 6: Generar PDF - HTML simplificado con imagen desde URL
    console.log('\n[6/9] Generando PDF...');
    const clienteNombre = cliente.persona?.razon_social || cliente.persona?.nombre_completo;
    const tecnicoNombre = tecnico.persona?.nombre_completo;
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial;font-size:11px;color:#333}
      .page{width:210mm;padding:0}.header{background:${M.azulOscuro};color:white;padding:15px 25px;display:flex;justify-content:space-between}
      .logo{font-size:28px;font-weight:bold}.doc-num{font-size:18px;color:${M.verdeClaro}}
      .content{padding:20px 25px}.section{margin-bottom:15px}
      .section-title{font-size:13px;font-weight:600;color:${M.azulOscuro};border-bottom:2px solid ${M.azulClaro};padding-bottom:5px;margin-bottom:10px}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .box{background:${M.blanco};padding:10px;border-left:3px solid ${M.azulClaro}}
      .label{font-size:9px;color:#666;text-transform:uppercase}.value{font-size:12px;font-weight:500}
      .work{background:#fafafa;border:1px solid #e0e0e0;padding:15px;font-size:10px;white-space:pre-line}
      .obs{background:linear-gradient(to right,${M.verdeClaro}15,${M.verde}10);border-left:4px solid ${M.verde};padding:12px}
      .foto{border:1px solid #e0e0e0;border-radius:8px;overflow:hidden;max-width:350px}
      .foto img{width:100%;height:200px;object-fit:cover}
      .foto-caption{padding:8px;background:${M.blanco};font-size:10px;text-align:center}
      .signatures{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:15px}
      .sig-box{border:1px solid #ddd;border-radius:8px;padding:15px;text-align:center;background:${M.blanco}}
      .sig-line{border-top:1px solid #333;width:80%;margin:30px auto 5px}
      .sig-name{font-size:12px;font-weight:600}.sig-role{font-size:9px;color:#666}
      .rating{text-align:center;margin-top:15px;padding:15px;background:${M.blanco};border-radius:8px}
      .stars{font-size:20px;color:${M.verdeClaro}}
      .footer{background:${M.azulClaro};color:white;padding:10px;text-align:center;font-size:9px}
    </style></head><body><div class="page">
      <div class="header"><div><div class="logo">MEKANOS S.A.S</div><div style="font-size:10px">Soluciones en Mantenimiento Industrial</div></div>
      <div style="text-align:right"><div class="doc-num">${numOrden}</div><div>Fecha: ${new Date().toLocaleDateString('es-CO')}</div></div></div>
      <div class="content">
        <div class="section"><div class="section-title">📋 INFORMACIÓN DEL SERVICIO</div><div class="grid">
          <div class="box"><div class="label">Cliente</div><div class="value">${clienteNombre}</div></div>
          <div class="box"><div class="label">Equipo</div><div class="value">${equipo.nombre_equipo}</div></div>
          <div class="box"><div class="label">Tipo</div><div class="value">${tipoServ?.nombre_tipo || 'Mantenimiento Preventivo Tipo A'}</div></div>
          <div class="box"><div class="label">Técnico</div><div class="value">${tecnicoNombre} (${tecnico.codigo_empleado})</div></div>
        </div></div>
        <div class="section"><div class="section-title">🔧 TRABAJO REALIZADO</div><div class="work">${trabajo}</div></div>
        <div class="section"><div class="section-title">📝 OBSERVACIONES</div><div class="obs">Equipo en excelente estado. Próximo mantenimiento en 250 horas.</div></div>
        <div class="section"><div class="section-title">📷 EVIDENCIA FOTOGRÁFICA</div>
          <div class="foto"><img src="${cloudRes.secure_url}" alt="Evidencia"><div class="foto-caption">Estado del equipo durante mantenimiento</div></div>
        </div>
        <div class="section"><div class="section-title">✅ CONFORMIDAD DEL CLIENTE</div>
          <div class="signatures">
            <div class="sig-box"><div style="font-size:10px;color:#666">Recibido por:</div><div class="sig-line"></div><div class="sig-name">Juan Pérez Martínez</div><div class="sig-role">Jefe de Mantenimiento</div></div>
            <div class="sig-box"><div style="font-size:10px;color:#666">Técnico:</div><div class="sig-line"></div><div class="sig-name">${tecnicoNombre}</div><div class="sig-role">${tecnico.codigo_empleado}</div></div>
          </div>
          <div class="rating"><div style="font-size:11px;color:#666">Calificación del servicio:</div><div class="stars">★★★★★</div><div style="font-size:12px;color:${M.verde};font-weight:600">(5/5)</div></div>
        </div>
      </div>
      <div class="footer">MEKANOS S.A.S | NIT: 900.XXX.XXX-X | Cartagena, Colombia | www.mekanos.com.co</div>
    </div></body></html>`;

    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
    await browser.close();
    console.log('   ✅ PDF generado:', (pdfBuffer.length / 1024).toFixed(2), 'KB');

    // PASO 7: Subir PDF a R2
    console.log('\n[7/9] Subiendo a R2...');
    const pdfKey = `informes/ordenes/${numOrden}/informe_${timestamp}.pdf`;
    await s3Client.send(new PutObjectCommand({
      Bucket: R2_CONFIG.bucketName, Key: pdfKey, Body: pdfBuffer, ContentType: 'application/pdf'
    }));
    const r2Url = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: R2_CONFIG.bucketName, Key: pdfKey }), { expiresIn: 604800 });
    console.log('   ✅ PDF en R2:', pdfKey);

    // PASO 8: Registrar documento e informe
    console.log('\n[8/9] Registrando en BD...');
    const doc = await prisma.documentos_generados.create({
      data: {
        id_orden_servicio: orden.id_orden_servicio,
        id_referencia: orden.id_orden_servicio,
        tipo_documento: 'INFORME_SERVICIO',
        numero_documento: numOrden,
        nombre_archivo: `informe_${numOrden}.pdf`,
        ruta_archivo: r2Url,
        tama_o_bytes: pdfBuffer.length,
        mime_type: 'application/pdf',
        hash_sha256: crypto.createHash('sha256').update(pdfBuffer).digest('hex'),
        version_documento: 1,
        es_version_final: true,
        generado_por: usuario.id_usuario,
        fecha_generacion: new Date()
      }
    });
    
    await prisma.informes.create({
      data: {
        id_orden_servicio: orden.id_orden_servicio,
        id_documento: doc.id_documento,
        numero_informe: `INF-${numOrden}`,
        tipo_informe: 'SERVICIO',
        estado_informe: 'APROBADO',
        titulo: `Informe de Servicio - ${numOrden}`,
        resumen_ejecutivo: trabajo.substring(0, 200),
        id_tecnico_responsable: tecnico.id_empleado,
        fecha_elaboracion: new Date(),
        fecha_aprobacion: new Date(),
        aprobado_por: usuario.id_usuario
      }
    });
    console.log('   ✅ Documento e informe creados');

    // PASO 9: Enviar email y finalizar
    console.log('\n[9/9] Enviando email...');
    const transporter = nodemailer.createTransport(SMTP_CONFIG);
    await transporter.sendMail({
      from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
      to: TEST_EMAIL,
      subject: `✅ Orden ${numOrden} - Completada`,
      html: `<h2>Orden ${numOrden} completada</h2><p>Adjunto el informe técnico.</p><a href="${r2Url}">Descargar PDF</a>`,
      attachments: [{ filename: `informe_${numOrden}.pdf`, content: pdfBuffer }]
    });
    
    await prisma.ordenes_servicio.update({
      where: { id_orden_servicio: orden.id_orden_servicio },
      data: { id_estado_actual: estadoC?.id_estado || estadoP.id_estado, fecha_fin_real: new Date() }
    });
    
    console.log('   ✅ Email enviado a:', TEST_EMAIL);

    // RESUMEN
    console.log('\n' + '='.repeat(50));
    console.log('🎉 TEST E2E COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(50));
    console.log('📷 Cloudinary:', cloudRes.secure_url.substring(0, 50) + '...');
    console.log('📄 R2:', pdfKey);
    console.log('📧 Email:', TEST_EMAIL);
    console.log('🔢 Orden:', numOrden, '(ID:', orden.id_orden_servicio + ')');

    fs.writeFileSync(path.join(__dirname, 'e2e-v2-result.json'), JSON.stringify({
      orden: numOrden, cloudinary: cloudRes.secure_url, r2: pdfKey, email: TEST_EMAIL, success: true
    }, null, 2));

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

main().then(() => process.exit(0)).catch(() => process.exit(1));
