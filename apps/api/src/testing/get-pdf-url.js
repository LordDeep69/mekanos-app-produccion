const { PrismaClient } = require('@prisma/client');
const https = require('https');

async function main() {
    const prisma = new PrismaClient();

    try {
        const doc = await prisma.documentos_generados.findFirst({
            where: { id_referencia: 143 },
            orderBy: { fecha_generacion: 'desc' }
        });

        if (!doc) {
            console.log('No se encontró documento');
            return;
        }

        console.log('URL completa del PDF:');
        console.log(doc.ruta_archivo);
        console.log('\n');

        // Intentar acceder
        console.log('Verificando accesibilidad...');

        const url = doc.ruta_archivo;
        const req = https.request(url, { method: 'GET', timeout: 15000 }, (res) => {
            console.log(`Status: ${res.statusCode}`);
            console.log(`Content-Type: ${res.headers['content-type']}`);
            console.log(`Content-Length: ${res.headers['content-length']}`);

            if (res.statusCode === 200) {
                console.log('\n✅ PDF ACCESIBLE');
            } else {
                console.log('\n❌ PDF NO ACCESIBLE');

                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (body) console.log('Response body:', body.substring(0, 500));
                });
            }
        });

        req.on('error', (err) => {
            console.log('Error:', err.message);
        });

        req.end();

        // Esperar un poco para la respuesta
        await new Promise(r => setTimeout(r, 5000));

    } finally {
        await prisma.$disconnect();
    }
}

main();
