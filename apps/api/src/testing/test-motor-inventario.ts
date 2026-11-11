// ═══════════════════════════════════════════════════════════════════════════════
// TEST MOTOR INVENTARIO - VALIDACIÓN TRANSACCIONAL ZERO-TRUST
// ═══════════════════════════════════════════════════════════════════════════════
// Pruebas:
// 1. Entrada de 10 items → Stock = 10 ✅
// 2. Salida de 4 items → Stock = 6 ✅
// 3. Salida de 10 items → DEBE FALLAR (stock insuficiente) ✅
// ═══════════════════════════════════════════════════════════════════════════════

export {};

const API_BASE = 'http://localhost:3000/api';

interface TestResult {
  nombre: string;
  esperado: string;
  resultado: string;
  exitoso: boolean;
}

const resultados: TestResult[] = [];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiCall(
  method: string,
  endpoint: string,
  body?: any,
): Promise<{ status: number; data: any }> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));

  return { status: response.status, data };
}

async function obtenerOCrearComponentePrueba(): Promise<number> {
  // Buscar componente existente para pruebas
  const { data } = await apiCall('GET', '/inventario/componentes?limit=1');

  if (data?.data?.length > 0) {
    const comp = data.data[0];
    console.log(
      `📦 Usando componente existente: ${comp.codigo || comp.referencia} (ID: ${comp.id_componente})`,
    );
    return comp.id_componente;
  }

  // Si no hay componentes, buscar en catálogo
  const { data: catalogo } = await apiCall('GET', '/catalogo-componentes?limit=1');

  if (catalogo?.length > 0) {
    console.log(
      `📦 Usando componente del catálogo: ${catalogo[0].referencia_fabricante} (ID: ${catalogo[0].id_componente})`,
    );
    return catalogo[0].id_componente;
  }

  throw new Error('No hay componentes en el sistema. Ejecuta primero el seed de inventario.');
}

async function obtenerStockActual(idComponente: number): Promise<number> {
  const { data } = await apiCall('GET', `/inventario/kardex/${idComponente}?limit=1`);
  return data?.componente?.stock_actual || 0;
}

async function test1_EntradaInventario(idComponente: number, idUsuario: number) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🧪 TEST 1: ENTRADA DE INVENTARIO (10 unidades)');
  console.log('═══════════════════════════════════════════════════════════════');

  const stockInicial = await obtenerStockActual(idComponente);
  console.log(`   Stock inicial: ${stockInicial}`);

  const { status, data } = await apiCall('POST', '/inventario/entrada', {
    id_componente: idComponente,
    cantidad: 10,
    costo_unitario: 50000,
    observaciones: 'TEST: Entrada de prueba motor inventario',
    realizado_por: idUsuario,
  });

  const stockFinal = await obtenerStockActual(idComponente);
  const stockEsperado = stockInicial + 10;

  console.log(`   Respuesta API: ${status}`);
  console.log(`   Stock esperado: ${stockEsperado}`);
  console.log(`   Stock actual: ${stockFinal}`);

  const exitoso = status === 201 && stockFinal === stockEsperado;

  resultados.push({
    nombre: 'TEST 1: Entrada 10 unidades',
    esperado: `Stock = ${stockEsperado}`,
    resultado: `Stock = ${stockFinal} (HTTP ${status})`,
    exitoso,
  });

  if (exitoso) {
    console.log('   ✅ PASÓ: Stock incrementado correctamente');
  } else {
    console.log('   ❌ FALLÓ: Stock no coincide o error HTTP');
    console.log('   Detalle:', JSON.stringify(data, null, 2));
  }

  return stockFinal;
}

async function test2_SalidaInventario(
  idComponente: number,
  idUsuario: number,
  stockActual: number,
) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🧪 TEST 2: SALIDA DE INVENTARIO (4 unidades)');
  console.log('═══════════════════════════════════════════════════════════════');

  console.log(`   Stock antes: ${stockActual}`);

  const { status, data } = await apiCall('POST', '/inventario/salida', {
    id_componente: idComponente,
    cantidad: 4,
    observaciones: 'TEST: Salida de prueba motor inventario',
    realizado_por: idUsuario,
  });

  const stockFinal = await obtenerStockActual(idComponente);
  const stockEsperado = stockActual - 4;

  console.log(`   Respuesta API: ${status}`);
  console.log(`   Stock esperado: ${stockEsperado}`);
  console.log(`   Stock actual: ${stockFinal}`);

  const exitoso = status === 201 && stockFinal === stockEsperado;

  resultados.push({
    nombre: 'TEST 2: Salida 4 unidades',
    esperado: `Stock = ${stockEsperado}`,
    resultado: `Stock = ${stockFinal} (HTTP ${status})`,
    exitoso,
  });

  if (exitoso) {
    console.log('   ✅ PASÓ: Stock decrementado correctamente');
  } else {
    console.log('   ❌ FALLÓ: Stock no coincide o error HTTP');
    console.log('   Detalle:', JSON.stringify(data, null, 2));
  }

  return stockFinal;
}

async function test3_SalidaInsuficiente(
  idComponente: number,
  idUsuario: number,
  stockActual: number,
) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🧪 TEST 3: SALIDA CON STOCK INSUFICIENTE (debe fallar)');
  console.log('═══════════════════════════════════════════════════════════════');

  console.log(`   Stock actual: ${stockActual}`);
  console.log(`   Intentando sacar: 100 unidades (más de lo disponible)`);

  const { status, data } = await apiCall('POST', '/inventario/salida', {
    id_componente: idComponente,
    cantidad: 100,
    observaciones: 'TEST: Salida que debe fallar',
    realizado_por: idUsuario,
  });

  const stockFinal = await obtenerStockActual(idComponente);

  console.log(`   Respuesta API: ${status}`);
  console.log(`   Stock después: ${stockFinal}`);

  // Debe fallar con 400 Bad Request y el stock NO debe cambiar
  const exitoso = status === 400 && stockFinal === stockActual;

  resultados.push({
    nombre: 'TEST 3: Salida insuficiente (debe fallar)',
    esperado: `HTTP 400 + Stock sin cambio (${stockActual})`,
    resultado: `HTTP ${status} + Stock = ${stockFinal}`,
    exitoso,
  });

  if (exitoso) {
    console.log('   ✅ PASÓ: Transacción rechazada correctamente');
    console.log(`   Mensaje: ${data?.message || 'Stock insuficiente'}`);
  } else {
    console.log('   ❌ FALLÓ: La transacción debió ser rechazada');
    console.log('   Detalle:', JSON.stringify(data, null, 2));
  }
}

async function test4_Kardex(idComponente: number) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🧪 TEST 4: KARDEX (historial de movimientos)');
  console.log('═══════════════════════════════════════════════════════════════');

  const { status, data } = await apiCall('GET', `/inventario/kardex/${idComponente}?limit=10`);

  console.log(`   Respuesta API: ${status}`);
  console.log(`   Componente: ${data?.componente?.nombre || 'N/A'}`);
  console.log(`   Stock actual: ${data?.componente?.stock_actual}`);
  console.log(`   Total movimientos: ${data?.total_movimientos}`);

  const exitoso = status === 200 && data?.kardex?.length > 0;

  resultados.push({
    nombre: 'TEST 4: Kardex',
    esperado: 'HTTP 200 + Movimientos listados',
    resultado: `HTTP ${status} + ${data?.kardex?.length || 0} movimientos`,
    exitoso,
  });

  if (exitoso) {
    console.log('   ✅ PASÓ: Kardex generado correctamente');
    console.log('   Últimos movimientos:');
    data.kardex.slice(0, 3).forEach((mov: any, i: number) => {
      console.log(
        `     ${i + 1}. ${mov.tipo} ${mov.entrada > 0 ? '+' + mov.entrada : '-' + mov.salida} → Saldo: ${mov.saldo}`,
      );
    });
  } else {
    console.log('   ❌ FALLÓ: No se pudo obtener el kardex');
  }
}

async function test5_Dashboard() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🧪 TEST 5: DASHBOARD KPIs');
  console.log('═══════════════════════════════════════════════════════════════');

  const { status, data } = await apiCall('GET', '/inventario/dashboard');

  console.log(`   Respuesta API: ${status}`);

  const exitoso = status === 200 && data?.kpis;

  resultados.push({
    nombre: 'TEST 5: Dashboard KPIs',
    esperado: 'HTTP 200 + KPIs',
    resultado: `HTTP ${status}`,
    exitoso,
  });

  if (exitoso) {
    console.log('   ✅ PASÓ: Dashboard generado correctamente');
    console.log(`   📊 Valor Inventario: $${data.kpis.valor_inventario?.toLocaleString() || 0}`);
    console.log(`   📦 Total Items: ${data.kpis.total_items}`);
    console.log(`   🔴 Items Críticos: ${data.kpis.items_criticos}`);
    console.log(`   📈 Movimientos Hoy: ${data.kpis.movimientos_hoy}`);
    console.log(`   ⚠️ Alertas Pendientes: ${data.kpis.alertas_pendientes}`);
  } else {
    console.log('   ❌ FALLÓ: No se pudo obtener el dashboard');
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   🧪 TEST MOTOR INVENTARIO - VALIDACIÓN ZERO-TRUST           ║');
  console.log('║   Fecha: ' + new Date().toLocaleString().padEnd(45) + '║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  try {
    // Verificar que el servidor esté corriendo
    const { status } = await apiCall('GET', '/health');
    if (status !== 200) {
      throw new Error('El servidor no está corriendo. Ejecuta: pnpm run dev');
    }
    console.log('\n✅ Servidor conectado');

    // Obtener componente de prueba
    const idComponente = await obtenerOCrearComponentePrueba();
    const idUsuario = 1; // Usuario admin por defecto

    // Ejecutar tests
    const stockDespuesEntrada = await test1_EntradaInventario(idComponente, idUsuario);
    await sleep(500);

    const stockDespuesSalida = await test2_SalidaInventario(
      idComponente,
      idUsuario,
      stockDespuesEntrada,
    );
    await sleep(500);

    await test3_SalidaInsuficiente(idComponente, idUsuario, stockDespuesSalida);
    await sleep(500);

    await test4_Kardex(idComponente);
    await sleep(500);

    await test5_Dashboard();

    // Resumen final
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    📋 RESUMEN DE TESTS                        ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');

    let pasados = 0;
    let fallidos = 0;

    resultados.forEach((r) => {
      const icono = r.exitoso ? '✅' : '❌';
      console.log(`║ ${icono} ${r.nombre.padEnd(40)} ║`);
      if (r.exitoso) pasados++;
      else fallidos++;
    });

    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ RESULTADO: ${pasados}/${resultados.length} tests pasados`.padEnd(62) + '║');

    if (fallidos === 0) {
      console.log('║ 🎉 TODOS LOS TESTS PASARON - MOTOR INVENTARIO VALIDADO      ║');
    } else {
      console.log(`║ ⚠️  ${fallidos} test(s) fallido(s) - Revisar logs arriba`.padEnd(62) + '║');
    }

    console.log('╚═══════════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('\n❌ ERROR FATAL:', error);
    process.exit(1);
  }
}

main();
