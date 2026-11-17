/**
 * INSERT SEED EMPLEADO TÉCNICO
 * Crear empleado ID 1 para tests E2E FASE 3
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres.jrwuguaouucbgqeypuwb:Mekanos2024!@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1'
    }
  }
});

async function insertEmpleadoSeed() {
  console.log('\n🔧 INSERTANDO EMPLEADO TÉCNICO SEED PARA FASE 3 E2E\n');

  try {
    // 1. Insertar persona
    console.log('📌 Insertando persona ID 2 (Juan Pérez Técnico)...');
    
    await prisma.$executeRaw`
      INSERT INTO personas (
        id_persona, tipo_persona, tipo_identificacion, numero_identificacion,
        primer_nombre, primer_apellido, celular, email_principal,
        activo, fecha_creacion
      ) VALUES (
        2, 'NATURAL', 'CC', '1234567890',
        'Juan', 'Pérez', '3001234567', 'juan.perez@mekanos.com',
        true, NOW()
      )
      ON CONFLICT (id_persona) DO NOTHING
    `;
    
    const personaExiste = await prisma.personas.findUnique({ where: { id_persona: 2 } });
    if (personaExiste) {
      console.log('   ✅ Persona ID 2 insertada (o ya existía)');
    }

    // 2. Insertar empleado
    console.log('📌 Insertando empleado ID 1 (Técnico de Campo)...');
    
    await prisma.$executeRaw`
      INSERT INTO empleados (
        id_empleado, id_persona, cargo, fecha_ingreso,
        contacto_emergencia, telefono_emergencia,
        es_tecnico, empleado_activo, creado_por, fecha_creacion
      ) VALUES (
        1, 2, 'TECNICO_SENIOR', '2024-01-01',
        'María Pérez', '3009876543',
        true, true, 1, NOW()
      )
      ON CONFLICT (id_empleado) DO NOTHING
    `;
    
    const empleadoExiste = await prisma.empleados.findUnique({ where: { id_empleado: 1 } });
    if (empleadoExiste) {
      console.log('   ✅ Empleado ID 1 insertado (o ya existía)');
      console.log(`   - Código: ${empleadoExiste.codigo_empleado}`);
      console.log(`   - Cargo: ${empleadoExiste.cargo}`);
      console.log(`   - Técnico: ${empleadoExiste.es_tecnico ? 'Sí' : 'No'}`);
    }

    // 3. Validar
    const empleadoCompleto = await prisma.empleados.findUnique({
      where: { id_empleado: 1 },
      include: {
        persona: {
          select: {
            nombre_completo: true,
            numero_identificacion: true
          }
        }
      }
    });

    if (empleadoCompleto) {
      console.log('\n✅ Validación final:');
      console.log(`   - ID Empleado: ${empleadoCompleto.id_empleado}`);
      console.log(`   - Nombre: ${empleadoCompleto.persona?.nombre_completo || 'N/A'}`);
      console.log(`   - Documento: ${empleadoCompleto.persona?.numero_identificacion || 'N/A'}`);
      console.log(`   - Es Técnico: ${empleadoCompleto.es_tecnico ? '✅ Sí' : '❌ No'}`);
      console.log(`   - Activo: ${empleadoCompleto.empleado_activo ? '✅ Sí' : '❌ No'}`);
      console.log('\n🎉 EMPLEADO SEED INSERTADO - Tests E2E pueden usar tecnicoId: 1\n');
    } else {
      console.log('\n⚠️  No se pudo validar el empleado insertado\n');
    }

  } catch (error) {
    console.error('\n❌ Error insertando empleado:', error.message);
    console.error('   Detalle:', error);
  } finally {
    await prisma.$disconnect();
  }
}

insertEmpleadoSeed();
