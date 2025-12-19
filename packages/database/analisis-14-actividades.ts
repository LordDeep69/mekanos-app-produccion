/* eslint-disable */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function analizar() {
  console.log('='.repeat(60));
  console.log('🔍 ANÁLISIS: ¿POR QUÉ APARECEN 14 ACTIVIDADES?');
  console.log('='.repeat(60));

  // 1. Verificar la orden 267 (usando relaciones correctas de Prisma)
  const orden = await prisma.ordenes_servicio.findUnique({
    where: { id_orden_servicio: 267 },
    include: {
      actividades_plan: {
        orderBy: { orden_secuencia: 'asc' },
      },
      tipo_servicio: true,
    },
  });

  if (!orden) {
    console.log('❌ Orden 267 no encontrada');
    await prisma.$disconnect();
    return;
  }

  console.log('\n📋 ORDEN 267:');
  console.log('   Número:', orden.numero_orden);
  console.log('   Tipo servicio ID:', orden.id_tipo_servicio);
  console.log('   Tipo servicio:', orden.tipo_servicio?.nombre_tipo);

  // 2. Plan de actividades
  console.log('\n🎯 PLAN DE ACTIVIDADES (tabla ordenes_actividades_plan):');
  const planItems = orden.actividades_plan || [];
  console.log('   Total en plan:', planItems.length);

  if (planItems.length > 0) {
    for (const p of planItems) {
      const act = await prisma.catalogo_actividades.findUnique({
        where: { id_actividad_catalogo: p.id_actividad_catalogo },
      });
      console.log(
        `   ${p.orden_secuencia}. ID ${p.id_actividad_catalogo} | ${act?.codigo_actividad} | ${act?.nombre_actividad} | TipoServ: ${act?.id_tipo_servicio}`
      );
    }
  } else {
    console.log('   ⚠️ NO HAY PLAN ASIGNADO - El móvil usará catálogo por tipo');
  }

  // 3. Actividades del tipo Correctivo (ID 6)
  const actividadesCorrectivo = await prisma.catalogo_actividades.findMany({
    where: { id_tipo_servicio: 6, activo: true },
    orderBy: { orden_ejecucion: 'asc' },
  });

  console.log('\n📊 ACTIVIDADES TIPO CORRECTIVO (id_tipo_servicio=6):');
  console.log('   Total:', actividadesCorrectivo.length);
  for (const a of actividadesCorrectivo) {
    console.log(`   - ID ${a.id_actividad_catalogo} | ${a.codigo_actividad} | ${a.nombre_actividad}`);
  }

  // 4. Total de actividades activas en catálogo
  const totalActivas = await prisma.catalogo_actividades.count({
    where: { activo: true },
  });
  console.log('\n📊 TOTAL ACTIVIDADES ACTIVAS en catálogo:', totalActivas);

  // 5. Teoría: 14 = correctivo + plan?
  const planCount = planItems.length;
  const correctivoCount = actividadesCorrectivo.length;

  console.log('\n💡 ANÁLISIS NUMÉRICO:');
  console.log('   Plan:', planCount);
  console.log('   Correctivo:', correctivoCount);
  console.log('   Plan + Correctivo:', planCount + correctivoCount);

  // Verificar superposición
  const planIds = new Set(planItems.map((p: any) => p.id_actividad_catalogo));
  const correctivoIds = new Set(actividadesCorrectivo.map((a: any) => a.id_actividad_catalogo));

  const enAmbos = [];
  for (const id of planIds) {
    if (correctivoIds.has(id)) {
      enAmbos.push(id);
    }
  }

  if (enAmbos.length > 0) {
    console.log('   ⚠️ Actividades en AMBOS (plan Y correctivo):', enAmbos.join(', '));
  }

  // Cálculo final
  const uniqueTotal = new Set([...planIds, ...correctivoIds]).size;
  console.log('   Actividades únicas (plan ∪ correctivo):', uniqueTotal);

  console.log('\n' + '='.repeat(60));
  console.log('🎯 CONCLUSIÓN:');

  if (planCount > 0) {
    console.log('   ✅ La orden TIENE plan de actividades');
    console.log('   → El móvil debería mostrar SOLO', planCount, 'actividades');
    console.log('   → Pero muestra 14, lo cual indica que:');
    console.log('');
    console.log('   POSIBLE BUG: El móvil está usando CATÁLOGO en vez de PLAN');
    console.log('   o está COMBINANDO ambos.');
  } else {
    console.log('   → No hay plan, el móvil usa catálogo por tipo');
    console.log('   → Tipo Correctivo tiene', correctivoCount, 'actividades');
  }
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

analizar().catch(console.error);
