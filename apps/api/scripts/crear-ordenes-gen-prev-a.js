/**
 * Script: Crear 20 Órdenes Multi-Equipo - Generador Preventivo Tipo A
 * ====================================================================
 * 
 * ARQUITECTURA DEL SISTEMA:
 * - Las órdenes se crean con id_tipo_servicio
 * - El mobile obtiene las actividades del CATÁLOGO según el tipo de servicio
 * - NO es necesario crear actividades_ejecutadas aquí
 * 
 * CONFIGURACIÓN:
 * - tipo_servicio: 3 (GEN_PREV_A - 42 actividades en catálogo)
 * - id_cliente: 1
 * - id_empleado_asignado: 6
 * - id_estado: 1 (ASIGNADA)
 * - Equipos: Generadores del cliente 1
 * - Multi-equipo: 2-4 equipos por orden
 * 
 * Ejecutar: node scripts/crear-ordenes-gen-prev-a.js
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
  PREFIJO: 'OS-GENPA',     // Prefijo para número de orden
};

// Generadores disponibles del cliente 1 (tipo GENERADOR)
const GENERADORES = [6, 7, 9, 10, 12, 13, 15, 16, 18, 19];

async function main() {
  console.log('🔧 CREACIÓN DE 20 ÓRDENES MULTI-EQUIPO - GEN PREV A');
  console.log('='.repeat(60));
  console.log(`📋 Tipo Servicio: ${CONFIG.TIPO_SERVICIO} (GEN_PREV_A)`);
  console.log(`👤 Cliente: ${CONFIG.CLIENTE_ID}`);
  console.log(`👷 Empleado: ${CONFIG.EMPLEADO_ID}`);
  console.log(`📊 Estado: ${CONFIG.ESTADO_ID} (ASIGNADA)`);
  console.log('='.repeat(60));

  // Verificar tipo de servicio
  const tipoServicio = await prisma.tipos_servicio.findUnique({
    where: { id_tipo_servicio: CONFIG.TIPO_SERVICIO }
  });
  
  if (!tipoServicio) {
    throw new Error(`Tipo de servicio ${CONFIG.TIPO_SERVICIO} no existe`);
  }
  console.log(`\n✅ Tipo servicio: ${tipoServicio.nombre_tipo}`);

  // Verificar catálogo tiene actividades
  const cantidadActividades = await prisma.catalogo_actividades.count({
    where: { id_tipo_servicio: CONFIG.TIPO_SERVICIO, activo: true }
  });
  console.log(`✅ Actividades en catálogo: ${cantidadActividades}`);

  if (cantidadActividades === 0) {
    throw new Error('No hay actividades en catálogo para este tipo de servicio');
  }

  // Crear órdenes
  const ordenesCreadas = [];
  const ahora = new Date();

  console.log(`\n🚀 Iniciando creación de ${CONFIG.CANTIDAD_ORDENES} órdenes...`);

  for (let i = 1; i <= CONFIG.CANTIDAD_ORDENES; i++) {
    const timestamp = ahora.getTime();
    const numeroOrden = `${CONFIG.PREFIJO}-${timestamp}-${String(i).padStart(3, '0')}`;
    
    // Cantidad de equipos aleatorio (2-4)
    const cantidadEquipos = Math.floor(Math.random() * 3) + 2;
    
    // Seleccionar equipos sin repetir
    const equiposSeleccionados = [];
    const disponibles = [...GENERADORES];
    for (let j = 0; j < cantidadEquipos && disponibles.length > 0; j++) {
      const idx = Math.floor(Math.random() * disponibles.length);
      equiposSeleccionados.push(disponibles.splice(idx, 1)[0]);
    }

    try {
      const resultado = await prisma.$transaction(async (tx) => {
        // 1. Crear orden principal - Usando connect para relaciones requeridas
        const orden = await tx.ordenes_servicio.create({
          data: {
            numero_orden: numeroOrden,
            clientes: { connect: { id_cliente: CONFIG.CLIENTE_ID } },
            equipos: { connect: { id_equipo: equiposSeleccionados[0] } },
            tipos_servicio: { connect: { id_tipo_servicio: CONFIG.TIPO_SERVICIO } },
            estados_orden: { connect: { id_estado: CONFIG.ESTADO_ID } },
            empleados: { connect: { id_empleado: CONFIG.EMPLEADO_ID } },
            fecha_programada: new Date(ahora.getTime() + i * 86400000),
            prioridad: 'MEDIA',
            origen_orden: 'PROGRAMADA',
            descripcion_solicitud: `Orden Multi-Equipo #${i} - Preventivo Tipo A para ${cantidadEquipos} generadores`,
            usuarios_ordenes_servicio_creado_porTousuarios: { connect: { id_usuario: 1 } },
            fecha_creacion: ahora,
          }
        });

        // 2. Crear registros en ordenes_equipos para CADA equipo
        const ordenesEquipos = [];
        for (let seq = 0; seq < equiposSeleccionados.length; seq++) {
          const ordenEquipo = await tx.ordenes_equipos.create({
            data: {
              id_orden_servicio: orden.id_orden_servicio,
              id_equipo: equiposSeleccionados[seq],
              orden_secuencia: seq + 1,
              observaciones: `Equipo ${seq + 1} de ${equiposSeleccionados.length}`,
            }
          });
          ordenesEquipos.push(ordenEquipo);
        }

        return { orden, ordenesEquipos };
      });

      ordenesCreadas.push({
        id: resultado.orden.id_orden_servicio,
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
  console.log(`📝 Actividades totales esperadas: ${cantidadActividades * totalEquipos} (${cantidadActividades} x ${totalEquipos} equipos)`);

  // IDs creados
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
