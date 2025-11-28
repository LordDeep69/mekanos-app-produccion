/**
 * ============================================================================
 * TEST ATÓMICO 07: Firma Digital en Base de Datos
 * ============================================================================
 * 
 * OBJETIVO: Validar que se puede crear un registro en `firmas_digitales`
 *           con todos los campos requeridos.
 * 
 * PRERREQUISITOS:
 * - Tests atómicos 01-06 deben haber pasado
 * 
 * VALIDACIONES:
 * 1. Conexión a BD
 * 2. Encontrar persona existente (id_persona)
 * 3. Encontrar usuario existente (registrada_por)
 * 4. Crear registro con firma base64 válida
 * 5. Recuperar y validar el registro creado
 * 
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Firma de prueba en base64 (pequeña imagen PNG 1x1)
const FIRMA_BASE64_PRUEBA = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// ============================================================================
// TEST PRINCIPAL
// ============================================================================

async function ejecutarTest() {
    console.log('\n' + '═'.repeat(70));
    console.log('🧪 TEST ATÓMICO 07: Firma Digital en Base de Datos');
    console.log('═'.repeat(70));

    const resultados = {
        paso1_conexion: false,
        paso2_personaExistente: false,
        paso3_usuarioExistente: false,
        paso4_crearRegistro: false,
        paso5_recuperarRegistro: false,
        exito: false,
        datos: {}
    };

    let firmaCreada = null;

    try {
        // ========================================================================
        // PASO 1: Verificar conexión a BD
        // ========================================================================
        console.log('\n📌 PASO 1: Verificando conexión a Base de Datos...');

        await prisma.$connect();
        console.log(`   ✅ Conexión establecida`);
        resultados.paso1_conexion = true;

        // ========================================================================
        // PASO 2: Buscar una persona existente
        // ========================================================================
        console.log('\n📌 PASO 2: Buscando persona existente...');

        const persona = await prisma.personas.findFirst({
            orderBy: { id_persona: 'asc' },
            select: {
                id_persona: true,
                primer_nombre: true,
                primer_apellido: true
            }
        });

        if (!persona) {
            throw new Error('No hay personas en la base de datos');
        }

        console.log(`   ✅ Persona encontrada: ${persona.primer_nombre} ${persona.primer_apellido} (ID: ${persona.id_persona})`);
        resultados.paso2_personaExistente = true;
        resultados.datos.personaId = persona.id_persona;

        // ========================================================================
        // PASO 3: Buscar usuario para registrada_por
        // ========================================================================
        console.log('\n📌 PASO 3: Buscando usuario para registrada_por...');

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
        // PASO 4: Crear registro de firma digital
        // ========================================================================
        console.log('\n📌 PASO 4: Creando registro de firma digital...');

        const timestamp = Date.now();
        const hashFirma = crypto.createHash('sha256').update(FIRMA_BASE64_PRUEBA + timestamp).digest('hex');

        firmaCreada = await prisma.firmas_digitales.create({
            data: {
                id_persona: persona.id_persona,
                tipo_firma: 'TECNICO',
                firma_base64: FIRMA_BASE64_PRUEBA,
                formato_firma: 'PNG',
                hash_firma: hashFirma,
                fecha_captura: new Date(),
                es_firma_principal: false,
                activa: true,
                observaciones: 'Firma de prueba TEST ATÓMICO 07',
                registrada_por: usuario.id_usuario,
                fecha_registro: new Date()
            }
        });

        console.log(`   ✅ Firma creada (ID: ${firmaCreada.id_firma_digital})`);
        console.log(`   📝 Tipo: ${firmaCreada.tipo_firma}`);
        console.log(`   📄 Formato: ${firmaCreada.formato_firma}`);
        console.log(`   🔐 Hash: ${firmaCreada.hash_firma.substring(0, 16)}...`);

        resultados.paso4_crearRegistro = true;
        resultados.datos.firmaId = firmaCreada.id_firma_digital;

        // ========================================================================
        // PASO 5: Recuperar y validar el registro creado
        // ========================================================================
        console.log('\n📌 PASO 5: Recuperando y validando registro...');

        const firmaRecuperada = await prisma.firmas_digitales.findUnique({
            where: { id_firma_digital: firmaCreada.id_firma_digital },
            include: {
                personas: {
                    select: { primer_nombre: true, primer_apellido: true }
                },
                usuarios: {
                    select: { email: true }
                }
            }
        });

        if (!firmaRecuperada) {
            throw new Error('No se pudo recuperar la firma creada');
        }

        // Validar que el base64 se puede decodificar
        const firmaBuffer = Buffer.from(firmaRecuperada.firma_base64, 'base64');
        const esValido = firmaBuffer.length > 0;

        console.log(`   ✅ Registro recuperado correctamente`);
        console.log(`   👤 Firmante: ${firmaRecuperada.personas?.primer_nombre} ${firmaRecuperada.personas?.primer_apellido}`);
        console.log(`   📝 Registrada por: ${firmaRecuperada.usuarios?.email}`);
        console.log(`   🔍 Base64 válido: ${esValido ? 'Sí' : 'No'} (${firmaBuffer.length} bytes)`);

        resultados.paso5_recuperarRegistro = esValido;

        // ========================================================================
        // RESULTADO FINAL
        // ========================================================================
        resultados.exito =
            resultados.paso1_conexion &&
            resultados.paso2_personaExistente &&
            resultados.paso3_usuarioExistente &&
            resultados.paso4_crearRegistro &&
            resultados.paso5_recuperarRegistro;

    } catch (error) {
        console.log(`\n❌ ERROR: ${error.message}`);
        resultados.error = error.message;
    } finally {
        // Limpiar: Eliminar firma de prueba
        if (firmaCreada) {
            console.log('\n🧹 Limpiando registro de prueba...');
            try {
                await prisma.firmas_digitales.delete({
                    where: { id_firma_digital: firmaCreada.id_firma_digital }
                });
                console.log(`   ✅ Firma de prueba eliminada`);
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
    console.log(`   Paso 2 - Persona Existente:   ${resultados.paso2_personaExistente ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 3 - Usuario Existente:   ${resultados.paso3_usuarioExistente ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 4 - Crear Registro:      ${resultados.paso4_crearRegistro ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Paso 5 - Validar Registro:    ${resultados.paso5_recuperarRegistro ? '✅ PASS' : '❌ FAIL'}`);

    console.log('\n' + '─'.repeat(70));

    if (resultados.exito) {
        console.log('🎉 TEST ATÓMICO 07: ✅ ÉXITO TOTAL');
        console.log('\n   La tabla firmas_digitales funciona correctamente.');
    } else {
        console.log('💥 TEST ATÓMICO 07: ❌ FALLÓ');
        console.log('\n   Revisar los pasos que fallaron antes de continuar.');
    }

    console.log('═'.repeat(70) + '\n');

    // Guardar resultado
    const resultPath = path.join(__dirname, 'resultado-test-07.json');
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
