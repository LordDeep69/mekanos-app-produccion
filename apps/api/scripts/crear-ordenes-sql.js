/**
 * Crear órdenes multi-equipo usando SQL directo
 * Ejecutar: node scripts/crear-ordenes-sql.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function crearOrdenes(config) {
  const { prefijo, tipoServicio, equipos, cantidad } = config;
  
  console.log(`\n📦 Creando ${cantidad} órdenes ${prefijo} (tipo=${tipoServicio})...`);
  
  let creadas = 0;
  
  for (let i = 1; i <= cantidad; i++) {
    const numeroOrden = `${prefijo}-${Date.now()}-${String(i).padStart(3, '0')}`;
    
    // Seleccionar 2 equipos
    const idx1 = (i - 1) % equipos.length;
    const idx2 = (i) % equipos.length;
    const equipo1 = equipos[idx1];
    const equipo2 = equipos[idx2];
    
    console.log(`  → Orden ${i}: ${numeroOrden} con equipos ${equipo1}, ${equipo2}`);
    
    try {
      // Insertar orden con SQL directo usando executeRawUnsafe
      const fechaProgramada = new Date(Date.now() + i * 86400000).toISOString();
      const descripcion = `Orden Multi-Equipo ${prefijo} - 2 equipos`;
      
      const result = await prisma.$queryRawUnsafe(`
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
          $1,
          1,
          $2,
          $3,
          1,
          6,
          $4::timestamp,
          'NORMAL',
          'PROGRAMADO',
          $5,
          1,
          NOW()
        )
        RETURNING id_orden_servicio
      `, numeroOrden, equipo1, tipoServicio, fechaProgramada, descripcion);
      
      const idOrden = result[0].id_orden_servicio;
      
      // Insertar ordenes_equipos
      await prisma.$queryRaw`
        INSERT INTO ordenes_equipos (id_orden_servicio, id_equipo, orden_secuencia, observaciones)
        VALUES (${idOrden}, ${equipo1}, 1, 'Equipo 1 de 2')
      `;
      
      await prisma.$queryRaw`
        INSERT INTO ordenes_equipos (id_orden_servicio, id_equipo, orden_secuencia, observaciones)
        VALUES (${idOrden}, ${equipo2}, 2, 'Equipo 2 de 2')
      `;
      
      creadas++;
      if (i % 5 === 0) {
        console.log(`  ✅ ${i}/${cantidad}...`);
      }
    } catch (error) {
      console.error(`  ❌ Orden ${i}: ${error.message.substring(0, 100)}`);
    }
  }
  
  console.log(`  ✅ Total: ${creadas}/${cantidad}`);
  return creadas;
}

async function main() {
  console.log('🚀 CREANDO 80 ÓRDENES MULTI-EQUIPO (2 equipos cada una)');
  console.log('='.repeat(60));
  
  // Generadores cliente 1
  const generadores = [6, 7, 9, 10, 12, 13, 15, 16, 18, 19];
  // Bombas
  const bombas = [82, 88, 91, 97];
  
  let total = 0;
  
  // GEN_PREV_A (tipo 3)
  total += await crearOrdenes({
    prefijo: 'ME-GPA',
    tipoServicio: 3,
    equipos: generadores,
    cantidad: 20
  });
  
  // GEN_PREV_B (tipo 4)
  total += await crearOrdenes({
    prefijo: 'ME-GPB',
    tipoServicio: 4,
    equipos: generadores,
    cantidad: 20
  });
  
  // BOM_PREV_A (tipo 5)
  total += await crearOrdenes({
    prefijo: 'ME-BPA',
    tipoServicio: 5,
    equipos: bombas,
    cantidad: 20
  });
  
  // CORRECTIVO (tipo 6)
  total += await crearOrdenes({
    prefijo: 'ME-COR',
    tipoServicio: 6,
    equipos: generadores,
    cantidad: 20
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 TOTAL ÓRDENES CREADAS: ${total}/80`);
  
  // Verificar
  const verificar = await prisma.$queryRaw`
    SELECT 
      LEFT(numero_orden, 6) as prefijo,
      COUNT(*) as ordenes,
      (SELECT COUNT(*) FROM ordenes_equipos oe WHERE oe.id_orden_servicio = MIN(os.id_orden_servicio)) as equipos_muestra
    FROM ordenes_servicio os
    WHERE numero_orden LIKE 'ME-%'
    GROUP BY LEFT(numero_orden, 6)
    ORDER BY prefijo
  `;
  
  console.log('\n📋 Verificación:');
  verificar.forEach(r => {
    console.log(`  ${r.prefijo}: ${r.ordenes} órdenes`);
  });
  
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
