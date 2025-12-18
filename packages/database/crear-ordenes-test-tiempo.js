const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Creando 3 órdenes EN_PROCESO para probar tiempos...\n');

    // 1. Buscar cliente
    const cliente = await prisma.clientes.findFirst({
        where: {
            persona: {
                email_principal: { contains: 'lorddeep3', mode: 'insensitive' }
            }
        },
        include: { persona: true }
    });
    const idCliente = cliente?.id_cliente || 13;
    console.log(`✅ Cliente ID: ${idCliente}`);

    // 2. Buscar equipos
    const equipos = await prisma.equipos.findMany({
        where: { id_cliente: idCliente },
        take: 3
    });
    console.log(`✅ Equipos: ${equipos.length}`);

    // 3. Buscar tipos de servicio
    const tiposServicio = await prisma.tipos_servicio.findMany({ take: 3 });
    console.log(`✅ Tipos servicio: ${tiposServicio.map(t => t.nombre_tipo).join(', ')}`);

    // 4. Buscar estado EN_PROCESO (id=5)
    const estadoEnProceso = await prisma.estados_orden.findFirst({
        where: { codigo_estado: 'EN_PROCESO' }
    });
    const idEstadoEnProceso = estadoEnProceso?.id_estado || 5;
    console.log(`✅ Estado EN_PROCESO ID: ${idEstadoEnProceso}`);

    // 5. Buscar técnico (admin = 1)
    const idTecnico = 1;
    console.log(`✅ Técnico ID: ${idTecnico}\n`);

    // 6. Crear 3 órdenes EN_PROCESO
    const prefijos = ['TEST-HORA', 'TIEMPO', 'PRUEBA'];
    const ordenesCreadas = [];

    for (let i = 0; i < 3; i++) {
        const equipo = equipos[i % equipos.length];
        const tipoServicio = tiposServicio[i % tiposServicio.length];
        const timestamp = Date.now();
        const numeroOrden = `${prefijos[i]}-${timestamp}-${String(i + 1).padStart(3, '0')}`;

        try {
            const orden = await prisma.ordenes_servicio.create({
                data: {
                    numero_orden: numeroOrden,
                    id_cliente: idCliente,
                    id_equipo: equipo.id_equipo,
                    id_tipo_servicio: tipoServicio.id_tipo_servicio,
                    id_estado_actual: idEstadoEnProceso,
                    id_tecnico_asignado: idTecnico,
                    fecha_programada: new Date(),
                    fecha_inicio_real: new Date(), // Ya iniciada
                    prioridad: 'ALTA',
                    origen_solicitud: 'PROGRAMADO',
                    descripcion_inicial: `Orden de prueba #${i + 1} para verificar manejo de tiempos. Tipo: ${tipoServicio.nombre_tipo}. Creada: ${new Date().toLocaleString('es-CO')}`,
                    requiere_firma_cliente: true,
                    creado_por: 1
                }
            });

            // Crear historial de estado
            await prisma.historial_estados_orden.create({
                data: {
                    id_orden_servicio: orden.id_orden_servicio,
                    id_estado_anterior: 1, // ASIGNADA
                    id_estado_nuevo: idEstadoEnProceso,
                    id_usuario: idTecnico,
                    motivo_cambio: 'Orden iniciada para prueba de tiempos'
                }
            });

            ordenesCreadas.push(orden);
            console.log(`✅ Orden ${i + 1}: ${orden.numero_orden}`);
            console.log(`   ID: ${orden.id_orden_servicio}`);
            console.log(`   Tipo: ${tipoServicio.nombre_tipo}`);
            console.log(`   Equipo: ${equipo.codigo_equipo || equipo.id_equipo}`);
            console.log('');
        } catch (error) {
            console.log(`❌ Error creando orden ${i + 1}:`, error.message);
        }
    }

    console.log(`\n🎉 Total órdenes EN_PROCESO creadas: ${ordenesCreadas.length}`);
    console.log('\n📱 Ahora puedes:');
    console.log('   1. Sincronizar en la app móvil');
    console.log('   2. Ver las órdenes EN_PROCESO');
    console.log('   3. Finalizar una orden y verificar las horas');

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
