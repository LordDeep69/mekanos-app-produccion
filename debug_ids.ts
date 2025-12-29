
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const usuarioId = 9;
    const ordenId = 594;

    console.log('--- DIAGNÓSTICO DE IDs ---');

    const usuario = await prisma.usuarios.findUnique({
        where: { id_usuario: usuarioId },
        select: { id_usuario: true, id_persona: true }
    });
    console.log('Usuario 9:', usuario);

    const personaUsuario = usuario ? await prisma.personas.findUnique({
        where: { id_persona: usuario.id_persona }
    }) : null;
    console.log('Persona del Usuario:', personaUsuario);

    const orden = await prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: ordenId },
        include: {
            clientes: true,
            empleados_ordenes_servicio_id_tecnico_asignadoToempleados: {
                include: { persona: true }
            }
        }
    });

    if (orden) {
        console.log('Orden 594 - Cliente Persona ID:', orden.clientes?.id_persona);
        console.log('Orden 594 - Técnico Asignado Empleado ID:', orden.id_tecnico_asignado);
        console.log('Orden 594 - Técnico Asignado Persona ID:', orden.empleados_ordenes_servicio_id_tecnico_asignadoToempleados?.id_persona);
    } else {
        console.log('Orden 594 no encontrada');
    }

    // Verificar si existe persona con ID 9
    const persona9 = await prisma.personas.findUnique({
        where: { id_persona: 9 }
    });
    console.log('¿Existe Persona ID 9?:', !!persona9);

    // Verificar si existe persona con ID 0
    const persona0 = await prisma.personas.findUnique({
        where: { id_persona: 0 }
    });
    console.log('¿Existe Persona ID 0?:', !!persona0);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
