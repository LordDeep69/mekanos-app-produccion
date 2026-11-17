// Test del endpoint /ordenes/:id/pdf
const fetch = require('node-fetch');

async function testEndpoint() {
    const API_URL = 'http://localhost:3000/api';
    const ordenId = 614;

    // Primero hacer login para obtener token
    console.log('1. Haciendo login...');
    const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'admin@mekanos.com',
            password: 'Admin123!'
        }),
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken || loginData.access_token;
    console.log('Token obtenido:', token ? 'SÍ' : 'NO');

    if (!token) {
        console.log('Login response:', JSON.stringify(loginData, null, 2));
        return;
    }

    // Probar endpoint PDF-URL (nuevo)
    console.log(`\n2. Probando GET /ordenes/${ordenId}/pdf-url...`);
    const pdfRes = await fetch(`${API_URL}/ordenes/${ordenId}/pdf-url`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    const pdfData = await pdfRes.json();
    console.log('Respuesta:', JSON.stringify(pdfData, null, 2));
}

testEndpoint().catch(console.error);
