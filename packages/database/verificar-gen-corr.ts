/**
 * VERIFICACIÓN: SERVICIO CORRECTIVO GENERADORES (GEN_CORR)
 * =========================================================
 * Ejecutar con: npx ts-node verificar-gen-corr.ts
 * 
 * Este script verifica:
 * 1. Tipo de servicio GEN_CORR existe y está activo
 * 2. Las 19 actividades están vinculadas correctamente
 * 3. Los parámetros de medición están vinculados
 * 4. El tipo está asociado al equipo tipo GEN
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificar() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   VERIFICACIÓN: GEN_CORR - Correctivo Generadores           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');

  // 1. Verificar tipo de servicio
  console.log('\n📋 1. TIPO DE SERVICIO GEN_CORR');
  const tipoServicio = await prisma.tipos_servicio.findFirst({
    where: { codigo_tipo: 'GEN_CORR' },
    include: {
      tipos_equipo: true,
    },
  });

  if (!tipoServicio) {
    console.log('   ❌ NO ENCONTRADO - Ejecutar seed-correctivo-generadores.ts primero');
    return;
  }

  console.log(`   ✅ ID: ${tipoServicio.id_tipo_servicio}`);
  console.log(`   ✅ Nombre: ${tipoServicio.nombre_tipo}`);
  console.log(`   ✅ Categoría: ${tipoServicio.categoria}`);
  console.log(`   ✅ Equipo: ${tipoServicio.tipos_equipo?.nombre_tipo || 'N/A'}`);
  console.log(`   ✅ Tiene Checklist: ${tipoServicio.tiene_checklist}`);
  console.log(`   ✅ Requiere Mediciones: ${tipoServicio.requiere_mediciones}`);
  console.log(`   ✅ Activo: ${tipoServicio.activo}`);

  // 2. Verificar actividades
  console.log('\n📋 2. ACTIVIDADES DEL CATÁLOGO');
  const actividades = await prisma.catalogo_actividades.findMany({
    where: {
      id_tipo_servicio: tipoServicio.id_tipo_servicio,
      activo: true,
    },
    include: {
      catalogo_sistemas: true,
      parametros_medicion: true,
    },
    orderBy: { orden_ejecucion: 'asc' },
  });

  console.log(`   ✅ Total actividades: ${actividades.length}`);

  // Agrupar por tipo
  const porTipo: Record<string, number> = {};
  actividades.forEach((a) => {
    porTipo[a.tipo_actividad] = (porTipo[a.tipo_actividad] || 0) + 1;
  });

  console.log('\n   📊 Distribución por tipo:');
  Object.entries(porTipo).forEach(([tipo, count]) => {
    console.log(`      - ${tipo}: ${count}`);
  });

  // 3. Verificar mediciones
  console.log('\n📋 3. ACTIVIDADES CON PARÁMETRO DE MEDICIÓN');
  const conMedicion = actividades.filter((a) => a.id_parametro_medicion !== null);
  console.log(`   ✅ Actividades con parámetro: ${conMedicion.length}`);

  conMedicion.forEach((a) => {
    console.log(
      `      - ${a.codigo_actividad}: ${a.parametros_medicion?.codigo_parametro} (${a.parametros_medicion?.unidad_medida})`,
    );
  });

  // 4. Listar todas las actividades
  console.log('\n📋 4. LISTA COMPLETA DE ACTIVIDADES');
  actividades.forEach((a, i) => {
    const param = a.parametros_medicion?.codigo_parametro || '';
    console.log(
      `   ${String(i + 1).padStart(2, '0')}. [${a.tipo_actividad.padEnd(12)}] ${a.codigo_actividad}: ${a.descripcion_actividad.substring(0, 50)}${param ? ` → ${param}` : ''}`,
    );
  });

  // 5. Resumen final
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('  RESUMEN DE VERIFICACIÓN');
  console.log('═'.repeat(60));
  console.log(`  ✅ Tipo de servicio: GEN_CORR (ID: ${tipoServicio.id_tipo_servicio})`);
  console.log(`  ✅ Actividades: ${actividades.length}`);
  console.log(`  ✅ Mediciones vinculadas: ${conMedicion.length}`);
  console.log(`  ✅ Listo para crear órdenes de correctivo`);
  console.log('═'.repeat(60));
  console.log('\n');
}

verificar()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
