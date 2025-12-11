/**
 * Script para crear órdenes de prueba adicionales
 * OS-REAL-TEST-002 y OS-REAL-TEST-003
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearOrdenesPrueba() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('🔧 CREANDO ÓRDENES DE PRUEBA ADICIONALES');
    console.log('═══════════════════════════════════════════════════════');

    try {
        // Obtener el estado EN_PROCESO
        const estadoEnProceso = await prisma.estados_orden.findFirst({
            where: { codigo_estado: 'EN_PROCESO' }
        });

        if (!estadoEnProceso) {
            throw new Error('Estado EN_PROCESO no encontrado');
        }

        // Verificar tipo de servicio existente
        let tipoServicio = await prisma.tipos_servicio.findFirst({
            where: { activo: true }
        });

        if (!tipoServicio) {
            console.log('⚠️ No hay tipo de servicio activo, creando uno...');
            tipoServicio = await prisma.tipos_servicio.create({
                data: {
                    codigo_tipo: 'PREV_A',
                    nombre_tipo: 'MANTENIMIENTO PREVENTIVO TIPO A',
                    descripcion: 'Mantenimiento preventivo completo',
                    categoria: 'PREVENTIVO',
                    activo: true
                }
            });
        }

        // Crear OS-REAL-TEST-002
        console.log('\n1️⃣ Creando OS-REAL-TEST-002...');
        const orden2 = await prisma.ordenes_servicio.create({
            data: {
                numero_orden: 'OS-REAL-TEST-002',
                cliente: { connect: { id_cliente: 1 } },
                equipo: { connect: { id_equipo: 1 } },
                tipo_servicio: { connect: { id_tipo_servicio: tipoServicio.id_tipo_servicio } },
                tecnico: { connect: { id_empleado: 1 } },
                estado: { connect: { id_estado: estadoEnProceso.id_estado } },
                fecha_programada: new Date(),
                prioridad: 'ALTA',
                descripcion_inicial: 'Orden de prueba #2 para validación de flujo completo',
                usuario_creador: { connect: { id_usuario: 1 } },
            }
        });
        console.log(`   ✅ Creada: ${orden2.numero_orden} (ID: ${orden2.id_orden_servicio})`);

        // Crear OS-REAL-TEST-003
        console.log('\n2️⃣ Creando OS-REAL-TEST-003...');
        const orden3 = await prisma.ordenes_servicio.create({
            data: {
                numero_orden: 'OS-REAL-TEST-003',
                cliente: { connect: { id_cliente: 1 } },
                equipo: { connect: { id_equipo: 1 } },
                tipo_servicio: { connect: { id_tipo_servicio: tipoServicio.id_tipo_servicio } },
                tecnico: { connect: { id_empleado: 1 } },
                estado: { connect: { id_estado: estadoEnProceso.id_estado } },
                fecha_programada: new Date(Date.now() + 86400000), // Mañana
                prioridad: 'NORMAL',
                descripcion_inicial: 'Orden de prueba #3 para validación de flujo completo',
                usuario_creador: { connect: { id_usuario: 1 } },
            }
        });
        console.log(`   ✅ Creada: ${orden3.numero_orden} (ID: ${orden3.id_orden_servicio})`);

        // Verificar
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('✅ ÓRDENES CREADAS EXITOSAMENTE');
        console.log('═══════════════════════════════════════════════════════');

        const ordenes = await prisma.ordenes_servicio.findMany({
            where: {
                numero_orden: {
                    in: ['OS-REAL-TEST-002', 'OS-REAL-TEST-003']
                }
            },
            include: {
                cliente: { include: { persona: true } },
                equipo: true,
                tecnico: { include: { persona: true } },
                estado: true,
            }
        });

        for (const o of ordenes) {
            console.log(`\n📋 ${o.numero_orden}`);
            console.log(`   ID: ${o.id_orden_servicio}`);
            console.log(`   Estado: ${o.estado?.codigo_estado}`);
            console.log(`   Cliente: ${o.cliente?.persona?.razon_social || o.cliente?.persona?.nombre_completo}`);
            console.log(`   Equipo: ${o.equipo?.nombre_equipo}`);
            console.log(`   Técnico: ${o.tecnico?.persona?.primer_nombre} ${o.tecnico?.persona?.primer_apellido}`);
        }

        console.log('\n⚠️ IMPORTANTE: Sincroniza la app móvil para ver las nuevas órdenes.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

crearOrdenesPrueba();
