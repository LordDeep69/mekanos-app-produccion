import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(70));
  console.log('🔧 SANEAMIENTO Y ACTIVACIÓN DE ACTIVIDADES PARA SERVICIOS CORRECTIVOS');
  console.log('='.repeat(70) + '\n');

  // 1. Obtener el sistema "General"
  const sistemaGeneral = await prisma.catalogo_sistemas.findFirst({
    where: {
      OR: [
        { codigo_sistema: 'SIS_GENERAL' },
        { nombre_sistema: { contains: 'General', mode: 'insensitive' } },
      ],
    },
  });

  if (!sistemaGeneral) {
    throw new Error('No se encontró el sistema General');
  }
  console.log(`✅ Sistema General: ID ${sistemaGeneral.id_sistema} (${sistemaGeneral.nombre_sistema})`);

  // Las 11 actividades estándar del flujo correctivo de Mekanos
  const actividadesEstandar = [
    {
      suffix: 'REP_01',
      descripcion: 'ESTADO INICIAL DEL EQUIPO',
      tipo: 'VERIFICACION',
      orden: 1,
      obligatoria: true,
      instrucciones: 'Registrar el estado operativo del equipo al llegar (Operativo, Fuera de servicio, etc.).',
    },
    {
      suffix: 'REP_02',
      descripcion: 'DESCRIPCIÓN DEL PROBLEMA REPORTADO',
      tipo: 'INSPECCION',
      orden: 2,
      obligatoria: true,
      instrucciones: 'Detallar la falla según lo reportado por el cliente o usuario del equipo.',
    },
    {
      suffix: 'REP_03',
      descripcion: 'FALLAS OBSERVADAS',
      tipo: 'INSPECCION',
      orden: 3,
      obligatoria: true,
      instrucciones: 'Indicar los síntomas o daños evidentes encontrados durante la inspección inicial.',
    },
    {
      suffix: 'DIAG_01',
      descripcion: 'SISTEMAS AFECTADOS',
      tipo: 'VERIFICACION',
      orden: 4,
      obligatoria: true,
      instrucciones: 'Seleccionar los subsistemas del equipo comprometidos por la falla.',
    },
    {
      suffix: 'DIAG_02',
      descripcion: 'DIAGNÓSTICO',
      tipo: 'INSPECCION',
      orden: 5,
      obligatoria: true,
      instrucciones: 'Explicación técnica de la causa raíz de la falla y su impacto.',
    },
    {
      suffix: 'DIAG_03',
      descripcion: 'TRABAJOS REALIZADOS',
      tipo: 'INSPECCION',
      orden: 6,
      obligatoria: true,
      instrucciones: 'Describir detalladamente las acciones mecánicas/eléctricas efectuadas para reparar el equipo.',
    },
    {
      suffix: 'REP_04',
      descripcion: 'REPUESTOS UTILIZADOS',
      tipo: 'CAMBIO',
      orden: 7,
      obligatoria: false,
      instrucciones: 'Listar repuestos instalados durante el servicio correctivo.',
    },
    {
      suffix: 'REP_05',
      descripcion: 'MATERIALES E INSUMOS',
      tipo: 'CAMBIO',
      orden: 8,
      obligatoria: false,
      instrucciones: 'Listar consumibles, lubricantes, solventes o insumos usados.',
    },
    {
      suffix: 'RES_01',
      descripcion: 'ESTADO FINAL DEL EQUIPO',
      tipo: 'VERIFICACION',
      orden: 9,
      obligatoria: true,
      instrucciones: 'Condición en la que queda el equipo tras la intervención (Operativo, En observación, Pendiente por repuesto).',
    },
    {
      suffix: 'RES_02',
      descripcion: 'TRABAJOS PENDIENTES',
      tipo: 'INSPECCION',
      orden: 10,
      obligatoria: false,
      instrucciones: 'Acciones pendientes por ejecutar o componentes por cambiar en visitas posteriores.',
    },
    {
      suffix: 'RES_03',
      descripcion: 'RECOMENDACIONES',
      tipo: 'INSPECCION',
      orden: 11,
      obligatoria: false,
      instrucciones: 'Recomendaciones operativas o de mantenimiento para el cliente.',
    },
  ];

  // Servicios correctivos a garantizar
  const serviciosCorrectivos = [
    { id: 6, prefijo: 'CORR_GEN', nombre: 'Mantenimiento Correctivo General' },
    { id: 16, prefijo: 'BCR', nombre: 'Mantenimiento Correctivo - Bomba' },
    { id: 21, prefijo: 'HVAC_CORR', nombre: 'Mantenimiento Correctivo - Climatización / HVAC' },
  ];

  for (const serv of serviciosCorrectivos) {
    console.log(`\n📌 Procesando ${serv.nombre} (ID ${serv.id}):`);

    // Verificar si el tipo de servicio existe
    const tipoServicio = await prisma.tipos_servicio.findUnique({
      where: { id_tipo_servicio: serv.id },
    });

    if (!tipoServicio) {
      console.log(`   ⚠️ Tipo de servicio ID ${serv.id} no existe. Omitiendo.`);
      continue;
    }

    // Para tipo 6, desactivar actividades viejas/obsoletas para que no haya duplicados o ruido
    if (serv.id === 6) {
      const deact = await prisma.catalogo_actividades.updateMany({
        where: {
          id_tipo_servicio: 6,
          codigo_actividad: { in: ['COR_DIAG', 'COR_REPARACION', 'COR_PRUEBA', 'COR_LIMPIEZA'] },
        },
        data: { activo: false },
      });
      console.log(`   🧹 Desactivadas ${deact.count} actividades legacy`);
    }

    // Insertar o actualizar las 11 actividades estándar
    for (const act of actividadesEstandar) {
      const codigo = `${serv.prefijo}_${act.suffix}`.toUpperCase();

      const existing = await prisma.catalogo_actividades.findFirst({
        where: { codigo_actividad: codigo },
      });

      let idActual: number;
      if (existing) {
        const updated = await prisma.catalogo_actividades.update({
          where: { id_actividad_catalogo: existing.id_actividad_catalogo },
          data: {
            id_tipo_servicio: serv.id,
            descripcion_actividad: act.descripcion,
            tipo_actividad: act.tipo as any,
            id_sistema: sistemaGeneral.id_sistema,
            orden_ejecucion: act.orden,
            es_obligatoria: act.obligatoria,
            instrucciones: act.instrucciones,
            activo: true,
          },
        });
        idActual = updated.id_actividad_catalogo;
      } else {
        const created = await prisma.catalogo_actividades.create({
          data: {
            codigo_actividad: codigo,
            descripcion_actividad: act.descripcion,
            tipo_actividad: act.tipo as any,
            id_tipo_servicio: serv.id,
            id_sistema: sistemaGeneral.id_sistema,
            orden_ejecucion: act.orden,
            es_obligatoria: act.obligatoria,
            instrucciones: act.instrucciones,
            activo: true,
          },
        });
        idActual = created.id_actividad_catalogo;
      }

      console.log(`   ✅ [${idActual}] ${codigo} -> ${act.descripcion}`);
    }

    // Contar total activas para este servicio
    const totalActivas = await prisma.catalogo_actividades.count({
      where: { id_tipo_servicio: serv.id, activo: true },
    });
    console.log(`   📊 Total actividades activas para ${serv.nombre}: ${totalActivas}`);
  }

  // 3. Backfill de plan para órdenes recientes que no lo tenían
  console.log('\n' + '='.repeat(70));
  console.log('🔄 BACKFILL DE PLAN DE ACTIVIDADES PARA ÓRDENES RECIENTES');
  console.log('='.repeat(70));

  const ordenesSinPlan = await prisma.ordenes_servicio.findMany({
    where: {
      id_tipo_servicio: { in: [6, 15, 16, 21] },
      ordenes_actividades_plan: { none: {} },
    },
    select: {
      id_orden_servicio: true,
      numero_orden: true,
      id_tipo_servicio: true,
    },
  });

  console.log(`Encontradas ${ordenesSinPlan.length} órdenes correctivas sin plan.`);

  for (const ord of ordenesSinPlan) {
    if (!ord.id_tipo_servicio) continue;

    const actsCat = await prisma.catalogo_actividades.findMany({
      where: { id_tipo_servicio: ord.id_tipo_servicio, activo: true },
      orderBy: { orden_ejecucion: 'asc' },
    });

    if (actsCat.length > 0) {
      await prisma.ordenes_actividades_plan.createMany({
        data: actsCat.map((a, idx) => ({
          id_orden_servicio: ord.id_orden_servicio,
          id_actividad_catalogo: a.id_actividad_catalogo,
          orden_secuencia: a.orden_ejecucion ?? idx + 1,
          origen: 'ADMIN',
          es_obligatoria: a.es_obligatoria ?? true,
        })),
        skipDuplicates: true,
      });

      // Actualizar fecha_modificacion de la orden para que el sync delta la detecte
      await prisma.ordenes_servicio.update({
        where: { id_orden_servicio: ord.id_orden_servicio },
        data: { fecha_modificacion: new Date() },
      });

      console.log(`   ✅ Orden ${ord.numero_orden} (ID: ${ord.id_orden_servicio}): asignadas ${actsCat.length} actividades`);
    }
  }

  console.log('\n🎉 ¡Saneamiento completado con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error en script:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
