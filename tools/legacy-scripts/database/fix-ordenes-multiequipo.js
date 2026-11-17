/**
 * Script para corregir las órdenes multi-equipo de bombas:
 * 1. Actualizar id_tipo_servicio a 5 (BOM_PREV_A)
 * 2. Eliminar actividades plan antiguas (del tipo 1)
 * 3. Asignar actividades correctas del catálogo (tipo 5)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 CORRECCIÓN DE ÓRDENES MULTI-EQUIPO DE BOMBAS');
  console.log('='.repeat(60));

  try {
    // 1. Buscar todas las órdenes OS-ME-BOM2-*
    const ordenes = await prisma.ordenes_servicio.findMany({
      where: { numero_orden: { startsWith: 'OS-ME-BOM2' } },
      select: { id_orden_servicio: true, numero_orden: true, id_tipo_servicio: true }
    });

    console.log(`\n📋 Órdenes encontradas: ${ordenes.length}`);
    
    // 2. Obtener el tipo de servicio correcto (BOM_PREV_A = ID 5)
    const tipoServicioBomba = await prisma.tipos_servicio.findFirst({
      where: { codigo_tipo: 'BOM_PREV_A' }
    });
    
    if (!tipoServicioBomba) {
      throw new Error('No existe el tipo de servicio BOM_PREV_A');
    }
    console.log(`\n✓ Tipo servicio correcto: ID ${tipoServicioBomba.id_tipo_servicio} - ${tipoServicioBomba.nombre_tipo}`);

    // 3. Obtener actividades del catálogo para BOM_PREV_A
    const actividadesCatalogo = await prisma.catalogo_actividades.findMany({
      where: { id_tipo_servicio: tipoServicioBomba.id_tipo_servicio, activo: true },
      orderBy: { orden_ejecucion: 'asc' }
    });
    console.log(`✓ Actividades en catálogo: ${actividadesCatalogo.length}`);

    // 4. Obtener usuario para auditoría
    const usuario = await prisma.usuarios.findFirst({ where: { estado: 'ACTIVO' } });

    // 5. Procesar cada orden
    console.log('\n📊 Procesando órdenes...\n');
    
    for (const orden of ordenes) {
      console.log(`  📋 ${orden.numero_orden} (ID: ${orden.id_orden_servicio})`);
      console.log(`     - Tipo servicio actual: ${orden.id_tipo_servicio}`);
      
      // Actualizar tipo de servicio si es incorrecto
      if (orden.id_tipo_servicio !== tipoServicioBomba.id_tipo_servicio) {
        await prisma.ordenes_servicio.update({
          where: { id_orden_servicio: orden.id_orden_servicio },
          data: { id_tipo_servicio: tipoServicioBomba.id_tipo_servicio }
        });
        console.log(`     ✓ Tipo servicio actualizado a: ${tipoServicioBomba.id_tipo_servicio}`);
      }
      
      // Eliminar actividades plan anteriores
      const deletedActs = await prisma.ordenes_actividades_plan.deleteMany({
        where: { id_orden_servicio: orden.id_orden_servicio }
      });
      console.log(`     ✓ Actividades plan eliminadas: ${deletedActs.count}`);
      
      // Asignar nuevas actividades del catálogo correcto
      if (actividadesCatalogo.length > 0) {
        await prisma.ordenes_actividades_plan.createMany({
          data: actividadesCatalogo.map((a, index) => ({
            id_orden_servicio: orden.id_orden_servicio,
            id_actividad_catalogo: a.id_actividad_catalogo,
            orden_secuencia: a.orden_ejecucion ?? index + 1,
            origen: 'ADMIN',
            es_obligatoria: a.es_obligatoria ?? true,
            creado_por: usuario?.id_usuario || 1
          })),
          skipDuplicates: true
        });
        console.log(`     ✓ Nuevas actividades asignadas: ${actividadesCatalogo.length}`);
      }
    }

    // 6. Verificar resultado
    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICACIÓN FINAL');
    console.log('='.repeat(60) + '\n');

    const ordenVerificacion = await prisma.ordenes_servicio.findFirst({
      where: { numero_orden: { startsWith: 'OS-ME-BOM2' } },
      include: {
        tipos_servicio: true,
        ordenes_equipos: true,
        ordenes_actividades_plan: {
          include: { catalogo_actividades: true }
        }
      }
    });

    console.log(`Orden: ${ordenVerificacion?.numero_orden}`);
    console.log(`Tipo Servicio: ${ordenVerificacion?.tipos_servicio?.nombre_tipo} (ID ${ordenVerificacion?.id_tipo_servicio})`);
    console.log(`Equipos: ${ordenVerificacion?.ordenes_equipos?.length}`);
    console.log(`Actividades Plan: ${ordenVerificacion?.ordenes_actividades_plan?.length}`);
    console.log(`\nPrimeras 5 actividades:`);
    ordenVerificacion?.ordenes_actividades_plan?.slice(0, 5).forEach((a, i) => {
      console.log(`  ${i+1}. ${a.catalogo_actividades?.descripcion_actividad}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ¡CORRECCIÓN COMPLETADA!');
    console.log('='.repeat(60));

  } catch (error) {
    console.log('\n❌ ERROR:');
    console.error(error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
