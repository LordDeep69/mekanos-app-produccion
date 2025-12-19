/**
 * Script: Crear 20 Órdenes Multi-Equipo - Generador Preventivo Tipo A
 * ====================================================================
 * 
 * USANDO SQL DIRECTO para evitar complejidad de relaciones Prisma
 * 
 * Ejecutar: node scripts/crear-ordenes-gen-prev-a-sql.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// CONFIGURACIÓN
const CONFIG = {
  TIPO_SERVICIO: 3,        // GEN_PREV_A
  CLIENTE_ID: 1,
  EMPLEADO_ID: 6,
  ESTADO_ID: 1,            // ASIGNADA
  CANTIDAD_ORDENES: 20,
  PREFIJO: 'OS-GENPA',
};

// Generadores del cliente 1
const GENERADORES = [6, 7, 9, 10, 12, 13, 15, 16, 18, 19];

async function main() {
  console.log('🔧 CREACIÓN DE 20 ÓRDENES MULTI-EQUIPO - GEN PREV A');
  console.log('='.repeat(60));
  console.log(`📋 Tipo Servicio: ${CONFIG.TIPO_SERVICIO} (GEN_PREV_A)`);
  console.log(`👤 Cliente: ${CONFIG.CLIENTE_ID}`);
  console.log(`👷 Empleado: ${CONFIG.EMPLEADO_ID}`);
  console.log('='.repeat(60));

  // Verificar catálogo
  const cantidadActividades = await prisma.catalogo_actividades.count({
    where: { id_tipo_servicio: CONFIG.TIPO_SERVICIO, activo: true }
  });
  console.log(`✅ Actividades en catálogo: ${cantidadActividades}`);

  const ordenesCreadas = [];
  const ahora = new Date();

  console.log(`\n🚀 Creando ${CONFIG.CANTIDAD_ORDENES} órdenes...`);

  for (let i = 1; i <= CONFIG.CANTIDAD_ORDENES; i++) {
    const timestamp = ahora.getTime();
    const numeroOrden = `${CONFIG.PREFIJO}-${timestamp}-${String(i).padStart(3, '0')}`;
    
    // Cantidad de equipos (2-4)
    const cantidadEquipos = Math.floor(Math.random() * 3) + 2;
    
    // Seleccionar equipos
    const equiposSeleccionados = [];
    const disponibles = [...GENERADORES];
    for (let j = 0; j < cantidadEquipos && disponibles.length > 0; j++) {
      const idx = Math.floor(Math.random() * disponibles.length);
      equiposSeleccionados.push(disponibles.splice(idx, 1)[0]);
    }

    const fechaProgramada = new Date(ahora.getTime() + i * 86400000);

    try {
      // Usar SQL directo - Columnas según schema.prisma
      const descripcion = `Orden Multi-Equipo #${i} - Preventivo Tipo A para ${cantidadEquipos} generadores`;
      const resultOrden = await prisma.$executeRaw`
        INSERT INTO ordenes_servicio (
          numero_orden,
          id_cliente,
          id_equipo,
          id_tipo_servicio,
          id_estado_actual,
          id_tecnico_asignado,
          fecha_programada,
          prioridad,
          origen_solicitud,
          descripcion_inicial,
          creado_por,
          fecha_creacion
        ) VALUES (
          ${numeroOrden},
          ${CONFIG.CLIENTE_ID},
          ${equiposSeleccionados[0]},
          ${CONFIG.TIPO_SERVICIO},
          ${CONFIG.ESTADO_ID},
          ${CONFIG.EMPLEADO_ID},
          ${fechaProgramada},
          'NORMAL'::"prioridad_enum",
          'PROGRAMADO'::"origen_solicitud_enum",
          ${descripcion},
          1,
          ${ahora}
        )
      `;

      // Obtener el ID de la orden recién creada
      const ordenCreada = await prisma.ordenes_servicio.findFirst({
        where: { numero_orden: numeroOrden },
        select: { id_orden_servicio: true }
      });

      if (!ordenCreada) {
        throw new Error('No se pudo obtener ID de orden');
      }

      const idOrden = ordenCreada.id_orden_servicio;

      // Crear ordenes_equipos para cada equipo
      for (let seq = 0; seq < equiposSeleccionados.length; seq++) {
        await prisma.$executeRaw`
          INSERT INTO ordenes_equipos (
            id_orden_servicio,
            id_equipo,
            orden_secuencia,
            observaciones
          ) VALUES (
            ${idOrden},
            ${equiposSeleccionados[seq]},
            ${seq + 1},
            ${`Equipo ${seq + 1} de ${equiposSeleccionados.length}`}
          )
        `;
      }

      ordenesCreadas.push({
        id: idOrden,
        numero: numeroOrden,
        equipos: equiposSeleccionados.length,
        equipoIds: equiposSeleccionados
      });

      console.log(`  ✅ Orden ${i}/${CONFIG.CANTIDAD_ORDENES}: ${numeroOrden} → ${equiposSeleccionados.length} equipos`);

    } catch (error) {
      console.error(`  ❌ Error en orden ${i}: ${error.message}`);
    }
  }

  // Resumen
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN');
  console.log('='.repeat(60));
  console.log(`✅ Órdenes creadas: ${ordenesCreadas.length}/${CONFIG.CANTIDAD_ORDENES}`);
  
  const totalEquipos = ordenesCreadas.reduce((sum, o) => sum + o.equipos, 0);
  console.log(`📦 Total equipos asignados: ${totalEquipos}`);
  console.log(`📝 Actividades por orden: ${cantidadActividades} (del catálogo)`);

  console.log('\n📋 Órdenes creadas:');
  ordenesCreadas.forEach(o => {
    console.log(`  - ID: ${o.id} | ${o.numero} | ${o.equipos} equipos [${o.equipoIds.join(', ')}]`);
  });

  await prisma.$disconnect();
  console.log('\n✅ Script completado');
}

main().catch(async (e) => {
  console.error('❌ Error fatal:', e);
  await prisma.$disconnect();
  process.exit(1);
});
