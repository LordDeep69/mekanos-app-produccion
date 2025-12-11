const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function verificar() {
    console.log('\n=== TIPOS DE SERVICIO (RAW) ===\n');
    const tipos = await p.$queryRaw`SELECT * FROM tipos_servicio LIMIT 5`;
    console.log(tipos);

    console.log('\n=== EMPLEADOS (RAW) ===\n');
    const empleados = await p.$queryRaw`SELECT id_empleado, id_persona, cargo FROM empleados LIMIT 5`;
    console.log(empleados);

    console.log('\n=== USUARIOS CON EMPLEADO ===\n');
    const usuarios = await p.$queryRaw`
        SELECT u.id_usuario, u.email, u.id_empleado 
        FROM usuarios u 
        WHERE u.id_empleado IS NOT NULL
        LIMIT 5
    `;
    console.log(usuarios);

    console.log('\n=== ÓRDENES RECIÉN CREADAS (RAW) ===\n');
    const ordenes = await p.$queryRaw`
        SELECT id_orden_servicio, numero_orden, id_tipo_servicio, id_tecnico, id_estado
        FROM ordenes_servicio 
        WHERE numero_orden LIKE 'OS-TEST-1764884681175%'
    `;
    console.log(ordenes);

    await p.$disconnect();
}

verificar().catch(console.error);
