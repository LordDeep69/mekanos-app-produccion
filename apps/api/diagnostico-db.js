/**
 * Script de diagnóstico para órdenes multi-equipo
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 DIAGNÓSTICO BASE DE DATOS MEKANOS\n');

  console.log('⚙️ GENERADORES:');
  const gens = await prisma.equipos.findMany({ 
    where: { activo: true, tipos_equipo: { codigo_tipo: 'GENERADOR' } }, 
    take: 15, 
    select: { id_equipo: true, codigo_equipo: true, id_cliente: true },
    orderBy: { id_equipo: 'asc' }
  });
  gens.forEach(g => console.log('  ID:', g.id_equipo, '| Codigo:', g.codigo_equipo, '| Cliente:', g.id_cliente));
  
  console.log('\n💧 BOMBAS:');
  const bombs = await prisma.equipos.findMany({ 
    where: { activo: true, tipos_equipo: { codigo_tipo: 'BOMBA' } }, 
    take: 15, 
    select: { id_equipo: true, codigo_equipo: true, id_cliente: true },
    orderBy: { id_equipo: 'asc' }
  });
  bombs.forEach(b => console.log('  ID:', b.id_equipo, '| Codigo:', b.codigo_equipo, '| Cliente:', b.id_cliente));
  
  console.log('\n👷 EMPLEADO 6:');
  const emp = await prisma.empleados.findUnique({ 
    where: { id_empleado: 6 }, 
    select: { id_empleado: true, id_persona: true } 
  });
  console.log('  ', emp);
  
  console.log('\n📊 ESTADOS:');
  const estados = await prisma.estados_orden.findMany({ orderBy: { id_estado: 'asc' } });
  estados.forEach(e => console.log('  ID:', e.id_estado, '|', e.codigo_estado, '|', e.nombre_estado));
  
  console.log('\n📝 ACTIVIDADES POR TIPO:');
  for (const id of [3, 4, 5, 6]) {
    const count = await prisma.catalogo_actividades.count({ 
      where: { id_tipo_servicio: id, activo: true } 
    });
    console.log('  Tipo', id, '->', count, 'actividades');
  }

  console.log('\n📏 PARÁMETROS MEDICIÓN POR TIPO:');
  for (const id of [3, 4, 5, 6]) {
    const count = await prisma.parametros_medicion.count({ 
      where: { id_tipo_servicio: id, activo: true } 
    });
    console.log('  Tipo', id, '->', count, 'parámetros');
  }
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
