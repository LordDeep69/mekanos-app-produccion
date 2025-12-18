// Diagnóstico completo del problema de sync
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('=== DIAGNÓSTICO SYNC ===\n');

    // 1. ¿Qué tecnicoId envía la app?
    console.log('1️⃣ USUARIO ADMIN (id_usuario=1):');
    const admin = await prisma.usuarios.findUnique({
        where: { id_usuario: 1 },
        select: { id_usuario: true, email: true }
    });
    console.log(admin);

    // 2. ¿Existe empleado id=1?
    console.log('\n2️⃣ EMPLEADO id_empleado=1:');
    const empleado1 = await prisma.empleados.findUnique({
        where: { id_empleado: 1 },
        select: { id_empleado: true, cargo: true, id_persona: true, es_tecnico: true }
    });
    console.log(empleado1 || 'NO EXISTE');

    // 3. ¿Cuál es el estado 2?
    console.log('\n3️⃣ ESTADO id_estado=2:');
    const estado2 = await prisma.estados_orden.findUnique({
        where: { id_estado: 2 },
        select: { id_estado: true, codigo_estado: true, nombre_estado: true, es_estado_final: true }
    });
    console.log(estado2);

    // 4. Simular la query del endpoint sync
    console.log('\n4️⃣ SIMULANDO QUERY SYNC (tecnicoId=1):');
    const ordenesTecnico1 = await prisma.ordenes_servicio.findMany({
        where: {
            id_tecnico_asignado: 1,
            estado: {
                es_estado_final: false,
            },
        },
        select: {
            id_orden_servicio: true,
            numero_orden: true,
            id_estado_actual: true,
        },
        take: 10
    });
    console.log(`Total órdenes para técnico 1: ${ordenesTecnico1.length}`);
    console.log(ordenesTecnico1);

    // 5. ¿La orden 160 está incluida?
    console.log('\n5️⃣ ¿ORDEN 160 ESTÁ EN LA LISTA?');
    const orden160Incluida = ordenesTecnico1.find(o => o.id_orden_servicio === 160);
    console.log(orden160Incluida ? '✅ SÍ, INCLUIDA' : '❌ NO, NO ESTÁ INCLUIDA');

    // 6. Si no está, ¿por qué?
    if (!orden160Incluida) {
        console.log('\n6️⃣ VERIFICANDO RAZÓN:');
        const orden160 = await prisma.ordenes_servicio.findUnique({
            where: { id_orden_servicio: 160 },
            include: { estado: true }
        });
        console.log('Orden 160 estado:', orden160?.estado);
        console.log('es_estado_final:', orden160?.estado?.es_estado_final);
    }

    // 7. Ver todas las órdenes con técnico 1
    console.log('\n7️⃣ TODAS LAS ÓRDENES CON id_tecnico_asignado=1:');
    const todasOrdenesTec1 = await prisma.ordenes_servicio.count({
        where: { id_tecnico_asignado: 1 }
    });
    console.log('Total:', todasOrdenesTec1);
}

main()
    .catch(e => console.error('Error:', e.message))
    .finally(() => prisma.$disconnect());
