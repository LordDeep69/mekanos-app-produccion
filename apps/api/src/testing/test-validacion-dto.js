/**
 * Test para ver errores de validación detallados
 */
const http = require('http');

const payload = {
    evidencias: [
        { tipo: 'ANTES', base64: 'dGVzdA==', descripcion: 'Test' }
    ],
    firmas: {
        tecnico: { tipo: 'TECNICO', base64: 'dGVzdA==', idPersona: 1 },
        cliente: { tipo: 'CLIENTE', base64: 'dGVzdA==', idPersona: 0 }
    },
    actividades: [
        { sistema: 'Sistema Test', descripcion: 'Actividad test', resultado: 'B' }
    ],
    mediciones: [],
    observaciones: 'Test de validación desde script',
    horaEntrada: '08:00',
    horaSalida: '12:00'
};

const data = JSON.stringify(payload);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/ordenes/138/finalizar-completo',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImVtYWlsIjoiYWRtaW5AbWVrYW5vcy5jb20iLCJub21icmUiOiJBZG1pbmlzdHJhZG9yIiwicm9sIjoiQURNSU4iLCJpYXQiOjE3MzMyMzc1MDAsImV4cCI6MTczMzMyMzkwMH0.fake'
    }
};

console.log('📤 Enviando payload de prueba...');
console.log('📦 Payload:', JSON.stringify(payload, null, 2));

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('\n📥 Status:', res.statusCode);
        console.log('📋 Response:', body);

        try {
            const json = JSON.parse(body);
            if (json.message) {
                console.log('\n❌ ERRORES DE VALIDACIÓN:');
                if (Array.isArray(json.message)) {
                    json.message.forEach((err, i) => {
                        console.log(`   ${i + 1}. ${err}`);
                    });
                } else {
                    console.log('   ', json.message);
                }
            }
        } catch (e) { }
    });
});

req.on('error', (e) => {
    console.error('❌ Error:', e.message);
});

req.write(data);
req.end();
