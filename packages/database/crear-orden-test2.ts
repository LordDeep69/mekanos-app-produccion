/* eslint-disable */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function crearOrdenNueva() {
  console.log('='.repeat(60));
  console.log('📋 CREANDO ORDEN NUEVA CON PLAN PRE-ASIGNADO');
  console.log('='.repeat(60));

  // 1. Generar número único
  const timestamp = Date.now().toString().slice(-6);
  const numeroOrden = `OS-CORR-TEST2-${timestamp}`;

  // 2. Crear la orden
  const orden = await prisma.ordenes_servicio.create({
    data: {
      numero_orden: numeroOrden,
      id_cliente: 1,
      id_equipo: 1,
      id_tipo_servicio: 6, // Correctivo
      id_estado_actual: 2, // ASIGNADA
      id_tecnico_asignado: 6, // Empleado 6
      descripcion_inicial: 'Orden de prueba para validar Plan de Actividades. Esta orden tiene 5 actividades específicas asignadas por Admin.',
      prioridad: 'NORMAL',
      origen_solicitud: 'PROGRAMADO',
      creado_por: 1,
      fecha_creacion: new Date(),
    },
  });

  console.log('\n✅ Orden creada:');
  console.log('   ID:', orden.id_orden_servicio);
  console.log('   Número:', orden.numero_orden);

  // 3. Asignar plan de actividades (actividades del correctivo para que estén en el catálogo local)
  // Usamos actividades que SÍ son del tipo Correctivo para asegurar que existan en el catálogo
  const actividadesParaPlan = [
    { id: 98, secuencia: 1 },  // CORR_RECEP
    { id: 99, secuencia: 2 },  // CORR_DIAG
    { id: 100, secuencia: 3 }, // CORR_CAUSA
  ];

  for (const act of actividadesParaPlan) {
    await prisma.ordenes_actividades_plan.create({
      data: {
        id_orden_servicio: orden.id_orden_servicio,
        id_actividad_catalogo: act.id,
        orden_secuencia: act.secuencia,
        origen: 'ADMIN',
        es_obligatoria: true,
        creado_por: 1,
        fecha_creacion: new Date(),
      },
    });
  }

  console.log('\n✅ Plan de actividades asignado:');
  console.log('   3 actividades del catálogo Correctivo');

  // 4. Verificar
  const verificacion = await prisma.ordenes_servicio.findUnique({
    where: { id_orden_servicio: orden.id_orden_servicio },
    include: {
      actividades_plan: {
        orderBy: { orden_secuencia: 'asc' },
        include: {
          catalogo_actividades: true,
        },
      },
    },
  });

  console.log('\n📋 VERIFICACIÓN:');
  console.log('   Número:', verificacion?.numero_orden);
  console.log('   Plan items:', verificacion?.actividades_plan?.length);

  for (const p of verificacion?.actividades_plan || []) {
    console.log(
      `   ${p.orden_secuencia}. ${p.catalogo_actividades?.codigo_actividad} - ${p.catalogo_actividades?.nombre_actividad}`
    );
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 INSTRUCCIONES PARA EL USUARIO:');
  console.log('='.repeat(60));
  console.log(`
1. SINCRONIZA la app (NO inicies ninguna orden antes)
2. Busca la orden: ${numeroOrden}
3. Verifica que muestre SOLO 3 actividades (no 14)
4. Las actividades deben ser:
   - CORR_RECEP (Recepción del equipo)
   - CORR_DIAG (Diagnóstico técnico)
   - CORR_CAUSA (Causa de la falla)
`);
  console.log('='.repeat(60));

  await prisma.$disconnect();
}

crearOrdenNueva().catch(console.error);
