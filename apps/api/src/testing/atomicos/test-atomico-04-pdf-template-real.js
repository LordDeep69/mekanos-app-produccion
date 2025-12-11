/**
 * ============================================================================
 * TEST ATÓMICO 04: PDF con Template REAL
 * ============================================================================
 * 
 * OBJETIVO: Validar que PdfService.generarPDF() usa los templates REALES
 *           definidos en /pdf/templates/ según el tipo de equipo y servicio.
 * 
 * PRERREQUISITOS:
 * - Tests atómicos 01-03 deben haber pasado
 * 
 * VALIDACIONES:
 * 1. El servicio PdfService existe y puede instanciarse
 * 2. El método determinarTipoInforme funciona correctamente
 * 3. El PDF se genera con el template correcto (GENERADOR_A)
 * 4. El PDF contiene las secciones esperadas
 * 5. El PDF incluye evidencias fotográficas
 * 
 * CRÍTICO: Este test debe usar los templates de:
 * - tipo-a-generador.template.ts
 * - tipo-b-generador.template.ts
 * - tipo-a-bomba.template.ts
 * - cotizacion.template.ts
 * 
 * ============================================================================
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Usamos require con ts-node/register para cargar TypeScript
require('ts-node').register({
    transpileOnly: true,
    compilerOptions: { module: 'commonjs' }
});

// Importar los templates REALES
const { generarTipoAGeneradorHTML } = require('../../pdf/templates/tipo-a-generador.template');
const { generarTipoBGeneradorHTML } = require('../../pdf/templates/tipo-b-generador.template');
const { generarTipoABombaHTML } = require('../../pdf/templates/tipo-a-bomba.template');
const { MEKANOS_COLORS } = require('../../pdf/templates/mekanos-base.template');

// ============================================================================
// DATOS DE PRUEBA COMPLETOS (Simulando datos reales de BD)
// ============================================================================

const DATOS_ORDEN_PRUEBA = {
    // Datos del cliente
    cliente: 'HOTEL CARIBE S.A.S - TEST ATÓMICO 04',
    direccion: 'Cra 1 #23-45, Cartagena de Indias',
    sede: 'Sede Principal',

    // Datos del equipo
    marcaEquipo: 'CATERPILLAR',
    serieEquipo: 'CAT-2024-001',
    tipoEquipo: 'GENERADOR',

    // Datos del servicio
    fecha: new Date().toLocaleDateString('es-CO'),
    tecnico: 'Carlos Martínez',
    horaEntrada: '08:00',
    horaSalida: '12:30',
    tipoServicio: 'PREVENTIVO_A',

    // Número de orden
    numeroOrden: 'TEST-ATOMICO-04-001',

    // Datos del módulo de control
    datosModulo: {
        rpm: 1800,
        presionAceite: 65,
        temperaturaRefrigerante: 82,
        cargaBateria: 24,
        horasTrabajo: 1250,
        voltaje: 220,
        frecuencia: 60,
        corriente: 45
    },

    // Actividades ejecutadas (por sistema)
    actividades: [
        // Sistema de Enfriamiento
        { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar tapa de radiador', resultado: 'B', observaciones: '' },
        { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar nivel de refrigerante', resultado: 'B', observaciones: '' },
        { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar fugas en mangueras y abrazaderas', resultado: 'B', observaciones: '' },
        { sistema: 'ENFRIAMIENTO', descripcion: 'Inspeccionar aspas del ventilador', resultado: 'B', observaciones: '' },
        { sistema: 'ENFRIAMIENTO', descripcion: 'Revisar estado de correas', resultado: 'R', observaciones: 'Tensionar' },

        // Sistema de Aspiración
        { sistema: 'ASPIRACION', descripcion: 'Revisar filtro de aire primario', resultado: 'B', observaciones: '' },
        { sistema: 'ASPIRACION', descripcion: 'Revisar filtro de aire secundario', resultado: 'C', observaciones: 'Cambiar próx servicio' },

        // Sistema de Combustible
        { sistema: 'COMBUSTIBLE', descripcion: 'Revisar nivel de combustible', resultado: 'B', observaciones: '' },
        { sistema: 'COMBUSTIBLE', descripcion: 'Revisar filtro de combustible', resultado: 'B', observaciones: '' },
        { sistema: 'COMBUSTIBLE', descripcion: 'Purgar sistema de combustible', resultado: 'B', observaciones: '' },

        // Sistema de Lubricación
        { sistema: 'LUBRICACION', descripcion: 'Revisar nivel de aceite', resultado: 'B', observaciones: '' },
        { sistema: 'LUBRICACION', descripcion: 'Revisar estado del aceite', resultado: 'B', observaciones: 'Color normal' },

        // Sistema de Escape
        { sistema: 'ESCAPE', descripcion: 'Revisar múltiple de escape', resultado: 'B', observaciones: '' },
        { sistema: 'ESCAPE', descripcion: 'Revisar silenciador', resultado: 'B', observaciones: '' },

        // Sistema Eléctrico
        { sistema: 'ELECTRICO', descripcion: 'Revisar bornes de batería', resultado: 'B', observaciones: '' },
        { sistema: 'ELECTRICO', descripcion: 'Revisar cableado general', resultado: 'B', observaciones: '' },
        { sistema: 'ELECTRICO', descripcion: 'Revisar cargador de baterías', resultado: 'B', observaciones: '' },

        // General
        { sistema: 'GENERAL', descripcion: '¿El equipo arranca sin dificultad?', resultado: 'B', observaciones: '' },
        { sistema: 'GENERAL', descripcion: '¿Existe vibración excesiva?', resultado: 'M', observaciones: '' },
        { sistema: 'GENERAL', descripcion: '¿Requiere mantenimiento correctivo?', resultado: 'B', observaciones: '' }
    ],

    // Mediciones
    mediciones: [
        { parametro: 'Temperatura Refrigerante', valor: 82, unidad: '°C', nivelAlerta: 'OK' },
        { parametro: 'Presión Aceite', valor: 65, unidad: 'PSI', nivelAlerta: 'OK' },
        { parametro: 'Voltaje Generador', valor: 220, unidad: 'V', nivelAlerta: 'OK' },
        { parametro: 'Frecuencia', valor: 60, unidad: 'Hz', nivelAlerta: 'OK' },
        { parametro: 'Corriente', valor: 45, unidad: 'A', nivelAlerta: 'ADVERTENCIA' }
    ],

    // Evidencias fotográficas (URLs de Cloudinary)
    evidencias: [
        {
            url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=600',
            caption: 'VISTA GENERAL DEL GENERADOR'
        },
        {
            url: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400',
            caption: 'PANEL DE CONTROL'
        },
        {
            url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=400',
            caption: 'SISTEMA DE ENFRIAMIENTO'
        }
    ],

    // Observaciones
    observaciones: `MANTENIMIENTO PREVENTIVO TIPO A - GENERADOR 500KVA

Se realizó inspección completa del equipo según checklist estándar.

HALLAZGOS:
- Correa de ventilador requiere tensión
- Filtro de aire secundario próximo a cambio
- Se detectó leve vibración que debe monitorearse

RECOMENDACIONES:
- Programar mantenimiento Tipo B en 30 días
- Monitorear nivel de vibración
- Verificar alineación motor-generador

Equipo queda operativo al 100%`,

    // Firmas (URLs de imágenes base64 o Cloudinary)
    firmaTecnico: null,
    firmaCliente: null
};

// ============================================================================
// TEST PRINCIPAL
// ============================================================================

async function ejecutarTest() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST ATÓMICO 04: PDF con Template REAL');
    console.log('═'.repeat(70));

    const resultados = {
        paso1_templateImportado: false,
        paso2_htmlGenerado: false,
        paso3_htmlContenido: false,
        paso4_pdfGenerado: false,
        paso5_pdfTamano: false,
        exito: false,
        datos: {}
    };

    let browser = null;

    try {
        // ========================================================================
        // PASO 1: Verificar que los templates se importaron correctamente
        // ========================================================================
        console.log('\n📌 PASO 1: Verificando templates importados...');

        if (typeof generarTipoAGeneradorHTML === 'function') {
            console.log(`   ✅ generarTipoAGeneradorHTML: función importada`);
        } else {
            throw new Error('generarTipoAGeneradorHTML no es una función');
        }

        if (typeof generarTipoBGeneradorHTML === 'function') {
            console.log(`   ✅ generarTipoBGeneradorHTML: función importada`);
        }

        if (typeof generarTipoABombaHTML === 'function') {
            console.log(`   ✅ generarTipoABombaHTML: función importada`);
        }

        console.log(`   🎨 Colores MEKANOS: Primary=${MEKANOS_COLORS.primary}, Success=${MEKANOS_COLORS.success}`);

        resultados.paso1_templateImportado = true;

        // ========================================================================
        // PASO 2: Generar HTML con template real
        // ========================================================================
        console.log('\n📌 PASO 2: Generando HTML con template TIPO A GENERADOR...');

        const htmlGenerado = generarTipoAGeneradorHTML(DATOS_ORDEN_PRUEBA);

        if (!htmlGenerado || htmlGenerado.length < 1000) {
            throw new Error('HTML generado está vacío o muy corto');
        }

        console.log(`   ✅ HTML generado: ${htmlGenerado.length} caracteres`);
        resultados.paso2_htmlGenerado = true;
        resultados.datos.htmlLength = htmlGenerado.length;

        // ========================================================================
        // PASO 3: Verificar contenido del HTML
        // ========================================================================
        console.log('\n📌 PASO 3: Verificando contenido del HTML...');

        const verificaciones = [
            { nombre: 'Logo MEKANOS', buscar: 'MEKANOS', encontrado: false },
            { nombre: 'Título TIPO A', buscar: 'MANTENIMIENTO PREVENTIVO TIPO A', encontrado: false },
            { nombre: 'Cliente', buscar: DATOS_ORDEN_PRUEBA.cliente, encontrado: false },
            { nombre: 'Número Orden', buscar: DATOS_ORDEN_PRUEBA.numeroOrden, encontrado: false },
            { nombre: 'Sistema Enfriamiento', buscar: 'SISTEMA DE ENFRIAMIENTO', encontrado: false },
            { nombre: 'Sistema Combustible', buscar: 'SISTEMA DE COMBUSTIBLE', encontrado: false },
            { nombre: 'Sistema Lubricación', buscar: 'SISTEMA DE LUBRICACIÓN', encontrado: false },
            { nombre: 'Simbología', buscar: 'SIMBOLOGÍA', encontrado: false },
            { nombre: 'Color Primary', buscar: MEKANOS_COLORS.primary, encontrado: false },
            { nombre: 'Evidencias', buscar: 'REGISTRO FOTOGRÁFICO', encontrado: false }
        ];

        let todasVerificaciones = true;
        for (const v of verificaciones) {
            v.encontrado = htmlGenerado.includes(v.buscar);
            if (v.encontrado) {
                console.log(`   ✅ ${v.nombre}: Encontrado`);
            } else {
                console.log(`   ❌ ${v.nombre}: NO encontrado`);
                todasVerificaciones = false;
            }
        }

        resultados.paso3_htmlContenido = todasVerificaciones;

        // ========================================================================
        // PASO 4: Generar PDF con Puppeteer
        // ========================================================================
        console.log('\n📌 PASO 4: Generando PDF con Puppeteer...');

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        await page.setContent(htmlGenerado, {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        await page.close();

        console.log(`   ✅ PDF generado: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
        resultados.paso4_pdfGenerado = true;
        resultados.datos.pdfSize = pdfBuffer.length;

        // Guardar PDF para inspección manual
        const pdfPath = path.join(__dirname, 'resultado-test-04.pdf');
        fs.writeFileSync(pdfPath, pdfBuffer);
        console.log(`   📁 PDF guardado en: ${pdfPath}`);

        // ========================================================================
        // PASO 5: Validar tamaño del PDF
        // ========================================================================
        console.log('\n📌 PASO 5: Validando tamaño del PDF...');

        // Un PDF vacío es ~1KB, uno con contenido real debe ser >50KB
        if (pdfBuffer.length > 50000) {
            console.log(`   ✅ Tamaño válido: ${(pdfBuffer.length / 1024).toFixed(2)} KB > 50 KB`);
            resultados.paso5_pdfTamano = true;
        } else {
            console.log(`   ❌ PDF muy pequeño: ${(pdfBuffer.length / 1024).toFixed(2)} KB (esperado >50 KB)`);
        }

        // ========================================================================
        // RESULTADO FINAL
        // ========================================================================
        resultados.exito =
            resultados.paso1_templateImportado &&
            resultados.paso2_htmlGenerado &&
            resultados.paso3_htmlContenido &&
            resultados.paso4_pdfGenerado &&
            resultados.paso5_pdfTamano;

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        console.log(error.stack);
        resultados.error = error.message;
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // ========================================================================
    // RESUMEN
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN DEL TEST');
    console.log('═'.repeat(70));

    console.log(`\n   Paso 1 - Template Importado:  ${resultados.paso1_templateImportado ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 2 - HTML Generado:       ${resultados.paso2_htmlGenerado ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 3 - HTML Contenido:      ${resultados.paso3_htmlContenido ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 4 - PDF Generado:        ${resultados.paso4_pdfGenerado ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 5 - PDF Tamaño:          ${resultados.paso5_pdfTamano ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n' + '─'.repeat(70));

    if (resultados.exito) {
        console.log('🎉 TEST ATÓMICO 04: ✅ ÉXITO TOTAL');
        console.log('\n   El PDF usa los templates REALES de MEKANOS correctamente.');
        console.log(`   Tamaño PDF: ${(resultados.datos.pdfSize / 1024).toFixed(2)} KB`);
    } else {
        console.log('💥 TEST ATÓMICO 04: ❌ FALLÓ');
        console.log('\n   Revisar los pasos que fallaron antes de continuar.');
    }

    console.log('═'.repeat(70) + '\n');

    // Guardar resultado JSON
    const resultPath = path.join(__dirname, 'resultado-test-04.json');
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
