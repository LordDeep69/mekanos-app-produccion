const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Creando 5 órdenes CORRECTIVAS simples para pruebas de tiempo...\n');

    // 1. Buscar tipo de servicio correctivo
    const tipoCorrectivo = await prisma.tipos_servicio.findFirst({
        where: {
            OR: [
                { codigo_tipo: { contains: 'CORR', mode: 'insensitive' } },
                { nombre_tipo: { contains: 'Correctivo', mode: 'insensitive' } },
            ]
        }
    });

    if (!tipoCorrectivo) {
        console.log('❌ No se encontró tipo de servicio correctivo');
        console.log('Tipos disponibles:');
        const tipos = await prisma.tipos_servicio.findMany({ select: { id_tipo_servicio: true, codigo_tipo: true, nombre_tipo: true } });
        tipos.forEach(t => console.log(`  ${t.id_tipo_servicio}: ${t.codigo_tipo} - ${t.nombre_tipo}`));
        await prisma.$disconnect();
        return;
    }
    console.log(`✅ Tipo servicio: ${tipoCorrectivo.nombre_tipo} (${tipoCorrectivo.codigo_tipo})`);

    // 2. Buscar cliente
    const cliente = await prisma.clientes.findFirst({
        where: { persona: { email_principal: { contains: 'lorddeep3', mode: 'insensitive' } } },
        include: { persona: true }
    });
    const idCliente = cliente?.id_cliente || 2;
    console.log(`✅ Cliente ID: ${idCliente}`);

    // 3. Buscar equipo
    const equipo = await prisma.equipos.findFirst({
        where: { id_cliente: idCliente }
    });
    if (!equipo) {
        console.log('❌ No se encontró equipo para el cliente');
        await prisma.$disconnect();
        return;
    }
    console.log(`✅ Equipo: ${equipo.codigo_equipo || equipo.id_equipo}`);

    // 4. Buscar estado EN_PROCESO
    const estadoEnProceso = await prisma.estados_orden.findFirst({
        where: { codigo_estado: 'EN_PROCESO' }
    });
    const idEstadoEnProceso = estadoEnProceso?.id_estado || 5;
    console.log(`✅ Estado EN_PROCESO ID: ${idEstadoEnProceso}`);

    // 5. Buscar cualquier actividad del tipo correctivo
    const actividadSimple = await prisma.catalogo_actividades.findFirst({
        where: { id_tipo_servicio: tipoCorrectivo.id_tipo_servicio }
    });

    let idActividad = actividadSimple?.id_actividad_catalogo;

    if (!idActividad) {
        // Crear una actividad simple para el tipo correctivo
        const nuevaActividad = await prisma.catalogo_actividades.create({
            data: {
                id_tipo_servicio: tipoCorrectivo.id_tipo_servicio,
                codigo_actividad: `ACT-CORR-${Date.now()}`,
                descripcion_actividad: 'Verificación general del equipo',
                tipo_actividad: 'INSPECCION',
                orden_ejecucion: 1,
                es_obligatorio: true,
                activo: true
            }
        });
        idActividad = nuevaActividad.id_actividad_catalogo;
        console.log(`✅ Actividad creada: ID ${idActividad}`);
    } else {
        console.log(`✅ Actividad existente: ID ${idActividad} - ${actividadSimple.descripcion_actividad}`);
    }

    // 6. Crear 5 órdenes correctivas
    const ordenesCreadas = [];
    const timestamp = Date.now();

    for (let i = 0; i < 5; i++) {
        const numeroOrden = `CORR-TEST-${timestamp}-${String(i + 1).padStart(3, '0')}`;

        try {
            const orden = await prisma.ordenes_servicio.create({
                data: {
                    numero_orden: numeroOrden,
                    id_cliente: idCliente,
                    id_equipo: equipo.id_equipo,
                    id_tipo_servicio: tipoCorrectivo.id_tipo_servicio,
                    id_estado_actual: idEstadoEnProceso,
                    id_tecnico_asignado: 1,
                    fecha_programada: new Date(),
                    fecha_inicio_real: new Date(),
                    prioridad: i === 0 ? 'URGENTE' : 'ALTA',
                    origen_solicitud: 'PROGRAMADO',
                    descripcion_inicial: `Orden correctiva de prueba #${i + 1} - Solo 1 actividad. Para probar tiempos.`,
                    requiere_firma_cliente: true,
                    creado_por: 1
                }
            });

            // Crear la única actividad ejecutada (pendiente)
            await prisma.actividades_ejecutadas.create({
                data: {
                    id_orden_servicio: orden.id_orden_servicio,
                    id_actividad_catalogo: idActividad,
                    resultado: null, // Pendiente
                    observaciones_tecnico: null,
                    fecha_ejecucion: null
                }
            });

            ordenesCreadas.push(orden);
            console.log(`✅ Orden ${i + 1}: ${orden.numero_orden} (ID: ${orden.id_orden_servicio})`);
        } catch (error) {
            console.log(`❌ Error creando orden ${i + 1}:`, error.message);
        }
    }

    console.log(`\n🎉 Total órdenes CORRECTIVAS creadas: ${ordenesCreadas.length}`);
    console.log('\n📱 Ahora puedes:');
    console.log('   1. Sincronizar en la app móvil');
    console.log('   2. Abrir una orden CORR-TEST-*');
    console.log('   3. Marcar la única actividad como BUENO');
    console.log('   4. Firmar y FINALIZAR');
    console.log('   5. Verificar el PDF generado');

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
