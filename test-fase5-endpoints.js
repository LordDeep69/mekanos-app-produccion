/**
 * Test E2E - FASE 5 INVENTARIO
 * 
 * Prueba todos los endpoints corregidos de FASE 5:
 * - motivos_ajuste
 * - ordenes_compra_detalle
 * - remisiones_detalle
 * - lotes_componentes
 * 
 * Ejecutar: node test-fase5-endpoints.js
 * Requiere: Servidor corriendo en localhost:3000
 */

const BASE_URL = 'http://localhost:3000/api';

async function apiCall(method, endpoint, body = null, token = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  
  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function runTests() {
  console.log('🧪 TEST E2E - FASE 5 INVENTARIO');
  console.log('================================\n');

  const results = {
    passed: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  // 1. LOGIN
  console.log('📌 PASO 1: Autenticación...');
  const authRes = await apiCall('POST', '/auth/login', {
    email: 'admin@mekanos.com',
    password: 'Admin123!',
  });

  if (!authRes.ok) {
    console.log('❌ ERROR: No se pudo autenticar');
    console.log('   Respuesta:', authRes.data);
    process.exit(1);
  }

  const token = authRes.data.access_token;
  console.log('✅ Autenticación exitosa\n');

  // 2. TEST MOTIVOS AJUSTE
  console.log('📌 PASO 2: Test motivos_ajuste...');
  
  // GET list
  const motivosGet = await apiCall('GET', '/motivos-ajuste?page=1&limit=5', null, token);
  if (motivosGet.ok) {
    console.log('   ✅ GET /motivos-ajuste OK');
    results.passed++;
  } else {
    console.log('   ❌ GET /motivos-ajuste FAILED:', motivosGet.status, motivosGet.data);
    results.failed++;
  }
  
  // POST create
  const motivoData = {
    codigo_motivo: `MA-TEST-${Date.now()}`,
    nombre_motivo: 'Motivo de Prueba E2E',
    categoria: 'MERMA',
    requiere_justificacion_detallada: true,
    requiere_aprobacion_gerencia: false,
  };
  const motivosPost = await apiCall('POST', '/motivos-ajuste', motivoData, token);
  if (motivosPost.ok) {
    console.log('   ✅ POST /motivos-ajuste OK - ID:', motivosPost.data.id_motivo_ajuste);
    results.passed++;
  } else {
    console.log('   ⚠️ POST /motivos-ajuste:', motivosPost.status, motivosPost.data?.message || motivosPost.data);
    if (motivosPost.status === 400) {
      console.log('      (Error 400 = validación de datos, revisar payload)');
    }
    results.failed++;
  }

  // 3. TEST LOTES COMPONENTES
  console.log('\n📌 PASO 3: Test lotes_componentes...');
  
  const lotesGet = await apiCall('GET', '/lotes-componentes?page=1&limit=5', null, token);
  if (lotesGet.ok) {
    console.log('   ✅ GET /lotes-componentes OK - Total:', lotesGet.data.total || lotesGet.data.data?.length || 0);
    results.passed++;
  } else {
    console.log('   ❌ GET /lotes-componentes FAILED:', lotesGet.status, lotesGet.data);
    results.failed++;
  }
  
  const proximosVencer = await apiCall('GET', '/lotes-componentes/proximos-a-vencer', null, token);
  if (proximosVencer.ok) {
    console.log('   ✅ GET /lotes-componentes/proximos-a-vencer OK');
    results.passed++;
  } else {
    console.log('   ❌ GET /lotes-componentes/proximos-a-vencer FAILED:', proximosVencer.status);
    results.failed++;
  }

  // 4. TEST ORDENES COMPRA (para obtener ID para detalle)
  console.log('\n📌 PASO 4: Test ordenes_compra_detalle...');
  
  // Primero obtenemos una orden de compra existente
  const ordenesGet = await apiCall('GET', '/ordenes-compra?page=1&limit=1', null, token);
  let idOrdenCompra = null;
  
  if (ordenesGet.ok && ordenesGet.data.data?.length > 0) {
    idOrdenCompra = ordenesGet.data.data[0].id_orden_compra;
    console.log('   📋 Orden de compra encontrada: ID', idOrdenCompra);
  } else {
    console.log('   ⚠️ No hay órdenes de compra. Creando una...');
    
    // Obtener proveedor
    const provRes = await apiCall('GET', '/proveedores?page=1&limit=1', null, token);
    if (!provRes.ok || !provRes.data.data?.length) {
      console.log('   ⚠️ No hay proveedores. SKIP ordenes_compra_detalle');
      results.skipped += 2;
    } else {
      const idProveedor = provRes.data.data[0].id_proveedor;
      
      // Crear orden de compra
      const nuevaOrden = await apiCall('POST', '/ordenes-compra', {
        id_proveedor: idProveedor,
        observaciones: 'Orden creada para test E2E FASE 5',
      }, token);
      
      if (nuevaOrden.ok) {
        idOrdenCompra = nuevaOrden.data.id_orden_compra;
        console.log('   ✅ Orden de compra creada: ID', idOrdenCompra);
      }
    }
  }

  if (idOrdenCompra) {
    // Obtener componente
    const compRes = await apiCall('GET', '/catalogo-componentes?page=1&limit=1', null, token);
    
    if (compRes.ok && compRes.data.data?.length > 0) {
      const idComponente = compRes.data.data[0].id_componente;
      
      // POST detalle
      const detalleData = {
        id_orden_compra: idOrdenCompra,
        id_componente: idComponente,
        cantidad: 10,
        precio_unitario: 25000,
        observaciones: 'Detalle creado en test E2E',
      };
      
      const detallePost = await apiCall('POST', '/ordenes-compra-detalle', detalleData, token);
      if (detallePost.ok) {
        console.log('   ✅ POST /ordenes-compra-detalle OK - ID:', detallePost.data.id_detalle);
        results.passed++;
      } else {
        console.log('   ❌ POST /ordenes-compra-detalle FAILED:', detallePost.status, detallePost.data);
        results.failed++;
      }
    } else {
      console.log('   ⚠️ No hay componentes. SKIP detalle');
      results.skipped++;
    }
    
    // GET detalles
    const detallesGet = await apiCall('GET', '/ordenes-compra-detalle?page=1&limit=5', null, token);
    if (detallesGet.ok) {
      console.log('   ✅ GET /ordenes-compra-detalle OK');
      results.passed++;
    } else {
      console.log('   ❌ GET /ordenes-compra-detalle FAILED:', detallesGet.status);
      results.failed++;
    }
  }

  // 5. TEST REMISIONES DETALLE
  console.log('\n📌 PASO 5: Test remisiones_detalle...');
  
  // Obtener remisión existente
  const remisionesGet = await apiCall('GET', '/remisiones?page=1&limit=1', null, token);
  let idRemision = null;
  
  if (remisionesGet.ok && remisionesGet.data.data?.length > 0) {
    idRemision = remisionesGet.data.data[0].id_remision;
    console.log('   📋 Remisión encontrada: ID', idRemision);
  } else {
    console.log('   ⚠️ No hay remisiones. SKIP remisiones_detalle');
    results.skipped += 2;
  }

  if (idRemision) {
    // POST detalle remisión
    const detalleRemData = {
      id_remision: idRemision,
      tipo_item: 'HERRAMIENTA',
      descripcion_item: 'Herramienta de prueba E2E',
      cantidad_entregada: 1,
    };
    
    const detalleRemPost = await apiCall('POST', '/remisiones-detalle', detalleRemData, token);
    if (detalleRemPost.ok) {
      console.log('   ✅ POST /remisiones-detalle OK - ID:', detalleRemPost.data.id_detalle_remision);
      results.passed++;
    } else {
      console.log('   ❌ POST /remisiones-detalle FAILED:', detalleRemPost.status, detalleRemPost.data);
      results.failed++;
    }
    
    // GET detalles remisión
    const detallesRemGet = await apiCall('GET', '/remisiones-detalle?page=1&limit=5', null, token);
    if (detallesRemGet.ok) {
      console.log('   ✅ GET /remisiones-detalle OK');
      results.passed++;
    } else {
      console.log('   ❌ GET /remisiones-detalle FAILED:', detallesRemGet.status);
      results.failed++;
    }
  }

  // 6. OTROS ENDPOINTS FASE 5
  console.log('\n📌 PASO 6: Otros endpoints FASE 5...');
  
  // Ubicaciones bodega
  const ubicacionesGet = await apiCall('GET', '/ubicaciones-bodega?page=1&limit=5', null, token);
  if (ubicacionesGet.ok) {
    console.log('   ✅ GET /ubicaciones-bodega OK');
    results.passed++;
  } else {
    console.log('   ❌ GET /ubicaciones-bodega FAILED:', ubicacionesGet.status);
    results.failed++;
  }
  
  // Alertas stock
  const alertasGet = await apiCall('GET', '/alertas-stock?page=1&limit=5', null, token);
  if (alertasGet.ok) {
    console.log('   ✅ GET /alertas-stock OK');
    results.passed++;
  } else {
    console.log('   ❌ GET /alertas-stock FAILED:', alertasGet.status);
    results.failed++;
  }
  
  // Movimientos inventario
  const movimientosGet = await apiCall('GET', '/movimientos-inventario?page=1&limit=5', null, token);
  if (movimientosGet.ok) {
    console.log('   ✅ GET /movimientos-inventario OK');
    results.passed++;
  } else {
    console.log('   ❌ GET /movimientos-inventario FAILED:', movimientosGet.status);
    results.failed++;
  }
  
  // Recepciones compra
  const recepcionesGet = await apiCall('GET', '/recepciones-compra?page=1&limit=5', null, token);
  if (recepcionesGet.ok) {
    console.log('   ✅ GET /recepciones-compra OK');
    results.passed++;
  } else {
    console.log('   ❌ GET /recepciones-compra FAILED:', recepcionesGet.status);
    results.failed++;
  }
  
  // Devoluciones proveedor
  const devolucionesGet = await apiCall('GET', '/devoluciones-proveedor?page=1&limit=5', null, token);
  if (devolucionesGet.ok) {
    console.log('   ✅ GET /devoluciones-proveedor OK');
    results.passed++;
  } else {
    console.log('   ❌ GET /devoluciones-proveedor FAILED:', devolucionesGet.status);
    results.failed++;
  }

  // RESUMEN
  console.log('\n================================');
  console.log('📊 RESUMEN TESTS FASE 5:');
  console.log(`   ✅ Pasados: ${results.passed}`);
  console.log(`   ❌ Fallidos: ${results.failed}`);
  console.log(`   ⏭️ Omitidos: ${results.skipped}`);
  console.log('================================\n');

  const total = results.passed + results.failed;
  const pct = total > 0 ? Math.round((results.passed / total) * 100) : 0;
  console.log(`📈 Tasa de éxito: ${pct}%\n`);
  
  if (results.failed === 0) {
    console.log('🎉 ¡FASE 5 - 100% OPERATIVA!');
  } else {
    console.log('⚠️ Hay endpoints que requieren revisión');
  }
}

// Ejecutar
const fs = require('fs');
runTests()
  .then(() => {
    console.log('\\n✅ Test completado');
  })
  .catch((err) => {
    console.error('Error fatal:', err.message);
    fs.writeFileSync('test-fase5-error.log', err.stack || err.message);
  });
