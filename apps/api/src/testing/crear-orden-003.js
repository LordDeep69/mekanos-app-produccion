const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function crear() {
    const o = await p.ordenes_servicio.create({
        data: {
            numero_orden: 'OS-REAL-TEST-003',
            cliente: { connect: { id_cliente: 1 } },
            equipo: { connect: { id_equipo: 1 } },
            tipo_servicio: { connect: { id_tipo_servicio: 1 } },
            tecnico: { connect: { id_empleado: 1 } },
            estado: { connect: { id_estado: 5 } },
            fecha_programada: new Date(),
            prioridad: 'NORMAL',
            descripcion_inicial: 'Orden prueba 3',
            usuario_creador: { connect: { id_usuario: 1 } }
        }
    });
    console.log('✅ Creada:', o.numero_orden, '- ID:', o.id_orden_servicio);
    await p.$disconnect();
}

crear().catch(e => { console.log('Error:', e.message); p.$disconnect(); });
