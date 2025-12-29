
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log('--- BUSCANDO USUARIO 9 ---');
        const u = await prisma.usuarios.findUnique({
            where: { id_usuario: 9 },
            select: { id_usuario: true, id_persona: true, username: true }
        });
        console.log('Usuario:', JSON.stringify(u, null, 2));

        if (u) {
            console.log('--- BUSCANDO PERSONA DEL USUARIO ---');
            const p = await prisma.personas.findUnique({
                where: { id_persona: u.id_persona }
            });
            console.log('Persona:', JSON.stringify(p, null, 2));
        }

        console.log('--- BUSCANDO ORDEN 594 ---');
        const o = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: 594 },
            include: {
                clientes: { include: { persona: true } },
                empleados_ordenes_servicio_id_tecnico_asignadoToempleados: { include: { persona: true } }
            }
        });

        if (o) {
            console.log('Orden OS-202512-0021 (ID 594):');
            console.log('  id_cliente:', o.id_cliente);
            console.log('  Persona Cliente ID:', o.clientes?.id_persona);
            console.log('  id_tecnico_asignado:', o.id_tecnico_asignado);
            console.log('  Persona Técnico ID:', o.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.id_persona);
        } else {
            console.log('Orden 594 no encontrada');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
