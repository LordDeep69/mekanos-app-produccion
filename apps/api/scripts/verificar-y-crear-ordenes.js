/**
 * Verificar y crear órdenes multi-equipo (2 equipos por orden)
 * Ejecutar: node scripts/verificar-y-crear-ordenes.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verificarOrdenes() {
  console.log('🔍 VERIFICANDO ÓRDENES EXISTENTES...\n');

  const prefijos = ['OS-GENPA', 'OS-GENPB', 'OS-BOMPA', 'OS-CORR'];
  
  for (const prefijo of prefijos) {
    const ordenes = await prisma.ordenes_servicio.findMany({
      where: { numero_orden: { startsWith: prefijo } },
      include: { ordenes_equipos: true }
    });
    console.log(`${prefijo}: ${ordenes.length} órdenes`);
    if (ordenes.length > 0) {
      const equiposPorOrden = ordenes.map(o => o.ordenes_equipos.length);
      console.log(`  Equipos por orden: min=${Math.min(...equiposPorOrden)}, max=${Math.max(...equiposPorOrden)}`);
    }
  }
}

async function limpiarOrdenesAntiguas() {
  console.log('\n🗑️ LIMPIANDO ÓRDENES ANTERIORES...');
  
  const prefijos = ['OS-GENPA', 'OS-GENPB', 'OS-BOMPA', 'OS-CORR'];
  
  for (const prefijo of prefijos) {
    // Primero eliminar ordenes_equipos
    const ordenesIds = await prisma.ordenes_servicio.findMany({
      where: { numero_orden: { startsWith: prefijo } },
      select: { id_orden_servicio: true }
    });
    
    if (ordenesIds.length > 0) {
      await prisma.ordenes_equipos.deleteMany({
        where: { id_orden_servicio: { in: ordenesIds.map(o => o.id_orden_servicio) } }
      });
      
      await prisma.ordenes_servicio.deleteMany({
        where: { numero_orden: { startsWith: prefijo } }
      });
      
      console.log(`  ${prefijo}: eliminadas ${ordenesIds.length} órdenes`);
    }
  }
}

async function crearOrdenes(config) {
  const { prefijo, tipoServicio, equipos, cantidad } = config;
  
  console.log(`\n📦 Creando ${cantidad} órdenes ${prefijo} (tipo=${tipoServicio})...`);
  
  const ahora = new Date();
  let creadas = 0;
  
  for (let i = 1; i <= cantidad; i++) {
    const numeroOrden = `${prefijo}-${Date.now()}-${String(i).padStart(3, '0')}`;
    
    // Seleccionar 2 equipos (siempre 2)
    const idx1 = (i - 1) % equipos.length;
    const idx2 = (i) % equipos.length;
    const equiposOrden = [equipos[idx1], equipos[idx2]];
    
    try {
      // Crear orden
      const orden = await prisma.ordenes_servicio.create({
        data: {
          numero_orden: numeroOrden,
          id_cliente: 1,
          id_equipo_principal: equiposOrden[0],
          id_tipo_servicio: tipoServicio,
          id_estado_actual: 1, // ASIGNADA
          id_tecnico_asignado: 6,
          fecha_programada: new Date(ahora.getTime() + i * 86400000),
          prioridad: 'MEDIA',
          origen_solicitud: 'PROGRAMADA',
          descripcion_inicial: `Orden Multi-Equipo #${i} - ${prefijo} para 2 equipos`,
          creado_por: 1,
          fecha_creacion: ahora,
        }
      });
      
      // Crear ordenes_equipos para cada equipo
      for (let seq = 0; seq < equiposOrden.length; seq++) {
        await prisma.ordenes_equipos.create({
          data: {
            id_orden_servicio: orden.id_orden_servicio,
            id_equipo: equiposOrden[seq],
            orden_secuencia: seq + 1,
            observaciones: `Equipo ${seq + 1} de 2`,
          }
        });
      }
      
      creadas++;
      if (i % 5 === 0) {
        console.log(`  ✅ Creadas ${i}/${cantidad}...`);
      }
    } catch (error) {
      console.error(`  ❌ Error en orden ${i}:`, error.message);
    }
  }
  
  console.log(`  ✅ Total creadas: ${creadas}/${cantidad}`);
  return creadas;
}

async function main() {
  try {
    // 1. Verificar estado actual
    await verificarOrdenes();
    
    // 2. NO limpiar - crear nuevas con prefijo diferente
    // await limpiarOrdenesAntiguas();
    
    // 3. Definir equipos
    // Generadores del cliente 1 (IDs verificados)
    const generadores = [6, 7, 9, 10, 12, 13, 15, 16, 18, 19];
    // Bombas
    const bombas = [82, 88, 91, 97];
    
    // 4. Crear 20 órdenes de cada tipo con nuevo prefijo (v2)
    console.log('\n' + '='.repeat(60));
    console.log('🚀 CREANDO 20 ÓRDENES POR TIPO (2 EQUIPOS CADA UNA) - V2');
    console.log('='.repeat(60));
    
    // GEN_PREV_A (tipo 3)
    await crearOrdenes({
      prefijo: 'ME-GENPA',
      tipoServicio: 3,
      equipos: generadores,
      cantidad: 20
    });
    
    // GEN_PREV_B (tipo 4)
    await crearOrdenes({
      prefijo: 'ME-GENPB',
      tipoServicio: 4,
      equipos: generadores,
      cantidad: 20
    });
    
    // BOM_PREV_A (tipo 5)
    await crearOrdenes({
      prefijo: 'ME-BOMPA',
      tipoServicio: 5,
      equipos: bombas,
      cantidad: 20
    });
    
    // CORRECTIVO (tipo 6)
    await crearOrdenes({
      prefijo: 'ME-CORR',
      tipoServicio: 6,
      equipos: generadores.concat(bombas), // Mezcla de generadores y bombas
      cantidad: 20
    });
    
    // 5. Verificar resultado final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADO FINAL');
    console.log('='.repeat(60));
    
    // Verificar nuevas
    const prefijosNuevos = ['ME-GENPA', 'ME-GENPB', 'ME-BOMPA', 'ME-CORR'];
    for (const prefijo of prefijosNuevos) {
      const ordenes = await prisma.ordenes_servicio.findMany({
        where: { numero_orden: { startsWith: prefijo } },
        include: { ordenes_equipos: true }
      });
      console.log(`${prefijo}: ${ordenes.length} órdenes`);
      if (ordenes.length > 0) {
        const equiposPorOrden = ordenes.map(o => o.ordenes_equipos.length);
        console.log(`  Equipos por orden: ${equiposPorOrden.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
