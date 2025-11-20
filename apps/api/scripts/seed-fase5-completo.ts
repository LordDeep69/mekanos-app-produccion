/**
 * Seed Completo FASE 5 - Inventario
 * 
 * Crea datos de prueba robustos para validar workflows completos:
 * - 5 proveedores (con personas)
 * - 20 componentes catálogo
 * - 10 ubicaciones bodega
 * - 5 lotes componentes (con stock)
 * - 3 órdenes de compra
 * - 2 recepciones
 * - 1 devolución proveedor
 * 
 * Ejecución: npx ts-node apps/api/scripts/seed-fase5-completo.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed Completo FASE 5...\n');

  try {
    // ========== 1. PROVEEDORES ==========
    console.log('📦 1. Creando Proveedores...');
    const proveedores = [];
    for (let i = 1; i <= 5; i++) {
      // Crear persona para proveedor
      const persona = await prisma.personas.upsert({
        where: { email: `proveedor${i}@email.com` },
        update: {},
        create: {
          tipo_persona: 'JURIDICA',
          tipo_identificacion: 'NIT',
          identificacion: `900${100000 + i}`,
          nombre_completo: `Proveedor Componentes ${i} S.A.S`,
          email: `proveedor${i}@email.com`,
          telefono: `300700000${i}`,
          direccion: `Calle ${i} # ${i}-${i}, Zona Industrial`,
          pais: 'Colombia',
          ciudad: i <= 2 ? 'Bogotá' : i <= 4 ? 'Medellín' : 'Cartagena',
        },
      });

      // Crear proveedor
      const proveedor = await prisma.proveedores.upsert({
        where: { id_persona: persona.id_persona },
        update: {},
        create: {
          id_persona: persona.id_persona,
          categoria_proveedor: i <= 2 ? 'SUMINISTROS' : i <= 4 ? 'REPUESTOS' : 'SERVICIOS',
          proveedor_activo: true,
          tiempo_entrega_dias: 5 + i,
          observaciones: `Proveedor confiable de componentes. Tiempo promedio entrega: ${5 + i} días.`,
        },
      });

      proveedores.push(proveedor);
      console.log(`  ✓ Proveedor ${i}: ${persona.nombre_completo} (ID ${proveedor.id_proveedor})`);
    }

    // ========== 2. COMPONENTES ==========
    console.log('\n⚙️ 2. Creando Componentes Catálogo...');
    const componentes = [];
    const categorias = ['ELECTRICO', 'MECANICO', 'HIDRAULICO', 'NEUMATICO'];
    for (let i = 1; i <= 20; i++) {
      const componente = await prisma.catalogo_componentes.upsert({
        where: { codigo_interno: `CMP-${String(i).padStart(4, '0')}` },
        update: {},
        create: {
          codigo_interno: `CMP-${String(i).padStart(4, '0')}`,
          nombre_componente: `Componente Test ${i}`,
          descripcion: `Descripción del componente ${i} para pruebas`,
          categoria_componente: categorias[i % 4],
          unidad_medida: i % 3 === 0 ? 'UNIDAD' : i % 3 === 1 ? 'METRO' : 'LITRO',
          precio_compra: 10 + (i * 2),
          precio_venta: 15 + (i * 3),
          componente_activo: true,
          id_proveedor_principal: proveedores[i % 5].id_proveedor,
        },
      });
      componentes.push(componente);
      console.log(`  ✓ Componente ${i}: ${componente.nombre_componente} (${componente.codigo_interno})`);
    }

    // ========== 3. UBICACIONES BODEGA ==========
    console.log('\n📍 3. Creando Ubicaciones Bodega...');
    const ubicaciones = [];
    const zonas = ['A', 'B', 'C', 'D'];
    for (let i = 1; i <= 10; i++) {
      const zona = zonas[i % 4];
      const ubicacion = await prisma.ubicaciones_bodega.upsert({
        where: { codigo_ubicacion: `${zona}-${String(i).padStart(2, '0')}` },
        update: {},
        create: {
          codigo_ubicacion: `${zona}-${String(i).padStart(2, '0')}`,
          zona: `Zona ${zona}`,
          pasillo: `Pasillo ${Math.ceil(i / 2)}`,
          estante: `Estante ${i}`,
          nivel: i % 4 + 1,
          activo: true,
        },
      });
      ubicaciones.push(ubicacion);
      console.log(`  ✓ Ubicación ${i}: ${ubicacion.codigo_ubicacion} - ${ubicacion.zona}`);
    }

    // ========== 4. ÓRDENES DE COMPRA ==========
    console.log('\n📋 4. Creando Órdenes de Compra...');
    const ordenes = [];
    for (let i = 1; i <= 3; i++) {
      const orden = await prisma.ordenes_compra.upsert({
        where: { numero_orden: `OC-SEED-${Date.now()}-${i}` },
        update: {},
        create: {
          numero_orden: `OC-SEED-${Date.now()}-${i}`,
          id_proveedor: proveedores[i - 1].id_proveedor,
          fecha_emision: new Date(),
          fecha_entrega_esperada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 días
          estado: i === 1 ? 'ENVIADA' : 'COMPLETADA',
          valor_total: 0, // Se calculará después
          creada_por: 1, // Admin
        },
      });
      ordenes.push(orden);
      console.log(`  ✓ Orden ${i}: ${orden.numero_orden} - Estado: ${orden.estado}`);

      // Crear detalles de orden (2 componentes por orden)
      for (let j = 0; j < 2; j++) {
        const componente = componentes[(i - 1) * 2 + j];
        await prisma.ordenes_compra_detalle.create({
          data: {
            id_orden_compra: orden.id_orden_compra,
            id_componente: componente.id_componente,
            cantidad: 50 + (j * 10),
            precio_unitario: componente.precio_compra,
            subtotal: (50 + j * 10) * componente.precio_compra,
          },
        });
        console.log(`    - Detalle: ${componente.nombre_componente} x ${50 + j * 10} unidades`);
      }
    }

    // ========== 5. LOTES COMPONENTES ==========
    console.log('\n📦 5. Creando Lotes Componentes...');
    const lotes = [];
    for (let i = 1; i <= 5; i++) {
      const componente = componentes[i - 1];
      const lote = await prisma.lotes_componentes.upsert({
        where: { numero_lote: `LOTE-${Date.now()}-${i}` },
        update: {},
        create: {
          numero_lote: `LOTE-${Date.now()}-${i}`,
          id_componente: componente.id_componente,
          cantidad_inicial: 100 + (i * 20),
          cantidad_actual: 100 + (i * 20),
          costo_unitario: componente.precio_compra,
          id_ubicacion: ubicaciones[i - 1].id_ubicacion,
          estado_lote: 'DISPONIBLE',
          ingresado_por: 1, // Admin
          fecha_ingreso: new Date(),
        },
      });
      lotes.push(lote);
      console.log(`  ✓ Lote ${i}: ${lote.numero_lote} - Stock: ${lote.cantidad_actual} unidades`);
    }

    // ========== 6. RECEPCIONES ==========
    console.log('\n✅ 6. Creando Recepciones...');
    for (let i = 1; i <= 2; i++) {
      // Buscar el primer detalle de la orden i
      const detalle = await prisma.ordenes_compra_detalle.findFirst({
        where: { id_orden_compra: ordenes[i - 1].id_orden_compra },
      });

      if (detalle) {
        const recepcion = await prisma.recepciones_compra.create({
          data: {
            numero_recepcion: `REC-SEED-${Date.now()}-${i}`,
            id_orden_compra: ordenes[i - 1].id_orden_compra,
            id_detalle_orden: detalle.id_detalle,
            cantidad_recibida: 40,
            cantidad_aceptada: 40,
            cantidad_rechazada: 0,
            tipo_recepcion: 'PARCIAL',
            calidad: 'OK',
            id_ubicacion_destino: ubicaciones[i - 1].id_ubicacion,
            costo_unitario_real: detalle.precio_unitario,
            recibido_por: 1, // Admin
            fecha_recepcion: new Date(),
            observaciones: `Recepción seed ${i}`,
          },
        });
        console.log(`  ✓ Recepción ${i}: ${recepcion.numero_recepcion} - ${recepcion.cantidad_aceptada} unidades OK`);

        // Crear movimiento inventario ENTRADA
        await prisma.movimientos_inventario.create({
          data: {
            tipo_movimiento: 'ENTRADA',
            origen_movimiento: 'COMPRA',
            id_componente: detalle.id_componente,
            cantidad: recepcion.cantidad_aceptada,
            costo_unitario: recepcion.costo_unitario_real,
            id_ubicacion: recepcion.id_ubicacion_destino,
            id_orden_compra: recepcion.id_orden_compra,
            observaciones: `Seed: Entrada por recepción ${recepcion.numero_recepcion}`,
            realizado_por: 1,
            fecha_movimiento: new Date(),
          },
        });
      }
    }

    // ========== 7. DEVOLUCIÓN PROVEEDOR ==========
    console.log('\n↩️ 7. Creando Devolución Proveedor...');
    if (lotes.length > 0) {
      const devolucion = await prisma.devoluciones_proveedor.create({
        data: {
          numero_devolucion: `DEV-SEED-${Date.now()}-1`,
          id_orden_compra: ordenes[0].id_orden_compra,
          id_lote: lotes[0].id_lote,
          motivo: 'DEFECTUOSO',
          cantidad_devuelta: 10,
          estado_devolucion: 'SOLICITADA',
          solicitada_por: 1, // Admin
          fecha_solicitud: new Date(),
          observaciones_solicitud: 'Seed: Componentes defectuosos detectados en inspección',
        },
      });
      console.log(`  ✓ Devolución: ${devolucion.numero_devolucion} - ${devolucion.cantidad_devuelta} unidades (${devolucion.motivo})`);
    }

    console.log('\n✅ Seed Completo FASE 5 finalizado exitosamente!\n');
    console.log('📊 Resumen:');
    console.log(`  - Proveedores: ${proveedores.length}`);
    console.log(`  - Componentes: ${componentes.length}`);
    console.log(`  - Ubicaciones: ${ubicaciones.length}`);
    console.log(`  - Órdenes Compra: ${ordenes.length}`);
    console.log(`  - Lotes: ${lotes.length}`);
    console.log(`  - Recepciones: 2`);
    console.log(`  - Devoluciones: 1`);

  } catch (error) {
    console.error('\n❌ Error en seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
