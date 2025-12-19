/**
 * Script de diagnóstico para órdenes multi-equipo
 * Ejecutar: npx ts-node scripts/diagnostico-db.ts
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🔍 DIAGNÓSTICO BASE DE DATOS MEKANOS\n');
  console.log('='.repeat(60));

  // 1. Tipos de servicio
  console.log('\n📋 TIPOS DE SERVICIO ACTIVOS:');
  const tipos: any[] = await prisma.tipos_servicio.findMany({
    where: { activo: true },
    orderBy: { id_tipo_servicio: 'asc' }
  });
  tipos.forEach((t: any) => {
    console.log(`  ID: ${t.id_tipo_servicio} | ${t.codigo_tipo.padEnd(12)} | ${t.nombre_tipo}`);
  });

  // 2. Clientes con equipos
  console.log('\n🏢 CLIENTES CON EQUIPOS:');
  const clientes: any[] = await prisma.clientes.findMany({
    where: { activo: true },
    include: {
      equipos: {
        where: { activo: true },
        select: { id_equipo: true, tipo_equipo: { select: { codigo_tipo: true } } }
      }
    },
    take: 5
  });
  clientes.forEach((c: any) => {
    const gens = c.equipos.filter((e: any) => e.tipo_equipo?.codigo_tipo === 'GENERADOR').length;
    const bombs = c.equipos.filter((e: any) => e.tipo_equipo?.codigo_tipo === 'BOMBA').length;
    console.log(`  ID: ${c.id_cliente} | ${c.nombre_comercial} | Generadores: ${gens}, Bombas: ${bombs}`);
  });

  // 3. Equipos por tipo
  console.log('\n⚙️ GENERADORES (primeros 10):');
  const generadores: any[] = await prisma.equipos.findMany({
    where: { 
      activo: true, 
      tipo_equipo: { codigo_tipo: 'GENERADOR' } 
    },
    include: { 
      tipo_equipo: { select: { codigo_tipo: true } },
      cliente: { select: { nombre_comercial: true, id_cliente: true } }
    },
    take: 10,
    orderBy: { id_equipo: 'asc' }
  });
  generadores.forEach((g: any) => {
    console.log(`  ID: ${g.id_equipo} | ${g.codigo_equipo || 'SIN-CODIGO'} | Cliente ID: ${g.id_cliente}`);
  });

  console.log('\n💧 BOMBAS (primeras 10):');
  const bombas: any[] = await prisma.equipos.findMany({
    where: { 
      activo: true, 
      tipo_equipo: { codigo_tipo: 'BOMBA' } 
    },
    include: { 
      tipo_equipo: { select: { codigo_tipo: true } },
      cliente: { select: { nombre_comercial: true, id_cliente: true } }
    },
    take: 10,
    orderBy: { id_equipo: 'asc' }
  });
  bombas.forEach((b: any) => {
    console.log(`  ID: ${b.id_equipo} | ${b.codigo_equipo || 'SIN-CODIGO'} | Cliente ID: ${b.id_cliente}`);
  });

  // 4. Empleado ID 6
  console.log('\n👷 EMPLEADO ID 6:');
  const emp = await prisma.empleados.findUnique({
    where: { id_empleado: 6 },
    include: { persona: { select: { nombres: true, apellidos: true } } }
  });
  if (emp) {
    console.log(`  ID: ${emp.id_empleado} | ${emp.persona?.nombres} ${emp.persona?.apellidos} | id_persona: ${emp.id_persona}`);
  } else {
    console.log('  ⚠️ EMPLEADO NO ENCONTRADO');
  }

  // 5. Estados de orden
  console.log('\n📊 ESTADOS DE ORDEN:');
  const estados: any[] = await prisma.estados_orden.findMany({
    orderBy: { id_estado: 'asc' }
  });
  estados.forEach((e: any) => {
    console.log(`  ID: ${e.id_estado} | ${e.codigo_estado?.padEnd(15)} | ${e.nombre_estado}`);
  });

  // 6. Actividades por tipo de servicio
  console.log('\n📝 ACTIVIDADES POR TIPO DE SERVICIO:');
  for (const tipo of tipos) {
    const count = await prisma.catalogo_actividades.count({
      where: { 
        id_tipo_servicio: tipo.id_tipo_servicio,
        activo: true 
      }
    });
    console.log(`  ${tipo.codigo_tipo.padEnd(12)} → ${count} actividades`);
  }

  // 7. Parametros medicion por tipo
  console.log('\n📏 PARÁMETROS DE MEDICIÓN POR TIPO:');
  for (const tipo of tipos) {
    const count = await prisma.parametros_medicion.count({
      where: { 
        id_tipo_servicio: tipo.id_tipo_servicio,
        activo: true 
      }
    });
    if (count > 0) {
      console.log(`  ${tipo.codigo_tipo.padEnd(12)} → ${count} parámetros`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnóstico completado');
  
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
