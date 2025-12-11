/**
 * TEST ATÓMICO 11 - GENERADOR DE DOCUMENTOS
 * ==========================================
 * 
 * Valida que todos los tipos de documentos se generen correctamente.
 * Este test prueba el servicio centralizado GeneradorDocumentosFacadeService.
 * 
 * MEKANOS S.A.S - Sistema de Mantenimiento Industrial
 */

const puppeteer = require('puppeteer');

// ============================================================
// COLORES MEKANOS
// ============================================================
const MEKANOS_COLORS = {
    background: '#F2F2F2',
    primary: '#244673',
    secondary: '#3290A6',
    success: '#56A672',
    warning: '#F5A623',
    danger: '#D0021B',
    text: '#333333',
    textLight: '#666666',
    border: '#E0E0E0',
};

// ============================================================
// DATOS DE PRUEBA PARA CADA TIPO DE DOCUMENTO
// ============================================================

const DATOS_REMISION = {
    numeroRemision: 'REM-2025-TEST-001',
    fechaEmision: new Date().toLocaleDateString('es-CO'),
    horaEmision: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
    estado: 'PENDIENTE',
    ordenServicio: {
        numeroOrden: 'OS-2025-001234',
        cliente: 'HOTEL CARIBE S.A.',
        ubicacion: 'Cartagena - Bocagrande',
        tipoServicio: 'Mantenimiento Preventivo Tipo A',
    },
    tecnicoReceptor: {
        nombre: 'Carlos Mendoza',
        cargo: 'Técnico Senior',
        identificacion: 'CC 1.234.567.890',
    },
    responsableBodega: {
        nombre: 'María García',
        cargo: 'Jefe de Bodega',
    },
    items: [
        { orden: 1, codigoInterno: 'FIL-001', descripcion: 'Filtro de Aceite CAT 1R-0750', referencia: '1R-0750', unidad: 'Und', cantidadSolicitada: 2, cantidadEntregada: 2, ubicacionBodega: 'A-01-03' },
        { orden: 2, codigoInterno: 'FIL-002', descripcion: 'Filtro de Aire Primario', referencia: '6I-2503', unidad: 'Und', cantidadSolicitada: 1, cantidadEntregada: 1, ubicacionBodega: 'A-01-05' },
        { orden: 3, codigoInterno: 'ACE-001', descripcion: 'Aceite Motor CAT DEO 15W-40', referencia: 'DEO-15W40', unidad: 'Gal', cantidadSolicitada: 12, cantidadEntregada: 10, ubicacionBodega: 'B-02-01' },
    ],
    observaciones: 'Se entregaron 10 galones de aceite. Los 2 restantes se entregarán mañana por disponibilidad de inventario.',
};

const DATOS_ORDEN_COMPRA = {
    numeroOrdenCompra: 'OC-2025-TEST-001',
    fechaEmision: new Date().toLocaleDateString('es-CO'),
    fechaEntregaRequerida: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('es-CO'),
    estado: 'ENVIADA',
    proveedor: {
        nombre: 'REPUESTOS INDUSTRIALES CARIBE LTDA',
        nit: '800.456.789-1',
        direccion: 'Zona Industrial Mamonal Km 5',
        telefono: '(605) 668-9000',
        email: 'ventas@repuestoscaribe.com',
        contacto: 'Juan Rodríguez - Asesor Comercial',
    },
    referencia: {
        tipo: 'Orden de Servicio',
        numero: 'OS-2025-001234',
    },
    items: [
        { orden: 1, codigoProveedor: 'CAT-1R0750', codigoInterno: 'FIL-001', descripcion: 'Filtro de Aceite CAT Original', cantidad: 10, unidad: 'Und', precioUnitario: 185000, descuentoPorcentaje: 5, subtotal: 1757500 },
        { orden: 2, codigoProveedor: 'CAT-6I2503', codigoInterno: 'FIL-002', descripcion: 'Filtro de Aire Primario CAT', cantidad: 5, unidad: 'Und', precioUnitario: 420000, descuentoPorcentaje: 0, subtotal: 2100000 },
        { orden: 3, codigoProveedor: 'CAT-DEO15', codigoInterno: 'ACE-001', descripcion: 'Aceite Motor CAT DEO 15W-40', cantidad: 24, unidad: 'Gal', precioUnitario: 125000, descuentoPorcentaje: 10, subtotal: 2700000 },
    ],
    totales: {
        subtotal: 6557500,
        descuentoPorcentaje: 0,
        descuentoValor: 0,
        ivaPorcentaje: 19,
        ivaValor: 1245925,
        total: 7803425,
    },
    condicionesPago: 'Crédito 30 días',
    lugarEntrega: 'Bodega MEKANOS - Barrio Líbano',
    instruccionesEspeciales: 'Entregar en horario de 8am a 5pm. Llamar 30 minutos antes de llegar.',
    solicitadoPor: 'María García - Jefe de Compras',
    aprobadoPor: 'Roberto Martínez - Gerente Operativo',
};

const DATOS_INFORME_CORRECTIVO = {
    numeroOrden: 'OS-2025-CORR-001',
    fecha: new Date().toLocaleDateString('es-CO'),
    horaEntrada: '08:30',
    horaSalida: '16:45',
    tipoServicio: 'CORRECTIVO',
    cliente: 'INDUSTRIAS ABC S.A.S',
    direccion: 'Zona Industrial Mamonal Lote 15',
    contacto: 'Ing. Pedro Gómez',
    telefono: '315-555-1234',
    tipoEquipo: 'GENERADOR',
    marcaEquipo: 'CATERPILLAR',
    modeloEquipo: 'C18',
    serieEquipo: 'CAT18-2023-456',
    horasOperacion: 5200,
    tecnico: 'Carlos Mendoza Ríos',
    cargoTecnico: 'Ingeniero de Servicio Senior',
    problemaReportado: {
        descripcion: 'El generador presenta pérdida de potencia y humo negro excesivo durante la operación a carga.',
        fechaReporte: '25/11/2025',
        reportadoPor: 'Operador de turno - Juan Pérez',
    },
    diagnostico: {
        descripcion: 'Se realizó inspección completa del sistema de inyección y admisión de aire. Se encontraron inyectores con patrón de inyección deficiente y filtro de aire colapsado.',
        causaRaiz: 'Inyectores desgastados por horas de operación (5200 hrs) y mantenimiento de filtros fuera de especificación.',
        sistemasAfectados: ['Sistema de Inyección', 'Sistema de Admisión', 'Sistema de Escape'],
    },
    trabajosEjecutados: [
        { orden: 1, descripcion: 'Desmontaje y prueba de inyectores en banco', sistema: 'Inyección', tiempoHoras: 2, resultado: 'COMPLETADO' },
        { orden: 2, descripcion: 'Reemplazo de 6 inyectores defectuosos', sistema: 'Inyección', tiempoHoras: 3, resultado: 'COMPLETADO' },
        { orden: 3, descripcion: 'Cambio de filtro de aire primario y secundario', sistema: 'Admisión', tiempoHoras: 0.5, resultado: 'COMPLETADO' },
        { orden: 4, descripcion: 'Calibración de sistema de inyección', sistema: 'Inyección', tiempoHoras: 1, resultado: 'COMPLETADO' },
        { orden: 5, descripcion: 'Pruebas de funcionamiento bajo carga', sistema: 'General', tiempoHoras: 1.5, resultado: 'COMPLETADO' },
    ],
    repuestosUtilizados: [
        { codigo: 'INJ-CAT18', descripcion: 'Inyector CAT C18 Original', cantidad: 6, unidad: 'Und', estado: 'NUEVO' },
        { codigo: 'FIL-AIR-P', descripcion: 'Filtro Aire Primario', cantidad: 1, unidad: 'Und', estado: 'NUEVO' },
        { codigo: 'FIL-AIR-S', descripcion: 'Filtro Aire Secundario', cantidad: 1, unidad: 'Und', estado: 'NUEVO' },
    ],
    mediciones: [
        { parametro: 'Potencia Salida', valorAntes: '420 kW', valorDespues: '500 kW', unidad: 'kW', estado: 'OK' },
        { parametro: 'Opacidad Humo', valorAntes: '65%', valorDespues: '12%', unidad: '%', estado: 'OK' },
        { parametro: 'Temperatura Escape', valorAntes: '520°C', valorDespues: '480°C', unidad: '°C', estado: 'OK' },
    ],
    recomendaciones: [
        'Programar cambio preventivo de inyectores restantes en próximo mantenimiento mayor',
        'Reducir intervalo de cambio de filtros de aire de 500 a 400 horas',
        'Monitorear opacidad de humo mensualmente',
        'Considerar análisis de combustible para descartar contaminación',
    ],
    observaciones: 'El equipo quedó operativo al 100% de su capacidad nominal. Cliente satisfecho con el servicio.',
};

// ============================================================
// FUNCIONES GENERADORAS DE HTML
// ============================================================

function generarRemisionHTML(datos) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Remisión ${datos.numeroRemision}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: ${MEKANOS_COLORS.text}; }
        .page { width: 210mm; min-height: 148mm; padding: 10mm; background: white; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid ${MEKANOS_COLORS.primary}; padding-bottom: 10px; margin-bottom: 15px; }
        .logo { width: 40px; height: 40px; background: ${MEKANOS_COLORS.primary}; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px; margin-right: 10px; }
        .section-title { font-size: 10px; font-weight: bold; color: white; padding: 5px 8px; background: ${MEKANOS_COLORS.primary}; margin-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        .info-box { background: ${MEKANOS_COLORS.background}; padding: 10px; border-radius: 4px; border-left: 3px solid ${MEKANOS_COLORS.primary}; }
        .info-box h4 { font-size: 9px; color: ${MEKANOS_COLORS.secondary}; margin-bottom: 6px; }
        .info-row { font-size: 9px; margin-bottom: 3px; }
        .info-label { color: ${MEKANOS_COLORS.textLight}; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        th { background: ${MEKANOS_COLORS.primary}; color: white; padding: 6px 4px; }
        td { padding: 5px 4px; border-bottom: 1px solid ${MEKANOS_COLORS.border}; }
        tr:nth-child(even) { background: ${MEKANOS_COLORS.background}; }
        .estado-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 9px; font-weight: bold; background: ${MEKANOS_COLORS.warning}; color: white; }
        .footer { text-align: center; font-size: 7px; color: ${MEKANOS_COLORS.textLight}; margin-top: 15px; padding-top: 8px; border-top: 1px solid ${MEKANOS_COLORS.border}; }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div style="display: flex; align-items: center;">
                <div class="logo">MK</div>
                <div>
                    <div style="font-size: 14px; font-weight: bold; color: ${MEKANOS_COLORS.primary};">MEKANOS S.A.S</div>
                    <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">Remisión de Materiales</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 14px; font-weight: bold; color: ${MEKANOS_COLORS.secondary};">${datos.numeroRemision}</div>
                <div style="font-size: 9px; color: ${MEKANOS_COLORS.textLight};">${datos.fechaEmision} - ${datos.horaEmision}</div>
                <span class="estado-badge">${datos.estado}</span>
            </div>
        </div>
        
        <div class="info-grid">
            <div class="info-box">
                <h4>📋 Orden de Servicio</h4>
                <div class="info-row"><span class="info-label">Número:</span> ${datos.ordenServicio.numeroOrden}</div>
                <div class="info-row"><span class="info-label">Cliente:</span> ${datos.ordenServicio.cliente}</div>
                <div class="info-row"><span class="info-label">Ubicación:</span> ${datos.ordenServicio.ubicacion}</div>
            </div>
            <div class="info-box">
                <h4>👷 Técnico Receptor</h4>
                <div class="info-row"><span class="info-label">Nombre:</span> ${datos.tecnicoReceptor.nombre}</div>
                <div class="info-row"><span class="info-label">Cargo:</span> ${datos.tecnicoReceptor.cargo}</div>
                <div class="info-row"><span class="info-label">ID:</span> ${datos.tecnicoReceptor.identificacion}</div>
            </div>
        </div>
        
        <div class="section-title">📦 ITEMS DE LA REMISIÓN</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 5%;">#</th>
                    <th style="width: 12%;">Código</th>
                    <th style="width: 35%;">Descripción</th>
                    <th style="width: 13%;">Referencia</th>
                    <th style="width: 10%;">Solicitado</th>
                    <th style="width: 10%;">Entregado</th>
                    <th style="width: 15%;">Ubicación</th>
                </tr>
            </thead>
            <tbody>
                ${datos.items.map(item => `
                <tr>
                    <td style="text-align: center;">${item.orden}</td>
                    <td><strong>${item.codigoInterno}</strong></td>
                    <td>${item.descripcion}</td>
                    <td>${item.referencia}</td>
                    <td style="text-align: center;">${item.cantidadSolicitada} ${item.unidad}</td>
                    <td style="text-align: center; font-weight: bold; color: ${item.cantidadEntregada === item.cantidadSolicitada ? MEKANOS_COLORS.success : MEKANOS_COLORS.warning};">${item.cantidadEntregada}</td>
                    <td style="font-size: 8px;">${item.ubicacionBodega}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        ${datos.observaciones ? `
        <div style="background: ${MEKANOS_COLORS.background}; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 9px;">
            <strong>Observaciones:</strong> ${datos.observaciones}
        </div>
        ` : ''}
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;">
            <div style="text-align: center;">
                <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 6px; margin-top: 40px;">
                    <div style="font-weight: bold; font-size: 9px;">${datos.responsableBodega.nombre}</div>
                    <div style="font-size: 7px; color: ${MEKANOS_COLORS.textLight};">${datos.responsableBodega.cargo} - Entrega</div>
                </div>
            </div>
            <div style="text-align: center;">
                <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 6px; margin-top: 40px;">
                    <div style="font-weight: bold; font-size: 9px;">${datos.tecnicoReceptor.nombre}</div>
                    <div style="font-size: 7px; color: ${MEKANOS_COLORS.textLight};">Técnico - Recibe</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <strong>MEKANOS S.A.S</strong> - Documento interno de transferencia de materiales
        </div>
    </div>
</body>
</html>
    `.trim();
}

function generarOrdenCompraHTML(datos) {
    const formatNumber = (n) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Orden de Compra ${datos.numeroOrdenCompra}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: ${MEKANOS_COLORS.text}; }
        .page { width: 210mm; min-height: 297mm; padding: 12mm; background: white; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${MEKANOS_COLORS.primary}; padding-bottom: 12px; margin-bottom: 15px; }
        .logo { width: 50px; height: 50px; background: ${MEKANOS_COLORS.primary}; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; margin-right: 12px; }
        .section-title { font-size: 10px; font-weight: bold; color: white; padding: 5px 8px; background: ${MEKANOS_COLORS.primary}; margin-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px; }
        .info-box { background: ${MEKANOS_COLORS.background}; padding: 12px; border-radius: 6px; border-left: 4px solid ${MEKANOS_COLORS.primary}; }
        .info-box h4 { font-size: 10px; color: ${MEKANOS_COLORS.secondary}; margin-bottom: 8px; }
        .info-row { display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 4px; }
        .info-label { color: ${MEKANOS_COLORS.textLight}; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 15px; }
        th { background: ${MEKANOS_COLORS.primary}; color: white; padding: 8px 6px; }
        td { padding: 6px; border-bottom: 1px solid ${MEKANOS_COLORS.border}; }
        tr:nth-child(even) { background: ${MEKANOS_COLORS.background}; }
        .text-right { text-align: right; }
        .totales-box { width: 280px; background: ${MEKANOS_COLORS.background}; padding: 15px; border-radius: 6px; margin-left: auto; }
        .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 10px; }
        .total-row.final { border-top: 2px solid ${MEKANOS_COLORS.primary}; margin-top: 8px; padding-top: 10px; font-size: 14px; font-weight: bold; color: ${MEKANOS_COLORS.primary}; }
        .estado-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 10px; font-weight: bold; background: ${MEKANOS_COLORS.secondary}; color: white; }
        .footer { text-align: center; font-size: 7px; color: ${MEKANOS_COLORS.textLight}; margin-top: 20px; padding-top: 10px; border-top: 1px solid ${MEKANOS_COLORS.border}; }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div style="display: flex; align-items: center;">
                <div class="logo">MK</div>
                <div>
                    <div style="font-size: 16px; font-weight: bold; color: ${MEKANOS_COLORS.primary};">MEKANOS S.A.S</div>
                    <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">NIT: 900.123.456-7</div>
                    <div style="font-size: 16px; font-weight: bold; color: ${MEKANOS_COLORS.secondary}; margin-top: 5px;">ORDEN DE COMPRA</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 16px; font-weight: bold; color: ${MEKANOS_COLORS.secondary};">${datos.numeroOrdenCompra}</div>
                <div style="font-size: 9px; color: ${MEKANOS_COLORS.textLight}; margin: 5px 0;">Emisión: ${datos.fechaEmision}</div>
                <div style="font-size: 9px; color: ${MEKANOS_COLORS.danger}; font-weight: 500;">Entrega: ${datos.fechaEntregaRequerida}</div>
                <span class="estado-badge">${datos.estado}</span>
            </div>
        </div>
        
        <div class="info-grid">
            <div class="info-box">
                <h4>🏢 PROVEEDOR</h4>
                <div class="info-row"><span class="info-label">Razón Social:</span> <span>${datos.proveedor.nombre}</span></div>
                <div class="info-row"><span class="info-label">NIT:</span> <span>${datos.proveedor.nit}</span></div>
                <div class="info-row"><span class="info-label">Dirección:</span> <span>${datos.proveedor.direccion}</span></div>
                <div class="info-row"><span class="info-label">Teléfono:</span> <span>${datos.proveedor.telefono}</span></div>
                <div class="info-row"><span class="info-label">Email:</span> <span>${datos.proveedor.email}</span></div>
                <div class="info-row"><span class="info-label">Contacto:</span> <span>${datos.proveedor.contacto}</span></div>
            </div>
            <div class="info-box">
                <h4>📋 INFORMACIÓN</h4>
                <div class="info-row"><span class="info-label">Referencia:</span> <span>${datos.referencia.tipo}: ${datos.referencia.numero}</span></div>
                <div class="info-row"><span class="info-label">Lugar Entrega:</span> <span>${datos.lugarEntrega}</span></div>
                <div class="info-row"><span class="info-label">Condiciones:</span> <span>${datos.condicionesPago}</span></div>
                <div class="info-row"><span class="info-label">Solicitado:</span> <span>${datos.solicitadoPor}</span></div>
                <div class="info-row"><span class="info-label">Aprobado:</span> <span>${datos.aprobadoPor}</span></div>
            </div>
        </div>
        
        <div class="section-title">🛒 ITEMS DE LA ORDEN</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 4%;">#</th>
                    <th style="width: 10%;">Cód. Prov.</th>
                    <th style="width: 10%;">Cód. Int.</th>
                    <th style="width: 32%;">Descripción</th>
                    <th style="width: 8%;">Cant.</th>
                    <th style="width: 6%;">Und</th>
                    <th style="width: 12%;" class="text-right">P. Unit.</th>
                    <th style="width: 6%;">Dto%</th>
                    <th style="width: 12%;" class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${datos.items.map(item => `
                <tr>
                    <td style="text-align: center;">${item.orden}</td>
                    <td>${item.codigoProveedor}</td>
                    <td>${item.codigoInterno}</td>
                    <td>${item.descripcion}</td>
                    <td style="text-align: center;">${item.cantidad}</td>
                    <td>${item.unidad}</td>
                    <td class="text-right">$ ${formatNumber(item.precioUnitario)}</td>
                    <td style="text-align: center;">${item.descuentoPorcentaje > 0 ? item.descuentoPorcentaje + '%' : '-'}</td>
                    <td class="text-right">$ ${formatNumber(item.subtotal)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div style="display: flex; justify-content: flex-end;">
            <div class="totales-box">
                <div class="total-row"><span>Subtotal:</span><span>$ ${formatNumber(datos.totales.subtotal)}</span></div>
                <div class="total-row"><span>IVA (${datos.totales.ivaPorcentaje}%):</span><span>$ ${formatNumber(datos.totales.ivaValor)}</span></div>
                <div class="total-row final"><span>TOTAL:</span><span>$ ${formatNumber(datos.totales.total)}</span></div>
            </div>
        </div>
        
        ${datos.instruccionesEspeciales ? `
        <div style="background: #fffef0; border: 1px solid ${MEKANOS_COLORS.warning}; border-left: 4px solid ${MEKANOS_COLORS.warning}; padding: 12px; margin-top: 15px; border-radius: 4px; font-size: 9px;">
            <strong>⚠️ Instrucciones Especiales:</strong> ${datos.instruccionesEspeciales}
        </div>
        ` : ''}
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 30px;">
            <div style="text-align: center;">
                <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 8px; margin-top: 50px;">
                    <div style="font-weight: bold; font-size: 10px;">${datos.solicitadoPor}</div>
                    <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">Solicitado por</div>
                </div>
            </div>
            <div style="text-align: center;">
                <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 8px; margin-top: 50px;">
                    <div style="font-weight: bold; font-size: 10px;">${datos.aprobadoPor}</div>
                    <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">Aprobado por</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <strong>MEKANOS S.A.S</strong> - NIT: 900.123.456-7 | BARRIO LIBANO CRA 49C #31-35 - Cartagena<br>
            Este documento es válido como orden de compra oficial.
        </div>
    </div>
</body>
</html>
    `.trim();
}

function generarInformeCorrectivoHTML(datos) {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Informe Correctivo ${datos.numeroOrden}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: ${MEKANOS_COLORS.text}; }
        .page { width: 210mm; min-height: 297mm; padding: 12mm; background: white; }
        .header { display: flex; justify-content: space-between; border-bottom: 3px solid ${MEKANOS_COLORS.primary}; padding-bottom: 10px; margin-bottom: 15px; }
        .logo { width: 50px; height: 50px; background: ${MEKANOS_COLORS.primary}; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px; margin-right: 10px; }
        .section { margin-bottom: 15px; }
        .section-title { font-size: 10px; font-weight: bold; color: white; padding: 5px 8px; background: ${MEKANOS_COLORS.primary}; margin-bottom: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .info-box { background: ${MEKANOS_COLORS.background}; padding: 10px; border-radius: 4px; }
        .info-label { font-size: 8px; color: ${MEKANOS_COLORS.secondary}; font-weight: bold; }
        .info-value { font-size: 10px; }
        .problema-box { background: #fff5f5; border: 1px solid ${MEKANOS_COLORS.danger}; border-left: 4px solid ${MEKANOS_COLORS.danger}; padding: 12px; border-radius: 4px; }
        .diagnostico-box { background: #f0f7ff; border: 1px solid ${MEKANOS_COLORS.secondary}; border-left: 4px solid ${MEKANOS_COLORS.secondary}; padding: 12px; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 9px; }
        th { background: ${MEKANOS_COLORS.primary}; color: white; padding: 6px 4px; }
        td { padding: 5px 4px; border-bottom: 1px solid ${MEKANOS_COLORS.border}; }
        tr:nth-child(even) { background: ${MEKANOS_COLORS.background}; }
        .badge-completado { background: ${MEKANOS_COLORS.success}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 8px; }
        .badge-nuevo { background: ${MEKANOS_COLORS.success}; color: white; padding: 2px 6px; border-radius: 3px; font-size: 7px; }
        .correctivo-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 9px; font-weight: bold; background: ${MEKANOS_COLORS.warning}; color: white; }
        .footer { text-align: center; font-size: 7px; color: ${MEKANOS_COLORS.textLight}; margin-top: 15px; padding-top: 8px; border-top: 1px solid ${MEKANOS_COLORS.border}; }
    </style>
</head>
<body>
    <div class="page">
        <!-- HEADER -->
        <div class="header">
            <div style="display: flex; align-items: center;">
                <div class="logo">MK</div>
                <div>
                    <div style="font-size: 16px; font-weight: bold; color: ${MEKANOS_COLORS.primary};">MEKANOS S.A.S</div>
                    <div style="font-size: 12px; font-weight: bold; color: ${MEKANOS_COLORS.secondary};">INFORME DE MANTENIMIENTO CORRECTIVO</div>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 14px; font-weight: bold; color: ${MEKANOS_COLORS.secondary};">${datos.numeroOrden}</div>
                <div style="font-size: 9px; color: ${MEKANOS_COLORS.textLight};">${datos.fecha}</div>
                <span class="correctivo-badge">CORRECTIVO</span>
            </div>
        </div>
        
        <!-- INFO GENERAL -->
        <div class="section">
            <div class="info-grid">
                <div class="info-box">
                    <div class="info-label">👤 Cliente</div>
                    <div class="info-value">${datos.cliente}</div>
                    <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">${datos.direccion}</div>
                </div>
                <div class="info-box">
                    <div class="info-label">⚙️ Equipo</div>
                    <div class="info-value">${datos.marcaEquipo} ${datos.modeloEquipo}</div>
                    <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">Serie: ${datos.serieEquipo} | ${datos.horasOperacion} hrs</div>
                </div>
                <div class="info-box">
                    <div class="info-label">👷 Técnico / Horario</div>
                    <div class="info-value">${datos.tecnico}</div>
                    <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">${datos.horaEntrada} - ${datos.horaSalida}</div>
                </div>
            </div>
        </div>
        
        <!-- PROBLEMA -->
        <div class="section">
            <div class="section-title">🔴 PROBLEMA REPORTADO</div>
            <div class="problema-box">
                <p style="font-size: 10px; margin-bottom: 8px;">${datos.problemaReportado.descripcion}</p>
                <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">
                    Reportado el ${datos.problemaReportado.fechaReporte} por ${datos.problemaReportado.reportadoPor}
                </div>
            </div>
        </div>
        
        <!-- DIAGNÓSTICO -->
        <div class="section">
            <div class="section-title">🔍 DIAGNÓSTICO TÉCNICO</div>
            <div class="diagnostico-box">
                <div style="margin-bottom: 10px;">
                    <strong style="font-size: 9px;">Descripción:</strong>
                    <p style="font-size: 10px; margin-top: 4px;">${datos.diagnostico.descripcion}</p>
                </div>
                <div style="margin-bottom: 10px;">
                    <strong style="font-size: 9px;">Causa Raíz:</strong>
                    <p style="font-size: 10px; margin-top: 4px; font-weight: 500;">${datos.diagnostico.causaRaiz}</p>
                </div>
                <div>
                    <strong style="font-size: 9px;">Sistemas Afectados:</strong>
                    <div style="margin-top: 4px;">
                        ${datos.diagnostico.sistemasAfectados.map(s => `<span style="display: inline-block; background: ${MEKANOS_COLORS.background}; padding: 3px 8px; border-radius: 3px; font-size: 8px; margin-right: 5px;">${s}</span>`).join('')}
                    </div>
                </div>
            </div>
        </div>
        
        <!-- TRABAJOS -->
        <div class="section">
            <div class="section-title">🔧 TRABAJOS EJECUTADOS</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 45%;">Descripción</th>
                        <th style="width: 20%;">Sistema</th>
                        <th style="width: 10%;">Tiempo</th>
                        <th style="width: 20%;">Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    ${datos.trabajosEjecutados.map(t => `
                    <tr>
                        <td style="text-align: center;">${t.orden}</td>
                        <td>${t.descripcion}</td>
                        <td>${t.sistema}</td>
                        <td style="text-align: center;">${t.tiempoHoras}h</td>
                        <td style="text-align: center;"><span class="badge-completado">${t.resultado}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- REPUESTOS -->
        <div class="section">
            <div class="section-title">🔩 REPUESTOS UTILIZADOS</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 15%;">Código</th>
                        <th style="width: 50%;">Descripción</th>
                        <th style="width: 15%;">Cantidad</th>
                        <th style="width: 20%;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${datos.repuestosUtilizados.map(r => `
                    <tr>
                        <td><strong>${r.codigo}</strong></td>
                        <td>${r.descripcion}</td>
                        <td style="text-align: center;">${r.cantidad} ${r.unidad}</td>
                        <td style="text-align: center;"><span class="badge-nuevo">${r.estado}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- MEDICIONES -->
        <div class="section">
            <div class="section-title">📊 MEDICIONES</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 30%;">Parámetro</th>
                        <th style="width: 20%;">Antes</th>
                        <th style="width: 20%;">Después</th>
                        <th style="width: 15%;">Unidad</th>
                        <th style="width: 15%;">Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${datos.mediciones.map(m => `
                    <tr>
                        <td>${m.parametro}</td>
                        <td style="text-align: center;">${m.valorAntes}</td>
                        <td style="text-align: center; font-weight: bold;">${m.valorDespues}</td>
                        <td style="text-align: center;">${m.unidad}</td>
                        <td style="text-align: center; color: ${MEKANOS_COLORS.success}; font-weight: bold;">${m.estado}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <!-- RECOMENDACIONES -->
        <div class="section">
            <div class="section-title">💡 RECOMENDACIONES</div>
            <div style="background: ${MEKANOS_COLORS.background}; padding: 12px; border-radius: 4px;">
                ${datos.recomendaciones.map(r => `
                <div style="font-size: 9px; margin-bottom: 5px;">→ ${r}</div>
                `).join('')}
            </div>
        </div>
        
        <!-- OBSERVACIONES -->
        <div class="section">
            <div class="section-title">📝 OBSERVACIONES</div>
            <div style="background: ${MEKANOS_COLORS.background}; padding: 12px; border-radius: 4px; font-size: 9px;">
                ${datos.observaciones}
            </div>
        </div>
        
        <!-- FIRMAS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 25px;">
            <div style="text-align: center;">
                <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 6px; margin-top: 40px;">
                    <div style="font-weight: bold; font-size: 10px;">${datos.tecnico}</div>
                    <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">Técnico Ejecutor</div>
                </div>
            </div>
            <div style="text-align: center;">
                <div style="border-top: 1px solid ${MEKANOS_COLORS.text}; padding-top: 6px; margin-top: 40px;">
                    <div style="font-weight: bold; font-size: 10px;">Cliente</div>
                    <div style="font-size: 8px; color: ${MEKANOS_COLORS.textLight};">Recibido a satisfacción</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <strong>MEKANOS S.A.S</strong> - NIT: 900.123.456-7 | BARRIO LIBANO CRA 49C #31-35 - Cartagena | TEL: 6359384
        </div>
    </div>
</body>
</html>
    `.trim();
}

// ============================================================
// EJECUCIÓN DEL TEST
// ============================================================

async function generarPDF(html, nombre) {
    console.log(`\n📄 Generando PDF: ${nombre}...`);

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
        });

        console.log(`   ✅ ${nombre}: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        return { nombre, size: pdfBuffer.length, success: true };
    } catch (error) {
        console.log(`   ❌ ${nombre}: Error - ${error.message}`);
        return { nombre, size: 0, success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  TEST ATÓMICO 11 - GENERADOR DE DOCUMENTOS                                 ║');
    console.log('║  Validando todos los templates PDF nuevos                                  ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');

    const documentos = [
        { nombre: 'REMISION', html: generarRemisionHTML(DATOS_REMISION) },
        { nombre: 'ORDEN_COMPRA', html: generarOrdenCompraHTML(DATOS_ORDEN_COMPRA) },
        { nombre: 'INFORME_CORRECTIVO', html: generarInformeCorrectivoHTML(DATOS_INFORME_CORRECTIVO) },
    ];

    const resultados = [];

    for (const doc of documentos) {
        const resultado = await generarPDF(doc.html, doc.nombre);
        resultados.push(resultado);
    }

    // Resumen
    console.log('\n════════════════════════════════════════════════════════════════════════════');
    console.log('📊 RESUMEN DEL TEST');
    console.log('════════════════════════════════════════════════════════════════════════════\n');

    let exitosos = 0;
    for (const r of resultados) {
        if (r.success) {
            console.log(`   ✅ ${r.nombre}: ${(r.size / 1024).toFixed(2)} KB`);
            exitosos++;
        } else {
            console.log(`   ❌ ${r.nombre}: FALLIDO`);
        }
    }

    console.log('\n════════════════════════════════════════════════════════════════════════════');
    if (exitosos === documentos.length) {
        console.log(`🎉 TEST ATÓMICO 11: ✅ ÉXITO (${exitosos}/${documentos.length} documentos)`);
    } else {
        console.log(`⚠️ TEST ATÓMICO 11: PARCIAL (${exitosos}/${documentos.length} documentos)`);
    }
    console.log('════════════════════════════════════════════════════════════════════════════\n');
}

main();
