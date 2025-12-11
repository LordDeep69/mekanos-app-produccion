/**
 * Corrige emails para que el cliente de la orden tenga lorddeep3@gmail.com
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAIL_PRUEBAS = 'lorddeep3@gmail.com';

async function corregirEmailCliente(ordenId) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`🔧 CORRIGIENDO EMAIL DEL CLIENTE - ORDEN ${ordenId}`);
    console.log('═══════════════════════════════════════════════════════════════');

    try {
        // 1. Obtener la orden con su cliente
        const orden = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: ordenId },
            include: {
                cliente: {
                    include: {
                        persona: true
                    }
                }
            }
        });

        if (!orden) {
            console.log(`❌ Orden ${ordenId} no encontrada`);
            return;
        }

        console.log(`📋 Orden: ${orden.numero_orden}`);
        console.log(`🏢 Cliente ID: ${orden.id_cliente}`);
        console.log(`👤 Persona ID: ${orden.cliente?.id_persona}`);
        console.log(`📧 Email actual: ${orden.cliente?.persona?.email_principal}`);

        const idPersonaCliente = orden.cliente?.id_persona;

        // 2. Verificar si ya tiene el email correcto
        if (orden.cliente?.persona?.email_principal === EMAIL_PRUEBAS) {
            console.log('✅ El cliente YA tiene el email correcto');
            return;
        }

        // 3. Encontrar quién tiene el email de pruebas actualmente
        const personaConEmail = await prisma.personas.findFirst({
            where: { email_principal: EMAIL_PRUEBAS }
        });

        if (personaConEmail) {
            console.log(`\n⚠️ Email ${EMAIL_PRUEBAS} está en persona ID ${personaConEmail.id_persona}`);

            // Cambiar ese email a algo temporal
            const emailTemporal = `swap_${personaConEmail.id_persona}_${Date.now()}@temp.com`;
            await prisma.personas.update({
                where: { id_persona: personaConEmail.id_persona },
                data: { email_principal: emailTemporal }
            });
            console.log(`   → Cambiado a: ${emailTemporal}`);
        }

        // 4. Ahora sí asignar el email de pruebas al cliente de la orden
        await prisma.personas.update({
            where: { id_persona: idPersonaCliente },
            data: { email_principal: EMAIL_PRUEBAS }
        });
        console.log(`\n✅ Email actualizado: ${orden.cliente?.persona?.email_principal} → ${EMAIL_PRUEBAS}`);

        // 5. Verificar resultado
        const verificacion = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: ordenId },
            include: {
                cliente: {
                    include: { persona: true }
                }
            }
        });

        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('✅ VERIFICACIÓN FINAL:');
        console.log(`   Orden: ${verificacion.numero_orden}`);
        console.log(`   Cliente: ${verificacion.cliente?.persona?.razon_social}`);
        console.log(`   Email: ${verificacion.cliente?.persona?.email_principal}`);
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

// Corregir la orden 138
corregirEmailCliente(138);
