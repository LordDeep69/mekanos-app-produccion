/**
 * Script para actualizar el email del cliente de pruebas a lorddeep3@gmail.com
 * 
 * NOTA: email_principal tiene constraint UNIQUE, por lo que solo UN cliente
 * puede tener este email. Usamos el cliente ID 12 (Industrias ABC) que es
 * el cliente de pruebas.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['error'],
});

const EMAIL_PRUEBAS = 'lorddeep3@gmail.com';
const CLIENTE_ID_PRUEBAS = 12; // Cliente usado en tests

async function actualizarEmailClientePruebas() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔄 ACTUALIZANDO EMAIL DEL CLIENTE DE PRUEBAS');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`📧 Email destino: ${EMAIL_PRUEBAS}`);
    console.log(`🎯 Cliente ID: ${CLIENTE_ID_PRUEBAS}`);
    console.log('');

    try {
        // Obtener el cliente de pruebas
        const cliente = await prisma.clientes.findUnique({
            where: { id_cliente: CLIENTE_ID_PRUEBAS },
            include: { persona: true },
        });

        if (!cliente) {
            console.log(`❌ Cliente ID ${CLIENTE_ID_PRUEBAS} no encontrado`);
            return;
        }

        const emailActual = cliente.persona?.email_principal;
        const nombreCliente = cliente.persona?.razon_social || 'Sin nombre';

        console.log(`📋 Cliente: ${nombreCliente}`);
        console.log(`📧 Email actual: ${emailActual || 'null'}`);

        if (emailActual === EMAIL_PRUEBAS) {
            console.log(`✓ Ya tiene el email correcto`);
        } else {
            // Primero verificar si otro tiene ese email
            const otroConEmail = await prisma.personas.findFirst({
                where: { email_principal: EMAIL_PRUEBAS },
            });

            if (otroConEmail && otroConEmail.id_persona !== cliente.id_persona) {
                // Cambiar el email del otro a algo temporal
                await prisma.personas.update({
                    where: { id_persona: otroConEmail.id_persona },
                    data: { email_principal: `temp_${otroConEmail.id_persona}@temp.com` },
                });
                console.log(`⚠️ Liberado email de persona ID ${otroConEmail.id_persona}`);
            }

            // Actualizar el email del cliente de pruebas
            await prisma.personas.update({
                where: { id_persona: cliente.id_persona },
                data: { email_principal: EMAIL_PRUEBAS },
            });
            console.log(`✅ Email actualizado: ${emailActual || 'null'} → ${EMAIL_PRUEBAS}`);
        }

        // Verificar resultado
        const clienteActualizado = await prisma.clientes.findUnique({
            where: { id_cliente: CLIENTE_ID_PRUEBAS },
            include: { persona: true },
        });

        console.log('');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`✅ VERIFICACIÓN FINAL`);
        console.log(`   Cliente: ${clienteActualizado.persona?.razon_social}`);
        console.log(`   Email: ${clienteActualizado.persona?.email_principal}`);
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

actualizarEmailClientePruebas();
