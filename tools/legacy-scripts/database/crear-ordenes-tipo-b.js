const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Creando 5 órdenes Tipo B para generadores...\n');

    // 1. Buscar cliente con email lorddeep3+cliente@gmail.com
    const cliente = await prisma.clientes.findFirst({
        where: {
            persona: {
                email_principal: {
                    contains: 'lorddeep3',
                    mode: 'insensitive'
                }
            }
        },
        include: { persona: true }
    });

    if (!cliente) {
        console.log('❌ No se encontró cliente con email lorddeep3. Buscando cualquier cliente...');
    }
    const idCliente = cliente?.id_cliente || 13;
    console.log(`✅ Cliente: ${cliente?.persona?.razon_social || 'ID ' + idCliente}`);

    // 2. Buscar equipos de tipo GENERADOR
    const equiposGenerador = await prisma.equipos.findMany({
        where: {
            id_cliente: idCliente,
            tipo_equipo: {
                is: { nombre_tipo: { contains: 'Generador', mode: 'insensitive' } }
            }
        },
        include: { tipo_equipo: true },
        take: 5
    });

    if (equiposGenerador.length === 0) {
        console.log('❌ No se encontraron generadores. Buscando cualquier equipo...');
        const cualquierEquipo = await prisma.equipos.findMany({
            where: { id_cliente: idCliente },
            take: 5
        });
        equiposGenerador.push(...cualquierEquipo);
    }
    console.log(`✅ Equipos encontrados: ${equiposGenerador.length}\n`);

    // 3. Buscar tipo de servicio TIPO B - listar primero
    const todosLosTipos = await prisma.tipos_servicio.findMany();
    console.log('Tipos de servicio disponibles:');
    todosLosTipos.forEach(t => console.log(`  ${t.id_tipo_servicio}: ${JSON.stringify(t)}`));

    // Buscar el que contenga "B" en el nombre
    const tipoServicioB = todosLosTipos.find(t =>
        (t.nombre_tipo && t.nombre_tipo.toUpperCase().includes('TIPO B')) ||
        (t.nombre_tipo && t.nombre_tipo.toUpperCase().includes('B'))
    );

    if (!tipoServicioB) {
        console.log('❌ No se encontró tipo de servicio Tipo B, usando el primero disponible');
        // Usar ID 4 que sabemos es TIPO B por el contexto anterior
    }
    const idTipoServicio = tipoServicioB?.id_tipo_servicio || 4;
    console.log(`✅ Tipo servicio ID: ${idTipoServicio}`);

    // 4. Buscar estado ASIGNADA
    const estadoAsignada = await prisma.estados_orden.findFirst({
        where: { nombre_estado: 'Asignada' }
    });
    const idEstado = estadoAsignada?.id_estado || 2;
    console.log(`✅ Estado inicial: ${estadoAsignada?.nombre_estado || 'ID ' + idEstado}`);

    // 5. Buscar un técnico
    const tecnico = await prisma.empleados.findFirst({
        where: { empleado_activo: true, es_tecnico: true }
    });
    console.log(`✅ Técnico: ID ${tecnico?.id_empleado || 1}\n`);

    // 6. Crear 5 órdenes
    const ordenesCreadas = [];
    const fechaBase = new Date();

    for (let i = 0; i < 5; i++) {
        const equipo = equiposGenerador[i % equiposGenerador.length];
        const fechaProgramada = new Date(fechaBase);
        fechaProgramada.setDate(fechaProgramada.getDate() + i); // Escalonar por días

        // Generar número de orden
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const numeroOrden = `PREVB-${randomNum}`;

        try {
            const orden = await prisma.ordenes_servicio.create({
                data: {
                    numero_orden: numeroOrden,
                    id_cliente: idCliente,
                    id_equipo: equipo.id_equipo,
                    id_tipo_servicio: idTipoServicio,
                    id_estado_actual: idEstado,
                    id_tecnico_asignado: tecnico?.id_empleado || 1,
                    fecha_programada: fechaProgramada,
                    prioridad: 'NORMAL',
                    origen_solicitud: 'PROGRAMADO',
                    descripcion_inicial: `Mantenimiento Tipo B de rutina: revisión completa de sistemas, cambio de filtros y verificación de parámetros. Orden de prueba #${i + 1}`,
                    requiere_firma_cliente: true,
                    creado_por: 1
                }
            });

            ordenesCreadas.push(orden);
            console.log(`✅ Orden ${i + 1}: ${orden.numero_orden} (ID: ${orden.id_orden_servicio})`);
        } catch (error) {
            console.log(`❌ Error creando orden ${i + 1}:`, error.message);
        }
    }

    console.log(`\n🎉 Total órdenes creadas: ${ordenesCreadas.length}`);

    // 7. También arreglar la orden 165 si tiene problema de constraint
    console.log('\n📋 Verificando orden 165 (PREVB-361174)...');
    const orden165 = await prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: 165 }
    });

    if (orden165) {
        console.log(`   Estado actual: ${orden165.id_estado_actual}`);
        console.log(`   Fecha inicio: ${orden165.fecha_inicio_real}`);
        console.log(`   Fecha fin: ${orden165.fecha_fin_real}`);

        // Si tiene fecha_fin anterior a fecha_inicio, corregir
        if (orden165.fecha_fin_real && orden165.fecha_inicio_real &&
            orden165.fecha_fin_real < orden165.fecha_inicio_real) {
            console.log('   ⚠️ Fecha fin anterior a fecha inicio. Corrigiendo...');
            await prisma.ordenes_servicio.update({
                where: { id_orden_servicio: 165 },
                data: { fecha_fin_real: null }
            });
            console.log('   ✅ Corregido');
        }

        // Si está en estado COMPLETADA (4) pero queremos reusarla, resetear
        if (orden165.id_estado_actual === 4) {
            console.log('   ℹ️ Orden ya completada. No se modifica.');
        }
    }

    await prisma.$disconnect();
    console.log('\n✅ Script completado');
}

main().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
