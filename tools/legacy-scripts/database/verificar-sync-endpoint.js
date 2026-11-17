/**
 * Verificar qué devuelve el endpoint de sync
 */
async function main() {
    console.log('\n=== VERIFICAR ENDPOINT SYNC ===\n');

    try {
        // Login primero
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@mekanos.com',
                password: 'Admin123!'
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.accessToken;

        // Llamar sync download
        const syncRes = await fetch('http://localhost:3000/api/sync/download/1', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!syncRes.ok) throw new Error(`HTTP ${syncRes.status}`);

        const data = await syncRes.json();

        console.log('📊 TOTALES DEL ENDPOINT:');
        console.log(`  ordenes: ${data.ordenes?.length || 0}`);
        console.log(`  actividadesCatalogo: ${data.actividadesCatalogo?.length || 0}`);
        console.log(`  parametrosMedicion: ${data.parametrosMedicion?.length || 0}`);

        // Contar actividades por tipo de servicio
        const actsPorTipo = {};
        data.actividadesCatalogo?.forEach(a => {
            const tipo = a.idTipoServicio;
            actsPorTipo[tipo] = (actsPorTipo[tipo] || 0) + 1;
        });

        console.log('\n📋 Actividades por tipo de servicio:');
        Object.entries(actsPorTipo).forEach(([tipo, count]) => {
            console.log(`  Tipo ${tipo}: ${count}`);
        });

        // Verificar Tipo B específicamente
        const tipoB = data.actividadesCatalogo?.filter(a => a.idTipoServicio === 4);
        console.log(`\n📍 Tipo B (id=4) detalle: ${tipoB?.length || 0} actividades`);

        if (tipoB && tipoB.length > 0) {
            tipoB.forEach((a, i) => {
                console.log(`  ${i + 1}. [${a.idActividadCatalogo}] ${a.codigoActividad} - ${a.tipoActividad}`);
            });
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
