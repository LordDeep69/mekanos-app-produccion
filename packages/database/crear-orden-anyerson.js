/**
 * Script para crear orden "Test de Anyerson" - Usuario final request
 * Valida POST /ordenes con descripción específica
 */

const API_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'admin@mekanos.com',
  password: 'Admin123!'
};

async function crearOrdenAnyerson() {
  try {
    console.log('🔐 Iniciando sesión...');
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    const loginData = await loginRes.json();
    console.log('   LOGIN Status:', loginRes.status);
    
    if (!loginRes.ok || !loginData.access_token) {
      console.log('   LOGIN Data:', JSON.stringify(loginData, null, 2));
      throw new Error('Login falló - sin token');
    }
    
    const token = loginData.access_token;
    console.log('   ✅ Token obtenido\n');

    console.log('📝 Creando orden "Test de Anyerson"...\n');
    
    const nuevaOrden = {
      equipoId: 1,
      clienteId: 1,
      tipoServicioId: 1,
      sedeClienteId: null,
      descripcion: 'Test de Anyerson - Validación FASE 3 E2E completa',
      prioridad: 'ALTA',
      fechaProgramada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const response = await fetch(`${API_URL}/api/ordenes`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(nuevaOrden)
    });

    const data = await response.json();
    const orden = data.data; // Data está anidado en response.data

    console.log('\n✅ ORDEN "TEST DE ANYERSON" CREADA:\n');
    console.log(`   - ID Orden: ${orden.id_orden_servicio}`);
    console.log(`   - Número: ${orden.numero_orden}`);
    console.log(`   - Estado: ${orden.estado.codigo_estado}`);
    console.log(`   - Descripción: ${orden.descripcion_inicial}`);
    console.log(`   - Prioridad: ${orden.prioridad}`);
    console.log(`   - Cliente: ${orden.cliente.persona.nombre_completo}`);
    console.log(`   - Equipo: ${orden.equipo.nombre_equipo}`);
    console.log(`   - Fecha Programada: ${orden.fecha_programada}`);
    console.log(`   - Creada: ${orden.fecha_creacion}\n`);
    
    console.log('🎯 ORDEN ANYERSON VALIDADA - Visible en Supabase\n');
    
  } catch (error) {
    console.error('❌ Error creando orden:', error.message);
    process.exit(1);
  }
}

crearOrdenAnyerson();
