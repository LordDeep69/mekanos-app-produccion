const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificar() {
    console.log('\n📧 Verificando configuración email del cliente PALMETTO (#46)...\n');

    // 1. Buscar cliente 46
    const cliente = await prisma.clientes.findUnique({
        where: { id_cliente: 46 },
        include: {
            persona: true,
            cuentas_email: true,
        }
    });

    if (!cliente) {
        console.log('❌ Cliente 46 NO encontrado');
        await prisma.$disconnect();
        return;
    }

    console.log(`📋 Cliente encontrado:`);
    console.log(`   - ID: ${cliente.id_cliente}`);
    console.log(`   - Persona: ${cliente.persona?.razon_social || cliente.persona?.nombre_comercial || cliente.persona?.nombre_completo}`);
    console.log(`   - id_cuenta_email_remitente: ${cliente.id_cuenta_email_remitente ?? 'NULL (NO CONFIGURADA)'}`);
    
    if (cliente.cuentas_email) {
        console.log(`\n📧 Cuenta email vinculada:`);
        console.log(`   - ID: ${cliente.cuentas_email.id_cuenta_email}`);
        console.log(`   - Email: ${cliente.cuentas_email.email}`);
        console.log(`   - Nombre: ${cliente.cuentas_email.nombre}`);
        console.log(`   - Activa: ${cliente.cuentas_email.activa}`);
        console.log(`   - Gmail Client ID: ${cliente.cuentas_email.gmail_client_id ? '✅ Configurado' : '❌ NO'}`);
        console.log(`   - Gmail Client Secret: ${cliente.cuentas_email.gmail_client_secret ? '✅ Configurado' : '❌ NO'}`);
        console.log(`   - Gmail Refresh Token: ${cliente.cuentas_email.gmail_refresh_token ? '✅ Configurado' : '❌ NO'}`);
    } else {
        console.log(`\n⚠️ NO tiene cuenta email vinculada`);
    }

    // 2. Listar todas las cuentas email disponibles
    console.log('\n📋 Todas las cuentas email en BD:');
    const cuentas = await prisma.cuentas_email.findMany({
        orderBy: { id_cuenta_email: 'asc' },
    });

    for (const c of cuentas) {
        const credsOk = c.gmail_client_id && c.gmail_client_secret && c.gmail_refresh_token;
        console.log(`   [${c.id_cuenta_email}] ${c.email} | activa=${c.activa} | principal=${c.es_cuenta_principal} | creds=${credsOk ? '✅' : '❌'} | nombre="${c.nombre}"`);
    }

    // 3. Verificar orden 683 (OS-202602-0029)
    console.log('\n📋 Verificando orden 683 (OS-202602-0029):');
    const orden = await prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: 683 },
        include: {
            clientes: {
                include: {
                    persona: true,
                    cuentas_email: true,
                }
            }
        }
    });

    if (orden) {
        console.log(`   - Orden: ${orden.numero_orden}`);
        console.log(`   - Cliente: ${orden.clientes?.persona?.razon_social || orden.clientes?.persona?.nombre_comercial}`);
        console.log(`   - id_cuenta_email_remitente del cliente: ${orden.clientes?.id_cuenta_email_remitente ?? 'NULL'}`);
        if (orden.clientes?.cuentas_email) {
            console.log(`   - Cuenta vinculada: ${orden.clientes.cuentas_email.email}`);
        }
    }

    await prisma.$disconnect();
}

verificar().catch(err => {
    console.error('❌ Error:', err);
    prisma.$disconnect();
});
