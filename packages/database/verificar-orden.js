// Verificar orden 160 y endpoint sync
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== VERIFICACIÓN FORENSE ===\n');

    // 1. Verificar orden 160
    console.log('1️⃣ VERIFICANDO ORDEN 160 EN BD:');
    const orden160 = await prisma.ordenes_servicio.findUnique({
        where: { id_orden_servicio: 160 },
        select: {
            id_orden_servicio: true,
            numero_orden: true,
            id_tipo_servicio: true,
            id_equipo: true,
            id_cliente: true,
            id_tecnico_asignado: true,
            id_estado_actual: true,
            prioridad: true,
            descripcion_inicial: true,
            fecha_creacion: true,
        }
    });

    if (orden160) {
        console.log('✅ Orden 160 EXISTE:');
        console.log(JSON.stringify(orden160, null, 2));
    } else {
        console.log('❌ Orden 160 NO EXISTE');
    }

    // 2. Verificar qué técnico está asignado
    console.log('\n2️⃣ VERIFICANDO TÉCNICO ASIGNADO:');
    if (orden160?.id_tecnico_asignado) {
        const tecnico = await prisma.empleados.findUnique({
            where: { id_empleado: orden160.id_tecnico_asignado },
            select: { id_empleado: true, id_usuario: true }
        });
        console.log('Técnico:', tecnico);
    }

    // 3. Verificar el usuario admin
    console.log('\n3️⃣ VERIFICANDO USUARIO ADMIN:');
    const admin = await prisma.usuarios.findUnique({
        where: { id_usuario: 1 },
        select: { id_usuario: true, email: true }
    });
    console.log('Usuario admin:', admin);

    // 4. Verificar si hay empleado para usuario 1
    console.log('\n4️⃣ BUSCANDO EMPLEADO PARA USUARIO 1:');
    const empleado = await prisma.empleados.findFirst({
        where: { id_usuario: 1 },
        select: { id_empleado: true, id_usuario: true, cargo: true }
    });
    console.log('Empleado:', empleado);

    // 5. Contar órdenes por técnico
    console.log('\n5️⃣ ÓRDENES POR TÉCNICO ASIGNADO:');
    const countByTecnico = await prisma.ordenes_servicio.groupBy({
        by: ['id_tecnico_asignado'],
        _count: true,
        orderBy: { _count: { id_orden_servicio: 'desc' } },
        take: 5
    });
    console.log('Top 5 técnicos:', countByTecnico);

    // 6. Verificar el endpoint sync - qué técnico usa
    console.log('\n6️⃣ ÓRDENES ASIGNADAS A TÉCNICO 1:');
    const ordenesTec1 = await prisma.ordenes_servicio.count({
        where: { id_tecnico_asignado: 1 }
    });
    console.log('Total órdenes técnico 1:', ordenesTec1);

    // 7. Verificar órdenes asignadas al empleado del usuario 1
    if (empleado) {
        console.log('\n7️⃣ ÓRDENES ASIGNADAS A EMPLEADO', empleado.id_empleado, ':');
        const ordenesEmpleado = await prisma.ordenes_servicio.count({
            where: { id_tecnico_asignado: empleado.id_empleado }
        });
        console.log('Total órdenes:', ordenesEmpleado);
    }
}

main()
    .catch(e => console.error('❌ Error:', e.message))
    .finally(() => prisma.$disconnect());
