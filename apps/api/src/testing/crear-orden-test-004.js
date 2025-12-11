const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function crear() {
    // Crear orden con id_tipo_servicio=3 (GEN_PREV_A con 42 actividades)
    const o = await p.ordenes_servicio.create({
        data: {
            numero_orden: 'OS-REAL-TEST-004',
            cliente: { connect: { id_cliente: 1 } },
            equipo: { connect: { id_equipo: 1 } },
            tipo_servicio: { connect: { id_tipo_servicio: 3 } }, // GEN_PREV_A - 42 actividades
            tecnico: { connect: { id_empleado: 1 } },
            estado: { connect: { id_estado: 5 } }, // EN_PROCESO
            fecha_programada: new Date(),
            prioridad: 'ALTA',
            descripcion_inicial: 'Orden de prueba #4 - Con 42 actividades correctas',
            usuario_creador: { connect: { id_usuario: 1 } }
        }
    });
    console.log('✅ Orden creada: ' + o.numero_orden + ' (ID: ' + o.id_orden_servicio + ')');
    console.log('   tipo_servicio: 3 (GEN_PREV_A - Preventivo Tipo A - Generador)');
    console.log('   Esta orden tendrá 42 actividades al iniciar en mobile');

    await p.$disconnect();
}

crear().catch(console.error);
