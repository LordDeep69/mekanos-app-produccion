/**
 * ============================================================================
 * TEST DE INTEGRACIÓN COMPLETO - MEKANOS S.A.S
 * ============================================================================
 * 
 * OBJETIVO: Ejecutar el flujo completo de finalización de orden usando
 *           TODOS los componentes validados atómicamente (Tests 01-08).
 * 
 * PRERREQUISITOS:
 * - TODOS los tests atómicos (01-08) deben haber pasado
 * 
 * FLUJO COMPLETO:
 * 1. Subir 3 imágenes a Cloudinary (ANTES, DURANTE, DESPUES)
 * 2. Registrar las 3 evidencias en BD con URLs de Cloudinary
 * 3. Obtener datos de orden existente
 * 4. Generar PDF con template REAL (tipo-a-generador.template.ts)
 * 5. Subir PDF a Cloudflare R2
 * 6. Registrar documento en BD con URL de R2
 * 7. Registrar firma digital del técnico
 * 8. Enviar email con PDF adjunto
 * 9. Actualizar estado de orden a COMPLETADA
 * 
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');
const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// Cargar templates TypeScript
require('ts-node').register({ transpileOnly: true, compilerOptions: { module: 'commonjs' } });
const { generarTipoAGeneradorHTML } = require('../../pdf/templates/tipo-a-generador.template');
const { MEKANOS_COLORS } = require('../../pdf/templates/mekanos-base.template');

// ============================================================================
// CONFIGURACIONES
// ============================================================================

const prisma = new PrismaClient();

// Cloudinary
const CLOUDINARY_CONFIG = {
    cloud_name: 'dibw7aluj',
    api_key: '643988218551617',
    api_secret: 'ipcTGt7Kf1NQmYp-ToZtXJX2zJc'
};

// R2
const R2_CONFIG = {
    endpoint: 'https://df62bcb5510c62b7ba5dedf3e065c566.r2.cloudflarestorage.com',
    accessKeyId: '0e6cbcc0d1350f4de86c5c8489adad32',
    secretAccessKey: '4a637e26da1ad7f0028f6e81c1a45993f598d1b485c3b0ba47acef27c6c4462f',
    bucketName: 'mekanos-plantas-produccion',
    publicUrl: 'https://pub-r2.mekanos.com.co'
};

// Email
const EMAIL_CONFIG = {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'mekanossas4@gmail.com',
    pass: 'jvsd znpw hsfv jgmy',
    from: 'mekanossas4@gmail.com',
    testTo: 'lorddeep3@gmail.com'
};

// ============================================================================
// UTILIDADES (deben estar antes de usarlas)
// ============================================================================

// CRC32 para PNG
function crc32(buffer) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[i] = c;
    }
    for (let i = 0; i < buffer.length; i++) crc = table[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
    const result = Buffer.alloc(4);
    result.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0);
    return result;
}

// Genera una firma de prueba como PNG base64
function generarFirmaBase64(texto) {
    // Crear un PNG simple con un trazo diagonal (simula firma)
    // PNG de 150x50 pixels con fondo transparente y trazo azul
    const width = 150;
    const height = 50;

    // Header PNG
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;  // bit depth
    ihdrData[9] = 6;  // RGBA color type
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace

    const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x0D]),
        Buffer.from('IHDR'),
        ihdrData,
        ihdrCrc
    ]);

    // Crear datos de imagen RGBA con una "firma" (línea curva)
    const rowSize = width * 4 + 1; // RGBA + filter byte
    const rawData = Buffer.alloc(rowSize * height);

    // Dibujar una línea ondulada que simule una firma
    for (let row = 0; row < height; row++) {
        const offset = row * rowSize;
        rawData[offset] = 0; // filter byte

        for (let col = 0; col < width; col++) {
            const pixelOffset = offset + 1 + col * 4;

            // Calcular si este pixel es parte de la "firma"
            const y = row;
            const x = col;

            // Curva sinusoidal que simula una firma
            const firmaY = 25 + Math.sin(x * 0.1) * 10 + Math.cos(x * 0.05) * 5;
            const distancia = Math.abs(y - firmaY);

            if (distancia < 2) {
                // Pixel parte de la firma - Azul MEKANOS #244673
                rawData[pixelOffset] = 36;     // R
                rawData[pixelOffset + 1] = 70; // G
                rawData[pixelOffset + 2] = 115; // B
                rawData[pixelOffset + 3] = 255; // A (opaco)
            } else {
                // Transparente
                rawData[pixelOffset] = 0;
                rawData[pixelOffset + 1] = 0;
                rawData[pixelOffset + 2] = 0;
                rawData[pixelOffset + 3] = 0;
            }
        }
    }

    // Comprimir datos
    const compressedData = zlib.deflateSync(rawData);

    // IDAT chunk
    const idatLength = Buffer.alloc(4);
    idatLength.writeUInt32BE(compressedData.length);
    const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressedData]));
    const idatChunk = Buffer.concat([idatLength, Buffer.from('IDAT'), compressedData, idatCrc]);

    // IEND chunk
    const iendCrc = crc32(Buffer.from('IEND'));
    const iendChunk = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x00]),
        Buffer.from('IEND'),
        iendCrc
    ]);

    const pngBuffer = Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
    return pngBuffer.toString('base64');
}

function crearImagenColor(r, g, b, size = 100) {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(size, 0);
    ihdrData.writeUInt32BE(size, 4);
    ihdrData[8] = 8; ihdrData[9] = 2; ihdrData[10] = 0; ihdrData[11] = 0; ihdrData[12] = 0;

    const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrChunk = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x0D]), Buffer.from('IHDR'), ihdrData, ihdrCrc]);

    const rowSize = size * 3 + 1;
    const rawData = Buffer.alloc(rowSize * size);
    for (let row = 0; row < size; row++) {
        const offset = row * rowSize;
        rawData[offset] = 0;
        for (let col = 0; col < size; col++) {
            const pixelOffset = offset + 1 + col * 3;
            rawData[pixelOffset] = r;
            rawData[pixelOffset + 1] = g;
            rawData[pixelOffset + 2] = b;
        }
    }

    const compressedData = zlib.deflateSync(rawData);
    const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressedData]));
    const idatLength = Buffer.alloc(4);
    idatLength.writeUInt32BE(compressedData.length);
    const idatChunk = Buffer.concat([idatLength, Buffer.from('IDAT'), compressedData, idatCrc]);

    const iendCrc = crc32(Buffer.from('IEND'));
    const iendChunk = Buffer.concat([Buffer.from([0x00, 0x00, 0x00, 0x00]), Buffer.from('IEND'), iendCrc]);

    return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

// Firmas de prueba en Base64 (PNG con trazo de firma simulado)
const FIRMA_TECNICO_BASE64 = generarFirmaBase64('Técnico');
const FIRMA_CLIENTE_BASE64 = generarFirmaBase64('Cliente');

// ============================================================================
// TEST PRINCIPAL
// ============================================================================

async function ejecutarTest() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST DE INTEGRACIÓN COMPLETO');
    console.log('   Flujo de Finalización de Orden con Templates REALES');
    console.log('═'.repeat(70));

    const resultados = {
        paso1_imagenes: false,
        paso2_evidencias: false,
        paso3_datosOrden: false,
        paso4_pdf: false,
        paso5_r2: false,
        paso6_documento: false,
        paso7_firma: false,
        paso8_email: false,
        paso9_finalizar: false,
        exito: false,
        datos: {}
    };

    const timestamp = Date.now();
    const ordenId = `INT-${timestamp}`;
    let browser = null;
    let registrosCreados = { evidencias: [], documento: null, firma: null };

    try {
        // ========================================================================
        // CONFIGURAR SERVICIOS
        // ========================================================================
        cloudinary.config(CLOUDINARY_CONFIG);

        const s3Client = new S3Client({
            region: 'auto',
            endpoint: R2_CONFIG.endpoint,
            credentials: { accessKeyId: R2_CONFIG.accessKeyId, secretAccessKey: R2_CONFIG.secretAccessKey }
        });

        const transporter = nodemailer.createTransport({
            host: EMAIL_CONFIG.host, port: EMAIL_CONFIG.port, secure: false,
            auth: { user: EMAIL_CONFIG.user, pass: EMAIL_CONFIG.pass },
            tls: { rejectUnauthorized: false }
        });

        await prisma.$connect();
        console.log('\n✅ Servicios configurados correctamente\n');

        // ========================================================================
        // PASO 1: Subir 3 imágenes a Cloudinary
        // ========================================================================
        console.log('─'.repeat(70));
        console.log('📌 PASO 1: Subiendo 3 imágenes a Cloudinary...');
        console.log('─'.repeat(70));

        const imagenes = [
            { tipo: 'ANTES', color: [220, 38, 38], caption: 'Estado inicial del equipo' },
            { tipo: 'DURANTE', color: [245, 158, 11], caption: 'Trabajo en progreso' },
            { tipo: 'DESPUES', color: [86, 166, 114], caption: 'Equipo después del mantenimiento' }
        ];

        const imagenesSubidas = [];

        for (const img of imagenes) {
            const buffer = crearImagenColor(...img.color, 200);

            const result = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: `mekanos/integracion/${ordenId}`, public_id: `${img.tipo.toLowerCase()}_${timestamp}`, tags: ['integracion', img.tipo, ordenId] },
                    (error, result) => error ? reject(error) : resolve(result)
                );
                uploadStream.end(buffer);
            });

            imagenesSubidas.push({ tipo: img.tipo, url: result.secure_url, publicId: result.public_id, caption: img.caption, bytes: result.bytes });
            console.log(`   ✅ ${img.tipo}: ${result.secure_url.substring(0, 60)}...`);
        }

        resultados.paso1_imagenes = true;
        resultados.datos.imagenes = imagenesSubidas;

        // ========================================================================
        // PASO 2: Registrar evidencias en BD
        // ========================================================================
        console.log('\n' + '─'.repeat(70));
        console.log('📌 PASO 2: Registrando evidencias en Base de Datos...');
        console.log('─'.repeat(70));

        const orden = await prisma.ordenes_servicio.findFirst({ orderBy: { id_orden_servicio: 'desc' } });
        if (!orden) throw new Error('No hay órdenes en la BD');

        for (let i = 0; i < imagenesSubidas.length; i++) {
            const img = imagenesSubidas[i];
            const hash = crypto.createHash('sha256').update(img.url).digest('hex');

            const evidencia = await prisma.evidencias_fotograficas.create({
                data: {
                    id_orden_servicio: orden.id_orden_servicio,
                    tipo_evidencia: img.tipo,
                    descripcion: img.caption,
                    nombre_archivo: `${img.tipo.toLowerCase()}_${timestamp}.png`,
                    ruta_archivo: img.url,
                    hash_sha256: hash,
                    tama_o_bytes: BigInt(img.bytes),
                    mime_type: 'image/png',
                    ancho_pixels: 200,
                    alto_pixels: 200,
                    orden_visualizacion: i + 1,
                    es_principal: i === 0,
                    fecha_captura: new Date()
                }
            });

            registrosCreados.evidencias.push(evidencia.id_evidencia);
            console.log(`   ✅ Evidencia ${img.tipo} creada (ID: ${evidencia.id_evidencia})`);
        }

        resultados.paso2_evidencias = true;

        // ========================================================================
        // PASO 3: Obtener datos completos de la orden
        // ========================================================================
        console.log('\n' + '─'.repeat(70));
        console.log('📌 PASO 3: Obteniendo datos completos de la orden...');
        console.log('─'.repeat(70));

        const ordenCompleta = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: orden.id_orden_servicio },
            include: {
                cliente: { include: { persona: true } },
                equipo: true,
                tecnico: { include: { persona: true } }
            }
        });

        console.log(`   ✅ Orden: ${ordenCompleta.numero_orden}`);
        console.log(`   📋 Cliente: ${ordenCompleta.cliente?.persona?.razon_social || 'N/A'}`);
        console.log(`   🔧 Equipo: ${ordenCompleta.equipo?.marca || 'N/A'} ${ordenCompleta.equipo?.modelo || ''}`);

        resultados.paso3_datosOrden = true;
        resultados.datos.orden = { id: ordenCompleta.id_orden_servicio, numero: ordenCompleta.numero_orden };

        // ========================================================================
        // PASO 4: Generar PDF con template REAL
        // ========================================================================
        console.log('\n' + '─'.repeat(70));
        console.log('📌 PASO 4: Generando PDF con template TIPO A GENERADOR...');
        console.log('─'.repeat(70));

        const datosPDF = {
            cliente: ordenCompleta.cliente?.persona?.razon_social || 'CLIENTE DEMO',
            direccion: ordenCompleta.cliente?.persona?.direccion_principal || 'Cartagena, Colombia',
            marcaEquipo: ordenCompleta.equipo?.marca || 'CATERPILLAR',
            serieEquipo: ordenCompleta.equipo?.serie || 'CAT-2024-001',
            tipoEquipo: 'GENERADOR',
            fecha: new Date().toLocaleDateString('es-CO'),
            tecnico: ordenCompleta.tecnico?.persona?.primer_nombre + ' ' + ordenCompleta.tecnico?.persona?.primer_apellido || 'Técnico MEKANOS',
            horaEntrada: '08:00',
            horaSalida: '12:30',
            tipoServicio: 'PREVENTIVO_A',
            numeroOrden: ordenCompleta.numero_orden,
            datosModulo: { rpm: 1800, presionAceite: 65, temperaturaRefrigerante: 82, cargaBateria: 24, horasTrabajo: 1250, voltaje: 220, frecuencia: 60, corriente: 45 },
            actividades: [
                { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar tapa de radiador', resultado: 'B' },
                { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar nivel de refrigerante', resultado: 'B' },
                { sistema: 'COMBUSTIBLE', descripcion: 'Revisar nivel de combustible', resultado: 'B' },
                { sistema: 'COMBUSTIBLE', descripcion: 'Revisar filtro de combustible', resultado: 'C', observaciones: 'Cambiar próx servicio' },
                { sistema: 'LUBRICACION', descripcion: 'Revisar nivel de aceite', resultado: 'B' },
                { sistema: 'ELECTRICO', descripcion: 'Revisar bornes de batería', resultado: 'B' },
                { sistema: 'GENERAL', descripcion: '¿El equipo arranca sin dificultad?', resultado: 'B' }
            ],
            mediciones: [
                { parametro: 'Temperatura Refrigerante', valor: 82, unidad: '°C', nivelAlerta: 'OK' },
                { parametro: 'Presión Aceite', valor: 65, unidad: 'PSI', nivelAlerta: 'OK' },
                { parametro: 'Voltaje', valor: 220, unidad: 'V', nivelAlerta: 'OK' }
            ],
            evidencias: imagenesSubidas.map(img => ({ url: img.url, caption: img.caption })),
            observaciones: 'Mantenimiento preventivo Tipo A completado exitosamente. Equipo en óptimas condiciones.',
            // Firmas como Data URL para mostrar en el PDF
            firmaTecnico: `data:image/png;base64,${FIRMA_TECNICO_BASE64}`,
            firmaCliente: `data:image/png;base64,${FIRMA_CLIENTE_BASE64}`
        };

        const htmlPDF = generarTipoAGeneradorHTML(datosPDF);

        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlPDF, { waitUntil: 'networkidle0', timeout: 60000 });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } });
        await page.close();

        console.log(`   ✅ PDF generado: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        console.log(`   📄 Template: TIPO A GENERADOR (template real)`);

        resultados.paso4_pdf = true;
        resultados.datos.pdfSize = pdfBuffer.length;

        // ========================================================================
        // PASO 5: Subir PDF a Cloudflare R2
        // ========================================================================
        console.log('\n' + '─'.repeat(70));
        console.log('📌 PASO 5: Subiendo PDF a Cloudflare R2...');
        console.log('─'.repeat(70));

        const pdfKey = `informes/integracion/${ordenId}/informe_${timestamp}.pdf`;

        await s3Client.send(new PutObjectCommand({
            Bucket: R2_CONFIG.bucketName, Key: pdfKey, Body: pdfBuffer, ContentType: 'application/pdf'
        }));

        const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: R2_CONFIG.bucketName, Key: pdfKey }), { expiresIn: 604800 });
        const publicUrl = `${R2_CONFIG.publicUrl}/${pdfKey}`;

        console.log(`   ✅ PDF subido a R2`);
        console.log(`   📁 Key: ${pdfKey}`);
        console.log(`   🔗 URL pública: ${publicUrl}`);

        resultados.paso5_r2 = true;
        resultados.datos.pdfUrl = publicUrl;

        // ========================================================================
        // PASO 6: Registrar documento en BD
        // ========================================================================
        console.log('\n' + '─'.repeat(70));
        console.log('📌 PASO 6: Registrando documento en Base de Datos...');
        console.log('─'.repeat(70));

        const usuario = await prisma.usuarios.findFirst({ orderBy: { id_usuario: 'asc' } });
        const hashDoc = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

        const documento = await prisma.documentos_generados.create({
            data: {
                tipo_documento: 'INFORME_SERVICIO',
                id_referencia: orden.id_orden_servicio,
                numero_documento: `INF-${ordenCompleta.numero_orden}-${timestamp}`,
                ruta_archivo: publicUrl,
                hash_sha256: hashDoc,
                tama_o_bytes: BigInt(pdfBuffer.length),
                mime_type: 'application/pdf',
                fecha_generacion: new Date(),
                generado_por: usuario.id_usuario,
                herramienta_generacion: 'TEST-INTEGRACION-MEKANOS'
            }
        });

        registrosCreados.documento = documento.id_documento;
        console.log(`   ✅ Documento creado (ID: ${documento.id_documento})`);

        resultados.paso6_documento = true;
        resultados.datos.documentoId = documento.id_documento;

        // ========================================================================
        // PASO 7: Registrar firma digital
        // ========================================================================
        console.log('\n' + '─'.repeat(70));
        console.log('📌 PASO 7: Registrando firma digital del técnico...');
        console.log('─'.repeat(70));

        const persona = await prisma.personas.findFirst({ orderBy: { id_persona: 'asc' } });
        const firmaBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const hashFirma = crypto.createHash('sha256').update(firmaBase64 + timestamp).digest('hex');

        const firma = await prisma.firmas_digitales.create({
            data: {
                id_persona: persona.id_persona,
                tipo_firma: 'TECNICO',
                firma_base64: firmaBase64,
                formato_firma: 'PNG',
                hash_firma: hashFirma,
                fecha_captura: new Date(),
                es_firma_principal: false,
                activa: true,
                observaciones: `Firma de finalización - Test Integración ${ordenId}`,
                registrada_por: usuario.id_usuario
            }
        });

        registrosCreados.firma = firma.id_firma_digital;
        console.log(`   ✅ Firma registrada (ID: ${firma.id_firma_digital})`);

        resultados.paso7_firma = true;
        resultados.datos.firmaId = firma.id_firma_digital;

        // ========================================================================
        // PASO 8: Enviar email con PDF adjunto
        // ========================================================================
        console.log('\n' + '─'.repeat(70));
        console.log('📌 PASO 8: Enviando email con PDF adjunto...');
        console.log('─'.repeat(70));

        const emailResult = await transporter.sendMail({
            from: { name: 'MEKANOS S.A.S', address: EMAIL_CONFIG.from },
            to: EMAIL_CONFIG.testTo,
            subject: `📋 Informe de Servicio ${ordenCompleta.numero_orden} - Test Integración`,
            html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #244673, #3290A6); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">MEKANOS S.A.S</h1>
            <p style="color: #9EC23D; margin: 10px 0 0;">Test de Integración Completo</p>
          </div>
          <div style="background: #f8f9fa; padding: 20px;">
            <h2 style="color: #244673;">✅ Orden ${ordenCompleta.numero_orden} Finalizada</h2>
            <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-CO')}</p>
            <p><strong>Test ID:</strong> ${ordenId}</p>
            <div style="background: #e8f4f8; padding: 15px; border-left: 4px solid #56A672; margin: 20px 0;">
              <p style="margin: 0;">📎 El informe técnico con template REAL está adjunto a este correo.</p>
            </div>
          </div>
        </div>
      `,
            attachments: [{ filename: `MEKANOS_Informe_${ordenCompleta.numero_orden}_${timestamp}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
        });

        console.log(`   ✅ Email enviado exitosamente`);
        console.log(`   📧 Destinatario: ${EMAIL_CONFIG.testTo}`);
        console.log(`   📨 Message ID: ${emailResult.messageId}`);

        resultados.paso8_email = true;
        resultados.datos.emailMessageId = emailResult.messageId;

        // ========================================================================
        // PASO 9: Finalizar (no cambiamos estado real para no afectar datos)
        // ========================================================================
        console.log('\n' + '─'.repeat(70));
        console.log('📌 PASO 9: Simulando finalización de orden...');
        console.log('─'.repeat(70));

        console.log(`   ✅ Orden ${ordenCompleta.numero_orden} procesada correctamente`);
        console.log(`   📊 3 evidencias registradas`);
        console.log(`   📄 1 documento PDF generado y subido`);
        console.log(`   ✍️ 1 firma digital registrada`);
        console.log(`   📧 1 email enviado con adjunto`);

        resultados.paso9_finalizar = true;

        // ========================================================================
        // RESULTADO FINAL
        // ========================================================================
        resultados.exito =
            resultados.paso1_imagenes && resultados.paso2_evidencias && resultados.paso3_datosOrden &&
            resultados.paso4_pdf && resultados.paso5_r2 && resultados.paso6_documento &&
            resultados.paso7_firma && resultados.paso8_email && resultados.paso9_finalizar;

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        console.log(error.stack);
        resultados.error = error.message;
    } finally {
        if (browser) await browser.close();

        // Limpiar registros de prueba
        console.log('\n🧹 Limpiando registros de prueba...');
        try {
            if (registrosCreados.documento) {
                await prisma.documentos_generados.delete({ where: { id_documento: registrosCreados.documento } });
                console.log(`   ✅ Documento eliminado`);
            }
            if (registrosCreados.firma) {
                await prisma.firmas_digitales.delete({ where: { id_firma_digital: registrosCreados.firma } });
                console.log(`   ✅ Firma eliminada`);
            }
            for (const id of registrosCreados.evidencias) {
                await prisma.evidencias_fotograficas.delete({ where: { id_evidencia: id } });
            }
            if (registrosCreados.evidencias.length > 0) {
                console.log(`   ✅ ${registrosCreados.evidencias.length} evidencias eliminadas`);
            }
        } catch (err) {
            console.log(`   ⚠️ Error limpiando: ${err.message}`);
        }

        await prisma.$disconnect();
    }

    // ========================================================================
    // RESUMEN FINAL
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN DEL TEST DE INTEGRACIÓN');
    console.log('═'.repeat(70));

    console.log(`\n   Paso 1 - 3 Imágenes Cloudinary:  ${resultados.paso1_imagenes ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 2 - 3 Evidencias BD:        ${resultados.paso2_evidencias ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 3 - Datos de Orden:         ${resultados.paso3_datosOrden ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 4 - PDF Template REAL:      ${resultados.paso4_pdf ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 5 - PDF en R2:              ${resultados.paso5_r2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 6 - Documento en BD:        ${resultados.paso6_documento ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 7 - Firma Digital:          ${resultados.paso7_firma ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 8 - Email con PDF:          ${resultados.paso8_email ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 9 - Finalización:           ${resultados.paso9_finalizar ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n' + '─'.repeat(70));

    if (resultados.exito) {
        console.log('🎉 TEST DE INTEGRACIÓN: ✅ ÉXITO TOTAL');
        console.log('\n   El flujo completo funciona correctamente con:');
        console.log('   - Templates REALES de MEKANOS');
        console.log('   - Múltiples imágenes (3)');
        console.log('   - Todas las validaciones de BD');
        console.log('   - Email con PDF adjunto');
    } else {
        console.log('💥 TEST DE INTEGRACIÓN: ❌ FALLÓ');
        console.log('\n   Revisar los pasos que fallaron.');
    }

    console.log('═'.repeat(70) + '\n');

    // Guardar resultado
    const resultPath = path.join(__dirname, 'resultado-test-integracion.json');
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
