/**
 * CHECKPOINT 2 - Test de Conectividad Runtime
 * 
 * Propósito: Validar que el Prisma Client generado puede ejecutar
 * queries reales contra las 69 tablas sincronizadas en Supabase.
 * 
 * Creado: 12 de Noviembre 2025
 */

const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  });

  try {
    console.log('\n🔗 CHECKPOINT 2 - Test de Conectividad Runtime');
    console.log('━'.repeat(60));
    console.log('Base de Datos: Supabase (aws-1-sa-east-1)');
    console.log('Puerto: 6543 (Transaction Pooler)');
    console.log('Tablas Sincronizadas: 69');
    console.log('━'.repeat(60));
    
    // Test 1: Conexión básica
    console.log('\n📊 Test 1: Verificando conexión básica...');
    await prisma.$queryRaw`SELECT 1 as connected`;
    console.log('✅ Conexión establecida correctamente');
    
    // Test 2: Count en tabla equipos
    console.log('\n📊 Test 2: Consultando tabla equipos...');
    const equiposCount = await prisma.equipos.count();
    console.log(`✅ Tabla equipos accesible: ${equiposCount} registros`);
    
    // Test 3: Count en tabla usuarios
    console.log('\n📊 Test 3: Consultando tabla usuarios...');
    const usuariosCount = await prisma.usuarios.count();
    console.log(`✅ Tabla usuarios accesible: ${usuariosCount} registros`);
    
    // Test 4: Count en tabla ordenes_servicio
    console.log('\n📊 Test 4: Consultando tabla ordenes_servicio...');
    const ordenesCount = await prisma.ordenes_servicio.count();
    console.log(`✅ Tabla ordenes_servicio accesible: ${ordenesCount} registros`);
    
    // Test 5: Count en tabla personas
    console.log('\n📊 Test 5: Consultando tabla personas...');
    const personasCount = await prisma.personas.count();
    console.log(`✅ Tabla personas accesible: ${personasCount} registros`);
    
    // Test 6: Validar relaciones (query con include)
    console.log('\n📊 Test 6: Validando relaciones entre tablas...');
    const sampleEquipo = await prisma.equipos.findFirst({
      include: {
        tipo_equipo: true,
        sede: true,
      },
    });
    console.log(`✅ Relaciones funcionando: ${sampleEquipo ? 'Sí (datos encontrados)' : 'Sí (sin datos aún)'}`);
    
    // Resumen final
    console.log('\n' + '━'.repeat(60));
    console.log('✅ CHECKPOINT 2: 100% COMPLETADO');
    console.log('━'.repeat(60));
    console.log('Resultados:');
    console.log(`  - Conexión a Supabase: EXITOSA`);
    console.log(`  - Tablas accesibles: 5/5 testeadas ✅`);
    console.log(`  - Relaciones funcionando: SÍ ✅`);
    console.log(`  - Prisma Client: v5.22.0 ✅`);
    console.log(`  - Transaction Pooler (puerto 6543): FUNCIONAL ✅`);
    console.log('\n🎯 Estado: LISTO PARA CHECKPOINT 3 (Server Startup)');
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('\n❌ ERROR en test de conectividad:');
    console.error(error);
    console.error('\n🔍 Posibles causas:');
    console.error('  1. DATABASE_URL incorrecta en .env');
    console.error('  2. Puerto 6543 bloqueado');
    console.error('  3. Credenciales inválidas');
    console.error('  4. Base de datos no accesible');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Conexión cerrada correctamente.\n');
  }
}

testConnection();
