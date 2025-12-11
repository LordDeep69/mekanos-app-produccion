/**
 * ============================================================================
 * TEST ATÓMICO 03: Registrar Evidencia en Base de Datos
 * ============================================================================
 * 
 * OBJETIVO: Validar que se puede crear un registro en `evidencias_fotograficas`
 *           con todos los campos requeridos.
 * 
 * PRERREQUISITOS:
 * - TEST ATÓMICO 01 y 02 deben haber pasado (Cloudinary funciona)
 * - Existe al menos una orden de servicio en BD
 * 
 * VALIDACIONES:
 * 1. Se puede conectar a la BD
 * 2. Se encuentra una orden existente para asociar
 * 3. El registro se crea correctamente con todos los campos
 * 4. Se puede recuperar el registro creado
 * 5. La relación con la orden es correcta
 * 
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const prisma = new PrismaClient();

// URL de Cloudinary del test anterior (ejemplo)
const URL_CLOUDINARY_EJEMPLO = 'https://res.cloudinary.com/dibw7aluj/image/upload/v1764360762/mekanos/test-atomico/test-bd.png';

// ============================================================================
// TEST PRINCIPAL
// ============================================================================

async function ejecutarTest() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST ATÓMICO 03: Registrar Evidencia en Base de Datos');
    console.log('═'.repeat(70));

    const resultados = {
        paso1_conexion: false,
        paso2_ordenExistente: false,
        paso3_crearRegistro: false,
        paso4_recuperarRegistro: false,
        paso5_relacionCorrecta: false,
        exito: false,
        datos: {}
    };

    let evidenciaCreada = null;

    try {
        // ========================================================================
        // PASO 1: Verificar conexión a BD
        // ========================================================================
        console.log('\n📌 PASO 1: Verificando conexión a Base de Datos...');

        await prisma.$connect();
        console.log(`   ✅ Conexión establecida`);
        resultados.paso1_conexion = true;

        // ========================================================================
        // PASO 2: Buscar una orden existente
        // ========================================================================
        console.log('\n📌 PASO 2: Buscando orden de servicio existente...');

        const orden = await prisma.ordenes_servicio.findFirst({
            orderBy: { id_orden_servicio: 'desc' },
            select: {
                id_orden_servicio: true,
                numero_orden: true
            }
        });

        if (!orden) {
            throw new Error('No hay órdenes de servicio en la base de datos');
        }

        console.log(`   ✅ Orden encontrada: ${orden.numero_orden} (ID: ${orden.id_orden_servicio})`);
        resultados.paso2_ordenExistente = true;
        resultados.datos.ordenId = orden.id_orden_servicio;
        resultados.datos.numeroOrden = orden.numero_orden;

        // ========================================================================
        // PASO 3: Crear registro de evidencia
        // ========================================================================
        console.log('\n📌 PASO 3: Creando registro de evidencia...');

        const timestamp = Date.now();
        const urlEvidencia = `https://res.cloudinary.com/dibw7aluj/image/upload/v${timestamp}/mekanos/test-atomico/evidencias/test_bd_${timestamp}.png`;
        const hashSha256 = crypto.createHash('sha256').update(urlEvidencia).digest('hex');

        evidenciaCreada = await prisma.evidencias_fotograficas.create({
            data: {
                id_orden_servicio: orden.id_orden_servicio,
                tipo_evidencia: 'ANTES',
                descripcion: 'Evidencia de prueba creada por TEST ATÓMICO 03',
                nombre_archivo: `test_bd_${timestamp}.png`,
                ruta_archivo: urlEvidencia,
                hash_sha256: hashSha256,
                tama_o_bytes: BigInt(1024),
                mime_type: 'image/png',
                ancho_pixels: 100,
                alto_pixels: 100,
                orden_visualizacion: 1,
                es_principal: false,
                fecha_captura: new Date()
            }
        });

        console.log(`   ✅ Evidencia creada (ID: ${evidenciaCreada.id_evidencia})`);
        console.log(`   📝 Tipo: ${evidenciaCreada.tipo_evidencia}`);
        console.log(`   🔗 URL: ${evidenciaCreada.ruta_archivo.substring(0, 60)}...`);
        console.log(`   🔐 Hash: ${evidenciaCreada.hash_sha256.substring(0, 16)}...`);

        resultados.paso3_crearRegistro = true;
        resultados.datos.evidenciaId = evidenciaCreada.id_evidencia;

        // ========================================================================
        // PASO 4: Recuperar el registro creado
        // ========================================================================
        console.log('\n📌 PASO 4: Recuperando registro creado...');

        const evidenciaRecuperada = await prisma.evidencias_fotograficas.findUnique({
            where: { id_evidencia: evidenciaCreada.id_evidencia }
        });

        if (!evidenciaRecuperada) {
            throw new Error('No se pudo recuperar la evidencia creada');
        }

        console.log(`   ✅ Registro recuperado correctamente`);
        console.log(`   📝 Descripción: ${evidenciaRecuperada.descripcion}`);

        resultados.paso4_recuperarRegistro = true;

        // ========================================================================
        // PASO 5: Verificar relación con la orden
        // ========================================================================
        console.log('\n📌 PASO 5: Verificando relación con la orden...');

        const ordenConEvidencias = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: orden.id_orden_servicio },
            include: {
                evidencias_fotograficas: {
                    where: { id_evidencia: evidenciaCreada.id_evidencia }
                }
            }
        });

        if (ordenConEvidencias?.evidencias_fotograficas?.length > 0) {
            console.log(`   ✅ Relación correcta - Evidencia asociada a orden ${orden.numero_orden}`);
            resultados.paso5_relacionCorrecta = true;
        } else {
            console.log(`   ❌ La evidencia no está asociada correctamente a la orden`);
        }

        // ========================================================================
        // RESULTADO FINAL
        // ========================================================================
        resultados.exito =
            resultados.paso1_conexion &&
            resultados.paso2_ordenExistente &&
            resultados.paso3_crearRegistro &&
            resultados.paso4_recuperarRegistro &&
            resultados.paso5_relacionCorrecta;

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        resultados.error = error.message;
    } finally {
        // Limpiar: Eliminar la evidencia de prueba
        if (evidenciaCreada) {
            console.log('\n🧹 Limpiando registro de prueba...');
            try {
                await prisma.evidencias_fotograficas.delete({
                    where: { id_evidencia: evidenciaCreada.id_evidencia }
                });
                console.log(`   ✅ Evidencia de prueba eliminada`);
            } catch (err) {
                console.log(`   ⚠️ No se pudo eliminar: ${err.message}`);
            }
        }

        await prisma.$disconnect();
    }

    // ========================================================================
    // RESUMEN
    // ========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('📊 RESUMEN DEL TEST');
    console.log('═'.repeat(70));

    console.log(`\n   Paso 1 - Conexión BD:        ${resultados.paso1_conexion ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 2 - Orden Existente:    ${resultados.paso2_ordenExistente ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 3 - Crear Registro:     ${resultados.paso3_crearRegistro ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 4 - Recuperar Registro: ${resultados.paso4_recuperarRegistro ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 5 - Relación Correcta:  ${resultados.paso5_relacionCorrecta ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n' + '─'.repeat(70));

    if (resultados.exito) {
        console.log('🎉 TEST ATÓMICO 03: ✅ ÉXITO TOTAL');
        console.log('\n   La tabla evidencias_fotograficas funciona correctamente.');
    } else {
        console.log('💥 TEST ATÓMICO 03: ❌ FALLÓ');
        console.log('\n   Revisar los pasos que fallaron antes de continuar.');
    }

    console.log('═'.repeat(70) + '\n');

    // Guardar resultado
    const resultPath = path.join(__dirname, 'resultado-test-03.json');
    fs.writeFileSync(resultPath, JSON.stringify({
        ...resultados,
        datos: {
            ...resultados.datos,
            // Convertir BigInt a string para JSON
        }
    }, null, 2));
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
