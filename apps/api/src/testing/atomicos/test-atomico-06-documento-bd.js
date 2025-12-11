/**
 * ============================================================================
 * TEST ATÓMICO 06: Registrar Documento en Base de Datos
 * ============================================================================
 * 
 * OBJETIVO: Validar que se puede crear un registro en `documentos_generados`
 *           con todos los campos requeridos.
 * 
 * PRERREQUISITOS:
 * - TEST ATÓMICO 05 debe haber pasado (R2 funciona)
 * 
 * VALIDACIONES:
 * 1. Conexión a BD
 * 2. Encontrar orden existente
 * 3. Encontrar usuario existente (generado_por)
 * 4. Crear registro con todos los campos requeridos
 * 5. Recuperar el registro creado
 * 
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ============================================================================
// TEST PRINCIPAL
// ============================================================================

async function ejecutarTest() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST ATÓMICO 06: Registrar Documento en Base de Datos');
    console.log('═'.repeat(70));

    const resultados = {
        paso1_conexion: false,
        paso2_ordenExistente: false,
        paso3_usuarioExistente: false,
        paso4_crearRegistro: false,
        paso5_recuperarRegistro: false,
        exito: false,
        datos: {}
    };

    let documentoCreado = null;

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

        // ========================================================================
        // PASO 3: Buscar usuario para generado_por
        // ========================================================================
        console.log('\n📌 PASO 3: Buscando usuario para generado_por...');

        const usuario = await prisma.usuarios.findFirst({
            orderBy: { id_usuario: 'asc' },
            select: {
                id_usuario: true,
                email: true
            }
        });

        if (!usuario) {
            throw new Error('No hay usuarios en la base de datos');
        }

        console.log(`   ✅ Usuario encontrado: ${usuario.email} (ID: ${usuario.id_usuario})`);
        resultados.paso3_usuarioExistente = true;
        resultados.datos.usuarioId = usuario.id_usuario;

        // ========================================================================
        // PASO 4: Crear registro de documento
        // ========================================================================
        console.log('\n📌 PASO 4: Creando registro de documento...');

        const timestamp = Date.now();
        const rutaArchivo = `https://pub-r2.mekanos.com.co/test-atomico/docs/test_06_${timestamp}.pdf`;
        const hashSha256 = crypto.createHash('sha256').update(rutaArchivo + timestamp).digest('hex');

        documentoCreado = await prisma.documentos_generados.create({
            data: {
                tipo_documento: 'INFORME_SERVICIO',
                id_referencia: orden.id_orden_servicio,
                numero_documento: `DOC-TEST-06-${timestamp}`,
                ruta_archivo: rutaArchivo,
                hash_sha256: hashSha256,
                tama_o_bytes: BigInt(50000),
                mime_type: 'application/pdf',
                numero_paginas: 3,
                fecha_generacion: new Date(),
                generado_por: usuario.id_usuario,
                herramienta_generacion: 'TEST-ATOMICO-06'
            }
        });

        console.log(`   ✅ Documento creado (ID: ${documentoCreado.id_documento})`);
        console.log(`   📄 Tipo: ${documentoCreado.tipo_documento}`);
        console.log(`   📁 Ruta: ${documentoCreado.ruta_archivo.substring(0, 60)}...`);
        console.log(`   🔐 Hash: ${documentoCreado.hash_sha256.substring(0, 16)}...`);

        resultados.paso4_crearRegistro = true;
        resultados.datos.documentoId = documentoCreado.id_documento;

        // ========================================================================
        // PASO 5: Recuperar el registro creado
        // ========================================================================
        console.log('\n📌 PASO 5: Recuperando registro creado...');

        const documentoRecuperado = await prisma.documentos_generados.findUnique({
            where: { id_documento: documentoCreado.id_documento },
            include: {
                usuarios: {
                    select: { email: true }
                }
            }
        });

        if (!documentoRecuperado) {
            throw new Error('No se pudo recuperar el documento creado');
        }

        console.log(`   ✅ Registro recuperado correctamente`);
        console.log(`   👤 Generado por: ${documentoRecuperado.usuarios?.email}`);

        resultados.paso5_recuperarRegistro = true;

        // ========================================================================
        // RESULTADO FINAL
        // ========================================================================
        resultados.exito =
            resultados.paso1_conexion &&
            resultados.paso2_ordenExistente &&
            resultados.paso3_usuarioExistente &&
            resultados.paso4_crearRegistro &&
            resultados.paso5_recuperarRegistro;

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        resultados.error = error.message;
    } finally {
        // Limpiar: Eliminar documento de prueba
        if (documentoCreado) {
            console.log('\n🧹 Limpiando registro de prueba...');
            try {
                await prisma.documentos_generados.delete({
                    where: { id_documento: documentoCreado.id_documento }
                });
                console.log(`   ✅ Documento de prueba eliminado`);
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

    console.log(`\n   Paso 1 - Conexión BD:         ${resultados.paso1_conexion ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 2 - Orden Existente:     ${resultados.paso2_ordenExistente ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 3 - Usuario Existente:   ${resultados.paso3_usuarioExistente ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 4 - Crear Registro:      ${resultados.paso4_crearRegistro ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 5 - Recuperar Registro:  ${resultados.paso5_recuperarRegistro ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n' + '─'.repeat(70));

    if (resultados.exito) {
        console.log('🎉 TEST ATÓMICO 06: ✅ ÉXITO TOTAL');
        console.log('\n   La tabla documentos_generados funciona correctamente.');
    } else {
        console.log('💥 TEST ATÓMICO 06: ❌ FALLÓ');
        console.log('\n   Revisar los pasos que fallaron antes de continuar.');
    }

    console.log('═'.repeat(70) + '\n');

    // Guardar resultado
    const resultPath = path.join(__dirname, 'resultado-test-06.json');
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
