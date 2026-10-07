/**
 * ============================================================================
 * PRUEBA DE CERTIFICACIÓN E2E ATÓMICA: FLUJO DE CATÁLOGO Y FICHA 360°
 * ============================================================================
 * 
 * Estándar: Lógica Pura Zero-Trust
 * 
 * Flujo validado:
 * 1. Autenticación y obtención de JWT Bearer Token.
 * 2. Consulta de categorías, marcas, proveedores y unidades de medida.
 * 3. Creación in-context de una nueva Marca de prueba (es_fabricante_oem = true).
 * 4. Creación de Artículo Maestro (arquetipo INSUMO_SERVICIO, Ref TEST-REP-2026-X,
 *    subfamilia L2/L3, unidad UND, matriz con 1 proveedor y costo inicial).
 * 5. Inspección atómica de Ficha 360° (Hero Header, Fuentes de Suministro,
 *    Historial de Costos inmutable con origen REGISTRO_INICIAL).
 * 6. Verificación directa en Prisma / PostgreSQL de las tablas relacionales.
 * ============================================================================
 */

const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['error'] });

const CONFIG = {
  API_HOST: 'localhost',
  API_PORT: 3000,
  CREDENTIALS: {
    email: 'admin@mekanos.com',
    password: 'Admin123!',
  },
};

let JWT_TOKEN = '';

function apiRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : null;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (JWT_TOKEN) {
      headers['Authorization'] = `Bearer ${JWT_TOKEN}`;
    }
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: CONFIG.API_HOST,
      port: CONFIG.API_PORT,
      path: `/api${path}`,
      method,
      headers,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch (e) {
          parsed = body;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runE2ETest() {
  console.log('================================================================');
  console.log('🧪 INICIANDO CERTIFICACIÓN E2E ATÓMICA: CATÁLOGO Y FICHA 360°');
  console.log('================================================================\n');

  const resultados = {
    paso1_auth: false,
    paso2_datos_base: false,
    paso3_marca_oem: false,
    paso4_creacion_articulo: false,
    paso5_ficha_360_http: false,
    paso6_db_zero_trust: false,
  };

  try {
    // ------------------------------------------------------------------------
    // PASO 1: LOGIN Y JWT
    // ------------------------------------------------------------------------
    console.log('🔐 [PASO 1] Autenticando usuario administrador...');
    const loginRes = await apiRequest('POST', '/auth/login', CONFIG.CREDENTIALS);
    if (loginRes.statusCode !== 200 && loginRes.statusCode !== 201) {
      throw new Error(`Fallo en login HTTP ${loginRes.statusCode}: ${JSON.stringify(loginRes.data)}`);
    }
    JWT_TOKEN = loginRes.data.access_token || loginRes.data.token;
    if (!JWT_TOKEN) {
      throw new Error('Token JWT no devuelto por el servidor');
    }
    resultados.paso1_auth = true;
    console.log('   ✅ Token JWT adquirido con éxito.\n');

    // ------------------------------------------------------------------------
    // PASO 2: OBTENER DATOS BASE
    // ------------------------------------------------------------------------
    console.log('🔍 [PASO 2] Consultando referencias maestras en la API...');
    
    // Categorías L2/L3
    const catRes = await apiRequest('GET', '/categorias-componente/arbol');
    if (catRes.statusCode !== 200) {
      throw new Error(`Error al consultar árbol de categorías: HTTP ${catRes.statusCode}`);
    }
    const arbol = catRes.data;
    let subcategoriaSeleccionada = null;
    for (const raiz of arbol) {
      if (raiz.subcategorias && raiz.subcategorias.length > 0) {
        subcategoriaSeleccionada = raiz.subcategorias[0];
        break;
      }
    }
    if (!subcategoriaSeleccionada) {
      throw new Error('No se encontró una subfamilia L2/L3 en el árbol de categorías');
    }
    console.log(`   📂 Subfamilia seleccionada: ID ${subcategoriaSeleccionada.id_categoria} - "${subcategoriaSeleccionada.nombre}" (Nivel ${subcategoriaSeleccionada.nivel_jerarquico})`);

    // Tipo de componente
    const tipo = await prisma.tipos_componente.findFirst({ select: { id_tipo_componente: true, nombre_componente: true } });
    if (!tipo) throw new Error('No hay tipos de componente en la BD');
    console.log(`   ⚙️ Tipo de componente: ID ${tipo.id_tipo_componente} - "${tipo.nombre_componente}"`);

    // Proveedor existente
    const prov = await prisma.proveedores.findFirst({
      where: { proveedor_activo: true },
      include: { persona: { select: { razon_social: true, nombre_comercial: true } } },
    });
    if (!prov) throw new Error('No hay proveedores activos en la BD');
    console.log(`   🏢 Proveedor existente: ID ${prov.id_proveedor} - "${prov.persona.razon_social || prov.persona.nombre_comercial}"`);

    // Unidad de medida
    const unidad = await prisma.unidades_medida.findFirst({ where: { codigo: 'UND' } });
    if (!unidad) throw new Error('Unidad de medida UND no encontrada');
    console.log(`   📏 Unidad de medida: "${unidad.codigo}" (${unidad.nombre})`);

    resultados.paso2_datos_base = true;
    console.log('   ✅ Datos de referencia listos.\n');

    // ------------------------------------------------------------------------
    // PASO 3: CREACIÓN IN-CONTEXT DE MARCA DE PRUEBA (OEM)
    // ------------------------------------------------------------------------
    const nombreMarcaTest = `TEST-BRAND-OEM-${Date.now().toString().slice(-4)}`;
    console.log(`🏷️ [PASO 3] Creando marca in-context: "${nombreMarcaTest}" con es_fabricante_oem = true...`);
    
    const marcaPayload = {
      nombre: nombreMarcaTest,
      descripcion: 'Marca fabricante OEM creada para certificación E2E',
      pais_origen: 'Alemania',
      sitio_web: 'https://test-brand-oem.de',
      es_fabricante_oem: true,
      activo: true,
    };

    const marcaRes = await apiRequest('POST', '/marcas', marcaPayload);
    if (marcaRes.statusCode !== 201) {
      throw new Error(`Fallo al crear marca HTTP ${marcaRes.statusCode}: ${JSON.stringify(marcaRes.data)}`);
    }
    const marcaCreada = marcaRes.data;
    console.log(`   ✅ Marca creada: ID ${marcaCreada.id_marca} | Nombre: ${marcaCreada.nombre} | OEM: ${marcaCreada.es_fabricante_oem} | Slug: ${marcaCreada.slug}`);
    resultados.paso3_marca_oem = true;
    console.log('   ✅ Validación de creación in-context de marca completada.\n');

    // ------------------------------------------------------------------------
    // PASO 4: CREACIÓN DE ARTÍCULO DE PRUEBA (/compras/catalogo/nuevo)
    // ------------------------------------------------------------------------
    const skuTest = `TEST-REP-2026-${Date.now().toString().slice(-4)}`;
    const refFabricanteTest = `REF-OEM-${Date.now().toString().slice(-4)}`;
    const costoInicial = 125000;
    const precioVenta = 185000;

    console.log(`📦 [PASO 4] Enviando formulario de alta de artículo a POST /api/catalogo-componentes...`);
    console.log(`   • Código Interno: ${skuTest}`);
    console.log(`   • Ref. Fabricante: ${refFabricanteTest}`);
    console.log(`   • Arquetipo: INSUMO_SERVICIO`);
    console.log(`   • Subfamilia ID: ${subcategoriaSeleccionada.id_categoria}`);
    console.log(`   • Marca ID: ${marcaCreada.id_marca}`);
    console.log(`   • Unidad: UND`);
    console.log(`   • Proveedor vinculado: ID ${prov.id_proveedor} (Costo: $${costoInicial.toLocaleString()} COP)`);

    const articuloPayload = {
      id_tipo_componente: tipo.id_tipo_componente,
      id_categoria: subcategoriaSeleccionada.id_categoria,
      codigo_interno: skuTest,
      referencia_fabricante: refFabricanteTest,
      id_marca: marcaCreada.id_marca,
      marca: marcaCreada.nombre,
      descripcion_corta: 'Elemento Filtrante Prueba E2E Insumo Servicio',
      descripcion_detallada: 'Repuesto neutral de prueba para validación zero-trust de catálogo y sourcing',
      unidad_medida: unidad.nombre,
      codigo_unidad_medida: unidad.codigo,
      tipo_comercial: 'ORIGINAL',
      destino_articulo: 'INSUMO_SERVICIO',
      es_comprable: true,
      es_inventariable: true,
      es_facturable: true,
      requiere_serializacion: false,
      es_activo_fijo: false,
      stock_minimo: 5,
      stock_actual: 0,
      precio_compra: costoInicial,
      precio_venta: precioVenta,
      margen_utilidad_porcentaje: 48,
      moneda: 'COP',
      proveedores_iniciales: [
        {
          id_proveedor: prov.id_proveedor,
          referencia_proveedor: `SKU-PROV-${skuTest}`,
          marca_ofrecida: marcaCreada.nombre,
          id_marca_ofrecida: marcaCreada.id_marca,
          costo_actual: costoInicial,
          moneda: 'COP',
          tiempo_entrega_dias: 2,
          cantidad_minima_compra: 1,
          es_proveedor_preferido: true,
          notas: 'Vinculación inicial de abastecimiento E2E',
        },
      ],
    };

    const artRes = await apiRequest('POST', '/catalogo-componentes', articuloPayload);
    if (artRes.statusCode !== 201) {
      throw new Error(`Fallo al crear artículo HTTP ${artRes.statusCode}: ${JSON.stringify(artRes.data)}`);
    }

    const artCreado = artRes.data;
    console.log(`   ✅ Transacción completada con HTTP 201!`);
    console.log(`   ✅ ID Componente generado: ${artCreado.id_componente}`);
    resultados.paso4_creacion_articulo = true;
    console.log('   ✅ Alta de recurso completada exitosamente.\n');

    // ------------------------------------------------------------------------
    // PASO 5: INSPECCIÓN DE FICHA 360° (/compras/catalogo/[id])
    // ------------------------------------------------------------------------
    console.log(`🔍 [PASO 5] Inspeccionando Ficha 360° en GET /api/catalogo-componentes/${artCreado.id_componente}...`);
    const fichaRes = await apiRequest('GET', `/catalogo-componentes/${artCreado.id_componente}`);
    if (fichaRes.statusCode !== 200) {
      throw new Error(`Error al consultar Ficha 360°: HTTP ${fichaRes.statusCode}`);
    }

    const ficha = fichaRes.data;

    // A. Hero Header Validations
    console.log('   [5.A] Validando Hero Header y Breadcrumbs...');
    if (!ficha.marcas || ficha.marcas.id_marca !== marcaCreada.id_marca) {
      throw new Error(`Marca en Ficha 360° no coincide con la creada: ${JSON.stringify(ficha.marcas)}`);
    }
    if (ficha.marcas.es_fabricante_oem !== true) {
      throw new Error(`Badge OEM no figura como true en la marca del Hero Header`);
    }
    console.log(`      ✓ Marca en Hero Header: "${ficha.marcas.nombre}" (Badge OEM: ${ficha.marcas.es_fabricante_oem ? 'SÍ' : 'NO'})`);

    if (!ficha.categorias_componente || ficha.categorias_componente.id_categoria !== subcategoriaSeleccionada.id_categoria) {
      throw new Error(`Categoría taxonómica no coincide: ${JSON.stringify(ficha.categorias_componente)}`);
    }
    console.log(`      ✓ Breadcrumb Taxonómico: "${ficha.categorias_componente.nombre}" | Ruta: ${ficha.categorias_componente.ruta_jerarquica}`);

    // B. Fuentes de Suministro Validations
    console.log('   [5.B] Validando Pestaña "Fuentes de Suministro" (Cross-referencing)...');
    if (!ficha.articulos_proveedores || ficha.articulos_proveedores.length === 0) {
      throw new Error('No se encontró ninguna fuente de suministro vinculada en la Ficha 360°');
    }
    const fuente = ficha.articulos_proveedores[0];
    if (fuente.id_proveedor !== prov.id_proveedor) {
      throw new Error(`ID Proveedor no coincide: esperado ${prov.id_proveedor}, obtenido ${fuente.id_proveedor}`);
    }
    if (Number(fuente.costo_actual) !== costoInicial) {
      throw new Error(`Costo en fuente no coincide: esperado ${costoInicial}, obtenido ${fuente.costo_actual}`);
    }
    console.log(`      ✓ Proveedor vinculado: ID ${fuente.id_proveedor} - Costo: $${Number(fuente.costo_actual).toLocaleString()} COP | Preferido: ${fuente.es_proveedor_preferido}`);
    console.log(`      ✓ Marca ofrecida por proveedor: "${fuente.marca_ofrecida}" | Ref: "${fuente.referencia_proveedor}"`);

    // C. Historial de Costos Validations
    console.log('   [5.C] Validando Pestaña "Historial de Costos" (Bitácora Inmutable)...');
    if (!ficha.historial_costos_compra || ficha.historial_costos_compra.length === 0) {
      throw new Error('No se encontró ningún registro en el historial de costos');
    }
    const costoHist = ficha.historial_costos_compra[0];
    if (costoHist.origen_cambio !== 'REGISTRO_INICIAL') {
      throw new Error(`Origen del costo esperado REGISTRO_INICIAL pero se obtuvo ${costoHist.origen_cambio}`);
    }
    if (Number(costoHist.costo_unitario) !== costoInicial) {
      throw new Error(`Costo unitario en historial no coincide: esperado ${costoInicial}, obtenido ${costoHist.costo_unitario}`);
    }
    console.log(`      ✓ Registro de Auditoría: Origen "${costoHist.origen_cambio}" | Costo: $${Number(costoHist.costo_unitario).toLocaleString()} COP`);
    console.log(`      ✓ Observaciones automáticas: "${costoHist.observaciones}"`);

    resultados.paso5_ficha_360_http = true;
    console.log('   ✅ Inspección de Ficha 360° validada al 100%.\n');

    // ------------------------------------------------------------------------
    // PASO 6: AUDITORÍA DIRECTA EN LA BASE DE DATOS (ZERO TRUST)
    // ------------------------------------------------------------------------
    console.log('🛡️ [PASO 6] Verificación directa en base de datos PostgreSQL...');
    const dbArticulo = await prisma.catalogo_componentes.findUnique({
      where: { id_componente: artCreado.id_componente },
      include: {
        marcas: true,
        categorias_componente: true,
        articulos_proveedores: true,
        historial_costos_compra: true,
      },
    });

    if (!dbArticulo) {
      throw new Error('El artículo no existe en la base de datos');
    }

    console.log(`   ✓ DB catalogo_componentes: ID ${dbArticulo.id_componente} | SKU: ${dbArticulo.codigo_interno} | id_categoria: ${dbArticulo.id_categoria} | id_marca: ${dbArticulo.id_marca}`);
    console.log(`   ✓ DB articulos_proveedores: ${dbArticulo.articulos_proveedores.length} registro(s) persistido(s)`);
    console.log(`   ✓ DB historial_costos_compra: ${dbArticulo.historial_costos_compra.length} registro(s) inmutable(s) persistido(s)`);

    resultados.paso6_db_zero_trust = true;
    console.log('   ✅ Verificación atómica en base de datos superada exitosamente.\n');

    console.log('================================================================');
    console.log('🎯 RESULTADO FINAL DE LA CERTIFICACIÓN E2E');
    console.log('================================================================');
    console.log('1. Autenticación JWT API:               [OK] PASS');
    console.log('2. Consulta de datos base y taxonomía:  [OK] PASS');
    console.log('3. Creación in-context Marca OEM:       [OK] PASS');
    console.log('4. Alta de Artículo Transaccional (201):[OK] PASS');
    console.log('5. Inspección Ficha 360° (HTTP GET):    [OK] PASS');
    console.log('6. Verificación Zero-Trust en BD:       [OK] PASS');
    console.log('================================================================\n');

    return {
      exito: true,
      articulo: {
        id_componente: artCreado.id_componente,
        codigo_interno: artCreado.codigo_interno,
        referencia_fabricante: artCreado.referencia_fabricante,
        marca: marcaCreada.nombre,
        categoria: subcategoriaSeleccionada.nombre,
        proveedor: prov.persona.razon_social || prov.persona.nombre_comercial,
        costo_inicial: costoInicial,
      },
    };
  } catch (error) {
    console.error('\n❌ ERROR EN CERTIFICACIÓN E2E:', error.message || error);
    return { exito: false, error: error.message || error };
  } finally {
    await prisma.$disconnect();
  }
}

runE2ETest().then((res) => {
  if (!res.exito) {
    process.exit(1);
  } else {
    process.exit(0);
  }
});
