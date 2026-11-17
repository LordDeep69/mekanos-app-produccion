/**
 * Script de investigación profunda: OS-ME-BOM2-565801-012
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(80));
  console.log('🔍 INVESTIGACIÓN PROFUNDA: OS-ME-BOM2-565801-012');
  console.log('='.repeat(80));

  // 1. Buscar orden
  const orden = await prisma.ordenes_servicio.findFirst({
    where: { numero_orden: 'OS-ME-BOM2-565801-012' }
  });

  if (!orden) {
    console.log('❌ Orden no encontrada');
    return;
  }

  console.log('\n📋 ORDEN:');
  console.log(`   ID: ${orden.id_orden_servicio}`);
  console.log(`   Número: ${orden.numero_orden}`);
  console.log(`   Tipo Servicio: ${orden.id_tipo_servicio}`);
  console.log(`   Estado: ${orden.id_estado_actual}`);

  // 2. Equipos
  const equipos = await prisma.ordenes_equipos.findMany({
    where: { id_orden_servicio: orden.id_orden_servicio }
  });

  console.log(`\n🔧 EQUIPOS (${equipos.length}):`);
  for (const eq of equipos) {
    console.log(`   [${eq.id_orden_equipo}] ${eq.nombre_sistema} - ID Equipo: ${eq.id_equipo} - Estado: ${eq.estado}`);
  }

  // 3. Actividades ejecutadas (usando SQL raw)
  const actividades = await prisma.$queryRaw`
    SELECT id_actividad_ejecutada, id_actividad_catalogo, id_orden_equipo, estado, observaciones
    FROM actividades_ejecutadas 
    WHERE id_orden_servicio = ${orden.id_orden_servicio}
    ORDER BY id_orden_equipo, id_actividad_catalogo
  ` as any[];

  console.log(`\n✅ ACTIVIDADES EJECUTADAS (${actividades.length}):`);
  
  // Agrupar por id_orden_equipo
  const actPorEquipo = new Map<number | null, any[]>();
  for (const act of actividades) {
    const key = act.id_orden_equipo;
    if (!actPorEquipo.has(key)) actPorEquipo.set(key, []);
    actPorEquipo.get(key)!.push(act);
  }

  for (const [idEq, acts] of actPorEquipo) {
    console.log(`   📦 Equipo ${idEq ?? 'SIN_EQUIPO'}: ${acts.length} actividades`);
    for (const a of acts.slice(0, 3)) {
      console.log(`      - [${a.id_actividad_catalogo}] ${a.estado} | obs: ${a.observaciones?.substring(0,30) ?? '-'}`);
    }
    if (acts.length > 3) console.log(`      ... y ${acts.length - 3} más`);
  }

  // 4. Mediciones (usando SQL raw)
  const mediciones = await prisma.$queryRaw`
    SELECT id_medicion, id_parametro_medicion, id_orden_equipo, valor
    FROM mediciones_servicio 
    WHERE id_orden_servicio = ${orden.id_orden_servicio}
    ORDER BY id_orden_equipo, id_parametro_medicion
  ` as any[];

  console.log(`\n📊 MEDICIONES (${mediciones.length}):`);
  
  const medPorEquipo = new Map<number | null, any[]>();
  for (const med of mediciones) {
    const key = med.id_orden_equipo;
    if (!medPorEquipo.has(key)) medPorEquipo.set(key, []);
    medPorEquipo.get(key)!.push(med);
  }

  for (const [idEq, meds] of medPorEquipo) {
    console.log(`   📦 Equipo ${idEq ?? 'SIN_EQUIPO'}: ${meds.length} mediciones`);
    for (const m of meds.slice(0, 3)) {
      console.log(`      - Param ${m.id_parametro_medicion}: ${m.valor}`);
    }
    if (meds.length > 3) console.log(`      ... y ${meds.length - 3} más`);
  }

  // 5. Evidencias (usando SQL raw)
  const evidencias = await prisma.$queryRaw`
    SELECT id_evidencia, id_orden_equipo, tipo_evidencia
    FROM evidencias_fotograficas 
    WHERE id_orden_servicio = ${orden.id_orden_servicio}
    ORDER BY id_orden_equipo, tipo_evidencia
  ` as any[];

  console.log(`\n📷 EVIDENCIAS (${evidencias.length}):`);
  
  const evPorEquipo = new Map<number | null, any[]>();
  for (const ev of evidencias) {
    const key = ev.id_orden_equipo;
    if (!evPorEquipo.has(key)) evPorEquipo.set(key, []);
    evPorEquipo.get(key)!.push(ev);
  }

  for (const [idEq, evs] of evPorEquipo) {
    const antes = evs.filter((e: any) => e.tipo_evidencia === 'ANTES').length;
    const durante = evs.filter((e: any) => e.tipo_evidencia === 'DURANTE').length;
    const despues = evs.filter((e: any) => e.tipo_evidencia === 'DESPUES').length;
    console.log(`   📦 Equipo ${idEq ?? 'SIN_EQUIPO'}: ANTES=${antes}, DURANTE=${durante}, DESPUES=${despues}`);
  }

  // 6. Resumen de problema
  console.log('\n' + '='.repeat(80));
  console.log('📊 DIAGNÓSTICO:');
  console.log('='.repeat(80));

  const equiposConActividades = new Set(actividades.map((a: any) => a.id_orden_equipo).filter(Boolean));
  const equiposConMediciones = new Set(mediciones.map((m: any) => m.id_orden_equipo).filter(Boolean));
  const equiposConEvidencias = new Set(evidencias.map((e: any) => e.id_orden_equipo).filter(Boolean));

  console.log(`\n   Equipos registrados: ${equipos.length}`);
  console.log(`   Equipos con actividades (id_orden_equipo): ${equiposConActividades.size}`);
  console.log(`   Equipos con mediciones (id_orden_equipo): ${equiposConMediciones.size}`);
  console.log(`   Equipos con evidencias (id_orden_equipo): ${equiposConEvidencias.size}`);

  // Verificar si hay datos sin id_orden_equipo
  const actSinEquipo = actividades.filter((a: any) => !a.id_orden_equipo).length;
  const medSinEquipo = mediciones.filter((m: any) => !m.id_orden_equipo).length;
  const evSinEquipo = evidencias.filter((e: any) => !e.id_orden_equipo).length;

  if (actSinEquipo > 0 || medSinEquipo > 0 || evSinEquipo > 0) {
    console.log('\n   ⚠️  DATOS SIN id_orden_equipo:');
    console.log(`      - Actividades: ${actSinEquipo}`);
    console.log(`      - Mediciones: ${medSinEquipo}`);
    console.log(`      - Evidencias: ${evSinEquipo}`);
  } else {
    console.log('\n   ✅ Todos los datos tienen id_orden_equipo asignado');
  }

  console.log('\n✅ INVESTIGACIÓN COMPLETA');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
