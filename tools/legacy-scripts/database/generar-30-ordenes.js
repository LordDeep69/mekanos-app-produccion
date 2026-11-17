/**
 * Script para generar 30 órdenes de prueba:
 * - 10 Tipo A Generador (GEN_PREV_A)
 * - 10 Tipo B Generador (GEN_PREV_B) 
 * - 10 Tipo A Bombas (BOM_PREV_A)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Iniciando generación de 30 órdenes de prueba...\n');

    // 1. Obtener técnico existente (empleado con rol técnico)
    const tecnico = await prisma.empleados.findFirst({
        where: { id_empleado: 1 },
        include: { persona: true }
    });
    if (!tecnico) {
        throw new Error('No se encontró empleado con ID 1');
    }
    console.log(`✅ Técnico: ID ${tecnico.id_empleado} - ${tecnico.persona?.primer_nombre || 'N/A'}`);

    // 2. Obtener cliente existente
    const cliente = await prisma.clientes.findFirst({
        include: { persona: true }
    });
    if (!cliente) {
        throw new Error('No se encontró ningún cliente');
    }
    console.log(`✅ Cliente: ${cliente.persona?.razon_social || cliente.persona?.nombre_completo}`);

    // 3. Obtener tipos de servicio
    const tiposServicio = await prisma.tipos_servicio.findMany({
        where: {
            codigo_tipo: { in: ['GEN_PREV_A', 'GEN_PREV_B', 'BOM_PREV_A'] }
        }
    });
    console.log(`✅ Tipos de servicio encontrados: ${tiposServicio.map(t => t.codigo_tipo).join(', ')}`);

    const tipoGenA = tiposServicio.find(t => t.codigo_tipo === 'GEN_PREV_A');
    const tipoGenB = tiposServicio.find(t => t.codigo_tipo === 'GEN_PREV_B');
    const tipoBomA = tiposServicio.find(t => t.codigo_tipo === 'BOM_PREV_A');

    // 4. Obtener equipos por tipo
    const equipoGenerador = await prisma.equipos.findFirst({
        where: { tipo_equipo: { codigo_tipo: 'GEN' } }
    });
    const equipoBomba = await prisma.equipos.findFirst({
        where: { tipo_equipo: { codigo_tipo: 'BOM' } }
    });

    if (!equipoGenerador) {
        console.log('⚠️ No hay equipo tipo Generador, creando uno...');
        // Crear equipo generador básico si no existe
    }
    if (!equipoBomba) {
        console.log('⚠️ No hay equipo tipo Bomba, creando uno...');
    }

    console.log(`✅ Equipo Generador: ${equipoGenerador?.nombre_equipo || 'Por crear'}`);
    console.log(`✅ Equipo Bomba: ${equipoBomba?.nombre_equipo || 'Por crear'}`);

    // 5. Obtener estado APROBADA
    const estadoAprobada = await prisma.estados_orden.findFirst({
        where: { codigo_estado: 'APROBADA' }
    });
    const estadoAsignada = await prisma.estados_orden.findFirst({
        where: { codigo_estado: 'ASIGNADA' }
    });
    const estadoParaUsar = estadoAprobada || estadoAsignada;
    console.log(`✅ Estado a usar: ${estadoParaUsar?.nombre_estado}`);

    // 5b. Obtener usuario para creado_por
    const usuario = await prisma.usuarios.findFirst();
    if (!usuario) {
        throw new Error('No se encontró ningún usuario');
    }
    console.log(`✅ Usuario creador: ${usuario.email}`);

    // 6. Generar órdenes
    const prioridades = ['NORMAL', 'ALTA', 'URGENTE']; // Solo valores válidos del enum
    let ordenesCreadas = 0;

    // Función para generar número de orden único con timestamp
    const timestamp = Date.now().toString().slice(-6);
    const generarNumeroOrden = (tipo, num) => {
        return `${tipo}-${timestamp}-${String(num).padStart(3, '0')}`;
    };

    // Crear 10 órdenes Tipo A Generador
    if (tipoGenA && equipoGenerador) {
        console.log('\n📋 Creando 10 órdenes Tipo A Generador...');
        for (let i = 1; i <= 10; i++) {
            const fechaProg = new Date();
            fechaProg.setDate(fechaProg.getDate() + Math.floor(Math.random() * 30));

            await prisma.ordenes_servicio.create({
                data: {
                    numero_orden: generarNumeroOrden('GENA', ordenesCreadas + i),
                    id_cliente: cliente.id_cliente,
                    id_equipo: equipoGenerador.id_equipo,
                    id_tecnico_asignado: tecnico.id_empleado,
                    id_tipo_servicio: tipoGenA.id_tipo_servicio,
                    id_estado_actual: estadoParaUsar.id_estado,
                    prioridad: prioridades[i % prioridades.length],
                    fecha_programada: fechaProg,
                    descripcion_inicial: `Mantenimiento Preventivo Tipo A - Generador #${i}`,
                    creado_por: usuario.id_usuario
                }
            });
            console.log(`  ✅ Orden GENA ${i}/10 creada`);
        }
        ordenesCreadas += 10;
    }

    // Crear 10 órdenes Tipo B Generador
    if (tipoGenB && equipoGenerador) {
        console.log('\n📋 Creando 10 órdenes Tipo B Generador...');
        for (let i = 1; i <= 10; i++) {
            const fechaProg = new Date();
            fechaProg.setDate(fechaProg.getDate() + Math.floor(Math.random() * 30));

            await prisma.ordenes_servicio.create({
                data: {
                    numero_orden: generarNumeroOrden('GENB', ordenesCreadas + i),
                    id_cliente: cliente.id_cliente,
                    id_equipo: equipoGenerador.id_equipo,
                    id_tecnico_asignado: tecnico.id_empleado,
                    id_tipo_servicio: tipoGenB.id_tipo_servicio,
                    id_estado_actual: estadoParaUsar.id_estado,
                    prioridad: prioridades[i % prioridades.length],
                    fecha_programada: fechaProg,
                    descripcion_inicial: `Mantenimiento Preventivo Tipo B - Generador #${i}`,
                    creado_por: usuario.id_usuario
                }
            });
            console.log(`  ✅ Orden GENB ${i}/10 creada`);
        }
        ordenesCreadas += 10;
    }

    // Crear 10 órdenes Tipo A Bombas (si no hay equipo bomba, usar generador para no bloquear)
    const equipoParaBomba = equipoBomba || equipoGenerador;
    if (tipoBomA && equipoParaBomba) {
        console.log('\n📋 Creando 10 órdenes Tipo A Bombas...');
        for (let i = 1; i <= 10; i++) {
            const fechaProg = new Date();
            fechaProg.setDate(fechaProg.getDate() + Math.floor(Math.random() * 30));

            await prisma.ordenes_servicio.create({
                data: {
                    numero_orden: generarNumeroOrden('BOMA', ordenesCreadas + i),
                    id_cliente: cliente.id_cliente,
                    id_equipo: equipoParaBomba.id_equipo,
                    id_tecnico_asignado: tecnico.id_empleado,
                    id_tipo_servicio: tipoBomA.id_tipo_servicio,
                    id_estado_actual: estadoParaUsar.id_estado,
                    prioridad: prioridades[i % prioridades.length],
                    fecha_programada: fechaProg,
                    descripcion_inicial: `Mantenimiento Preventivo Tipo A - Bomba #${i}`,
                    creado_por: usuario.id_usuario
                }
            });
            console.log(`  ✅ Orden BOMA ${i}/10 creada`);
        }
        ordenesCreadas += 10;
    }

    console.log(`\n🎉 COMPLETADO: ${ordenesCreadas} órdenes creadas exitosamente`);

    // Resumen final
    const resumen = await prisma.ordenes_servicio.groupBy({
        by: ['id_tipo_servicio'],
        _count: true
    });
    console.log('\n📊 Resumen de órdenes por tipo de servicio:');
    for (const r of resumen) {
        const tipo = await prisma.tipos_servicio.findUnique({
            where: { id_tipo_servicio: r.id_tipo_servicio }
        });
        console.log(`  ${tipo?.codigo_tipo || 'N/A'}: ${r._count} órdenes`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
