/* eslint-disable */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function simularSync() {
  console.log('='.repeat(60));
  console.log('🔍 SIMULAR RESPUESTA DE SYNC PARA ORDEN 267');
  console.log('='.repeat(60));

  // Simular la misma query que hace el backend
  const ordenes = await prisma.ordenes_servicio.findMany({
    where: {
      id_orden_servicio: 267,
    },
    include: {
      estado: true,
      actividades_plan: {
        orderBy: { orden_secuencia: 'asc' },
      },
      cliente: {
        include: { persona: true },
      },
      tipo_servicio: true,
    },
  });

  if (ordenes.length === 0) {
    console.log('❌ Orden no encontrada');
    await prisma.$disconnect();
    return;
  }

  const o = ordenes[0];

  // Simular el mapeo que hace el backend
  const syncResponse = {
    idOrden: o.id_orden_servicio,
    numeroOrden: o.numero_orden,
    idTipoServicio: o.id_tipo_servicio,
    codigoEstado: o.estado?.codigo_estado,
    // Este es el campo clave
    actividadesPlan: o.actividades_plan?.map((p: any) => ({
      idActividadCatalogo: p.id_actividad_catalogo,
      ordenSecuencia: p.orden_secuencia,
      origen: p.origen,
      esObligatoria: p.es_obligatoria ?? undefined,
    })),
  };

  console.log('\n📤 LO QUE EL BACKEND ENVÍA:');
  console.log(JSON.stringify(syncResponse, null, 2));

  console.log('\n🎯 VERIFICACIÓN:');
  console.log('   actividadesPlan existe:', syncResponse.actividadesPlan !== undefined);
  console.log('   actividadesPlan es array:', Array.isArray(syncResponse.actividadesPlan));
  console.log('   actividadesPlan.length:', syncResponse.actividadesPlan?.length || 0);

  if (syncResponse.actividadesPlan && syncResponse.actividadesPlan.length > 0) {
    console.log('\n✅ El backend SÍ envía el plan correctamente');
    console.log('   El problema debe estar en el MOBILE (sync o ejecucion)');
  } else {
    console.log('\n❌ El backend NO envía el plan');
    console.log('   Revisar la relación actividades_plan en Prisma');
  }

  await prisma.$disconnect();
}

simularSync().catch(console.error);
