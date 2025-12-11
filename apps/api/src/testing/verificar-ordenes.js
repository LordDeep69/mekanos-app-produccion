const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function verificar() {
    console.log('\n=== VERIFICANDO ÓRDENES CREADAS ===\n');

    // 1. Verificar las órdenes recién creadas
    const ordenes = await p.ordenes_servicio.findMany({
        where: { numero_orden: { contains: 'OS-TEST-1764884681175' } },
        include: {
            tipo_servicio: true,
            estado: true,
            tecnico: { include: { persona: true } },
            cliente: { include: { persona: true } }
        }
    });

    console.log(`Órdenes encontradas: ${ordenes.length}`);
    for (const o of ordenes) {
        console.log(`\n📋 ${o.numero_orden} (ID: ${o.id_orden_servicio})`);
        console.log(`   Tipo Servicio: ${o.tipo_servicio?.codigo_servicio || 'NULL'} - ${o.tipo_servicio?.nombre_servicio || 'NULL'}`);
        console.log(`   Estado: ${o.estado?.codigo_estado || 'NULL'}`);
        console.log(`   Técnico ID: ${o.id_tecnico}`);
        console.log(`   Cliente: ${o.cliente?.persona?.razon_social || o.cliente?.persona?.primer_nombre || 'NULL'}`);
    }

    // 2. Verificar tipos de servicio disponibles
    console.log('\n\n=== TIPOS DE SERVICIO DISPONIBLES ===\n');
    const tipos = await p.tipos_servicio.findMany({ where: { activo: true } });
    for (const t of tipos) {
        console.log(`   ID ${t.id_tipo_servicio}: ${t.codigo_servicio} - ${t.nombre_servicio}`);
    }

    // 3. Verificar técnico ID 1 vs ID 2
    console.log('\n\n=== TÉCNICOS DISPONIBLES ===\n');
    const tecnicos = await p.empleados.findMany({
        include: { persona: true, usuario: true }
    });
    for (const t of tecnicos) {
        console.log(`   ID ${t.id_empleado}: ${t.persona?.primer_nombre} ${t.persona?.primer_apellido}`);
        console.log(`      Usuario ID: ${t.usuario?.id_usuario || 'SIN USUARIO'}`);
    }

    // 4. Verificar usuario logueado (ID 1)
    console.log('\n\n=== USUARIO ID 1 ===\n');
    const usuario = await p.usuarios.findUnique({
        where: { id_usuario: 1 },
        include: { empleado: true }
    });
    console.log(`   Usuario: ${usuario?.email}`);
    console.log(`   Empleado ID: ${usuario?.empleado?.id_empleado || 'NO VINCULADO'}`);

    await p.$disconnect();
}

verificar().catch(console.error);
