/**
 * TEST ATÓMICO 10 - PROPUESTA CORRECTIVO PDF + EMAIL
 * ===================================================
 * 
 * Valida el flujo completo de propuesta correctivo:
 * 1. Generar PDF con template real
 * 2. Enviar por email con PDF adjunto
 * 
 * MEKANOS S.A.S - Sistema de Mantenimiento Industrial
 */

const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

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

// Colores MEKANOS
const MEKANOS_COLORS = {
    background: '#F2F2F2',
    primary: '#244673',
    secondary: '#3290A6',
    success: '#56A672',
    highlight: '#9EC23D',
    white: '#FFFFFF',
    text: '#333333',
    textLight: '#666666',
    border: '#E0E0E0',
    warning: '#F5A623',
    danger: '#D0021B',
};

// ============================================================
// DATOS DE PRUEBA - PROPUESTA CORRECTIVO
// ============================================================
const datosPropuesta = {
    numeroPropuesta: 'PC-2025-TEST-001',
    fechaPropuesta: new Date().toLocaleDateString('es-CO'),
    version: 1,
    prioridad: 'ALTA',

    ordenServicioOrigen: {
        numeroOrden: 'OS-2025-001234',
        fechaServicio: '15/11/2025',
        tipoServicio: 'Mantenimiento Preventivo Tipo A',
        tecnicoInspector: 'Carlos Mendoza Ríos',
    },

    cliente: {
        nombre: 'HOTEL CARIBE CARTAGENA S.A.',
        nit: '800.123.456-7',
        direccion: 'Bocagrande Cra 1 #2-87, Cartagena',
        telefono: '(605) 665-1234',
        email: TEST_EMAIL,
        contacto: 'Ing. Roberto Martínez - Jefe de Mantenimiento',
    },

    equipo: {
        tipoEquipo: 'GENERADOR',
        marca: 'CATERPILLAR',
        modelo: 'C18',
        serie: 'CAT18-2024-789',
        ubicacion: 'Cuarto de Máquinas - Sótano 2',
        horasOperacion: 4850,
    },

    problemaDetectado: {
        descripcion: 'Durante el mantenimiento preventivo se detectó fuga de aceite en el sello del cigüeñal trasero del motor, con acumulación visible en la bandeja de drenaje. El nivel de aceite ha descendido 2 litros en las últimas 200 horas de operación.',
        sintomas: [
            'Fuga visible de aceite en sello trasero',
            'Nivel de aceite descendiendo progresivamente',
            'Manchas de aceite en piso del cuarto de máquinas',
            'Olor a aceite quemado durante operación',
        ],
        sistemasAfectados: ['Motor', 'Sistema de Lubricación'],
        nivelCriticidad: 'CRITICO',
        observacionesTecnico: 'El sello presenta desgaste severo compatible con el horómetro del equipo. Recomiendo intervención urgente para evitar daño mayor al motor.',
    },

    diagnostico: {
        causaProbable: 'Desgaste natural del sello del cigüeñal trasero por horas de operación (4850 hrs). Vida útil típica del sello: 4000-5000 horas.',
        analisisTecnico: 'El sello de labio del cigüeñal trasero presenta deformación por fatiga térmica y mecánica. La fuga actual es de aproximadamente 100ml/hora de operación. Si no se interviene, puede progresar a falla catastrófica con pérdida total de aceite en 48-72 horas de operación continua.',
        riesgosNoActuar: [
            'Daño irreversible a cojinetes del cigüeñal por falta de lubricación',
            'Sobrecalentamiento del motor y posible fundición',
            'Contaminación ambiental por derrame de aceite',
            'Paro no programado del generador en momento crítico',
            'Incremento exponencial del costo de reparación',
        ],
    },

    solucionPropuesta: {
        descripcion: 'Reemplazo completo del sello del cigüeñal trasero con inspección y limpieza del área de alojamiento. Incluye cambio de aceite y filtros como medida preventiva.',
        alcanceTrabajo: [
            'Drenaje completo del aceite del motor',
            'Desmontaje de volante y housing trasero',
            'Extracción del sello dañado',
            'Inspección de superficie del cigüeñal',
            'Instalación de sello nuevo original CAT',
            'Reinstalación de componentes',
            'Llenado con aceite CAT DEO 15W-40 nuevo',
            'Cambio de filtro de aceite',
            'Pruebas de funcionamiento por 2 horas',
            'Verificación de ausencia de fugas',
        ],
        exclusiones: [
            'Reparación de cigüeñal si presenta daño',
            'Reemplazo de cojinetes principales',
            'Trabajos en otros sistemas del motor',
        ],
        tiempoEstimadoHoras: 16,
        requiereParadaEquipo: true,
    },

    itemsRepuestos: [
        { orden: 1, descripcion: 'Sello Cigüeñal Trasero CAT Original', referencia: '197-9322', cantidad: 1, unidad: 'Und', precioUnitario: 850000, subtotal: 850000 },
        { orden: 2, descripcion: 'Empaque Housing Trasero', referencia: '235-1614', cantidad: 1, unidad: 'Und', precioUnitario: 320000, subtotal: 320000 },
        { orden: 3, descripcion: 'Aceite Motor CAT DEO 15W-40 (galón)', referencia: 'DEO-15W40', cantidad: 12, unidad: 'Gal', precioUnitario: 125000, subtotal: 1500000 },
        { orden: 4, descripcion: 'Filtro de Aceite CAT', referencia: '1R-0750', cantidad: 2, unidad: 'Und', precioUnitario: 185000, subtotal: 370000 },
        { orden: 5, descripcion: 'Sellador Loctite 518', referencia: 'LOCTITE-518', cantidad: 1, unidad: 'Und', precioUnitario: 95000, subtotal: 95000 },
    ],

    itemsManoObra: [
        { orden: 1, descripcion: 'Ingeniero de Servicio Senior', horas: 16, tarifaHora: 95000, subtotal: 1520000 },
        { orden: 2, descripcion: 'Técnico Mecánico Auxiliar', horas: 16, tarifaHora: 55000, subtotal: 880000 },
    ],

    costos: {
        subtotalRepuestos: 3135000,
        subtotalManoObra: 2400000,
        subtotalGeneral: 5535000,
        descuentoPorcentaje: 5,
        descuentoValor: 276750,
        ivaPorcentaje: 19,
        ivaValor: 999068,
        totalPropuesta: 6257318,
    },

    formaPago: '50% anticipo, 50% contra entrega',
    diasValidez: 15,
    mesesGarantia: 6,

    elaboradoPor: 'Carlos Mendoza Ríos',
    cargoElaborador: 'Ingeniero de Servicio Senior',
};

// ============================================================
// GENERAR HTML DE PROPUESTA CORRECTIVO
// ============================================================
function generarHTMLPropuestaCorrectivo(datos) {
    const formatNumber = (num) => num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const getCriticalityStyle = (nivel) => {
        switch (nivel) {
            case 'LEVE': return 'background: #e8f5e9; border-left: 4px solid #4caf50;';
            case 'MODERADO': return `background: #fff3e0; border-left: 4px solid ${MEKANOS_COLORS.warning};`;
            case 'CRITICO': return `background: #ffebee; border-left: 4px solid ${MEKANOS_COLORS.danger};`;
            case 'EMERGENCIA': return 'background: #f3e5f5; border-left: 4px solid #9c27b0;';
            default: return '';
        }
    };

    const getPriorityStyle = (prioridad) => {
        switch (prioridad) {
            case 'BAJA': return 'background: #e0e0e0; color: #666;';
            case 'NORMAL': return `background: ${MEKANOS_COLORS.secondary}; color: white;`;
            case 'ALTA': return `background: ${MEKANOS_COLORS.warning}; color: white;`;
            case 'URGENTE': return `background: ${MEKANOS_COLORS.danger}; color: white;`;
            default: return '';
        }
    };

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Propuesta Correctivo ${datos.numeroPropuesta}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: ${MEKANOS_COLORS.text}; line-height: 1.4; }
        .page { width: 210mm; min-height: 297mm; padding: 12mm; background: white; }
        
        /* Header */
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${MEKANOS_COLORS.primary}; padding-bottom: 12px; margin-bottom: 15px; }
        .logo { width: 55px; height: 55px; background: ${MEKANOS_COLORS.primary}; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px; margin-right: 10px; }
        .company-info h1 { font-size: 18px; color: ${MEKANOS_COLORS.primary}; }
        .company-info p { font-size: 8px; color: ${MEKANOS_COLORS.textLight}; }
        .quote-info { text-align: right; }
        .priority-badge { display: inline-block; padding: 4px 10px; border-radius: 10px; font-size: 9px; font-weight: bold; ${getPriorityStyle(datos.prioridad)} }
        
        /* Secciones */
        .section { margin-bottom: 12px; }
        .section-title { font-size: 10px; font-weight: bold; color: white; padding: 5px 8px; background: ${MEKANOS_COLORS.primary}; margin-bottom: 8px; }
        
        /* Grid de datos */
        .data-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .data-box { background: white; border: 1px solid ${MEKANOS_COLORS.border}; padding: 10px; border-radius: 4px; }
        .data-box h3 { font-size: 9px; color: ${MEKANOS_COLORS.secondary}; margin-bottom: 6px; }
        .data-row { margin-bottom: 3px; font-size: 9px; }
        .data-label { color: ${MEKANOS_COLORS.textLight}; font-size: 7px; }
        .data-value { font-weight: 500; }
        
        /* Criticidad */
        .criticality-box { padding: 12px; border-radius: 6px; margin-bottom: 10px; ${getCriticalityStyle(datos.problemaDetectado.nivelCriticidad)} }
        .symptom-tag { background: ${MEKANOS_COLORS.background}; padding: 3px 8px; border-radius: 3px; font-size: 8px; display: inline-block; margin: 2px; border: 1px solid ${MEKANOS_COLORS.border}; }
        
        /* Riesgos */
        .risk-item { display: flex; align-items: flex-start; margin-bottom: 5px; font-size: 9px; }
        .risk-icon { color: ${MEKANOS_COLORS.danger}; margin-right: 6px; font-weight: bold; }
        
        /* Tablas */
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; }
        th { background: ${MEKANOS_COLORS.primary}; color: white; padding: 5px 4px; text-align: left; }
        td { padding: 4px; border-bottom: 1px solid ${MEKANOS_COLORS.border}; }
        tr:nth-child(even) { background: ${MEKANOS_COLORS.background}; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        
        /* Totales */
        .totals-box { width: 250px; background: ${MEKANOS_COLORS.background}; padding: 10px; border-radius: 6px; margin-left: auto; }
        .total-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 9px; }
        .total-row.final { border-top: 2px solid ${MEKANOS_COLORS.primary}; margin-top: 6px; padding-top: 8px; font-size: 12px; font-weight: bold; color: ${MEKANOS_COLORS.primary}; }
        
        /* Condiciones */
        .conditions-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
        .condition-item { background: ${MEKANOS_COLORS.background}; padding: 8px; border-radius: 4px; text-align: center; }
        .condition-label { font-size: 7px; color: ${MEKANOS_COLORS.textLight}; }
        .condition-value { font-weight: bold; font-size: 10px; color: ${MEKANOS_COLORS.primary}; }
        
        /* Footer */
        .footer { position: fixed; bottom: 8mm; left: 12mm; right: 12mm; text-align: center; font-size: 7px; color: ${MEKANOS_COLORS.textLight}; border-top: 1px solid ${MEKANOS_COLORS.border}; padding-top: 6px; }
    </style>
</head>
<body>
    <div class="page">
        <!-- HEADER -->
        <div class="header">
            <div style="display: flex; align-items: center;">
                <div class="logo">MEKANOS</div>
                <div class="company-info">
                    <h1>MEKANOS S.A.S</h1>
                    <p>Especialistas en Equipos Electrógenos</p>
                </div>
            </div>
            <div class="quote-info">
                <div style="font-size: 10px; color: ${MEKANOS_COLORS.primary}; font-weight: bold;">PROPUESTA DE CORRECTIVO</div>
                <div style="font-size: 12px; font-weight: bold; color: ${MEKANOS_COLORS.secondary}; margin: 4px 0;">${datos.numeroPropuesta}</div>
                <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">Fecha: ${datos.fechaPropuesta}</div>
                <div style="margin-top: 6px;"><span class="priority-badge">${datos.prioridad}</span></div>
            </div>
        </div>
        
        <!-- DATOS ORIGEN, CLIENTE, EQUIPO -->
        <div class="section">
            <div class="data-grid">
                <div class="data-box">
                    <h3>📋 ORDEN DE ORIGEN</h3>
                    <div class="data-row"><span class="data-label">Número:</span> <span class="data-value">${datos.ordenServicioOrigen.numeroOrden}</span></div>
                    <div class="data-row"><span class="data-label">Fecha:</span> <span class="data-value">${datos.ordenServicioOrigen.fechaServicio}</span></div>
                    <div class="data-row"><span class="data-label">Tipo:</span> <span class="data-value">${datos.ordenServicioOrigen.tipoServicio}</span></div>
                    <div class="data-row"><span class="data-label">Técnico:</span> <span class="data-value">${datos.ordenServicioOrigen.tecnicoInspector}</span></div>
                </div>
                <div class="data-box">
                    <h3>👤 CLIENTE</h3>
                    <div class="data-row"><span class="data-label">Empresa:</span> <span class="data-value">${datos.cliente.nombre}</span></div>
                    <div class="data-row"><span class="data-label">NIT:</span> <span class="data-value">${datos.cliente.nit}</span></div>
                    <div class="data-row"><span class="data-label">Contacto:</span> <span class="data-value">${datos.cliente.contacto}</span></div>
                </div>
                <div class="data-box">
                    <h3>⚙️ EQUIPO</h3>
                    <div class="data-row"><span class="data-label">Tipo:</span> <span class="data-value">${datos.equipo.tipoEquipo}</span></div>
                    <div class="data-row"><span class="data-label">Marca/Modelo:</span> <span class="data-value">${datos.equipo.marca} ${datos.equipo.modelo}</span></div>
                    <div class="data-row"><span class="data-label">Serie:</span> <span class="data-value">${datos.equipo.serie}</span></div>
                    <div class="data-row"><span class="data-label">Horas Op.:</span> <span class="data-value">${datos.equipo.horasOperacion.toLocaleString()} hrs</span></div>
                </div>
            </div>
        </div>
        
        <!-- PROBLEMA DETECTADO -->
        <div class="section">
            <div class="section-title">🔴 PROBLEMA DETECTADO</div>
            <div class="criticality-box">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong>Criticidad: ${datos.problemaDetectado.nivelCriticidad}</strong>
                    <span style="font-size: 8px;">Sistemas: ${datos.problemaDetectado.sistemasAfectados.join(', ')}</span>
                </div>
                <p style="font-size: 9px; margin-bottom: 8px;">${datos.problemaDetectado.descripcion}</p>
                <div>
                    <strong style="font-size: 8px;">Síntomas:</strong>
                    ${datos.problemaDetectado.sintomas.map(s => `<span class="symptom-tag">• ${s}</span>`).join(' ')}
                </div>
                ${datos.problemaDetectado.observacionesTecnico ? `
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed ${MEKANOS_COLORS.border};">
                    <strong style="font-size: 8px;">Observación técnico:</strong>
                    <p style="font-size: 8px; font-style: italic;">"${datos.problemaDetectado.observacionesTecnico}"</p>
                </div>
                ` : ''}
            </div>
        </div>
        
        <!-- DIAGNÓSTICO -->
        <div class="section">
            <div class="section-title">🔍 DIAGNÓSTICO</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="data-box">
                    <h3>Causa Probable</h3>
                    <p style="font-size: 9px; font-weight: 500;">${datos.diagnostico.causaProbable}</p>
                    <h3 style="margin-top: 10px;">Análisis Técnico</h3>
                    <p style="font-size: 8px;">${datos.diagnostico.analisisTecnico}</p>
                </div>
                <div class="data-box" style="background: #fff5f5; border-color: ${MEKANOS_COLORS.danger};">
                    <h3 style="color: ${MEKANOS_COLORS.danger};">⚠️ Riesgos de No Actuar</h3>
                    ${datos.diagnostico.riesgosNoActuar.map(r => `
                    <div class="risk-item">
                        <span class="risk-icon">!</span>
                        <span>${r}</span>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>
        
        <!-- SOLUCIÓN PROPUESTA -->
        <div class="section">
            <div class="section-title">✅ SOLUCIÓN PROPUESTA</div>
            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 10px;">
                <div class="data-box">
                    <p style="font-size: 10px; font-weight: 500; margin-bottom: 8px;">${datos.solucionPropuesta.descripcion}</p>
                    <h4 style="font-size: 8px; color: ${MEKANOS_COLORS.secondary}; margin-bottom: 5px;">Alcance:</h4>
                    ${datos.solucionPropuesta.alcanceTrabajo.map(a => `
                    <div style="font-size: 8px; margin-bottom: 3px;">✓ ${a}</div>
                    `).join('')}
                    ${datos.solucionPropuesta.exclusiones ? `
                    <h4 style="font-size: 8px; color: ${MEKANOS_COLORS.textLight}; margin: 8px 0 5px 0;">No incluye:</h4>
                    ${datos.solucionPropuesta.exclusiones.map(e => `
                    <div style="font-size: 7px; color: ${MEKANOS_COLORS.textLight};">✗ ${e}</div>
                    `).join('')}
                    ` : ''}
                </div>
                <div style="text-align: center;">
                    <div style="background: ${MEKANOS_COLORS.secondary}; color: white; padding: 8px 12px; border-radius: 15px; display: inline-block;">
                        🕐 ${datos.solucionPropuesta.tiempoEstimadoHoras} horas estimadas
                    </div>
                    ${datos.solucionPropuesta.requiereParadaEquipo ? `
                    <div style="margin-top: 10px; background: ${MEKANOS_COLORS.warning}15; padding: 8px; border-radius: 6px;">
                        <span style="font-size: 8px; color: ${MEKANOS_COLORS.warning};">⚠️ Requiere parada del equipo</span>
                    </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <!-- REPUESTOS -->
        <div class="section">
            <div class="section-title">🔩 REPUESTOS Y MATERIALES</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 40%;">Descripción</th>
                        <th style="width: 15%;">Referencia</th>
                        <th style="width: 10%;" class="text-center">Cant.</th>
                        <th style="width: 15%;" class="text-right">Precio Unit.</th>
                        <th style="width: 15%;" class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${datos.itemsRepuestos.map(item => `
                    <tr>
                        <td class="text-center">${item.orden}</td>
                        <td>${item.descripcion}</td>
                        <td>${item.referencia}</td>
                        <td class="text-center">${item.cantidad} ${item.unidad}</td>
                        <td class="text-right">$ ${formatNumber(item.precioUnitario)}</td>
                        <td class="text-right">$ ${formatNumber(item.subtotal)}</td>
                    </tr>
                    `).join('')}
                    <tr style="background: ${MEKANOS_COLORS.secondary}15;">
                        <td colspan="5" class="text-right" style="font-weight: bold;">Subtotal Repuestos:</td>
                        <td class="text-right" style="font-weight: bold;">$ ${formatNumber(datos.costos.subtotalRepuestos)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- MANO DE OBRA -->
        <div class="section">
            <div class="section-title">👷 MANO DE OBRA</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 50%;">Descripción</th>
                        <th style="width: 15%;" class="text-center">Horas</th>
                        <th style="width: 15%;" class="text-right">Tarifa/Hora</th>
                        <th style="width: 15%;" class="text-right">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${datos.itemsManoObra.map(item => `
                    <tr>
                        <td class="text-center">${item.orden}</td>
                        <td>${item.descripcion}</td>
                        <td class="text-center">${item.horas}</td>
                        <td class="text-right">$ ${formatNumber(item.tarifaHora)}</td>
                        <td class="text-right">$ ${formatNumber(item.subtotal)}</td>
                    </tr>
                    `).join('')}
                    <tr style="background: ${MEKANOS_COLORS.secondary}15;">
                        <td colspan="4" class="text-right" style="font-weight: bold;">Subtotal Mano de Obra:</td>
                        <td class="text-right" style="font-weight: bold;">$ ${formatNumber(datos.costos.subtotalManoObra)}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        
        <!-- TOTALES -->
        <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
            <div class="totals-box">
                <div class="total-row"><span>Subtotal Repuestos:</span><span>$ ${formatNumber(datos.costos.subtotalRepuestos)}</span></div>
                <div class="total-row"><span>Subtotal Mano de Obra:</span><span>$ ${formatNumber(datos.costos.subtotalManoObra)}</span></div>
                <div class="total-row"><span><strong>Subtotal General:</strong></span><span><strong>$ ${formatNumber(datos.costos.subtotalGeneral)}</strong></span></div>
                ${datos.costos.descuentoValor > 0 ? `
                <div class="total-row" style="color: ${MEKANOS_COLORS.success};">
                    <span>Descuento (${datos.costos.descuentoPorcentaje}%):</span>
                    <span>- $ ${formatNumber(datos.costos.descuentoValor)}</span>
                </div>
                ` : ''}
                <div class="total-row"><span>IVA (${datos.costos.ivaPorcentaje}%):</span><span>$ ${formatNumber(datos.costos.ivaValor)}</span></div>
                <div class="total-row final"><span>TOTAL:</span><span>$ ${formatNumber(datos.costos.totalPropuesta)}</span></div>
            </div>
        </div>
        
        <!-- CONDICIONES -->
        <div class="section">
            <div class="section-title">📋 CONDICIONES</div>
            <div class="conditions-grid">
                <div class="condition-item">
                    <div class="condition-label">Forma de Pago</div>
                    <div class="condition-value">${datos.formaPago}</div>
                </div>
                <div class="condition-item">
                    <div class="condition-label">Tiempo Estimado</div>
                    <div class="condition-value">${datos.solucionPropuesta.tiempoEstimadoHoras} horas</div>
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
        
        <!-- FIRMAS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;">
            <div style="text-align: center;">
                <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 6px; margin-top: 40px;">
                    <div style="font-weight: bold; font-size: 9px;">${datos.elaboradoPor}</div>
                    <div style="font-size: 7px; color: ${MEKANOS_COLORS.textLight};">${datos.cargoElaborador}</div>
                    <div style="font-size: 7px; color: ${MEKANOS_COLORS.textLight};">MEKANOS S.A.S</div>
                </div>
            </div>
            <div style="text-align: center;">
                <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 6px; margin-top: 40px;">
                    <div style="font-weight: bold; font-size: 9px;">Firma Cliente</div>
                    <div style="font-size: 7px; color: ${MEKANOS_COLORS.textLight};">Aprobación de la Propuesta</div>
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
async function generarPDFPropuestaCorrectivo(datos) {
    console.log('\n📄 Generando PDF de propuesta correctivo...');

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        const html = generarHTMLPropuestaCorrectivo(datos);

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

async function enviarEmailPropuestaCorrectivo(pdfBuffer, datos) {
    console.log('\n📧 Enviando propuesta correctivo por email...');

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
        .alert { background: #ffebee; border-left: 4px solid #D0021B; padding: 15px; margin: 15px 0; }
        .content { padding: 20px; background: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>MEKANOS S.A.S</h1>
            <p>Propuesta de Mantenimiento Correctivo</p>
        </div>
        
        <div class="content">
            <p>Estimado/a <strong>${datos.cliente.contacto}</strong>,</p>
            
            <p>Durante la inspección realizada a su equipo <strong>${datos.equipo.marca} ${datos.equipo.modelo}</strong>, 
            nuestro técnico detectó una situación que requiere atención:</p>
            
            <div class="alert">
                <strong>Problema Detectado:</strong><br>
                ${datos.problemaDetectado.descripcion}
                <br><br>
                <strong>Nivel de Criticidad: ${datos.problemaDetectado.nivelCriticidad}</strong>
            </div>
            
            <p>Adjunto encontrará nuestra propuesta técnico-comercial con el diagnóstico completo, 
            la solución propuesta y el detalle de costos.</p>
            
            <p><strong>Resumen de la propuesta:</strong></p>
            <ul>
                <li>Propuesta: ${datos.numeroPropuesta}</li>
                <li>Tiempo estimado: ${datos.solucionPropuesta.tiempoEstimadoHoras} horas</li>
                <li>Total: $ ${datos.costos.totalPropuesta.toLocaleString('es-CO')}</li>
                <li>Validez: ${datos.diasValidez} días</li>
            </ul>
            
            <p>Quedamos atentos a su aprobación para coordinar la ejecución del trabajo.</p>
            
            <p>Cordialmente,<br>
            <strong>${datos.elaboradoPor}</strong><br>
            ${datos.cargoElaborador}<br>
            MEKANOS S.A.S</p>
        </div>
        
        <div class="footer">
            <p><strong>MEKANOS S.A.S</strong><br>
            Cartagena de Indias, Colombia<br>
            Tel: 6359384 | www.mekanosrep.com</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    const resultado = await transporter.sendMail({
        from: '"MEKANOS S.A.S" <mekanossas4@gmail.com>',
        to: TEST_EMAIL,
        subject: `Propuesta Correctivo ${datos.numeroPropuesta} - ${datos.problemaDetectado.nivelCriticidad} - MEKANOS S.A.S`,
        html: htmlEmail,
        attachments: [{
            filename: `${datos.numeroPropuesta}.pdf`,
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
    console.log('║  TEST ATÓMICO 10 - PROPUESTA CORRECTIVO PDF + EMAIL                        ║');
    console.log('║  MEKANOS S.A.S - Sistema de Mantenimiento Industrial                       ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    try {
        // 1. Generar PDF
        const pdfBuffer = await generarPDFPropuestaCorrectivo(datosPropuesta);

        // 2. Enviar email con PDF adjunto
        const emailResult = await enviarEmailPropuestaCorrectivo(pdfBuffer, datosPropuesta);

        // Resumen
        console.log('\n════════════════════════════════════════════════════════════════════════════');
        console.log('📊 RESUMEN DEL TEST');
        console.log('════════════════════════════════════════════════════════════════════════════\n');

        console.log(`   ✅ PDF Generado: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        console.log(`   ✅ Email Enviado: ${TEST_EMAIL}`);
        console.log(`   ✅ Message ID: ${emailResult.messageId}`);

        console.log('\n════════════════════════════════════════════════════════════════════════════');
        console.log('🎉 TEST ATÓMICO 10: ✅ ÉXITO');
        console.log('════════════════════════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('\n❌ ERROR EN TEST:', error.message);
        console.log('\n════════════════════════════════════════════════════════════════════════════');
        console.log('⚠️ TEST ATÓMICO 10: ❌ FALLIDO');
        console.log('════════════════════════════════════════════════════════════════════════════\n');
        process.exit(1);
    }
}

main();
