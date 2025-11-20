/**
 * Query empleados disponibles en Supabase
 * Determinar ID válido para test asignarTecnico
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres.jrwuguaouucbgqeypuwb:Mekanos2024!@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
    }
  }
});

async function queryEmpleados() {
  console.log('\n🔍 CONSULTANDO EMPLEADOS EN SUPABASE\n');

  try {
    const empleados = await prisma.empleados.findMany({
      select: {
        id_empleado: true,
        id_persona: true,
        cargo: true,
        empleado_activo: true,
        persona: {
          select: {
            primer_nombre: true,
            primer_apellido: true,
            nombre_completo: true
          }
        }
      },
      where: {
        empleado_activo: true
      },
      take: 10
    });

    console.log(`📊 Total empleados activos: ${empleados.length}\n`);

    if (empleados.length > 0) {
      console.log('✅ Empleados disponibles:');
      empleados.forEach(emp => {
        console.log(`   - ID: ${emp.id_empleado} | ${emp.persona?.nombre_completo || 'N/A'} | Cargo: ${emp.cargo || 'N/A'}`);
      });

      console.log(`\n💡 Usar ID ${empleados[0].id_empleado} en test asignarTecnico\n`);
    } else {
      console.log('⚠️  NO hay empleados en la base de datos');
      console.log('   Necesitas ejecutar insert-empleado-seed.js primero\n');
    }

  } catch (error) {
    console.error('❌ Error consultando empleados:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

queryEmpleados();
