/**
 * Análisis arquitectónico profundo de multi-equipos
 * Entender antes de actuar
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('🧠 ANÁLISIS ARQUITECTÓNICO PROFUNDO - MULTI-EQUIPOS');
  console.log('='.repeat(80));

  // =========================================================================
  // 1. TIPOS DE SERVICIO
  // =========================================================================
  console.log('\n📋 1. TIPOS DE SERVICIO EN BD:');
  console.log('-'.repeat(50));
  
  const tipos = await prisma.tipos_servicio.findMany({
    select: { id_tipo_servicio: true, codigo_tipo: true, nombre_tipo: true },
    orderBy: { id_tipo_servicio: 'asc' }
  });
  
  for (const t of tipos) {
    console.log(`  [${t.id_tipo_servicio}] ${t.codigo_tipo} - ${t.nombre_tipo}`);
  }

  // =========================================================================
  // 2. ACTIVIDADES POR TIPO DE SERVICIO
  // =========================================================================
  console.log('\n📊 2. ACTIVIDADES POR TIPO DE SERVICIO:');
  console.log('-'.repeat(50));
  
  const actsPorTipo = await prisma.catalogo_actividades.groupBy({
    by: ['id_tipo_servicio'],
    where: { activo: true },
    _count: { id_actividad_catalogo: true }
  });
  
  for (const a of actsPorTipo) {
    const tipo = tipos.find(t => t.id_tipo_servicio === a.id_tipo_servicio);
    console.log(`  Tipo ${a.id_tipo_servicio} (${tipo?.codigo_tipo || 'N/A'}): ${a._count.id_actividad_catalogo} actividades`);
  }

  // =========================================================================
  // 3. ÓRDENES MULTI-EQUIPO
  // =========================================================================
  console.log('\n🔧 3. ÓRDENES MULTI-EQUIPO:');
  console.log('-'.repeat(50));
  
  const ordenesMulti = await prisma.ordenes_servicio.findMany({
    where: { numero_orden: { in: ['OS-ME-3BOM-334804', 'OS-ME-4GEN-334804', 'OS-ME-2BOM-334805'] } },
    select: { 
      id_orden_servicio: true,
      numero_orden: true, 
      id_tipo_servicio: true, 
      tipos_servicio: { select: { codigo_tipo: true, nombre_tipo: true } },
      ordenes_equipos: { select: { id_orden_equipo: true, nombre_sistema: true } },
      ordenes_actividades_plan: { 
        select: { id_actividad_catalogo: true, origen: true },
        orderBy: { orden_secuencia: 'asc' }
      }
    }
  });
  
  for (const o of ordenesMulti) {
    console.log(`\n  📄 ${o.numero_orden} (ID: ${o.id_orden_servicio})`);
    console.log(`     Tipo servicio: ${o.id_tipo_servicio} (${o.tipos_servicio?.codigo_tipo})`);
    console.log(`     Equipos: ${o.ordenes_equipos.length}`);
    o.ordenes_equipos.forEach(e => console.log(`       - ${e.nombre_sistema}`));
    console.log(`     Plan actividades: ${o.ordenes_actividades_plan.length}`);
    o.ordenes_actividades_plan.forEach(p => console.log(`       - Actividad catálogo ${p.id_actividad_catalogo} (${p.origen})`));
  }

  // =========================================================================
  // 4. ACTIVIDADES DEL CATÁLOGO PARA TIPO A BOMBAS
  // =========================================================================
  console.log('\n📚 4. ACTIVIDADES DEL CATÁLOGO PARA CADA TIPO:');
  console.log('-'.repeat(50));
  
  // Buscar tipo Preventivo A para Bombas
  const tipoABombas = tipos.find(t => t.codigo_tipo === 'PREV_A_BOM' || t.nombre_tipo.includes('Preventivo') && t.nombre_tipo.includes('Tipo A') && t.nombre_tipo.includes('Bomba'));
  if (tipoABombas) {
    const actsBombas = await prisma.catalogo_actividades.findMany({
      where: { id_tipo_servicio: tipoABombas.id_tipo_servicio, activo: true },
      select: { id_actividad_catalogo: true, codigo_actividad: true, descripcion_actividad: true },
      take: 10,
      orderBy: { orden_ejecucion: 'asc' }
    });
    console.log(`  Tipo A Bombas (${tipoABombas.id_tipo_servicio}):`);
    actsBombas.forEach(a => console.log(`    [${a.id_actividad_catalogo}] ${a.codigo_actividad}: ${a.descripcion_actividad?.substring(0, 50)}`));
  } else {
    console.log('  ⚠️ No encontrado tipo "Preventivo Tipo A Bombas"');
    console.log('  Buscando tipos disponibles con "Bomba":');
    const tiposBomba = tipos.filter(t => t.nombre_tipo.toLowerCase().includes('bomba'));
    tiposBomba.forEach(t => console.log(`    [${t.id_tipo_servicio}] ${t.codigo_tipo} - ${t.nombre_tipo}`));
  }

  // =========================================================================
  // 5. ANALIZAR ORDEN OS-ME-3BOM-334804 EN DETALLE
  // =========================================================================
  console.log('\n🔍 5. ANÁLISIS DETALLADO DE OS-ME-3BOM-334804:');
  console.log('-'.repeat(50));
  
  const ordenDetalle = await prisma.ordenes_servicio.findFirst({
    where: { numero_orden: 'OS-ME-3BOM-334804' },
    include: {
      tipos_servicio: true,
      ordenes_equipos: { include: { equipos: true } },
      ordenes_actividades_plan: { 
        include: { catalogo_actividades: true },
        orderBy: { orden_secuencia: 'asc' }
      },
      actividades_ejecutadas: {
        include: { catalogo_actividades: true },
        take: 5
      }
    }
  });

  if (ordenDetalle) {
    console.log(`  Número: ${ordenDetalle.numero_orden}`);
    console.log(`  Tipo servicio: ${ordenDetalle.tipos_servicio?.nombre_tipo}`);
    console.log(`  ID tipo servicio: ${ordenDetalle.id_tipo_servicio}`);
    console.log(`\n  Plan de actividades (ordenes_actividades_plan):`);
    
    if (ordenDetalle.ordenes_actividades_plan.length === 0) {
      console.log('    ⚠️ NO HAY PLAN DE ACTIVIDADES - Este es el problema!');
    } else {
      ordenDetalle.ordenes_actividades_plan.forEach(p => {
        console.log(`    [${p.id_actividad_catalogo}] ${p.catalogo_actividades?.descripcion_actividad?.substring(0, 50)}`);
      });
    }
    
    console.log(`\n  Actividades ejecutadas:`);
    ordenDetalle.actividades_ejecutadas.forEach(a => {
      console.log(`    [${a.id_actividad_catalogo}] ${a.catalogo_actividades?.descripcion_actividad?.substring(0, 50)} - Estado: ${a.estado}`);
    });
  }

  console.log('\n' + '='.repeat(80));
  console.log('FIN DEL ANÁLISIS');
  console.log('='.repeat(80));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
