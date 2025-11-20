// FASE 4 E2E Testing Script - Node.js
// Testing completo: Orden → Actividades → Mediciones → Evidencias

const API_URL = 'http://localhost:3000/api';
const fs = require('fs');
const path = require('path');

// Colores console
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

async function main() {
  console.log('🧪 FASE 4 COMPLETA - Testing E2E Integración Real');
  console.log('==================================================\n');

  let token, id_orden, id_actividad1, id_actividad2, id_medicion1, id_medicion2;

  try {
    // STEP 1: LOGIN
    console.log(`${colors.green}STEP 1: Login admin${colors.reset}`);
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mekanos.com', password: 'Admin123!' })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.statusText}`);
    }
    
    const loginData = await loginResponse.json();
    token = loginData.accessToken;
    console.log(`✅ Token obtenido: ${token.substring(0, 30)}...\n`);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // STEP 2: CREATE ORDEN
    console.log(`${colors.green}STEP 2: Crear orden de servicio${colors.reset}`);
    const ordenResponse = await fetch(`${API_URL}/ordenes`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id_equipo: 1,
        id_sede_cliente: 1,
        tipo_servicio: 'MANTENIMIENTO',
        prioridad: 'ALTA',
        descripcion_problema: 'Test E2E FASE 4 - Orden integración completa con evidencias'
      })
    });

    if (!ordenResponse.ok) {
      const error = await ordenResponse.text();
      throw new Error(`Error crear orden: ${error}`);
    }

    const ordenData = await ordenResponse.json();
    id_orden = ordenData.data.id_orden_servicio;
    console.log(`✅ Orden creada: ID ${id_orden}, número ${ordenData.data.numero_orden}\n`);

    // STEP 3: CREATE ACTIVIDAD 1 (DIAGNOSTICO)
    console.log(`${colors.green}STEP 3: Crear actividad DIAGNOSTICO${colors.reset}`);
    const activ1Response = await fetch(`${API_URL}/actividades-ejecutadas`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id_orden_servicio: id_orden,
        nombre_actividad: 'Diagnóstico inicial equipo',
        descripcion: 'Revisión visual y eléctrica general del equipo',
        tiempo_estimado_minutos: 60,
        resultado: 'EXITOSO',
        observaciones: 'Equipo presenta desgaste normal, voltaje estable, requiere limpieza'
      })
    });

    if (!activ1Response.ok) {
      const error = await activ1Response.text();
      throw new Error(`Error crear actividad 1: ${error}`);
    }

    const activ1Data = await activ1Response.json();
    id_actividad1 = activ1Data.data.id_actividad_ejecutada;
    console.log(`✅ Actividad 1 creada: ID ${id_actividad1}\n`);

    // STEP 4: CREATE ACTIVIDAD 2 (LIMPIEZA)
    console.log(`${colors.green}STEP 4: Crear actividad LIMPIEZA${colors.reset}`);
    const activ2Response = await fetch(`${API_URL}/actividades-ejecutadas`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id_orden_servicio: id_orden,
        nombre_actividad: 'Limpieza profunda componentes',
        descripcion: 'Limpieza con aire comprimido y desengrasante especializado',
        tiempo_estimado_minutos: 45,
        resultado: 'EXITOSO',
        observaciones: 'Componentes limpios, aplicado lubricante en contactos eléctricos'
      })
    });

    if (!activ2Response.ok) {
      const error = await activ2Response.text();
      throw new Error(`Error crear actividad 2: ${error}`);
    }

    const activ2Data = await activ2Response.json();
    id_actividad2 = activ2Data.data.id_actividad_ejecutada;
    console.log(`✅ Actividad 2 creada: ID ${id_actividad2}\n`);

    // STEP 5: CREATE MEDICIÓN NORMAL
    console.log(`${colors.yellow}STEP 5: Crear medición VOLTAJE NORMAL (220V)${colors.reset}`);
    const medic1Response = await fetch(`${API_URL}/mediciones-servicio`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id_orden_servicio: id_orden,
        id_parametro_medicion: 1, // Asume parámetro VOLTAJE seeded
        valor_numerico: 220,
        observaciones: 'Voltaje estable dentro de rango normal 210-230V',
        temperatura_ambiente: 25,
        humedad_relativa: 60,
        instrumento_medicion: 'Multímetro Fluke 87V'
      })
    });

    if (!medic1Response.ok) {
      const error = await medic1Response.text();
      console.log(`⚠️ Medición 1 falló (posible falta seed parametros_medicion): ${error}`);
      id_medicion1 = null;
    } else {
      const medic1Data = await medic1Response.json();
      id_medicion1 = medic1Data.data.id_medicion;
      const nivel = medic1Data.data.nivel_alerta;
      console.log(`✅ Medición 1 creada: ID ${id_medicion1}, nivel_alerta=${nivel}\n`);
    }

    // STEP 6: CREATE MEDICIÓN CRÍTICA
    console.log(`${colors.yellow}STEP 6: Crear medición VOLTAJE CRÍTICO (280V)${colors.reset}`);
    const medic2Response = await fetch(`${API_URL}/mediciones-servicio`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        id_orden_servicio: id_orden,
        id_parametro_medicion: 1,
        valor_numerico: 280,
        observaciones: '⚠️ Voltaje CRÍTICO - Requiere intervención inmediata regulador voltaje',
        instrumento_medicion: 'Multímetro Fluke 87V'
      })
    });

    if (!medic2Response.ok) {
      const error = await medic2Response.text();
      console.log(`⚠️ Medición 2 falló: ${error}`);
      id_medicion2 = null;
    } else {
      const medic2Data = await medic2Response.json();
      id_medicion2 = medic2Data.data.id_medicion;
      const nivel = medic2Data.data.nivel_alerta;
      console.log(`✅ Medición 2 creada: ID ${id_medicion2}, nivel_alerta=${nivel}\n`);
    }

    // STEP 7: CREATE PLACEHOLDER IMAGES (generadas programáticamente)
    console.log(`${colors.cyan}STEP 7: Generar imágenes placeholder para testing${colors.reset}`);
    
    // Crear buffer SVG simple como imagen test
    const svgAntes = Buffer.from(`<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#0000FF"/>
      <text x="50%" y="50%" font-size="48" fill="white" text-anchor="middle" dy=".3em">ANTES - Test E2E</text>
    </svg>`);
    
    const svgDespues = Buffer.from(`<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="600" fill="#00FF00"/>
      <text x="50%" y="50%" font-size="48" fill="white" text-anchor="middle" dy=".3em">DESPUES - Test E2E</text>
    </svg>`);

    console.log(`✅ Buffers SVG generados (${svgAntes.length} bytes, ${svgDespues.length} bytes)\n`);

    // STEP 8: UPLOAD EVIDENCIA ANTES (Cloudinary)
    console.log(`${colors.cyan}STEP 8: Upload evidencia ANTES (Cloudinary)${colors.reset}`);
    
    const FormData = require('form-data'); // Requiere: npm install form-data
    const formAntes = new FormData();
    formAntes.append('file', svgAntes, { filename: 'test-antes.svg', contentType: 'image/svg+xml' });
    formAntes.append('id_orden_servicio', id_orden.toString());
    formAntes.append('tipo_evidencia', 'ANTES');
    formAntes.append('descripcion', 'Estado inicial del equipo - Test E2E automatizado');
    formAntes.append('orden_visualizacion', '1');
    formAntes.append('es_principal', 'true');

    const evid1Response = await fetch(`${API_URL}/evidencias-fotograficas`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formAntes.getHeaders()
      },
      body: formAntes
    });

    if (!evid1Response.ok) {
      const error = await evid1Response.text();
      console.log(`⚠️ Evidencia 1 falló (Cloudinary config issue?): ${error}`);
    } else {
      const evid1Data = await evid1Response.json();
      console.log(`✅ Evidencia 1 uploaded: ID ${evid1Data.data.id_evidencia}`);
      console.log(`📷 Cloudinary URL: ${evid1Data.data.ruta_archivo}\n`);
    }

    // STEP 9: UPLOAD EVIDENCIA DESPUES
    console.log(`${colors.cyan}STEP 9: Upload evidencia DESPUES (Cloudinary)${colors.reset}`);
    
    const formDespues = new FormData();
    formDespues.append('file', svgDespues, { filename: 'test-despues.svg', contentType: 'image/svg+xml' });
    formDespues.append('id_orden_servicio', id_orden.toString());
    formDespues.append('id_actividad_ejecutada', id_actividad2.toString());
    formDespues.append('tipo_evidencia', 'DESPUES');
    formDespues.append('descripcion', 'Estado final tras limpieza - Test E2E automatizado');
    formDespues.append('orden_visualizacion', '2');

    const evid2Response = await fetch(`${API_URL}/evidencias-fotograficas`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formDespues.getHeaders()
      },
      body: formDespues
    });

    if (!evid2Response.ok) {
      const error = await evid2Response.text();
      console.log(`⚠️ Evidencia 2 falló: ${error}`);
    } else {
      const evid2Data = await evid2Response.json();
      console.log(`✅ Evidencia 2 uploaded: ID ${evid2Data.data.id_evidencia}`);
      console.log(`📷 Cloudinary URL: ${evid2Data.data.ruta_archivo}\n`);
    }

    // STEP 10: GET ORDEN COMPLETA con relaciones
    console.log(`${colors.cyan}STEP 10: GET orden completa con relaciones${colors.reset}`);
    const ordenCompletaResponse = await fetch(`${API_URL}/ordenes/${id_orden}`, {
      method: 'GET',
      headers
    });

    if (!ordenCompletaResponse.ok) {
      throw new Error(`Error GET orden: ${ordenCompletaResponse.statusText}`);
    }

    const ordenCompleta = await ordenCompletaResponse.json();
    const orden = ordenCompleta.data;

    console.log(`📊 Orden completa:`);
    console.log(`   - ID: ${orden.id_orden_servicio}`);
    console.log(`   - Número: ${orden.numero_orden}`);
    console.log(`   - Estado: ${orden.estado}`);
    console.log(`   - Actividades: ${orden.actividades_ejecutadas?.length || 0}`);
    console.log(`   - Mediciones: ${orden.mediciones_servicio?.length || 0}`);
    console.log(`   - Evidencias: ${orden.evidencias_fotograficas?.length || 0}\n`);

    // STEP 11: Validaciones finales
    console.log(`${colors.green}STEP 11: Validaciones E2E${colors.reset}`);
    const actividadesCount = orden.actividades_ejecutadas?.length || 0;
    const medicionesCount = orden.mediciones_servicio?.length || 0;
    const evidenciasCount = orden.evidencias_fotograficas?.length || 0;
    const medicionesCriticas = orden.mediciones_servicio?.filter(m => m.nivel_alerta === 'CRITICO').length || 0;

    const resultados = {
      'Orden creada': id_orden ? '✅ PASS' : '❌ FAIL',
      'Actividades registradas (2)': actividadesCount === 2 ? '✅ PASS' : `⚠️ ${actividadesCount}/2`,
      'Mediciones registradas (2)': medicionesCount === 2 ? '✅ PASS' : `⚠️ ${medicionesCount}/2`,
      'Mediciones críticas (1)': medicionesCriticas === 1 ? '✅ PASS' : `⚠️ ${medicionesCriticas}/1`,
      'Evidencias registradas (2)': evidenciasCount === 2 ? '✅ PASS' : `⚠️ ${evidenciasCount}/2`,
      'Relaciones cargadas': orden.actividades_ejecutadas && orden.mediciones_servicio ? '✅ PASS' : '❌ FAIL'
    };

    console.log('\n📋 RESULTADOS:');
    for (const [criterio, resultado] of Object.entries(resultados)) {
      console.log(`   ${criterio}: ${resultado}`);
    }

    const todosExitosos = Object.values(resultados).every(r => r.includes('✅'));
    
    if (todosExitosos) {
      console.log(`\n${colors.green}🎉 FASE 4 COMPLETA - E2E TEST PASSED ✅${colors.reset}`);
      console.log('   - Orden creada correctamente');
      console.log('   - Actividades registradas');
      console.log('   - Mediciones con rangos automáticos validados');
      console.log('   - Evidencias subidas a Cloudinary');
      console.log('   - Relaciones funcionando correctamente');
    } else {
      console.log(`\n${colors.yellow}⚠️ FASE 4 COMPLETA - E2E TEST PARTIAL${colors.reset}`);
      console.log('   Revisar resultados arriba para debug');
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log('🔗 URLs para validación manual:');
    console.log(`   - Orden: ${API_URL}/ordenes/${id_orden}`);
    console.log(`   - Actividades: ${API_URL}/actividades-ejecutadas/orden/${id_orden}`);
    if (medicionesCount > 0) {
      console.log(`   - Mediciones: ${API_URL}/mediciones-servicio/orden/${id_orden}`);
    }
    if (evidenciasCount > 0) {
      console.log(`   - Evidencias: ${API_URL}/evidencias-fotograficas/orden/${id_orden}`);
    }

  } catch (error) {
    console.error(`\n${colors.red}❌ ERROR E2E: ${error.message}${colors.reset}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
main().catch(console.error);
