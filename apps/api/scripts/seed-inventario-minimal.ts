/**
 * SEED: inventario - datos mínimos para pruebas (componentes, lotes, movimientos)
 * Ejecutar: pnpm ts-node scripts/seed-inventario-minimal.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['info', 'warn', 'error'] });

async function main() {
  console.log('🌱 Seed inventario minimal...');

  // 1. Crear componente en catalogo_componentes si no existe
  const exists = await prisma.catalogo_componentes.findFirst({ where: { codigo_interno: 'CMP-TEST-001' } });
  if (!exists) {
    // Ensure a tipos_componente exists
    let tipo = await prisma.tipos_componente.findFirst({ where: { codigo_tipo: 'TIPO-PRUEBA' } });
    if (!tipo) {
      tipo = await prisma.tipos_componente.create({ data: { codigo_tipo: 'TIPO-PRUEBA', nombre_componente: 'Tipo prueba', categoria: 'OTRO', aplica_a: 'AMBOS', es_consumible: true, es_inventariable: true, creado_por: 1 } });
      console.log('✅ Tipo creado:', tipo.id_tipo_componente);
    }
    const comp = await prisma.catalogo_componentes.create({
      data: {
        id_tipo_componente: tipo.id_tipo_componente,
        codigo_interno: 'CMP-TEST-001',
        referencia_fabricante: 'CMP-TEST-001',
        descripcion_corta: 'Componente de prueba 1',
        descripcion_detallada: 'Componente testing E2E',
        unidad_medida: 'UNIDAD',
        precio_compra: 10,
        precio_venta: 15,
        creado_por: 1,
        activo: true,
        fecha_creacion: new Date(),
      }
    });
    console.log('✅ Componente creado:', comp.id_componente);
  } else {
    console.log('ℹ️ Componente ya existe:', exists.id_componente);
  }

  // 2. Crear ubicacion bodega default si no existe
  const ub = await prisma.ubicaciones_bodega.findFirst({ where: { codigo_ubicacion: 'BODEGA-PRUEBA' } });
  if (!ub) {
    const u = await prisma.ubicaciones_bodega.create({ data: { codigo_ubicacion: 'BODEGA-PRUEBA', zona: 'Bodega Prueba', pasillo: null, estante: null, nivel: null, activo: true } });
    console.log('✅ Ubicación creada:', u.id_ubicacion);
  } else {
    console.log('ℹ️ Ubicación ya existe:', ub.id_ubicacion);
  }

  // 3. Crear lote y movimiento entrada para asignar stock
  const compDb = await prisma.catalogo_componentes.findFirst({ where: { codigo_interno: 'CMP-TEST-001' } });
  const ubicDb = await prisma.ubicaciones_bodega.findFirst({ where: { codigo_ubicacion: 'BODEGA-PRUEBA' } });
  if (!compDb || !ubicDb) {
    throw new Error('Component or Ubication missing');
  }

  // Crear lote si no existe
  let lote = await prisma.lotes_componentes.findFirst({ where: { codigo_lote: 'LOT-TEST-001' } });
  if (!lote) {
    // Set cantidad_inicial > cantidad_actual to prevent check constraint failure when creating ENTRADA
    lote = await prisma.lotes_componentes.create({ data: { id_componente: compDb.id_componente, codigo_lote: 'LOT-TEST-001', cantidad_inicial: 200, cantidad_actual: 100, fecha_fabricacion: new Date(), ingresado_por: 1 } });
    console.log('✅ Lote creado:', lote.id_lote);
  } else {
    // Si lote ya existe, asegurarnos que cantidad_inicial sea suficiente para la ENTRADA que vamos a crear
    const requiredInitial = Number(lote.cantidad_actual) + 100;
    if (Number(lote.cantidad_inicial) < requiredInitial) {
      await prisma.lotes_componentes.update({ where: { id_lote: lote.id_lote }, data: { cantidad_inicial: requiredInitial } });
      lote = await prisma.lotes_componentes.findUnique({ where: { id_lote: lote.id_lote } });
      if (lote) console.log('🔧 Lote actualizado: cantidad_inicial actualizado a', lote.cantidad_inicial);
    }
    console.log('ℹ️ Lote ya existe:', lote!.id_lote);
  }

  // Registrar movimiento ENTRADA para stock
  // Crear movimiento si no existe
  const movimientoExists = await prisma.movimientos_inventario.findFirst({ where: { id_lote: lote!.id_lote, tipo_movimiento: 'ENTRADA', origen_movimiento: 'COMPRA', cantidad: 100 } });
  if (!movimientoExists) {
    const movimiento = await prisma.movimientos_inventario.create({ data: {
      tipo_movimiento: 'ENTRADA',
      origen_movimiento: 'COMPRA',
      id_componente: compDb.id_componente,
      id_ubicacion: ubicDb.id_ubicacion,
      cantidad: 100,
      realizado_por: 1,
      fecha_movimiento: new Date(),
      id_lote: lote!.id_lote,
      observaciones: 'Seed: ingreso inicial de 100 unidades'
    }});
    console.log('✅ Movimiento creado:', movimiento.id_movimiento, 'Stock inicial 100');
  } else {
    console.log('ℹ️ Movimiento ya existe para el lote:', movimientoExists.id_movimiento);
  }

  console.log('🚀 Seed inventario minimal finalizado');
}

main()
  .then(async () => { await prisma.$disconnect(); process.exit(0); })
  .catch(async (error) => { console.error('❌ ERROR seed inventario:', error); await prisma.$disconnect(); process.exit(1); });
