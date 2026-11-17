const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('🔍 INVESTIGACIÓN DE ÓRDENES Y TÉCNICO\n');
    
    // 1. Usuario admin
    const usuario = await prisma.usuarios.findFirst({
        where: { email: 'admin@mekanos.com' }
    });
    console.log('Usuario admin@mekanos.com:', usuario ? `ID ${usuario.id_usuario}, id_persona: ${usuario.id_persona}` : 'NO ENCONTRADO');
    
    // 2. Empleado asociado
    const empleado = await prisma.empleados.findFirst({
        where: { id_persona: usuario?.id_persona }
    });
    console.log('Empleado (id_persona=1):', empleado ? `ID ${empleado.id_empleado}` : 'NO ENCONTRADO');
    
    // 3. Contar órdenes por técnico
    const ordenesT6 = await prisma.ordenes_servicio.count({
        where: { id_tecnico_asignado: 6 }
    });
    const ordenesT1 = await prisma.ordenes_servicio.count({
        where: { id_tecnico_asignado: 1 }
    });
    console.log('\nÓrdenes asignadas a técnico ID 6:', ordenesT6);
    console.log('Órdenes asignadas a técnico ID 1:', ordenesT1);
    
    // 4. Ver técnicos con órdenes
    const tecnicos = await prisma.ordenes_servicio.groupBy({
        by: ['id_tecnico_asignado'],
        _count: true
    });
    console.log('\nDesglose por técnico asignado:');
    for (const t of tecnicos) {
        console.log(`  Técnico ${t.id_tecnico_asignado}: ${t._count} órdenes`);
    }
    
    // 5. Verificar qué endpoint usa el backend para sync
    console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
    console.log('   El login devuelve id_usuario (probablemente 1)');
    console.log('   Pero las órdenes están asignadas a id_empleado (6)');
    console.log('   El endpoint sync usa el ID que le pasa la app');
}

main().catch(console.error).finally(() => prisma.$disconnect());
