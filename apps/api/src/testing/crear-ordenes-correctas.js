/**
 * Script: crear-ordenes-correctas.js
 * Elimina órdenes mal creadas y crea 3 nuevas correctamente
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('\n========================================');
    console.log('   CREANDO ÓRDENES CORRECTAMENTE');
    console.log('========================================\n');

    try {
        // 1. Solo crear nuevas (no eliminar las viejas por dependencias FK)
        console.log('ℹ️ Las órdenes anteriores se dejan (tienen FK dependencias)');

        // 2. Verificar datos necesarios
        console.log('🔍 Verificando datos base...');

        // Cliente
        const cliente = await prisma.clientes.findFirst();
        if (!cliente) throw new Error('No hay clientes');
        console.log(`   Cliente ID: ${cliente.id_cliente}`);

        // Equipo - buscar uno que tenga datos completos
        const equipo = await prisma.equipos.findFirst({
            where: { activo: true }
        });
        if (!equipo) throw new Error('No hay equipos activos');
        console.log(`   Equipo ID: ${equipo.id_equipo}`);

        // Tipo servicio GEN_PREV_A (ID 3) - tiene 42 actividades
        const tipoServicio = await prisma.tipos_servicio.findUnique({
            where: { id_tipo_servicio: 3 }
        });
        if (!tipoServicio) throw new Error('Tipo servicio ID 3 no existe');
        console.log(`   Tipo Servicio: ${tipoServicio.codigo_tipo} - ${tipoServicio.nombre_tipo}`);

        // Estado PROGRAMADA
        const estadoProgramada = await prisma.estados_orden.findFirst({
            where: { codigo_estado: 'PROGRAMADA' }
        });
        if (!estadoProgramada) throw new Error('Estado PROGRAMADA no existe');
        console.log(`   Estado: ${estadoProgramada.codigo_estado} (ID: ${estadoProgramada.id_estado})`);

        // Técnico - Empleado ID 1 (el que usa el usuario admin)
        const tecnico = await prisma.empleados.findUnique({
            where: { id_empleado: 1 }
        });
        if (!tecnico) throw new Error('Empleado ID 1 no existe');
        console.log(`   Técnico ID: ${tecnico.id_empleado}`);

        // Usuario creador
        const usuario = await prisma.usuarios.findFirst();
        if (!usuario) throw new Error('No hay usuarios');
        console.log(`   Usuario creador: ${usuario.id_usuario}\n`);

        // 3. Crear 3 órdenes
        const timestamp = Date.now();
        const ordenesData = [
            { sufijo: 'A', desc: 'Mantenimiento preventivo generador - Prueba A', prioridad: 'ALTA' },
            { sufijo: 'B', desc: 'Revision rutinaria equipo - Prueba B', prioridad: 'NORMAL' },
            { sufijo: 'C', desc: 'Inspeccion de componentes - Prueba C', prioridad: 'URGENTE' },
        ];

        console.log('📝 Creando órdenes...\n');

        for (const data of ordenesData) {
            const numeroOrden = `OS-PRUEBA-${timestamp}-${data.sufijo}`;

            const orden = await prisma.ordenes_servicio.create({
                data: {
                    numero_orden: numeroOrden,
                    cliente: { connect: { id_cliente: cliente.id_cliente } },
                    equipo: { connect: { id_equipo: equipo.id_equipo } },
                    tipo_servicio: { connect: { id_tipo_servicio: tipoServicio.id_tipo_servicio } },
                    tecnico: { connect: { id_empleado: tecnico.id_empleado } },
                    estado: { connect: { id_estado: estadoProgramada.id_estado } },
                    fecha_programada: new Date(),
                    prioridad: data.prioridad,
                    descripcion_inicial: data.desc,
                    usuario_creador: { connect: { id_usuario: usuario.id_usuario } }
                }
            });

            console.log(`✅ ${orden.numero_orden} (ID: ${orden.id_orden_servicio})`);
            console.log(`   Tipo: ${tipoServicio.codigo_tipo}`);
            console.log(`   Técnico: ${tecnico.id_empleado}`);
            console.log(`   Prioridad: ${data.prioridad}\n`);
        }

        // 4. Verificar las órdenes creadas
        console.log('\n🔍 Verificación final...');
        const ordenesCreadas = await prisma.ordenes_servicio.findMany({
            where: { numero_orden: { contains: `OS-PRUEBA-${timestamp}` } },
            include: {
                tipo_servicio: true,
                estado: true
            }
        });

        console.log(`\n✅ ${ordenesCreadas.length} órdenes verificadas en Supabase:\n`);
        for (const o of ordenesCreadas) {
            console.log(`   ${o.numero_orden}`);
            console.log(`      - Tipo: ${o.tipo_servicio?.codigo_tipo || 'NULL'}`);
            console.log(`      - Estado: ${o.estado?.codigo_estado || 'NULL'}`);
            console.log(`      - Técnico ID: ${o.id_tecnico || 'NULL'}`);
        }

        console.log('\n========================================');
        console.log('   ✅ ÓRDENES CREADAS CORRECTAMENTE');
        console.log('========================================\n');
        console.log('📱 Ahora en la app:');
        console.log('   1. Sincronizar datos');
        console.log('   2. Las 3 órdenes nuevas aparecerán');
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
