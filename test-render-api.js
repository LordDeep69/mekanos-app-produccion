const https = require('https');

const BASE_URL = 'https://mekanos-api.onrender.com';
let authToken = null;
let userId = null;

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: response, headers: res.headers });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body, headers: res.headers });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function runTests() {
    console.log('\n🚀 INICIANDO PRUEBAS FUNCIONALES - RENDER DEPLOYMENT\n');
    console.log('='.repeat(60));

    const results = {
        passed: 0,
        failed: 0,
        tests: []
    };

    // TEST 1: Health Check
    try {
        console.log('\n📊 TEST 1: Health Check');
        const res = await makeRequest('GET', '/api/health');
        if (res.status === 200) {
            console.log('✅ PASS - Health check OK');
            console.log(`   Response: ${JSON.stringify(res.data)}`);
            results.passed++;
            results.tests.push({ name: 'Health Check', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Health check: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Health Check', status: 'FAIL', error: error.message });
    }

    // TEST 2: Login
    try {
        console.log('\n🔐 TEST 2: Login (admin@mekanos.com)');
        const res = await makeRequest('POST', '/api/auth/login', {
            email: 'admin@mekanos.com',
            password: 'Admin123!'
        });

        if ((res.status === 200 || res.status === 201) && (res.data.access_token || res.data.accessToken)) {
            authToken = res.data.access_token || res.data.accessToken;
            userId = res.data.user?.id || res.data.user?.id_usuario;
            console.log('✅ PASS - Login exitoso');
            console.log(`   User ID: ${userId}`);
            console.log(`   Email: ${res.data.user?.email}`);
            console.log(`   Rol: ${res.data.user?.rol}`);
            console.log(`   Token: ${authToken.substring(0, 30)}...`);
            results.passed++;
            results.tests.push({ name: 'Login', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status} - ${JSON.stringify(res.data)}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Login: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Login', status: 'FAIL', error: error.message });
    }

    if (!authToken) {
        console.log('\n⚠️ No se pudo obtener token. Deteniendo pruebas que requieren autenticación.');
        printSummary(results);
        return;
    }

    // TEST 3: Get Current User
    try {
        console.log('\n👤 TEST 3: Get Current User');
        const res = await makeRequest('GET', '/api/auth/me', null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Usuario actual obtenido');
            console.log(`   Email: ${res.data.email}`);
            console.log(`   Rol: ${res.data.rol?.nombre_rol}`);
            results.passed++;
            results.tests.push({ name: 'Get Current User', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Get current user: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Get Current User', status: 'FAIL', error: error.message });
    }

    // TEST 4: Dashboard
    try {
        console.log('\n📈 TEST 4: Dashboard');
        const res = await makeRequest('GET', '/api/dashboard', null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Dashboard obtenido');
            console.log(`   Órdenes totales: ${res.data.ordenes?.total || 'N/A'}`);
            results.passed++;
            results.tests.push({ name: 'Dashboard', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Dashboard: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Dashboard', status: 'FAIL', error: error.message });
    }

    // TEST 5: Sync Download
    try {
        console.log('\n🔄 TEST 5: Sync Download');
        const res = await makeRequest('GET', `/api/sync/download/${userId}`, null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Sync download exitoso');
            console.log(`   Órdenes: ${res.data.ordenes?.length || 0}`);
            console.log(`   Estados: ${res.data.estados?.length || 0}`);
            console.log(`   Clientes: ${res.data.clientes?.length || 0}`);
            results.passed++;
            results.tests.push({ name: 'Sync Download', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Sync download: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Sync Download', status: 'FAIL', error: error.message });
    }

    // TEST 6: Get Ordenes
    try {
        console.log('\n📋 TEST 6: Get Ordenes (lista)');
        const res = await makeRequest('GET', '/api/ordenes?limit=5', null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Lista de órdenes obtenida');
            console.log(`   Total: ${res.data.total || res.data.length || 0}`);
            results.passed++;
            results.tests.push({ name: 'Get Ordenes', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Get ordenes: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Get Ordenes', status: 'FAIL', error: error.message });
    }

    // TEST 7: Get Clientes
    try {
        console.log('\n🏢 TEST 7: Get Clientes');
        const res = await makeRequest('GET', '/api/clientes?limit=5', null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Lista de clientes obtenida');
            console.log(`   Total: ${res.data.total || res.data.length || 0}`);
            results.passed++;
            results.tests.push({ name: 'Get Clientes', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Get clientes: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Get Clientes', status: 'FAIL', error: error.message });
    }

    // TEST 8: Get Equipos
    try {
        console.log('\n⚙️ TEST 8: Get Equipos');
        const res = await makeRequest('GET', '/api/equipos?limit=5', null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Lista de equipos obtenida');
            console.log(`   Total: ${res.data.total || res.data.length || 0}`);
            results.passed++;
            results.tests.push({ name: 'Get Equipos', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Get equipos: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Get Equipos', status: 'FAIL', error: error.message });
    }

    // TEST 9: Get Usuarios
    try {
        console.log('\n👥 TEST 9: Get Usuarios');
        const res = await makeRequest('GET', '/api/usuarios?limit=5', null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Lista de usuarios obtenida');
            console.log(`   Total: ${res.data.total || res.data.length || 0}`);
            results.passed++;
            results.tests.push({ name: 'Get Usuarios', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Get usuarios: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Get Usuarios', status: 'FAIL', error: error.message });
    }

    // TEST 10: Get Tipos Servicio
    try {
        console.log('\n🔧 TEST 10: Get Tipos de Servicio');
        const res = await makeRequest('GET', '/api/tipos-servicio', null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Tipos de servicio obtenidos');
            console.log(`   Total: ${res.data.length || 0}`);
            results.passed++;
            results.tests.push({ name: 'Get Tipos Servicio', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Get tipos servicio: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Get Tipos Servicio', status: 'FAIL', error: error.message });
    }

    // TEST 11: Get Estados Orden
    try {
        console.log('\n📊 TEST 11: Get Estados de Orden');
        const res = await makeRequest('GET', '/api/estados-orden', null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Estados de orden obtenidos');
            console.log(`   Total: ${res.data.length || 0}`);
            results.passed++;
            results.tests.push({ name: 'Get Estados Orden', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Get estados orden: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Get Estados Orden', status: 'FAIL', error: error.message });
    }

    // TEST 12: Agenda Hoy
    try {
        console.log('\n📅 TEST 12: Agenda Hoy');
        const res = await makeRequest('GET', '/api/agenda/hoy', null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Agenda de hoy obtenida');
            console.log(`   Servicios: ${res.data.servicios?.length || 0}`);
            results.passed++;
            results.tests.push({ name: 'Agenda Hoy', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Agenda hoy: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Agenda Hoy', status: 'FAIL', error: error.message });
    }

    // TEST 13: Notificaciones
    try {
        console.log('\n🔔 TEST 13: Notificaciones');
        const res = await makeRequest('GET', '/api/notificaciones', null, authToken);
        if (res.status === 200) {
            console.log('✅ PASS - Notificaciones obtenidas');
            console.log(`   Total: ${res.data.length || 0}`);
            results.passed++;
            results.tests.push({ name: 'Notificaciones', status: 'PASS' });
        } else {
            throw new Error(`Status ${res.status}`);
        }
    } catch (error) {
        console.log(`❌ FAIL - Notificaciones: ${error.message}`);
        results.failed++;
        results.tests.push({ name: 'Notificaciones', status: 'FAIL', error: error.message });
    }

    printSummary(results);
}

function printSummary(results) {
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 RESUMEN DE PRUEBAS\n');
    console.log(`✅ Pasadas: ${results.passed}`);
    console.log(`❌ Fallidas: ${results.failed}`);
    console.log(`📈 Total: ${results.passed + results.failed}`);
    console.log(`🎯 Tasa de éxito: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

    if (results.failed > 0) {
        console.log('\n❌ Tests Fallidos:');
        results.tests.filter(t => t.status === 'FAIL').forEach(t => {
            console.log(`   - ${t.name}: ${t.error}`);
        });
    }

    console.log('\n' + '='.repeat(60));
}

runTests().catch(console.error);
