/**
 * Análisis de datos existentes para plan estratégico
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== ANÁLISIS DE DATOS PARA VALIDACIÓN FLUJO COMPLETO ===\n');

    // 1. Tipos de servicio
    const tiposServicio = await prisma.tipos_servicio.findMany({
        select: {
            id_tipo_servicio: true,
            codigo_tipo: true,
            nombre_tipo: true,
            categoria: true,
            id_tipo_equipo: true
        }
    });
    console.log('📋 TIPOS DE SERVICIO:');
    console.table(tiposServicio);

    // 2. Tipos de equipo
    const tiposEquipo = await prisma.tipos_equipo.findMany({
        select: {
            id_tipo_equipo: true,
            codigo_tipo: true,
            nombre_tipo: true
        }
    });
    console.log('\n🔧 TIPOS DE EQUIPO:');
    console.table(tiposEquipo);

    // 3. Clientes con datos completos (mediante persona)
    const clientes = await prisma.clientes.findMany({
        take: 5,
        include: {
            persona: true
        }
    });
    console.log('\n👥 CLIENTES (primeros 5):');
    clientes.forEach(c => {
        console.log(`  ID: ${c.id_cliente}, Código: ${c.codigo_cliente}, Tipo: ${c.tipo_cliente}`);
        if (c.persona) {
            console.log(`    - Nombre: ${c.persona.nombre_completo || c.persona.razon_social}`);
            console.log(`    - Email: ${c.persona.email_principal}`);
            console.log(`    - Dirección: ${c.persona.direccion_principal}, ${c.persona.ciudad}`);
        }
    });

    // 4. Equipos existentes (Generadores y Bombas)
    const equipos = await prisma.equipos.findMany({
        take: 10,
        where: {
            id_tipo_equipo: { in: [1, 2, 3, 5] } // Generadores y Bombas
        },
        include: {
            tipo_equipo: true,
            cliente: { include: { persona: true } },
            equipos_generador: true,
            equipos_bomba: true
        }
    });
    console.log('\n⚙️ EQUIPOS (Generadores y Bombas):');
    equipos.forEach(e => {
        const clienteNombre = e.cliente?.persona?.nombre_completo || e.cliente?.persona?.razon_social || 'Sin cliente';
        const marca = e.equipos_generador?.[0]?.marca || e.equipos_bomba?.[0]?.marca || 'N/A';
        const modelo = e.equipos_generador?.[0]?.modelo || e.equipos_bomba?.[0]?.modelo || 'N/A';
        console.log(`  [${e.id_equipo}] ${e.codigo_equipo} - ${e.nombre_equipo}`);
        console.log(`      Tipo: ${e.tipo_equipo?.nombre_tipo || 'N/A'}, Marca: ${marca}, Modelo: ${modelo}`);
        console.log(`      Serie: ${e.numero_serie_equipo}, Cliente: ${clienteNombre}`);
    });

    // 5. Técnicos (usuarios con rol técnico)
    const tecnicos = await prisma.usuarios.findMany({
        where: {
            rol: { in: ['TECNICO', 'ADMIN'] }
        },
        select: {
            id_usuario: true,
            nombre_completo: true,
            email: true,
            rol: true,
            activo: true
        }
    });
    console.log('\n👷 TÉCNICOS DISPONIBLES:');
    console.table(tecnicos);

    // 6. Estados de orden
    const estados = await prisma.estados_orden.findMany({
        select: {
            id_estado: true,
            codigo: true,
            nombre: true,
            es_estado_final: true
        }
    });
    console.log('\n📊 ESTADOS DE ORDEN:');
    console.table(estados);

    // 7. Catálogo de actividades por tipo de servicio
    const actividadesTipoB = await prisma.catalogo_actividades.count({
        where: { id_tipo_servicio: 4 } // GEN_PREV_B
    });
    const actividadesTipoABomba = await prisma.catalogo_actividades.count({
        where: { id_tipo_servicio: 5 } // BOM_PREV_A
    });
    const actividadesCorrectivo = await prisma.catalogo_actividades.count({
        where: { id_tipo_servicio: 7 } // Correctivo (si existe)
    });

    console.log('\n📝 ACTIVIDADES EN CATÁLOGO:');
    console.log(`  - Tipo B Generador (id=4): ${actividadesTipoB} actividades`);
    console.log(`  - Tipo A Bomba (id=5): ${actividadesTipoABomba} actividades`);
    console.log(`  - Correctivo (id=7): ${actividadesCorrectivo} actividades`);

    // 8. Verificar si existe actividad "Checklist de Insumos" en Tipo B
    const actividadInsumos = await prisma.catalogo_actividades.findFirst({
        where: {
            id_tipo_servicio: 4,
            nombre_actividad: { contains: 'Insumos' }
        }
    });
    console.log('\n🔍 ACTIVIDAD INSUMOS EN TIPO B:', actividadInsumos ? '✅ EXISTE' : '❌ NO EXISTE');

    // 9. Conteo de órdenes actuales
    const ordenesCount = await prisma.ordenes_servicio.count();
    console.log('\n📦 ÓRDENES ACTUALES:', ordenesCount);

    await prisma.$disconnect();
}

main().catch(console.error);
