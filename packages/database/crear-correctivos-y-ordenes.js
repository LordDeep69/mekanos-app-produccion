/**
 * Script para crear tipos de servicio CORRECTIVO específicos
 * y generar 10 órdenes de prueba para correctivo
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('\n🔧 CREACIÓN DE TIPOS CORRECTIVO Y 10 ÓRDENES');
    console.log('═'.repeat(60));

    // 1. Obtener usuario admin
    const usuario = await prisma.usuarios.findFirst({
        where: { email: 'admin@mekanos.com' }
    });
    if (!usuario) throw new Error('Usuario admin no encontrado');
    console.log(`✅ Usuario: ${usuario.email} (ID ${usuario.id_usuario})`);

    // 2. Obtener tipos de equipo
    const tipoGen = await prisma.tipos_equipo.findFirst({
        where: { codigo_tipo: 'GEN' }
    });
    const tipoBom = await prisma.tipos_equipo.findFirst({
        where: { codigo_tipo: 'BOM' }
    });

    console.log(`✅ Tipo Generador: ID ${tipoGen?.id_tipo_equipo || 'NO ENCONTRADO'}`);
    console.log(`✅ Tipo Bomba: ID ${tipoBom?.id_tipo_equipo || 'NO ENCONTRADO'}`);

    // 3. Verificar/Crear GEN_CORR
    let genCorr = await prisma.tipos_servicio.findFirst({
        where: { codigo_tipo: 'GEN_CORR' }
    });

    if (!genCorr) {
        console.log('\n📋 Creando tipo de servicio GEN_CORR...');
        genCorr = await prisma.tipos_servicio.create({
            data: {
                codigo_tipo: 'GEN_CORR',
                nombre_tipo: 'Mantenimiento Correctivo - Generador',
                descripcion: 'Reparación y corrección de fallas en generadores eléctricos',
                categoria: 'CORRECTIVO',
                id_tipo_equipo: tipoGen?.id_tipo_equipo || null,
                duracion_estimada_horas: 8,
                activo: true,
                creado_por: usuario.id_usuario
            }
        });
        console.log(`✅ GEN_CORR creado: ID ${genCorr.id_tipo_servicio}`);
    } else {
        console.log(`✅ GEN_CORR ya existe: ID ${genCorr.id_tipo_servicio}`);
    }

    // 4. Verificar/Crear BOM_CORR
    let bomCorr = await prisma.tipos_servicio.findFirst({
        where: { codigo_tipo: 'BOM_CORR' }
    });

    if (!bomCorr) {
        console.log('\n📋 Creando tipo de servicio BOM_CORR...');
        bomCorr = await prisma.tipos_servicio.create({
            data: {
                codigo_tipo: 'BOM_CORR',
                nombre_tipo: 'Mantenimiento Correctivo - Bomba',
                descripcion: 'Reparación y corrección de fallas en bombas hidráulicas',
                categoria: 'CORRECTIVO',
                id_tipo_equipo: tipoBom?.id_tipo_equipo || null,
                duracion_estimada_horas: 6,
                activo: true,
                creado_por: usuario.id_usuario
            }
        });
        console.log(`✅ BOM_CORR creado: ID ${bomCorr.id_tipo_servicio}`);
    } else {
        console.log(`✅ BOM_CORR ya existe: ID ${bomCorr.id_tipo_servicio}`);
    }

    // 5. Obtener empleado técnico
    const empleado = await prisma.empleados.findFirst({
        where: { id_persona: usuario.id_persona }
    });
    if (!empleado) throw new Error('Empleado no encontrado');
    console.log(`✅ Técnico: ID ${empleado.id_empleado}`);

    // 6. Obtener cliente
    const cliente = await prisma.clientes.findFirst();
    if (!cliente) throw new Error('Cliente no encontrado');
    console.log(`✅ Cliente: ID ${cliente.id_cliente}`);

    // 7. Obtener equipos
    const equipoGen = await prisma.equipos.findFirst({
        where: { id_tipo_equipo: tipoGen?.id_tipo_equipo }
    });
    const equipoBom = await prisma.equipos.findFirst({
        where: { id_tipo_equipo: tipoBom?.id_tipo_equipo }
    });

    console.log(`✅ Equipo Generador: ID ${equipoGen?.id_equipo || 'NO ENCONTRADO'}`);
    console.log(`✅ Equipo Bomba: ID ${equipoBom?.id_equipo || 'NO ENCONTRADO'}`);

    // 8. Obtener estado
    const estadoAsignada = await prisma.estados_orden.findFirst({
        where: { codigo_estado: 'ASIGNADA' }
    });
    if (!estadoAsignada) throw new Error('Estado ASIGNADA no encontrado');
    console.log(`✅ Estado: ${estadoAsignada.codigo_estado} (ID ${estadoAsignada.id_estado})`);

    // 9. Crear 10 órdenes de correctivo
    console.log('\n📋 Creando 10 órdenes de CORRECTIVO...');

    const timestamp = Date.now().toString().slice(-6);
    const prioridades = ['NORMAL', 'ALTA', 'URGENTE'];
    const descripciones = [
        'Falla en sistema de arranque',
        'Vibración anormal detectada',
        'Pérdida de potencia',
        'Sobrecalentamiento',
        'Fuga de aceite',
        'Ruido inusual en operación',
        'Falla en sistema de control',
        'Problema eléctrico',
        'Desgaste prematuro de componentes',
        'Falla intermitente'
    ];

    let creadas = 0;

    // 5 órdenes GEN_CORR
    for (let i = 1; i <= 5; i++) {
        const fechaProg = new Date();
        fechaProg.setDate(fechaProg.getDate() + Math.floor(Math.random() * 7)); // Correctivos son más urgentes

        const numeroOrden = `GCORR-${timestamp}-${String(i).padStart(3, '0')}`;

        try {
            await prisma.ordenes_servicio.create({
                data: {
                    numero_orden: numeroOrden,
                    id_cliente: cliente.id_cliente,
                    id_equipo: equipoGen?.id_equipo || equipoBom?.id_equipo,
                    id_tecnico_asignado: empleado.id_empleado,
                    id_tipo_servicio: genCorr.id_tipo_servicio,
                    id_estado_actual: estadoAsignada.id_estado,
                    prioridad: prioridades[i % prioridades.length],
                    fecha_programada: fechaProg,
                    descripcion_inicial: `CORRECTIVO GENERADOR: ${descripciones[i - 1]}`,
                    creado_por: usuario.id_usuario
                }
            });
            console.log(`  ✅ ${numeroOrden} creada`);
            creadas++;
        } catch (err) {
            console.log(`  ❌ Error en ${numeroOrden}: ${err.message}`);
        }
    }

    // 5 órdenes BOM_CORR
    for (let i = 6; i <= 10; i++) {
        const fechaProg = new Date();
        fechaProg.setDate(fechaProg.getDate() + Math.floor(Math.random() * 7));

        const numeroOrden = `BCORR-${timestamp}-${String(i).padStart(3, '0')}`;

        try {
            await prisma.ordenes_servicio.create({
                data: {
                    numero_orden: numeroOrden,
                    id_cliente: cliente.id_cliente,
                    id_equipo: equipoBom?.id_equipo || equipoGen?.id_equipo,
                    id_tecnico_asignado: empleado.id_empleado,
                    id_tipo_servicio: bomCorr.id_tipo_servicio,
                    id_estado_actual: estadoAsignada.id_estado,
                    prioridad: prioridades[i % prioridades.length],
                    fecha_programada: fechaProg,
                    descripcion_inicial: `CORRECTIVO BOMBA: ${descripciones[i - 1]}`,
                    creado_por: usuario.id_usuario
                }
            });
            console.log(`  ✅ ${numeroOrden} creada`);
            creadas++;
        } catch (err) {
            console.log(`  ❌ Error en ${numeroOrden}: ${err.message}`);
        }
    }

    // 10. Resumen final
    console.log('\n' + '═'.repeat(60));
    console.log('📊 RESUMEN FINAL:');
    console.log(`  ✅ Tipos correctivo creados: GEN_CORR (ID ${genCorr.id_tipo_servicio}), BOM_CORR (ID ${bomCorr.id_tipo_servicio})`);
    console.log(`  ✅ Órdenes correctivo creadas: ${creadas}/10`);

    // Contar total de órdenes
    const totalOrdenes = await prisma.ordenes_servicio.count();
    console.log(`\n🎉 TOTAL DE ÓRDENES EN BD: ${totalOrdenes}`);

    // Desglose por tipo
    const porTipo = await prisma.ordenes_servicio.groupBy({
        by: ['id_tipo_servicio'],
        _count: true
    });

    console.log('\n📊 Desglose por tipo de servicio:');
    for (const grupo of porTipo) {
        const tipo = await prisma.tipos_servicio.findUnique({
            where: { id_tipo_servicio: grupo.id_tipo_servicio }
        });
        if (tipo) {
            console.log(`   ${tipo.codigo_tipo}: ${grupo._count} órdenes`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
