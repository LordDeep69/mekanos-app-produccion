/**
 * TEST ATÓMICO 09 - COTIZACIÓN PDF + EMAIL
 * =========================================
 * 
 * Valida el flujo completo de cotización:
 * 1. Generar PDF de cotización con template real
 * 2. Subir a R2 (opcional)
 * 3. Enviar por email con PDF adjunto
 * 
 * MEKANOS S.A.S - Sistema de Mantenimiento Industrial
 */

const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configuración
const EMAIL_CONFIG = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER || 'mekanossas4@gmail.com',
        pass: process.env.EMAIL_PASS || 'jvsd znpw hsfv jgmy',
    },
};

const TEST_EMAIL = 'lorddeep3@gmail.com';

// ============================================================
// DATOS DE PRUEBA - COTIZACIÓN
// ============================================================
const datosCotizacion = {
    numeroCotizacion: 'COT-2025-TEST-001',
    fechaCotizacion: new Date().toLocaleDateString('es-CO'),
    fechaVencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO'),
    diasValidez: 30,
    version: 1,

    cliente: {
        nombre: 'EMPRESA DEMO S.A.S',
        nit: '900.123.456-7',
        direccion: 'Calle 100 #45-67, Bogotá',
        telefono: '(601) 555-1234',
        email: TEST_EMAIL,
        contacto: 'Juan Pérez - Gerente de Mantenimiento',
    },

    equipo: {
        tipoEquipo: 'GENERADOR',
        marca: 'CATERPILLAR',
        modelo: 'C32',
        serie: 'CAT123456789',
        ubicacion: 'Planta Principal - Área de Emergencia',
    },

    asunto: 'Mantenimiento Preventivo Tipo A + Cambio de Filtros',
    descripcionGeneral: 'Mantenimiento preventivo completo para generador Caterpillar C32, incluyendo inspección de todos los sistemas, cambio de filtros y aceite.',
    alcanceTrabajo: 'Inspección de sistema de refrigeración, sistema eléctrico, sistema de combustible. Cambio de aceite motor. Cambio de filtros (aceite, aire, combustible). Pruebas de funcionamiento.',
    exclusiones: 'No incluye repuestos mayores ni reparaciones correctivas.',

    itemsServicios: [
        { orden: 1, descripcion: 'Mantenimiento Preventivo Tipo A', cantidad: 1, unidad: 'Servicio', precioUnitario: 1500000, descuentoPorcentaje: 0, subtotal: 1500000 },
        { orden: 2, descripcion: 'Cambio de Aceite Motor (incluye aceite)', cantidad: 1, unidad: 'Servicio', precioUnitario: 850000, descuentoPorcentaje: 5, subtotal: 807500 },
        { orden: 3, descripcion: 'Mano de obra técnico especializado', cantidad: 8, unidad: 'Hora', precioUnitario: 75000, descuentoPorcentaje: 0, subtotal: 600000 },
    ],

    itemsComponentes: [
        { orden: 1, descripcion: 'Filtro de Aceite CAT 1R-0750', referencia: '1R-0750', cantidad: 2, unidad: 'Unidad', precioUnitario: 185000, descuentoPorcentaje: 0, subtotal: 370000 },
        { orden: 2, descripcion: 'Filtro de Aire Primario CAT 6I-2503', referencia: '6I-2503', cantidad: 1, unidad: 'Unidad', precioUnitario: 420000, descuentoPorcentaje: 0, subtotal: 420000 },
        { orden: 3, descripcion: 'Filtro de Combustible CAT 1R-0751', referencia: '1R-0751', cantidad: 2, unidad: 'Unidad', precioUnitario: 165000, descuentoPorcentaje: 0, subtotal: 330000 },
        { orden: 4, descripcion: 'Elemento Separador de Agua 326-1644', referencia: '326-1644', cantidad: 1, unidad: 'Unidad', precioUnitario: 280000, descuentoPorcentaje: 0, subtotal: 280000 },
    ],

    totales: {
        subtotalServicios: 2907500,
        subtotalComponentes: 1400000,
        subtotalGeneral: 4307500,
        descuentoPorcentaje: 0,
        descuentoValor: 0,
        subtotalConDescuento: 4307500,
        ivaPorcentaje: 19,
        ivaValor: 818425,
        totalCotizacion: 5125925,
    },

    formaPago: '50% anticipo, 50% contra entrega',
    tiempoEstimadoDias: 3,
    mesesGarantia: 6,
    observacionesGarantia: 'La garantía cubre defectos de mano de obra. Los repuestos tienen garantía del fabricante.',
    terminosCondiciones: `
1. Los precios incluyen IVA del 19% según normativa vigente.
2. El tiempo de ejecución inicia tras aprobación formal y anticipo.
3. La garantía cubre exclusivamente defectos de mano de obra.
4. Trabajos adicionales serán cotizados por separado.
5. Esta cotización tiene validez de 30 días calendario.
6. Los repuestos son originales con garantía del fabricante.
    `.trim(),

    elaboradoPor: 'Carlos Mendoza Ríos',
    cargoElaborador: 'Ingeniero de Servicio',
};

// ============================================================
// COLORES MEKANOS
// ============================================================
const MEKANOS_COLORS = {
    primary: '#244673',      // Azul oscuro
    secondary: '#3290A6',    // Azul claro
    success: '#56A672',      // Verde
    highlight: '#9EC23D',    // Verde claro
    warning: '#F5A623',
    danger: '#D0021B',
    text: '#333333',
    textLight: '#666666',
    border: '#E0E0E0',
    background: '#F5F7FA',
};

// ============================================================
// TEMPLATE HTML COTIZACIÓN
// ============================================================
function generarHTMLCotizacion(datos) {
    const formatNumber = (num) => num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Cotización ${datos.numeroCotizacion}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: ${MEKANOS_COLORS.text}; line-height: 1.4; }
        .page { width: 210mm; min-height: 297mm; padding: 15mm; background: white; }
        
        /* Header */
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${MEKANOS_COLORS.primary}; padding-bottom: 15px; margin-bottom: 20px; }
        .logo-section { display: flex; align-items: center; }
        .logo { width: 60px; height: 60px; background: ${MEKANOS_COLORS.primary}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; margin-right: 12px; }
        .company-info h1 { font-size: 22px; color: ${MEKANOS_COLORS.primary}; margin-bottom: 4px; }
        .company-info p { font-size: 9px; color: ${MEKANOS_COLORS.textLight}; }
        
        .quote-info { text-align: right; background: ${MEKANOS_COLORS.background}; padding: 12px; border-radius: 8px; }
        .quote-number { font-size: 14px; font-weight: bold; color: ${MEKANOS_COLORS.primary}; }
        .quote-date { font-size: 9px; color: ${MEKANOS_COLORS.textLight}; margin-top: 4px; }
        .quote-validity { font-size: 9px; color: ${MEKANOS_COLORS.success}; font-weight: bold; margin-top: 4px; }
        
        /* Secciones */
        .section { margin-bottom: 18px; }
        .section-title { font-size: 11px; font-weight: bold; color: ${MEKANOS_COLORS.primary}; padding: 6px 10px; background: ${MEKANOS_COLORS.background}; border-left: 4px solid ${MEKANOS_COLORS.primary}; margin-bottom: 10px; }
        
        /* Grid de datos */
        .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .data-box { background: white; border: 1px solid ${MEKANOS_COLORS.border}; padding: 12px; border-radius: 6px; }
        .data-box h3 { font-size: 10px; color: ${MEKANOS_COLORS.secondary}; margin-bottom: 8px; text-transform: uppercase; }
        .data-row { margin-bottom: 4px; }
        .data-label { color: ${MEKANOS_COLORS.textLight}; font-size: 8px; }
        .data-value { font-weight: 500; font-size: 10px; }
        
        /* Tablas */
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background: ${MEKANOS_COLORS.primary}; color: white; padding: 8px 6px; font-size: 9px; text-align: left; }
        td { padding: 7px 6px; border-bottom: 1px solid ${MEKANOS_COLORS.border}; font-size: 9px; }
        tr:nth-child(even) { background: ${MEKANOS_COLORS.background}; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        /* Totales */
        .totals-section { display: flex; justify-content: flex-end; }
        .totals-box { width: 280px; background: ${MEKANOS_COLORS.background}; border-radius: 8px; padding: 12px; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 10px; }
        .total-row.final { border-top: 2px solid ${MEKANOS_COLORS.primary}; margin-top: 8px; padding-top: 10px; font-size: 14px; font-weight: bold; color: ${MEKANOS_COLORS.primary}; }
        
        /* Condiciones */
        .conditions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px; }
        .condition-item { background: ${MEKANOS_COLORS.background}; padding: 10px; border-radius: 6px; text-align: center; }
        .condition-label { font-size: 8px; color: ${MEKANOS_COLORS.textLight}; margin-bottom: 4px; }
        .condition-value { font-weight: bold; font-size: 11px; color: ${MEKANOS_COLORS.primary}; }
        
        /* Términos */
        .terms-box { background: white; border: 1px solid ${MEKANOS_COLORS.border}; padding: 12px; border-radius: 6px; font-size: 8px; line-height: 1.5; }
        
        /* Firmas */
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
        .signature-box { text-align: center; }
        .signature-line { border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 8px; margin-top: 40px; }
        .signature-name { font-weight: bold; font-size: 10px; }
        .signature-title { font-size: 8px; color: ${MEKANOS_COLORS.textLight}; }
        
        /* Footer */
        .footer { position: fixed; bottom: 10mm; left: 15mm; right: 15mm; text-align: center; font-size: 8px; color: ${MEKANOS_COLORS.textLight}; border-top: 1px solid ${MEKANOS_COLORS.border}; padding-top: 8px; }
    </style>
</head>
<body>
    <div class="page">
        <!-- HEADER -->
        <div class="header">
            <div class="logo-section">
                <div class="logo">MEKANOS</div>
                <div class="company-info">
                    <h1>MEKANOS S.A.S</h1>
                    <p>Especialistas en Equipos Electrógenos</p>
                    <p>NIT: 900.123.456-7</p>
                </div>
            </div>
            <div class="quote-info">
                <div class="quote-number">${datos.numeroCotizacion}</div>
                <div class="quote-date">Fecha: ${datos.fechaCotizacion}</div>
                <div class="quote-validity">Válida hasta: ${datos.fechaVencimiento}</div>
            </div>
        </div>
        
        <!-- DATOS CLIENTE Y EQUIPO -->
        <div class="section">
            <div class="data-grid">
                <div class="data-box">
                    <h3>👤 Datos del Cliente</h3>
                    <div class="data-row">
                        <span class="data-label">Empresa:</span>
                        <span class="data-value">${datos.cliente.nombre}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">NIT:</span>
                        <span class="data-value">${datos.cliente.nit || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Dirección:</span>
                        <span class="data-value">${datos.cliente.direccion}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Contacto:</span>
                        <span class="data-value">${datos.cliente.contacto || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Email:</span>
                        <span class="data-value">${datos.cliente.email || 'N/A'}</span>
                    </div>
                </div>
                
                ${datos.equipo ? `
                <div class="data-box">
                    <h3>⚙️ Datos del Equipo</h3>
                    <div class="data-row">
                        <span class="data-label">Tipo:</span>
                        <span class="data-value">${datos.equipo.tipoEquipo}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Marca:</span>
                        <span class="data-value">${datos.equipo.marca}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Modelo:</span>
                        <span class="data-value">${datos.equipo.modelo || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Serie:</span>
                        <span class="data-value">${datos.equipo.serie || 'N/A'}</span>
                    </div>
                    <div class="data-row">
                        <span class="data-label">Ubicación:</span>
                        <span class="data-value">${datos.equipo.ubicacion || 'N/A'}</span>
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- ASUNTO -->
        <div class="section">
            <div class="section-title">📋 ASUNTO: ${datos.asunto}</div>
            ${datos.descripcionGeneral ? `<p style="padding: 10px; font-size: 9px;">${datos.descripcionGeneral}</p>` : ''}
        </div>
        
        <!-- SERVICIOS -->
        <div class="section">
            <div class="section-title">🔧 SERVICIOS</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 45%;">Descripción</th>
                        <th style="width: 10%;" class="text-center">Cant.</th>
                        <th style="width: 10%;">Unidad</th>
                        <th style="width: 15%;" class="text-right">Precio Unit.</th>
                        <th style="width: 15%;" class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${datos.itemsServicios.map(item => `
                    <tr>
                        <td class="text-center">${item.orden}</td>
                        <td>${item.descripcion}</td>
                        <td class="text-center">${item.cantidad}</td>
                        <td>${item.unidad}</td>
                        <td class="text-right">$ ${formatNumber(item.precioUnitario)}</td>
                        <td class="text-right">$ ${formatNumber(item.subtotal)}</td>
                    </tr>
                    `).join('')}
                    <tr style="background: ${MEKANOS_COLORS.secondary}15;">
                        <td colspan="5" class="text-right" style="font-weight: bold;">Subtotal Servicios:</td>
                        <td class="text-right" style="font-weight: bold;">$ ${formatNumber(datos.totales.subtotalServicios)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- COMPONENTES -->
        <div class="section">
            <div class="section-title">🔩 COMPONENTES Y REPUESTOS</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 35%;">Descripción</th>
                        <th style="width: 12%;">Referencia</th>
                        <th style="width: 8%;" class="text-center">Cant.</th>
                        <th style="width: 10%;">Unidad</th>
                        <th style="width: 15%;" class="text-right">Precio Unit.</th>
                        <th style="width: 15%;" class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${datos.itemsComponentes.map(item => `
                    <tr>
                        <td class="text-center">${item.orden}</td>
                        <td>${item.descripcion}</td>
                        <td>${item.referencia || '-'}</td>
                        <td class="text-center">${item.cantidad}</td>
                        <td>${item.unidad}</td>
                        <td class="text-right">$ ${formatNumber(item.precioUnitario)}</td>
                        <td class="text-right">$ ${formatNumber(item.subtotal)}</td>
                    </tr>
                    `).join('')}
                    <tr style="background: ${MEKANOS_COLORS.secondary}15;">
                        <td colspan="6" class="text-right" style="font-weight: bold;">Subtotal Componentes:</td>
                        <td class="text-right" style="font-weight: bold;">$ ${formatNumber(datos.totales.subtotalComponentes)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- TOTALES -->
        <div class="totals-section">
            <div class="totals-box">
                <div class="total-row">
                    <span>Subtotal Servicios:</span>
                    <span>$ ${formatNumber(datos.totales.subtotalServicios)}</span>
                </div>
                <div class="total-row">
                    <span>Subtotal Componentes:</span>
                    <span>$ ${formatNumber(datos.totales.subtotalComponentes)}</span>
                </div>
                <div class="total-row">
                    <span><strong>Subtotal General:</strong></span>
                    <span><strong>$ ${formatNumber(datos.totales.subtotalGeneral)}</strong></span>
                </div>
                ${datos.totales.descuentoValor > 0 ? `
                <div class="total-row" style="color: ${MEKANOS_COLORS.success};">
                    <span>Descuento (${datos.totales.descuentoPorcentaje}%):</span>
                    <span>- $ ${formatNumber(datos.totales.descuentoValor)}</span>
                </div>
                ` : ''}
                <div class="total-row">
                    <span>IVA (${datos.totales.ivaPorcentaje}%):</span>
                    <span>$ ${formatNumber(datos.totales.ivaValor)}</span>
                </div>
                <div class="total-row final">
                    <span>TOTAL COTIZACIÓN:</span>
                    <span>$ ${formatNumber(datos.totales.totalCotizacion)}</span>
                </div>
            </div>
        </div>
        
        <!-- CONDICIONES COMERCIALES -->
        <div class="section" style="margin-top: 25px;">
            <div class="section-title">📋 CONDICIONES COMERCIALES</div>
            <div class="conditions-grid">
                <div class="condition-item">
                    <div class="condition-label">Forma de Pago</div>
                    <div class="condition-value">${datos.formaPago}</div>
                </div>
                <div class="condition-item">
                    <div class="condition-label">Tiempo Estimado</div>
                    <div class="condition-value">${datos.tiempoEstimadoDias || 'Por confirmar'} días</div>
                </div>
                <div class="condition-item">
                    <div class="condition-label">Garantía</div>
                    <div class="condition-value">${datos.mesesGarantia} meses</div>
                </div>
                <div class="condition-item">
                    <div class="condition-label">Validez</div>
                    <div class="condition-value">${datos.diasValidez} días</div>
                </div>
            </div>
        </div>
        
        <!-- TÉRMINOS Y CONDICIONES -->
        <div class="section">
            <div class="section-title">📜 TÉRMINOS Y CONDICIONES</div>
            <div class="terms-box">
                ${datos.terminosCondiciones.replace(/\n/g, '<br>')}
            </div>
        </div>
        
        <!-- FIRMAS -->
        <div class="signatures">
            <div class="signature-box">
                <div class="signature-line">
                    <div class="signature-name">${datos.elaboradoPor}</div>
                    <div class="signature-title">${datos.cargoElaborador || 'Asesor Comercial'}</div>
                    <div class="signature-title">MEKANOS S.A.S</div>
                </div>
            </div>
            <div class="signature-box">
                <div class="signature-line">
                    <div class="signature-name">Firma y Sello Cliente</div>
                    <div class="signature-title">Aceptación de la Cotización</div>
                </div>
            </div>
        </div>
        
        <!-- FOOTER -->
        <div class="footer">
            <strong>MEKANOS S.A.S</strong> - NIT: 900.123.456-7<br>
            BARRIO LIBANO CRA 49C #31-35 DIAG. AL SENA - Cartagena, Colombia<br>
            TEL: 6359384 | CEL: 315-7083350 | EMAIL: mekanossas2@gmail.com
        </div>
    </div>
</body>
</html>
    `.trim();
}

// ============================================================
// FUNCIONES DE TEST
// ============================================================
async function generarPDFCotizacion(datos) {
    console.log('\n📄 Generando PDF de cotización...');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        const html = generarHTMLCotizacion(datos);

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });

        console.log(`   ✅ PDF generado: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        return pdfBuffer;
    } finally {
        await browser.close();
    }
}

async function enviarEmailCotizacion(pdfBuffer, datos) {
    console.log('\n📧 Enviando cotización por email...');

    const transporter = nodemailer.createTransport(EMAIL_CONFIG);

    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #244673; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .highlight { background: #3290A6; color: white; padding: 10px; margin: 10px 0; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { padding: 10px; border: 1px solid #ddd; text-align: left; }
        th { background: #244673; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MEKANOS S.A.S</h1>
            <p>Especialistas en Equipos Electrógenos</p>
        </div>
        
        <div class="content">
            <p>Estimado/a <strong>${datos.cliente.contacto || 'Cliente'}</strong>,</p>
            
            <p>Es un placer contactarle. A continuación encontrará nuestra propuesta comercial:</p>
            
            <div class="highlight">
                <strong>Cotización:</strong> ${datos.numeroCotizacion}<br>
                <strong>Fecha:</strong> ${datos.fechaCotizacion}<br>
                <strong>Validez:</strong> ${datos.diasValidez} días
            </div>
            
            <table>
                <tr>
                    <th>Concepto</th>
                    <th style="text-align: right;">Valor</th>
                </tr>
                <tr>
                    <td>Subtotal Servicios</td>
                    <td style="text-align: right;">$ ${datos.totales.subtotalServicios.toLocaleString('es-CO')}</td>
                </tr>
                <tr>
                    <td>Subtotal Componentes</td>
                    <td style="text-align: right;">$ ${datos.totales.subtotalComponentes.toLocaleString('es-CO')}</td>
                </tr>
                <tr>
                    <td><strong>TOTAL (IVA incluido)</strong></td>
                    <td style="text-align: right;"><strong>$ ${datos.totales.totalCotizacion.toLocaleString('es-CO')}</strong></td>
                </tr>
            </table>
            
            <p>Adjunto encontrará el documento PDF con el detalle completo de la cotización.</p>
            
            <p><strong>Condiciones:</strong></p>
            <ul>
                <li>Forma de pago: ${datos.formaPago}</li>
                <li>Tiempo estimado: ${datos.tiempoEstimadoDias} días</li>
                <li>Garantía: ${datos.mesesGarantia} meses</li>
            </ul>
            
            <p>Quedamos atentos a cualquier consulta.</p>
            
            <p>Cordialmente,<br>
            <strong>${datos.elaboradoPor}</strong><br>
            ${datos.cargoElaborador}<br>
            MEKANOS S.A.S</p>
        </div>
        
        <div class="footer">
            <strong>MEKANOS S.A.S</strong><br>
            Cartagena de Indias, Colombia<br>
            Tel: 6359384 | www.mekanosrep.com
        </div>
    </div>
</body>
</html>
    `.trim();

    const resultado = await transporter.sendMail({
        from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
        to: TEST_EMAIL,
        subject: `Cotización ${datos.numeroCotizacion} - MEKANOS S.A.S`,
        html: htmlEmail,
        attachments: [{
            filename: `${datos.numeroCotizacion}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
        }],
    });

    console.log(`   ✅ Email enviado exitosamente`);
    console.log(`   📧 Destinatario: ${TEST_EMAIL}`);
    console.log(`   📨 Message ID: ${resultado.messageId}`);

    return resultado;
}

// ============================================================
// EJECUCIÓN DEL TEST
// ============================================================
async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST ATÓMICO 09 - COTIZACIÓN PDF + EMAIL                                  ║');
    console.log('║  MEKANOS S.A.S - Sistema de Mantenimiento Industrial                       ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    const resultados = {
        pdfGenerado: false,
        pdfTamanio: 0,
        emailEnviado: false,
        messageId: null,
    };

    try {
        // 1. Generar PDF
        const pdfBuffer = await generarPDFCotizacion(datosCotizacion);
        resultados.pdfGenerado = true;
        resultados.pdfTamanio = pdfBuffer.length;

        // 2. Enviar email con PDF adjunto
        const emailResult = await enviarEmailCotizacion(pdfBuffer, datosCotizacion);
        resultados.emailEnviado = true;
        resultados.messageId = emailResult.messageId;

        // Resumen
        console.log('\n════════════════════════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN DEL TEST');
        console.log('════════════════════════════════════════════════════════════════════════════\n');

        console.log(`   ✅ PDF Generado: ${(resultados.pdfTamanio / 1024).toFixed(2)} KB`);
        console.log(`   ✅ Email Enviado: ${TEST_EMAIL}`);
        console.log(`   ✅ Message ID: ${resultados.messageId}`);

        console.log('\n════════════════════════════════════════════════════════════════════════════');
        console.log('🎉 TEST ATÓMICO 09: ✅ ÉXITO');
        console.log('════════════════════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ ERROR EN TEST:', error.message);
        console.log('\n════════════════════════════════════════════════════════════════════════════');
        console.log('⚠️ TEST ATÓMICO 09: ❌ FALLIDO');
        console.log('════════════════════════════════════════════════════════════════════════════\n');
        process.exit(1);
    }
}

main();
