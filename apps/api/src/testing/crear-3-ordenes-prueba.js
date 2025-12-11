/**
 * Script: crear-3-ordenes-prueba.js
 * Crea 3 órdenes de servicio tipo A para pruebas
 * Ejecutar: node src/testing/crear-3-ordenes-prueba.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearOrdenes() {
    console.log('\n========================================');
    console.log('   CREANDO 3 ÓRDENES DE PRUEBA');
    console.log('========================================\n');

    try {
        // Verificar que existan los datos base
        const cliente = await prisma.clientes.findFirst();
        const equipo = await prisma.equipos.findFirst();
        const tipoServicio = await prisma.tipos_servicio.findFirst({
            where: { id_tipo_servicio: 3 } // GEN_PREV_A - 42 actividades
        });
        const estadoProgramada = await prisma.estados_orden.findFirst({
            where: { codigo_estado: 'PROGRAMADA' }
        });
        const tecnico = await prisma.empleados.findFirst();
        const usuario = await prisma.usuarios.findFirst();

        if (!cliente || !equipo || !tipoServicio || !estadoProgramada || !tecnico || !usuario) {
            console.log('❌ Faltan datos base:');
            console.log('   Cliente:', !!cliente);
            console.log('   Equipo:', !!equipo);
            console.log('   Tipo servicio:', !!tipoServicio);
            console.log('   Estado PROGRAMADA:', !!estadoProgramada);
            console.log('   Técnico:', !!tecnico);
            console.log('   Usuario:', !!usuario);
            return;
        }

        console.log('✅ Datos base verificados');
        console.log(`   Cliente: ${cliente.id_cliente}`);
        console.log(`   Equipo: ${equipo.id_equipo}`);
        console.log(`   Tipo Servicio: ${tipoServicio.codigo_servicio} (${tipoServicio.nombre_servicio})`);
        console.log(`   Técnico: ${tecnico.id_empleado}`);
        console.log('');

        // Generar números de orden únicos
        const timestamp = Date.now();
        const ordenes = [
            { numero: `OS-TEST-${timestamp}-A`, descripcion: 'Orden de prueba A - Mantenimiento preventivo generador' },
            { numero: `OS-TEST-${timestamp}-B`, descripcion: 'Orden de prueba B - Revisión rutinaria equipo' },
            { numero: `OS-TEST-${timestamp}-C`, descripcion: 'Orden de prueba C - Inspección de componentes' },
        ];

        const ordenesCreadas = [];

        for (const ordenData of ordenes) {
            const orden = await prisma.ordenes_servicio.create({
                data: {
                    numero_orden: ordenData.numero,
                    cliente: { connect: { id_cliente: cliente.id_cliente } },
                    equipo: { connect: { id_equipo: equipo.id_equipo } },
                    tipo_servicio: { connect: { id_tipo_servicio: tipoServicio.id_tipo_servicio } },
                    tecnico: { connect: { id_empleado: tecnico.id_empleado } },
                    estado: { connect: { id_estado: estadoProgramada.id_estado } },
                    fecha_programada: new Date(),
                    prioridad: 'ALTA',
                    descripcion_inicial: ordenData.descripcion,
                    usuario_creador: { connect: { id_usuario: usuario.id_usuario } }
                }
            });

            ordenesCreadas.push(orden);
            console.log(`✅ Orden creada: ${orden.numero_orden} (ID: ${orden.id_orden_servicio})`);
        }

        console.log('\n========================================');
        console.log('   ✅ 3 ÓRDENES CREADAS EXITOSAMENTE');
        console.log('========================================\n');
        console.log('📱 Para ver en la app:');
        console.log('   1. Sincronizar datos (Menú → Sincronizar)');
        console.log('   2. Ver lista de órdenes');
        console.log('   3. Las nuevas órdenes aparecerán en estado PROGRAMADA\n');

        // Mostrar IDs para referencia
        console.log('IDs creados:');
        ordenesCreadas.forEach(o => {
            console.log(`   - ${o.numero_orden}: ID ${o.id_orden_servicio}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === 'P2002') {
            console.log('   El número de orden ya existe. Intenta ejecutar de nuevo.');
        }
    } finally {
        await prisma.$disconnect();
    }
}

crearOrdenes();
